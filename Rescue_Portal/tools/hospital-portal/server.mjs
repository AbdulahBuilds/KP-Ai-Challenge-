import http from 'node:http';

const PORT = Number(process.env.HOSPITAL_PORTAL_PORT ?? 4001);
const BASE_PATH = (process.env.HOSPITAL_PORTAL_BASE_PATH ?? '/integration/v1').replace(/\/$/, '');
const API_KEY = process.env.HOSPITAL_PORTAL_API_KEY ?? '';
const FRESHNESS_SECONDS = Number(process.env.HOSPITAL_PORTAL_FRESHNESS_SECONDS ?? 300);

const cap = (code, status = 'AVAILABLE', quantity = null, note = null) => ({ code, status, quantity, ...(note ? { note } : {}) });

const BASE_CAPABILITIES = [
  cap('SERVICE_EMERGENCY_DEPARTMENT', 'AVAILABLE', null, '24/7 emergency department'),
  cap('BED_EMERGENCY', 'AVAILABLE', 4, 'emergency beds available'),
  cap('EQUIP_DEFIBRILLATOR', 'AVAILABLE', 2, 'defibrillators ready'),
];

const COMPREHENSIVE_CAPABILITIES = [
  ...BASE_CAPABILITIES,
  cap('SPECIALIST_EMERGENCY_MEDICINE'),
  cap('SPECIALIST_GENERAL_SURGERY'),
  cap('SPECIALIST_CARDIOLOGY'),
  cap('SPECIALIST_NEUROSURGERY'),
  cap('SPECIALIST_ORTHOPEDICS'),
  cap('SPECIALIST_PEDIATRICS'),
  cap('SPECIALIST_OBSTETRICS'),
  cap('SPECIALIST_ANESTHESIOLOGY'),
  cap('EQUIP_VENTILATOR', 'AVAILABLE', 6, 'ventilators ready'),
  cap('EQUIP_CT_SCANNER', 'AVAILABLE', 2, 'CT scanner online'),
  cap('EQUIP_XRAY', 'AVAILABLE', 3, 'X-ray available'),
  cap('EQUIP_BLOOD_BANK', 'AVAILABLE', 1, 'full blood bank'),
  cap('EQUIP_DIALYSIS', 'AVAILABLE', 4, 'dialysis machines available'),
  cap('EQUIP_MRI', 'AVAILABLE', 1, 'MRI available'),
  cap('SURGICAL_MAJOR_EQUIPMENT', 'AVAILABLE', 1, 'major surgical equipment'),
  cap('SURGICAL_OPERATING_ROOM', 'AVAILABLE', 3, 'operating theatres free'),
  cap('SERVICE_BURNS_UNIT', 'AVAILABLE', 5, 'burns beds available'),
  cap('SERVICE_NEONATAL_ICU', 'AVAILABLE', 4, 'neonatal ICU beds'),
  cap('SERVICE_TRAUMA_CENTER', 'AVAILABLE', null, 'level 1 trauma centre'),
  cap('BED_ICU', 'AVAILABLE', 8, 'ICU beds available'),
  cap('BLOOD_O_NEG', 'AVAILABLE', 20, 'units available'),
  cap('BLOOD_O_POS', 'AVAILABLE', 24, 'units available'),
  cap('BLOOD_A_POS', 'AVAILABLE', 18, 'units available'),
  cap('BLOOD_B_POS', 'AVAILABLE', 16, 'units available'),
];

