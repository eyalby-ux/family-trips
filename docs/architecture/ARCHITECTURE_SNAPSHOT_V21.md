# FamilyTrips Architecture Snapshot

**Document revision:** `V21`  
**Status:** Alpha 0.5.6 remains Production. Alpha 0.6.3 replaces the failed 0.6.2 environment-variable detection with a deterministic remove-and-recreate contract for four Alpha 0.6 QA Function values. Authentication and referrer authorization still use only `qa--familytripz.netlify.app`; the Hotel-first Smart Import architecture is unchanged.  
**Updated:** 2026-08-15

## Change history

| Revision | Date | Change |
|---|---|---|
| V21 | 2026-08-15 | Recorded finding `V6-F03`: the 0.6.2 Netlify inventory parser did not identify an existing variable, so the helper retried a forbidden simultaneous context-and-scope update. Replaced detection with deterministic removal and immediate recreation of each Alpha 0.6 QA variable using Functions scope and only `deploy-preview`/`branch-deploy`; no deploy occurs during configuration and Production remains unchanged. |
| V20 | 2026-08-15 | Recorded finding `V6-F02`: Netlify CLI rejects simultaneous context-and-scope changes when a variable already exists. Defined a two-path configuration contract: existing variables update contextual values while preserving their Functions scope; new variables create scope and contexts together. Added the invariant that the Product Owner email cannot be removed by entering additional invitees. |
| V19 | 2026-08-15 | Recorded finding `V6-F01`: the 0.6.0 version-specific Netlify alias was outside the Firebase OAuth and API-key referrer allowlists. Defined 0.6.1 as a deployment-only correction that preserves the runtime architecture and requires the fixed general `qa` alias for every QA release. |
| V18 | 2026-08-14 | Recorded measured Smart Import closure and the Alpha 0.6.0 integrated architecture: verified Google identity plus active server allowlist, first-use local Trip ownership registration, Owner-only paid processing, daily per-user quota and content-free audit in Netlify Blobs, Netlify AI Gateway structured Hotel extraction with provider storage disabled, bounded public-URL acquisition with SSRF/private-host protection, local-only original preservation, review proposal mapping, existing-Hotel attach-only/attach-and-extract flows, and Google Places canonical metadata only after one strong lodging/country match. |
| V1 | 2026-08-01 | Captured the Alpha 0.2 architectural foundation. |
| V2 | 2026-08-09 | Preserved the foundation and recorded the approved Trip Center decisions: Shopping is a standalone category containing places/visits and shopping lists; dated shopping visits project into Timeline/Calendar; Links is not a user-visible category and link data/actions belong to owning items, with an optional background-only index. |
| V3 | 2026-08-10 | Recorded that Locations is not a user-visible Trip Center category. Location data belongs to owning items and may be projected into item details, map/navigation actions and an aggregate Trip map; background geospatial records/indexes remain permitted for operational integrity. |
| V4 | 2026-08-10 | Aligned the Alpha 0.5.3 correction candidate with the approved ownership rules: the standalone Links and Locations UI is removed without deleting item-owned links, source data or location metadata. |
| V5 | 2026-08-10 | Approved that Documents and Contacts are not standalone Trip Center categories. Assigned their complete UI relocation to Alpha 0.6: assigned documents belong to items, unassigned documents remain in a non-category Intake Inbox, contacts are reusable records shown from owning items or a Trip-level useful-information context. Preserved the frozen Alpha 0.5.3 package unchanged. |
| V6 | 2026-08-11 | Defined the Alpha 0.6 existing-item attachment contract: an item Detail can receive camera images, gallery images, PDFs and supported files without creating another item; QR-created items retain their QR source; documents/tickets support classification, participant ownership, multiple attachments, `Attach only` and explicitly approved extraction proposals. Preserved the frozen Alpha 0.5.3 package unchanged. |
| V7 | 2026-08-11 | Reconciled final Alpha 0.5.3 NO-GO evidence and defined the Alpha 0.5.4 stabilization boundary: deterministic Offline shell/navigation behavior, blocked Offline Sign out with local-session preservation, no `Shared link` fallback or orphan Link persistence, and strict separation of active versus archived rejected proposals. Assigned the non-functional `V5-W01` warning to Alpha 0.6 hardening and preserved the approved Alpha 0.6 ownership model. |
| V8 | 2026-08-11 | Recorded the Alpha 0.5.4 implementation of the stabilization invariants: versioned cache-first navigation shell, Offline Sign-out guard, owner-required shared-URL intake, non-savable Link type and persistent deduplicated rejected-proposal archive. Preserved all Alpha 0.6 ownership and capability boundaries. |
| V9 | 2026-08-12 | Reconciled final 0.5.4 NO-GO evidence and the 0.5.5 intake reset; removed new-item URL/image/photo paths from the supported 0.5.5 UI, retained PDF as explicitly experimental, defined one source/evidence/proposal pipeline for the dedicated Alpha 0.6 Smart Import release, retained direct existing-item attachment in 0.6 and moved the former broad MVP-completion scope to Alpha 0.7. |
| V10 | 2026-08-12 | Reconciled final 0.5.5 NO-GO evidence and defined the Alpha 0.5.6 `V5-F27` correction: one shared interval predicate evaluates both item boundaries for confirmation and persisted out-of-range marking, while preserving the 0.5.5 intake boundary and all Alpha 0.6/0.7 assignments. |
| V11 | 2026-08-12 | Aligned the architecture with Alpha 0.6 Discovery V7 and Delivery Plan V52: complete evidence-backed extraction, one central provider-independent AI service, invitation-only application access, independent private Trip ownership, caller/Trip authorization, immediate revoked-account quarantine, fixed 30-day deletion eligibility and mandatory separate Product Owner approval before deletion. |
| V12 | 2026-08-13 | Recorded Product Owner approval of Hotel as the first Alpha 0.6 vertical slice: hotel PDF/image and public official hotel URL, new-Hotel proposal and existing-Hotel attachment/extraction, with the complete source/evidence/review/duplicate/failure architecture and no Flight or generic multi-type implementation in the first slice. |
| V13 | 2026-08-13 | Recorded the frozen Alpha 0.6 hybrid privacy architecture: no-AI local `Attach only`; explicit processing action plus first-use disclosure; immediate and maximum 24-hour deletion of transient processing copies; provider no-training requirement; local original retention with synchronization deferred to 0.7; Owner-only paid processing with per-user quota; and sensitive identity/full-card extraction exclusions. Kept revoked-account quarantine separate. |
| V14 | 2026-08-13 | Recorded the universal source-landing architecture for every item type: Global Add explicitly confirms analyze/propose or saves only to Intake Inbox; failed/unsupported analysis preserves the source but creates no empty item; existing items attach only or attach/extract. Preserved explicit AI consent and Hotel as the sole first implementation/benchmark type. |
| V15 | 2026-08-13 | Replaced a fixed minimum-field threshold with source-relative completeness. Required a meaningful evidence-grounded title, every readable travel-relevant source value, and explicit no-omission Hotel coverage for present dates, arrival/departure or check-in/check-out times, location, phone and booking number. Missing-in-source fields remain empty; ambiguity/conflict remains needs-review. |
| V16 | 2026-08-13 | Froze bounded evidence-linked external enrichment for the Hotel slice: at most three related retrievable public pages and one structured place lookup per attempt, separate provenance and explicit approval, no private/login acquisition or broad crawling, safe stopping without invention and an initial approximately USD 0.10 variable-cost target per import pending benchmark calibration. |
| V17 | 2026-08-13 | Registered the first real Hotel benchmark source without changing the target architecture: case `H-001` uses the Product Owner-approved Agoda text PDF and a separately versioned ground-truth contract. It exercises exact source identity, multilingual field evidence, absent values, review-required normalization, operational notes and a referenced-but-missing companion document; the remaining corpus and measured gates stay open. |

