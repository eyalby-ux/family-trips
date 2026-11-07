# Production promotion rollback record — Beta `0.9.3.1` (erasing a trip's data is Owner-only)

**Date:** 2026-11-07
**Action:** Promoting Beta `0.9.3.1` (build `0.9.3.1-2a4890e4`) to Production on the Product Owner's explicit instruction in this session ("Yes, promote 0.9.3.1", after QA reported PASS in `QA_RESULTS_0_9_3_1.md`, commit `6061934`, which also records the PO's decision of 2026-11-07 17:08). Content: one correction — a non-owner Editor no longer sees the "מחיקת נתוני הטיול" button (a note instead) and the delete handler refuses a non-owner on both erase-data and delete-trip, before touching anything. Enforcement is **in the app only** (PO decision); `firestore.rules` is unchanged.

## Prior Production state (to be replaced)
- **Build identifier:** `0.9.3-3a11a6d1`
- **Deploy ID:** `6aef3153a75d6afbb1dbb825` (deployed 2026-11-07T14:10:44Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.9.3-3a11a6d1`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state
- **Build identifier:** `0.9.3.1-2a4890e4`
- **Deploy ID:** `6aef3f4da7eb59ba81b6addd` (context `production`, state `ready`)
- **Deployed:** 2026-11-07T15:10:16Z — `netlify deploy --dir dist --prod --no-build`, run by the Development Agent after the Product Owner's explicit confirmation in this session.
- **Verified (fresh cache-bypassed fetches):** `build-version` reads `0.9.3.1-2a4890e4`; all 11 files of `dist/` return HTTP 200 and are byte-identical to the local `dist/` (identical=11, different=0); both functions answer an unauthenticated POST with HTTP 401. **Not done:** no real trip was opened or written on Production (the same code was verified live on `qa` by the developer and by QA).
- **Artifact:** the exact, untouched `dist/` of the build accepted on `qa` (`qa`, `dist/` and Production all read `0.9.3.1-2a4890e4`; no source change since commit `2a4890e`; no rebuild).
- **Backend:** no `firestore.rules` / `storage.rules` / function change.
- **Known, carried:** the Owner-only erase is an app gate only — `firestore.rules` still lets an Editor delete documents directly with a modified client (PO decision); the owner erase itself was not re-run on `0.9.3.1` by QA (it passed on `0.9.3`).

## Rollback command, if needed
```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aef3153a75d6afbb1dbb825"}'
```
Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.9.3-3a11a6d1` again. Interface only; no data was changed by `0.9.3.1`, so a rollback leaves nothing behind (an Editor would again see the erase-data button on a shared trip).
