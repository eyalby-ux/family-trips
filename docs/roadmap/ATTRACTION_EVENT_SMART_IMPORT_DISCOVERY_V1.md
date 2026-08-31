# FamilyTrips Attraction/Event Smart Import — Type Contract and Benchmark

**Document revision:** `V4`
**Target application version:** Alpha 0.6.6 (retargeted from Restaurant — see `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` `V49`)
**Status:** **FROZEN. Entry gate PASSED.** All Decision 4/7 open questions resolved by explicit Product Owner decision, benchmark matrix (Decision 6) filled with seven real documents including a genuine wild-card and both PDF/image formats, field-by-field expected values written and frozen for all seven cases, and the URL sub-scope decided explicitly (ship URL support; ticket-platform URLs expected to safe-fail; official venue/OTA sites are the real target and untested either way). Ready for implementation package authoring.
**Date:** 2026-08-31

## Change history

| Revision | Date | Change |
|---|---|---|
| V4 | 2026-08-31 | **Entry gate closed.** Added frozen field-by-field expected values for `AE-001`–`AE-007` (new section below) — the graded ground truth an implementation is checked against, not just case identity. Resolved the URL sub-scope question left open in `V3`: Product Owner decision is to ship URL acquisition in `0.6.6`, with ticket-platform "my tickets" URLs (Ticketmaster, vivenu/leaan.net, hapoelbc.com) expected to land on a safe-failure path — now with real evidence (4/4 tested URLs robots-blocked) rather than assumption — while official venue/museum/OTA URLs (the actual intended target of this sub-scope) remain untested either way and are the case still needed to call this sub-scope frozen-and-gradeable. Status moves from Draft to Frozen; entry gate moves from NOT PASSED to PASSED. |
| V3 | 2026-08-31 | Product Owner resolved the two remaining open questions in chat: (1) ticket/confirmation number is **not** a no-omission blocker — moved to required-when-present, same treatment as Restaurant, not Flight's PNR treatment; (2) location precision is confirmed — the property-first discipline (specific venue, not general park/city/district) is frozen, mirroring Hotel. Decision 4's required-fields section, the benchmark notes that depended on these, and the entry gate updated accordingly. |
| V2 | 2026-08-31 | Benchmark matrix (Decision 6) filled: six real tickets supplied by the Product Owner, catalogued as `AE-001`–`AE-006` with SHA-256 identity and frozen expected values. Open question 3 (URL/ticket-platform scope) resolved to **in scope** for `0.6.6`, with a new sub-question opened about login-gated "my tickets" pages. See per-case detail below. |
| V1 | 2026-08-31 | Initial draft. Replaces Restaurant as the `0.6.6` vertical slice after Product Owner review (`אטרקציה` category screenshot) showed the app already renders a live Trip Center category for this type, contradicting the delivery plan's prior "Blocked — Activities do not yet exist as a Trip item type" note. Direct code inspection (`src/ingestion.js`) confirmed `activity` is a fully defined peer of every other type — see correction note below. |

## Correction — Activity was never actually blocked at the data-model layer

The delivery plan previously stated: *"Not scheduled into any Alpha version. Activities do not yet exist as a first-class Trip item type in the data model — Smart Import cannot extract into a type the application does not have."* This was checked directly against the running application and the repository and found to be **incorrect**, not merely stale — the same category of documentation error already caught once before in this engagement (the `main`-branch/`0.3.0-foundation` baseline surprise), just lower-stakes.

Direct evidence, `src/ingestion.js`:

```js
export const ITEM_TYPES = {
  flight: {...}, hotel: {...}, car: {...},
  activity: {label:'אטרקציה', icon:'🎟️', schedule:'single'},
  restaurant: {label:'מסעדה', icon:'🍽️', schedule:'single'}, ...
};
export const TYPE_FIELDS = {
  ...
  activity: ['provider','confirmationNumber','location','website','startAt','participants','notes'],
  restaurant: ['provider','confirmationNumber','location','website','phone','startAt','participants','notes'],
  ...
};
```

`activity` and `restaurant` are structural peers in every place the type registry is used: the `ITEM_TYPES`/`TYPE_FIELDS` config that drives the generic dynamic-form system (`V4-F01`, Alpha 0.4.3), the Trip Center category-tile rendering (`visibleTypes = Object.entries(ITEM_TYPES).filter(...)`), the manual-create type dropdown, and even the legacy heuristic classifier's `TYPE_RULES` (`attraction|tour|activity|event|אטרקציה|סיור`, weight 4, next to `restaurant` at weight 5). Neither type has a bespoke hand-built screen — both ride the same generic system Hotel, Flight and every other type already use. There is no foundational item-type build blocking this slice. What's actually missing for Activity is exactly what was missing for Restaurant before this pivot: the Smart Import extraction contract and benchmark, nothing at the data-model layer.

