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

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test B — Offline edit, single device, then reconnect

Account A goes offline (airplane mode), edits an item. Confirm Account B (online) does **not** see the change yet. Account A reconnects. Confirm B then sees the change, within a similar window to Test A.

**Expect:** The edit is invisible to B while A is offline, then arrives correctly once A reconnects.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test C — Concurrent edits, different records

Both accounts go offline, each edits a *different* item, both reconnect around the same time.

**Expect:** Both edits survive and are visible on both devices — validates that per-record write ordering (already correct since `0.7.2`, per `DESIGN_V1.md` §2.1) still holds under real offline/reconnect conditions, not just in theory.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes. (Tested by the Product Owner without computer access; recorded in-session and written to the repo once reconnected.)

## Test D — Concurrent edits, same record, different fields (validates §2.2's fix directly)

Both accounts go offline. Both edit **different fields of the exact same item** (e.g. A changes the title, B changes the notes), both reconnect.

**Expect:** **Both field changes survive on both devices** — this is the specific silent-loss bug `0.7.3` fixes. Before this candidate, A's reconnect-time write would have carried A's stale copy of B's field and silently reverted it.

**Result:** ☑ PASS — notes: Confirmed as expected — both field changes survived on both devices. (Tested by the Product Owner without computer access; recorded in-session and written to the repo once reconnected.)

## Test E — Concurrent edits, same record, same field (expected last-write-wins, not a defect)

Both accounts go offline. Both edit the **same field of the same item** with different values, both reconnect.

**Expect:** No crash, no data corruption. One value wins (last-write-wins, by design — no automatic merge is meaningful for two different values in the same field). **This is an expected, non-blocking result, not a defect** — the only thing that would actually be a defect here is the two devices converging to *different* final values instead of the same one.

**Result:** ☑ PASS — notes: No crash, no data corruption — one value won (last-write-wins) and both devices converged to the same final value. Which value won was not specifically recorded. (Tested by the Product Owner without computer access; recorded in-session and written to the repo once reconnected.)

## Test F — Reload while offline with pending edits (validates `0.7.2.1`'s fix directly)

Account A goes offline, makes **two or more edits in sequence** (don't wait between them), then closes and reopens the app/tab **while still offline**, then reconnects.

**Expect:** All edits survive the offline reload and reach Account B after reconnecting. `0.7.2.1` already fixed and closed this specific bug in Production (`docs/versions/V7/0.7.2.1/EXECUTABLE_TEST_SESSION_V1.md`, GO 2026-09-15) — this test re-confirms it holds under this candidate's own build, since `0.7.3` builds directly on top of that same `save()` fix rather than reimplementing it.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test G — Open form survives a concurrent remote update (validates §2.3's fix directly)

