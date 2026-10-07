# FamilyTrips Beta 0.8 Phase 2.2 — Correction Package Scope (`0.8.0-phase2.2`)

Document revision: `V2` (V1 + the approved "Phase 2.1 Findings — Proposals" mockup is now available — see "Design reference")
Date: 2026-10-07
From: Product Owner's planning/QA-assistant (document-only)

## What this is

Phase 2.1 (`0.8.0-phase2.1`, commits `959008a`–`c121a59`, acceptance results recorded by the Product
Owner directly into `docs/versions/V7/0.8.0-phase2.1/EXECUTABLE_TEST_SESSION_V1.md` and committed as-is —
`9d2347d`) ended **NO-GO**, 2026-10-07. No Blocking or Medium findings; all four mandatory real-phone
re-tests (2, 3, 5, 7) passed — Test 3 cleanly, Tests 2, 5, and 7 with findings. Fourteen Non-blocking
findings (`P21-F1`–`P21-F14`) were recorded, all already disposed by the Product Owner directly in the
session document: thirteen (`P21-F1`–`P21-F6`, `P21-F8`–`P21-F14`) route into this correction round;
`P21-F7` goes to Phase 3 instead (addressed directly in `FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` `V9`, alongside
this document). Everything here stays on `qa` only — unchanged from every prior Beta 0.8 phase, still
gated on Phase 3's own eventual GO for any Production promotion (`V147`).

## Design reference

**"Phase 2.1 Findings — Proposals" (approved by the Product Owner, 2026-10-06)** is now in the repository
at `docs/design/mockups/` (and in the project as `claude/MOCKUP_P21_FINDINGS_PROPOSALS.md` / `.html`):
- `P21_FINDINGS_PROPOSALS_MOCKUP.md` — what each board shows, finding by finding;
- `P21_findings_proposals.html` — standalone snapshot of all five boards (opens in any browser, 390px each);
- `P21_proposals_{Main,Packing,Shopping,AddDialog,Analyzing}.dc.html` — the Design-canvas sources.

The boards cover `P21-F1`–`P21-F10` only. `P21-F11`–`P21-F14` were raised after the boards were approved
and are text-only; the Packing board's header predates `P21-F12` (build the header per F12), and the phone
"התקשרות" row in `P21-F3` (confirmed by the Product Owner 2026-10-07) is not drawn. **Where a board and the
written disposition below differ, the written disposition wins.**

## Findings in this correction package

All **Non-blocking**, all found on the Phase 2.1 real-phone re-test, 2026-10-06/07.

**From Test 5 (the tickets-and-documents card and the item page generally):**
- **`P21-F1`** — a large bordered "חזרה" button on its own row plus the type chip on another row waste
  ~100px above the title. Fix: a small back-arrow icon button (44px tap target, no border) and the type
  chip share one row; the title sits directly below.
- **`P21-F2`** — the map/navigation action is a separate button. Fix: the location name itself becomes the
  map link (pin icon, underlined); remove the separate map button. **Applies to every item type** (hotel,
  flight, transport, activity, restaurant, etc.), not only attractions.
- **`P21-F3`** — the website action is a separate button. Fix: an "אתר" link with a globe icon at the end
  of the provider row; remove the separate button. **Applies to every item type.** Same pattern for a phone
  number: a "התקשרות" link on its own fact row, not a separate button (confirmed by the Product Owner,
  2026-10-07).
- **`P21-F4`** — the "פרטי הכרטיס" card (including the folded "פרטי כרטיסים מהמסמך" from Phase 2.1's own
  mockup deviation 4) duplicates what the tickets-and-documents card already shows. Fix: remove the card
  entirely; ticket/holder detail lives only inside "כרטיסים ומסמכים." This supersedes Phase 2.1's mockup
  deviation 4.
- **`P21-F11`** — the ticket carousel's layout breaks down inside the item's own card (root cause: the
  card is nested one level deeper than the approved mockup assumed — Phase 2.1's mockup deviation 1): the
  "⋯" popover clips at the top of the card; roughly a third of the next slide shows instead of a small
  peek; the "⋯" button sticks out past the slide's edge; the holder name wraps onto two large lines;
  "אישור ככרטיס" wraps inside its own button; the coverage summary wraps beside its bar. Fix: the popover
  renders above everything else, never clipped; the next-slide peek is ≤~24px (supersedes Phase 2.1's
  mockup deviation 6, which had already shrunk the coverage bar to fit); the action row fits inside the
  slide with no button wrapping; the holder name and the coverage summary each render on one line (a
  shorter label such as "כרטיסים: 1/5" works, or move the bar below the line if needed).

**From Test 7 (Packing, Shopping, the "+" dialog):**
- **`P21-F5`** — in a participant's own view (e.g. Paula's), a shared item's chip shows "אייל +4" instead
  of starting with the selected participant. Fix: in a participant's own view the chip starts with that
  participant ("פאולה +4", or "פאולה, דניאל" for exactly two); the shared view keeps the existing rule.
