# Production promotion rollback record — Beta `0.9.1` (Trivia)

**Date:** 2026-10-20
**Action:** Promoting Beta `0.9.1` (build `0.9.1-a44ba098`) to Production on the Product Owner's explicit instruction ("promote 0.9.1"), after the retest GO on that build (`PHASE_0_9_1_RETEST_V2_LOG.md`, kept in the planning project; first session `PO_SESSION_RESULTS_V1.md`). Content: Trivia (AI-built per-trip deck, repeat prevention, explanation + "קרא עוד"), the games filter row as icons, "20 שאלות" and "מי אני?" merged into one game.

## Prior Production state (to be replaced)

- **Build identifier:** `0.8.2-0f740d93`
- **Deploy ID:** `6acfbfc5ea9a906b0986c08a` (deployed 2026-10-14T17:45:53Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.8.2-0f740d93`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state

- **Build identifier:** `0.9.1-a44ba098`
- **Deploy ID:** `6ad76b2dc180c57dc89bf7da` (context `production`, state `ready`)
- **Deployed:** 2026-10-20T13:23:10Z — `netlify deploy --dir dist --prod --no-build`, run by the Development Agent at the Product Owner's explicit instruction.
- **Verified (fresh cache-bypassed fetches):** `build-version` reads `0.9.1-a44ba098`; all 11 files of `dist/` return HTTP 200 and are byte-identical to the local `dist/`; the service worker carries `0.9.1-a44ba098`; the new function answers an unauthenticated POST to `/api/familytrips-game-content` with HTTP 401 (deployed and refusing without a Firebase token, not a 404 / SPA fallback). **Not done:** no AI build was run against Production (it would spend the PO's daily quota); the same code ran live on `qa`.

- **Artifact:** the exact, untouched `dist/` of the build accepted on `qa` (`qa` and `dist/` both read `0.9.1-a44ba098`; no rebuild). Build commit `a44ba09` on `version/V7`.
- **New backend piece:** the Netlify Function `game-content` (`/api/familytrips-game-content`) ships with this deploy — a sibling of `smart-import`, same auth, same daily quota pool (10/day), same audit log; it uses the site's existing OpenAI configuration. No `firestore.rules` / `storage.rules` change; no schema migration beyond additive game fields (backfilled on load) and the removal of the saved "מי אני?" game record.

## Rollback command, if needed

```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6acfbfc5ea9a906b0986c08a"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.8.2-0f740d93` again. Interface and functions only. **Data note:** a trip that opened `0.9.1` has its saved "מי אני?" game record removed (its ★ merged into "20 שאלות") and Trivia fields added to `game-thailand-trivia`; a rollback to `0.8.2` does not restore the removed record (the old version simply re-adds the built-in "מי אני?" on load, with no star) and ignores the new Trivia fields.