## Stable foundation

- Today is the operational home and filters by temporal relevance.
- Trip Center is category-first.
- Timeline and Calendar are projections of the same entities.
- One entity has one Detail View.
- Trip may be created from first accepted source or first saved item.
- Scheduling modes are single date, date range, entire Trip and no date.
- Trip state may be inferred from future dated items.
- Changing Trip dates never silently changes source item dates.
- An item with a dated range is outside the Trip whenever any present boundary lies before the Trip start or after the Trip end. Pre-save confirmation and every persisted `מחוץ לטווח` projection use the same predicate; an in-range start never masks an out-of-range end.
- Sources remain linked to items.
- Packing Lists are created when the Trip is created.

## Approved Trip Center information architecture

- Trip Center is an operational area. Trip identity, dates, ordered Destination Countries, participant administration, sharing permissions and destructive lifecycle actions belong to Trip Settings or their dedicated control flows.
- Shopping is a standalone Trip Center category, separate from Attractions.
- Shopping contains shopping places/visits—such as malls, markets, outlets and destination stores—and the shared shopping list.
- A shopping place may be saved without a date. Adding a date/time schedules the same entity and projects it into Timeline/Calendar without creating a duplicate record.
- Shopping-list entries may optionally reference a shopping place/visit; deleting the place never silently deletes the list entries.
- Links is not a user-visible Trip Center category, list, card, tab or Quick Access destination.
- Locations is not a user-visible Trip Center category, list, card, tab or Quick Access destination.
- Documents is not a user-visible Trip Center category, list, card, tab or Quick Access destination.
- Contacts is not a user-visible Trip Center category, list, card, tab or Quick Access destination.
- Every user-visible website, booking-management, navigation or original-document action belongs to its relevant item or entity and is shown in that context.
- A background-only link/source index is permitted for import, lookup, duplicate detection, synchronization and data integrity, but it is never rendered as a separate user-facing collection.
- Every user-visible location belongs to a relevant item or entity and is shown from that item's detail/edit context or through its map/navigation actions.
- A general Trip map may aggregate item-owned pins as a projection of the same entities. It must not create a duplicate standalone Locations collection.
- Background-only geospatial records/indexes are permitted for search, import, duplicate detection, distance calculation, synchronization and data integrity, but are not rendered as a separate user-facing collection.
- In Alpha 0.5.5, pasted/shared URL is not a new-item intake source. A URL can be entered manually on an existing item or supplied by validated QR/JSON. Alpha 0.6 may restore URL Smart Import only through the approved content-acquisition and evidence-backed proposal pipeline; `Shared link` is never a fallback item.
- Assigned documents are shown and managed within their owning items or entities. Unassigned uploads, scans and sources remain reachable through a non-category Intake Inbox until assigned, rejected or converted into an item.
- Every supported item Detail exposes a Documents and Tickets area with an Add action for camera capture, gallery selection and PDF/file selection. The action attaches to the same stable item regardless of whether that item was created manually, imported from a link/file/image or approved from `FTI1`/`FTI1C` QR.
- Attaching an original PDF or image to a QR-created item preserves both the QR source and the new file as separately traceable records linked to the same item. It never creates a duplicate item or a second unassigned proposal.
- Item-owned attachments may be classified as booking confirmations, boarding passes, entry tickets, receipts or other documents. One item may own multiple attachments, and tickets may reference one or more participants.
- `Attach only` changes no structured item data. `Attach and extract information` may create field-level proposals, but no proposal is applied or overwrites an item value without explicit approval.
- Relevant item and Quick Access contexts may expose Open Document/Open Ticket actions. Participant tickets may use full-screen barcode/QR presentation, but neither Quick Access nor the ticket viewer becomes a standalone Documents destination.
- An optional `View All Documents` search/utility projection may aggregate documents, but it is not a primary Trip Center destination.
- Contacts are reusable records displayed from the items they serve. Contacts that apply to the whole Trip—such as a travel agent, insurer, embassy/consulate or emergency contact—belong directly to the Trip and remain reachable through a secondary useful-information context.
- An optional `All contacts` search/utility projection may aggregate contacts, but it is not a primary Trip Center destination.

