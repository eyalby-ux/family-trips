# Beta 0.9.3, build 0.9.3-3f65090a — QA results for the Development Agent

Date: 2026-11-07. Build tested: `0.9.3-3f65090a` on `qa` (not promoted; Production runs `0.9.2-87f38cd2`).
Brief followed: `docs/versions/V7/0.9.3/QA_AGENT_SUMMARY_V5.md`. Full decision and test log: `PO_DECISIONS_0_9_3.md` (same folder).
Reduce motion was removed from the test list at the PO's request (2026-11-07 09:37): not tested.

## Summary

Most of the build passes. Three items need work before this build can be promoted:

1. **P93-P7 (Medium, P93-F4):** the Trivia sub-page has no rebuild option when the saved deck is smaller than the selected number of questions, and "שמירה והתחלה" starts the game immediately with the existing questions. Build the rebuild path (see below) and re-test Test 9.
2. **Sub-page title cut off at 360px:** "משתתפים וסיבובים" (Pantomime) is cut at the end on a phone (Test 10). The Trivia and Bingo sub-page titles fit.
3. **Summary-line wording:** now fixed and passing (Test 5). Only confirm the final wording below stays in every game.

## Results

| # | Check | Result |
|---|---|---|
| 1 | P93-P5: song card shows "Spotify" and "YouTube" buttons, links are valid search pages | PASS |
| 2 | P93-P6 Bingo: 2 of 5 chosen, the carousel shows only those 2 | PASS |
| 3 | P93-P6 Trivia: 3 participants and 5 questions, plays 5 questions, 3 chips, 3-row tally | PASS |
| 4 | Trivia: 15 questions selected with a 5-question deck, the note "לכל השאלות צריך 15 — בנו מחדש" shows | PASS (see P93-P7 below) |
| 5 | Pantomime summary line, 5 participants × 5 rounds | PASS with the final wording (below) |
| 6 | Pantomime entry rows and sub-page: back arrow discards, "שמירה והתחלה" saves and starts | PASS as built (see P93-P7) |
| 7 | Pantomime: saved selection (2 participants) carries into the game, carousel shows only those 2 | PASS |
| 8 | Song suggestion replaced; the links follow the new song | PASS |
| 9 | Trivia rebuild at 15 questions | NOT COMPLETE: the rebuild option does not exist yet (P93-F4) |
| 10 | 360px: Pantomime sub-page title | FAIL: "משתתפים וסיבובים" is cut at the end |
| 10b | 360px: Trivia sub-page title "משתתפים ושאלות" | PASS |
| 10c | 360px: Bingo sub-page title "משתתפים" | PASS |
| 11 | Second device shows the same Pantomime participants and rounds | PASS |
| — | Onboarding with a brand-new account | PASS |
| — | Real phone | Covered by the Android phone screenshots of this build |
| — | Reduce motion | Removed from the test list (PO request) |

## Earlier open items, now closed

- **P93-F3 (trip deletion, Medium):** owner deletion passes ("טיול לצוקים" deleted). The non-owner check passes: a participant who is not the owner can erase only the trip's data, not the trip (PO report, 2026-11-07 14:16).
- **R-4 (summary-line wording):** the final wording is the one below.

## Final wording (PO, 2026-11-07 14:13)

The summary line for Pantomime, and every game that uses it, reads:

"N משתתפים × N תורות לכל משתתף = סה"כ T סיבובים למשחק"

Example, 3 participants and 3 rounds: "3 משתתפים × 3 תורות לכל משתתף = סה"כ 9 סיבובים למשחק".

Pantomime starts only with 2 or more participants, so the singular form is not reachable.

## Open: P93-P7 — rebuild path (Medium, P93-F4)

PO decision, 2026-11-07 14:09 ("confirm"): both options.

- **On the sub-page:** the button reads "שמירה" when the saved deck already matches the chosen count. It returns to the main page without building. When the count differs, the button reads "שמירה ובניית משחק חדש": it saves and builds the new game. A short line above the button explains the difference, for example "לכל השאלות צריך 15 — המשחק הנוכחי מכיל 5".
- **On the main page:** keep the "בנו מחדש" note, so the rebuild is reachable without reopening the sub-page.
- **Back arrow:** discards the change, as it does now.
- **"שמירה והתחלה":** remove it. It must not start a game with fewer questions than selected.

Apply it to Trivia first, then Pantomime and Bingo where relevant.

PO requirement, 14:23: when the number of existing questions is lower than the selected number, the page must offer a rebuild option.

Re-test after the fix: Test 9 (rebuild at 15 questions, then the game shows 15).

## Open: sub-page title at 360px (Test 10)

"משתתפים וסיבובים" on the Pantomime sub-page is cut at the end on a 360px-class phone. The header must wrap or shrink so the full title shows. Check the same header on all three sub-pages after the fix. Trivia ("משתתפים ושאלות") and Bingo ("משתתפים") already pass.

## Not run / not applicable

- **Reduce motion:** removed from the test list at the PO's request.
- **Throw-away trip deletion:** done (owner: passed; non-owner: passed).

## QA trip state

Not yet restored at the time of this summary. Before the next test round:
- Bingo and Trivia back to everyone, Trivia at 10 questions.
- מזכיר לי back to its previous mode (words or songs; the mode before the song check is unknown).
- Pantomime is on everyone with 5 rounds.

## Known limits (do not report as new)

- Spotify and YouTube open a search for title and artist, not the song itself (PO decision).
- Song accuracy is prompt-only; the caption under a song says so.
- A rebuild uses one of the daily AI calls; playing and "שחקו שוב" cost nothing.
