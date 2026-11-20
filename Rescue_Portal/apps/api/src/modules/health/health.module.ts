import { Module } from '@nestjs/common';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { MapsModule } from '../../integrations/maps/maps.module';
import { AiModule } from '../../integrations/ai/ai.module';
import { MessagingModule } from '../../integrations/messaging/messaging.module';
import { HealthController } from './health.controller';

@Module({
  imports: [HospitalsModule, MapsModule, AiModule, MessagingModule],
  controllers: [HealthController],
})
export class HealthModule {}
