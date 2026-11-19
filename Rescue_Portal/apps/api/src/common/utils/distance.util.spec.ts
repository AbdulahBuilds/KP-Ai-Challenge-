import { haversineDistanceKm, isValidCoordinate, roundKm } from './distance.util';

describe('distance utilities', () => {
  it('calculates a known distance within tolerance', () => {
    const distance = haversineDistanceKm(
      { latitude: 31.5204, longitude: 74.3587 },
      { latitude: 31.5497, longitude: 74.3436 },
    );
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(4);
  });

  it('returns zero for identical coordinates', () => {
    expect(haversineDistanceKm({ latitude: 10, longitude: 20 }, { latitude: 10, longitude: 20 })).toBe(0);
  });

  it('validates coordinate ranges including boundaries', () => {
    expect(isValidCoordinate(31.5, 74.3)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(90.1, 0)).toBe(false);
    expect(isValidCoordinate(0, 180.1)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });

  it('rounds to one decimal place', () => {
    expect(roundKm(3.14159)).toBe(3.1);
    expect(roundKm(3.16)).toBe(3.2);
  });
});
