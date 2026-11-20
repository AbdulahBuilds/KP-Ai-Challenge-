# Architecture

## Shape

Rescue Portal is a **modular monolith** deployed as two services plus stateful infrastructure:

```
Browser (Next.js console)
   │  REST /api/v1 + Socket.IO /realtime
   ▼
NestJS API ── MongoDB Atlas (replica set)
   │      └─ Redis (cache, rate limiting)
   ├─ Hospital Portal adapter (mock | HTTP)
   ├─ Patient Portal adapter (mock | HTTP)
   ├─ Maps adapter (Haversine | Google Routes | OSRM)
   ├─ AI adapter (heuristic | HTTP)
   └─ Storage (local filesystem | S3-compatible)
```

The modular monolith keeps emergency transactions in one database, while adapter boundaries prevent direct access to Hospital/Patient databases. Infrastructure can be scaled independently later by splitting workers or adapters.

## API modules

| Module | Responsibility |
| --- | --- |
| `auth` | Login, refresh rotation, logout, invitations, password reset, sessions |
| `organizations` | Organization profile, registration approval, suspension |
| `users` | Staff directory and role assignments |
| `teams`, `ambulances` | Resource readiness, members, capabilities, equipment |
| `locations` | GPS ingestion, fleet snapshot, nearby ambulances, history |
| `incidents` | Intake, detail, state machine, observations, handover, close |
| `dispatch` | Board, available resources, transactional assign/release |
| `hospitals` | Directory, search, capability freshness, requests, selection |
| `recommendations` | Deterministic eligibility and ranking, human selection |
| `patient-integration` | Purpose-bound patient summary and status updates |
| `attachments` | Private file upload, integrity, download, soft delete |
| `reports` | Operational analytics and CSV exports |
| `notifications` | Persisted notifications plus realtime delivery |
| `audit` | Append-only organization-scoped audit log |
| `realtime` | Authenticated Socket.IO gateway |
| `health` | Liveness, readiness, integration status |
| `workers` | Outbox, hospital polling, retention |

## Incident state machine

Defined in `apps/api/src/common/constants/incident-status.ts` and mirrored for UI guidance in `apps/web/src/lib/constants.ts`.

```
RECEIVED → REGISTERED → REVIEWED → DISPATCHED → EN_ROUTE → ON_SCENE
        → TRANSPORTING → AT_HOSPITAL → HANDOVER_IN_PROGRESS
        → HANDOVER_COMPLETED → CLOSED
```

`CANCELLED` and `FAILED` are terminal branches. The API validates every transition and records a case event. The UI only presents valid next states; the server never relies on the UI for enforcement.

## Concurrency and data integrity

- Assignment uses MongoDB transactions with optimistic conditional updates (compare-and-set on incident/resource status) so concurrent claims cannot both succeed.
- Unique compound indexes prevent duplicate active assignments per resource and per case.
- Prisma `P2034`/write conflicts and `P2002` unique conflicts are mapped to clear conflict responses.
- Refresh tokens are stored only as SHA-256 hashes. Rotation marks the old token used; reuse revokes the session family.
- Hospital requests use an idempotency key and are persisted before delivery through an outbox row.
- Attachments validate declared type against magic bytes and store a SHA-256 checksum.
- Audit writes are best-effort so a failed audit insert cannot block emergency care; failures are logged.

## Spatial data

Documents store ordinary latitude/longitude fields. Nearby-ambulance lookups fetch organization-scoped positions and compute Haversine distance in the API, so the setup works on MongoDB Atlas without PostGIS. For larger fleets, add a MongoDB `2dsphere` index and `$geoNear` aggregation later.

## Recommendation policy

Policy version: `2026-11-13.1`.

1. **Eligibility before ranking.** Required capabilities must all be explicitly `AVAILABLE` and the capability snapshot must be `FRESH`. Otherwise the hospital is `INELIGIBLE` or at best `UNCONFIRMED`.
2. **No silent guessing.** Missing capabilities, unknown freshness or unknown ETA never produce an `ELIGIBLE` result.
3. **Explainable score.** Capability 50, freshness 20, proximity 20, ETA 10. Factors and eligibility reasons are persisted with the recommendation.
4. **Human approval.** Selecting a destination requires `recommendations:select`; selection outside eligible results requires a written override reason and is audited.
5. **Safe fallbacks.** Route failures fall back to a labelled Haversine estimate (`estimated: true`), never a fabricated road ETA.

## Workers

`WorkersService` runs in-process when `WORKERS_ENABLED=true`:

- outbox processing every `OUTBOX_POLL_INTERVAL_MS`,
- hospital request polling every `HOSPITAL_POLL_INTERVAL_MS`,
- location retention every 6 hours using `LOCATION_RETENTION_DAYS`.

Outbox claims are atomic, so multiple API replicas do not process the same row twice. For larger deployments run the worker module as a dedicated process.

## Realtime

Socket.IO namespace `/realtime`, authenticated with the access token in `auth.token` (or `?token=`). Sockets join `org:<organizationId>` and `user:<userId>`. Events include `incident.updated`, `ambulance.location` and `notification.new`.

Sockets are a **delivery optimization**, not state. Clients always re-fetch persisted state after reconnect; the UI does not treat a missing event as a lost state transition.

## Frontend structure

- `src/lib/api.ts` keeps the access token in memory (not localStorage), performs singleton refresh through the HttpOnly refresh cookie and raises a global expiry event on failure.
- TanStack Query owns server state; components never duplicate authoritative case state locally beyond form drafts.
- `app/(app)/layout.tsx` guards authenticated routes; `AppShell` filters navigation by the permission strings returned by `/auth/me`.
- The case detail screen is the operational workspace: transitions, assignment, recommendations, hospital requests, observations, handover, attachments and timeline.
