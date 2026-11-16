// Initial Seed Data for KPK Healthcare System
export const initialHospitals = [
  {
    id: "lrh-peshawar",
    name: "Lady Reading Hospital (LRH)",
    type: "Tertiary",
    district: "Peshawar",
    address: "GT Road, Soekarno Chowk, Peshawar, Khyber Pakhtunkhwa",
    phone: "+92-91-9211430",
    emergencyPhone: "+92-91-9211440",
    adminName: "Dr. Khalid Masood (Medical Director)",
    adminEmail: "staff@lrh.gov.pk",
    resources: {
      beds: {
        total: 1200,
        available: 142,
        occupied: 1058,
        icuTotal: 65,
        icuAvailable: 7,
        updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      },
      bloodStock: {
        units: {
          "A+": { wholeBlood: 14, prbc: 22, ffp: 18, platelets: 12, cryoprecipitate: 6 },
          "A-": { wholeBlood: 4, prbc: 6, ffp: 5, platelets: 3, cryoprecipitate: 2 },
          "B+": { wholeBlood: 19, prbc: 28, ffp: 20, platelets: 15, cryoprecipitate: 8 },
          "B-": { wholeBlood: 3, prbc: 5, ffp: 4, platelets: 2, cryoprecipitate: 1 },
          "AB+": { wholeBlood: 8, prbc: 12, ffp: 10, platelets: 6, cryoprecipitate: 4 },
          "AB-": { wholeBlood: 2, prbc: 3, ffp: 3, platelets: 1, cryoprecipitate: 1 },
          "O+": { wholeBlood: 24, prbc: 35, ffp: 25, platelets: 18, cryoprecipitate: 10 },
          "O-": { wholeBlood: 6, prbc: 8, ffp: 6, platelets: 4, cryoprecipitate: 3 }
        },
        updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString()
      },
      equipment: {
        ventilators: { total: 45, available: 6, status: "Operational" },
        oxygenSupply: { total: 250, available: 210, status: "Operational" },
        ecg: { total: 25, available: 16, status: "Operational" },
        xray: { total: 10, available: 8, status: "Operational" },
        ultrasound: { total: 14, available: 10, status: "Operational" },
        ctScan: { total: 4, available: 3, status: "Operational" },
        mri: { total: 2, available: 1, status: "Operational" },
        dialysis: { total: 32, available: 5, status: "Operational" },
        updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString()
      },
      specialists: {
        cardiologist: { name: "Prof. Dr. Tariq Parvez", onDuty: true, shift: "Morning / On Call" },
        neurologist: { name: "Dr. Asma Bilal", onDuty: true, shift: "Morning" },
        orthopedic: { name: "Dr. Shahzad Ali Bangash", onDuty: true, shift: "Morning" },
        generalSurgeon: { name: "Dr. Farooq Shah", onDuty: true, shift: "Evening" },
        neurosurgeon: { name: "Dr. Imran Khan Khattak", onDuty: true, shift: "Emergency Bay" },
        gynecologist: { name: "Dr. Samina Rehman", onDuty: true, shift: "Morning" },
        pediatrician: { name: "Dr. Babar Qureshi", onDuty: true, shift: "Morning" },
        anesthesiologist: { name: "Dr. Noman Akhtar", onDuty: true, shift: "OT Incharge" },
        updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      services: {
        emergency: "Available",
        icu: "Available",
        operationTheatre: "Available",
        laboratory: "Available",
        bloodBank: "Available",
        radiology: "Available",
        dialysis: "Available",
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      lastOverallUpdate: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    }
  },
  {
    id: "hmc-peshawar",
    name: "Hayatabad Medical Complex (HMC)",
    type: "Tertiary",
    district: "Peshawar",
    address: "Phase 4, Hayatabad, Peshawar, Khyber Pakhtunkhwa",
    phone: "+92-91-9217140",
    emergencyPhone: "+92-91-9217150",
    adminName: "Dr. Shehzad Akbar (Medical Superintendent)",
    adminEmail: "staff@hmc.gov.pk",
    resources: {
      beds: {
        total: 1000,
        available: 115,
        occupied: 885,
        icuTotal: 50,
        icuAvailable: 5,
        updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      bloodStock: {
        units: {
          "A+": { wholeBlood: 10, prbc: 15, ffp: 12, platelets: 8, cryoprecipitate: 4 },
          "A-": { wholeBlood: 3, prbc: 4, ffp: 3, platelets: 2, cryoprecipitate: 1 },
          "B+": { wholeBlood: 15, prbc: 20, ffp: 16, platelets: 10, cryoprecipitate: 5 },
          "B-": { wholeBlood: 2, prbc: 4, ffp: 3, platelets: 2, cryoprecipitate: 1 },
          "AB+": { wholeBlood: 6, prbc: 9, ffp: 7, platelets: 4, cryoprecipitate: 2 },
          "AB-": { wholeBlood: 1, prbc: 2, ffp: 2, platelets: 1, cryoprecipitate: 1 },
          "O+": { wholeBlood: 18, prbc: 26, ffp: 20, platelets: 14, cryoprecipitate: 8 },
          "O-": { wholeBlood: 4, prbc: 6, ffp: 5, platelets: 3, cryoprecipitate: 2 }
        },
        updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString()
      },
      equipment: {
        ventilators: { total: 35, available: 4, status: "Operational" },
        oxygenSupply: { total: 200, available: 165, status: "Operational" },
        ecg: { total: 20, available: 12, status: "Operational" },
        xray: { total: 8, available: 6, status: "Operational" },
        ultrasound: { total: 10, available: 7, status: "Operational" },
        ctScan: { total: 3, available: 2, status: "Operational" },
        mri: { total: 2, available: 1, status: "Operational" },
        dialysis: { total: 25, available: 4, status: "Operational" },
        updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      },
      specialists: {
        cardiologist: { name: "Dr. Waqar Ahmad", onDuty: true, shift: "Morning" },
        neurologist: { name: "Dr. Mehmood Jan", onDuty: true, shift: "Morning" },
        orthopedic: { name: "Dr. Zahid Gul", onDuty: true, shift: "Morning" },
        generalSurgeon: { name: "Dr. Arif Bilal", onDuty: true, shift: "Evening" },
        neurosurgeon: { name: "Dr. Mumtaz Ali", onDuty: false, shift: "On Call" },
        gynecologist: { name: "Dr. Nuzhat Parveen", onDuty: true, shift: "Morning" },
        pediatrician: { name: "Dr. Rizwan Khan", onDuty: true, shift: "Morning" },
        anesthesiologist: { name: "Dr. Jamila Bibi", onDuty: true, shift: "Morning" },
        updatedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString()
      },
      services: {
        emergency: "Available",
        icu: "Available",
        operationTheatre: "Available",
        laboratory: "Available",
        bloodBank: "Available",
        radiology: "Available",
        dialysis: "Available",
        updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      lastOverallUpdate: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  },
  {
    id: "ath-abbottabad",
    name: "Ayub Teaching Hospital (ATH)",
    type: "Tertiary",
    district: "Abbottabad",
    address: "Karakoram Highway, Abbottabad, Khyber Pakhtunkhwa",
    phone: "+92-992-381907",
    emergencyPhone: "+92-992-381910",
    adminName: "Dr. Athar Lodhi (Medical Director)",
    adminEmail: "staff@ath.gov.pk",
    resources: {
      beds: {
        total: 1000,
        available: 88,
        occupied: 912,
        icuTotal: 40,
        icuAvailable: 3,
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString() // > 12 hrs ago (Simulates OUTDATED for demo)
      },
      bloodStock: {
        units: {
          "A+": { wholeBlood: 8, prbc: 12, ffp: 8, platelets: 5, cryoprecipitate: 2 },
          "A-": { wholeBlood: 2, prbc: 3, ffp: 2, platelets: 1, cryoprecipitate: 0 },
          "B+": { wholeBlood: 11, prbc: 15, ffp: 10, platelets: 6, cryoprecipitate: 3 },
          "B-": { wholeBlood: 1, prbc: 2, ffp: 2, platelets: 1, cryoprecipitate: 0 },
          "AB+": { wholeBlood: 4, prbc: 6, ffp: 5, platelets: 3, cryoprecipitate: 1 },
          "AB-": { wholeBlood: 1, prbc: 1, ffp: 1, platelets: 0, cryoprecipitate: 0 },
          "O+": { wholeBlood: 14, prbc: 18, ffp: 14, platelets: 9, cryoprecipitate: 4 },
          "O-": { wholeBlood: 2, prbc: 4, ffp: 3, platelets: 2, cryoprecipitate: 1 }
        },
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
      },
      equipment: {
        ventilators: { total: 28, available: 2, status: "Operational" },
        oxygenSupply: { total: 150, available: 120, status: "Operational" },
        ecg: { total: 15, available: 8, status: "Operational" },
        xray: { total: 6, available: 4, status: "Operational" },
        ultrasound: { total: 8, available: 5, status: "Operational" },
        ctScan: { total: 2, available: 1, status: "Operational" },
        mri: { total: 1, available: 1, status: "Operational" },
        dialysis: { total: 18, available: 2, status: "Operational" },
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
      },
      specialists: {
        cardiologist: { name: "Dr. Sajjad Ahmad", onDuty: true, shift: "Morning" },
        neurologist: { name: "Dr. Mansoor Khan", onDuty: false, shift: "Off Duty" },
        orthopedic: { name: "Dr. Naseer Ahmad", onDuty: true, shift: "Morning" },
        generalSurgeon: { name: "Dr. Fazal Rabi", onDuty: true, shift: "Morning" },
        neurosurgeon: { name: "Dr. Abdul Haseeb", onDuty: false, shift: "On Call" },
        gynecologist: { name: "Dr. Rubina Shaheen", onDuty: true, shift: "Morning" },
        pediatrician: { name: "Dr. Tariq Niazi", onDuty: true, shift: "Morning" },
        anesthesiologist: { name: "Dr. Sohail Khan", onDuty: true, shift: "Morning" },
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
      },
      services: {
        emergency: "Available",
        icu: "Available",
        operationTheatre: "Available",
        laboratory: "Available",
        bloodBank: "Available",
        radiology: "Available",
        dialysis: "Available",
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
      },
      lastOverallUpdate: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: "dhq-mardan",
    name: "DHQ Teaching Hospital Mardan",
    type: "DHQ",
    district: "Mardan",
    address: "Bank Road, Mardan, Khyber Pakhtunkhwa",
    phone: "+92-937-9230214",
    emergencyPhone: "+92-937-9230220",
    adminName: "Dr. Javed Iqbal (Medical Superintendent)",
    adminEmail: "staff@dhqmardan.gov.pk",
    resources: {
      beds: {
        total: 500,
        available: 45,
        occupied: 455,
        icuTotal: 20,
        icuAvailable: 2,
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      bloodStock: {
        units: {
          "A+": { wholeBlood: 6, prbc: 8, ffp: 5, platelets: 4, cryoprecipitate: 2 },
          "A-": { wholeBlood: 1, prbc: 2, ffp: 1, platelets: 1, cryoprecipitate: 0 },
          "B+": { wholeBlood: 8, prbc: 10, ffp: 6, platelets: 5, cryoprecipitate: 2 },
          "B-": { wholeBlood: 1, prbc: 1, ffp: 1, platelets: 0, cryoprecipitate: 0 },
          "AB+": { wholeBlood: 3, prbc: 4, ffp: 3, platelets: 2, cryoprecipitate: 1 },
          "AB-": { wholeBlood: 0, prbc: 1, ffp: 0, platelets: 0, cryoprecipitate: 0 },
          "O+": { wholeBlood: 10, prbc: 12, ffp: 8, platelets: 6, cryoprecipitate: 3 },
          "O-": { wholeBlood: 1, prbc: 2, ffp: 1, platelets: 1, cryoprecipitate: 0 }
        },
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      equipment: {
        ventilators: { total: 15, available: 1, status: "Operational" },
        oxygenSupply: { total: 100, available: 75, status: "Operational" },
        ecg: { total: 10, available: 6, status: "Operational" },
        xray: { total: 4, available: 3, status: "Operational" },
        ultrasound: { total: 5, available: 3, status: "Operational" },
        ctScan: { total: 1, available: 1, status: "Operational" },
        mri: { total: 0, available: 0, status: "Unavailable" },
        dialysis: { total: 12, available: 2, status: "Operational" },
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      specialists: {
        cardiologist: { name: "Dr. Anwar Zeb", onDuty: true, shift: "Morning" },
        neurologist: { name: "Dr. Qazi Irfan", onDuty: false, shift: "On Call" },
        orthopedic: { name: "Dr. Bakhtiar Khan", onDuty: true, shift: "Morning" },
        generalSurgeon: { name: "Dr. Siraj Ahmad", onDuty: true, shift: "Morning" },
        neurosurgeon: { name: "Unavailable", onDuty: false, shift: "None" },
        gynecologist: { name: "Dr. Shazia Durrani", onDuty: true, shift: "Morning" },
        pediatrician: { name: "Dr. Waseem Ullah", onDuty: true, shift: "Morning" },
        anesthesiologist: { name: "Dr. Naveed Alam", onDuty: true, shift: "Morning" },
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      services: {
        emergency: "Available",
        icu: "Available",
        operationTheatre: "Available",
        laboratory: "Available",
        bloodBank: "Available",
        radiology: "Available",
        dialysis: "Available",
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      lastOverallUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  }
];

export const initialReferrals = [
  {
    id: "REF-2026-101",
    patientId: "PAT-KP-9812",
    patientName: "Muhammad Farooq",
    age: 48,
    gender: "Male",
    referringBHU: "BHU Chamkani, Peshawar",
    bhuDoctorName: "Dr. Zeeshan Ali",
    targetHospitalId: "lrh-peshawar",
    symptoms: "Crushing retrosternal chest pain radiating to left jaw, diaphoresis, dyspnea at rest",
    medicalHistory: "Known hypertensive for 6 years, Type 2 diabetes on Metformin, smoker 15 pack-years",
    currentCondition: "BP 165/105 mmHg, Pulse 108 bpm, SpO2 91% on room air. ECG shows ST elevations in leads II, III, aVF.",
    requiredServices: ["Cardiology Specialist", "Cardiac ICU Bed", "ECG", "Emergency Angiography"],
    doctorNotes: "Suspected acute inferior wall STEMI. Sublingual nitrates given. Needs urgent primary PCI and cardiac ICU admission.",
    status: "PENDING",
    declineReason: null,
    reconfirmedResources: [],
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    respondedAt: null
  },
  {
    id: "REF-2026-102",
    patientId: "PAT-KP-9815",
    patientName: "Khadija Bibi",
    age: 32,
    gender: "Female",
    referringBHU: "BHU Badaber, Peshawar",
    bhuDoctorName: "Dr. Ayesha Noor",
    targetHospitalId: "lrh-peshawar",
    symptoms: "Severe antepartum hemorrhage, 34 weeks gestation, acute abdominal rigidity, maternal tachycardia",
    medicalHistory: "G3P2, previous Cesarean delivery, gestational hypertension",
    currentCondition: "BP 85/55 mmHg, Pulse 120 bpm, pallor +++, fetal heart sounds muffled",
    requiredServices: ["Gynecologist / Obstetrician", "Emergency OT", "2 Units O+ PRBC", "Neonatal ICU"],
    doctorNotes: "Impression: Abruptio Placentae with hemorrhagic shock. IV line established, normal saline infusing. Urgent transfer required.",
    status: "ACCEPTED",
    declineReason: null,
    reconfirmedResources: ["Gynecologist on Duty Confirmed", "Emergency OT Prepared", "2 Units O+ Blood Reserved"],
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    respondedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  },
  {
    id: "REF-2026-103",
    patientId: "PAT-KP-9820",
    patientName: "Gulzar Ahmad",
    age: 62,
    gender: "Male",
    referringBHU: "BHU Urmar Payan, Peshawar",
    bhuDoctorName: "Dr. Tariq Zaman",
    targetHospitalId: "lrh-peshawar",
    symptoms: "Sudden onset right-sided hemiplegia, expressive aphasia, facial droop noticed 1.5 hours ago",
    medicalHistory: "Atrial fibrillation, irregular anticoagulation adherence, hypertension",
    currentCondition: "BP 180/110 mmHg, GCS 11/15, right arm 0/5 power, right leg 1/5 power",
    requiredServices: ["Neurologist", "CT Scan (Brain)", "ICU Bed"],
    doctorNotes: "Within intravenous thrombolysis window (< 4.5 hours). Immediate non-contrast CT Brain needed to rule out intracranial hemorrhage.",
    status: "PENDING",
    declineReason: null,
    reconfirmedResources: [],
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    respondedAt: null
  }
];

export const initialEmergencyAlerts = [
  {
    id: "1122-CASE-789",
    rescueCaseId: "RES-KPK-789",
    patientName: "Unidentified Male (Approx 28-30 yrs)",
    emergencyType: "Severe Motorbike vs Truck Collision / Polytrauma",
    targetHospitalId: "lrh-peshawar",
    location: "Grand Trunk Road near Chamkani Flyover",
    requiredFacilities: ["Trauma Operation Theatre", "Ventilator", "Orthopedic Surgeon", "3 Units O- PRBC Blood"],
    etaMinutes: 7,
    ambulanceId: "AMB-1122-PEW-18",
    paramedicName: "Lead EMT Bilal Khan (Station 1122 Peshawar)",
    vitals: "GCS 8/15 (E2V2M4), BP 80/50, open compound femur fracture with massive blood loss, shallow respirations on bag-valve-mask.",
    status: "ALERT_RECEIVED", // Options: ALERT_RECEIVED, ACKNOWLEDGED, FACILITIES_CONFIRMED
    confirmedFacilities: [],
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    acknowledgedAt: null
  },
  {
    id: "1122-CASE-788",
    rescueCaseId: "RES-KPK-788",
    patientName: "Kamran Shah (35 yrs)",
    emergencyType: "Industrial Boiler Explosion / Severe Blast & Inhalation Burn",
    targetHospitalId: "lrh-peshawar",
    location: "Industrial Estate Hayatabad",
    requiredFacilities: ["Burns & Plastic Surgery ICU", "Ventilator Support", "Airway Intubation"],
    etaMinutes: 14,
    ambulanceId: "AMB-1122-PEW-09",
    paramedicName: "EMT Haris Mehmood",
    vitals: "Severe facial burns, singed nasal hairs, stridor, SpO2 86% on high flow O2.",
    status: "ACKNOWLEDGED",
    confirmedFacilities: ["Emergency Airway Team Alerted", "Burn ICU Bed Reserved"],
    createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

export const initialStaffUsers = [
  {
    id: "user-lrh",
    username: "staff@lrh.gov.pk",
    name: "Dr. Abdullah (Emergency Coordinator)",
    role: "HOSPITAL_STAFF",
    hospitalId: "lrh-peshawar",
    password: "password123"
  },
  {
    id: "user-hmc",
    username: "staff@hmc.gov.pk",
    name: "Dr. Usman (Resource Officer)",
    role: "HOSPITAL_STAFF",
    hospitalId: "hmc-peshawar",
    password: "password123"
  },
  {
    id: "user-ath",
    username: "staff@ath.gov.pk",
    name: "Dr. Saima (Referral Desk)",
    role: "HOSPITAL_STAFF",
    hospitalId: "ath-abbottabad",
    password: "password123"
  },
  {
    id: "user-dhq",
    username: "staff@dhqmardan.gov.pk",
    name: "Dr. Irfan (MS Office)",
    role: "HOSPITAL_STAFF",
    hospitalId: "dhq-mardan",
    password: "password123"
  }
];

