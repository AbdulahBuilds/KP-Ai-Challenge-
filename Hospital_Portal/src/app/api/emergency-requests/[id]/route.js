import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { getEta } from '@/lib/emergencyRequests';
import { toExternalRequestStatus } from '@/lib/integration';

export const dynamic = 'force-dynamic';

// GET /api/emergency-requests/:id - fetch hospital response for a Rescue case
export async function GET(_request, { params }) {
  try {
    const alert = await dataStore.getEmergencyAlertById(params.id);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Emergency request not found' }, { status: 404 });
    }
    const eta = getEta(alert.id) || (alert.etaUpdatedAt ? { etaMinutes: alert.etaMinutes, updatedAt: alert.etaUpdatedAt } : null);
    return NextResponse.json({
      success: true,
      requestId: alert.id,
      externalRequestId: alert.id,
      status: toExternalRequestStatus(alert.status),
      message: alert.confirmedFacilities?.length
        ? `Confirmed: ${alert.confirmedFacilities.join(', ')}`
        : 'Awaiting hospital confirmation',
      respondedAt: alert.acknowledgedAt || null,
      ...(eta ? { etaMinutes: eta.etaMinutes, etaUpdatedAt: eta.updatedAt } : {}),
      raw: alert,
    });
  } catch (error) {
    console.error('GET Emergency Request Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load emergency request' }, { status: 500 });
  }
}
