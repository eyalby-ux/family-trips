# Beta 0.9.3 — closing summary for the Planning Agent

**Status:** `0.9.3` is **live in Production** — build `0.9.3-3a11a6d1`, deploy `6aef3153a75d6afbb1dbb825`, promoted 2026-11-07 on the Product Owner's explicit instruction (previous Production: `0.9.2-87f38cd2`, deploy `6ada7e0e164d9d6e79ebde45`). Verified by fresh fetches: build id, 11/11 files byte-identical to the QA-accepted `dist/`, both functions refuse unauthenticated calls (HTTP 401). Rollback record: `production-promotion-backup-20261107-151415/ROLLBACK_RECORD.md` (commits `cca194a`, `bbd2da7`). Branch `version/V7`; build commit `3a11a6d`; final QA verdict: `QA_RESULTS_0_9_3_FINAL.md` (all PASS, no blocking finding). Suite: `tests/beta-0-9-3.mjs` 23 tests, full gate (`npm run check`) green.

## What shipped (in the order it was built)
1. **Pantomime** (`game-pantomime`) — an AI-built deck per trip (destination-only content; one daily AI call per build), look-away screen → private reveal → "who guessed" scoring, `דילוג`, tally with medals, "שחקו שוב" free of AI. Phrases: kid-friendly, **no place names, no specific named foods/items** (prompt guards; the trip's own destination is also dropped by a hard rule).
2. **מזכיר לי** (`game-remind-me`) — a free-form activity page with an optional **smart start** (a word *or* a real song, one mode per AI call, mode and suggestions remembered, last 10 per mode sent as an exclusion list). **Song links (P93-P5):** Spotify and YouTube buttons that open a *search* for title and artist — the app builds the link, the AI never does. Instructions text replaced by the PO's final wording (existing trips updated once).
3. **New-user onboarding** — a genuinely first-time account sees two starting paths (upload the first document / add dates and destination); returning users unchanged. QA passed it with a brand-new account.
4. **Winner animation plays twice** at the end of a Trivia round and a Pantomime game (Bingo's celebrations stay single).
5. **Sync fix (pre-existing bug found here):** a built-in game that is *new* to a trip was never created in Firestore, so its first edit failed with "No document to update". Fixed with a correct sync baseline; the old `ציד תמונות` / `מי אני?` documents are deleted on each trip's first save.
6. **PO decisions after the first QA round** (all built, all QA-passed):
   - **P93-P1** actor rule: first lap a random order of the players, then **the same order repeats** (A B C A B C) — replaces "random, never twice in a row". The order is saved, so a reload never changes who acts.
   - **P93-P2/P3** rounds: **1–5 rounds per player** (default 2); a game has players × rounds turns; a build asks the AI for as many phrases as needed (12–40; the function clamps a client-requested count).
   - **P93-P4** choose who plays, from the PO's design (Option 2: two entry rows on the game page → sub-page "משתתפים וסיבובים").
   - **P93-P6** the same participant choice for **Bingo** (no number option) and **Trivia** (plus **5 / 10 / 15 / 20 questions**, default 10). 20 שאלות and מזכיר לי are deliberately excluded (PO).
   - **P93-P7 / F4** on the sub-page, when the saved deck is smaller than the chosen number: an explanation line and **"שמירה ובניית משחק חדש"** (saves, then rebuilds); otherwise "שמירה". **"שמירה והתחלה" was removed** — the sub-page never starts a game.
   - **R-4 wording** (final, PO): "N משתתפים × N תורות לכל משתתף = סה"כ T סיבובים למשחק"; one round: "… × **תור 1** לכל משתתף = …". Vocabulary: **משחק** = game, **סיבוב** = one round = one phrase, **תור** = one player's turn.
   - **P93-F3** trip deletion: only the **Owner** can delete a trip (the rules always said so; the app used to erase the content *first* and then fail, claiming "nothing changed"). A non-owner now sees a note instead of the button; per the PO (14:16) a non-owner **may still erase the trip's data**.
   - Small PO copy fixes: the look-away screen reads "כל השאר, תביטו לכיוון אחר!"; generic places ("שוק צף") are fine in phrases, proper names are not.

## Backend / data notes
- **No `firestore.rules` / `storage.rules` change.** `netlify/functions/game-content.mjs` gained the `generate_pantomime` operation, a single-mode `generate_remind_me_start` branch, and a clamped client `count` (Pantomime 6–40, Trivia 5–20); shared engine in `_shared/game-content.mjs` (same repeat-prevention as Trivia).
- New per-game fields (`playerIds`, `roundsPerPlayer`, `questionCount`, `deck`, `askedPhrases`, `pantomimeState`, `remindMeMode`, `smartStart`, `askedStarts`) live in each game's own Firestore document; **no migration** — a trip without them means "everybody plays / Trivia 10 / Pantomime 2 rounds". New built-in ids reach saved trips by the existing push-if-missing logic.
- **AI quota:** each build / rebuild / "get a suggestion" / "replace" is one of the 10 daily shared calls (with document scanning and Trivia). Playing, "שחקו שוב", mode switches back to a saved suggestion and offline play cost nothing.

## Known limits (accepted, documented to QA)
- **Song accuracy is prompt-only** (PO decision: no external verification, no curated list); the caption under a song says so, and the links search by title/artist so an invented song simply finds nothing.
- The food / item / place-name rules for Pantomime are prompt-level guards; a rare slip is possible.
- Cosmetic: "1 משתתפים" in Pantomime's summary line while fewer than two are ticked (the start button is disabled then). The design mock-up's sub-line read "4 מתוך 5 **משחקים**" — built as "משתתפים" (likely a typo; not reported by QA).
- Reduce motion was **removed from the test list at the PO's request** — never tested for this version's animation and sub-pages.
- Not exercised live by the developer: a Trivia rebuild at 15/20 questions (QA passed it), a real phone (QA used Android screenshots), opening the Spotify / YouTube pages themselves.

## Open items for planning
1. **The roadmap was not updated by development.** `docs/roadmap/MVP_DELIVERY_PLAN_CURRENT_STATE.md` is still at `V182` and does not yet record: `0.9.3` closed and in Production; the PO decisions P93-P1…P7, F3, F4, R-4 above; the vocabulary משחק / סיבוב / תור; that `0.9.3` grew from the planned Pantomime + מזכיר לי + onboarding + double animation into a participants-and-rounds setup used by three games. The remaining Beta 0.9 candidates (per `V174`) and the carried backlog (diagonal Bingo celebrations, the Nature / ZOO item-list review) are untouched.
2. **GitHub is behind.** Every commit since `3651e52` (the whole second-to-final cycle, QA's documents and the promotion record, through `bbd2da7` plus any later QA commit) exists **only on the owner's machine**: pushes from the QA sandbox are refused with HTTP 403 by the proxy and must be done by the owner (`git push origin HEAD`). Those refused attempts also left an empty `.git/HEAD.lock` four times, which blocks local commits until deleted (done each time with the owner's approval).
3. **Possible follow-ups the PO may want to decide:** whether a non-owner Editor should keep the right to erase a shared trip's data; whether the participant choice should ever extend to 20 שאלות / מזכיר לי (currently "not needed"); the "1 משתתפים" glitch and the "משחקים" mock-up wording.

## Process notes worth keeping
- **A live check caught what the wiring tests could not:** the Trivia and Bingo participant rows did nothing on the first deploy (the sub-page opened only for Pantomime) although every source-level test passed. Keep a live pass in the discipline for UI that is only reachable through clicks.
- Permission prompts were needed for two things only: promoting to Production (explicit instruction given) and deleting the stale git lock (asked each time).
- QA documents for this version: `QA_AGENT_SUMMARY_V1…V6.md` (briefs), `QA_RESULTS_0_9_3.md`, `…_BUILD2.md`, `…_BUILD3.md`, `…_FINAL.md`, `PO_DECISIONS_0_9_3.md` (full log); developer's: `IMPLEMENTATION_REPORT_V1.md`, `IMPLEMENTATION_REPORT_V2_NEXT_BUILD.md` (second to sixth builds).
