# FamilyTrips Beta 0.8 Phase 2.3 — Correction Package Scope (`0.8.0-phase2.3`)

Document revision: `V1`
Date: 2026-10-08
From: Product Owner's planning/QA-assistant (document-only)

## What this is

Phase 2.2 (`0.8.0-phase2.2`, commits `6835cc3`–`a13825f`, acceptance results recorded by the Product
Owner directly into `docs/versions/V7/0.8.0-phase2.2/EXECUTABLE_TEST_SESSION_V1.md` and committed as-is,
together with the `P22-F4` mockup files — `9866f4e`) ended **NO-GO**, 2026-10-08. No Blocking or Medium
findings; all five re-tested areas (item page, Packing/Tasks, Shopping, the "+" dialog, the analysis
screen) passed — Tests A–D with findings, Test E cleanly. Ten Non-blocking findings (`P22-F1`–`P22-F10`)
were recorded, all already disposed by the Product Owner directly in the session document: eight
(`P22-F1`–`P22-F5`, `P22-F7`, `P22-F8`, `P22-F10`) route into this correction round; `P22-F9` (Shopping
owner/place filters) goes to Phase 3 instead (addressed directly in `FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md`
`V10`, alongside this document); `P22-F6` (dropping the "1 / N" carousel counter) is a planning note only
— **no change in this round**. Everything here stays on `qa` only — unchanged from every prior Beta 0.8
phase, still gated on Phase 3's own eventual GO for any Production promotion (`V147`).

## Design reference

**"Item Page — Additional Details" (approved by the Product Owner, 2026-10-08)** is in the repository at
`docs/design/mockups/` (and in the project as `claude/MOCKUP_P22_F4_ITEM_PAGE_ADDITIONAL_DETAILS.md` /
`.html`):
- `P22-F4_ITEM_PAGE_ADDITIONAL_DETAILS_MOCKUP.md` — what the two boards show;
- `P22-F4_item_page_additional_details.html` — standalone snapshot of both boards (opens in any browser);
- `P22-F4_additional_details_Main.dc.html` (closed) / `P22-F4_additional_details_Expanded.dc.html`
  (open) — the Design-canvas sources.

This same mockup also reflects the approved fix for **`P22-F2`** (no coverage bar; a full-width centred
ticket card on every slide, no peek) and **`P22-F3`** (globe icon only at the end of the provider row; no
"שם לחיפוש" chip) — it supersedes the peek shown in the earlier `P2-F4` and `P21` mockups on those two
points. There is no board for `P22-F1`, `F5`, `F7`, `F8`, or `F10`; build those from the written
dispositions below. **Where a board and the written disposition differ, the written disposition wins.**

## Findings in this correction package

All **Non-blocking**, all found on the Phase 2.2 real-phone acceptance session, 2026-10-08.

- **`P22-F1`** — in Packing, the header title "רשימות אריזה" is cut to "רשימות א…" beside the "+ קטגוריה"
  button. Fix: the title becomes **"אריזה"** (matches the bottom-tab label) — short enough to never
  truncate beside the button.
- **`P22-F2`** — the ticket carousel's coverage bar reads as a swipe indicator but never actually changes
  while swiping, and a sliver of the next ticket still shows with the last slide off-centre (an empty gap
  on its left). Fix, per the design reference above: **remove the coverage bar entirely**, keeping only
  the text "כרטיסים: 2/5" and the muted "ללא כרטיס: …" line; **no peek** — every slide is a full-width
  card, centred, including the last one; the dots and the "1 / N" counter (not `P22-F6` — that counter
  stays for now) are what show there are more tickets. Supersedes the peek in the `P2-F4` mockup and
  `P21-F11`'s disposition.
- **`P22-F3`** — on the item page, "אתר" wraps mid-word beside a wrapping provider name, and the yellow
  "שם לחיפוש" chip under the location takes a line it doesn't need. Fix, per the design reference, **every
  item type**: (a) a **globe icon only** at the end of the provider row (44px tap target, accessible name
  "אתר," no visible label text) — the provider row itself stays on one line; (b) **remove the "שם לחיפוש"
  chip** — the location stays the underlined map link on its own.
