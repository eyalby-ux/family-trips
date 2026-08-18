# VERSION_PACKAGE_AUTHORING_STANDARD

Status: Mandatory project process  
Version naming: `V1`, `V2`, `V3`, `V4`, and so on  
Document revision: `V22`

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V1 | 2026-08-02 | Alpha 0.4.3 acceptance | Baseline package-authoring, acceptance-session and synchronized-finding-register standard. |
| V2 | 2026-08-02 | Alpha 0.4.3 acceptance / Alpha 0.5 planning | Added mandatory `Vx → Vx+1` revision control and change-history tables; recorded the Product Owner assignment of external JSON import and QR scanning to Alpha 0.5. |
| V3 | 2026-08-02 | Alpha 0.4.3 acceptance | Recorded short-regression step 2 PASS: the correct original source opened from the approved item. |
| V4 | 2026-08-02 | Alpha 0.4.3 acceptance | Recorded short-regression step 3 PASS: item deletion preserved the original source in Documents and the desktop short regression is complete. |
| V5 | 2026-08-02 | Alpha 0.4.3 deployed-phone acceptance | Recorded the phone-action PASS and offline cold-start FAIL after closing the application without connectivity; retained target assignment as pending until the exact failure evidence is captured. |
| V6 | 2026-08-02 | Alpha 0.4.3 acceptance closure | Recorded installed-PWA offline cold-start failure evidence, successful recovery after connectivity returned, test 13 FAIL and final test 14 NO-GO; the session is complete and assignment approval is the next gate. |
| V7 | 2026-08-02 | Alpha 0.4.4 correction preparation | Recorded Product Owner approval of the focused correction assignment: V4-F11 and V4-F13 to 0.4.4; V4-F04 and V4-F12 to 0.5. Package creation may proceed with focused tests and rollback. |
| V8 | 2026-08-03 | Alpha 0.4 closure / Alpha 0.5 handoff | Recorded 0.4.4 focused acceptance failures, final NO-GO and non-promotion; retained 0.4.3 as Production and reassigned V4-F11 and V4-F13 to Alpha 0.5 with V4-F04 and V4-F12. |
| V9 | 2026-08-03 | Controlled-document tracking | Made the document revision mandatory in both the filename and the internal change-history table, with both advancing together on every stored update. |
| V10 | 2026-08-03 | Alpha 0.5.0 implementation | Recorded the V5 package baseline, complete automated quality gate, inherited V4 finding coverage and the rule that installed acceptance must complete before Production promotion. |
| V11 | 2026-08-03 | Alpha 0.5.0 installer correction | Added explicit handling for a rejected patch candidate left in the local test repository: accept it only as a verified handoff state when the next package replaces every changed runtime file, while retaining the accepted Production baseline and non-promotion decision. |
| V12 | 2026-08-04 | Alpha 0.5.1 correction package | Recorded the focused V5 patch rule: preserve prior acceptance evidence, package the complete runtime, keep corrected findings open until Product Owner retest, and allow installation from 0.5.0 or the documented V4 handoff states. |
| V13 | 2026-08-06 | Alpha 0.5.2 correction package | Extended the focused V5 patch rule to a correction over 0.5.1, required full QA-chat reconciliation before packaging, retained the complete-runtime/rollback rule and kept every affected finding open until the synchronized V16 retest. |
| V14 | 2026-08-07 | Alpha 0.5.2 COOP correction | Recorded the Product Owner-approved ninth correction and advanced the synchronized installed acceptance session to V17 while retaining the focused-scope and open-finding rules. |
| V15 | 2026-08-10 | Alpha 0.5.3 correction package | Recorded the completed 0.5.2 NO-GO handoff, mandatory V40 reconciliation, focused six-finding correction scope, preservation of all prior acceptance evidence, and the V41 focused QA session. |
| V16 | 2026-08-11 | Alpha 0.5.4 correction package | Recorded the focused 0.5.4 implementation/package gate, compatible dependency-advisory correction, zero-vulnerability audit result and the rule that 0.5.3 remains NO-GO while 0.4.3 remains Production until Product Owner GO. |
| V17 | 2026-08-12 | Alpha 0.5.5 correction package | Recorded final 0.5.4 NO-GO handoff, the reliable-intake scope reset, experimental-PDF safety boundary, dedicated 0.5.5 test session V87, complete-runtime/rollback package rule and the roadmap split that reserves Alpha 0.6 for Smart Import discovery/implementation while moving the former completion backlog to Alpha 0.7. |
| V18 | 2026-08-12 | Alpha 0.5.6 focused correction package | Recorded final 0.5.5 NO-GO handoff, the single-blocker `V5-F27` correction, mandatory preservation of passed 0.5.5 evidence, executable test session V112, exact no-build QA deployment evidence and the continued block on Alpha 0.6 until explicit 0.5.6 GO. |
| V19 | 2026-08-14 | Alpha 0.6.0 Hotel-first Smart Import package | Recorded the accepted 0.5.6 Production handoff, passed V11/V13 measured entry gate, complete-runtime/function package, server-only configuration helper, invitation/quota boundary, executable test session V121 and exact no-build QA deployment requirement. |
| V20 | 2026-08-15 | Alpha 0.6.1 fixed-QA correction package | Recorded `V6-F01`, required the 0.6.0 QA handoff on `version/V6`, added a dedicated fixed-QA deployment helper using `--alias qa --no-build`, prohibited per-version QA aliases, and advanced acceptance to V122 without changing Smart Import product scope. |
| V22 | 2026-08-15 | Alpha 0.6.3 deterministic Netlify environment reset | Recorded `V6-F03` after the 0.6.2 existing-variable detector failed. Required complete-package replacement over 0.6.0, 0.6.1 or 0.6.2, deterministic removal and immediate recreation of the four QA-only variables, automatic retention of the Product Owner invitation, fixed-QA deployment and executable test session V124. |
| V21 | 2026-08-15 | Alpha 0.6.2 Netlify environment correction | Recorded `V6-F02`; required complete-package replacement over 0.6.0 or 0.6.1, separate create/update paths for Netlify variables, automatic retention of the Product Owner invitation, fixed-QA deployment, and executable test session V123. |

