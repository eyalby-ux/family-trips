# V5 Test Results — Alpha 0.5.6

**Document revision:** `V8`  
**Status:** Alpha 0.5.6 syntax checks, eleven ordered automated suites, zero-vulnerability audit and Production build PASS; Product Owner installation, exact fixed-QA deployment and focused acceptance remain open

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V1 | 2026-08-03 | Alpha 0.5.0 implementation | Recorded pre-delivery automated evidence and pending real-device tests. |
| V2 | 2026-08-03 | Alpha 0.5.0 installer correction | Recorded the initial prerequisite failure and the corrected R2 handoff guard; Product Owner installation remains pending. |
| V3 | 2026-08-04 | Alpha 0.5.1 correction package | Recorded automated coverage for the six approved correction areas and preserved all Product Owner findings as open pending deployed retest. |
| V4 | 2026-08-06 | Alpha 0.5.2 correction package | Recorded the QA-chat reconciliation, focused repair tests, full syntax/regression/build PASS and remaining installed-device gates; kept every affected finding open. |
| V5 | 2026-08-07 | Alpha 0.5.2 COOP correction | Recorded Product Owner assignment of `V5-W01` to 0.5.2, exact Netlify-header automated coverage and the remaining fixed-QA sign-in/Console verification gate. |
| V6 | 2026-08-11 | Alpha 0.5.4 stabilization | Recorded syntax, full regression, stabilization, dependency-audit and Production-build PASS for the frozen 0.5.4 scope; kept all installed-device findings open. |
| V7 | 2026-08-12 | Alpha 0.5.5 intake reset | Recorded the complete intake-boundary, experimental-PDF, Cancel reset and archive-placement automated coverage, preserved V4/V5/QR/Offline/operational regressions, zero-vulnerability audit and Production build; kept Product Owner V87 gates open. |
| V8 | 2026-08-12 | Alpha 0.5.6 range-boundary correction | Added unit coverage for both item boundaries, asserted one shared predicate for confirmation and persisted marking, preserved every existing suite and kept V5-F27 open for V112 Product Owner retest. |

## Alpha 0.5.6 focused automated evidence

| Area | Result | Evidence |
|---|---|---|
| `V5-F27` interval semantics | PASS automated | End-after/start-inside and start-before/end-inside return outside; both-inside returns inside. |
| Shared application predicate | PASS static | Persisted marker and pre-save confirmation both call `isItemOutsideTrip`. |
| Schedule boundaries | PASS automated | Single-date outside is detected; `entire`, `none` and missing Trip boundaries do not create a conflict. |
| Preserved 0.5.5 behavior | PASS regression | Intake-reset, correction, Offline, stabilization, QR/import and operational suites remain in the ordered gate. |
| Dependency audit | PASS | `npm audit --audit-level=low` reports zero vulnerabilities. |
| Production build | PASS | Vite 7.3.6 transformed 33 modules and completed the Alpha 0.5.6 build in 1.67 seconds. |
| Package verification | PASS | Controlled-file layout passed and all 57 SHA-256 inventory entries verified. |
| Product Owner verification | OPEN | `V5-F27` remains open until V112 fixed-QA retest and explicit GO. |

## Preserved Alpha 0.5.5 automated evidence

| Area | Result | Evidence |
|---|---|---|
| Syntax and full regression | PASS | All application/service-worker modules and every V4/V5 suite, including the new 0.5.5 intake-reset suite, passed. |
| Reliable source menu | PASS automated | Manual, Experimental PDF, JSON and QR are present; URL/image/photo choices are absent and defensive handlers persist nothing. |
| Manual and QR/JSON URL ownership | PASS regression | Existing item editor and validated external-import proposal retain the item-owned website field; final Link type remains prohibited. |
| Experimental PDF safety | PASS automated | PDF-only validation, visible experimental state, original-source-first flow, proposal review, warnings and no Trip-date default are asserted. |
| V5-F21 | PASS automated | Out-of-range Cancel on an existing-item edit re-renders the persisted item before returning control. |
| Archive placement | PASS automated | Active suggestions and ordinary content/actions precede the persistent rejected archive. |
| Cold-start Offline and proposal lifecycle | PASS regression | 0.5.5 cache identity and all previously accepted stabilization invariants remain asserted. |
| Dependency audit | PASS | `npm audit` reports zero vulnerabilities. |
| Production build | PASS | Vite 7.3.6 transformed 33 modules and emitted the Alpha 0.5.5 Production bundle in 1.97 seconds. |

Automated evidence does not close installed-device behavior. Execute `EXECUTABLE_TEST_SESSION_V112.md` after installation and exact fixed-QA deployment.

