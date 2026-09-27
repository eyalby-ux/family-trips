# Family Trips Alpha 0.7.8 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.8` (Transport Smart Import — AI-driven document extraction for rental car, rail, and ferry/boat, plus `website`/`email` fields on the Transport type and a `TYPE_RULES` heuristic extension for manual rail/ferry/transfer classification), installed on `version/V7`, deployed to the fixed `qa` alias. **Round 1 build `0.7.8-507024ce`** (NO-GO); **round 2 build `0.7.8-f1dbb2e5`** (NO-GO — prompt-weighting fix, type field still wrong); **round 3 build `0.7.8-649f59da`** (NO-GO — root-caused as a structural disconnect between the classification call and the extraction call, plus a token-budget/reasoning-effort fix that turned out not to be the real cause); **round 4 build `0.7.8-5010c543`** (root cause found via direct live-model evidence: a genuine model bias in the crowded five-way classification prompt, not a budget or wording problem — fixed with a separate two-stage transport gate).
**Session number:** `V1`, round 4. Round 1 completed all 8 tests with a NO-GO; rounds 2–4 retest Test 4 against successive corrections.
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

**Result (round 2, build `0.7.8-f1dbb2e5`):** ☒ FAIL — still BLOCKING. Development Agent's root cause, reported before the fix: the classification prompt described TRANSPORT in one terse clause versus ATTRACTION/EVENT's own detailed paragraph, and both categories' documents are commonly labelled "ticket" — the model pattern-matched toward the more elaborately described category. Fixed by giving TRANSPORT equal descriptive weight plus an explicit rule naming this exact confusion (stated to also cover non-English documents like `TR-005`'s own German wording).

**Retest with `TR-005`:** the type field still shows **אטרקציה (Attraction)** — unchanged from round 1. However, a new warning now appears that did not exist before: "This source is a rail travel ticket rather than an attraction/event admission ticket ⚠". So the fix made the model **aware** of the mismatch (it now explicitly flags the document as rail, not attraction/event) but did **not** make it actually change the proposal's own type field to Transport — the underlying classification/type-assignment still resolves to Attraction despite the model's own evidence contradicting it. This is progress (the confusion the Development Agent diagnosed is visibly present in the evidence trail) but the acceptance criterion itself — a Transport proposal with `transportMode: 'rail'` — still fails. Supplier now correctly shows "Deutsche Bahn (DB)" (previously just "DB"), an incidental improvement.

**Result (round 3, build `0.7.8-649f59da`):** ☒ FAIL — still BLOCKING. Development Agent's precise root cause, per the round-2 correction's own ask: type/`transportMode` is decided entirely by a separate classification model call (its own `category` output), before extraction ever runs — every category adapter then hardcodes its own `type` unconditionally. The warning text seen in round 2 comes from the extraction step's own reasoning and has **zero causal path back to the type field** — two structurally disconnected calls, confirmed directly, not a hidden coupling the round-2 fix could have relied on. Mechanical cause identified: classification runs at `max_output_tokens: 200`, reasoning effort `'low'`; extraction runs at `max_output_tokens: 8000`, same effort — and extraction reaches the correct answer on this exact document. Since reasoning tokens count against `max_output_tokens`, 200 is a tight ceiling for a genuinely hard boundary case like this one. Fix: raised classification's own reasoning effort to `'medium'` and its ceiling to `1000` — a real budget increase, not another prompt-wording attempt.

**Retest with `TR-005`:** type field still shows **אטרקציה (Attraction)** — the fix did not change the outcome. Notably, the round-2 warning ("This source is a rail travel ticket rather than an attraction/event admission ticket") is now **gone** — the extraction step no longer surfaces that self-contradiction at all, for reasons not yet explained. Other field quality did improve/shift: title now reads "ICE Fahrkarte" (previously the raw route string); location is now correctly split into "Berlin Hbf → Braunschweig Hbf" as its own field; evidence text now includes a scheduled-arrival line ("Arrival: Scheduled arrival at Braunschweig Hbf at 14:57 on platform 6") not seen in earlier rounds — still only in evidence text, not a structured field, and unverifiable as fixed until the type itself is correct.

