import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const referral = await dataStore.getReferralById(id);
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("GET Referral Error:", error);
    return NextResponse.json({ error: "Failed to fetch referral" }, { status: 500 });
  }
}

// PATCH: Hospital staff accepts or declines referral
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, declineReason, reconfirmedResources } = body;

    if (!status || !["ACCEPTED", "DECLINED"].includes(status)) {
      return NextResponse.json({ error: "Status must be either ACCEPTED or DECLINED" }, { status: 400 });
    }

    if (status === "DECLINED" && !declineReason) {
      return NextResponse.json({ error: "A declineReason is mandatory when declining a patient referral" }, { status: 400 });
    }

    if (status === "ACCEPTED" && (!reconfirmedResources || reconfirmedResources.length === 0)) {
      return NextResponse.json({ error: "Hospital staff must re-confirm relevant resource availability when accepting a referral" }, { status: 400 });
    }

    const updatedReferral = await dataStore.respondToReferral(id, {
      status,
      declineReason,
      reconfirmedResources
    });

    if (!updatedReferral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Referral successfully ${status.toLowerCase()}`,
      referral: updatedReferral
    });
  } catch (error) {
    console.error("PATCH Referral Error:", error);
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
  }
}

