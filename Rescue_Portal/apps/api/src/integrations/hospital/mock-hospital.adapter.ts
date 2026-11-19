import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { haversineDistanceKm } from '../../common/utils/distance.util';
import {
  HospitalIntegrationError,
  type CapabilityAvailability,
  type ExternalHospitalRequestStatus,
  type HospitalAvailability,
  type HospitalCapability,
  type HospitalEmergencyRequestInput,
  type HospitalEmergencyRequestResult,
  type HospitalProvider,
  type HospitalSearchParams,
  type HospitalSummary,
} from './hospital.types';

interface MockHospitalDefinition {
  externalId: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  services: string[];
  capabilities: { code: string; status: CapabilityAvailability; quantity?: number }[];
  freshness: 'FRESH' | 'STALE' | 'EXPIRED';
  behaviour: 'ACCEPT' | 'REJECT' | 'MORE_INFO' | 'TIMEOUT' | 'ACK_ONLY';
  responseDelaySeconds: number;
  responseMessage?: string;
}

interface StoredRequest {
  externalRequestId: string;
  input: HospitalEmergencyRequestInput;
  createdAt: number;
  etaMinutes?: number | null;
}

const CORE_AVAILABLE: { code: string; status: CapabilityAvailability; quantity?: number }[] = [
  { code: 'SERVICE_EMERGENCY_DEPARTMENT', status: 'AVAILABLE' },
  { code: 'SPECIALIST_EMERGENCY_MEDICINE', status: 'AVAILABLE' },
  { code: 'BED_EMERGENCY', status: 'AVAILABLE', quantity: 4 },
  { code: 'BED_ICU', status: 'AVAILABLE', quantity: 2 },
  { code: 'SURGICAL_OPERATING_ROOM', status: 'AVAILABLE', quantity: 1 },
  { code: 'SURGICAL_MAJOR_EQUIPMENT', status: 'AVAILABLE' },
  { code: 'SPECIALIST_GENERAL_SURGERY', status: 'AVAILABLE' },
  { code: 'SPECIALIST_ANESTHESIOLOGY', status: 'AVAILABLE' },
  { code: 'EQUIP_VENTILATOR', status: 'AVAILABLE', quantity: 3 },
  { code: 'EQUIP_CT_SCANNER', status: 'AVAILABLE' },
  { code: 'EQUIP_XRAY', status: 'AVAILABLE' },
  { code: 'EQUIP_DEFIBRILLATOR', status: 'AVAILABLE', quantity: 2 },
  { code: 'BLOOD_O_NEG', status: 'AVAILABLE', quantity: 2 },
  { code: 'BLOOD_O_POS', status: 'AVAILABLE', quantity: 5 },
  { code: 'BLOOD_A_POS', status: 'AVAILABLE', quantity: 4 },
];