## Projection and ownership rules

- Timeline/Calendar, Today and Quick Access project operational data from the same source entities; they do not own duplicate copies.
- Item Detail is the canonical user-facing context for item-owned links, documents, contacts and original sources.
- Quick Access may expose the same available actions for an item but must not create a second link record.
- A document/ticket attachment has stable identity, one owning item when assigned, its original payload/source lineage, a document type and optional participant relationships. Multiple attachments may share an owning item without sharing identity or overwriting one another.
- The attachment operation mutates the existing ownership relationship only; it does not mutate the owning item's identity. Extraction results are proposals until approval, and rejected proposals do not affect the attachment or source lineage.
- Migration, import, backup/export and synchronization preserve link ownership, item-owned location and document metadata, reusable contact relationships, Trip-level contacts, shopping-place identity and shopping-list relationships without silent data loss.
- Existing standalone Location records are associated with an owning item or preserved in a recoverable background/inbox flow; removal of their standalone UI never deletes place names, addresses, coordinates, sources or country/destination associations.
- Existing standalone Document records are associated with an owning item or preserved in the Intake Inbox; removal of their standalone Trip Center UI never deletes files, sources, tickets, receipts, participant relationships or approval state.
- Existing standalone Contact records are associated with one or more owning items or directly with the Trip; unassociated contacts remain recoverable until explicitly assigned or deleted.

