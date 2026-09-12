# Family Trips Alpha 0.6.7 — Executable Acceptance Test Session

**Document revision:** `V2`
**Candidate:** `0.6.7` (Insurance Smart Import, plus `V6-F74` already implemented in `V81`), installed on `version/V6`, deployed to the fixed `qa` alias
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V52.md`; do not assign a finding to a version until the whole session is complete.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V2 | 2026-09-09 | Session completed by the Product Owner against build `0.6.7-20076681` on `qa` (session number `V1`, opened as a new per-candidate session sequence for `0.6.7`). Result: **10/14 PASS, 4 FAIL. NO-GO** (see below). All 14 results recorded verbatim from the Product Owner's own written report. Seven findings registered, `V6-F75`–`V6-F81` — full detail in `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V83`'s finding register, not repeated here. A focused correction package, `0.6.7.1`, is now implemented; a new, complete run of this same session against the `0.6.7.1` build is required before GO/NO-GO is reconsidered — this document is not itself re-used for that session (a new candidate build gets a fresh, complete pass, not a retest of only the four original failures). |
| V1 | 2026-09-09 | Initial session drafted by the Development Agent, 14 tests, all results blank pending the Product Owner's run. |

---

## Session result summary

**Result: NO-GO**, decided by the Product Owner. `V6-F78` (Test 6, the mandatory `INS-006` wild-card) is a hard blocker — `.tif` upload rejected entirely at both entry points, so the mandatory non-canonical wild-card test required by the standard's own wild-card rule could not be evaluated at all. Three additional FAILs (`V6-F75`, `V6-F76`/`V6-F77`, `V6-F81`) are real but non-blocking data-accuracy and UI gaps. `0.6.7` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

---

## Part 1 — Insurance Smart Import benchmark (`tests/fixtures/insurance_benchmark/INS-001`–`INS-008`)

For each test: use the global **+** → Document (or an existing Insurance item's Attach-and-extract), upload the named file, confirm **Analyze and propose item**, and compare the resulting proposal against the expected values below — every field in "Expect", plus: is the title meaningful (the insurer's name, not a filename)? Is any warning shown accurate and not misleading? Is any expected `needs_review` flag actually present where the discovery document calls for one?

### Test 1 — `INS-001_Direct_Insurance.pdf`

**Expect:** Provider "ביטוח ישיר"; policy number `1595783600`; coverage 03/02/2023–07/02/2023; insured: Eyal Ben Yitzhak, ID `043119213`, DOB 19/05/1981; emergency phone `972-3-5655999`; the separate claims/office fax (`03-5555545`) and sum insured ($5,000,000) appear in notes, not as the phone field or a new structured field. **Known extraction limitation, expected, not a defect:** this source PDF's font has no usable ToUnicode mapping, so Hebrew label prose may not extract reliably even though the numeric/date fields above do — confirm the numeric/date fields are still correct, and that any Hebrew prose the model could not confidently read is flagged `needs_review` or left unresolved, not guessed.

**Result:** ☑ FAIL — Policy number, coverage dates, insured person all correct. Phone confirmed correct (+972-3-5655999). Provider resolved to "IDI Insurance Company Ltd." instead of frozen "ביטוח ישיר," with no needs_review flag (`V6-F75`). Insurer website landed in notes instead of the structured link field (`V6-F76`).

### Test 2 — `INS-002_Harel.pdf`

**Expect:** Provider "Harel Insurance Company Ltd."; policy number `765720708226`; coverage 12/07/2026–19/07/2026; **two** insured travelers — Eyal Ben Yitzhak (ID `43119213`, DOB 19/05/1981) and Daniel Ben Yitzhak (ID `220990485`, DOB 20/09/2011), each their own entry, not merged; emergency phone `972-3-7547030`.

**Result:** ☑ FAIL — Provider, policy number, coverage dates, both insured travelers (correctly separated), and phone all correct. Insurer website again in notes not link field (`V6-F76`, recurring). Link/website field missing entirely from the edit form at initial proposal review, appearing only after save+reopen (`V6-F77`).

### Test 3 — `INS-003_PassportCard.pdf`

**Expect:** A confirmation-letter shape (no premium/invoice content at all — this is expected, not a gap). Policy number `306117447`; coverage 28 Nov 2022–02 Dec 2022; two insured travelers — Kohan Paola (ID `303597751`) and Ben Yitzhak Daniel (ID `220990485`); emergency phone `+972-98920930`.

**Result:** ☑ FAIL — Confirmation-letter shape, policy number, coverage dates, both travelers (with correct IDs/DOBs), and phone all correct. Provider resolved to "DavidShield Insurance Company LTD" alone (discovery doc's catalogued value is the combined "PassportCard / DavidShield Insurance Company Ltd."), but correctly flagged needs_review with an honest explanation rather than silently guessed (`V6-F81`).

### Test 4 — `INS-004_Phoenix.pdf` (insurer-vs-agent case)

**Expect:** Provider resolves to "Phoenix Insurance Company Ltd." — **not** "Wobi Insurance Agencies Ltd.", the selling agent named on the same document (Wobi should appear in notes instead). Policy number `21/121/667/1017370`; coverage 17/06/2021–20/06/2021; emergency phone `+972-3-7331177` (MEDASSIS) — the separate office-hours-only customer-service line (`03-7338141`) must land in notes, not phone.

**Result:** ☑ PASS — Provider correctly resolved to "The Phoenix Insurance Company Ltd." (not Wobi, the selling agent, which correctly landed in notes). Policy number, coverage dates, and phone (+972-3-7331177, confirmed by tapping the field) all correct. Insurer website again in notes not link field (`V6-F76`, recurring). **Documentation correction found:** the discovery document's catalogued customer-service number (03-7338141) was itself wrong — the source confirms 03-7332222, which the app extracted correctly.

### Test 5 — `INS-005_Wobi.pdf` (largest real family case)

**Expect:** A booking/order confirmation shape (order number `2505025810020552`, not a final policy document). Coverage 14/08/2025–26/08/2025. **All five** named travelers captured, none dropped: Eyal Ben Yitzhak, Paola Cohen, Amit Ben Yitzhak, Daniel Ben Yitzhak, Ofri Ben Yitzhak. Emergency phone `+972-3-7547030` — the same hotline as Test 2's Harel document, a useful cross-check.

**Result:** ☑ PASS — Order number, coverage dates, all five travelers (none dropped), and phone all correct, including the correct Wobi-vs-emergency-hotline distinction, explicitly reasoned in the app's own evidence. **Documentation correction found:** the discovery document's catalogued IDs for Daniel and Amit Ben Yitzhak were swapped — confirmed correct values are Daniel `220990485` (consistent with `INS-002`/`INS-003`), Amit `340255835`. The app's extraction was correct; the document was wrong.

### Test 6 — `INS-006_TorenInsurance.tif` (MANDATORY WILD-CARD)

This is the required non-canonical wild-card test per the standard's mandatory-wild-card rule — run it as its own numbered test, not folded into general notes. Upload as an image/scan (a bi-level TIFF with no text layer at all — the only non-born-digital, non-PDF source in this benchmark, from 2010, a genuinely different template era from every other case).

**Expect:** Provider resolves to "Clal Insurance Company Ltd." — **not** "Toren Insurance Agencies", even though Toren's own name is visually more prominent on the document than Clal's (the sharpest insurer-vs-agent case in this benchmark; Toren should appear in notes). Policy number `220008858030`; coverage 31/03/2010–03/04/2010 (a 2010 document — must extract exactly as printed, never rejected or "corrected" as implausible). **Two cleanly-separated phone numbers on the source:** the claims center (`03-9420413`, office hours) must land in notes; the emergency center (`972-3-9221088`, 24-hour I.M.A.) must land in phone — this is the cleanest real evidence in the whole benchmark for the emergency-over-claims priority rule, confirm it holds.

**Result:** ☑ FAIL — BLOCKING. Cannot be evaluated at all. Uploading the .tif file via both global Add → Document and an existing item's Attach-and-extract fails immediately with "יש לבחור קובץ PDF או תמונה" (must choose a PDF or image), even though the file is selected. Confirmed systemic across both entry points (`V6-F78`). Directly contradicts Decision 7's confirmed scope, which explicitly includes .tif/scanned images.

### Test 7 — `INS-007_DiveAssure_screenshot.png` (dedicated, activity-linked; image-format case)

Upload as an image (not PDF) — via gallery/file selection of the PNG screenshot.

**Expect:** Provider "DiveAssure"; policy number `1629463`; coverage 10/10/2025–10/10/2025 (**identical** start and end date — a single day of diving coverage, not an error to "correct" into a wider range). Confirm the saved item does **not** appear on the Timeline or Today page for 10/10/2025 — see Part 3 below for the full check.

**Result:** ☑ PASS — Provider, policy number, and single-day coverage date (Oct 10, 2025 both start and end, correctly not "corrected" into a range) all correct. Genuine DiveAssure/DiveSafe brand ambiguity correctly flagged needs_review with an honest explanation, matching the discovery document's own disclosed caveat.

### Test 8 — `INS-008_Invoice_NG74HYX4INS_RentalCover.pdf` (dedicated, asset-linked; no-phone case)

**Expect:** Reference/confirmation number `NG74-HYX4-INS`; coverage 14/08/25–26/08/25 (the rental-car period, narrower than the whole trip — note this exact date range matches Test 5's Wobi document, both belong to the same real trip). Excess/damage limit ₪260,600.00 in notes (an ILS amount, not USD — confirm the currency is shown as printed, not silently converted or assumed USD). **No phone number anywhere** — confirm the phone field is genuinely empty (not a fabricated number) and the claims URL (`www.rentalcover.com/en/claim`) is preserved, in notes or the website field.

**Result:** ☑ PASS — Reference number, coverage dates (matching INS-005's dates, as expected), ILS excess/damage limit preserved without currency conversion, and claims URL preserved in notes all correct. Phone genuinely empty with an honest needs_review note rather than a fabricated number. Provider resolved to "RentalCover.com," flagged needs_review, matching the discovery document's own anticipated fallback for this three-party ambiguity.

---

## Part 2 — `relatedItemIds` two-way link UI (Section 3a)

Run this after approving at least one Insurance item (e.g. Test 7's DiveAssure) and having at least one non-insurance item already in the trip (e.g. an existing Activity or Car item for the same trip).

### Test 9 — Linking from the insurance item

Open the DiveAssure insurance item's detail page. Confirm a "פריטים מבוטחים" (insured items) section is visible, listing every other item in the trip as a checkbox — none pre-checked yet. Check the box for a real diving-related Activity item (or any other item, since the picker should not restrict by type). Confirm the item now appears as a tappable row above the checklist, and tapping it navigates to that item's own detail page.

**Result:** ☑ PASS — Confirmed working correctly with a genuine non-insurance item (a Flight item). Initial test attempt used two Insurance items, which is out of the mechanism's documented scope (Section 3a's reverse lookup applies to non-insurance items) — not a defect, just a retest with the right item type. **Finding:** the picker offers other Insurance items as link targets, which the Product Owner considers not meaningful and would prefer excluded (`V6-F79`, product-decision item, not a bug against the frozen spec).

### Test 10 — Reverse lookup from the covered item

From the item you just linked (navigated to in Test 9), confirm its own detail page now shows a small "🛡️ מבוטח באמצעות DiveAssure" line. Tap it and confirm it navigates back to the DiveAssure insurance item.

**Result:** ☑ PASS — "🛡️ מבוטח באמצעות..." line appeared correctly and navigated back to the insurance item.

### Test 11 — Unlinking

Return to the DiveAssure item and uncheck the same item in the checklist. Confirm it disappears from the "insured items" list, and — back on the covered item's own detail page — the "🛡️ מבוטח באמצעות..." line is gone.

**Result:** ☑ PASS — Unchecking the item correctly removed it from the insured-items list and cleared the reverse-lookup line on the covered item.

---

## Part 3 — Timeline/Today exclusion (Section 3a's core guarantee)

### Test 12 — No insurance item on Today or Timeline

With at least two saved insurance items (one whole-trip, e.g. Test 2's Harel policy covering the actual trip dates; one dedicated/single-day, e.g. Test 7's DiveAssure), confirm **neither appears** on the Today page or in the date-based Timeline view, even on a date within their own coverage range. Confirm both are visible only via the Insurance category tile in Trip Center. This must hold uniformly — a dedicated policy with real, narrow, in-range coverage dates must not appear on Timeline just because it now has `startAt`/`endAt` populated.

**Result:** ☑ PASS — Insurance category tile in Trip Center correctly lists all 7 insurance items. Today page shows only genuine Timeline items (a flight), not insurance. Calendar/Timeline view for 10/10/2025 (DiveAssure's own single-day coverage date) confirmed "אין אירועים בתקופה" (no events in this period) — the dedicated policy correctly stays off Timeline even on its own coverage date. A "גישה מהירה" (quick access) widget on the Today page, which listed some insurance items, was confirmed by the Product Owner to be pre-existing generic fallback behavior (shown only when no other content exists, unrelated to this feature) — not logged as a finding.

---

## Part 4 — `V6-F74` regression (already implemented in `V81`, confirm alongside this session)

### Test 13 — Confirm a needs-review warning as correct without changing its value

Reproduce a needs-review warning on any saved item (e.g. attach a second, date-conflicting document to an existing Hotel/Insurance item, or trigger an ambiguous-date-labeling `needs_review` flag). On the item's detail page, confirm a "אישור כנכון" (confirm as correct) button appears next to the warning (not just "התעלמות"/dismiss, which should not appear for this warning type). Click it **without editing the underlying field value**. Confirm the warning disappears and the field's value is unchanged.

**Result:** ☑ PASS — "אישור כנכון" (confirm as correct) correctly clears the warning without changing the field value. Separately verified: editing the field's value also correctly clears the warning via the auto-reconciliation path. **Finding:** the warning only offers the confirm-as-correct action, no explicit "this isn't right" affordance — functional workaround exists (edit the value), just not discoverable from the warning itself (`V6-F80`, low priority, polish).

---

## Short regression (confirm nothing else broke)

### Test 14 — Existing verticals unaffected

Spot-check one existing Hotel, Flight, and Attraction/Event item each still open, edit and save correctly, with no new warnings or behavior changes introduced by this package.

**Result:** ☑ PASS — Hotel, Flight, and Attraction/Event items spot-checked — open, edit, and save correctly, no new warnings or behavior changes.

---

## Finding register (summary — full detail in `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V83`)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| `V6-F75` | 1 | Medium-High | `0.6.7.1` — Implemented, awaiting retest |
| `V6-F76` | 1, 2, 4 | Low-Medium | `0.6.7.1` — Implemented, awaiting retest |
| `V6-F77` | 2 | Low-Medium | `0.6.7.1` — Implemented, awaiting retest |
| `V6-F78` | 6 | High/blocking | `0.6.7.1` — Implemented, awaiting retest |
| `V6-F79` | 9 | Low | `0.6.7.1` — Implemented, awaiting retest |
| `V6-F80` | 13 | Low | Accepted, deferred — not implemented |
| `V6-F81` | 3 | Low | `0.6.7.1` — Implemented, awaiting retest |

## Documentation corrections (discovery document, not app findings)

- `INS-004` (Phoenix): catalogued customer-service number `03-7338141` was wrong; corrected `03-7332222`. App's extraction was correct.
- `INS-005` (Wobi): catalogued IDs for Daniel and Amit Ben Yitzhak were swapped. Corrected: Daniel `220990485` (consistent with `INS-002`/`INS-003`), Amit `340255835`. App's extraction was correct.

Both applied to `docs/roadmap/INSURANCE_SMART_IMPORT_DISCOVERY.md`, bumped `V3`→`V4`, independent of the `0.6.7.1` code correction package.

## GO/NO-GO decision

**NO-GO**, decided by the Product Owner. `V6-F78` (Test 6, the mandatory wild-card) is a hard blocker — the `.tif` format explicitly confirmed in scope by Decision 7 cannot be processed at all, so the mandatory non-canonical wild-card test required by the standard's own wild-card rule cannot be completed. Three additional FAILs (`V6-F75`, `V6-F76`/`V6-F77`, `V6-F81`) are real but non-blocking data-accuracy and UI gaps. `0.6.7` is not promoted to Production; `0.6.6.3` remains the accepted Production baseline, unaffected.

**Next step:** the focused correction package `0.6.7.1`, scoped to `V6-F75`–`V6-F81` plus the two discovery-document corrections, is implemented (`version/V6`, commit — see `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V83` for the exact commit SHA once recorded). A new, complete acceptance session against the `0.6.7.1` build is required before any GO decision is reconsidered.

**Follow-up:** that Round 2 session ran against build `0.6.7.1-8e41a683` and is recorded in `EXECUTABLE_TEST_SESSION_V2.md` (this session's own per-candidate sequence, session number `V2`) — result 11/14 PASS, 3 FAIL, NO-GO, leading to the `0.6.7.2` correction package.
