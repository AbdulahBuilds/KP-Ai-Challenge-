import { Module } from '@nestjs/common';
import { HttpHospitalAdapter } from '../../integrations/hospital/http-hospital.adapter';
import { hospitalProviderFactory } from '../../integrations/hospital/hospital.provider';
import { MockHospitalAdapter } from '../../integrations/hospital/mock-hospital.adapter';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';

@Module({
  controllers: [HospitalsController],
  providers: [MockHospitalAdapter, HttpHospitalAdapter, hospitalProviderFactory, HospitalsService],
  exports: [HospitalsService],
})
export class HospitalsModule {}
