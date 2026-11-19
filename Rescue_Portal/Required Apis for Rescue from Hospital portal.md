# Required APIs for Rescue Portal from Hospital Portal

This document lists the **HTTP APIs** that the **Hospital Portal** must provide so the **Rescue Portal** can use real hospital data for:

- Nearby hospital search
- AI/rule-based hospital recommendations (decision support only)
- Hospital comparison (facilities, beds, resources, availability)
- Distance/ETA context
- Destination hospital selection workflow
- Pre-arrival alert sending and status tracking

> **Important:** Rescue Portal integrates via HTTP APIs (not direct database access). Sharing a MongoDB/Atlas key is **not sufficient** and is not the integration method used by this project. Please expose the APIs below with the specified contract.

---

## 1. Rescue Portal Configuration (Hospital side should know)

Rescue Portal will be configured as:

| Environment variable | Value / purpose |
|---|---|
| `HOSPITAL_ADAPTER` | `http` (required for live Hospital Portal data; `mock` uses simulated demo data only) |
| `HOSPITAL_API_BASE_URL` | Base URL of Hospital Portal integration API (e.g. `https://hospital.example.com`) |
| `HOSPITAL_API_KEY` | API key/token if required (sent by Rescue as `X-API-Key`) |
| `HOSPITAL_API_TIMEOUT_MS` | Request timeout in ms (default `8000`) |
| `HOSPITAL_DATA_MAX_AGE_SECONDS` | Freshness window for capability data (default `300`) |

All endpoints below are relative to `HOSPITAL_API_BASE_URL`.

---

## 2. Common Conventions

- **Protocol:** HTTPS recommended
- **Content-Type:** `application/json`
- **Accept:** `application/json`
- **Authentication:** If configured, Rescue sends header `X-API-Key: <HOSPITAL_API_KEY>`
- **Timestamps:** ISO 8601 date-time strings (UTC recommended), e.g. `2026-11-19T10:00:00Z`
- **IDs:** `externalId`/`id`/`externalRequestId` must be **stable unique identifiers**
- **Responses:** Endpoints may return either a plain object/array or wrapped as `{ "data": ... }` where noted (Rescue supports both forms as specified)
- **Errors:** Return appropriate HTTP status codes (e.g. `404` for unknown hospital/request, `4xx/5xx` for failures). Rescue treats upstream failures/timeouts as integration unavailable and will not fabricate data.

---

## 3. Required APIs

### 3.1 Search Nearby Hospitals (**Required**)

Used to find suitable hospitals near the patient’s current location.

- **Method:** `GET`
- **Path:** `/api/hospitals/search`
- **Query parameters:**

| Param | Type | Required | Description |
|---|---:|:---:|---|
| `latitude` | number | Yes | Patient/current search latitude |
| `longitude` | number | Yes | Patient/current search longitude |
| `radiusKm` | number | No | Search radius in kilometers |
| `limit` | number | No | Max number of hospitals to return |

- **Response:** JSON array `[...]` **or** `{ "data": [...] }`
- **Each hospital object:**

| Field | Type | Required | Description |
|---|---|:---:|---|
| `id` or `externalId` | string | **Yes** | Stable unique hospital ID (used in all subsequent calls, selection, and alerts) |
| `name` | string | Recommended | Hospital name |
| `address` | string \| null | No | Address/landmark |
| `city` | string \| null | No | City |
| `latitude` | number | **Yes** | Hospital latitude |
| `longitude` | number | **Yes** | Hospital longitude |
| `phone` | string \| null | No | Contact phone |
| `services` | string[] | No | High-level services (informational) |

**Example response:**
```json
{
  "data": [
    {
      "externalId": "hosp-001",
      "name": "City General Hospital",
      "address": "Main Road",
      "city": "Lahore",
      "latitude": 31.5204,
      "longitude": 74.3587,
      "phone": "+92-000-0000000",
      "services": ["Emergency", "Surgery", "ICU"]
    }
  ]
}
```

---

