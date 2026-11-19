import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { aiProviderFactory } from './ai.provider';
import { HeuristicAiAdapter } from './heuristic-ai.adapter';
import { HttpAiAdapter } from './http-ai.adapter';

@Module({
  providers: [HeuristicAiAdapter, HttpAiAdapter, aiProviderFactory, AiService],
  exports: [AiService],
})
export class AiModule {}
