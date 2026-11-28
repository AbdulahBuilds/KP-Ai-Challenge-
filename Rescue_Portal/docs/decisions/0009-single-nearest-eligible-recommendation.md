# ADR 0009: One nearest eligible hospital recommendation

- Status: Accepted
- Date: 2026-11-25
- Supersedes: The weighted score as the primary ordering for the recommended destination in ADR 0003

## Context

Dispatchers asked for one clear hospital recommendation based on the patient details, nearby distance, and confirmed hospital facilities. Showing several candidates with similar visual weight obscures the primary decision. Intake was also simplified to one narrated patient-details input; structured clinical fields are extracted by the backend AI rather than typed into multiple forms.

## Decision

Infer additional capability requirements from the recorded clinical narrative, but keep those requirements visible for dispatcher review. A hospital is eligible only when every required capability is explicitly available and its capability data is fresh. Among eligible hospitals, recommend only the closest by route distance, with score, ETA, and name as tie-breakers. If no hospital meets the eligibility gate, return no recommendation rather than presenting an unconfirmed candidate as suitable.

Other evaluated hospitals remain available in a collapsed alternatives section for review; they are not additional recommendations. The explanation identifies confirmed capabilities, data freshness, distance, and estimated ETA where available. Mock data and estimated travel remain explicitly labelled.

## Consequences

- Capability eligibility remains a safety gate; proximity cannot make an unconfirmed or ineligible hospital recommended.
- A farther candidate with a higher weighted score cannot displace the nearest eligible hospital.
- The candidate list remains available for transparent review, while the interface emphasizes only one recommended destination.
- Urdu Romanization and narrative organization in heuristic mode are best-effort; dispatchers must review all fields. A configured, approved AI provider is required for robust multilingual understanding.
- Browser voice-to-text accuracy depends on the browser speech service, microphone, accent and noise. The recognized transcript is inserted into the narrative input for review before submission; perfect word-for-word transcription cannot be guaranteed.