## Controlled-document revision rule

Every controlled project document must contain a `Document revision` in the form `V1`, `V2`, `V3`, and so on, and its filename must end with the matching `_Vx` before the extension.

- Every stored content change increments that document's revision by exactly one: `Vx → Vx+1`, and renames the file to the same new revision.
- The same edit adds one row to the document's change-history table.
- The change-history row records the new document revision, date, applicable application version or project phase, and a concise description of the decision or evidence added.
- Document revision is independent of the application version (`0.4.3`, `0.5`), lifecycle package (`V4`, `V5`) and schema/contract version (`familytrips.import` `1.0`).
- When one work stage changes several controlled documents, every touched document increments its own revision by one and receives its own history row.
- The filename revision and the internal `Document revision` must always match; for example, revision `V9` is stored as `<DOCUMENT_NAME>_V9.md`.
- Updating the filename must preserve the existing Library file identity and version history. Do not create duplicate copies or use ambiguous suffixes such as `(1)` or `(2)`.
- Formatting-only changes that alter the stored file still count as a document change and require the next revision, unless they are part of the same uncommitted edit as the content change already recorded.
- A package may not be delivered when a changed controlled document's filename, internal revision and latest change-history row do not all show the same new `Vx`.

## Responsibility split

The development phase is performed by ChatGPT / the Development Agent without step-by-step user participation.

ChatGPT / Development Agent must:

- implement the approved version scope;
- update code, tests, release documents, and the authoritative delivery plan;
- run every automated or tool-accessible check;
- create one installable version package;
- provide one installer and one rollback path;
- record all technical evidence.

The Product Owner must only:

- install the completed package;
- perform user-only acceptance tests presented one at a time;
- report real behavior;
- approve trade-offs and GO / NO-GO.

The user must not manually edit code, apply patches, fill release records, or participate in implementation slices unless an explicit architecture decision requires Product Owner approval.

## Acceptance-session completion before correction assignment

An installed candidate is tested to the end of its approved executable acceptance session before a new correction package is planned or created.

- Findings discovered during testing are recorded immediately, but discovery alone does not assign them to a correction release.
- While the acceptance session is still open, the target is recorded explicitly as `TBD after acceptance completion`, together with the candidate versions under consideration.
- The remaining tests continue so that the correction decision is based on the complete finding set and regression picture.
- A mid-session interruption is allowed only when continuing would create a material risk of data loss, security exposure, irreversible corruption, or invalid test evidence. The interruption and reason must be recorded and approved by the Product Owner.
- No correction installer or package is created before the end-of-session assignment decision.

At the end of the acceptance session, every open finding is assigned to one of:

