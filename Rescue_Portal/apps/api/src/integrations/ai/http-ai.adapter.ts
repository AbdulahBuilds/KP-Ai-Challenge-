import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiProvider,
  CapabilitySuggestionResult,
  HospitalRankingInput,
  HospitalRankingResult,
  IncidentSummaryResult,
  IncidentNarrativeLanguage,
  RecommendationExplanationInput,
  RecommendationExplanationResult,
  StructuredIncidentNarrativeResult,
} from './ai.types';
import { AI_DISCLAIMER } from './ai.types';

/**
 * Optional external AI adapter. The surrounding AiService falls back to the
 * deterministic heuristic adapter when this provider is unavailable.
 */
@Injectable()
export class HttpAiAdapter implements AiProvider {
  readonly name = 'http';

  constructor(private readonly config: ConfigService) {}

  private async request<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = this.config.get<string>('AI_API_BASE_URL');
    if (!baseUrl) throw new Error('AI_API_BASE_URL is not configured');
    const apiKey = this.config.get<string>('AI_API_KEY');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(this.config.get<string>('AI_API_TIMEOUT_MS', '10000'))),
    });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
    return (await response.json()) as T;
  }

  async suggestCapabilities(text: string): Promise<CapabilitySuggestionResult> {
    const result = await this.request<Omit<CapabilitySuggestionResult, 'disclaimer' | 'isAiAssisted'>>(
      '/suggest-capabilities',
      { text },
    );
    return { ...result, source: 'http', isAiAssisted: true, disclaimer: AI_DISCLAIMER };
  }

  async summarizeIncident(text: string): Promise<IncidentSummaryResult> {
    const result = await this.request<Omit<IncidentSummaryResult, 'disclaimer' | 'isAiAssisted'>>(
      '/summarize-incident',
      { text },
    );
    return { ...result, source: 'http', isAiAssisted: true, disclaimer: AI_DISCLAIMER };
  }

  async structureIncidentNarrative(
    transcript: string,
    language: IncidentNarrativeLanguage = 'en',
  ): Promise<StructuredIncidentNarrativeResult> {
    const result = await this.request<
      Omit<StructuredIncidentNarrativeResult, 'source' | 'isAiAssisted' | 'disclaimer'>
    >('/structure-incident', {
      transcript,
      language,
      instructions:
        'Return a faithful transcript and organize only explicitly stated facts into the supplied fields. ' +
        'Do not diagnose, infer missing facts, or omit details. Also extract patientName, age, gender, emergencyType, severity, address, ' +
        'and capability codes (from the Rescue Portal capability catalogue) when they are explicitly stated. ' +
        'Keep English in English, render Urdu in Pakistani Roman Urdu, and keep Pashto in Pashto script. Put unclassified facts in notes.',
    });
    return { ...result, source: 'http', isAiAssisted: true, disclaimer: AI_DISCLAIMER };
  }

  async explainRecommendation(input: RecommendationExplanationInput): Promise<RecommendationExplanationResult> {
    const result = await this.request<Omit<RecommendationExplanationResult, 'disclaimer' | 'isAiAssisted'>>(
      '/explain-recommendation',
      input,
    );
    return { ...result, source: 'http', isAiAssisted: true, disclaimer: AI_DISCLAIMER };
  }

  async rankHospitals(input: HospitalRankingInput): Promise<HospitalRankingResult> {
    const result = await this.request<Omit<HospitalRankingResult, 'disclaimer' | 'isAiAssisted' | 'source'>>(
      '/rank-hospitals',
      input,
    );
    return { ...result, source: 'http', isAiAssisted: true, disclaimer: AI_DISCLAIMER };
  }
}
