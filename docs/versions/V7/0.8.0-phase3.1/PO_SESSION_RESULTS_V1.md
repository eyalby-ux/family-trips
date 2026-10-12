# Beta 0.8 Phase 3.1 — Product Owner session results

Target: `docs/versions/V7/0.8.0-phase3.1/EXECUTABLE_TEST_SESSION_V1.md` → "Product Owner session"
Date: 2026-10-12 · Tester: Product Owner (Eyal), real phone · Run by the QA agent

## Build check
- Settings → אודות: "Beta 0.8.0-phase3.1 · בנייה 0.8.0-phase3.1-3722a839" — matches. PASS.

## Results
| Test | Result | PO's words |
|---|---|---|
| A1 — favourite star (P3-F1) | PASS | "pass" |
| A2 — shopping owner first names (P3-F3) | PASS | "pass" — Test A PASS |
| B1 — task notes + link icons, link opens, task shows notes/link (P3-F4) | PASS | "pass" |
| B2 — bad link inline error keeps text; bare domain saved as https (P3-F4) | PASS | "pass" |
| B3 — done tasks under "הושלמו (N)", tick/untick moves, open-only filter (P3-F5) | PASS | "pass" — Test B PASS |
| C — Thai hotel name, no boxes (P3-F6) | PASS | screenshot of the item page: "พันวารยี์รีสอร์ต (Panvaree Resort)" drawn fully in the title and the מיקום row (`P3-F6_thai_hotel_item_page.png`) — logged as pass from the evidence |
| D1 — participants: header + "+ משתתף חדש" at top, compact rows, no "עריכה", grey bins, Test6 muted with "הפעלה" (P3-F9, F11, F7) | PASS (visual from screenshot `P31-D_settings_overview.png`) | bin tap: "nothing happen"; name tap opens editor: "yes" |
| D2 — destinations: add, ↑/↓ greyed at ends, reorder, delete (P3-F8) | PASS | "pass" |
| D3 — access e-mail rows (sharing + admin), "מנהל" chip, "הסרה", tap shows full (P3-F12) | PASS | "pass" — Test D PASS with finding P31-F1 |
| F1 — header on one line, summary, filter chips with counts (P3-F13) | PASS | screenshots: "+ מסמך" on the header line, "46 מסמכים", chips "הכול · 46", "ממתין לאישור · 0", "מצורף…" |
| F2 — ticket slide: "✓ אישור" with visible check, centred; "⋯" menu: שיוך, הסרה, divider, מחק in terracotta with bin (P3-F14) | PASS | evidence: screenshot `P3-F14_ticket_slide_menu.png` (unconfirmed slide, QA31; check drawn, label centred, menu as specified) |
| F3 — empty filter state "ממתין לאישור · 0" + "הצגת הכול" (P3-F13) | PASS | "pass" |
| G1 — timeline: mode bar order (יום · שבוע · חודש · כל הטיול), calendar on top, Hyatt band 5–7 Oct, dots, one legend, today ring, shown week tinted (P3-F15) | PASS | evidence: screenshot `P3-F15_timeline_week.png` (שבוע mode, 11–17 Oct) |
| G2 — שבוע rows: date + weekday, time + title on one line, "אין תוכניות" on empty days, no wrapping (P3-F15) | PASS | evidence: same screenshot (16:00 היום מאוחר יותר, 23:38 LY087 TLV → HKT, empty days) |
| G3 — arrows move by week, forward/back, Hebrew direction (P3-F15) | PASS | "pass" |
| G4 — יום mode: heading, stay line, agenda with fixed time column, dots and cards (P3-F15) | PASS | "pass" |
| G5 — כל הטיול: one row per day, collapsed empty runs ("2.10–3.10 · 2 ימים", "15.10–19.10", "21.10–1.11 · 12 ימים"), continuous Hyatt bar, today tinted (P3-F15) | PASS | evidence: screenshot `P3-F15_timeline_all_trip.png` |
| H1 — plural tile/title names, "+ <type>" in header (P3-F16) | FAIL on the אטרקציות header: title cut by "+ אטרקציה" (P31-F5). Rest OK per PO ("others are fine") | PO: "אטרקציות is cut, others are fine" |
| H2 — מלונות header: title fully visible, "+ מלון" in the same row, no bottom "הוספה", singular chip "מלון" on items, Thai name drawn (P3-F16, P3-F6) | PASS | evidence: screenshot `P3-F16_hotels_header_ok.png` (16:28) |
| I1 — §9 visual pass, Today screen: nothing cut off, no sideways scroll, readable | PASS | "pass" |
| I2 — §9 visual pass, Settings: no cut-off, no sideways scroll, readable | PASS | "no additional issues" |
| I3 — §9 visual pass, Tasks: "הושלמו (N)" visible with arrow (see P31-F6), notes/link icons visible, no cut-off | FAIL on the collapsed "הושלמו" section (P31-F6, Non-blocking) | PO: "the completed tasks are by default open, and the small arrow is missing" |
| I4 — §9 visual pass, Shopping: owner chips and place cards not cut off, no sideways scroll | PASS | "pass" |
| E1 — Today action row alignment (P3-F10) | FAIL: "the navigation still doesn't look good" (PO, after the screenshot). New finding P31-F2 — severity and fix to be settled | Screenshot `P31-F2_today_navigation_row.png`: "ניווט" and "אתר" sit under the time column, flush with its right edge (matches the register's fix). PO suggests aligning them to the left instead; not agreed yet. If it changes, it becomes a new finding (P31-F2). |

## Findings (P31-F#)
| # | Severity | Disposition | Description |
|---|---|---|---|
| P31-F2 | Non-blocking (PO: "agree"). Fix options drawn in Design artifact "Today Card — Navigation Row Options" (A recommended: full-width row below a hairline, aligned left; B icon buttons under time; C row under text only). PO chose A, with an addition: for items that have a phone number, the row becomes three equal buttons (ניווט · אתר · התקשרות); items without one keep two equal buttons. Design updated in the artifact (Main board). | Today card: the "ניווט" / "אתר" action row does not look right. PO's point: its position relative to the vertical divider line above it. In the screenshot (`P31-F2_today_navigation_row.png`) the divider between the text and the time column ends just above the row, and the "אתר" button sits across it, so the row straddles the line instead of sitting clearly under the time column. Fix to be agreed with PO (keep under the time column without straddling, or move left). |
| P31-F3 | Non-blocking (PO: "agree"; disposition: fix in the next round, before Production) | Documents, Failed rows (P3-F13): "נסה שוב" / "מחק" are large dark blocks that wrap ("נסה / שוב") and cover the red "נכשל" status pill, so the pill is cut off. Expected: compact row, status chip visible (`P31-F3_docs_failed_rows.png`). |
| P31-F4 | Non-blocking (severity assumed, PO to confirm). Disposition: PO says "if it is a small effort, let's fix it". Development Agent to estimate; fix in 3.1 if small, otherwise next round before Production. | Documents, "ארכיון הצעות שנדחו (11)" (expanded): rows are tall; document names wrap onto 2–3 lines (e.g. "ICE Fahrkarte - Berlin+City → Braunschweig+City") instead of one LTR line, and the "נדחה" status sits outside the card edge. Expected per P3-F13: ~60px rows, one-line name (`P31-F4_docs_archive_rows.png`). Not in the mockup; observed as-is. |
| P31-F5 | Non-blocking (PO: "agree") | Activities page header (P3-F16): the title "אטרקציות" is cut. The small "+ אטרקציה" button covers its first letters ("אטרקצי" shows). Plural title is otherwise correct. Expected: title and "+ <type>" both fully visible in one row at 390px (`P31-F5_activity_header_cut.png`). |
| P31-F6 | Non-blocking (PO: "agree") | Tasks, "הושלמו (5)" (P3-F5): the section renders closed by default (its 5 done tasks are hidden) and has no disclosure arrow. Expected per the register and Development Agent note: open by default, with an arrow, as Packing's section is (`P31-F6_tasks_completed_collapsed.png`). PO: "the completed tasks are by default open, and the small arrow is missing". |
| P31-F1 | Non-blocking (PO: "agree") | PO: option C, "add it to phase 3" — fix in the Phase 3 correction, before the Production promotion | PO proposal: split Settings into tabs (הטיול הנוכחי / הטיולים שלי / ניהול מערכת / מחיקה / אודות). Design artifact "Settings — Tabs Proposal": A = five tabs as asked, B = three tabs (הטיול · הטיולים שלי · מערכת; delete as a danger zone, אודות inside מערכת), C = home list → sub-pages. |

## Decisions on the Development Agent's extra choices (all five approved by PO, 2026-10-12)
| # | Decision | PO |
|---|---|---|
| 1 | Thai: legacy Private Use characters (U+F70E etc.) mapped back to real Thai marks, in addition to the Noto Sans Thai font | approved (17:21) |
| 2 | Terracotta text is #A4442A (5.9:1), not --accent (3.9:1); same divider + bin + "מחק" in every document menu | approved (17:21) |
| 3 | Calendar day cells 44px high (40px wide at 360px); calendar a little taller | approved (17:22) |
| 4 | Calendar dots use the board's kind palette (replaces Phase 3 decision 7); each stay has its own muted hue, named in the legend | approved (17:22) |
| 5 | Small fixes: "מנהל" chip to ink (contrast), category back arrow 44px, bad task link keeps the typed form, "אישור" check drawn | approved (17:22) |

## Screenshots
(in docs/versions/V7/0.8.0-phase3.1/screenshots/)

## GO/NO-GO decision
- 2026-10-12 17:33 — **NO-GO** (Product Owner). Phase 3.1 is not promoted. Findings P31-F1, F2, F5, F6 to fix before Production; P31-F3 in the next round; P31-F4 in this round if the Development Agent judges it small, otherwise next round.
- Still open: E1 (Today row) re-test after the fix.

## Operational note (for Claude Code)
- A stale, empty `.git/HEAD.lock` (created 2026-10-12 17:40) is left in the repository. It blocks later git commands with "File exists". The PO approved removing it: Claude Code may delete `.git/HEAD.lock` once confirmed that no git process is running. Do not delete other `.git` files.
- The commit `9059bbd` (Phase 3.1 PO session results) was made on `version/V7` before the lock was seen; its content is final.
