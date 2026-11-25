export const DEFAULT_BHUS = [
  {
    id: "bhu-chamkani",
    name: "BHU Chamkani, Peshawar",
    district: "Peshawar",
    doctorName: "Dr. Tariq Khan (Medical Officer)",
    contact: "091-2601142",
    unionCouncil: "Chamkani UC-12"
  },
  {
    id: "bhu-badaber",
    name: "BHU Badaber, Peshawar",
    district: "Peshawar",
    doctorName: "Dr. Ayesha Bibi (WMO)",
    contact: "091-2309981",
    unionCouncil: "Badaber Rural"
  },
  {
    id: "bhu-nasirbagh",
    name: "BHU Nasir Bagh, Peshawar",
    district: "Peshawar",
    doctorName: "Dr. Bilal Afridi (Medical Officer)",
    contact: "091-5840212",
    unionCouncil: "Nasir Bagh Peri-Urban"
  },
  {
    id: "bhu-takhtbhai",
    name: "BHU Takht Bhai, Mardan",
    district: "Mardan",
    doctorName: "Dr. Imran Khattak (Medical Officer)",
    contact: "093-7821100",
    unionCouncil: "Takht Bhai Central"
  }
];

export const FALLBACK_HOSPITALS = [
  {
    hospitalId: "lrh-peshawar",
    hospitalName: "Lady Reading Hospital (LRH), Peshawar",
    type: "Tertiary Teaching Hospital",
    district: "Peshawar",
    phone: "091-9211430",
    emergencyPhone: "091-9211431",
    address: "Soekarno Rd, Pipal Mandi, Peshawar",
    availableBeds: 18,
    availableIcuBeds: 3,
    ventilatorsAvailable: 4,
    distanceKm: 12,
    etaMinutes: 18,
    specialistsOnDuty: ["Cardiologist (Dr. Farooq Shah)", "Neurosurgeon", "General Surgeon", "Anesthesiologist"],
    capabilities: ["24/7 Primary PCI Cath Lab", "Emergency Trauma Bay", "Cardiac ICU", "Blood Bank O+/A+/B+"],
    matchScore: 98,
    dataFreshness: "VERIFIED_FRESH",
    hoursSinceUpdate: 0.2
  },
  {
    hospitalId: "kth-peshawar",
    hospitalName: "Khyber Teaching Hospital (KTH), Peshawar",
    type: "Tertiary Teaching Hospital",
    district: "Peshawar",
    phone: "091-9224400",
    emergencyPhone: "091-9224401",
    address: "University Road, Peshawar",
    availableBeds: 14,
    availableIcuBeds: 2,
    ventilatorsAvailable: 2,
    distanceKm: 19,
    etaMinutes: 28,
    specialistsOnDuty: ["Pulmonologist", "Trauma Surgeon", "Orthopedic Surgeon", "Pediatrician"],
    capabilities: ["Emergency Respiratory OT", "Medical ICU", "Orthopedic Trauma Bay"],
    matchScore: 86,
    dataFreshness: "VERIFIED_FRESH",
    hoursSinceUpdate: 0.5
  },
  {
    hospitalId: "hmc-peshawar",
    hospitalName: "Hayatabad Medical Complex (HMC), Peshawar",
    type: "Tertiary Teaching Hospital",
    district: "Peshawar",
    phone: "091-9217140",
    emergencyPhone: "091-9217141",
    address: "Phase 4, Hayatabad, Peshawar",
    availableBeds: 24,
    availableIcuBeds: 5,
    ventilatorsAvailable: 5,
    distanceKm: 24,
    etaMinutes: 34,
    specialistsOnDuty: ["Interventional Cardiologist", "Obstetrician & Gynecologist", "Pediatric Intensivist"],
    capabilities: ["Emergency Labor Suite", "Burn Center", "Adult & Neonatal ICU"],
    matchScore: 82,
    dataFreshness: "VERIFIED_FRESH",
    hoursSinceUpdate: 0.3
  },
  {
    hospitalId: "dhq-charsadda",
    hospitalName: "DHQ Hospital Charsadda",
    type: "District Headquarter (DHQ)",
    district: "Charsadda",
    phone: "091-9220011",
    emergencyPhone: "091-9220012",
    address: "Nowshera-Charsadda Rd, Charsadda",
    availableBeds: 9,
    availableIcuBeds: 1,
    ventilatorsAvailable: 1,
    distanceKm: 28,
    etaMinutes: 38,
    specialistsOnDuty: ["General Surgeon", "Medical Specialist"],
    capabilities: ["General Emergency Bay", "Secondary Lab", "Basic Monitored Bed"],
    matchScore: 68,
    dataFreshness: "VERIFIED_FRESH",
    hoursSinceUpdate: 1.1
  }
];

