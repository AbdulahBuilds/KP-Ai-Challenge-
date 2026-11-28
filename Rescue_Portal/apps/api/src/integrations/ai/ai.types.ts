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

export type IncidentNarrativeLanguage = 'en' | 'ur' | 'ps';

export type DetectedEmergencyType =
  | 'MEDICAL'
  | 'TRAUMA'
  | 'CARDIAC'
  | 'RESPIRATORY'
  | 'OBSTETRIC'
  | 'PEDIATRIC'
  | 'NEONATAL'
  | 'PSYCHIATRIC'
  | 'BURNS'
  | 'MASS_CASUALTY'
  | 'OTHER';

export type DetectedSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
export type DetectedGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export interface StructuredIncidentNarrativeResult {
  normalizedTranscript: string;
  symptoms: string;
  injuries: string;
  suspectedCondition: string;
  treatmentProvided: string;
  notes: string;
  resourceNeeds: string;
  patientName: string | null;
  age: number | null;
  gender: DetectedGender | null;
  emergencyType: DetectedEmergencyType | null;
  severity: DetectedSeverity | null;
  address: string | null;
  capabilities: string[];
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

export interface HospitalRankingCandidate {
  hospitalExternalId: string;
  hospitalName: string;
  eligibility: string;
  score: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  freshnessStatus: string;
  matchedCapabilities: string[];
  capabilityEvaluations: Array<{ code: string; status: string; quantity?: number | null; note?: string | null }>;
  dataSource: 'MOCK' | 'LIVE';
}

export interface HospitalRankingInput {
  severity: string;
  emergencyType: string;
  requiredCapabilities: string[];
  candidates: HospitalRankingCandidate[];
}

export interface HospitalRankingResult {
  orderedHospitalIds: string[];
  suggestedHospitalId: string | null;
  summary: string;
  rationaleById: Record<string, string>;
  source: 'heuristic' | 'http';
  isAiAssisted: boolean;
  disclaimer: string;
}

export interface AiProvider {
  readonly name: string;
  suggestCapabilities(text: string): Promise<CapabilitySuggestionResult>;
  summarizeIncident(text: string): Promise<IncidentSummaryResult>;
  structureIncidentNarrative(
    transcript: string,
    language?: IncidentNarrativeLanguage,
  ): Promise<StructuredIncidentNarrativeResult>;
  explainRecommendation(input: RecommendationExplanationInput): Promise<RecommendationExplanationResult>;
  rankHospitals(input: HospitalRankingInput): Promise<HospitalRankingResult>;
}

export const AI_DISCLAIMER =
  'AI assistance only. Suggestions must be reviewed and confirmed by a trained dispatcher or clinician.';
