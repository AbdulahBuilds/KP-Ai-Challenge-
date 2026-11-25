import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { toExternalRequestStatus } from '@/lib/integration';

export const dynamic = 'force-dynamic';

// POST /api/emergency-requests - Rescue 1122 notifies the selected hospital
export async function POST(request) {
  try {
    const payload = await request.json();
    const hospital = await dataStore.getHospitalById(payload.hospitalExternalId);
    if (!hospital) {
      return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });
    }

    const alert = await dataStore.createEmergencyAlert({
      rescueCaseId: payload.requestId || payload.incidentId,
      patientName: payload.patient?.patientName || (payload.patient?.unidentified === false ? 'Identified Patient' : 'Unidentified Patient'),
      emergencyType: payload.emergencyType,
      targetHospitalId: hospital.id,
      location: payload.location?.address || `${payload.location?.latitude ?? ''}, ${payload.location?.longitude ?? ''}`,
      requiredFacilities: payload.requiredCapabilities ?? [],
      etaMinutes: payload.etaMinutes ?? 10,
      paramedicName: `Rescue 1122 - ${payload.caseNumber ?? 'case'}`,
      vitals: [payload.patient?.suspectedCondition, payload.patient?.symptoms, payload.patient?.injuries]
        .filter(Boolean)
        .join(' | ') || 'Critical / Polytrauma',
      idempotencyKey: request.headers.get('idempotency-key') || null,
    });

    return NextResponse.json({
      success: true,
      requestId: alert.id,
      externalRequestId: alert.id,
      status: toExternalRequestStatus(alert.status),
      message: `Alert delivered to ${hospital.name}`,
      respondedAt: alert.acknowledgedAt || null,
      raw: alert,
    }, { status: 201 });
  } catch (error) {
    console.error('POST Emergency Request Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create emergency request' }, { status: 400 });
  }
}
