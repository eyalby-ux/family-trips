# FamilyTrips Beta 0.8 — Scope: Visual and Interaction System

Document revision: `V2`
Date: 2026-09-28
From: Product Owner's planning/QA-assistant (document-only)

**`V2` change note:** added the Production-promotion decision below (one combined promotion after Phase
3, not one per phase) — the Product Owner resolved this directly, after this assistant flagged that
Beta 0.8's phases, unlike Alpha 0.7's independent-feature sub-candidates, are pieces of one visual system,
so promoting each phase separately would leave Production visibly "half-restyled" between phases. No
other content changed from `V1`.

## What this is

Beta 0.8 implements `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` (dated 2026-08-25, complete and
locked — every gap raised in `UI_SPEC_V3_REVIEW_2026-08-18.md` was closed by `V4` the same day, and the
spec continued to `V7`) across the entire app, plus eight small refinement items the Product Owner
confirmed folding in (`MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V143`). **No design-first gate applies** — the
design work is already done; this is direct implementation against an already-finished spec, the same
posture `0.7.4`/`0.7.7`/`0.7.8`/`0.7.9` used for their own design-gate decisions. **No discovery-document/
benchmark entry gate applies either** — nothing here is a new AI Smart Import extraction vertical; the
Smart Import status-pill work in Phase 2 is a visual/interaction treatment of an already-built pipeline,
not new extraction logic.

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
of a stretched-out partial restyle. Phases are described here together for the whole picture; **only
Phase 1 is kicked off now** — Phase 2 and Phase 3 each get their own kickoff prompt once the prior phase
is accepted GO on `qa`, following this project's own established candidate-by-candidate rhythm.

## Phase 1 — Foundation: tokens, navigation/RTL, Today, participant carousel

Covers spec §2 (tokens, typography, spacing), §3 (navigation, RTL, bidi, pressed/focus states,
animation), §4 (Today — all four documented cases: calm day, busy day, transit/flight day, plus the
day-item card and three-level urgency hierarchy), and §5 (participant selection carousel). This is the
foundation everything else in Beta 0.8 builds on — global tokens and the nav shell touch every other
screen, and Today is the app's primary landing surface.

**Acceptance criteria:**
- Every token in §2's table (`--bg`, `--surface`, `--ink`, `--muted`, `--border`, `--accent`,
  `--accent-soft`, `--teal-soft`) is applied exactly as specified; `--muted`'s exact updated value
  (`#726B66`) is in use, not the superseded `#79726D`.
- Typography and spacing match §2's scale exactly (screen/section/item title sizes, body, metadata,
  line-heights, 20px screen margin, 12px card gap, 16px card radius, 12px button radius, the specified
  border and shadow).
- Bottom nav matches §3 exactly: five items including the central `+` (56px, `--ink`, white plus, never
  terracotta), Tabler outline icons only, no mixed icon libraries, 44×44px minimum tap targets.
- RTL/bidi rules are applied: directional icons (back, chevrons, timeline arrows) mirror under RTL;
  non-directional icons (play/pause, QR, digits, the `+`) stay fixed; Latin text/numbers embedded in
  Hebrew sentences are wrapped in `<bdi>`/`unicode-bidi: isolate` so visual order never inverts.
- Pressed state (background shift toward `--border` or 98% scale-down) and focus state (2px `--ink`
  ring, 2px offset, never suppressed) are present on every tappable element, verified by spot-check
  across at least Today, an item detail view, and the nav itself.
- Animation timing matches §3 (160–220ms `ease-out`; no bounce).
- Today matches §4 for all four cases: a calm day (compact cards, one secondary game suggestion, no
  illustration), a busy day (one leading action card, compact chronological remainder, no game
  suggestion), a transit/flight day (transport/flight card leading, contextual actions, no game
  suggestion), and the day-item card itself (time always `--ink` weight 600, imminent-action `--accent`
  dot beside the time, `Navigate`/`Website`/`Tickets` only shown when applicable, never icon-only). The
  Today destination image (where present) is capped at 150–160px with the exact 65% `--bg` overlay.
