# V5 Known Issues and Finding Register — Alpha 0.5.6

**Document revision:** `V8`  
**Status:** Alpha 0.5.5 acceptance complete / final NO-GO; Alpha 0.5.6 implements only `V5-F27` and awaits focused Product Owner verification

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V1 | 2026-08-03 | Alpha 0.5.0 implementation | Created the V5 register with inherited V4 findings and installed acceptance requirements. |
| V2 | 2026-08-03 | Alpha 0.5.0 installer correction | Recorded and corrected the installer rejection of the local 0.4.4 NO-GO handoff state. |
| V3 | 2026-08-04 | Alpha 0.5.1 correction package | Recorded implementation state and focused retest gates for V5-F05, F06, F07/F12, F08, F10 and F11; retained V5-F09 in Alpha 0.6. |
| V4 | 2026-08-06 | Alpha 0.5.2 correction package | Preserved verified Alpha 0.5.1 findings, recorded the eight focused repairs and their retest gates, assigned IDs V5-F15–F18 to previously unnamed QA findings, retained Alpha 0.6 deferrals and surfaced V5-W01 for explicit target assignment. |
| V5 | 2026-08-07 | Alpha 0.5.2 COOP correction | Assigned `V5-W01` to Alpha 0.5.2 by Product Owner decision, recorded the Netlify header implementation and automated assertion, and added fixed-QA response-header, sign-in and Console verification. |
| V6 | 2026-08-11 | Alpha 0.5.4 stabilization | Recorded implementation state and focused retest requirements for cold-start Offline, `V5-F17`, `V5-F23`, `V5-F24` and `V5-F25`; documented zero-vulnerability dependency disposition and retained `V5-W01` in Alpha 0.6 hardening. |
| V7 | 2026-08-12 | Alpha 0.5.5 intake reset | Recorded final 0.5.4 results, the approved removal of unsupported URL/image/photo creation paths, experimental-PDF safety contract, `V5-F21` immediate editor reset, archive placement, dedicated Alpha 0.6 Smart Import assignment and focused V87 retest gates. |
| V8 | 2026-08-12 | Alpha 0.5.6 range-boundary correction | Recorded final 0.5.5 NO-GO, retained all passed V111 evidence, implemented the shared start/end boundary predicate and limited V112 acceptance to `V5-F27`, exact artifact deployment and the smallest complementary boundary regression. |

## Current Alpha 0.5.6 register

| Finding | Implementation state | Acceptance target | Assignment |
|---|---|---|---|
| `V5-F27` — end outside while start inside | Shared interval predicate evaluates both `startAt` and `endAt` for warning and marker | End-after case marked before and after restart; start-before marked; both-inside unmarked; single record restored | Implemented in 0.5.6; OPEN pending V112 Product Owner retest |
| Exact tested artifact | Local quality gate creates one `dist` | Fixed-QA deploy uses `netlify deploy --dir dist --alias qa --no-build` and output is retained | Mandatory before 0.5.6 GO |
| Passed 0.5.5 evidence | Source boundary, manual/QR URL ownership, PDF safety, Cancel reset and archive placement all passed | No repetition; changed-surface smoke only | Preserved / do not reopen |

## Accepted Alpha 0.5.5 evidence

| Finding | Implementation state | Acceptance target | Assignment |
|---|---|---|---|
| Reliable intake menu | Manual, Experimental PDF, JSON and QR only; URL/image/photo hidden | Exact source-menu scope and no removed-path persistence | Implemented in 0.5.5; open pending V87 |
| V5-F17 — shared URL recognition | New-item URL intake removed; manual item-owned URL and validated QR/JSON URL remain | Removed path absent; both supported ownership paths pass | Scope-closed only after V87 |
| Experimental PDF safety | PDF-only picker, experimental warning, original preservation, no Trip-date default | Real PDF review/failure behavior without fabrication, silent write or source loss | Implemented in 0.5.5; open pending V87 |
| V5-F21 — stale editor after Cancel | Existing-item editor re-renders persisted data immediately after Cancel | Original date visible before close/reopen; no persistence or duplicate | Implemented in 0.5.5; open pending V87 |
| V5-F25 — archive placement | Persistence/separation already passed; archive rendered after active content, Sources and Add | Placement plus preserved one-only archive state | Implemented in 0.5.5; open pending V87 |
| Cold-start Offline / V4-F13 | 0.5.4 real-device path passed | One compact first-launch/reconnect regression | Regression only in V87 |
| V5-F23 / V5-F24 / V5-F25 lifecycle | Passed and closed in 0.5.4 | Changed-surface smoke only | Closed; do not reopen full matrices |
| V5-W01 | Approved COOP header and functional sign-in preserved | Functional sign-in smoke | Reassigned to Alpha 0.7 hardening |

## Historical Alpha 0.5.2 register

