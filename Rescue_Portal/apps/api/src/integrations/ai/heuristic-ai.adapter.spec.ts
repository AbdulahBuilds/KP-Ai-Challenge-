import { detectNarrativeLanguage, HeuristicAiAdapter } from './heuristic-ai.adapter';
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

  it('recommends the nearest eligible hospital even when a farther hospital has a higher score', async () => {
    const result = await adapter.rankHospitals({
      severity: 'HIGH',
      emergencyType: 'TRAUMA',
      requiredCapabilities: ['BED_ICU'],
      candidates: [
        candidate({ hospitalExternalId: 'far', score: 100, distanceKm: 18, etaMinutes: 5 }),
        candidate({ hospitalExternalId: 'near', score: 60, distanceKm: 2, etaMinutes: 30 }),
      ],
    });

    expect(result.orderedHospitalIds).toEqual(['near', 'far']);
    expect(result.suggestedHospitalId).toBe('near');
  });
});

describe('HeuristicAiAdapter.structureIncidentNarrative', () => {
  const adapter = new HeuristicAiAdapter();

  it('organizes an English narrative into the relevant fields', async () => {
    const result = await adapter.structureIncidentNarrative(
      'The patient has chest pain. The patient is unconscious. We administered oxygen and need a ventilator.',
      'en',
    );

    expect(result.symptoms).toContain('chest pain');
    expect(result.suspectedCondition).toContain('unconscious');
    expect(result.treatmentProvided).toContain('administered oxygen');
    expect(result.resourceNeeds).toContain('ventilator');
    expect(result.source).toBe('heuristic');
  });

  it('romanizes Urdu output and keeps the original details in the corresponding fields', async () => {
    const result = await adapter.structureIncidentNarrative('چوٹ لگی۔ علاج دیا گیا۔', 'ur');

    expect(result.normalizedTranscript).toBe('chot lgi۔ ilaaj diya gaya۔');
    expect(result.injuries).toContain('chot');
    expect(result.treatmentProvided).toContain('ilaaj');
  });

  it('keeps Pashto in Pashto script and organizes explicit clinical details', async () => {
    const result = await adapter.structureIncidentNarrative(
      'ناروغ ټپي دی. درملنه ورکړل شوه. وینټیلیټر ته اړتیا ده.',
      'ps',
    );

    expect(result.normalizedTranscript).toContain('ناروغ ټپي دی');
    expect(result.injuries).toContain('ټپي');
    expect(result.treatmentProvided).toContain('درملنه');
    expect(result.resourceNeeds).toContain('وینټیلیټر');
  });

  it('extracts identity, priority, type and equipment from a single narrative', async () => {
    const result = await adapter.structureIncidentNarrative(
      'Patient name is Ahmed Khan. Age 34, male. Road accident with a fracture and severe bleeding, unconscious. We gave oxygen. Need a ventilator and CT scan. Location: Peshawar.',
      'en',
    );

    expect(result.patientName).toBe('Ahmed Khan');
    expect(result.age).toBe(34);
    expect(result.gender).toBe('MALE');
    expect(result.emergencyType).toBe('TRAUMA');
    expect(result.severity).toBe('CRITICAL');
    expect(result.address).toContain('Peshawar');
    expect(result.capabilities).toContain('SERVICE_EMERGENCY_DEPARTMENT');
    expect(result.capabilities.length).toBeLessThanOrEqual(3);
  });

  it('extracts Roman Urdu patient names', async () => {
    const result = await adapter.structureIncidentNarrative(
      'mareez Ahmed Khan, umr 34, mard, road accident hai. Behes hi.',
      'ur',
    );

    expect(result.patientName).toBe('Ahmed Khan');
    expect(result.gender).toBe('MALE');
  });

  it('auto-detects English, Roman Urdu, Urdu script and Pashto script narratives', () => {
    expect(detectNarrativeLanguage('Chest pain and difficulty breathing')).toBe('en');
    expect(detectNarrativeLanguage('mareez behosh hai aur saans nahi aa rahi')).toBe('ur');
    expect(detectNarrativeLanguage('مریض بےہوش ہے')).toBe('ur');
    expect(detectNarrativeLanguage('ناروغ ساه تنګي لري')).toBe('ps');
  });
});

describe('HeuristicAiAdapter multilingual capability hints', () => {
  const adapter = new HeuristicAiAdapter();

  it('suggests relevant capabilities from Roman Urdu or Pashto patient details', async () => {
    const urdu = await adapter.suggestCapabilities('mareez ko dil ka dora para hai aur saans nahi aa rahi');
    const pashto = await adapter.suggestCapabilities('ناروغ ساه تنګي لري او پښتورګي ناکامي لري');

    expect(urdu.suggestions.map((suggestion) => suggestion.code)).toContain('SPECIALIST_CARDIOLOGY');
    expect(urdu.suggestions.map((suggestion) => suggestion.code)).toContain('EQUIP_VENTILATOR');
    expect(pashto.suggestions.map((suggestion) => suggestion.code)).toContain('EQUIP_VENTILATOR');
    expect(pashto.suggestions.map((suggestion) => suggestion.code)).toContain('EQUIP_DIALYSIS');
  });
});
