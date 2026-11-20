# KP AI Challenge: Intelligent Healthcare Coordination Platform
### AI-Powered Provincial Triage, Emergency Dispatch & Hospital Referral System (KPK, Pakistan)

A unified tripartite digital healthcare ecosystem engineered for Khyber Pakhtunkhwa to eliminate emergency transfer bottlenecks, provide real-time hospital resource transparency, and leverage artificial intelligence for life-saving clinical triage.

---

## 🏛️ System Architecture

```
                      ┌───────────────────────────────────────┐
                      │          Rescue 1122 Portal           │
                      │  (Field Triage, Dispatch & Ambulances)│
                      └──────────────────┬────────────────────┘
                                         │
                                         │ Pre-Arrival Alerts & ETA
                                         │ POST /api/emergency-alerts
                                         ▼
┌────────────────────────┐      ┌───────────────────────────────────────┐
│       BHU Portal       │      │            Hospital Portal            │
│  (Primary Diagnostics, │─────▶│  - Real-Time Bed & Resource Tracking  │
│  Referral Generation)  │      │  - ATLS-Aligned Emergency Trauma Bay  │
└────────────────────────┘      │  - Gemini AI Clinical Referral Triage │
       POST /api/referrals      └───────────────────────────────────────┘
```

---

## 📦 Project Portals & Repository Layout

This monorepo consolidates all three provincial portals under clear, self-contained workspaces:

| Directory | Portal | Primary Stack | Assigned Developer / Lead |
|---|---|---|---|
| [`Hospital_Portal/`](./Hospital_Portal) | **Government Hospital Resource Portal** | Next.js 14, Tailwind CSS, Google Gemini 2.5 Flash, Mongoose / Local DataStore | Muhammad Abdullah |
| [`Rescue_Portal/`](./Rescue_Portal) | **Rescue 1122 Emergency Portal** | NestJS (API), Next.js (Web), Prisma, PostgreSQL / Redis | Hakimullah |
| [`BHU_Portal/`](./BHU_Portal) | **Basic Health Unit (BHU) Portal** | Next.js / API Client | Community / Team |

---

## 🚀 Quick Start Guide

### 1. Hospital Portal
The central hospital facility management, AI triage matching, and Rescue 1122 emergency intake hub.

```bash
# Navigate to the Hospital Portal
cd Hospital_Portal

# Install dependencies
npm install

# Run development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.  
Detailed guide: [Hospital_Portal/DEVELOPER_GUIDE.md](./Hospital_Portal/DEVELOPER_GUIDE.md)

---

### 2. Rescue 1122 Portal
Ambulance CAD (Computer Aided Dispatch), incident intake, and live hospital ETA alert transmission.

```bash
# Navigate to the Rescue Portal
cd Rescue_Portal

# Option A: Run via Docker Compose (Recommended)
docker-compose up --build

# Option B: Run API and Web locally
npm install
npm run start:dev --prefix apps/api
npm run dev --prefix apps/web
```
Detailed guide: [Rescue_Portal/README.md](./Rescue_Portal/README.md) and [Rescue Integration Specs](./Rescue_Portal/Required%20Apis%20for%20Rescue%20from%20Hospital%20portal.md)

---

### 3. BHU Portal
Basic Health Unit patient referral management.

```bash
# Navigate to the BHU Portal
cd BHU_Portal
```
Detailed guide: [BHU_Portal/README.md](./BHU_Portal/README.md)

---

## 🛡️ License & Acknowledgements
Built for the **Khyber Pakhtunkhwa (KPK) AI Challenge** to improve public health access and survival rates across the province.
