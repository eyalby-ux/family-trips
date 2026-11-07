# Production promotion rollback record — Beta `0.9.3.1` (erasing a trip's data is Owner-only)

**Date:** 2026-11-07
**Action:** Promoting Beta `0.9.3.1` (build `0.9.3.1-2a4890e4`) to Production on the Product Owner's explicit instruction in this session ("Yes, promote 0.9.3.1", after QA reported PASS in `QA_RESULTS_0_9_3_1.md`, commit `6061934`, which also records the PO's decision of 2026-11-07 17:08). Content: one correction — a non-owner Editor no longer sees the "מחיקת נתוני הטיול" button (a note instead) and the delete handler refuses a non-owner on both erase-data and delete-trip, before touching anything. Enforcement is **in the app only** (PO decision); `firestore.rules` is unchanged.

## Prior Production state (to be replaced)
- **Build identifier:** `0.9.3-3a11a6d1`
- **Deploy ID:** `6aef3153a75d6afbb1dbb825` (deployed 2026-11-07T14:10:44Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.9.3-3a11a6d1`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state
*(filled in after the deploy)*

## Rollback command, if needed
```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aef3153a75d6afbb1dbb825"}'
```
Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.9.3-3a11a6d1` again. Interface only; no data was changed by `0.9.3.1`, so a rollback leaves nothing behind (an Editor would again see the erase-data button on a shared trip).
