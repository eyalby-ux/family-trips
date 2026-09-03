# FAMILY_TRIPS_ALPHA_0_6_6_1_CORRECTION_SCOPE

Status: Correction-package scope — ready for Development Agent implementation
Document revision: `V1`
Date: 2026-09-03
Candidate: Alpha 0.6.6.1, first focused correction package against the `0.6.6` (Attraction/Event Smart Import) baseline, on `version/V6`
Baseline for installation: the installed `0.6.6` QA handoff (build `0.6.6-9b5b1ed0`) on `version/V6` — complete runtime/Functions replacement, so no earlier `0.6.x` handoff is separately supported
Accepted Production baseline (unchanged by this package): Alpha 0.6.5 (build `0.6.5-a915a440`, deploy `6a9464b101a1690008db8823`) — `0.6.6` and `0.6.6.1` remain QA-only until explicit Product Owner GO
Source of truth for this scope: `docs/roadmap/MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` (internal revision `V62`) and `docs/process/VERSION_PACKAGE_AUTHORING_STANDARD_V30.md` (internal revision `V30`, "For V6" version-naming list)

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V1 | 2026-09-03 | Baseline: per-finding fix specifications for the eleven finding IDs the Product Owner assigned to `0.6.6.1` (`V6-F55`\[merged with `V6-F54`\], `V6-F56`–`V6-F65`), root-cause groupings flagged for joint investigation, the `V6-F58` regression-coverage carry-forward folded into Group B, explicit exclusions, package content and deployment contract. |

## 1. Purpose and scope in one paragraph

The first `0.6.6` acceptance session (Product Owner testing of the Attraction/Event Smart Import candidate, `AE-001`–`AE-007`, plus retests of the three `0.6.5`-Production findings folded into `0.6.6`) is now closed: every finding it produced has an explicit disposition. Two findings (`V6-F52`, `V6-F53`) were retested directly and confirmed Fixed — no correction-package action needed for either. One finding (`V6-F54`) is merged into `V6-F55` rather than closed, since Eyal's retest showed it is the same underlying warning-lifecycle defect. Eleven finding IDs now carry a confirmed target-version assignment of `0.6.6.1`. This document is the correction-package scope for `0.6.6.1`: it turns those eleven finding IDs into concrete, implementable fix specifications so the Development Agent can implement, test, and package `0.6.6.1` without needing to re-derive intent from the raw investigation narrative spread across `docs/claude-code-prompts/0_6_6_1/` and the delivery plan's finding-register rows. Nothing in this document changes any finding's assignment, severity, or wording — it is a structured restatement of already-approved scope, not a new decision. Per the naming decision recorded in `VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`, this correction is `0.6.6.1`, not `0.6.7` — `0.6.7` is reserved for the separate Insurance feature track, so this uses patch-style naming (mirroring the `0.5.0`→`0.5.1` V5-lifecycle pattern) rather than the sequential full-version pattern the `0.6.x` series has used so far.

## 2. Root-cause groupings flagged for joint investigation

The investigation prompts that produced these findings repeatedly identified shared root causes. The Development Agent should investigate each group together, since a single fix pass may close several findings at once — but each finding still needs its own named regression test regardless of whether the underlying fix is shared.

