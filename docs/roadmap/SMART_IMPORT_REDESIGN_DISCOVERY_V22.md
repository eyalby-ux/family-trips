# FamilyTrips Smart Import Redesign — Product Discovery Session

**Document revision:** `V22`  
**Target application version:** Alpha 0.6  
**Status:** Decisions 1–7 are frozen. The complete H-001 through H-005 benchmark and V11 model gate passed with zero false exact integrity claims; V13 Google Places validation passed both real properties with all safety gates. Integrated Hotel-first Alpha 0.6.0 implementation is authorized and built as a review-first QA candidate; Production remains blocked pending Product Owner acceptance.  
**Updated:** 2026-08-14

## Change history

| Revision | Date | Phase | Change |
|---|---|---|---|
| V22 | 2026-08-14 | Alpha 0.6 implementation authorization | Closed Decision 6 from measured V10/V11 extraction and V13 place-provider evidence. Accepted `gpt-5.6-luna` low reasoning behind Netlify AI Gateway, source-relative evidence review, a maximum of one Google Places Text Search lookup, zero fabricated exact integrity values, measured Hotel recall of 80–100% by case, safe `access_required` behavior, and the approximately USD 0.10/import cost gate. Authorized the first integrated Hotel-first Alpha 0.6.0 QA implementation while retaining explicit approval, invitation, ownership, quota, local-original and transient-processing boundaries. |
| V1 | 2026-08-12 | Alpha 0.6 discovery | Created the dedicated Smart Import redesign session, feasibility boundaries, decision sequence, proposed architecture, benchmark and release gates after the 0.5.4 URL-recognition failure and 0.5.5 reliable-intake reset. |
| V2 | 2026-08-12 | Alpha 0.6 discovery — product promise | Froze the application-only document-ingestion promise: the source enters through FamilyTrips, every travel-relevant value present in the supplied source must be represented in an evidence-backed review draft or explicitly identified as unreadable, important operational notes and related documents must not be silently dropped, and QR remains the Product Owner's preferred external/manual fallback rather than a substitute for document completeness. |
| V3 | 2026-08-12 | Alpha 0.6 discovery — user/access clarification | Rejected the single-user assumption. Recorded that the Product Owner, family members and controlled friend/demo users may use FamilyTrips, while the application owns one central provider-independent AI service. Users never need an AI-provider account, model selection or API key; the 0.6 service boundary must be multi-user-ready without pulling shared-Trip collaboration out of Alpha 0.7. |
| V4 | 2026-08-12 | Alpha 0.6 discovery — independent Trip ownership | Replaced the friend-viewer/demo assumption: an authorized friend is a normal FamilyTrips user who may create a private Trip and becomes its Owner. Smart Import operates only on Trips the caller owns or is explicitly authorized to edit. The family Trip remains private unless separately shared, while multi-trip lifecycle, invitations and shared editing remain Alpha 0.7 implementation scope. |
| V5 | 2026-08-12 | Alpha 0.6 discovery — invite-only access | Froze the application-access boundary: the Product Owner controls an email allowlist and only invited Google accounts may enter FamilyTrips. Distinguished app access from Trip sharing, required Smart Import to reject authenticated-but-uninvited callers, and retained owner-facing invitation management and shared-Trip workflows for Alpha 0.7. |
| V6 | 2026-08-12 | Alpha 0.6 discovery — revoked-account data lifecycle | Froze immediate account/AI blocking and quarantine of user-owned data after invitation revocation. Defined the waiting period as a deletion-eligibility delay rather than automatic deletion: irreversible deletion requires a later explicit Product Owner confirmation, and absent confirmation the data remains blocked. Left the exact waiting duration open. |
| V7 | 2026-08-12 | Alpha 0.6 discovery — revocation waiting period | Product Owner approved a fixed 30-day quarantine period measured from the recorded revocation timestamp. Day 30 marks deletion eligibility only; automatic deletion remains prohibited and separate explicit Product Owner confirmation remains mandatory. |
| V8 | 2026-08-13 | Alpha 0.6 discovery — first delivery slice | Product Owner approved Hotel as the first end-to-end vertical slice: hotel PDF/image and a public official hotel URL, supporting both a new-item proposal and attachment/enrichment of an existing Hotel. Froze the complete-pipeline, hotel-data and explicit-exclusion boundaries without starting Flight or generic multi-type implementation. |
| V9 | 2026-08-13 | Alpha 0.6 discovery — processing and privacy | Product Owner approved hybrid consent: `Attach only` performs no AI transmission; every extraction is an explicit action with first-use disclosure. Processing copies are transient and deleted immediately after completion/failure and within 24 hours at the latest; providers may not train on the data. Alpha 0.6 keeps originals locally until explicit deletion, limits paid processing to the target Trip Owner with per-user quota, defers Editor permission and original synchronization to 0.7, and excludes passports, identity/visa documents and full payment-card/security-code extraction. |
| V10 | 2026-08-13 | Alpha 0.6 discovery — universal source landing | Product Owner approved one landing behavior for every item type. Global Add presents default-selected `Analyze and propose item` and no-AI `Save source only`; processing still requires explicit confirmation. Save-only and failed/unsupported analysis retain the original in the non-category Intake Inbox, while failure creates no empty item and offers retry/delete. Existing items retain `Attach only` and `Attach and extract`. The generic UX contract does not expand the Hotel-only first implementation slice. |
| V11 | 2026-08-13 | Alpha 0.6 discovery — source-relative completeness | Product Owner rejected a fixed minimum-field gate because valid content depends on the supplied document. Froze full required-if-present extraction, a mandatory evidence-grounded meaningful title, and an explicit Hotel no-omission set when present: dates, arrival/departure or check-in/check-out times, location, phone and booking number. Missing-in-source fields are not failures; unreadable/ambiguous/conflicting values remain needs-review and are never fabricated. |
| V12 | 2026-08-13 | Alpha 0.6 discovery — bounded external enrichment and initial cost target | Product Owner approved evidence-linked enrichment rather than a fixed URL-class promise or unbounded search. Froze a maximum of three related retrievable public pages and one structured place lookup per attempt, separate external provenance and approval, safe stopping without invention, exclusion of private/login pages and broad crawling, and an initial approximately USD 0.10 variable-cost target per import pending benchmark calibration. Decision 6 remains open only for the real Hotel files and final measured latency/calibrated-cost gates. |
| V13 | 2026-08-13 | Alpha 0.6 discovery — first real Hotel benchmark source | Product Owner designated `Confirmation_for_Booking_ Ban Ta Khun(1).pdf` as the benchmark base document. Registered immutable case `H-001`, visually and textually reviewed its one-page English/Hebrew/Thai Agoda voucher, froze its expected Hotel values, operational notes, absent fields, phone normalization review and missing confirmation-email relationship in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H001_V1.md`, and left the remaining corpus and measured cost/latency gates open. |
| V14 | 2026-08-13 | Alpha 0.6 discovery — exact textual Hotel Location | Product Owner clarified that `H-001` supplies the Hotel Location precisely through its complete multilingual address. Froze the source Location as exact and approval-ready without a map link or coordinates; only later geocoding, a map pin or external place verification is separately labelled derived/enriched data. Updated the benchmark contract to V2. |
| V15 | 2026-08-13 | Alpha 0.6 discovery — property-first Hotel place lookup | Product Owner recalled the prior Panvaree regression in which address-level resolution selected the general park. Froze Hotel lookup construction as exact property name first, followed by source address/destination context; generic park, dam or regional candidates are rejected rather than stored as the Hotel location. Updated `H-001` to V3. |
| V16 | 2026-08-13 | Alpha 0.6 discovery — second real Hotel source | Registered `Confirmation1819-1.pdf` as `H-002`. Visual/font/text inspection proved it is a generated mixed-direction text PDF rather than a scan. Froze exact Alaya Poleg booking, stay, price, contact, conditional check-in and missing-location/cancellation-policy behavior in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H002_V1.md`; retained the separate scanned/image OCR case as the next corpus gap. |
| V17 | 2026-08-13 | Alpha 0.6 discovery — Hotel-name Location fallback and validation | Product Owner approved the exact Hotel name as the Location-field/search fallback when no explicit property location exists. Froze automatic place validation, success display as Hotel name with separately stored resolved map data, and needs-review/no-navigation behavior for missing, generic, conflicting or ambiguous results. Applied the rule to `H-002` V2. |
| V18 | 2026-08-13 | Alpha 0.6 discovery — real Hotel image/OCR and duplicate companion source | Registered `Panvaree_Hotel_booking.png` as `H-003`. Froze its raster OCR ground truth, bidirectional numeric association, partial cropped-address behavior and property-first place validation. Matched its exact property, two booking identifiers and dates to `H-001`, closing the image/OCR, partial-source, companion-document and duplicate-source matrix rows without permitting a duplicate Hotel or copying invisible data into source-only extraction. |
| V19 | 2026-08-13 | Alpha 0.6 discovery — official Hotel URL | Registered the Product Owner-supplied Panvaree official website as `H-004`. Canonicalized away advertising parameters while preserving the submitted URL, retrieved exactly three public pages, froze official identity/location/contact plus complete scheduled/private boat, timing, cost and safety instructions, and closed both the supported official-URL and missing-booking-reference matrix rows without fabricating reservation data. |
| V20 | 2026-08-13 | Alpha 0.6 discovery — blocked Hotel URL | Registered Booking.com's real reservation-management route as `H-005` and froze safe login/session-wall behavior: preserve the URL source in Intake Inbox, stop with `access_required`, request no credential or bypass, start no unsupported enrichment, offer PDF/image/text/save-only recovery and create no empty or fabricated Hotel. The minimum source matrix is complete; only the measured technical-spike gates remain open. |
| V21 | 2026-08-13 | Alpha 0.6 discovery — technical spike Stage A | Product Owner approved the bounded H-001 through H-005 spike. Recorded measured local PDF/OCR preprocessing and the legacy 0.5.3 parser's semantic failures, prepared and smoke-tested an isolated Netlify AI Gateway/Responses/Structured Outputs runner with `gpt-5.6-luna` low reasoning, and prohibited reporting projected pricing as measured cost. Stage B requires authenticated execution before final cost/latency gates or integrated implementation. |

