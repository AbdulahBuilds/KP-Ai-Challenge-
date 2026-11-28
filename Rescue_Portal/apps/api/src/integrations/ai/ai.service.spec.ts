import { AiService } from './ai.service';

describe('AiService.rankHospitals', () => {
  it('does not allow external AI to put a farther eligible hospital first', async () => {
    const candidates = [
      { hospitalExternalId: 'near', hospitalName: 'Nearby Hospital', eligibility: 'ELIGIBLE', score: 30, etaMinutes: 30, distanceKm: 5 },
      { hospitalExternalId: 'far', hospitalName: 'Far Hospital', eligibility: 'ELIGIBLE', score: 100, etaMinutes: 5, distanceKm: 25 },
    ];
    const service = new AiService(
      {
        name: 'http',
        rankHospitals: jest.fn().mockResolvedValue({
          orderedHospitalIds: ['far', 'near'],
          suggestedHospitalId: 'far',
          rationaleById: {},
          summary: 'Far Hospital is first',
          source: 'http',
        }),
      } as any,
      {
        rankHospitals: jest.fn().mockResolvedValue({
          orderedHospitalIds: ['near', 'far'],
          suggestedHospitalId: 'near',
          rationaleById: {},
          summary: 'Nearby Hospital is first',
          source: 'heuristic',
        }),
      } as any,
      { get: jest.fn() } as any,
    );

    const result = await service.rankHospitals({ candidates } as any);

    expect(result.orderedHospitalIds).toEqual(['near', 'far']);
    expect(result.suggestedHospitalId).toBe('near');
  });
});