**Group A — Activity-type extraction/prompt defects.** Same adapter/system-prompt surface for the `activity` type (`netlify/functions/_shared/smart-import-schema.mjs`'s `activityImportSchema`/`activitySystemPrompt`, `src/activity-import-adapter.js`). Several of these were independently found to share the same shape of gap — a concept the model needs to report has no canonical field or no priority-guidance paragraph, unlike the analogous, correctly-specified paragraphs `activityName`/`location` already have for their own concerns:

- `V6-F56` — no DNI/national-ID field in `ticketHolderSchema` at all
- `V6-F59` — `activityName` has no venue-vs-ticket-type-label priority rule
- `V6-F63` — `provider` has zero prompt guidance on venue-vs-ticketing-platform priority
- `V6-F64` — `location` has no venue+sub-venue combination instruction
- `V6-F65` — likely fabrication of a specific venue name not grounded in legible source text

One combined prompt-tightening pass across `activitySystemPrompt` (adding explicit priority/combination rules for `activityName`, `provider`, and `location`, mirroring the property-first discipline `location` already partially has) may close `V6-F59`, `V6-F63`, and `V6-F64` together, and reinforce the general anti-fabrication instruction relevant to `V6-F65`. `V6-F56` is schema-level (a genuinely missing field, not a missing instruction) and needs its own schema change regardless of the prompt pass. `V6-F65` may not be fully closable by a prompt change alone, since it concerns live-model compliance with an already-correct instruction — see its own fix specification below for what a meaningful acceptance criterion looks like for this one.

**Group B — Activity detail-view rendering gaps.** Data is correctly captured by `src/activity-import-adapter.js` into `proposed.details.*`, but `src/v5-app.js` (both `proposalFields()`/`smartEvidencePanel()` on the pre-approval review screen, and `detailView()` on the saved item) never renders it. One rendering-completeness pass across these render functions likely closes all of Group B together:

- `V6-F57` — `ticketHolders` (name/seat/section/gate/row/ticket-number) and `amount`/`currency` never rendered anywhere
- `V6-F58` — the existing regression suite (`tests/v6-6-attraction-event-import.mjs`) has fixture data for several of these frozen fields but never asserts them; fold the missing assertions into this same implementation pass rather than scope it as separate work
- `V6-F60` — a date-only value's synthetic "12:00" default is visually indistinguishable from a real extracted time, because `fmt()`/`detailView()` never consult `dateMeta.startPrecision`
- `V6-F61` — `AE-002`'s doubled/English "Purchaser" label, rooted in the same "no canonical field slot" gap class as `V6-F56`, surfacing through the generic `otherFields`→`notes` fallback in `src/activity-import-adapter.js`

**Group C — missing capability (standalone).**

- `V6-F62` — `activity`-type items have no attach-existing-document control in `detailView()` at all (hardcoded to `['hotel','flight']` only), confirmed as the actual root cause of `AE-003`/`AE-004` never linking as a companion pair.

**Standalone, cross-cutting — Warning lifecycle (High severity).**

- `V6-F55` (merged with `V6-F54`) — a warning describing an already-resolved or already-reviewed condition is never clearable by any means, on a suggestion or an item, regardless of item type. Not grouped with Activity-specific work above: this spans Hotel and every other Smart Import vertical, and touches `src/v5-app.js`'s `detailView()`/`suggestionView()` warning rendering and `src/smart-import-adapter.js`'s `preserveTrustedFieldsOnMerge`, not the Activity adapter.

## 3. Per-finding fix specifications

Each entry gives: the exact defect as observed and root-caused, the required behavior, concrete acceptance criteria the Product Owner can retest against, and the regression-test naming convention required before the finding may be marked `Fixed` (per the mandatory-regression-test rule, `VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`, V23 rule).

### V6-F55 (merged with V6-F54) — a warning describing an already-resolved condition is never clearable, by any means

- **Observed:** on the pre-`0.6.6.1` build, no warning-dismiss control is visible anywhere in the UI on a saved item, regardless of which of the three warning shapes (`unresolved`-sourced, `needsReviewFields`-sourced, or the third plain-string category `V6-F55` identified) it is. Two additional symptoms confirmed on retest: (1) Panvaree Resort — after merging a companion PNG (wrong dates) and PDF (correct dates), the warning box still reads "new value discovered for `startAt`: 2027-01-17 — saved value kept, needs manual review," describing a conflict that has already resolved correctly; the warning is stale/misleading, not merely slow to clear. (2) Panan Krabi — editing both the check-in and check-out dates cleared most of the warning, but one warning remains even after every associated field has been edited.
- **Required:** per the Product Owner's proposed fix direction, replace "silently keep one value + show a warning that may never clear" with a real decision point — either (a) a picker asking which value is correct, reusing the existing `directionAmbiguous`/`directionCandidates` picker pattern rather than new UI, or (b) a value proposed from the Trip's own date range with mandatory explicit user confirmation. Whichever approach is chosen, every warning shape (`unresolved`-sourced, `needsReviewFields`-sourced, and the third plain-string category from `preserveTrustedFieldsOnMerge`/`draft.warnings`/place-not-validated) must end up clearable through it — a warning must never be able to outlive the condition it describes.
- **Acceptance criteria:** re-attach a companion document to an existing Hotel item with a genuine date conflict (Panvaree-Resort-style); the resulting warning is resolved through an explicit decision point, not left as a permanently-stuck notice once the underlying value is correct. Separately, edit every field associated with a `needsReviewFields`-sourced warning (Panan-Krabi-style) and confirm zero warnings remain once every associated field has a confirmed value.
- **Regression test:** `test_V6_F55_warning_resolvable_through_explicit_decision_point` (or equivalent traceable name), covering all three warning shapes and both the Panvaree Resort (stale-after-resolution) and Panan Krabi (survives-full-edit) symptoms.
- **Group:** standalone, cross-cutting warning lifecycle. Highest severity in this package (High) — implement and verify this first, per the Product Owner's own framing of it as a trust-eroding, cross-cutting defect.

### V6-F56 — `ticketHolderSchema` has no DNI/national-ID field

- **Observed:** `ticketHolderSchema` (`netlify/functions/_shared/smart-import-schema.mjs` lines 87–90) declares exactly `name`, `ticketNumber`, `seatOrSection`, `evidence`, `certainty`, with `additionalProperties:false`. `AE-001`'s frozen ground truth requires a DNI per passenger; there is no field to hold it, and OpenAI's structured-output enforcement means the model is structurally blocked from ever attaching one.
- **Required:** add a `dni`/national-ID property to `ticketHolderSchema`, and add the corresponding vocabulary/instruction to `activitySystemPrompt` so the model knows to look for and report it per ticket holder when present.
- **Acceptance criteria:** re-import `AE-001` (`FCB679102D6E6915.pdf`); the saved item's `details.ticketHolders` contains both passengers' DNI values (`40384410`, `40386943`), evidence-linked to the correct passenger.
- **Regression test:** `test_V6_F56_ticket_holder_dni_captured`, asserting `ticketHolders[0].dni`/`ticketHolders[1].dni` equal the frozen `AE-001` values.
- **Group:** A.

### V6-F57 — `ticketHolders`/`amount`/`currency` captured but never rendered

- **Observed:** `smartImportActivityResultToSuggestion` (`src/activity-import-adapter.js` lines 44–50, 115) correctly maps `draft.ticketHolders` and `values.amount`/`values.currency` into `proposed.details`. Neither `proposalFields()`, `smartEvidencePanel()` (both `src/v5-app.js`) nor `detailView()` ever reads any of it. Confirmed uniform across five tested cases (`AE-001`, `AE-002`, `AE-004`, `AE-005`, `AE-006`) — not case-specific.
- **Required:** the suggestion review screen and the saved item detail view must render `details.ticketHolders` (per-holder name/seat-section/ticket-number, and — once `V6-F56` lands — DNI) and `details.amount`/`details.currency` whenever present.
- **Acceptance criteria:** re-import `AE-001`, `AE-002`, `AE-004`, `AE-005`, `AE-006`; each saved item's detail view shows its full frozen per-ticket-holder breakdown and price/currency where the ground truth specifies one.
- **Regression test:** `test_V6_F57_ticket_holders_amount_rendered_in_detail_view`, covering at least `AE-001` (multi-holder + DNI once `V6-F56` lands), `AE-002`/`AE-004` (seat/section), and `AE-005` (amount).
- **Group:** B.

### V6-F58 — regression suite has fixture data it never asserts

- **Observed:** `tests/v6-6-attraction-event-import.mjs` builds fixtures with `AE-005`'s `amount`, and `AE-002`/`AE-004`'s `seatOrSection`, but never asserts any of the three — a coverage gap, not itself proof either way about the underlying feature.
- **Required:** every frozen field a test already has fixture data for must be asserted, the same way `test_AE001` already asserts `ticketHolders[0].seatOrSection`/`ticketNumbers`.
- **Acceptance criteria:** `test_AE005_order_vs_ticket_number_precision` asserts `suggestion.proposed.details.amount`; `test_AE002_baseline_no_price_in_source` asserts `ticketHolders[0].seatOrSection`; `test_AE004_auditorium_companion_pair_becomes_two_related_items` asserts all three `seatOrSection` values.
- **Regression test:** covered by strengthening the three existing tests named above in place — no new test name required, since this is closing a gap in tests that already exist. Do not implement as separate scope from `V6-F57`; add these assertions in the same pass.
- **Group:** B (folded into `V6-F57`'s implementation pass).

### V6-F59 — `AE-006` title shows the venue name, not the frozen ticket-type label

- **Observed:** `title:activityName` (`src/activity-import-adapter.js` line 101) passes `draft.activityName` straight through with no fallback-to-provider logic — ruled out as an adapter bug by direct inspection. The live extraction's `activityName` for `AE-006` was "WaterLand" (the venue); frozen ground truth is "כניסה לפארק יום" (the ticket-type label). `activitySystemPrompt`'s `activityName` paragraph permits "the venue/attraction **or** event name" with no stated priority when a source shows both, unlike `location`'s explicit property-first discipline.
- **Required:** add an explicit priority rule to `activitySystemPrompt`'s `activityName` paragraph — prefer the specific ticket-type/event label over the bare venue name when the source shows both, mirroring the existing correct `AE-003` worked example ("כניסה למוזיאון").
- **Acceptance criteria:** re-import `AE-006` (`1713265782549_entryTickets_1.pdf`); the saved item's title reads "כניסה לפארק יום", not "WaterLand".
- **Regression test:** `test_V6_F59_ae006_title_is_ticket_type_not_venue_name`.
- **Group:** A.

### V6-F60 — a date-only value's synthetic "12:00" is indistinguishable from a real extracted time

- **Observed:** `dateTime()` (`src/activity-import-adapter.js` line 152) computes `parseTimeValue(time)||'12:00'` — a deliberate, code-level neutral default for a date-only value, confirmed by direct trace (`parseTimeValue('')` returns `''`, `operational-data.js` lines 158–164). `dateMeta.startPrecision:'date'` correctly tracks this distinction, but `fmt()` (`src/v5-app.js` line 37) and every call site, including `detailView()`'s `fmt(item.startAt)` (line 150), never consult it — the hour/minute portion always renders. Generic across every item type that can produce a date-only `startAt`, not Activity-specific.
- **Required:** `fmt()` (or its call sites) must consult `dateMeta.startPrecision` and omit the time portion — or otherwise visually distinguish it — when the underlying value has no real extracted time.
- **Acceptance criteria:** re-import `AE-006`; the saved item's date display shows no time component (or a visibly-distinguished placeholder) rather than an unqualified "12:00". Spot-check one Hotel/Flight item with a date-only value to confirm the fix is generic, not Activity-scoped.
- **Regression test:** `test_V6_F60_date_only_value_not_shown_with_synthetic_time`.
- **Group:** B.

### V6-F61 — `AE-002`'s doubled/English "Purchaser" label

- **Observed:** the saved item shows "Purchaser: Purchaser: אייל בן יצחק." Repository-wide grep for the literal string "Purchaser" returns zero matches in application source, ruling out a hardcoded template string. Root cause: "purchaser"/orderer has no canonical field key in `FIELD_TARGETS`/`activitySystemPrompt`'s vocabulary (same gap class as `V6-F56`'s DNI), so the model's own ad hoc `label`+`rawValue` for this concept falls into `otherFields`→`noteLines` (`src/activity-import-adapter.js` lines 55, 68, 87) with no guard against `rawValue` already containing a copy of the printed label, and no enforced Hebrew-label convention for unmapped fields.
- **Required:** either add a canonical `purchaser`/orderer field with a proper Hebrew UI label to the schema/prompt vocabulary, or strip a `field.label`-prefix from `field.rawValue` before concatenating in the generic `otherFields` fallback (or both).
- **Acceptance criteria:** re-import `AE-002` (`order1955108.pdf`); the saved item shows the purchaser's name with a single, Hebrew-localized label, not a doubled English one.
- **Regression test:** `test_V6_F61_ae002_purchaser_label_not_doubled_not_english`.
- **Group:** B.

### V6-F62 — `activity` items have no attach-existing-document control

- **Observed:** `detailView()`'s actions block (`src/v5-app.js` line 150) renders the attach-document button only for `['hotel','flight'].includes(item.type)`. `activity` (and car/restaurant/insurance) has none. Confirmed as the actual root cause of `AE-003`/`AE-004` never linking as a companion pair — not a duplicate-detection regression; `findPossibleDuplicates` (`src/ingestion.js` lines 88–111) is real, working, tested code, but there was never an attach event for it to fire on, and separately `V6-F63`'s provider-extraction defect would have broken its exact-string match precondition even via the global-Add path.
- **Required:** add an attach-existing-document control for `activity` items, mirroring Hotel's existing pattern (`attach-source` action, `Attach only`/`Attach and extract`).
- **Acceptance criteria:** open a saved `activity` item (e.g. `AE-003`); an attach-document control is present and functions the same way it does on a Hotel item — attaching `AE-004` either surfaces the existing duplicate/companion-detection dialog or successfully links the two as intended by the frozen discovery doc ("two related items or one item with two attached sources").
- **Regression test:** `test_V6_F62_activity_item_has_attach_document_control`.
- **Group:** C.

### V6-F63 — `provider` has no venue-vs-ticketing-platform priority guidance

- **Observed:** `AE-003` shows `provider:"SmarTicket.co.il"`, `AE-004` shows `provider:"SmarTicket"` — two different strings for the identical venue, neither matching the frozen "Bloomfield Science Museum Jerusalem." Unlike `activityName`/`location`, `provider` has zero prompt guidance beyond the bare schema type declaration (`provider:{type:'string'}`) — confirmed by full-text search of `activitySystemPrompt`.
- **Required:** add an explicit provider-priority paragraph to `activitySystemPrompt`, establishing that the venue/organizer is `provider` and a separate ticket-selling platform is a distinct "sold via" concept — while preserving `AE-002`'s correct precedent, where the ticketing platform genuinely is the provider (a source-dependent distinction, not a fixed rule).
- **Acceptance criteria:** re-import `AE-003` and `AE-004`; both show `provider:"Bloomfield Science Museum Jerusalem"` (or an equivalent venue-first value), consistent with each other. Re-import `AE-002`; `provider` still correctly shows the ticketing platform (`EventBuzz`), confirming the fix didn't regress the source-dependent case.
- **Regression test:** `test_V6_F63_provider_prefers_venue_over_platform`, covering both the `AE-003`/`AE-004` venue-preferred case and the `AE-002` platform-is-provider case.
- **Group:** A.

### V6-F64 — `AE-004` location drops the venue name, keeps only the sub-venue

- **Observed:** `AE-004`'s `location` shows only "אודיטוריום" (Auditorium); frozen ground truth is "Bloomfield Science Museum Jerusalem, Auditorium (אודיטוריום)" — venue and sub-venue combined. `AE-003` (same venue, general entrance) correctly shows the full museum name. `activitySystemPrompt`'s `location` paragraph establishes property-first discipline and a separate `meeting_point` field, but has no instruction for combining a venue name with a stated sub-venue/room within it.
- **Required:** add a sub-venue-combination instruction to `activitySystemPrompt`'s `location` paragraph — when a source names both a venue and a specific room/hall/sub-venue within it, combine them rather than reporting only the sub-venue.
- **Acceptance criteria:** re-import `AE-004`; the saved item's `location` reads "Bloomfield Science Museum Jerusalem, Auditorium" (or an equivalent combined value), not "אודיטוריום" alone.
- **Regression test:** `test_V6_F64_ae004_location_combines_venue_and_subvenue`.
- **Group:** A. **Severity: High** (elevated from an initial Medium proposal at Product Owner request — location accuracy is one of Decision 4's explicit no-omission blockers for the `activity` item type, not a required-when-present field, so this fails a hard project rule).

### V6-F65 — `AE-007` provider/location show a specific venue name absent from the source's legible plain text

- **Observed:** both `provider` and `location` show "גן החיות התנ״כי ירושלים" (Jerusalem Biblical Zoo). Frozen ground truth, and direct inspection of the actual source image (`tests/fixtures/attraction_benchmark/AE-007_zoo_ticket_screenshot.png`), confirm two independent legible plain-text occurrences on the source (the ticket's own body text, and the PDF-viewer's filename title bar) both show only the generic "גן החיות" label. Google Places lookup was ruled out as a possible source of the more specific name, directly from code: `validatePlace()` (`netlify/functions/_shared/place-validation.mjs` line 24) echoes back the originally-extracted `name`, never the Places API's own canonical `displayName`, and `provider` is never touched by place validation at all. This is a likely violation of `activitySystemPrompt`'s existing general anti-fabrication instruction, not a missing guardrail — the instruction is already present and correct. One unresolved detail — a small stylized decorative logo graphic on the ticket that could not be read with confidence at available resolution — remains a caveat but does not block treating this as confirmed, per Product Owner decision.
- **Required:** the model must not substitute a specific real-world venue identity for what the source's legible text/graphics actually show. Since the general anti-fabrication instruction already exists and this is a live-model compliance gap rather than a missing rule, the fix approach is necessarily softer than a schema change: strengthen `activitySystemPrompt`'s anti-fabrication language with a concrete negative example drawn from this exact case (a generic label like "גן החיות" must not be upgraded to a specific brand name absent from the source), and/or lower the model's willingness to complete a recognizable logo/pattern from general knowledge. Treat this fix as best-effort mitigation, not a guaranteed structural closure the way `V6-F56`'s schema fix is — a live-model compliance issue may recur even after a prompt strengthening, which is a materially different risk profile from the rest of Group A.
- **Acceptance criteria:** re-import `AE-007` (`AE-007_zoo_ticket_screenshot.png` / `image.png`); the saved item's `provider`/`location` show the generic "גן החיות" label (or are flagged `needs_review` if the model is genuinely uncertain), not a specific brand name absent from legible source text.
- **Regression test:** `test_V6_F65_ae007_no_fabricated_venue_name`, asserting `provider`/`location` do not contain a specific brand string when the fixture's source text is generic-only. Note in the test's own comment that this is a live-model-behavior regression test with an inherent ceiling on what a deterministic fixture-based test can prove — it verifies the adapter/prompt change is present and testable, not that the live model will never regress.
- **Group:** A.

## 4. Excluded scope — explicit, not silent

- Nothing else from the first `0.6.6` acceptance session is in `0.6.6.1`'s scope — every finding investigated during that session now has an explicit disposition: `V6-F52`/`V6-F53` are **Fixed, verified** (no correction-package action); `V6-F54` is **merged into `V6-F55`** (in scope as part of `V6-F55`, not as its own separate item); `V6-F45`–`V6-F48` (the earlier `0.6.5` Production log items folded into `0.6.6`'s own scope) required no `0.6.6` action and remain outside this package too, unchanged.
- No new feature work is in scope. This package is corrections only against the `0.6.6` Attraction/Event baseline — no Restaurant, Insurance, or shared-Trip work is pulled forward.
- The one explicitly-accepted, non-blocking `0.6.6` gap (no official venue/museum/OTA URL tested end-to-end) is unaffected by this package and remains open against `0.6.6`'s own acceptance record, not reopened or expanded here.

## 5. Package content (per the standard's "Package content" section)

- changed application files implementing the eleven fixes above;
- automated tests: at least eleven named regression tests total — one per finding in section 3 (`V6-F58`'s coverage gap is closed by strengthening three existing tests in place, not a new named test, per its own entry above);
- the current revision of `docs/process/VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`;
- `docs/versions/V6/0.6.6.1/` lifecycle documents, including this scope document and the new executable test session (section 7);
- the approved delivery plan: `docs/roadmap/MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` (current-state document per the current-state/history split rule);
- a single installation script: `install_V6_0_6_6_1.ps1`;
- a rollback script: `rollback_V6_0_6_6_1.ps1`;
- an executable test session (section 7).

## 6. Deployment contract

Mirrors the `0.6.1`–`0.6.6` pattern established in `docs/process/VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`:

- installer accepts the installed `0.6.6` QA handoff on `version/V6`, because it replaces the complete runtime and Netlify Functions;
- installer takes a timestamped external rollback backup before any change;
- configuration/deployment uses the existing fixed `qa` alias and `--no-build` deployment of the untouched built artifact — no new version-specific alias is created;
- the Product Owner email (`eyalby@gmail.com`) is automatically retained in the active invitation allowlist; additional invitees are merged, not replaced;
- Production (Alpha 0.6.5) remains unchanged and blocked from promotion until explicit Product Owner GO on `0.6.6.1`'s own acceptance session — and, per `0.6.6`'s own still-open candidate status, `0.6.6`'s acceptance is not itself considered closed until `0.6.6.1`'s corrections are also accepted, since `0.6.6.1` corrects defects found during `0.6.6`'s own acceptance testing rather than shipping as an independent, separately-GO'd release.

## 7. New executable test session (not yet created)

A new `EXECUTABLE_TEST_SESSION` document for `0.6.6.1` should be created once the package is built and ready for Product Owner acceptance — not before, per the acceptance-session-completion rule. It must include:

- one numbered test per fixed finding (eleven tests, using the acceptance criteria in section 3 as the PASS criteria), grouped to match sections 2/3 above (Group A, Group B, Group C, and the standalone warning-lifecycle finding) so retesting can proceed group-by-group if convenient;
- a short regression pass re-confirming `V6-F52`/`V6-F53` remain fixed (already verified, but cheap to reconfirm alongside a fresh build) and covering the `0.6.6` benchmark cases not directly touched by this package (`AE-002` beyond its purchaser-label fix, `AE-005`, `AE-006` beyond title/time) so `0.6.6.1` does not silently regress anything `0.6.6` got right;
- explicit acknowledgment in the session's own text that `V6-F65`'s regression test has an inherent live-model-behavior ceiling (per its section 3 entry) — the Product Owner's real-source retest of `AE-007` is the acceptance criterion that actually matters for this one finding, not just the automated test passing.

## 8. Next step

This document is the approved input for implementation. Once the Development Agent has built and packaged `0.6.6.1` against this scope, the next controlled-document action is creating the `EXECUTABLE_TEST_SESSION` document described in section 7 and beginning Product Owner acceptance testing.
