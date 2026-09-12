# Production promotion rollback record — `0.7.2`

**Date:** 2026-09-12
**Action:** Promoting `0.7.2` (build `0.7.2-08d11fd8`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.2/EXECUTABLE_TEST_SESSION_V1.md`, `V9`, all 8 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.1-5218c8f5`
- **Deploy ID:** `6aa2fdbc36dc5e6e540daace`
- **Deployed:** 2026-09-10T18:58:04.459Z (`0.7.1` promotion)
- **Commit:** `2795f2a` (implementation), docs synced to `5218c8f`
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.1-5218c8f5`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.2-08d11fd8`
- **Candidate:** `0.7.2` — multi-Trip ownership, Shared-Trip Owner/Editor roles, real Firestore/Storage datastore (replacing the prior single-key `localStorage` model)
- **Branch:** `version/V7`
- **Final implementation/fix commit:** `08d11fd`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6aa4e5ee31cf6b1f17195519`
- **Acceptance session:** `docs/versions/V7/0.7.2/EXECUTABLE_TEST_SESSION_V1.md`, `V9`, **GO**, 8/8 tests PASS after a nine-revision cycle (session pause for two missing UI entry points; NO-GO for two blocking findings whose first fix attempts did not survive retest and were corrected; two rounds of debug-tooling fixes for Test 5's live server-side-rule verification)
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** Firestore/Storage (`family-trips-9aef4`) is one shared backend for both `qa` and Production — there is no separate "Production Firestore" to additionally configure. The rules and `config/appInvitations` document already governing `qa` apply identically to Production.

## Rollback command, if needed

To restore Production to the prior `0.7.1` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aa2fdbc36dc5e6e540daace"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.1-5218c8f5` again.

**Important**: rolling back the *app* deploy does **not** roll back Firestore/Storage data or rules — `0.7.2`'s data model (Trips in Firestore, attachments in Storage) is a genuine backend migration, not just a client change. A rollback of the app alone would point the old `0.7.1` client (which reads/writes `localStorage` only) at users who may have already migrated their Trip data into Firestore via `0.7.2`'s migration flow — their data would still be safe in Firestore, but the `0.7.1` client would not read it. If a rollback is ever needed after real Trips have been migrated, treat it as a real incident requiring its own plan, not a simple deploy revert.
