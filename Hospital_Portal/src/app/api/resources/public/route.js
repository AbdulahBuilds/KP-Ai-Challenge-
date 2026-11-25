import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

// Public API for Rescue 1122 and BHU Recommendation Engine
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceRequired = searchParams.get('service'); // e.g. "Cardiology", "Trauma OT", "ICU", "Dialysis"
    const bloodRequired = searchParams.get('blood'); // e.g. "O-", "A+"
    const district = searchParams.get('district');

    let hospitals = await dataStore.getHospitals();

    if (district) {
      hospitals = hospitals.filter(h => h.district.toLowerCase() === district.toLowerCase());
    }

    const recommendations = hospitals.map(h => {
      const lastUpdate = h.resources?.lastOverallUpdate ? new Date(h.resources.lastOverallUpdate) : new Date(0);
      const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const isOutdated = hoursAgo > 12;

      const beds = h.resources?.beds || {};
      const equipment = h.resources?.equipment || {};
      const specialists = h.resources?.specialists || {};
      const services = h.resources?.services || {};
      const blood = h.resources?.bloodStock?.units || {};

      let matchScore = 100;
      const capabilities = [];

      // Check bed availability
      if (beds.available > 0) {
        capabilities.push(`${beds.available} General Beds Available`);
      } else {
        matchScore -= 30;
      }

      if (beds.icuAvailable > 0) {
        capabilities.push(`${beds.icuAvailable} ICU Beds Available`);
      }

      // Check equipment
      if (equipment.ventilators?.available > 0) capabilities.push(`${equipment.ventilators.available} Ventilators`);
      if (equipment.ctScan?.available > 0) capabilities.push("CT Scan Operational");

      // Check blood if requested
      let bloodMatch = null;
      if (bloodRequired && blood[bloodRequired]) {
        bloodMatch = blood[bloodRequired];
      }

      // Penalize outdated data
      if (isOutdated) {
        matchScore -= 25;
      }

      return {
        hospitalId: h.id,
        hospitalName: h.name,
        type: h.type,
        district: h.district,
        phone: h.emergencyPhone || h.phone,
        address: h.address,
        availableBeds: beds.available || 0,
        availableIcuBeds: beds.icuAvailable || 0,
        dataFreshness: isOutdated ? "OUTDATED_UNVERIFIED" : "VERIFIED_FRESH",
        hoursSinceUpdate: Math.round(hoursAgo * 10) / 10,
        matchScore: Math.max(10, matchScore),
        capabilities,
        bloodAvailable: bloodMatch,
        emergencyReady: services.emergency === "Available"
      };
    });

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error("Public Resources API Error:", error);
    return NextResponse.json({ error: "Failed to query hospital resources" }, { status: 500 });
  }
}

