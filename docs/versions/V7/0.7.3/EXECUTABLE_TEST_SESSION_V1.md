# Family Trips Alpha 0.7.3 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.3` (sync engine: field-level merge writes, open-form buffering, minimal pending-sync indicator), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.3-791b640c`, deploy `6aa997a02329e47220ae89b8`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**This candidate needs two real accounts on two genuinely separate devices/browsers, not one** — sync correctness between concurrent writers is the entire point of this candidate, unlike single-device correctness testing. Same accounts already established from `0.7.2`'s own testing:

- **Account A (Owner)** — `eyalby@gmail.com`.
- **Account B (Editor)** — `paolakohan@gmail.com`.

**All tests run against the dedicated QA Test Trip** — per `VERSION_PACKAGE_AUTHORING_STANDARD`'s "Shared-backend testing discipline" and `DESIGN_V1.md` §6's own confirmation that this convention remains sufficient for two-device testing (no separate `qa` Firebase project needed). **Never run these tests against a real, non-test Trip** — `qa` and Production share one live Firestore/Storage backend.

**What this candidate does and does not change, stated plainly before testing:** `0.7.2`'s own real-time Firestore listeners already gave near-real-time read sync for free (confirmed in `DESIGN_V1.md` §1, not newly built here). What `0.7.3` actually adds: (1) field-level writes so two devices editing *different fields of the same record* both survive instead of one full-record overwrite silently reverting the other (§2.2); (2) buffering a remote update while a form is open, so it can no longer silently wipe an in-progress unsaved edit (§2.3/§0.2); (3) a minimal "pending sync" indicator extending the existing offline banner (§4); (4) the `0.7.2.1` correction (already live in Production separately) that stopped offline edits after the first from being silently lost — this candidate builds on that fix, not re-implements it.

**Verification gap, stated honestly:** no Firestore emulator is available in this environment, so the Development Agent's own regression tests (`tests/v7-3-sync-engine.mjs`, 23 tests) verify the field-level diff logic and the fixed control-flow shape by source-inspection and a pure-function diff, not genuine two-device offline/reconnect behavior against the real SDK. **This live session is what actually verifies the sync engine's real behavior for the first time.**

## Test A — Baseline near-real-time (both online)

Both accounts online, both viewing the QA Test Trip. Account A edits an item (e.g. changes a title). Confirm Account B sees the change without a manual refresh.

**Expect:** The change appears on B within a few seconds at most (Firestore's own normal propagation latency on a live connection — record the actual observed delay, this document can't assert a precise number from this environment).

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test B — Offline edit, single device, then reconnect

Account A goes offline (airplane mode), edits an item. Confirm Account B (online) does **not** see the change yet. Account A reconnects. Confirm B then sees the change, within a similar window to Test A.

**Expect:** The edit is invisible to B while A is offline, then arrives correctly once A reconnects.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test C — Concurrent edits, different records

Both accounts go offline, each edits a *different* item, both reconnect around the same time.

**Expect:** Both edits survive and are visible on both devices — validates that per-record write ordering (already correct since `0.7.2`, per `DESIGN_V1.md` §2.1) still holds under real offline/reconnect conditions, not just in theory.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test D — Concurrent edits, same record, different fields (validates §2.2's fix directly)

Both accounts go offline. Both edit **different fields of the exact same item** (e.g. A changes the title, B changes the notes), both reconnect.

**Expect:** **Both field changes survive on both devices** — this is the specific silent-loss bug `0.7.3` fixes. Before this candidate, A's reconnect-time write would have carried A's stale copy of B's field and silently reverted it.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test E — Concurrent edits, same record, same field (expected last-write-wins, not a defect)

Both accounts go offline. Both edit the **same field of the same item** with different values, both reconnect.

**Expect:** No crash, no data corruption. One value wins (last-write-wins, by design — no automatic merge is meaningful for two different values in the same field). **This is an expected, non-blocking result, not a defect** — the only thing that would actually be a defect here is the two devices converging to *different* final values instead of the same one.

**Result:** ☐ PASS / ☐ FAIL — notes (record which value won, and confirm both devices show the SAME final value):

## Test F — Reload while offline with pending edits (validates `0.7.2.1`'s fix directly)

Account A goes offline, makes **two or more edits in sequence** (don't wait between them), then closes and reopens the app/tab **while still offline**, then reconnects.

**Expect:** All edits survive the offline reload and reach Account B after reconnecting. `0.7.2.1` already fixed and closed this specific bug in Production (`docs/versions/V7/0.7.2.1/EXECUTABLE_TEST_SESSION_V1.md`, GO 2026-09-15) — this test re-confirms it holds under this candidate's own build, since `0.7.3` builds directly on top of that same `save()` fix rather than reimplementing it.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test G — Open form survives a concurrent remote update (validates §2.3's fix directly)

Account A opens an edit form (e.g. editing an Item's fields) and **types into a field without submitting**. While that form is still open, Account B makes an unrelated edit that syncs to A.

**Expect:** Account A's in-progress, unsubmitted form is **not** wiped — either the incoming update is visibly deferred until A closes the form, or some other explicit behavior occurs, but never silent loss of what A was typing.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Sync status visibility check

Confirm the minimal pending-sync indicator (extending the existing offline banner) actually reflects true state through the tests above — in particular, that it shows a pending-sync signal during Test B/F's offline window (once back online with a backlog) and clears once reconnection completes.

**Expect:** The indicator is not just present, but accurate — no false "everything synced" while a write is still pending, no indicator stuck on after everything has actually synced.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|

## GO/NO-GO decision

*To be recorded by the Product Owner after this session.*
