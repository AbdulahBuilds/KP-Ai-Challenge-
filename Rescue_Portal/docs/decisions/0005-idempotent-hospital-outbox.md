# ADR 0005: Persist hospital requests before delivery

- Status: Accepted
- Date: 2026-11-13

## Context

An emergency request must not be lost or duplicated if the hospital portal times out or the API restarts. Operators also need a durable record of what was sent and when.

## Decision

Persist an `HospitalRequest` with an idempotency key before attempting delivery. Use an outbox row for asynchronous delivery/retry and an in-process worker with atomic claims. Poll pending responses, record timeouts explicitly, and expose a manual sync endpoint.

## Consequences

- A restart does not lose an emergency request.
- Duplicate submissions with the same key return the existing request.
- Pending, accepted, rejected, more-information, timed-out and failed states are all visible.
- The hospital portal must honour the idempotency key for full end-to-end safety.
