# Family Trips Alpha 0.7.9 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.9` (Participant-system extensions — `V7-F09` auto-link an attached document to the correct participant, `V7-F10` link Tasks to the participant system, `V7-F13` a "family" ticket covering multiple participants), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9-0feef8a4`).
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**Scope note.** Nothing in this candidate touches the datastore, security rules, or sync engine — confirmed by direct code inspection before implementation began, per the scope document's own "Design-gate decision" section. Single-device/single-account testing on the QA Test Trip is sufficient throughout; no two-device session is required.

## Two decisions the scope document flagged for the Development Agent to make and report, not decided in advance

**1. `V7-F10`: the free-text Task `owner` field's fate — kept, not removed.** Confirmed by direct code inspection: `owner` has always been completely free text (`task-form`'s own default is the `'shared'` sentinel, otherwise whatever was typed), with zero relationship to `state.participants`. It can legitimately hold a name that has no corresponding participant record at all — for example, a friend helping with Trip prep who was never formally added as a Trip participant. Removing it outright would silently discard real information that specific-participant IDs cannot represent, so it stays alongside the new `participantScope`/`participantIds` fields (the same none/all/specific model Items already have), not replaced by them. Both are shown together on the task form and in the task list.

**2. `V7-F13`: implementation-shape choice — changed `tickets[]` entries to `{participantIds}` (option a), not the split-multiple-tickets-sharing-a-code alternative (option b).** Reasoning: the scope document's own flagged "used" tracking question resolves to **one shared boolean per ticket, toggled for the whole covered group as a unit** — no real user-reported case (checked directly against the original write-up) implies per-participant use tracking is actually needed for a genuinely single physical ticket. Given that, changing the entry shape itself is the smaller, cleaner diff: it needs touching only two places (`ticketsSection`'s own remaining/rendering logic and the `ticket-add-form` submit handler), and the "used" group semantics fall out of the shape for free — one entry, one boolean. Option (b) would have needed extra cross-entry synchronization logic to keep several split-out tickets' `used` state in sync with each other, fighting the chosen group semantics rather than matching it.

**A related finding, not itself part of the scope document, found and fixed in passing:** tickets have been a live, tested Production feature since `0.7.4` (2026-09-21) — an already-existing ticket on a real Trip has the *old* `{participantId}` (singular) shape, not the new one. Reading only the new shape would have silently shown every pre-existing ticket as "משתתף לא ידוע" (unknown participant) the moment this candidate shipped. Fixed with a small `ticketParticipantIds()` helper that reads either shape with zero backfill/migration needed — the same no-migration discipline `0.7.4` itself used when it broadened `car` in place. **Worth confirming directly during Test 4 below:** if the QA Test Trip (or a real Trip) already has a ticket created before this candidate, it should still display and behave correctly, not show "unknown participant."

## Test 1 — `V7-F09`: an attached document with a real, matchable name auto-links to the correct participant

Attach a document that names one of the Trip's own participants (e.g. a Flight or Activity e-ticket naming a participant already on the Trip) to an existing item of the matching type, using "צירוף וחילוץ מידע להצעה" (attach and extract), not "צירוף בלבד."

**Expect:** Once extraction completes, the document's own row (under the item's "מסמכים" section) shows a participant badge naming the matched participant — no manual action needed. If no participant name in the document actually matches anyone on the Trip, no badge appears (this is expected, not a defect — only a confident match auto-links).

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 2 — `V7-F09`: the auto-link is always manually correctable

Using the same or a different attached document (any processing mode, including "צירוף בלבד" — a manually-attached document should be linkable too, not only an extracted one), use the document row's own "שיוך למשתתף" button.

**Expect:** A small modal opens with a checkbox per Trip participant, pre-checked for whichever participant(s) are already linked (if any). Checking/unchecking and saving updates the document's own participant link immediately, whether it started from an auto-match, a wrong auto-match, or nothing at all.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 3 — `V7-F10`: a Task can be assigned to specific participants, and the free-text owner field still works too

Create or edit a Task. Set the new "שיוך למשתתפים" control to "משתתפים נבחרים" (specific) and check at least one participant. Separately, type a name into the existing free-text "בעלים" field (e.g. a name that is *not* one of the Trip's participants).

**Expect:** Both fields save independently and both display on the task list row — the specific participant(s) via the same participant-assignment label Items already use, and the free-text owner text alongside it when it's not the `'shared'` default. Setting the scope to "כל המשתתפים" or "ללא שיוך ספציפי" behaves exactly like it already does for Items.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 4 — `V7-F13`: a single ticket can cover more than one participant at once

Open a Flight, Activity, or Transport item with at least two Trip participants who don't yet have a ticket. Add one ticket, checking more than one participant in the new multi-select picker (instead of the old single dropdown), then save.

**Expect:** All checked participants disappear from "משתתפים ללא כרטיס" (ticketless) at once, from that one ticket alone — not just one of them. The ticket row shows all covered participants' names together. Toggling "נוצל" (used) on that one ticket row is the only control needed — there is no separate per-participant used-state to manage. **If the QA Test Trip already has a ticket created before this candidate shipped:** confirm it still displays its participant's name correctly (not "משתתף לא ידוע") and its used/remove controls still work — this is the backward-compatibility fix described above, worth confirming directly rather than assuming.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 5 — Regression: nothing else is affected

Spot-check an existing Hotel, Flight, Activity, or Insurance item's own Smart Import flow (attach-and-extract for a document that does *not* name a Trip participant), the Items' own participant-assignment picker (scope + specific participants), and a plain single-participant ticket added the normal way. Confirm the Shopping/Packing participant pickers (unrelated to this candidate) still work as before.

**Expect:** No unintended side effects outside this candidate's own scope — everything not explicitly touched above behaves exactly as it did before `0.7.9`.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| (fill in during acceptance testing) | | | |

## GO/NO-GO decision

Not yet run.

## Production promotion

Not applicable — pending this session's own retest and GO.
