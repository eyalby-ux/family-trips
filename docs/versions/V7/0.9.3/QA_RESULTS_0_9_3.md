# Beta 0.9.3 — QA results for the Development Agent

Date: 2026-11-05. Build tested: `0.9.3-c2889884` on `qa` (not promoted; Production runs `0.9.2-87f38cd2`).
Test brief: `docs/versions/V7/0.9.3/QA_AGENT_SUMMARY_V1.md`. Full log: `PO_DECISIONS_0_9_3.md` (same folder).

## Result for this build

Most of the 0.9.3 checks pass on this build. Four items need a new build (the actor rule, the round-count changes, and the wording change). One finding is low severity and goes into the next round.

## Passed on this build

| Area | Check | Result |
|---|---|---|
| Pantomime | Catalog and detail: 2 ומעלה, 20 דקות, ללא ציוד, 12 ביטויים | PASS |
| Pantomime | No destination: build disabled, "לא נבנה" state | PASS |
| Pantomime | Build with a destination: loading, "הפנטומימה מוכנה", 12 phrases | PASS |
| Pantomime | Look-away screen: phrase hidden, "נבחר/ה אוטומטית להציג", final wording | PASS |
| Pantomime | Private reveal: "חקו בלי מילים:", phrase large, no timer, "הצגתי, עברו לניחוש" | PASS |
| Pantomime | Scoring: actor not among chips; tap counts the point; second tap takes it back | PASS |
| Pantomime | "ביטוי הבא" and "דילוג — לא ניחשו" | PASS |
| Pantomime | End of the deck: tally and winner animation | PASS |
| Pantomime | Resume mid-round: same actor, phrase still hidden after reopening | PASS |
| Pantomime | Cloud save: deck still there after reload and on a second phone | PASS |
| מזכיר לי | "התחלה חכמה" card: two mode tiles, one-suggestion note, "התחל פעילות" | PASS |
| מזכיר לי | Song suggestion: layout and AI caption | PASS |
| מזכיר לי | Switch back to a saved word: instant, no palm | PASS |
| מזכיר לי | Replace while offline: refused | PASS |
| Animation | Trivia end of round plays twice; name shown in the middle; timing OK | PASS |

## Changes for the next build (not built yet)

1. **P93-P1 — actor rule (approved by the PO, 2026-11-05 14:58).** Round 1 is random among all players. Each following round takes the remaining players at random, one per round, until everyone has acted once. From the next round on, the same order repeats. Example, 3 players: round 1 random from 3, round 2 random from the remaining 2, round 3 the last player, round 4 the first player again, and so on. This replaces the rule in the summary ("random each round, never twice in a row").
2. **P93-P2 — the number of rounds depends on the number of players.**
3. **P93-P3 — the organiser selects 1 to 5 rounds per player.** Total turns = players × rounds per player (confirmed by the PO, 2026-11-05 15:04). Example, 3 players × 2 rounds = 6 turns.
4. **Test 9 — "מזכיר לי" instructions text (PO decision, 2026-11-05 15:20).** Replace the text with this:
   "שני אופנים לשחק: (1) מילים — משתתף ראשון אומר מילה, הבא אומר מילה שמזכירה לו את הקודמת, וממשיכים כך סביב המשתתפים. (2) שירים — משתתף ראשון בוחר שיר ומשמיע אותו, הבא בוחר שיר שמזכיר לו את השיר הקודם (מילה דומה בשם השיר, נושא דומה או מילה דומה משיר) ומשמיע אותו, וממשיכים כך. אם כולם מסכימים, אפשר לדלג לשיר הבא לפני שנגמר השיר הנוכחי, או להמשיך להאזין עד הסוף."

## Low-severity finding for the next round

**P93-F1 — Pantomime phrases name specific foods (severity: low, PO decision).** Two phrases from the first deck named specific foods: "אוכל סופלקי חם" and "טעם גבינת פטה". The PO accepts generic foods (for example, cheese) and does not accept specific named foods. The PO reviewed the first deck, which was then rebuilt. **The rebuilt deck has not been reviewed for this rule.** The prompt should be tuned so phrases are generic and actable, and the rebuilt deck should then be checked again.

## Not run in this round

- **Onboarding (new-user screens).** Needs a Google account that has never had a trip. Not run.
- **Reduce motion.** Not run.
- **Song accuracy, phone check.** Three song suggestions were searched and found to be real: "Color Esperanza" (Diego Torres), "Todo Cambia" (Mercedes Sosa), and "Crimen" (Gustavo Cerati). The PO has not checked the songs on a phone.
- **Throw-away trip.** Created for the no-destination check. The PO did not confirm whether it was deleted.

## Notes

- The trip status "Completed" on the QA Test Trip is date-driven (the trip dates end on 1 November). Not a defect.
- The QA Test Trip has five participants (four chips after excluding the actor). The actor on that trip is Eyal.
