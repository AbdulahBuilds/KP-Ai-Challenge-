# Integrations

All external systems are accessed through adapter interfaces. The API never connects directly to a Hospital or Patient database. Every adapter response carries `isMock`, `dataSource` and a human-readable `notice` where applicable.

## Hospital

Environment: `HOSPITAL_ADAPTER=mock|http`, `HOSPITAL_API_BASE_URL`, `HOSPITAL_API_KEY`, `HOSPITAL_API_TIMEOUT_MS`, `HOSPITAL_DATA_MAX_AGE_SECONDS`, `HOSPITAL_REQUEST_TIMEOUT_SECONDS`.

Contract (HTTP adapter): directory search, capability lookup, emergency request creation and response polling. Errors are wrapped in `HospitalIntegrationError`. The HTTP provider uses timeouts and circuit breaking; failures surface as explicit statuses rather than optimistic acceptance.

Mock provider:

- deterministic hospitals `mock-hospital-001` … `007`,
- scenarios include accept, reject, more information, timeout, stale/expired capability snapshots and unknown capabilities,
- `mock-hospital-001` is typically the positive path; see the mock adapter for the exact matrix,
- all mock payloads are labelled and the UI displays a mock warning.

Freshness is assessed centrally (`FRESH`, `STALE`, `EXPIRED`, `UNKNOWN`). Stale data can never produce an `ELIGIBLE` recommendation.

Production safeguard: `NODE_ENV=production` rejects the mock hospital adapter unless `ALLOW_MOCK_IN_PRODUCTION=true`. This is for controlled demonstrations only.

## Patient

Environment: `PATIENT_ADAPTER=mock|http`, `PATIENT_API_BASE_URL`, `PATIENT_API_KEY`, `PATIENT_API_TIMEOUT_MS`.

Patient summaries require an explicit purpose. The API requests the minimum dataset, records access in the audit trail and does not expose patient data to unpermissioned roles. Organization and patient identifiers must match before data is accepted.

## Maps

Environment: `MAPS_ADAPTER=mock-haversine|google|osrm`, `GOOGLE_MAPS_API_KEY`, `OSRM_BASE_URL`, `MAPS_AVERAGE_SPEED_KMH`, `MAPS_ROAD_FACTOR`, `MAPS_API_TIMEOUT_MS`.

- `google`: Routes API v2 route matrix.
- `osrm`: OSRM route service.
- `mock-haversine`: deterministic great-circle distance with a road factor and average speed.

If a live provider fails, the system returns a Haversine estimate with `estimated: true` and `source: fallback-haversine`. It never presents an estimate as a live road route.

## AI assistance

Environment: `AI_ADAPTER=heuristic|http`, `AI_API_BASE_URL`, `AI_API_KEY`, `AI_API_TIMEOUT_MS`.

The heuristic provider is deterministic and always available. AI output is advisory only; eligibility and scoring remain rule-based and explainable. A model must never bypass the eligibility gate, and a human must confirm the destination.

When `AI_ADAPTER=http`, the configured service can implement `POST /structure-incident`. The request contains `transcript`, `language` (`en`, `ur`, or `ps`), and extraction instructions. Return `normalizedTranscript`, the clinical string fields (`symptoms`, `injuries`, `suspectedCondition`, `treatmentProvided`, `notes`, `resourceNeeds`), plus `patientName`, `age`, `gender`, `emergencyType`, `severity`, `address` and `capabilities`. Missing or invalid extracted metadata is filled by the deterministic heuristic adapter. Preserve the source language: English stays English, Urdu is returned in Pakistani Roman Urdu, and Pashto stays in Pashto script.

The browser microphone uses the Web Speech API and inserts the recognized words directly into the single narrative input. Transcription accuracy depends on the browser speech service, microphone quality, accent and noise; no implementation can guarantee perfect word-for-word accuracy. Review the transcript before submitting. AI organizes the reviewed text into backend fields; it does not replace the dispatcher's judgement.

The structuring request contains patient-reported clinical information. Only configure an AI endpoint that is approved to process this data. Rescue staff must review and correct all organized fields; the service must not diagnose or infer unstated facts.

## Storage

Environment: `STORAGE_DRIVER=local|s3`, `STORAGE_LOCAL_DIR`, `S3_*`, `MAX_UPLOAD_BYTES`.

- 10 MB default limit.
- Allowed: JPEG, PNG, WebP, PDF, validated by magic bytes as well as declared MIME type.
- SHA-256 checksum recorded; private download route requires authentication and permission.
- Local files live outside the web root. S3 buckets must be private.
- Deletion is soft; the API does not expose storage keys in incident payloads.

## Messaging

Messaging is abstracted for notifications and future email/SMS delivery. The default development transport logs messages. No production email/SMS provider credentials are included. Notifications are always persisted before delivery so a failed transport does not lose the in-app record.

## Operational expectations

- Third-party outages must degrade explicitly (stale/unknown badges, fallback estimates, pending states), never silently.
- All retries must be idempotent. Hospital emergency requests use an idempotency key.
- Secrets belong in environment variables or a secret manager, never in the repository.
- Before production, contract-test each live adapter against the real sandbox, including timeout, 401/403, 429, 5xx and malformed payload cases.
