# TRANSPORT_SMART_IMPORT_DISCOVERY

**Document revision:** `V6`
**Target application version:** `0.7.8` (Alpha 0.7, renumbered from `0.7.9` at delivery-plan `V123`)
**Status:** **FROZEN, 2026-09-26.** The Product Owner does not have a real transfer confirmation
document and decided directly not to wait for one: **the transfer sub-type is out of scope for `0.7.8`'s
Smart Import automated extraction**, and remains manual-entry only (via the existing manual/QR item-creation
flow), exactly as it was before this candidate. Rental car (4 real documents), rail (1) and ferry/boat (1)
are each CHECKED against real documents (Section 3/4) and the mandatory wild-card is satisfied — Decision 6
is now considered satisfied for the sub-types in scope. All 5 Decision 4 sub-questions are resolved (Section
3) — sub-question 2 (`endAt` realism) is moot for transfer now that it's out of scope, and confirmed for rail
and ferry/boat. Decision 7 (delivery slice/URL scope) is confirmed: PDF/image only, no URL acquisition.
**This document is Frozen — `0.7.8`'s implementation kickoff can now be authored**, covering rental car, rail
and ferry/boat only.
**Date:** 2026-09-26

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V1 | 2026-09-26 | Initial draft. Data-model check performed by direct code inspection, not assumed — confirms the item-type-shape question the roadmap flagged as open (`0.7.9` sync, `V107`; renumbered `0.7.8` at `V123`) was already settled by `0.7.4`'s own implementation, not reopened here. Decision 4 proposed per Transport sub-type (rental car, transfer, rail, ferry/boat), based on the existing `car` schema shape in `familytrips.import` 1.0 and the generic completeness contract — not yet validated against real documents. Decision 6 (benchmark) opened but cannot be filled without real Product Owner-supplied documents, mirroring `RESTAURANT_SMART_IMPORT_DISCOVERY.md`'s own `V1` precedent for the same reason. |
| V2 | 2026-09-26 | Product Owner supplied 3 real rental-car documents (`tests/fixtures/Trans_benchmark/`), individually catalogued with SHA-256 identity (Section 4). Rental-car Decision 4 proposal checked against all 3 and revised: `website` and `email` promoted from absent to proposed required-when-present fields (both observed in 2/3 real documents); flight-number cross-reference observed on rental-car pickups too, not just transfers; price/currency confirmed genuinely absent on one real document, validating "required-when-present" rather than no-omission. One document (`C21-G096-4312`) flagged for the Product Owner's awareness — it carries partial (masked) payment-card details. Transfer, rail, ferry/boat and the mandatory wild-card are still needed before Decision 6 can close. |
| V3 | 2026-09-26 | Product Owner supplied 2 further documents. `TR-004` (`Voucher (23).pdf`, an Avis rental voucher for a Berlin pickup) is a 4th real rental-car document — confirms the no-omission set again, confirms `price/currency` absent from a 2nd voucher-type document, and confirms a flight-number reference on a 3rd rental-car document. The 2nd file (`WhatsApp Image 2026-09-26 at 17.50.21.jpeg`) is catalogued as `WC-001`, the mandatory wild-card — a photographed, stapled composite of a Swedish hotel folio (with a "SHUTTLE" line item, i.e. a transfer charge billed as part of an unrelated Hotel document, not a standalone transfer confirmation) and its card-payment slip. This satisfies the wild-card requirement but does not provide a canonical transfer document, and raises a new open question (Section 3) about whether a shuttle charge embedded in a Hotel document is in-scope for Transport Smart Import at all. Transfer, rail and ferry/boat dedicated documents are still needed. `WC-001` also carries partial (masked) payment-card details, flagged the same way `C21-G096-4312` was at `V2`. |
| V4 | 2026-09-26 | Product Owner answered all remaining decision-shaped open items directly, one by one: (1) add `website` and `email` to `TYPE_FIELDS.car` now, rather than waiting for more documents; (3) add rail/ferry/transfer patterns to the `TYPE_RULES` heuristic now, alongside the extraction work; (4) leave flight cross-linking in `notes` for this slice, not a real `relatedItemIds`-style link; (5) a Transport charge embedded in a Hotel document (`WC-001`'s "SHUTTLE" line) is out of scope for this slice. Decision 7 confirmed as PDF/image only, no URL acquisition. Only Decision 6 (real transfer, rail, ferry/boat documents) and the `endAt`-realism sub-question (which depends on those same documents) remain open — the sole remaining blocker before this document can move to Frozen. |
| V5 | 2026-09-26 | Product Owner found 2 further real documents via email search: a Deutsche Bahn rail ticket (`TR-005`) and a Stena Line ferry booking (`TR-006`), both added to `tests/fixtures/Trans_benchmark/`. Rail and ferry/boat's Decision 4 proposals (Section 3) are each now CHECKED against 1 real document — both confirm the proposed no-omission and required-when-present sets, and both resolve sub-question 2 (`endAt` realism) for their own sub-type: both documents show explicit, meaningful arrival date/time. `TR-006` also carries a partial masked payment-card fragment, flagged the same way as `TR-002`/`WC-001`. Only a standalone transfer confirmation is still needed to close Decision 6; sub-question 2 remains open only for transfer. |
| V6 | 2026-09-26 | Product Owner does not have a real transfer document and decided directly not to wait for one: transfer is now OUT OF SCOPE for `0.7.8`'s Smart Import automated extraction, remaining manual-entry only via the existing manual/QR flow. This resolves Decision 6 (satisfied for the in-scope sub-types — rental car, rail, ferry/boat, plus the mandatory wild-card) and moots the transfer half of sub-question 2. **Document moves to FROZEN.** `0.7.8`'s implementation kickoff can now be authored, covering rental car, rail and ferry/boat only. |

## Relationship to the Hotel/Flight/Attraction-Event/Insurance discovery sessions

`SMART_IMPORT_REDESIGN_DISCOVERY_V22.md` froze seven decisions for Smart Import generally. As already
established for Flight, Restaurant and Insurance, Decisions 1 (product promise), 2 (processing/privacy), 3
(universal source-landing behavior) and 5 (bounded URL/enrichment policy) are generic — written to apply
"for every FamilyTrips item type" — and are **inherited unchanged for Transport**. This document does not
repeat them; it only addresses what is Transport-specific: Decision 4 (required fields/evidence per
sub-type), and Decisions 6–7 (benchmark and delivery slice) for the Transport type. `SMART_IMPORT_REDESIGN_
DISCOVERY_V22.md`'s own "Version boundary" note already names Transport as one of the types its contract is
meant to eventually cover — this document is what makes that real, the same gate Hotel, Flight, Attraction/
Event and Insurance each passed through in turn.

## 1. Data-model check (performed first, not assumed — per this project's standing rule)

Direct inspection of `src/ingestion.js` on the current repo `HEAD` (matching `docs/roadmap` `V128`)
confirms:

- **The item-type-shape question the roadmap flagged as open at `0.7.8`'s own delivery-plan entry — "a
  single Transport type with a sub-type field, or separate types" — was already settled by `0.7.4`'s own
  implementation, not reopened here.** `0.7.4` found `car` already existed as a working item type (label
  "רכב שכור," rental car) and broadened it in place into the first-class Transport type, rather than adding
  separate new types alongside it — the type *key* (`car`) was deliberately kept unchanged to avoid a data
  migration for already-synced items, since every Transport mode shares the same natural field set
  (provider, confirmation number, pickup/drop-off location, phone, start/end time, participants, notes).
  Confirmed directly in `src/ingestion.js`'s own `0.7.4` comment and code, not inferred.
- **`TRANSPORT_MODES`** (`src/ingestion.js:20`): `{transfer:'הסעה', rail:'רכבת', ferry:'מעבורת',
  car:'רכב שכור', other:'אחר'}` — a sub-type field on the single `car` item type, already live.
- **`ITEM_TYPES.car`** = `{label:'תחבורה', icon:'🚐', schedule:'range'}` — `schedule` is fixed at `'range'`
  (matching Hotel) for every Transport sub-type, regardless of whether the real-world document is naturally
  a range (a multi-day rental) or closer to a single point in time (a transfer, a short ferry crossing).
  This was `0.7.4`'s own decision, not re-litigated here — it's a Timeline/UX question separate from Smart
  Import scope. Flagged below (Decision 4, open sub-question 2) only insofar as it affects what "required
  when present" means for `endAt` on a transfer/ferry document, not as a request to change it.
- **`TYPE_FIELDS.car`** = `['transportMode','provider','confirmationNumber','location','phone','startAt',
  'endAt','participants','notes']` — notably **no `website` field**, unlike Hotel/Attraction/Restaurant.
  Real transport confirmations (rail booking platforms, rental car companies, ferry operators) commonly
  reference a booking-management URL. Flagged as an open Decision 4 question below, not assumed either way
  — this project's own standing discipline (see Insurance's Decision 4) is to add a field only once real
  documents confirm it's actually present often enough to matter.
