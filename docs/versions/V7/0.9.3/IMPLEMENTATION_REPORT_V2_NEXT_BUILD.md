# Beta 0.9.3 — second build (PO decisions from the QA round)

Source: `QA_RESULTS_0_9_3.md`, `PO_DECISIONS_0_9_3.md`. **Build:** `0.9.3-2c4327cb` (commit `2c4327c`) on `qa` only, deploy not promoted; Production runs `0.9.2-87f38cd2`. QA brief for this build: `QA_AGENT_SUMMARY_V2.md`.

| Item | What changed |
|---|---|
| P93-P1 actor rule | Replaced "random each round, never twice in a row" by a saved order: a random permutation of the active players is drawn once per game (`actorOrder`); round n is `actorOrder[(n-1) mod players]`. Round 1 random among all, then the rest one per round, then the same order repeats. The actor is derived from saved order + position, so reload cannot change it; a participant who left is skipped; a game saved before this build (no order) cycles the participants' own order. `pickActor`, `beginPantomimeRound`, `lastActorId/currentActorId/actorPosition` removed. |
| P93-P2/P3 rounds | New `roundsPerPlayer` on the game (1–5, default 2, synced with the game). Turns = active players × rounds (3×2 = 6). Picker on the game page. A new build requests `max(12, turns)` phrases (capped 40) — the Netlify Function now accepts a client `count` for Pantomime only, clamped 6–40 (`clampCount`); Trivia stays at 10. A game uses the first `turns` phrases of a shuffled deck (fewer if the deck is shorter, and the page says to rebuild). |
| Test 9 | מזכיר לי instructions replaced with the PO's exact text; a one-time backfill replaces the first draft on existing trips (a family's own edited text is kept). |
| P93-F1 | Pantomime prompt: generic foods/drinks/instruments/animals are welcome; a specific named dish, product, cheese or regional speciality is forbidden. Prompt-only guard (like place names). |

Tests: `tests/beta-0-9-3.mjs` (18) rewritten for the new rule — order is a permutation, 3 players × 2 rounds = A B C A B C, everyone acts exactly `rounds` times for 2–5 players × 1–5 rounds, clamps, wiring, text and backfill, prompt rule.

Not covered by the developer (still open from QA): onboarding with a brand-new account, reduce motion, phone check of songs, deletion of the QA throw-away trip.

## Live verification on qa (developer, 375px, QA Test Trip with 5 participants)
- Served bundle carries the picker and the new text, none of the old actor rule; the content function answers 401 unauthenticated.
- Picker 5/1/3: "5 משתתפים × R = T תורות", chips 38×44 px, no horizontal overflow; with a 12-phrase deck and 3 rounds the page says "לכל התורות צריך 15 — בנו מחדש".
- One rebuild (one AI call): 15 phrases for 5 × 3. A full game: 15 turns, actors A B C D E ×3 in the same order, end screen after turn 15, "ביטוי n/15".
- Phrases: no place names; foods generic (שוקו חם, סטייק, סלט טרי); "מניפים דגל כחול־לבן" names nothing but hints at a place — flagged for QA judgement. One deck is a small sample for P93-F1; QA re-checks.
- מזכיר לי page shows the PO text exactly (the QA trip held the first draft; the one-time update replaced it on load).
- Not exercised live: two participants, reload mid-round, second device, 360px (covered by unit tests only where noted: actor order from saved order+position, 2-player alternation, 2–5 players × 1–5 rounds).

## Third build `0.9.3-7b531008` (commit `7b53100`, qa only) — R-4 and P93-F3 from `QA_RESULTS_0_9_3_BUILD2.md`
| Item | What changed |
|---|---|
| R-4 | Summary line is now "N משתתפים × תור R לכל משתתף = סה"כ T סיבובים למשחק" (PO wording, 2026-11-05/06). |
| P93-F3 | Likely cause: the trip is "shared with me" (the account is an Editor); `firestore.rules` allows `delete` on a trip only to the Owner, while `resetCurrentTrip(true)` erased the content first and then failed on the trip document, reporting "nothing changed". Fix: a non-owner sees a note instead of the delete button and the handler throws before any deletion. Owner flow unchanged. **Unconfirmed live** (browser pane signed out); QA re-tests with an owned trip. |
| Not built | P93-P4 (participant selection Option 2a/2b), P93-P5 (Spotify / YouTube links), P93-P6 (participants in Bingo / Trivia, Trivia question count) — in planning; no scope document yet. |

Tests: `tests/beta-0-9-3.mjs` 19 (one new, F3). Full gate green. Brief: `QA_AGENT_SUMMARY_V3.md`.
