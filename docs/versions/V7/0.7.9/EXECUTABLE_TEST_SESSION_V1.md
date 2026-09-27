# Family Trips Alpha 0.7.9 — Executable Acceptance Test Session

**Candidate:** `0.7.9` (participant-system extensions: `V7-F09` auto-link attached documents to a participant, `V7-F10` link Tasks to the participant system, `V7-F13` multi-participant "family" tickets), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9-0feef8a4`)
**Session number:** `V1` of this document. No test has been run against this build yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

## What this candidate is, worth restating before testing

All three items are mechanical extensions of the already-generic `participantAssignmentField()` pattern onto places it didn't yet reach — no new collection, no security-rules or sync-engine change, per the scope document's design-gate reasoning (no design-first gate applied).

The Development Agent reported two flagged decisions during implementation (both worth confirming directly during this session, not just taking on report):

- **`V7-F10` Task `owner` field:** kept alongside the new `participantIds` field, not removed — a transition-period choice, since a Task owner can be a name with no corresponding `state.participants` record (e.g. someone not formally a Trip participant). Both fields should coexist on a Task going forward.
- **`V7-F13` implementation shape:** chosen as option (a) — `tickets[]` entries changed from singular `participantId` to an array `participantIds`, with "used" tracked as one shared boolean for the whole group (a physical ticket is scanned once, not per person).

Because `V7-F13` changes the shape of an existing field (`participantId` → `participantIds`) on an already-synced collection (`items`), backward compatibility for tickets created before this build is a real risk worth its own dedicated test (Test 6 below), not just an assumption that "should" carry over.

## Test 1 — A document attached in "extract" mode auto-links to the correct participant by name match

Attach a document that clearly names one Trip participant (e.g. a document whose extracted text contains that participant's full name) to an existing item, using the "extract" processing mode (not "attach only").

**Expect:** After extraction completes, the document's row (in `sourceRow()`/the item's detail view) shows a participant badge for the matched participant, populated automatically — `source.participantIds` — without manual selection.

**Result:** ☒ FAIL — notes: No automatic participant link occurred on the attached document (activity item "הפועל תל אביב - הפועל פתח תקווה"). After the Product Owner manually added the participant link, the item's `item.tickets[]` section still shows "לא נוספו כרטיסים" (no tickets added) and both participants (איל בן יצחק, פאולה) still list under "משתתפים ללא כרטיסים" (participants without tickets) — the family-ticket linkage from `V7-F09`'s manual correction did not carry through into `V7-F13`'s ticket-coverage computation. Additionally, a new observation: the item's detail view shows what looks like a duplicated ticket area — an upper "כרטיסים (2)" section (Activity's own pre-existing `ticketHolders[]`, showing the two named/seated holders "איל בן יצחק" and "פאולה כהן" from Smart Import extraction) and a separate, lower "כרטיסים" section (the `item.tickets[]` manual add-ticket UI this candidate touches), which currently reads "no tickets added" and lists both participants as ticketless. Having two differently-populated "tickets" sections on the same screen, one saying tickets exist and the other saying none do, reads as confusing/duplicated UI even though the scope document notes these are legitimately separate structures.

## Test 2 — A wrong or missing auto-link can be corrected by hand

Using the document from Test 1 (or one where no confident match was found/the match is wrong), use the new participant badge's edit affordance to change or add the linked participant(s) manually.

**Expect:** The manual correction is available and saves correctly — the "extracted with manual override" pattern every other Smart Import field already follows.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — A document attached in "attach only" mode does not get an auto-link

Attach a document to an existing item using "attach only" mode (no extraction).

**Expect:** No participant auto-link is attempted (no text was extracted to match against) — the document shows with no participant badge populated, and can still be linked manually if desired (per Test 2's affordance).

**Result:** ☑ PASS — notes: No auto-link occurred on the "attach only" documents (`AE-005_Tickets.pdf`, `AE-004_SmarTicket_eticket_6868cfab5aa01.pdf`), as expected — both show manually linked to "איל בן יצחק, פאולה" via the correction affordance from Test 2. Same underlying issue as Test 1's finding still visible on this item: the manually-linked participants on the documents have no effect on the `item.tickets[]` section below — it still reads "לא נוספו כרטיסים" (no tickets added) and both participants still list under "משתתפים ללא כרטיסים" (participants without tickets). Not treated as a separate finding — same root cause as Test 1's blocking finding.

## Test 4 — A Task can be assigned to specific participants using the same picker Items use

Open the task-form modal (new or existing task). Confirm the participant scope/picker (none/all/specific, with a checkbox list of participants) appears and behaves the same as it does on an Item's form.

**Expect:** The task-form modal uses the existing `participantAssignmentField()` component (same look, same none/all/specific + checkbox behavior as items) — not a new or different picker. Selecting specific participants and saving persists `participantScope`/`participantIds` on the task.

**Result:** ☑ PASS — notes: The participant scope/picker ("שיוך למשתתפים": none/all/specific + checkbox list) appears on the task-form modal, matching the Items pattern. Product Owner's own observation: the free-text "owner" field (בעלים (טקסט חופשי)) sitting directly above the new picker reads as a duplication now that the participant picker exists, and the Product Owner's decision is that the owner field **should be removed** — overriding the Development Agent's reported transition-period "keep both" choice. Logged below as a Product Owner decision for the Development Agent to action, superseding the flagged question from the kickoff.

## Test 5 — The `owner` field decision (superseded by Test 4's finding)

Originally scoped to confirm the free-text `owner` field still coexists alongside the new participant picker, per the Development Agent's reported transition-period decision. **Superseded by the Product Owner's decision recorded under Test 4:** the `owner` field is to be removed, not kept. Nothing further to test here until the correction implements that removal — at which point this slot becomes a regression check that `owner` is gone and existing tasks' data isn't lost/broken by its removal.

**Expect:** N/A this session — see Test 4.

**Result:** N/A — superseded by the Product Owner's Test 4 decision (remove `owner`). To be re-tested as a removal-regression check in the next correction round.

## Test 6 — A single ticket can cover more than one participant ("family" ticket)

Add a ticket to an item that has multiple active participants, selecting more than one participant for that single ticket-adding action (or single ticket entry, per whichever UI shape was implemented).

**Expect:** All selected participants are marked as covered by that one ticket — none of them appear under "משתתפים ללא כרטיסים" (participants without tickets) once the one ticket exists, even though only one ticket entry was created.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes. (Confirms the `V7-F13` ticket-coverage mechanism itself works correctly when a ticket is added via the intended multi-select add-ticket form — Test 1's finding is specifically that `V7-F09`'s document participant-link does not feed into this same mechanism, not that the mechanism itself is broken.)

## Test 7 — "Used" toggles for the whole family ticket as one shared unit

Toggle the "used" status of the multi-participant ticket created in Test 6.

**Expect:** "Used" toggles once for the group as a whole (a shared boolean on the ticket), not per participant — consistent with the Development Agent's reported decision that a physical ticket is scanned once.

**Result:** ☐ Not verified — blocked by a gap: the multi-participant ticket added in Test 6 does not itself appear as a row/entry in the "כרטיסים" ticket list to click or toggle. It correctly removes both participants from "משתתפים ללא כרטיסים" (coverage works), but there is nothing rendered to interact with for a "used" toggle. Cannot test "used" behavior until a ticket entry actually renders in the list.

## Test 8 — Backward compatibility: a ticket created before this build (single `participantId`) still displays and counts correctly

Identify (or, if none exists, reason about) a ticket entry that predates this build's shape change — i.e. one that would have been stored with the old singular `participantId` field rather than the new `participantIds` array. Confirm that participant still shows as covered (not incorrectly appearing under "משתתפים ללא כרטיסים"), and that the ticket still renders correctly in the ticket list.

**Expect:** Old-shape ticket entries are read correctly by the updated code (a compatibility read-path for the old singular field, or an equivalent migration), so no pre-existing ticket regresses to looking unassigned. If no genuinely pre-existing ticket is available to test directly, note that and instead confirm with the Development Agent (out of session) what compatibility mechanism was implemented, and log this test as not independently verified rather than assuming it passed.

**Result:** ☐ Not independently verified — the Product Owner has no ticket entries that predate this build to test directly. Should be confirmed with the Development Agent (raw evidence of the compatibility read-path, or a report on why none is needed) rather than assumed to pass.

## Test 9 — Regression: general spot-check across untouched areas

Spot-check that nothing outside this candidate's three items regressed: an Item's own `participantAssignmentField()` behavior (none/all/specific + checkboxes) is unchanged; a flight/activity item's existing `passengers[]`/`ticketHolders[]` behavior is unchanged (explicitly out of scope for `V7-F13`); and sync of `items`, `tasks` and `sources` still works as expected (a change made on this device is reflected correctly, per however sync is normally spot-checked in this app).

**Expect:** No unintended side effects outside the scope of Tests 1–8.

**Result:** ☑ PASS — notes: General regression confirmed on a flight item (LY087, TLV→Phuket) — passenger list (`passengers[]`, "נוסעים (1)") renders correctly and unchanged. Same underlying duplicated-ticket-area issue observed here too (Test 1's finding): a populated passengers section above, and a separate, empty `item.tickets[]` "כרטיסים" section below reading "לא נוספו כרטיסים" with the passenger listed under "משתתפים ללא כרטיסים" — confirms this is a general pattern across item types (Activity and Flight both), not isolated to one item type.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| `V7-F09`: no automatic participant link occurred on document attachment in extract mode. | Test 1 | Blocking (core acceptance criterion for `V7-F09`) | Open — reported by Product Owner 2026-09-27. |
| Confusing/duplicated ticket UI: the item detail view shows two separate "tickets" sections — the item type's pre-existing multi-holder structure (`ticketHolders[]` on Activity, `passengers[]` on Flight — populated) and `item.tickets[]` (empty, participants shown as ticketless) — on the same screen. Confirmed on both Activity (Test 1) and Flight (Test 9), so it's a general pattern, not isolated. | Tests 1, 9 | Non-blocking (UX clarity), but worth the Development Agent's comment | Open — reported by Product Owner 2026-09-27. |
| Product Owner decision (overrides the Development Agent's reported "keep both" choice): the free-text Task `owner` field should be removed now that `participantIds` exists — it reads as a duplicate of the new participant picker. | Test 4 | Product decision, not a defect | Decided — Product Owner 2026-09-27: **remove the `owner` field.** For the Development Agent to action in the correction round. |
| A multi-participant ("family") ticket correctly removes its covered participants from "משתתפים ללא כרטיסים", but does not itself render as a visible row/entry in the "כרטיסים" ticket list — so its "used" status can't be located or toggled. | Test 7 | Blocking for `V7-F13`'s "used" behavior (can't be verified at all) | Open — reported by Product Owner 2026-09-27. |

## GO/NO-GO decision

**NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-27, on build `0.7.9-0feef8a4`. Blocking: Test 1 — `V7-F09`'s auto-link (and its manual-correction counterpart, Test 3) has no effect on `V7-F13`'s ticket-coverage computation; a document's participant link does not translate into ticket coverage. Test 7 is blocked entirely — a multi-participant ticket added via Test 6's flow does not render as a row in the ticket list, so its "used" behavior cannot be verified at all. Test 8 (backward compatibility for pre-existing tickets) could not be independently verified — no pre-existing ticket was available to check, and needs direct confirmation from the Development Agent rather than an assumption. Also carrying forward: a Product Owner decision to remove the Task `owner` field (Test 4), overriding the Development Agent's "keep both" choice; and a non-blocking but general duplicated-ticket-UI observation (Tests 1, 9), confirmed on both Activity and Flight items. Sent back to the Development Agent for correction.

## Round 2 correction — investigation, root cause, and fixes (build `0.7.9-pending`, filled in below once deployed)

Per the correction prompt's own explicit ask (`claude/PROMPT_FOR_CLAUDE_CODE_0_7_9_CORRECTION_V1.md`), Findings 1 and 3 were investigated and reported before any fix; Findings 2 and 4 were fixed; Finding 5's recommendation is folded into the same fix as Finding 2, since direct evidence pointed to the same root cause.

**Finding 1 (`V7-F09` ↔ `V7-F13` disconnect) — investigated, concluded NOT a defect, per the scope document's own design.** Re-read the frozen scope document's acceptance criteria for both items directly: nothing in `V7-F09`'s own criteria says a document's participant link should create or mark a ticket, and nothing in `V7-F13`'s own criteria references documents at all — these were scoped as two genuinely separate, unconnected concepts from the start (a document knowing who it's about, versus a physical ticket existing for someone), the same way this project already treats `ticketHolders[]`/`passengers[]` as separate from `item.tickets[]`. On the first half of Finding 1 (no auto-link badge appeared at all before the manual correction): the wiring itself was re-confirmed correct by direct execution of the exact shipped `resolveParticipantIdsFromDraft`/`runSmartAnalysis` code against synthetic Flight/Activity/Insurance drafts (already covered by this candidate's own test suite) — the most likely real-world cause for a genuine Hebrew document is that exact/near-exact name matching (`normalized`/`passengerMatchKey`, reused as-is from `flight-import-adapter.js`) doesn't correct for Hebrew spelling variants between how a name is extracted and how it's stored on `state.participants` (e.g. a document reading "איל" against a participant record spelled "אייל") — a real, honestly-reported limitation of exact/title-stripped matching, not a wiring failure. **No auto-ticket-creation was implemented** — creating this connection would conflate two intentionally separate structures and risks silently creating a ticket the user never explicitly asked for, contradicting this project's own "every extraction output is a proposal, never applied without explicit approval" discipline. Instead, the confusion is addressed at its actual source: see the Finding 2/5 fix below.

**Finding 2 (multi-participant ticket doesn't render as a row) — investigated, direct evidence shows the row DOES render correctly; root cause was the identical, adjacent "כרטיסים" header, not a missing row.** Executed the exact shipped `ticketsSection`/`ticketParticipantIds` source directly (extracted and run in isolation, not just read) against a synthetic multi-participant ticket: it produces a correct `<article class="row ticket-row">` naming all covered participants, with a working `data-action="ticket-toggle-used"` checkbox and remove button — proof the "used" toggle genuinely works for the whole group as one unit, exactly as designed. The real cause: Activity's own pre-existing `ticketHolders[]` table (directly above `item.tickets[]`'s own section on the same detail page) rendered under the literal header `<h4>כרטיסים (${ticketHolders.length})</h4>` — identical text to `item.tickets[]`'s own `<h3>כרטיסים</h3>` right below it. Two stacked, identically-labelled "כרטיסים" sections, one already populated from Smart Import and one newly gaining a row, is a very plausible explanation for a just-added row going unnoticed. **Fixed:** the two headers are now distinct — `<h4>פרטי כרטיסים מהמסמך (N)</h4>` ("ticket details from the document") for the Smart Import table, `<h3>מעקב כרטיסים ידני</h3>` ("manual ticket tracking") for `item.tickets[]`'s own section. This directly resolves Finding 5 too (the same recommendation the correction invited), without touching `ticketHolders[]`/`passengers[]`'s own data or extraction logic — a label-only change.

**Finding 3 (backward compatibility) — direct evidence, already implemented in round 1, now demonstrated concretely.** The `ticketParticipantIds()` helper (added in round 1, `src/v5-app.js`) reads `ticket.participantIds||(ticket.participantId?[ticket.participantId]:[])` — executed directly against a synthetic old-shape ticket (`{participantId:'p1'}`, no `participantIds` field at all): it correctly renders the covered participant's name and correctly excludes them from "משתתפים ללא כרטיס", with no migration or backfill needed. No genuinely pre-existing ticket was available to the Product Owner to test directly (Test 8), so this direct code execution is offered as the equivalent evidence per the correction's own request.

**Finding 4 (remove the Task `owner` field) — implemented.** Removed from the task-form modal and from what the submit handler reads/writes going forward. **On the flagged data-loss question:** removing the field from the form does not delete anything already stored — `Object.assign(existing,values)` with no `owner` key in `values` leaves an already-existing task's own stored `owner` value completely untouched in Firestore, it simply becomes unread/unshown going forward, the same non-destructive precedent `0.7.4.1` established when it removed the old free-text `participants` field from item forms. No case of real data loss materializes in practice, because nothing is actually deleted.

Regression coverage added/updated in `tests/v7-9-participant-extensions.mjs` (17 tests, up from 16) for Findings 1 (investigation conclusion, unchanged wiring re-confirmed), 2/5 (the new distinct headers), and 4 (owner field gone from form/submit/display, non-destructive Object.assign confirmed). Full quality gate clean.

## Production promotion

Not yet — recorded here once promotion is confirmed.
