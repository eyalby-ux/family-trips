# Family Trips Alpha 0.7.8 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.8` (Transport Smart Import — AI-driven document extraction for rental car, rail, and ferry/boat, plus `website`/`email` fields on the Transport type and a `TYPE_RULES` heuristic extension for manual rail/ferry/transfer classification), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.8-507024ce`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What this candidate is, worth restating before testing:** Transport (`ITEM_TYPES.car`, with a `transportMode` sub-type: `transfer`/`rail`/`ferry`/`car`/`other`) already existed since `0.7.4`, including Smart Import extraction for rental car. This candidate adds `website`/`email` as fields on the type, extends the manual/free-text classification heuristic to recognize rail/ferry/transfer language, and adds AI-driven extraction for rail and ferry/boat documents (rental car extraction already existed and should be unaffected). **Transfer extraction is explicitly out of scope** — a transfer confirmation should never be offered AI extraction, but a transfer item must still be fully creatable manually, exactly as before.

**Two gaps the Development Agent found and fixed in passing, called out for your review:** `updateSuggestion` never captured `transportMode`/`email` back out of the review form (unreachable before this candidate, since no extraction could ever produce a car-type suggestion needing them); and the attach-source button was never gated open for `car` items at all. Test 3 below is what actually exercises whether these hold up.

## Test 1 — `TYPE_FIELDS.car` gains `website` and `email`

Create or edit a Transport item (any sub-type) and fill in a website and an email address alongside the existing fields (provider, confirmation number, location, phone, etc.). Save.

**Expect:** Both fields are available on the form, save correctly, and display in the detail view — matching how `website`/`email` already behave on other item types (e.g. Hotel, Insurance).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Manual/free-text classification recognizes rail, ferry, and transfer language

Using manual or QR-based item intake (not Smart Import), enter free text referencing rail travel (e.g. a train booking), ferry/boat travel, and a transfer/shuttle, one at a time.

**Expect:** Each auto-classifies as Transport (`car` type) with the appropriate `transportMode` — the same way rental-car language already did before this candidate. This is manual-classification only, not a claim about AI extraction (see Test 5 for why transfer stays excluded there).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — Smart Import extraction: rental car

Attach a rental car confirmation document (PDF or image) to a source, run "Analyze and propose." Confirm the extracted proposal, including `transportMode`/`email`/`website` when present on the document, is captured correctly into the review form and saves properly.

**Expect:** Extraction works correctly, and the two in-passing fixes hold: the review form actually captures `transportMode` and `email` from the extraction (previously unreachable), and the attach-source button is available for `car` items.

**Correction to this document's own framing:** this test was originally labeled "regression — already live since `0.7.4`," following the scope document's own claim. Product Owner's own correction: Smart Import was **not** actually available for rental car at `0.7.4` — this is a first-time test of new functionality, not a regression check. Noted here and flagged below as a documentation-accuracy finding for the scope/discovery record, not a defect in `0.7.8` itself.

**Result:** ☑ PASS — notes: Tested with the Alamo benchmark document (`TR-001`). Extraction and save succeeded.

## Test 4 — Smart Import extraction: rail

Attach `TR-005-Ticket_576743004135_07.12.2025__H.pdf` to a source, run "Analyze and propose."

**Expect:** Extraction produces a Transport proposal with `transportMode: 'rail'`, capturing at minimum provider/operator, confirmation/ticket number, departure station, and departure date/time (no-omission fields), with arrival station/time, train number, platform, seat/coach/class, and price/currency captured when present on the document.

**Result:** ☒ FAIL — BLOCKING. Tested with `TR-005` (Deutsche Bahn ICE ticket). The proposal's own "סוג" (type) field is set to **אטרקציה (Attraction)**, not Transport — confirmed directly by the Product Owner ("this is what the app decided"). This fails the core acceptance criterion outright (a Transport proposal with `transportMode: 'rail'`).

Individual field extraction quality, for the record (despite the wrong type): confirmation/order number `576743004135` correct; supplier `DB` correct; route/stations "Berlin Hbf – Braunschweig Hbf" correct (combined into one location field, not split departure/arrival fields); start date/time `12/07/2025 01:28 PM` correct (matches the ticket's `13:28` departure); price `EUR 79.90` and class ("2nd class") correctly extracted, but only inside the ticket-details/evidence sections — not visible as their own top-level structured fields on the main form the way the scope describes (no separate arrival date/time, train number, or platform field observed on the form itself; "ICE 691" appears in the "Included" evidence text, not a dedicated train-number field). Website field captured `www.bahn.de/agb` (the ticket's terms-page link, not necessarily an official site, but present on the source). A location-verification warning also appeared: "המיקום נשמר כפי שהופיע במקור בלבד; לא אומת מול Google Places" (location saved as-found, not verified against Google Places).

