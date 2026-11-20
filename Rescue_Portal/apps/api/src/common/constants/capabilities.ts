export type CapabilityKind = 'SPECIALIST' | 'EQUIPMENT' | 'SURGICAL' | 'BED' | 'BLOOD' | 'SERVICE';

export interface CapabilityDefinition {
  code: string;
  label: string;
  kind: CapabilityKind;
  description: string;
  aliases: string[];
}

/**
 * Versioned capability catalogue. Hospital Portal capability codes must be
 * finalised jointly with the Hospital Portal team; this catalogue is the
 * Rescue Portal's canonical mapping used by the recommendation engine.
 */
export const CAPABILITY_CATALOG_VERSION = '2026-11-13.1';

export const CAPABILITY_CATALOG: CapabilityDefinition[] = [
  {
    code: 'SPECIALIST_EMERGENCY_MEDICINE',
    label: 'Emergency medicine specialist',
    kind: 'SPECIALIST',
    description: 'On-site emergency medicine specialist / emergency physician',
    aliases: ['emergency physician', 'emergency specialist', 'emergency doctor', 'er doctor'],
  },
  {
    code: 'SPECIALIST_GENERAL_SURGERY',
    label: 'General surgeon',
    kind: 'SPECIALIST',
    description: 'General surgeon available for emergency surgery',
    aliases: ['general surgeon', 'surgeon', 'surgery specialist'],
  },
  {
    code: 'SPECIALIST_CARDIOLOGY',
    label: 'Cardiologist',
    kind: 'SPECIALIST',
    description: 'Cardiologist available for acute cardiac emergencies',
    aliases: ['cardiologist', 'heart specialist', 'cardiac specialist', 'cardiologist'],
  },
  {
    code: 'SPECIALIST_NEUROSURGERY',
    label: 'Neurosurgeon',
    kind: 'SPECIALIST',
    description: 'Neurosurgeon available for emergency neurosurgery',
    aliases: ['neurosurgeon', 'brain surgeon', 'neurosurgery'],
  },
  {
    code: 'SPECIALIST_ORTHOPEDICS',
    label: 'Orthopaedic surgeon',
    kind: 'SPECIALIST',
    description: 'Orthopaedic surgeon available for fracture and trauma surgery',
    aliases: ['orthopedic', 'orthopaedic', 'bone specialist', 'fracture surgeon'],
  },
  {
    code: 'SPECIALIST_PEDIATRICS',
    label: 'Paediatrician',
    kind: 'SPECIALIST',
    description: 'Paediatric specialist available for child emergencies',
    aliases: ['pediatrician', 'paediatrician', 'child specialist', 'pediatric'],
  },
  {
    code: 'SPECIALIST_OBSTETRICS',
    label: 'Obstetrician / gynaecologist',
    kind: 'SPECIALIST',
    description: 'Obstetrician available for maternal emergencies and delivery',
    aliases: ['obstetrician', 'gynecologist', 'gynaecologist', 'maternity specialist'],
  },
  {
    code: 'SPECIALIST_ANESTHESIOLOGY',
    label: 'Anaesthesiologist',
    kind: 'SPECIALIST',
    description: 'Anaesthesia coverage for emergency surgery',
    aliases: ['anesthesiologist', 'anaesthesiologist', 'anesthetist'],
  },
  {
    code: 'EQUIP_VENTILATOR',
    label: 'Mechanical ventilator',
    kind: 'EQUIPMENT',
    description: 'Available mechanical ventilation support',
    aliases: ['ventilator', 'life support machine', 'breathing machine'],
  },
  {
    code: 'EQUIP_CT_SCANNER',
    label: 'CT scanner',
    kind: 'EQUIPMENT',
    description: 'Operational CT scanner with emergency access',
    aliases: ['ct scan', 'ct scanner', 'cat scan', 'computed tomography'],
  },
  {
    code: 'EQUIP_MRI',
    label: 'MRI scanner',
    kind: 'EQUIPMENT',
    description: 'Operational MRI scanner',
    aliases: ['mri', 'magnetic resonance'],
  },
  {
    code: 'EQUIP_XRAY',
    label: 'X-ray',
    kind: 'EQUIPMENT',
    description: 'Operational X-ray imaging',
    aliases: ['xray', 'x-ray', 'radiograph'],
  },
  {
    code: 'EQUIP_DEFIBRILLATOR',
    label: 'Defibrillator',
    kind: 'EQUIPMENT',
    description: 'Defibrillator available in emergency department',
    aliases: ['defibrillator', 'aed', 'shock machine'],
  },
  {
    code: 'EQUIP_DIALYSIS',
    label: 'Dialysis machine',
    kind: 'EQUIPMENT',
    description: 'Dialysis service available',
    aliases: ['dialysis', 'kidney machine'],
  },
  {
    code: 'EQUIP_BLOOD_BANK',
    label: 'Blood bank',
    kind: 'EQUIPMENT',
    description: 'On-site blood bank with cross-match capability',
    aliases: ['blood bank', 'transfusion service'],
  },
  {
    code: 'SURGICAL_OPERATING_ROOM',
    label: 'Operating room available',
    kind: 'SURGICAL',
    description: 'Staffed operating theatre available for emergency surgery',
    aliases: ['operating room', 'operating theatre', 'or available', 'surgery room'],
  },
  {
    code: 'SURGICAL_MAJOR_EQUIPMENT',
    label: 'Major surgical equipment',
    kind: 'SURGICAL',
    description: 'Major surgical equipment ready (e.g. diathermy, surgical sets)',
    aliases: ['surgical equipment', 'surgical machine', 'theatre equipment'],
  },
  {
    code: 'BED_EMERGENCY',
    label: 'Emergency bed',
    kind: 'BED',
    description: 'Emergency department bed available',
    aliases: ['emergency bed', 'er bed', 'a&e bed'],
  },
  {
    code: 'BED_ICU',
    label: 'ICU bed',
    kind: 'BED',
    description: 'Intensive care unit bed available',
    aliases: ['icu', 'intensive care', 'critical care bed'],
  },
  {
    code: 'SERVICE_EMERGENCY_DEPARTMENT',
    label: 'Emergency department',
    kind: 'SERVICE',
    description: '24/7 emergency department accepting patients',
    aliases: ['emergency department', 'emergency room', 'er', 'a&e', 'accident and emergency'],
  },
  {
    code: 'SERVICE_TRAUMA_CENTER',
    label: 'Trauma centre',
    kind: 'SERVICE',
    description: 'Designated trauma centre capability',
    aliases: ['trauma center', 'trauma centre', 'trauma unit'],
  },
  {
    code: 'SERVICE_BURNS_UNIT',
    label: 'Burns unit',
    kind: 'SERVICE',
    description: 'Specialist burns treatment unit',
    aliases: ['burns unit', 'burn center', 'burn treatment'],
  },
  {
    code: 'SERVICE_NEONATAL_ICU',
    label: 'Neonatal ICU',
    kind: 'BED',
    description: 'Neonatal intensive care availability',
    aliases: ['nicu', 'neonatal icu', 'neonatal intensive care'],
  },
  {
    code: 'BLOOD_O_NEG',
    label: 'O-negative blood',
    kind: 'BLOOD',
    description: 'O-negative packed red cells available',
    aliases: ['o negative', 'o-', 'o neg'],
  },
  {
    code: 'BLOOD_O_POS',
    label: 'O-positive blood',
    kind: 'BLOOD',
    description: 'O-positive packed red cells available',
    aliases: ['o positive', 'o+', 'o pos'],
  },
  {
    code: 'BLOOD_A_POS',
    label: 'A-positive blood',
    kind: 'BLOOD',
    description: 'A-positive packed red cells available',
    aliases: ['a positive', 'a+'],
  },
  {
    code: 'BLOOD_B_POS',
    label: 'B-positive blood',
    kind: 'BLOOD',
    description: 'B-positive packed red cells available',
    aliases: ['b positive', 'b+'],
  },
];

export const CAPABILITY_CODES = new Set(CAPABILITY_CATALOG.map((c) => c.code));

export function findCapability(code: string): CapabilityDefinition | undefined {
  return CAPABILITY_CATALOG.find((c) => c.code === code);
}

export function capabilityLabel(code: string): string {
  return findCapability(code)?.label ?? code;
}
