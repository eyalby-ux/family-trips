# Family Trips Alpha 0.7.7 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.7` (Shopping places + scheduled shopping visits — a new `shoppingPlace` item type, plus an optional place reference on shared shopping-list entries), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.7-e54a61fc`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What this candidate is, worth restating before testing:** the shared shopping list (`state.shopping`, the flat checklist) already existed and is unchanged by this candidate. The new content is a Shopping Place/visit entity — reachable from the same "🛒 קניות" tile's own view, not a separate Trip Center tile — that may be saved without a date (a place to remember) or with one (which schedules it into Timeline/Calendar without creating a duplicate record). Shopping-list entries can now optionally reference a place.

**Design decision to review, not a test step of its own:** the Development Agent verified that `buildItemFormValues` recomputes an item's `schedule` from a fixed per-type default on every save (harmless for every existing type, since their schedule shape never changes) — but this would have silently reset a shopping place's schedule back to `'none'` on the very save meant to add a date. Fixed with a shared `scheduleForType` helper (also used by `updateSuggestion`). Please review this reasoning as part of your GO/NO-GO judgment; Tests 2 and 3 below are what actually exercises it.

**Two scoped extensions delivered alongside the core ask, called out for your review:**
1. `center()`'s tile grid excludes `shoppingPlace` from the main grid (matching how `link`/`participant` are already excluded), so Shopping stays one combined category, not two separate tiles.
2. A third gap found only during implementation: `manualCreateDefaults()` normally pre-fills the Trip's start date into every manual-create form, which would have silently defeated "may be saved without a date." Skipped for `shoppingPlace` only.

## Test 1 — Create an undated shopping place

From the "🛒 קניות" (Shopping) tile, add a new shopping place (e.g. a mall or market) with a name, location, and optionally a website/phone/notes — leave the date/time empty. Save it.

**Expect:** Saves successfully with no date required. The place appears in the Shopping view alongside the existing shared list, rendered via the standard item row. It does **not** appear anywhere in Timeline or Today (nothing to schedule yet).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Add a date to the same place: schedules it, no duplicate record

Edit the shopping place created in Test 1 and add a date/time to it. Save.

**Expect:** The **same** record now shows in Timeline/Calendar on that date — not a second, duplicate entry. Reopening the place in Shopping still shows one record, now with a date. (This is what `scheduleForType`/the fixed-schedule-reset investigation was about — confirm the date actually sticks after save, rather than silently reverting to undated.)

**Result:** ☑ PASS — notes: Confirmed as expected — the date stuck after save (the `scheduleForType` fix holds), same record now shown in Timeline, no duplicate.

## Test 3 — Remove the date again: reverts to undated, still one record

Edit the same place again and clear the date/time. Save.

**Expect:** The record goes back to undated — disappears from Timeline/Today, still shows in the Shopping view as one record (not deleted, not duplicated).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 4 — Shopping place has a participant scope, like every other item type

On a shopping place (dated or undated), set its participant assignment to none/all/a specific participant, matching the pattern from `0.7.4`. Save and confirm the detail view shows the assignment correctly.

**Expect:** Works exactly like the participant-assignment picker on every other item type.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 5 — Shopping is its own Trip Center category, separate from Attractions

Confirm shopping places do not appear folded into the Attractions/Activity category, and confirm the Trip Center tile grid does not show a separate/duplicate tile for shopping places (they should live inside the same "🛒 קניות" tile as the shared list, not get their own extra tile).

**Expect:** One combined "🛒 קניות" category containing both the shared list and shopping places; nothing shows under Attractions.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 6 — Shopping-list entry references a place

Add a new item to the shared shopping list (e.g. "sunscreen") and link it to a shopping place created above (e.g. "Central World Mall"), instead of using free text. Save.

**Expect:** The list entry shows "📍 <place name>" alongside it. The existing free-text `linkedNeed` field is untouched — this is a separate, additional relationship, not a replacement.

**Result:** ☑ PASS — notes: The place-reference itself works as specified — the list entry shows "📍 <place name>", `linkedNeed` untouched. Product Owner's own observation: there's no reverse view — opening a shopping place's own detail page doesn't show which list items are linked to it. This wasn't explicitly in the original scope document's acceptance criteria (only the list-entry-references-a-place direction was specified). Product Owner's own call: PASS as specified, with this logged as a new enhancement to be scoped into a dedicated `0.7.7.1` correction, not left generically unscoped.

## Test 7 — Deleting a place never cascades to delete list entries that reference it

Delete the shopping place linked in Test 6. Confirm the shopping-list entry itself.

**Expect:** The list entry survives — it is **not** deleted along with the place. Its place-reference is cleared or shown as no-longer-linked, not treated as a cascading delete.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 8 — Regression: the existing shared shopping list is unaffected

Add a plain shopping-list entry with no place reference, exactly as you would have before this candidate (free-text `linkedNeed`, quantity, owner, purchased toggle). Confirm it behaves exactly as it always has.

**Expect:** No change to the pre-existing list workflow — this candidate is additive only.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Enhancement: a shopping place's own detail view doesn't show the shopping-list items linked to it (no reverse lookup) — the reference only works in the list-entry → place direction, not place → its items. Not in the original scope document's acceptance criteria. | Test 6 | Non-blocking (enhancement) | Reported by Product Owner 2026-09-26. **Scoped for a dedicated `0.7.7.1` correction**, not left generically unscoped. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-26. All 8 tests PASS. The `shoppingPlace` item type (undated-or-dated, single record, no duplication on scheduling/unscheduling via the `scheduleForType` fix), its participant scope, its placement inside the single combined "🛒 קניות" Trip Center category, the optional place-reference on shared shopping-list entries, and the no-cascade-delete behavior are all confirmed working as scoped. The pre-existing shared shopping-list workflow is confirmed unaffected (Test 8, regression). One non-blocking finding logged: a shopping place's own detail view has no reverse lookup showing which shopping-list items reference it (only the list-entry → place direction was in scope) — **scoped for a dedicated `0.7.7.1` correction**, not left generically unscoped. `0.7.7` may proceed to Production promotion as a separate, explicit action.

## Production promotion

Not yet — recorded here once promotion is confirmed.
