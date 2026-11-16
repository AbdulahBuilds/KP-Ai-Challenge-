import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

// GET /api/hospitals - List hospitals (also consumed by BHU & Rescue 1122 to discover hospitals)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const type = searchParams.get('type');

    let hospitals = await dataStore.getHospitals();

    if (district) {
      hospitals = hospitals.filter(h => h.district.toLowerCase() === district.toLowerCase());
    }
    if (type) {
      hospitals = hospitals.filter(h => h.type.toLowerCase() === type.toLowerCase());
    }

    // Annotate with freshness flag (> 12 hrs is OUTDATED per project requirements)
    const annotated = hospitals.map(h => {
      const lastUpdate = h.resources?.lastOverallUpdate ? new Date(h.resources.lastOverallUpdate) : new Date(0);
      const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const isFresh = hoursAgo <= 12;
      return {
        ...h,
        freshnessStatus: isFresh ? "FRESH" : "OUTDATED_UNVERIFIED",
        hoursSinceUpdate: Math.round(hoursAgo * 10) / 10
      };
    });

    return NextResponse.json({ success: true, count: annotated.length, hospitals: annotated });
  } catch (error) {
    console.error("GET Hospitals Error:", error);
    return NextResponse.json({ error: "Failed to fetch hospitals" }, { status: 500 });
  }
}

