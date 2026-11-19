import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpPatientAdapter } from './http-patient.adapter';
import { MockPatientAdapter } from './mock-patient.adapter';
import type { PatientProvider } from './patient.types';

export const PATIENT_PROVIDER = Symbol('PATIENT_PROVIDER');

export const patientProviderFactory: Provider = {
  provide: PATIENT_PROVIDER,
  inject: [ConfigService, MockPatientAdapter, HttpPatientAdapter],
  useFactory: (config: ConfigService, mock: MockPatientAdapter, http: HttpPatientAdapter): PatientProvider =>
    (config.get<string>('PATIENT_ADAPTER') ?? 'mock').toLowerCase() === 'http' ? http : mock,
};
