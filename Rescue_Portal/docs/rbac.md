# Roles and permissions

Authorization is enforced server-side by `@RequirePermissions(...)` plus organization scoping in services. The frontend hides unavailable navigation and actions, but this is usability only.

## Organization isolation

- Every operational query is scoped by `user.organizationId`.
- Cross-organization IDs normally produce **404**, not 403, to avoid confirming resource existence.
- `SUPER_ADMIN` may list organizations and filter audit logs by organization; normal roles cannot.
- A user without an organization cannot access organization-scoped operational endpoints.

## Permission catalogue

| Permission | Capability |
| --- | --- |
| `platform:manage` | Platform-level administration |
| `org:manage`, `org:read` | Organization profile and policy |
| `users:manage`, `users:read` | Staff invitations and directory |
| `teams:manage`, `teams:read` | Rescue teams and membership |
| `ambulances:manage`, `ambulances:read` | Ambulance and equipment readiness |
| `incidents:create`, `incidents:read`, `incidents:update` | Incident workflow |
| `incidents:assign`, `incidents:handover`, `incidents:close` | Dispatch and closure |
| `locations:read`, `locations:write` | GPS read and ingestion |
| `hospitals:read`, `hospitals:request` | Hospital data and emergency requests |
| `recommendations:read`, `recommendations:select` | Recommendation review and human selection |
| `notifications:read` | Own notification inbox |
| `reports:read`, `reports:export` | Analytics and CSV export |
| `audit:read` | Audit trail |
| `integration:manage` | Integration administration |

## Role mapping

| Role | Summary |
| --- | --- |
| `SUPER_ADMIN` | All permissions; organization oversight |
| `ORG_ADMIN` | Full organization operations plus users, audit, reports and integration visibility |
| `DISPATCHER` | Intake, dispatch, status, hospital requests, recommendations and reports (no audit/user management) |
| `TEAM_LEADER` | Case status, handover, locations, hospital read, recommendations read |
| `PARAMEDIC` | Case read/update, location write, hospital read, recommendation read |
| `AUDITOR` | Read-only operations, reports/export and audit |

The canonical matrix lives in `apps/api/src/common/constants/permissions.ts`. The seed script upserts it, so changing permissions requires re-running the seed (or an equivalent migration) in existing environments.

## Sensitive actions

- Destination selection outside the eligible recommendation list requires a non-empty `overrideReason` and is audited.
- Patient data access requires a stated purpose and is audited.
- Closing/cancelling requires a reason where the workflow defines one.
- Organization suspension revokes refresh sessions.
- Password change and `logout-all` revoke refresh sessions.
- Attachment access is permissioned and audited; storage keys are never returned in incident detail payloads.
