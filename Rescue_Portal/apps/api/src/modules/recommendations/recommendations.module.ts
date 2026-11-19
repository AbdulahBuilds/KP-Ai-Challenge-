import { Module } from '@nestjs/common';
import { AiModule } from '../../integrations/ai/ai.module';
import { MapsModule } from '../../integrations/maps/maps.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [MapsModule, HospitalsModule, AiModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
