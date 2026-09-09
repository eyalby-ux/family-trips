# INSURANCE_SMART_IMPORT_DISCOVERY

Status: **FROZEN.** All entry-gate and Decision 4/6/7 questions are resolved by the Product Owner, including the Section 3a architecture question (dedicated/activity-linked insurance and Timeline behavior), closed this revision via a `/product-management:brainstorm` session. `0.6.7`'s implementation prompt may now be authored.
Document revision: `V3`
Date: 2026-09-08
Sequenced: `0.6.7`, immediately following `0.6.6` (through its `0.6.6.1`–`0.6.6.3` correction cycle, closed and live in Production)

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V3 | 2026-09-08 | Resolved Section 3a via a `/product-management:brainstorm` session with the Product Owner. Final design: `schedule` stays fixed at `'entire'` for every insurance item, including dedicated/activity-linked ones (Option A from `V2` — Option B, per-item date-aware `schedule`, was explicitly rejected: "I don't want they both will appear on the Today page... I want to be able to reach the insurance both from the activity/event/item or from the insurance basket"). A new field, `relatedItemIds` (array), is added to `TYPE_FIELDS.insurance` only, letting a Product Owner manually link an insurance item to one or more other items it covers (e.g. a diving activity, a rental car). The reverse direction — an item showing the insurance that covers it — is a **computed lookup at render time** (scan all items for any insurance item whose `relatedItemIds` includes this item's id); no new field is added to any other item type. The link is two-way and tappable in the UI. No new "basket" surface is needed — the existing Insurance category tile in Trip Center already serves that role. This closes the document's last open question; status moves from DRAFT to **Frozen**. |
| V2 | 2026-09-07 | Product Owner confirmed three of the four `V1` open questions: (1) add `startAt`/`endAt` to `TYPE_FIELDS.insurance` — confirmed, and expanded in scope (see below); (2) `phone`-priority resolution (emergency line over claims line) — confirmed; (3) sum-insured amount to `notes` — confirmed; (4) Decision 7, PDF/image-only, no URL scope — confirmed, no real URL example available. Confirming (1) surfaced a new, real requirement: the Product Owner wants **dedicated, activity- or asset-linked insurance policies during the trip** (a diving-specific policy, a rental-car excess-protection policy), not just whole-trip medical/travel insurance — illustrated with two more real documents, `INS-007` (DiveAssure, single-day) and `INS-008` (RentalCover.com/Cover Genius rental-car excess protection, a sub-range of the trip). This surfaces a genuine architecture question beyond a simple field addition — see Section 3a — which is now this document's one remaining open item before it can freeze. |
| V1 | 2026-09-07 | Baseline draft. Data-model check performed by direct code inspection (not assumed). Six real benchmark documents supplied by the Product Owner, individually catalogued with SHA-256 identity and frozen field-by-field expected values, including one mandatory wild-card. Decisions 4 and 7 proposed for Product Owner confirmation; Decisions 1/2/3/5/6 inherited per the established pattern. |

## 1. Data-model check (performed first, not assumed — per this project's standing rule after the Activity precedent)

Direct inspection of `src/ingestion.js` on `version/V6` (current `HEAD`, matching the just-synced `docs/roadmap` `V80`) confirms:

- **`ITEM_TYPES.insurance` already exists** as a full peer of every other type: `insurance:{label:'ביטוח',icon:'🛡️',schedule:'entire'}`. `schedule:'entire'` is a distinct value not used by any other type (`flight`/`activity`=`single`, `hotel`/`car`=`range`, `link`/`document`/`contact`/`participant`=`none`) — confirmed in `v5-app.js`: items with `schedule==='entire'` are explicitly excluded from the date-based Timeline (`['none','entire'].includes(item.schedule)`) and instead shown in their own bucket only in "all trip" Timeline mode. This is a deliberate, working design for "spans the whole trip" items, not a gap.
- **`TYPE_FIELDS.insurance` already exists**, but is narrower than Hotel/Flight/Activity: `insurance:['provider','confirmationNumber','phone','participants','notes']`. Notably **absent**: `startAt`/`endAt` (present on every scheduled type), `location`, `website`. The `location`/`website` omissions are reasonable (an insurance policy has no venue). The `startAt`/`endAt` omission is a real, confirmed gap, not a stylistic choice specific to this document's author's judgment — see the open question in Decision 4 below.
- **A type-detection heuristic already exists**, same pattern as Activity: `TYPE_RULES` includes `{type:'insurance',weight:5,pattern:/\binsurance\b|\bpolicy\b|ביטוח/i}` (`src/ingestion.js`). Manual/heuristic classification already works; only the Smart Import extraction contract (schema, prompt, adapter) is missing, exactly the same shape of gap Activity had before `0.6.6`.
- **Conclusion: there is no data-model migration blocker**, same as Activity turned out to be. The real work is the extraction contract, plus one open structural question (coverage dates) flagged below rather than assumed either way.

## 2. Inherited decisions (unchanged from Hotel/Flight/Attraction-Event — Decisions 1, 2, 3, 5)

Insurance inherits the generic Smart Import decisions frozen for Hotel and carried unchanged through Flight and Attraction/Event: the `Source`/`ProcessingAttempt`/`ExtractedDraft`/`Proposal`/`Attachment` pipeline; the `Attach only` vs `Attach and extract` / `Analyze and propose` vs `Save source only` two-choice flows; evidence-backed extraction with `needsReviewFields`/`fieldConfidence`; and the frozen processing/privacy, universal source-landing, source-relative completeness/evidence and bounded external-enrichment contracts recorded in `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`. Nothing insurance-specific changes any of these.

## 3. Decision 4 — no-omission fields for `insurance` (CONFIRMED, including the Section 3a resolution)

Following the same property-first, no-omission discipline as Hotel/Flight/Attraction-Event, based on what all eight real benchmark documents below actually contain.

**No-omission blockers** (every whole-trip-policy document has all of these, without exception):
- `provider` — the insurer's name (not the selling agent/broker, when the two differ — see the Wobi/Phoenix, Toren/Clal, and RentalCover/Cover Genius cases below, all real examples of insurer ≠ seller)
- `confirmationNumber` — the policy number
- coverage start date and coverage end date — **`CONFIRMED` by the Product Owner: `startAt`/`endAt` are added to `TYPE_FIELDS.insurance`**, a real data-model/code change for the Development Agent to make (this planning/QA session cannot make it itself). Confirming this immediately surfaced the larger question in Section 3a below — adding the fields is settled, but *how the item behaves on the Timeline once it has real dates* is not.

**Required-when-present** (present in most but not all eight documents, or naturally singular-vs-plural depending on party count):
- `participants` — the named insured person(s) with ID number and date of birth when the source lists them individually (Harel, PassportCard, Wobi, Toren all do; Direct Insurance and Phoenix cover a single traveler = the policy holder; `INS-007`/`INS-008` are single-traveler/single-policyholder)
- `phone` — **`CONFIRMED`: the 24/7 emergency/medical-assistance hotline specifically**, not a general office/claims number. Every whole-trip document has one; four of the six original documents (Harel, Phoenix, Toren, and implicitly PassportCard's call center) additionally show a *separate* claims/office phone, which goes to `notes` instead — `INS-006`'s two cleanly-separated numbers were the concrete evidence for this. `INS-008` (RentalCover) instead has a claims *URL*, not a phone number at all — see its own entry below for how that's handled.
- sum insured / maximum coverage amount — **`CONFIRMED`: goes to `notes`**, not a new structured field. Present in six of eight documents in some form (medical maximum, or — for `INS-008` — an excess/damage coverage limit in ILS rather than USD, a real unit-of-currency variation worth keeping in mind for the extraction prompt).

**Not required:** insurer website (present in only two of the original six documents; genuinely absent from the rest, not omitted); selling agent/broker name when different from the insurer (present in five of eight — Phoenix/Wobi, Wobi itself, Toren/Clal, and both `INS-007`/`INS-008` — informational, goes to `notes`).

**New field, not Smart-Import-extracted — set manually, resolved by Section 3a:**
- `relatedItemIds` — an array of item ids, added to `TYPE_FIELDS.insurance` only. Lets the user link an insurance item to one or more other items it covers (an activity, a car rental). Never populated by the extraction pipeline — no source document states "this policy is linked to item X"; the user sets it manually after the item exists, same as any other cross-item relationship would have to be. Its full rationale and behavior are in Section 3a below.

## 3a. Dedicated, activity- or asset-linked insurance and Timeline behavior (RESOLVED via `/product-management:brainstorm`, `V3`)

Confirming the `startAt`/`endAt` addition (Section 3) surfaced a real, larger point: the Product Owner wants Insurance to also cover **dedicated policies tied to a specific activity or rented asset during the trip**, not only whole-trip medical/travel insurance — illustrated by two real documents (`INS-007`, a single-day diving policy; `INS-008`, a rental-car excess-protection policy spanning the rental period, not the whole trip). Both are genuinely `insurance` items by every definition already established (an `insurance`-shaped document, extracted the same way), but their coverage dates are meaningfully narrower than "the entire trip."

`V2` framed this as a Timeline-scheduling question, because `schedule` is a fixed, per-item-type constant (`ITEM_TYPES.insurance.schedule==='entire'`, confirmed in Section 1), and asked whether a dedicated policy's narrower date range should make it behave like a `single`/`range` item and appear on the Timeline for its specific day(s) (`Option B`), or whether every insurance item should keep the uniform `entire`-trip bucket regardless of date range (`Option A`).

The Product Owner rejected `Option B` directly: *"I don't want they both will appear on the Today page, since normally, I would not need the insurance, I want to be able to reach the insurance both from the activity/event/item or from the insurance basket and move from there to the activity/event/item."* — followed by, when asked to clarify the reverse-lookup direction: *"no, the activity itself will show-up, and we can access the insurance from there."* The point isn't the Timeline mechanics; it's that insurance is reference material a user reaches *from* the thing it protects (or from the Insurance category), not a thing that competes for space on the day-by-day plan.

**Resolved design:**

- **`schedule` stays fixed at `'entire'` for every insurance item, with no exceptions** — `Option A`. This applies uniformly whether the policy is whole-trip or dedicated/activity-linked. No insurance item ever appears on the date-based Timeline or Today page. `startAt`/`endAt` (Section 3) are still captured and shown on the item itself, for reference and validity checks, but they do not drive Timeline placement.
- **A new field, `relatedItemIds` (array of item ids), is added to `TYPE_FIELDS.insurance` only.** It lets the user manually link one insurance item to one or more other items it covers — confirmed as an array because, in the Product Owner's words, "it can be related to few items" (e.g. one whole-trip policy could reasonably be marked as covering several activities, or a single dedicated policy could cover more than one linked item). This field is never populated by Smart Import extraction; it is set by the user after the item exists.
- **The reverse direction — an activity or rental item showing which insurance covers it — is a computed lookup at render time, not a stored field.** When rendering any non-insurance item, scan the trip's insurance items for any whose `relatedItemIds` includes this item's id, and surface a small "🛡️ insured by ..." reference line if a match exists. No new field is added to any other item type (`activity`, `car`, or otherwise) — this mirrors the existing `linkedItems`-via-shared-`sourceIds` computed-lookup pattern already used elsewhere in the codebase, rather than introducing a new relational-field concept.
- **The UI link is two-way and tappable:** from the insurance item, the linked item(s) are shown and tappable, navigating to the covered item; from the covered item, the "insured by" line is likewise tappable, navigating to the insurance item.
- **No new "basket" surface is needed.** The existing Insurance category tile in Trip Center already serves as the place to see all insurance items, dedicated or whole-trip alike — this design adds a relational link between existing surfaces, not a new one.

This is deliberately the minimal version of the combined idea originally proposed (date-aware `schedule` *and* relational linking) — the brainstorm converged on dropping the date-aware `schedule` half entirely once the Product Owner clarified the actual UX intent, keeping only the relational-link mechanism, which is a much smaller and more precisely-scoped change: one new array field on one item type, plus a computed reverse lookup, with no change to how `schedule` is derived anywhere in the codebase.

## 4. Decision 6 (benchmark) — eight real documents, individually catalogued

Eight supplied by the Product Owner from local files, Gmail, and directly attached to chat — spanning seven different insurers/protection providers, 2010–2026, English and Hebrew sources, PDF, scanned-TIFF and screenshot-image formats, one to five insured travelers, and (as of `V2`) two dedicated/activity-linked policies alongside six whole-trip ones. SHA-256 computed directly from the supplied files (not asserted).

### INS-001 — Direct Insurance (ביטוח ישיר)

- File: `Direct Insurance (ביטוח ישיר).pdf` — SHA-256 `5762f2d461770b5781d7cfbe7c896793d98ad54f5f4d1b4c612047d964f876c6`
- Format/language: native PDF, 6 pages, Hebrew. **Extraction caveat, stated honestly:** this PDF's font has no usable ToUnicode mapping — both `pdftotext` and `pdfplumber` return correct Latin/numeric characters (dates, amounts, ID numbers) but garbled Hebrew label text. All frozen values below were confirmed from the reliably-extracted numeric/date fields plus the document's own filename and known subject line (`רכישת ביטוח נסיעות לחו"ל`, from the sourcing email); Hebrew prose fields were not independently transcribed and are not part of this frozen set. This is disclosed, not glossed over — a live extraction (image-based, not this PDF's broken text layer) would face the same OCR/visual-reading path a scanned document does, which is itself useful benchmark coverage.
- Provider: ביטוח ישיר (Direct Insurance)
- Policy number (`confirmationNumber`): `1595783600`
- Insured (`participants`): Eyal Ben Yitzhak, ID `043119213`, DOB `19/05/1981` — single traveler, self only
- Coverage: `03/02/2023` – `07/02/2023` (5 days)
- Sum insured (medical): `$5,000,000`; search & rescue `$250,000`; third-party liability `$100,000`; baggage `$2,000`; trip cancellation `$5,000`
- Emergency phone (`phone`): `972-3-5655999` (claims/office fax separately: `03-5555545`)
- Total premium: ₪129 (before a ₪10.41 new-customer discount)
- Address on file: Nachshon (kibbutz), postal code 9976000

### INS-002 — Harel (הראל)

- File: `Harel (הראל).pdf` — SHA-256 `2abe95374dc3e0d033180d80ee18ec725cd376ee5586f1e62ccda579a03be67e`
- Format/language: native PDF, 8 pages, mixed Hebrew/English, clean text layer (extracted without issue via plain `pdftotext`)
- Provider: Harel Insurance Company Ltd. (הראל חברה לביטוח)
- Policy number: `765720708226`; plan "First Class 501" (פירסט קלאס); agent מיטב גולדנברג אדוה (#13299); card GOLDCAPITAL ending `2246`
- Insured (`participants`), **two travelers, real multi-person case**:
  - Eyal Ben Yitzhak — ID `43119213`, DOB `19/05/1981`
  - Daniel Ben Yitzhak — ID `220990485`, DOB `20/09/2011`
- Coverage: `12/07/2026` – `19/07/2026` (8 days), destination Europe
- Sum insured (medical, from the English section): `$5,000,000`; per-traveler cost breakdown present (basic coverage, baggage, search/rescue, adventure sports, personal accidents, third-party liability, rental-car excess waiver, trip cancellation — each individually line-itemed per traveler with its own cost)
- Emergency phone (`phone`): `972-3-7547030` (24hr); fax `972-3-7348168`; WhatsApp `972-52-7544589`
- Total premium: $90.24 (basic $36.80 + additional coverages, no discount this policy)

### INS-003 — PassportCard

- File: `PassportCard_1.pdf` — SHA-256 `2370cc772229aa17e5470226fa959ed7241e3ec6f50965b22e251a07e885d427`
- Format/language: native PDF, 1 page, **English only** — a confirmation letter, not the full policy document (a genuinely different document shape from the other five)
- Provider: PassportCard / DavidShield Insurance Company Ltd.
- Policy number: `306117447`
- Insured (`participants`), **two travelers**:
  - Kohan Paola — ID `303597751`, DOB `26 Feb 1982`
  - Ben Yitzhak Daniel — ID `220990485`, DOB `20 Sep 2011`
- Coverage: `28 Nov 2022` – `02 Dec 2022`, area of coverage: Austria
- Sum insured (medical): `$5,000,000.00` (COVID-19, emergency medical, medical evacuation, repatriation of remains all itemized at the same maximum)
- Emergency phone (`phone`): `+972-98920930` (24/7 call center)
- No premium amount shown on this document (a confirmation letter, not an invoice)

### INS-004 — Phoenix (פניקס)

- File: `Phoenix (פניקס).pdf` — SHA-256 `b797d43c5ffddc54d390d0b08b701dbc0bf421d996f5e6a9600b6b2b379a0b15`
- Format/language: native PDF, 4 pages, mixed Hebrew/English, clean text layer
- Provider: Phoenix Insurance Company Ltd. (הפניקס חברה לביטוח) — **sold via agent Wobi Insurance Agencies Ltd.** (סוכן: יבוו סוכנות ביטוח בע"מ), a real, confirmed case of insurer ≠ selling agent — `provider` must resolve to Phoenix, not Wobi, mirroring the venue-vs-platform priority question Attraction/Event's `V6-F63` already had to solve for `provider`
- Policy number: `21/121/667/1017370`
- Insured (`participants`): Eyal Ben-Yitzhak, ID `43119213`, DOB `19/05/1981` — single traveler, self only
- Coverage: `17/06/2021` – `20/06/2021` (4 days), destination area: Asia
- Address on file: Revadim (kibbutz) 155, postal code 50000; mobile `050-3109035`; email `eyalby@gmail.com`
- Emergency phone (`phone`): `+972-3-7331177` (MEDASSIS assistance company); email `info@medassis.org`; separate customer-service line `03-7338141` (office hours only, not 24/7 — goes to `notes`, not `phone`)

### INS-005 — Wobi (booking confirmation)

- File: `Wobi.pdf` — SHA-256 `a2714f9eca89a31b9dd8e71c203dd19890cd7d7843e3bd5caecd3aa97857a9d9`
- Format/language: native PDF, 3 pages, Hebrew, clean text layer
- **A different document shape from every other benchmark case:** this is a **booking/order confirmation from an insurance broker/comparison site**, not a final insurer-issued policy — analogous to Attraction/Event's `AE-005` order-vs-ticket-number precision case, but here the whole document is one step earlier in the lifecycle (order confirmed, policy itself issued separately by the underlying insurer). Order number `2505025810020552`; insurer/track: Harel (הרבח: לארה / לולסמ: Harel)
- Insured (`participants`), **five travelers — the real full family, the largest real case in this benchmark**:
  - Eyal Ben Yitzhak — ID `043119213`, age 43
  - Paola Cohen — ID `303597751`, age 43
  - Amit Ben Yitzhak — ID `220990485`
  - Daniel Ben Yitzhak — ID `340255835`, age 10
  - Ofri Ben Yitzhak — ID `225991736`, age 6
- Coverage: `14/08/2025` – `26/08/2025` (13 days)
- Emergency phone (`phone`): `+972-3-7547030` (24/7, same Harel hotline as INS-002 — consistent across both real Harel documents, a useful cross-check)
- Total to pay: `$278.85`, charged to a card ending `9283`
- Contact: `travel@wobi.co.il`, `0506565902` / `*2744`

### INS-006 — TorenInsurance (mandatory wild-card)

- File: `TorenInsurance.Tif` — SHA-256 `c9ed3173aeb4f793190d4d1a135d711d90e2392681e658c26aa7d358d100c8e2`
- Format/language: **scanned bi-level TIFF image, 2 pages, no text layer at all** — read directly by visual inspection (page-rendered PNG), not text extraction; genuinely the only non-PDF, non-born-digital source in this benchmark
- **This is the mandatory wild-card**, per the standard's wild-card rule: real, not previously used as any prior category's benchmark or wild-card, and the most non-canonical case by a wide margin — a different insurer from every other document (Clal Insurance Company Ltd., כלל חברה לביטוח בע"מ), sold via a different agency (Toren Insurance Agencies, תורן סוכנות ביטוח), from 2010 (fifteen-plus years older than every other document, a genuinely different template era), and a fax/scan rather than a PDF export
- Provider: Clal Insurance Company Ltd. (via agent Toren, whose own name appears more prominently on the document than the underlying insurer's — a real, sharper version of the Phoenix/Wobi and Harel/Wobi insurer-vs-agent distinction above)
- Policy number: `220008858030`; plan "Clal Global — includes baggage" (כלל עולמי כולל מטען)
- Insured (`participants`): Eyal Ben-Yitzhak, ID `043119213`, DOB `19/05/1981` — single traveler, self only; policy holder address: Kvutzat Revadim
- Coverage: `31/03/2010` – `03/04/2010` (4 days)
- **Two distinct phone numbers, clearly separated on the document — the cleanest real evidence for the `phone` open sub-question in Decision 4:** claims center (מוקד תביעות) `03-9420413` (Clal, office hours implied); emergency center (מוקד חירום) `972-3-9221088` (I.M.A. — International Medical Assistance, "24 hours a day, worldwide travel medical hotline" per the document's own English-labeled text) — confirms the proposed resolution (emergency line → `phone`, claims line → `notes`) against a real, unambiguous case
- Agency contact: Toren, phone `03-6381919`, fax `03-6381970`, `www.toren.co.il`
- Total to pay: `$9.2` — the smallest amount in this benchmark, and the only one not itemized by coverage category (a single lump total on the visible page)
- Document issued by "נורית אואננו" (agency staff), timestamp `29/03/2010 10:14` — the only document in this set with a named human issuer visible on its face, not just a policy system reference

### INS-007 — DiveAssure (dedicated, activity-linked, single-day)

- File: `DiveAssure_screenshot.png` — SHA-256 `8367c001e28a96e29b8e8df0765a174b04e01126edc9f7fee945acdcf494ded3`
- Format/language: **screenshot image** of a confirmation email/page (not a PDF, not the original email itself) — a third distinct source shape alongside native-PDF and scanned-TIFF. **Extraction caveat, stated honestly:** the screenshot shows a "···" (more/expand) affordance suggesting additional fields exist below the captured crop — this benchmark entry reflects only what's visible in the supplied image, not the full underlying record.
- **First example of a dedicated, activity-linked policy** rather than a whole-trip one — see Section 3a. This is travel/diving-liability insurance specific to a single day of diving, not the trip's general medical coverage.
- Provider: DiveAssure, operating in Israel as "DiveSafe ישראל" (brand/local-partner naming visible on the confirmation, not fully disambiguated from this screenshot alone — a real, mild case of the same insurer-vs-brand-name ambiguity seen elsewhere in this benchmark)
- Member name (`participants`): Eyal Ben Yitzhak
- Policy number (`confirmationNumber`): `1629463`
- Coverage: `October 10, 2025` – `October 10, 2025` — a single day, not a range

### INS-008 — RentalCover.com / Cover Genius (dedicated, asset-linked, sub-trip range)

- File: `Invoice_NG74HYX4INS.pdf` — SHA-256 `53636a04b85df3bb10fe2471a53d8a1a056bea31cbfdaab997d8834937fc917a`
- Format/language: native PDF, 2 pages, English, clean text layer, titled "Certificate of Protection / Tax Invoice / Receipt"
- **Second example of a dedicated, asset-linked policy** — rental-car excess/damage protection, not medical/travel insurance, and not the whole trip either: its date range (`14/08/25`–`26/08/25`) is the rental-car period. **Real cross-reference worth noting:** this exact date range matches `INS-005` (Wobi)'s family travel-insurance coverage dates precisely — both genuinely belong to the same real August 2025 trip, a useful internal consistency check for whoever reviews the frozen benchmark later.
- Provider: underwritten by Cover Genius Pty Ltd, sold/administered via RentalCover.com, itself billed through rentalcars.com — **three named parties on one document**, the most layered insurer-vs-seller-vs-billing-platform case in this benchmark; `provider` should resolve to Cover Genius (or "RentalCover.com" if the underwriter name proves unreliable to extract — a real judgment call for implementation, not resolved here)
- Reference/confirmation number (`confirmationNumber`): `NG74-HYX4-INS`
- Policyholder (`participants`): Eyal Ben Yitzchak (note: spelled "Yitzchak" here vs. "Yitzhak"/"Yitzhak" elsewhere in this benchmark — a real transliteration-variance case)
- Coverage: `14/08/25` – `26/08/25`, for travel in Greece + other countries per the rental agreement
- Coverage limit: ₪260,600.00 (excess/damage limit, not a medical sum-insured — goes to `notes` per Decision 4)
- Claims: a URL (`www.rentalcover.com/en/claim`), **not a phone number** — the first benchmark case with no phone/hotline at all, only a claims web address; confirms `phone` should be treated as required-when-present in the true sense (genuinely absent here, not omitted) rather than assumed universal
- Premium: ₪644.02 total (₪619.25 + ₪24.77 taxes/surcharges), billed via rentalcars.com

## 5. Decision 7 — delivery slice and URL scope (CONFIRMED)

**Confirmed by the Product Owner:** PDF and image (including scanned/fax-quality images and screenshots, per `INS-006`/`INS-007`) from global Add or existing-item attach, mirroring Hotel/Flight/Attraction-Event — **no public-URL acquisition in this first slice.** No real insurer-portal URL example was available to validate a bounded scope against, consistent with every document in this benchmark being a PDF, image, or screenshot rather than a link.

## 6. Open questions — all resolved, document Frozen

All questions raised across `V1`–`V3` are now resolved:

1. ~~Data-model change: add `startAt`/`endAt`~~ — **CONFIRMED**, and see item 2, which this confirmation directly surfaced.
2. ~~Section 3a — dedicated/activity-linked insurance and Timeline behavior~~ — **RESOLVED, `V3`:** `schedule` stays fixed at `'entire'` for every insurance item (Option A); new `relatedItemIds` array field on Insurance items only; reverse lookup computed at render time on every other item; two-way tappable UI links; existing Insurance category tile serves as the basket. Full detail in Section 3a.
3. ~~`phone` field priority~~ — **CONFIRMED** (emergency line over claims line; `INS-008` additionally confirms `phone` is genuinely required-when-present, not universal, since it has none at all).
4. ~~Sum-insured/maximum-coverage amount → `notes`~~ — **CONFIRMED.**
5. ~~Decision 7 (URL scope)~~ — **CONFIRMED**, PDF/image-only.
6. **General sign-off:** with all questions resolved, this document moves from DRAFT to **Frozen**. `0.6.7`'s implementation prompt can now be authored — the same gate every prior vertical passed through.
