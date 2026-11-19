# ADR 0004: Access token in memory, rotating refresh cookie

- Status: Accepted
- Date: 2026-11-13

## Context

Operational consoles are long-lived and often left unattended. Storing bearer tokens in browser storage increases exposure to XSS. Refresh tokens must be revocable and detectable if stolen.

## Decision

Keep short-lived access tokens in memory in the web client. Store refresh tokens as SHA-256 hashes in the database and deliver them in an HttpOnly, path-scoped cookie. Rotate on every refresh; mark the old token used. Reuse of a used token revokes the session family.

## Consequences

- A page reload performs a silent refresh rather than reading a token from storage.
- Cross-tab refresh is serialized by a singleton promise in the client.
- Cookie settings (`Secure`, `SameSite`, domain, path) and TLS termination are critical deployment concerns.
- Password changes and account suspension can revoke all sessions.
