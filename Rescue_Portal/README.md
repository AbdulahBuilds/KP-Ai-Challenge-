# Rescue Portal

Centralized emergency healthcare coordination for the **Rescue side**: incident intake, dispatch of ambulances and rescue teams, live fleet visibility, hospital destination recommendations, hospital handover communication, patient summaries, reports and audit.

The repository is a TypeScript monorepo:

| Workspace | Stack | Purpose |
| --- | --- | --- |
| `apps/api` | NestJS 11, Prisma 6, MongoDB Atlas, Redis, Socket.IO | REST API, RBAC, dispatch transactions, integrations, workers, audit |
| `apps/web` | Next.js 15 App Router, React 19, TanStack Query, Tailwind | Operations console for dispatchers, team leaders, paramedics and auditors |

## What is implemented

- Incident intake and a guarded state machine: `RECEIVED → REGISTERED → REVIEWED → DISPATCHED → EN_ROUTE → ON_SCENE → TRANSPORTING → AT_HOSPITAL → HANDOVER_IN_PROGRESS → HANDOVER_COMPLETED → CLOSED`, with explicit cancel/fail paths.
- Concurrent-safe assignment and release using MongoDB transactions, optimistic conditional updates and unique compound indexes.
- Ambulance/team readiness, capability loadout, equipment checks, GPS ingestion and stale-GPS detection.
- Explainable hospital recommendations with an eligibility gate, freshness assessment, distance/ETA fallback and mandatory human confirmation. When no hospital is found in the preferred radius, the nearest hospitals available in the Hospital Portal data are recommended instead of stopping at a hard distance limit. See [Available hospitals](./Available%20hospitals.md) for the current hospital catalog.
- Idempotent emergency requests to hospitals, polling/sync, timeout handling, circuit-breaking HTTP adapter, ETA updates and communication history.
- Patient summary access through a dedicated integration, with purpose auditing and minimum-necessary fields.
- Handover record and report analytics (response-time percentiles, case mix, hospital acceptance, fleet activity) with CSV exports.
- Attachment upload with magic-byte validation, private storage, checksum integrity, and soft deletion.
- JWT access tokens, rotating hashed refresh tokens, reuse detection, invitations, password reset, sessions, RBAC and organization isolation.
- Append-only audit trail for safety- and security-relevant actions.
- Background workers for outbox processing, hospital polling and location retention.
- Responsive web console: dashboard, incidents, case detail, dispatch board, fleet map, hospital directory, reports, staff, audit and settings.

## Integration modes and mock data

External systems are represented by **adapters**. Mock data is deterministic and **always labelled** with `isMock`, `dataSource: "MOCK"` and an explicit notice in API responses and UI.

| Variable | Values | Default |
| --- | --- | --- |
| `HOSPITAL_ADAPTER` | `mock`, `http` | `mock` |
| `PATIENT_ADAPTER` | `mock`, `http` | `mock` |
| `MAPS_ADAPTER` | `mock-haversine`, `google`, `osrm` | `mock-haversine` |
| `AI_ADAPTER` | `heuristic`, `http` | `heuristic` |
| `STORAGE_DRIVER` | `local`, `s3` | `local` |

Production rejects `HOSPITAL_ADAPTER=mock` unless `ALLOW_MOCK_IN_PRODUCTION=true`. Only use that flag for controlled demos.

Mock hospital IDs `mock-hospital-001` … `mock-hospital-007` cover accept, reject, more-information, timeout, stale/expired capability data and unknown capabilities. The mock provider route lives at `/api/v1/mock/hospital-api/v1` and is disabled unless the mock adapter is active.

## Quick start with Docker (recommended)

Requirements: Docker with Compose and a MongoDB Atlas connection string. No local Node/PostgreSQL installation is required.

```bash
cp .env.example .env
# Set DATABASE_URL to your MongoDB Atlas URI, and JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to strong random values
docker compose up --build
```

The API entrypoint syncs the Prisma schema to MongoDB Atlas on startup. Load the deterministic demo seed:

```bash
docker compose exec api npm run prisma:seed -w @rescue/api
```

Services:

- Web console: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger (when `ENABLE_SWAGGER=true`): `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/v1/health` and `/api/v1/health/ready`

Optional MinIO object storage:

```bash
docker compose --profile storage up -d minio
# STORAGE_DRIVER=s3 and the S3_* variables in .env
```

### Seed accounts (development only)

All passwords are `Rescue@12345`.

| Email | Access |
| --- | --- |
| `admin@rescueportal.local` | Rescue Admin |
| `admin@rescue-one.local` | Rescue Admin |
| `dispatcher@rescue-one.local` | Rescue Admin |
| `leader@rescue-one.local` | Rescue Admin |
| `paramedic@rescue-one.local` | Rescue Admin |
| `auditor@rescue-one.local` | Rescue Admin |

The account configured by `RESCUE_ADMIN_EMAIL` is also seeded with its password from `RESCUE_ADMIN_PASSWORD`. Set `SEED_DEMO_ACCOUNTS=false` to seed only that account.

## Local development (without Docker)

Requirements: Node.js 20+, a MongoDB Atlas cluster (or another MongoDB replica set), Redis (optional but recommended).

```bash
cp .env.example .env
# Set DATABASE_URL to your MongoDB Atlas URI
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The API uses `PORT`, then `API_PORT`, then `4000`. The web app calls the API through a same-origin Next.js proxy at `/api/v1`; set `API_PROXY_URL` to the API origin (`http://localhost:4000` locally, `http://api:4000` in Docker). `NEXT_PUBLIC_API_URL` defaults to `/api/v1`.

> MongoDB has no SQL migrations. `npm run db:migrate` runs `prisma db push`, which syncs collections and indexes from `schema.prisma`. Add your current IP to the Atlas access list before connecting.

## Verification

```bash
npm run typecheck          # Prisma generate + API and web TypeScript checks
npm run test               # 28 API unit tests + 8 web unit tests
npm run build              # Nest build + Next production build
npm run lint               # API typecheck + Next lint
```

Verified locally in this environment: API typecheck, API build, API tests, web typecheck, web production build and web tests. Database-backed runtime checks require a reachable MongoDB Atlas cluster and Redis; see `docs/operations.md`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — modules, data flow, concurrency and state machine.
- [`docs/api.md`](docs/api.md) — endpoint overview, auth and error conventions.
- [`docs/rbac.md`](docs/rbac.md) — roles, permissions and organization isolation.
- [`docs/integrations.md`](docs/integrations.md) — adapter contracts, mock behaviour, failure handling.
- [`docs/operations.md`](docs/operations.md) — deployment, workers, backups, verification checklist.
- [`docs/decisions/`](docs/decisions/) — architecture decision records.

## Known limitations

- Real hospital, patient, Google Maps/Routes, OSRM and AI provider credentials were not available. Live adapters follow documented contracts but have not been tested against real third-party sandboxes.
- Email/SMS delivery has a messaging abstraction; the default is a logged development transport, not a production email provider.
- The map shows a schematic coordinate view unless `NEXT_PUBLIC_MAP_TILE_URL` is configured.
- Multi-organization self-registration and approval APIs exist; a dedicated public registration UI and super-admin organization console are not part of this web app.
- Automated database integration/e2e tests require a provisioned MongoDB replica set (Atlas) and are not run in this environment.
