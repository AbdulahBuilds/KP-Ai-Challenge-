import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const hospital = await dataStore.getHospitalById(id);
    if (!hospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    const lastUpdate = hospital.resources?.lastOverallUpdate ? new Date(hospital.resources.lastOverallUpdate) : new Date(0);
    const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      success: true,
      hospital: {
        ...hospital,
        freshnessStatus: hoursAgo <= 12 ? "FRESH" : "OUTDATED_UNVERIFIED",
        hoursSinceUpdate: Math.round(hoursAgo * 10) / 10
      }
    });
  } catch (error) {
    console.error("GET Hospital Error:", error);
    return NextResponse.json({ error: "Failed to fetch hospital" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const updated = await dataStore.updateHospitalProfile(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, hospital: updated });
  } catch (error) {
    console.error("PATCH Hospital Error:", error);
    return NextResponse.json({ error: "Failed to update hospital profile" }, { status: 500 });
  }
}