export const INITIAL_REFERRALS = [
  {
    id: "REF-2026-0891",
    patientName: "Khan Wali",
    age: 52,
    gender: "Male",
    contactNumber: "0300-9876543",
    referringBHU: "BHU Chamkani, Peshawar",
    bhuDoctorName: "Dr. Tariq Khan",
    targetHospitalId: "lrh-peshawar",
    targetHospitalName: "Lady Reading Hospital (LRH), Peshawar",
    symptoms: "Severe retrosternal crushing chest pain radiating to left arm & jaw. Diaphoresis, nausea.",
    provisionalDiagnosis: "Acute ST-Elevation Myocardial Infarction (STEMI)",
    urgency: "CRITICAL",
    vitals: {
      bp: "85/55",
      hr: 124,
      spo2: "91%",
      temp: "98.6°F",
      glucose: "145 mg/dL"
    },
    doctorNotes: "Administered Aspirin 300mg + Clopidogrel 300mg oral stat. Requires immediate Primary PCI Cath Lab and CCU bed.",
    rescueRequested: true,
    status: "ACCEPTED",
    declineReason: null,
    hospitalResponseNotes: "Bed Reserved in Cardiac Care Unit (CCU Bed 4). Dr. Farooq Shah (Cardiology) alerted in Cath Lab 1.",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: "REF-2026-0892",
    patientName: "Zarmina Bibi",
    age: 27,
    gender: "Female",
    contactNumber: "0312-5544332",
    referringBHU: "BHU Chamkani, Peshawar",
    bhuDoctorName: "Dr. Tariq Khan",
    targetHospitalId: "hmc-peshawar",
    targetHospitalName: "Hayatabad Medical Complex (HMC), Peshawar",
    symptoms: "Primigravida 38 weeks with severe headache, blurred vision, hyperreflexia, elevated blood pressure.",
    provisionalDiagnosis: "Severe Pre-Eclampsia / Impending Eclampsia",
    urgency: "CRITICAL",
    vitals: {
      bp: "175/110",
      hr: 98,
      spo2: "97%",
      temp: "98.4°F",
      glucose: "110 mg/dL"
    },
    doctorNotes: "IV access established. Administered loading dose Magnesium Sulfate 4g IV. Immediate emergency obstetric management required.",
    rescueRequested: true,
    status: "ACCEPTED",
    declineReason: null,
    hospitalResponseNotes: "Obstetric emergency team standby. Labor OT 2 prepped with neonatal resuscitation team.",
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString()
  },
  {
    id: "REF-2026-0890",
    patientName: "Fazal Rahim",
    age: 64,
    gender: "Male",
    contactNumber: "0345-1234567",
    referringBHU: "BHU Chamkani, Peshawar",
    bhuDoctorName: "Dr. Tariq Khan",
    targetHospitalId: "kth-peshawar",
    targetHospitalName: "Khyber Teaching Hospital (KTH), Peshawar",
    symptoms: "Severe productive cough, purulent sputum, worsening dyspnea, wheezing refractory to salbutamol nebulization.",
    provisionalDiagnosis: "Acute Exacerbation of Chronic Obstructive Pulmonary Disease (AECOPD)",
    urgency: "URGENT",
    vitals: {
      bp: "135/85",
      hr: 108,
      spo2: "88%",
      temp: "100.8°F",
      glucose: "130 mg/dL"
    },
    doctorNotes: "Requires high-flow oxygen, non-invasive ventilation (BiPAP/CPAP) and specialist pulmonology evaluation.",
    rescueRequested: false,
    status: "PENDING",
    declineReason: null,
    hospitalResponseNotes: null,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
];

