import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { resolvePagination } from '../../common/utils/pagination.util';
import { CAPABILITY_CODES } from '../../common/constants/capabilities';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { MapsService } from '../../integrations/maps/maps.service';
import { AiService } from '../../integrations/ai/ai.service';
import type { AuthUser } from '../../common/types/auth-user';
import type { HospitalCapability } from '../../integrations/hospital/hospital.types';
import {
  countByEligibility,
  DEFAULT_RECOMMENDATION_POLICY,
  evaluateCandidates,
  RECOMMENDATION_POLICY_VERSION,
  type CandidateEvaluation,
  type RecommendationCandidate,
} from './domain/recommendation-engine';
import type {
  GenerateRecommendationsDto,
  SelectRecommendationDto,
} from './dto/recommendation.dto';

type ExplainedEvaluation = CandidateEvaluation & {
  explanation?: string;
  explanationSource?: string;
  explanationMode?: 'ai' | 'rule_based';
};

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly hospitals: HospitalsService,
    private readonly maps: MapsService,
    private readonly ai: AiService,
  ) {}

  private orgId(user: AuthUser): string {
    if (!user.organizationId) throw new ForbiddenException('Access denied');
    return user.organizationId;
  }

  private async findIncident(user: AuthUser, incidentId: string) {
    const organizationId = this.orgId(user);
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Emergency case not found');
    return incident;
  }

  private capabilityList(codes: string[] | undefined, fallback: string[]): string[] {
    const required = [...new Set((codes && codes.length > 0 ? codes : fallback).map((code) => code.trim()))].filter(
      Boolean,
    );
    const invalid = required.filter((code) => !CAPABILITY_CODES.has(code));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown capability code(s): ${invalid.join(', ')}`);
    }
    return required;
  }

  async generate(user: AuthUser, incidentId: string, dto: GenerateRecommendationsDto) {
    const incident = await this.findIncident(user, incidentId);
    const requiredCapabilities = this.capabilityList(dto.requiredCapabilities, incident.requiredCapabilities);
    const searchRadiusKm = dto.searchRadiusKm ?? 30;
    const maxAgeSeconds = Number(this.config.get<string>('HOSPITAL_DATA_MAX_AGE_SECONDS', '300'));

    const search = await this.hospitals.search(user, {
      latitude: incident.latitude,
      longitude: incident.longitude,
      radiusKm: searchRadiusKm,
      limit: 25,
    });
    const hospitals = search.data;
    const [routes, capabilityResults] = await Promise.all([
      this.maps.getRoutesWithFallback(
        { latitude: incident.latitude, longitude: incident.longitude },
        hospitals.map((hospital) => ({ latitude: hospital.latitude, longitude: hospital.longitude })),
      ),
      Promise.allSettled(hospitals.map((hospital) => this.hospitals.capabilities(user, hospital.externalId))),
    ]);

    const candidates: RecommendationCandidate[] = hospitals.map((hospital, index) => {
      const capabilityResult = capabilityResults[index];
      const route = routes[index] ?? null;
      if (capabilityResult.status === 'fulfilled') {
        const availability = capabilityResult.value;
        return {
          hospitalExternalId: hospital.externalId,
          hospitalName: hospital.name,
          address: hospital.address,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          capabilities: availability.capabilities as HospitalCapability[],
          observedAt: new Date(availability.observedAt),
          expiresAt: new Date(availability.expiresAt),
          sourceResponseId: availability.sourceResponseId,
          isMock: availability.isMock,
          dataSource: availability.dataSource,
          route,
        };
      }
      const reason = capabilityResult.reason instanceof Error ? capabilityResult.reason.message : 'Unknown error';
      this.logger.warn(`Capability lookup failed for ${hospital.externalId}: ${reason}`);
      return {
        hospitalExternalId: hospital.externalId,
        hospitalName: hospital.name,
        address: hospital.address,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        capabilities: [],
        observedAt: null,
        expiresAt: null,
        sourceResponseId: null,
        isMock: hospital.isMock,
        dataSource: hospital.dataSource,
        dataUnavailableReason: `Capability data unavailable: ${reason}`,
        route,
      };
    });

    const evaluations = evaluateCandidates(candidates, {
      requiredCapabilities,
      incidentLocation: { latitude: incident.latitude, longitude: incident.longitude },
      maxAgeSeconds,
      policy: DEFAULT_RECOMMENDATION_POLICY,
    });

    const aiStatus = this.ai.status();
    const usingRuleBased = aiStatus.adapter === 'heuristic' || aiStatus.adapter === 'rule-based';

    const explained: ExplainedEvaluation[] = await Promise.all(
      evaluations.map(async (evaluation, index) => {
        if (index >= 10) return evaluation;
        const explanation = await this.ai.explainRecommendation({
          hospitalName: evaluation.hospitalName,
          eligibility: evaluation.eligibility,
          score: evaluation.score,
          distanceKm: evaluation.distanceKm,
          etaMinutes: evaluation.etaMinutes,
          freshnessStatus: evaluation.freshness.status,
          freshnessReason: evaluation.freshness.reason,
          matchedCapabilities: evaluation.matchedCapabilities,
          missingCapabilities: evaluation.missingCapabilities,
          unknownCapabilities: evaluation.unknownCapabilities,
          isMock: evaluation.isMock,
          policyVersion: RECOMMENDATION_POLICY_VERSION,
        });
        const mode = explanation.source === 'heuristic' ? 'rule_based' : 'ai';
        return {
          ...evaluation,
          explanation: explanation.text,
          explanationSource: explanation.source,
          explanationMode: mode,
        };
      }),
    );

    const counts = countByEligibility(explained);
    const hospitalIntegration = this.hospitals.status();
    const mapsStatus = this.maps.status;
    const dataSource = hospitalIntegration.isMock ? 'MOCK' : 'LIVE';
    const recommendation = await this.prisma.hospitalRecommendation.create({
      data: {
        incidentId: incident.id,
        policyVersion: RECOMMENDATION_POLICY_VERSION,
        policy: DEFAULT_RECOMMENDATION_POLICY as unknown as Prisma.InputJsonValue,
        results: explained as unknown as Prisma.InputJsonValue,
        candidateCount: explained.length,
        ...counts,
        dataSource,
        mapsSource: mapsStatus.provider,
      },
    });
    await this.audit.record({
      action: 'HOSPITAL_RECOMMENDATION_GENERATED',
      entityType: 'hospital_recommendation',
      entityId: recommendation.id,
      organizationId: incident.organizationId,
      actorId: user.id,
      after: {
        incidentId: incident.id,
        caseNumber: incident.caseNumber,
        requiredCapabilities,
        ...counts,
        dataSource,
        mapsSource: mapsStatus.provider,
        recommendationMode: usingRuleBased ? 'rule_based' : 'ai',
      },
    });

    const warnings: string[] = [];
    if (requiredCapabilities.length === 0) {
      warnings.push('No required capabilities are set. Recommendations need careful human review.');
    }
    if (hospitalIntegration.isMock) {
      warnings.push('Demo data: hospital availability is simulated, not real.');
    }
    if (mapsStatus.isMock) {
      warnings.push('Distance and ETA are estimated (no live routing provider configured).');
    } else {
      warnings.push('Distance and ETA are based on routing data from the configured maps provider.');
    }
    if (usingRuleBased) {
      warnings.push('Recommendations are generated using a transparent rule-based method (AI provider not configured).');
    }

    return {
      id: recommendation.id,
      incidentId: incident.id,
      caseNumber: incident.caseNumber,
      policyVersion: RECOMMENDATION_POLICY_VERSION,
      policy: DEFAULT_RECOMMENDATION_POLICY,
      requiredCapabilities,
      results: explained,
      candidateCount: explained.length,
      ...counts,
      dataSource,
      mapsSource: mapsStatus.provider,
      integration: {
        hospital: hospitalIntegration,
        maps: mapsStatus,
        ai: { ...aiStatus, mode: usingRuleBased ? 'rule_based' : 'ai' },
        notice: hospitalIntegration.notice,
      },
      warnings,
      disclaimer:
        'Decision support only. Recommendations do not diagnose patients and do not automatically select a hospital. Rescue Admin must make the final decision.',
      generatedAt: recommendation.createdAt.toISOString(),
    };
  }

  async list(user: AuthUser, incidentId: string, query: { page?: string; pageSize?: string }) {
    const incident = await this.findIncident(user, incidentId);
    const { page, pageSize, skip, take } = resolvePagination(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.hospitalRecommendation.findMany({
        where: { incidentId: incident.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.hospitalRecommendation.count({ where: { incidentId: incident.id } }),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  async latest(user: AuthUser, incidentId: string) {
    const incident = await this.findIncident(user, incidentId);
    const recommendation = await this.prisma.hospitalRecommendation.findFirst({
      where: { incidentId: incident.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!recommendation) throw new NotFoundException('No recommendation has been generated for this case yet');
    return recommendation;
  }

  async get(user: AuthUser, id: string) {
    const organizationId = this.orgId(user);
    const recommendation = await this.prisma.hospitalRecommendation.findFirst({
      where: { id, incident: { organizationId } },
    });
    if (!recommendation) throw new NotFoundException('Recommendation not found');
    return recommendation;
  }

  async select(user: AuthUser, id: string, dto: SelectRecommendationDto) {
    const recommendation = await this.get(user, id);
    const results = (recommendation.results ?? []) as unknown as ExplainedEvaluation[];
    const selected = results.find((result) => result.hospitalExternalId === dto.hospitalExternalId) ?? null;
    const reason = (dto.reason ?? dto.overrideReason ?? '').trim() || undefined;

    if (!selected && !reason) {
      throw new BadRequestException('Selecting a hospital outside the recommendation list requires a reason.');
    }
    if (selected && selected.eligibility !== 'ELIGIBLE' && !reason) {
      throw new BadRequestException(
        `The selected hospital is ${selected.eligibility}. Provide a reason to record this decision.`,
      );
    }
    let hospitalName = dto.hospitalName ?? selected?.hospitalName;
    if (!hospitalName) {
      const cached = await this.prisma.hospitalDirectoryCache.findUnique({
        where: { externalHospitalId: dto.hospitalExternalId },
      });
      hospitalName = cached?.name;
    }
    if (!hospitalName) throw new BadRequestException('Hospital name is required.');

    const result = await this.hospitals.selectDestination(user, {
      incidentId: recommendation.incidentId,
      hospitalExternalId: dto.hospitalExternalId,
      hospitalName,
      recommendationId: recommendation.id,
      reason,
    });

    await this.audit.record({
      action: 'HOSPITAL_RECOMMENDATION_SELECTED',
      entityType: 'hospital_recommendation',
      entityId: recommendation.id,
      organizationId: user.organizationId,
      actorId: user.id,
      after: {
        incidentId: recommendation.incidentId,
        hospitalExternalId: dto.hospitalExternalId,
        hospitalName,
        eligibility: selected?.eligibility ?? 'OUTSIDE_LIST',
        score: selected?.score ?? null,
        reason: reason ?? null,
      },
    });

    return {
      recommendationId: recommendation.id,
      selected: {
        hospitalExternalId: dto.hospitalExternalId,
        hospitalName,
        eligibility: selected?.eligibility ?? 'OUTSIDE_LIST',
        score: selected?.score ?? null,
        reason: reason ?? null,
      },
      ...result,
    };
  }
}
