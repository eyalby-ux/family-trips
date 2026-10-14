# FamilyTrips `0.8.1` — Quick-Fix Bundle Scope

Document revision: `V1`
Date: 2026-10-14
From: Product Owner's planning/QA-assistant (document-only)

## What this is

Beta 0.8 (Phases 1–3, every correction round) is closed and live in Production (`0.8.0-phase3.2-24f0575f`,
promoted 2026-10-12). This candidate bundles five small, independent, already-fully-dispositioned items
surfaced during the Post-MVP backlog review: two Non-blocking findings carried forward from Phase 3.2's own
acceptance session (`P32-F1`, `P32-F2`); three non-blocking gaps logged in the documents-bin view during
`0.7.9.2`'s acceptance session, 2026-09-28 (re-link affordance, item-linkage indicator, the non-functional
"הסרה" button); one UX-clarity gap logged during `0.7.5.1`'s acceptance session, 2026-09-23 (`V7-F14`); and
one design-conformance bug found during this review (`BL-ICONS-1`). None touch the datastore's
access-control shape or the sync engine — no design-first gate applies beyond the one small design-spec
amendment noted below (already drafted, `V7.5`), and none are Smart Import verticals, so no
discovery-document/benchmark gate applies either. `qa` only — Production promotion follows this
candidate's own acceptance session, not bundled with this scoping.

## Findings in this candidate

**`P32-F1` — Tasks "משתתף" (participant) filter label clipped at its left edge.** Found live during Phase
3.2's acceptance session, 2026-10-12. Non-blocking, build as described: the filter select's own label text
is cut off; widen the label area or shorten/wrap the label so the full Hebrew text renders without
clipping at any width this app already supports (360px/390px, per the `P22-F8` precedent).

**`P32-F2` — Documents filter-chip row snaps back to "הכול" (All) after a selection.** Found live during
Phase 3.2's acceptance session, 2026-10-12. Non-blocking, build as described: selecting any
non-"הכול" chip in the Documents view's filter row should keep that selection applied (and visually
reflected) rather than reverting to "הכול" on the next render/interaction. Root-cause directly in source
before fixing — this is very likely a state/render-sync gap (the filter's own selected-state not being
read back into the chip row's render, or being reset by an unrelated re-render), not a display-only issue.

**Documents-bin — re-link affordance.** Found live during `0.7.9.2`'s acceptance session (Test 5),
2026-09-28. The Trip's documents-bin list (the view listing every `source`, independent of any one item)
has no way to re-link a previously-unlinked document back to an item. Add one: from a document's row in
this list, an action that opens the same item-attach flow `0.7.9`'s "Attach to existing item" already
uses, pre-selecting that document as the one being attached. No new linking mechanism — reuse the existing
attach flow.

**Documents-bin — item-linkage indicator.** Found live during `0.7.9.2`'s acceptance session (Test 5),
2026-09-28. The documents-bin list gives no indication, from that view alone, of which item a document is
or was linked to. Add a short per-row indicator: the linked item's name (and type, if ambiguous between
items of the same name) when the document is currently linked to exactly one item; every linked item's
name when linked to more than one (a document can be linked to multiple items — see the delete-warning
note below); and an explicit "not linked to any item" state when the document has been unlinked and never
re-linked (the `0.8.0`+ re-link affordance above makes this state recoverable, not a dead end).

**Documents-bin — "הסרה" (remove) button wired to a real delete.** Found live during `0.7.9.2`'s
acceptance session (Test 5), 2026-09-28; disposition decided during this Post-MVP review. The documents-bin
list shows a "הסרה" button on every row that currently does nothing. `P12-F7` (Phase 3) already added a
delete action for non-`attached` sources elsewhere in the app; this closes the matching gap for `attached`
sources from this view. Behavior:
- Clicking "הסרה" on a document with no live ticket coverage on any linked item shows an ordinary
  confirmation ("remove this document? this cannot be undone" or equivalent existing confirm-dialog
  pattern) before deleting.
