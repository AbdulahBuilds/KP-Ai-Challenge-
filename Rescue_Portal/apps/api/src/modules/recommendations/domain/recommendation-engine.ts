import { EligibilityStatus, FreshnessStatus } from '@prisma/client';
import { capabilityLabel } from '../../../common/constants/capabilities';
import type { LatLng } from '../../../common/utils/distance.util';
import { haversineDistanceKm } from '../../../common/utils/distance.util';
import { assessFreshness, type FreshnessResult } from '../../../common/utils/freshness.util';
import type { HospitalCapability } from '../../../integrations/hospital/hospital.types';

export const RECOMMENDATION_POLICY_VERSION = '2026-11-24.1';

export interface RecommendationPolicy {
  version: string;
  weights: {
    capabilityMatch: number;
    freshness: number;
    proximity: number;
    eta: number;
  };
  freshnessScores: Record<FreshnessStatus, number>;
  maxReferenceDistanceKm: number;
  maxReferenceEtaMinutes: number;
  eligibility: {
    unknownCapability: 'UNCONFIRMED';
    staleData: 'UNCONFIRMED';
    expiredData: 'UNCONFIRMED';
    unavailableCapability: 'INELIGIBLE';
    noRequiredCapabilities: 'UNCONFIRMED';
  };
}

export const DEFAULT_RECOMMENDATION_POLICY: RecommendationPolicy = {
  version: RECOMMENDATION_POLICY_VERSION,
  weights: { capabilityMatch: 50, freshness: 20, proximity: 20, eta: 10 },
  freshnessScores: { FRESH: 1, STALE: 0.25, EXPIRED: 0, UNKNOWN: 0 },
  maxReferenceDistanceKm: 25,
  maxReferenceEtaMinutes: 45,
  eligibility: {
    unknownCapability: 'UNCONFIRMED',
    staleData: 'UNCONFIRMED',
    expiredData: 'UNCONFIRMED',
    unavailableCapability: 'INELIGIBLE',
    noRequiredCapabilities: 'UNCONFIRMED',
  },
};

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  source: string;
  estimated: boolean;
}

export interface RecommendationCandidate {
  hospitalExternalId: string;
  hospitalName: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  capabilities: HospitalCapability[];
  observedAt: Date | null;
  expiresAt: Date | null;
  sourceResponseId?: string | null;
  isMock: boolean;
  dataSource: 'MOCK' | 'LIVE';
  dataUnavailableReason?: string | null;
  route?: RouteEstimate | null;
}

export interface EvaluateCandidatesInput {
  candidate: RecommendationCandidate;
  requiredCapabilities: string[];
  incidentLocation: LatLng;
  maxAgeSeconds: number;
  policy?: RecommendationPolicy;
}

export interface CapabilityEvaluation {
  code: string;
  label: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';
  quantity: number | null;
  note: string | null;
}

export interface CandidateEvaluation {
  hospitalExternalId: string;
  hospitalName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  routeSource: string;
  travelEstimated: boolean;
  freshness: FreshnessResult;
  eligibility: EligibilityStatus;
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
  observedAt: string | null;
  expiresAt: string | null;
  sourceResponseId: string | null;
}