- **The existing `TYPE_RULES` heuristic for manual/free-text type detection** (`src/ingestion.js:51-53`)
  only recognizes rental-car language today: `/\bcar rental\b|\brental car\b|\bvehicle\b|\bpick[ -]?up\b.*
  \bdrop[ -]?off\b|השכרת רכב/i`. There is **no existing pattern for rail, ferry or transfer** at all — a
  real, pre-existing gap confirmed by direct code read, not assumed. This doesn't block Smart Import (the
  AI-driven classification step doesn't depend on this regex heuristic), but it's relevant context: today,
  a rail or ferry confirmation dropped into manual/QR intake would not auto-classify as Transport at all.
- **`familytrips.import` 1.0's existing `car` schema** (`FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_
  V5.md` §6): `pickupLocation`, `dropoffLocation`, `pickupTimeZone`, `dropoffTimeZone`, `vehicleClass`,
  `driverNames`, `rentalTerms`, `amount`, `currency` — under `details`, the same "fields not yet in the
  typed schema stay under `details`" pattern every other type uses. This shape is rental-car-specific; it
  says nothing yet about rail/ferry/transfer's own `details` fields, which is exactly what real documents
  (Decision 6) will need to settle.
- **Conclusion: there is no data-model migration blocker**, the same finding every prior vertical reached
  in its own Section 1. The real remaining work is the extraction contract (schema, prompt, adapter) plus
  the Decision 4 no-omission questions below, not a new type or a schema restructure.

## 2. Inherited decisions (unchanged from Hotel/Flight/Attraction-Event/Insurance — Decisions 1, 2, 3, 5)

Transport inherits the generic Smart Import decisions frozen for Hotel and carried unchanged through every
subsequent vertical: the `Source`/`ProcessingAttempt`/`ExtractedDraft`/`Proposal`/`Attachment` pipeline; the
`Attach only` vs `Attach and extract` / `Analyze and propose` vs `Save source only` two-choice flows;
evidence-backed extraction with `needsReviewFields`/`fieldConfidence`; and the frozen processing/privacy,
universal source-landing, source-relative completeness/evidence and bounded external-enrichment contracts
recorded in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`. Nothing Transport-specific changes any of these.

