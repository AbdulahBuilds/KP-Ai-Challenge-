import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CaseEventType,
  HospitalRequestStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { haversineDistanceKm } from '../../common/utils/distance.util';
import { assessFreshness } from '../../common/utils/freshness.util';
import { resolvePagination } from '../../common/utils/pagination.util';
import type { AuthUser } from '../../common/types/auth-user';
import { HOSPITAL_PROVIDER } from '../../integrations/hospital/hospital.provider';
import {
  HospitalIntegrationError,
  type ExternalHospitalRequestStatus,
  type HospitalAvailability,
  type HospitalEmergencyRequestInput,
  type HospitalEmergencyRequestResult,
  type HospitalProvider,
  type HospitalSummary,
} from '../../integrations/hospital/hospital.types';
import type {
  CreateHospitalRequestDto,
  HospitalDirectoryQueryDto,
  HospitalSearchQueryDto,
  SelectHospitalDto,
} from './dto/hospital.dto';

const ALL_AVAILABLE_HOSPITALS_RADIUS_KM = 21_000;

const NOTICE_MOCK =
  'Demo data: hospital information and alert responses are simulated (not real hospital availability).';
const NOTICE_LIVE =
  'Hospital data is supplied by the Hospital Portal. Availability can change quickly.';
const NOTICE_CACHED =
  'The Hospital Portal is temporarily unavailable. Showing the last known hospital data; confirm availability directly before dispatch.';

const STATUS_EVENTS: Partial<Record<ExternalHospitalRequestStatus, CaseEventType>> = {
  ACKNOWLEDGED: 'HOSPITAL_NOTIFIED',
  PENDING: 'HOSPITAL_NOTIFIED',
  ACCEPTED: 'HOSPITAL_ACCEPTED',
  REJECTED: 'HOSPITAL_REJECTED',
  MORE_INFO: 'HOSPITAL_NOTIFIED',
  TIMED_OUT: 'HOSPITAL_RESPONSE_TIMEOUT',
  FAILED: 'HOSPITAL_NOTIFIED',
};

@Injectable()
export class HospitalsService {
  private readonly logger = new Logger(HospitalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(HOSPITAL_PROVIDER) private readonly provider: HospitalProvider,
  ) {}

  private orgId(user: AuthUser): string {
    if (!user.organizationId) throw new ForbiddenException('Access denied');
    return user.organizationId;
  }

  private maxAgeSeconds(): number {
    return Number(this.config.get<string>('HOSPITAL_DATA_MAX_AGE_SECONDS', '300'));
  }

  private get notice(): string {
    return this.provider.isMock ? NOTICE_MOCK : NOTICE_LIVE;
  }