- a focused correction release for the tested version, such as `0.4.4`;
- the next planned feature version, such as `0.5`;
- a later Alpha, Beta, Release Candidate, or post-MVP backlog entry;
- accepted behavior or no change, with rationale.

The assignment must consider severity, data-loss risk, release-blocker status, architecture fit, implementation breadth, and whether the finding is required to complete the tested version's approved scope.

## Complete lifecycle

1. verify `main` and the accepted previous version;
2. verify environment and quality gate;
3. create the version branch;
4. Development Agent implements the complete approved scope;
5. Development Agent updates tests and documents;
6. Development Agent builds the installation package;
7. Product Owner installs the completed package;
8. ChatGPT runs the executable acceptance session, one user test at a time;
9. record every finding immediately, using `TBD after acceptance completion` until assignment is approved;
10. complete the acceptance session and short regression unless a documented safety stop applies;
11. classify and assign every finding to an explicit target version or disposition;
12. update the version documents and authoritative delivery plan;
13. create a correction package only if the approved assignment requires one;
14. deploy and close;
15. merge or PR back to `main`;
16. update the authoritative delivery plan with final evidence and status.

## Mandatory finding register

During acceptance, the version lifecycle documents and the authoritative delivery plan must contain a synchronized finding register. Each entry records:

- finding ID;
- version in which it was observed;
- test or evidence source;
- observed behavior and expected behavior;
- current result and severity;
- target version or disposition;
- assignment status: `TBD`, `Assigned`, `Fixed`, `Deferred`, or `Accepted`;
- rationale and retest requirement.

The register is updated at four points: discovery, target assignment, implementation, and verification. A finding may remain `TBD` only while the current acceptance session is open. It must have an explicit target or disposition before a new implementation package is created.

### Final V4 / Alpha 0.4 acceptance register

This synchronized snapshot records the final Alpha 0.4 evidence. Alpha 0.4.4 focused acceptance ended NO-GO on 2026-08-03; it was not promoted, 0.4.3 remains Production, and the Product Owner closed the test cycle with the unresolved work assigned to Alpha 0.5.

| Finding / test | Observed in | Current evidence and result | Assignment status | Target version / disposition | Retest requirement |
|---|---|---|---|---|---|
| V4-F01 — dynamic fields by item type | Alpha 0.4.3 | Retest passed. | Fixed / verified | Closed in 0.4.3 | None |
| V4-F04 — defaults after Trip dates are set | Alpha 0.4.3 | New-item defaults passed. An existing item saved before Trip dates were defined is not backfilled when the Trip start date is later set. Explicit user dates must not be overwritten. PASS-WITH-LIMITATION. | Assigned | Alpha 0.5 | Existing undated item, later Trip-date assignment, plus preservation of explicit dates |
| V4-F06 — navigation, website and phone actions | Alpha 0.4.3 | Navigation and website passed on desktop. On the deployed 0.4.3 Draft, tapping the phone action opened the device phone application with the correct number ready to dial. PASS. | Verified | Closed in 0.4.3 | None |
| V4-F08 — duplicate detection and merge | Alpha 0.4.3 | Duplicate flow is usable; merge keeps one item and both source files. F11 showed the missing structured fields were absent before save, so there is no evidence of merge data loss in this run. PASS. | Verified | Closed for 0.4.3 duplicate/merge behavior; no correction target | Normal short regression only |
| V4-F11 — PDF/OCR structured-field extraction and classification | Alpha 0.4.3 and focused 0.4.4 retest | 0.4.3 falsely mapped `YITZHAK`. In 0.4.4, one flight source was not ingested, another falsely mapped `SCREENSHOT` as booking number, and a hotel proposal placed Agoda booking ID `1736468481` in the phone field while dates and other fields were missing. FAIL; narrow heuristics are insufficient. | Deferred after failed 0.4.4 verification | Alpha 0.5 | Regression cases must include `YITZHAK`, `SCREENSHOT`, the Agoda identifier, multi-segment flight data, uncertain-value suppression and duplicate prevention |
| V4-R01 — edited suggestion title persists | Alpha 0.4.3 | The user changed the proposed title to an exact value, approved the suggestion and confirmed that the saved item retained the exact edited title. Short-regression step 1 PASS. | Verified | Closed in 0.4.3 | None |
| V4-R02 — original source opens from approved item | Alpha 0.4.3 | The user opened the original source from the saved item `בדיקת רגרסיה 0.4.3` and confirmed that the correct PDF/image opened. Short-regression step 2 PASS. | Verified | Closed in 0.4.3 | None |
| V4-R03 — item deletion preserves original source | Alpha 0.4.3 | The user deleted the approved item `בדיקת רגרסיה 0.4.3` and confirmed that its original source still existed and opened from Documents. Short-regression step 3 PASS; desktop short regression complete. | Verified | Closed in 0.4.3 | None; evidence retained |
| V4-F12 — external language-model import/QR fallback specification | Requested during Alpha 0.4.3 acceptance | The prepared contract remains the basis for Alpha 0.5. Verification must cover structured JSON/QR round trip, camera scanning, gallery-image import, checksum/schema rejection, duplicate handling and exact persistence without OCR or guessing during QR import. | Assigned; specification prepared; implementation not started | Alpha 0.5 | Complete source record → QR/JSON → app proposal → approval → persistence → reopen comparison |
| V4-F13 — offline cold start after application closure | Alpha 0.4.3 and Alpha 0.4.4 deployed Drafts | The installed application still could not be accessed after connectivity was removed, even though the 0.4.4 automated offline-shell regression passed. The Product Owner accepted deferral because it is not critical to close 0.4. | Deferred after failed 0.4.4 real-device verification | Alpha 0.5 | Installed-PWA cold start without connectivity, saved-data access, and online recovery |

