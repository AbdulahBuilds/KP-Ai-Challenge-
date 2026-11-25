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

## ⚡ Fast 2-Tab User Experience

Designed specifically for rural BHU doctors to complete referrals in under 45 seconds:

- **Tab 1: New Patient Referral & AI Matcher (`/`)**
  - Rapid clinical vitals strip (BP, Pulse, SpO2, Temp).
  - 1-click clinical presets for common emergencies (Chest Pain / STEMI, Obstructed Labor, Head Trauma, Asthma, Sepsis).
  - Live AI Hospital Matcher: Auto-evaluates patient diagnosis against real-time ICU beds, operational ventilators, and on-duty specialists across KPK hospitals.
  - One-click submission to hospital triage bay with optional Rescue 1122 ambulance dispatch.

- **Tab 2: Sent Referrals & Slips**
  - Real-time status tracking (`Accepted`, `Pending`, `Declined`).
  - Formal Printable **Electronic Referral Slip (Emergency Parchi)** formatted with KPK Health Department insignia, diagnostic summary, and scannable QR verification code.
  - 1-click Re-route button if receiving hospital is full.

---

## 🚀 Running the BHU Portal

### From Root Monorepo:
```bash
# Run BHU Portal on Port 3002
npm run dev:bhu

# Or run all 3 portals together
npm run dev:all
```

### Directly from BHU_Portal folder:
```bash
cd BHU_Portal
npm run dev
```

Open **[http://localhost:3002](http://localhost:3002)** in your browser.