## 3. Decision 4 — required fields per Transport sub-type (FROZEN for rental car, rail, ferry/boat; transfer OUT OF SCOPE for `0.7.8`)

Transport is unlike every prior vertical in one respect: it covers four meaningfully different real-world
document shapes under one item type, not one document shape. The no-omission sets below were originally
**proposed**, modeled on the existing `car` `details` schema (Section 1), the generic completeness contract
already frozen project-wide (`SMART_IMPORT_REDESIGN_DISCOVERY_V22.md`: pickup/drop-off points, addresses,
phone, price/currency, every operational date/time with timezone, and so on), and ordinary domain knowledge
of what each document type contains. As of `V6`, rental car, rail and ferry/boat below are each **validated
against real benchmark documents and FROZEN** — matching every prior vertical's own discipline (see
Insurance's Decision 4, explicitly "based on what all eight real benchmark documents below actually
contain"). Transfer's proposal below remains unvalidated and is explicitly out of scope for `0.7.8`
(Product Owner decision, `V6`) — see the Transfer sub-section for why.

### Rental car (`transportMode: 'car'`) — CHECKED against 4 real documents, `V3`

No-omission blockers: provider (rental company), confirmation/reservation number, pickup location, pickup
date/time, drop-off location, drop-off date/time. **Confirmed present in all 4 real documents (Section 4).**

Required-when-present: vehicle class/model, driver name(s), rental terms/excess amount, phone (rental desk
or emergency line), price/currency, an excess/damage-protection note — worth flagging a real cross-reference:
a rental car's own excess-protection add-on is exactly Insurance's own `INS-008` benchmark case
(`RentalCover.com`/Cover Genius), already linkable via Insurance's `relatedItemIds` field once both items
exist. Smart Import for Transport doesn't need to build that link itself — the mechanism already exists —
but it's worth the Development Agent being aware of it during implementation. **`price/currency` confirmed
genuinely absent on one real document (`V0906543.pdf`, a prepaid voucher with no cost breakdown on its face)
— validates "required-when-present," not a no-omission blocker, exactly as proposed.**

**Revised by `V2`, based on the 3 real documents (Section 4):**

- **`website` — promote to required-when-present.** Absent from `TYPE_FIELDS.car` today (Section 1), but 2
  of 3 real documents reference a booking-management site (`https://aramis.gr/`, `WWW.SHLOMO.CO.IL`).
