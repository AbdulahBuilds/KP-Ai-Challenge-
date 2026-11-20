import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CapabilityAvailability } from './hospital.types';
import {
  HospitalIntegrationError,
  type ExternalHospitalRequestStatus,
  type HospitalAvailability,
  type HospitalCapability,
  type HospitalEmergencyRequestInput,
  type HospitalEmergencyRequestResult,
  type HospitalProvider,
  type HospitalSearchParams,
  type HospitalSummary,
} from './hospital.types';

interface HospitalHttpSummary {
  id?: string;
  externalId?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  services?: string[];
}

interface HospitalHttpAvailability {
  hospitalExternalId?: string;
  hospitalId?: string;
  hospitalName?: string;
  capabilities?: { code?: string; status?: string; quantity?: number | null; note?: string | null }[];
  snapshotId?: string;
  observedAt?: string;
  expiresAt?: string;
  raw?: unknown;
}

interface HospitalHttpRequestResult {
  requestId?: string;
  externalRequestId?: string;
  status?: string;
  message?: string | null;
  respondedAt?: string | null;
  raw?: unknown;
}

const EXTERNAL_STATUSES: ExternalHospitalRequestStatus[] = [
  'PENDING',
  'ACKNOWLEDGED',
  'ACCEPTED',
  'REJECTED',
  'MORE_INFO',
  'TIMED_OUT',
  'FAILED',
];

/**
 * HTTP client for the external Hospital Portal contract. Activate with
 * HOSPITAL_ADAPTER=http. The exact upstream implementation must be confirmed
 * with the hospital integration owner before production use.
 */
@Injectable()
export class HttpHospitalAdapter implements HospitalProvider {
  readonly name = 'http';
  readonly isMock = false;
  private readonly logger = new Logger(HttpHospitalAdapter.name);
  private consecutiveFailures = 0;
  private circuitOpenedAt: number | null = null;
  private lastError: string | null = null;
  private readonly failureThreshold = 5;
  private readonly circuitCooldownMs = 30_000;

  constructor(private readonly config: ConfigService) {}

  get circuitState(): 'CLOSED' | 'OPEN' {
    if (this.circuitOpenedAt && Date.now() - this.circuitOpenedAt < this.circuitCooldownMs) return 'OPEN';
    if (this.circuitOpenedAt) {
      this.circuitOpenedAt = null;
      this.consecutiveFailures = 0;
    }
    return 'CLOSED';
  }

  get health() {
    return {
      adapter: this.name,
      circuit: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
    };
  }

