# Family Trips Alpha 0.7.4.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.4.1` (correction: leftover duplicate free-text "משתתפים" (participants) field removed from item edit forms, found live during `0.7.4`'s own acceptance session, Test 9), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.4.1-72557e8b`, deploy `6ab117c66b90b4158fee1942`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**Scope note — single item, no data-model or sync-engine change.** This is a narrow UI cleanup; single-device testing on the QA Test Trip is sufficient.

**What's being fixed, and two things found during investigation worth knowing before testing:**

The old free-text "משתתפים" field (predating `0.7.4`) has been removed from every item type's edit/create form — it was one shared piece of code, not Hotel-specific, so this fixes every type at once (Hotel, Flight, Activity, Insurance, Transport, Restaurant), not just the one you reported.

**Investigated, not assumed:** the old field was not always empty. Flight, Activity, and Insurance items created via Smart Import extraction actually do carry real passenger/ticket-holder/insured-person names in it. That data was always redundant, though — the same names already show in full (with ticket numbers, seats, ID numbers) in each of those types' own detail-page summary section, which this correction doesn't touch. The old field itself was never displayed anywhere on its own, so removing its only edit control doesn't hide any information you could previously see.

**A related safety fix, not just the UI change:** removing the field also had to change how saving an edited item works internally, so that saving any item (for any reason — even just fixing a typo in the title) can no longer silently blank out whatever was already stored in the old field. Whatever real data already exists there (if any) now survives untouched — there's no way to verify this against real Production data from this environment, so your own retest of an already-existing Flight or Activity item (if you have one from before this correction) would be a good way to confirm nothing was lost.

## Test 1 — Old field is gone from the Hotel form (the original report)

Edit an existing Hotel item (or create a new one). Confirm the old free-text "משתתפים" field no longer appears anywhere in the form — only the participant-assignment control (none / all participants / specific participants) from `0.7.4` should be there.

**Expect:** No duplicate participants control. Save the item and confirm it still saves correctly.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Old field is gone from every other item type too

Repeat the same check on at least two other item types — e.g. Flight and Activity (the two types Smart Import actually used to populate the old field with real names), and Transport (a type that didn't exist before `0.7.4`).

**Expect:** The old field is absent everywhere, not just Hotel — confirming it was a shared fix, not a per-type patch.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — Existing item data isn't silently lost by editing

If you have an existing Flight or Activity item from before this correction (ideally one originally created via Smart Import, which is most likely to have had real names in the old field): open its detail page and confirm the passenger/ticket-holder names are still showing correctly in that item's own summary section (unrelated to the field just removed). Then edit that same item — change something unrelated, like the notes — and save. Reopen its detail page again.

**Expect:** The passenger/ticket-holder names are still there after the edit, exactly as before — nothing about them changed just because you edited a different field.

**Result:** ☐ Not verifiable in this session — notes: Product Owner has no existing Flight/Activity item on the QA Test Trip with real old-field passenger/ticket-holder data to retest against (the sort of item that would exist only from before this correction, via Smart Import). Product Owner's own call: accept on the Development Agent's own code-level evidence instead — a genuine behavioral test confirming the save function never outputs the old field's key, for every item type — rather than block this candidate on a live-data check that has no test case to run. Not a defect; simply not independently re-verified live.

## Test 4 — The real participant-assignment picker (from `0.7.4`) still works normally

On any item, set its participant assignment to a specific participant, save, and confirm the item's detail page still shows "משויך ל: [name]" correctly (same as `0.7.4`'s own Test 6). This confirms the correction didn't disturb the feature it's sitting right next to.

**Expect:** Works exactly as it did in `0.7.4`.

**Result:** ☑ PASS — notes: Confirmed on an actual Item (not a Task, which has its own separate, unrelated free-text "בעלים" owner field) — participant assignment set, saved, and correctly shown as "משויך ל: [name]" on the item's detail page. Product Owner also identified a real product gap while testing: Tasks are not linked to the participant system at all (their "owner" field is free text, unrelated to `0.7.4`'s participant-assignment model). Logged as a new finding below.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Product gap: Tasks are not linked to the participant system built in `0.7.4` — a Task's "בעלים" (owner) field is free text, unrelated to the item-level participant-assignment model (none/all/specific). Tasks should be linkable to participants too. | Test 4 | Gap (feature scope, not a defect in this candidate) | Reported by Product Owner 2026-09-21. **Left unscoped, deliberately** — Product Owner will schedule this for a specific target version with the planning assistant separately. Not part of `0.7.4.1`. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-21. All 4 tests PASS (Test 3 recorded as not verifiable — no test data existed — and accepted on the Development Agent's own code-level evidence instead). `0.7.4.1` may proceed to Production promotion as a separate, explicit action. One new gap logged, deliberately left unscoped for future planning: Tasks aren't linked to the participant system.

## Production promotion

**`0.7.4.1` is live in Production**, confirmed 2026-09-21. Build `0.7.4.1-72557e8b`, deploy `6ab11cc9f2b83f4e311ee39e`, verified via a fresh cache-bypassed fetch as byte-identical to the accepted `qa` build. Rollback backup preserved at `production-promotion-backup-20260921-150116/` — low-risk, no data model or security-rules change. The leftover duplicate participants field is gone from every item type's edit form in Production, and the silent-overwrite risk on the save path is closed. The Tasks-participant-linking gap remains open, unscoped, pending the Product Owner's own scheduling decision.