const ELIGIBILITY_ORDER: Record<EligibilityStatus, number> = {
  ELIGIBLE: 0,
  UNCONFIRMED: 1,
  INELIGIBLE: 2,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Eligibility is evaluated before ranking. A hospital is only ELIGIBLE when
 * every required capability is explicitly AVAILABLE and the data is FRESH.
 * Unknown or stale capability data can never produce an ELIGIBLE result.
 */
export function evaluateCandidate(
  candidate: RecommendationCandidate,
  input: Omit<EvaluateCandidatesInput, 'candidate'>,
): CandidateEvaluation {
  const policy = input.policy ?? DEFAULT_RECOMMENDATION_POLICY;
  const required = [...new Set(input.requiredCapabilities.map((code) => code.trim()).filter(Boolean))];
  const freshness = assessFreshness(candidate.observedAt, candidate.expiresAt, input.maxAgeSeconds);
  const reasons: string[] = [];
  const warnings: string[] = [];
  const capabilitiesByCode = new Map(candidate.capabilities.map((capability) => [capability.code, capability]));
  const matched: string[] = [];
  const missing: string[] = [];
  const unknown: string[] = [];
  const capabilityEvaluations: CapabilityEvaluation[] = required.map((code) => {
    const capability = capabilitiesByCode.get(code);
    if (!capability) {
      unknown.push(code);
      return { code, label: capabilityLabel(code), status: 'UNKNOWN', quantity: null, note: null };
    }
    if (capability.status === 'AVAILABLE') {
      matched.push(code);
    } else if (capability.status === 'UNAVAILABLE') {
      missing.push(code);
    } else {
      unknown.push(code);
    }
    return {
      code,
      label: capabilityLabel(code),
      status: capability.status,
      quantity: capability.quantity ?? null,
      note: capability.note ?? null,
    };
  });

  let eligibility: EligibilityStatus;
  if (required.length === 0) {
    eligibility = 'UNCONFIRMED';
    reasons.push('No required capabilities were specified; a dispatcher must confirm hospital suitability.');
  } else if (missing.length > 0) {
    eligibility = 'INELIGIBLE';
    reasons.push(
      `Required capability explicitly unavailable: ${missing.map(capabilityLabel).join(', ')}.`,
    );
  } else if (freshness.status !== 'FRESH') {
    eligibility = 'UNCONFIRMED';
    reasons.push(
      `Hospital capability data is ${freshness.status.toLowerCase()} and cannot confirm availability.`,
    );
  } else if (unknown.length > 0) {
    eligibility = 'UNCONFIRMED';
    reasons.push(
      `Required capability not confirmed: ${unknown.map(capabilityLabel).join(', ')}.`,
    );
  } else {
    eligibility = 'ELIGIBLE';
    reasons.push('All required capabilities are explicitly available on fresh data.');
  }

  if (freshness.status === 'STALE') warnings.push('Capability data is stale; confirm directly with the hospital.');
  if (freshness.status === 'EXPIRED') warnings.push('Capability data has expired; confirm directly with the hospital.');
  if (freshness.status === 'UNKNOWN') warnings.push('No reliable capability observation timestamp is available.');
  if (candidate.isMock) warnings.push('MOCK hospital data: this is not real hospital availability.');
  if (candidate.dataUnavailableReason) warnings.push(candidate.dataUnavailableReason);

  const routeDistance = candidate.route?.distanceKm;
  const distanceKm =
    typeof routeDistance === 'number'
      ? routeDistance
      : haversineDistanceKm(input.incidentLocation, {
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        });
  const etaMinutes = candidate.route?.durationMinutes ?? null;
  const routeSource = candidate.route?.source ?? 'haversine';
  const travelEstimated = candidate.route?.estimated ?? true;
  if (travelEstimated) {
    warnings.push('Travel distance/time is an estimate, not live traffic routing.');
  }

  const capabilityScore = required.length > 0 ? matched.length / required.length : 0.5;
  const freshnessScore = policy.freshnessScores[freshness.status] ?? 0;
  const proximityScore = clamp(1 - distanceKm / policy.maxReferenceDistanceKm);
  const etaScore = etaMinutes === null ? proximityScore : clamp(1 - etaMinutes / policy.maxReferenceEtaMinutes);
  const rawScore =
    capabilityScore * policy.weights.capabilityMatch +
    freshnessScore * policy.weights.freshness +
    proximityScore * policy.weights.proximity +
    etaScore * policy.weights.eta;
  const score = eligibility === 'INELIGIBLE' ? 0 : Math.round(rawScore * 10) / 10;

  return {
    hospitalExternalId: candidate.hospitalExternalId,
    hospitalName: candidate.hospitalName,
    address: candidate.address ?? null,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes,
    routeSource,
    travelEstimated,
    freshness,
    eligibility,
    score,
    requiredCapabilities: required,
    matchedCapabilities: matched,
    missingCapabilities: missing,
    unknownCapabilities: unknown,
    capabilityEvaluations,
    reasons,
    warnings,
    isMock: candidate.isMock,
    dataSource: candidate.dataSource,
    observedAt: candidate.observedAt?.toISOString() ?? null,
    expiresAt: candidate.expiresAt?.toISOString() ?? null,
    sourceResponseId: candidate.sourceResponseId ?? null,
  };
}

export function evaluateCandidates(
  candidates: RecommendationCandidate[],
  input: Omit<EvaluateCandidatesInput, 'candidate'>,
): CandidateEvaluation[] {
  return candidates
    .map((candidate) => evaluateCandidate(candidate, input))
    .sort((a, b) => {
      const eligibilityDiff = ELIGIBILITY_ORDER[a.eligibility] - ELIGIBILITY_ORDER[b.eligibility];
      if (eligibilityDiff !== 0) return eligibilityDiff;
      if (b.score !== a.score) return b.score - a.score;
      if (a.etaMinutes !== null && b.etaMinutes !== null && a.etaMinutes !== b.etaMinutes) {
        return a.etaMinutes - b.etaMinutes;
      }
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.hospitalName.localeCompare(b.hospitalName);
    });
}

export function countByEligibility(evaluations: CandidateEvaluation[]) {
  return {
    eligibleCount: evaluations.filter((e) => e.eligibility === 'ELIGIBLE').length,
    unconfirmedCount: evaluations.filter((e) => e.eligibility === 'UNCONFIRMED').length,
    ineligibleCount: evaluations.filter((e) => e.eligibility === 'INELIGIBLE').length,
  };
}
