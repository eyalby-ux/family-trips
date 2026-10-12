# Beta 0.8 — Phase 3.2 correction: handoff for Claude Code (from the QA agent, for the Product Owner)

**Status:** Phase 3.1 (`0.8.0-phase3.1-3722a839`) is **NO-GO** (Product Owner, 2026-10-12 17:33). Nothing is promoted to Production. The correction round is **Phase 3.2** (`qa` only). Its GO is the GO for the single combined Production promotion of Beta 0.8 (decision `V147`).
**Source documents:** `PO_SESSION_RESULTS_V1.md` (full results, screenshots list), `EXECUTABLE_TEST_SESSION_V1.md` (Product Owner session and GO/NO-GO sections), `screenshots/` (what the PO saw).
**Design sources (open the `.dc.html` files in a text editor; they load `./support.js`, which is not in the repo):** `docs/design/mockups/P31-F1_settings_option_C_home.dc.html` (chosen), `docs/design/mockups/P31-F2_today_nav_option_A_full_width.dc.html` (chosen). The other `P31-F1_*` and `P31-F2_*` files are the rejected alternatives, for reference only.

## Approved decisions (all five approved by the PO)
1. Thai: legacy Private Use characters are mapped back to real Thai marks, plus Noto Sans Thai as the fallback font.
2. Terracotta text is `#A4442A` (5.9:1), not `--accent`. The divider + bin + terracotta "מחק" pattern is used in every document menu.
3. Calendar day cells 44px high (40px wide at 360px).
4. Calendar dots use the board's kind palette (flight ink, transport green, attraction terracotta, restaurant gold, shopping teal). Each stay has its own muted hue, named in the legend. This replaces Phase 3 decision 7.
5. Small fixes: "מנהל" chip in ink; category back arrow 44px; a bad task link keeps the typed form and shows the error inline; the "אישור" check is drawn.

## Findings to fix in Phase 3.2

### P31-F1 — Settings split into a home list (option C). Non-blocking. Fix before Production.
Build the Settings screen as a home list with sub-pages. **No tab bar.** Rows open their own page.

Sections (headings are small muted labels above each group):
- **הטיול הנוכחי**
  - *פרטי הטיול ויעדים*: name, dates, destinations (the current trip-details form).
  - *משתתפים*: subtitle "N פעילים · N לא פעיל". Opens the participants page (P3-F7, F9, F11 rules apply there).
  - *שיתוף הטיול*: subtitle "N משתמשים עם גישה". Opens the sharing page (P3-F12 rules).
- **חשבון**
  - *הטיולים שלי*: switch trip, new trip.
  - *ניהול מערכת*: subtitle "הרשאות גישה · למנהלים בלבד". Managers only. Opens the access list (P3-F12 rules).
- **כללי**
  - *אודות*: value "Beta 0.8.0", wrapped in `<bdi dir="ltr">`. The page shows the version and the full build string (`0.8.0-phase3.2-<hash>`).
  - *מחיקה*: a red (`#A4442A`) row with a bin icon, at the bottom. Placed under כללי as on the board. Confirm with the PO if deletion should live on each trip's own page instead.

Row rules: each row is at least 56px tall, with a title (15px, 600), a muted subtitle (13px, `#726B66`) and a chevron on the start side. Every row is a real `<a>` or `<button>`. Pages keep the screen's back arrow (44px) and header rules from Phase 3.1 (no overlap, no cut-off title).

### P31-F2 — Today navigation row. Non-blocking. Fix before Production.
Option A (chosen): the card keeps its header (text column on one side, a 1px divider, a 96px time column on the other). Below a hairline, a full-width action row sits clear of the divider.
- Items **with a phone number**: three equal buttons, in order `ניווט · אתר · התקשרות`. Each `flex: 1`, 44px tall, 12px radius, outline, 15px / 600.
- Items **without** a phone number: two equal buttons, `ניווט · אתר`.
- The row must not straddle the vertical divider. The time stays in its column. The action row starts at the card's inner edge.
- Re-test on E1 after the fix.

### P31-F3 — Failed document rows. Non-blocking. Next round (before Production, but not in 3.2 unless the DA finds it trivial).
The "נסה שוב" / "מחק" buttons are oversized dark blocks that wrap and cover the red "נכשל" pill. Build compact actions (44px, no wrap, outline style), keep the status pill visible, and bring the row to about 60–80px.

### P31-F4 — Archive rows. Non-blocking. This round if the DA judges it small; otherwise next round.
"ארכיון הצעות שנדחו" rows: the document name is one LTR line with ellipsis, and the "נדחה" status stays inside the card. Target: about 60px rows, as in P3-F13.

### P31-F5 — Activity header title cut. Non-blocking. Fix before Production.
On the אטרקציות page, the "+ אטרקציה" button covers the first letters of the title at 390px. Fix so the full title and the add button both show in the header row at 360 and 390px. Options (DA decides): shorter button label "+" with `aria-label="הוספת אטרקציה"`, or the button on its own line below the title. The title must not be covered at any width.

### P31-F6 — "הושלמו (N)" section closed by default. Non-blocking. Fix before Production.
The completed-tasks section opens by default (as Packing's does) and has a visible disclosure arrow, so the done tasks are not hidden without a hint.

## Operational
- A stale, empty `.git/HEAD.lock` (created 2026-10-12 17:40) blocks git commands with "File exists". The PO approved deleting it: Claude Code may delete `.git/HEAD.lock` once it confirms no git process is running. Do not delete other `.git` files.

## Re-test for Phase 3.2 (on a real phone, 360 and 390px)
- P31-F1: open Settings → the home list shows the groups in order; each row opens its page; ניהול מערכת is hidden for non-managers; אודות shows the full build; מחיקה is red at the bottom.
- P31-F2 (E1): on an item with a phone number, three equal buttons on one row, none crossing the divider; without a phone, two.
- P31-F3 and P31-F4: failed rows compact; archive names one line (if fixed this round).
- P31-F5: אטרקציות header shows the full title and the add control.
- P31-F6: "הושלמו (N)" open by default, with an arrow.
- Regression: everything marked PASS in `PO_SESSION_RESULTS_V1.md` still passes.

## Files
- `PO_SESSION_RESULTS_V1.md`, `EXECUTABLE_TEST_SESSION_V1.md` (this folder)
- `screenshots/` (this folder), named by finding
- `docs/design/mockups/P31-F1_settings_option_C_home.dc.html` and `docs/design/mockups/P31-F2_today_nav_option_A_full_width.dc.html` (chosen designs)
