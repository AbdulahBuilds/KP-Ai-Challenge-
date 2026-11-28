import type { HospitalCapability } from '../../../integrations/hospital/hospital.types';
import {
  countByEligibility,
  evaluateCandidate,
  evaluateCandidates,
  type RecommendationCandidate,
} from './recommendation-engine';

function secondsAgo(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000);
}

function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}
const incidentLocation = { latitude: 31.5204, longitude: 74.3587 };

function capability(code: string, status: HospitalCapability['status'] = 'AVAILABLE'): HospitalCapability {
  return { code, status, quantity: null, note: null };
}

function candidate(overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    hospitalExternalId: 'hospital-1',
    hospitalName: 'General Hospital',
    address: 'Central Road',
    latitude: 31.53,
    longitude: 74.36,
    capabilities: [capability('BED_ICU'), capability('EQUIP_VENTILATOR')],
    observedAt: secondsAgo(30),
    expiresAt: secondsFromNow(300),
    isMock: true,
    dataSource: 'MOCK',
    route: null,
    ...overrides,
  };
}

const baseInput = {
  requiredCapabilities: ['BED_ICU', 'EQUIP_VENTILATOR'],
  incidentLocation,
  maxAgeSeconds: 300,
};

describe('recommendation engine eligibility', () => {
  it('marks a candidate ELIGIBLE only when all required capabilities are available on fresh data', () => {
    const result = evaluateCandidate(candidate(), baseInput);
    expect(result.eligibility).toBe('ELIGIBLE');
    expect(result.missingCapabilities).toEqual([]);
    expect(result.unknownCapabilities).toEqual([]);
    expect(result.matchedCapabilities).toEqual(['BED_ICU', 'EQUIP_VENTILATOR']);
    expect(result.score).toBeGreaterThan(0);
    expect(result.warnings).toContain('MOCK hospital data: this is not real hospital availability.');
  });

  it('marks a candidate INELIGIBLE and scores zero when a required capability is explicitly unavailable', () => {
    const result = evaluateCandidate(
      candidate({ capabilities: [capability('BED_ICU', 'AVAILABLE'), capability('EQUIP_VENTILATOR', 'UNAVAILABLE')] }),
      baseInput,
    );
    expect(result.eligibility).toBe('INELIGIBLE');
    expect(result.score).toBe(0);
    expect(result.missingCapabilities).toEqual(['EQUIP_VENTILATOR']);
  });

  it('treats missing capability records as UNCONFIRMED, never ELIGIBLE', () => {
    const result = evaluateCandidate(candidate({ capabilities: [capability('BED_ICU')] }), baseInput);
    expect(result.eligibility).toBe('UNCONFIRMED');
    expect(result.unknownCapabilities).toEqual(['EQUIP_VENTILATOR']);
    expect(result.score).toBeGreaterThan(0);
  });

  it('treats unknown capability status as UNCONFIRMED', () => {
    const result = evaluateCandidate(
      candidate({ capabilities: [capability('BED_ICU'), capability('EQUIP_VENTILATOR', 'UNKNOWN')] }),
      baseInput,
    );
    expect(result.eligibility).toBe('UNCONFIRMED');
    expect(result.unknownCapabilities).toEqual(['EQUIP_VENTILATOR']);
  });

  it('never marks stale data ELIGIBLE even when all capabilities are available', () => {
    const result = evaluateCandidate(
      candidate({
        observedAt: secondsAgo(10 * 60),
        expiresAt: secondsFromNow(300),
      }),
      baseInput,
    );
    expect(result.freshness.status).toBe('STALE');
    expect(result.eligibility).toBe('UNCONFIRMED');
    expect(result.warnings).toContain('Capability data is stale; confirm directly with the hospital.');
  });

  it('treats expired data as UNCONFIRMED', () => {
    const result = evaluateCandidate(
      candidate({ expiresAt: secondsAgo(1) }),
      baseInput,
    );
    expect(result.freshness.status).toBe('EXPIRED');
    expect(result.eligibility).toBe('UNCONFIRMED');
  });

  it('treats absent observation timestamps as UNCONFIRMED', () => {
    const result = evaluateCandidate(candidate({ observedAt: null, expiresAt: null }), baseInput);
    expect(result.freshness.status).toBe('UNKNOWN');
    expect(result.eligibility).toBe('UNCONFIRMED');
  });

  it('requires human confirmation when no capabilities are required', () => {
    const result = evaluateCandidate(candidate(), { ...baseInput, requiredCapabilities: [] });
    expect(result.eligibility).toBe('UNCONFIRMED');
    expect(result.requiredCapabilities).toEqual([]);
    expect(result.reasons[0]).toContain('No required capabilities');
  });

  it('deduplicates and trims required capability codes', () => {
    const result = evaluateCandidate(candidate(), {
      ...baseInput,
      requiredCapabilities: [' BED_ICU ', 'BED_ICU', 'EQUIP_VENTILATOR', ''],
    });
    expect(result.requiredCapabilities).toEqual(['BED_ICU', 'EQUIP_VENTILATOR']);
  });
});

