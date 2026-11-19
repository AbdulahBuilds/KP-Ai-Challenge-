export interface CapabilitySuggestion {
  code: string;
  label: string;
  confidence: number;
  matchedTerms: string[];
}

export interface CapabilitySuggestionResult {
  suggestions: CapabilitySuggestion[];
  source: 'heuristic' | 'http';
  isAiAssisted: boolean;
  disclaimer: string;
}

export interface IncidentSummaryResult {
  summary: string;
  source: 'heuristic' | 'http';
  isAiAssisted: boolean;
  disclaimer: string;
}

export interface RecommendationExplanationInput {
  hospitalName: string;
  eligibility: string;
  score: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  freshnessStatus: string;
  freshnessReason: string;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  unknownCapabilities: string[];
  isMock: boolean;
  policyVersion: string;
}

export interface RecommendationExplanationResult {
  text: string;
  source: 'heuristic' | 'http';
  isAiAssisted: boolean;
  disclaimer: string;
}

export interface AiProvider {
  readonly name: string;
  suggestCapabilities(text: string): Promise<CapabilitySuggestionResult>;
  summarizeIncident(text: string): Promise<IncidentSummaryResult>;
  explainRecommendation(input: RecommendationExplanationInput): Promise<RecommendationExplanationResult>;
}

export const AI_DISCLAIMER =
  'AI assistance only. Suggestions must be reviewed and confirmed by a trained dispatcher or clinician.';