## Automated evidence

| Area | Result | Evidence |
|---|---|---|
| Syntax | PASS | All changed application and service-worker modules passed `node --check`. |
| V4 regression | PASS | Smoke, V4 ingestion and corrected dynamic-field/navigation tests passed. |
| V4-F04 | PASS automated | Undated eligible item receives Trip start date; explicit dates and no-date items remain unchanged. |
| V4-F11 | PASS automated | `YITZHAK` and `SCREENSHOT` stay out of booking number; Agoda ID stays out of phone; multi-segment flights split. |
| V4-F12 | PASS automated | JSON, single QR, multipart reverse-order/repeated part, checksum rejection and proposal-only import passed. |
| V4-F13 | PASS automated | Scope-aware shell cache and offline local-session path are present. |
| Operational data | PASS | Today, Timeline mode derivation, packing duplicate detection, tasks/games/shopping/location state tests passed. |
| Production build | PASS | Vite build completed with 32 transformed modules. |
| Installer handoff guard | PASS package verification | R2 accepts 0.4.3 or the observed local 0.4.4 NO-GO state, then replaces the 0.4.4-modified runtime files with the V5 payload. |
| V5-F05/F06 | PASS automated | Identity markers, absence of stale V4 login text, required labels and `aria-required` markers are asserted. |
| V5-F07/F12 | PASS automated | Undefined/null candidates plus duplicate Flight/Insurance records produce a stable, ordered quick-access list without dereferencing absent records. |
| V5-F08 | PASS automated | No standalone Calendar nav/function remains; Timeline Calendar, Day activation and Week swipe markers are asserted. |
| V5-F10 | PASS automated | Earlier end moves to new start; equal/later end is preserved for date and datetime values. |
| V5-F11 | PASS automated | Both destructive scopes, current-Trip reset helper and local persistence removal path are asserted. |
| 0.5.2 identity | PASS automated | Login, page metadata, manifest, package version and Service Worker cache identify Alpha 0.5.2. |
| Cold-start offline correction | PASS automated | Navigation checks request/scope/index with ignore-search matching and returns the cached shell before background refresh. |
| `V5-F08` Trip-period focus | PASS automated | Entering Timeline resets mode to Entire Trip and cursor to Trip start; embedded Calendar/list and Week/Day controls remain asserted. |
| `V5-F13` Quick Access | PASS automated | Completed tasks are excluded; overdue, today, future and undated ordering is deterministic; future tasks fill the three-item window and `All tasks` is present when required. |
| `V5-F14` task editing | PASS automated | Task edit action, prefilled stable ID and update-versus-create branch are asserted. |
| `V5-F15` URL editing | PASS automated | Item editor forces URL visibility, update/clear uses the same item path and detail URL action is independent of location. |
| `V5-F16` proposal phone layout | PASS static regression | Proposal/modal width constraints and long-content wrapping markers are asserted. |
| `V5-F17/F18` shared link | PASS automated | Opaque `share.google` test remains Link with `Shared link` or supplied title and is not misclassified as Flight. |
| `V5-F11` wording | PASS automated | Unsupported other-Trips promise is absent while both destructive handlers remain. |
| `V5-W01` COOP configuration | PASS automated | Netlify application routes are configured with the exact `Cross-Origin-Opener-Policy = "same-origin-allow-popups"` value. |

Automated results do not prove installed PWA camera, gallery, offline cold start, telephone actions or map handoff. Those remain in the executable session.

## Product Owner installation evidence

| Attempt | Result | Evidence / disposition |
|---|---|---|
| R1 from local 0.4.4 | FAIL before mutation | Installer required exactly 0.4.3 and reported installed version 0.4.4. No V5 payload was copied. Corrected in R2. |
| R2 from local 0.4.4 | PASS | Previous Alpha 0.5.0 checkpoint installed and built successfully; retained as historical evidence. |
| Alpha 0.5.1 | PASS | Product Owner completed the focused pre-planning gate; V5-F06, F07, F10 and F12 passed, while the frozen 0.5.2 repairs remained open. |
| Alpha 0.5.2 | Pending Product Owner action | `V5-W01` is assigned to this version and the final package is ready for installation; no 0.5.2 finding is pre-closed. |

The 2026-08-07 local quality gate re-executed syntax checks, every V4/V5 automated suite and the Vite Production build after the COOP configuration change. All passed; Vite transformed 32 modules. Installed PWA cold start, mobile overflow, real shared-link metadata, Timeline gestures, user-facing task/URL flows and deployed COOP behavior remain Product Owner acceptance work in `EXECUTABLE_TEST_SESSION_V17.md`.
