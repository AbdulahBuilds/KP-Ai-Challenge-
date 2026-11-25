import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { toCapabilitySnapshot } from '@/lib/integration';

export const dynamic = 'force-dynamic';

// GET /api/hospitals/:id/capabilities - normalized live capability snapshot for Rescue 1122
export async function GET(_request, { params }) {
  try {
    const hospital = await dataStore.getHospitalById(params.id);
    if (!hospital) {
      return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });
    }
    const snapshot = toCapabilitySnapshot(hospital);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error) {
    console.error('GET Hospital Capabilities Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load hospital capabilities' }, { status: 500 });
  }
}
