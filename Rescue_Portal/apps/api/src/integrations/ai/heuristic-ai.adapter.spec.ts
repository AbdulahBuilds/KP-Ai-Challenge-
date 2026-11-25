import { HeuristicAiAdapter } from './heuristic-ai.adapter';
import type { HospitalRankingCandidate } from './ai.types';

function candidate(overrides: Partial<HospitalRankingCandidate>): HospitalRankingCandidate {
  return {
    hospitalExternalId: 'hp-001',
    hospitalName: 'General Hospital',
    eligibility: 'ELIGIBLE',
    score: 80,
    distanceKm: 5,
    etaMinutes: 10,
    freshnessStatus: 'FRESH',
    matchedCapabilities: ['BED_ICU'],
    capabilityEvaluations: [{ code: 'BED_ICU', status: 'AVAILABLE', quantity: 2, note: 'ICU beds free' }],
    dataSource: 'LIVE',
    ...overrides,
  };
}

describe('HeuristicAiAdapter.rankHospitals', () => {
  const adapter = new HeuristicAiAdapter();

  it('suggests the best eligible hospital using live capability data', async () => {
    const result = await adapter.rankHospitals({
      severity: 'CRITICAL',
      emergencyType: 'TRAUMA',
      requiredCapabilities: ['BED_ICU'],
      candidates: [
        candidate({ hospitalExternalId: 'hp-001', score: 70, etaMinutes: 14 }),
        candidate({ hospitalExternalId: 'hp-002', hospitalName: 'Trauma Centre', score: 92, etaMinutes: 8 }),
      ],
    });

    expect(result.orderedHospitalIds).toEqual(['hp-002', 'hp-001']);
    expect(result.suggestedHospitalId).toBe('hp-002');
    expect(result.rationaleById['hp-002']).toContain('ICU bed (2 available)');
  });

  it('never ranks an ineligible hospital as a suggestion', async () => {
    const result = await adapter.rankHospitals({
      severity: 'HIGH',
      emergencyType: 'MEDICAL',
      requiredCapabilities: ['BED_ICU'],
      candidates: [
        candidate({ hospitalExternalId: 'hp-001', eligibility: 'INELIGIBLE', score: 99 }),
        candidate({ hospitalExternalId: 'hp-002', eligibility: 'UNCONFIRMED', score: 95 }),
      ],
    });

    expect(result.orderedHospitalIds).toEqual([]);
    expect(result.suggestedHospitalId).toBeNull();
  });
});