- **`email` — new proposed required-when-present field, also absent from `TYPE_FIELDS.car` today.** Present
  in 2 of 3 real documents (a pickup-desk contact email on the Alamo agreement; both a company and a
  customer email on the Aramis reservation).
- **Flight number is not transfer-specific.** 2 of 3 real rental-car documents reference the customer's
  inbound flight number (`FR2824`, `LY2371`) even though the pickup is a rental car, not a transfer — this
  bears on open sub-question 4 below, which had only considered flight-linking for transfers.
- **Confirmation numbering is commonly multi-valued, not single.** All 3 real documents show more than one
  reference number on the same document (Alamo: `RA#` and `RES#`; Aramis: `Code`; Sixt/Shlomo: `Voucher No`
  and `Confirmation`) — an extraction/prompt nuance (capture the primary one, keep the rest in `notes`), not
  a schema change.

**Revised further by `V3`, based on `TR-004` (Section 4):**

- **Flight number, 3rd confirmation.** `TR-004` (Avis) also carries a flight number (`LY2373`) — 3 of 4 real
  rental-car documents now show this. Strengthens the `V2` finding; still an open decision whether to build
  a real cross-item link now or leave it in `notes` (sub-question 4 below).
- **`price/currency`, 2nd confirmed absence.** `TR-004` is a 2nd voucher-type document with no total
  price/currency shown on its face — the pattern from `V0906543.pdf` (Section 4) repeats. Further supports
  "required-when-present," not a no-omission blocker.
- **A loyalty/account number appears** (`AVIS ACCOUNT NO. AV860090020006`) — agency-specific, not clearly
  generalizable across rental companies. Noted as a real data point, not proposed as a schema field; would
  fit in `notes` if captured at all.
### Transfer (`transportMode: 'transfer'`) — OUT OF SCOPE for `0.7.8` Smart Import extraction, `V6`

**DECIDED, 2026-09-26:** the Product Owner does not have a real transfer confirmation document and chose
directly not to wait for one. Transport Smart Import's automated document-extraction pipeline will **not**
cover the transfer sub-type in this slice. This only narrows what Smart Import's AI-driven extraction
supports — a `transfer` item remains fully creatable through the existing manual/QR item-creation flow,
exactly as it was before this candidate and as every item type is before Smart Import extraction is built for
it. The no-omission/required-when-present proposal below is kept for reference only, in case a real transfer
document surfaces later and this sub-type is added to Smart Import in a future slice — it remains
**unvalidated against any real document** and is explicitly not frozen, unlike rental car, rail and
ferry/boat above.

Likely no-omission blockers (unvalidated): provider, confirmation number, pickup point, pickup date/time.

Likely required-when-present (unvalidated): drop-off point, driver/vehicle details, a flight-number
cross-reference (airport transfers are commonly keyed to a specific flight — moot for now since transfer
isn't in Smart Import's extraction scope, but kept as a reference note), phone, price/currency.

### Rail (`transportMode: 'rail'`) — CHECKED against 1 real document, `V5`

No-omission blockers: provider/operator, confirmation/ticket number, departure station, departure date/time.
**Confirmed present** in the real document (`TR-005`, Section 4c): provider identified via `DB`
branding/`bahn.de` references, `Auftragsnummer` (order number) plus a separate `Ticketcode`, departure
station `Berlin Hbf`, departure `07.12.2025 13:28`.

Required-when-present: arrival station, arrival date/time, train number, platform, seat/coach/class,
price/currency. **All confirmed present** in `TR-005`: arrival station `Braunschweig Hbf`, arrival `14:57`
(same day), train number `ICE 691`, platform for both departure and arrival (`Gleis 7` / `Gleis 6`), class
(`2. Klasse`, no seat reservation — a `Flexpreis` fare has no assigned seat, so "seat" itself is not always
present even when class is), price/currency (`79,90 €`).

**New finding, `V5`:** `TR-005` resolves open sub-question 2 (`endAt` realism, Section 3 sub-questions below)
for rail specifically — the real document shows a clear, meaningful arrival date/time on the same day as
departure, not just a departure time. No masked payment-card data appears on this document (unlike `TR-002`,
`WC-001` and `TR-006`) — the fare is stated but no payment method is shown on the ticket face. `website` is
only present as a generic terms-and-conditions reference (`www.bahn.de/agb`), not a personalized
booking-management link like `TR-002`'s — a real distinction worth noting for the `website` field's
"required-when-present" status across sub-types (see `TR-006` below for the same pattern). No `email` field
appears on this document either.

