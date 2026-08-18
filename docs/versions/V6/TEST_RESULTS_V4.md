# FamilyTrips Alpha 0.6.3 Automated Test Results

Document revision: `V4`  
Date: 2026-08-15  
Candidate status: Automated gate PASS; Product Owner acceptance pending

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| JavaScript syntax | PASS | All application, service-worker and Smart Import Function modules parsed successfully. |
| Existing regression | PASS | Smoke, V4 ingestion/correction and all nine V5 suites passed. |
| Alpha 0.6 contract | PASS | Adapter mapping, review-first behavior, server authorization, bounded acquisition, ownership/quota and audit privacy suite passed. |
| Production artifact | PASS | The previously passed Vite 7.3.6 runtime is unchanged except for the 0.6.3 visible identity/cache markers and configuration tooling; both generated JavaScript bundles parse successfully and package tests prove source/dist version alignment. The Windows installer performs a fresh full Vite build before QA deployment. |
| V10/V11 extraction gate | PASS | H-001–H-005 measured; zero false exact integrity claims; maximum paid-attempt cost USD 0.006744; maximum latency 26.755 s. |
| V13 place gate | PASS | 2/2 real Hotels validated; one lookup each; competing property rejected; maximum latency 446 ms. |
| Fixed general QA package contract | PASS | Package test requires `--alias qa --no-build`, the stable `qa--familytripz.netlify.app` URL, and rejects a version-specific alias in the deployment helper. |
| Deterministic Netlify environment reset contract | PASS | Package test requires `env:unset $Name --force` followed by Functions-only recreation in both preview contexts, rejects inventory detection, and verifies owner retention plus the Paola default invitation. |

The complete executable user acceptance session is `EXECUTABLE_TEST_SESSION_V124.md`. Automated and spike results do not authorize Production deployment.
