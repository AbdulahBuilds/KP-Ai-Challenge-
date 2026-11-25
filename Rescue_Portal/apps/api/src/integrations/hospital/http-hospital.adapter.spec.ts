import { ConfigService } from '@nestjs/config';
import { HttpHospitalAdapter } from './http-hospital.adapter';

function config(values: Record<string, string>): ConfigService {
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('HttpHospitalAdapter', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('searches the hospital portal over HTTP and returns live data', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse([
        {
          id: 'hp-001',
          name: 'General Hospital',
          latitude: 31.5,
          longitude: 74.3,
          services: ['emergency'],
        },
      ]),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const adapter = new HttpHospitalAdapter(
      config({ HOSPITAL_API_BASE_URL: 'http://localhost:4001/integration/v1/', HOSPITAL_API_KEY: 'test-key' }),
    );

    const result = await adapter.searchHospitals({ latitude: 31.5, longitude: 74.3, radiusKm: 20, limit: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/hospitals/search?latitude=31.5&longitude=74.3');
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('test-key');
    expect(result[0]).toMatchObject({ externalId: 'hp-001', dataSource: 'LIVE', isMock: false });
  });

  it('accepts the real Hospital Portal response shape with a hospitals array', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        source: 'Hospital_Portal',
        hospitals: [
          {
            id: 'lrh-peshawar',
            name: 'Lady Reading Hospital (LRH)',
            latitude: 34.0106,
            longitude: 71.5688,
            services: ['emergency'],
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const adapter = new HttpHospitalAdapter(config({ HOSPITAL_API_BASE_URL: 'http://localhost:3000' }));

    const result = await adapter.searchHospitals({ latitude: 34.0106, longitude: 71.5688 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ externalId: 'lrh-peshawar', dataSource: 'LIVE' });
  });

  it('uses upstream freshness timestamps from the portal', async () => {
    const observedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        capabilities: [{ code: 'BED_ICU', status: 'AVAILABLE', quantity: 2 }],
        observedAt,
        expiresAt,
        snapshotId: 'snapshot-1',
      }),
    ) as unknown as typeof fetch;
    const adapter = new HttpHospitalAdapter(config({ HOSPITAL_API_BASE_URL: 'http://localhost:4001/integration/v1' }));

    const result = await adapter.getCapabilities('hp-001');

    expect(result.observedAt.toISOString()).toBe(observedAt);
    expect(result.expiresAt.toISOString()).toBe(expiresAt);
    expect(result.sourceResponseId).toBe('snapshot-1');
    expect(result.capabilities[0]).toMatchObject({ code: 'BED_ICU', status: 'AVAILABLE', quantity: 2 });
  });

  it('refuses to fabricate freshness when the portal omits timestamps', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ capabilities: [{ code: 'BED_ICU', status: 'AVAILABLE' }] }),
    ) as unknown as typeof fetch;
    const adapter = new HttpHospitalAdapter(config({ HOSPITAL_API_BASE_URL: 'http://localhost:4001/integration/v1' }));

    await expect(adapter.getCapabilities('hp-001')).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: expect.stringContaining('observedAt/expiresAt'),
    });
  });
});