const DEFINITIONS: MockHospitalDefinition[] = [
  {
    externalId: 'mock-hospital-001',
    name: '[MOCK] City General Hospital',
    address: '12 Mall Road, Lahore',
    city: 'Lahore',
    latitude: 31.5352,
    longitude: 74.3432,
    phone: '+92-42-9000001',
    services: ['Emergency', 'Surgery', 'ICU', 'Imaging', 'Blood bank'],
    capabilities: [
      ...CORE_AVAILABLE,
      { code: 'SERVICE_TRAUMA_CENTER', status: 'AVAILABLE' },
      { code: 'SPECIALIST_ORTHOPEDICS', status: 'AVAILABLE' },
      { code: 'SPECIALIST_CARDIOLOGY', status: 'AVAILABLE' },
    ],
    freshness: 'FRESH',
    behaviour: 'ACCEPT',
    responseDelaySeconds: 3,
    responseMessage: 'Patient accepted. Emergency department ready.',
  },
  {
    externalId: 'mock-hospital-002',
    name: '[MOCK] Trauma & Surgical Centre',
    address: '45 Ferozepur Road, Lahore',
    city: 'Lahore',
    latitude: 31.5102,
    longitude: 74.3305,
    phone: '+92-42-9000002',
    services: ['Trauma', 'Emergency surgery', 'ICU', 'CT', 'Blood bank'],
    capabilities: [
      ...CORE_AVAILABLE,
      { code: 'SERVICE_TRAUMA_CENTER', status: 'AVAILABLE' },
      { code: 'SPECIALIST_ORTHOPEDICS', status: 'AVAILABLE' },
      { code: 'SPECIALIST_NEUROSURGERY', status: 'AVAILABLE' },
      { code: 'EQUIP_MRI', status: 'AVAILABLE' },
    ],
    freshness: 'FRESH',
    behaviour: 'ACCEPT',
    responseDelaySeconds: 2,
    responseMessage: 'Trauma team activated and accepting patient.',
  },
  {
    externalId: 'mock-hospital-003',
    name: '[MOCK] Cardiac Institute',
    address: '8 Jail Road, Lahore',
    city: 'Lahore',
    latitude: 31.5451,
    longitude: 74.3702,
    phone: '+92-42-9000003',
    services: ['Cardiology', 'Cath lab', 'ICU', 'Emergency'],
    capabilities: [
      ...CORE_AVAILABLE,
      { code: 'SPECIALIST_CARDIOLOGY', status: 'AVAILABLE' },
      { code: 'EQUIP_DIALYSIS', status: 'AVAILABLE' },
      { code: 'BLOOD_B_POS', status: 'AVAILABLE', quantity: 2 },
    ],
    freshness: 'FRESH',
    behaviour: 'ACCEPT',
    responseDelaySeconds: 4,
    responseMessage: 'Cardiac care team ready.',
  },
  {
    externalId: 'mock-hospital-004',
    name: '[MOCK] Community Hospital',
    address: 'Sector B, Township, Lahore',
    city: 'Lahore',
    latitude: 31.5001,
    longitude: 74.3804,
    phone: '+92-42-9000004',
    services: ['Emergency', 'General medicine'],
    capabilities: [
      { code: 'SERVICE_EMERGENCY_DEPARTMENT', status: 'AVAILABLE' },
      { code: 'SPECIALIST_EMERGENCY_MEDICINE', status: 'AVAILABLE' },
      { code: 'BED_EMERGENCY', status: 'AVAILABLE', quantity: 2 },
      { code: 'SURGICAL_OPERATING_ROOM', status: 'UNAVAILABLE' },
      { code: 'SURGICAL_MAJOR_EQUIPMENT', status: 'UNAVAILABLE' },
      { code: 'BED_ICU', status: 'UNAVAILABLE' },
      { code: 'SPECIALIST_GENERAL_SURGERY', status: 'UNAVAILABLE' },
      { code: 'EQUIP_VENTILATOR', status: 'UNAVAILABLE' },
      { code: 'EQUIP_XRAY', status: 'AVAILABLE' },
      { code: 'BLOOD_O_POS', status: 'AVAILABLE', quantity: 1 },
    ],
    freshness: 'FRESH',
    behaviour: 'REJECT',
    responseDelaySeconds: 3,
    responseMessage: 'Patient cannot be accepted: required surgical and ICU capability is unavailable.',
  },
  {
    externalId: 'mock-hospital-005',
    name: '[MOCK] Children & Maternity Hospital',
    address: '7 Empress Road, Lahore',
    city: 'Lahore',
    latitude: 31.4805,
    longitude: 74.3203,
    phone: '+92-42-9000005',
    services: ['Paediatrics', 'Obstetrics', 'NICU', 'Emergency'],
    capabilities: [
      ...CORE_AVAILABLE,
      { code: 'SPECIALIST_PEDIATRICS', status: 'AVAILABLE' },
      { code: 'SPECIALIST_OBSTETRICS', status: 'AVAILABLE' },
      { code: 'SERVICE_NEONATAL_ICU', status: 'AVAILABLE', quantity: 2 },
      { code: 'SERVICE_TRAUMA_CENTER', status: 'UNAVAILABLE' },
    ],
    freshness: 'EXPIRED',
    behaviour: 'REJECT',
    responseDelaySeconds: 2,
    responseMessage: 'ICU is currently full; diverting patient.',
  },
  {
    externalId: 'mock-hospital-006',
    name: '[MOCK] Teaching Hospital',
    address: '1 Hospital Road, Lahore',
    city: 'Lahore',
    latitude: 31.5604,
    longitude: 74.3208,
    phone: '+92-42-9000006',
    services: ['Emergency', 'Surgery', 'ICU', 'Teaching'],
    capabilities: [
      { code: 'SERVICE_EMERGENCY_DEPARTMENT', status: 'AVAILABLE' },
      { code: 'SPECIALIST_EMERGENCY_MEDICINE', status: 'AVAILABLE' },
      { code: 'BED_EMERGENCY', status: 'AVAILABLE', quantity: 2 },
      { code: 'SURGICAL_OPERATING_ROOM', status: 'AVAILABLE' },
      { code: 'SURGICAL_MAJOR_EQUIPMENT', status: 'UNKNOWN' },
      { code: 'BED_ICU', status: 'UNKNOWN' },
      { code: 'SPECIALIST_GENERAL_SURGERY', status: 'AVAILABLE' },
      { code: 'EQUIP_VENTILATOR', status: 'UNKNOWN' },
      { code: 'EQUIP_CT_SCANNER', status: 'AVAILABLE' },
      { code: 'BLOOD_O_NEG', status: 'UNKNOWN' },
    ],
    freshness: 'FRESH',
    behaviour: 'MORE_INFO',
    responseDelaySeconds: 4,
    responseMessage: 'Additional information required: confirm ICU requirement and patient weight.',
  },
  {
    externalId: 'mock-hospital-007',
    name: '[MOCK] Field Hospital',
    address: 'Ring Road, Lahore',
    city: 'Lahore',
    latitude: 31.5903,
    longitude: 74.4006,
    phone: '+92-42-9000007',
    services: ['Emergency', 'Stabilisation'],
    capabilities: [
      { code: 'SERVICE_EMERGENCY_DEPARTMENT', status: 'AVAILABLE' },
      { code: 'SPECIALIST_EMERGENCY_MEDICINE', status: 'AVAILABLE' },
      { code: 'BED_EMERGENCY', status: 'AVAILABLE', quantity: 1 },
      { code: 'SURGICAL_OPERATING_ROOM', status: 'UNAVAILABLE' },
      { code: 'BED_ICU', status: 'UNAVAILABLE' },
      { code: 'EQUIP_VENTILATOR', status: 'AVAILABLE', quantity: 1 },
    ],
    freshness: 'STALE',
    behaviour: 'TIMEOUT',
    responseDelaySeconds: 8,
    responseMessage: 'Hospital did not respond before the request timeout.',
  },
];

