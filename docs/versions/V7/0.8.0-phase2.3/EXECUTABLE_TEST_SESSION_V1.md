# Family Trips Beta 0.8 Phase 2.3 (Phase 2.2 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase2.3` (build `0.8.0-phase2.3-1736bb21`) on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production; only Phase 3's own GO triggers the single combined promotion, decision `V147`). Correction package for the Phase 2.2 NO-GO (`docs/versions/V7/0.8.0-phase2.2/EXECUTABLE_TEST_SESSION_V1.md`), scoped in `docs/roadmap/FAMILY_TRIPS_BETA_0_8_PHASE_2_3_CORRECTION_SCOPE_V1.md` (`V1`). Covers `P22-F1`, `F2`, `F3`, `F4`, `F5`, `F7`, `F8`, `F10`. `P22-F6` is a planning note (the "1 / N" counter **stays**); `P22-F9` (Shopping filters) is Phase 3.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test of three areas: the item page, Packing and task rows, and the file picker (both places it appears). Design reference: `docs/design/mockups/P22-F4_item_page_additional_details.html` (+ `.md`) and the `P21` AddDialog board. Settings → אודות shows the exact `0.8.0-phase2.3-<hash>`.

## What changed that you should know about before testing

- **Found while testing, fixed:** a long chosen file name made the file box wider than the dialog (the name never reached its ellipsis). The box is now clamped to the dialog; re-checked live on the final build.
- **Decisions the Development Agent made** (change any you read differently):
  1. **Both chips under the location are gone** — the yellow "שם לחיפוש" **and** the green "אומת". The location is only the underlined map link. (The scope named only "שם לחיפוש"; a lone "אומת" chip would have been the same clutter.)
  2. **"פרטים נוספים" placement:** after the ticket carousel and **before** "+ הוספת מסמך", activities only. Rows: נקודת מפגש (map link), משך, מחיר ("120 ILS"), הגבלת גיל, כלול (with a muted "לא כלול: …" line), כמות כרטיסים. Only rows with a value; none → no row. Closed every time a page opens.
  3. **Category pages** (Trip Center → a category) use the same compact header with **no type chip** (the title already names the type). The "פריטים" label is removed; "הצעות פעילות" and "מקורות" keep their labels.
  4. **Proposal review screen:** the back arrow shares a row with the **confidence** chip (the screen's only chip).
  5. **Coverage summary** is text only: "כרטיסים: 3/5" and the muted "ללא כרטיס: …" line. The dots and the "1 / N" counter stay (`P22-F6`).
  6. **Carousel:** each slide is the full card width; the next slide is never visible (0px); the 12px gap sits outside the clipped viewport.
  7. **Participant-view chips** keep first names ("פאולה +3") as accepted in Phase 2.2.
  8. **Packing/task rows:** card padding on the phone is 10px (outer) / 8px (nested) instead of 16px / 16px; the name may take two lines, then an ellipsis; the chip keeps its width (max 55% of the row).

**State of the QA Trip when this session starts:** the `QA22` items from the previous round are left for you to test with. Leftover the UI cannot remove: `QA12-*` / `QA22-*` / `QA23-*` document sources (delete-from-UI is `P12-F7`, Phase 3) and a few entries in the rejected-proposals archive.

## Test A — the item page (`P22-F2`, `F3`, `F4`, `F5`, `F7`)

Open a hotel, a flight, a transport item, and an activity with several tickets (QA22 / the football match), on the phone.

**Expect:** **(F7)** a small back arrow (no border, 44px) and the type chip on **one row**, the title directly below — no "חזרה" button, no "פריטים" label, no large empty gap. **(F3)** a **globe icon only** at the end of the provider row ("אתר" is its accessible name, not visible text); the provider name stays on **one line**; **no chip** under the location (it is just the underlined map link). **(F2)** the tickets card shows the text "כרטיסים: 3/5" (+ "ללא כרטיס: …") with **no bar**; each ticket is a **full-width card** and **no part of the next ticket shows**; the last slide is centred; dots and "1 / N" show where you are; swipe still loops. **(F5)** on an unconfirmed slide the buttons read "✓ אישור", "פתיחה", "⋯" and sit on **one row inside the slide**; confirmed and unconfirmed slides are the same height. **(F4)** an activity with price / age limit / meeting point etc. shows a collapsed **"פרטים נוספים"** row after the tickets and before "+ הוספת מסמך"; tapping opens it in place with only the rows that exist; the meeting point opens the map; an activity with none of those values has no such row; leave the page and return → closed again.

**Development Agent verification (qa, 360 and 390px, DOM-measured):** ☑ F7: back row 44px on hotel/flight/car/activity pages, chip on the same row, no "חזרה" text, no "פריטים" `h3`. F3: globe 44×44 at the end of the provider row, row 44px (one line), 0 chips under the location. F2: no `.cover-bar`; slide = viewport (54–336 at 390px); neighbours 0px visible; loops; counter "1 / 3"; dots present; summary "כרטיסים: 3/5". F5: the "אישור ✓", "פתיחה", "⋯" row is inside the slide on all three slides at 360 and 390px, buttons 44px. F4: closed on open; FC Barcelona expanded to price, age limit, ticket quantity only; QA22 items (no values) have no row. **Not exercised:** a real finger on the carousel and the popover. **Result:** **PASS** — Product Owner, real phone, 2026-10-08.

## Test B — Packing and task rows (`P22-F1`, `P22-F8`)

Open Packing, then a participant's view, then the Tasks list, at the phone's normal width.

**Expect:** **(F1)** the page title is **"אריזה"**, fully visible beside "+ קטגוריה". **(F8)** item names have visibly **more room** than in Phase 2.2 — "QA22 לפאולה ולדניאל" is readable; a long name wraps to **two lines** and only then ends in "…"; the participant chip beside it is **whole**; nothing is cut at the screen edges and there is **no sideways scrolling**. Same on a task row (name wraps to two lines, chip whole, priority/date below).

**Development Agent verification (qa):** ☑ **360px:** page width 360, no overflow; Packing rows 56–60px, names 112–212px wide, every chip whole and inside the row; task rows fine. **390px:** page width 390, no overflow; Packing rows 56–60px, names 142–242px, tasks 64/84px, chips whole. F1: title "אריזה" not truncated at either width. **Result:** **PASS** — Product Owner, real phone, 2026-10-08.

## Test C — the file picker (`P22-F10`)

(1) "+" → מסמך. (2) Open an item → "+ הוספת מסמך".

**Expect:** a **dashed box with an upload icon and "בחירת קובץ"**, at least 52px high, the **whole box** tappable — not the browser's grey button with "לא נבחר קובץ". After choosing a file the box shows the **file name** (a long name ends in "…", never wider than the dialog) and a **"החלפה"** link; tapping again replaces the file. Closing and reopening the dialog starts empty; switching tiles and back keeps the chosen file while the dialog is open.

**Development Agent verification (qa, 390px):** ☑ both dialogs show the styled box (52px, upload icon); a chosen file shows its name and "החלפה". On the final build a 92-character name: box 20–370px (inside the dialog), name ellipsised at 263px, "החלפה" visible, no horizontal overflow. **Not exercised:** the real Android/iOS file picker (yours). **Result:** **PASS** — Product Owner, real phone, 2026-10-08.

## `P22-F7` — pages audited

| Page | Back action | Result |
|---|---|---|
| Item page — hotel, flight, transport/car, activity | yes | **Changed:** shared compact header + type chip; "פריטים" label removed (hotel and flight carried the old top). |
| Category pages — hotel, flight, transport, activity, insurance, restaurant, contact, document | yes | **Changed:** compact header, no chip, "פריטים" `h3` removed. |
| Proposal review screen | yes | **Changed:** compact header with the confidence chip on the same row; back returns to the Documents category. |
| Admin — ניהול הרשאות גישה, and the "no access" screen | yes | **Changed:** compact back arrow (was a labelled button). |
| Today, Timeline, Packing, Trip Center, Games, Tasks, Shopping, Settings | no (tab views) | Checked — no back action; unchanged. |
| Dialogs ("+" add, "הוספת מסמך", analysis screen) | ✕ close, not a back action | Checked — unchanged. |

No labelled "חזרה" button and no "פריטים" label remain anywhere in `src/` (asserted by a test; the single `aria-label="חזרה"` lives inside the shared `backRow()` helper).

## `P22-F8` — width check

| Width | Page overflow | Packing row height / name width | Chip | Tasks |
|---|---|---|---|---|
| **360px** | none (page 360) | 56–60px / 112–212px | whole, inside row | fine |
| **390px** | none (page 390) | 56–60px / 142–242px | whole, inside row | 64 / 84px, fine |

## Finding verification notes (one per finding)

| Finding | Development Agent verification |
|---|---|
| `P22-F1` Packing title | ☑ Test B: "אריזה", not truncated at 360/390px. Tests: `tests/beta-0-8-phase-2-3.mjs`. |
| `P22-F2` no bar, no peek | ☑ Test A: no `.cover-bar`; slide = viewport; neighbours 0px visible at 390px (and by arithmetic for 320–412px); counter + dots stay. |
| `P22-F3` globe-only site link, no chip | ☑ Test A: 44px globe, one-line provider row, no chip; every item type (decision 1: "אומת" also removed). |
| `P22-F4` "פרטים נוספים" | ☑ Test A: closed on open, only rows with values, none → no row, before "+ הוספת מסמך"; pure function unit-tested for every row/blank case. |
| `P22-F5` "✓ אישור" | ☑ Test A: one row inside the slide at 360 and 390px. |
| `P22-F7` compact header everywhere | ☑ page table above. |
| `P22-F8` Packing/task rows | ☑ width table above (360 and 390). |
| `P22-F10` styled file picker | ☑ Test C: both dialogs; long-name clamp fixed and re-checked on the final build. |

Not changed on purpose: `P22-F6` (counter stays), `P22-F9` (Phase 3).

## Product Owner session

**Real phone, 2026-10-08. Build check:** Settings → אודות shows `0.8.0-phase2.3-1736bb21` — matches.

**Test A:** step 1 — hotel page: back arrow + "מלון" chip on one row, title below, no "חזרה", no "פריטים" — PASS. Step 2 — QA22 carousel: text-only summary, no bar, full-width slides, nothing of the next ticket visible (incl. 3 / 3), "✓ אישור" / "פתיחה" / "⋯" on one row inside the slide, loops — PASS. Step 3 — globe-only at the end of the provider row, provider on one line, no chip under the location — PASS; **decision 1 ("אומת" removed too) approved**. Step 4 — FC Barcelona: closed "פרטים נוספים" after the tickets and before "+ הוספת מסמך", opens in place with only its rows, closed again after leaving — PASS; **decision 2 (activities only) approved**. Step 5 — category page: compact back arrow, no "פריטים" — PASS; **decision 3 (no chip on category pages) accepted**. **Test A result: PASS.**

**Test B:** step 1 — Packing in Paula's view: title "אריזה" fully visible beside "+ קטגוריה"; names have more room, long names wrap to two lines then "…"; chips whole; no clipping, no sideways scroll — PASS. Step 2 — task rows: title wraps to two lines then "…", chip whole, priority/date below, no sideways scroll — PASS. **Test B result: PASS.**

**Test C:** step 1 — "+" → מסמך: styled dashed box with upload icon and "בחירת קובץ"; after picking a file on the phone the name and "החלפה" show inside the dialog — PASS. Step 2 — review screen: back arrow with the "ביטחון גבוה" confidence chip on one row, title below — PASS; **decision 4 accepted**. Step 3 — item page "+ הוספת מסמך": same box, name + "החלפה" after picking, empty again after reopening — PASS. **Test C result: PASS.**

## Finding register (Product Owner session, 2026-10-08)

| Finding | Where | Severity | Disposition |
|---|---|---|---|
| `P23-F1` — Category pages (e.g. Trip Center → טיסה) still leave blank space: the back arrow sits alone on its own row, with the type icon and the title "טיסה" on the next row. | Test A, step 5 (category page) | Non-blocking | **Phase 3.** Put the back arrow, the type icon and the category title ("טיסה") on **one line**; the list starts directly below. Apply to every category page. |
| `P23-F2` — Tasks: a task whose due date has passed (and is not done) looks the same as any other. | Test B, step 2 | Non-blocking (enhancement) | **Phase 3.** Highlight overdue open tasks (e.g. the date in `--accent` with "באיחור", and/or a subtle `--accent-soft` row tint); done tasks are never highlighted. |

## GO/NO-GO decision

**GO** — Product Owner decision, 2026-10-08. Phase 2 (with corrections 2.1, 2.2, 2.3) is accepted on `qa`; work moves on to Phase 3. Still `qa` only — Production promotion happens only on Phase 3's own GO (`V147`). Tests A, B, C all run on a real phone: all PASS. All eight Phase 2.2 findings (`P22-F1`, `F2`, `F3`, `F4`, `F5`, `F7`, `F8`, `F10`) verified fixed; Development Agent decisions 1–4 approved/accepted. No Blocking or Medium findings. Two new Non-blocking findings, both → Phase 3: `P23-F1` (category-page header on one line), `P23-F2` (highlight overdue tasks).
