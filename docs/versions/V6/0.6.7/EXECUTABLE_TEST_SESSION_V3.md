# Family Trips Alpha 0.6.7.2 — Executable Acceptance Test Session (Round 3)

**Document revision:** `V2`
**Candidate:** `0.6.7.2` (second correction package for `0.6.7.1`'s `V6-F83`–`V6-F85`), installed on `version/V6`, deployed to the fixed `qa` alias (build `0.6.7.2-6eb553d3`)
**Session number:** `V3`, continuing the per-candidate session sequence opened for `0.6.7` (`EXECUTABLE_TEST_SESSION_V1.md` session `V1`, `EXECUTABLE_TEST_SESSION_V2.md` session `V2`).
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V43.md`.

**Honest scope note on this document:** as with `EXECUTABLE_TEST_SESSION_V2.md`, the Development Agent received this session's outcome as a summary from the Product Owner (result totals and full detail on the one failing test's two findings), not the complete per-test observed-notes write-up. This document records exactly what was verified — Test 6's full detail, and the aggregate PASS/FAIL counts — and marks the rest honestly rather than fabricating notes for tests not individually detailed to the Development Agent.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V2 | 2026-09-10 | Session completed by the Product Owner against build `0.6.7.2-6eb553d3` on `qa`. Result: **13/14 PASS, 1 FAIL. NO-GO.** The closest this candidate has come to a clean session. `V6-F84` and `V6-F85` both confirmed **Fixed** on retest; `V6-F83` meaningfully improved (not separately re-registered as still-failing). Test 6 (the mandatory `INS-006` wild-card) failed for a third consecutive round, each time one layer deeper: `V6-F78` (upload rejected) → `V6-F85` (extraction backend rejected the format) → now `V6-F86` (extraction succeeds, but returns a completely wrong, unrelated company with no honesty flag) plus `V6-F87` (the `.tif` attachment downloads instead of previewing inline). Full detail in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s finding register. A third focused correction package, `0.6.7.3`, is now implemented; a new acceptance session against the `0.6.7.3` build is required before GO/NO-GO is reconsidered — the Product Owner's own correction prompt suggested this next session could reasonably be scoped to Test 6 plus adjacent regression spot-checks, given how narrow the remaining gap is, but asked for that scoping to be confirmed rather than assumed (see this package's own report for that question). |
| V1 | 2026-09-10 | Initial session drafted by the Development Agent for the `0.6.7.2` candidate, 14 tests, all results blank pending the Product Owner's run. |

---

## Session result summary

**Result: NO-GO**, decided by the Product Owner. 13/14 PASS — the closest result this candidate has produced across three rounds. The one failure, Test 6 (the mandatory `INS-006` wild-card), carries two findings: `V6-F86` (High/blocking — provider resolves to a completely wrong, unrelated company, no honesty flag) and `V6-F87` (High — the `.tif` attachment downloads instead of previewing inline). `0.6.7.2` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

---

## Individually detailed result (full observed notes available to the Development Agent)

### Test 6 — `INS-006_TorenInsurance.tif` (MANDATORY WILD-CARD)

**Result:** ☑ FAIL — third consecutive round this mandatory test has failed, each time one layer deeper. Policy number `220008858030`, policyholder Eyal Ben-Yitzhak (ID `043119213`, DOB `19/05/1981`), coverage dates `31/03/2010`–`03/04/2010`, premium, coverage scope and health declaration all correctly extracted from the converted image — `V6-F85` confirmed **Fixed**. But `provider` resolved to "Harel Insurance Company Ltd." — a completely different, unrelated insurance company that appears nowhere in this document. The source's own header states "ביטוח נסיעות לחו"ל - כלל חברה לביטוח בע"מ" ("Travel insurance abroad - Clal Insurance Company Ltd."); Clal is the underwriting insurer, Toren (the letterhead's own agency name) is the selling agent. No `needs_review` flag was raised despite this being a completely wrong value on a Decision-4 no-omission field (`V6-F86`, High/blocking). Separately: opening the item's attached `.tif` file downloads it instead of displaying it inline, unlike every other supported file type (`V6-F87`, High).

## Aggregate result (per the Product Owner's own summary; individual observed notes not separately transcribed to the Development Agent for these)

**Result:** 13 of 14 tests PASS overall, matching the 1 FAIL individually detailed above (Test 6) and confirming Tests 1–5, 7–14 all PASS on this candidate, including re-confirmation of `V6-F84` (Test 4, the Phoenix/SMART TRAVEL provider pollution) and `V6-F85` (Test 6's TIFF extraction layer specifically, as distinct from `V6-F86`'s deeper provider-identity failure on the same test) both closed, and `V6-F83` (Test 3, website non-determinism) meaningfully improved.

## GO/NO-GO decision

**NO-GO**, decided by the Product Owner. `V6-F86` (Test 6, the mandatory wild-card, a third consecutive failure of the same mandatory test, each time one layer deeper) is a hard blocker. `V6-F87`, found on the same test, is non-blocking but High severity. `0.6.7.2` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

**Next step:** the third focused correction package, `0.6.7.3`, scoped to `V6-F86`–`V6-F87`, is implemented (`version/V6` — see `MVP_DELIVERY_PLAN_CURRENT_STATE.md` for the exact commit SHA once recorded). A new acceptance session against the `0.6.7.3` build is required before any GO decision is reconsidered — the correction prompt raised the possibility of scoping that next session to Test 6 plus adjacent regression spot-checks rather than a full 14-test re-run, given how narrow the remaining gap is, but asked for that to be confirmed with the Product Owner rather than assumed.

**Follow-up:** that Round 4 session ran against build `0.6.7.3-54419015`, scoped to Test 6 plus three adjacent regression spot-checks as confirmed, and is recorded in `EXECUTABLE_TEST_SESSION_V4.md` (session number `V4`) — both `V6-F86` and `V6-F87` failed identically to before the `0.6.7.3` fix, despite that correction's own report claiming both fixed. NO-GO, leading to the `0.6.7.4` correction package, which treats the reported-fix/live-behavior disconnect as its own investigation, not just a re-fix.
