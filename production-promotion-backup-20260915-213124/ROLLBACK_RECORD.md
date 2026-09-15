# Production promotion rollback record — `0.7.2.1`

**Date:** 2026-09-15
**Action:** Promoting `0.7.2.1` (build `0.7.2.1-19ff2b6b`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.2.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, both tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.2-08d11fd8`
- **Deploy ID:** `6aa4f6175a330d9678e4bc3d`
- **Deployed:** 2026-09-12T06:49:59.167Z (`0.7.2` promotion)
- **Commit:** `08d11fd` (implementation)
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.2-08d11fd8`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.2.1-19ff2b6b`
- **Candidate:** `0.7.2.1` — narrow correction fixing a real, already-shipped offline-data-loss bug: `save()`'s `saveInFlight` chained each write's entire async operation (including the unresolved `batch.commit()`) behind a single `.then()`, so while offline only the *first* queued edit ever reached Firestore's own durable offline queue; every edit after it was lost outright if the app closed/reloaded before reconnecting. Found during `0.7.3`'s design verification (`docs/versions/V7/0.7.3/DESIGN_V1.md` §0.1), fixed per §3.2. No other scope — `0.7.2.1` does not touch `0.7.2`'s own feature set.
- **Branch:** `version/V7`
- **Final implementation commit:** `19ff2b6`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6aa98a71f7cb881277b5aa55`
- **Acceptance session:** `docs/versions/V7/0.7.2.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, 2/2 tests PASS — Test 1 (normal online save unaffected) and Test 2 (the actual bug scenario: multiple sequential offline edits, all preserved through an offline reload and synced correctly on reconnect). Deliberately single-device scope; two-device offline validation remains deferred to `0.7.3`'s own Test F.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** unchanged from `0.7.2`'s own promotion — Firestore/Storage (`family-trips-9aef4`) is one shared backend for both `qa` and Production; no separate Production configuration involved. This correction is a pure client-side sequencing fix — no rules, no data-model change.

## Rollback command, if needed

To restore Production to the prior `0.7.2` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aa4f6175a330d9678e4bc3d"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.2-08d11fd8` again.

**Important:** this rollback is lower-risk than `0.7.2`'s own promotion rollback — `0.7.2.1` changes only `save()`'s internal write-sequencing, not the Firestore data model, security rules, or wire format. Rolling back to the pre-`0.7.2.1` client re-exposes the offline-data-loss bug this correction fixes, but does not put any already-synced data at risk and does not require a data migration or reconciliation step.
