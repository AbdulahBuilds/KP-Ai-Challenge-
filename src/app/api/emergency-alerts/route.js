import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');
    const status = searchParams.get('status');

    const alerts = await dataStore.getEmergencyAlerts(hospitalId, status);

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error("GET Emergency Alerts Error:", error);
    return NextResponse.json({ error: "Failed to fetch emergency alerts" }, { status: 500 });
  }
}

// POST: Rescue 1122 Ambulance Dispatcher sends pre-arrival emergency alert
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.emergencyType || !body.targetHospitalId) {
      return NextResponse.json({
        error: "Missing required fields: emergencyType, targetHospitalId"
      }, { status: 400 });
    }

    const newAlert = await dataStore.createEmergencyAlert(body);

    return NextResponse.json({
      success: true,
      message: "Pre-arrival emergency alert dispatched to hospital emergency bay",
      alert: newAlert
    }, { status: 201 });
  } catch (error) {
    console.error("POST Emergency Alert Error:", error);
    return NextResponse.json({ error: "Failed to dispatch emergency alert" }, { status: 500 });
  }
}

