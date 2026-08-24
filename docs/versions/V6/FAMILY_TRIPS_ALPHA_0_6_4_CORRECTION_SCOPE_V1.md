# FAMILY_TRIPS_ALPHA_0_6_4_CORRECTION_SCOPE

Status: Correction-package scope — ready for Development Agent implementation  
Document revision: `V1`  
Date: 2026-08-24  
Candidate: Alpha 0.6.4, fourth focused correction package on `version/V6`  
Baseline for installation: 0.6.0, 0.6.1, 0.6.2 or the installed 0.6.3 QA handoff (complete runtime/Functions replacement makes any of these acceptable)  
Accepted Production baseline (unchanged by this package): Alpha 0.5.6  
Source of truth for this scope: `EXECUTABLE_TEST_SESSION_V124.md` (internal revision V142, Alpha 0.6.3 acceptance closure) and `claude/VERSION_PACKAGE_AUTHORING_STANDARD_V25.md` (internal revision V26, "For V6" version-naming list) and `claude/MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` (internal revision V14)

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V1 | 2026-08-24 | Baseline: per-finding fix specifications for the twelve findings the Product Owner assigned to `0.6.4`, root-cause groupings flagged for joint investigation, the mandatory `V4-F04` regression-test carry-forward, the `V6-F09` H-001 verification step, explicit exclusions, package content and deployment contract. |

## 1. Purpose and scope in one paragraph

Alpha 0.6.3 ended in a Product Owner NO-GO on 2026-08-24 (four numbered tests FAILed, including a data-loss-risk defect). Every open finding from that session now carries a confirmed target-version assignment. This document is the correction-package scope for `0.6.4`: it turns the twelve `0.6.4`-assigned finding IDs into concrete, implementable fix specifications so the Development Agent can implement, test, and package `0.6.4` without needing to re-derive intent from the raw test-session narrative. Nothing in this document changes any finding's assignment, severity, or wording — it is a structured restatement of already-approved scope, not a new decision.

## 2. Root-cause groupings flagged for joint investigation

The test session repeatedly flagged that several findings may share a single underlying defect. The Development Agent should investigate these groupings first, since a single fix may close more than one finding — but each finding still needs its own named regression test regardless of whether the underlying fix is shared.

**Group A — "detected but not persisted to structured field."** The extraction pipeline detects a value with evidence, but the value never reaches the corresponding structured field on the proposal or the saved item.

- `V6-F04` — dates
- `V6-F08` — times, and itinerary/room confirmation numbers
- `V6-F12` — booking number, supplier, phone

**Group B — premature-state / race-condition handling in the Add/Analyze flow.**

- `V6-F05` — a selected PDF disappears after clicking Add; only the third attempt confirms the file
- `V6-F11` — clicking Continue while analysis is still running reports a false "no document selected" error

**Group C — evidence surfaced but not carried through to the reviewer or the saved item.** Distinct from Group A in that the failure is about visibility of uncertainty, not field mapping.

- `V6-F13` — an internally resolved evidence conflict is not surfaced as `needs_review`
- `V6-F09` — website/URL not recognized at all (see the H-001-specific carve-out in section 4 below)

**Not grouped — treat independently:**

- `V6-F06` — Trip-date default backfill (recurrence of `V4-F04`; has its own mandatory regression-test rule, see section 5)
- `V6-F07` — stale approved proposal still shown on Home
- `V6-F10` — no later explicit-analysis action after Save-only
- `V6-F15` — Attach-and-extract blanks a previously-saved trusted date (data-loss risk; highest severity in this package)
- `V6-F17` — place validation ignores address evidence already extracted elsewhere in the same proposal

## 3. Per-finding fix specifications

Each entry gives: the exact defect as observed, the required behavior, concrete acceptance criteria the Product Owner can retest against, and the regression-test naming convention required before the finding may be marked `Fixed` (per the mandatory-regression-test rule in `VERSION_PACKAGE_AUTHORING_STANDARD_V25.md`).

### V6-F04 — dates detected but not persisted to structured fields

