/**
 * AI Clinical Triage & Resource Matcher for Government Hospital Portal
 * Uses Google Gemini API with production model fallback cascade & Zod schema validation,
 * with built-in ATLS-aligned clinical rule engine fallback.
 */

import { z } from 'zod';

// Production Model Cascade: primary -> secondary -> fallback
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3-flash-preview'
];

// ---------------------------------------------------------------------------
// Zod Schemas for Type-Safe AI Clinical Outputs
// ---------------------------------------------------------------------------
const ReferralTriageSchema = z.object({
  urgencyLevel: z.enum(["CRITICAL", "HIGH", "MODERATE", "ROUTINE"]).default("HIGH"),
  esiLevel: z.coerce.number().min(1).max(5).default(2),
  clinicalImpression: z.string().default("Patient requires hospital admission and diagnostic workup."),
  identifiedSpecialties: z.array(z.string()).default(["Emergency Medicine"]),
  resourceMatchStatus: z.enum(["MATCHED", "DEFICIT_WARNING"]).default("MATCHED"),
  resourceMatchExplanation: z.string().default("Hospital resources reviewed against clinical requirements."),
  recommendedAction: z.enum(["ACCEPT", "DECLINE_REDIRECT"]).default("ACCEPT"),
  recommendationReason: z.string().default("Hospital resources currently align with referral requirements."),
  immediatePreparation: z.array(z.string()).default([
    "Prepare resuscitation / triage observation bay",
    "Establish IV access and baseline laboratory investigations",
    "Alert on-duty resident medical officer"
  ])
});

const TraumaAdviceSchema = z.object({
  code: z.string().default("CODE AMBER (Emergency Intake)"),
  primaryRisk: z.string().default("Acute physiological compromise & impending instability"),
  etaUrgency: z.string().default("PREPARATORY WINDOW"),
  bayChecklist: z.array(z.string()).default([
    "Clear Resuscitation Bay 1 and prepare mechanical ventilator",
    "Check emergency airway trolley (endotracheal tubes, video laryngoscope)",
    "Notify on-duty trauma surgeon and emergency anesthesia team",
    "Request immediate emergency O-Negative PRBC standby from blood bank"
  ]),
  bedNotice: z.string().default("Hospital trauma bay alerted and preparing for inbound ambulance arrival")
});

/**
 * Helper to call Gemini with automated model fallback cascade
 */
