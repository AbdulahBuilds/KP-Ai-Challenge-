# ADR 0001: Modular monolith with adapter boundaries

- Status: Accepted
- Date: 2026-11-13

## Context

Emergency dispatch needs strong transactional consistency across incidents, assignments, resources and hospital requests. Splitting these into microservices early would introduce distributed transactions and operational overhead without a demonstrated scaling need. The system must still integrate with systems it does not own, including Hospital and Patient portals.

## Decision

Build one NestJS API organized into domain modules, backed by one MongoDB Atlas database (replica set for transactions). Isolate third-party systems behind injected adapter interfaces (`HOSPITAL_PROVIDER`, patient, maps, AI, storage, messaging).

## Consequences

- Assignments and state transitions can use database transactions and constraints.
- One deployment unit is simpler to operate and test.
- Adapter boundaries preserve the option to extract integrations or workers later.
- Scaling pressure must be handled by running multiple stateless API replicas and dedicating worker processes before considering service extraction.
