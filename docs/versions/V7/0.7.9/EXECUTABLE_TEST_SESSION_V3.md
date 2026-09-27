# Family Trips Alpha 0.7.9 — Executable Acceptance Test Session

**Document revision:** `V3` (supersedes `V2` — round-3 correction, after the Product Owner's second NO-GO on build `0.7.9-16dd7a1c`)
**Candidate:** `0.7.9` (participant-system extensions: `V7-F09` auto-link attached documents to a participant, `V7-F10` link Tasks to the participant system, `V7-F13` document-driven ticket coverage — redesigned this round), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9-be76c2f7`)
**Session number:** `V1` of this document. No test has been run against this build yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

## What changed since the `V2` session (build `0.7.9-16dd7a1c`), per the Development Agent's round-3 report

**Finding 1 (`V7-F09` auto-link still failing, even on an exact name match) — re-investigated from scratch, root-caused, fixed.** Direct live-model evidence: a real extraction run against the AE-001 benchmark PDF (via `netlify dev:exec --context production`, the site's real production OpenAI key) confirmed `resolveParticipantIdsFromDraft` matches correctly — even against a word-order variant, a harder case than an exact match. The real bug: round 2's fix only ran the resolution when `targetItem` was set, which is true for "attach a document to an existing item" but **never** true for "create a brand-new item via Smart Import" (`smartIngest`'s own call to the shared analysis function passes no target at all). Given round 2's Test 2 wording ("to a fresh item," unlike Test 1's explicit "existing item"), the retest very likely used new-item creation — where the auto-link code never ran, regardless of match quality. **Fixed:** the resolution is now unconditional, so it fires for both flows.

**Finding 2 (Product Owner decision: redesign ticket coverage to be document-driven) — designed and implemented.** Confirmed with you before building: "used" is one shared boolean on the linked document itself (not per participant); the confirm-as-coverage control lives inline on the document's own row (not a separate modal); the manual "add a ticket" flow and `item.tickets[]` are fully retired, not migrated (their only real data was test entries on the disposable QA Test Trip — `0.7.9` has never reached Production). A document already linked to participant(s) now offers an **"אישור ככיסוי כרטיס"** (confirm as ticket coverage) button, for ticket-eligible item types only (Flight/Activity/Transport). Confirming replaces the button with a **"כרטיס מאושר"** (ticket confirmed) badge and a shared **"נוצל"** (used) checkbox, both on that same document row. Per your own explicit instruction, this is now the **only** place a document's ticket status is shown — the old separate ticket-coverage section is reduced to nothing but the aggregate "participants still without a ticket" line, with no second listing of who's covered by which document.

**Finding 3 (new request: filter Tasks by participant) — implemented.** A fourth filter select ("משתתף") alongside the existing priority/due-date/status filters on the Tasks page. Selecting a participant shows their own specifically-assigned tasks plus every shared ("none"/"all"-scope) task — the same "shared is always visible" rule Packing's own participant view already uses, not a new rule invented here.

**Finding 4 (new request: permanently delete Tasks and Equipment) — investigated, then implemented.** Confirmed by direct code inspection first: neither Tasks nor Equipment/Packing items had **any** delete affordance before this — only a done/packed checkbox toggle, not a soft-delete being upgraded. Added a permanent delete button to each row, using the exact same plain-`confirm()`-then-remove pattern this app already uses for deleting an Item.

Build `0.7.9-be76c2f7` is live on `qa`, 65 tests across the full suite (26 in this candidate's own dedicated file), full quality gate clean.

## Test 1 — `V7-F09`: a document with an exact-match name auto-links, on BOTH new-item creation and attach-to-existing-item

Repeat the two flows from earlier sessions:
1. Create a brand-new item via Smart Import (global "+" → analyze a document), where the document's extracted text names a Trip participant exactly.
2. Attach a document to an already-existing item (extract mode), where the document's extracted text names a Trip participant exactly.

**Expect:** In both cases, the resulting item's attached document shows a participant badge for the matched name, populated automatically — no manual correction needed. (If the specific document used doesn't actually name anyone recognizably, that's expected, not a defect — only a confident match auto-links.)

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 2 — Regression: manual correction and attach-only still work

1. On a document with no confident auto-match, confirm the manual participant-link correction affordance ("שיוך למשתתף") still works.
2. Attach a document using "attach only" mode and confirm it still gets no auto-link.

**Expect:** Both unchanged from prior sessions.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 3 — `V7-F13` redesigned: a linked document can be confirmed as ticket coverage

On a Flight, Activity, or Transport item, attach a document and get it linked to one or more participants (via auto-link or the manual correction affordance). Confirm the new **"אישור ככיסוי כרטיס"** button appears on that document's own row. Click it.

**Expect:** The button is replaced by a **"כרטיס מאושר"** badge and a **"נוצל"** (used) checkbox, both on the same row. The linked participant(s) disappear from the item's own "משתתפים ללא כרטיס" (participants without a ticket) summary. No separate ticket-list section duplicates this information — the document's own row is the only place its ticket status appears.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 4 — A document covering multiple participants clears all of them at once, and "used" is one shared toggle

Get a single document linked to **more than one** participant (auto-link or manual correction), then confirm it as ticket coverage (Test 3). Toggle "נוצל" (used).

**Expect:** All linked participants disappear from "ללא כרטיס" from that one confirmed document alone. Toggling "used" flips a single shared status for the document as a whole — there is no per-participant used state to manage separately.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 5 — A participant link alone, without confirmation, does NOT count as ticket coverage

Link a document to a participant but do **not** click "אישור ככיסוי כרטיס."

**Expect:** That participant still appears under "משתתפים ללא כרטיס" — a bare participant link is informational only ("this document is about this person"), not automatic ticket coverage, matching your own "offer, don't auto-create" instruction.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 6 — Regression: the manual "add a ticket" flow is genuinely gone, not just hidden

Open a Flight, Activity, or Transport item's detail view.

**Expect:** There is no "הוספת כרטיסים" button, no separate manual add-ticket form, and no leftover manually-added ticket rows from earlier sessions (any test tickets added during rounds 1–2 on the QA Test Trip are expected to no longer appear — they were test data only, never promoted to Production, and are not migrated by this redesign).

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 7 — `V7-F10` regression: Task participant assignment and the `owner` removal still hold

Confirm the Task participant picker (none/all/specific + checkboxes) still works as before, and that the free-text `owner` field is still gone from the task form.

**Expect:** Unchanged from the `V2` session.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 8 — New: filter Tasks by participant

On the Tasks page, use the new "משתתף" filter select to choose a specific Trip participant.

**Expect:** The list narrows to that participant's own specifically-assigned tasks plus every shared task (tasks with no specific participant assignment, or assigned to "כל המשתתפים"). Combines correctly with the existing priority/due-date/status filters (all must match at once). "איפוס" (reset) clears all four filters back to showing everything.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 9 — New: permanently delete a Task and an Equipment item

1. Create a test Task, then delete it using the new delete button.
2. Create a test Equipment/Packing item, then delete it using the new delete button.

**Expect:** Both actions ask for confirmation first (a plain yes/no dialog), and once confirmed, the record is permanently gone from the list — not just marked done/packed.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 10 — Regression: general spot-check across the full candidate

Spot-check that nothing else regressed: `ticketHolders[]` (Activity) and `passengers[]` (Flight) extraction and their own distinctly-labeled section are unchanged; the Item participant picker itself still behaves normally; sync of `items`, `tasks` and `sources` still works as expected.

**Expect:** No unintended side effects outside the scope of Tests 1–9.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| (fill in during acceptance testing) | | | |

## GO/NO-GO decision

Not yet run.

## Production promotion

Not yet — recorded here once promotion is confirmed.
