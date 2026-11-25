import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { searchNearbyHospitals } from '@/lib/integration';

export const dynamic = 'force-dynamic';

// GET /api/hospitals/search?latitude=...&longitude=...&radiusKm=...&limit=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitals = await dataStore.getHospitals();
    const results = searchNearbyHospitals(hospitals, {
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      radiusKm: searchParams.get('radiusKm') ?? 25,
      limit: searchParams.get('limit') ?? 20,
    });
    return NextResponse.json({
      success: true,
      count: results.length,
      source: 'Hospital_Portal',
      hospitals: results,
    });
  } catch (error) {
    console.error('GET Hospital Search Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to search hospitals' }, { status: 400 });
  }
}
