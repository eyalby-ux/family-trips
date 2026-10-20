# Beta 0.9.1 (Trivia) — PO session log (2026-10-20, build 0.9.1-9c7691fb, qa only)

| Test | Result | Notes |
|---|---|---|
| 1, part 1 — Catalog title "טריוויה על היעד" on the trips | PASS (PO: "Pass", 2026-10-20 13:47) | Trips checked: not recorded by PO. |
| 2, step 1 — first-build state on "תאילנד 2027": "עדיין לא נבנתה טריוויה לטיול הזה", description and facts, enabled "בנה טריוויה" (not tapped) | PASS (PO: "pass", 2026-10-20 13:52) | No build made; quota untouched. |
| 2, step 2 — building: palm, phrases, no overflow, success state (one AI call used) | PASS (PO: "pass", 2026-10-20 13:52) | Duration not given by PO. |
| 3, step 1 — content, first question displays | PASS for the first question (PO, 2026-10-20 13:53). Earlier, the PO reported "I can't switch between questions, there is no option"; that was before the reveal step. | |
| 5, step 1 — reveal, chips, "השאלה הבאה" (PO reached the next question) | PASS (PO: "pass", 2026-10-20 13:58) | Explanation, "קראו עוד" link and chips not described one by one by the PO. |
| 5, step 2 — explanation and "קראו עוד" Wikipedia search link | PASS (PO: "pass", 2026-10-20 13:59) | |
| 6 — end screen: tally, medals, "שחקו שוב" with no AI call | PASS (PO: "pass", 2026-10-20 14:57) | Details not described by PO. |
| 9 — persistence: "המשך משחק" after closing and reopening, question and score kept | PASS (PO: "pass", 2026-10-20 14:59) | |
| 8 — offline: play works, "בנה טריוויה מחדש" gives a clear message, deck unchanged | PASS (PO: "pass", 2026-10-20 15:08) | PO did not say whether the offline build used a daily AI call. Not asked; the message is treated as the PO's verdict. |
| 10 — no destination: build disabled with hint; enabled after adding a destination | PASS (PO: "pass", 2026-10-20 15:09) | The throw-away trip: PO did not confirm it was deleted. |
| 11 — regression: other five games, Documents, Tasks as in 0.8.2 | PASS (PO: "other issues works as 0.8.2", 2026-10-20 15:14) | Scanning a document not run (quota). |
| 7 — rebuilds: decks compared for repeats, confirmation when rebuilding mid-game | PASS (PO: "it passed - no repeated questions in the 2 rounds I made", 2026-10-20 15:57) | "2 repeats" in the PO's earlier message meant 2 rebuild rounds, not 2 repeated questions. Confirmation when rebuilding mid-game not separately recorded. |
| 4 — content: rest of the deck (Hebrew, kid-friendly, Spain places/culture/daily life, trip items, no dates or stats, no answer given away) | PASS (PO: "pass", 2026-10-20 15:57) | No questions quoted as wrong. |
| 1, part 2 — filter row on one line, star filter | CHANGE REQUESTED (P91-F1) | PO wants icons in the row instead of text for three of the filters. Test 1 part 2 is re-run after the change. |

## Findings (P91-F#)
| # | Severity | Disposition | Description |
|---|---|---|---|
| P91-F1 | Non-blocking, PO request (design change) | Design artifact "Filter row icons — 0.9.1 catalog" (https://claude.ai/artifact/YYfFMnxKBMzrRUfefVKKF1). PO to confirm the proposal. | PO asks that the filter row use icons: "בנסיעה" → a car icon; "לכולם" → a group/family icon; "10 דקות" → a clock icon with the number 10 inside. Proposal drawn on one artboard; icons are inline stroke SVG (Tabler outline style, per spec §3). 2026-10-20 13:49: PO says the car is unclear; redrawn as a side view (version 4). 13:50: clock redrawn larger with a bold 10 (version 5). 13:51: group icon redrawn with three people (version 6). 13:51: PO: "good" — design approved. Not yet in the build; Test 1 part 2 re-test waits for the build with icons. |

| P91-F2 | Non-blocking (PO, 14:47: "its an HMI issue, non-blocking but will be fixed (no-go decision anyhow)"). PO decided the link text becomes "קרא עוד" (no answer repeated). | Fix in the next 0.9.1 build; re-test after the fix. | On the reveal screen (14:45, screenshot): the link reads "קראו עוד עלפסטיבל סן פרמין" with no space between "על" and the answer. PO also says the link repeats the answer that's already shown in the box above, on every question. The spec (Test 5) says "קראו עוד על <answer>", so the repeat is as designed, but PO may want different wording. |

| P91-F3 | DECIDED by PO (14:53): every round gets its own winner animation, the same rule for all games. Design artifact "Round winner animation — all games" (https://claude.ai/artifact/69oFf8howz7fZXtfnwNJbd) with four example directions (confetti, stars, pulsing medal, burst lines). Which of them (or others) go in the pool is still open. 14:56: winner's name added in the middle of each example (version 3); PO: "good". | Planning/scope item; not in 0.9.1 unless planning says so | At the end of a round, a short winner animation (confetti or similar). PO wants it to vary by game and by round, and to apply to all games. Conflicts with the scope document's default for Trivia and Pantomime endings ("stay restrained, no confetti"). Bingo already has its own celebration (for completed lines). |

## PO comments during Test 11 (regression), 2026-10-20 15:12 — planning items, not defects in 0.9.1
| # | PO's words (translated) | Planning note |
|---|---|---|
| P91-P1 | "ציד תמונות" should be part of Bingo, under "בדרכים" and "מסעדות" | Scope item. Today "ציד תמונות" is a separate built-in game (scope "Non-goals": it stays as it is). The PO wants it moved into Bingo, listed under the "בדרכים" and "מסעדות" categories. Interpretation to confirm with the PO: merge into Bingo, or only show Bingo under those categories. |
| P91-P2 | "20 שאלות" and "מי אני" should be combined | Scope item 7 ("Still open": the two are the same mechanic). The PO now asks for the merge, not just a note. Which name and which rules survive is to be decided. |

### PO decisions (15:14)
- **P91-P1 — DECIDED:** add the categories "בדרכים" and "מסעדות" under Bingo, and remove the separate "ציד תמונות" game.
- **Test 11 (regression):** PASS (PO: "other issues works as 0.8.2", 15:14). The five other games, Documents and Tasks behave as in 0.8.2.

## GO/NO-GO decision
- 2026-10-20 14:50 — **NO-GO** (Product Owner), build `0.9.1-9c7691fb`. The build will not go to Production. Recorded now; the decision is final once testing is finished.
- Required before a re-test: P91-F2 (link text "קרא עוד" and the missing space, non-blocking, fixed in the next build).
