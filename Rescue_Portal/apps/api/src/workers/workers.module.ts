import { Module } from '@nestjs/common';
import { HospitalsModule } from '../modules/hospitals/hospitals.module';
import { WorkersService } from './workers.service';

@Module({
  imports: [HospitalsModule],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