- **Observed:** Hotel dates recognized by extraction were not saved into the corresponding structured start/end date fields. Reconfirmed a third time against an independent Booking.com/Europark source (28 March check-in / 31 March check-out detected and evidenced, fields left empty).
- **Required:** every source-present date recognized by extraction must appear in the proposal's structured start/end date fields and persist once approved.
- **Acceptance criteria:** re-run Test 3 (H-001) and Test 4 (approve + reopen) from `EXECUTABLE_TEST_SESSION_V124.md`; structured date fields are pre-filled at review time and remain filled on the persisted item after approval and after refresh.
- **Regression test:** `test_V6_F04_detected_dates_persist_to_structured_fields` (or equivalent traceable name), asserting the field is non-empty and matches the evidenced value after approval.
- **Group:** A (investigate jointly with `V6-F08`, `V6-F12`).

### V6-F05 — selected PDF disappears from Add flow, requires three attempts

- **Observed:** selecting a PDF via Add and clicking Add causes the file to disappear from the selector; only the third attempt confirms the file and creates the pending proposal.
- **Required:** selecting a supported file and confirming Add must reliably accept the file and proceed to analysis/save on the first attempt.
- **Acceptance criteria:** select and confirm a PDF via Add ten consecutive times; the file is accepted and the flow proceeds to analysis/save every time, with no re-selection required.
- **Regression test:** `test_V6_F05_add_pdf_accepted_on_first_attempt`.
- **Group:** B (investigate jointly with `V6-F11`; flag if the fix turns out to be the same root cause, but still ship both named tests).

### V6-F06 — new-item default date does not default to Trip start date

- **Observed:** after Trip start/end dates are set, a newly created item's default date is not the Trip start date. This is a recurrence of the historical `V4-F04` finding, previously marked `Fixed` in Alpha 0.5 without a permanent regression test.
- **Required:** once Trip dates are defined, a new item's default date must be the Trip start date, per the original `V4-F04` decision.
- **Acceptance criteria:** with Trip start/end dates set, create a new item and confirm its default date is the Trip start date; separately confirm an existing item's explicit user-set date is never overwritten by this defaulting behavior (the original `V4-F04` PASS-WITH-LIMITATION carve-out).
- **Regression test — mandatory, two-part (see section 5 for the full rule):** `test_V4_F04_new_item_defaults_to_trip_start` (the still-missing original test) **and** `test_V6_F06_trip_start_default_after_dates_set` (covering this recurrence). Neither `V4-F04` nor `V6-F06` may be recorded `Fixed` until both tests exist and pass.
- **Group:** not grouped; standalone but carries the retroactive regression-test obligation.

### V6-F07 — approved proposal still shown as pending on Home

- **Observed:** a proposal that was already approved (Test 4) is still displayed on the Home page as a pending proposal.
- **Required:** once a proposal is approved, it must no longer appear as pending anywhere in the UI, including Home.
- **Acceptance criteria:** approve a proposal, navigate to Home, confirm it does not appear as pending; refresh and confirm it still does not appear.
- **Regression test:** `test_V6_F07_approved_proposal_not_shown_pending_on_home`.
- **Group:** not grouped; stale-state bug in the approve flow.

### V6-F08 — times and confirmation numbers detected but not persisted

- **Observed:** on a non-canonical Panan Krabi Resort booking, a detected check-in window (2:00 PM–11:00 PM, with evidence) was not saved — the item shows a generic default time instead. Extracted itinerary and room confirmation numbers were not filled into the booking-number field; they appeared only in a free-text notes dump.
- **Required:** every source-present, detected time value must be represented and persist once approved, on the same basis as dates. Every extracted value with a corresponding structured field (booking/confirmation number here) must be filled into that field, not left only in notes.
- **Acceptance criteria:** re-run Test 13 (wild-card document, Panan Krabi Resort or an equivalent fresh wild-card source per the mandatory wild-card rule); structured time and booking-number fields are filled and evidenced, matching the source.
- **Regression test:** `test_V6_F08_detected_times_and_confirmation_numbers_persist`.
- **Group:** A (investigate jointly with `V6-F04`, `V6-F12`). Direct cause of the Test 13 FAIL.

### V6-F09 — website/URL not recognized; phone only partially recognized

