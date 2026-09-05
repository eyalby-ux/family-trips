# FamilyTrips Flight Smart Import — Type Contract and Benchmark

**Document revision:** `V3`
**Target application version:** Alpha 0.6.5
**Status:** Frozen. Entry gate for `0.6.5` implementation is passed. Live QA testing against this benchmark is in progress.
**Date:** 2026-09-05

## Change history

| Revision | Date | Change |
|---|---|---|
| V3 | 2026-09-05 | **`V6-F72`.** Corrects `FL-003`'s direction for both legs, now Product Owner-confirmed from firsthand knowledge of the trip (not inferred): **leg 1 (LY87) is TLV→HKT**, not HKT→TLV as originally catalogued; **leg 2 (LY84) is BKK→TLV**, not TLV→BKK as originally catalogued. This is the exact RTL-misreading risk `V2` flagged as pending for this case, and it materialized on both legs. Also corrects `FL-002`'s direction for the same reason: `FL-002` shares flight number LY087 with `FL-003`'s now-confirmed LY87/TLV→HKT leg and was never independently Product-Owner-confirmed the way `FL-001` was — **proposed correction: LY087 is TLV→HKT**, departure TLV 22:20 on 7 Jan 2027, arrival HKT 14:30 on 8 Jan 2027 (the original local date/times were always correctly paired; only the direction and which date/time belongs to which end were wrong). This `FL-002` correction is inferred with high confidence from logical consistency with the `FL-003` confirmation, **not independently confirmed by the Product Owner for `FL-002` itself** — flagged here for that confirmation. Unlike `FL-001`'s `V2` correction (which only ever fixed this document's own recorded ground truth), this revision is paired with a real fix to the extraction behavior itself: see `V6-F72` in `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`. |
| V2 | 2026-08-25 | Corrects `FL-001`'s direction: the Product Owner confirmed live during QA testing that flight LY084 is **BKK→TLV** (Bangkok to Tel Aviv), not TLV→BKK as originally catalogued — an RTL-layout misreading of the source screenshot on first cataloguing. Departure/arrival times are corrected accordingly (BKK 16:30 departure, TLV 22:45 arrival — the times themselves were always correctly paired, only the direction label was wrong). Flags that `FL-003`'s direction labels (recorded as "HKT→TLV LY87 / TLV→BKK LY84") may have the same RTL-misreading risk and are pending Product Owner reconfirmation during its own QA pass. |
| V1 | 2026-08-25 | Initial freeze — type contract and 8-case benchmark. |

## Relationship to the Hotel discovery session

`SMART_IMPORT_REDESIGN_DISCOVERY_V22.md` froze seven decisions for Smart Import. Decisions 1 (product promise), 2 (processing/privacy), 3 (universal source-landing behavior) and 5 (bounded URL/enrichment policy) are explicitly generic — written to apply "for every FamilyTrips item type," not just Hotel — and are **inherited unchanged for Flight**. This document does not repeat them; it only freezes what is Flight-specific: Decision 4 (required fields/evidence) and Decisions 6–7 (benchmark and delivery slice) for the Flight type.

## Flight-specific required fields (Decision 4 equivalent)

**No-omission blockers** — must never be silently dropped when present in the source: flight number, departure airport, arrival airport, departure date/time, arrival date/time, booking/confirmation reference (PNR).

**Required when present, not blockers** (commonly absent in real sources, e.g. before check-in): per-passenger seat, per-passenger e-ticket number.

**Also required when present:** airline (operating and marketing carrier, when they differ), aircraft type, class/fare basis, flight duration, departure/arrival terminal, gate, gate-opens/gate-closes times, boarding sequence number, and per-passenger: full name, baggage allowance (per bag type — carry-on/checked/trolley — with weight and included/not-included), meal special request.

**Multi-passenger bookings:** a single flight may carry multiple named passengers (family bookings are common). All passengers present in the source must appear, each with their own evidence-linked field values (seat, baggage, meal, e-ticket number) where the source provides passenger-level detail — this follows directly from the already-frozen source-relative-completeness rule, not a new exception for Flight.

**Multi-segment bookings → multiple Flight items:** one booking/source document may describe more than one flight segment (an outbound and a return, a connection, or an unrelated second booking on the same page). Each real segment becomes its own Flight item/proposal, all traceable to the same source — mirrors the existing "multi-source relationships" architecture already used for Hotel companion documents. A booking-level reference (PNR) is not itself a segment and does not collapse multiple segments into one item.

**VOID / empty segments must never become an item.** A segment explicitly marked VOID, cancelled, or with all core no-omission-blocker fields empty, is not extracted as a Flight proposal — it is skipped/flagged, consistent with the existing universal rule that failed or insufficient analysis creates no empty or generic item.

**Meaningful title:** airline + flight number + route (e.g. "TG 246 — Krabi to Bangkok") when both are available; airline + route alone if the flight number is unreadable. A raw booking reference or filename alone is not an acceptable title.

## Benchmark matrix (Decision 6 equivalent)

Eight real, Product Owner-supplied documents/screenshots across four distinct formats: airline-app screenshot, PDF booking confirmation (multi-passenger), PDF individual e-ticket receipt, and a boarding pass with gate/QR data. No synthetic fixtures.

| Case | Source | Format | What it covers |
|---|---|---|---|
| `FL-001` | EL AL app screenshot | App screenshot, single-passenger view | Flight LY084, **BKK→TLV** (corrected in `V2` — confirmed by the Product Owner), departure Bangkok 16:30, arrival Tel Aviv 22:45, 26 Jan 2027, seat 43H, passenger Paola Kohan, aggregate baggage display. No PNR, terminal or class visible in this view — correct source-relative absence. |
| `FL-002` | EL AL app screenshot | App screenshot, single-passenger view | Flight LY087, **TLV→HKT** (corrected in `V3` — inferred with high confidence from `FL-003`'s confirmed LY87 direction, **not yet independently confirmed by the Product Owner for this case specifically**), departure TLV 22:20 on 7 Jan 2027, arrival HKT 14:30 on 8 Jan 2027 (arrival local date later than departure local date once corrected — a real timezone-crossing case; must not be "corrected" or rejected as invalid). Seat 41C, passenger Eyal Ben Yitzhak. |
| `FL-003` | EL AL app itinerary summary | App screenshot, combined view | Both legs in one view with fare class code and aircraft type ("Dreamliner"), no passenger name shown — tests associating a summary source with the per-leg detail in `FL-001`/`FL-002` without duplicating items. **Direction labels confirmed backwards on both legs by the Product Owner in `V3`, from firsthand knowledge of the trip**: leg 1 (LY87) is **TLV→HKT**, not HKT→TLV as originally catalogued; leg 2 (LY84) is **BKK→TLV**, not TLV→BKK as originally catalogued. This is the exact RTL-misreading risk `V2` flagged as pending for this case, materialized on both legs — the identical failure mode as `FL-001`. |
| `FL-004` | THAI Airways "Booking Confirmed" | PDF, multi-passenger | Flight TG 246, Krabi→Bangkok, booking ref `EV7JXO`, 5 named passengers (3 adults, 2 children), per-passenger e-ticket number, per-passenger checked/carry-on baggage, per-passenger meal request (fruit platter, child meal). No seats assigned yet ("-"). Primary vertical-slice case for multi-passenger, no-seats-yet handling. |
| `FL-005` | THAI Airways E-Ticket Receipt, adult | PDF, single-passenger | Same TG 246 flight, passenger Paola Kohan, full fare/payment breakdown, ticket number, barcode, booking status `CONFIRMED`. Tests reconciling with `FL-004` as a companion/duplicate source for the same booking, not a new item. |
| `FL-006` | THAI Airways E-Ticket Receipt, child | PDF, single-passenger | Same TG 246 flight, passenger Ofri Ben Yitzhak (child fare), `CHML` child meal. Companion/duplicate case alongside `FL-004`/`FL-005`. |
| `FL-007` | Wildcard screenshot | App/PDF screenshot, two segments | `Flight #1: VOID` — all fields blank — directly beside `Flight #2`, a real, unrelated segment (Athens→Tel Aviv, ISRAIR 6H568, booking `1172207`, airline reference `-4054363`) with a baggage-inclusion matrix format (per bag type: weight + included Yes/No) distinct from `FL-004`–`FL-006`. Closes the VOID-segment and multi-segment-in-one-source matrix rows. |
| `FL-008` | EL AL boarding pass | Boarding pass, Hebrew, single-passenger | Flight LY2373, TLV→BER, 17:30, 16 Sep 25, seat 38H (aisle), class Economy (`CLSC`), terminal 3, gate-opens 16:50, gate-closes 17:15, sequence number `0090`, ticket number `TL11287389`, QR barcode, passenger Ben Yitzhak Eyal. Closes the boarding-pass-specific field matrix row (gate/boarding-window/sequence data not present in any other case). |

## Delivery slice boundary (Decision 7 equivalent)

Flight (`0.6.5`) supports: airline-app screenshots, PDF booking confirmations (single- and multi-passenger), PDF individual e-tickets, and boarding passes — as image/screenshot or PDF, from global Add (new-Flight proposal) and from an existing Flight (`Attach only` / `Attach and extract`). Same architecture requirements as Hotel: immutable source identity, processing attempts, field evidence, proposal review, explicit approval, duplicate handling, multi-source relationships, attachment ownership, partial/failure states, authorization and audit/cost/latency measurement.

Public official airline/booking URLs are explicitly **out of scope for `0.6.5`** — no real Flight URL source was supplied in this benchmark (unlike Hotel's `H-004`/`H-005`). If a URL-based Flight source becomes available later, it requires its own benchmark case before being claimed as supported, following the same rule already applied to every other source type.

## Acceptance gate

Mirrors the Hotel gate: 100% exactness on proposed structured fields across `FL-001`–`FL-008`; 100% recall of each case's expected fields or an explicit unreadable/needs-review state; zero silent omission of a no-omission-blocker field; zero fabricated values; zero silent final writes; zero duplicate final items across the `FL-004`/`FL-005`/`FL-006` companion set; no item created from the `FL-007` VOID segment; correct multi-segment splitting on `FL-003` and `FL-007`; field evidence visible for every proposed value; the `FL-002` timezone-crossing date pair accepted as valid, not corrected or rejected.

## Live QA findings (in progress, 2026-08-25)

- **`V6-F25`** — `FL-001`: month extracted as June instead of January (source shows 26 Jan 2027), no year shown; seat 43H not extracted/displayed. Direction and times, originally flagged as wrong, were reconfirmed correct once the benchmark's own direction label was fixed (see change history). Status: open, pending full benchmark pass before a fix is requested.
- **`V6-F72`** — `FL-003`: both legs' direction extracted exactly backwards by the live model, the identical RTL-misread failure mode as `FL-001`, reproducing despite `V2`'s own flagged risk and an existing prompt-level warning against it. Root-caused as a live-model visual-parsing ceiling (matching the precedent already established for `V6-F53`/`V6-F65`), not fixable by wording alone. Fixed with a strengthened prompt (a concrete positive worked example for RTL combined-view direction reading) plus a new deterministic, code-level cross-check (`flagReversedFlightDirection`) that flags a new extraction as needs-review whenever it is the exact reverse of an already-saved item sharing the same flight number — independent of whether repeated live-model calls happen to agree with each other, which is exactly the gap `V6-F53`'s own dual-call mechanism cannot close. Status: fixed, see `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`.
