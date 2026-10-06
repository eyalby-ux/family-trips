# FamilyTrips Beta 0.8 — Scope: Visual and Interaction System

Document revision: `V7`
Date: 2026-10-06
From: Product Owner's planning/QA-assistant (document-only)

**`V7` change note:** records Phase 2's build and the Product Owner's resolution of the three open
decisions the Development Agent raised while implementing it. **Phase 2 is built, committed (five commits,
`4af4373`…`8a18f43`, `version/V7`), and live on `qa` at `0.8.0-phase2-7f5e33fa`** — independently confirmed
directly in the repository before this edit (commit history, `git show --stat` on each commit, the gate's
own test file re-run directly, the acceptance-session document read in full). Not yet accepted GO; that
follows the Product Owner's and QA agent's own acceptance session against
`docs/versions/V7/0.8.0-phase2/EXECUTABLE_TEST_SESSION_V1.md`'s 14 tests. Two pre-existing bugs, unrelated
to Phase 2's own scope, were found and fixed along the way (a lost analysis result overwriting a
since-replaced source copy; a "processing" status with no timeout, now failing after 5 minutes with retry
and delete) — both are why the QA Trip had stuck sources before this round. **Three decisions, resolved
directly by the Product Owner, 2026-10-06:**
1. **Ticket confirmation moved out of the document row** (so a document can now appear in both the
   confirmation list and the documents list) — this differs from the explicit round-3 "one place only"
   instruction, but the Product Owner confirmed **keep as implemented**; Phase 2's four-piece section
   (coverage, confirmation, holders, linked documents, `P12-F5`) stands as built, no revert needed.
2. **Header restyle** (green gradient → the spec's surface colour), done outside this round's formal
   scope — the Product Owner confirmed **keep it**. Implemented as an added overriding CSS rule rather
   than an edit to the original `.top{}` rule (confirmed directly in `src/styles.css`); a minor
   code-cleanliness item, not a functional one — left as a backlog tidy-up note, not a blocking finding.
3. **Orphan sources** (no delete action exists for a source that isn't in the `failed` state) — the
   Product Owner confirmed **add to backlog**: scoped below as `P12-F7`, folded into Phase 3 alongside
   `P12-F3`/`P12-F4`, the same way those two were folded in at `V4`.

The fourth item the Development Agent flagged — the "ממתין בתור" ("queued") label standing in for a real
queue state, since the app has none — is accepted as a reasonable technical necessity and needs no
Product Owner decision; no change below.

**`V6` change note:** `P12-F6` is fixed and tested live — removed from Phase 2's riding-along list below,
closing it out of Beta 0.8 entirely rather than carrying it into Phase 2's own implementation pass.
Independently confirmed directly in the repository before this edit: commit `db74e02` ("Fix `P12-F6`:
carousel arrow keys follow screen position") changes exactly `src/participant-carousel.js` (a new pure
`arrowKeyTarget()` picking the neighbor by measured screen position rather than a hard-coded prev/next
swap — correct for the 3+ option carousel, the 2-option case, and the wide-screen row alike), `src/v5-app.js`
(the keydown handler now measures via `getBoundingClientRect()` and calls `arrowKeyTarget()`, leaving the
drag/swipe gesture's own reading-direction rule untouched), and the two test files (`arrowKeyTarget`
exercised under both RTL and LTR placement, every position, every layout). `node tests/beta-0-8-phase-1-2-logic.mjs`
and `node tests/beta-0-8-phase-1.mjs` both re-run directly — all pass, including the three new `P12-F6`
checks. Design spec `V7.3`'s §5 wording already described the fix at the right level (by screen position,
not by implementation mechanism) and needs no further change. Phase 2's acceptance-criteria bullet for
`P12-F6` is removed below; the fix stands closed on its own, outside any phase's formal acceptance round,
the same way a small isolated correction occasionally has throughout this project.

**`V5` change note:** fixes a real gap the Development Agent caught while diffing `V4` against the live
repository: `P12-F6`'s acceptance criterion asked for verification "in at least two different screens that
use the carousel," but `participantCarousel()` has exactly one caller today (`packingView()`) — the
Development Agent confirmed this directly (`grep` across `src/v5-app.js`), and separately confirmed the
bug itself live (the "next" option measured on the left of the selected one, with Right Arrow selecting
it) before any code changed, since no implementation is authorized yet. The criterion below now asks for
verification on the one screen that actually has the control, plus any further carousel call sites Phase
2's own add/edit-form work happens to introduce along the way — it does not require manufacturing a second
use case to satisfy the test. No other content below changed from `V4`.

**`V4` change note:** schedules the two Beta 0.8 backlog items `V3` had explicitly excluded. The Product
Owner decided, 2026-10-05: **`P12-F3` (delete participants) and `P12-F4` (delete shopping items) fold
into Phase 3** rather than becoming a separate candidate — Phase 3 already visits Settings' participants
section and the Shopping screen for the visual restyle, so this adds the delete capability there once
instead of touching those screens twice. Both are genuine functional additions, not restyle items, and
are called out explicitly in Phase 3 below the same way the `endedAt` field was called out as an
acknowledged exception in Phase 1.1 — Beta 0.8 otherwise stays visual/interaction only. `P12-F3`'s own
scope was resolved directly by the Product Owner: **deleting a participant is blocked while they have any
existing assignment** (document, ticket, task, or packing item) — the delete action stays disabled with a
message pointing to the existing deactivation mechanism (`P12-F2`) instead; only a participant with zero
existing assignments can be deleted. This needs no cascade-clear logic and leaves no orphaned references.
Separately, the Product Owner confirmed the HMI design spec's one remaining unscheduled item — dark mode
(`FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` §8) — **stays deferred, not part of Beta 0.8 in any
form.** Every other design-spec section (§2–§7, §9) was independently cross-checked against this
document's Phase 1/2/3 assignments and confirmed fully covered; nothing else is missing. **One new finding
surfaced during that same cross-check, reported directly by the Product Owner and confirmed in source by
this assistant: `P12-F6`** — the participant carousel's arrow keys move the highlight in the direction
opposite their own name (Left Arrow visibly moves the selection right). Root cause: §5's arrow-key clause
bound the keys to the same next/previous logic as the RTL drag rule, but this app's RTL layout actually
renders the DOM-order "next" option to the visual *left* of center and "previous" to the visual *right* —
the drag gesture is unaffected and remains correct; only the arrow-key binding inverted. The design spec
is bumped to `V7.3` to fix §5's wording (arrow keys now specified by screen position, independent of the
drag rule); `P12-F6` is added below as a third riding-along fix in Phase 2, alongside `P12-F1`/`P12-F2` —
a small, isolated two-line code change, no reason to reopen the already-closed Phase 1 round for it. No
other content below changed from `V3`.

