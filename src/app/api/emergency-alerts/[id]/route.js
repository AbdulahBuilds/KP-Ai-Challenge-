import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const alert = await dataStore.getEmergencyAlertById(id);
    if (!alert) {
      return NextResponse.json({ error: "Emergency alert not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("GET Emergency Alert Error:", error);
    return NextResponse.json({ error: "Failed to fetch emergency alert" }, { status: 500 });
  }
}

// PATCH: Hospital staff acknowledges alert and confirms facility readiness
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, confirmedFacilities } = body;

    const updatedAlert = await dataStore.acknowledgeEmergencyAlert(id, {
      status: status || "ACKNOWLEDGED",
      confirmedFacilities: confirmedFacilities || []
    });

    if (!updatedAlert) {
      return NextResponse.json({ error: "Emergency alert not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Emergency alert acknowledged and preparedness confirmed back to Rescue 1122",
      alert: updatedAlert
    });
  } catch (error) {
    console.error("PATCH Emergency Alert Error:", error);
    return NextResponse.json({ error: "Failed to acknowledge emergency alert" }, { status: 500 });
  }
}

