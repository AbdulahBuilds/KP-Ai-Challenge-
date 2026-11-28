import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiService } from '../../integrations/ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mongoNullish } from '../../common/utils/prisma-mongo.util';
import { AuditService } from '../audit/audit.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { resolvePagination } from '../../common/utils/pagination.util';
import { generateCaseNumber } from '../../common/utils/crypto.util';
import type { AuthUser } from '../../common/types/auth-user';
import type { StructuredIncidentNarrativeResult } from '../../integrations/ai/ai.types';
import type {
  CreateIncidentDto,
  PatientDetailsDto,
  StructureIncidentNarrativeDto,
  UpdateIncidentDto,
} from './dto/incident.dto';

const incidentDetailInclude = {
  patient: true,
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  hospitalRequests: { orderBy: { createdAt: 'desc' as const } },
  recommendations: { orderBy: { createdAt: 'desc' as const }, take: 5 },
  events: {
    orderBy: { occurredAt: 'asc' as const },
    include: { actor: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.IncidentInclude;

interface AutoRecommendationResult {
  id: string;
  suggestedHospitalId: string | null;
  results: Array<{
    hospitalExternalId: string;
    hospitalName: string;
    eligibility: string;
    etaMinutes?: number | null;
    requiredCapabilities?: string[];
  }>;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly recommendations: RecommendationsService,
    private readonly hospitals: HospitalsService,
    private readonly ai: AiService,
  ) {}

  private orgId(user: AuthUser): string {
    if (!user.organizationId) throw new ForbiddenException('You are not attached to a rescue organization');
    return user.organizationId;
  }

  private async findOwned(user: AuthUser, id: string) {
    const organizationId = this.orgId(user);
    const incident = await this.prisma.incident.findFirst({
      where: { id, organizationId },
      include: incidentDetailInclude,
    });
    if (!incident) throw new NotFoundException('Emergency case not found');
    return incident;
  }

  async create(user: AuthUser, dto: CreateIncidentDto) {
    const organizationId = this.orgId(user);
    const now = new Date();
    const narrative = dto.narrative?.trim() || null;
    const extracted = narrative
      ? await this.ai.structureIncidentNarrative(narrative, dto.language)
      : null;
    const emergencyType = dto.emergencyType ?? extracted?.emergencyType ?? 'MEDICAL';
    const severity = dto.severity ?? extracted?.severity ?? 'UNKNOWN';
    const requiredCapabilities = dto.requiredCapabilities ?? extracted?.capabilities ?? [];
    const address = dto.address ?? extracted?.address ?? undefined;
    const patient = this.mergePatientDetails(dto.patient, extracted, narrative);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const caseNumber = generateCaseNumber(now);
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const incident = await tx.incident.create({
            data: {
              caseNumber,
              organizationId,
              createdById: user.id,
              status: 'REGISTERED',
              severity,
              emergencyType,
              title: this.buildTitle(dto, caseNumber, emergencyType, extracted?.suspectedCondition),
              summary: patient?.notes ?? null,
              latitude: dto.latitude,
              longitude: dto.longitude,
              address: address ?? null,
              locationCapturedAt: now,
              requiredCapabilities,
              receivedAt: now,
              registeredAt: now,
              ...(patient ? { patient: { create: this.patientCreateData(patient) } } : {}),
              events: {
                create: {
                  type: 'CASE_REGISTERED',
                  message: `Emergency case ${caseNumber} created`,
                  actorId: user.id,
                  occurredAt: now,
                },
              },
            },
          });
          return incident;
        }, { maxWait: 5000, timeout: 15000 });

        await this.audit.record({
          action: 'INCIDENT_CREATED',
          entityType: 'incident',
          entityId: created.id,
          organizationId,
          actorId: user.id,
          after: {
            caseNumber: created.caseNumber,
            severity: created.severity,
            emergencyType: created.emergencyType,
            intakeSource: narrative ? 'narrative_ai' : 'structured',
          },
        });
        const recommendation = await this.recommendations.generateAfterSubmission(user, created.id);
        if (recommendation) {
          await this.sendAutomaticPreArrivalAlert(user, created.id, recommendation as AutoRecommendationResult);
        } else {
          await this.prisma.caseEvent.create({
            data: {
              incidentId: created.id,
              type: 'NOTE_ADDED',
              message: 'Automatic hospital recommendation is unavailable; generate recommendations manually.',
              actorId: user.id,
            },
          });
        }
        return this.get(user, created.id);
      } catch (error) {
        if (this.isCaseNumberConflict(error) && attempt < 5) continue;
        throw error;
      }
    }
    throw new ConflictException('Could not allocate a unique case number, please retry');
  }

  async list(user: AuthUser, query: { page?: string; pageSize?: string; search?: string }) {
    const organizationId = this.orgId(user);
    const { page, pageSize, skip, take } = resolvePagination(query);
    const where: Prisma.IncidentWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { caseNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
              { patient: { is: { patientName: { contains: query.search, mode: 'insensitive' } } } },
              { patient: { is: { symptoms: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        select: {
          id: true,
          caseNumber: true,
          status: true,
          severity: true,
          emergencyType: true,
          title: true,
          latitude: true,
          longitude: true,
          address: true,
          requiredCapabilities: true,
          destinationHospitalId: true,
          destinationHospitalName: true,
          receivedAt: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              patientName: true,
              age: true,
              gender: true,
              suspectedCondition: true,
            },
          },
          _count: { select: { hospitalRequests: true, recommendations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.incident.count({ where }),
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

  async get(user: AuthUser, id: string) {
    return this.findOwned(user, id);
  }

  async structureNarrative(user: AuthUser, dto: StructureIncidentNarrativeDto) {
    this.orgId(user);
    return this.ai.structureIncidentNarrative(dto.transcript, dto.language);
  }

  async update(user: AuthUser, id: string, dto: UpdateIncidentDto) {
    const existing = await this.findOwned(user, id);
    if (!existing) throw new NotFoundException('Emergency case not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() || existing.caseNumber } : {}),
          ...(dto.emergencyType !== undefined ? { emergencyType: dto.emergencyType } : {}),
          ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.address !== undefined ? { address: dto.address ?? null } : {}),
          ...(dto.requiredCapabilities !== undefined
            ? { requiredCapabilities: dto.requiredCapabilities }
            : {}),
          ...(dto.patient?.notes !== undefined ? { summary: dto.patient.notes ?? null } : {}),
          ...(dto.patient
            ? {
                patient: existing.patient
                  ? { update: this.patientUpdateData(dto.patient) }
                  : { create: this.patientCreateData(dto.patient) },
              }
            : {}),
        },
      });
      await tx.caseEvent.create({
        data: {
          incidentId: id,
          type: 'NOTE_ADDED',
          message: 'Emergency case details updated',
          actorId: user.id,
        },
      });
      return incident;
    });

    await this.audit.record({
      action: 'INCIDENT_UPDATED',
      entityType: 'incident',
      entityId: id,
      organizationId: existing.organizationId,
      actorId: user.id,
      after: { changedFields: Object.keys(dto) },
    });
    return this.get(user, id);
  }

  private async sendAutomaticPreArrivalAlert(
    user: AuthUser,
    incidentId: string,
    recommendation: AutoRecommendationResult,
  ): Promise<void> {
    const suggested = recommendation.results.find(
      (result) =>
        result.hospitalExternalId === recommendation.suggestedHospitalId &&
        result.eligibility === 'ELIGIBLE',
    );
    const topEligible =
      suggested ?? recommendation.results.find((result) => result.eligibility === 'ELIGIBLE') ?? null;
    if (!topEligible) {
      await this.prisma.caseEvent.create({
        data: {
          incidentId,
          type: 'NOTE_ADDED',
          message: 'No hospital with confirmed capability data was available for an automatic pre-arrival alert. Select a destination manually.',
          actorId: user.id,
        },
      });
      return;
    }

    const etaMinutes =
      typeof topEligible.etaMinutes === 'number' && Number.isFinite(topEligible.etaMinutes)
        ? Math.max(0, Math.round(topEligible.etaMinutes))
        : undefined;

    try {
      await this.hospitals.selectDestination(user, {
        incidentId,
        hospitalExternalId: topEligible.hospitalExternalId,
        hospitalName: topEligible.hospitalName,
        recommendationId: recommendation.id,
        reason: 'Automatically selected as the top eligible recommendation for this emergency case.',
      });
      await this.hospitals.requestEmergency(user, incidentId, {
        hospitalExternalId: topEligible.hospitalExternalId,
        hospitalName: topEligible.hospitalName,
        etaMinutes,
        requiredCapabilities: topEligible.requiredCapabilities,
        idempotencyKey: `auto:${incidentId}:${topEligible.hospitalExternalId}`,
      });
      await this.prisma.caseEvent.create({
        data: {
          incidentId,
          type: 'NOTE_ADDED',
          message: `Automatic pre-arrival alert sent to ${topEligible.hospitalName} from the post-submission recommendation.`,
          actorId: user.id,
        },
      });
    } catch (error) {
      this.logger.warn(`Automatic pre-arrival alert failed for case ${incidentId}: ${(error as Error).message}`);
      await this.prisma.caseEvent.create({
        data: {
          incidentId,
          type: 'NOTE_ADDED',
          message: `Automatic pre-arrival alert could not be sent: ${(error as Error).message}. Send it manually from the case page.`,
          actorId: user.id,
        },
      });
    }
  }

  private buildTitle(
    dto: CreateIncidentDto,
    caseNumber: string,
    emergencyType: string,
    suspectedCondition?: string | null,
  ): string {
    if (dto.title?.trim()) return dto.title.trim();
    const type = emergencyType.replace(/_/g, ' ').toLowerCase();
    if (suspectedCondition?.trim()) {
      return `${caseNumber} - ${suspectedCondition.trim().slice(0, 90)}`;
    }
    return `${caseNumber} - ${type} emergency`;
  }

  private mergePatientDetails(
    provided: PatientDetailsDto | undefined,
    extracted: StructuredIncidentNarrativeResult | null,
    narrative: string | null,
  ): PatientDetailsDto | undefined {
    if (!provided && !extracted) return undefined;
    const narrativeNotes = narrative
      ? [
          `Patient narrative: ${narrative}`,
          extracted?.resourceNeeds ? `AI-detected required resources: ${extracted.resourceNeeds}` : '',
          extracted?.notes ? `Other reported details: ${extracted.notes}` : '',
          provided?.notes ? `Additional notes: ${provided.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : provided?.notes;
    return {
      patientName: provided?.patientName ?? extracted?.patientName ?? undefined,
      age: provided?.age ?? extracted?.age ?? undefined,
      gender: provided?.gender ?? extracted?.gender ?? undefined,
      symptoms: provided?.symptoms ?? extracted?.symptoms ?? undefined,
      injuries: provided?.injuries ?? extracted?.injuries ?? undefined,
      suspectedCondition: provided?.suspectedCondition ?? extracted?.suspectedCondition ?? undefined,
      treatmentProvided: provided?.treatmentProvided ?? extracted?.treatmentProvided ?? undefined,
      notes: narrativeNotes || undefined,
    };
  }

  private patientCreateData(dto: PatientDetailsDto): Prisma.IncidentPatientDetailsCreateWithoutIncidentInput {
    return {
      patientName: dto.patientName?.trim() || null,
      age: dto.age ?? null,
      ...(dto.gender ? { gender: dto.gender } : {}),
      unidentified: !dto.patientName?.trim(),
      suspectedCondition: dto.suspectedCondition?.trim() || null,
      treatmentProvided: dto.treatmentProvided?.trim() || null,
      symptoms: dto.symptoms?.trim() || null,
      injuries: dto.injuries?.trim() || null,
      notes: dto.notes?.trim() || null,
    };
  }

  private patientUpdateData(dto: PatientDetailsDto): Prisma.IncidentPatientDetailsUpdateInput {
    const data: Prisma.IncidentPatientDetailsUpdateInput = {};
    if (dto.patientName !== undefined) {
      data.patientName = dto.patientName?.trim() || null;
      data.unidentified = !dto.patientName?.trim();
    }
    if (dto.age !== undefined) data.age = dto.age ?? null;
    if (dto.gender) data.gender = dto.gender;
    if (dto.suspectedCondition !== undefined) data.suspectedCondition = dto.suspectedCondition?.trim() || null;
    if (dto.treatmentProvided !== undefined) data.treatmentProvided = dto.treatmentProvided?.trim() || null;
    if (dto.symptoms !== undefined) data.symptoms = dto.symptoms?.trim() || null;
    if (dto.injuries !== undefined) data.injuries = dto.injuries?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    return data;
  }

  private isCaseNumberConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      JSON.stringify(error.meta?.target ?? '').includes('caseNumber')
    );
  }
}
