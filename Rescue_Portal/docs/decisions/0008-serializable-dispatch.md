# ADR 0008: Serializable assignment with database constraints

- Status: Accepted
- Date: 2026-11-13

## Context

Two dispatchers may assign the same ambulance concurrently. Application-level "check then write" logic is insufficient under concurrency and could send two ambulances to unrelated emergencies or double-book a resource.

## Decision

Use a MongoDB transaction with optimistic conditional updates (compare-and-set on status and active assignment fields) plus unique compound indexes that permit only one active assignment per ambulance/team and per incident. Handle Prisma `P2034`/write conflicts and `P2002` unique violations as explicit conflicts.

## Consequences

- Conflicts fail cleanly with `409`; no partial assignment is committed.
- Database constraints protect against future code paths that bypass the service.
- Contention is low because assignment is short and scoped, but retries must remain minimal to preserve determinism.
- Integration tests must exercise simultaneous assignments against a MongoDB Atlas replica set.