### 3.2 Get Hospital Capabilities / Availability (**Required**)

Used for recommendations and comparison (facilities, beds, resources, specialists, equipment) and freshness/eligibility evaluation. Rescue calls this per hospital returned by search.

- **Method:** `GET`
- **Path:** `/api/hospitals/{hospitalId}/capabilities`
  - `{hospitalId}` = `externalId` (or `id`) returned by search
- **Response:** capability object **or** `{ "data": { ... } }`

**Fields:**

| Field | Type | Required | Description |
|---|---|:---:|---|
| `hospitalExternalId` or `hospitalId` | string | No | Hospital identifier |
| `hospitalName` | string | No | Hospital name |
| `capabilities` | array | **Yes** | Current capability/availability entries (see below) |
| `observedAt` | ISO datetime | **Strongly required** | When availability was observed (used for freshness) |
| `expiresAt` | ISO datetime | Recommended | When this availability data expires |
| `snapshotId` | string | No | Source snapshot/response identifier |

**Capability entry:**

| Field | Type | Required | Description |
|---|---|:---:|---|
| `code` | string | **Yes** | Capability code (must match Rescue codes in Section 5) |
| `status` | string | **Yes** | `AVAILABLE` \| `UNAVAILABLE` \| `UNKNOWN` |
| `quantity` | number \| null | No | Available quantity/count (e.g. beds, ventilators) — useful for comparison |
| `note` | string \| null | No | Optional note |

**Example response:**
```json
{
  "hospitalExternalId": "hosp-001",
  "hospitalName": "City General Hospital",
  "snapshotId": "snap-20261119-1000",
  "observedAt": "2026-11-19T10:00:00Z",
  "expiresAt": "2026-11-19T10:10:00Z",
  "capabilities": [
    { "code": "SERVICE_EMERGENCY_DEPARTMENT", "status": "AVAILABLE" },
    { "code": "BED_EMERGENCY", "status": "AVAILABLE", "quantity": 5 },
    { "code": "BED_ICU", "status": "AVAILABLE", "quantity": 2 },
    { "code": "SURGICAL_OPERATING_ROOM", "status": "AVAILABLE", "quantity": 1 },
    { "code": "SPECIALIST_GENERAL_SURGERY", "status": "AVAILABLE" },
    { "code": "SPECIALIST_ANESTHESIOLOGY", "status": "AVAILABLE" },
    { "code": "EQUIP_VENTILATOR", "status": "AVAILABLE", "quantity": 3 },
    { "code": "EQUIP_CT_SCANNER", "status": "UNAVAILABLE" },
    { "code": "BLOOD_O_NEG", "status": "UNKNOWN" }
  ]
}
```

**Critical for recommendations (how Rescue uses this):**
- A hospital is **ELIGIBLE** only when **every required capability is explicitly `AVAILABLE`** and the data is **FRESH** (within `expiresAt` / freshness window).
- `UNKNOWN`, **stale**, or **expired** data **cannot** be treated as available/eligible.
- A required capability explicitly `UNAVAILABLE` makes the hospital **ineligible** for that requirement.
- Provide accurate `observedAt`/`expiresAt` and correct capability `code` values; otherwise recommendations will be unconfirmed/missing.

---

### 3.3 Create Emergency Request / Pre-arrival Alert (**Required**)

Used when Rescue Admin sends a pre-arrival alert to the selected destination hospital.

- **Method:** `POST`
- **Path:** `/api/emergency-requests`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `Idempotency-Key: <string>` (**must be honored** to prevent duplicate alerts on retries)
  - `X-Correlation-Id: <uuid>`
  - `X-API-Key: <key>` (if configured)

