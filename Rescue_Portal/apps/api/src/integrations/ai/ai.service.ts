import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeuristicAiAdapter } from './heuristic-ai.adapter';
import { AI_PROVIDER } from './ai.provider';
import {
  AI_DISCLAIMER,
  type AiProvider,
  type HospitalRankingInput,
  type HospitalRankingResult,
  type RecommendationExplanationInput,
} from './ai.types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly requestedAdapter: string;

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly heuristic: HeuristicAiAdapter,
    private readonly config: ConfigService,
  ) {
    this.requestedAdapter = (this.config.get<string>('AI_ADAPTER') ?? 'heuristic').toLowerCase();
  }

  status() {
    const external = this.provider.name === 'http';
    return {
      adapter: this.provider.name,
      configured: external,
      enabled: external,
      isAiAssisted: external,
      mode: external ? 'ai' : 'rule_based',
      fallback: 'heuristic',
      notice: external
        ? 'AI recommendations are enabled via the configured provider.'
        : 'AI provider is not configured. Recommendations use a clearly identified rule-based fallback.',
      disclaimer: AI_DISCLAIMER,
    };
  }

  async suggestCapabilities(text: string) {
    if (this.provider.name !== 'http') return this.heuristic.suggestCapabilities(text);
    try {
      return await this.provider.suggestCapabilities(text);
    } catch (error) {
      this.logger.warn(`AI capability suggestion failed, using rule-based fallback: ${(error as Error).message}`);
      return this.heuristic.suggestCapabilities(text);
    }
  }

  async summarizeIncident(text: string) {
    if (this.provider.name !== 'http') return this.heuristic.summarizeIncident(text);
    try {
      return await this.provider.summarizeIncident(text);
    } catch (error) {
      this.logger.warn(`AI summary failed, using rule-based fallback: ${(error as Error).message}`);
      return this.heuristic.summarizeIncident(text);
    }
  }

  async explainRecommendation(input: RecommendationExplanationInput) {
    if (this.provider.name !== 'http') return this.heuristic.explainRecommendation(input);
    try {
      return await this.provider.explainRecommendation(input);
    } catch (error) {
      this.logger.warn(`AI explanation failed, using rule-based fallback: ${(error as Error).message}`);
      return this.heuristic.explainRecommendation(input);
    }
  }

  async rankHospitals(input: HospitalRankingInput): Promise<HospitalRankingResult> {
    const locallyRanked = input.candidates
      .filter((candidate) => candidate.eligibility === 'ELIGIBLE')
      .slice()
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const etaA = a.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const etaB = b.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        if (etaA !== etaB) return etaA - etaB;
        const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (distanceA !== distanceB) return distanceA - distanceB;
        return a.hospitalName.localeCompare(b.hospitalName);
      });
    let result: HospitalRankingResult;
    if (this.provider.name !== 'http') {
      result = await this.heuristic.rankHospitals(input);
    } else {
      try {
        result = await this.provider.rankHospitals(input);
      } catch (error) {
        this.logger.warn(`AI ranking failed, using rule-based fallback: ${(error as Error).message}`);
        result = await this.heuristic.rankHospitals(input);
      }
    }

    const orderedHospitalIds = locallyRanked.map((candidate) => candidate.hospitalExternalId);
    const suggestedHospitalId = orderedHospitalIds[0] ?? null;
    return { ...result, orderedHospitalIds, suggestedHospitalId };
  }
}