Account A opens an edit form (e.g. editing an Item's fields) and **types into a field without submitting**. While that form is still open, Account B makes an unrelated edit that syncs to A.

**Expect:** Account A's in-progress, unsubmitted form is **not** wiped — either the incoming update is visibly deferred until A closes the form, or some other explicit behavior occurs, but never silent loss of what A was typing.

**Result:** ☑ PASS — notes: "Pass, I have updated the same item (other field) and it was updated once saved in user A" (Product Owner's own words) — Account B's edit to a different field of the same item was correctly merged in once Account A saved their own open form; no silent loss of either side's change. (Tested by the Product Owner without computer access; recorded in-session and written to the repo once reconnected.)

## Sync status visibility check

Confirm the minimal pending-sync indicator (extending the existing offline banner) actually reflects true state through the tests above — in particular, that it shows a pending-sync signal during Test B/F's offline window (once back online with a backlog) and clears once reconnection completes.

**Expect:** The indicator is not just present, but accurate — no false "everything synced" while a write is still pending, no indicator stuck on after everything has actually synced.

**Result:** ☑ PASS — notes: Confirmed via screenshot evidence provided by the Product Owner — the offline banner ("מצב אופליין — המידע המקומי זמין") displays correctly while offline, with the QA Test Trip's Hotel item (Panvaree Resort) still visible/available from local cache. Evidence submitted as confirmation for this check specifically, per the Product Owner ("Evidance for the sync status indication").

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Flight item location: editing the location updates the displayed address text correctly, but the item's map link stays stale — it continues pointing at the original location, not the edited one. Confirmed Flight-specific: the same edit-location flow works correctly on Hotel items, so this is isolated to Flight's own handling, not a shared location-component bug. | Pre-existing (found live by Product Owner, not part of this session's own tests A–G) | Medium-high (6/10, Product Owner's own rating) | Reported by Product Owner 2026-09-15. Build observed on: `0.7.2.1-19ff2b6b`. **Scoped to correction `0.7.3.1`** — Product Owner decision, 2026-09-20. Not yet triaged by the Development Agent — needs root-cause first. |
| Minor display bug: a source/attachment row's "מנתח..." (analyzing...) label stays visible long after the analysis itself has actually finished — screenshot shows multiple rows stuck showing "מנתח..." rather than settling into a final state (e.g. alongside rows already showing "בניתוח" done or a specific result). | Pre-existing (found live by Product Owner, not part of this session's own tests A–G) | Minor (cosmetic/display only, no functional or data-loss impact — Product Owner's own characterization) | Reported by Product Owner 2026-09-17, with screenshot evidence. **Scoped to correction `0.7.3.1`** — Product Owner decision, 2026-09-20. Not yet triaged by the Development Agent. |
| Minor display bug: on app entry or page refresh, an empty "new trip" state flashes briefly (roughly the first second) before the actual Trip data finishes loading in. | Pre-existing (found live by Product Owner, not part of this session's own tests A–G) | Minor (cosmetic/timing only, no data-loss impact — Product Owner's own characterization) | Reported by Product Owner 2026-09-17. **Scoped to correction `0.7.3.1`** — Product Owner decision, 2026-09-20. Not yet triaged by the Development Agent. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-20. All tests (A–G) plus the Sync status visibility check PASS. `0.7.3` may proceed to Production promotion as a separate, explicit action. The three pre-existing findings above are non-blocking and are carried forward for a future fix, per the suggested target version below.

**Fix version for the findings — decided.** Product Owner (Eyal) confirmed 2026-09-20: all three findings are scoped to a narrow correction package, `0.7.3.1`, mirroring how `0.7.2.1` was scoped. Grouping within that correction:
- Flight location-link stale-map-link bug (medium-high, 6/10) — the one item here with real functional impact; worth root-causing first since it may share code with other item types even though Hotel tested clean.
- Stuck "מנתח..." label (minor/cosmetic) — bundle in if it's a quick fix once triaged; otherwise fine to split off without blocking the other two.
- Empty-trip flash on load (minor/cosmetic) — same treatment as above.

Next step: hand this off to the Development Agent for triage/root-cause under a `0.7.3.1` correction kickoff, the same way `0.7.2.1`'s kickoff was authored.

## Production promotion

**`0.7.3` is live in Production**, confirmed 2026-09-20. Build `0.7.3-791b640c`, deploy `6aafd840cea964c83e644896`, verified via a fresh cache-bypassed fetch as byte-identical to the accepted `qa` build (0 new files uploaded). Rollback backup preserved at `production-promotion-backup-20260920-155614/` (prior state: `0.7.2.1-19ff2b6b`, deploy `6aa98f6ebdad7a22ba042864`) — low-risk rollback path, since this promotion changed no data model or security rules, only client write/render logic. Five commits landed: the acceptance-session GO ([1c107d6](https://github.com/eyalby-ux/family-trips/commit/1c107d6)) and the promotion itself ([815fe50](https://github.com/eyalby-ux/family-trips/commit/815fe50)), on top of the prior round's implementation.

The sync engine, field-level merge writes, open-form protection, and pending-sync indicator are all now live for real users. The three non-blocking findings above remain unscoped to a version pending the Product Owner's decision on the suggested `0.7.3.1` framing (or an alternative).
