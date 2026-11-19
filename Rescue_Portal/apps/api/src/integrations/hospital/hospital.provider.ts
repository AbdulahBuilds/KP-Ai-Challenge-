import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpHospitalAdapter } from './http-hospital.adapter';
import { MockHospitalAdapter } from './mock-hospital.adapter';
import type { HospitalProvider } from './hospital.types';

export const HOSPITAL_PROVIDER = Symbol('HOSPITAL_PROVIDER');

export const hospitalProviderFactory: Provider = {
  provide: HOSPITAL_PROVIDER,
  inject: [ConfigService, MockHospitalAdapter, HttpHospitalAdapter],
  useFactory: (
    config: ConfigService,
    mock: MockHospitalAdapter,
    http: HttpHospitalAdapter,
  ): HospitalProvider => {
    const adapter = (config.get<string>('HOSPITAL_ADAPTER') ?? 'mock').toLowerCase();
    return adapter === 'http' ? http : mock;
  },
};
