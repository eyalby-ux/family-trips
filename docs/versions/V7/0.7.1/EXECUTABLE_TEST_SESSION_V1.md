# Family Trips Alpha 0.7.1 — Executable Acceptance Test Session

**Document revision:** `V2`
**Candidate:** `0.7.1` (Alpha 0.7's first candidate: global-"+" Task creation, Today packing-list shortcut, category-preset Add, Task priority/filters), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.1-5218c8f5`)
**Session number:** `V1`, opening a new per-candidate session sequence for `version/V7`, mirroring the convention established for `version/V6` (see `docs/versions/V6/0.6.7/EXECUTABLE_TEST_SESSION_V1.md`'s own `V2` change-history row for why that sequence restarted per-candidate rather than continuing the older global cross-candidate numbering). No test has been run yet — this is still the pre-session document, revised once before the Product Owner begins (see the `V2` change-history row below), the same way `0.6.7`'s own `EXECUTABLE_TEST_SESSION_V1.md` was internally revised prior to its own first completed round.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V45.md`; do not assign a finding to a version until the whole session is complete.

**Note on this candidate specifically:** the Development Agent could not click through these four features in an authenticated session from its own environment (no Google credentials for this app, and it confirmed no dev-mode auth bypass exists before concluding that, rather than assuming). Verification up to this point rests on a regression-test suite that source-inspects the exact rendering/wiring code paths and, for the priority/filter logic specifically, exercises the real functions directly (`tests/v7-1-small-fixes.mjs`). This session is therefore the first real, authenticated confirmation any of these four features actually work as intended — please read each test's own notes with that in mind, not as a routine confirmation of already-observed behavior.

**Mandatory wild-card-document rule — judged inapplicable to this session, stated explicitly rather than silently omitted (per `VERSION_PACKAGE_AUTHORING_STANDARD_V45.md`'s "Mandatory wild-card document per acceptance session"):** that rule requires a real, non-canonical source document as a first-class numbered test whenever a session covers AI Smart Import document extraction, because a clean pass across the fixed canonical benchmark set only demonstrates fit to that set, not generalization to real, unseen input. None of `0.7.1`'s four items involve document extraction, a source document, or any AI Smart Import code path at all — they are UI/data-model changes to Task creation, Today's Quick Access, category-level Add defaults, and Task priority/filtering, none of which touch `netlify/functions/smart-import.mjs`, the insurance/flight/activity import adapters, or any extraction schema. There is no document to draw a wild-card case from because this candidate's scope has nothing for one to probe. The rule is therefore judged inapplicable to this session by scope, not skipped by oversight — consistent with how this project intends `0.7.7` (Bulk Trip Import) to make the same determination explicitly when its own turn comes, rather than leaving the absence unexplained.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V2 | 2026-09-10 | Pre-session revision, requested alongside the `qa` deployment: added the `Candidate` line's deployed build identifier (`0.7.1-5218c8f5`, `version/V7` commit `5218c8f`); added the explicit statement above judging the mandatory wild-card-document rule inapplicable to this session's scope, with rationale, rather than leaving its absence unaddressed; lightly reframed Test 5 to name the Alpha 0.6 Smart Import feature set explicitly. No test results changed — session number stays `V1`, no round has been run yet. |
| V1 | 2026-09-10 | Initial session drafted by the Development Agent for the `0.7.1` candidate, 5 tests, all results blank pending the Product Owner's run. |

---

## Test 1 — Task creation from the global floating "+"

**Session run:** 2026-09-10, Product Owner (Eyal), against `qa` alias build `0.7.1-5218c8f5`.

From any screen (Today, Timeline, Trip Center), tap the global "+" button. Confirm the source-choice bar now includes a "✅ משימה" (Task) option alongside the existing ידני/מסמך/קישור/JSON/QR choices. Tap it. Confirm this opens the same task-creation form already used by Preparations/Tasks' own "משימה חדשה" button (fields: משימה/בעלים/מועד/תאריך יעד/עדיפות — the last one is new, see Test 4). Fill in a title and save. Confirm the new task appears in the Preparations/Tasks list, and that no unrelated Item (Hotel/Flight/etc.) was created in the process.

**Expect:** Task is reachable and creatable directly from the global "+", the same as any other manually-created item type — this was previously impossible (the global "+" only ever offered generic Item types, since Tasks are a separate data model).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Today page: packing-list shortcut, not individual items

Open Today. If any packing list has items, confirm the "גישה מהירה" (Quick Access) section shows a "ציוד" (packing) shortcut button. Tap it and confirm it navigates to the full Packing list. Separately, confirm no individual packing/equipment items ever appear directly inside Quick Access's own top-3 slots (those remain Tasks-only, or the existing hotel/transport/critical-item tiles when there are no open tasks) — the packing shortcut must appear as its own stable link, never displacing or mixing into that list. If there are currently no open tasks and no quick-access items at all, confirm the packing shortcut still appears (Quick Access's own section must not disappear just because it has nothing else to show).

**Expect:** A stable shortcut link to the full Packing list, visible whenever packing has items, without crowding the most urgent tasks out of their own slots — explicit Product Owner decision, not a Development Agent judgment call.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — Category-level Add presets the current category's item type (`V5-F09`)

From Trip Center, open any specific category (e.g. Flight). Tap "הוספה" (Add) from within that category's own detail view. Confirm the manual-creation form's "סוג" (type) dropdown is pre-selected to Flight, not defaulted to Hotel as before. Confirm you can still freely change the type to something else before saving (the fix presets the default, it does not lock the type). Separately, confirm the GLOBAL "+" (from Today/Timeline, not from within a category) still defaults to Hotel as before, unaffected — this fix only changes category-scoped Add.

**Expect:** Add opened from within a specific category defaults its type to that category; Add opened from the global "+" (no category context) is unaffected, still defaulting to Hotel; the type remains freely changeable in both cases.

**Result:** ☑ PASS — notes: "The default of the general + isn't Hotel, but I don't think is a problem. All other issues behave as expected — pass." (Product Owner's own words; logged as Finding 1 below, non-blocking per his judgment.)

## Test 4 — Task priority (High/Normal/Low) + filters

Open Preparations/Tasks. Create a new task and confirm the creation form now includes an "עדיפות" (priority) field with Gavoha/Regila/Nemucha (High/Normal/Low) options, defaulting to Regila (Normal) when nothing is changed. Save it, and confirm the task row shows both its due date (unchanged) and its priority as a visible badge. Edit an existing task created before this candidate (if any exist) and confirm it now shows a priority too (defaulted to Normal, not blank/broken). Then test the filters: use the two new filter selects (עדיפות, תאריך יעד) to filter by priority alone, by due-date scope alone, and by both together — confirm the combined filter shows only tasks matching BOTH conditions (AND, not OR). Confirm a "איפוס" (reset/clear) button appears once any filter is active, and that tapping it returns to the unfiltered list. Confirm the task order within any filtered or unfiltered view is stable and sensible (most urgent first) across repeated views, not shuffling.

**Expect:** Every task has a priority (new tasks default to Normal, pre-existing tasks are backward-normalized to Normal, never left blank); priority is visible on each row alongside the due date; the two filters combine with AND; a clear/reset action is available once filtering; sorting is deterministic.

**Result:** ☑ PASS — notes: "All pass, we should add a filter that display only open tasks, closed tasks are still shown at any filter." (Product Owner's own words; logged as Finding 2 below, enhancement request, not a defect in this candidate's scope.)

## Test 5 — Short regression (confirm nothing else broke, including Smart Import)

`0.7.1` touches no Smart Import code (`netlify/functions/smart-import.mjs` and the insurance/flight/activity adapters are untouched by this candidate) — this test is a quick live confirmation of that, not a full re-run of the Hotel/Flight/Attraction-Event/Insurance Smart Import benchmark suites those already-accepted candidates carry their own sessions for. Spot-check: create a Hotel item via the global "+" (still defaults to Hotel, still works exactly as before). Open an existing Flight/Attraction-Event/Insurance item (each already live in Production via its own accepted Smart Import vertical) and confirm nothing about its own edit/detail behavior changed. Confirm Today's existing task Quick Access (the top-3-urgent list itself, unrelated to the new packing shortcut) still orders overdue → today → nearest due → undated exactly as before, with its own existing "כל המשימות" overflow link when there are more than 3 open tasks.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Global "+" default type is not Hotel as the test expected | Test 3 | Low | Accepted, non-blocking — Product Owner's own judgment |
| No filter to show open tasks only; closed tasks appear regardless of active filter | Test 4 | Enhancement | Not a defect in `0.7.1`'s scope — candidate for a future correction package or backlog item |

## GO/NO-GO decision

**GO.** All five tests PASS (two with non-blocking notes above). Recorded by the Product Owner (Eyal), 2026-09-10. `0.7.1` may proceed to Production promotion as a separate, explicit action.
