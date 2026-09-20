# Production promotion rollback record — `0.7.3.1`

**Date:** 2026-09-20
**Action:** Promoting `0.7.3.1` (build `0.7.3.1-f83cbb80`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.3.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all three tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.3-791b640c`
- **Deploy ID:** `6aafd840cea964c83e644896`
- **Deployed:** 2026-09-20T12:57:36.940Z (`0.7.3` promotion)
- **Commit:** `791b640` (implementation)
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.3-791b640c`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.3.1-f83cbb80`
- **Candidate:** `0.7.3.1` — narrow correction fixing three findings from `0.7.3`'s own acceptance session: a Flight item's map link staying stale after editing its location (medium-high severity); a source row's "מנתח…" analyzing badge staying stuck after analysis finished (a genuine regression in `0.7.3`'s own open-form buffering fix); and a brief empty-trip flash on app launch/refresh (pre-existing since `0.7.2`, not a `0.7.3` regression).
- **Branch:** `version/V7`
- **Final implementation commit:** `f83cbb8`; test session draft `16e232f`; Test 3 retest confirmation `0513ee3`; GO `cefb4b6`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6aafdececf22df5b9564b7fd`
- **Acceptance session:** `docs/versions/V7/0.7.3.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 3 tests PASS. Test 3 had an initial FAIL (a brand-new session's first load still flashing the empty-Trip state) that was investigated without any code change and diagnosed as a Service Worker cache-propagation artifact (the first post-deploy visit served by the OLD, pre-fix SW's cached shell while the new SW activated in the background) — confirmed by the Product Owner's own close-and-relaunch retest coming back clean, no code defect.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** unchanged — Firestore/Storage (`family-trips-9aef4`) is one shared backend for both `qa` and Production. No security-rules or data-model change in this correction.
- **Residual, deliberately-not-fixed item:** source rows written under `0.7.3`'s pre-fix buffering logic can still carry a stale "מנתח…" badge left over from before this correction — a one-time residual data state that doesn't self-correct retroactively. Product Owner's own call during acceptance: not a defect in this fix, deferred to Beta.

## Rollback command, if needed

To restore Production to the prior `0.7.3` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aafd840cea964c83e644896"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.3-791b640c` again.

**Important:** like `0.7.2.1`/`0.7.3`'s own rollbacks, this is low-risk — no data model or security-rules change, only client-side logic (map-link resolution, remote-update buffering, boot-state rendering). A rollback would re-expose all three fixed findings but puts no already-synced data at risk and requires no data migration or reconciliation step.
