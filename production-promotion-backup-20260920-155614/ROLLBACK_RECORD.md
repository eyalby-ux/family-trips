# Production promotion rollback record — `0.7.3`

**Date:** 2026-09-20
**Action:** Promoting `0.7.3` (build `0.7.3-791b640c`) to Production, following the Product Owner's two-device acceptance-session GO (`docs/versions/V7/0.7.3/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all tests A–G plus the sync-status-visibility check PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.2.1-19ff2b6b`
- **Deploy ID:** `6aa98f6ebdad7a22ba042864`
- **Deployed:** 2026-09-15T18:33:18.254Z (`0.7.2.1` promotion)
- **Commit:** `19ff2b6` (implementation)
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.2.1-19ff2b6b`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.3-791b640c`
- **Candidate:** `0.7.3` — sync engine: field-level merge writes (`diffById`/`syncTripState`, closing the same-record/different-field silent-loss case), open-form buffering (a live remote update can no longer wipe an open, unsubmitted edit form), and a minimal pending-sync indicator extending the existing offline banner. Builds directly on `0.7.2.1`'s `save()` decoupling fix rather than reimplementing it.
- **Branch:** `version/V7`
- **Final implementation commit:** `791b640`; test session draft `9334918`; acceptance record `1c107d6`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6aa997a02329e47220ae89b8`
- **Acceptance session:** `docs/versions/V7/0.7.3/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 7 tests (A–G) plus the sync-status-visibility check PASS — a genuine two-device session (Account A Owner, Account B Editor) against the dedicated QA Test Trip. Directly validated: field-level merge under concurrent offline edits to different fields of the same record (Test D); an open unsubmitted form surviving a concurrent remote update (Test G); `0.7.2.1`'s offline-reload fix holding under this build (Test F); the pending-sync indicator's accuracy (visibility check).
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** unchanged from `0.7.2`/`0.7.2.1` — Firestore/Storage (`family-trips-9aef4`) is one shared backend for both `qa` and Production; no separate Production configuration involved. No security-rules or data-model change in this candidate — the field-level `updateDoc()` writes operate under the same existing rules as `0.7.2`'s whole-record `set()` writes did.
- **Non-blocking findings carried forward, not addressed by this promotion:** three pre-existing bugs found live by the Product Owner outside this session's own tests A–G (a Flight item's stale map link after editing its location, medium-high severity; a source row's "מנתח..." label not clearing after analysis finishes, cosmetic; a brief empty-trip flash on app load, cosmetic) — recorded in the acceptance session's finding register, target version not yet assigned.

## Rollback command, if needed

To restore Production to the prior `0.7.2.1` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aa98f6ebdad7a22ba042864"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.2.1-19ff2b6b` again.

**Important:** like `0.7.2.1`'s own rollback, this is lower-risk than `0.7.2`'s original promotion rollback — no data model or security-rules change, only client-side write/render logic. A rollback would re-expose the two bugs `0.7.3` fixes (silent field-level data loss on same-record/different-field concurrent edits; an open form getting wiped by a concurrent remote update) but does not put any already-synced data at risk and requires no data migration or reconciliation step. One nuance worth noting: `0.7.3`'s records now carry `syncedAt`/`syncedByUid` attribution fields written by field-level `updateDoc()` calls — a rolled-back `0.7.2.1` client would simply ignore these extra fields (harmless) rather than error on them, since Firestore documents are schemaless and the pre-`0.7.3` client never reads or requires their absence.
