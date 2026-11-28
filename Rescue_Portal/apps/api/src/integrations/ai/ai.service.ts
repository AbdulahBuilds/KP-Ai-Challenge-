import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CAPABILITY_CODES } from '../../common/constants/capabilities';
import { detectNarrativeLanguage, HeuristicAiAdapter, romanizeUrdu } from './heuristic-ai.adapter';
import { AI_PROVIDER } from './ai.provider';
import {
  AI_DISCLAIMER,
  type AiProvider,
  type HospitalRankingInput,
  type HospitalRankingResult,
  type IncidentNarrativeLanguage,
  type RecommendationExplanationInput,
  type StructuredIncidentNarrativeResult,
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

  async structureIncidentNarrative(
    transcript: string,
    language?: IncidentNarrativeLanguage,
  ): Promise<StructuredIncidentNarrativeResult> {
    const detectedLanguage = language ?? detectNarrativeLanguage(transcript);
    const fallback = await this.heuristic.structureIncidentNarrative(transcript, detectedLanguage);
    if (this.provider.name !== 'http') return fallback;

    try {
      const result = await this.provider.structureIncidentNarrative(transcript, detectedLanguage);
      if (!result.normalizedTranscript?.trim()) {
        throw new Error('AI narrative response did not include normalizedTranscript');
      }
      const textFields = [
        'symptoms',
        'injuries',
        'suspectedCondition',
        'treatmentProvided',
        'notes',
        'resourceNeeds',
      ] as const;
      for (const field of textFields) {
        if (typeof result[field] !== 'string') {
          throw new Error(`AI narrative response has an invalid ${field} field`);
        }
      }

      const validGenders = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
      const validSeverities = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'];
      const validEmergencyTypes = [
        'MEDICAL',
        'TRAUMA',
        'CARDIAC',
        'RESPIRATORY',
        'OBSTETRIC',
        'PEDIATRIC',
        'NEONATAL',
        'PSYCHIATRIC',
        'BURNS',
        'MASS_CASUALTY',
        'OTHER',
      ];
      const detectedCapabilities = Array.isArray(result.capabilities)
        ? result.capabilities.filter((code): code is string => typeof code === 'string' && CAPABILITY_CODES.has(code))
        : [];
      const merged: StructuredIncidentNarrativeResult = {
        ...result,
        patientName:
          typeof result.patientName === 'string' && result.patientName.trim() ? result.patientName.trim() : fallback.patientName,
        age:
          Number.isInteger(result.age) && Number(result.age) >= 0 && Number(result.age) <= 130
            ? Number(result.age)
            : fallback.age,
        gender: validGenders.includes(result.gender ?? '')
          ? result.gender
          : fallback.gender,
        emergencyType: validEmergencyTypes.includes(result.emergencyType ?? '')
          ? result.emergencyType
          : fallback.emergencyType,
        severity: validSeverities.includes(result.severity ?? '') ? result.severity : fallback.severity,
        address: typeof result.address === 'string' && result.address.trim() ? result.address.trim() : fallback.address,
        capabilities: detectedCapabilities.length > 0 ? [...new Set(detectedCapabilities)] : fallback.capabilities,
        source: 'http',
        isAiAssisted: true,
        disclaimer: AI_DISCLAIMER,
      };
      if (detectedLanguage !== 'ur') return merged;
      return {
        ...merged,
        normalizedTranscript: romanizeUrdu(merged.normalizedTranscript),
        symptoms: romanizeUrdu(merged.symptoms),
        injuries: romanizeUrdu(merged.injuries),
        suspectedCondition: romanizeUrdu(merged.suspectedCondition),
        treatmentProvided: romanizeUrdu(merged.treatmentProvided),
        notes: romanizeUrdu(merged.notes),
        resourceNeeds: romanizeUrdu(merged.resourceNeeds),
      };
    } catch (error) {
      this.logger.warn(`AI narrative organization failed, using rule-based fallback: ${(error as Error).message}`);
      return fallback;
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
        const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (distanceA !== distanceB) return distanceA - distanceB;
        if (b.score !== a.score) return b.score - a.score;
        const etaA = a.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const etaB = b.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        if (etaA !== etaB) return etaA - etaB;
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