## Frozen discovery constraint — invite-only application access

FamilyTrips is a private, invitation-only application.

- The Product Owner is the application administrator and controls which email addresses are invited.
- Google authentication proves account identity but does not by itself authorize entry to FamilyTrips.
- On sign-in, the normalized verified Google email must match an active application invitation/allowlist entry.
- An authenticated account without an active invitation receives no Trip list, source, document, proposal, Smart Import endpoint or AI-service access.
- Accepting an application invitation creates an authorized FamilyTrips account; it does not share any existing Trip.
- The invited user may create a new private Trip and becomes that Trip's `Owner`.
- Access to another user's Trip requires a separate explicit Trip-sharing grant under the future `Owner`/`Editor` model.
- Revoking application access blocks future application and AI-service use and moves the account plus its owned Trips, documents, sources and proposals into a quarantined blocked state.
- Quarantined owned data is unavailable through normal application and Smart Import flows and is neither silently transferred nor exposed to another user.
- The fixed waiting period is 30 calendar days starting at the recorded revocation timestamp. During it, irreversible deletion is prohibited.
- Expiry of the waiting period only marks the quarantined data as eligible for deletion; it never triggers automatic deletion.
- Deletion requires a separate, explicit Product Owner confirmation identifying the revoked account and deletion scope after the waiting period has expired.
- Without that later approval, the account and data remain blocked indefinitely.
- Deletion must not remove records owned by another user's Trip merely because the revoked user previously contributed to them; exact treatment of authorship/audit metadata remains part of the Alpha 0.7 lifecycle design.
- Day 30 is the earliest deletion-eligibility point; the approval and no-automatic-deletion rules remain unchanged.