**Root issue to report to the Development Agent: with the type wrong, none of this can be evaluated as a genuine PASS — the classification failure is the blocking issue, with the missing dedicated train-number/platform/arrival-time fields as a secondary concern to raise in the same report.**

## Test 5 — Smart Import extraction: ferry/boat

Attach `TR-006-Ferry_081225_162.5.pdf` (Stena Line, Kiel → Göteborg) to a source, run "Analyze and propose."

**Expect:** Extraction produces a Transport proposal with `transportMode: 'ferry'`, capturing at minimum provider/operator, confirmation number, departure port, and departure date/time, with arrival port/time, vessel name, cabin/seat class, vehicle-carriage details (only if applicable), phone/email, and price/currency captured when present.

**Result:** ☑ PASS — notes: Type correctly classified as תחבורה (Transport) with sub-type מעבורת (Ferry), unlike Test 4's rail defect. Supplier "Stena Line" correct; confirmation number `91040229`; departure port "Kiel" correct; start date/time `12/08/2025 06:45 PM` and end (arrival) date/time `12/09/2025 09:15 AM` both correctly captured as an overnight crossing — including a genuine, dedicated end-date/time field this time (unlike Test 4, where no such field appeared). Phone, email (`eyalby@gmail.com`), and website (`stenaline.de`) all correctly captured. Payment status showed paid-in-full with a masked Mastercard ending 6182 — not a data-handling concern, matches the discovery document's own flagged payment-card fragment for this document.

## Test 6 — Transfer is excluded from Smart Import extraction, but still fully creatable manually

1. Attach a transfer/shuttle confirmation document (if you have one; a generic taxi/shuttle receipt works for this check) and attempt "Analyze and propose."
2. Separately, create a transfer item manually (not via Smart Import) — confirm this still works exactly as before.

**Expect:** Step 1: no extraction is offered/classified as a transfer Transport proposal — this is a real acceptance criterion, not just an unverified omission. Step 2: manual transfer creation is completely unaffected.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — A Transport line item embedded inside a Hotel document stays under Hotel

Attach `WC-001-WhatsApp Image 2026-09-26 at 17.50.21.jpeg` (the hotel-folio/card-slip composite, with its "SHUTTLE" line item) as a source and run extraction.

**Expect:** The transport line item is not pulled out into a separate Transport proposal — it stays as part of the Hotel extraction, exactly as scoped.

**Result:** ☐ Not independently verified — notes: The document produced **no proposal of any kind** — the app's own message: "לא זוהה מסמך מלון, טיסה, אטרקציה, ביטוח או תחבורה במקור. לא נוצרה הצעה. המקור המקורי נשמר ולא נוצר פרט" (no hotel/flight/attraction/insurance/transport document identified in the source; no proposal created; the source itself was saved). Confirmed the correct file (`WC-001`) was attached. Since nothing was extracted at all — not a Hotel proposal, not a wrongly-split Transport proposal — this test cannot confirm or deny its actual question (whether Transport wrongly pulls the shuttle line out of Hotel). Product Owner's own call: mark as **not independently verified**, and log the total non-recognition as its own finding for investigation, rather than let it block `0.7.8`'s own GO/NO-GO, since it reads as a general document-recognition gap on this specific composite image rather than a Transport-specific defect.

## Test 8 — Regression: nothing else is affected

Spot-check an existing Hotel, Flight, or Insurance item's own detail view and Smart Import flow to confirm they behave exactly as before, and confirm a plain manual Transport item (car sub-type) created before this candidate still opens and edits correctly.

