import { Injectable, Logger } from '@nestjs/common';
import type {
  PatientEmergencySummary,
  PatientProvider,
  PatientReferenceSummary,
  PatientStatusUpdateInput,
} from './patient.types';

const RECORDS: Record<string, PatientEmergencySummary & { displayName: string; age: number; gender: string }> = {
  'MOCK-PAT-001': {
    referenceId: 'MOCK-PAT-001',
    displayName: '[MOCK] Ahmed Raza',
    age: 42,
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: 'Penicillin (mild rash)',
    conditions: 'Hypertension',
    medications: 'Amlodipine 5mg daily',
    emergencyContactName: '[MOCK] Fatima Raza',
    emergencyContactPhone: '+92-300-0000001',
    sourceUpdatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    isMock: true,
    dataSource: 'MOCK',
  },
  'MOCK-PAT-002': {
    referenceId: 'MOCK-PAT-002',
    displayName: '[MOCK] Sana Khan',
    age: 29,
    gender: 'FEMALE',
    bloodGroup: 'A-',
    allergies: 'None recorded',
    conditions: 'Asthma',
    medications: 'Salbutamol inhaler as needed',
    emergencyContactName: '[MOCK] Bilal Khan',
    emergencyContactPhone: '+92-300-0000002',
    sourceUpdatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    isMock: true,
    dataSource: 'MOCK',
  },
  'MOCK-PAT-003': {
    referenceId: 'MOCK-PAT-003',
    displayName: '[MOCK] Unidentified patient',
    age: 60,
    gender: 'UNKNOWN',
    bloodGroup: 'Unknown',
    allergies: 'Unknown',
    conditions: 'Diabetes (reported)',
    medications: 'Unknown',
    emergencyContactName: null,
    emergencyContactPhone: null,
    sourceUpdatedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    isMock: true,
    dataSource: 'MOCK',
  },
};

/** Mock Patient Portal adapter. All data is synthetic and labelled as such. */
@Injectable()
export class MockPatientAdapter implements PatientProvider {
  readonly name = 'mock';
  readonly isMock = true;
  private readonly logger = new Logger(MockPatientAdapter.name);

  async verifyReference(referenceId: string): Promise<PatientReferenceSummary> {
    const record = RECORDS[referenceId];
    return {
      referenceId,
      exists: Boolean(record),
      displayName: record?.displayName ?? null,
      age: record?.age ?? null,
      gender: record?.gender ?? null,
      externalUpdatedAt: record?.sourceUpdatedAt ?? null,
      isMock: true,
      dataSource: 'MOCK',
    };
  }

  async getEmergencySummary(referenceId: string): Promise<PatientEmergencySummary> {
    const record = RECORDS[referenceId];
    if (!record) {
      return {
        referenceId,
        bloodGroup: null,
        allergies: null,
        conditions: null,
        medications: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        sourceUpdatedAt: null,
        isMock: true,
        dataSource: 'MOCK',
      };
    }
    const { displayName: _displayName, age: _age, gender: _gender, ...summary } = record;
    return summary;
  }

  async sendStatusUpdate(input: PatientStatusUpdateInput): Promise<{ accepted: boolean; message: string }> {
    this.logger.log(
      `[MOCK PATIENT PORTAL] status update for ${input.referenceId} (case ${input.incidentId}): ${input.status}`,
    );
    return { accepted: true, message: 'Mock patient portal recorded the status update' };
  }
}
