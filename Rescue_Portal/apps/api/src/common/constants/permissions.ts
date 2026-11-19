export const PERMISSIONS = {
  INCIDENT_CREATE: 'incidents:create',
  INCIDENT_READ: 'incidents:read',
  INCIDENT_UPDATE: 'incidents:update',
  HOSPITAL_READ: 'hospitals:read',
  HOSPITAL_REQUEST: 'hospitals:request',
  RECOMMENDATION_READ: 'recommendations:read',
  RECOMMENDATION_SELECT: 'recommendations:select',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.INCIDENT_CREATE]: 'Create emergency cases',
  [PERMISSIONS.INCIDENT_READ]: 'View emergency cases',
  [PERMISSIONS.INCIDENT_UPDATE]: 'Update emergency cases',
  [PERMISSIONS.HOSPITAL_READ]: 'Search hospitals and view capability data',
  [PERMISSIONS.HOSPITAL_REQUEST]: 'Send pre-arrival alerts to hospitals',
  [PERMISSIONS.RECOMMENDATION_READ]: 'Generate and view hospital recommendations',
  [PERMISSIONS.RECOMMENDATION_SELECT]: 'Select destination hospital',
};

export const ROLES = {
  RESCUE_ADMIN: 'RESCUE_ADMIN',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_NAMES: Record<string, string> = {
  RESCUE_ADMIN: 'Rescue Admin',
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  RESCUE_ADMIN: Object.values(PERMISSIONS),
};
