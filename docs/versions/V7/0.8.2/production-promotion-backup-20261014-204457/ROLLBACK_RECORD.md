# Production promotion rollback record — Beta `0.8.2`

**Date:** 2026-10-14
**Action:** Promoting Beta `0.8.2` (build `0.8.2-0f740d93`) to Production on the Product Owner's explicit instruction ("promote 0.8.2"), after the PO accepted the fix on `qa` (`docs/versions/V7/0.8.2/PO_SESSION_RESULTS_V1.md`). Content: one correction, `P81-F1` (a Failed document on an item page keeps "נסה שוב" / "מחק" in its "⋯" menu).

## Prior Production state (replaced)

- **Build identifier:** `0.8.1-0ceea747`
- **Deploy ID:** `6acfaf9401c95aa749502d67` (deployed 2026-10-14T16:36:46Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.8.1-0ceea747`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state

*(filled in after the deploy — see the commit that follows this one)*

- **Artifact:** the exact, untouched `dist/` of the build accepted on `qa` (`qa` and `dist/` both read `0.8.2-0f740d93`; no rebuild). Build commit `0f740d9` on `version/V7`.
- **Rules note:** no `firestore.rules` / `storage.rules` change; client-side rendering only.

## Rollback command, if needed

```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6acfaf9401c95aa749502d67"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.8.1-0ceea747` again. Interface-only; no data is affected.