Final disposition approved by the Product Owner on 2026-08-03: 0.4.4 is NO-GO and must not be promoted; 0.4.3 remains Production. V4-F04, V4-F11, V4-F12 and V4-F13 are assigned to Alpha 0.5. No further Alpha 0.4 user tests remain.

## Package content

Every package contains:

- changed application files;
- automated tests;
- the current revision of `docs/process/VERSION_PACKAGE_AUTHORING_STANDARD_Vx.md`;
- `docs/versions/<VERSION>/` lifecycle documents;
- the approved delivery plan under `docs/roadmap/`;
- a single installation script;
- a rollback script;
- an executable test session.

## No manual records

Dates, SHAs, branch state, environment verification, test results, deploy IDs, findings, and decisions are assistant-recorded. The user never maintains placeholders manually.

Test evidence already collected remains valid unless a change directly affects it. A correction cycle must define a focused retest and short regression; it must not erase or restart unrelated accepted results.

## Version naming

Use `V1`, `V2`, `V3`, `V4`, and so on. For V4:

- package: `FAMILY_TRIPS_V4_RELEASE.zip`
- branch: `version/V4`
- docs: `docs/versions/V4/`

Patch-level candidates such as `0.4.3` and `0.4.4` remain part of the V4 lifecycle and use the same `docs/versions/V4/` register. A patch number is assigned only after the acceptance-session completion and finding-assignment gate.

For V5:

- package: `FAMILY_TRIPS_V5_0_5_0_RELEASE_R2.zip`
- branch: `version/V5`
- docs: `docs/versions/V5/`
- accepted Production baseline: `0.4.3`
- supported local installer handoff: `0.4.4` NO-GO only when the next-version payload replaces every runtime file changed by that candidate; this handoff never accepts or promotes `0.4.4`
- candidate version: `0.5.0`
- focused correction package: `FAMILY_TRIPS_V5_0_5_1_CORRECTION.zip`
- correction candidate version: `0.5.1`; correction findings remain open until verified through the synchronized V5 executable test session
- next focused correction package: `FAMILY_TRIPS_V5_0_5_2_CORRECTION.zip`
- next correction candidate version: `0.5.2`; installer accepts 0.5.1 as the primary handoff, preserves the documented 0.5.0/V4 recovery handoffs, and keeps 0.5.2 findings open until `EXECUTABLE_TEST_SESSION_V17.md` verification
- next correction candidate version: `0.5.3`; installer accepts the rejected 0.5.2 QA handoff as its primary baseline, retains 0.4.3 as Production, and keeps every corrected finding open until `EXECUTABLE_TEST_SESSION_V41.md` verification
- focused stabilization candidate version: `0.5.4`; installer requires the recognized 0.5.3 NO-GO handoff as its primary baseline, retains 0.4.3 as Production, and keeps cold-start Offline, `V5-F17`, `V5-F23`, `V5-F24` and `V5-F25` open until `EXECUTABLE_TEST_SESSION_V63.md` verification
- focused intake-reset candidate version: `0.5.5`; installer requires the recognized 0.5.4 NO-GO handoff as its primary baseline, replaces the complete 0.5.4 runtime, retains 0.4.3 as Production, and keeps the source-menu boundary, manual/QR/JSON URL ownership, experimental-PDF safety, Cancel editor reset, archive placement and compact regressions open until `EXECUTABLE_TEST_SESSION_V87.md` Product Owner verification
- focused range-boundary correction version: `0.5.6`; installer requires the recognized 0.5.5 NO-GO handoff, replaces the complete 0.5.5 runtime, retains 0.4.3 as Production, preserves every passed V111 result, keeps `V5-F27` open until `EXECUTABLE_TEST_SESSION_V112.md` Product Owner retest and requires fixed-QA deployment of the untouched tested `dist` with `--no-build` evidence

