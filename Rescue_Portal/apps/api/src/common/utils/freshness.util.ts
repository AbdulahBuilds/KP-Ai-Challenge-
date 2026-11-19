import { FreshnessStatus } from '@prisma/client';

export interface FreshnessResult {
  status: FreshnessStatus;
  ageSeconds: number | null;
  expiresInSeconds: number | null;
  reason: string;
}

/**
 * Hospital capability data is only considered FRESH when it has not expired
 * and is within the agreed maximum observation age. Anything else must never
 * be presented as verified real-time availability.
 */
export function assessFreshness(
  observedAt: Date | string | null | undefined,
  expiresAt: Date | string | null | undefined,
  maxAgeSeconds: number,
  now: Date = new Date(),
): FreshnessResult {
  if (!observedAt) {
    return { status: 'UNKNOWN', ageSeconds: null, expiresInSeconds: null, reason: 'No observation timestamp was supplied' };
  }
  const observed = observedAt instanceof Date ? observedAt : new Date(observedAt);
  if (Number.isNaN(observed.getTime())) {
    return { status: 'UNKNOWN', ageSeconds: null, expiresInSeconds: null, reason: 'Observation timestamp is invalid' };
  }
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 1000));
  if (expiresAt) {
    const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (!Number.isNaN(expires.getTime())) {
      const expiresInSeconds = Math.floor((expires.getTime() - now.getTime()) / 1000);
      if (expiresInSeconds <= 0) {
        return {
          status: 'EXPIRED',
          ageSeconds,
          expiresInSeconds,
          reason: 'Hospital availability data has passed its expiry time',
        };
      }
      if (ageSeconds > maxAgeSeconds) {
        return {
          status: 'STALE',
          ageSeconds,
          expiresInSeconds,
          reason: `Hospital availability data is older than the ${Math.round(maxAgeSeconds / 60)} minute freshness limit`,
        };
      }
      return {
        status: 'FRESH',
        ageSeconds,
        expiresInSeconds,
        reason: 'Hospital availability data is within the freshness window',
      };
    }
  }
  if (ageSeconds > maxAgeSeconds) {
    return {
      status: 'STALE',
      ageSeconds,
      expiresInSeconds: null,
      reason: `Hospital availability data is older than the ${Math.round(maxAgeSeconds / 60)} minute freshness limit`,
    };
  }
  return {
    status: 'FRESH',
    ageSeconds,
    expiresInSeconds: null,
    reason: 'Hospital availability data is within the freshness window',
  };
}
