# Family Trips Alpha 0.7.9 — Executable Acceptance Test Session

**Document revision:** `V2` (supersedes `V1` — round-2 correction retest, after the Product Owner's NO-GO on build `0.7.9-0feef8a4`)
**Candidate:** `0.7.9` (participant-system extensions: `V7-F09` auto-link attached documents to a participant, `V7-F10` link Tasks to the participant system, `V7-F13` multi-participant "family" tickets), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9-16dd7a1c`)
**Session number:** `V1` of this document. No test has been run against this build yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

## What changed since the `V1` session (build `0.7.9-0feef8a4`), per the Development Agent's round-2 report

- **Finding 1 (`V7-F09`↔`V7-F13` disconnect) — not fixed as a "connection," explained instead.** The Development Agent's position: the scope document never linked a document's participant link to ticket coverage — they were always meant to be separate concepts (same relationship as `ticketHolders[]`/`passengers[]` vs. `item.tickets[]`). They re-confirmed by direct execution that the auto-link wiring itself is correct; the likely real cause of `V1`'s no-match was that exact-name matching doesn't correct for Hebrew spelling variants — a real limitation, not broken wiring. They deliberately did not add auto-ticket-creation from a document link, since that would silently create data without approval. **This is a decision the Product Owner needs to weigh in on directly this session** (see Test 1's decision point below), not something to just retest and pass/fail.
- **Findings 2 & 5 (missing ticket row / duplicated UI) — same root cause, one fix.** Direct execution proved the family-ticket row did render with a working "used" toggle all along; the actual problem was Activity's own pre-existing ticket-holders section sharing the literal header "כרטיסים" with the new `item.tickets[]` section directly below it, which is why it looked empty/missing. Both headers were relabeled distinctly; no data/extraction logic changed.
- **Finding 3 (backward compatibility) — direct evidence provided.** The round-1 compatibility helper was executed against a synthetic old-shape ticket (`participantId`, not `participantIds`) and reads correctly; no migration needed.
- **Finding 4 (remove Task `owner`) — done.** Removed from the form and `state.tasks`'s shape; confirmed non-destructive (removing it from the form doesn't delete any already-stored value in Firestore, same precedent as `0.7.4.1`).

Build `0.7.9-16dd7a1c` is live on `qa`, 17 tests, full quality gate clean, per the Development Agent's report.

## Test 1 — Decision point: accept that a document's participant link and ticket coverage are separate, unconnected concepts

This is not a pass/fail test of the app — it's confirming a product decision directly from the Development Agent's investigation. Read the "What changed" section above, specifically Finding 1's explanation.

**The question for you:** do you agree that linking a document to a participant (`V7-F09`) should have **no automatic effect** on that participant's ticket coverage (`V7-F13`) — i.e. these stay two separate, manually-maintained facts about an item, the same way `ticketHolders[]`/`passengers[]` are already separate from `item.tickets[]`? Or do you want a connection added (e.g. confirming a document for a participant also proposes/creates a ticket-coverage entry for them)?

**Result:** Product Owner's decision — a connection **should** be added, overriding the Development Agent's "keep separate" position. Specifically: "the app should offer the link between a ticket and a participant" — i.e. once a document is linked to a participant, the app should **offer/propose** a corresponding ticket-coverage entry for that participant (not silently auto-create one without confirmation, consistent with the Development Agent's own stated concern about silent data creation — the Product Owner's phrasing is "offer," not "auto-create"). Logged below as a new scope item for the next correction round.

## Test 2 — A document with an exact Hebrew name match now auto-links correctly

Attach a document whose extracted text contains a Trip participant's name in a form that should exactly match `state.participants[].name` (no spelling variant), using "extract" mode, to a fresh item (not one already manually corrected in the `V1` session).

**Expect:** The document auto-links to that participant without manual intervention, confirming the Development Agent's claim that the wiring itself works and the `V1` failure was specifically a name-matching/spelling-variant gap, not a broken feature.

**Result:** ☒ FAIL — notes: No automatic participant link occurred, contradicting the Development Agent's claim that the wiring itself works and only Hebrew spelling-variant matching was the gap — the document shows manually linked to "איל בן יצחק" (from a prior manual correction), not auto-matched by this build. Separately, positive observation: `V1`'s duplicated-header issue (Findings 2/5) does appear fixed — the two sections now have distinct headers ("פרטי כרטיסים מהמסמך" / ticket details from the document, vs. "מעקב כרטיסים ידני" / manual ticket tracking), no longer both reading "כרטיסים".

The Product Owner also used this test to raise a broader product direction, prompted by seeing the two sections side by side: the manual "add a ticket" flow (the green "הוספת כרטיסים" button and its picker) should be **removed entirely**. Going forward, a ticket should be created by linking a document (per Test 1's "offer a link" decision) — not through a separate manual add-ticket action. The "ticket details from the document" section should show which participant(s) it's linked to and a link back to the source document; the manual section should be reduced to just the "participants with no tickets" list (no separate add-ticket button/form). This is a significant scope change to `V7-F13`'s UI, logged as a new finding below for the Development Agent to design against, not something to retest as pass/fail this session.

## Test 3 — Regression: manual correction and attach-only behavior still work

1. On a document with no confident auto-match (or a deliberately mismatched name), confirm the manual participant-link correction affordance from `V1`'s Test 2 still works.
2. Attach a document using "attach only" mode and confirm it still gets no auto-link, per `V1`'s Test 3.

**Expect:** Both unchanged from the `V1` session — this round's fix should not have touched this code path.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 4 — A multi-participant ("family") ticket now renders as a visible row, and its "used" toggle works

Add a ticket to an item with multiple active participants, selecting more than one participant for that single ticket-adding action (same as `V1`'s Test 6). Confirm the ticket now appears as its own row/entry in the "כרטיסים" ticket list (unlike `V1`, where nothing rendered), then toggle its "used" status.

**Expect:** The ticket renders as a row showing all covered participants. Toggling "used" flips a single, shared status for the whole ticket (both/all participants together), not per participant.

**Result:** ☑ PASS — notes: The manually-added ticket now renders as its own row ("איל בן יצחק, פאולה") with a single shared "נוצל" (used) checkbox and a remove ("הסר") action — confirms Findings 2/5 are genuinely fixed for the manual ticket flow. Related observation, reinforcing the Test 1/2 scope decision: the two documents attached and linked to participants (visible in the attachments list below) have no "used" toggle of their own at all — only a ticket created through the manual "add ticket" flow can be marked used. Once ticket coverage is driven by linked documents (per the Test 1/2 decision), "used" tracking will need to move to that flow too, not stay exclusive to the manual ticket entries being removed.

## Test 5 — The two "tickets" sections are now labeled distinctly (Activity and Flight)

On an Activity item with Smart-Import ticket holders and on a Flight item with passengers, open the detail view and check both ticket-related sections' headers.

**Expect:** The item type's own pre-existing multi-holder section (`ticketHolders[]`/`passengers[]`) and the `item.tickets[]` manual section now have distinct, non-identical headers — no longer both literally reading "כרטיסים" — so it's clear at a glance they're two different things.

**Result:** ☑ PASS (technically met) — notes: The two sections are now distinctly labeled ("פרטי הכרטיסים" / ticket details, vs. "מעקב כרטיסים ידני" / manual ticket tracking). Product Owner reiterates, though, that distinct labels don't resolve the underlying concern — the two-section duplication itself is still unwanted, consistent with the Test 1/2 decision to remove the manual add-ticket flow and drive ticket coverage from linked documents instead. Not a new finding — same disposition as Test 1/2's scope decision.

## Test 6 — Regression: the Task `owner` field is gone, and no pre-existing task data is lost or broken

1. Open the task-form modal (new or existing task). Confirm the free-text `owner` field is no longer present — only the participant picker (`V1`'s Test 4) remains.
2. Open a task that was created before this build (in the `V1` session or earlier), if one exists, and confirm it still opens/displays correctly with no error, even though it may have an `owner` value stored from before removal.

**Expect:** `owner` is gone from the form; any pre-existing task with a stored `owner` value still opens and behaves normally (the value is simply no longer shown/editable, not lost in a way that breaks the record).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — Regression: general spot-check across the full candidate

Spot-check that nothing else regressed: the Item participant picker (`participantAssignmentField()`) itself still behaves normally; `ticketHolders[]`/`passengers[]` extraction is unchanged; and sync of `items`, `tasks` and `sources` still works as expected.

**Expect:** No unintended side effects outside the scope of Tests 1–6.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Product Owner decision (overrides the Development Agent's "keep separate" position): once a document is linked to a participant, the app should **offer** a corresponding ticket-coverage entry for that participant — not silently auto-create one. | Test 1 | New scope item, not a defect | Decided — Product Owner 2026-09-27: **add the offered link.** For the Development Agent to design and implement in the next correction round. |
| `V7-F09` auto-link still did not occur on retest with what should be an exact Hebrew name match — the Development Agent's "wiring is correct, only spelling-variant matching is missing" claim is not confirmed by this evidence. | Test 2 | Blocking (core `V7-F09` acceptance criterion still unmet) | Open — reported by Product Owner 2026-09-27. |
| Product Owner decision, building on Test 1: remove the manual "add a ticket" button/flow entirely. Ticket coverage should be created by linking a document to a participant instead. The document-ticket-details section should show its linked participant(s) and a link back to the document; the manual section should be reduced to just the "participants with no tickets" list. | Test 2 | Scope change to `V7-F13`'s UI, not a defect | Decided — Product Owner 2026-09-27: **remove manual add-ticket, drive ticket coverage from documents.** For the Development Agent to design and implement. |
| Fixed, confirmed: the two ticket-related sections now have distinct headers (no longer both reading "כרטיסים"). | Test 2 | — | Resolved, confirmed 2026-09-27. |
| Once linked documents drive ticket coverage (per Test 1/2's decision), "used" tracking needs to move to the document/ticket-coverage side too — currently only manually-added tickets have a "used" toggle at all; linked documents have none. | Test 4 | Follow-on design point for the Test 1/2 scope change | Open — reported by Product Owner 2026-09-27. |
| New Product Owner request: ability to filter Tasks by participant. | (raised at GO/NO-GO, not its own test) | New scope item | Requested — Product Owner 2026-09-27. For the Development Agent to design and implement in the next correction round. |
| New Product Owner request: ability to completely (permanently) delete Tasks and Equipment items. | (raised at GO/NO-GO, not its own test) | New scope item | Requested — Product Owner 2026-09-27. For the Development Agent to design and implement in the next correction round. |

## GO/NO-GO decision

**NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-27, on build `0.7.9-16dd7a1c`. Blocking: Test 2 — `V7-F09`'s auto-link still does not occur even on a name that should exactly match, contradicting the Development Agent's round-2 claim that the wiring is correct and only spelling-variant matching was missing. Carrying a substantial scope expansion into the next correction round: (1) the app should offer a document-to-ticket-coverage link (Test 1); (2) the manual "add a ticket" flow should be removed entirely, with ticket coverage driven by linked documents instead, including "used" tracking moving to that flow (Tests 2, 4, 5); (3) new request — filter Tasks by participant; (4) new request — permanently delete Tasks and Equipment items. Sent back to the Development Agent for a round-3 correction.

## Production promotion

Not yet — recorded here once promotion is confirmed.
