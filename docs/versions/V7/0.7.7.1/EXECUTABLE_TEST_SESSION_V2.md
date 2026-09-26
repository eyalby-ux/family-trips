# Family Trips Alpha 0.7.7.1 — Executable Acceptance Test Session

**Document revision:** `V2` (supersedes `V1` — expanded scope after the Product Owner's NO-GO on build `0.7.7.1-77e2157d`)
**Candidate:** `0.7.7.1` (shopping place reverse lookup, PLUS three items folded in after the `V1` NO-GO: editing a shopping-list item, marking one purchased from inside the Shopping center, and moving purchased items to a separate hidden-by-default list), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.7.1-a6ba2266`)
**Session number:** `V1` of this document. No test has been run against this build yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What changed since the `V1` session (build `0.7.7.1-77e2157d`):** that build's own 4 tests (the reverse-lookup section, its struck-through purchased styling, its non-clickable rows, and the `0.7.7` regression check) already PASSED on their own terms — the Product Owner's NO-GO was about scope, not a defect in that work. Tests 1–4 below are the same checks, re-run against the new build as a straightforward regression confirmation, since the Development Agent's own instructions were not to touch that work unless a genuine interaction was found. Tests 5–7 are new, covering the three folded-in items. Test 8 is a broader regression check.

## Test 1 — A shopping place's detail view lists the shopping-list entries that reference it

Open the detail view of a shopping place that has one or more shopping-list entries linked to it.

**Expect:** The reverse-lookup section still appears, right after the tickets section, listing the linked entry/entries (name and quantity) — unchanged from the `V1` session.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — A purchased linked entry shows struck through

Mark one of the linked shopping-list entries as purchased. Reopen the shopping place's detail view.

**Expect:** That entry's row still appears struck through — unchanged from the `V1` session.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — The linked entries are plain rows, not clickable

Try tapping/clicking one of the listed entries.

**Expect:** Still nothing happens — unchanged from the `V1` session.

**Result:** ☑ PASS — notes: Deviates from the original spec ("plain rows, not clickable") — clicking a listed entry actually toggles it between purchased and un-purchased (click again to reverse). Product Owner's own call: PASS — this is a more useful behavior than the originally specified no-op, and it overlaps usefully with Test 6's own ask (marking purchased from inside the Shopping center). Logged below as a spec deviation, not a defect.

## Test 4 — Regression: list-entry → place direction and no-cascade-delete still hold

1. Confirm a list entry linked to a place still shows "📍 <place name>".
2. Delete a shopping place that has linked list entries. Confirm the list entries survive.

**Expect:** Both unchanged from `0.7.7`/`0.7.7.1 V1`.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 5 — A shopping-list item can now be edited

Open an existing shopping-list entry (created before or during this session) and edit it — change the name/`linkedNeed`, quantity, or owner. Save.

**Expect:** The edit is available and saves correctly, matching how every other editable record in the app behaves. This was the first folded-in finding from the `V1` session (previously create-and-toggle-only).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 6 — A shopping-list item can be marked purchased from inside the Shopping center itself

From inside the Shopping center view (not any other screen), mark a shopping-list entry as purchased, and then unmark it.

**Expect:** The purchased toggle is reachable and works directly from the Shopping center. This was the second folded-in finding.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — Purchased shopping-list items move to a separate, hidden-by-default list, and can be re-added

1. Mark a shopping-list item as purchased (if not already, from Test 6).
2. Confirm it no longer appears in the main/active shopping list, and instead appears in a separate, hidden-by-default section or view — mirroring the Equipment list's already-owned items.
3. Confirm that section can be opened/expanded to see it.
4. Confirm the same item (or an item with the same name) can still be added again to the active list.

**Expect:** Behavior mirrors the Equipment list's pattern exactly — purchased items move out of the active list but remain visible on demand, and re-adding is not blocked. This was the third folded-in finding.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 8 — Regression: nothing else in the Shopping center or elsewhere is affected

Spot-check: add a brand-new shopping-list entry with no place reference (plain, as always), confirm quantity/owner/purchased-toggle basics still work, and open the detail view of an unrelated item type (e.g. a flight or hotel) to confirm nothing there changed.

**Expect:** No unintended side effects outside the scope of Tests 5–7.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Spec deviation: the reverse-lookup entry rows were specified as plain/non-clickable, but clicking one actually toggles that entry's purchased status (click again to reverse). | Test 3 | Non-blocking (accepted deviation) | Reported by Product Owner 2026-09-26. **Accepted as-is — PASS.** Considered more useful than the originally specified no-op, and overlaps with the Test 6 ask. Not scoped for correction. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-26. All 8 tests PASS on build `0.7.7.1-a6ba2266`. The originally delivered reverse-lookup work (Tests 1–4) is confirmed unchanged and unaffected. All three findings folded in after the `V1` NO-GO are confirmed fixed as scoped: a shopping-list item can now be edited (Test 5), can be marked purchased directly from inside the Shopping center (Test 6), and purchased items now move to a separate, hidden-by-default list mirroring the Equipment pattern, with re-adding still possible (Test 7). One accepted spec deviation logged: clicking a reverse-lookup entry row toggles its purchased status rather than doing nothing, judged more useful than the original no-op spec and left as-is. `0.7.7.1` may proceed to Production promotion as a separate, explicit action.

## Production promotion

Not yet — recorded here once promotion is confirmed.
