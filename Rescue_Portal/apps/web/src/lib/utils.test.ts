import { describe, expect, it } from 'vitest';
import { alertStatusLabel, formatDate, formatDistanceKm, formatEtaMinutes, hasPermission, initials, titleCase } from './utils';

describe('web utilities', () => {
  it('handles missing/invalid dates without throwing', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formats enum-like values for display', () => {
    expect(titleCase('EMERGENCY_DEPARTMENT')).toBe('Emergency Department');
    expect(titleCase('ACKNOWLEDGED')).toBe('Acknowledged');
  });

  it('derives initials safely for Rescue Admin', () => {
    expect(initials('Rescue', 'Admin')).toBe('RA');
    expect(initials(undefined, undefined)).toBe('RA');
  });

  it('checks permissions without extra roles', () => {
    expect(hasPermission({ permissions: ['incidents:read'] }, 'incidents:read')).toBe(true);
    expect(hasPermission({ permissions: ['incidents:read'] }, 'users:manage')).toBe(false);
    expect(hasPermission(null, 'incidents:read')).toBe(false);
  });

  it('formats distance/ETA honestly', () => {
    expect(formatDistanceKm(null, true)).toBe('Unavailable');
    expect(formatDistanceKm(3.2, true)).toContain('(estimated)');
    expect(formatEtaMinutes(undefined, false)).toBe('Unavailable');
    expect(formatEtaMinutes(7, false)).toBe('7 min');
  });

  it('maps alert statuses to required display states', () => {
    expect(alertStatusLabel('PENDING')).toBe('PENDING');
    expect(alertStatusLabel('SENT')).toBe('SENT');
    expect(alertStatusLabel('MORE_INFO')).toBe('ACKNOWLEDGED');
    expect(alertStatusLabel('TIMED_OUT')).toBe('FAILED');
    expect(alertStatusLabel('ACCEPTED')).toBe('ACCEPTED');
  });
});