- **`P22-F4`** — removing "פרטי הכרטיס" under `P21-F4` also silently removed an activity's meeting point,
  duration, price, age limit, included/not-included, and ticket quantity from the saved item page (the
  Development Agent's own Phase 2.2 decision 1). Fix, **replacing that decision**, per the design
  reference above: a collapsed **"פרטים נוספים"** row at the bottom of "כרטיסים ומסמכים" (after the
  carousel's dots/counter, before "+ הוספת מסמך" — no extra ticket card). Tapping it expands in place,
  listing only the detail rows that actually have a value (נקודת מפגש as a map link; משך; מחיר; הגבלת
  גיל; כלול, with "לא כלול: …" as a muted second line; ticket quantity may join as "כמות כרטיסים"). No
  values at all → no row at all. Closed by default every time the page opens. Applies to activity/
  attraction items; a flight keeps its own "פרטי הטיסה" card untouched; no ticket/holder information goes
  into this row — that stays only in the ticket slides.
- **`P22-F5`** — on an unconfirmed ticket slide, the action row ("אישור ככרטיס" + "פתיחה" + "⋯") is too
  wide; "⋯" sticks out past the slide's left border. Fix: the confirm action becomes **"אישור" with a
  check icon** (shorter — the status chip "לא אושר ככרטיס" already states what's unconfirmed); all three
  actions ("אישור", "פתיחה", "⋯") fit inside the slide on one row; confirmed and unconfirmed slides keep
  the same height.
- **`P22-F7`** — hotel and flight item pages still show the old top: a large "חזרה" button, a "פריטים"
  label above the title, and a lot of wasted space — the compact header from `P21-F1` was applied to some
  item types but not all. Fix: **every page in the app with a back action** — item pages of every type,
  edit pages, sub-pages, Settings, anywhere a back action exists — uses the same compact header: a small
  back-arrow icon button (44px tap target, no border) with the type chip on the same row where one
  applies, the title directly below. **No "חזרה" buttons anywhere; remove the "פריטים" label
  everywhere.** **The Development Agent must audit every page in the app for this, not just the item
  page** — list which pages were checked and which were actually changed in the report back (see "What's
  needed now" below).
- **`P22-F8`** — on a Packing or task row, the item name gets only ~130px beside the participant chip
  because the rows sit two card-layers deep, so short names are already cut hard (example: "QA22 לפאולה
  ולדניאל" → "QA22 לפ…"). Fix, both parts: (1) remove one layer of card padding on the phone so rows are
  wider; (2) the name may wrap to **two lines** before it ellipsises, with the chip staying on the row
  beside it (whichever line the chip's row lands on). **Verify at both 360px and 390px** — nothing may
  overflow horizontally or clip at either width. Same rule on task rows.
- **`P22-F10`** — in the "+" dialog's מסמך flow, the file picker is the browser's bare default control
  (grey "בחירת קובץ" button + "לא נבחר קובץ"), visibly off-design next to the rest of the dialog. Fix: a
  styled field per the `P21` AddDialog board — a dashed box with an upload icon and "בחירת קובץ" (≥52px
  tall, the whole box tappable); once a file is picked, it shows the file name (wrapped in `<bdi>`,
  ellipsised if long) with a "החלפה" link to pick a different one. **Apply everywhere a file is picked**,
  including the item page's own "הוספת מסמך" dialog — not just the top-level "+" dialog's מסמך option.

## Not part of this correction round

- **`P22-F6`** (dropping the "1 / N" carousel counter when the dots alone are enough) — **planning note
  only, no change now**, per the Product Owner's own disposition, 2026-10-08. Keep the counter as it is
  until a later design pass revisits it. Do not remove it as a side effect of `P22-F2`'s own fix above.
- **`P22-F9`** (Shopping owner/place filters) — an enhancement, not a correction finding. Scoped directly
  into Phase 3's Shopping bullet (`FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` `V10`, alongside this document, as
  part of the Shopping restyle `P2-F8` already named there).
- **The note on `P21-F7`** (Shopping section buttons still misaligned, as expected — that's Phase 3's own
  item — and the "קניות" tab's 🛒 emoji, also already covered by Phase 3's existing no-emoji acceptance
  criterion) — no new action; both already tracked in Phase 3's scope.

## Re-test plan, once implemented

A real-phone re-test of exactly the areas these findings touch:
- **Item page**: the compact header on every type that has a back action (not just item pages — spot-
  check an edit page and a Settings sub-page too); the ticket carousel with the coverage bar removed and
  no peek at any slide count, including the last slide; the globe-only website link and the removed "שם
  לחיפוש" chip on every item type; the "פרטים נוספים" row on an activity with and without each kind of
  detail value, and its absence when an activity has none; the confirm-action row on an unconfirmed
  slide at the narrowest supported width.
- **Packing and task rows**: the "אריזה" header fitting beside "+ קטגוריה"; a long item name wrapping to
  two lines with the chip intact, at both 360px and 390px.
- **The "+" dialog and the item page's own "הוספת מסמך"**: the styled file-picker field, before and after
  a file is chosen, with the "החלפה" link working.

Every other Phase 2/2.1/2.2 test is unaffected by this round and does not need a re-run unless this
round's implementation touches something it covers.

## What's needed now

1. Implement all eight findings above (`P22-F1`–`P22-F5`, `P22-F7`, `P22-F8`, `P22-F10`) through the full
   quality gate (syntax checks, the full test suite including any updated pinning assertions, and a
   production build), deployed to the fixed `qa` alias as `0.8.0-phase2.3`, using the design reference
   above for `P22-F2`–`P22-F4`.
2. **`P22-F7` specifically:** audit every page in the app that has a back action (item pages of every
   type, edit pages, sub-pages, Settings, and anywhere else one exists) against the compact-header rule.
   **Report back which pages were checked and which were actually changed** — a plain list is enough; do
   not assume the item-page fix alone covers everything.
3. **`P22-F8` specifically:** verify the fix at **both 360px and 390px** widths — call out in the report
   if either width still clips or overflows.
4. `P22-F6` needs no action here (planning note); `P22-F9` needs no action here (Phase 3 instead) — see
   above.
5. Draft a new executable acceptance test session document covering the re-test plan above, plus a
   Development Agent verification note for every one of the eight findings in this package.
6. Report back — commits, build identifier, what was built, the `P22-F7` page audit list, the `P22-F8`
   width check, and anything that didn't check out against this scope or the design reference — for
   independent verification before this assistant drafts the correction's own QA acceptance-session
   prompt.
