# FamilyTrips Beta 0.8 — Scope: Visual and Interaction System

Document revision: `V3`
Date: 2026-10-05
From: Product Owner's planning/QA-assistant (document-only)

**`V3` change note:** closes `G1`, the scope gap first flagged in Phase 1's own acceptance session
(2026-10-04): every remaining app screen is now explicitly assigned to Phase 2 or Phase 3 below, so
nothing is left implicit before Phase 2's kickoff. Also folds in three items Phase 1's correction rounds
surfaced along the way: `P12-F5` (name the tickets/documents section explicitly, for every item type) and
the sign-in screen's terracotta-filled "התחברות עם Google" button (found in Phase 1.2's own acceptance
session, Test 12) both go into Phase 2's scope below; `P12-F1` (Low, the About section's bidi-scrambled
build string) and `P12-F2` (Non-blocking, inactive participants still offered for new assignments) ride
along as Phase 2 acceptance criteria. Phase 1 itself (including corrections `1.1` and `1.2`) is now closed
— **GO**, 2026-10-05, on `0.8.0-phase1.2-ab9e513c` — see `MVP_DELIVERY_PLAN_CURRENT_STATE.md` for the full
closure record. The screen-to-phase assignment below is this assistant's own scoping call, not a decision
asked of the Product Owner; flag anything that reads wrong once Phase 2's kickoff is in front of you. No
other content below changed from `V2`.

## What this is

