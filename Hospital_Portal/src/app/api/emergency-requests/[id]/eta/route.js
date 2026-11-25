import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { recordEta } from '@/lib/emergencyRequests';
import { toExternalRequestStatus } from '@/lib/integration';

export const dynamic = 'force-dynamic';

// POST /api/emergency-requests/:id/eta - Rescue 1122 sends updated arrival time
export async function POST(request, { params }) {
  try {
    const { etaMinutes } = await request.json();
    if (!Number.isFinite(Number(etaMinutes)) || Number(etaMinutes) < 0) {
      return NextResponse.json({ success: false, error: 'etaMinutes must be a non-negative number' }, { status: 400 });
    }
    const alert = await dataStore.getEmergencyAlertById(params.id);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Emergency request not found' }, { status: 404 });
    }
    const eta = recordEta(alert.id, Number(etaMinutes));
    await dataStore.updateEmergencyAlertEta(alert.id, Number(etaMinutes));
    return NextResponse.json({
      success: true,
      requestId: alert.id,
      externalRequestId: alert.id,
      status: toExternalRequestStatus(alert.status),
      message: `ETA updated to ${eta.etaMinutes} minutes`,
      etaMinutes: eta.etaMinutes,
      etaUpdatedAt: eta.updatedAt,
    });
  } catch (error) {
    console.error('POST Emergency Request ETA Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update ETA' }, { status: 400 });
  }
}