**Request body:**
```json
{
  "requestId": "uuid",
  "correlationId": "uuid",
  "idempotencyKey": "string",
  "incidentId": "string",
  "caseNumber": "string",
  "hospitalExternalId": "hosp-001",
  "severity": "CRITICAL",
  "emergencyType": "TRAUMA",
  "location": {
    "latitude": 31.52,
    "longitude": 74.35,
    "address": "string or null"
  },
  "patient": {
    "age": 30,
    "gender": "MALE",
    "unidentified": false,
    "suspectedCondition": "string or null",
    "symptoms": "string or null",
    "injuries": "string or null",
    "allergies": "string or null",
    "medicalHistory": "string or null"
  },
  "requiredCapabilities": ["BED_ICU", "SURGICAL_OPERATING_ROOM"],
  "etaMinutes": 12,
  "requestedAt": "2026-11-19T10:05:00Z"
}
```

**Field notes:**
- `severity`: `CRITICAL` | `HIGH` | `MODERATE` | `LOW` | `UNKNOWN`
- `emergencyType`: `MEDICAL` | `TRAUMA` | `CARDIAC` | `BURN` | `OBSTETRIC` | `PEDIATRIC` | `OTHER`
- `patient.gender` (if present): `MALE` | `FEMALE` | `OTHER` | `UNKNOWN` (or null)
- `hospitalExternalId`: selected destination hospital ID (from search/capabilities)
- `etaMinutes`: may be null/omitted
- `requestedAt`: ISO datetime

**Response (must include request identifier and status):**
```json
{
  "externalRequestId": "req-789",
  "status": "PENDING",
  "message": "Request received",
  "respondedAt": null
}
```
- `externalRequestId` (or `requestId`) is **required** so Rescue can poll status.
- `status`: see Section 4.
- `message`: string | null (optional)
- `respondedAt`: ISO datetime | null (when hospital responded/decided, if applicable)

---

### 3.4 Get Emergency Request Status (**Required**)

Used by Rescue to poll/sync the actual alert/response status (no fabricated delivery or acceptance).

- **Method:** `GET`
- **Path:** `/api/emergency-requests/{externalRequestId}`
- **Response:** same shape as create response, reflecting current status

**Example:**
```json
{
  "externalRequestId": "req-789",
  "status": "ACCEPTED",
  "message": "Emergency team ready",
  "respondedAt": "2026-11-19T10:07:30Z"
}
```

---

### 3.5 Send ETA Update (**Recommended / Supported**)

Used to update estimated time of arrival for an existing emergency request.

- **Method:** `POST`
- **Path:** `/api/emergency-requests/{externalRequestId}/eta`
- **Body:**
```json
{ "etaMinutes": 8 }
```
- **Response:** status/result object (same shape as above)

---

## 4. Emergency Request Status Values

Hospital Portal should return one of the following `status` values:

| Status | Meaning |
|---|---|
| `PENDING` | Request received/awaiting processing |
| `ACKNOWLEDGED` | Hospital acknowledged/seen the request (or needs more info handling as applicable) |
| `ACCEPTED` | Hospital accepted/prepared for the patient |
| `REJECTED` | Hospital rejected/declined the request |
| `MORE_INFO` | Hospital requested additional information |
| `TIMED_OUT` | No response within required time |
| `FAILED` | Delivery/processing failed |

**Rescue display behavior:** Rescue maps/shows statuses factually as `Pending`, `Sent`, `Acknowledged`, `Accepted`, `Rejected`, `Failed` based on actual recorded/confirmed states. It **never fabricates** delivery or acceptance without confirmation.

---

## 5. Capability Codes (Must Align)

Rescue Portal uses the following capability `code` values (catalog version `2026-11-13.1`). Hospital Portal must return/use these codes in capabilities so Rescue can correctly evaluate and compare suitability.

### Specialists
- `SPECIALIST_EMERGENCY_MEDICINE` — Emergency medicine specialist
- `SPECIALIST_GENERAL_SURGERY` — General surgeon
- `SPECIALIST_CARDIOLOGY` — Cardiologist
- `SPECIALIST_NEUROSURGERY` — Neurosurgeon
- `SPECIALIST_ORTHOPEDICS` — Orthopaedic surgeon
- `SPECIALIST_PEDIATRICS` — Paediatrician
- `SPECIALIST_OBSTETRICS` — Obstetrician / gynaecologist
- `SPECIALIST_ANESTHESIOLOGY` — Anaesthesiologist