Alpha 0.6 must enforce the allowlist at the server-side Smart Import boundary before processing any source. The full Product Owner invitation-management interface, invitation lifecycle and shared-Trip invitation UX remain Alpha 0.7 scope; until then, the allowlist may be administered as controlled project configuration, but it must not be enforced only by hiding client UI.

## Frozen discovery constraint — users do not operate the AI model

FamilyTrips is not designed as a single-user application. The intended users include the Product Owner, family members using the application for the trip, and friends who create and use their own Trips.

The AI integration is nevertheless one application-managed service:

- an application user signs in to FamilyTrips, not to an AI provider;
- no user chooses the extraction model, supplies an AI API key or maintains a separate AI subscription;
- FamilyTrips authenticates the user, authorizes the Trip/action and invokes the configured provider behind its server boundary;
- the model/provider may change centrally only after the same schema, privacy and benchmark gates pass;
- each processing attempt is attributed to the authenticated user and Trip for authorization, audit, quota, latency and cost measurement;
- a user must never be able to process, read or retrieve another user's source merely by knowing an identifier;
- the Alpha 0.6 endpoint and data contracts must therefore carry user and Trip ownership context and must not hard-code the Product Owner as the only caller.
- every authorized signed-in user may create a private Trip and becomes its `Owner`;
- a friend's self-created Trip is independent of the Product Owner's family Trip and receives no implicit access, data or attachments from it;
- Smart Import may create proposals or attach sources only inside a Trip the caller owns or is explicitly authorized to edit.

Alpha 0.6 still delivers only Smart Import and reliable existing-item attachment. Account-wide multi-trip lifecycle, shared-Trip invitations, Owner/Editor collaboration and cross-device synchronization remain Alpha 0.7 scope. Alpha 0.6 must be compatible with independent Trip ownership and those future authorization checks rather than implement the broader lifecycle prematurely.

## Frozen discovery decision — application-only document ingestion

### Product promise

For every supported document supplied directly through FamilyTrips, the application must preserve the original and produce an approval-stage draft containing **all travel-relevant information that is present and readable in the supplied source**. The result is not limited to the smallest set of fields needed to create an item.

The user completes the workflow inside FamilyTrips: select or capture the document, review the extracted result, correct it when necessary, approve it, and later open the preserved source and related attachments from the owning item. A server or AI service may still operate behind the application; this decision does not yet choose the processing/privacy boundary.

The application must never silently discard a meaningful value merely because the current typed schema has no dedicated field. Such a value must appear in a structured field when one exists or in an evidence-linked **Important notes / Other extracted data** section until the schema is extended.

### Required completeness contract

When present in the supplied source, the review draft must represent:

- item type, provider/operator/property/activity identity and document purpose/status;
- booking, confirmation, reservation, policy, ticket and other relevant reference identifiers;
- every operational date and time, with the correct semantic role and time zone when stated;
- flight/transport departure and arrival times and locations;
- hotel check-in and check-out dates/times, including arrival-window, early/late arrival, reception, key-collection and departure instructions;
- addresses, terminals, gates, meeting points, pickup/drop-off points, property/activity locations, map links and coordinates when supplied;
- phone numbers, email addresses, official/provider websites and operational contact channels;
- participants/travellers, room/seat/ticket allocation and ownership when stated;
- price, currency, payment status, deposits, taxes/fees, cancellation conditions and other booking restrictions when relevant to the trip;
- baggage, equipment, access, age, identification, insurance, accessibility and other operational requirements;
- every warning, instruction or note that could affect arrival, departure, access, use, cancellation or completion of the booked service;
- every supplied companion document or file, with its own preserved source identity and its relationship to the same booking/item.

Legal boilerplate and repeated decorative text do not need separate operational fields, but the preserved original remains available. When it is uncertain whether text is operationally important, it stays visible in the review draft rather than being dropped.

### Multiple and related documents

One import session may contain multiple pages and multiple files. FamilyTrips must:

1. preserve every supplied file separately;
2. analyze all pages/files before presenting completeness;
3. identify whether they describe one item, several items or supporting documents for an existing item;
4. retain field-level source lineage when values come from different files;
5. attach all approved companion documents to the correct owning item without producing duplicate final items.

If a document merely refers to another document that was not supplied, FamilyTrips records that reference or missing attachment. It must not claim that the absent document was imported.

### Missing, unreadable and conflicting values

- A value absent from the source remains empty and must not be guessed.
- A value present but unreadable or ambiguous is shown as unresolved with its source evidence; it must not disappear silently.
- Conflicting values across pages/files are displayed together for explicit user choice.
- No final item is created or existing item overwritten until the Product Owner approves the review result.

### QR fallback boundary

Validated `familytrips.import`, `FTI1` and `FTI1C` QR remain the Product Owner's preferred path when information must be prepared or completed outside the application. QR is a deterministic fallback and may produce an editable proposal, but it does not reduce the completeness requirement for a document that FamilyTrips claims to support. Original and companion documents still require separate preservation/attachment when their bytes are not contained in the QR payload.

Manual item creation remains available for compatibility, but Alpha 0.6 acceptance must not rely on the Product Owner retyping data that is visibly present in a supported document.

