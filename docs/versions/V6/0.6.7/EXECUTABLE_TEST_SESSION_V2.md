# Family Trips Alpha 0.6.7.1 — Executable Acceptance Test Session (Round 2)

**Document revision:** `V2`
**Candidate:** `0.6.7.1` (correction package for `0.6.7`'s `V6-F75`–`V6-F81`), installed on `version/V6`, deployed to the fixed `qa` alias (build `0.6.7.1-8e41a683`)
**Session number:** `V2`, continuing the per-candidate session sequence opened for `0.6.7` (`EXECUTABLE_TEST_SESSION_V1.md`'s own session number `V1`) — see that document's `V2` change-history row for why this sequence restarted per-candidate rather than continuing the older global cross-candidate numbering (`V124`/`V169`/`V184`).
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V54.md`.

**Honest scope note on this document:** the Development Agent received this session's outcome as a summary from the Product Owner (result totals, which findings were confirmed fixed, and full detail on the three newly-registered findings `V6-F83`–`V6-F85`), together with the governing `0.6.7.2` correction prompt — not the complete per-test observed-notes write-up in the same form `EXECUTABLE_TEST_SESSION_V1.md`'s `V2` revision received for Round 1. Rather than fabricate observed notes for tests not individually detailed to the Development Agent, this document records exactly what was verified (the three failing tests' full detail, and the aggregate PASS/FAIL/confirmed-fixed counts) and marks the rest honestly. The complete, authoritative Round 2 write-up lives in the Product Owner's own planning/QA chat and Projects knowledge base; if a fully detailed version of this document (matching `EXECUTABLE_TEST_SESSION_V1.md`'s `V2` level of per-test completeness) is wanted for the permanent record, the Product Owner can supply the full write-up for a further revision of this file.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V2 | 2026-09-10 | Session completed by the Product Owner against build `0.6.7.1-8e41a683` on `qa`. Result: **11/14 PASS, 3 FAIL. NO-GO.** Five of the seven findings closed by `0.6.7.1` are confirmed fixed on retest: `V6-F75`, `V6-F76`, `V6-F77`, `V6-F78`, `V6-F81`. Three new findings registered: `V6-F83` (Test 3, Medium — website field extraction non-deterministic, 1-of-4 runs), `V6-F84` (Test 4, Minor — provider polluted with the "SMART TRAVEL" plan name), `V6-F85` (Test 6, High/blocking — `.tif` upload now succeeds per the `V6-F78` fix, but the extraction backend rejects the raw TIFF format one layer deeper, defeating the mandatory wild-card test a second time). One more documentation correction found (`INS-004`/Wobi mix-up, not a code finding). Full detail in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s `0.6.7.2` entry. A second focused correction package, `0.6.7.2`, is now implemented; a new, complete run of this same session against the `0.6.7.2` build is required before GO/NO-GO is reconsidered. |
| V1 | 2026-09-09 | Initial session drafted by the Development Agent for the `0.6.7.1` candidate, 14 tests, all results blank pending the Product Owner's run. |

---

## Session result summary

**Result: NO-GO**, decided by the Product Owner. `V6-F85` (Test 6, the mandatory `INS-006` wild-card) is a hard blocker, a second consecutive failure of the same mandatory test: the `V6-F78` fix (`0.6.7.1`) correctly resolved the upload-time rejection, but the extraction backend itself rejects the raw TIFF format one layer deeper (`400 The image data you provided does not represent a valid image... supported image formats: jpeg, png, gif, webp`), so the wild-card test still cannot complete end-to-end. Real progress: five of the seven `0.6.7.1` findings are confirmed fixed on retest (`V6-F75`–`V6-F78`, `V6-F81`). Two more findings were found (`V6-F83`, `V6-F84`), both non-blocking. `0.6.7.1` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

---

## Individually detailed results (full observed notes available to the Development Agent)

### Test 3 — `INS-003_PassportCard.pdf`

**Result:** ☑ FAIL — `V6-F81` (the provider brand+legal-entity combination) confirmed fixed on retest. New finding: running the same source through Smart Import four separate times, the `website` field was correctly populated in only 1 of the 4 runs, the other 3 leaving it empty despite the source containing the same extractable website value each time — a live-model extraction-consistency issue, not an adapter/mapping bug (`V6-F83`, Medium).

### Test 4 — `INS-004_Phoenix.pdf`

**Result:** ☑ FAIL — `V6-F76` (website in notes instead of the structured field) confirmed fixed on retest. New finding: the `V6-F75`/`V6-F81` brand+legal-entity combination fix over-fired here, resolving provider to "הפניקס / SMART TRAVEL" ("Phoenix / SMART TRAVEL") — "SMART TRAVEL" is a plan/product-edition name under Phoenix, not a second company/brand identity, and should never have been combined into provider the way a genuine second entity name is (`V6-F84`, Minor — the Product Owner's own severity call, since Phoenix's core provider identity is still present and correct, just polluted with extra text).

### Test 6 — `INS-006_TorenInsurance.tif` (MANDATORY WILD-CARD)

**Result:** ☑ FAIL — BLOCKING, a second consecutive failure of the same mandatory test. The `V6-F78` fix correctly resolved the client/server upload-validation allowlist gap: `.tif` now passes upload on both entry points with no client-side alert. But the file still fails one step later, during actual extraction, with `400 The image data you provided does not represent a valid image. Please check your input and try again with one of the supported image formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']` — the raw TIFF bytes were being passed directly to the vision/extraction API, which does not accept TIFF natively (`V6-F85`, High/blocking).

## Aggregate results (per the Product Owner's own summary; individual observed notes not separately transcribed to the Development Agent for these)

**Result:** 11 of 14 tests PASS overall, matching the 3 FAILs individually detailed above (Tests 3, 4, 6) and confirming Tests 1, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14 all PASS on this candidate, including re-confirmation of `V6-F77` (Test 2, the pre-save proposal-form website field) and `V6-F78` (Test 6's upload layer specifically, as distinct from `V6-F85`'s deeper extraction-layer failure on the same test).

## Documentation correction found this session — not a code finding

- `INS-004` (Phoenix): the discovery document's `V1`–`V4` catalogue entry claiming this document was "sold via agent Wobi Insurance Agencies Ltd." is incorrect — the `INS-004` source document contains no mention of Wobi at all (confirmed by the Development Agent by direct inspection of the real fixture PDF's text). Wobi belongs only to `INS-005`, a separate document; this was a cross-document mix-up during the original cataloguing. Corrected in `INSURANCE_SMART_IMPORT_DISCOVERY.md`, `V5`.

## GO/NO-GO decision

**NO-GO**, decided by the Product Owner. `V6-F85` (Test 6, the mandatory wild-card, a second consecutive failure of the same test) is a hard blocker. Two additional non-blocking findings (`V6-F83`, `V6-F84`) were also found. `0.6.7.1` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

**Next step:** the second focused correction package, `0.6.7.2`, scoped to `V6-F83`–`V6-F85` plus the `INS-004`/Wobi documentation correction, is implemented (`version/V6` — see `MVP_DELIVERY_PLAN_CURRENT_STATE.md` for the exact commit SHA once recorded). A new, complete acceptance session against the `0.6.7.2` build is required before any GO decision is reconsidered.

**Follow-up:** that Round 3 session ran against build `0.6.7.2-6eb553d3` and is recorded in `EXECUTABLE_TEST_SESSION_V3.md` (this session's own per-candidate sequence, session number `V3`) — result 13/14 PASS, 1 FAIL, NO-GO, leading to the `0.6.7.3` correction package.
