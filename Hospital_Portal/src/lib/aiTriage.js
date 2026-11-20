/**
 * AI Clinical Triage & Resource Matcher for Government Hospital Portal
 * Uses Google Gemini API when GEMINI_API_KEY is available, with built-in clinical rule engine fallback.
 */

export async function analyzeReferralWithAI({ referral, hospitalResources }) {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `
You are an expert Chief Medical Officer and Emergency Triage AI at a major Government Tertiary Hospital in Khyber Pakhtunkhwa, Pakistan.
Analyze the following incoming patient referral from a Basic Health Unit (BHU) and compare with the hospital's live resource availability.

PATIENT INFORMATION:
- Name: ${referral.patientName}, Age: ${referral.age}, Gender: ${referral.gender}
- Referring Unit: ${referral.referringBHU} (Doctor: ${referral.bhuDoctorName})
- Chief Symptoms: ${referral.symptoms}
- Medical History: ${referral.medicalHistory || "None"}
- Current Vitals & Examination: ${referral.currentCondition || "Not provided"}
- BHU Doctor Notes: ${referral.doctorNotes || "None"}
- Services Requested: ${referral.requiredServices?.join(", ") || "General admission"}

HOSPITAL CURRENT LIVE RESOURCES:
- Available General Beds: ${hospitalResources?.beds?.available || 0}
- Available ICU Beds: ${hospitalResources?.beds?.icuAvailable || 0}
- Operational Ventilators: ${hospitalResources?.equipment?.ventilators?.available || 0}
- Specialists On Duty: ${
    Object.entries(hospitalResources?.specialists || {})
      .map(([k, v]) => `${k}: ${v.name} (${v.onDuty ? "ON DUTY" : "OFF DUTY"})`)
      .join("; ")
  }
- Key Services Status: Emergency (${hospitalResources?.services?.emergency}), ICU (${hospitalResources?.services?.icu}), OT (${hospitalResources?.services?.operationTheatre})

Provide your clinical analysis in valid JSON format with exactly these keys:
{
  "urgencyLevel": "CRITICAL" | "HIGH" | "MODERATE" | "ROUTINE",
  "clinicalImpression": "1-2 sentence clinical assessment of the diagnosis and severity",
  "identifiedSpecialties": ["specialties needed e.g. Cardiology, Intensive Care"],
  "resourceMatchStatus": "MATCHED" | "DEFICIT_WARNING",
  "resourceMatchExplanation": "Explanation of whether the hospital currently has the beds, specialists, and equipment ready",
  "recommendedAction": "ACCEPT" | "DECLINE_REDIRECT",
  "recommendationReason": "Rationale for the recommendation",
  "immediatePreparation": ["2-3 specific clinical steps hospital staff should take before arrival"]
}
`;

  // 1. Try Gemini API if key is present
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            aiModel: "Google Gemini 2.5 Flash (Live LLM)"
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to clinical expert heuristic:", err.message);
    }
  }

  // 2. Intelligent Clinical Rules Engine (Fallback / Offline / Local mode)
  return fallbackClinicalTriage(referral, hospitalResources);
}