## Why this is a separate version

The current URL, image/camera and PDF paths do not form a trustworthy product:

- URL recognition attempted to infer a travel item without reliably obtaining and understanding the page content.
- PDF/image processing mixes browser parsing, OCR and narrow heuristics, so dates, locations, official websites, booking references and item types may be missing or wrong.
- A technically successful extraction can still be unusable if the result cannot show where each important value came from.
- Adding more recognizer rules would repeat the same failure mode and make acceptance dependent on individual examples.

Alpha 0.6 therefore redesigns the capability as a system. Alpha 0.5.5 keeps manual and validated QR/JSON as reliable paths and retains PDF only as an explicitly experimental evidence source.

## What is realistically possible

| Source | Feasible target | Important limitation |
|---|---|---|
| Text-based PDF | Extract structured text, tables and links; propose one or more typed items with field evidence | Layout and reading order vary; official website or exact map location may not be present |
| Scanned PDF / photo | Vision/OCR plus document understanding; identify tickets, confirmations and key travel fields | Blur, crop, glare, language and screenshots reduce confidence; no missing value may be guessed |
| Camera capture | Review the captured image, attach it, then optionally process it like another image | Capture quality must be checked before upload; capture itself is not evidence of correct extraction |
| Public official URL | Server retrieves allowed page content and proposes a meaningful item from actual content | CORS, bot protection, JavaScript rendering, login walls, geo restrictions and expiring share links can prevent retrieval |
| Booking/share URL | Retrieve when technically and legally accessible; otherwise fail safely or request the original document | Many providers require a session or hide useful data; a URL string alone is insufficient |
| Existing-item attachment | Reliably preserve and open the original under the same item, with optional classification and participant assignment | Extraction is a separate opt-in action; attaching must work even when extraction is unavailable |
| Validated QR/JSON | Deterministic schema/checksum validation and editable proposal | Source bytes are not embedded; the original document must be attached separately when desired |

No architecture can promise that every website or poor-quality image will be understood. The product promise should be: preserve the source, extract only evidence-backed values, make uncertainty visible, and fail without creating misleading data.

## Recommended baseline for discussion

The recommended starting point is a **server-assisted, provider-independent extraction pipeline**:

1. store the original source locally first;
2. obtain explicit permission before transmitting source content for processing;
3. use a server-side acquisition adapter for URLs;
4. use document/vision extraction that returns strict structured JSON;
5. validate that JSON against the FamilyTrips schema;
6. display every proposed structured value with evidence and confidence;
7. require explicit approval before any item creation or update;
8. retain a deterministic no-AI path for manual and QR/JSON import.

Browser-only regex/OCR is not recommended as the primary architecture. It may remain a preprocessing optimization, but it must not decide item type or populate structured values without the same evidence and validation contract.

## Product Owner decision session

The session is conducted one decision at a time. Each decision is recorded before moving on.

### Decision 1 — Product promise

**Decision: FROZEN in V2.** The primary promise is:

“Accept the document through FamilyTrips, preserve every supplied source, and create a complete reviewable travel-item draft containing every readable travel-relevant value, including operational notes and related documents. Clearly expose anything missing, unreadable, uncertain or conflicting; never silently omit or fabricate it.”

This remains review-first rather than silent automatic creation. QR is the preferred external/manual completion path when needed.

### Decision 2 — Processing and privacy

**Decision: FROZEN in V9.** Processing is server-assisted, application-managed and provider-independent under a hybrid consent model.

#### Consent and transmission

- `Attach only` stores the supplied source locally under the owning item and performs no AI transmission or extraction.
- `Analyze and propose` from global Add and `Attach and extract` from an existing Hotel are explicit processing actions. Selecting either action is required for every processing attempt.
- Before the first AI-processing action for an account, FamilyTrips shows a concise disclosure that the source or retrieved page content will be transmitted through the FamilyTrips-managed extraction service. Later attempts remain explicit actions; passive attachment, opening a document or viewing an item never implies consent.
- The user does not select a provider, authenticate to it or provide an API key. FamilyTrips remains responsible for authorization, provider configuration and compliance with this contract.

#### Processing retention and provider restrictions

- Raw uploaded bytes, transient OCR/layout artifacts and retrieved URL page content used by the processing service are deleted immediately after a successful or failed attempt completes and no later than 24 hours after receipt.
- A provider is eligible only when its applicable service terms and configuration prohibit using FamilyTrips source content or extracted data to train provider models.
- Retained operational audit, quota, status, latency and cost metadata must not contain the original payload, full page body or full extracted document text.
- Processing-copy deletion does not delete the locally preserved original or an approved Hotel item.

#### Original-source lifecycle

- In Alpha 0.6, the original PDF/image remains locally stored, openable and linked to its Hotel until the authorized user explicitly deletes the source or its owning item through the applicable confirmed flow.
- Original-source cloud/cross-device synchronization is not introduced by Smart Import 0.6. Its encryption, retention and deletion semantics remain an Alpha 0.7 synchronization decision.
- Deleting an original is explicit and must not be confused with automatic processing-copy cleanup. FamilyTrips must make any effect on existing evidence/lineage clear before confirmation.

#### Paid-processing authorization

- In Alpha 0.6, only the `Owner` of the target Trip may invoke paid AI processing. Every attempt is attributed to that account and Trip and is subject to a per-user quota.
- `Editor` processing permission, owner-controlled delegation and shared-Trip quota behavior are deferred to Alpha 0.7.
- Invite-only application authorization and target-Trip ownership are checked server-side before any bytes or page content are accepted.

#### Sensitive-document exclusion