  private baseUrl(): string {
    const url = this.config.get<string>('HOSPITAL_API_BASE_URL');
    if (!url) throw new HospitalIntegrationError('HOSPITAL_API_BASE_URL is not configured', 'CONFIGURATION', false);
    return url.replace(/\/$/, '');
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (this.circuitState === 'OPEN') {
      throw new HospitalIntegrationError('Hospital integration circuit breaker is open', 'UNAVAILABLE', true);
    }
    const timeoutMs = Number(this.config.get<string>('HOSPITAL_API_TIMEOUT_MS', '10000'));
    const apiKey = this.config.get<string>('HOSPITAL_API_KEY');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.recordFailure((error as Error).message);
      const timedOut = (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError';
      throw new HospitalIntegrationError(
        timedOut ? 'Hospital Portal request timed out' : `Hospital Portal request failed: ${(error as Error).message}`,
        timedOut ? 'TIMEOUT' : 'UNAVAILABLE',
        true,
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.recordFailure(`HTTP ${response.status}`);
      throw new HospitalIntegrationError(
        `Hospital Portal returned HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
        response.status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR',
        response.status >= 500 || response.status === 429,
      );
    }
    this.recordSuccess();
    return (await response.json()) as T;
  }

  private recordFailure(message: string): void {
    this.lastError = message;
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold && !this.circuitOpenedAt) {
      this.circuitOpenedAt = Date.now();
      this.logger.error(`Hospital integration circuit opened after ${this.consecutiveFailures} failures`);
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;
    this.lastError = null;
  }

  private mapStatus(status: string | undefined): ExternalHospitalRequestStatus {
    const normalised = (status ?? 'FAILED').toUpperCase();
    return EXTERNAL_STATUSES.includes(normalised as ExternalHospitalRequestStatus)
      ? (normalised as ExternalHospitalRequestStatus)
      : 'FAILED';
  }

  async searchHospitals(params: HospitalSearchParams): Promise<HospitalSummary[]> {
    const query = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      ...(params.radiusKm ? { radiusKm: String(params.radiusKm) } : {}),
      ...(params.limit ? { limit: String(params.limit) } : {}),
    });
    const response = await this.request<HospitalHttpSummary[] | { data?: HospitalHttpSummary[] }>(
      `/api/hospitals/search?${query.toString()}`,
      { method: 'GET' },
    );
    const hospitals = Array.isArray(response) ? response : response.data ?? [];
    return hospitals.map((hospital) => {
      const externalId = hospital.externalId ?? hospital.id;
      if (!externalId || hospital.latitude === undefined || hospital.longitude === undefined) {
        throw new HospitalIntegrationError('Hospital Portal returned a hospital without id or coordinates', 'UPSTREAM_ERROR', false);
      }
      return {
        externalId,
        name: hospital.name ?? externalId,
        address: hospital.address ?? null,
        city: hospital.city ?? null,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        phone: hospital.phone ?? null,
        services: hospital.services ?? [],
        isMock: false,
        dataSource: 'LIVE',
      };
    });
  }

  async getCapabilities(hospitalExternalId: string): Promise<HospitalAvailability> {
    const payload = await this.request<HospitalHttpAvailability | { data?: HospitalHttpAvailability }>(
      `/api/hospitals/${encodeURIComponent(hospitalExternalId)}/capabilities`,
      { method: 'GET' },
    );
    const data = 'data' in payload && payload.data ? payload.data : (payload as HospitalHttpAvailability);
    const capabilities: HospitalCapability[] = (data.capabilities ?? []).map((capability) => {
      const status = (capability.status ?? 'UNKNOWN').toUpperCase();
      return {
        code: capability.code ?? 'UNKNOWN',
        status: (['AVAILABLE', 'UNAVAILABLE', 'UNKNOWN'].includes(status) ? status : 'UNKNOWN') as CapabilityAvailability,
        quantity: capability.quantity ?? null,
        note: capability.note ?? null,
      };
    });
    const observedAt = data.observedAt ? new Date(data.observedAt) : new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(observedAt.getTime() + 5 * 60 * 1000);
    if (Number.isNaN(observedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      throw new HospitalIntegrationError('Hospital Portal returned invalid availability timestamps', 'UPSTREAM_ERROR', false);
    }
    return {
      hospitalExternalId,
      hospitalName: data.hospitalName ?? hospitalExternalId,
      capabilities,
      sourceResponseId: data.snapshotId ?? `live-${Date.now()}`,
      observedAt,
      expiresAt,
      isMock: false,
      dataSource: 'LIVE',
      raw: data.raw,
    };
  }

  async createEmergencyRequest(input: HospitalEmergencyRequestInput): Promise<HospitalEmergencyRequestResult> {
    const payload = await this.request<HospitalHttpRequestResult>('/api/emergency-requests', {
      method: 'POST',
      headers: {
        'Idempotency-Key': input.idempotencyKey,
        'X-Correlation-Id': input.correlationId,
      },
      body: JSON.stringify(input),
    });
    const externalRequestId = payload.externalRequestId ?? payload.requestId;
    if (!externalRequestId) {
      throw new HospitalIntegrationError('Hospital Portal did not return a request identifier', 'UPSTREAM_ERROR', false);
    }
    return {
      externalRequestId,
      status: this.mapStatus(payload.status),
      message: payload.message ?? null,
      respondedAt: payload.respondedAt ?? null,
      raw: payload.raw,
    };
  }

  async getEmergencyRequest(externalRequestId: string): Promise<HospitalEmergencyRequestResult> {
    const payload = await this.request<HospitalHttpRequestResult>(
      `/api/emergency-requests/${encodeURIComponent(externalRequestId)}`,
      { method: 'GET' },
    );
    return {
      externalRequestId,
      status: this.mapStatus(payload.status),
      message: payload.message ?? null,
      respondedAt: payload.respondedAt ?? null,
      raw: payload.raw,
    };
  }

  async sendEta(externalRequestId: string, etaMinutes: number): Promise<HospitalEmergencyRequestResult> {
    const payload = await this.request<HospitalHttpRequestResult>(
      `/api/emergency-requests/${encodeURIComponent(externalRequestId)}/eta`,
      { method: 'POST', body: JSON.stringify({ etaMinutes }) },
    );
    return {
      externalRequestId,
      status: this.mapStatus(payload.status),
      message: payload.message ?? null,
      respondedAt: payload.respondedAt ?? null,
      raw: payload.raw,
    };
  }
}