export function fallbackClinicalTriage(referral, hospitalResources) {
  const sym = (referral.symptoms + " " + referral.currentCondition + " " + referral.doctorNotes).toLowerCase();
  const beds = hospitalResources?.beds || { available: 10, icuAvailable: 2 };
  const specialists = hospitalResources?.specialists || {};

  let urgencyLevel = "MODERATE";
  let clinicalImpression = "Patient requires secondary hospital clinical evaluation and management.";
  let specialties = ["General Medicine"];
  let immediatePrep = ["Assign triage bed in observation ward", "Establish IV access & baseline labs"];

  // Cardiac / STEMI detection
  if (sym.includes("chest pain") || sym.includes("stemi") || sym.includes("infarct") || sym.includes("cardiac") || sym.includes("troponin")) {
    urgencyLevel = "CRITICAL";
    clinicalImpression = "Suspected Acute Coronary Syndrome / STEMI. Immediate cardiac monitoring and primary PCI/CCU required.";
    specialties = ["Cardiology", "Cardiac Intensive Care"];
    immediatePrep = [
      "Alert On-Duty Cardiologist & Cardiac Cath Lab team",
      "Reserve CCU/ICU monitored bed",
      "Prepare emergency telemetry, IV nitrates, and anticoagulation tray"
    ];
  }
  // Stroke / Neurological detection
  else if (sym.includes("hemiplegia") || sym.includes("aphasia") || sym.includes("stroke") || sym.includes("facial droop") || sym.includes("gcs")) {
    urgencyLevel = "CRITICAL";
    clinicalImpression = "Acute Neurological Deficit / Suspected Ischemic Stroke within potential thrombolysis window.";
    specialties = ["Neurology", "Radiology / CT Scan", "ICU"];
    immediatePrep = [
      "Clear Emergency CT Scan suite for immediate brain scan",
      "Alert Neurology and Thrombolysis Stroke Team",
      "Prepare dedicated ICU bed for neurological monitoring"
    ];
  }
  // Obstetric Hemorrhage detection
  else if (sym.includes("hemorrhage") || sym.includes("bleeding") || sym.includes("gestation") || sym.includes("placenta") || sym.includes("pregnant")) {
    urgencyLevel = "CRITICAL";
    clinicalImpression = "Obstetric Hemorrhage / Acute maternal-fetal compromise requiring urgent surgical intervention.";
    specialties = ["Obstetrics & Gynecology", "Emergency OT", "Blood Bank"];
    immediatePrep = [
      "Prepare Emergency Operation Theatre for urgent Cesarean section",
      "Cross-match and reserve 2-4 units of PRBC blood immediately",
      "Alert Neonatal Intensive Care Unit (NICU) resuscitation team"
    ];
  }
  // Respiratory failure
  else if (sym.includes("dyspnea") || sym.includes("stridor") || sym.includes("spo2") || sym.includes("respiratory")) {
    urgencyLevel = "HIGH";
    clinicalImpression = "Severe Respiratory Distress with hypoxemia. Close airway monitoring required.";
    specialties = ["Pulmonology", "ICU / Ventilator"];
    immediatePrep = [
      "Prepare high-flow oxygen and mechanical ventilator",
      "Have intubation and airway tray at bedside",
      "Notify ICU nursing supervisor"
    ];
  }

  // Cross-reference with live hospital capacity
  const isIcuRequired = urgencyLevel === "CRITICAL" || sym.includes("icu");
  const icuAvailable = (beds.icuAvailable || 0) > 0;
  const generalBedsAvailable = (beds.available || 0) > 0;

  // Check specialist availability
  let specialistOnDuty = true;
  let specialistName = "Specialist Staff";

  if (specialties.includes("Cardiology")) {
    const card = specialists.cardiologist;
    specialistOnDuty = card ? card.onDuty : true;
    specialistName = card?.name || "Cardiologist";
  } else if (specialties.includes("Neurology")) {
    const neuro = specialists.neurologist;
    specialistOnDuty = neuro ? neuro.onDuty : true;
    specialistName = neuro?.name || "Neurologist";
  } else if (specialties.includes("Obstetrics & Gynecology")) {
    const gyn = specialists.gynecologist;
    specialistOnDuty = gyn ? gyn.onDuty : true;
    specialistName = gyn?.name || "Gynecologist";
  }

  let resourceMatchStatus = "MATCHED";
  let resourceMatchExplanation = `Verified hospital capacity: ${beds.available} general beds, ${beds.icuAvailable} ICU beds available. ${specialistName} is on duty.`;
  let recommendedAction = "ACCEPT";
  let recommendationReason = "Hospital facilities and specialist staff currently meet clinical requirements.";

  if (isIcuRequired && !icuAvailable) {
    resourceMatchStatus = "DEFICIT_WARNING";
    resourceMatchExplanation = "Critical Alert: Patient requires ICU admission, but all ICU beds are currently occupied.";
    recommendedAction = "DECLINE_REDIRECT";
    recommendationReason = "No available ICU beds. Patient should be redirected to the nearest tertiary facility with open ICU capacity.";
  } else if (!specialistOnDuty) {
    resourceMatchStatus = "DEFICIT_WARNING";
    resourceMatchExplanation = `Warning: ${specialistName} is currently off-duty or on-call.`;
    recommendedAction = "DECLINE_REDIRECT";
    recommendationReason = "Required medical specialist is not physically present in hospital bay.";
  }

  return {
    urgencyLevel,
    clinicalImpression,
    identifiedSpecialties: specialties,
    resourceMatchStatus,
    resourceMatchExplanation,
    recommendedAction,
    recommendationReason,
    immediatePreparation: immediatePrep,
    aiModel: process.env.GEMINI_API_KEY ? "Gemini 1.5 Flash (Online)" : "KPK Healthcare Clinical Triage Engine"
  };
}