## What this is

Beta 0.8 implements `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` (now at `V7.2`, after the two
carousel/chips revisions Phase 1's own correction rounds made) across the entire app, plus eight small
refinement items the Product Owner confirmed folding in (`MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V143`).
**No design-first gate applies** — the design work is already done; this is direct implementation against
an already-finished spec, the same posture `0.7.4`/`0.7.7`/`0.7.8`/`0.7.9` used for their own design-gate
decisions. **No discovery-document/benchmark entry gate applies either** — nothing here is a new AI Smart
Import extraction vertical; the Smart Import status-pill work in Phase 2 is a visual/interaction treatment
of an already-built pipeline, not new extraction logic. Phase 3 carries one small functional exception to
this visual/interaction framing — the `P12-F3`/`P12-F4` delete actions (`V4`), scoped below — acknowledged
directly rather than silently folded in, the same way Phase 1.1's `endedAt` field was called out as an
exception.

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
system, and the eight refinement items — **built, committed, live on `qa`; awaiting acceptance**

**Built as of `V7`:** implemented, committed (`4af4373`, `8bab6ca`, `5c93d00`, `7f5e33f`, `8a18f43` on
`version/V7`), deployed to `0.8.0-phase2-7f5e33fa` on `qa`. Acceptance session document:
`docs/versions/V7/0.8.0-phase2/EXECUTABLE_TEST_SESSION_V1.md`, 14 tests. Not yet GO — see the `V7` change
note above for the two pre-existing bugs found/fixed and the three decisions resolved.

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
acceptance pass, plus two functional additions (`P12-F3`, `P12-F4`)

Covers spec §6 (games list and game page), the Settings screen (trip settings form, participants
management section, sharing section, admin/invitation section), the Timeline/calendar view, and the
Shopping list screen — closing `G1`'s remaining lower-traffic screens — plus completing §7's
empty/loading/offline-state principles across any screen not already covered by Phase 1 (Today) or Phase
2 (Smart Import's own loading/processing treatment, item detail, add/edit forms). Closes with the full §9
accessibility/visual acceptance pass across the whole of Beta 0.8, not just this phase. **Added in `V4`:**
two small functional additions, confirmed by the Product Owner, 2026-10-05, riding along because Phase 3
already visits both screens for the restyle:

1. **`P12-F3`** — add a delete action for a participant from Settings' participants management section.
   **Deleting is blocked while the participant has any existing assignment** (document, ticket, task, or
   packing item) — the delete action stays visibly disabled with a message pointing to deactivation
   instead (the existing `P12-F2`/active-toggle mechanism); only a participant with zero existing
   assignments can be deleted. When available, the action requires a **double confirmation** — a first
   tap to initiate, then an explicit second confirmation naming the participant before the irreversible
   delete runs (consistent with the spec's caution around irreversible action controls) — followed by a
   transient success notification, consistent with the spec's own transient-success pattern (§7's
   "Attached" state, the offline/sync strip's success-is-transient rule). No cascade-clear logic is
   needed and no orphaned references are possible, since the delete simply cannot run while assigned.
2. **`P12-F4`** — add a delete action for a shopping-list item, following the **same pattern the current
   Tasks screen uses** (post-`P11-F13`: delete lives inside the item's own edit screen, not as a direct
   per-row control) — not a new, separate delete pattern. A single confirmation is sufficient, matching
   the existing Tasks delete flow; this is a lower-consequence action than deleting a participant (no
   cross-item assignments to protect).
3. **`P12-F7`** — added `V7`, 2026-10-06, confirmed by the Product Owner while reviewing Phase 2's build:
   a source stuck in any non-`failed` state (e.g. `rejected`, or `needs review`/`partial` with no confirmed
   ticket coverage) has no delete action in the UI today — only `failed` sources do (`sourceRow()`'s
   `failedActions`, gated by `canRetry`). Add a delete action for these, following the same single-
   confirmation pattern the existing failed-source delete already uses. **`attached` sources (confirmed
   ticket coverage) are explicitly excluded** — removing a document already confirmed as ticket coverage
   needs its own, more deliberate flow (likely tied to un-confirming coverage first), not folded into this
   fix.

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
- **`P12-F3`:** the delete action is present in Settings' participants section; attempting to delete an
  assigned participant leaves the action disabled with the pointing-to-deactivation message, verified
  against at least one participant with a real assignment; deleting an unassigned participant requires
  the double confirmation naming that participant, then actually removes the record and shows the
  transient success notification.
- **`P12-F4`:** the delete action is present on shopping-list items, placed inside the item's edit screen
  exactly like the current Tasks pattern, not as a separate per-row control; a single confirmation
  precedes the delete; the item is actually removed.
- **`P12-F7`:** a delete action is present for a source in any non-`failed`, non-`attached` state (verified
  against at least one `rejected` source and one `needs review`/`partial` source with no confirmed ticket
  coverage); a single confirmation precedes the delete; `attached` sources still have no delete action
  from this fix alone.
- Every remaining screen with an empty, loading, or offline/sync state (per §7's general principles) uses
  the specified treatment — line icon + headline + explanation for empty, the uniform
  `--border`-on-`--surface` skeleton (not a spinner) for loading, and the persistent `--accent-soft` top
  strip for offline/sync, disappearing immediately on sync success with no separate success message.
- Full §9 pass across the entire Beta 0.8 implementation: contrast-tool verification of every token pair
  actually used at normal-text size (≥4.5:1), no RTL breakage/clipped text/unintended horizontal scroll
  anywhere touched by Phases 1–3, and a side-by-side screenshot comparison against the spec's own
  described states.
- General regression across the full app: nothing from Phases 1–2 has regressed by the time this phase
  closes, and the two new delete actions don't affect any other existing participant/shopping-item
  behavior.

## Non-goals

- Dark mode — explicitly deferred in the spec itself (§8), an open product decision confirmed, 2026-10-05,
  to stay deferred rather than being scheduled into any Beta 0.8 phase.
- Any change to the datastore's access-control shape or the sync engine — Beta 0.8 is visual/interaction
  only; nothing here touches Firestore rules, Storage rules, or the sync/offline-reconnect mechanism
  itself (only how offline/sync state is *displayed*, per Phase 3). Two small, acknowledged exceptions
  exist: the `endedAt` item field (Phase 1.1, Decision 1), a deliberate additive content field; and
  Phase 3's participant/shopping-item delete actions (`P12-F3`, `P12-F4`, scoped above, `V4`) — genuine
  functional additions, not restyle work, folded in because Phase 3 already visits both screens. Neither
  touches Firestore/Storage *rules* or the sync engine itself.
- Any new Smart Import extraction vertical or field — the status-pill work is a visual treatment of the
  existing pipeline, not new extraction scope.
- Any of the independent backlog items confirmed unrelated to Beta 0.8 at `V143` (`0.7.10`, calendar
  export, the Google Play Store note, `V7-F14`, `WC-001`) or the three new documents-bin findings from
  `0.7.9.2` (`V145`) — none of these are in scope for any Beta 0.8 phase.

## What's needed now

**Phase 1 is closed.** Phase 2 is built, committed, and live on `qa` (`V7`, above) — awaiting the Product
Owner's and QA agent's acceptance session against its 14-test document before this assistant records a
GO/NO-GO. Phase 3 — scoped with its three functional additions (`P12-F3`, `P12-F4`, `V4`; `P12-F7`, `V7`)
— has no kickoff prompt yet; that follows once Phase 2 is accepted GO on `qa`.