**Expect:** No unintended side effects outside this candidate's own scope.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| The scope document (`FAMILY_TRIPS_ALPHA_0_7_8_SCOPE_V1.md`) and this test session's own original wording both stated rental-car Smart Import was "already live since `0.7.4`." Product Owner's own correction: it was not actually available at `0.7.4`. | Test 3 | Non-blocking (documentation accuracy) | Reported by Product Owner 2026-09-26. Not a `0.7.8` defect — flagged for the planning assistant to correct the historical record. |
| Rail extraction (`TR-005`) classifies the resulting item as Attraction, not Transport — the `transportMode: 'rail'` classification fails outright. Secondary: no dedicated arrival date/time, train number, or platform field observed on the form itself (values are present only inside notes/evidence text). | Test 4 | **Blocking** | Reported by Product Owner 2026-09-26. **NO-GO on this candidate pending a fix.** To be sent to the Development Agent for investigation and correction. |
| `WC-001` (the hotel-folio/card-slip composite wild-card) produces no proposal of any kind — "no hotel/flight/attraction/insurance/transport document identified" — rather than a Hotel proposal with the shuttle line item retained. | Test 7 | Non-blocking for `0.7.8` specifically (reads as a general document-recognition gap, not confirmed Transport-specific) | Reported by Product Owner 2026-09-26. **Logged for investigation**, not counted toward this candidate's own GO/NO-GO. To be included in the same report to the Development Agent as Test 4, for their own root-cause judgment on whether it's related. |

## GO/NO-GO decision

**NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-26. 6 of 8 tests PASS: `website`/`email` fields on the Transport type (Test 1), the manual/free-text rail/ferry/transfer classification heuristic (Test 2), rental car extraction (Test 3, with a documentation correction — it was not actually live since `0.7.4` as the scope document claimed), ferry/boat extraction (Test 5), the transfer-exclusion criterion and unaffected manual transfer creation (Test 6), and general regression (Test 8).

**Blocking:** Test 4 — rail extraction (`TR-005`) classifies the resulting item as **Attraction**, not Transport; the core `transportMode: 'rail'` acceptance criterion fails outright. Secondary, same test: no dedicated arrival date/time, train number, or platform field observed on the form (values only appear in notes/evidence text).

**Also logged, not itself blocking:** Test 7 — `WC-001` (the mandatory wild-card) produced no proposal of any kind, so the specific Hotel-vs-Transport question it was meant to test remains not independently verified. Logged for the Development Agent's own investigation alongside Test 4, since it may or may not be related.

`0.7.8` does not proceed to Production. A correction is needed for the rail misclassification (and the missing rail-specific fields), with the Development Agent asked to also investigate the `WC-001` non-recognition in the same pass. A fresh acceptance session will follow the next build.

## Round 2 — Test 4 root-caused and fixed; Test 7 (`WC-001`) investigated, not fixed

**Investigated, not guessed:** the classification prompt's own TRANSPORT description was a single terse clause appended at the end of an already-long list, with far less descriptive detail than ATTRACTION/EVENT's own paragraph — both categories' documents are commonly labelled "ticket," a plausible real cause for the model pattern-matching toward the more elaborately described category instead of the correct one.

**Fixed** (commit `f1dbb2e`): `classificationSystemPrompt` gives TRANSPORT its own paragraph with the same level of detail as every other category, plus an explicit negative-disambiguation rule naming this exact confusion (a rail/ferry ticket is TRANSPORT, never ATTRACTION/EVENT, regardless of language or the word printed on the document — explicitly covers German-language documents like `TR-005`'s own "Fahrkarte"-style wording).

**Test 4's own secondary finding (missing arrival time/train number/platform fields) needs no separate fix** — it's a downstream symptom of the same misclassification, not an independent bug: once the wrong category (Activity) was chosen, the *entire wrong extractor* ran, whose own schema has no arrival-time/train-number concept at all. The Transport adapter's own field mapping (including `endAt`) is already confirmed correct via Test 5 (ferry), which shares the identical adapter code path and passed cleanly.

**Test 7 (`WC-001`) investigated per the correction's own request, not fixed:** confirmed `WC-001` has never appeared anywhere in this repository before `0.7.8`'s own discovery process supplied it — it was never part of Hotel Smart Import's original Alpha 0.6 benchmark set. This is very likely a pre-existing document-recognition limitation on a genuinely hard, novel composite photo (two documents stapled together), never previously exercised against Smart Import at all, not a regression `0.7.8` introduced. Left unfixed, per the correction's own explicit instruction not to fold in an unrelated issue.

**This fix could not be verified against the live model from this environment** (no API access) — a prompt-quality fix, the same as every other live-model classification/extraction defect this project has handled, needs the Product Owner's own next acceptance-session retest.

**A new `qa` build was deployed** (build `0.7.8-f1dbb2e5`) — please retest Test 4 (rail, `TR-005`) against this build, expecting a correctly classified Transport/rail proposal with a real `endAt` field this time. Test 7 (`WC-001`) may be retested too, though it's logged as a separate, non-blocking matter either way.

## Production promotion

Not applicable — superseded by the NO-GO above. Recorded once a corrected `0.7.8` (or `0.7.8.1`) reaches GO.
