# Beta 0.9.3 — final QA results for the Development Agent

Date: 2026-11-07. Build tested: `0.9.3-3a11a6d1` on `qa` (not promoted; Production runs `0.9.2-87f38cd2`).
Full decision and test log: `PO_DECISIONS_0_9_3.md` (same folder).
Reduce motion was removed from the test list at the PO's request: not tested.

## Verdict

All QA tests for 0.9.3 pass on `0.9.3-3a11a6d1`, and the open findings are closed. Nothing is blocking the 0.9.3 build on the QA side. Promotion is the PO's decision.

## Results

| # | Check | Result |
|---|---|---|
| 1 | P93-P5 song card: Spotify and YouTube buttons, valid search links | PASS |
| 2 | P93-P6 Bingo: 2 of 5 chosen, carousel shows only those 2 | PASS |
| 3 | P93-P6 Trivia: 3 participants, 5 questions, 5 questions played, 3 chips, 3-row tally | PASS |
| 4 | Trivia: 15 questions with a 5-question deck shows the rebuild note | PASS |
| 5 | Pantomime summary line, 5 participants × 5 rounds | PASS (final wording below) |
| 6 | Pantomime entry rows and sub-page: back discards, "שמירה והתחלה" saves and starts | PASS as built |
| 7 | Pantomime: saved selection (2 participants) carries into the game | PASS |
| 8 | Song suggestion replaced; links follow the new song | PASS |
| 9 | Trivia rebuild: 20 questions, the game shows 20 ready questions | PASS |
| 10 | 360px sub-page titles (Pantomime "משתתפים וסיבובים") | PASS on this build (failed on 0.9.3-3f65090a; fixed) |
| 10b | Trivia sub-page title "משתתפים ושאלות" | PASS |
| 10c | Bingo sub-page title "משתתפים" | PASS |
| 11 | Second device shows the same Pantomime participants and rounds | PASS |
| 12 | Build check (Settings → אודות shows `0.9.3-3a11a6d1`); one-round line "תור 1" | PASS |
| — | P93-P7 rebuild path on Trivia (P93-F4) | PASS |
| — | P93-P7 rebuild path on Pantomime | PASS |
| — | P93-P7 rebuild path on Bingo | PASS |
| — | Onboarding with a brand-new account | PASS |
| — | Real phone | Covered by the Android phone screenshots of this build |
| — | Reduce motion | Removed from the test list (PO request) |

## Closed findings

- **P93-F3 (trip deletion, Medium):** owner deletion passes; a participant who is not the owner can erase only the trip's data (PO, 2026-11-07 14:16).
- **P93-F4 (Trivia rebuild path, Medium):** closed by P93-P7 (PASS on Trivia, Pantomime and Bingo).
- **R-4 (summary-line wording):** final wording below.
- **Sub-page title cut at 360px:** fixed in `0.9.3-3a11a6d1`.

## Final wording (PO, 2026-11-07 14:13; one round, 15:02)

- Two or more rounds: "N משתתפים × N תורות לכל משתתף = סה"כ T סיבובים למשחק" (example: "3 משתתפים × 3 תורות לכל משתתף = סה"כ 9 סיבובים למשחק").
- One round: "N משתתפים × תור 1 לכל משתתף = סה"כ N סיבובים למשחק" (example: "3 משתתפים × תור 1 לכל משתתף = סה"כ 3 סיבובים למשחק").

## Known limits (do not report as new)

- Spotify and YouTube open a search for title and artist, not the song itself (PO decision).
- Song accuracy is prompt-only; the caption under a song says so.
- A rebuild uses one of the daily AI calls; playing and "שחקו שוב" cost nothing.
- "1 משתתפים" in Pantomime's summary while fewer than two are ticked (earlier brief).

## Not run

- **Reduce motion:** removed from the test list by the PO.
- **Rebuilt deck size for Pantomime:** not described by the PO after the rebuild (the path itself passed).

## QA trip state at the end

- Bingo and Trivia: everyone (Trivia at 10 questions, per the restore plan).
- Pantomime: everyone, 5 rounds.
- מזכיר לי: left in its current mode (PO: "doesnt matter").