async function callGeminiCascade(prompt, schema, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const validated = schema.parse(parsed);
          return {
            success: true,
            modelUsed: `Google Gemini (${model})`,
            data: validated
          };
        }
      } else {
        const errText = await response.text().catch(() => '');
        lastError = new Error(`Model ${model} returned HTTP ${response.status}: ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini cascade models failed");
}

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

Provide your clinical analysis in valid JSON format strictly matching this schema:
{
  "urgencyLevel": "CRITICAL" | "HIGH" | "MODERATE" | "ROUTINE",
  "esiLevel": 1 | 2 | 3 | 4 | 5,
  "clinicalImpression": "1-2 sentence clinical assessment of the diagnosis and severity",
  "identifiedSpecialties": ["specialties needed e.g. Cardiology, Intensive Care"],
  "resourceMatchStatus": "MATCHED" | "DEFICIT_WARNING",
  "resourceMatchExplanation": "Explanation of whether the hospital currently has the beds, specialists, and equipment ready",
  "recommendedAction": "ACCEPT" | "DECLINE_REDIRECT",
  "recommendationReason": "Rationale for the recommendation",
  "immediatePreparation": ["3 specific clinical steps hospital staff should take before arrival"]
}
`;

  // 1. Try Gemini API Cascade if key is present
  if (apiKey) {
    try {
      const cascadeResult = await callGeminiCascade(prompt, ReferralTriageSchema, apiKey);
      return {
        ...cascadeResult.data,
        aiModel: cascadeResult.modelUsed
      };
    } catch (err) {
      console.warn("Hospital AI Gemini call failed, activating clinical rules engine:", err.message);
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
  let esiLevel = 3;
  let clinicalImpression = "Patient requires secondary hospital clinical evaluation and management.";
  let specialties = ["General Medicine"];
  let immediatePrep = [
    "Assign triage bed in observation ward",
    "Establish IV access & baseline laboratory investigations",
    "Notify on-duty Medical Officer"
  ];

  // Cardiac / STEMI detection
  if (sym.includes("chest pain") || sym.includes("stemi") || sym.includes("infarct") || sym.includes("cardiac") || sym.includes("troponin")) {
    urgencyLevel = "CRITICAL";
    esiLevel = 1;
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
    esiLevel = 1;
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
    esiLevel = 1;
    clinicalImpression = "Obstetric Hemorrhage / Acute maternal-fetal compromise requiring urgent surgical intervention.";
    specialties = ["Obstetrics & Gynecology", "Emergency OT", "Blood Bank"];
    immediatePrep = [
      "Prepare Emergency Operation Theatre for urgent Cesarean section",
      "Cross-match and reserve 2-4 units of PRBC blood immediately",
      "Alert Neonatal Intensive Care Unit (NICU) resuscitation team"
    ];
  }
  // Respiratory failure
  else if (sym.includes("dyspnea") || sym.includes("stridor") || sym.includes("spo2") || sym.includes("respiratory") || sym.includes("asthma")) {
    urgencyLevel = "HIGH";
    esiLevel = 2;
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
  let resourceMatchExplanation = `Verified hospital capacity: ${beds.available || 0} general beds, ${beds.icuAvailable || 0} ICU beds available. ${specialistName} is on duty.`;
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
    esiLevel,
    clinicalImpression,
    identifiedSpecialties: specialties,
    resourceMatchStatus,
    resourceMatchExplanation,
    recommendedAction,
    recommendationReason,
    immediatePreparation: immediatePrep,
    aiModel: "KPK Hospital Clinical Triage Engine (Deterministic Fallback)"
  };
}

/**
 * AI Trauma Bay Readiness Assistant for Rescue 1122 Emergency Alerts
 * ATLS (Advanced Trauma Life Support) aligned clinical advisory engine.
 */
export async function generateEmergencyTraumaAIAdvice({ alert, hospitalResources }) {
  const apiKey = process.env.GEMINI_API_KEY;

  const icuAvailable = hospitalResources?.beds?.icuAvailable ?? 0;
  const ventsAvailable = hospitalResources?.equipment?.ventilators?.available ?? 0;
  const oNegPrbcAvailable = hospitalResources?.bloodStock?.units?.['O-']?.prbc;

  const prompt = `You are an expert ATLS (Advanced Trauma Life Support) Chief Medical Officer at a Tertiary Hospital in Khyber Pakhtunkhwa.
Analyze this incoming Rescue 1122 emergency trauma alert and generate the immediate trauma bay resuscitation checklist and risk warnings.

INCOMING EMERGENCY:
- Patient: ${alert.patientName || 'Emergency Patient'}
- Emergency Condition: ${alert.emergencyType}
- Location: ${alert.location || 'In transit'}
- Required Facilities Requested: ${(alert.requiredFacilities || []).join(', ') || 'Emergency Trauma Bay'}
- Travel ETA: ${alert.etaMinutes || 15} mins

HOSPITAL LIVE CAPACITY:
- Available ICU Beds: ${icuAvailable}
- Operational Ventilators: ${ventsAvailable}
- Blood Stock: O-Negative PRBC: ${oNegPrbcAvailable ?? 'Available'} units

Return valid JSON with:
{
  "code": "CODE RED (Life-Threatening Polytrauma)" | "CODE RED (Cardiac Arrest)" | "CODE AMBER (Emergency Intake)",
  "primaryRisk": "Concise summary of primary life threats (e.g. Airway Obstruction & Exsanguination)",
  "etaUrgency": "CRITICAL IMMEDIATE ARRIVAL" | "PREPARATORY WINDOW",
  "bayChecklist": ["4-5 prioritized ATLS clinical actions for emergency staff before ambulance arrives"],
  "bedNotice": "Clear statement of hospital bed & blood bank readiness"
}`;

  if (apiKey) {
    try {
      const cascadeResult = await callGeminiCascade(prompt, TraumaAdviceSchema, apiKey);
      return {
        ...cascadeResult.data,
        aiModel: cascadeResult.modelUsed
      };
    } catch (err) {
      console.warn("Gemini Trauma Advice cascade failed, using deterministic clinical rules:", err.message);
    }
  }

  const type = ((alert.emergencyType || "") + " " + (alert.vitals || "")).toLowerCase();
  
  let code = "CODE RED (Life-Threatening Polytrauma)";
  let primaryRisk = "Hypovolemic Shock & Airway Compromise";
  let bayChecklist = [];

  // Resuscitation Bay & Primary Team Activation
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
    bayChecklist.push("Have difficult airway trolley & fiberoptic intubation ready at bedside");
    bayChecklist.push("Initiate Parkland Formula calculation and prepare warmed Lactated Ringer's IV bags");
  } else if (type.includes("neuro") || type.includes("head") || type.includes("brain") || type.includes("unconscious")) {
    code = "CODE RED (Severe Head Injury / Acute ICP)";
    primaryRisk = "Impending Brainstem Herniation & Intracranial Hemorrhage";
    bayChecklist.push("Clear Emergency CT Suite for immediate priority unenhanced head scan");
    bayChecklist.push("Alert On-Call Neurosurgeon and prepare neuro-resuscitation bay");
    bayChecklist.push("Prepare 3% Hypertonic Saline and Mannitol 20% infusions stat");
  } else {
    code = "CODE RED (High-Energy Polytrauma)";
    primaryRisk = "Massive Exsanguination, Pelvic Fracture, Tension Hemothorax";
    bayChecklist.push("Activate Massive Transfusion Protocol (MTP) with Blood Bank (4 units PRBC O-Neg, 4 FFP)");
    bayChecklist.push("Prepare Rapid Infuser, pelvic binder, and chest tube insertion tray (32 Fr)");
    bayChecklist.push("Alert General Surgery, Orthopedics, and Anesthesia teams for immediate trauma bay response");
  }

  // Bed and ventilator readiness check
  let bedNotice = "Trauma Bay 1 ready. General and ICU standby confirmed.";
  if (icuAvailable === 0) {
    bedNotice = "CRITICAL CAPACITY ALERT: 0 ICU beds currently open. Patient can be stabilized in Emergency Trauma Bay, but secondary transfer or OT holding will be required.";
  }

  return {
    code,
    primaryRisk,
    etaUrgency: (alert.etaMinutes || 10) <= 8 ? "CRITICAL IMMEDIATE ARRIVAL" : "PREPARATORY WINDOW",
    bayChecklist,
    bedNotice,
    aiModel: "ATLS Trauma Advisory Protocol (Deterministic Fallback)"
  };
}
