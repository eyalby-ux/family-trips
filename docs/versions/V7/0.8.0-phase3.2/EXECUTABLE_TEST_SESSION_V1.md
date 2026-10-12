# Family Trips Beta 0.8 Phase 3.2 (Phase 3.1 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase3.2` (build `0.8.0-phase3.2-9e609fba`) on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production). Correction package for the Phase 3.1 NO-GO (`docs/versions/V7/0.8.0-phase3.1/PO_SESSION_RESULTS_V1.md`, handoff `HANDOFF_PHASE_3_2_FOR_CLAUDE_CODE_V1.md`). Covers `P31-F1` … `P31-F6`. **Phase 3.2's own GO is the GO for the single combined Production promotion of Beta 0.8 (decision `V147`).**
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test at 360 and 390px. Designs: `docs/design/mockups/P31-F1_settings_option_C_home.dc.html` (Settings home list) and `P31-F2_today_nav_option_A_full_width.dc.html` (Today row). Settings → אודות shows the exact `0.8.0-phase3.2-<hash>`.

## What changed that you should know about before testing

- **Found while building:** (1) a remote update (another device saving) used to wipe the screen's own state — the timeline day, the task filters, the document filter — and would now also have thrown you out of a Settings page; those fields now survive it; (2) the "הסתיימו היום" rows on Today were 40px tall → 44px; (3) `P31-F6`: the "הושלמו" section was a native `<details open>` that rendered **closed** on your phone (I could not reproduce that on desktop), so it is now a real button with an arrow and its own state instead — it cannot depend on the browser's `<details>` behaviour.
- **Decisions the Development Agent made** (change any you read differently):
  1. **`P31-F1` — "מחיקה" stays under "כללי"**, as on the board (the one open question in the handoff). Each row opens its page; the page has the 44px back arrow and the page title on one row; the section titles inside a page are hidden (the title is the back row's) except on "פרטי הטיול ויעדים", which has two sections. "שיתוף הטיול" is shown only to the trip's owner; "ניהול מערכת" only to managers (it opens the existing admin screen, whose back arrow returns to this list). Leaving Settings and coming back always opens the home list.
  2. **`P31-F2` — the time column is 96px** (the design's value; Phase 1's spec said 76px). The buttons are **label-only** like the board. "כרטיסים" (shown when the item has a confirmed ticket) joins the same row; with a fourth button it wraps onto its own full-width line. "התקשרות" needs a phone number with digits and dials it.
  3. **`P31-F3` — a Failed document row** shows just its red "נכשל" pill under the file name (nothing beside it, nothing covering the name); **"נסה שוב" and "מחק" are both in the row's "⋯" menu** — "נסה שוב" first, then פתיחה / שיוך, a divider, and the terracotta "מחק" (single confirmation). The row is 60px. (Changed after your first look at Phase 3.2 on the phone, 2026-10-12: the inline retry button had pushed the name out of the row.)
  4. **`P31-F5` — the header never covers the title:** the title is 26px (as on the Documents board) and cannot be pushed under the button; on a header narrower than 300px (a **360px phone**) the "+ אטרקציה" button shrinks to a 44px **"+"** whose accessible name is "הוספת אטרקציה"; at 390px the label shows.
  5. **`P31-F4`:** the archive row is the document row — title on one LTR line (ellipsis), a muted "נדחה" chip and the source file name inside the card, ~60px.

**State of the QA Trip when this session starts:** unchanged from the Phase 3.1 re-test (`QA3 …` tasks / shopping, `QA31-ticket-unconfirmed.png`, the four confirmed leftover tickets, 46 documents incl. 2 failed and 11 archived proposals). Temporary items I created to measure the Today row (`QA31 …`, `QA32 …`) were **deleted**. For **Test B** you need an item **today**: add one with + → ידני → **מלון** (it is the type with a phone field), set the start to later today, and fill location, website and phone — see the QA summary.

## Test A — Settings (`P31-F1`)

Open Settings (the gear).
**Expect:** the title "הגדרות" and **three labelled groups**: **הטיול הנוכחי** — "פרטי הטיול ויעדים" (subtitle "שם, תאריכים · ספרד"), "משתתפים" ("5 פעילים · 1 לא פעיל"), "שיתוף הטיול" ("משתמש אחד עם גישה"); **חשבון** — "הטיולים שלי" ("מעבר בין טיולים · טיול חדש"), "ניהול מערכת" ("הרשאות גישה · למנהלים בלבד", managers only); **כללי** — "אודות" (value "Beta 0.8.0-phase3.2"), and a **red "מחיקה"** row with a bin at the bottom. Each row ≥56px with a chevron. Each row opens its page — a 44px back arrow and the page's title on one row; "משתתפים" has the rules from `P3-F7/F9/F11`, "שיתוף הטיול" and "ניהול מערכת" the e-mail rows from `P3-F12`, "אודות" the version **and** the full build string, "מחיקה" the two delete actions. The back arrow returns to the list.
**Development Agent verification (qa, 390px; 360px for the pages):** ☑ groups and rows exactly as listed (all 56px), page by page: title + back row, no duplicate section heading, back returns to the list; the admin row opens "ניהול הרשאות גישה" and its back arrow returns to the list; About showed the version and the full build string; no horizontal overflow, 0 contrast failures, tap targets ≥44px on the list and all six pages at 390px, and on the list, trip, participants and sharing at 360px. **Not exercised:** a non-manager account (no "ניהול מערכת" row) and a non-owner (no "שיתוף" row) — both are conditions in the code; saving the trip form from its new page. **Result:** *(to be filled in by the Product Owner)*

## Test B — Today action row (`P31-F2`, E1)

**Expect:** under the card's header (text, divider, a 96px time column) a **hairline**, then a **full-width row of equal buttons** that does not cross the divider: **ניווט · אתר · התקשרות** for an item with a phone number, **ניווט · אתר** for one without; each 44px, label only.
**Development Agent verification (qa, 390px):** ☑ with a temporary hotel that had location, website and a phone: three buttons 91×44px each, the row below the header, the full card width (1px = the border), the time column 96px, no overflow (item deleted afterwards). **Not exercised:** the two-button case and a fourth ("כרטיסים") button on a phone; 360px. **Result:** *(to be filled in by the Product Owner)*

## Test C — Documents: Failed rows and the archive (`P31-F3`, `P31-F4`)

Trip Center → מסמכים.
**Expect:** a Failed row: the file name on one line, and under it the red **"נכשל"** pill **fully visible** — no buttons beside it, the name not covered, the row about 60px; its **"⋯" menu = נסה שוב / פתיחה / שיוך למשתתף / divider / מחק**. Expanding **"ארכיון הצעות שנדחו (11)"**: ~60px rows, the title on **one line** (ellipsis if long), a muted **"נדחה" chip** and the source file name **inside** the card.
**Development Agent verification (qa, 360px, final build):** ☑ both Failed rows 60px with the file name inside the row, the pill below the name and inside the row, no button beside it; the "⋯" menu = נסה שוב, פתיחה, שיוך למשתתף, divider, מחק (terracotta); the 11 archive rows were 60px with the "נדחה" chip inside the card (measured on the previous build; that code is unchanged). **Not exercised:** "נסה שוב" actually re-running an analysis. **Result:** *(to be filled in by the Product Owner)*

## Test D — Category header (`P31-F5`)

Trip Center → אטרקציות (and מלונות, טיסות, תחבורה, מסמכים).
**Expect:** the **whole title** is visible and the add control sits beside it, never over it. At **390px**: "+ אטרקציה" with its label. At **360px**: a 44×44 **"+"** only (screen readers hear "הוספת אטרקציה").
**Development Agent verification (qa):** ☑ 390px: title "אטרקציות" 175px wide, not clipped, the button 37–136px with its label, no overlap; 360px: all five categories — titles not clipped, no overlap, label hidden, the "+" button's accessible name set (it measured 42px wide before the CSS fix that makes it 44px; that fix is in this build). **Result:** *(to be filled in by the Product Owner)*

## Test E — Completed tasks (`P31-F6`)

Trip Center → הכנות.
**Expect:** at the bottom **"הושלמו (5)" with the same small triangle the document archive uses**, at the start of the row (▾ when open, ◂ when closed), **open by default** so the done tasks are visible; tapping it collapses them and again expands them. It stays as you left it while you move around the app.
**Development Agent verification (qa, 360px, final build):** ☑ opens with `aria-expanded="true"`, the triangle (ink, 4px from the row's start edge, the text to its left) in its "open" shape and the five done tasks visible; tap → "closed" shape and 0 rows; tap → open and 5 rows again. **Result:** *(to be filled in by the Product Owner)*

## Test F — Regression

Everything marked PASS in `PO_SESSION_RESULTS_V1.md` still passes: the star, owner first names, task notes and link, bad-link error, the Thai name, participants rows, destinations, e-mail rows, ticket slide and menu, the timeline in all four modes, plural names, the Today screen, the Shopping screen.
**Development Agent verification (qa):** ☑ the automated gate (`npm run check`: syntax, the whole test suite, the production build) incl. the Phase 3.1 tests (updated where this round replaced a behaviour — Settings layout, the Today alignment, the header button markup, the done-tasks section); the §9 audit (contrast, overflow, tap targets) on Today, the Settings list and pages, Tasks, three category pages, the document archive and the week view at 390px and on the changed screens at 360px: no failures other than the two fixed during the round (Today's done rows, the icon-only "+" width). **Result:** *(to be filled in by the Product Owner)*

## Finding verification notes (one per finding)

| Finding | Development Agent verification |
|---|---|
| `P31-F1` Settings home list | ☑ Test A. |
| `P31-F2` Today action row | ☑ Test B (three equal 44px buttons below the header). |
| `P31-F3` Failed document rows | ☑ Test C (decision 3: "מחק" in the menu). |
| `P31-F4` archive rows | ☑ Test C. |
| `P31-F5` header title | ☑ Test D. |
| `P31-F6` completed tasks | ☑ Test E (a real button, open by default). |

## Product Owner session

*(empty — to be filled in during the real-phone test)*

## GO/NO-GO decision

*(pending — Product Owner. A GO here is the GO for the single combined Production promotion of Beta 0.8, decision `V147`.)*
