export const PERMISSIONS = {
  INCIDENT_READ: 'incidents:read',
  INCIDENT_CREATE: 'incidents:create',
  INCIDENT_UPDATE: 'incidents:update',
  HOSPITAL_READ: 'hospitals:read',
  HOSPITAL_REQUEST: 'hospitals:request',
  RECOMMENDATION_READ: 'recommendations:read',
  RECOMMENDATION_SELECT: 'recommendations:select',
} as const;

export const SEVERITIES = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'] as const;
export const EMERGENCY_TYPES = [
  'MEDICAL',
  'TRAUMA',
  'CARDIAC',
  'RESPIRATORY',
  'OBSTETRIC',
  'PEDIATRIC',
  'NEONATAL',
  'PSYCHIATRIC',
  'BURNS',
  'MASS_CASUALTY',
  'OTHER',
] as const;

export const ALERT_STATUSES = ['PENDING', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'FAILED'] as const;

export const CAPABILITY_GROUPS: Array<{
  label: string;
  items: Array<{ code: string; label: string }>;
}> = [
  {
    label: 'Emergency care & beds',
    items: [
      { code: 'SERVICE_EMERGENCY_DEPARTMENT', label: 'Emergency department' },
      { code: 'SERVICE_TRAUMA_CENTER', label: 'Trauma centre' },
      { code: 'BED_EMERGENCY', label: 'Emergency bed' },
      { code: 'BED_ICU', label: 'ICU bed' },
      { code: 'SURGICAL_OPERATING_ROOM', label: 'Operating room' },
    ],
  },
  {
    label: 'Specialists',
    items: [
      { code: 'SPECIALIST_EMERGENCY_MEDICINE', label: 'Emergency medicine' },
      { code: 'SPECIALIST_GENERAL_SURGERY', label: 'General surgery' },
      { code: 'SPECIALIST_CARDIOLOGY', label: 'Cardiology' },
      { code: 'SPECIALIST_NEUROSURGERY', label: 'Neurosurgery' },
      { code: 'SPECIALIST_ORTHOPEDICS', label: 'Orthopaedics' },
      { code: 'SPECIALIST_PEDIATRICS', label: 'Paediatrics' },
      { code: 'SPECIALIST_OBSTETRICS', label: 'Obstetrics' },
      { code: 'SPECIALIST_ANESTHESIOLOGY', label: 'Anaesthesiology' },
    ],
  },
  {
    label: 'Equipment, surgery & services',
    items: [
      { code: 'EQUIP_VENTILATOR', label: 'Ventilator' },
      { code: 'EQUIP_DEFIBRILLATOR', label: 'Defibrillator' },
      { code: 'EQUIP_CT_SCANNER', label: 'CT scanner' },
      { code: 'EQUIP_XRAY', label: 'X-ray' },
      { code: 'EQUIP_BLOOD_BANK', label: 'Blood bank' },
      { code: 'EQUIP_DIALYSIS', label: 'Dialysis' },
      { code: 'SURGICAL_MAJOR_EQUIPMENT', label: 'Major surgical equipment' },
      { code: 'SERVICE_BURNS_UNIT', label: 'Burns unit' },
      { code: 'SERVICE_NEONATAL_ICU', label: 'Neonatal ICU' },
    ],
  },
];

export const CAPABILITY_LABELS: Record<string, string> = Object.fromEntries(
  CAPABILITY_GROUPS.flatMap((group) => group.items.map((item) => [item.code, item.label])),
);
