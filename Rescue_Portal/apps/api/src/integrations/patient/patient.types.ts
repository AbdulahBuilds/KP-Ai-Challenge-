export interface PatientReferenceSummary {
  referenceId: string;
  exists: boolean;
  displayName?: string | null;
  age?: number | null;
  gender?: string | null;
  externalUpdatedAt?: string | null;
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
}

export interface PatientEmergencySummary {
  referenceId: string;
  bloodGroup?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  sourceUpdatedAt?: string | null;
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
}

export interface PatientStatusUpdateInput {
  referenceId: string;
  incidentId: string;
  status: string;
  note?: string | null;
}

export interface PatientProvider {
  readonly name: string;
  readonly isMock: boolean;
  verifyReference(referenceId: string): Promise<PatientReferenceSummary>;
  getEmergencySummary(referenceId: string): Promise<PatientEmergencySummary>;
  sendStatusUpdate(input: PatientStatusUpdateInput): Promise<{ accepted: boolean; message?: string | null }>;
}

export class PatientIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: 'TIMEOUT' | 'UNAVAILABLE' | 'UPSTREAM_ERROR' | 'CONFIGURATION' | 'NOT_FOUND',
    readonly retryable = true,
  ) {
    super(message);
    this.name = 'PatientIntegrationError';
  }
}
