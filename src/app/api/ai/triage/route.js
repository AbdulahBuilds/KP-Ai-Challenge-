import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { analyzeReferralWithAI, generateEmergencyTraumaAIAdvice } from '@/lib/aiTriage';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type = 'referral', referral, referralId, alert, alertId, hospitalId } = body;

    let hospital = null;
    if (hospitalId) {
      hospital = await dataStore.getHospitalById(hospitalId);
    }

    if (type === 'referral') {
      let refData = referral;
      if (!refData && referralId) {
        refData = await dataStore.getReferralById(referralId);
      }
      if (!refData) {
        return NextResponse.json({ error: "Referral data or referralId is required" }, { status: 400 });
      }

      if (!hospital && refData.targetHospitalId) {
        hospital = await dataStore.getHospitalById(refData.targetHospitalId);
      }

      const aiAnalysis = await analyzeReferralWithAI({
        referral: refData,
        hospitalResources: hospital?.resources || {}
      });

      return NextResponse.json({
        success: true,
        aiAnalysis
      });
    } else if (type === 'emergency') {
      let alertData = alert;
      if (!alertData && alertId) {
        alertData = await dataStore.getEmergencyAlertById(alertId);
      }
      if (!alertData) {
        return NextResponse.json({ error: "Emergency alert data or alertId is required" }, { status: 400 });
      }

      if (!hospital && alertData.targetHospitalId) {
        hospital = await dataStore.getHospitalById(alertData.targetHospitalId);
      }

      const aiAdvice = generateEmergencyTraumaAIAdvice({
        alert: alertData,
        hospitalResources: hospital?.resources || {}
      });

      return NextResponse.json({
        success: true,
        aiAdvice
      });
    }

    return NextResponse.json({ error: "Invalid type. Must be referral or emergency" }, { status: 400 });
  } catch (error) {
    console.error("AI Triage API Error:", error);
    return NextResponse.json({ error: "AI triage analysis failed" }, { status: 500 });
  }
}

