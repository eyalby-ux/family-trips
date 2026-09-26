# Production promotion rollback record — `0.7.6`

**Date:** 2026-09-26
**Action:** Promoting `0.7.6` (build `0.7.6-9f63dadc`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.6/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all 5 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.5.1-0b2a2037`
- **Deploy ID:** `6ab418dd1c45e7fd93eadf2d`
- **Deployed:** 2026-09-23T18:22:21.199Z (`0.7.5.1` promotion)
- **Commit:** `0b2a203`
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.5.1-0b2a2037`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.6-9f63dadc`
- **Deploy ID:** `6ab78bb62cf8dc7924ae9a9f`
- **Deployed:** 2026-09-26T09:09:10.556Z — confirmed via fresh fetch of `https://familytripz.netlify.app/` immediately after: `build-version` reads `0.7.6-9f63dadc`. Netlify reported "0 files/0 functions uploaded" — byte-identical to the already-accepted `qa` artifact.
- **Candidate:** `0.7.6` — original-source cross-device sync. Design investigation's own headline finding: cross-device retrieval already worked before this candidate (`0.7.2`'s real Storage read/write, synced by `0.7.3`'s existing `sources` collection sync). Real scope narrowed to:
  - **`V7-F08` — orphaned Storage cleanup.** "Reset Trip data" and full Trip deletion now actually delete the Trip's Storage files, not just the Firestore `sources` records. Went through two real rounds of live debugging: round 1's `listAll()`-based sweep needed a Storage `list` rule that was never safely grantable at that path depth (and `listAll()` isn't recursive besides); round 2 abandoned it for reading each source's already-known `storagePath` directly from Firestore, needing no `list` permission at all.
  - **A copy-only message fix** — `openSource()`/`analyzeSavedSource()`'s stale "unavailable offline on this device" wording, which wrongly implied a per-device gap that cross-device retrieval already closes.
  - **Offline file upload fails clearly, not silently** — the design's own intent, but the first real acceptance test found it was a fully silent no-op instead. This took three further rounds to actually get right: round 3 fixed an unhandled promise rejection in `createLocalSource()`; round 4 found the fix was correct but invisible (no `render()` while the upload was in flight) and could be delayed minutes by the Storage SDK's own upload-retry window (fixed with an upfront `navigator.onLine` check); round 5 found round 4's now-visible busy spinner never cleared on failure (the null-source path wasn't closing the modal/routing away like every other exit does) and fixed that too.
- **Branch:** `version/V7`
- **Implementation commits:** `9c2f67d` (round 1, storage.rules `list` attempt, later reverted), `820c100` (round 2, real Storage-cleanup fix), `14ce6de` (round 3, offline-upload unhandled-rejection fix), `b625390` (round 4, `navigator.onLine` fast-fail + busy-render fix), `9f63dad` (round 5, modal-close-on-failure fix)
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab787b7bb2c6840f7e79c84`
- **Acceptance session:** `docs/versions/V7/0.7.6/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 5 tests PASS — Tests 2, 3, and 5 each needed real root-causing across this session (not accepted on a first-pass "looks fixed"); Test 3 was specifically re-verified on a genuinely fresh Trip before being closed as pre-existing debris rather than a real defect.
- **Artifact promoted:** the exact, untouched `dist/` built for the round-5 `qa` deploy (via Netlify CLI's own build emulation, which correctly injects the site's real environment variables — not a plain `npm run build`) — confirmed locally (`dist/index.html`'s own `build-version` meta reads `0.7.6-9f63dadc`, matching the live `qa` fetch) — no rebuild for this promotion.
- **`storage.rules` note:** byte-identical to Production's current published rules — round 1's `list` permission addition was fully reverted in round 2, confirmed via `git diff` at the time. **No Firebase Console action needed for this promotion.**
- **Shared backend note:** same Firebase project/Firestore/Storage bucket as `qa` (`family-trips-9aef4`) — no schema or rules migration for this promotion; every fix this candidate shipped is either a Firestore-record-driven read (`deleteAllAttachments` reading each source's own `storagePath`) or client-side control-flow (the `navigator.onLine` check, the `render()`/`route()` calls) — nothing server-side changed.
- **Process note, not a product finding:** mid-session, the actual QA Test Trip was accidentally permanently deleted during Test 3's first retest (a full-Trip delete run against it instead of a disposable Trip). The Product Owner confirmed this and created a new QA Test Trip. This only affected `qa`-side test data, not Production, and is not a defect in `0.7.6`.

## Rollback command, if needed

To restore Production to the prior `0.7.5.1` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab418dd1c45e7fd93eadf2d"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.5.1-0b2a2037` again.

**Important:** low-risk rollback — no data model or security-rules change (`storage.rules` is unchanged from Production's current state either way). A rollback would just bring back the orphaned-Storage-on-delete bug (`V7-F08`) and the silent offline-upload failure; it puts no already-synced data at risk.
