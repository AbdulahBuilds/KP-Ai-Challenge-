# KPK Hospital Portal
### AI-Powered Healthcare Coordination & Intelligent Referral System

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18.3-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Mongoose / MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas%20%2F%20Local-47A248?style=flat&logo=mongodb)](https://mongodb.com/)

---

## 🏥 Overview

The **Government Hospital Portal** is the centralized facility resource management, clinical triage, and referral coordination hub for tertiary and secondary hospitals in Khyber Pakhtunkhwa (KPK), Pakistan.

It is part of a 3-portal coordinated provincial healthcare platform:
1. **Rescue 1122 Portal** – Emergency field triage, ambulance dispatch, and hospital intake alerts.
2. **BHU Portal** – Basic Health Unit patient records, diagnostics, and AI-assisted hospital referrals.
3. **Hospital Portal (This Project)** – Real-time bed & resource tracking, AI clinical triage matching, referral acceptance/re-routing, and Rescue 1122 trauma bay preparation.

---

## 🚀 Quick Start (60 Seconds)

### 1. Prerequisites
- **Node.js** v18.17.0+ or v20+
- **npm** or **pnpm** / **yarn**

### 2. Clone & Install
```bash
git clone <repository-url>
cd "AI innovation"
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(Optional)* Add your `GEMINI_API_KEY` for live Google Gemini 3.5 Flash clinical triage. If omitted, the portal automatically uses the built-in clinical rule heuristic engine.

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. The portal automatically logs in with the primary demo account (**Lady Reading Hospital Peshawar**).

---

## 🔑 Demo Staff Login Accounts

The system includes pre-seeded accounts for testing different hospitals in KPK:

| Hospital | Email / Username | Password | Role |
|---|---|---|---|
| **Lady Reading Hospital (LRH)** | `staff@lrh.gov.pk` | `password123` | Emergency Coordinator (Peshawar) |
| **Hayatabad Medical Complex (HMC)** | `staff@hmc.gov.pk` | `password123` | Resource Officer (Peshawar) |
| **Ayub Teaching Hospital (ATH)** | `staff@ath.gov.pk` | `password123` | Referral Desk (Abbottabad) |
| **DHQ Hospital Mardan** | `staff@dhqmardan.gov.pk` | `password123` | MS Office (Mardan) |

*To reset or re-seed data at any time, visit `http://localhost:3000/api/seed` in your browser.*

---

## 📚 Developer Guides & Documentation

To maintain strict code quality, design consistency, and reliable cross-portal communication, please consult the dedicated documentation:

- 📖 **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**: **The primary manual for all developers.**
  - "What to Use" Decision Matrix.
  - Complete UI Component Catalog with copy-paste code snippets (`Button`, `Card`, `StatCard`, `StatusBadge`, `Input`, `Select`, `Modal`, `Table`, `PageHeader`).
  - Architecture breakdown of the hybrid DataStore (MongoDB Atlas + Zero-Config Local File).
  - API endpoint contracts and payloads for BHU and Rescue 1122 integrations.
  - Step-by-step recipes for creating new features, tabs, and endpoints.
- 🎨 **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**: The official UI/UX specifications, color tokens, typography scales, and visual rules for the KPK Healthcare Platform.
- 📋 **[abdullahhospitalportal.md](./abdullahhospitalportal.md)**: Product feature requirements and domain context.

---

## 🛠 Tech Stack Summary

- **Frontend & Routing**: [Next.js 14](https://nextjs.org/) (App Router, React 18)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with healthcare design tokens
- **Icons**: [Lucide React](https://lucide.react) (Strict single icon source)
- **Database**: Dual-mode [Mongoose](https://mongoosejs.com/) (MongoDB Atlas) with automatic fallback to local JSON (`data/db.json`)
- **AI Triage**: Google Gemini API (`gemini-3.5-flash-lite` / `gemini-1.5-flash`) + Clinical Rule Heuristic Engine

---

## 📁 Key Directories

```
src/
├── app/                  # Next.js App Router (pages & API routes)
│   ├── api/              # REST API endpoints (referrals, emergency, resources, ai)
│   ├── layout.jsx        # Root HTML wrapper
│   └── page.jsx          # Hospital Portal main command dashboard
├── components/
│   ├── layout/           # Sidebar.jsx, TopNav.jsx
│   └── ui/               # Reusable UI component library (Button, Card, Table, etc.)
└── lib/
    ├── aiTriage.js       # Gemini AI Triage + fallback heuristic logic
    ├── dataStore.js      # Hybrid MongoDB / local JSON data access layer
    ├── models.js         # Mongoose schemas
    └── seedData.js       # Pre-seeded KPK hospitals, referrals, and staff users
```

---

## 🧪 Testing Cross-Portal Integration

External portals (Rescue 1122 & BHU) query hospital resource availability using the public API:

```bash
# Query available hospitals with Cardiology and O- blood in Peshawar
curl "http://localhost:3000/api/resources/public?service=Cardiology&blood=O-&district=Peshawar"
```

Referrals from BHUs are received at `POST /api/referrals` and Rescue 1122 trauma dispatches are posted to `POST /api/emergency-alerts`. Details on testing these payloads can be found in **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**.

