# Beta 0.9.2 (Bingo) — PO decisions, 2026-10-22

1. **Photo storage path:** keep the path the build uses, `trips/{tripId}/sources/bingo_{theme}_{participantId}/{spotId}.jpg`. No `storage.rules` change. (Scope's `trips/{tripId}/games/...` path not used.)
2. **Bingo tag and category:** leave as is. Bingo is not tagged "בנסיעה"; the "בדרכים" category stays "בדרכים". (Interpretation: "leave it" = no change to the tag or the label. Confirm if meant otherwise.)
3. **Winner animation:** random per round from a pool. Which animations are in the pool does not matter to the PO.

## Round log (PO session)
- Build check (Settings → אודות shows `0.9.2-e03d0d3d`): PASS (screenshot, 2026-10-22 22:41).
- Test 2, catalog (four games, no "ציד תמונות", Bingo titled "בינגו לפי מקום"): PASS (PO: "pass", 22:41).

- Test 3, Bingo board (screenshot 22:44): a hotel-theme 4x4 board opens, 16 cells with camera icons and labels, "0/16 נמצאו", participant chips at the top, and the theme and "איפוס הלוח" controls. PASS (PO: "pass", 22:44). The picker tiles were not visible in the screenshot. The "בדרכים" and "מסעדות" tiles have not been checked yet.

- Test 3, step 2 (picker tiles, screenshot 22:49): six tiles shown: שדה תעופה, חוף, עיר, מלון (currently selected), מסעדות, בדרכים. PASS from evidence: the "בדרכים" and "מסעדות" tiles are present, and "ציד תמונות" is not in the picker. The selected tile is highlighted.

- Test 4 (first board on a new theme, screenshot 22:50): beach ("חוף") 4x4 board opens with 16 cells, participant chips at the top (אייל selected), and "0/16 נמצאו". PASS (PO: "pass", 22:50). The participant switch to a second participant and the different layout were not shown in the screenshot. Follow-up (PO, 22:52): "I can switch between users, and the board changes". Switching participants works and the board changes; PASS for that part.

## New location requests (PO, 22:49, planning items, not in this build)
- Add two location themes to Bingo: **Nature** (טבע) and **ZOO** (גן חיות). Each needs its own 16-item pool, like the existing four. The item content for both is not drafted yet.

- Test 5, photo to found cell: PASS (PO: "test 5 passes", 22:53).

## New request (PO, 22:53): enlarge a photo after it was taken
- Be able to open a found cell's photo at full size (enlarge). Design artifact: "Bingo photo enlarge view" (`39KUxtTJdDzZDy5jztQA9u`, version 3). PO: "looks good" (22:54).
- New, 22:54: an option to erase a photo. Added to the same artifact as "מחיקת תמונה" (confirm before delete; the cell returns to unfound and the file is deleted). Planning item, not in this build.
- Planning item, not in this build.

## Enlarge view update (PO, 2026-10-22 22:57)
- PO: remove the instructions from the artboard and make the buttons smaller so the photo is larger. Done in version 4: instruction text removed, buttons at 36px height and 13px text.
- Erase behaviour moved here from the artboard (still the spec): "מחיקת תמונה" returns the cell to unfound and deletes the file permanently, after confirmation. Planning item, not in build 0.9.2-e03d0d3d.

## P92-F1 — suggested game on Today cannot be opened directly (PO, 2026-10-22 22:55 screenshot)
- Today screen shows the suggested game "טריוויה על היעד" with a "כל המשחקים" button. The suggested game cannot be opened from Today. The only route is the games screen, where it can be selected.
- Severity: non-blocking (the game is reachable through the games screen). Disposition proposed: fix so the suggestion opens its game directly, then re-test. PO to confirm whether it blocks GO.
- Build is not shown in the screenshot. Assumed 0.9.2-e03d0d3d; PO to confirm.
- PO (2026-10-22 23:01): "non-blocking". Severity confirmed as non-blocking.
- Enlarge view design (artifact 39KUxtTJdDzZDy5jztQA9u), approved by PO (2026-10-22 23:04, "good") at version 7: instructions removed, "החלפת תמונה" and "מחיקת תמונה" side by side in one row, 28px high, 12px text. Planning item, not in build 0.9.2-e03d0d3d. Note: the 28px buttons are below the 44px touch-target guideline; PO accepted this for the design.

## Test 6 — row/column completion animation (PO, 2026-10-22 23:05)
- PO: "pass". Row/column completion animation checked on build 0.9.2-e03d0d3d.
- PO: "there is no animation in diagonal". Not a finding: the scope and kickoff say rows and columns only, no diagonals (kickoff section 7; scope "Winner animation — every game"). Diagonal completion is not expected to animate. PO to confirm if diagonals should fire in a later build (planning item, not in 0.9.2).
- Not recorded from this test: which of the four animation directions played, and whether the participant's name showed in the middle. PO did not say.
- Still open: reduced motion, failed or offline upload, real camera sheet, four animations at full size on a phone.

## Test 8 — offline photo (PO screenshot, 2026-10-22 23:07, airplane mode)
- Screenshot: the top bar says exit is available only when connected, and the local session is kept. A toast reads "צילום ללוח דורש חיבור לאינטרנט" (taking a photo for the board needs an internet connection). The board still shows 1/16 found.
- PO (23:10): "pass". Result: PASS. The message is clear and the cell count did not change.
- New PO request (planning, not in build 0.9.2-e03d0d3d): "I would like to have an option to save pictures locally, so it can be played offline." Scope impact: photos would need to be kept on the device, not only in Storage. Not scoped yet.

## Test 10 — camera on an unfound cell (PO, 2026-10-22 23:11)
- PO: "it directly opens the camera". No photo-choice sheet appears; tapping an unfound cell goes straight to the camera.
- PO (23:12): "yes, camera only its a pass". Result: PASS (camera only, no choice sheet).

## Round closed — GO/NO-GO decision (PO, 2026-10-22 23:14)
- **NO-GO** on build `0.9.2-e03d0d3d` (qa only, not promoted). PO: "close this round, no-go, we will fix the findings".
- Open findings to fix before a re-test: P92-F1 (suggested game on Today cannot be opened directly; non-blocking by severity, fixed as part of this round's NO-GO).
- Planning items, not defects: offline play (save photos on the device; PO will change the app so it can be played offline), enlarge and erase photo view (approved design, version 7), Nature and ZOO themes, diagonal animation (not in scope, PO to confirm).
- Test results this round: Build check PASS; Test 2 catalog PASS; Test 3 board PASS (picker tiles PASS by evidence); Test 4 beach board PASS, participant switch PASS; Test 5 photo to found cell PASS; Test 6 row/column animation PASS; Test 7 full-board completion PASS; Test 8 offline message PASS; Test 10 camera only PASS.
- Skipped by PO: Test 9 reduced motion; Test 11 failed upload.
- Not run: four winner animations at full size on a phone (not requested this round). 0.9.2 QA summary not received from dev side.

## Test 11 — failed upload: SKIPPED by PO (2026-10-22 23:13, "will not be tested, we will change that it can be played offline"). Not run, no result recorded. Related to the offline planning request (Test 8 note).

## Test 9 — reduced motion: SKIPPED by PO (2026-10-22 23:10, "this will not be tested"). Not run, no result recorded.

## Test 7 — full-board completion (PO, 2026-10-22 23:06)
- PO: "pass". Full board completed on the same participant's board, build 0.9.2-e03d0d3d.
- Not recorded from this test: whether the bigger celebration played, which animation direction, and whether the participant's name showed in the middle. PO gave only "pass", so these are not logged as confirmed.

Build: `0.9.2-e03d0d3d` on `qa`, not promoted. Report: `docs/versions/V7/0.9.2/IMPLEMENTATION_REPORT_V1.md` (repo).
