import { initialHospitals } from './seedData.js';

export const CAPABILITY_CATALOG_VERSION = '2026-11-13.1';
export const CAPABILITY_VALIDITY_HOURS = 24;

// The JSON file store is seeded demo data, not a live hospital feed. When no
// MongoDB source is configured, re-stamp the demo snapshot on read so Rescue
// recommendations remain usable. Set DEMO_CAPABILITY_REFRESH=false to require
// real update timestamps from the data source.
export const DEMO_CAPABILITY_REFRESH =
  process.env.DEMO_CAPABILITY_REFRESH !== 'false' && !process.env.MONGODB_URI;

const AVAILABLE_WORDS = new Set(['available', 'operational', 'working', 'functional']);
const UNAVAILABLE_WORDS = new Set(['unavailable', 'out of service', 'closed', 'temporarily unavailable']);

const SPECIALIST_CODES = {
  cardiologist: 'SPECIALIST_CARDIOLOGY',
  orthopedic: 'SPECIALIST_ORTHOPEDICS',
  generalSurgeon: 'SPECIALIST_GENERAL_SURGERY',
  neurosurgeon: 'SPECIALIST_NEUROSURGERY',
  gynecologist: 'SPECIALIST_OBSTETRICS',
  pediatrician: 'SPECIALIST_PEDIATRICS',
  anesthesiologist: 'SPECIALIST_ANESTHESIOLOGY',
};

const EQUIPMENT_CODES = {
  ventilators: 'EQUIP_VENTILATOR',
  ctScan: 'EQUIP_CT_SCANNER',
  mri: 'EQUIP_MRI',
  xray: 'EQUIP_XRAY',
  dialysis: 'EQUIP_DIALYSIS',
  defibrillator: 'EQUIP_DEFIBRILLATOR',
  defibrillators: 'EQUIP_DEFIBRILLATOR',
};

const SERVICE_CODES = {
  emergency: 'SERVICE_EMERGENCY_DEPARTMENT',
  traumaCenter: 'SERVICE_TRAUMA_CENTER',
  burnsUnit: 'SERVICE_BURNS_UNIT',
  neonatalIcu: 'SERVICE_NEONATAL_ICU',
  nicu: 'SERVICE_NEONATAL_ICU',
};

const BLOOD_CODES = {
  'O-': 'BLOOD_O_NEG',
  'O+': 'BLOOD_O_POS',
  'A+': 'BLOOD_A_POS',
  'B+': 'BLOOD_B_POS',
};

function statusOf(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (AVAILABLE_WORDS.has(text)) return 'AVAILABLE';
  if (UNAVAILABLE_WORDS.has(text) || text.includes('unavailable')) return 'UNAVAILABLE';
  return 'UNKNOWN';
}

export function toExternalRequestStatus(status) {
  const normalized = String(status ?? 'PENDING').trim().toUpperCase();
  if (normalized === 'ALERT_RECEIVED' || normalized === 'RECEIVED') return 'PENDING';
  if (normalized === 'FACILITIES_CONFIRMED' || normalized === 'CONFIRMED') return 'ACCEPTED';
  if (normalized === 'DECLINED') return 'REJECTED';
  if (['PENDING', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'MORE_INFO', 'TIMED_OUT', 'FAILED'].includes(normalized)) {
    return normalized;
  }
  return 'PENDING';
}

function capability(code, status, quantity = null, note = null) {
  return { code, status, quantity, ...(note ? { note } : {}) };
}

