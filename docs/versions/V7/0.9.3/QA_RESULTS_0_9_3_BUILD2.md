# Beta 0.9.3, second build — QA results for the Development Agent

Date: 2026-11-07. Build tested: `0.9.3-2c4327cb` on `qa` (not promoted; Production runs `0.9.2-87f38cd2`).
Brief: `docs/versions/V7/0.9.3/QA_AGENT_SUMMARY_V2.md`. Full decision and test log: `PO_DECISIONS_0_9_3.md` (same folder).
Reduce motion was removed from the test list at the PO's request (2026-11-07 09:37): not tested.

## Summary

Most of the second-build checks pass. One check fails on wording (R-4), and one defect is open (P93-F3, trip deletion, Medium). Onboarding was not run, since it needs a brand-new Google account. Several new change requests are logged for the next build.

## 0.9.3 features and status

| Feature | Status in build `0.9.3-2c4327cb` |
|---|---|
| Pantomime: in the catalog and detail, build with a destination, no build without a destination | PASS (earlier build) |
| Pantomime: phrase content, no named foods, no place names (P93-F1) | PASS on the rebuilt deck (R-5) |
| Pantomime: actor order (P93-P1): first lap random, then the same order | PASS (R-2) |
| Pantomime: rounds picker, 1 to 5, default 2 (P93-P2, P93-P3) | PASS (R-1, R-3, R-8, R-9); summary line wording FAIL (R-4) |
| Pantomime: deck size = players × rounds (15 for 3 rounds × 5 players) | PASS (count) |
| Pantomime: two players alternate strictly | PASS (R-10) |
| Pantomime: changing rounds mid-game keeps the game in progress | PASS (R-7) |
| מזכיר לי: "התחלה חכמה" card, modes מילים and שירים | PASS (Test 10) |
| מזכיר לי: song suggestions are real (checked) | PASS (existence); layout PASS |
| מזכיר לי: mode switch back to a saved word, no palm | PASS |
| מזכיר לי: offline replace refused | PASS |
| מזכיר לי: instructions text | PASS (R-6) |
| Trivia: end-of-round animation plays twice, winner's name in the middle | PASS |
| New-user onboarding (brand-new Google account) | NOT RUN (PO cannot test now) |
| Reduce motion | Removed from the test list (PO request) |

## Designs (for the Development Agent)

These design artifacts are the approved or chosen direction. Build from them.

| Design | Reference | Status |
|---|---|---|
| Pantomime setup: participants and rounds | Design artifact "Pantomime setup — participants and rounds", id `THRKB9EoJzZJVHtJBDX376` (version 2) | Planning. Participants chosen from the trip list (default all selected); rounds 1 to 5 per player, default 2; summary line uses the agreed wording; start disabled below 2 participants. |
| Pantomime participant selection: two options | Design canvas id `M6RbK8RyX3FyjJhwM3HrvY` (version 2): Option 1 (inline on the instructions page), Option 2a (entry rows on the instructions page), Option 2b (sub-page with participants and rounds) | **Option 2 chosen by the PO (2026-11-07 09:15).** Build Option 2a + Option 2b. Option 1 is not built. |
| Bingo enlarge view (picture view with the buttons "החלפת תמונה" and "מחיקת תמונה") | Design artifact id `39KUxtTJdDzZDy5jztQA9u` (version 7) | Approved ("good") in 0.9.2. Not part of 0.9.3; listed here for reference. |

Option 2 in short: the Pantomime instructions page shows two entry rows, "מתאים ל… / משתתפים" and "כמה סיבובים לכל משתתף", each showing the current value ("4 מתוך 5 משחקים" and "2 — סה"כ 8 סיבובים"). Tapping an entry row opens the sub-page "משתתפים וסיבובים", which has the participant checklist, the "בחירת כולם" link, the rounds picker 1 to 5, the summary line, and the button "שמירה והתחלה". Start is disabled below 2 participants.

## Fail

**R-4 — the summary line wording.** The line still reads "5 משתתפים × 4 = 20 תורות במשחק". The agreed wording (PO, 2026-11-05 16:58 and 2026-11-06 07:25) is:
"N משתתפים × תור R לכל משתתף = סה"כ T סיבובים למשחק".
Example, 5 participants, 1 turn each: "5 משתתפים × תור 1 לכל משתתף = סה"כ 5 סיבובים למשחק".
Terms: משחק = game, סיבוב = one round = one phrase, תור = one player's turn.

## Open defect

**P93-F3 — trip deletion fails (Medium, PO decision 2026-11-07 09:30).** Deleting a whole trip ("מחיקת הטיול הנוכחי") fails after the confirmation dialog, with "מחיקת הנתונים נכשלה. לא בוצע שינוי." This happens after the trip's destinations were removed, and also after its data was erased first with "מחיקת נתוני הטיול". The PO's words: "the trip can't be erased", so the cause is not leftover data. The trip used was a throw-away trip ("טיול לצוקים"). Fix in the next build, then re-test trip deletion.

## Change requests for the next build (PO decisions)

1. **P93-P1 — actor rule (approved 2026-11-05 14:58):** first lap random, then the same order repeats. Built and passing (R-2).
2. **P93-P2 / P93-P3 — rounds:** built and passing, except the R-4 wording (above).
3. **P93-P4 — participant selection, Option 2 (chosen 2026-11-07 09:15):** see the Designs section. Planning, not built.
4. **P93-P5 — song links (PO decisions 2026-11-07 09:22):** the song suggestion card gets two links, Spotify and YouTube. Each opens a search for the title and artist. No AI-generated link. Planning, not built.
5. **P93-P6 — participant selection in other games (PO decisions 2026-11-07 09:33 and 09:34):**
   - Bingo: choose participants (no rounds option).
   - Trivia: choose participants, and the number of questions (5, 10, 15 or 20).
   - Not in scope: 20 questions and מזכיר לי.
   - Planning, not built.
6. **P93-P3 wording (R-4):** as above.

## Known limits

- Song accuracy is prompt-only (PO decision); the caption under a song says so.
- A rebuild uses one of the daily AI calls; playing and "שחקו שוב" cost nothing.
- The deck note "15 ביטויים מוכנים · לכל התורות צריך 20 — בנו מחדש" appears when the deck is smaller than the turns; a rebuild is needed.

## Not run

- **Onboarding with a brand-new Google account.** The PO cannot test it now.
- **Reduce motion.** Removed from the test list at the PO's request.
- **Throw-away trip deletion.** Blocked by P93-F3; to be re-tested after the fix.

## Where the full history is

`PO_DECISIONS_0_9_3.md` in this folder holds every test, verdict, observation, change request, and design link, in the order they happened.
