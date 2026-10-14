# Production promotion rollback record — Beta `0.8.1`

**Date:** 2026-10-14
**Action:** Promoting Beta `0.8.1` (build `0.8.1-0ceea747`) to Production, following the Product Owner's acceptance-session GO (2026-10-14 19:05, `docs/versions/V7/0.8.1/PO_SESSION_RESULTS_V1.md`).

## Prior Production state (to be replaced)

- **Build identifier:** `0.8.0-phase3.2-24f0575f`
- **Deploy ID:** `6acd3625c1bf3a8da6b3cd18` (deployed 2026-10-12T19:34:13Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion — `build-version` read `0.8.0-phase3.2-24f0575f`; the deploy list shows this deploy as the current production deploy.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (filled in after the deploy)

- **Build identifier:** `0.8.1-0ceea747` — the exact, untouched `dist/` of the build accepted on `qa` (a fresh fetch of `qa` read `0.8.1-0ceea747` just before the promotion; no rebuild).
- **Branch / commit:** `version/V7`, build commit `0ceea74`; documents committed after it.
- **Rules note:** no `firestore.rules` / `storage.rules` change — client-side rendering and state logic only; same Firebase project, no schema migration. Document hard delete uses the existing delete paths.

## Rollback command, if needed

To restore Production to `0.8.0-phase3.2`:

```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6acd3625c1bf3a8da6b3cd18"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.8.0-phase3.2-24f0575f` again.

**Important:** a rollback only returns the interface. Data changed by `0.8.1` stays as it is: documents deleted with the new hard delete are gone (that is permanent by design), and links added with "קישור לפריט" remain on their items (the prior version simply ignores nothing new — `sourceIds` is an existing field).