- Passport, national-identity and visa documents are excluded from AI processing in Alpha 0.6. Any later local attachment or synchronized personal-document lifecycle remains governed by the separately approved participant-document design and Alpha 0.7 privacy/security work.
- The Hotel extractor must not extract or retain a full payment-card number or card security code. Ordinary evidence-backed booking payment status, deposits, price/currency/taxes and a masked payment reference may still be proposed when present.

#### Separate revoked-account lifecycle

The maximum 24-hour processing-copy retention is independent of invitation revocation. Revocation still blocks access immediately, quarantines user-owned application data for 30 calendar days, never deletes automatically and requires a later separate Product Owner approval before irreversible deletion.

### Decision 3 — Source landing behavior

**Decision: FROZEN in V10.** The same source-landing behavior applies to every FamilyTrips item type. This is a universal interaction and ownership contract; it does not claim that every type is already supported by the Alpha 0.6 extractor.

#### Global Add

- Before processing, the user sees two actions: **Analyze and propose item** and **Save source only**.
- **Analyze and propose item** is selected as the default, but no bytes/page content are transmitted and no AI begins until the user explicitly confirms/continues. The first-use disclosure from Decision 2 still applies.
- **Save source only** invokes no AI. It stores the original as an unassigned record in the non-category Intake Inbox for later review, attachment or deletion.
- A successful analysis creates one or more editable proposals only. No final item is created before approval.
- If analysis fails, is unsupported or cannot produce a valid proposal, FamilyTrips creates no empty, generic or misleading item. The original remains in the Intake Inbox with an explicit failed/unsupported/needs-review status and visible **Retry** and **Delete** actions.

#### Existing-item context

- From any existing item, the user chooses **Attach only** or **Attach and extract**.
- **Attach only** preserves the source under that stable item with no AI and no structured-data change.
- **Attach and extract** invokes the same evidence-backed proposal pipeline and requires explicit approval before any value is applied. It never creates another final item merely because the source was attached.

#### Version boundary

The contract is identical for Hotel, Flight, Activity/Ticket, Transport, Insurance and future item types as each type becomes supported. Alpha 0.6 first implements and benchmarks it only for Hotel. Other types must show a truthful unsupported state or use save-only/attachment behavior until their separate extraction contracts are approved. Alpha 0.6 therefore includes the minimum non-category Intake Inbox needed to list/open retained sources and expose their status, retry and delete actions; Alpha 0.7 still owns the complete cross-type document-management, search, sharing and synchronization experience.

### Decision 4 — Required fields and evidence

**Decision: FROZEN in V11.** Smart Import uses **source-relative completeness**, not one fixed absolute minimum-field list.

#### Required-if-present rule

- A field absent from the supplied source is not a failure and remains empty. It is never guessed or reconstructed from an unrelated value.
- Every readable travel-relevant value that is present in the source is required in the review draft, either in its structured field or in evidence-linked Important notes / Other extracted data.
- For the Hotel slice, the following are an explicit no-omission acceptance set whenever they appear: stay/check-in/check-out dates; arrival/departure and check-in/check-out times or windows; property/meeting location, address, map link or coordinates; operational phone number; and booking/confirmation number.
- A complete, unambiguous source address is itself an exact Hotel Location. The absence of a map link or coordinates does not make that Location missing, uncertain or unapprovable. Any later geocoding or place verification adds a separately labelled representation with provenance and never replaces the exact source address.
- When the source contains an exact Hotel name but no explicit property address/location, the review draft uses that exact Hotel name as the derived Location-field/search candidate. This fallback is visibly distinguished from source-supplied location evidence and does not by itself authorize a map pin.
- The no-omission set is not a complete ceiling. Website, email, property name, guests/rooms, meal plan, price/payment/taxes, cancellation restrictions, access/key/reception instructions, warnings, notes and companion-document relationships are equally required when present and readable.

#### Meaningful title

- Every proposed item must have a meaningful, human-understandable and source-grounded title. `Hotel`, `Booking`, `Document`, a raw filename, URL host or opaque identifier alone is not acceptable.
- For a Hotel, use the exact property name when it appears. If it does not appear, the title may combine other direct evidence—such as a supported provider/booking description with location or stay date—but may not invent a property identity.
- If no meaningful title can be formed from the available evidence, the draft remains `needs review` and cannot be approved until the user supplies or confirms a meaningful title inside FamilyTrips.

#### Evidence, confidence and approval

- Every proposed structured value links to direct source evidence: text/span, page/region, retrieved-page element or an explicitly labelled verified source reference.
- A single global numeric confidence threshold does not define completeness. Confidence and extraction method inform the review state; they never authorize silent omission or invention.
- A readable value with direct evidence may be proposed. An unreadable, ambiguous or conflicting value remains visible as unresolved/needs-review with its evidence and requires user resolution before approval when it affects the item.
- External enrichment never substitutes for completing extraction of the supplied source and never counts as proof that source extraction was complete. It may propose information absent from the source only under Decision 5, separately labelled with provenance and approved like any other proposal.
- A draft may be sparse when the source is sparse. It is approvable only when it has a meaningful title, all readable travel-relevant values from the source are represented and any approval-blocking uncertainty/conflict has been resolved or explicitly accepted.

### Decision 5 — URL support boundary

**Decision: FROZEN in V12.** Alpha 0.6 uses bounded, evidence-linked public acquisition and enrichment. It does not promise support by URL label alone and does not perform an unrestricted web search.