- The three-level urgency hierarchy (regular / imminent action / needs attention) is visually correct
  and color is never the sole indicator — a needs-attention item's icon itself differs from its regular
  icon, not just its background.
- The participant carousel matches §5: avatar+name only per item, centered/full-contrast selection with
  legible faded neighbors, indicator dots, drag-with-snap plus tap, and the RTL drag direction rule
  (dragging right moves to the next item in display order under RTL) with a working keyboard
  alternative.
- General regression: existing item creation/edit/save, Smart Import, and sync are all unaffected by
  this phase — this phase is visual/structural only, no data-model or behavioral change to any of those
  systems.

## Phase 2 — Item detail, Smart Import status system, and the eight refinement items

Covers spec §7's Smart Import processing-states subsection (the seven-state status pill and its binding
interaction rule, reused across the Intake Inbox, an item's Documents/Tickets area, and the proposal
review screen) plus the eight small refinement items the Product Owner confirmed folding into Beta 0.8:

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
- Each of the eight items above passes its own stated acceptance criterion, individually testable.
- General regression: existing Smart Import extraction/approval behavior, item editing, and the
  underlying data these eight items touch (ticket coverage, Editor removal, merge-conflict resolution)
  are otherwise unaffected — none of the eight change what data is stored, only how it's surfaced/
  confirmed.

## Phase 3 — Games and activities, remaining empty/loading/offline coverage, full acceptance pass

Covers spec §6 (games list and game page) and completes §7's empty/loading/offline-state principles
across any remaining screens not already covered by Phase 1 (Today) or Phase 2 (Smart Import's own
loading/processing treatment). Closes with the full §9 accessibility/visual acceptance pass across the
whole of Beta 0.8, not just this phase.

**Acceptance criteria:**
- Games list matches §6: compact catalog (not a gallery), the five named filters, active/inactive filter
  styling, 56px minimum row height, the star as an independent 44×44px tap target with at least 8px
  separation from the row's own tap zone.
- Game page matches §6: uniform page shape (name, description, match, duration, primary action);
  interactive games show "התחל משחק"/"המשך משחק" and run in-app; non-interactive activities show
  instructions plus "התחל פעילות".
- Every remaining screen with an empty, loading, or offline/sync state (per §7's general principles, not
  just Today/Smart Import) uses the specified treatment — line icon + headline + explanation for empty,
  the uniform `--border`-on-`--surface` skeleton (not a spinner) for loading, and the persistent
  `--accent-soft` top strip for offline/sync, disappearing immediately on sync success with no separate
  success message.
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
  itself (only how offline/sync state is *displayed*, per Phase 3).
- Any new Smart Import extraction vertical or field — the status-pill work is a visual treatment of the
  existing pipeline, not new extraction scope.
- Any of the independent backlog items confirmed unrelated to Beta 0.8 at `V143` (`0.7.10`, calendar
  export, the Google Play Store note, `V7-F14`, `WC-001`) or the three new documents-bin findings from
  `0.7.9.2` (`V145`) — none of these are in scope for any Beta 0.8 phase.

## What's needed now

**Phase 1 only, for now.** Implement per Phase 1's acceptance criteria above, full quality gate (syntax
checks, full test suite including new regression tests, production build), deploy to the fixed `qa`
alias, draft an executable acceptance test session document, same format as every prior candidate.
**Do not promote Phase 1 to Production on its own** — per the Product Owner's decision above, Phase 1
stays on `qa` pending Phase 2 and Phase 3; only Phase 3's own GO triggers a single combined Production
promotion covering all three phases. Report back for independent verification before this assistant
records Phase 1's closure. Phase 2's kickoff will follow once Phase 1 is accepted GO on `qa`; Phase 3's
once Phase 2 is accepted GO on `qa`.