- **Observed:** website/URL values are not recognized by extraction at all; phone numbers are only partially recognized. Confirmed on the approved, persisted H-001 item — the link field remains empty after approval, not just in the review form.
- **Open question carried into this package (not a gate on the fix):** H-001's benchmark documentation records it as a source understood to lack an official website. Before disposition, confirm for H-001 specifically whether a website/link is present in the source and was dropped by extraction, or is genuinely absent from the source. This verification does not block implementing the general fix below, since the underlying "no website recognized at all" pattern was originally discovered on a different, non-H-001 booking and is independently real.
- **Required:** every readable, source-present value — including official website/URL and phone — must appear in the proposal with evidence, or be visibly `needs_review`, never silently omitted.
- **Acceptance criteria:** (a) complete the H-001 source-accuracy check and record the answer in the next executable test session's change history; (b) re-run Test 7 (H-004, official URL) and confirm website/URL extraction continues to work there; (c) find or construct a source that is known to contain a website/URL not currently recognized, and confirm it is now extracted with evidence.
- **Regression test:** `test_V6_F09_website_and_phone_recognized_when_present`.
- **Group:** C.

### V6-F10 — no later explicit-analysis action after Save-only

- **Observed:** after choosing Save source only (Test 2), the saved source view shows only Open and Add actions — no action exists to later explicitly trigger AI analysis on that saved source.
- **Required:** per the Test 2 PASS criteria, a later explicit analysis action must remain available on a save-only source, so the user can analyze it at any point after saving without re-uploading.
- **Acceptance criteria:** re-run Test 2; after Save source only, an explicit "Analyze" (or equivalent) action is present and, when invoked, runs analysis on the already-saved source without requiring re-upload.
- **Regression test:** `test_V6_F10_saved_only_source_has_later_analyze_action`.
- **Group:** not grouped; direct cause of Test 2 FAIL.

### V6-F11 — no progress indication; false "no document selected" error

- **Observed:** during H-001 analysis, no processing/progress indication was shown. Clicking Continue before analysis finished reported a false "no document selected" error, even though a document was selected and analysis was still running; waiting resolved it.
- **Required:** the UI must show a clear processing/analyzing state while analysis runs. Any confirmation action taken while analysis is in progress must not report an incorrect "no document selected" error — the control must either be disabled/reflect the in-progress state, or correctly wait for and report the true analysis state.
- **Acceptance criteria:** re-run Test 3; a visible progress indicator is shown throughout analysis; clicking Continue during analysis either is disabled or correctly waits/reports in-progress state rather than a false empty-selection error.
- **Regression test:** `test_V6_F11_no_false_no_document_error_during_analysis`.
- **Group:** B (investigate jointly with `V6-F05`). Direct cause of Test 3 FAIL.

### V6-F12 — booking number, supplier, phone shown with evidence but not pre-filled

- **Observed:** the H-001 review list showed booking number, supplier-related evidence, and phone each with evidence citations, but the corresponding confirmation-form fields (`מספר הזמנה`, `ספק`, `טלפון`) were left empty. Test 4 confirmed Booking ID and supplier remain empty on the saved, approved item (phone resolved by approval time).
- **Required:** every extracted value shown with evidence in the review list, with a corresponding structured/editable field, must be pre-filled into that field and persist through approval onto the saved item.
- **Acceptance criteria:** re-run Test 3 and Test 4; booking number, supplier and phone are pre-filled at review time and remain filled on the persisted item after approval and refresh.
- **Regression test:** `test_V6_F12_booking_supplier_phone_prefilled_and_persist`.
- **Group:** A (investigate jointly with `V6-F04`, `V6-F08`). Direct cause of Test 3 FAIL.

### V6-F13 — internally resolved conflict not surfaced as needs_review

