import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');
    const status = searchParams.get('status');

    const referrals = await dataStore.getReferrals(hospitalId, status);

    return NextResponse.json({
      success: true,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    console.error("GET Referrals Error:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}

// POST: BHU Doctor submits a new referral to the hospital
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.patientName || !body.age || !body.referringBHU || !body.targetHospitalId || !body.symptoms) {
      return NextResponse.json({
        error: "Missing required fields: patientName, age, referringBHU, targetHospitalId, symptoms"
      }, { status: 400 });
    }

    const newReferral = await dataStore.createReferral(body);

    return NextResponse.json({
      success: true,
      message: "Referral created and forwarded to target hospital successfully",
      referral: newReferral
    }, { status: 201 });
  } catch (error) {
    console.error("POST Referral Error:", error);
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}