## Offline and proposal-lifecycle invariants

- The installed PWA application shell and last saved Trip are available on the first cold Offline launch after a completed online load. Service-worker navigation control and cache identity must produce the same successful result across repeated Offline launches and refreshes; alternating browser connection-error and cached-success results are invalid.
- Network-dependent authentication initialization never blocks the local shell from rendering. Reconnect may refresh authentication and synchronization state, but it must not duplicate or discard local Trip data.
- In Alpha 0.5.4, Sign out requires connectivity. While Offline, the action is disabled with a clear explanation and preserves the current local session and visible Trip. It never navigates to an uncached authentication route or browser connection-error page.
- A Link is source/property data owned by a meaningful domain item; it is never a standalone final entity that can be approved and then become inaccessible.
- Proposal states are mutually exclusive operational projections. `Pending approval` proposals appear in active Suggestions. Rejecting a proposal removes it from that active projection and stores exactly one persistent rejected record in a separate archive.
- Archived/rejected proposals do not count as active suggestions, do not sort ahead of pending proposals in the active area and do not duplicate across refresh, restart or synchronization.

## Smart Import target architecture

- Alpha 0.6 owns one source-processing pipeline for camera capture, gallery image, PDF/file and URL content. Source acquisition, byte preservation, parsing/OCR, model extraction, schema validation, proposal creation and persistence are separate observable stages.
- FamilyTrips, not the end user, owns the AI-service integration. Users never select a model, supply an AI-provider account/API key or authenticate to an extraction provider.
- The service is provider-independent behind the FamilyTrips schema and benchmark contracts. A provider/model may be changed centrally only after the same privacy, evidence, accuracy, latency and cost gates pass.
- For every supported supplied document, the review draft represents every readable travel-relevant value, including operational arrival/departure and check-in/check-out instructions, contacts, website, location, restrictions, warnings and relationships to companion documents. A meaningful value with no dedicated field remains visible as evidence-linked important/other extracted data rather than being dropped.
- The original source has stable identity and is never replaced by extracted text or a proposal. A retry creates a new processing attempt over the same source.
- URL processing uses actual retrieved content through an approved server-side acquisition adapter. The browser must not infer a travel item from a URL string, domain, filename or user-entered label alone.
- Extractors return a typed draft plus field-level evidence, confidence, method and source references. Schema validation removes unsupported values; it never repairs missing facts by inventing defaults.
- Fields absent from the source remain empty in the source-extraction result. Every readable travel-relevant value present in the source must be represented with direct evidence; bounded external enrichment may separately propose absent information, but never substitutes for source completeness and always remains labelled with provenance.
- All extraction outputs are proposals. `Attach only` creates no extraction proposal and mutates no structured item data. `Attach and extract` uses the same proposal pipeline as new-item Smart Import.
- One source may support several proposed items and several sources may support one item. Source relationships and duplicate decisions remain explicit and reversible.
- Network-required acquisition/extraction has explicit queued, processing, partial, failed and needs-review states. Offline availability of an already stored original does not imply offline extraction.
- The public-URL and external-enrichment boundary is frozen in `SMART_IMPORT_REDESIGN_DISCOVERY_V22.md`. The complete H-001 through H-005 matrix, V11 extraction/safe-failure measurements and V13 place-validation measurements pass the Decision 6 entry gate. The first delivery slice, processing/privacy, universal source landing, source-relative completeness/evidence and bounded-enrichment contracts are frozen.

### Source-relative completeness and evidence gate

- There is no absolute minimum field count shared by all sources. Completeness is measured against what is present and readable in the supplied source, not against fields the source never contained.
- Every proposal has a meaningful evidence-grounded title. Generic type labels, raw filenames, URL hosts and opaque identifiers are invalid titles. A Hotel uses the exact property name when present; otherwise only direct source evidence may compose the title. Without one, the draft remains needs-review and cannot be approved.
- For Hotel, dates, arrival/departure or check-in/check-out times/windows, location/address/map evidence, operational phone and booking/confirmation number are explicit no-omission fields whenever present. All other readable travel-relevant Hotel values remain equally required.
- Each structured value references source text/span, page/region, retrieved-page element or an explicitly labelled verified-source locator. Evidence and method travel with the draft/proposal.
- Confidence is review metadata, not an omission or invention threshold. Unreadable, ambiguous or conflicting present values remain unresolved/needs-review until resolved or explicitly accepted; absent values remain empty without blocking the draft.

