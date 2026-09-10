# Family Trips Alpha 0.6.7.3 — Executable Acceptance Test Session (Round 4)

**Document revision:** `V2`
**Candidate:** `0.6.7.3` (third correction package for `0.6.7.2`'s `V6-F86`–`V6-F87`), installed on `version/V6`, deployed to the fixed `qa` alias (build `0.6.7.3-54419015`)
**Session number:** `V4`, continuing the per-candidate session sequence opened for `0.6.7` (`EXECUTABLE_TEST_SESSION_V1.md`–`V3.md`, sessions `V1`–`V3`).
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V42.md`.

**Scope note:** per the scoping decision confirmed with the Development Agent after Round 3 (given how narrow the gap had become), this session was scoped to Test 6 plus three adjacent regression spot-checks (`INS-002`, `INS-005`, `INS-004`), not a full 14-test re-run.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V2 | 2026-09-10 | Session completed by the Product Owner against build `0.6.7.3-54419015` on `qa`, scoped to Test 6 plus three adjacent regression spot-checks. Result: **NO-GO.** Test 6 failed identically to Round 3 on both `V6-F86` (provider still resolves to "הראל"/Harel, no `needs_review` flag) and `V6-F87` (`.tif` attachment still downloads silently, no explanatory message) — despite the `0.6.7.3` correction report having described both as `Fixed`, with 197/197 tests passing and a clean deploy. The three regression spot-checks (`INS-002`, `INS-005`, `INS-004`) all passed correctly, confirming this is not a broader regression — specifically these two fixes did not manifest in live, deployed behavior. A fourth focused correction package, `0.6.7.4`, was requested, explicitly split into two problems: (1) investigate why the `0.6.7.3` closure report did not match live reality, and (2) re-fix both findings with a strengthened closure bar — a passing test suite alone is not sufficient evidence of closure this round; each fix requires live-behavior verification before being reported fixed. See `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s finding register for the full investigation findings and what could and could not be verified from the Development Agent's environment. |
| V1 | 2026-09-10 | Initial session drafted by the Development Agent for the `0.6.7.3` candidate, scoped to Test 6 plus adjacent spot-checks per the confirmed scoping decision, results blank pending the Product Owner's run. |

---

## Session result summary

**Result: NO-GO**, decided by the Product Owner. Both `V6-F86` and `V6-F87` failed identically to their pre-`0.6.7.3` state, despite the `0.6.7.3` correction report claiming both fixed. This is treated as a distinct, more serious problem than a normal "fix didn't fully work" case: the report's claim of closure (197/197 tests, clean deploy) did not match live, deployed behavior at all. `0.6.7.3` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

---

## Individually detailed result (full observed notes available to the Development Agent)

### Test 6 — `INS-006_TorenInsurance.tif` (MANDATORY WILD-CARD)

**Result:** ☑ FAIL — identical to Round 3. `INS-006`'s `provider` still resolves to "הראל" (Harel Insurance Company Ltd.) — the exact same wrong value as before the `0.6.7.3` fix was reportedly applied — still with no `needs_review` flag (`V6-F86`, unchanged, fourth consecutive round). The attached `.tif` still downloads silently with no explanatory message, despite the `0.6.7.3` report describing `openSource` as updated to explain the download (`V6-F87`, unchanged, fourth consecutive round).

### Adjacent regression spot-checks

**Result:** ☑ PASS (all three) — `INS-002`, `INS-005` (both Harel-provider documents) and `INS-004` (Phoenix, the `V6-F84`/Wobi-mixup document) all extracted correctly, confirming the Test 6 failures are isolated to that test and not a broader regression introduced by the `0.6.7.3` prompt/code changes.

## GO/NO-GO decision

**NO-GO**, decided by the Product Owner. Both findings on Test 6 remain open, unchanged, for a fourth consecutive round. `0.6.7.3` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

**Next step:** a fourth focused correction package, `0.6.7.4`, addressing both the reported-fix/live-behavior disconnect (see `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s finding register for the full investigation) and a re-fix of both `V6-F86`/`V6-F87`, is implemented — but is explicitly **not** reported `Fixed` for either finding this round, per the strengthened closure bar this correction package itself introduced. See the Development Agent's own correction report for exactly what live-behavior verification was and was not possible from its environment, and what remains for the Product Owner (or another session with `qa` access) to confirm before either finding can be marked closed.

**Follow-up:** the Product Owner deployed `0.6.7.4` to `qa` and personally performed the live verification, recorded in `EXECUTABLE_TEST_SESSION_V5.md` (session number `V5`) — 14/14 PASS, GO. `0.6.7.4` promoted to Production the same day, closing this candidate's five-round correction cycle.
