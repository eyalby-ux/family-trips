# Family Trips Alpha 0.6.7 — Executable Acceptance Test Session

**Document revision:** `V1` (session number `V1`, opening a new per-candidate session sequence for `0.6.7`)
**Candidate:** `0.6.7` (Insurance Smart Import, plus `V6-F74` already implemented in `V81`), installed on `version/V6`, deployed to the fixed `qa` alias
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V34.md`; do not assign a finding to a version until the whole session is complete.

---

## Part 1 — Insurance Smart Import benchmark (`tests/fixtures/insurance_benchmark/INS-001`–`INS-008`)

For each test: use the global **+** → Document (or an existing Insurance item's Attach-and-extract), upload the named file, confirm **Analyze and propose item**, and compare the resulting proposal against the expected values below — every field in "Expect", plus: is the title meaningful (the insurer's name, not a filename)? Is any warning shown accurate and not misleading? Is any expected `needs_review` flag actually present where the discovery document calls for one?

### Test 1 — `INS-001_Direct_Insurance.pdf`

**Expect:** Provider "ביטוח ישיר"; policy number `1595783600`; coverage 03/02/2023–07/02/2023; insured: Eyal Ben Yitzhak, ID `043119213`, DOB 19/05/1981; emergency phone `972-3-5655999`; the separate claims/office fax (`03-5555545`) and sum insured ($5,000,000) appear in notes, not as the phone field or a new structured field. **Known extraction limitation, expected, not a defect:** this source PDF's font has no usable ToUnicode mapping, so Hebrew label prose may not extract reliably even though the numeric/date fields above do — confirm the numeric/date fields are still correct, and that any Hebrew prose the model could not confidently read is flagged `needs_review` or left unresolved, not guessed.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 2 — `INS-002_Harel.pdf`

**Expect:** Provider "Harel Insurance Company Ltd."; policy number `765720708226`; coverage 12/07/2026–19/07/2026; **two** insured travelers — Eyal Ben Yitzhak (ID `43119213`, DOB 19/05/1981) and Daniel Ben Yitzhak (ID `220990485`, DOB 20/09/2011), each their own entry, not merged; emergency phone `972-3-7547030`.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 3 — `INS-003_PassportCard.pdf`

**Expect:** A confirmation-letter shape (no premium/invoice content at all — this is expected, not a gap). Policy number `306117447`; coverage 28 Nov 2022–02 Dec 2022; two insured travelers — Kohan Paola (ID `303597751`) and Ben Yitzhak Daniel (ID `220990485`); emergency phone `+972-98920930`.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 4 — `INS-004_Phoenix.pdf` (insurer-vs-agent case)

**Expect:** Provider resolves to "Phoenix Insurance Company Ltd." — **not** "Wobi Insurance Agencies Ltd.", the selling agent named on the same document (Wobi should appear in notes instead). Policy number `21/121/667/1017370`; coverage 17/06/2021–20/06/2021; emergency phone `+972-3-7331177` (MEDASSIS) — the separate office-hours-only customer-service line (`03-7338141`) must land in notes, not phone.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 5 — `INS-005_Wobi.pdf` (largest real family case)

**Expect:** A booking/order confirmation shape (order number `2505025810020552`, not a final policy document). Coverage 14/08/2025–26/08/2025. **All five** named travelers captured, none dropped: Eyal Ben Yitzhak, Paola Cohen, Amit Ben Yitzhak, Daniel Ben Yitzhak, Ofri Ben Yitzhak. Emergency phone `+972-3-7547030` — the same hotline as Test 2's Harel document, a useful cross-check.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 6 — `INS-006_TorenInsurance.tif` (MANDATORY WILD-CARD)

This is the required non-canonical wild-card test per the standard's mandatory-wild-card rule — run it as its own numbered test, not folded into general notes. Upload as an image/scan (a bi-level TIFF with no text layer at all — the only non-born-digital, non-PDF source in this benchmark, from 2010, a genuinely different template era from every other case).

**Expect:** Provider resolves to "Clal Insurance Company Ltd." — **not** "Toren Insurance Agencies", even though Toren's own name is visually more prominent on the document than Clal's (the sharpest insurer-vs-agent case in this benchmark; Toren should appear in notes). Policy number `220008858030`; coverage 31/03/2010–03/04/2010 (a 2010 document — must extract exactly as printed, never rejected or "corrected" as implausible). **Two cleanly-separated phone numbers on the source:** the claims center (`03-9420413`, office hours) must land in notes; the emergency center (`972-3-9221088`, 24-hour I.M.A.) must land in phone — this is the cleanest real evidence in the whole benchmark for the emergency-over-claims priority rule, confirm it holds.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 7 — `INS-007_DiveAssure_screenshot.png` (dedicated, activity-linked; image-format case)

Upload as an image (not PDF) — via gallery/file selection of the PNG screenshot.

**Expect:** Provider "DiveAssure"; policy number `1629463`; coverage 10/10/2025–10/10/2025 (**identical** start and end date — a single day of diving coverage, not an error to "correct" into a wider range). Confirm the saved item does **not** appear on the Timeline or Today page for 10/10/2025 — see Part 3 below for the full check.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 8 — `INS-008_Invoice_NG74HYX4INS_RentalCover.pdf` (dedicated, asset-linked; no-phone case)

**Expect:** Reference/confirmation number `NG74-HYX4-INS`; coverage 14/08/25–26/08/25 (the rental-car period, narrower than the whole trip — note this exact date range matches Test 5's Wobi document, both belong to the same real trip). Excess/damage limit ₪260,600.00 in notes (an ILS amount, not USD — confirm the currency is shown as printed, not silently converted or assumed USD). **No phone number anywhere** — confirm the phone field is genuinely empty (not a fabricated number) and the claims URL (`www.rentalcover.com/en/claim`) is preserved, in notes or the website field.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Part 2 — `relatedItemIds` two-way link UI (Section 3a)

Run this after approving at least one Insurance item (e.g. Test 7's DiveAssure) and having at least one non-insurance item already in the trip (e.g. an existing Activity or Car item for the same trip).

### Test 9 — Linking from the insurance item

Open the DiveAssure insurance item's detail page. Confirm a "פריטים מבוטחים" (insured items) section is visible, listing every other item in the trip as a checkbox — none pre-checked yet. Check the box for a real diving-related Activity item (or any other item, since the picker should not restrict by type). Confirm the item now appears as a tappable row above the checklist, and tapping it navigates to that item's own detail page.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 10 — Reverse lookup from the covered item

From the item you just linked (navigated to in Test 9), confirm its own detail page now shows a small "🛡️ מבוטח באמצעות DiveAssure" line. Tap it and confirm it navigates back to the DiveAssure insurance item.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 11 — Unlinking

Return to the DiveAssure item and uncheck the same item in the checklist. Confirm it disappears from the "insured items" list, and — back on the covered item's own detail page — the "🛡️ מבוטח באמצעות..." line is gone.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Part 3 — Timeline/Today exclusion (Section 3a's core guarantee)

### Test 12 — No insurance item on Today or Timeline

With at least two saved insurance items (one whole-trip, e.g. Test 2's Harel policy covering the actual trip dates; one dedicated/single-day, e.g. Test 7's DiveAssure), confirm **neither appears** on the Today page or in the date-based Timeline view, even on a date within their own coverage range. Confirm both are visible only via the Insurance category tile in Trip Center. This must hold uniformly — a dedicated policy with real, narrow, in-range coverage dates must not appear on Timeline just because it now has `startAt`/`endAt` populated.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Part 4 — `V6-F74` regression (already implemented in `V81`, confirm alongside this session)

### Test 13 — Confirm a needs-review warning as correct without changing its value

Reproduce a needs-review warning on any saved item (e.g. attach a second, date-conflicting document to an existing Hotel/Insurance item, or trigger an ambiguous-date-labeling `needs_review` flag). On the item's detail page, confirm a "אישור כנכון" (confirm as correct) button appears next to the warning (not just "התעלמות"/dismiss, which should not appear for this warning type). Click it **without editing the underlying field value**. Confirm the warning disappears and the field's value is unchanged.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Short regression (confirm nothing else broke)

### Test 14 — Existing verticals unaffected

Spot-check one existing Hotel, Flight, and Attraction/Event item each still open, edit and save correctly, with no new warnings or behavior changes introduced by this package.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

Once all 14 tests are recorded, classify and assign any findings per `VERSION_PACKAGE_AUTHORING_STANDARD_V34.md`'s standing process, and record the GO/NO-GO decision in `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`.
