# BHU Portal (Basic Health Unit)
### AI-Powered Healthcare Coordination & Intelligent Referral System — Khyber Pakhtunkhwa (KPK)

The **BHU Portal** is the entry-point clinical referral system for Basic Health Units (BHUs) across Khyber Pakhtunkhwa to diagnose, record, and refer patients to appropriate secondary (DHQ/THQ) and tertiary teaching hospitals (LRH, KTH, HMC, ATH).

---

## 🏥 Role in Provincial Architecture

```
┌─────────────────────────────────┐
│           BHU Portal            │
│  - Patient Intake & Vitals      │
│  - Primary Diagnostics          │
│  - AI-Assisted Hospital Search  │
│  - Electronic Referral Slip     │
└────────────────┬────────────────┘
                 │
                 │ HTTP API Integration
                 │ 1. GET  /api/resources/public (Query hospital bed & equipment availability)
                 │ 2. POST /api/referrals        (Send clinical referral with urgency & symptoms)
                 ▼
┌─────────────────────────────────┐
│         Hospital Portal         │
│  - Resource Verification        │
│  - AI Clinical Triage & Scoring │
│  - Accept / Decline / Re-route  │
└─────────────────────────────────┘
```

---

## 📡 Cross-Portal API Contracts with Hospital Portal

When referring a patient to a hospital, the BHU Portal interacts with the Hospital Portal's public integration endpoints:

### 1. Check Hospital Capacity & Bed Availability
* **Method:** `GET`
* **Endpoint:** `http://<hospital-portal-host>:3000/api/resources/public`
* **Response:** Real-time snapshot of available ICU beds, general beds, ventilators, and blood stocks across all KPK hospitals.

### 2. Submit Inbound Patient Referral
* **Method:** `POST`
* **Endpoint:** `http://<hospital-portal-host>:3000/api/referrals`
* **Headers:** `Content-Type: application/json`
* **Payload Structure:**
```json
{
  "patientName": "Khan Wali",
  "age": 45,
  "gender": "Male",
  "referringFacility": "BHU Chamkani, Peshawar",
  "targetHospitalId": "lrh-peshawar",
  "department": "Cardiology",
  "urgency": "EMERGENT",
  "provisionalDiagnosis": "Acute ST-Elevation Myocardial Infarction",
  "vitals": {
    "bp": "85/55",
    "hr": 128,
    "spo2": "91%",
    "temp": "98.6F"
  },
  "requiredFacilities": [
    "Cath Lab / Emergency Angioplasty",
    "Cardiac ICU",
    "Heparin / Antiplatelet Protocol"
  ],
  "clinicalNotes": "Severe retrosternal crushing pain radiating to left arm. Refractory to sublingual nitroglycerin."
}
```

---

## 📁 Recommended Project Structure
```text
BHU_Portal/
├── src/
│   ├── app/            # Next.js App Router (Patient records, referrals, triage)
│   ├── components/     # UI components and forms
│   └── lib/            # API client for Hospital Portal integration
├── package.json
└── README.md
```