- Clicking it on a document confirmed as ticket coverage for one or more participants on any linked item
  shows the stronger warning `0.7.9.2`'s per-item removal already uses — naming the covered participant(s)
  explicitly — before deleting, consistent across both entry points to removing the same kind of document.
- If the document is linked to more than one item, the warning names every linked item, not just one, so
  the Product Owner isn't surprised by a side effect on an item not currently in view.
- This is a **true hard delete** of the `source` record itself (not the soft unlink `0.7.9.2`'s per-item
  removal performs) — there is no undo/restore window. This is this assistant's own call, not yet
  explicitly confirmed by the Product Owner beyond the general "wire it to a real delete" disposition:
  reasoned from the app's existing warn-before-destroy pattern (a confirmation gate instead of an undo
  window, the same shape as deleting a Task/Equipment item or removing an Editor) and the absence of any
  undo mechanism anywhere else in the app. **Flagged here explicitly — if the Product Owner wants a
  short-window undo instead, say so before this reaches the Development Agent**, since it changes the
  acceptance criteria below.
- This is the documents-bin list's own standalone delete, operating on the `source` record directly — it
  does not change how removal works from an item's own detail view (`0.7.9.2`'s existing soft-unlink stays
  exactly as it is there).

**`V7-F14` — a revoked/quarantined account's local session states only "cloud unavailable," not that the
account was removed.** Found live during `0.7.5.1`'s acceptance session (Test 1), 2026-09-23; left
deliberately unassigned at the time (cosmetic, unrelated to that round's own file-sync work). When a
quarantined/revoked account's local session next attempts to sync, replace the generic offline-style
message with one that states plainly that the account was removed from the Trip (wording consistent with
the app's existing tone — direct, no jargon), rather than implying a transient connectivity problem the
person might wait out.

**`BL-ICONS-1` — Today day-item card action buttons render text-only, a conformance bug against design
spec `V7` §4.** Not a new feature — spec `V7`'s own §4 already specified "Compact bordered buttons with
icon and label" for the "ניווט"/"אתר"/"כרטיסים" actions (and the equivalent "התקשרות" action elsewhere in
the app); they are currently shipping without icons. Disposition, confirmed by the Product Owner: icon +
label together by default; when three or more of these actions share one row and icon+label won't all fit
at the row's available width (e.g. three actions on one row, the hotel-card case), the whole row switches
to icon-only together — never a mix of icon+label and icon-only buttons on the same row. Icon mapping:
website → globe, navigate → compass/pin, tickets → ticket, call → phone, all from the already-named Tabler
outline set (spec §3) — no new icon library. An icon-only button still meets the spec's own §9 tap-target
minimum and carries an accessible label for screen readers even though no visible text renders.
`FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` is bumped to `V7.5` to record this (§4's action-button
bullet amended; a new `V7.5` change-history row added) — already drafted and staged for commit alongside
this candidate, not a separate follow-up.

## Open item for the Product Owner (not blocking scoping, but review before kickoff)

The documents-bin delete's hard-delete-vs-undo-window call above is this assistant's own recommendation,
not yet explicitly locked in. If left unchanged, the kickoff below proceeds on "true hard delete, no undo
window."

## What's needed now

Implement this candidate in full — all five findings above, through the full quality gate (syntax checks,
the complete existing test suite plus new tests for each finding, and a production build), deployed to the
fixed `qa` alias as `0.8.1`. Commit `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md`'s `V7.5` revision
(already staged in the handoff folder) alongside the code change it documents. Also commit this delivery
plan's `V165` revision (already staged in the same handoff folder), which catches the repository up from
its stale `V163` to the already-verified `V164` content plus this candidate's own scoping — in one combined
sync, per the kickoff's own instructions. Draft a new executable acceptance test session document covering
one check per finding above, including both delete-confirmation paths (uncovered vs. ticket-covered,
single-item vs. multi-item linkage) and both action-row states (icon+label default, icon-only fallback on
a tight row). Report back — commits, build identifier, what was built, anything that didn't check out
against this scope — for independent verification before this assistant drafts the candidate's own QA
acceptance-session prompt.
