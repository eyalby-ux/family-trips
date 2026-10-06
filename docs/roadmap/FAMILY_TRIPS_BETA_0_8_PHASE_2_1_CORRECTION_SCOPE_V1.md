# FamilyTrips Beta 0.8 Phase 2.1 — Correction Package Scope (`0.8.0-phase2.1`)

Document revision: `V2`
Date: 2026-10-06
From: Product Owner's planning/QA-assistant (document-only)

**`V2` change note (2026-10-06, QA session):** the approved `P2-F4` mockup is now in the project and the
repository (see "Design reference for `P2-F4`" below), replacing `V1`'s "design input not yet available" note.
`P2-F4` item 2/3 wording corrected to match the approved mockup: the carousel holds **ticket documents linked
to a participant, confirmed or not yet confirmed** (an unconfirmed one shows "אישור ככרטיס" on its slide), and
the list below holds every **other** document. `V1` said "two or more confirmed tickets" and put unconfirmed
tickets in the list below, which contradicted the slide actions it described and the mockup. No other change.

## What this is

Phase 2 (`0.8.0-phase2-7f5e33fa`) ended **NO-GO**, 2026-10-06
(`docs/versions/V7/0.8.0-phase2/EXECUTABLE_TEST_SESSION_V1.md`, recorded directly by the Product Owner —
not yet committed to the repository; see "What's needed now" below). No Blocking findings; the mandatory
Product Owner tests otherwise passed (Tests 2, 3, 7, 8, 12 PASS, two of them — 2 and 7 — with findings;
Test 5 Partial). This document scopes the correction round the Product Owner routed those findings into:
one Medium (`P2-F5`, which also closes backlog item `P12-F4`) and five Non-blocking (`P2-F1`–`P2-F4`,
`P2-F6`). `P2-F7` (participant photos) goes to the backlog, not this round. `P2-F8` is a planning note for
Phase 3's own scope, not a Phase 2.1 fix. Everything here stays on `qa` only — unchanged from every prior
Beta 0.8 phase, still gated on Phase 3's own eventual GO for any Production promotion (`V147`).

## Design reference for `P2-F4`

The mockup the Product Owner approved on 2026-10-06 ("Item Page — Tickets Carousel") is the
**authoritative visual reference** for `P2-F4`; if it and the written disposition below ever disagree, the
mockup wins and the disagreement is reported back. It is available in three places:
- **Project docs:** `claude/MOCKUP_P2_F4_ITEM_PAGE_TICKETS_CAROUSEL.md` (written description of every
  element, tokens and behaviour) and `claude/MOCKUP_P2_F4_ITEM_PAGE_TICKETS_CAROUSEL.html` (standalone static
  snapshot, opens in any browser at 390px).
- **Repository:** `docs/design/mockups/` — the same `.md` and `.html`, plus
  `P2-F4_item_page_tickets_carousel.dc.html`, the original Design-canvas source (needs the canvas runtime to
  render; kept for exact spacing/colours). Not yet committed — commit them with the Phase 2 session document.
- **Interactive original:** a private Design artifact in the Product Owner's claude.ai account; ask him to
  share it if a clickable version is needed.

## Findings in this correction package

**Medium (must close before this round can go GO):**
- **`P2-F5`** — found on Test 7, real phone: Packing's row edit/delete buttons overlapped the item name
  and the participant chip; a chip listing five names wrapped to one name per line. Fix: Packing **and**
  Shopping rows both adopt the Tasks pattern (`P11-F13`) — a compact row (checkbox, name, participant
  chip), tapping the row opens it for edit, delete lives inside the edit screen with a confirmation step.
  This reverses Phase 1.2's "equipment keeps its delete" exception for Packing rows specifically (Tasks
  already moved; Packing and Shopping now match). The participant chip stays on one line in every context
  that uses it (task rows, packing rows, shopping rows, ticket coverage): two names shown in full; more
  than two shows the first name plus a count (e.g. "אייל +4"); everyone assigned shows "כולם." **Closes
  backlog item `P12-F4`** (the Shopping delete action), pulled forward into this round by the Product
  Owner rather than waiting for Phase 3.

