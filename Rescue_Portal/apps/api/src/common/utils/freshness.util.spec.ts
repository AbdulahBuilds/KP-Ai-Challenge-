import { assessFreshness } from './freshness.util';

const NOW = new Date('2026-11-13T10:00:00.000Z');

describe('assessFreshness', () => {
  it('returns UNKNOWN without an observation timestamp', () => {
    expect(assessFreshness(null, null, 300, NOW)).toMatchObject({
      status: 'UNKNOWN',
      ageSeconds: null,
      expiresInSeconds: null,
    });
  });

  it('returns UNKNOWN for an invalid observation timestamp', () => {
    expect(assessFreshness('not-a-date', null, 300, NOW).status).toBe('UNKNOWN');
  });

  it('returns FRESH within the maximum age with no expiry', () => {
    const result = assessFreshness(new Date(NOW.getTime() - 60_000), null, 300, NOW);
    expect(result.status).toBe('FRESH');
    expect(result.ageSeconds).toBe(60);
  });

  it('returns STALE beyond the maximum age', () => {
    const result = assessFreshness(new Date(NOW.getTime() - 301_000), null, 300, NOW);
    expect(result.status).toBe('STALE');
  });

  it('returns EXPIRED once the expiry time has passed even if recently observed', () => {
    const result = assessFreshness(new Date(NOW.getTime() - 1_000), new Date(NOW.getTime() - 1), 300, NOW);
    expect(result.status).toBe('EXPIRED');
  });

  it('returns FRESH when within both age and expiry limits', () => {
    const result = assessFreshness(new Date(NOW.getTime() - 10_000), new Date(NOW.getTime() + 60_000), 300, NOW);
    expect(result.status).toBe('FRESH');
    expect(result.expiresInSeconds).toBe(60);
  });

  it('returns STALE when within expiry but older than the allowed age', () => {
    const result = assessFreshness(new Date(NOW.getTime() - 301_000), new Date(NOW.getTime() + 60_000), 300, NOW);
    expect(result.status).toBe('STALE');
  });
});
