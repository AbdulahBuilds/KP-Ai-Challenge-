# ADR 0007: Best-effort audit, strict attachment privacy

- Status: Accepted
- Date: 2026-11-13

## Context

Audit is required for governance, but a failing audit insert must not block an emergency action. Attachments may contain sensitive patient information and must not leak through API payloads or public storage URLs.

## Decision

- Audit writes are best-effort and logged on failure; successful business actions are never rolled back solely because audit persistence failed.
- Store attachments privately with generated storage keys, validate type by magic bytes, record SHA-256, and download only through an authenticated permissioned endpoint.
- Soft-delete attachment metadata; never return `storageKey` in incident detail payloads.

## Consequences

- Emergency workflows remain available during audit storage incidents, but monitoring must alert on audit failures.
- Frontend downloads require an authenticated request that receives a stream/file response.
- Storage buckets must remain private; local files live outside the web root.
- Audit completeness during infrastructure failure requires operational follow-up, not a UX-blocking retry loop.