/**
 * Mock Hospital Portal adapter. It never represents real hospital capacity.
 * Every response is labelled MOCK, and the UI must display this label.
 */
@Injectable()
export class MockHospitalAdapter implements HospitalProvider {
  readonly name = 'mock';
  readonly isMock = true;
  private readonly logger = new Logger(MockHospitalAdapter.name);
  private readonly requests = new Map<string, StoredRequest>();
  private readonly idempotency = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  private center(): { latitude: number; longitude: number } {
    return {
      latitude: Number(this.config.get<string>('MOCK_HOSPITAL_CENTER_LAT', '31.5204')),
      longitude: Number(this.config.get<string>('MOCK_HOSPITAL_CENTER_LNG', '74.3587')),
    };
  }

  async searchHospitals(params: HospitalSearchParams): Promise<HospitalSummary[]> {
    const radius = params.radiusKm ?? 25;
    const limit = params.limit ?? 20;
    return DEFINITIONS.map((definition) => {
      const distanceKm = haversineDistanceKm(
        { latitude: params.latitude, longitude: params.longitude },
        { latitude: definition.latitude, longitude: definition.longitude },
      );
      return {
        summary: {
          externalId: definition.externalId,
          name: definition.name,
          address: definition.address,
          city: definition.city,
          latitude: definition.latitude,
          longitude: definition.longitude,
          phone: definition.phone,
          services: definition.services,
          isMock: true,
          dataSource: 'MOCK' as const,
        },
        distanceKm,
      };
    })
      .filter((item) => item.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit)
      .map((item) => item.summary);
  }

