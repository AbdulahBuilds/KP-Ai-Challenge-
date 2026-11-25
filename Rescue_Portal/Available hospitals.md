# Available hospitals

Snapshot of every hospital currently available in the Hospital Portal data used by the Rescue Portal for recommendations.

- Source: `Hospital_Portal/data/Hospitals.json` (generated from `Hospital_Portal/src/lib/seedData.js`)
- Catalog version: `2026-11-13.1`
- Snapshot generated: `2026-11-24T16:41:05.441Z`
- Total hospitals: 4

| Hospital | ID | City | Address | Coordinates (lat, lon) | Phone | Services |
| --- | --- | --- | --- | --- | --- | --- |
| Lady Reading Hospital (LRH) | `lrh-peshawar` | Peshawar | GT Road, Soekarno Chowk, Peshawar, Khyber Pakhtunkhwa | 34.0106, 71.5688 | +92-91-9211440 | emergency, icu, operationTheatre, laboratory, bloodBank, radiology, dialysis |
| Hayatabad Medical Complex (HMC) | `hmc-peshawar` | Peshawar | Phase 4, Hayatabad, Peshawar, Khyber Pakhtunkhwa | 33.9925, 71.4497 | +92-91-9217150 | emergency, icu, operationTheatre, laboratory, bloodBank, radiology, dialysis |
| Ayub Teaching Hospital (ATH) | `ath-abbottabad` | Abbottabad | Karakoram Highway, Abbottabad, Khyber Pakhtunkhwa | 34.2043, 73.2385 | +92-992-381910 | emergency, icu, operationTheatre, laboratory, bloodBank, radiology, dialysis |
| DHQ Teaching Hospital Mardan | `dhq-mardan` | Mardan | Bank Road, Mardan, Khyber Pakhtunkhwa | 34.1911, 72.0457 | +92-937-9230220 | emergency, icu, operationTheatre, laboratory, bloodBank, radiology, dialysis |

## Current capacity snapshot

| Hospital | General beds available | ICU beds available | Capability data last updated |
| --- | ---: | ---: | --- |
| Lady Reading Hospital (LRH) | 142 | 7 | 2026-11-24T16:16:05.438Z |
| Hayatabad Medical Complex (HMC) | 115 | 5 | 2026-11-24T16:26:05.438Z |
| Ayub Teaching Hospital (ATH) | 88 | 3 | 2026-11-24T02:41:05.439Z |
| DHQ Teaching Hospital Mardan | 45 | 2 | 2026-11-24T14:41:05.439Z |

## Notes for rescue teams

- The Rescue Portal reads live hospital data from the Hospital Portal at `/api/hospitals/search` and `/api/hospitals/{id}/capabilities`. Availability can change at any time; always confirm with the hospital.
- When no hospital is found near the patient location, the AI recommendation falls back to the nearest hospitals in this catalog and clearly labels the distance and estimated travel time.
- Capability codes, availability statuses and freshness rules are enforced by the recommendation engine. Unconfirmed or stale data is never presented as confirmed availability.
- To refresh this file, regenerate `Hospital_Portal/data/Hospitals.json` from the Hospital Portal manifest and update the table above.
