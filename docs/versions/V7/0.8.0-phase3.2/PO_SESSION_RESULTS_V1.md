# Beta 0.8 Phase 3.2 — PO session log (2026-10-12, build 0.8.0-phase3.2-9e609fba)

| Test | Result | Notes |
|---|---|---|
| T1 step 1 — Settings home list: three groups in order (הטיול הנוכחי / חשבון / כללי), no tab bar, rows with subtitles, red מחיקה row (P31-F1) | PASS | evidence `P32-T1_settings_home_list.png` |
| T1 step 2 — אודות shows the full build `0.8.0-phase3.2-9e609fba`; back arrow returns to the home list (P31-F1) | PASS | "pass" |
| T1 step 3 — all Settings sub-pages and back arrows (פרטי הטיול, משתתפים, שיתוף, הטיולים שלי, ניהול מערכת, אודות) (P31-F1) | PASS | "all the setting pages are good and also the back arrows" |
| T2 step 1 — Today: test item created. Screenshots show "היום בערב" (ניווט · אתר, two equal buttons, no phone, 23:00) and "מלון בערב" under "היום בתכנית" (ניווט · אתר · התקשרות, three equal buttons, phone 1736468481, 23:00) | (in progress) | evidence: PO screenshots of the Today screen |
| T2 step 2 — phone item row: three equal buttons, none crossing the divider; no-phone item: two equal buttons (P31-F2) | PASS | "both pass", with screenshot evidence |
| T2 — Today, overall | PASS | Test 2 complete. Test items to delete after the session (cleanup, not a test step) |

| T3 step 2 — Documents, archive rows (ארכיון הצעות שנדחו): one-line names, "נדחה" inside the card, compact rows (P31-F4) | PASS (PO: "pass", 22:04; no screenshot sent) | PO's verdict; no screenshot of the archive was sent, so row height not measured. |
| T4 step 1 — category headers: full title and "+ <type>" on one row, no covered letters, no bottom "הוספה" (אטרקציות at 360px, מלונות at 390px) (P31-F5, P3-F16) | PASS (PO: "pass", 22:04; the reply does not separate the two pages; no screenshot sent) | PO's verdict; confirm if only one page was checked. |
| T6 step 1 — favourite star (P3-F1) regression | PASS (PO: "Only games has stars, pass", 22:08) | PO notes the star appears only on games items. Test item not specified; the PO did not confirm the fill state after returning to the screen. |
| T6 step 2 — shopping owner first names (P3-F3) regression | PASS (PO: "pass", 22:09) | |
| T6 step 3 — task notes and link icons, link opens (P3-F4) regression | PASS (PO: "pass", 22:11) | |
| T6 step 4 — done tasks under "הושלמו (N)", tick/untick moves (P3-F5) regression | PASS (PO: "pass", 22:11) | |
| T6 step 5 — timeline week mode: one-line rows, arrows move by week (P3-F15) regression | PASS (PO: "pass", 22:13) | |
| T6 step 6 — bad task link: inline error, typed text kept; bare domain saved as https (P3-F4 / B2) regression | PASS (PO: "pass", 22:14) | |
| T6 step 7 — participants: add at top, compact rows, grey bins, name opens editor (P3-F9, F11, F7) regression | PASS (PO: "pass", 22:15) | Bin-tap behaviour not separately confirmed. |
| T6 step 8 — destinations: greyed ↑/↓ at ends, reorder, delete (P3-F8) regression | PASS (PO: "pass", 22:16) | |
| T6 step 9 — access rows: role chip, "הסרה", full e-mail on tap (P3-F12) regression | PASS (PO: "pass", 22:16) | |
| T6 step 10 — Documents header, summary, filter chips with counts (P3-F13) regression | PASS (PO: "pass", 22:20) | Finding P32-F2 logged (see below). |
| T6 step 11 — empty filter state and "הצגת הכול" (P3-F13 / F3) regression | PASS (PO: "pass", 22:20) | |
| T6 step 12 — ticket slide: "✓ אישור" check, ⋯ menu items and divider (P3-F14) regression | PASS (PO: "pass", 22:21) | |
| T6 step 13 — timeline mode bar, יום and כל הטיול modes (P3-F15 / G1, G4, G5) regression | PASS (PO: "pass", 22:22) | |
| T6 step 14 — Hotels header and Thai hotel name (P3-F16 / P3-F6) regression | PASS (PO: "pass", 22:22) | |
| T6 step 15 — §9 visual pass, Today (I1) regression | PASS (PO: "pass", 22:23) | |
| T6 step 16 — §9 visual pass, Settings (I2) regression | PASS (PO: "pass", 22:23) | |
| T6 step 17 — §9 visual pass, Tasks (I3) regression | PASS (PO: "pass", 22:23) | Note: the Tasks filter label finding P32-F1 was logged earlier. |
| T6 step 18 — §9 visual pass, Shopping (I4) regression | PASS (PO: "pass", 22:24) | |
| T5 step 1 — Tasks: "הושלמו (N)" open by default with a disclosure arrow (P31-F6) | PASS (PO: "pass", 22:05) | |
| T3 step 1 — Documents, failed rows: no large buttons, name fully visible above the red "נכשל" pill, ⋯ menu (P3-F13 / P31-F3) | PASS (PO: "pass", 22:03) | Build `0.8.0-phase3.2-24f0575f` confirmed by PO (22:02). Screenshot 22:02: "13688.pdf" fully visible above the pill, no large buttons, ⋯ menu open with נסה שוב · פתיחה · שיוך למשתתף · divider · מחק in terracotta with bin (consistent with Phase 3.1 decision 2). Second row's name is partly covered by the open menu; not re-checked. PO has not yet said pass. | Screenshot 21:57 shows the pill visible and the ⋯ menu on both failed rows. Document names look clipped at the top edge of the rows. PO is fixing P31-F3 directly with Claude Code and asked to wait for an update before continuing. Re-test T3 step 1 after the fix. |