describe('recommendation engine ranking', () => {
  it('orders by eligibility before score', () => {
    const eligibleFar = candidate({
      hospitalExternalId: 'eligible-far',
      hospitalName: 'Eligible Far',
      latitude: 31.9,
      longitude: 74.9,
    });
    const unconfirmedNear = candidate({
      hospitalExternalId: 'unconfirmed-near',
      hospitalName: 'Unconfirmed Near',
      latitude: 31.5205,
      longitude: 74.3588,
      capabilities: [capability('BED_ICU'), capability('EQUIP_VENTILATOR', 'UNKNOWN')],
    });
    const ineligibleNearest = candidate({
      hospitalExternalId: 'ineligible-nearest',
      hospitalName: 'Ineligible Nearest',
      latitude: 31.5204,
      longitude: 74.3587,
      capabilities: [capability('BED_ICU'), capability('EQUIP_VENTILATOR', 'UNAVAILABLE')],
    });

    const result = evaluateCandidates([ineligibleNearest, unconfirmedNear, eligibleFar], baseInput);
    expect(result.map((item) => item.hospitalExternalId)).toEqual([
      'eligible-far',
      'unconfirmed-near',
      'ineligible-nearest',
    ]);
    expect(countByEligibility(result)).toEqual({
      eligibleCount: 1,
      unconfirmedCount: 1,
      ineligibleCount: 1,
    });
  });

  it('prefers higher freshness and proximity among equally eligible candidates', () => {
    const nearFresh = candidate({
      hospitalExternalId: 'near',
      hospitalName: 'Near',
      latitude: 31.5205,
      longitude: 74.3588,
    });
    const farFresh = candidate({
      hospitalExternalId: 'far',
      hospitalName: 'Far',
      latitude: 31.62,
      longitude: 74.46,
    });
    const nearStale = candidate({
      hospitalExternalId: 'stale',
      hospitalName: 'Near Stale',
      latitude: 31.5205,
      longitude: 74.3588,
      observedAt: secondsAgo(10 * 60),
    });

    const result = evaluateCandidates([farFresh, nearStale, nearFresh], baseInput);
    expect(result[0].hospitalExternalId).toBe('near');
    expect(result[1].hospitalExternalId).toBe('far');
    expect(result[2].hospitalExternalId).toBe('stale');
  });

  it('orders eligible hospitals by distance before weighted score or ETA', () => {
    const near = candidate({
      hospitalExternalId: 'near',
      hospitalName: 'Near but slow',
      route: { distanceKm: 1, durationMinutes: 300, source: 'test', estimated: false },
    });
    const far = candidate({
      hospitalExternalId: 'far',
      hospitalName: 'Far but fast',
      route: { distanceKm: 10, durationMinutes: 1, source: 'test', estimated: false },
    });

    const result = evaluateCandidates([far, near], baseInput);
    expect(result[0].hospitalExternalId).toBe('near');
    expect(result[0].score).toBeLessThan(result[1].score);
  });

  it('uses route estimates and labels estimated travel', () => {
    const withRoute = candidate({
      route: {
        distanceKm: 3.2,
        durationMinutes: 7,
        source: 'fallback-haversine',
        estimated: true,
      },
    });
    const result = evaluateCandidate(withRoute, baseInput);
    expect(result.distanceKm).toBe(3.2);
    expect(result.etaMinutes).toBe(7);
    expect(result.routeSource).toBe('fallback-haversine');
    expect(result.travelEstimated).toBe(true);
    expect(result.warnings).toContain('Travel distance/time is an estimate, not live traffic routing.');
  });

  it('falls back to Haversine distance when no route is supplied', () => {
    const result = evaluateCandidate(candidate(), baseInput);
    expect(result.routeSource).toBe('haversine');
    expect(result.distanceKm).not.toBeNull();
    expect(result.travelEstimated).toBe(true);
  });
});
