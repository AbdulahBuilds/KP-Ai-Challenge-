# ADR 0002: PostGIS objects live in the SQL migration

- Status: Superseded (database moved to MongoDB Atlas)
- Date: 2026-11-13

## Context

Prisma does not model PostGIS geography types natively in a way that supports generated spatial indexes, triggers and partial unique indexes. Distance queries and assignment safety depend on database-level guarantees.

## Decision

This decision applied while the system used PostgreSQL/PostGIS. The database is now MongoDB Atlas, so there are no SQL migrations. `schema.prisma` is the source of truth and is synced with `prisma db push`.

## Consequences

- Nearby-ambulance distance is computed in the API with Haversine; MongoDB `2dsphere` indexes can replace this later.
- Active-assignment safety relies on transaction-scoped conditional updates plus unique compound indexes, not partial SQL indexes.
- CI needs a MongoDB replica set (Atlas) rather than PostGIS.
