# Beta 0.9.3 — second build (PO decisions from the QA round)

Source: `QA_RESULTS_0_9_3.md`, `PO_DECISIONS_0_9_3.md`. Still qa only; Production runs 0.9.2.

| Item | What changed |
|---|---|
| P93-P1 actor rule | Replaced "random each round, never twice in a row" by a saved order: a random permutation of the active players is drawn once per game (`actorOrder`); round n is `actorOrder[(n-1) mod players]`. Round 1 random among all, then the rest one per round, then the same order repeats. The actor is derived from saved order + position, so reload cannot change it; a participant who left is skipped; a game saved before this build (no order) cycles the participants' own order. `pickActor`, `beginPantomimeRound`, `lastActorId/currentActorId/actorPosition` removed. |
| P93-P2/P3 rounds | New `roundsPerPlayer` on the game (1–5, default 2, synced with the game). Turns = active players × rounds (3×2 = 6). Picker on the game page. A new build requests `max(12, turns)` phrases (capped 40) — the Netlify Function now accepts a client `count` for Pantomime only, clamped 6–40 (`clampCount`); Trivia stays at 10. A game uses the first `turns` phrases of a shuffled deck (fewer if the deck is shorter, and the page says to rebuild). |
| Test 9 | מזכיר לי instructions replaced with the PO's exact text; a one-time backfill replaces the first draft on existing trips (a family's own edited text is kept). |
| P93-F1 | Pantomime prompt: generic foods/drinks/instruments/animals are welcome; a specific named dish, product, cheese or regional speciality is forbidden. Prompt-only guard (like place names). |

Tests: `tests/beta-0-9-3.mjs` (18) rewritten for the new rule — order is a permutation, 3 players × 2 rounds = A B C A B C, everyone acts exactly `rounds` times for 2–5 players × 1–5 rounds, clamps, wiring, text and backfill, prompt rule.

Not covered by the developer (still open from QA): onboarding with a brand-new account, reduce motion, phone check of songs, deletion of the QA throw-away trip.
