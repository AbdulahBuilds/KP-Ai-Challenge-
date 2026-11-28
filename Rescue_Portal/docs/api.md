# API overview

Base path: `/api/v1`. Swagger: `/api/docs` when `ENABLE_SWAGGER=true`. WebSocket namespace: `/realtime`.

## Authentication

1. `POST /auth/login` → access token (JSON) and HttpOnly refresh cookie `rescue_refresh` scoped to `/api/v1/auth`.
2. Send `Authorization: Bearer <accessToken>` on API requests.
3. `POST /auth/refresh` rotates the refresh token and returns a new access token. Reuse of an already-used token revokes the session family.
4. `POST /auth/logout` revokes the presented refresh token; `POST /auth/logout-all` revokes every session for the user.

Access tokens default to 15 minutes, refresh tokens to 7 days. Access tokens are kept in memory by the web client; no auth token is written to `localStorage`.

Optional development behaviour: when `EXPOSE_DEV_TOKENS=true`, invitation/password-reset responses include tokens for local testing. Never enable this in production.

## Error convention

Errors use normal NestJS HTTP status codes with a JSON body containing `statusCode`, `message` and `error`. Validation arrays are returned for invalid DTOs. Notable semantics:

- `401` expired/missing token; client attempts one refresh.
- `403` valid user but missing permission or inactive organization.
- `404` resource absent **or outside the caller's organization**.
- `409` invalid state transition, assignment conflict or duplicate active assignment.
- `429` rate limit (login is limited by IP and account).

## Endpoint map

### Auth and organizations

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/accept-invitation
POST   /auth/change-password
GET    /auth/me
PATCH  /auth/me
GET    /auth/sessions
DELETE /auth/sessions/:id
POST   /auth/invitations
GET    /auth/invitations
DELETE /auth/invitations/:id
POST   /auth/register-organization
GET    /organizations/me
PATCH  /organizations/me
GET    /organizations
GET    /organizations/:id
POST   /organizations/:id/approve|reject|suspend|reactivate
```

### Incidents, dispatch and patient data

```
GET    /incidents
POST   /incidents
POST   /incidents/structure-narrative
GET    /incidents/:id
PATCH  /incidents/:id
PATCH  /incidents/:id/status
GET    /incidents/:id/timeline
POST   /incidents/:id/observations
POST   /incidents/:id/handover
POST   /incidents/:id/close
POST   /incidents/:id/cancel
GET    /dispatch/board
GET    /dispatch/available-resources
POST   /dispatch/incidents/:id/assign
POST   /dispatch/incidents/:id/release
POST   /patient-integration/incidents/:incidentId/summary
POST   /patient-integration/incidents/:incidentId/status-updates
```

`POST /incidents` accepts a single `narrative` free-text field plus device-captured `latitude` and `longitude`. On create, the backend AI extracts `emergencyType`, `severity`, patient name/age/gender, symptoms, injuries, condition, treatment, notes, address, and required capability codes. The frontend sends no clinical forms; all structured inputs are derived server-side. Explicit fields remain accepted as overrides for machine integrations.

`POST /incidents/structure-narrative` accepts `{ "transcript": "...", "language": "en|ur|ps" }` (`language` is optional and auto-detected when omitted) and returns the normalized transcript, clinical fields, extracted patient metadata, detected priority/type, and suggested capability codes. Urdu output uses Pakistani Roman Urdu; Pashto output remains Pashto script. All fields are advisory and must be reviewed.

### Hospitals and recommendations

```
GET    /hospitals/integration/status
GET    /hospitals
GET    /hospitals/search
GET    /hospitals/:id
GET    /hospitals/:id/capabilities
POST   /hospitals/select-destination
POST   /incidents/:incidentId/hospital-requests
GET    /incidents/:incidentId/hospital-requests
GET    /incidents/:incidentId/communications
GET    /hospital-requests/:id
POST   /hospital-requests/:id/sync
POST   /hospital-requests/:id/eta
POST   /incidents/:incidentId/recommendations
GET    /incidents/:incidentId/recommendations
GET    /incidents/:incidentId/recommendations/latest
GET    /recommendations/:id
POST   /recommendations/:id/select
```

### Resources, reports, files, audit

```
GET/POST/PATCH/DELETE /teams, /teams/:id, /teams/:id/members, /teams/:id/status
GET/POST/PATCH/DELETE /ambulances, /ambulances/:id, /ambulances/:id/equipment, /ambulances/:id/status
GET    /locations/fleet
GET    /locations/ambulances/nearby
GET    /locations/ambulances/:id
POST   /locations/ambulances/:id
POST   /locations/ambulances/:id/batch
GET    /locations/incidents/:id
GET    /reports/overview
GET    /reports/incidents
GET    /reports/hospitals
GET    /reports/ambulances
GET    /reports/export?type=incidents|hospitals|ambulances
POST   /incidents/:incidentId/attachments
GET    /incidents/:incidentId/attachments
GET    /incidents/:incidentId/attachments/:attachmentId/download
DELETE /incidents/:incidentId/attachments/:attachmentId
GET    /notifications
GET    /notifications/unread-count
PATCH  /notifications/:id/read
POST   /notifications/read-all
GET    /audit-logs
GET    /health
GET    /health/ready
GET    /users
GET    /users/roles
GET    /users/:id
PATCH  /users/:id
```

Exact DTO fields, enums and response schemas are documented in Swagger.

## Report export notes

- Range maximum is 366 days.
- Overview analysis reads at most 20,000 rows and reports `truncated`.
- CSV export is capped at 5,000 rows.
- CSV values beginning with `=`, `+`, `-`, `@` are neutralized to prevent spreadsheet formula injection.
- Hospital acceptance excludes pending/more-information requests from the denominator.

## Unified portal routing

The Rescue web app is served at `/rescue`. Visiting `http://localhost:3001/` redirects to `/rescue`, so direct port-3001 use does not need the prefix. Browser API calls use `/api/v1`, which is proxied to the Rescue API by:

- the Rescue web rewrite (`basePath: false`) when opened directly on port 3001, and
- the Hospital Portal rewrite when opened through the unified portal on port 3000.

Both proxies forward the `Authorization` header, so JWT auth works unchanged. Configure `RESCUE_API_URL` and `RESCUE_WEB_URL` in the Hospital Portal environment for non-local deployments.