- Processing begins from the supplied PDF, image or URL and may follow only relationships grounded in that source or in an already verified Hotel identity: embedded/QR links, an official website, a directly related public booking page, a map/place reference or another public page demonstrably belonging to the same Hotel/booking.
- One processing attempt may acquire at most three public HTTP/HTTPS pages in total, including the supplied URL when the original source is a URL. Redirect resolution counts toward the same bounded attempt and is accepted only when the final target remains public and retrievable without credentials.
- One processing attempt may perform at most one structured place lookup to verify or complete the Hotel's identity, address/location, operational phone and official website.
- A Hotel place lookup must begin with the exact evidence-grounded property name, followed by the most specific available source address/destination context. The matcher must verify both property identity and address compatibility. A result representing only a park, dam, city, island, lake or region is not a Hotel match and is rejected or left `needs_review`; it may not supply the Hotel pin merely because it contains the source address text.
- If no explicit property location exists, the lookup validates the Hotel-name candidate through accommodation/entity type, normalized property-name match, non-conflicting available identity signals such as phone or official email/domain, usable provider place identity/map position and absence of unresolved competing Hotel candidates. Recipient/guest address data is never property-location evidence.
- On successful validation, the Location field displays the exact Hotel name; resolved address, coordinates, provider place ID/service, acquisition timestamp and match evidence are stored behind it with external provenance. On absent, generic, conflicting or ambiguous results, the Hotel name remains only an unverified `needs_review` textual candidate and no map/navigation action is enabled.
- External enrichment is never evidence that the supplied source was extracted completely. Every enriched field is labelled separately from source-extracted data and retains field-level provenance, source URL/service, acquisition timestamp and match/review state.
- Enriched values remain proposals and require the same explicit approval as extracted values. They never silently replace a trusted value or resolve a conflict without user review.
- When the relationship is unsafe, the Hotel identity is ambiguous, retrieval is blocked or the page/lookup limit is reached, enrichment stops and leaves the field empty or needs-review. It never guesses or creates a misleading item.
- Login-protected, session-bound, CAPTCHA-gated and credential-requiring pages are unsupported. Alpha 0.6 does not collect user credentials, automate a private booking session, crawl arbitrary sites, perform broad open-web search or integrate email/cloud-drive accounts. The flow asks for a PDF/image or manual/QR input instead.

### Decision 6 — Benchmark and success threshold

**Status: FROZEN in V22.** The complete H-001 through H-005 matrix passed authenticated Netlify AI Gateway calibration and three-attempt measurement. `H-001` reached 100% recall in all three attempts; `H-002` reached 90–100%; `H-003` reached 80–90%; `H-004` reached 95%; and `H-005` returned the required `access_required` state with 100% safe-failure recall. No attempt produced a false exact critical or integrity claim. Completed-model latency remained below 27 seconds, and observed cost remained USD 0.006744 or less per attempt. The separate V13 Google Places pass validated both real Hotel identities with one name-first lookup each, rejected the generic competing Panvaree-area result, passed every safety gate and completed in 446 ms or less. The measured gates and implementation entry gate therefore pass; full evidence is recorded in `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V7.md`.

The benchmark must contain real user examples and expected structured values, not synthetic recognizer-friendly fixtures.

Minimum benchmark matrix:

1. `H-001` - the approved text Hotel confirmation PDF with dates, exact property, booking references, an exact multilingual textual Hotel Location/address, phone, occupancy, payment/cancellation information, operational notes, an absent official website and a referenced-but-missing confirmation email;
2. `H-002` - the approved mixed Hebrew/English text Hotel confirmation PDF with right-to-left label/value association, exact operational times/contact/prices, no property address/location and referenced-but-missing cancellation terms;
3. `H-003` - the approved raster Hotel booking screenshot with mixed Hebrew/English OCR, bidirectional numeric fields and a cropped partial address;
4. `H-004` - the approved public official Panvaree Resort URL, including official website/location/contact and operational arrival evidence;
5. `H-005` - the approved Booking.com reservation-management URL, which requires login/session access and must stop safely without credentials, extraction, enrichment or Hotel creation;
6. one unreadable or partial Hotel source; the cropped lower boundary of `H-003` supplies the approved partial-source case while still-readable fields remain mandatory;
7. one Hotel source missing a booking reference; `H-004` supplies this case because it is a general official Hotel website rather than a reservation confirmation;
8. several supplied companion documents for one Hotel booking; `H-001` plus `H-003` supply the approved companion-source pair;
9. duplicate sources for the same Hotel booking; `H-003` must match `H-001` and create no duplicate Hotel/stay.

#### Approved base case - `H-001`

- Source filename: `Confirmation_for_Booking_ Ban Ta Khun(1).pdf`.
- Stable content identity: SHA-256 `f100cc309ef7edb0c01587b590511b1ab03e5e0a71a5ae5dfa775fc9b46a6daa`.
- Source class: one-page A4 text PDF, Agoda Hotel Voucher / Booking Confirmation, English/Hebrew/Thai, visually and textually reviewed.
- Ground truth: `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H001_V3.md`.
- Required proposal title: `Panvaree Resort`.
- This case is source-only ground truth. No external-enrichment value is included in its expected source-extraction result; later spike enrichment remains separately labelled and measured.
- The case covers exact dual booking identifiers, dates without times, multilingual property evidence, an exact source-extracted Hotel Location from the complete address, the raw invalid-looking phone `++66909915995` with a separately reviewable normalized candidate, occupancy and room data that must not be logically corrected, cancellation/payment wording that must not be overgeneralized, all operational notes, and a referenced confirmation email that is not present.
- Explicitly absent source fields include check-in/check-out times, email, official website, map link and coordinates. The complete address nevertheless supplies the exact Hotel Location; only its map-link/coordinate representation is absent. Neither absence may be filled silently.
- Optional `H-001` place lookup uses `Panvaree Resort` first and the complete source address second. A generic Khao Sok park, Ratchaprapa Dam or other regional result fails the property-match gate and must not become the Hotel pin.

#### Approved second case - `H-002`