### Bounded external enrichment gate

- Source extraction is completed first and remains authoritative for source-relative completeness. External data never hides, replaces or retroactively fills an omitted readable source value.
- A processing attempt may acquire at most three evidence-linked public HTTP/HTTPS pages in total, including a supplied URL, and may perform at most one structured place lookup. Eligible relationships come from embedded/QR links, official-site, public-booking or map/place evidence tied safely to the same Hotel/booking.
- Every enriched field remains a separately labelled proposal with field-level provenance, source URL/service, acquisition timestamp and match/review state. Explicit approval is required before it changes structured Hotel data.
- Login/session/CAPTCHA/credential-protected content, private booking automation, email/cloud-drive integration, arbitrary open-web search and broad crawling are outside Alpha 0.6.
- Ambiguous identity, blocked retrieval or an exhausted operation/cost boundary stops enrichment with an empty or needs-review field. No additional retry, lookup or model pass may guess around the boundary.
- The initial benchmark target is approximately USD 0.10 or less in variable third-party cost per import across extraction and paid enrichment. Every `ProcessingAttempt` records measured cost and latency; the spike must calibrate and freeze the final production cost and latency gates.
- A draft is approvable only when its title is meaningful, every readable source value is represented and approval-blocking uncertainty/conflict has been resolved or explicitly accepted.

### Universal source-landing state machine

- From Global Add, all item types use the same two user choices: default-selected **Analyze and propose item** or no-AI **Save source only**. Default selection never starts processing; an explicit confirmation is required before source transmission.
- Save-only creates an unassigned `Source` owned by the Trip and projected through the non-category Intake Inbox. It creates no `ProcessingAttempt`, `ExtractedDraft`, `Proposal` or final item.
- Confirmed analysis creates a `ProcessingAttempt`. A valid result produces editable `Proposal` records only; approval is required before final item creation.
- Failed, unsupported or insufficient analysis transitions the source to an explicit Inbox-visible failed/unsupported/needs-review state with retry and delete actions. It never creates an empty, generic or misleading final item.
- From an existing item, **Attach only** creates the stable `Attachment` relationship without AI or structured-data changes. **Attach and extract** creates processing/draft/proposal records against the same item and cannot create a duplicate final item or silently apply a field.
- This state machine is type-independent. Alpha 0.6 implements extraction adapters and benchmark acceptance only for Hotel; unsupported item types still use save-only and attachment states truthfully until separately approved.
- Alpha 0.6 implements only the minimum Intake Inbox projection required to list/open retained sources and expose status, retry and delete. Alpha 0.7 owns complete cross-type document assignment/search, shared access and synchronization.

### Frozen processing and privacy boundary

- `Attach only` persists the source locally and invokes no AI. Global `Analyze and propose` and existing-item `Attach and extract` require an explicit action for every processing attempt; the account receives a concise disclosure before its first such action.
- The server authorizes the active invitation and target Trip `Owner` before accepting bytes or retrieved page content. In Alpha 0.6, only that Owner may invoke paid processing; attempts are attributed to the account and Trip and are constrained by a per-user quota. Editor delegation is an Alpha 0.7 concern.
- Raw uploads, transient OCR/layout artifacts and retrieved URL bodies are removed from the processing path immediately after success/failure and no later than 24 hours after receipt. Operational audit/quota/status/latency/cost metadata may remain only without the original payload, full page body or full extracted document text.
- A processing provider is eligible only when its service terms and configuration prohibit training on FamilyTrips source content and extracted data.
- The canonical Alpha 0.6 original remains local, openable and item-owned until explicit confirmed deletion. Cloud/cross-device synchronization of originals, including encryption and synchronized deletion, is deferred to Alpha 0.7.
- Passports, national-identity documents and visas are not accepted for AI extraction in Alpha 0.6. The Hotel extractor never extracts or retains full payment-card numbers or card security codes.
- Processing-copy deletion does not delete a source or approved Hotel. It is also independent of revoked-account quarantine, whose immediate block, 30-day eligibility delay, no-automatic-deletion rule and separate Product Owner approval remain unchanged.

### Approved first vertical slice — Hotel