Beta 0.8 implements `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` (now at `V7.2`, after the two
carousel/chips revisions Phase 1's own correction rounds made) across the entire app, plus eight small
refinement items the Product Owner confirmed folding in (`MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V143`).
**No design-first gate applies** — the design work is already done; this is direct implementation against
an already-finished spec, the same posture `0.7.4`/`0.7.7`/`0.7.8`/`0.7.9` used for their own design-gate
decisions. **No discovery-document/benchmark entry gate applies either** — nothing here is a new AI Smart
Import extraction vertical; the Smart Import status-pill work in Phase 2 is a visual/interaction treatment
of an already-built pipeline, not new extraction logic.

**This is a materially larger candidate than anything this project has scoped before** — a visual and
interaction pass across nearly every screen, not a bounded feature. Sequenced into three phases at the
Product Owner's explicit direction (2026-09-28), each its own implementation → `qa` deploy → acceptance
session → GO/NO-GO cycle — but **unlike Alpha 0.7's nine sub-candidates, only one of which was ever "live"
at a time, Beta 0.8's three phases are pieces of a single visual system, not independent features.**
Promoting each phase to Production on its own would leave Production visibly half-restyled for however
long it takes the next phase to land (new tokens/Today, but old-styled Smart Import status UI and games,
for example). The Product Owner decided directly, 2026-09-28: **each phase still gets its own full
implementation → `qa` deploy → acceptance session → GO/NO-GO round** (so testing stays small and any
regression is easy to trace to a specific phase), **but nothing is promoted to Production until Phase 3's
own GO** — Phases 1 and 2 accumulate on `qa` only. Users see one coherent visual jump at the end instead
of a stretched-out partial restyle.

## Phase 1 — Foundation: tokens, navigation/RTL, Today, participant carousel — **closed, GO**

Covered spec §2 (tokens, typography, spacing), §3 (navigation, RTL, bidi, pressed/focus states,
animation), §4 (Today — all four documented cases), and §5 (participant selection carousel). Implemented
across three rounds (`0.8.0-phase1`, `0.8.0-phase1.1`, `0.8.0-phase1.2`) as Phase 1's own acceptance
sessions found and closed Blocking (`F3`, `F6`), Medium (`P11-F11`, `P11-F12`), and a long tail of
Non-blocking findings. **Accepted GO by the Product Owner, 2026-10-05, on `0.8.0-phase1.2-ab9e513c`** —
full detail in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`. Kept here for the record; no further action.

## Phase 2 — Item detail, add/edit forms, sign-in, Trip Center, Packing's own chrome, Smart Import status
system, and the eight refinement items

Covers spec §7's Smart Import processing-states subsection (the seven-state status pill and its binding
interaction rule, reused across the Intake Inbox, an item's Documents/Tickets area, and the proposal
review screen), the eight small refinement items the Product Owner confirmed folding into Beta 0.8
(listed below, unchanged from `V2`), and — closing `G1` — every high-traffic screen not already covered
by Phase 1: the item detail page (full redesign, not the minimal overflow patch Phase 1.2 already applied
for phone usability), add/edit forms (full redesign, not the "שמירה"-pinning patch Phase 1.2 already
applied), the sign-in screen, Trip Center's own category tiles and lists, and Packing's own list/category
card styling (separate from the participant carousel and header, both already done in Phase 1). These are
grouped into Phase 2 because they're the screens a Trip's day-to-day use touches most, alongside item
detail — which this phase already covers for the Smart Import status work. Phase 3 picks up the lower-
traffic screens (Settings, Timeline, Shopping) alongside games, per its own "remaining coverage" posture.

1. **`V6-F14`** — the Hotel review form's notes field currently restates every extracted value in full,
   even ones with their own structured field. Scope it down to roughly 3–5 of the most important items
   not otherwise captured in a structured field; the reviewer is expected to consult the attached
   original document for full detail. Does not relax the source-relative completeness/evidence contract
   itself — only what belongs in the free-text notes fallback.
2. **`V6-F16`** — the existing-item "Add document" flow currently requires picking between two separate
   first-level buttons (`תמונה`/Photo or `PDF`) before a file chooser appears. Replace with one unified
   "Add document" action whose single file picker accepts either an image or a PDF directly.
3. **Flight route-location label wording** — the Flight item's map/location label currently reads the
   full route ("BKK → TLV"); change it to the single departure airport code ("BKK"). Purely a label
   change — the Product Owner already confirmed (`V169`) the underlying map resolution is correct and
   unaffected either way.
4. **One-click "accept new value" merge-conflict action** — today, when `preserveTrustedFieldsOnMerge`
   flags a new value in conflict with an existing trusted one (surfaced as a plain-string item warning,
   e.g. "ערך חדש התגלה עבור X"), the only way to actually adopt the new value is to manually re-type it
   into the field — `V6-F54`'s dismiss control clears the warning but does not apply the value. Add a
   one-click action on that warning that applies the flagged new value to the field and clears the
   warning in one step, alongside the existing dismiss-without-changing option. Does not change the
   underlying preserve-trusted-value contract (the old value is never silently overwritten without this
   explicit action).
5. **`V6-F80`** — a needs-review warning on an item's detail view currently offers only "אישור כנכון"
   (confirm as correct); there's no explicit "this isn't right" affordance from the warning itself (a
   functional workaround exists — editing the field value directly re-triggers reconciliation — but
   it's not discoverable from the warning). Add an explicit "not correct" action alongside "confirm as
   correct".
6. **`V7-F15`** — an item's detail view currently shows two visually separate ticket-related sections:
   the Smart-Import ticket-holder/passenger table above, and the document list with its confirm-as-
   ticket-coverage action below. Unify into one coherent section.
7. **`V7-F16`** — no undo/un-confirm action exists if "confirm as ticket coverage" is clicked by
   mistake. Add one.
8. **`CR-005`** — removing an Editor from a Trip via Trip Settings' sharing section works correctly but
   gives no explicit confirmation that the removal succeeded. Add a confirmation message, consistent
   with the spec's own transient-success-confirmation pattern (§7's "Attached" Smart Import state, the
   offline/sync strip's own success-is-transient rule).

**Acceptance criteria:**
- All seven Smart Import status-pill states (queued, processing, partial, needs review, failed,
  attached, rejected) render exactly per §7, in all three reuse locations (Intake Inbox, an item's
  Documents/Tickets area, the proposal review screen) — same component, not three separate
  implementations.
- `--accent-soft` appears on exactly one of the seven states (`needs review`) in each of the three
  locations — never spread across Processing or Partial too.
- The Processing state's swaying-palm icon, three-dot pulse, rotating status line, and indeterminate
  hairline all animate per §7's exact timing; the icon stays within the exception's stated limits (≤24px,
  single outline stroke, `--ink` plus the two `--accent` coconuts only).
- The interaction rule is enforced: a confirming action (e.g. proposal review's "המשך") stays visibly
  disabled, not tappable, while status is Processing, and never produces a false "no document selected"
  result — reproduces and closes `V6-F11` at the design level, as the spec intends.
- Each of the eight refinement items above passes its own stated acceptance criterion, individually
  testable.
- **The item detail page's tickets/documents section is explicitly named and redesigned, per `P12-F5`**
  — not folded silently into a general page-layout pass. It must separately address: ticket coverage
  (which participants are covered, confirming/un-confirming coverage), linked documents (name, status,
  open/remove), and "used" tracking for a confirmed ticket — each its own clear piece of the section, not
  one undifferentiated list, and all of it fitting the phone width Phase 1.2 already fixed for the page's
  own document rows.
- Add/edit forms (every item type, tasks, participants, packing items) are redesigned to the spec's own
  token/spacing/typography rules, go beyond Phase 1.2's phone-width patch (full-width fields, grouped
  logically, no cut-off controls at any screen width Phase 1–1.2 already tested at).
- The sign-in screen matches the spec's tokens and button styling — the "התחברות עם Google" button is no
  longer terracotta-filled (terracotta is reserved per §1/§2.1's soft-tone mapping; a sign-in action is
  not a "needs attention" or urgent state).
- Trip Center's category tiles and lists, and Packing's own list/category card chrome (distinct from the
  carousel and header already done in Phase 1), match the spec's card/spacing/token rules.
- `P12-F1` (Low): the About section's build-version string and the "Beta X.Y.Z" label are wrapped in
  `<bdi>`/`unicode-bidi: isolate` so they never render bidi-scrambled.
- `P12-F2` (Non-blocking): every participant picker (document assignment, ticket coverage, event
  ownership, and any other existing picker) excludes inactive participants from new assignments; existing
  assignments to a since-deactivated participant stay, shown greyed with "(לא פעיל)" and removable.
- General regression: existing Smart Import extraction/approval behavior, item editing, and the
  underlying data these items touch (ticket coverage, Editor removal, merge-conflict resolution,
  participant assignment) are otherwise unaffected — restyling and the two riding-along fixes change how
  things are surfaced/confirmed, not what data is stored.

## Phase 3 — Games, Settings, Timeline, Shopping, remaining empty/loading/offline coverage, full
acceptance pass

Covers spec §6 (games list and game page), the Settings screen (trip settings form, participants
management section, sharing section, admin/invitation section), the Timeline/calendar view, and the
Shopping list screen — closing `G1`'s remaining lower-traffic screens — plus completing §7's
empty/loading/offline-state principles across any screen not already covered by Phase 1 (Today) or Phase
2 (Smart Import's own loading/processing treatment, item detail, add/edit forms). Closes with the full §9
accessibility/visual acceptance pass across the whole of Beta 0.8, not just this phase.

**Acceptance criteria:**
- Games list matches §6: compact catalog (not a gallery), the five named filters, active/inactive filter
  styling, 56px minimum row height, the star as an independent 44×44px tap target with at least 8px
  separation from the row's own tap zone.
- Game page matches §6: uniform page shape (name, description, match, duration, primary action);
  interactive games show "התחל משחק"/"המשך משחק" and run in-app; non-interactive activities show
  instructions plus "התחל פעילות".
- Settings (trip form, participants, sharing, admin), Timeline/calendar, and Shopping all match the
  spec's tokens, spacing, typography, and component rules — the same bar Phase 1 and 2 held their own
  screens to.
- Every remaining screen with an empty, loading, or offline/sync state (per §7's general principles) uses
  the specified treatment — line icon + headline + explanation for empty, the uniform
  `--border`-on-`--surface` skeleton (not a spinner) for loading, and the persistent `--accent-soft` top
  strip for offline/sync, disappearing immediately on sync success with no separate success message.
- Full §9 pass across the entire Beta 0.8 implementation: contrast-tool verification of every token pair
  actually used at normal-text size (≥4.5:1), no RTL breakage/clipped text/unintended horizontal scroll
  anywhere touched by Phases 1–3, and a side-by-side screenshot comparison against the spec's own
  described states.
- General regression across the full app: nothing from Phases 1–2 has regressed by the time this phase
  closes.

## Non-goals

- Dark mode — explicitly deferred in the spec itself (§8), an open product decision not made yet, not
  part of Beta 0.8.
- Any change to the datastore's access-control shape or the sync engine — Beta 0.8 is visual/interaction
  only; nothing here touches Firestore rules, Storage rules, or the sync/offline-reconnect mechanism
  itself (only how offline/sync state is *displayed*, per Phase 3). Phase 1's corrections did add one
  small, acknowledged exception — the `endedAt` item field (Phase 1.1, Decision 1) — a deliberate,
  additive content field, not an access-control or sync-engine change.
- Any new Smart Import extraction vertical or field — the status-pill work is a visual treatment of the
  existing pipeline, not new extraction scope.
- Deleting participants or shopping-list items (`P12-F3`, `P12-F4`) — both routed to the backlog for the
  Product Owner to schedule separately with this assistant, not part of any Beta 0.8 phase.
- Any of the independent backlog items confirmed unrelated to Beta 0.8 at `V143` (`0.7.10`, calendar
  export, the Google Play Store note, `V7-F14`, `WC-001`) or the three new documents-bin findings from
  `0.7.9.2` (`V145`) — none of these are in scope for any Beta 0.8 phase.

## What's needed now

**Phase 1 is closed.** Phase 2 is scoped above, including the `G1` screen assignments and the two
riding-along fixes (`P12-F1`, `P12-F2`); it is not yet kicked off — that is a separate prompt, staged but
withheld until this assistant sends explicit authorization, matching every prior phase transition in this
project. Phase 3's own kickoff follows once Phase 2 is accepted GO on `qa`.
