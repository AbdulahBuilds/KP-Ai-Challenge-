export type EmergencyType =
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

export type Severity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
export type Eligibility = 'ELIGIBLE' | 'UNCONFIRMED' | 'INELIGIBLE';
export type Freshness = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
export type ComparisonStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE' | 'UNKNOWN' | 'OUTDATED';
export type AlertDisplayStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'ACCEPTED' | 'REJECTED' | 'FAILED';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: string;
  organizationId: string | null;
  organization: { id: string; name: string; status: string } | null;
  roles: string[];
  permissions: string[];
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Patient {
  id?: string;
  patientName?: string | null;
  age?: number | null;
  gender?: string | null;
  unidentified?: boolean;
  contactPhone?: string | null;
  suspectedCondition?: string | null;
  symptoms?: string | null;
  injuries?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  notes?: string | null;
}

export interface CaseEvent {
  id: string;
  type: string;
  message: string;
  occurredAt: string;
  actor?: { id: string; firstName: string; lastName: string } | null;
  metadata?: Record<string, unknown> | null;
}

export interface HospitalRequest {
  id: string;
  hospitalExternalId: string;
  hospitalName: string;
  status: string;
  displayStatus?: AlertDisplayStatus;
  responseMessage?: string | null;
  etaMinutes?: number | null;
  isMock: boolean;
  dataSource?: 'MOCK' | 'LIVE';
  sentAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  externalRequestId?: string | null;
  notice?: string;
}

export interface CapabilityEvaluation {
  code: string;
  label: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';
  quantity?: number | null;
  note?: string | null;
}

export interface RecommendationSummaryRow {
  hospitalExternalId: string;
  hospitalName: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  routeSource: string;
  travelEstimated: boolean;
  freshness: { status: Freshness; ageSeconds: number | null; reason: string };
  eligibility: Eligibility;
  score: number;
  requiredCapabilities: string[];
  matchedCapabilities: string[];
  missingCapabilities: string[];
  unknownCapabilities: string[];
  capabilityEvaluations: CapabilityEvaluation[];
  reasons: string[];
  warnings: string[];
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
  observedAt?: string | null;
  expiresAt?: string | null;
  explanation?: string;
  explanationSource?: string;
  explanationMode?: 'ai' | 'rule_based';
  aiRank?: number | null;
  aiRationale?: string | null;
}

export interface Recommendation {
  id: string;
  incidentId: string;
  caseNumber?: string;
  policyVersion: string;
  policy?: Record<string, unknown>;
  requiredCapabilities?: string[];
  notes?: string | null;
  results: RecommendationSummaryRow[];
  suggestedHospitalId?: string | null;
  aiSuggestion?: {
    hospitalExternalId: string | null;
    hospitalName: string | null;
    summary: string;
    rationale: string | null;
    source: 'heuristic' | 'http';
    mode: 'ai' | 'rule_based';
  } | null;
  candidateCount: number;
  eligibleCount: number;
  unconfirmedCount: number;
  ineligibleCount: number;
  dataSource: 'MOCK' | 'LIVE';
  mapsSource: string;
  integration?: {
    hospital: { adapter: string; isMock: boolean; notice: string };
    maps: { provider: string; isMock?: boolean; estimated?: boolean; notice?: string };
    ai: { adapter?: string; enabled?: boolean; mode?: 'ai' | 'rule_based'; notice?: string };
    notice: string;
  };
  warnings?: string[];
  disclaimer?: string;
  createdAt?: string;
  generatedAt?: string;
}

export interface IncidentSummary {
  id: string;
  caseNumber: string;
  status?: string;
  severity: Severity;
  emergencyType: EmergencyType;
  title: string;
  summary?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  requiredCapabilities: string[];
  destinationHospitalId?: string | null;
  destinationHospitalName?: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt?: string;
  patient?: Patient | null;
  _count?: { hospitalRequests?: number };
}

export interface IncidentDetail extends IncidentSummary {
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null;
  events: CaseEvent[];
  hospitalRequests: HospitalRequest[];
  recommendations: Array<{ id: string; createdAt: string; eligibleCount: number; unconfirmedCount?: number; ineligibleCount?: number }>;
}

export interface Hospital {
  externalId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  services: string[];
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
  distanceKm?: number;
}

export interface IntegrationStatus {
  adapter?: string;
  isMock: boolean;
  dataSource?: 'MOCK' | 'LIVE' | 'MIXED';
  notice?: string;
  [key: string]: unknown;
}
