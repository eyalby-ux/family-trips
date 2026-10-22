# Production promotion rollback record — Beta `0.9.2` (Bingo, winner animation)

**Date:** 2026-10-23
**Action:** Promoting Beta `0.9.2` (build `0.9.2-87f38cd2`) to Production on the Product Owner's explicit instruction ("take 0.9.2 to production"), after the QA re-test (R1–R6 PASS, recorded in `QA_AGENT_SUMMARY_V2.md`, commit `184a14e`). Content: Bingo (eight places incl. טבע / גן חיות, per-participant 4x4 photo boards, offline photo saving and upload, enlarged photo with replace / erase, rear-camera viewfinder), the shared winner animation (Bingo completions, Trivia end of round), the Today game suggestion opening its game, `ציד תמונות` folded into Bingo.

## Prior Production state (to be replaced)
- **Build identifier:** `0.9.1-a44ba098`
- **Deploy ID:** `6ad76b2dc180c57dc89bf7da` (deployed 2026-10-20T13:23:10Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.9.1-a44ba098`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state
- **Build identifier:** `0.9.2-87f38cd2`
- **Deploy ID:** `6ada7e0e164d9d6e79ebde45` (context `production`, state `ready`)
- **Deployed:** 2026-10-22T21:20:25Z — `netlify deploy --dir dist --prod --no-build`, run by the Development Agent at the Product Owner's explicit instruction.
- **Verified (fresh cache-bypassed fetches):** `build-version` reads `0.9.2-87f38cd2`; all 11 files of `dist/` return HTTP 200 and are byte-identical to the local `dist/`; the service worker carries `0.9.2-87f38cd2`; both functions (`/api/familytrips-game-content`, `/api/familytrips-smart-import`) answer an unauthenticated POST with HTTP 401 (deployed and refusing without a Firebase token). **Not done:** no Bingo photo was taken on Production (it would write to real trips' Storage); the same code ran live on `qa`.
- **Artifact:** the exact, untouched `dist/` of the build accepted on `qa` (`qa` and `dist/` both read `0.9.2-87f38cd2`; no source change since commit `87f38cd`; no rebuild). Build commit `87f38cd` on `version/V7`.
- **Backend:** no `firestore.rules` / `storage.rules` change and no function change (the `game-content` function from `0.9.1` is unchanged). Bingo photos use the existing Storage layout `trips/{tripId}/sources/bingo_{place}_{participant}/…`, which the current rules already allow.
- **Known, carried:** the Nature / ZOO item lists were not reviewed in a PO session; the Trivia end-of-round animation repeating twice moved to `0.9.3`; reduce-motion and failed-upload checks were skipped by the PO.

## Rollback command, if needed
```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ad76b2dc180c57dc89bf7da"}'
```
Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.9.1-a44ba098` again. Interface only. **Data notes:** (1) a trip that opened `0.9.2` has its saved `ציד תמונות` game removed (its star is not carried over) — after a rollback `0.9.1` simply re-adds the built-in one on load, without the star; (2) Bingo boards and photos taken in `0.9.2` stay in Firestore / Storage and are ignored by `0.9.1` (whose Bingo is only an activity page); (3) a photo taken offline in `0.9.2` and not yet uploaded exists only on that phone — rolling back does not upload it (the app would have to be reopened on `0.9.2` first).