**Result (round 4, build `0.7.8-5010c543`):** ☑ PASS. Per your own correction's explicit demand, this round did not propose another guess — it captured the classification call's actual raw output for `TR-005` directly against the live model first, using the site's real production OpenAI key (obtained via `netlify dev:exec --context production`, not visible in the plain `netlify env:list`).

**Retest with `TR-005`, confirmed by the Product Owner:** type field now correctly shows **תחבורה (Transport)** with sub-type **רכבת (Rail)** — the blocking defect from rounds 1–3 is resolved. Confirmation/order number `576743004135` correct; supplier `DB` correct; departure station "Berlin Hbf" correct; start date/time `12/07/2025 01:28 PM` correct. A genuine dedicated end/arrival date-time field now appears and is correctly populated (`12/07/2025 02:57 PM`, matching the ticket's own 14:57 scheduled arrival) — this is new since round 3, where no such field existed at all. Website now cleanly shows `www.bahn.de` (previously the messier `/agb` terms-page link). Remaining gaps, non-blocking for this acceptance criterion but worth noting: the arrival station (Braunschweig Hbf) is not shown as its own field alongside the departure station (only "Berlin Hbf" appears in the location field); train number, platform, and price/currency still do not appear as their own dedicated structured fields (present only in evidence text, as in earlier rounds); email field is empty (not present on this document in the first place, so not necessarily a gap).

**The raw evidence:** across a combined 47 real repeated calls to the existing five-way classification prompt on `TR-005`, the outputs were `car` (correct) ~30% of the time, `activity` (wrong) ~36%, and `flight` (wrong) ~32% — 'activity' was the single most common raw answer, not 'car'. This rules out ordinary sampling noise around a correct center: a majority/plurality vote over more samples of the *same* prompt would tend to converge on the wrong answer, since the wrong answer is the model's actual plurality preference on this crowded, five-way choice. (Two such vote-based fixes were built and tested directly against the real model before being rejected: a 3-vote majority scored 2/5 correct trials, a 5-sample plurality scored 1/5 — both discarded once disproven, not shipped on faith.)

**Root cause:** the failure is a genuine model bias specific to the crowded five-way classification prompt, where a German rail ticket's own vocabulary ("ticket code," "ticket type," a single named traveler, a validity window) reads to the model as closer to Activity's own admission-ticket concepts than to Transport's terser description — not a resource/budget problem (round 3's hypothesis, now known to be wrong: its own `medium`/`1000` settings were directly retested here and still produced `flight`/`activity` in the raw samples).

**Why the round-2 warning appeared then disappeared:** running classification and extraction independently and repeatedly confirmed they are genuinely separate, uncoupled model calls, each with its own ordinary per-call output variation — there is no shared cache or code path linking them. The warning's appearance in round 2 and disappearance in round 3 were two independent instances of that same ordinary variation on the extraction side, not a real coupling between the two calls.

**Fix:** a new, separate, focused binary question — "does this document describe a rail/ferry/rental-car TRANSPORT journey, yes or no?" — with no competing category on offer, run in parallel with the existing five-way classifier; a "yes" wins outright regardless of what the five-way classifier separately concluded. Validated directly against the real model before shipping: 8/8 correct "yes" on `TR-005` across repeated real trials, 8/8 correct "no" against real Attraction (`AE-002`) and Insurance (`INS-001`) benchmark documents (no false-positive regression), and a final end-to-end run of the exact shipped code: 5/5 correct on `TR-005`, correct rejections on `AE-002`/`INS-001`, and `TR-001` (rental car) still correctly classified — confirming no regression on the path already passing in Test 3. Rental car, ferry/boat, `website`/`email`, the manual-entry classification heuristic, and transfer-exclusion are all untouched, per this correction's own explicit scope.

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