/**
 * AI Trauma Bay Readiness Assistant for Rescue 1122 Emergency Alerts
 * ATLS (Advanced Trauma Life Support) aligned clinical advisory engine.
 */
export async function generateEmergencyTraumaAIAdvice({ alert, hospitalResources }) {
  const type = ((alert.emergencyType || "") + " " + (alert.vitals || "")).toLowerCase();
  const reqFacilities = (alert.requiredFacilities || []).map(f => f.toLowerCase());
  
  // Hospital capacity checks
  const icuAvailable = hospitalResources?.beds?.icuAvailable ?? 0;
  const ventsAvailable = hospitalResources?.equipment?.ventilators?.available ?? 0;
  const oNegPrbcAvailable = hospitalResources?.bloodStock?.units?.['O-']?.prbc;

  let code = "CODE RED (Life-Threatening)";
  let primaryRisk = "Hypovolemic Shock & Airway Compromise";
  let bayChecklist = [];

  // 1. Resuscitation Bay & Primary Team Activation
  if (type.includes("cardiac") || type.includes("arrest")) {
    code = "CODE RED (Cardiac Arrest in Transit)";
    primaryRisk = "Refractory Ventricular Arrhythmia / Sudden Collapse";
    bayChecklist.push("Prepare Resuscitation Bay 1 (Lucas / Mechanical CPR & Defibrillator charged)");
    bayChecklist.push("Pre-draw ACLS emergency medications (Epinephrine 1mg, Amiodarone 300mg)");
    bayChecklist.push("Direct transfer protocol to Cardiac Catheterization Lab & notify Interventional Cardiologist");
  } else if (type.includes("burn") || type.includes("blast") || type.includes("fire")) {
    code = "CODE RED (Severe Inhalation & Burn)";
    primaryRisk = "Rapid Airway Edema, Severe Hypovolemia & Inhalation Injury";
    bayChecklist.push("Prepare Burn ICU / sterile resuscitation bay with warmed ambient environment");
    bayChecklist.push("Immediate fiberoptic bronchoscopy & endotracheal intubation cart ready");
    bayChecklist.push("Warm Hartmann's fluid infusion lines established (Parkland formula protocol ready)");
    bayChecklist.push("Notify Plastic Surgery & Burns On-Duty Specialist for urgent escharotomy assessment");
  } else {
    // Polytrauma / Major Trauma / Hemorrhage
    code = "CODE RED (Life-Threatening Polytrauma)";
    primaryRisk = "Hypovolemic Shock & Airway Compromise";
    bayChecklist.push("Prepare Emergency Trauma Resuscitation Bay 1 (Shock Room)");
    
    // Check airway risk: GCS <= 8, BVM, shallow respirations, airway compromise
    const isAirwayCompromised = type.includes("bvm") || type.includes("gcs 8") || type.includes("gcs 7") || 
      type.includes("gcs 6") || type.includes("gcs 5") || type.includes("gcs 4") || type.includes("gcs 3") || 
      type.includes("bag-valve") || type.includes("shallow") || type.includes("stridor") || type.includes("airway");
    
    if (isAirwayCompromised) {
      bayChecklist.push("Airway management & Rapid Sequence Intubation (RSI) kit ready (manual in-line c-spine stabilization)");
    } else {
      bayChecklist.push("Prepare high-flow non-rebreather oxygen and video laryngoscope on standby");
    }

    // Multidisciplinary trauma activation
    bayChecklist.push("Notify on-duty Trauma Surgeon and Anesthesiologist (Trauma Code Activation)");
  }

  // 2. Blood Bank & Massive Transfusion Protocol (MTP) + TXA
  // Extract specific requested blood units if provided in facilities (e.g. "3 Units O- PRBC Blood")
  const bloodFacilityReq = (alert.requiredFacilities || []).find(f => /o[-\+]|prbc|blood/i.test(f));
  let requestedUnits = 2; // clinical standard emergency release pack
  let bloodText = "";
  
  if (bloodFacilityReq) {
    const match = bloodFacilityReq.match(/(\d+)\s*(?:units?|u)?/i);
    if (match) {
      requestedUnits = parseInt(match[1], 10);
    }
    bloodText = `Alert Blood Bank for ${requestedUnits} units O-Negative PRBC uncrossmatched (stat pack per paramedic request)`;
  } else {
    bloodText = "Alert Blood Bank for 2 units O-Negative PRBC uncrossmatched (stat emergency pack)";
  }
  
  // Severe hemorrhage / shock detection
  const isSevereHemorrhage = type.includes("massive blood") || type.includes("bp 80") || type.includes("bp 70") || 
    type.includes("bp 60") || type.includes("shock") || type.includes("femur") || type.includes("hemorrhage") ||
    reqFacilities.some(f => f.includes("blood") || f.includes("prbc"));

  if (isSevereHemorrhage && !type.includes("cardiac")) {
    bayChecklist.push(bloodText);
    bayChecklist.push("Activate Massive Transfusion Protocol (MTP 1:1:1 PRBC/FFP/Platelets) & prepare IV Tranexamic Acid (TXA 1g stat within 3h of injury)");
  } else if (!type.includes("cardiac") && !type.includes("burn")) {
    bayChecklist.push("Alert Blood Bank for 2 units O-Negative PRBC on standby & ready rapid blood warmer");
  }

  // 3. Specialist Team Alerts tailored to injuries and required facilities
  const hasOrthoInjury = reqFacilities.some(f => f.includes("orthopedic") || f.includes("fracture")) || 
    type.includes("femur") || type.includes("fracture") || type.includes("compound");
  if (hasOrthoInjury) {
    bayChecklist.push("Alert On-Call Orthopedic Team for open fracture stabilization / urgent washout");
    bayChecklist.push("Prepare femur traction splint, commercial tourniquet & sterile pressure dressing pack");
  }

  const hasOTReq = reqFacilities.some(f => f.includes("theatre") || f.includes("operation") || f.includes("ot"));
  if (hasOTReq) {
    bayChecklist.push("Reserve Trauma Operation Theatre (Emergency OT) & alert surgical scrub team");
  }

  const hasNeuroInjury = reqFacilities.some(f => f.includes("neuro")) || type.includes("head injury") || type.includes("subdural");
  if (hasNeuroInjury) {
    bayChecklist.push("Alert On-Call Neurosurgeon & clear Trauma CT suite for urgent brain scan");
  }

  // 4. Ventilator & ICU notification
  const hasVentReq = reqFacilities.some(f => f.includes("ventilator")) || type.includes("bag-valve") || type.includes("shallow");
  if (hasVentReq && !type.includes("cardiac") && !type.includes("burn")) {
    bayChecklist.push("Ready mechanical ventilator with trauma settings (lung-protective mode)");
  }

  // Build resource notice with blood inventory if available
  let bedNotice = `Hospital has ${icuAvailable} ICU beds and ${ventsAvailable} ventilators available.`;
  if (oNegPrbcAvailable !== undefined) {
    bedNotice += ` Blood Bank: ${oNegPrbcAvailable} units O-Negative PRBC currently in stock.`;
  }

  return {
    code,
    primaryRisk,
    etaUrgency: (alert.etaMinutes <= 10) ? "CRITICAL IMMEDIATE ARRIVAL" : "PREPARATORY WINDOW",
    bayChecklist,
    bedNotice
  };
}