(Not yet independently confirmed by actually creating an Attraction item end-to-end in a signed-in session — the code evidence is unambiguous enough to proceed, but flagging this the same way this project flags every unverified claim rather than treating code inspection as a full substitute for a real click-through.)

## Relationship to the Hotel and Flight discovery sessions

As with Restaurant, Decisions 1 (product promise), 2 (processing/privacy), 3 (universal source-landing behavior) and 5 (bounded URL/enrichment policy) are generic and **inherited unchanged**. This document proposes only what is Attraction/Event-specific: Decision 4 (required fields/evidence), and Decisions 6–7 (benchmark and delivery slice).

## Why this is a stronger architectural fit than Restaurant was

The reason this replaced Restaurant rather than sitting alongside it as a fourth slice: real-world attraction/event sources are **ticket-shaped** — PDF tickets, QR/barcode mobile tickets, museum/theme-park/show booking confirmations — which is close to the best case Smart Import already has evidence for. `FL-008` in the Flight benchmark already proved QR/barcode + gate/seat structured-data extraction from a boarding pass; an event ticket is architecturally the same shape (QR/barcode, venue, date/time, seat/section) applied to a different provider. Restaurant's real-world inputs, by contrast, are disproportionately phone/walk-in/informal-email — thin on the exact document types this pipeline is built to read. This slice is expected to have both higher usable-document availability and a closer fit to already-proven extraction capability. (Note: this document type-fit argument is about document *shape*, not about required-field policy — as of `V3`, ticket number itself is required-when-present like Restaurant, not a frozen blocker like Flight's PNR; the two questions turned out to be independent.)

## Attraction/Event required fields (Decision 4 equivalent) — required-fields policy FROZEN (`V3`); field list itself still tracks the benchmark

Base fields already defined in `TYPE_FIELDS.activity`: `provider`, `confirmationNumber`, `location`, `website`, `startAt`, `participants`, `notes`. The external-ingestion schema (`FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V5.md` §6) already anticipates extended `details` fields for this type: `activityName`, `meetingPoint`, `duration`, `ticketNumbers`, `ageRestrictions`, `included`, `notIncluded`, `amount`, `currency` — these were defined before this Smart Import slice existed and can be reused directly.

**No-omission blockers, FROZEN (`V3`)** — must never be silently dropped when present in the source: event/attraction name, date, time, venue/location. **Location must be accurate** — the same property-first discipline already frozen for Hotel (the specific venue/attraction, not a general park/city/district) applies here, per explicit Product Owner confirmation. This closes open question 2 below.

**Ticket/confirmation number is explicitly NOT a no-omission blocker (`V3`, Product Owner decision).** This reverses the `V1` proposal, which had treated it as a blocker by analogy to Flight's PNR. It now gets the same treatment Restaurant always had: required-when-present, not a blocker. In practice this still means it must never be fabricated or silently dropped when checked by the acceptance gate's general "no fabricated values" and evidence-visibility rules — it is just not one of the fields whose *absence* alone fails a case, which matters concretely for `AE-006` (WaterLand): the source has ticket numbers, so this doesn't change its grading, but the policy question is now settled independent of any one case.

**Required when present, not blockers:** ticket/confirmation number (moved here from the blocker list, see above), seat/section assignment, age restrictions, included/not-included items, meeting point (when distinct from the venue address — mirrors Hotel's arrival-point/meeting-point separation rule).

**Multi-ticket bookings, mirroring Flight's multi-passenger rule:** one source may cover multiple named ticket-holders for the same event (a family of four's museum tickets in one PDF). All ticket-holders present in the source must appear, each with their own evidence-linked seat/section/ticket-number where the source provides per-person detail.

**QR/barcode as a first-class evidence source:** where a ticket carries a scannable QR/barcode encoding structured data (as boarding passes already do), that data should be treated as at least as trustworthy as printed text — mirrors the boarding-pass handling already proven in `FL-008`.

**Meaningful title:** venue/attraction or event name, optionally with date when a source covers multiple visits/shows. A raw booking reference, filename, or generic "Ticket" is not acceptable, mirroring every other type's title rule.

**Open questions for Product Owner decision (cannot be assumed) — ALL THREE NOW RESOLVED as of `V3`:**

