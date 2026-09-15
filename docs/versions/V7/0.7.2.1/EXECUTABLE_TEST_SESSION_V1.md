# Family Trips Alpha 0.7.2.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.2.1` (correction: `save()`'s diff-computation/commit decoupling, preventing silent loss of offline edits after the first — see `docs/versions/V7/0.7.2.1/../` correction kickoff, `PROMPT_FOR_CLAUDE_CODE_0_7_2_1_CORRECTION_V1.md`), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.2.1-19ff2b6b`, deploy `6aa98a71f7cb881277b5aa55`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**Scope note — deliberately single-device.** This correction's own kickoff names the tradeoff explicitly: full two-device offline validation is the job of `0.7.3`'s own Test F (per `docs/versions/V7/0.7.3/DESIGN_V1.md` §5), not this session. This session verifies the specific bug and fix on one device/account only.

**The bug being fixed:** `save()` chained each write's entire async operation — including the unresolved `batch.commit()` — behind a single `.then()`. While offline, only the *first* queued `save()` call ever reached `commit()` and got journaled into Firestore's durable, IndexedDB-backed mutation queue. Every subsequent offline edit sat waiting behind that pending Promise and never reached its own `commit()` at all. If the app was closed or reloaded while offline with more than one edit made, everything after the first edit existed only in memory and was silently lost.

**Verification gap, stated honestly by the Development Agent:** no Firestore emulator is available in that environment, so its own regression test exercises the fixed control-flow shape and a mocked failure scenario, not genuine offline persistence against the real SDK. This live session is what actually verifies the fix against real offline behavior.

## Test 1 — Normal online save is unaffected (regression)

While online (not airplane mode), make an edit to any item in the current Trip (e.g. toggle a packing item, edit a task's title). Confirm it saves normally — no errors, no unexpected delay, and the change is reflected correctly after a page reload.

**Expect:** Online save behaves exactly as before this correction — this fix only changes internal sequencing for offline-queued writes, not the online save path.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Multiple sequential offline edits are all preserved (the actual bug scenario)

Put the device in airplane mode. Make **at least three separate edits** in quick succession (e.g. toggle three different packing items, or edit three different task titles) — don't wait for any save indicator between them. While still offline, reload the app (or close and reopen it). Confirm **all** the edits you made are still present, not just the first one.

Then reconnect to the network and confirm all edits sync through to the server (e.g. by checking on another device/browser, or Firestore Console, or simply that no error/conflict appears).

**Expect:** Every offline edit is preserved and eventually synced — none are silently lost, regardless of how many were made in sequence before the previous one's server acknowledgment came back.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes. All offline edits preserved after reload, and synced correctly on reconnect.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-15. Both tests PASS: normal online save unaffected, and the actual bug scenario (multiple offline edits made in sequence) confirmed fixed — all edits preserved through an offline reload and synced correctly on reconnect. `0.7.2.1` may proceed to Production promotion as a separate, explicit action. Two-device offline validation remains deliberately deferred to `0.7.3`'s own Test F, per this correction's stated scope.