### Ferry/boat (`transportMode: 'ferry'`) — CHECKED against 1 real document, `V5`

No-omission blockers: provider/operator, confirmation number, departure port, departure date/time.
**Confirmed present** in the real document (`TR-006`, Section 4d): provider `Stena Line`, booking number
(`Buchungsnummer 91040229`), departure port `Kiel`, departure `Mo 08 Dez 2025 18:45`.

Required-when-present: arrival port, arrival date/time, vessel name, cabin/seat class, vehicle-carriage
details (if a car is being carried), price/currency. **Confirmed present** in `TR-006` except
vehicle-carriage: arrival port `Göteborg`, arrival `Di 09 Dez 2025 09:15` (next calendar day — an overnight
crossing), vessel name `Stena Scandinavica`, cabin/seat class (`Economy`, a 1–2 person sea-view cabin, cabin
number `9232`), price/currency (`162,50 €`, fully paid). **Vehicle-carriage details are genuinely absent** —
no car is being carried on this booking — a real confirmation that this field is correctly
"required-when-present" rather than a no-omission blocker.

**New finding, `V5`:** `TR-006` resolves open sub-question 2 (`endAt` realism) for ferry specifically — the
real document shows an explicit, meaningful arrival date/time, on a different calendar day from departure
(an overnight crossing), not just a departure time. `TR-006` also has an **email** field
(the booking confirmation was sent to `eyalby@gmail.com`, shown on the document face) and a **phone** field
(a service-center number), both matching the rental-car findings. `website` again only appears as a generic
terms-and-conditions reference (`stenaline.de/rechtliche-hinweise/...`), the same pattern as `TR-005` — a 2nd
real data point suggesting `website` as a dedicated, personalized booking-management link may be more of a
rental-car pattern than a universal Transport one. **`TR-006` also carries a partial masked payment-card
fragment** (card type Mastercard, last 4 digits) — flagged below alongside `TR-002` and `WC-001`, not
reproduced beyond this description.

### Decision 4 sub-questions — Product Owner decisions recorded `V4`; sub-question 2 updated `V5` and closed `V6`, 2026-09-26

1. **Should `TYPE_FIELDS.car` gain a `website` field? Should it also gain an `email` field?** —
   **DECIDED: add both now.** The Product Owner confirmed adding both `website` and `email` to
   `TYPE_FIELDS.car` as required-when-present fields, based on the evidence already gathered (2 of 4 real
   documents each), rather than waiting for transfer/rail/ferry documents. This is now a confirmed
   implementation item for `0.7.8`'s eventual kickoff, not open.
2. **Is a fixed `endAt`-required expectation realistic for a transfer or a short ferry crossing?** `schedule`
   stays `'range'` regardless of sub-type (`0.7.4`'s own decision, Section 1) — but if real transfer/ferry
   documents commonly show only one meaningful time (the pickup or departure), this affects what "required
   when present" means for `endAt` on those sub-types specifically, not whether to change `schedule` itself.
   **RESOLVED for rail and ferry, `V5`.** Real documents for both (`TR-005`, `TR-006`, Section 4c/4d) show an
   explicit, meaningful arrival date/time — `endAt` is realistic and required-when-present for these two
   sub-types. **Moot for transfer, `V6`.** Transfer is now out of scope for `0.7.8`'s Smart Import extraction
   (see the Transfer sub-section above) — this question would need a real transfer document to answer, but
   since transfer extraction isn't being built this slice, it no longer blocks anything. Revisit if/when
   transfer is added to Smart Import in a future slice.
3. **Should rail/ferry/transfer-specific patterns be added to the existing `TYPE_RULES` heuristic** (Section
   1), which today only recognizes rental-car language? **DECIDED: add them now, alongside the extraction
   work**, rather than deferring or waiting for real transfer/rail/ferry documents to ground the patterns.
   Confirmed implementation item for `0.7.8`'s eventual kickoff.
4. **Should a transfer — or, per `V2`'s finding above, a rental car — be linkable to the flight it collects
   from**, mirroring Insurance's `relatedItemIds` computed-lookup pattern (Section 3a of
   `INSURANCE_SMART_IMPORT_DISCOVERY.md`)? **DECIDED: leave it in `notes` for this slice, not a real
   cross-item link.** The Product Owner chose not to build the `relatedItemIds`-style mechanism now, despite
   3 of 4 real rental-car documents carrying flight-number evidence — revisit later if it turns out to matter
   in practice.
