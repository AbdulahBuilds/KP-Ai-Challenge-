import type { EmergencyType, Severity } from '@prisma/client';

export type CapabilityAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';

export interface HospitalCapability {
  code: string;
  status: CapabilityAvailability;
  quantity?: number | null;
  note?: string | null;
}

export interface HospitalSummary {
  externalId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  services: string[];
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
}

export interface HospitalAvailability {
  hospitalExternalId: string;
  hospitalName: string;
  capabilities: HospitalCapability[];
  sourceResponseId: string;
  observedAt: Date;
  expiresAt: Date;
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
  raw?: unknown;
}

export interface HospitalSearchParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export type ExternalHospitalRequestStatus =
  | 'PENDING'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'MORE_INFO'
  | 'TIMED_OUT'
  | 'FAILED';

export interface HospitalEmergencyRequestInput {
  requestId: string;
  correlationId: string;
  idempotencyKey: string;
  incidentId: string;
  caseNumber: string;
  hospitalExternalId: string;
  severity: Severity;
  emergencyType: EmergencyType;
  location: { latitude: number; longitude: number; address?: string | null };
  patient: {
    patientName?: string | null;
    age?: number | null;
    gender?: string | null;
    unidentified?: boolean;
    suspectedCondition?: string | null;
    symptoms?: string | null;
    injuries?: string | null;
    allergies?: string | null;
    medicalHistory?: string | null;
  };
  requiredCapabilities: string[];
  etaMinutes?: number | null;
  requestedAt: string;
}

export interface HospitalEmergencyRequestResult {
  externalRequestId: string;
  status: ExternalHospitalRequestStatus;
  message?: string | null;
  respondedAt?: string | null;
  raw?: unknown;
}

export interface HospitalProvider {
  readonly name: string;
  readonly isMock: boolean;
  searchHospitals(params: HospitalSearchParams): Promise<HospitalSummary[]>;
  getCapabilities(hospitalExternalId: string): Promise<HospitalAvailability>;
  createEmergencyRequest(input: HospitalEmergencyRequestInput): Promise<HospitalEmergencyRequestResult>;
  getEmergencyRequest(externalRequestId: string): Promise<HospitalEmergencyRequestResult>;
  sendEta(externalRequestId: string, etaMinutes: number): Promise<HospitalEmergencyRequestResult>;
}

export class HospitalIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: 'TIMEOUT' | 'UNAVAILABLE' | 'UPSTREAM_ERROR' | 'CONFIGURATION' | 'NOT_FOUND',
    readonly retryable = true,
  ) {
    super(message);
    this.name = 'HospitalIntegrationError';
  }
}
