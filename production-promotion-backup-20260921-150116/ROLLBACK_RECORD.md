# Production promotion rollback record — `0.7.4.1`

**Date:** 2026-09-21
**Action:** Promoting `0.7.4.1` (build `0.7.4.1-72557e8b`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.4.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all 4 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.4-fe61afe4`
- **Deploy ID:** `6ab0f695b7fae669084df1b5`
- **Deployed:** 2026-09-21T09:19:17.923Z (`0.7.4` promotion)
- **Commit:** `fe61afe` (implementation)
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.4-fe61afe4`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.4.1-72557e8b`
- **Candidate:** `0.7.4.1` — narrow correction removing a leftover duplicate free-text "participants" field from every item type's edit/create form, found live by the Product Owner during `0.7.4`'s own acceptance session (Test 9). Investigated before removing: the field was shared across all item types (not Hotel-specific), and Flight/Activity/Insurance items created via Smart Import genuinely carried real extracted names in it — but that data was always redundant with each type's own richer summary display, never itself shown anywhere. The fix also stops the edit-item-form's save path from ever silently overwriting whatever value already exists in that field, so any real existing data survives untouched.
- **Branch:** `version/V7`
- **Implementation commit:** `72557e8`; test session draft `25e515f`; acceptance record `38705c4`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab117c66b90b4158fee1942`
- **Acceptance session:** `docs/versions/V7/0.7.4.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 4 tests PASS. Test 3 (data-preservation retest on a pre-existing Flight/Activity item) was recorded as not independently verifiable — no such item existed on the QA Test Trip — and accepted on the Development Agent's own code-level evidence (a behavioral test confirming the save function never outputs the removed field's key) rather than block on a check with no test case to run.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** unchanged — no data-model or security-rules change in this correction, purely client-side form logic.
- **New gap logged during this session, deliberately unscoped:** Tasks are not linked to `0.7.4`'s participant system (their "owner" field is free text) — Product Owner will schedule this separately, not part of this correction.

## Rollback command, if needed

To restore Production to the prior `0.7.4` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab0f695b7fae669084df1b5"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.4-fe61afe4` again.

**Important:** low-risk rollback — no data model or security-rules change. A rollback would just bring back the leftover duplicate participants field on item edit forms; it puts no already-synced data at risk.
