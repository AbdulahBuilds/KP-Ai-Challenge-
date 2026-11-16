# Developer Guide: Healthcare Coordination & Hospital Portal
## AI-Powered Healthcare Coordination & Intelligent Referral System (KPK)

Welcome to the **Hospital Portal** developer guide. This document is the single source of truth for developers joining or working on this project. It outlines **what to use**, **how components are structured**, **how to write features**, and **how to keep the UI and backend consistent**.

---

## Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Tech Stack: What Tools to Use](#2-tech-stack-what-tools-to-use)
3. ["What to Use" Decision Matrix](#3-what-to-use-decision-matrix)
4. [Project Directory Structure](#4-project-directory-structure)
5. [UI Component Catalog (With Code Examples)](#5-ui-component-catalog-with-code-examples)
   - [Button](#button)
   - [Card & Card Subcomponents](#card--card-subcomponents)
   - [StatCard](#statcard)
   - [StatusBadge](#statusbadge)
   - [Input & Select](#input--select)
   - [Modal](#modal)
   - [Table](#table)
   - [PageHeader](#pageheader)
6. [Design System & Color Tokens](#6-design-system--color-tokens)
7. [Data Architecture & Dual-Store Engine](#7-data-architecture--dual-store-engine)
8. [API Reference & Cross-Portal Contracts](#8-api-reference--cross-portal-contracts)
9. [AI Clinical Triage Engine (Gemini + Fallback)](#9-ai-clinical-triage-engine-gemini--fallback)
10. [Step-by-Step Developer Recipes](#10-step-by-step-developer-recipes)
11. [Rules, Do's & Don'ts](#11-rules-dos--donts)

---

## 1. System Overview & Architecture

This application is part of a unified tripartite provincial healthcare platform for Khyber Pakhtunkhwa (KPK):

```
┌────────────────────────┐      ┌────────────────────────┐
│   Rescue 1122 Portal   │      │       BHU Portal       │
│  (Emergency Ingestion) │      │ (Doctor Referrals & AI)│
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
            │  POST /api/emergency-alerts   │  POST /api/referrals
            │  GET  /api/resources/public   │  GET  /api/resources/public
            ▼                               ▼
  ┌────────────────────────────────────────────────────────┐
  │                 HOSPITAL PORTAL (THIS REPO)            │
  │  - Real-time Resource Management (Beds, Blood, O2)     │
  │  - AI-Assisted Clinical Triage (Gemini 3.5 Flash)      │
  │  - Inbound BHU Referral Evaluation & Response          │
  │  - Rescue 1122 Emergency Bay Preparation & ACK         │
  └────────────────────────────────────────────────────────┘
```

### Pre-Configured Hospitals
1. **Lady Reading Hospital (LRH), Peshawar** (`lrh-peshawar`) – Tertiary Care / Trauma Level I
2. **Hayatabad Medical Complex (HMC), Peshawar** (`hmc-peshawar`) – Tertiary Care / Oncology & Burns
3. **Ayub Teaching Hospital (ATH), Abbottabad** (`ath-abbottabad`) – Tertiary Care / Hazara Division
4. **DHQ Hospital, Mardan** (`dhq-mardan`) – Secondary District Care

---

## 2. Tech Stack: What Tools to Use

When adding new code or features, **strictly stick to these tools**. Do not introduce competing libraries (e.g., do not install Chakra UI, Ant Design, Bootstrap, Axios, or alternate icon packs).

| Category | Tool | Notes & Policy |
|---|---|---|
| **Framework** | **Next.js 14** (App Router) | Use App Router (`src/app/`). Interactive views use `'use client'`. |
| **Language** | **JavaScript (ES Modules / JSX)** | Uses modern ES2022+ syntax, async/await, destructured props. |
| **Styling** | **Tailwind CSS v3** | Use the project tokens (`bg-brand-primary`, `bg-surface-card`, etc.). |
| **Icons** | **Lucide React** (`lucide-react`) | **Only** use Lucide icons. Do not install Heroicons or FontAwesome. |
| **Database** | **Mongoose (Atlas)** + **Local JSON** | Automatic fallback to `data/db.json` when `MONGODB_URI` is omitted. |
| **AI LLM** | **Google Gemini API** | Live LLM in `src/lib/aiTriage.js` with automatic clinical heuristic backup. |
| **Utilities** | `clsx`, `tailwind-merge` | For safe dynamic Tailwind class concatenation. |
| **HTTP Client** | Native `fetch` | Do not install Axios; use standard browser/Node `fetch()`. |

---

## 3. "What to Use" Decision Matrix

| What you want to build | What to use | File / Location |
|---|---|---|
| Action button or link trigger | `<Button variant="..." size="...">` | `src/components/ui/Button.jsx` |
| Grouping content / panel | `<Card>`, `<CardHeader>`, `<CardContent>` | `src/components/ui/Card.jsx` |
| KPI metric or statistic counter | `<StatCard>` with progress bar | `src/components/ui/StatCard.jsx` |
| Showing status (Accepted, Pending, etc.) | `<StatusBadge status="...">` | `src/components/ui/StatusBadge.jsx` |
| Form text field, number, or email | `<Input label="..." error="...">` | `src/components/ui/Input.jsx` |
| Dropdown select menu | `<Select label="..." options={[...]}>` | `src/components/ui/Input.jsx` |
| Dialog, confirmation, or drawer | `<Modal isOpen={...} onClose={...}>` | `src/components/ui/Modal.jsx` |
| Tabular lists (referrals, alerts, blood) | `<Table>`, `<TableRow>`, `<TableCell>` | `src/components/ui/Table.jsx` |
| Page heading with action buttons | `<PageHeader title="..." actions={...}>` | `src/components/ui/PageHeader.jsx` |
| Navigation & facility switching | `<Sidebar>` and `<TopNav>` | `src/components/layout/` |
| Database query or data access | `dataStore` singleton | `src/lib/dataStore.js` |
| AI patient analysis or triage | `analyzeReferralWithAI()` | `src/lib/aiTriage.js` |
| Color reference | Tailwind tokens (e.g. `text-brand-primary`) | `tailwind.config.js` |

---

## 4. Project Directory Structure

```
├── data/
│   └── db.json               # Auto-generated zero-config local data store
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/triage/    # AI Triage endpoint (Gemini + heuristics)
│   │   │   ├── auth/login/   # Hospital staff authentication
│   │   │   ├── emergency-alerts/ # Rescue 1122 alerts endpoint
│   │   │   ├── hospitals/    # Hospital profile & metadata
│   │   │   ├── referrals/    # BHU referrals endpoint
│   │   │   ├── resources/    # Hospital internal resource updates
│   │   │   │   └── public/   # Cross-portal search for Rescue/BHU
│   │   │   └── seed/         # Data reset / seed route
│   │   ├── globals.css       # Tailwind directives & CSS custom variables
│   │   ├── layout.jsx        # Root HTML layout with Inter font
│   │   └── page.jsx          # Main Hospital Portal client dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx   # Clinical command navigation & hospital switcher
│   │   │   └── TopNav.jsx    # User header, telemetry status, emergency audio
│   │   └── ui/               # Reusable UI component library
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Input.jsx
│   │       ├── Modal.jsx
│   │       ├── PageHeader.jsx
│   │       ├── StatCard.jsx
│   │       ├── StatusBadge.jsx
│   │       └── Table.jsx
│   └── lib/
│       ├── aiTriage.js       # Gemini 3.5 Flash triage & rule engine
│       ├── dataStore.js      # Hybrid MongoDB + Local JSON data store
│       ├── models.js         # Mongoose schemas (Hospital, Referral, Alert, User)
│       └── seedData.js       # Initial seed data for KPK hospitals
├── .env.example              # Template for environment variables
├── .env.local                # Local secrets (GEMINI_API_KEY, MONGODB_URI)
├── DESIGN_SYSTEM.md          # Comprehensive UI/UX design specifications
├── DEVELOPER_GUIDE.md        # This developer guide
├── package.json              # Project dependencies and scripts
└── tailwind.config.js        # Theme tokens, brand colors, and status tokens
```

---

## 5. UI Component Catalog (With Code Examples)

All UI components are located in `src/components/ui/`. **Always import from here** rather than writing raw unstyled HTML elements.

### Button
Located at: `src/components/ui/Button.jsx`

#### Props
- `variant`: `'primary'` (default, Healthcare Blue), `'secondary'` (White + border), `'destructive'` (Emergency Red), `'outline'`, `'ghost'`, `'success'`, `'teal'`.
- `size`: `'xs'`, `'sm'`, `'md'` (default), `'lg'`.
- `isLoading`: `boolean` (displays inline spinning loader and disables button).
- `disabled`: `boolean`.
- `icon`: Lucide icon component (renders leading icon).

#### Code Example
```jsx
import Button from '@/components/ui/Button';
import { Save, AlertTriangle, Check } from 'lucide-react';

// Primary Button
<Button variant="primary" icon={Save} onClick={handleSave}>
  Save Resources
</Button>

// Secondary / Cancel Button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Destructive Action
<Button variant="destructive" icon={AlertTriangle} onClick={handleDecline}>
  Decline Referral
</Button>

// Loading State
<Button variant="primary" isLoading={isSaving}>
  Saving...
</Button>
```

---

### Card & Card Subcomponents
Located at: `src/components/ui/Card.jsx`

Contains `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`.

#### Code Example
```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

<Card>
  <CardHeader className="flex items-center justify-between">
    <div>
      <CardTitle>ICU Bed Allocation</CardTitle>
      <CardDescription>Live monitoring of active critical care units</CardDescription>
    </div>
    <Button size="sm" variant="secondary">Manage</Button>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-typography-secondary">
      Current occupancy is at 88%. 2 beds remaining.
    </p>
  </CardContent>
</Card>
```

---

### StatCard
Located at: `src/components/ui/StatCard.jsx`

Designed specifically for clinical dashboards. Never wraps awkwardly on mobile or small viewports.

#### Props
- `title`: `string` (Card label)
- `value`: `string` | `number` (Big metric)
- `subtitle`: `string` (Supporting explanation)
- `icon`: Lucide icon component
- `variant`: `'default'`, `'success'`, `'warning'`, `'critical'`, `'teal'`
- `progress`: `number` (0 to 100, renders slim progress bar)
- `trend`: `{ value: string, isPositive: boolean }` (Optional trend badge)
- `onClick`: Optional click callback

#### Code Example
```jsx
import StatCard from '@/components/ui/StatCard';
import { Bed, Droplets, Siren, Clock } from 'lucide-react';

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    title="Available Beds"
    value={142}
    subtitle="Total capacity: 1,200"
    icon={Bed}
    variant="success"
    progress={78}
  />
  <StatCard
    title="Emergency Alerts"
    value={2}
    subtitle="Inbound Rescue 1122 units"
    icon={Siren}
    variant="critical"
    trend={{ value: "+2 new", isPositive: false }}
  />
</div>
```

---

### StatusBadge
Located at: `src/components/ui/StatusBadge.jsx`

Strictly adheres to **DESIGN_SYSTEM.md Section 5**:
> **Rule**: Status badges must always display explicit text and a colored indicator dot. Never rely on color alone.

#### Supported Status Values
- **Green / Accepted**: `'ACCEPTED'`, `'AVAILABLE'`, `'OPERATIONAL'`, `'READY'`, `'CONFIRMED'`, `'FACILITIES_CONFIRMED'`
- **Amber / Pending**: `'PENDING'`, `'IN_PROGRESS'`, `'MAINTENANCE'`, `'HIGH'`, `'URGENT'`, `'PREPARING'`
- **Red / Critical**: `'DECLINED'`, `'CRITICAL'`, `'EMERGENCY'`, `'FULL'`, `'OFFLINE'`
- **Blue / Info**: `'ROUTINE'`, `'MODERATE'`, `'INFO'`, `'SCHEDULED'`
- **Slate / Outdated**: `'UNAVAILABLE'`, `'OUTDATED'`, `'OFF DUTY'`

#### Code Example
```jsx
import StatusBadge from '@/components/ui/StatusBadge';

<StatusBadge status="ACCEPTED" />
<StatusBadge status="PENDING" />
<StatusBadge status="CRITICAL" label="Critical - Immediate OT" />
<StatusBadge status="AVAILABLE" size="sm" />
```

---

### Input & Select
Located at: `src/components/ui/Input.jsx`

Form controls with standard 8px border radius, clear typography, validation errors, and helper text.

#### Code Example
```jsx
import { Input, Select } from '@/components/ui/Input';

// Text or Number Input
<Input
  label="Available ICU Beds"
  type="number"
  value={icuCount}
  onChange={(e) => setIcuCount(e.target.value)}
  required
  helperText="Count only beds with functional ventilators attached"
  error={icuCount < 0 ? "Beds cannot be negative" : null}
/>

// Select Dropdown
<Select
  label="Triage Status Filter"
  value={selectedFilter}
  onChange={(e) => setSelectedFilter(e.target.value)}
  options={[
    { value: 'ALL', label: 'All Referrals' },
    { value: 'PENDING', label: 'Pending Evaluation' },
    { value: 'ACCEPTED', label: 'Accepted Cases' },
    { value: 'DECLINED', label: 'Declined / Re-routed' }
  ]}
/>
```

---

### Modal
Located at: `src/components/ui/Modal.jsx`

Accessible dialog that locks body scroll, handles `Escape` key automatically, and supports backdrop clicking.

#### Props
- `isOpen`: `boolean`
- `onClose`: `() => void`
- `title`: `string`
- `description`: `string`
- `maxWidth`: `'max-w-md'`, `'max-w-lg'`, `'max-w-xl'`, `'max-w-2xl'` (default), `'max-w-4xl'`
- `children`: Modal content (typically form fields and action buttons)

#### Code Example
```jsx
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Accept Inbound Referral"
  description="Confirm resource readiness before acknowledging the referring BHU."
  maxWidth="max-w-xl"
>
  <div className="space-y-4">
    <p className="text-sm text-typography-secondary">
      Patient: Muhammad Tariq (48M) - Severe STEMI
    </p>
    <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
      <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
        Cancel
      </Button>
      <Button variant="success" onClick={handleConfirmAccept}>
        Confirm & Reserve Bed
      </Button>
    </div>
  </div>
</Modal>
```

---

### Table
Located at: `src/components/ui/Table.jsx`

Provides `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>`.

#### Code Example
```jsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';

<Table>
  <TableHeader>
    <TableRow hover={false}>
      <TableHead>Case ID</TableHead>
      <TableHead>Patient</TableHead>
      <TableHead>Referring BHU</TableHead>
      <TableHead>Status</TableHead>
      <TableHead align="right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {referrals.map((row) => (
      <TableRow key={row.id}>
        <TableCell className="font-mono text-xs">{row.id}</TableCell>
        <TableCell className="font-medium text-typography-primary">{row.patientName}</TableCell>
        <TableCell>{row.referringBHU}</TableCell>
        <TableCell><StatusBadge status={row.status} /></TableCell>
        <TableCell align="right">
          <Button size="xs" variant="secondary" onClick={() => handleView(row)}>
            Review
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### PageHeader
Located at: `src/components/ui/PageHeader.jsx`

#### Code Example
```jsx
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';

<PageHeader
  title="Resource Management"
  subtitle="Update live inventory for beds, blood units, critical equipment, and on-duty specialists."
  actions={
    <Button variant="secondary" icon={RefreshCw} onClick={handleSync}>
      Sync Telemetry
    </Button>
  }
/>
```

---

## 6. Design System & Color Tokens

Never hardcode arbitrary hex values into components. Always use the semantic Tailwind utility classes defined in `tailwind.config.js`:

### Brand & Surface Tokens
| Meaning | HEX | Tailwind Utility | When to use |
|---|---|---|---|
| **Healthcare Blue** | `#164E78` | `bg-brand-primary`, `text-brand-primary` | Hospital portal accent, primary buttons, active tabs |
| **Healthcare Teal** | `#0D9488` | `bg-brand-teal`, `text-brand-teal` | BHU accent, secondary actions, telemetry indicators |
| **Emergency Red** | `#DC2626` | `bg-status-declined`, `text-status-declined` | Rescue 1122 accent, emergency alerts, critical alerts |
| **Main Surface** | `#F8FAFC` | `bg-surface-main` | Page background |
| **Card Surface** | `#FFFFFF` | `bg-surface-card` or `bg-white` | All content cards, modals, table backgrounds |
| **Subtle Border** | `#E2E8F0` | `border-surface-border` | All card borders, table dividers, input borders |
| **Primary Text** | `#0F172A` | `text-typography-primary` | Headings, card titles, table content, values |
| **Secondary Text**| `#64748B` | `text-typography-secondary`| Labels, subtitles, timestamps, descriptions |

---

## 7. Data Architecture & Dual-Store Engine

All data operations are centralized in `src/lib/dataStore.js`.

### How it works
```
                  ┌──────────────────────┐
                  │ API Route / Component│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   dataStore.js       │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            │ process.env.MONGODB_URI set?    │
            ▼ YES                             ▼ NO
   ┌──────────────────┐              ┌──────────────────┐
   │  MongoDB Atlas   │              │  data/db.json    │
   │ (Mongoose Models)│              │  (Local File)    │
   └──────────────────┘              └──────────────────┘
```

1. If `MONGODB_URI` is provided in `.env.local` or Vercel environment variables, the system connects to MongoDB Atlas using the cached Mongoose connection pattern.
2. If `MONGODB_URI` is not provided (e.g. running locally without a database), it automatically creates and maintains `data/db.json` from `src/lib/seedData.js`.
3. **Developers do not have to write separate code for MongoDB vs Local File.** Just call `dataStore` methods:

```js
import { dataStore } from '@/lib/dataStore';

// Examples of available methods:
const hospitals = await dataStore.getHospitals();
const hospital = await dataStore.getHospitalById('lrh-peshawar');
await dataStore.updateHospitalResources('lrh-peshawar', updatedResources);

const referrals = await dataStore.getReferrals('lrh-peshawar');
await dataStore.updateReferralStatus('REF-2026-001', 'ACCEPTED', { responseNotes: 'Bed reserved' });

const alerts = await dataStore.getEmergencyAlerts('lrh-peshawar');
await dataStore.updateEmergencyAlertStatus('1122-CASE-789', 'ACKNOWLEDGED', { assignedBay: 'Bay 1' });
```

---

## 8. API Reference & Cross-Portal Contracts

All API endpoints are located in `src/app/api/`.

### 1. Authentication
- `POST /api/auth/login`
  - **Body**: `{ "username": "staff@lrh.gov.pk", "password": "password123" }`
  - **Response**: `{ success: true, user: { ... }, hospital: { ... } }`

### 2. Hospital Resources
- `GET /api/resources?hospitalId=lrh-peshawar`
  - Returns current resource snapshot.
- `PUT /api/resources`
  - **Body**: `{ "hospitalId": "lrh-peshawar", "resources": { ... } }`
  - Updates beds, blood stock, equipment, specialists, and services.
- `GET /api/resources/public?service=Cardiology&district=Peshawar`
  - **Used by BHU and Rescue 1122** to search for available hospitals matching specific clinical requirements.

### 3. Inbound BHU Referrals
- `GET /api/referrals?hospitalId=lrh-peshawar&status=PENDING`
  - Lists referrals for the hospital.
- `POST /api/referrals`
  - **Used by BHU Portal** to send a new referral.
- `PATCH /api/referrals/[id]`
  - **Used by Hospital Staff** to accept or decline:
  - **Body**:
    ```json
    {
      "status": "ACCEPTED",
      "confirmedFacilities": ["Cardiology CCU", "Ventilator 4"],
      "responseNotes": "Patient bed reserved in CCU. Cardiology team notified."
    }
    ```

### 4. Rescue 1122 Emergency Alerts
- `GET /api/emergency-alerts?hospitalId=lrh-peshawar`
- `POST /api/emergency-alerts`
  - **Used by Rescue 1122** when dispatching a critical trauma case.
- `PATCH /api/emergency-alerts/[id]`
  - **Body**:
    ```json
    {
      "status": "ACKNOWLEDGED",
      "assignedBay": "Trauma Bay 1 (Resuscitation)",
      "confirmedFacilities": ["Ventilator Ready", "Blood Units Reserved"]
    }
    ```

---

## 9. AI Clinical Triage Engine (Gemini + Fallback)

Located in `src/lib/aiTriage.js` and accessed via `POST /api/ai/triage`.

### How it works
1. When a referral or emergency alert is inspected, the system gathers the patient's symptoms, vitals, and medical history.
2. It pairs this patient data with the hospital's **live resource inventory** (available ICU beds, specialists on duty, blood stock).
3. If `GEMINI_API_KEY` is configured, it calls the Google Gemini API (`gemini-3.5-flash-lite` / `gemini-1.5-flash`) with structured JSON output enforcement.
4. If the key is missing or the network fails, it seamlessly falls back to a **deterministic clinical rule heuristic engine**.
5. Returns a structured clinical verdict:
   - `urgencyLevel`: `'CRITICAL' | 'HIGH' | 'MODERATE' | 'ROUTINE'`
   - `clinicalImpression`: Clinical summary
   - `resourceMatchStatus`: `'MATCHED' | 'DEFICIT_WARNING'`
   - `recommendedAction`: `'ACCEPT' | 'DECLINE_REDIRECT'`
   - `immediatePreparation`: Steps the trauma team must take before patient arrival

---

## 10. Step-by-Step Developer Recipes

### Recipe A: Adding a New Tab or View to the Portal
1. Open `src/components/layout/Sidebar.jsx` and add the item to `navSections`:
   ```jsx
   { id: 'telemetry', label: 'IoT Telemetry', icon: Cpu }
   ```
2. Open `src/app/page.jsx`:
   - Add `'telemetry'` to the `activeTab` states.
   - Add the rendering block inside the main content area:
   ```jsx
   {activeTab === 'telemetry' && (
     <div className="space-y-6">
       <PageHeader title="IoT Telemetry" subtitle="Oxygen cylinder sensors & real-time bed weight sensors" />
       {/* Use UI components here */}
     </div>
   )}
   ```

### Recipe B: Creating a New API Endpoint
1. Create a folder in `src/app/api/<endpoint-name>/route.js`.
2. Add route handlers using standard Next.js 14 conventions:
   ```javascript
   import { NextResponse } from 'next/server';
   import { dataStore } from '@/lib/dataStore';

   export const dynamic = 'force-dynamic';

   export async function GET(request) {
     const data = await dataStore.getHospitals();
     return NextResponse.json({ success: true, data });
   }
   ```

### Recipe C: Resetting or Seeding the Database
Simply make a GET or POST request to:
```bash
curl http://localhost:3000/api/seed
```
This restores all initial KPK hospitals, referrals, alerts, and user accounts.

---

## 11. Rules, Do's & Don'ts

| DO | DON'T |
|---|---|
| Use `<Button>`, `<Card>`, `<StatCard>`, `<StatusBadge>` from `src/components/ui/` | Write raw unstyled `<button>` or custom CSS boxes |
| Use Tailwind design tokens (`bg-brand-primary`, `text-typography-primary`) | Hardcode arbitrary hex colors (`#164e78` inline in JSX) |
| Display status text inside `<StatusBadge>` alongside the color dot | Use only a colored dot or color background without text |
| Use `lucide-react` icons consistently | Install or mix other icon libraries |
| Use `dataStore` methods for database operations | Access `data/db.json` directly or write separate queries |
| Keep the light, high-readability healthcare SaaS aesthetic | Add dark mode overrides, extreme glassmorphism, or heavy gradients |
| Validate request payloads in API routes | Assume request bodies contain expected types |

---

## Quick Reference Contacts & Credentials
For testing in development:

| Hospital | Username | Password | Role |
|---|---|---|---|
| **Lady Reading Hospital (LRH)** | `staff@lrh.gov.pk` | `password123` | Emergency Coordinator |
| **Hayatabad Medical Complex (HMC)** | `staff@hmc.gov.pk` | `password123` | Resource Officer |
| **Ayub Teaching Hospital (ATH)** | `staff@ath.gov.pk` | `password123` | Referral Desk |
| **DHQ Hospital Mardan** | `staff@dhqmardan.gov.pk` | `password123` | MS Office |

