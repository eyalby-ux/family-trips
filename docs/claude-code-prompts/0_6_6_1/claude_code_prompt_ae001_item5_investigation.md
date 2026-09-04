AE-001 retest (QA acceptance testing, 0.6.6 build) surfaced a partial gap on item 5 of the standard checklist (per-passenger splitting). Investigate root cause only — do NOT fix yet, same pattern as the other pending findings this session.

## Context: why this matters more than a typical UI-gap note

`AE-001` is the mandatory wild-card case for the Attraction/Event Smart Import benchmark (`ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`, frozen `V4`). Its frozen ground truth for `participants` is:

- Eyal Ben Yitzchak Ben Yitzchak, DNI 40384410 — Acces `5 INF`, Gate `74`, Boca `118`, Row `0010`, Seat `0001`, ticket code `C1E1A`
- Amit Ben Yitzhak, DNI 40386943 — Acces `5 INF`, Gate `74`, Boca `118`, Row `0010`, Seat `0003`, ticket code `C1E19`

`participants` is one of the base fields already defined in `TYPE_FIELDS.activity`, and the discovery doc's frozen "multi-ticket bookings" rule states: "one source may cover multiple named ticket-holders for the same event... All ticket-holders present in the source must appear, each with their own evidence-linked seat/section/ticket-number where the source provides per-person detail." This is graded ground truth, not a nice-to-have — so whether this data is actually captured and stored is directly load-bearing for whether `AE-001` passes or fails against the frozen benchmark, independent of whether the UI currently displays it.

## Observed behavior

Eyal saved the `AE-001` item (source `FCB679102D6E6915.pdf`) on the QA 0.6.6 build. Items 1–4, 6, 7 of the standard checklist passed (title, property-first location, date/time, reference number, price + separate service fee with ambiguity warning, printing-timestamp not confused with event date). Item 5 (per-passenger splitting: both DNI-holders, seats, gates) is **not shown** in the item detail UI — only the source PDF is attached as a reference document; there is no structured per-passenger breakout rendered.

## What to determine — two scenarios, different severity, don't assume either way

**Scenario A (UI-only gap, low severity, fine to defer):** both passengers' full evidence (names, DNIs, Acces/Gate/Boca/Row/Seat, ticket codes) IS present in the saved item's stored data — it's just not rendered per-person in the current detail view, and that rendering is planned for Beta's new UI.

**Scenario B (real extraction/persistence gap against frozen ground truth):** the per-passenger data is NOT actually captured/stored at all — e.g. `participants` is empty, contains only one of the two passengers, contains names without DNI/seat/gate, or was never wired up for the `activity` type's extraction path in the first place.

## Investigation steps

1. Locate the actual saved `AE-001` item record as persisted by the app (wherever `activity`-type items are stored) and inspect the raw `participants` field (and any related `details.*` fields — check the current schema in `TYPE_FIELDS.activity` / `FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V5.md` §6 for the actual field name(s) this app uses for per-person ticket-holder data). Report exactly what is stored: which of the two passengers are present, and which of name/DNI/Acces/Gate/Boca/Row/Seat/ticket-code are populated per passenger vs. missing.
2. Check the current Smart Import extraction code path for the `activity` type to see whether per-passenger/seat/DNI extraction is actually implemented for this type, and whether it was exercised on this source. Compare against how Flight's multi-passenger extraction works (referenced in the discovery doc as the precedent this is modeled on) — is `activity` actually wired the same way, or only partially (e.g. name-only, no seat/DNI)?
3. Check the item detail view rendering code for the `activity` type (`detailView()` or equivalent) to see whether there is any code path at all for rendering `participants` per-person. Distinguish "field exists in code but is empty/undefined for this item" (data-layer gap — Scenario B) from "field is correctly populated but no rendering path exists yet, deferred to Beta's new UI" (Scenario A).
4. Report a precise bottom line: which scenario this actually is, with the exact stored field values as evidence either way.

## Registration

Do not fix. If this turns out to be Scenario B (data genuinely not captured), register it as a new finding with the next available finding ID in the standard's mandatory finding register format, root cause explained, severity reflecting that it's a gap against frozen `AE-001` ground truth (not cosmetic). If it is confirmed Scenario A (fully captured, display-only gap correctly deferred to Beta), still log it for tracking with the next available finding ID, but mark it clearly as a low-severity/deferred-UI item, distinct from a data-capture defect — state explicitly in the entry which scenario your evidence shows so this doesn't get conflated with a real regression later.

## Addendum: same question on `AE-002` — seat/row/section data also not shown

While testing `AE-002` (`order1955108.pdf`, "Experience Park - Red band"), the same class of gap showed up. `AE-002`'s frozen ground truth (`ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`) includes a per-ticket seat assignment: Row 4, Seat 26, Section/Gate B. Seat/section assignment is listed in the discovery doc as "required when present, not [a no-omission] blocker" — so, like `AE-001`'s per-passenger data, it's graded ground truth, just not a hard fail if genuinely absent from the source. On the saved `AE-002` item, none of Row/Seat/Gate B appears anywhere in the detail view.