5. **Is a Transport charge that appears only as a line item inside a Hotel document (not as its own
   standalone confirmation) in scope for Transport Smart Import at all?** — raised by `WC-001` (Section 4b),
   a hotel folio with a "SHUTTLE" line item and no dedicated transfer fields of its own. **DECIDED: out of
   scope for this slice.** Transport Smart Import only handles standalone Transport confirmations; an
   embedded charge like `WC-001`'s stays under Hotel, or the user creates the Transport item manually if
   they want one. Confirmed, not open.

## 4. Decision 6 — benchmark documents (SATISFIED for the in-scope sub-types — rental car, rail, ferry/boat and wild-card covered; transfer intentionally out of scope for `0.7.8`, `V6`)

Per this project's own standing discipline — every prior vertical's Decision 4 was only frozen against real,
individually catalogued, SHA-256-identified documents supplied by the Product Owner, never invented or
assumed — Transport's benchmark cannot be filled from this assistant's own knowledge. This mirrors
`RESTAURANT_SMART_IMPORT_DISCOVERY.md`'s own `V1`, which opened Decision 6 for the identical reason and left
it open until real documents arrived (that candidate was later shelved for unrelated reasons, but the
benchmark gate itself was never bypassed).

### 4a. Rental car — 4 real documents received `2026-09-26`, individually catalogued

Supplied at `tests/fixtures/Trans_benchmark/` in the repository, staged and SHA-256 identified directly from
that location — not re-typed or assumed:

| # | File | SHA-256 | Bytes | Vendor / document type |
|---|---|---|---|---|
| TR-001 | `ALAMO ENGLISH RA.PDF` | `8db312fefa2e96cc9230f519547052b67e514eb65c162a6173d2be5d440b38d5` | 1,159,284 | Alamo (via SFAKIANAKIS SA, Enterprise/Rentalcars.com booking) — a **signed rental agreement**, collected at Athens airport, 3 pages, English. |
| TR-002 | `C21-G096-4312_1685528519.pdf` | `2da3b5800cda8249e9c1a287fe04fb09d88f53d4bdb572e215728f8e31653d09` | 212,286 | Aramis Athens — a **pending reservation confirmation** (advance payment not yet completed), 2 pages, English. |
| TR-003 | `V0906543.pdf` | `01c29ebf4cf890f50718a8ad4762e695612c1bbd23579f015f94ba193e0553d1` | 152,392 | Sixt, via שלמה תחבורה (Shlomo, an Israeli reseller) — a **prepaid voucher** for a Berlin pickup, 4 pages, Hebrew + English, includes a country-specific terms addendum. |
| TR-004 | `Voucher (23).pdf` | `4bea573206f08f6d06fd64498c69581b679cd02d4c4193a0d69dc641a478bfe0` | 171,386 | Avis, via UTS – Universal Transportation Solutions Ltd (an Israeli reseller) — a **rental voucher** for a Berlin Brandenburg Airport pickup, 9 pages (English + Hebrew), extensive cross-border and surcharge terms. |

**Field-by-field findings against Section 3's rental-car proposal** (all three confirmed the no-omission
set — provider, confirmation number, pickup/drop-off location and date/time all present in all 3):

- **TR-001** (Alamo agreement): every proposed required-when-present field present — vehicle class/model
  (Toyota C-HR Business Hybrid), driver name, full excess/damage-protection breakdown (CDW, Zero Excess,
  deductible amounts), rental-desk and 24h roadside-assist phone numbers, price/currency (291.59 EUR, full
  VAT/surcharge breakdown). No `website` present. Has a pickup-desk contact **email**
  (`AIRPORTATHENS@ENTERPRISE.GR`) — not in `TYPE_FIELDS.car` today.
- **TR-002** (Aramis reservation): vehicle class/model, driver name, phone, price/currency all present.
  Has both a **website** (`https://aramis.gr/`) and **email** (company + customer). Carries a **flight
  number** (`FR2824`) despite being a rental car, not a transfer. **Also contains partial (masked) payment
  card details** (card type, last 4 digits, last digit of the security code, expiry) — flagged below for
  the Product Owner's awareness, not reproduced here beyond this description.
- **TR-003** (Sixt/Shlomo voucher): vehicle class/model, driver name, phone, a detailed rental-terms/coverage
  list all present. Carries a **flight number** (`LY2371`). **No price/currency anywhere on the document** —
  a real, confirmed case of the field being genuinely absent, validating "required-when-present" rather than
  a no-omission blocker. Multi-page country-specific terms addendum (Germany) is a useful example of a
  rental-car document that is mostly terms-and-conditions boilerplate around a small core of extractable
  fields — relevant to how tightly the extraction prompt should scope itself to the first page(s).