- Supported first-slice sources are text/scanned hotel PDF, hotel image from gallery/camera and a public official hotel URL retrievable without user credentials.
- Global Add creates an editable new-Hotel proposal only. An existing Hotel supports both `Attach only` and `Attach and extract`; the latter creates reviewable field proposals and never silently overwrites structured data.
- The Hotel draft represents every readable travel-relevant value present in the source: exact property/provider identity, booking references, stay dates, check-in/check-out times and windows, arrival/departure and reception/key/access instructions, address and exact location/map data, phone/email/official website, guests/rooms/meal plan, price/payment/taxes, cancellation/restrictions, warnings, operational notes and companion-document relationships.
- The slice uses the canonical `Source`, `ProcessingAttempt`, `ExtractedDraft`, `Proposal` and `Attachment` records plus the URL, PDF/layout, image/scan, model, schema-validation and duplicate-resolution adapters. It may not bypass stable source identity, evidence, uncertainty/conflict review, explicit approval, duplicate handling, authorization, observability or partial/failure states.
- Flights, boarding passes, activities/tickets, Transport, Insurance and generic multi-type extraction are excluded from the first implementation slice. Each later type inherits source-relative completeness and requires its own approved type-specific no-omission examples plus benchmark evidence.
- Manual entry and validated `familytrips.import` / `FTI1` / `FTI1C` QR remain independent supported fallback paths and regression oracles.

## Application access, Trip ownership and revoked-account lifecycle

- FamilyTrips is private and invitation-only. Google authentication proves identity but does not authorize application access by itself.
- The normalized verified Google email must match an active Product Owner-controlled invitation/allowlist entry before any Trip, source, document, proposal or Smart Import endpoint is accessible.
- Application access and Trip sharing are separate grants. An invited user may create a private Trip and becomes its `Owner`; this grants no implicit access to the Product Owner's family Trip or another user's data.
- Smart Import performs server-side checks for both an active application invitation and caller authorization on the target Trip before accepting or processing source bytes. Client-side hidden UI is not an authorization boundary.
- Alpha 0.6 data contracts and endpoints are multi-user-ready and never hard-code the Product Owner as the only caller. Full invitation management, active-Trip/multi-trip lifecycle, `Owner`/`Editor` sharing and synchronization remain Alpha 0.7 implementation scope.
- Revoking an application invitation immediately blocks application and AI-service access and quarantines the account's owned Trips, documents, sources and proposals without silent exposure, deletion or transfer.
- Quarantine begins at the recorded revocation timestamp. Irreversible deletion is prohibited for 30 calendar days.
- Day 30 creates deletion eligibility only. Deletion never runs automatically and requires a separate explicit Product Owner confirmation naming the account and scope.
- Without that approval, quarantined data remains blocked indefinitely. Deleting a revoked account must not remove records owned by another user's Trip merely because the revoked user contributed to them.

## Version boundary

- Alpha 0.5.3 is final NO-GO and remains QA-only. Its accepted `V5-F19`, `V5-F21` and `V5-F22` behavior is preserved as regression evidence.
- Alpha 0.5.4 is final NO-GO. Its Offline, Sign-out, no-orphan, proposal-archive, ownership and Timeline results are preserved; the failed official-URL recognition path is not repaired by another heuristic.
- Alpha 0.5.5 exposes manual and validated QR/JSON as reliable creation paths, removes URL/image/camera-photo from supported new-item intake, retains PDF as explicitly experimental, resets the open editor after out-of-range Cancel and places the rejected archive after active content and actions.
- Alpha 0.5.6 is the accepted Production baseline. Alpha 0.4.3 is retained only as the rollback reference.
- Alpha 0.6 is dedicated to Smart Import redesign and the direct existing-item attachment foundation, including QR-created items. Its first complete implementation slice is Hotel. The complete measured gate is frozen in Discovery V22 and `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V7.md`; the integrated 0.6.3 candidate is authorized for fixed-QA executable acceptance, not automatic Production promotion.
- Alpha 0.7 owns the previously approved broad MVP-completion scope: Multi-trip, sharing/synchronization, Expenses, Shopping, first-class Transport, complete cross-type Intake Inbox/document/contact navigation beyond the Alpha 0.6 minimum projection, participant documents, task expansion, remaining Games content and technical hardening including `V5-W01`.
- A partial implementation that hides Documents without a reachable Intake Inbox, or hides Contacts without item-level and Trip-level access, is not acceptable.
- A partial attachment implementation that creates duplicate items/proposals, loses the original QR/import source, omits camera/gallery/PDF sources, or applies extracted values without explicit approval is not acceptable.