  private async findIncident(user: AuthUser, incidentId: string) {
    const organizationId = this.orgId(user);
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, organizationId },
      include: { patient: true },
    });
    if (!incident) throw new NotFoundException('Emergency case not found');
    return incident;
  }

  status() {
    return {
      adapter: this.provider.name,
      isMock: this.provider.isMock,
      dataSource: this.provider.isMock ? 'MOCK' : 'LIVE',
      notice: this.notice,
    };
  }

  async search(user: AuthUser, query: HospitalSearchQueryDto) {
    this.orgId(user);
    const radiusKm = query.radiusKm ?? 25;
    let results: HospitalSummary[];
    let usedCachedData = false;
    try {
      results = await this.provider.searchHospitals({
        latitude: query.latitude,
        longitude: query.longitude,
        radiusKm,
        limit: query.limit ?? 20,
      });
    } catch (error) {
      this.logger.warn(`Hospital Portal search unavailable, using cached directory: ${(error as Error).message}`);
      results = await this.cachedHospitals(query.latitude, query.longitude, radiusKm, query.limit ?? 20);
      usedCachedData = true;
    }
    const nearbyResults = results
      .map((hospital) => ({
        ...hospital,
        distanceKm: haversineDistanceKm(
          { latitude: query.latitude, longitude: query.longitude },
          { latitude: hospital.latitude, longitude: hospital.longitude },
        ),
      }))
      .filter((hospital) => Number.isFinite(hospital.distanceKm) && hospital.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, query.limit ?? 20);
    const now = new Date();
    if (nearbyResults.length > 0) {
      await this.prisma.$transaction(
        nearbyResults.map((hospital) =>
          this.prisma.hospitalDirectoryCache.upsert({
            where: { externalHospitalId: hospital.externalId },
            create: {
              externalHospitalId: hospital.externalId,
              name: hospital.name,
              address: hospital.address ?? null,
              city: hospital.city ?? null,
              latitude: hospital.latitude,
              longitude: hospital.longitude,
              phone: hospital.phone ?? null,
              services: hospital.services ?? [],
              isMock: hospital.isMock,
              dataSource: hospital.isMock ? 'MOCK' : 'LIVE',
              sourceFetchedAt: now,
              raw: hospital as unknown as Prisma.InputJsonValue,
            },
            update: {
              name: hospital.name,
              address: hospital.address ?? null,
              city: hospital.city ?? null,
              latitude: hospital.latitude,
              longitude: hospital.longitude,
              phone: hospital.phone ?? null,
              services: hospital.services ?? [],
              isMock: hospital.isMock,
              dataSource: hospital.isMock ? 'MOCK' : 'LIVE',
              sourceFetchedAt: now,
              raw: hospital as unknown as Prisma.InputJsonValue,
            },
          }),
        ),
      );
    }
    return {
      data: nearbyResults.map((hospital) => ({
        ...hospital,
        distanceKm: Math.round(hospital.distanceKm * 10) / 10,
      })),
      meta: { count: nearbyResults.length, radiusKm, searchedAt: now.toISOString(), usedCachedData },
      integration: {
        adapter: this.provider.name,
        isMock: this.provider.isMock,
        notice: usedCachedData ? NOTICE_CACHED : this.notice,
      },
    };
  }

  async searchAllAvailable(
    user: AuthUser,
    query: { latitude: number; longitude: number; limit?: number },
  ) {
    return this.search(user, {
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: ALL_AVAILABLE_HOSPITALS_RADIUS_KM,
      limit: query.limit ?? 25,
    });
  }

  async directory(user: AuthUser, query: HospitalDirectoryQueryDto) {
    this.orgId(user);
    const { page, pageSize, skip, take } = resolvePagination(query);
    const where: Prisma.HospitalDirectoryCacheWhereInput = {
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.hospitalDirectoryCache.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.hospitalDirectoryCache.count({ where }),
    ]);
    return {
      data: data.map((hospital) => ({
        ...hospital,
        dataSource: hospital.dataSource,
        notice: hospital.isMock ? NOTICE_MOCK : NOTICE_LIVE,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
      integration: { adapter: this.provider.name, isMock: this.provider.isMock, notice: this.notice },
    };
  }

  async getHospital(user: AuthUser, externalHospitalId: string) {
    this.orgId(user);
    const hospital = await this.prisma.hospitalDirectoryCache.findUnique({
      where: { externalHospitalId },
    });
    if (!hospital) throw new NotFoundException('Hospital not found. Search nearby hospitals first.');
    const snapshot = await this.prisma.hospitalAvailabilitySnapshot.findFirst({
      where: { hospitalExternalId: externalHospitalId },
      orderBy: { observedAt: 'desc' },
    });
    let latestAvailability = null;
    if (snapshot) {
      const assessed = assessFreshness(snapshot.observedAt, snapshot.expiresAt, this.maxAgeSeconds());
      latestAvailability = {
        ...assessed,
        capabilities: snapshot.capabilities,
        observedAt: snapshot.observedAt,
        expiresAt: snapshot.expiresAt,
      };
    }
    return { ...hospital, latestAvailability, notice: hospital.isMock ? NOTICE_MOCK : NOTICE_LIVE };
  }

  async capabilities(user: AuthUser, externalHospitalId: string) {
    this.orgId(user);
    let availability: HospitalAvailability;
    let usedCachedData = false;
    try {
      availability = await this.provider.getCapabilities(externalHospitalId);
    } catch (error) {
      this.logger.warn(`Hospital Portal capabilities unavailable for ${externalHospitalId}, using cached snapshot: ${(error as Error).message}`);
      availability = await this.cachedAvailability(externalHospitalId);
      usedCachedData = true;
    }
    const freshness = assessFreshness(availability.observedAt, availability.expiresAt, this.maxAgeSeconds());
    const snapshot = usedCachedData
      ? null
      : await this.prisma.hospitalAvailabilitySnapshot.create({
          data: {
            hospitalExternalId: availability.hospitalExternalId,
            hospitalName: availability.hospitalName,
            capabilities: availability.capabilities as unknown as Prisma.InputJsonValue,
            sourceResponseId: availability.sourceResponseId,
            observedAt: availability.observedAt,
            expiresAt: availability.expiresAt,
            freshness: freshness.status,
            isMock: availability.isMock,
            dataSource: availability.isMock ? 'MOCK' : 'LIVE',
            raw: availability.raw as Prisma.InputJsonValue | undefined,
          },
        });
    return {
      hospitalExternalId: availability.hospitalExternalId,
      hospitalName: availability.hospitalName,
      capabilities: availability.capabilities,
      freshness,
      observedAt: availability.observedAt,
      expiresAt: availability.expiresAt,
      sourceResponseId: availability.sourceResponseId,
      snapshotId: snapshot?.id ?? null,
      isMock: availability.isMock,
      dataSource: availability.dataSource,
      notice: usedCachedData ? NOTICE_CACHED : availability.isMock ? NOTICE_MOCK : NOTICE_LIVE,
    };
  }

  async selectDestination(user: AuthUser, dto: SelectHospitalDto) {
    const incident = await this.findIncident(user, dto.incidentId);
    const changing =
      Boolean(incident.destinationHospitalId) &&
      incident.destinationHospitalId !== dto.hospitalExternalId;
    if (changing && !dto.overrideReason?.trim() && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required when changing the destination hospital.');
    }
    const reason = (dto.reason ?? dto.overrideReason ?? '').trim() || null;

    const recommendation = dto.recommendationId
      ? await this.prisma.hospitalRecommendation.findFirst({
          where: { id: dto.recommendationId, incidentId: incident.id },
        })
      : null;
    if (dto.recommendationId && !recommendation) {
      throw new NotFoundException('Recommendation not found for this case');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: incident.id },
        data: {
          destinationHospitalId: dto.hospitalExternalId,
          destinationHospitalName: dto.hospitalName,
        },
      });
      if (recommendation) {
        await tx.hospitalRecommendation.update({
          where: { id: recommendation.id },
          data: {
            selectedHospitalId: dto.hospitalExternalId,
            selectedHospitalName: dto.hospitalName,
            selectedById: user.id,
            selectedAt: now,
          },
        });
      }
      await tx.caseEvent.create({
        data: {
          incidentId: incident.id,
          type: 'HOSPITAL_DESTINATION_SELECTED',
          message: changing
            ? `Destination hospital changed to ${dto.hospitalName}`
            : `Destination hospital selected: ${dto.hospitalName}`,
          actorId: user.id,
          metadata: {
            hospitalExternalId: dto.hospitalExternalId,
            hospitalName: dto.hospitalName,
            previousHospitalExternalId: incident.destinationHospitalId,
            previousHospitalName: incident.destinationHospitalName,
            recommendationId: dto.recommendationId ?? null,
            reason,
            changed: changing,
          } as Prisma.InputJsonValue,
        },
      });
    });

    await this.audit.record({
      action: changing ? 'HOSPITAL_DESTINATION_CHANGED' : 'HOSPITAL_DESTINATION_SELECTED',
      entityType: 'incident',
      entityId: incident.id,
      organizationId: incident.organizationId,
      actorId: user.id,
      before: {
        hospitalExternalId: incident.destinationHospitalId,
        hospitalName: incident.destinationHospitalName,
      },
      after: {
        hospitalExternalId: dto.hospitalExternalId,
        hospitalName: dto.hospitalName,
        recommendationId: dto.recommendationId ?? null,
        reason,
        selectedBy: `${user.firstName} ${user.lastName}`.trim(),
        selectedAt: now.toISOString(),
      },
    });

    return {
      destination: {
        hospitalExternalId: dto.hospitalExternalId,
        hospitalName: dto.hospitalName,
        selectedBy: { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() },
        selectedAt: now.toISOString(),
        changed: changing,
        reason,
      },
      notice: this.notice,
    };
  }

  async requestEmergency(user: AuthUser, incidentId: string, dto: CreateHospitalRequestDto) {
    const incident = await this.findIncident(user, incidentId);
    if (!incident.destinationHospitalId) {
      throw new BadRequestException('Select a destination hospital before sending a pre-arrival alert.');
    }
    if (incident.destinationHospitalId !== dto.hospitalExternalId) {
      throw new BadRequestException('Pre-arrival alert can only be sent to the selected destination hospital.');
    }
    const idempotencyKey =
      dto.idempotencyKey ?? `${incident.id}:${dto.hospitalExternalId}`;
    const existing = await this.prisma.hospitalRequest.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.incidentId !== incident.id) throw new BadGatewayException('Idempotency key belongs to another case');
      return this.viewRequest(existing);
    }

    const input: HospitalEmergencyRequestInput = {
      requestId: randomUUID(),
      correlationId: randomUUID(),
      idempotencyKey,
      incidentId: incident.id,
      caseNumber: incident.caseNumber,
      hospitalExternalId: dto.hospitalExternalId,
      severity: incident.severity,
      emergencyType: incident.emergencyType,
      location: {
        latitude: incident.latitude,
        longitude: incident.longitude,
        address: incident.address,
      },
      patient: {
        patientName: incident.patient?.patientName ?? null,
        age: incident.patient?.age ?? null,
        gender: incident.patient?.gender ?? null,
        unidentified: incident.patient?.unidentified ?? false,
        suspectedCondition: incident.patient?.suspectedCondition ?? null,
        symptoms: incident.patient?.symptoms ?? null,
        injuries: incident.patient?.injuries ?? null,
        allergies: null,
        medicalHistory: null,
      },
      requiredCapabilities:
        dto.requiredCapabilities && dto.requiredCapabilities.length > 0
          ? dto.requiredCapabilities
          : incident.requiredCapabilities,
      etaMinutes: dto.etaMinutes ?? null,
      requestedAt: new Date().toISOString(),
    };

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hospitalRequest.create({
        data: {
          incidentId: incident.id,
          organizationId: incident.organizationId,
          hospitalExternalId: dto.hospitalExternalId,
          hospitalName: dto.hospitalName,
          correlationId: input.correlationId,
          idempotencyKey,
          requestPayload: input as unknown as Prisma.InputJsonValue,
          requestedCapabilities: input.requiredCapabilities,
          etaMinutes: input.etaMinutes,
          isMock: this.provider.isMock,
        },
      });
      await tx.integrationOutbox.create({
        data: {
          aggregateType: 'HOSPITAL_REQUEST',
          aggregateId: created.id,
          eventType: 'HOSPITAL_REQUEST_DISPATCH',
          payload: { requestId: created.id } as Prisma.InputJsonValue,
        },
      });
      await tx.caseEvent.create({
        data: {
          incidentId: incident.id,
          type: 'HOSPITAL_NOTIFIED',
          message: `Pre-arrival alert created for ${dto.hospitalName}`,
          actorId: user.id,
          metadata: {
            hospitalRequestId: created.id,
            hospitalExternalId: dto.hospitalExternalId,
            isMock: this.provider.isMock,
          } as Prisma.InputJsonValue,
        },
      });
      return created;
    });

    await this.audit.record({
      action: 'HOSPITAL_PRE_ARRIVAL_ALERT_SENT',
      entityType: 'hospital_request',
      entityId: request.id,
      organizationId: incident.organizationId,
      actorId: user.id,
      after: {
        incidentId: incident.id,
        hospitalExternalId: dto.hospitalExternalId,
        hospitalName: dto.hospitalName,
        isMock: this.provider.isMock,
      },
    });

    try {
      await this.deliverRequest(request.id);
    } catch (error) {
      this.logger.warn(`Immediate alert delivery failed; queued for retry: ${(error as Error).message}`);
    }
    const stored = await this.prisma.hospitalRequest.findUnique({ where: { id: request.id } });
    return this.viewRequest(stored ?? request);
  }

  async deliverRequest(requestId: string): Promise<void> {
    const request = await this.prisma.hospitalRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status === 'CANCELLED' || request.sentAt) return;
    if (request.attemptCount >= 8) {
      await this.prisma.hospitalRequest.update({
        where: { id: request.id },
        data: { status: 'FAILED', lastError: 'Delivery retry limit exceeded' },
      });
      throw new Error('Hospital request delivery retry limit exceeded');
    }
    const input = request.requestPayload as unknown as HospitalEmergencyRequestInput;
    try {
      const result = await this.provider.createEmergencyRequest(input);
      await this.applyResult(request, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown hospital delivery error';
      await this.prisma.hospitalRequest.update({
        where: { id: request.id },
        data: { attemptCount: { increment: 1 }, lastError: message.slice(0, 500) },
      });
      throw error;
    }
  }

  async pollOpenRequests(): Promise<number> {
    const timeoutSeconds = Number(this.config.get<string>('HOSPITAL_REQUEST_TIMEOUT_SECONDS', '120'));
    const requests = await this.prisma.hospitalRequest.findMany({
      where: {
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
        sentAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { lastCheckedAt: 'asc' },
      take: 25,
    });
    let processed = 0;
    for (const request of requests) {
      const externalRequestId = this.externalRequestId(request);
      const timedOut =
        request.sentAt !== null && Date.now() - request.sentAt.getTime() > timeoutSeconds * 1000;
      try {
        if (timedOut) {
          await this.applyResult(request, {
            externalRequestId: externalRequestId ?? 'unknown',
            status: 'TIMED_OUT',
            message: `No hospital response within ${timeoutSeconds} seconds`,
            respondedAt: new Date().toISOString(),
          });
        } else if (externalRequestId) {
          const result = await this.provider.getEmergencyRequest(externalRequestId);
          await this.applyResult(request, result);
        }
        processed += 1;
      } catch (error) {
        await this.prisma.hospitalRequest.update({
          where: { id: request.id },
          data: {
            lastCheckedAt: new Date(),
            lastError: (error as Error).message.slice(0, 500),
          },
        });
        this.logger.warn(`Hospital request polling failed for ${request.id}: ${(error as Error).message}`);
      }
    }
    return processed;
  }

  async syncRequest(user: AuthUser, requestId: string) {
    const request = await this.findRequest(user, requestId);
    if (request.status === 'CANCELLED') return this.viewRequest(request);
    const externalRequestId = this.externalRequestId(request);
    if (!externalRequestId) {
      await this.deliverRequest(request.id);
      const refreshed = await this.prisma.hospitalRequest.findUniqueOrThrow({ where: { id: request.id } });
      return this.viewRequest(refreshed);
    }
    let result;
    try {
      result = await this.provider.getEmergencyRequest(externalRequestId);
    } catch (error) {
      this.handleProviderError(error);
    }
    const updated = await this.applyResult(request, result);
    return this.viewRequest(updated);
  }

  async updateEta(user: AuthUser, requestId: string, etaMinutes: number) {
    const request = await this.findRequest(user, requestId);
    if (request.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update the ETA of a cancelled alert');
    }
    const externalRequestId = this.externalRequestId(request);
    if (!externalRequestId) {
      throw new BadGatewayException('Emergency request has not been delivered to the Hospital Portal yet');
    }
    let result: HospitalEmergencyRequestResult;
    try {
      result = await this.provider.sendEta(externalRequestId, etaMinutes);
    } catch (error) {
      this.handleProviderError(error);
    }
    const previousPayload =
      request.responsePayload && typeof request.responsePayload === 'object' && !Array.isArray(request.responsePayload)
        ? (request.responsePayload as Record<string, unknown>)
        : {};
    const updated = await this.prisma.hospitalRequest.update({
      where: { id: request.id },
      data: {
        etaMinutes,
        responsePayload: { ...previousPayload, ...result } as unknown as Prisma.InputJsonValue,
        responseMessage: result.message ?? null,
        lastCheckedAt: new Date(),
        lastError: null,
      },
    });
    await this.prisma.caseEvent.create({
      data: {
        incidentId: request.incidentId,
        type: 'NOTE_ADDED' as CaseEventType,
        message: `Updated ETA for ${request.hospitalName} to ${etaMinutes} minutes`,
        metadata: {
          hospitalRequestId: request.id,
          hospitalExternalId: request.hospitalExternalId,
          externalRequestId,
          etaMinutes,
        } as Prisma.InputJsonValue,
      },
    });
    return this.viewRequest(updated);
  }

  async getRequest(user: AuthUser, requestId: string) {
    return this.viewRequest(await this.findRequest(user, requestId));
  }

  async listRequests(user: AuthUser, incidentId: string) {
    const incident = await this.findIncident(user, incidentId);
    const requests = await this.prisma.hospitalRequest.findMany({
      where: { incidentId: incident.id, organizationId: incident.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: requests.map((request) => this.viewRequest(request)),
      notice: this.notice,
    };
  }

  async communications(user: AuthUser, incidentId: string) {
    const incident = await this.findIncident(user, incidentId);
    const [requests, events] = await this.prisma.$transaction([
      this.prisma.hospitalRequest.findMany({
        where: { incidentId: incident.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.caseEvent.findMany({
        where: {
          incidentId: incident.id,
          type: {
            in: [
              'HOSPITAL_DESTINATION_SELECTED',
              'HOSPITAL_NOTIFIED',
              'HOSPITAL_ACCEPTED',
              'HOSPITAL_REJECTED',
              'HOSPITAL_RESPONSE_TIMEOUT',
            ],
          },
        },
        orderBy: { occurredAt: 'asc' },
        include: { actor: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);
    return {
      caseNumber: incident.caseNumber,
      destination: {
        hospitalExternalId: incident.destinationHospitalId,
        hospitalName: incident.destinationHospitalName,
      },
      requests: requests.map((request) => this.viewRequest(request)),
      events,
      notice: this.notice,
    };
  }

  async processOutboxPayload(payload: unknown): Promise<void> {
    const typed = payload as { requestId?: string } | null;
    if (!typed?.requestId) return;
    await this.deliverRequest(typed.requestId);
  }

  private async findRequest(user: AuthUser, requestId: string) {
    const organizationId = this.orgId(user);
    const request = await this.prisma.hospitalRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new NotFoundException('Hospital request not found');
    return request;
  }

  private externalRequestId(request: { responsePayload: Prisma.JsonValue | null }): string | null {
    const payload = request.responsePayload as { externalRequestId?: unknown } | null;
    return typeof payload?.externalRequestId === 'string' ? payload.externalRequestId : null;
  }

  private displayStatus(request: { status: string; sentAt: Date | null }) {
    const raw = request.status;
    // Allowed display statuses: Pending, Sent, Delivered, Acknowledged, Accepted, Rejected, Failed.
    // "Delivered" is never inferred without explicit provider confirmation (not available in current contract).
    if (raw === 'PENDING') return request.sentAt ? 'SENT' : 'PENDING';
    if (raw === 'ACKNOWLEDGED' || raw === 'MORE_INFO') return 'ACKNOWLEDGED';
    if (raw === 'ACCEPTED') return 'ACCEPTED';
    if (raw === 'REJECTED') return 'REJECTED';
    if (raw === 'TIMED_OUT' || raw === 'FAILED' || raw === 'CANCELLED') return 'FAILED';
    return request.sentAt ? 'SENT' : 'PENDING';
  }

  private viewRequest<T extends { isMock: boolean; responsePayload: Prisma.JsonValue | null; status: string; sentAt: Date | null }>(
    request: T,
  ) {
    return {
      ...request,
      externalRequestId: this.externalRequestId(request),
      dataSource: request.isMock ? 'MOCK' : 'LIVE',
      displayStatus: this.displayStatus(request),
      notice: request.isMock ? NOTICE_MOCK : NOTICE_LIVE,
    };
  }

  private async applyResult(
    request: {
      id: string;
      incidentId: string;
      organizationId: string;
      hospitalName: string;
      hospitalExternalId: string;
      status: HospitalRequestStatus;
      sentAt: Date | null;
      isMock: boolean;
    },
    result: HospitalEmergencyRequestResult,
  ) {
    const now = new Date();
    const terminal = ['ACCEPTED', 'REJECTED', 'MORE_INFO', 'TIMED_OUT', 'FAILED'].includes(result.status);
    const respondedAt = result.respondedAt ? new Date(result.respondedAt) : terminal ? now : null;
    const updated = await this.prisma.hospitalRequest.update({
      where: { id: request.id },
      data: {
        status: result.status as HospitalRequestStatus,
        responsePayload: result as unknown as Prisma.InputJsonValue,
        responseMessage: result.message ?? null,
        sentAt: request.sentAt ?? now,
        respondedAt: respondedAt ?? undefined,
        lastCheckedAt: now,
        lastError: null,
      },
    });
    if (request.status !== result.status) {
      await this.recordStatusChange(updated.incidentId, request, result);
    }
    return updated;
  }

  private async recordStatusChange(
    incidentId: string,
    request: { id: string; hospitalName: string; hospitalExternalId: string; isMock: boolean },
    result: HospitalEmergencyRequestResult,
  ): Promise<void> {
    const eventType = STATUS_EVENTS[result.status] ?? 'HOSPITAL_NOTIFIED';
    const message =
      result.status === 'ACCEPTED'
        ? `${request.hospitalName} accepted the pre-arrival alert`
        : result.status === 'REJECTED'
          ? `${request.hospitalName} rejected the pre-arrival alert${result.message ? `: ${result.message}` : ''}`
          : result.status === 'TIMED_OUT'
            ? `${request.hospitalName} did not respond before timeout`
            : result.status === 'MORE_INFO'
              ? `${request.hospitalName} requested more information${result.message ? `: ${result.message}` : ''}`
              : `${request.hospitalName} alert status: ${result.status}`;
    await this.prisma.caseEvent.create({
      data: {
        incidentId,
        type: eventType,
        message,
        metadata: {
          hospitalRequestId: request.id,
          hospitalExternalId: request.hospitalExternalId,
          status: result.status,
          externalRequestId: result.externalRequestId,
          isMock: request.isMock,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async cachedHospitals(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
  ): Promise<HospitalSummary[]> {
    const records = await this.prisma.hospitalDirectoryCache.findMany();
    return records
      .map((record) => ({
        externalId: record.externalHospitalId,
        name: record.name,
        address: record.address,
        city: record.city,
        latitude: record.latitude,
        longitude: record.longitude,
        phone: record.phone,
        services: (record.services ?? []) as string[],
        isMock: record.isMock,
        dataSource: record.dataSource as 'MOCK' | 'LIVE',
      }))
      .filter((hospital) => {
        const distance = haversineDistanceKm(
          { latitude, longitude },
          { latitude: hospital.latitude, longitude: hospital.longitude },
        );
        return Number.isFinite(distance) && distance <= radiusKm;
      })
      .sort((a, b) => {
        const distanceA = haversineDistanceKm({ latitude, longitude }, { latitude: a.latitude, longitude: a.longitude });
        const distanceB = haversineDistanceKm({ latitude, longitude }, { latitude: b.latitude, longitude: b.longitude });
        return distanceA - distanceB;
      })
      .slice(0, limit);
  }

  private async cachedAvailability(externalHospitalId: string): Promise<HospitalAvailability> {
    const snapshot = await this.prisma.hospitalAvailabilitySnapshot.findFirst({
      where: { hospitalExternalId: externalHospitalId },
      orderBy: { observedAt: 'desc' },
    });
    if (!snapshot) {
      throw new BadGatewayException(
        `Hospital Portal is unavailable and no cached capability data exists for ${externalHospitalId}.`,
      );
    }
    const hospital = await this.prisma.hospitalDirectoryCache.findUnique({
      where: { externalHospitalId },
    });
    return {
      hospitalExternalId: snapshot.hospitalExternalId,
      hospitalName: snapshot.hospitalName || hospital?.name || externalHospitalId,
      capabilities: (snapshot.capabilities ?? []) as unknown as HospitalAvailability['capabilities'],
      sourceResponseId: snapshot.sourceResponseId,
      observedAt: snapshot.observedAt,
      expiresAt: snapshot.expiresAt,
      isMock: snapshot.isMock,
      dataSource: snapshot.dataSource as 'MOCK' | 'LIVE',
      raw: snapshot.raw ?? undefined,
    };
  }

  private handleProviderError(error: unknown): never {
    if (error instanceof HospitalIntegrationError) {
      if (error.code === 'NOT_FOUND') throw new NotFoundException(error.message);
      if (error.code === 'CONFIGURATION') throw new BadGatewayException(error.message);
      throw new BadGatewayException(`Hospital integration unavailable: ${error.message}`);
    }
    throw new BadGatewayException(`Hospital integration failed: ${(error as Error).message}`);
  }
}
