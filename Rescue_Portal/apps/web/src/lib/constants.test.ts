import { describe, expect, it } from 'vitest';
import { CAPABILITY_LABELS, PERMISSIONS } from './constants';

describe('web domain constants', () => {
  it('defines only the required Rescue Admin permissions', () => {
    expect(PERMISSIONS.INCIDENT_READ).toBe('incidents:read');
    expect(PERMISSIONS.INCIDENT_CREATE).toBe('incidents:create');
    expect(PERMISSIONS.INCIDENT_UPDATE).toBe('incidents:update');
    expect(PERMISSIONS.HOSPITAL_READ).toBe('hospitals:read');
    expect(PERMISSIONS.HOSPITAL_REQUEST).toBe('hospitals:request');
    expect(PERMISSIONS.RECOMMENDATION_READ).toBe('recommendations:read');
    expect(PERMISSIONS.RECOMMENDATION_SELECT).toBe('recommendations:select');
    expect(Object.keys(PERMISSIONS).sort()).toEqual([
      'HOSPITAL_READ',
      'HOSPITAL_REQUEST',
      'INCIDENT_CREATE',
      'INCIDENT_READ',
      'INCIDENT_UPDATE',
      'RECOMMENDATION_READ',
      'RECOMMENDATION_SELECT',
    ]);
  });

  it('labels key capabilities used in intake and comparison', () => {
    expect(CAPABILITY_LABELS.EQUIP_VENTILATOR).toBeTruthy();
    expect(CAPABILITY_LABELS.BED_ICU).toBeTruthy();
    expect(CAPABILITY_LABELS.SERVICE_EMERGENCY_DEPARTMENT).toBeTruthy();
  });
});