### Equipment
- `EQUIP_VENTILATOR` — Mechanical ventilator
- `EQUIP_CT_SCANNER` — CT scanner
- `EQUIP_MRI` — MRI scanner
- `EQUIP_XRAY` — X-ray
- `EQUIP_DEFIBRILLATOR` — Defibrillator
- `EQUIP_DIALYSIS` — Dialysis machine
- `EQUIP_BLOOD_BANK` — Blood bank

### Surgical
- `SURGICAL_OPERATING_ROOM` — Operating room available
- `SURGICAL_MAJOR_EQUIPMENT` — Major surgical equipment

### Beds / Services
- `BED_EMERGENCY` — Emergency bed
- `BED_ICU` — ICU bed
- `SERVICE_EMERGENCY_DEPARTMENT` — Emergency department (24/7)
- `SERVICE_TRAUMA_CENTER` — Trauma centre
- `SERVICE_BURNS_UNIT` — Burns unit
- `SERVICE_NEONATAL_ICU` — Neonatal ICU

### Blood
- `BLOOD_O_NEG` — O-negative blood
- `BLOOD_O_POS` — O-positive blood
- `BLOOD_A_POS` — A-positive blood
- `BLOOD_B_POS` — B-positive blood

> If capability codes do not match, Rescue cannot confirm required capabilities and hospitals may appear unconfirmed/ineligible in recommendations and comparison.

---

## 6. Data Quality & Behavior Requirements

- **Real/actual availability only:** do not fabricate availability, distances, responses, or acceptance.
- **Stable IDs:** `externalId`/`id` and `externalRequestId` must be consistent across calls.
- **Accurate coordinates:** required for nearby search and distance/ETA context.
- **Freshness:** provide `observedAt` (and `expiresAt` when possible). Stale/expired/unknown data must not be presented as confirmed availability.
- **Idempotency:** `POST /api/emergency-requests` must honor `Idempotency-Key` to avoid duplicate alerts.
- **Reachability:** capabilities must be retrievable for hospitals returned by search.

---

## 7. Quick Checklist (for Hospital Portal developer)

- [ ] `GET /api/hospitals/search` implemented (by lat/lng/radius/limit) returning hospitals with stable `externalId/id` and coordinates
- [ ] `GET /api/hospitals/{hospitalId}/capabilities` implemented with `capabilities[]` (`code`, `status`, optional `quantity`), `observedAt`, `expiresAt`
- [ ] Capability `code` values aligned with Section 5 and statuses are `AVAILABLE|UNAVAILABLE|UNKNOWN`
- [ ] `POST /api/emergency-requests` implemented (accepts alert payload, honors `Idempotency-Key`, returns `externalRequestId` + `status`)
- [ ] `GET /api/emergency-requests/{externalRequestId}` implemented for status polling
- [ ] `POST /api/emergency-requests/{externalRequestId}/eta` implemented (recommended)
- [ ] Share with Rescue team: **Base URL** and **API key** (if any) for `HOSPITAL_API_BASE_URL` / `HOSPITAL_API_KEY`

---

## 8. Troubleshooting: “No recommendations from Hospital Portal data”

If Rescue shows no/poor recommendations after case submission:

1. Confirm Rescue is set to `HOSPITAL_ADAPTER=http` with correct `HOSPITAL_API_BASE_URL` (and `HOSPITAL_API_KEY` if required), then restart Rescue API.
2. Ensure search returns hospitals **near the incident latitude/longitude** within the requested `radiusKm`.
3. Ensure each hospital has valid `latitude/longitude` and stable `externalId/id`.
4. Ensure `GET /api/hospitals/{id}/capabilities` is reachable for returned hospitals and returns capability codes/statuses that match case requirements with **fresh** `observedAt`/`expiresAt`.
5. Check for upstream errors/timeouts (non-2xx responses) — Rescue cannot recommend reliably without confirmed, fresh capability data.
