# Beta 0.9.2 (Bingo) — QA summary for the Development Agent

Date: 2026-10-22. Build tested: `0.9.2-e03d0d3d` on `qa` (not promoted). Result: **NO-GO** (Product Owner decision, 23:14). The PO wants all findings fixed, then a re-test.

Full round log: `PO_DECISIONS_0_9_2.md` (same folder).

## Findings to fix

| ID | Area | Severity | What happens | Expected | Disposition |
|---|---|---|---|---|---|
| P92-F1 | Today screen, suggested game | Non-blocking (PO confirmed 23:01) | The "הצעת משחק ליום" card (currently "טריוויה על היעד") cannot be opened from Today. The only route is the games screen, where the game can be selected. The card has a "כל המשחקים" button. | The suggested game opens directly from Today. | **Fix, then re-test.** |

Only one finding was raised in this round. The build number is assumed from the test log (the screenshot doesn't show it); the PO did not correct it.

## Test results (round of 2026-10-22)

| Test | Area | Result |
|---|---|---|
| Build check | Settings → אודות shows `0.9.2-e03d0d3d` | PASS |
| 2 | Catalog: four games, no "ציד תמונות", Bingo titled "בינגו לפי מקום" | PASS |
| 3 | Bingo board opens, 4x4, 16 cells, "0/16 נמצאו" | PASS |
| 3 (step 2) | Picker: "בדרכים" and "מסעדות" present, "ציד תמונות" absent | PASS (by evidence) |
| 4 | Beach board opens; participant switch changes the board | PASS |
| 5 | Photo fills a found cell | PASS |
| 6 | Row/column completion animation plays | PASS (diagonals do not animate: correct, rows and columns only) |
| 7 | Full-board completion | PASS (PO gave "pass" only; the bigger animation, direction and name were not confirmed) |
| 8 | Offline photo: clear message, cell stays unfound | PASS ("צילום ללוח דורש חיבור לאינטרנט") |
| 10 | Tapping an unfound cell opens the camera directly | PASS |
| 9 | Reduced motion | SKIPPED by PO |
| 11 | Failed upload | SKIPPED by PO (linked to the offline change) |
| — | Four winner animations at full size on a phone | NOT RUN |

## Planning items (not defects, not in build 0.9.2-e03d0d3d)

1. **Offline play.** The PO will change the app so Bingo can be played offline, including saving photos on the device. This affects the photo storage design (currently Firebase Storage only) and the "צילום ללוח דורש חיבור" behaviour seen in Test 8. Needs scope before it is built.
2. **Enlarge and erase photo view.** Design artifact `39KUxtTJdDzZDy5jztQA9u`, version 7, approved by the PO ("good"). Opens a found cell's photo full size, with "החלפת תמונה" (replace) and "מחיקת תמונה" (erase). Erase returns the cell to unfound and deletes the file permanently after confirmation. The buttons are 28px high, below the 44px touch-target guideline; the PO accepted this for the design.
3. **Nature (טבע) and ZOO (גן חיות) Bingo themes.** Each needs its own 16-item pool. The content is not drafted.
4. **Diagonal completion animation.** Not in scope (rows and columns only). PO to confirm whether diagonals should fire in a later build.

## Items for the Development Agent to note

- Photo display uses `getBytes()` through `downloadAttachment()`, as the kickoff requires (not `getDownloadURL()`). Not re-tested beyond Test 5.
- Photo storage path in the build is `trips/{tripId}/sources/bingo_{theme}_{participantId}/{spotId}.jpg`. The PO decided to keep it (no `storage.rules` change). Reset deletes the Storage photos.
- The Bingo winner animation should name the participant. The PO did not confirm this in Tests 6 or 7, so it is not yet verified.
- The 0.9.2 implementation summary (`docs/versions/V7/0.9.2/IMPLEMENTATION_REPORT_V1.md`) was not received at the time of this round.

## Next step

Fix P92-F1 in a new build (0.9.2 re-build), then re-run: Test 2 (catalog, if the build changes), Test 4 (Today screen path to the suggested game), and any test the PO asks to repeat. Tests 9 and 11, the offline change and the enlarge/erase feature are follow-ups, not part of this re-test, unless the PO adds them.
