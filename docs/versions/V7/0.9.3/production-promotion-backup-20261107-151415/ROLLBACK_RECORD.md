# Production promotion rollback record — Beta `0.9.3` (Pantomime, מזכיר לי, onboarding, participants and rounds)

**Date:** 2026-11-07
**Action:** Promoting Beta `0.9.3` (build `0.9.3-3a11a6d1`) to Production on the Product Owner's explicit instruction ("promote 0.9.3 to production"), after the QA run recorded in `QA_RESULTS_0_9_3_FINAL.md` (all tests PASS, findings P93-F3 / P93-F4 / R-4 / the 360px title closed; commit `9476664`). Content: **Pantomime** (AI deck per trip, automatic actor in a fixed cycling order, 1–5 rounds per player, choose who plays), **מזכיר לי** (word / song smart start with real-song prompt, Spotify / YouTube search links, final instructions text), **new-user onboarding** (two starting paths), the **winner animation twice** (Trivia, Pantomime), **participants selection** for Bingo / Trivia / Pantomime and **Trivia question count** (5/10/15/20), the shared setup sub-page with the rebuild path, trip deletion refused for a non-owner, and the **sync fix** (a built-in game new to a trip is created in Firestore; the old `ציד תמונות` / `מי אני?` documents are deleted on each trip's first save).

## Prior Production state (to be replaced)
- **Build identifier:** `0.9.2-87f38cd2`
- **Deploy ID:** `6ada7e0e164d9d6e79ebde45` (deployed 2026-10-22T21:20:25Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.9.2-87f38cd2`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state
*(filled in after the deploy)*

## Rollback command, if needed
```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ada7e0e164d9d6e79ebde45"}'
```
Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.9.2-87f38cd2` again. Interface only. **Data notes:** (1) the new games `game-pantomime` and `game-remind-me` created in a trip's Firestore stay there and are ignored by `0.9.2`, which re-adds nothing for them (they are absent from its built-in list); (2) the new fields on existing games (`playerIds`, `roundsPerPlayer`, `questionCount`) are ignored by `0.9.2`; (3) the first save in `0.9.3` deletes the old `ציד תמונות` / `מי אני?` documents of that trip — `0.9.2` does not bring them back (it already folds them into Bingo / removes them); (4) a Trivia deck of 5–20 questions built in `0.9.3` plays normally in `0.9.2`, which shows and plays the whole deck.
