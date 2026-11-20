import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');

    if (!hospitalId) {
      return NextResponse.json({ error: "hospitalId parameter is required" }, { status: 400 });
    }

    const hospital = await dataStore.getHospitalById(hospitalId);
    if (!hospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    const lastUpdate = hospital.resources?.lastOverallUpdate ? new Date(hospital.resources.lastOverallUpdate) : new Date(0);
    const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      success: true,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      resources: hospital.resources,
      freshnessStatus: hoursAgo <= 12 ? "CONFIRMED_AVAILABLE" : "OUTDATED_UNVERIFIED",
      lastUpdated: hospital.resources?.lastOverallUpdate,
      hoursSinceUpdate: Math.round(hoursAgo * 10) / 10
    });
  } catch (error) {
    console.error("GET Resources Error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { hospitalId, resources } = body;

    if (!hospitalId || !resources) {
      return NextResponse.json({ error: "hospitalId and resources payload are required" }, { status: 400 });
    }

    const updatedHospital = await dataStore.updateHospitalResources(hospitalId, resources);
    if (!updatedHospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Hospital resources updated and timestamp refreshed successfully",
      resources: updatedHospital.resources,
      lastUpdated: updatedHospital.resources.lastOverallUpdate
    });
  } catch (error) {
    console.error("PUT Resources Error:", error);
    return NextResponse.json({ error: "Failed to update resources" }, { status: 500 });
  }
}

