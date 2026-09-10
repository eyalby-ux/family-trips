# Family Trips Alpha 0.7.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.1` (Alpha 0.7's first candidate: global-"+" Task creation, Today packing-list shortcut, category-preset Add, Task priority/filters), installed on `version/V7`
**Session number:** `V1`, opening a new per-candidate session sequence for `version/V7`, mirroring the convention established for `version/V6` (see `docs/versions/V6/0.6.7/EXECUTABLE_TEST_SESSION_V1.md`'s own `V2` change-history row for why that sequence restarted per-candidate rather than continuing the older global cross-candidate numbering).
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V41.md`; do not assign a finding to a version until the whole session is complete.

**Note on this candidate specifically:** the Development Agent could not click through these four features in an authenticated session from its own environment (no Google credentials for this app, and it confirmed no dev-mode auth bypass exists before concluding that, rather than assuming). Verification up to this point rests on a regression-test suite that source-inspects the exact rendering/wiring code paths and, for the priority/filter logic specifically, exercises the real functions directly (`tests/v7-1-small-fixes.mjs`). This session is therefore the first real, authenticated confirmation any of these four features actually work as intended — please read each test's own notes with that in mind, not as a routine confirmation of already-observed behavior.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V1 | 2026-09-10 | Initial session drafted by the Development Agent for the `0.7.1` candidate, 5 tests, all results blank pending the Product Owner's run. |

---

## Test 1 — Task creation from the global floating "+"

From any screen (Today, Timeline, Trip Center), tap the global "+" button. Confirm the source-choice bar now includes a "✅ משימה" (Task) option alongside the existing ידני/מסמך/קישור/JSON/QR choices. Tap it. Confirm this opens the same task-creation form already used by Preparations/Tasks' own "משימה חדשה" button (fields: משימה/בעלים/מועד/תאריך יעד/עדיפות — the last one is new, see Test 4). Fill in a title and save. Confirm the new task appears in the Preparations/Tasks list, and that no unrelated Item (Hotel/Flight/etc.) was created in the process.

**Expect:** Task is reachable and creatable directly from the global "+", the same as any other manually-created item type — this was previously impossible (the global "+" only ever offered generic Item types, since Tasks are a separate data model).

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 2 — Today page: packing-list shortcut, not individual items

Open Today. If any packing list has items, confirm the "גישה מהירה" (Quick Access) section shows a "ציוד" (packing) shortcut button. Tap it and confirm it navigates to the full Packing list. Separately, confirm no individual packing/equipment items ever appear directly inside Quick Access's own top-3 slots (those remain Tasks-only, or the existing hotel/transport/critical-item tiles when there are no open tasks) — the packing shortcut must appear as its own stable link, never displacing or mixing into that list. If there are currently no open tasks and no quick-access items at all, confirm the packing shortcut still appears (Quick Access's own section must not disappear just because it has nothing else to show).

**Expect:** A stable shortcut link to the full Packing list, visible whenever packing has items, without crowding the most urgent tasks out of their own slots — explicit Product Owner decision, not a Development Agent judgment call.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 3 — Category-level Add presets the current category's item type (`V5-F09`)

From Trip Center, open any specific category (e.g. Flight). Tap "הוספה" (Add) from within that category's own detail view. Confirm the manual-creation form's "סוג" (type) dropdown is pre-selected to Flight, not defaulted to Hotel as before. Confirm you can still freely change the type to something else before saving (the fix presets the default, it does not lock the type). Separately, confirm the GLOBAL "+" (from Today/Timeline, not from within a category) still defaults to Hotel as before, unaffected — this fix only changes category-scoped Add.

**Expect:** Add opened from within a specific category defaults its type to that category; Add opened from the global "+" (no category context) is unaffected, still defaulting to Hotel; the type remains freely changeable in both cases.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 4 — Task priority (High/Normal/Low) + filters

Open Preparations/Tasks. Create a new task and confirm the creation form now includes an "עדיפות" (priority) field with Gavoha/Regila/Nemucha (High/Normal/Low) options, defaulting to Regila (Normal) when nothing is changed. Save it, and confirm the task row shows both its due date (unchanged) and its priority as a visible badge. Edit an existing task created before this candidate (if any exist) and confirm it now shows a priority too (defaulted to Normal, not blank/broken). Then test the filters: use the two new filter selects (עדיפות, תאריך יעד) to filter by priority alone, by due-date scope alone, and by both together — confirm the combined filter shows only tasks matching BOTH conditions (AND, not OR). Confirm a "איפוס" (reset/clear) button appears once any filter is active, and that tapping it returns to the unfiltered list. Confirm the task order within any filtered or unfiltered view is stable and sensible (most urgent first) across repeated views, not shuffling.

**Expect:** Every task has a priority (new tasks default to Normal, pre-existing tasks are backward-normalized to Normal, never left blank); priority is visible on each row alongside the due date; the two filters combine with AND; a clear/reset action is available once filtering; sorting is deterministic.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 5 — Short regression (confirm nothing else broke)

Spot-check: create a Hotel item via the global "+" (still defaults to Hotel, still works exactly as before). Open an existing Flight/Attraction-Event/Insurance item and confirm nothing about its own edit/detail behavior changed. Confirm Today's existing task Quick Access (the top-3-urgent list itself, unrelated to the new packing shortcut) still orders overdue → today → nearest due → undated exactly as before, with its own existing "כל המשימות" overflow link when there are more than 3 open tasks.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| — | — | — | — |

## GO/NO-GO decision

_To be recorded by the Product Owner after all five tests above are run._