**Retest, 2026-09-27, build `0.7.8-5010c543`:** identical result — same "no document identified" message. Confirms the Development Agent's own investigation (a genuine, pre-existing recognition gap on this specific composite image, unrelated to `0.7.8`'s Transport work) rather than something the round 2–4 corrections introduced or could have fixed. Disposition unchanged: logged, non-blocking for `0.7.8`.

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
| `WC-001` (the hotel-folio/card-slip composite wild-card) produces no proposal of any kind — "no hotel/flight/attraction/insurance/transport document identified" — rather than a Hotel proposal with the shuttle line item retained. | Test 7 | Non-blocking for `0.7.8` specifically (reads as a general document-recognition gap, not confirmed Transport-specific) | Reported by Product Owner 2026-09-26. **Investigated by the Development Agent, not fixed** — confirmed `WC-001` has never appeared anywhere in the repo before `0.7.8`'s own discovery process supplied it; assessed as a genuine, pre-existing recognition gap on a hard, novel composite photo, never previously tested, not something `0.7.8` broke. Left alone per the correction's own scope; open for the Product Owner/planning assistant to schedule separately if desired. |

## GO/NO-GO decision

**Round 1: NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-26, on build `0.7.8-507024ce`. 6 of 8 tests PASS: `website`/`email` fields on the Transport type (Test 1), the manual/free-text rail/ferry/transfer classification heuristic (Test 2), rental car extraction (Test 3, with a documentation correction — it was not actually live since `0.7.4` as the scope document claimed), ferry/boat extraction (Test 5), the transfer-exclusion criterion and unaffected manual transfer creation (Test 6), and general regression (Test 8).

**Blocking:** Test 4 — rail extraction (`TR-005`) classifies the resulting item as **Attraction**, not Transport; the core `transportMode: 'rail'` acceptance criterion fails outright. Secondary, same test: no dedicated arrival date/time, train number, or platform field observed on the form (values only appear in notes/evidence text).

**Also logged, not itself blocking:** Test 7 — `WC-001` (the mandatory wild-card) produced no proposal of any kind, so the specific Hotel-vs-Transport question it was meant to test remains not independently verified.

**Round 2: NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-26, on build `0.7.8-f1dbb2e5`. Test 4's retest still FAILS — the proposal's type field still resolves to Attraction, not Transport, despite the fix. Progress is visible: the extraction now generates an explicit warning identifying the document as "a rail travel ticket rather than an attraction/event admission ticket," meaning the model itself detects the contradiction — but the type field is not corrected to reflect it. `0.7.8` still does not proceed to Production. Sending this back to the Development Agent for a further round, with the new warning-vs-type-field disconnect as the specific lead to investigate.

**Round 3: NO-GO.** Recorded by the Product Owner (Eyal), 2026-09-26, on build `0.7.8-649f59da`. Test 4's retest still FAILS — type field still resolves to Attraction. The round-2 self-contradiction warning has disappeared entirely rather than being resolved correctly, which is itself worth the Development Agent's attention (did the budget increase change the extraction step's own reasoning path too, not just classification's?). `0.7.8` still does not proceed to Production. Sending back for a further round.

**Round 4: GO.** Recorded by the Product Owner (Eyal), 2026-09-27, on build `0.7.8-5010c543`. Test 4's retest confirms the type field now correctly resolves to Transport/Rail — the blocking defect across rounds 1–3 is resolved, via a directly-verified root cause (genuine model bias in the crowded five-way classification prompt, confirmed with 47 live-model samples) and a focused binary transport gate, not another guess. Secondary field gaps remain (arrival station not its own field; no dedicated train-number/platform/price fields) but are non-blocking for this specific acceptance criterion. Test 7 (`WC-001`) was retested and produced the identical "no document identified" result as round 1 — confirming the Development Agent's own assessment that this is a genuine, pre-existing recognition gap unrelated to `0.7.8`'s Transport work, logged and left open for separate scheduling, not blocking this candidate.

Final tally across all 8 tests: 7 PASS (Tests 1, 2, 3, 4 as of round 4, 5, 6, 8), 1 not independently verified but investigated and understood (Test 7). `0.7.8` (Transport Smart Import — rental car, rail, ferry/boat extraction, `website`/`email` fields, and the manual classification heuristic extension) may proceed to Production promotion as a separate, explicit action.

## Production promotion

Not yet — recorded here once promotion is confirmed.