- **TR-004** (Avis voucher): vehicle class/model (Group M, Skoda Octavia Combi SW), driver name, phone,
  a very detailed rental-terms/coverage list ("Program Includes") all present. Carries a **flight number**
  (`LY2373`) and an agency loyalty/account number (`AVIS ACCOUNT NO.`). **No price/currency anywhere on the
  document** — a 2nd confirmed real case, same pattern as `TR-003`. No `website` present; has an **email**
  (`v@avis.co.il`) in the cancellation-notice terms, not on the voucher face itself.

**Note for the Product Owner — payment-card fragments in TR-002, TR-006 and WC-001:**
`C21-G096-4312_1685528519.pdf`, `Ferry_081225_162.5.pdf` and `WhatsApp Image 2026-09-26 at 17.50.21.jpeg` all
include masked card details (card type, last 4 digits, and — for `TR-002` — the last digit of the security
code and an expiry date). This assistant does not handle or reproduce credential/payment data, and has not
repeated the actual digits anywhere in this document. All three files were placed directly into the
repository's `tests/fixtures/` folder by the Product Owner: flagging this here only so you're aware they're
there — no action taken or requested from this assistant's side.

### 4b. Wild-card — 1 real document received `2026-09-26`, individually catalogued

| # | File | SHA-256 | Bytes | Type |
|---|---|---|---|---|
| WC-001 | `WhatsApp Image 2026-09-26 at 17.50.21.jpeg` | `97193a5ecaf283a87c5f23cc748d7c5eee4755becaf59860994b8a87ad66eb20` | 156,502 | A photographed, stapled composite of two paper documents — a Swedish hotel ("Tjintokk") folio (Room 642, guest Eyal Ben Hitzak, arrival/departure 11–12 Dec 2025) and its card-payment slip, sent via WhatsApp. |