## GO/NO-GO decision
- 2026-10-12 22:25 — **GO** (Product Owner), build `0.8.0-phase3.2-24f0575f`. Single combined Production promotion of Beta 0.8 (decision V147).
- Test items on QA Test Trip: deletion or addition of items is handled by Claude Code (PO's instruction).
- Carried over, non-blocking: P32-F1, P32-F2, BL-ICONS-1 (backlog).
- Results are not yet copied into the repo; do so only when the PO asks.

## Findings (Phase 3.2, P32-F#)
| # | Severity | Disposition | Description |
|---|---|---|---|
| P32-F2 | Non-blocking (PO: "non-blocker") | Log only; not in Phase 3 scope | Documents (22:20): after the PO selects an option in the filter chip row, the row jumps back to the right so that "הכול · 45" is shown again. Expected: the row stays where it is after a selection. |
| P32-F1 | Non-blocking (PO: "log as a non-blocker") | Log only; not in Phase 3 scope | Tasks screen (22:05, build 0.8.0-phase3.2-24f0575f): the "משתתף" filter dropdown value "כל המשתתפים" is cut at its left edge, the last letter touches the chevron. Other filter labels are fine. Screenshot 22:05. |

Note: the 22:05 screenshot came in response to Test 6 step 1 (favourite star); the PO sent the Tasks screen instead. Test 6 step 1 is still open.

## Backlog (non-blocking, not Phase 3)
| # | Item | Source | Severity |
|---|---|---|---|
| BL-ICONS-1 | Today action buttons: PO prefers icons (phone / web / location) instead of text labels (ניווט · אתר · התקשרות). Design option B (icon buttons) exists in the artifact "Today Card — Navigation Row Options". | PO: "I prefer icons of a phone/web/location, log it as non-blocker, not for phase 3" | Non-blocking, backlog |