- Source filename: `Confirmation1819-1.pdf`.
- Stable content identity: SHA-256 `336ab740f7ce101c6cc47377695af2c7aedb4f1abf217c4c022eb3d286387e5c`.
- Source class: one-page US-Letter generated text PDF, mixed Hebrew/English and right-to-left/left-to-right layout; it is not a scan and does not close the OCR matrix case.
- Ground truth: `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H002_V2.md`.
- Required proposal title: `Alaya Poleg`.
- The case covers booking `1819/1`, visible document/booking dates, stay dates and nights, guest-name variants, first-night-only `HALF BOARD`, payer-versus-payment-status semantics, included-VAT prices, check-in `15:00`, conditional extension to `18:00`, check-out `11:00`, late-departure warning, exact phone/email, blank remarks/services and cancellation terms referenced but missing.
- No property address/location, official website, map link or coordinates appear. Recipient country `Israel` must not become property location. The derived Location-field/search candidate is `Alaya Poleg`; a successful Hotel-identity lookup keeps that display label and stores verified address/map data separately, while any failed/ambiguous match remains `needs_review` with no false navigation action.

#### Approved image/duplicate case - `H-003`

- Source filename: `Panvaree_Hotel_booking.png`.
- Stable content identity: SHA-256 `8935c1b77878b11ed6f9dc0afa15b4eed3b6ba30460cd473236b7d552d933ee5`.
- Source class: `1434 x 888` PNG screenshot of an Agoda booking-confirmation page, mixed Hebrew/English RTL/LTR raster content with no embedded text layer.
- Ground truth: `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H003_V1.md`.
- Required proposal title: `Panvaree Resort`.
- The image contains confirmation status, Agoda Booking ID `1736468481`, Booking Reference No. `5246613558`, stay `2027-01-17` to `2027-01-18`, one room, a two-star display, property phone `+66909915995`, provider-action labels and a visible but vertically cropped partial address.
- The lower crop prohibits copying the invisible `Ban Ta Khun`/postal-code portion from `H-001` during source-only scoring. A partial map graphic supplies no coordinate, link or actionable pin.
- Exact property, both identifiers and both dates prove that `H-003` is a companion/duplicate source for the same reservation as `H-001`. Processing the two in either order preserves both immutable sources, enriches one stable Hotel/stay and never creates a duplicate final item.
- This case directly regresses the earlier mapping of Agoda ID `1736468481` into the phone field. Layout/label evidence must keep both booking identifiers separate from property phone `+66909915995`.
- Optional place lookup starts with `Panvaree Resort` and only then the visible partial address context; generic park/dam/region results remain invalid.

#### Approved official-URL case - `H-004`

- Product Owner-supplied URL includes Google advertising attribution parameters; both it and the canonical `https://www.panvaree.com/` are preserved, while the displayed official website excludes tracking parameters.
- Source class: publicly retrievable official Panvaree Resort website without credentials.
- Ground truth: `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H004_V1.md`.
- Retrieved pages: home, `/gettinghere` and `/aboutpanvaree` - exactly the three-page maximum. A visible RoomScope booking-engine link is recorded as a relationship but is not fetched within the same attempt.
- Required proposal title: `Panvaree Resort`.
- Required official fields include the canonical website, source-extracted address, three WhatsApp numbers, `sale@panvaree.com` and linked official booking-engine relationship.
- Required operational notes include pier relationship and duration variants, arrival by `11:00`, scheduled boat at `11:30`, one free pickup per day, `2,000 Baht` missed-transfer boat, private-boat hours `08:00-16:00`, at least one-day advance booking, travel-mode guidance and the warning to avoid travel after `15:00`.
- The URL contains no guest reservation, booking reference, stay dates, selected room or price. This is correct source-relative absence, not failure; no reservation-specific value may be fabricated.
- Optional place lookup remains property-first and rejects a generic Khao Sok/Ratchaprapha/Cheow Lan/Surat Thani result despite the official site's geographic address wording.

#### Approved inaccessible/login URL case - `H-005`

- Submitted URL: `https://secure.booking.com/myreservations.html`.
- Source class: real Hotel reservation-management route whose private booking content is unavailable to anonymous acquisition and requires an authenticated provider context.
- Ground truth: `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H005_V1.md`.
- Required result: preserve the URL as an immutable source, record an explicit `access_required`/`login_or_session_required` processing state and keep the source reachable in Intake Inbox.
- Required recovery: offer a booking PDF, screenshot/image, pasted non-sensitive text, save-only, open-provider, retry and delete actions.
- No Hotel title, proposal, final item, booking field, public enrichment or place lookup is permitted because no evidence-grounded Hotel identity was acquired.
- FamilyTrips does not request booking PIN/email, provider credentials, cookies, tokens or challenge responses and does not automate sign-in, reuse a private browser session or bypass access controls.

Recommended gate:

