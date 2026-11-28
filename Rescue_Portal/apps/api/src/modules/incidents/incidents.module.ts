import { Module } from '@nestjs/common';
import { AiModule } from '../../integrations/ai/ai.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [AiModule, HospitalsModule, RecommendationsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