- **`P21-F6`** — the participant chip sits under the item name on a Packing row. Fix: the chip sits on the
  same line as the name; the name truncates with an ellipsis before the chip ever wraps. Same rule on task
  rows.
- **`P21-F8`** — the "+" dialog still offers QR and JSON, no longer needed now that Smart Import works.
  Fix: remove QR and JSON from the dialog; ידני / מסמך / קישור / משימה remain.
- **`P21-F9`** — the "+" dialog's option buttons are tall enough that the form below them sits off-screen.
  Fix: four compact tiles in one row (icon over label, ~72px tall; the selected tile uses `--teal-soft`
  fill with an ink border, matching `P2-F6`'s existing selection style), so the form and "המשך" fit on
  screen without scrolling.
- **`P21-F12`** — Packing wastes space at the top: the title wraps onto two lines beside a large filled
  "קטגוריה חדשה" button, then a three-line explanation, then a large carousel — pushing the first item
  below the fold. Fix: one header row (title on one line + a small outline "+ קטגוריה" button); remove the
  three-line explanation; a more compact carousel (smaller avatars, tighter spacing) so the first category
  sits in the top half of the screen.
- **`P21-F13`** — an empty Packing category (0 of 0 items) says "הכול נארז." with an empty progress bar,
  which reads as done rather than empty. Fix: an empty category shows a muted "אין פריטים בקטגוריה," no
  progress bar, no "0/0," plus a "+ הוספת פריט" action; "הכול נארז." is reserved for a category that has
  items and all of them are packed.
- **`P21-F14`** — the Shopping item's owner is free text, which supersedes Phase 2.1's own Test 7 decision
  ("Shopping rows show the free-text owner"). Fix: the owner becomes a dropdown of the trip's active
  participants (inactive ones excluded, per the existing `P12-F2` rule everywhere else).

**From Test 2 (the swaying-palm loading indicator):**
- **`P21-F10`** — during Smart Import analysis, the large palm sits at the bottom of the screen, under the
  Add dialog's own options, rather than being the clear focus of a full-screen wait. Fix: the analysis
  state replaces the dialog's content entirely — the large palm centered on screen with "מנתח…", the
  rotating status line, the hairline, and a short reassurance line; the greyed "המשך" stays at the bottom.

## Elsewhere — not part of this correction round

- **`P21-F7` (Phase 3):** on the Shopping screen, "מקום חדש" and "פריט חדש" are misaligned with their
  section titles. Fix, scoped directly into Phase 3 (`FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` `V9`, alongside
  this document, as part of the Shopping restyle `P2-F8` already named there): identical header rows —
  title plus a matching small outline "+" button, same size, vertically centered — for every Shopping
  section. (The Shopping board in the design reference shows this.)

## Re-test plan, once implemented

A real-phone re-test of exactly the areas these findings touch:
- **Item detail page** (Tests 5/6 territory): the back-button/chip row layout, inline map/website/phone
  links on every item type, the "פרטי הכרטיס" card's removal, and the ticket carousel at every slide count
  inside the item's own card (no clipping, no wrapped buttons, holder name and coverage summary each on
  one line).
- **Packing** (Test 7 territory): the compact header, the empty-category treatment, the chip's
  participant-view ordering, and the chip-on-one-line-with-the-name layout (also check task rows for the
  same chip rule).
- **Shopping**: the owner dropdown, and — if this lands in the same pass as `P2-F8`/Phase 3 — the aligned
  section headers.
- **The "+" dialog**: QR/JSON removed, the four-tile layout, the form fitting on screen without scrolling.
- **Smart Import analysis screen**: the palm's full-screen placement replacing the dialog content.

Every other Phase 2/2.1 test is unaffected by this round and does not need a re-run unless this round's
implementation touches something it covers.

## What's needed now

1. Implement all thirteen findings above (`P21-F1`–`P21-F6`, `P21-F8`–`P21-F14`) through the full quality
   gate (syntax checks, the full test suite including any updated pinning assertions, and a production
   build), deployed to the fixed `qa` alias as `0.8.0-phase2.2`, using the design reference above for
   `P21-F1`–`P21-F10`.
2. `P21-F7` needs no action here — it's scoped into Phase 3 instead (see above).
3. Draft a new executable acceptance test session document covering the re-test plan above, plus a
   Development Agent verification note for every one of the thirteen findings in this package (same
   format as every prior round's session document).
4. Commit the design-reference files under `docs/design/mockups/` (`P21_*`, placed there uncommitted) and
   the Phase 2.1 session document's later edits, if not already committed.
5. Report back — commits, build identifier, what was built, and anything that didn't check out against this
   scope or the design reference — for independent verification before this assistant drafts the
   correction's own QA acceptance-session prompt.