This satisfies the project's mandatory wild-card rule (the same discipline `TorenInsurance.Tif` served for
Insurance) — a genuinely non-canonical, photographed, multi-document real-world artifact. It is **not** a
standalone transfer confirmation: the folio's itemized charges include one line, `SHUTTLE RDE9325 -
12.12.2025`, 439.00 SEK — a real transfer charge, but billed as part of an unrelated Hotel document, with no
separate provider name, confirmation number, or transfer-specific phone/location fields of its own. This is
exactly the kind of real edge case Decision 6 is meant to surface, and it raised a genuinely new open
question (Section 3, sub-question 5) about whether this kind of embedded Transport charge is in scope for
Transport Smart Import at all, rather than something that stays under Hotel.

### 4c. Rail — 1 real document received `2026-09-26`, individually catalogued

Found by this assistant via a Gmail search for transfer/rail/ferry documents (per the Product Owner's
request) and located, then saved by the Product Owner into `tests/fixtures/Trans_benchmark/`, staged and
SHA-256 identified directly from that location — not re-typed or assumed:

| # | File | SHA-256 | Bytes | Vendor / document type |
|---|---|---|---|---|
| TR-005 | `Ticket_576743004135_07.12.2025__H.pdf` | `5693c168260985ad3e45aab60cf79854263dcb94d6e27867cf6bbe00e06fb1a5` | 199,174 | Deutsche Bahn (DB) — **Online-Ticket** (ICE Fahrkarte, Flexpreis), Berlin Hbf → Braunschweig Hbf, 1 page, German. |

**Field-by-field findings against Section 3's rail proposal:** see the revised Rail sub-section above
(Section 3) — every proposed no-omission and required-when-present field is confirmed present except a
specific seat assignment (this fare class has none), and this document resolves sub-question 2 (`endAt`
realism) for rail. No masked payment-card data appears on this document.

### 4d. Ferry/boat — 1 real document received `2026-09-26`, individually catalogued

Also found via the same Gmail search, saved by the Product Owner into `tests/fixtures/Trans_benchmark/`,
staged and SHA-256 identified directly from that location:

| # | File | SHA-256 | Bytes | Vendor / document type |
|---|---|---|---|---|
| TR-006 | `Ferry_081225_162.5.pdf` | `93e22bc87d41ad0e6608382e8a16f5fe90ab425878e8b410e0438c23188d5dda` | 176,101 | Stena Line — **Buchungsbestätigung/Rechnung** (booking confirmation/invoice), Kiel → Göteborg, 2 pages, German. |

**Field-by-field findings against Section 3's ferry/boat proposal:** see the revised Ferry/boat sub-section
above (Section 3) — every proposed no-omission and required-when-present field is confirmed present except
vehicle-carriage details (genuinely absent — no car on this booking, correctly "required-when-present" not a
no-omission blocker), and this document resolves sub-question 2 (`endAt` realism) for ferry. **This document
carries a partial masked payment-card fragment** (card type Mastercard, last 4 digits) — flagged in the note
below, alongside `TR-002` and `WC-001`.

**Decision 6 status, `V6`:** transfer remains the only sub-type with zero real documents, and the Product
Owner decided directly, 2026-09-26, not to wait for one — transfer is out of scope for `0.7.8`'s Smart Import
extraction (see Section 3's Transfer sub-section). Decision 6 is therefore considered **satisfied** for the
sub-types actually in scope: rental car (4 real documents), rail (1), ferry/boat (1), plus the mandatory
wild-card (`WC-001`).

Rail and ferry/boat are each grounded in only one real document; as with rental car, a 2nd or 3rd real
document for each would still be useful to confirm the findings above aren't an artifact of a single
document, but this is a nice-to-have, not a blocker — the Product Owner has not been asked to prioritize it.

If a real transfer document surfaces later and the Product Owner wants transfer added to Smart Import in a
future slice, it will be catalogued the same way as TR-001–006 above, and Section 3's transfer no-omission
set will be revised and validated against it — the same discipline every other sub-type here has followed.
That is future work, not part of `0.7.8`.

## 5. Decision 7 — delivery slice and URL scope (CONFIRMED, `V4`, 2026-09-26)

**DECIDED: PDF and image only, no public-URL acquisition in this slice.** The Product Owner confirmed this
scope directly — attach/extract from PDF and image (including scanned/fax-quality images and screenshots)
from global Add or existing-item attach, mirroring every prior vertical's own starting scope. No
transport-booking-portal URL example was supplied, and none is needed for this decision to stand.

## 6. Open questions summary — ALL CLOSED, `V6`

1. **CLOSED.** Rental car's revised Decision 4 proposal (Section 3) — the Product Owner confirmed adding
   `website` and `email` to `TYPE_FIELDS.car`.
2. **CLOSED, `V6`.** Rail and ferry/boat's Decision 4 proposals (Section 3) are each confirmed against 1 real
   document (`TR-005`, `TR-006`). Transfer's proposal remains unvalidated, but this is no longer blocking —
   the Product Owner decided directly to scope transfer out of `0.7.8`'s Smart Import extraction rather than
   wait for a real document.
3. **5 of 5 Decision 4 sub-questions resolved** (Section 3) — `website`/`email` fields (add both now), flight
   cross-linking (leave in `notes` for this slice), `TYPE_RULES` heuristic coverage (add rail/ferry/transfer
   patterns now), the `WC-001` embedded-charge scope question (out of scope for this slice), and `endAt`
   requirement realism (confirmed for rail and ferry/boat, moot for transfer since it's out of scope).
4. **CLOSED, `V6`.** Decision 6 — rental car covered by 4 real documents, rail and ferry/boat each by 1
   (Section 4a/4c/4d), and the mandatory wild-card by 1 (Section 4b). Transfer has zero real documents, but
   the Product Owner decided directly not to wait for one — transfer is out of scope for `0.7.8`, so Decision
   6 is satisfied for the sub-types actually in scope.
5. **CLOSED.** Decision 7 — the Product Owner confirmed PDF/image-only scope, no URL acquisition this slice.

## Next step

**This document is FROZEN as of `V6`, 2026-09-26.** Every open item is resolved: rental car, rail and
ferry/boat's Decision 4 proposals are each grounded in real documents (4, 1 and 1 respectively), the
mandatory wild-card requirement is satisfied, all 5 Decision 4 sub-questions are resolved, Decision 7 is
confirmed, and the Product Owner closed the one remaining gap (a missing transfer benchmark) with a direct
scope decision rather than further waiting — transfer is out of scope for `0.7.8`'s Smart Import extraction
and stays manual-entry only. `0.7.8`'s own scope document and implementation kickoff can now be authored,
covering rental car, rail and ferry/boat Smart Import extraction plus the `TYPE_FIELDS.car`/`TYPE_RULES`
changes already decided in Section 3 — the same path every prior vertical's discovery document took from its
own `V1` baseline draft to its own Frozen revision, most recently `INSURANCE_SMART_IMPORT_DISCOVERY.md`
`V1`→`V3` across 8 real documents.