Since this is the same field family (per-ticket seat/section data on the `activity` type) and the same open question (stored-but-not-rendered vs. never captured) as the `AE-001` item 5 investigation above, treat it as the same root-cause investigation rather than a separate one:

1. Inspect the actual saved `AE-002` item's stored data the same way as step 1 above — is Row 4 / Seat 26 / Section-Gate B present anywhere in the stored record (under `participants`, `details.*`, or wherever this app models it), or is it genuinely absent from what was extracted and saved?
2. If it IS present in code/schema for `activity` but not surfaced in the detail view for either `AE-001` or `AE-002`, that confirms a single shared root cause (Scenario A, display-only, both cases) rather than two separate bugs — say so explicitly.
3. If it's present for one case but not the other (e.g. seat data stored for `AE-002` but not for `AE-001`, or vice versa), that means the extraction/storage behavior is inconsistent rather than a clean UI-only gap — flag this distinction clearly, since it changes the severity call.

Fold this into the same finding registration decision as the `AE-001` item 5 question above — don't open a second finding ID for what may turn out to be one shared root cause; state clearly in whichever finding you register whether `AE-002`'s seat data followed the same pattern as `AE-001`'s participant data.

## Addendum 2: `AE-004` also missing its seat data — pattern now 3-for-3

`AE-004` (`SmarTicket_eticket_...6868cfab5aa01.pdf`, Bloomfield Science Museum auditorium show) has frozen ground truth of 3 tickets, each with an assigned seat. On the saved `AE-004` item, no seat/section data appears anywhere in the detail view — same gap as `AE-001` and `AE-002` above. This is now the third of three tested cases with per-ticket seat/participant data where none of that data is shown, which meaningfully strengthens the "one shared root cause" hypothesis over "three coincidental bugs." Include `AE-004` in the same stored-data inspection as steps 1–3 above (is the seat data present in `AE-004`'s stored record but unrendered, or genuinely absent?), and state in your finding whether all three cases show the identical pattern (same root cause, single fix) or whether any of them diverges (inconsistent behavior, which would need separate handling).

Related, lower-confidence data point worth a quick check while you're in there: `AE-003` (Bloomfield Science Museum general entrance) has frozen per-ticket IDs `2133782`/`2133783`/`2133785` (`ticketNumbers`) that also don't appear to be shown anywhere in its detail view — only a general warning that "no confirmation number is shown" (which is correct/expected, since the source has no separate order-level confirmation number, only per-ticket IDs). If `AE-003`'s `ticketNumbers` are also stored-but-unrendered, that's consistent with the same root cause extending beyond seats specifically to per-ticket identifiers in general; if you find this, mention it, but don't let it expand scope beyond a note — the primary ask is still the seat/participant question above.

## Addendum 3: `AE-005` — the case's entire precision test may be unverifiable from the UI, plus a missing `amount`

`AE-005` (`Tickets.pdf`, Gamzu Forest Orienteering) is frozen specifically as an extraction-precision test: `confirmationNumber` (order number) is `2ZTN-G53R-GJ8`, and `ticketNumbers` is `2ZTN-G53R-GJ81P` — the ticket number is the order number with `1P` appended, and the whole point of this benchmark case is proving extraction attributes each label to the correct field rather than treating the two near-identical strings as interchangeable. On the saved item, only `מספר הזמנה` (order number) `2ZTN-G53R-GJ8` is shown anywhere — there is no visible `ticketNumbers` value at all. Since this is the one case in the whole benchmark set built specifically to test this distinction, and the distinguishing field isn't rendered, the case's actual pass/fail can't currently be confirmed from the UI alone. Please retrieve the stored `ticketNumbers` value for this item directly and report it — does it read `2ZTN-G53R-GJ81P` (correct, precision test passed, just not displayed) or something else (wrong value, missing entirely, or collapsed to the same value as `confirmationNumber` — precision test actually failed)?

Separately: `AE-005`'s frozen `amount`/`currency` is ₪120 (labeled "כרטיס משפחתי" / family ticket, status "שולם" / Paid). The saved item's detail view shows the payment status ("התשלום מסומן כשולם") and ticket type but no amount/price value anywhere. Check whether ₪120 is present in the stored item and just not rendered, or was dropped during extraction.

**Framing that should guide the whole investigation now:** across `AE-001` (participants/DNI/seat), `AE-002` (seat/row), `AE-004` (seat), and now `AE-005` (`ticketNumbers`, `amount`), the pattern is consistently "value correctly required by the frozen benchmark, not shown in the detail view" — and it keeps recurring across different field names, not just seats. This increasingly looks like the item detail view for the `activity` type may only render a fixed set of base/summary fields and never renders anything from `details.*` or per-ticket/per-passenger sub-structures at all, regardless of which specific field is involved — i.e. one rendering-completeness gap in `detailView()` (or equivalent) for this item type, rather than several unrelated per-field bugs. Please confirm or refute this unified hypothesis directly against the code: does the `activity` detail view template enumerate and render `details.*` sub-fields at all, or does it only render a fixed hardcoded field list that happens to exclude everything tested above?

Report back with root cause, the scenario determination, and evidence, before any correction package is authored. This does not need to block moving on to the rest of the Attraction/Event Smart Import acceptance testing.