1. **RESOLVED (`V3`):** ticket/confirmation number is **not** a no-omission blocker — Product Owner decision, explicit in chat ("ticket number is not mandatory as I see it"). It follows Restaurant's original required-when-present treatment, not Flight's PNR-blocker treatment. See the frozen field list above. This reverses the `V1` proposal; the benchmark evidence noted in `V2` (all six real documents happening to carry a ticket number) turned out not to be the deciding factor — the policy is that absence must not fail a case even when most real sources happen to carry one.
2. **RESOLVED (`V3`):** location must be accurate — Product Owner decision, explicit in chat ("the location must be accurate"). Confirms the property-first discipline (specific venue/attraction, not a general park/city/district) applies to Attraction/Event exactly as it does to Hotel, and this is now a frozen no-omission blocker, not merely a proposed one.
3. **RESOLVED (`V2`):** public official attraction/venue URLs and reservation-platform URLs (a museum's own site, Klook, GetYourGuide, Viator, Ticketmaster) are **in scope for `0.6.6`**, mirroring Hotel's `H-004` precedent rather than Flight's full URL deferral. See the delivery-slice section below for the resulting scope change and the new sub-question this opens.

## Benchmark matrix (Decision 6 equivalent) — FROZEN (`V4`)

Seven real documents supplied directly by the Product Owner, none crafted or reused from a prior slice's benchmark. Spans six distinct providers, three languages (Hebrew, English, Spanish/Catalan), and both formats the delivery slice commits to — six PDFs and one image (screenshot). SHA-256 computed directly from the supplied files.

| ID | Filename | SHA-256 | Provider / event | Format notes |
|---|---|---|---|---|
| `AE-001` | `FCB679102D6E6915.pdf` | `9576ec1d53b51396f6cc17a4b063a5f6cfb73fb5cc4d5a0f8e0b120ea22a4a7a` | FC Barcelona vs Girona FC (LaLiga), Estadi Olímpic Lluís Companys, 30/03/2025 | **Mandatory wild-card.** Spanish/Catalan/English trilingual ticket, two named passengers each with DNI, seat/row/gate/section using a different seating-hierarchy vocabulary than any prior benchmark (`Acces`/`Gate`/`Boca`/`Row`/`Seat`), price + separate service fee, a labeled reference number, and real per-passenger QR codes. |
| `AE-002` | `order1955108.pdf` | `d7d96faf636128e293a67b1ab0aea721a2c582342d4e2f8161e5d6c1bf1e8184` | Experience Park (Amphi Wahl) | Single ticket, one seat/row, one QR code, one order number. Simplest case in the set — baseline against which the more complex cases can be checked. |
| `AE-003` | `SmarTicket_eticket_...6868cd6cad9f9.pdf` | `b1de5f4b9dc7616f090a06e846acd1a869369b1d01226fc08fdc6a3fe3b6e5e0` | Bloomfield Science Museum — general entrance | 3 free tickets (no price), each with its own barcode + QR. Paired with `AE-004` below as a same-visit companion pair. |
| `AE-004` | `SmarTicket_eticket_...6868cfab5aa01.pdf` | `2a4a6113b0d35d75db7f229ea094cc68fc485f40fe15edb5a30eb2c565ee5d89` | Bloomfield Science Museum — paid auditorium show, same visit as `AE-003` | 3 tickets, each with an assigned seat. **Companion/duplicate-source case**, same shape as Hotel's `H-001`+`H-003` pair: two separate real documents for one visit, covering two different bookable things (general admission vs. a specific show) at the same venue on the same date. Must land as two related items or one item with two attached sources — not silently merged and not silently duplicated. Now that `V3` has settled ticket number as required-when-present rather than a blocker, the splitting call turns on whether `AE-003` and `AE-004` describe two distinct bookable events (they do — general entrance vs. a specific timed show) rather than on a ticket-number-difference trigger; still an implementation-time decision to make explicit, not implicit. |
| `AE-005` | `Tickets.pdf` | `f026469387974868b168fa3d93e1c3a1cf96a10dead14ee9125e89cbd93b8939` | Gamzu forest orienteering event | Family ticket. **Precision edge case:** the order number and the ticket number are near-identical strings differing only in a few digits — a real test of whether extraction is actually reading which label attaches to which number, not pattern-matching on "looks like an ID". Also carries a long liability-waiver paragraph, which is a real exercise of the existing "legal boilerplate stays in the preserved original, does not need its own structured field" rule already established for other types. |
| `AE-006` | `1713265782549_entryTickets_1.pdf` | `e99f5424e8057e11f4d1d3cc4beee43aba1aec6027859d2ccf4198485008b25c` | WaterLand water park, entry date 24/04/2024 | Hebrew-only. Family ticket for 4, printed as **4 separate single-use tickets** in one PDF (`623000111`–`623000114`), each with its own QR encoding a longer numeric string (`00006230000111...`) and no seat/section (a water park has no assigned seating, unlike `AE-001`/`AE-002`/`AE-004`). No named ticket-holders — the source only says "1 subscriber, 1 (55203)", so per-person `participants` splitting (the rule proposed above, mirroring Flight) cannot be satisfied the way `AE-001` satisfies it with two DNI-identified people; this is a real case where the source simply doesn't carry per-person identity, and the no-omission rule's "absent-in-source is not a failure" carve-out has to hold here too (this case has ticket numbers regardless, so `V3`'s policy change doesn't affect its grading, but it's a good check that the field-presence carve-out for `participants` works the same way). Price/amount field is explicitly blank in the source (`טעינת כסף: -`) but there is a stated ₪20 refundable wristband deposit, which is a real instance of the deposit/prepayment field already anticipated in the Hotel-derived field list. Location for this case is just "WaterLand" with no address on the ticket itself — a real test of the `V3`-frozen accurate-location rule when the source document doesn't supply an address at all. Also a genuine multi-ticket-number case: does one ticket-holder per QR count as four `participants` entries, or one `participants` entry with four `ticketNumbers`? Open — see new sub-question below. |
| `AE-007` | `image.png` (screenshot) | `bc9c31632561e2b230e979360f60b1c3a129384919c4b55bad453b2d4f55d561` | Zoo ("גן החיות") entry ticket, 25/08/2020 11:30 | **Closes the image/screenshot format gap** flagged above — this is a PNG screenshot of a PDF viewer window (filename bar visible at top reading roughly "...גן חיות...pdf(1)"), not the underlying PDF file itself, sent to the conversation as an image twice (identical content, one hash). A genuine instance of the same real-world document reaching Smart Import through the image path instead of the PDF path, which the delivery-slice section already commits to supporting but which none of `AE-001`–`AE-006` actually exercised. Free ticket (price `0.00`), quantity 3, gated on a stated club/discount voucher eligibility rule ("מועדון חבר / מועדון טוב / קרנות השוטרים... הכניסה תתאפשר רק עם שובר הזמנה של המועדון" — entry permitted only with a club voucher reservation) — a real access-requirement case, similar in kind to Hotel's dress-code/access-requirement field. Transaction number ("מס' עסקה") `1713809` present, consistent with `V3`'s required-when-present (not blocker) treatment. Exactly **one named person** ("בן יצחק אייל") covers a party of 3 — a genuine middle case between `AE-001` (every ticket-holder individually named) and `AE-006` (no ticket-holder named at all), worth using to settle how a single named booker plus an un-named party size should populate `participants`. Evidence is a **linear barcode**, not a QR — first case in the set without a QR code, a real test that the "QR/barcode as first-class evidence" rule (proposed above) is written broadly enough to cover barcodes generally, not just QR specifically. Venue identity is carried mostly by a logo graphic rather than plain printed text, which is a real vision/OCR difficulty distinct from any prior case, not just a policy question — worth flagging honestly rather than assuming logo-based branding extracts as cleanly as printed text. |

**Gap now closed:** `AE-007` supplies the image/screenshot case that was missing through `V3`. Six PDFs (`AE-001`–`AE-006`) plus one PNG screenshot (`AE-007`) — both formats the delivery slice commits to are now represented at least once. Still no URL case with field-level ground truth (see the candidate URL material below).

**New sub-question opened by resolving question 3 (URL scope) to in-scope:** the Ticketmaster and Leaan/vivenu ticket-platform links seen in the Product Owner's inbox are personal "my tickets" pages, which are very likely login-gated the same way Booking.com's reservation page was in Hotel's `H-005`. Scoping the URL acquisition path into `0.6.6` does not by itself guarantee those specific links are fetchable — this may end up needing its own `access_required` safe-failure case for ticket-platform URLs, the same pattern Hotel already proved out for `H-005`, rather than a fully working extraction path. Registering this as a real open sub-question rather than assuming the acquisition adapter can reach a login-gated page.

### Frozen field-by-field expected values (`V4`)

Ground truth transcribed directly from each source (PDF text extraction for `AE-001`–`AE-006`; direct visual read of the screenshot for `AE-007` — see that case's confidence note, which is deliberately weaker than the PDF cases). Legal/waiver boilerplate is never a structured field on any case — it stays in the preserved original only, per the standing rule.

**`AE-001` — FCB679102D6E6915.pdf (two tickets, one source, shared reference)**
- `provider`: FC Barcelona (CIF G08266298)
- `activityName` / title: "FC Barcelona - Girona FC" (LaLiga, season 2024/25)
- `location`: Estadi Olímpic Lluís Companys — property-first, not "Barcelona" or "Montjuïc"
- `startAt`: 30/03/2025 16:15
- `confirmationNumber`: `FCB679102D6E6915` (labeled "Reference"; identical on both tickets — this is the order-level reference, not a per-ticket one)
- `participants` (2, each with full per-person evidence):
  - Eyal Ben Yitzchak Ben Yitzchak, DNI 40384410 — Acces `5 INF`, Gate `74`, Boca `118`, Row `0010`, Seat `0001`, ticket code `C1E1A`
  - Amit Ben Yitzhak, DNI 40386943 — Acces `5 INF`, Gate `74`, Boca `118`, Row `0010`, Seat `0003`, ticket code `C1E19`
- `amount` / `currency`: €149.00 total price per ticket (VAT included) + €3.50 service fee per ticket, separately labeled — **do not collapse into one number**; both tickets show identical pricing
- Section label: "LATERAL 1"; restriction note: "Only Barça Supporters"
- Date of printing: 28/03/2025 08:59:50 (both tickets) — evidence metadata, not the event date; must not be confused with `startAt`
- Evidence source: printed text plus two independent QR codes (one per ticket)

**`AE-002` — order1955108.pdf**
- `provider` / ticketing platform: EventBuzz
- `activityName` / title: "Experience Park - Red band"
- `location`: אמפי ואהל (Amphi Wahl) — venue name only, no address in source
- `startAt`: 31/03/2021 20:00 (Wednesday) — note this date is materially in the past relative to every other case in the set; frozen as-is from the source, not corrected
- `confirmationNumber`: order number `1955108` (same number appears as both the top-level "מספר הזמנה" and inside the ticket sub-block)
- `participants`: orderer named as אייל בן יצחק (Eyal Ben Yitzhak); ticket quantity shown as 1
- Seat: Row 4, Seat 26, Section/Gate B
- Evidence source: one QR code (order-level) plus a second, distinct QR code inside the ticket sub-block — two QR codes on one ticket is itself worth noting, evidence should link to whichever QR actually encodes the redeemable ticket, not just the first one found
- No price/amount shown anywhere in the source — must not be fabricated as `0` or omitted silently; correct behavior is "not present in source."

**`AE-003` — SmarTicket_eticket_...6868cd6cad9f9.pdf (3 tickets, general museum entrance)**
- `provider`: Bloomfield Science Museum Jerusalem (מוזאון המדע ע"ש בלומפילד ירושלים), sold via SmarTicket.co.il
- `activityName` / title: "כניסה למוזיאון" (Museum entrance)
- `location`: Bloomfield Science Museum Jerusalem — property-first
- `startAt`: 05/07/2025 10:00
- `participants`: all 3 tickets under אייל בן יצחק (Eyal Ben Yitzhak) — no other names present
- Per-ticket IDs (`ticketNumbers`): `2133782`, `2133783`, `2133785` — note `2133784` does not appear anywhere in this source; do not infer or fabricate a fourth ticket to fill the gap
- Purchase timestamps: 09:56:29, 09:56:32, 09:56:34, all 05/07/2025 — evidence metadata, not `startAt`
- `amount`: payment-method field is blank on all three tickets and no price is printed — free tickets, frozen as "not present in source," not `0`
- Evidence source: one barcode + one QR per ticket (3 of each total)

**`AE-004` — SmarTicket_eticket_...6868cfab5aa01.pdf (3 tickets, auditorium show, same visit as `AE-003`)**
- `provider`: Bloomfield Science Museum Jerusalem, same as `AE-003`
- `activityName` / title: "פילים – סיפורה של ליטלפוט" (Elephants – The Story of Littlefoot) — explicitly labeled "מותנה ברכישת כרטיס למוזיאון" (conditional on purchase of a museum ticket) — this is the direct textual evidence tying `AE-004` to `AE-003` as a companion pair, stronger evidence than any numbering pattern between the two sources' ticket IDs (their ID ranges are not adjacent: `AE-003` is `213378x`, `AE-004` is `213385x` — do not assume a shared numbering block)
- `location`: Bloomfield Science Museum Jerusalem, Auditorium (אודיטוריום) — same venue as `AE-003`, different sub-venue
- `startAt`: 05/07/2025 13:00 — same date as `AE-003`, three hours later
- `participants`: all 3 tickets under אייל בן יצחק, same as `AE-003`
- Per-ticket IDs: `2133855` (Row 5, Seat 11), `2133856` (Row 5, Seat 10), `2133857` (Row 5, Seat 9)
- `amount` / `currency`: ₪5 per ticket ("כרטיס סרט" / film ticket), paid by Visa ending 0625 — unlike `AE-003`, this one is explicitly priced and paid
- Purchase timestamps: 10:08:05, 10:08:06, 10:08:08, same date — roughly 12 minutes after `AE-003`'s purchase timestamps, consistent with one visit booked as two separate transactions
- Evidence source: one barcode + one QR per ticket

**`AE-005` — Tickets.pdf**
- `provider`: איגוד לספורט הניווט (the orienteering sport association), event branded "ניווט ביער גמזו" (Gamzu Forest Orienteering)
- `activityName` / title: "ניווט ביער גמזו" — note the source's own page title adds "- הכרטיסים אזלו" ("tickets sold out"), which is a sales-status label on the page, not part of the event name, and must not be folded into the title
- `location`: גמזו, plus-code `7V8+5WXF`, מודיעין מכבים רעות, ישראל (Gamzu, Modi'in Maccabim Re'ut) — property/area-first, this is as precise as the source gets (no street address, a plus-code instead)
- `startAt`: 17/01/2026 08:30, event window stated through 12:30 (an explicit end time is given, unusual for this type — worth persisting if a field exists for it, otherwise noting in `notes`)
- `confirmationNumber` (order number): `2ZTN-G53R-GJ8`
- `ticketNumbers`: `2ZTN-G53R-GJ81P` — **frozen precision case:** the ticket number is the order number with `1P` appended, not a coincidentally-similar independent string; extraction must attribute each label to the correct field rather than treating them as interchangeable or picking whichever appears first
- `participants` / booked by: אייל בן יצחק
- Order date: 17/01/2026 (same day as the event — booked day-of)
- `amount` / `currency`: ₪120, labeled "כרטיס משפחתי" (family ticket)
- Payment status: שולם (Paid)
- Evidence source: one QR code
- Long liability-waiver paragraph present — preserved-original only, no structured field

**`AE-006` — 1713265782549_entryTickets_1.pdf (4 tickets, WaterLand water park)**
- `provider`: WaterLand water park
- `activityName` / title: "כניסה לגן החיות" — **correction, this is WaterLand not a zoo**: title is "כניסה לפארק יום" / Entry Ticket, פארק יום (day park)
- `location`: "WaterLand" only — no address anywhere in the source; frozen as venue-name-only, a real test of the accurate-location rule when the source itself supplies nothing more precise
- `startAt`: 24/04/2024 (entry date; no specific time given — this is a day-ticket, unlike every other case in the set which carries a time)
- Ticket type: "כרטיס משפחתי 4 אנשים-יום" (family ticket, 4 people, day)
- `ticketNumbers` (4, one per single-use ticket): `623000111`, `623000112`, `623000113`, `623000114`
- Each ticket carries its own QR encoding a longer numeric string beginning `0000623000...` and sharing the corresponding short ticket number as a visible substring — **confidence note:** the exact trailing digits of these four long QR-adjacent numbers were transcribed from PDF-extracted text and are usable as evidence, but given their length or a small chance of copy/paste drift they should be re-verified against the source PDF directly (or the QR's actual decoded payload) before being hard-coded anywhere as byte-exact test fixtures — the four short `ticketNumbers` above are the reliable frozen identifiers.
- `participants`: no individual names — source only shows "משתתף 1 משתתף 1 (55203)" (participant 1, participant 1, member/account id 55203); frozen as **no per-person names present in source** — correct behavior is 4 `ticketNumbers` under either one `participants` entry or four unnamed entries, not fabricated names
- `amount`: "טעינת כסף" (charge) field is explicitly `-` (blank) in the source — frozen as **not present**, not `0`
- Deposit note: ₪20 refundable deposit for a lost/damaged digital wristband — frozen as a `deposit`/prepayment-shaped value, not `amount`
- Printed: 16:09:40 on 16/04/2024 (evidence metadata, 8 days before the entry date — not the event date)
- Evidence source: one QR per ticket, no barcode text/seat/section (no assigned seating at a water park)

**`AE-007` — image.png screenshot (zoo/safari entry ticket)**
- `provider`: a zoo, printed as "גן החיות" (venue's own precise name is not legible beyond this generic label in the source — **frozen as a real location-precision limitation**, not resolved by assumption; correct behavior is to persist what the source actually shows and flag for review rather than guessing a specific zoo brand name)
- `activityName` / title: "כניסה לגן החיות 2020" (Zoo entry 2020)
- `startAt`: 25/08/2020 (Tuesday) 11:30
- `confirmationNumber`: transaction number ("מס' עסקה") `1713809`
- `participants`: one named person, בן יצחק אייל (Eyal Ben Yitzhak), covering a party of 3 (`סה"כ כרטיסים: 3`) — **frozen middle case:** correct behavior is one named participant plus a stated quantity of 3, not three fabricated named entries and not a silent drop of the quantity
- `amount` / `currency`: ₪0.00 (both per-unit "מחיר" and "סה"כ עלות" total both show 0.00) — a genuinely free ticket, distinguish from `AE-002`/`AE-003`/`AE-006` where price is simply *absent* from the source; here it is explicitly present and zero
- Eligibility/access-requirement note: "מועדון חבר / מועדון טוב / קרנות השוטרים... הכניסה תתאפשר רק עם שובר הזמנה של המועדון" (club member / discount club / police funds — entry permitted only with a club voucher reservation) — frozen as a real access-requirement value, same field kind as Hotel's dress-code/access-requirement precedent
- Evidence source: one linear barcode (not a QR) with an adjacent printed digit string — **confidence note, weaker than every PDF case:** this string was read visually from a screenshot rather than extracted as PDF text, so unlike `AE-001`–`AE-006`'s barcode/QR-adjacent numbers, its exact digits are not frozen here with full confidence; only the clearly legible fields above (`provider`, title, date/time, transaction number, quantity, price, eligibility note) are frozen as byte-exact ground truth. This gap itself is real product signal: image-sourced evidence should carry a visibly lower confidence tier than PDF-text-sourced evidence for exactly this kind of long numeric string, and the UI/evidence model should be able to represent that difference, not just extraction accuracy generally.
- Format note: this is a screenshot of a PDF viewer window (filename bar partially visible), not the underlying PDF — the genuine image-path case for the benchmark.

## Proposed delivery slice boundary (Decision 7 equivalent) — PROPOSED, not frozen

Mirrors Hotel/Flight: attraction/event ticket PDFs and images/screenshots (gallery or camera), from global Add (new-Attraction proposal) and from an existing Attraction item (`Attach only` / `Attach and extract`). Same full architecture requirements as every prior slice: immutable source identity, processing attempts, field evidence, proposal review, explicit approval, duplicate handling, multi-source relationships, attachment ownership, partial/failure states, authorization and audit/cost/latency measurement.

Public attraction/ticket-platform URLs: **in scope for `0.6.6`**, per the `V2` resolution of question 3 and the `V4` Product Owner decision on how to treat ticket-platform sites specifically: **ship the full URL acquisition path; official venue/museum/OTA URLs (a museum's own booking page, Klook, GetYourGuide, Viator) are the actual intended target of this sub-scope and are expected to work — that's the `H-004` half of the precedent; ticket-resale/box-office platform URLs (Ticketmaster, vivenu/leaan.net, hapoelbc.com) are expected to land on a safe-failure state, mirroring the `H-005` half, and that failure is documented as expected behavior, not treated as a defect when it happens.** This is now better-founded than `H-005` was at the time it was written: `H-005` predicted a login wall before testing one, where here there is already real evidence — four independent ticket-platform URLs, tested directly, 4/4 blocked by `robots.txt` (see the candidate URL material below) — though notably not the login-wall failure mode `H-005` itself demonstrated; `robots.txt`-blocked should be treated as its own named safe-failure reason alongside `access_required`, not folded into it. What remains open, and is the actual gap before this sub-scope can move from "in scope" to "frozen and gradeable": **zero official venue/museum/OTA URLs have been tested at all** — every URL tested so far is a ticket-resale/box-office platform, the side of this scope expected to fail, not the side expected to succeed. A real success-case URL (a museum or attraction's own booking/ticket page) is the one thing still needed to fully validate this sub-scope end to end; the implementation package below proceeds without it, treating this as a known, explicitly accepted gap rather than a silently assumed one.

### Candidate URL material found in the Product Owner's inbox (not yet catalogued as `AE-` cases)

A Gmail search (`ticketmaster OR vivenu OR eticket OR "e-ticket" OR tickets`) turned up real ticket-platform emails with direct URLs, several distinct providers — this is raw material for closing the URL sub-scope, not yet frozen benchmark cases:

| Provider | URL pattern found | Event | Access signal |
|---|---|---|---|
| vivenu.com (issued via `reservations@leaan.co.il`) — also reachable as `tickets.leaan.net` | `https://vivenu.com/ticket/<id>/<token>`, same `<id>/<token>` also resolves under `https://tickets.leaan.net/ticket/<id>/<token>` | Hapoel Tel Aviv – Hapoel Haifa, 27/09/2025 | **Tested (`tickets.leaan.net` form, Product Owner-supplied directly in chat) — also blocked by `robots.txt`.** A fourth ticket-platform domain with the identical failure mode. Also a real architectural observation, not just an access result: `tickets.leaan.net` and `vivenu.com` share the exact same ticket id/token pair, meaning leaan.net is very likely a white-labeled custom domain sitting in front of the vivenu.com ticketing platform rather than a separate provider — worth knowing if a future acquisition adapter special-cases the vivenu.com domain, since the same ticket can arrive under either hostname. The `vivenu.com` form of this same URL remains itself untested (my tool will only fetch a URL that appeared directly in a user chat message; the `vivenu.com` link was found via email search, not pasted).|
| vivenu.com (issued via `reservations@tickets.hapoelbc.com`) | `https://vivenu.com/ticket/<id>/<token>` — one URL per ticket, 2 tickets in this email | Hapoel Tel Aviv – Red Star (הכוכב האדום), 16/12/2025, Pais Arena Jerusalem | Untested — see note below |
| tickets.hapoelbc.com | `https://tickets.hapoelbc.com/transaction/<id>/<token>` and `https://tickets.hapoelbc.com/ticket/<id>/<token>` | (Product Owner-supplied directly in chat, both paths) | **Tested — both URL shapes blocked by `robots.txt`.** Confirms the block is domain-wide policy, not specific to one path pattern. A third access-barrier shape distinct from `H-005`'s login wall: the page may or may not require login, but a robots-respecting fetcher is refused before that even becomes relevant. Worth naming as its own case, not folded into `access_required`, since the safe-failure reason differs (robots policy vs. authentication). |
| viagogo.com | `https://www.viagogo.com/il/secure/downloadetickets?token=...` | FC Bayern München vs Club Brugge, Allianz Arena, 22/10/2025, Order #626843013 | **Confirmed login-gated by the email's own text** ("Please log in to your viagogo account to access your tickets") — the clearest `H-005`-shaped case in this set. Not independently fetch-tested (untested by my tool). |
| ticketmaster.co.il | `https://www.ticketmaster.co.il/t/<id>/<ref>/iw` (two distinct examples supplied: Ref `2UNRJ` for "טונה"/Tuna at Heichal Menora Mivtachim, 27/11/2025; Ref `2NN14`, event not yet identified) | See above | **Tested (Ref `2NN14`, Product Owner-supplied directly in chat) — also blocked by `robots.txt`.** Same failure mode as `tickets.hapoelbc.com`, now confirmed on a second, unrelated ticket-platform domain. This is starting to look like a real pattern across Israeli ticket-platform sites rather than a one-off: worth treating "robots-disallowed" as its own expected access outcome for this whole domain class, not an edge case. The `2UNRJ` example (under Paola Kohan's name, forwarded to the Product Owner — a real "source names someone other than the account holder" case) has not itself been fetch-tested, but there is no reason to expect a different result from the same domain's robots policy. |

**Important caveat, updated:** my own fetch tool here refuses these URLs for reasons specific to *this session's* tool (it only fetches URLs found in a user chat message, and it separately respects target-site `robots.txt`) — neither restriction says anything definitive about whether the actual FamilyTrips acquisition adapter, which may not be robots-constrained the same way, could reach these pages. What has changed since the last note: **four independent domains** (`tickets.hapoelbc.com` on two URL shapes, `ticketmaster.co.il`, `tickets.leaan.net`) have now all hit the identical `robots.txt`-disallowed outcome when tested — four-for-four. This is real signal that ticket-platform sites broadly block automated fetching by policy, independent of login state — worth surfacing to the Product Owner as a likely third failure mode alongside `access_required` (login) when `0.6.6`'s actual acquisition adapter is built and tested for real, and worth testing early with whatever fetch mechanism that adapter actually uses rather than assuming this session's result generalizes. The bare `vivenu.com` hostname remains untested (only its `tickets.leaan.net` mirror has been tried), though given `tickets.leaan.net` shares vivenu's ticket ids and both are now part of a 4/4 pattern, there's little reason to expect a different outcome.

## Proposed acceptance gate

Mirrors every prior slice: 100% exactness on proposed structured fields across the frozen benchmark set; 100% recall of each case's expected fields or an explicit unreadable/needs-review state; zero silent omission of a no-omission-blocker field; zero fabricated values; zero silent final writes; zero duplicate final items across any companion/duplicate-source case; correct per-ticket-holder splitting on any multi-person source; field evidence visible for every proposed value, including QR/barcode-sourced values.

## Entry gate status

**PASSED as of `V4`.** All three gating items are closed:

1. **Benchmark material — closed.** Seven real documents (`AE-001`–`AE-007`), exceeding the "2–4 plus one wild-card" bar, spanning six providers and three languages, with a genuine wild-card (`AE-001`), both PDF and image formats, and several real edge cases exercised: companion/duplicate-source (`AE-003`/`AE-004`), near-identical order-vs-ticket-number strings (`AE-005`), no-per-person-identity and no-address-on-source (`AE-006`), single-named-booker-for-a-party and barcode-not-QR evidence (`AE-007`).
2. **Product Owner freeze of open questions — closed.** All three Decision 4 questions resolved (ticket number not a blocker; location must be accurate; URL scope in-scope), plus the `V4` sub-decision on how ticket-platform URLs specifically should be treated (safe-fail expected, not a defect).
3. **Field-by-field frozen expected values — closed.** Written and frozen above for all seven cases, including explicit confidence notes where source legibility genuinely limits precision (`AE-006`'s long QR-adjacent digit strings, `AE-007`'s barcode digits and unresolved exact venue name) rather than papering over those gaps with invented precision.

**One explicitly accepted, non-blocking gap carried into implementation:** no official venue/museum/OTA URL has been tested end-to-end — every URL tested so far is a ticket-resale/box-office platform (the side of the URL sub-scope expected to safe-fail), not the side expected to succeed. This is named here rather than silently assumed; the implementation package should include this as a specific verification step once a real venue-site URL is available, not treated as already proven.

This document is ready to drive an implementation package per `VERSION_PACKAGE_AUTHORING_STANDARD_V27.md`'s "Complete lifecycle."