const CAPABILITIES = {
  'hp-001': [
    ...BASE_CAPABILITIES,
    cap('BED_ICU', 'AVAILABLE', 2, '2 ICU beds free'),
    cap('EQUIP_VENTILATOR', 'AVAILABLE', 4, '4 ventilators ready'),
    cap('SPECIALIST_EMERGENCY_MEDICINE'),
    cap('SPECIALIST_CARDIOLOGY'),
    cap('SERVICE_TRAUMA_CENTER', 'AVAILABLE', null, 'level 2 trauma centre'),
    cap('BLOOD_O_NEG', 'AVAILABLE', 8, '8 units'),
  ],
  'hp-002': [
    ...BASE_CAPABILITIES,
    cap('BED_ICU', 'UNAVAILABLE', 0, 'ICU full'),
    cap('EQUIP_VENTILATOR', 'AVAILABLE', 1, '1 ventilator ready'),
    cap('SPECIALIST_GENERAL_SURGERY'),
    cap('SURGICAL_OPERATING_ROOM', 'AVAILABLE', 2, '2 theatres free'),
    cap('BLOOD_O_POS', 'AVAILABLE', 12, '12 units'),
  ],
  'hp-003': [
    ...BASE_CAPABILITIES,
    cap('SPECIALIST_PEDIATRICS'),
    cap('SERVICE_NEONATAL_ICU', 'AVAILABLE', 3, '3 neonatal ICU beds'),
    cap('EQUIP_XRAY', 'AVAILABLE', 2),
  ],
  'hp-004': [
    ...BASE_CAPABILITIES,
    cap('BED_ICU', 'AVAILABLE', 1, '1 ICU bed'),
    cap('SPECIALIST_NEUROSURGERY'),
    cap('EQUIP_CT_SCANNER', 'AVAILABLE', 1, 'CT scanner online'),
    cap('SPECIALIST_ORTHOPEDICS', 'UNKNOWN', null, 'coverage not confirmed'),
  ],
  'hp-005': [
    cap('SERVICE_EMERGENCY_DEPARTMENT'),
    cap('BED_EMERGENCY', 'UNAVAILABLE', 0, 'temporarily closed'),
    cap('EQUIP_VENTILATOR', 'UNAVAILABLE', 0),
  ],
  'hp-006': [
    ...BASE_CAPABILITIES,
    cap('SURGICAL_OPERATING_ROOM', 'AVAILABLE', 1),
    cap('SPECIALIST_OBSTETRICS'),
    cap('BLOOD_O_NEG', 'AVAILABLE', 4),
  ],
  'hp-007': COMPREHENSIVE_CAPABILITIES,
  'hp-101': COMPREHENSIVE_CAPABILITIES,
  'hp-102': COMPREHENSIVE_CAPABILITIES,
  'hp-103': COMPREHENSIVE_CAPABILITIES,
  'hp-104': COMPREHENSIVE_CAPABILITIES,
  'hp-105': COMPREHENSIVE_CAPABILITIES,
  'hp-106': COMPREHENSIVE_CAPABILITIES,
};

