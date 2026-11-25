import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService search radius', () => {
  function buildService(searchResult: { data: any[] }) {
    const user = { id: 'user-1', organizationId: 'org-1' } as any;
    const hospitals = {
      search: jest.fn().mockResolvedValue({ data: [], meta: { count: 0 } }),
      searchAllAvailable: jest.fn().mockResolvedValue(searchResult),
      capabilities: jest.fn().mockResolvedValue({
        capabilities: [],
        observedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
      status: jest.fn().mockReturnValue({
        adapter: 'http',
        isMock: false,
        dataSource: 'LIVE',
        notice: '',
      }),
    };
    const config = { get: jest.fn((_key: string, fallback?: string) => fallback) };
    const prisma = {
      incident: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'incident-1',
          organizationId: 'org-1',
          caseNumber: 'CASE-1',
          latitude: 34,
          longitude: 71,
          requiredCapabilities: ['SERVICE_EMERGENCY_DEPARTMENT'],
          severity: 'HIGH',
          emergencyType: 'MEDICAL',
        }),
      },
      hospitalRecommendation: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'rec-1', createdAt: new Date(), ...data }),
        ),
      },
    };
    const service = new RecommendationsService(
      prisma as any,
      config as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any,
      hospitals as any,
      {
        status: { provider: 'mock-haversine', isMock: true, notice: '' },
        getRoutesWithFallback: jest.fn().mockResolvedValue([]),
      } as any,
      {
        status: jest.fn().mockReturnValue({ adapter: 'heuristic', mode: 'rule_based' }),
        suggestCapabilities: jest.fn().mockResolvedValue({ suggestions: [] }),
        rankHospitals: jest.fn().mockResolvedValue({
          orderedHospitalIds: searchResult.data.map((hospital) => hospital.externalId),
          rationaleById: {},
          suggestedHospitalId: searchResult.data[0]?.externalId ?? null,
          summary: 'Nearest available hospital suggested',
          source: 'heuristic',
        }),
        explainRecommendation: jest.fn().mockResolvedValue({ text: 'Closest available hospital', source: 'heuristic' }),
      } as any,
    );
    return { service, hospitals, user };
  }

  it('caps the radius and falls back to the nearest available hospitals', async () => {
    const { service, hospitals, user } = buildService({
      data: [
        {
          externalId: 'peshawar',
          name: 'Lady Reading Hospital (LRH)',
          address: 'GT Road, Peshawar',
          latitude: 34.0106,
          longitude: 71.5688,
          isMock: false,
          dataSource: 'LIVE',
        },
      ],
    });

    const result = await service.generate(user, 'incident-1', { searchRadiusKm: 5000 });

    expect(hospitals.search).toHaveBeenCalledWith(user, expect.objectContaining({ radiusKm: 100 }));
    expect(hospitals.searchAllAvailable).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ latitude: 34, longitude: 71 }),
    );
    expect(result.candidateCount).toBe(1);
    expect(result.suggestedHospitalId).toBe('peshawar');
    expect(result.policy).toEqual(
      expect.objectContaining({ searchRadiusKm: 100, usedNearestFallback: true, noPortalDataNearLocation: false }),
    );
    expect(result.warnings.join(' ')).toMatch(/nearest 1 hospital/);
  });

  it('reports an empty hospital catalog without suggesting a hospital', async () => {
    const { service, user } = buildService({ data: [] });

    const result = await service.generate(user, 'incident-1', {});

    expect(result.candidateCount).toBe(0);
    expect(result.suggestedHospitalId).toBeNull();
    expect(result.policy).toEqual(expect.objectContaining({ noPortalDataNearLocation: true }));
    expect(result.warnings.join(' ')).toMatch(/No hospitals are available/);
  });
});
