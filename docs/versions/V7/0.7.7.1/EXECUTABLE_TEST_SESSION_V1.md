# Family Trips Alpha 0.7.7.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.7.1` (correction: shopping place reverse lookup — a shopping place's own detail view now shows which shopping-list entries reference it), found live during `0.7.7`'s own acceptance session (Test 6), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.7.1-77e2157d`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What this correction is, worth restating before testing:** `0.7.7` shipped the list-entry → place direction (a shopping-list entry can reference a place, shown as "📍 <place name>"). What was missing, logged as a non-blocking finding during acceptance, was the reverse direction: opening a shopping place's own detail view gave no indication of which list entries pointed to it. This correction adds exactly that — a computed lookup (`linkedShoppingListEntries`), mirroring the existing `insuranceCoveringItems` pattern, rendered in the place's detail view right after the tickets section. Nothing else changed: the `placeId` field itself, the no-cascade-delete behavior on place deletion, and the list-entry-to-place lookup are all untouched, per the Development Agent's own report — Test 4 below exists to confirm that claim, not assume it.

## Test 1 — A shopping place's detail view lists the shopping-list entries that reference it

Open the detail view of a shopping place that has one or more shopping-list entries linked to it (reuse or recreate the link from `0.7.7`'s own Test 6, e.g. "Central World Mall" linked from a "sunscreen" list entry).

**Expect:** A new section appears in the place's detail view, right after the tickets section, listing the linked list entry/entries (name and quantity). This is the missing reverse direction — previously nothing showed here at all.

**Result:** ☑ PASS — notes: The new reverse-lookup section itself works as specified. Product Owner's own new observations, unrelated to this correction's scope, logged below: (1) a shopping-list item can't be edited; (2) a shopping-list item can't be marked as purchased from inside the Shopping center itself; (3) purchased shopping-list items should behave like the Equipment list's already-owned items — moved to a separate, hidden-by-default list, but still addable again. Product Owner's own call: PASS Test 1 as specified; these are logged as candidates for their own dedicated correction, not left sitting unscoped in the general backlog.

## Test 2 — A purchased linked entry shows struck through

Mark one of the linked shopping-list entries (from Test 1) as purchased. Reopen the shopping place's detail view.

**Expect:** That entry's row in the new section appears struck through, matching how purchased items are shown elsewhere in the shopping list. It is not removed from the list.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — The linked entries are plain rows, not clickable

In the same section, try tapping/clicking one of the listed entries.

**Expect:** Nothing happens — these are plain informational rows, not buttons or links (unlike, for example, the insurance "covering items" list, which is clickable). A shopping-list entry has no detail page of its own to route to.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 4 — Regression: everything from `0.7.7` itself is unaffected

1. Confirm the list-entry → place direction still works exactly as it did in `0.7.7` (a list entry linked to a place still shows "📍 <place name>").
2. Delete a shopping place that has linked list entries. Confirm the list entries survive, exactly as `0.7.7`'s own Test 7 confirmed (no cascading delete).
3. Open the detail view of any other item type (e.g. a flight or hotel). Confirm no new section appears — this correction is scoped to `shoppingPlace` only.

**Expect:** No behavior change anywhere outside the new reverse-lookup section itself.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| A shopping-list item cannot be edited once created. | Test 1 | Blocking for this candidate, per Product Owner's NO-GO | Reported by Product Owner 2026-09-26. **Product Owner's decision: NO-GO on `0.7.7.1` as originally scoped — this finding is to be folded into `0.7.7.1`'s own scope**, not deferred to a separate future correction. |
| A shopping-list item cannot be marked as purchased from inside the Shopping center itself. | Test 1 | Blocking for this candidate, per Product Owner's NO-GO | Reported by Product Owner 2026-09-26. **Product Owner's decision: NO-GO on `0.7.7.1` as originally scoped — this finding is to be folded into `0.7.7.1`'s own scope**, not deferred to a separate future correction. |
| Purchased shopping-list items should behave like the Equipment list's already-owned items — moved to a separate, hidden-by-default list, but still addable again — rather than staying inline. | Test 1 | Blocking for this candidate, per Product Owner's NO-GO | Reported by Product Owner 2026-09-26. **Product Owner's decision: NO-GO on `0.7.7.1` as originally scoped — this finding is to be folded into `0.7.7.1`'s own scope**, not deferred to a separate future correction. |

## GO/NO-GO decision

**NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-26. All 4 tests of the originally scoped correction (the reverse-lookup section, its struck-through purchased styling, its non-clickable rows, and the `0.7.7` regression check) PASS on their own terms. However, the Product Owner has decided the three new observations logged above — a shopping-list item can't be edited, can't be marked purchased from inside the Shopping center, and purchased items should move to a separate hidden-by-default list (Equipment-style) rather than staying inline — are to be **folded into `0.7.7.1`'s own scope**, not deferred to a later version. This build (`0.7.7.1-77e2157d`) does **not** proceed to Production promotion as-is; a revised `0.7.7.1` implementing this expanded scope is needed, followed by a fresh acceptance session against the revised build.

## Production promotion

Not applicable to this build — superseded by the scope expansion above. Recorded once a revised `0.7.7.1` reaches GO.
