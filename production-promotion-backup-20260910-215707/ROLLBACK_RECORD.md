# Production promotion rollback record — `0.7.1`

**Date:** 2026-09-10
**Action:** Promoting `0.7.1` (build `0.7.1-5218c8f5`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.1/EXECUTABLE_TEST_SESSION_V1.md`, 5/5 PASS, recorded in `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V94`).

## Prior Production state (being replaced)

- **Build identifier:** `0.6.7.4-4fe16e5c`
- **Deploy ID:** `6aa255f515287d85356c634e`
- **Deployed:** 2026-09-10T07:02:13.978Z (`0.6.7.4` promotion, Round 5 acceptance GO)
- **Commit:** `719c8b7`
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.6.7.4-4fe16e5c`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html` (the exact `index.html` served by Production immediately before this promotion).

## New Production state (being promoted)

- **Build identifier:** `0.7.1-5218c8f5`
- **Candidate:** `0.7.1` — global-"+" Task creation, Today packing-list shortcut, category-preset Add (`V5-F09`), Task priority/filters
- **Branch:** `version/V7`
- **Implementation commit:** `2795f2a`
- **Docs-synced-to-`V93` commit (build identifier's actual source SHA):** `5218c8f`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6aa2f10d4357d85178e7bbcd`
- **Acceptance session:** `docs/versions/V7/0.7.1/EXECUTABLE_TEST_SESSION_V1.md`, GO, 5/5 PASS, two non-blocking findings (`V7-F01`, `V7-F02`, both Accepted/no-action)
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.

## Rollback command, if needed

To restore Production to the prior `0.6.7.4` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aa255f515287d85356c634e"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.6.7.4-4fe16e5c` again.