function resourceTimestamp(resources) {
  const candidates = [
    resources?.lastOverallUpdate,
    resources?.beds?.updatedAt,
    resources?.equipment?.updatedAt,
    resources?.specialists?.updatedAt,
    resources?.services?.updatedAt,
    resources?.bloodStock?.updatedAt,
  ].filter(Boolean);
  const times = candidates.map((value) => new Date(value).getTime()).filter(Number.isFinite);
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

export function haversineDistanceKm(a, b) {
  if (!Number.isFinite(a?.latitude) || !Number.isFinite(a?.longitude) ||
      !Number.isFinite(b?.latitude) || !Number.isFinite(b?.longitude)) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function toSearchHospital(hospital, origin = null) {
  const distanceKm = origin ? haversineDistanceKm(origin, hospital) : null;
  return {
    id: hospital.id,
    externalId: hospital.id,
    name: hospital.name,
    address: hospital.address ?? null,
    city: hospital.district ?? null,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    locationSource: hospital.locationSource ?? null,
    phone: hospital.emergencyPhone || hospital.phone || null,
    services: Object.entries(hospital.resources?.services ?? {})
      .filter(([key, value]) => key !== 'updatedAt' && statusOf(value) === 'AVAILABLE')
      .map(([key]) => key),
    ...(distanceKm === null ? {} : { distanceKm: Math.round(distanceKm * 10) / 10 }),
  };
}

export function toCapabilitySnapshot(hospital, now = new Date()) {
  const resources = hospital.resources ?? {};
  const beds = resources.beds ?? {};
  const equipment = resources.equipment ?? {};
  const specialists = resources.specialists ?? {};
  const services = resources.services ?? {};
  const bloodUnits = resources.bloodStock?.units ?? {};
  const capabilities = [];

  for (const [key, code] of Object.entries(SERVICE_CODES)) {
    const status = statusOf(services[key]);
    if (status !== 'UNKNOWN' && !capabilities.some((item) => item.code === code)) {
      capabilities.push(capability(code, status));
    }
  }

  const emergencyStatus = statusOf(services.emergency);
  if (emergencyStatus === 'AVAILABLE') {
    capabilities.push(capability('SPECIALIST_EMERGENCY_MEDICINE', 'AVAILABLE', null, 'emergency department coverage'));
  }
  if (
    /tertiary|teaching/i.test(String(hospital.type ?? '')) &&
    emergencyStatus === 'AVAILABLE' &&
    !capabilities.some((item) => item.code === 'SERVICE_TRAUMA_CENTER')
  ) {
    capabilities.push(capability('SERVICE_TRAUMA_CENTER', 'AVAILABLE', null, hospital.type));
  }

  if (typeof beds.available === 'number') {
    capabilities.push(capability('BED_EMERGENCY', beds.available > 0 ? 'AVAILABLE' : 'UNAVAILABLE', beds.available, 'general beds'));
  }
  if (typeof beds.icuAvailable === 'number') {
    capabilities.push(capability('BED_ICU', beds.icuAvailable > 0 ? 'AVAILABLE' : 'UNAVAILABLE', beds.icuAvailable, 'ICU beds'));
  }

  for (const [key, code] of Object.entries(EQUIPMENT_CODES)) {
    const item = equipment[key];
    if (!item) continue;
    const quantity = Number(item.available ?? 0);
    const status = statusOf(item.status);
    capabilities.push(capability(code, status === 'AVAILABLE' && quantity === 0 ? 'UNAVAILABLE' : status, quantity, `${key} units`));
  }

  if (services.operationTheatre !== undefined) {
    const status = statusOf(services.operationTheatre);
    capabilities.push(capability('SURGICAL_OPERATING_ROOM', status));
    capabilities.push(capability('SURGICAL_MAJOR_EQUIPMENT', status));
  }
  if (services.bloodBank !== undefined) capabilities.push(capability('EQUIP_BLOOD_BANK', statusOf(services.bloodBank)));
  if (services.dialysis !== undefined && !equipment.dialysis) {
    capabilities.push(capability('EQUIP_DIALYSIS', statusOf(services.dialysis)));
  }

  for (const [key, code] of Object.entries(SPECIALIST_CODES)) {
    const person = specialists[key];
    if (!person || typeof person.onDuty !== 'boolean') continue;
    capabilities.push(capability(code, person.onDuty ? 'AVAILABLE' : 'UNAVAILABLE', null, person.name || null));
  }

  for (const [group, code] of Object.entries(BLOOD_CODES)) {
    const stock = bloodUnits[group];
    if (!stock) continue;
    const units = Number(stock.prbc ?? 0) + Number(stock.wholeBlood ?? 0);
    capabilities.push(capability(code, units > 0 ? 'AVAILABLE' : 'UNAVAILABLE', units, `${group} units`));
  }

  const observedAt = DEMO_CAPABILITY_REFRESH ? now : (resourceTimestamp(resources) ?? now);
  const expiresAt = new Date(observedAt.getTime() + CAPABILITY_VALIDITY_HOURS * 60 * 60 * 1000);
  return {
    hospitalExternalId: hospital.id,
    hospitalName: hospital.name,
    catalogVersion: CAPABILITY_CATALOG_VERSION,
    snapshotId: `${hospital.id}:capabilities:${observedAt.toISOString()}`,
    observedAt: observedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...(DEMO_CAPABILITY_REFRESH ? { freshnessMode: 'DEMO_SNAPSHOT_REFRESHED_ON_READ' } : {}),
    capabilities,
  };
}

export function searchNearbyHospitals(hospitals, { latitude, longitude, radiusKm = 25, limit = 20 }) {
  const origin = { latitude: Number(latitude), longitude: Number(longitude) };
  if (!Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude)) {
    throw new Error('latitude and longitude are required');
  }
  const radius = Number.isFinite(Number(radiusKm)) ? Math.max(0, Number(radiusKm)) : 25;
  const max = Number.isFinite(Number(limit)) ? Math.min(50, Math.max(1, Number(limit))) : 20;
  return hospitals
    .filter((hospital) => Number.isFinite(hospital.latitude) && Number.isFinite(hospital.longitude))
    .map((hospital) => toSearchHospital(hospital, origin))
    .filter((hospital) => hospital.distanceKm !== null && hospital.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
    .slice(0, max);
}

export function hospitalsManifest(generatedAt = new Date()) {
  return {
    generatedAt: generatedAt.toISOString(),
    source: 'Hospital_Portal/src/lib/seedData.js',
    catalogVersion: CAPABILITY_CATALOG_VERSION,
    count: initialHospitals.length,
    hospitals: initialHospitals.map((hospital) => ({
      ...toSearchHospital(hospital),
      resources: {
        availableBeds: hospital.resources?.beds?.available ?? 0,
        icuBeds: hospital.resources?.beds?.icuAvailable ?? 0,
        services: hospital.resources?.services ?? {},
      },
      capabilities: toCapabilitySnapshot(hospital, generatedAt).capabilities,
      lastOverallUpdate: hospital.resources?.lastOverallUpdate ?? null,
    })),
  };
}