const HOSPITALS = [
  { id: 'hp-001', name: 'Lahore General Emergency Hospital', address: 'Ferozepur Road, Lahore', city: 'Lahore', latitude: 31.5139, longitude: 74.3373, phone: '+92-42-99000001', services: ['emergency', 'trauma', 'cardiology'] },
  { id: 'hp-002', name: 'Shaikh Zayed Surgical Hospital', address: 'Jail Road, Lahore', city: 'Lahore', latitude: 31.5204, longitude: 74.3221, phone: '+92-42-99000002', services: ['emergency', 'surgery'] },
  { id: 'hp-003', name: 'Children & Neonatal Care Centre', address: 'Gulberg III, Lahore', city: 'Lahore', latitude: 31.5333, longitude: 74.3641, phone: '+92-42-99000003', services: ['emergency', 'pediatrics', 'neonatal'] },
  { id: 'hp-004', name: 'Neuroscience & Trauma Institute', address: 'Multan Road, Lahore', city: 'Lahore', latitude: 31.4876, longitude: 74.3072, phone: '+92-42-99000004', services: ['emergency', 'neurosurgery', 'trauma'] },
  { id: 'hp-005', name: 'Model Town Community Hospital', address: 'Model Town, Lahore', city: 'Lahore', latitude: 31.5452, longitude: 74.3348, phone: '+92-42-99000005', services: ['emergency'] },
  { id: 'hp-006', name: 'Maternity & Obstetric Emergency Centre', address: 'Cantt, Lahore', city: 'Lahore', latitude: 31.5261, longitude: 74.3492, phone: '+92-42-99000006', services: ['emergency', 'obstetrics'] },
  { id: 'hp-007', name: 'Lahore National Emergency & Critical Care Centre', address: 'Jail Road, Lahore', city: 'Lahore', latitude: 31.5175, longitude: 74.3290, phone: '+92-42-99000007', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-101', name: 'Islamabad National Emergency & Trauma Centre', address: 'Sector G-8, Islamabad', city: 'Islamabad', latitude: 33.6844, longitude: 73.0479, phone: '+92-51-9900101', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-102', name: 'Karachi Central Emergency Hospital', address: 'Shahrah-e-Quaideen, Karachi', city: 'Karachi', latitude: 24.8607, longitude: 67.0011, phone: '+92-21-9900102', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-103', name: 'Peshawar Regional Critical Care Centre', address: 'University Road, Peshawar', city: 'Peshawar', latitude: 34.0151, longitude: 71.5249, phone: '+92-91-9900103', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-104', name: 'Quetta Emergency & Trauma Centre', address: 'Jinnah Road, Quetta', city: 'Quetta', latitude: 30.1575, longitude: 71.5249, phone: '+92-81-9900104', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-105', name: 'Faisalabad Critical Care Hospital', address: 'Jaranwala Road, Faisalabad', city: 'Faisalabad', latitude: 31.4504, longitude: 73.1350, phone: '+92-41-9900105', services: ['emergency', 'trauma', 'critical-care'] },
  { id: 'hp-106', name: 'Gilgit Emergency Referral Hospital', address: 'Gilgit City, Gilgit-Baltistan', city: 'Gilgit', latitude: 35.9208, longitude: 74.3087, phone: '+92-58-9900106', services: ['emergency', 'trauma', 'critical-care'] },
];

const requests = new Map();
const idempotency = new Map();

function distanceKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function capabilitiesFor(id) {
  const now = new Date();
  return {
    hospitalExternalId: id,
    hospitalName: HOSPITALS.find((h) => h.id === id)?.name ?? id,
    capabilities: (CAPABILITIES[id] ?? []).map(({ code, status, quantity, note }) => ({
      code,
      status,
      quantity,
      ...(note ? { note } : {}),
    })),
    observedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + FRESHNESS_SECONDS * 1000).toISOString(),
    snapshotId: `${id}-${now.toISOString()}`,
  };
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (!url.pathname.startsWith(`${BASE_PATH}/`)) {
    send(res, 404, { error: 'not found' });
    return;
  }
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    send(res, 401, { error: 'invalid api key' });
    return;
  }
  const path = url.pathname.slice(BASE_PATH.length + 1);

  if (req.method === 'GET' && path === 'health') {
    send(res, 200, { status: 'ok', hospitalCount: HOSPITALS.length });
    return;
  }

  if (req.method === 'GET' && path === 'api/hospitals/search') {
    const latitude = Number(url.searchParams.get('latitude'));
    const longitude = Number(url.searchParams.get('longitude'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      send(res, 400, { error: 'latitude and longitude are required' });
      return;
    }
    const radiusKm = Number(url.searchParams.get('radiusKm') ?? 50);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const data = HOSPITALS.map((hospital) => ({
      ...hospital,
      distanceKm: Math.round(distanceKm({ latitude, longitude }, hospital) * 10) / 10,
    }))
      .filter((hospital) => hospital.distanceKm <= (Number.isFinite(radiusKm) ? radiusKm : 50))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, Number.isFinite(limit) ? limit : 20);
    send(res, 200, data);
    return;
  }

  const capabilitiesMatch = path.match(/^api\/hospitals\/([^/]+)\/capabilities$/);
  if (req.method === 'GET' && capabilitiesMatch) {
    const id = decodeURIComponent(capabilitiesMatch[1]);
    if (!HOSPITALS.some((h) => h.id === id)) {
      send(res, 404, { error: 'hospital not found' });
      return;
    }
    send(res, 200, capabilitiesFor(id));
    return;
  }

  if (req.method === 'POST' && path === 'api/emergency-requests') {
    const body = await readBody(req);
    const idempotencyKey = req.headers['idempotency-key'] ?? body.idempotencyKey;
    if (!body.hospitalExternalId || !body.incidentId) {
      send(res, 400, { error: 'hospitalExternalId and incidentId are required' });
      return;
    }
    if (idempotencyKey && idempotency.has(String(idempotencyKey))) {
      send(res, 200, requests.get(idempotency.get(String(idempotencyKey))));
      return;
    }
    const externalRequestId = `hp-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      externalRequestId,
      requestId: externalRequestId,
      status: 'PENDING',
      message: 'Emergency request received by hospital portal',
      respondedAt: null,
      hospitalExternalId: body.hospitalExternalId,
      incidentId: body.incidentId,
      createdAt: new Date().toISOString(),
    };
    requests.set(externalRequestId, record);
    if (idempotencyKey) idempotency.set(String(idempotencyKey), externalRequestId);
    send(res, 201, record);
    return;
  }

  const requestMatch = path.match(/^api\/emergency-requests\/([^/]+)$/);
  if (req.method === 'GET' && requestMatch) {
    const id = decodeURIComponent(requestMatch[1]);
    const record = requests.get(id);
    if (!record) {
      send(res, 404, { error: 'request not found' });
      return;
    }
    if (record.status === 'PENDING' && Date.now() - Date.parse(record.createdAt) > 1500) {
      record.status = 'ACKNOWLEDGED';
      record.message = 'Hospital portal acknowledged the emergency request';
      record.respondedAt = new Date().toISOString();
    }
    send(res, 200, record);
    return;
  }

  const etaMatch = path.match(/^api\/emergency-requests\/([^/]+)\/eta$/);
  if (req.method === 'POST' && etaMatch) {
    const id = decodeURIComponent(etaMatch[1]);
    const record = requests.get(id);
    if (!record) {
      send(res, 404, { error: 'request not found' });
      return;
    }
    const body = await readBody(req);
    record.etaMinutes = Number(body.etaMinutes) || null;
    send(res, 200, record);
    return;
  }

  send(res, 404, { error: 'not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => send(res, 500, { error: error.message }));
});

server.listen(PORT, () => {
  console.log(`Hospital Portal API listening on http://localhost:${PORT}${BASE_PATH}`);
});
