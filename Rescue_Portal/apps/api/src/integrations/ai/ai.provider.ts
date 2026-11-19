import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeuristicAiAdapter } from './heuristic-ai.adapter';
import { HttpAiAdapter } from './http-ai.adapter';
import type { AiProvider } from './ai.types';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export const aiProviderFactory: Provider = {
  provide: AI_PROVIDER,
  inject: [ConfigService, HeuristicAiAdapter, HttpAiAdapter],
  useFactory: (config: ConfigService, heuristic: HeuristicAiAdapter, http: HttpAiAdapter): AiProvider =>
    (config.get<string>('AI_ADAPTER') ?? 'heuristic').toLowerCase() === 'http' ? http : heuristic,
};