| Finding | Implementation state | Acceptance target | Assignment |
|---|---|---|---|
| V4-F04 — later Trip-date backfill | Implemented and automated PASS | Existing undated item backfills; explicit date remains exact | V5 acceptance |
| V4-F11 — contextual extraction | Implemented and automated PASS | Real EL AL/Agoda sources plus multi-segment regression | V5 acceptance |
| V4-F12 — JSON/QR fallback | Implemented and automated PASS | Real camera, gallery and exact persistence round trip | V5 acceptance |
| V4-F13 — offline cold start | 0.5.2 scope/index shell fallback implemented and automated PASS | Installed PWA close/reopen without network and recovery | Implemented in 0.5.2; open pending retest |
| V5-F01 — browser QR capability | BarcodeDetector is used when supported; text payload remains a diagnostic fallback | Confirm on target Android Chrome | TBD after acceptance completion |
| V5-F02 — external-source binaries | JSON/QR contains metadata, not PDF/image bytes; UI states this explicitly | Confirm warning and metadata persistence | Expected behavior |
| V5-F03 — installer rejected local 0.4.4 handoff | Corrected in package R2; all 0.4.4-changed runtime files are replaced before the quality gate | Install from the observed 0.4.4 NO-GO state and confirm 0.5.0 | V5 acceptance |
| V5-F05 — stale V4 login identity | Product Owner retest passed in Alpha 0.5.1; 0.5.2 identity is updated consistently | Version smoke check | Verified in 0.5.1; regression only |
| V5-F06 — required-field marking | Product Owner phone retest passed / usable | Required-field smoke check | Verified in 0.5.1; regression only |
| V5-F07 — Today after Flight/Insurance | Product Owner retest passed for Flight, Insurance and both together | Flight+Insurance Today smoke check | Verified in 0.5.1; regression only |
| V5-F08 — Timeline Calendar/list contract | 0.5.2 entry focus now resets to Entire Trip/Trip start; embedded Calendar, shared filtering, Day selection and synchronized Week arrows/swipe remain implemented | Desktop and phone complete interaction regression | Implemented in 0.5.2; open pending retest |
| V5-F09 — category-prefilled Add | Intentionally unchanged in 0.5.1 | Alpha 0.6 acceptance | Assigned to Alpha 0.6 |
| V5-F10 — start/end-date invariant | Product Owner confirmed correct persistence and out-of-range marking; earlier `Not defined` observation was withdrawn | Trip-date/out-of-range smoke check | Verified in 0.5.1; regression only |
| V5-F11 — Settings delete/reset controls and wording | Functional scopes passed in 0.5.1; unsupported other-Trips promise removed in 0.5.2 | Open confirmations, verify wording and cancel | Wording implemented in 0.5.2; open smoke retest |
| V5-F12 — blank re-entry screen | Product Owner desktop and installed-phone sign-out/sign-in retest passed | Re-entry smoke check | Verified in 0.5.1; regression only |
| V5-F13 — Quick Access omits future tasks / repeats Flight | Ordered three-task selector includes future tasks, excludes completed tasks and filters already-shown Today records | Controlled task ordering and fill-vacancy retest | Implemented in 0.5.2; open pending retest |
| V5-F14 — existing task cannot be edited | Stable-ID task edit flow implemented; completion remains on the same record | Edit/reopen/restart/complete/uncomplete retest | Implemented in 0.5.2; open pending retest |
| V5-F15 — existing item URL cannot be edited | Item editor always exposes URL and updates or clears the same record | Replace/open/remove/reopen without duplicate | Implemented in 0.5.2; open pending retest |
| V5-F16 — imported proposal exceeds phone width | Proposal/modal content is constrained and long content wraps without horizontal overflow | Target-phone long address/URL retest | Implemented in 0.5.2; open pending retest |
| V5-F17 — shared URL shown as document / meaningless title | Opaque shared URL uses Link presentation and supplied reliable title or `Shared link` fallback | Real `share.google` proposal retest | Implemented in 0.5.2; open pending retest |
| V5-F18 — generic URL classified as Flight | Opaque/generic link cannot become Flight without reliable provider evidence; low confidence requires type selection | Real generic-link classification retest | Implemented in 0.5.2; open pending retest |
| V5-W01 — Google popup COOP console warning | Netlify `/*` responses are configured with `Cross-Origin-Opener-Policy: same-origin-allow-popups`; exact configuration is asserted automatically | Verify the fixed-QA response header, successful Google popup sign-in and absence of the earlier popup-close COOP warning | Implemented in 0.5.2; open pending deployed retest |

`V5-F27` is not closed by implementation, automated testing, packaging or deployment. Verification occurs only through `EXECUTABLE_TEST_SESSION_V112.md` in the application-testing chat. All passed 0.5.5 evidence remains accepted and must not be repeated.