- 100% exactness for any proposed structured field in the approved benchmark;
- 100% recall for the benchmark's expected travel-relevant fields and operational notes, or an explicit unreadable/uncertain state tied to source evidence;
- zero silent omission of expected phone, website, location, check-in/check-out, arrival/departure instruction or companion-document relationship data;
- zero fabricated values;
- zero silent final writes;
- zero lost originals;
- zero duplicate final items after the approved duplicate decision;
- explicit partial/failure state for every unsupported case;
- field evidence visible for every proposed structured value;
- all acquisition/enrichment attempts obey the three-public-page and one-place-lookup limits;
- every Hotel place lookup records its property-first query and rejects generic geographic candidates that do not match the property identity;
- missing explicit property location produces an exact Hotel-name Location candidate, and only a validated Hotel entity may enable its map/navigation data;
- mixed-direction PDFs retain correct visual label/value associations; interleaved extracted-text order may not swap phone/email, dates, amounts or row meanings;
- raster OCR retains correct RTL/LTR label/value association and never swaps `H-003` booking identifiers with its property phone;
- source-only scoring never fills cropped or unreadable pixels from a companion source, while cross-source reconciliation retains each source's provenance;
- duplicate detection links `H-003` and `H-001` to one stable Hotel/stay in either import order and never lets an empty value overwrite trusted data;
- official-URL acquisition preserves the raw submitted URL, displays the canonical tracking-free official website and retrieves no more than three related public pages;
- all `H-004` arrival, boat-transfer, timing, cost and safety notes are represented while general Hotel offerings never become a claimed user reservation;
- a general official website with no booking reference remains a valid sparse Hotel proposal and never receives a fabricated reference/date/guest/price;
- the initial variable third-party cost target is approximately USD 0.10 or less per import across extraction and paid enrichment; exact measured cost is recorded on every `ProcessingAttempt` and the final production gate is calibrated after the spike;
- reaching an enrichment operation or cost boundary stops external enrichment with a truthful partial/needs-review state; it never authorizes omission of readable source data or invention;
- median latency and the final calibrated production-cost threshold are explicitly frozen after the technical spike.

### Decision 7 — Delivery slice

**Decision: FROZEN in V8.** The first end-to-end vertical slice is **Hotel**.

It supports:

- a text or scanned hotel PDF;
- a hotel image supplied from the gallery or camera;
- a public official hotel URL that the acquisition adapter can retrieve without user credentials;
- a new-Hotel proposal when launched from global Add;
- `Attach only` and `Attach and extract` when launched from an existing Hotel.

The first slice must exercise the complete architecture. It must not be a one-off extractor that bypasses source identity, evidence, proposal review, duplicate handling or failure states.

#### Approved Hotel-slice acceptance boundary

| Area | Binding first-slice behavior |
|---|---|
| Source preservation | Every supplied PDF/image remains an immutable, openable source with stable identity. Retrieved URL content keeps its acquisition identity, timestamp and provenance. Retries create processing attempts rather than replacing the source. |
| Complete hotel draft | The review draft represents every readable travel-relevant hotel value present in the supported source: exact property/provider identity, confirmation/reference numbers, stay dates, check-in/check-out times and windows, arrival/departure instructions, reception/key/access instructions, address, map link/coordinates or other specific location, phone/email/official website, guests/rooms/meal plan, price/currency/payment/deposit/taxes, cancellation/restrictions, warnings, operational notes and companion-document relationships. |
| Evidence and uncertainty | Every proposed critical value has field-level evidence and provenance. Missing values remain empty; unreadable, ambiguous and conflicting values stay visible for review and are never guessed or silently omitted. |
| New-item flow | Global Add may analyze the source and create an editable Hotel proposal only. No final Hotel is created before explicit approval. |
| Existing-item flow | `Attach only` preserves the source under the existing Hotel without changing structured data. `Attach and extract` creates reviewable field proposals and never overwrites a trusted value without explicit approval. |
| Duplicate and multi-source behavior | Duplicate detection runs before approval. Several sources may support one Hotel, companion files remain separately traceable and approval must not create a duplicate final Hotel. |
| Failure behavior | Blocked/inaccessible URLs, unreadable images, parsing/model/schema failures and insufficient evidence produce explicit partial, needs-review or failed states and no misleading item or fabricated field. |
| Regression boundary | Manual entry and validated `familytrips.import` / `FTI1` / `FTI1C` QR remain supported independent paths and regression oracles. |

Flights, boarding passes, activities/tickets, transport, insurance and a generic multi-type extractor are explicitly excluded from the first slice. Their later inclusion requires a separately approved type contract and benchmark result; the Hotel slice must not contain dormant or heuristic branches that claim to support them.

## Proposed technical boundaries

### Canonical records

- `Source`: immutable original identity, media/URL metadata, local availability, consent and ownership context.
- `ProcessingAttempt`: acquisition/extraction provider, status, timestamps, diagnostics and cost/latency metadata.
- `ExtractedDraft`: schema-valid typed data with field evidence, confidence and source references.
- `Proposal`: user-editable operational review state.
- `Attachment`: stable relationship between a source and an existing item, with document type and optional participant ownership.

### Adapters

- URL acquisition adapter.
- PDF text/layout adapter.
- image/scan adapter.
- extraction/model adapter.
- FamilyTrips schema validator.
- duplicate resolver.

The application owns the contracts; a specific AI/model provider does not.

## Alpha 0.6 implementation phases

1. Product Owner discovery decisions and benchmark freeze.
2. Technical spike on the approved Hotel vertical slice; measure PDF/image extraction, public official URL retrieval, completeness, accuracy, latency and cost.
3. Architecture review and go/no-go for integrated implementation.
4. Source, attempt, evidence and attachment data model.
5. End-to-end supported-source flow and failure states.
6. Benchmark automation plus installed-phone acceptance.
7. Focused regression for manual, QR/JSON, Offline, proposal lifecycle and item ownership.

## Explicit non-goals

- No promise to support every website.
- No credential collection for protected booking sites.
- No automatic overwrite of an existing item.
- No silent creation of final items.
- No passport, national-identity or visa OCR/AI extraction in Alpha 0.6.
- No Multi-trip, sharing/synchronization, Expenses, Shopping, Transport expansion or task redesign; those remain Alpha 0.7.

## Exit criteria for the discovery session

The discovery session is complete. Decisions 1–7 have explicit frozen outcomes, the H-001 through H-005 matrix and expected values are controlled regression evidence, and V11/V13 close the accuracy, integrity, safe-failure, latency, cost and place-validation gates. The Hotel-first integrated Alpha 0.6.0 candidate and its executable acceptance session may proceed. Production promotion still requires Product Owner acceptance of the exact built artifact.
