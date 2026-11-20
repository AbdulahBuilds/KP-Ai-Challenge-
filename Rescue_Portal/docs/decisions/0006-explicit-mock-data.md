# ADR 0006: Mock integrations must be explicit end to end

- Status: Accepted
- Date: 2026-11-13

## Context

Demonstrating emergency workflows without real Hospital/Patient systems requires simulated data. The dangerous failure mode is simulated availability being mistaken for real availability.

## Decision

Use adapters with a deterministic mock mode. Every mock response carries `isMock`, `dataSource: "MOCK"` and a notice. The UI shows persistent mock warnings on affected screens. Production rejects `HOSPITAL_ADAPTER=mock` unless an explicit `ALLOW_MOCK_IN_PRODUCTION=true` override is set for controlled demos. Stale or simulated capability data can never yield an `ELIGIBLE` recommendation.

## Consequences

- Demos remain fully functional and reproducible.
- No screen presents mock hospital capacity as real capacity.
- Accidental production use of the hospital mock requires an explicit, auditable configuration change.
- Mock IDs and scenarios are part of the test/demo contract.