For V6:

- package: `FAMILY_TRIPS_ALPHA_0_6_0_SMART_IMPORT_HOTEL_SLICE.zip`;
- branch: `version/V6`;
- docs: `docs/versions/V6/`;
- accepted Production baseline and installer handoff: `0.5.6` on `version/V5`;
- candidate version: `0.6.0`;
- scope: Hotel-first Smart Import for PDF, image and bounded public URL, explicit save-only versus paid analysis, review-before-apply, server invitation/ownership/quota/audit enforcement, validated Hotel-place metadata and direct existing-Hotel attachment;
- excluded scope: multi-trip, shared synchronization, invitation-management UI, Editor-paid processing, cloud original-source synchronization, transport/expenses/shopping/task expansion and broad cross-type import; these remain Alpha 0.7 or later;
- installer creates or switches to `version/V6`, replaces the complete runtime and Netlify Functions, preserves a timestamped external rollback backup, runs `npm ci` and the full quality gate, and does not deploy;
- the configuration helper stores the Places key and authorization values only in Netlify Functions contexts and never in a `VITE_` variable or repository file;
- acceptance uses `EXECUTABLE_TEST_SESSION_V121.md` and deploys the untouched built `dist` plus packaged Functions to a non-Production alias with `--no-build`; Production remains blocked until explicit Product Owner GO.
- focused correction package: `FAMILY_TRIPS_ALPHA_0_6_1_FIXED_QA_CORRECTION.zip`;
- correction candidate version: `0.6.1`; installer requires the installed 0.6.0 QA handoff on `version/V6`, replaces the complete runtime and Functions, and preserves an external rollback backup;
- for the 0.6.1 candidate, `scripts/deploy_QA_V6_0_6_1.ps1` established the fixed `qa` alias contract; its V122 session was superseded by the 0.6.3 correction after `V6-F02`;
- version-specific QA aliases remain prohibited because they create unapproved OAuth/referrer hosts.
- second focused correction package: `FAMILY_TRIPS_ALPHA_0_6_2_NETLIFY_ENV_CORRECTION.zip`; its inventory-based existing-variable path failed and is superseded by 0.6.3;
- third focused correction package: `FAMILY_TRIPS_ALPHA_0_6_3_DETERMINISTIC_ENV_RESET.zip`;
- correction candidate version: `0.6.3`; installer accepts the 0.6.0, 0.6.1 or installed 0.6.2 QA handoff on `version/V6` because it replaces the complete runtime and Functions;
- the helper must remove each of the four Alpha 0.6 QA variables with `--force` and immediately recreate it with Functions scope and only `deploy-preview`/`branch-deploy`; it must not depend on parsing `env:list` output or deploy during configuration;
- the Product Owner email is mandatory in the active invitation allowlist and additional invitees are merged rather than replacing it;
- acceptance uses `EXECUTABLE_TEST_SESSION_V124.md`, the fixed `qa` alias and the untouched built artifact; Production remains blocked until explicit Product Owner GO.

When a rejected patch candidate remains installed in the local test repository, the next-version installer must not force the Product Owner to edit files or manually reconstruct the accepted baseline. It may support that state only when it can prove that all candidate-modified runtime files are replaced by the new payload, takes a complete rollback backup first, preserves the recorded Production baseline, and states that the rejected candidate remains NO-GO.

## Source of truth

The approved delivery plan is the only scope and roadmap source. It must be included in every future release package.

The version lifecycle documents hold detailed execution evidence. The delivery plan holds the authoritative target-version assignment. When either changes, the other must be updated in the same work stage so that no finding has conflicting destinations.

## Closure

A version is not closed while accepted work exists only on the version branch. Closure must return accepted work to `main`, record the final SHA, verify production, and update all future versions in the approved delivery plan.
