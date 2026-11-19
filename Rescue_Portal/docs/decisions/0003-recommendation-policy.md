# ADR 0003: Eligibility before ranking; human confirmation required

- Status: Accepted
- Date: 2026-11-13

## Context

Selecting a hospital is safety-critical. A numeric ranking that can place a hospital with unknown ICU capacity first would create false confidence. Data from hospital portals can be stale, missing or ambiguous.

## Decision

Apply a hard eligibility gate before scoring. A hospital is `ELIGIBLE` only when every required capability is explicitly `AVAILABLE` and the capability snapshot is `FRESH`. Missing availability yields `INELIGIBLE`; stale/expired/unknown freshness yields at most `UNCONFIRMED`. Ranking uses capability 50, freshness 20, proximity 20 and ETA 10. A human with `recommendations:select` must confirm the destination; selecting outside the eligible list requires a written override reason and is audited.

## Consequences

- The system may return few or no eligible hospitals rather than unsafe guesses.
- Operators see explicit reasons for each result and the data age.
- Policy changes must be versioned (`2026-11-13.1`) so historical recommendations remain explainable.