  async getCapabilities(hospitalExternalId: string): Promise<HospitalAvailability> {
    const definition = DEFINITIONS.find((h) => h.externalId === hospitalExternalId);
    if (!definition) throw new HospitalIntegrationError('Hospital not found in mock directory', 'NOT_FOUND', false);
    const now = new Date();
    const observedAt =
      definition.freshness === 'EXPIRED'
        ? new Date(now.getTime() - 3 * 60 * 60 * 1000)
        : definition.freshness === 'STALE'
          ? new Date(now.getTime() - 15 * 60 * 1000)
          : new Date(now.getTime() - 30 * 1000);
    const expiresAt =
      definition.freshness === 'EXPIRED'
        ? new Date(now.getTime() - 60 * 60 * 1000)
        : new Date(now.getTime() + 4 * 60 * 1000);
    return {
      hospitalExternalId: definition.externalId,
      hospitalName: definition.name,
      capabilities: definition.capabilities.map((c) => ({ ...c })),
      sourceResponseId: `mock-snapshot-${randomUUID()}`,
      observedAt,
      expiresAt,
      isMock: true,
      dataSource: 'MOCK',
      raw: { mock: true, freshness: definition.freshness },
    };
  }

  async createEmergencyRequest(input: HospitalEmergencyRequestInput): Promise<HospitalEmergencyRequestResult> {
    if (input.hospitalExternalId.includes('fail')) {
      throw new HospitalIntegrationError('Simulated hospital transport failure', 'UNAVAILABLE', true);
    }
    const definition = DEFINITIONS.find((h) => h.externalId === input.hospitalExternalId);
    if (!definition) throw new HospitalIntegrationError('Unknown mock hospital', 'NOT_FOUND', false);
    const existingId = this.idempotency.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.requests.get(existingId);
      if (existing) return this.resultFor(existing);
    }
    const externalRequestId = `mock-req-${randomUUID()}`;
    const stored: StoredRequest = {
      externalRequestId,
      input,
      createdAt: Date.now(),
      etaMinutes: input.etaMinutes,
    };
    this.requests.set(externalRequestId, stored);
    this.idempotency.set(input.idempotencyKey, externalRequestId);
    this.logger.log(`[MOCK HOSPITAL] request ${externalRequestId} created for ${definition.name}`);
    return {
      externalRequestId,
      status: 'PENDING',
      message: 'Request received by mock hospital (simulated acknowledgement).',
      respondedAt: null,
      raw: { mock: true, behaviour: definition.behaviour },
    };
  }

  async getEmergencyRequest(externalRequestId: string): Promise<HospitalEmergencyRequestResult> {
    const stored = this.requests.get(externalRequestId);
    if (!stored) throw new HospitalIntegrationError('Mock emergency request not found', 'NOT_FOUND', false);
    return this.resultFor(stored);
  }

  async sendEta(externalRequestId: string, etaMinutes: number): Promise<HospitalEmergencyRequestResult> {
    const stored = this.requests.get(externalRequestId);
    if (!stored) throw new HospitalIntegrationError('Mock emergency request not found', 'NOT_FOUND', false);
    stored.etaMinutes = etaMinutes;
    return this.resultFor(stored);
  }

  private resultFor(stored: StoredRequest): HospitalEmergencyRequestResult {
    const definition = DEFINITIONS.find((h) => h.externalId === stored.input.hospitalExternalId);
    const elapsedSeconds = (Date.now() - stored.createdAt) / 1000;
    let status: ExternalHospitalRequestStatus = 'PENDING';
    let respondedAt: string | null = null;
    let message: string | null = 'Awaiting mock hospital response.';
    if (definition && elapsedSeconds >= definition.responseDelaySeconds) {
      const map: Record<MockHospitalDefinition['behaviour'], ExternalHospitalRequestStatus> = {
        ACCEPT: 'ACCEPTED',
        REJECT: 'REJECTED',
        MORE_INFO: 'MORE_INFO',
        TIMEOUT: 'TIMED_OUT',
        ACK_ONLY: 'ACKNOWLEDGED',
      };
      status = map[definition.behaviour];
      respondedAt =
        definition.behaviour === 'TIMEOUT'
          ? new Date(stored.createdAt + (this.config.get<number>('HOSPITAL_REQUEST_TIMEOUT_SECONDS') ?? 120) * 1000).toISOString()
          : new Date(stored.createdAt + definition.responseDelaySeconds * 1000).toISOString();
      message = definition.responseMessage ?? status;
    } else if (definition && elapsedSeconds >= 1) {
      status = 'ACKNOWLEDGED';
      message = 'Mock hospital acknowledged the emergency request.';
    }
    return {
      externalRequestId: stored.externalRequestId,
      status,
      message,
      respondedAt,
      raw: { mock: true, elapsedSeconds, etaMinutes: stored.etaMinutes },
    };
  }
}
