# V5 Release Checklist — Alpha 0.5.6

**Document revision:** `V8`

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V1 | 2026-08-03 | Alpha 0.5.0 implementation | Initial install, quality, deployment and acceptance checklist. |
| V2 | 2026-08-03 | Alpha 0.5.0 installer correction | Added the supported local 0.4.4 NO-GO handoff path and retained replacement and non-promotion safeguards. |
| V3 | 2026-08-04 | Alpha 0.5.1 correction package | Added focused correction, QA-deployment and open-finding retest gates. |
| V4 | 2026-08-06 | Alpha 0.5.2 correction package | Added QA-chat reconciliation, the eight-repair implementation/verification gates, Alpha 0.6 exclusions and the explicit V5-W01 target-decision blocker. |
| V5 | 2026-08-07 | Alpha 0.5.2 COOP correction | Recorded Product Owner assignment of `V5-W01` to 0.5.2, implementation of the Netlify header and the remaining fixed-QA response-header, sign-in and Console gate. |
| V6 | 2026-08-11 | Alpha 0.5.4 stabilization | Recorded implementation, automated/package gates and pending installation/fixed-QA acceptance for the frozen 0.5.4 scope. |
| V7 | 2026-08-12 | Alpha 0.5.5 intake reset | Recorded final 0.5.4 NO-GO handoff, completed 0.5.5 implementation/build gates, focused source-menu/PDF/Cancel/archive acceptance and the rule that Alpha 0.6 Smart Import work begins only after 0.5.5 GO and discovery decisions. |
| V8 | 2026-08-12 | Alpha 0.5.6 range-boundary correction | Recorded final 0.5.5 NO-GO handoff, single-blocker implementation, preserved evidence, focused boundary test matrix, exact no-build QA deployment requirement and the explicit GO gate before Production or Alpha 0.6. |

## Alpha 0.5.6 checklist

- [x] Alpha 0.5.5 is recognized as the QA-only final NO-GO handoff; Alpha 0.4.3 remains Production.
- [x] `V5-F27` is the only product correction included.
- [x] One shared predicate evaluates both start and end for warning and persisted marking.
- [x] Focused automated tests cover end-after, start-before, both-inside and excluded schedules.
- [x] All accepted 0.5.5 suites remain in the regression gate without product-scope changes.
- [x] No Alpha 0.6/0.7 implementation is included.
- [x] Full clean quality gate and Production build pass: eleven suites and 33 transformed modules.
- [x] Dependency audit reports zero vulnerabilities.
- [x] Package layout and all 57 SHA-256 entries pass.
- [ ] Product Owner installation passes from installed 0.5.5.
- [ ] Untouched tested `dist` is deployed with `netlify deploy --dir dist --alias qa --no-build` and output retained.
- [ ] Focused `EXECUTABLE_TEST_SESSION_V112.md` boundary acceptance passes.
- [ ] Product Owner issues explicit GO before Production promotion or Alpha 0.6 work.

## Historical Alpha 0.5.5 checklist

- [x] Alpha 0.5.4 is recognized as the QA-only final NO-GO handoff; Alpha 0.4.3 remains Production.
- [x] Source menu exposes Manual, Experimental PDF, JSON and QR only.
- [x] New-item URL, image and camera-photo paths are absent; defensive invocation creates nothing.
- [x] Manual and QR/JSON item-owned URL paths remain implemented.
- [x] PDF is PDF-only, clearly experimental, source-preserving, proposal-only and has no Trip-date default.
- [x] Out-of-range Cancel resets the open existing-item editor from persisted data.
- [x] Rejected archive appears after active content, Sources and Add.
- [x] No Alpha 0.6/0.7 feature implementation is included.
- [x] Dependency audit reports zero vulnerabilities.
- [x] Full automated gate and Production build pass.
- [x] Installer verifies checksums, backs up, installs, tests and automatically rolls back on failure.
- [x] Standalone rollback and package-layout/SHA-256 verification are included.
- [ ] Product Owner installation passes.
- [ ] Exact tested `dist` is deployed to fixed QA with `--no-build`.
- [ ] Focused V87 acceptance and compact regression pass.
- [ ] Product Owner issues GO before Production promotion or Alpha 0.6 discovery/implementation.

## Historical Alpha 0.5.2 checklist

- [x] Accepted Production baseline is 0.4.3.
- [x] Installer also recognizes the local 0.4.4 NO-GO test handoff and replaces every runtime file changed by that candidate.
- [x] 0.4.4 remains excluded from acceptance and Production promotion.
- [x] Application version is 0.5.2.
- [x] Alpha 0.5.1 QA chat was reconciled against V15; no functional finding was omitted from the original eight-repair scope.
- [x] V4-F13, V5-F08, F13, F14, F15, F16, F17/F18 and V5-F11 wording corrections are implemented and automated.
- [x] Product Owner assigned `V5-W01` to Alpha 0.5.2; the exact `same-origin-allow-popups` Netlify header is implemented and asserted automatically.
- [x] V5-F06, F07, F10 and F12 passed Product Owner retest and remain regression-only.
- [x] V5-F09 is unchanged and remains assigned to Alpha 0.6.
- [x] Full approved Alpha 0.5.2 code and controlled documents are packaged after that decision.
- [x] Automated tests and production build pass.
- [x] Installer validates the V4 handoff, backs up, installs, checks and automatically restores on failure.
- [x] Standalone rollback is included.
- [x] SHA-256 inventory and package-layout test are included.
- [ ] Product Owner installation passes.
- [ ] Alpha 0.5.2 is deployed to `qa--familytripz.netlify.app` and smoke checks pass.
- [ ] Fixed-QA responses contain the approved COOP header; Google popup sign-in succeeds and the earlier warning is absent from the Console.
- [ ] Corrected findings pass Product Owner retest and only then move to verified/closed.
- [ ] Executable installed-device acceptance completes.
- [ ] Product Owner issues final GO / NO-GO.
- [ ] Production promotion occurs only after GO.
