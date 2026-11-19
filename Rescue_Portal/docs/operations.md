# Operations

## Deployment checklist

1. Provision a MongoDB Atlas cluster (replica set, required for transactions) and Redis. Do not use the development database for production. Add the deployment IPs to the Atlas access list.
2. Copy `.env.example` to `.env`; set strong, distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (at least 32 random characters).
3. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `EXPOSE_DEV_TOKENS=false`, a locked-down `CORS_ORIGINS`, and `ENABLE_SWAGGER=false` unless internal-only access is intentional.
4. Use live or contract-tested adapters. Production refuses the mock hospital adapter unless explicitly overridden for a demonstration.
5. Configure private storage. If using S3/MinIO, set `STORAGE_DRIVER=s3` and verify bucket privacy and credentials.
6. Terminate TLS at a reverse proxy. Set `TRUST_PROXY=true` only when the proxy is trusted and overwrites forwarding headers.
7. Sync the schema with `prisma db push` (MongoDB has no SQL migrations). The API container does this automatically on startup.
8. Seed only development/demo environments. Seed passwords are published and must not exist in production.
9. Confirm `/api/v1/health/ready` reports `database: ok`; Redis unavailable means degraded in-process fallback, not readiness failure.
10. Verify Socket.IO reachability at `/realtime` and the frontend origin in the CORS configuration.

## Containers

`docker-compose.yml` runs Redis, API and web; the database is MongoDB Atlas (configured through `DATABASE_URL`). MinIO is behind the `storage` profile.

```bash
docker compose up --build -d
docker compose exec api npm run prisma:seed -w @rescue/api
```

The API container runs as non-root user `rescue` and has a health check on `/api/v1/health`. The web container runs the Next.js standalone server as user `web`.

The compose file defaults `NODE_ENV=development` so labelled mock adapters work out of the box. Set `NODE_ENV=production` and live adapters for a real deployment.

## Background workers

`WORKERS_ENABLED=true` starts in-process workers:

| Worker | Interval | Purpose |
| --- | --- | --- |
| Outbox | `OUTBOX_POLL_INTERVAL_MS` (5s) | Deliver persisted hospital/notification events |
| Hospital polling | `HOSPITAL_POLL_INTERVAL_MS` (15s) | Refresh pending hospital responses |
| Retention | 6 hours | Remove GPS history older than `LOCATION_RETENTION_DAYS` |

Outbox claims are atomic, so multiple replicas do not double-send. For high volume, disable workers on API replicas and run the worker module as a dedicated process.

## Backups and retention

- Use Atlas continuous backups/snapshots and test point-in-time recovery.
- Attachments require a separate backup strategy (S3 versioning/replication or filesystem snapshots).
- GPS history is pruned by the retention worker; audit logs are append-only and should follow the organization's legal retention policy.
- Refresh tokens are hashed; rotating the JWT secrets invalidates all sessions.

## Monitoring

Watch at minimum:

- readiness status and database latency,
- hospital request pending age and timeout rate,
- outbox backlog/unprocessed rows and dead-letter count,
- assignment conflict responses (`409`) as a concurrency signal,
- stale/expired hospital capability ratio,
- login rate-limit rejections and refresh-token reuse events,
- worker errors and attachment storage failures.

Sockets are an optimization; alerting must be based on persisted state, not the presence of realtime events.

## Database-backed verification checklist

These steps require a reachable MongoDB Atlas cluster and Redis:

```bash
npm run db:migrate
docker compose up -d redis
npm run db:seed
npm run test -w @rescue/api
npm run test -w @rescue/web
npm run typecheck
npm run build
```

Then exercise, with real HTTP calls:

1. Login for each seeded role; confirm permission-filtered navigation and organization isolation.
2. Create an incident, assign an ambulance, attempt a conflicting assignment and confirm `409` with no partial state.
3. Progress through every status transition, including an invalid transition rejection.
4. Upload a valid and a spoofed attachment; confirm magic-byte rejection.
5. Generate recommendations with fresh, stale and missing capability data; confirm `ELIGIBLE` is impossible for stale/unknown data.
6. Select an eligible hospital, send a request, sync accepted/rejected/timeout/more-info mock responses, and record handover.
7. Export each CSV type and verify row caps and formula neutralization.
8. Confirm audit entries for login, assignment, override, patient access and attachment actions.
9. Disconnect Redis and confirm degraded-fallback health and rate limiting; reconnect and confirm recovery.
10. Restart the API and confirm outbox/polling workers resume without duplicate delivery.

## Security notes

- Put the refresh cookie behind HTTPS and keep `COOKIE_SECURE=true` in production.
- Keep `EXPOSE_DEV_TOKENS=false`; it exposes invitation and password-reset tokens in API responses.
- Do not enable `ALLOW_MOCK_IN_PRODUCTION` for live operations.
- Use a private object-storage bucket and a least-privilege API key.
- Restrict database and Redis network access to the API/worker network.
- Review audit-log retention and access as part of incident governance.