- **Observed:** on the Panan Krabi Resort booking, the source itself contained a genuine check-in/check-out label conflict between two pages. Extraction internally flagged this as needing review, resolved it (apparently correctly in this instance), but no `needs_review` indicator or any sign of the conflict was shown anywhere in the review form or on the saved item. A similarly ambiguous contact block was likewise silently resolved into unlabeled notes text.
- **Required:** per the source-relative completeness and evidence contract, any field where present source evidence is ambiguous or internally conflicting must remain visibly `needs_review` to the user until resolved, even when the system's automatic resolution happens to be correct.
- **Acceptance criteria:** re-run Test 13 with a source containing conflicting evidence (or reconstruct the original conflict); the conflicting field is visibly marked `needs_review` in both the review form and the saved item, and the underlying conflict is inspectable by the reviewer.
- **Regression test:** `test_V6_F13_conflicting_evidence_surfaced_as_needs_review`.
- **Group:** C. Direct cause of Test 13 FAIL; also relevant to Test 5's (H-002) `needs_review` PASS criterion — include an H-002-style case in the regression coverage if practical.

### V6-F15 — Attach-and-extract blanks a previously-saved trusted date (data-loss risk)

- **Observed:** using Attach and extract to merge a raster companion image into the existing Panvaree Hotel correctly filled booking number and phone, but blanked the previously-saved, trusted start date (01/17/2027) and end date (01/18/2027) to empty instead of preserving them. The Product Owner cancelled rather than approved, so no data was actually lost this session — but approving as shown would have lost it.
- **Required:** per the duplicate-detection/merge invariant that non-empty trusted values are preserved, attaching and extracting a companion source must never blank or overwrite an existing non-empty trusted field with an empty value. At most, an uncertain new value should be offered alongside the preserved original for review.
- **Acceptance criteria:** re-run Test 6 (H-003) against an existing Hotel with trusted start/end dates already saved; after Attach and extract, the review form shows the preserved original dates (not blank), with any new candidate value offered separately for review rather than silently replacing the original.
- **Regression test:** `test_V6_F15_merge_preserves_trusted_dates_not_blanked` — this is the highest-priority regression test in the package; the Development Agent should treat this as the first fix implemented and verified, given the data-loss severity.
- **Group:** not grouped; highest-severity finding in this package.

### V6-F17 — place validation ignores address evidence already extracted

- **Observed:** on the Booking.com/Europark source, place validation reported `country_not_evidence_grounded` despite the same proposal already containing an exact, evidenced full street address, city, postal code and country (Barcelona, Spain), each individually marked exact with evidence citations.
- **Required:** place/location validation must use the address evidence already extracted and evidenced elsewhere in the same proposal. When a proposal already contains an exact, evidenced country as part of a full street address, validation must not report the country as not evidence-grounded. If validation is deliberately more conservative than field extraction, that distinction must be visible to the reviewer rather than presented as a plain unverified/failed state.
- **Acceptance criteria:** re-run the Europark-style scenario (or an equivalent source with a full evidenced address); place validation succeeds using the already-extracted address, or — if a conservative validation policy is intentional — the UI visibly distinguishes "extracted with evidence" from "independently validated" rather than reporting a flat failure.
- **Regression test:** `test_V6_F17_place_validation_uses_extracted_address_evidence`.
- **Group:** not grouped; touches the same Hotel Location contract as other `0.6.4` fixes — coordinate with whoever implements `V6-F04`/`V6-F08`/`V6-F12` if the Location/place-validation code path overlaps.

## 4. Mandatory regression-test carry-forward (V4-F04 / V6-F06)

Per the mandatory-regression-test rule adopted in `VERSION_PACKAGE_AUTHORING_STANDARD_V25.md` (V23): `V4-F04` was marked `Fixed` in Alpha 0.5 without a permanent automated test, and the same defect recurred undetected as `V6-F06` in Alpha 0.6.3. This package must close that gap, not just the recurrence:

- Add `test_V4_F04_new_item_defaults_to_trip_start`, covering the original defect (new-item default date defaults to Trip start once Trip dates are set) **and** the original PASS-WITH-LIMITATION carve-out (an existing item's explicit user-set date is never overwritten by later Trip-date assignment).
- Add `test_V6_F06_trip_start_default_after_dates_set`, covering this specific recurrence.
- Neither `V4-F04` nor `V6-F06` may be recorded `Fixed` in the finding register until both tests exist in the permanent automated suite and pass.

## 5. Excluded scope — explicit, not silent

- **`V6-F14`** (notes field overloaded with a full duplicated dump) and **`V6-F16`** (two-button Photo/PDF add-document selector) are assigned to **Beta 0.8**, not `0.6.4` — both are refinements, not correctness or data-loss defects, per the Feedback Classification Rule. Do not fix them opportunistically inside `0.6.4`; if a `0.6.4` fix incidentally touches the same code path, note it in that finding's implementation record but do not close `V6-F14`/`V6-F16` early.
- **Flight/boarding-pass Smart Import** is newly approved scope, sequenced as a separate candidate **`0.6.5`**, not bundled into `0.6.4`, per the Product Owner's risk-based decision recorded in `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`. `0.6.4` must not include any Flight-type work.
- **Activity Smart Import** remains blocked — Activities do not yet exist as a Trip item type. Out of scope for both `0.6.4` and `0.6.5`.
- Test 8 (H-005, protected booking URL) and the two untested sub-checks of Test 10 (foreign Trip ID rejection; allowlist removal/redeploy/restore) are **not** findings and are **not** in `0.6.4`'s fix scope — they are re-run as part of `0.6.4`'s acceptance session (section 7) using material or access not available during the 0.6.3 session, not implemented as code changes.

## 6. Package content (per the standard's "Package content" section)

- changed application files implementing the twelve fixes above;
- automated tests: thirteen named regression tests total — one per finding in section 3, plus the retroactive `test_V4_F04_new_item_defaults_to_trip_start`;
- the current revision of `claude/VERSION_PACKAGE_AUTHORING_STANDARD_V25.md` (V26);
- `docs/versions/V6/` lifecycle documents, including this scope document and the new executable test session (section 7);
- the approved delivery plan: `claude/MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` (current-state document per the current-state/history split rule);
- a single installation script: `install_V6_0_6_4.ps1`;
- a rollback script: `rollback_V6_0_6_4.ps1`;
- an executable test session (section 7).

## 7. Deployment contract

Mirrors the 0.6.1–0.6.3 pattern established in `claude/VERSION_PACKAGE_AUTHORING_STANDARD_V25.md`:

- installer accepts the 0.6.0, 0.6.1, 0.6.2 or installed 0.6.3 QA handoff on `version/V6`, because it replaces the complete runtime and Netlify Functions;
- installer takes a timestamped external rollback backup before any change;
- configuration/deployment uses the existing fixed `qa` alias and `--no-build` deployment of the untouched built artifact — no new version-specific alias is created;
- the Product Owner email (`eyalby@gmail.com`) is automatically retained in the active invitation allowlist; additional invitees are merged, not replaced;
- Production (Alpha 0.5.6) remains unchanged and blocked from promotion until explicit Product Owner GO on `0.6.4`'s own acceptance session.

## 8. New executable test session (not yet created)

A new `EXECUTABLE_TEST_SESSION` document for `0.6.4` should be created once the package is built and ready for Product Owner acceptance — not before, per the acceptance-session-completion rule (no correction installer or package is created before the prior session's assignment gate, which is already satisfied here, but the new session itself is only opened when there is a candidate to test). It must include:

- one numbered test per fixed finding (twelve tests, using the acceptance criteria in section 3 as the PASS criteria);
- a short regression pass covering the "Confirmed working" areas listed in `EXECUTABLE_TEST_SESSION_V124.md` (navigation action, Hotel-name-first place validation, H-002 label association, Test 6/7/9 core flows, Test 10 sub-checks 1 and 3, Test 11 offline behavior, Test 12 desktop/phone consistency) so `0.6.4` does not silently regress anything Alpha 0.6.3 got right;
- a fresh mandatory wild-card document test (Test 8's genuinely-blocked-source gap and Test 10's two untested sub-checks should also be attempted again if material/access is now available, but are not required to block `0.6.4` GO if still unavailable — record explicitly per the no-silent-omission discipline, exactly as Alpha 0.6.3's session did);
- the H-001 source-accuracy verification answer for `V6-F09` (section 3), recorded in the new session's change history the first time H-001 is retested.

## 9. Next step

This document is the approved input for implementation. Once the Development Agent has built and packaged `0.6.4` against this scope, the next controlled-document action is creating the `EXECUTABLE_TEST_SESSION` document described in section 8 and beginning Product Owner acceptance testing, following the same one-test-at-a-time session rules used for Alpha 0.6.3.
