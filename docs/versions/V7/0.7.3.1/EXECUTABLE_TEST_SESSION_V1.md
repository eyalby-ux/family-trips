# Family Trips Alpha 0.7.3.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.3.1` (correction: Flight map-link staleness after editing location, a stuck "מנתח…" analyzing badge, and a brief empty-trip flash on app load/refresh — all three findings from `docs/versions/V7/0.7.3/EXECUTABLE_TEST_SESSION_V1.md`'s own finding register, scoped to this correction by the Product Owner, 2026-09-20), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.3.1-f83cbb80`, deploy `6aafdececf22df5b9564b7fd`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**Scope note — deliberately single-device.** All three findings here are single-device UI/logic bugs, not sync/concurrency issues — none of them need a second account or device to reproduce or verify.

**What's being fixed, stated plainly:**
- **Finding 1 (medium-high, 6/10):** a Flight item's map link stayed pointed at its original departure airport after editing the location field — the displayed text updated, the map link silently didn't. Root cause: `mapSearchLocation()` always preferred `item.details.departureAirport` (an extraction-only field with no edit UI at all) over `item.location` (the only location-shaped field the edit form actually exposes). Fix: the import-time default still wins for an unedited Flight, but the moment `location` diverges from the exact route string Smart Import generated, the user's edit wins.
- **Finding 2 (cosmetic, but a real regression in `0.7.3`'s own open-form buffering fix):** a source row's "מנתח…" (analyzing) badge stayed stuck long after analysis had actually finished. Root cause: a stale buffered remote snapshot (captured while the intake modal was open) could survive past a fresher update already applied directly, then get re-applied moments later — silently reverting data just painted. Fix: a direct apply now clears any leftover buffer first; the buffer's own flush is skipped while a local write is still in flight.
- **Finding 3 (cosmetic):** every app launch/page refresh briefly flashed "מתחילים מטיול ריק" (start with an empty Trip) before the real Trip data loaded in. Fix: a neutral loading state now shows until boot() has a real answer, instead of the empty-Trip call-to-action showing by default before boot() has had a chance to say otherwise.

**Verification gap, stated honestly:** no Firestore emulator is available in this environment, so the regression tests (`tests/v7-3-1-correction.mjs`, 7 tests) verify the fixed logic by source-inspection, not live browser timing. This live session is what actually verifies all three against real behavior.

## Test 1 — Editing a Flight's location updates its map link (Finding 1)

Open an existing Flight item (or create one with a known departure airport, e.g. via Smart Import or QR import). Note the current "🧭 חיפוש במפה" (search on map) link's destination. Edit the item and change the **location** field to something different (e.g. a real address or place name). Save. Tap the map link again.

**Expect:** The map link now reflects your edited location, not the original departure airport. (For a Flight whose location you *haven't* edited, the map link should still correctly use the departure airport, per the original `V6-F41` fix — worth a quick sanity check on an unedited Flight too, if convenient.)

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 2 — The analyzing badge clears correctly once analysis finishes (Finding 2)

Start a Smart Import analysis on a source (Add a new document, or attach-and-extract on an existing item) so the source shows the "מנתח…" badge while the intake/attach modal is still open. Wait for the analysis to actually finish (it navigates you to the suggestion review screen, or shows a failure). Go back to where that source is listed (e.g. the Documents category).

**Expect:** The source's badge reflects the real final state — "מנתח…" cleared, replaced by whatever the source's actual status is now (e.g. no badge if a proposal is ready, or "ניתוח נכשל" if it failed) — not stuck showing "מנתח…" indefinitely.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 3 — No empty-trip flash on app launch or page refresh (Finding 3)

With an existing Trip open, refresh the page (or fully close and reopen the app/tab). Watch closely during the very first moment of load.

**Expect:** No brief flash of "מתחילים מטיול ריק" (start with an empty Trip) before your real Trip data appears — either a neutral loading state briefly shows first, or your Trip data appears directly with no empty-state flash at all.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|

## GO/NO-GO decision

*To be recorded by the Product Owner after this session.*
