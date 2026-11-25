import { HospitalsService } from './hospitals.service';

describe('HospitalsService.search', () => {
  it('filters portal results by the requested radius using local coordinates', async () => {
    const user = { id: 'user-1', organizationId: 'org-1' } as any;
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([]),
      hospitalDirectoryCache: { upsert: jest.fn() },
    };
    const provider = {
      name: 'http',
      isMock: false,
      searchHospitals: jest.fn().mockResolvedValue([
        { externalId: 'near', name: 'Nearby Hospital', latitude: 31.52, longitude: 74.36, isMock: false },
        { externalId: 'far', name: 'Distant Hospital', latitude: 24.86, longitude: 67.0, isMock: false },
      ]),
    };
    const service = new HospitalsService(
      prisma as any,
      {} as any,
      {} as any,
      provider as any,
    );

    const result = await service.search(user, {
      latitude: 31.5204,
      longitude: 74.3587,
      radiusKm: 25,
      limit: 20,
    } as any);

    expect(result.data.map((hospital) => hospital.externalId)).toEqual(['near']);
    expect(result.data[0].distanceKm).toBeLessThan(1);
    expect(result.meta.count).toBe(1);
  });

  it('returns every available hospital sorted by distance when no radius is applicable', async () => {
    const user = { id: 'user-1', organizationId: 'org-1' } as any;
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([]),
      hospitalDirectoryCache: { upsert: jest.fn() },
    };
    const provider = {
      name: 'http',
      isMock: false,
      searchHospitals: jest.fn().mockResolvedValue([
        { externalId: 'peshawar', name: 'Peshawar Hospital', latitude: 34.0106, longitude: 71.5688, isMock: false },
        { externalId: 'abbottabad', name: 'Abbottabad Hospital', latitude: 34.2043, longitude: 73.2385, isMock: false },
      ]),
    };
    const service = new HospitalsService(prisma as any, {} as any, {} as any, provider as any);

    const result = await service.searchAllAvailable(user, {
      latitude: 31.5204,
      longitude: 74.3587,
    });

    expect(result.data.map((hospital) => hospital.externalId)).toEqual(['abbottabad', 'peshawar']);
    expect(result.data[0].distanceKm).toBeLessThan(result.data[1].distanceKm ?? 0);
  });
});