**Non-blocking:**
- **`P2-F1`** — found on Test 2, real phone: the Processing palm read as too small for a full-screen wait.
  Fix: a large palm (~96–120px) centered on the analysis screen, gentle sway plus a slight bob, rotating
  status line and hairline below it, "המשך" stays disabled throughout, respects reduced motion. The
  existing small pill version is unchanged and stays in lists. Ink plus the two terracotta coconuts only —
  no new color. **Spec change:** `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` §1 and §7, applied as
  `V7.4` (already drafted and independently verified against source by this assistant — see "What's
  needed now"). The old "icon-scale-only, Smart Import only" limit on the palm motif is lifted by the
  Product Owner; it does not open the door to any other new illustrated element.
- **`P2-F2`** — found on Test 2: the app still falls back to a plain hourglass for other full-screen waits
  (app start/refresh, sign-in), so the palm is not actually the app's only "in process" display yet. Fix:
  the large floating palm (`P2-F1`) is used for every full-screen wait — app start/refresh, sign-in, and
  Smart Import analysis — and the small palm for every inline wait (saving, syncing, list pills); remove
  the hourglass and any other spinner wherever one remains. **Skeleton placeholders for content that is
  loading are explicitly unaffected** — the Product Owner confirmed these stay as already specified
  (§7's loading-state principle). Same `V7.4` spec change as `P2-F1`, same section.
- **`P2-F3`** — found on Test 3: during item creation, a ticket document can only be linked to the item,
  not directly to a participant, so the same linking has to be repeated on the item page afterward. Fix:
  the review/creation screen offers "שיוך למשתתפים" (and confirm-as-ticket-coverage) directly on the
  attached document, same as the item page already does. Linking a ticket document to a participant
  automatically adds that participant to the item's own participant list (**add only, never removes**
  anyone); linking only the item (no document-level participant link) does not create ticket coverage.
  Same automatic add-on-link behavior on the item page itself, for consistency. Inactive participants are
  never offered, matching `P12-F2`'s existing rule everywhere else.
- **`P2-F4`** — found on Test 5: the item page currently shows three separate ticket/document pieces, and
  the same document can appear twice (in the confirmation list and the linked-documents list). **Reverses
  the Phase 2 decision to keep the ticket section's dual listing as implemented** (`FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md`
  `V7`, decision 1) at the Product Owner's explicit request, following this test. Fix — one card,
  "כרטיסים ומסמכים":
  1. **Coverage summary** on top: "כרטיסים: N מתוך M" plus who still has no ticket.
  2. **Two or more ticket documents linked to a participant (confirmed or not yet confirmed) → a carousel,
     one ticket per slide**: holder name, seat/gate detail, status chip ("כרטיס מאושר" / "לא אושר ככרטיס"),
     "נוצל" on a confirmed ticket or "אישור ככרטיס" on an unconfirmed one, the file name, "פתיחה," and a "⋯"
     overflow for "ביטול אישור," "שיוך," and "הסרה." One swipe moves exactly one ticket, loops, shows a
     "1 / N" counter, and the neighbor peeks — the same carousel mechanics already specified for the
     participant picker in §5, applied here to tickets. **Exactly one such ticket → a single card**, no
     carousel.
  3. **Every other document** (not a ticket linked to a participant) in a short "מסמכים נוספים" list below
     the carousel/card — **each document listed exactly once** in the whole card; this is what actually
     fixes the double-listing.
  4. **"הוספת מסמך"** at the bottom of the section.

  **Page order on the item detail page:** type/title/facts and contact actions (ניווט/אתר/התקשרות) first,
  as today → this unified tickets-and-documents card → notes → עריכה/מחיקה.
  **Reference:** the approved mockup — see "Design reference for `P2-F4`" above.
- **`P2-F6`** — found on Test 7: the "+" add dialog's options use colored emoji (✍️ 📎 🔗 ⬆️ ▦ ✅), and the
  selected option still uses the old green fill. Fix: Tabler outline icons in `--ink`, matching every other
  icon in the app (§3); the selected option uses the spec's own selection style (`--teal-soft` background,
  ink border) instead of the green fill. Apply the same fix anywhere else an emoji survived on the screens
  Phase 2 touched.

## Elsewhere — not part of this correction round

- **`P2-F7` (backlog, Product Owner to plan):** a request for an optional photo on each participant —
  gallery or camera, cropped to a circle, stored small — shown in the participant carousel, participant
  chips, ticket coverage/carousel, and pickers, falling back to the initial-letter circle when absent;
  replace/remove from the participant's own edit form. Not scoped further here; this assistant will plan
  it as its own backlog item, separately from Phase 2.1/Phase 3, once there's room to take it up.
- **`P2-F8` (planning note):** the Shopping screen still looks pre-Beta-0.8 (🛒/📍 emoji, heavy place
  cards, row layout) — already inside Phase 3's restyle scope, but the Development Agent flagged that
  Phase 3's own scope document should name it explicitly rather than leave it folded into a general
  "Shopping" mention. Addressed directly in `FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` `V8` (alongside this
  document): Phase 3's Shopping bullet now names line icons (replacing the emoji), quieter place cards, and
  the compact row layout `P2-F5` introduces for Packing/Shopping, explicitly.

## Re-test plan, once implemented

A real-phone re-test of exactly the tests these findings came from:
- **Test 2** — the large floating palm, and that it (not an hourglass) is what shows for app start/refresh
  and sign-in too.
- **Test 3** — linking a ticket document to a participant during item creation, including the
  automatic add-to-item-participants behavior and that it never removes anyone.
- **Test 5** — the unified card against the approved mockup, the ticket carousel at 2+ tickets (including an
  unconfirmed one), the single-card form at exactly 1, each document listed once, and the page order.
- **Test 7** — Packing and Shopping rows (tap-to-edit, delete inside the edit screen, one-line participant
  chip at every count), and the "+" dialog's icons.

Every other test from the Phase 2 session (1, 4, 6, 8, 9, 10, 11, 12, 13, 14) is unaffected by this round
and does not need a re-run unless this round's implementation touches something those tests cover.

## What's needed now

1. **Commit the Phase 2 session document first, as the Product Owner recorded it — no content change.**
   It currently sits uncommitted in the repository working tree
   (`docs/versions/V7/0.8.0-phase2/EXECUTABLE_TEST_SESSION_V1.md`) with every result, the finding register,
   and the NO-GO decision already filled in directly by the Product Owner. Commit it as-is, together with the
   three `P2-F4` mockup files under `docs/design/mockups/`.
2. Implement the Medium finding and all five Non-blocking findings above, through the full quality gate
   (syntax checks, the full test suite including any updated pinning assertions, and a production build),
   deployed to the fixed `qa` alias as `0.8.0-phase2.1`.
3. Apply `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` `V7.4` (staged alongside this document — §1's
   exception bullet reworded, and a new "The swaying-palm loading indicator" subsection under §7 covering
   both the large floating and small inline forms) to the repository copy, diffed against the current
   `V7.3` copy there.
4. Draft a new executable acceptance test session document covering the real-phone re-test plan above, plus
   a Development Agent verification note for every one of the six findings in this package (same format as
   every prior round's session document).
5. Report back — commits, build identifier, what was built, anything that didn't check out against this
   scope or the `P2-F4` mockup — for independent verification before this assistant drafts the correction's
   own QA acceptance-session prompt.
