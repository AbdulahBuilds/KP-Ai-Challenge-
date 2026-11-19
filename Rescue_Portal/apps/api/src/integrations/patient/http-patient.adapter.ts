import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PatientIntegrationError,
  type PatientEmergencySummary,
  type PatientProvider,
  type PatientReferenceSummary,
  type PatientStatusUpdateInput,
} from './patient.types';

/**
 * HTTP client for the external Patient Portal contract. Activate with
 * PATIENT_ADAPTER=http. The upstream API must be confirmed before production.
 */
@Injectable()
export class HttpPatientAdapter implements PatientProvider {
  readonly name = 'http';
  readonly isMock = false;

  constructor(private readonly config: ConfigService) {}

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const baseUrl = this.config.get<string>('PATIENT_API_BASE_URL');
    if (!baseUrl) throw new PatientIntegrationError('PATIENT_API_BASE_URL is not configured', 'CONFIGURATION', false);
    const apiKey = this.config.get<string>('PATIENT_API_KEY');
    const timeoutMs = Number(this.config.get<string>('PATIENT_API_TIMEOUT_MS', '10000'));
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
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
      throw new PatientIntegrationError(`Patient Portal request failed: ${(error as Error).message}`, 'UNAVAILABLE', true);
    }
    if (!response.ok) {
      throw new PatientIntegrationError(
        `Patient Portal returned HTTP ${response.status}`,
        response.status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR',
        response.status >= 500,
      );
    }
    return (await response.json()) as T;
  }

  async verifyReference(referenceId: string): Promise<PatientReferenceSummary> {
    const response = await this.request<Partial<PatientReferenceSummary>>(
      `/api/patients/${encodeURIComponent(referenceId)}/verify`,
      { method: 'GET' },
    );
    return {
      referenceId,
      exists: response.exists ?? false,
      displayName: response.displayName ?? null,
      age: response.age ?? null,
      gender: response.gender ?? null,
      externalUpdatedAt: response.externalUpdatedAt ?? null,
      isMock: false,
      dataSource: 'LIVE',
    };
  }

  async getEmergencySummary(referenceId: string): Promise<PatientEmergencySummary> {
    const response = await this.request<Partial<PatientEmergencySummary>>(
      `/api/patients/${encodeURIComponent(referenceId)}/emergency-summary`,
      { method: 'GET' },
    );
    return {
      referenceId,
      bloodGroup: response.bloodGroup ?? null,
      allergies: response.allergies ?? null,
      conditions: response.conditions ?? null,
      medications: response.medications ?? null,
      emergencyContactName: response.emergencyContactName ?? null,
      emergencyContactPhone: response.emergencyContactPhone ?? null,
      sourceUpdatedAt: response.sourceUpdatedAt ?? null,
      isMock: false,
      dataSource: 'LIVE',
    };
  }

  async sendStatusUpdate(input: PatientStatusUpdateInput): Promise<{ accepted: boolean; message?: string | null }> {
    return this.request<{ accepted: boolean; message?: string | null }>(
      `/api/patients/${encodeURIComponent(input.referenceId)}/status-updates`,
      {
        method: 'POST',
        headers: { 'X-Correlation-Id': input.incidentId },
        body: JSON.stringify(input),
      },
    );
  }
}
