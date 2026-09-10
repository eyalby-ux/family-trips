# FamilyTrips Architecture — Current State

**Document revision:** `V3`
**Status:** Production is on Alpha 0.6.7.4 (build `0.6.7.4-4fe16e5c`, deploy `6aa255f515287d85356c634e`), promoted 2026-09-10. Alpha 0.6 is fully closed and live in Production — Hotel (`0.6.0`–`0.6.4`), Flight (`0.6.5`), Attraction/Event (`0.6.6` through its `0.6.6.1`–`0.6.6.3` correction cycle) and Insurance (`0.6.7` through its `0.6.7.1`–`0.6.7.4` correction cycle) — with `V6-F74` (the needs-review confirm-as-correct fix, independent of the Insurance vertical) also confirmed Fixed, verified on Production. Alpha 0.7's full sixteen-item binding MVP scope has been sequenced into eight candidates, `0.7.1`–`0.7.8` (Product Owner decision, 2026-09-10; full per-candidate detail and rationale in `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V90`'s Alpha 0.7 section) — implementation has not yet begun on any of them. Authentication and referrer authorization still use only `qa--familytripz.netlify.app` for the QA alias; the Hotel-first Smart Import architecture, now joined by Flight/Attraction-Event/Insurance extraction adapters on the same pipeline, is otherwise unchanged.
**Updated:** 2026-09-10

This document contains only the architecture rules and decisions currently in force — the standing contract the app is built against right now. It is updated in place whenever a decision changes, and its own change-history table (below) records only changes to *this* document, not the underlying architecture decisions themselves.

The full decision-by-decision record of how the architecture reached its current state — every revision from the original Alpha 0.2 foundation (V1) through the last combined-document revision (V21) — is preserved verbatim in **`ARCHITECTURE_DECISION_HISTORY_V1.md`**. That document is append-only: read it when you need to know *why* a rule exists or *when* it was decided. Read this document when you need to know *what the rule is right now*.

## Change history (this document)

| Document revision | Date | Change |
|---|---|---|
| V3 | 2026-09-10 | Expenses confirmed excluded from MVP scope | Product Owner explicitly confirmed: Expenses are not included in the MVP. This resolves the flag raised in `V2` — the Alpha 0.7 "owns the previously approved broad MVP-completion scope" bullet had it listed as in-scope, which never matched the delivery plan (Expense tracking has only ever appeared under `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s "Features Beyond the Thailand MVP" section, i.e. deferred, and was never part of the sixteen-item Alpha 0.7 binding scope or the "MVP Scope for Thailand" list). "Expenses" removed from that bullet's scope list; the flag note replaced with this confirmation. No other architecture rule, decision, or scope changed by this revision. |
| V2 | 2026-09-10 | Full resync: this document had gone stale since its `V1` creation (2026-08-23), still describing Production as Alpha 0.5.6/0.6.3-in-progress — an entire Alpha phase behind actual current state. Status line rewritten to record Alpha 0.6's full closure (Hotel `0.6.0`–`0.6.4`, Flight `0.6.5`, Attraction/Event `0.6.6`–`0.6.6.3`, Insurance `0.6.7`–`0.6.7.4`, `V6-F74`), the current Production build/deploy, and Alpha 0.7's new `0.7.1`–`0.7.8` sequencing (Product Owner decision, 2026-09-10, recorded in full in `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V90`). Two "Version boundary" bullets rewritten accordingly (Alpha 0.6 closure; Alpha 0.7 sequencing). One inconsistency surfaced in passing, deliberately flagged rather than silently resolved: the Alpha 0.7 bullet's "Expenses" mention has never been reconciled against the delivery plan's current MVP scope, which lists Expense tracking under "Features Beyond the Thailand MVP" (deferred), not the sixteen-item Alpha 0.7 binding scope — this is a genuine open scope question for the Product Owner, not a documentation typo, so it is noted rather than corrected on this Development Agent's own authority. No other architecture rule, decision, or scope changed as part of this sync. |
| V1 | 2026-08-23 | Created by splitting `ARCHITECTURE_SNAPSHOT_V21.md` into this current-state document and `ARCHITECTURE_DECISION_HISTORY_V1.md`, per process improvement #3 (splitting current-state from history in bloated living documents). All body content below is reproduced verbatim from Architecture Snapshot V21's stable-foundation-through-version-boundary sections. No architectural rule, decision, or scope changed as part of this split. `ARCHITECTURE_SNAPSHOT_V21.md` is superseded by `ARCHITECTURE_SNAPSHOT_V22.md`, a short pointer stub; this document is the new canonical current-state reference. |

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
- This state machine is type-independent. Alpha 0.6 implements extraction adapters and benchmark acceptance for Hotel, Flight, Attraction/Event and Insurance; unsupported item types still use save-only and attachment states truthfully until separately approved.
- Alpha 0.6 implements only the minimum Intake Inbox projection required to list/open retained sources and expose status, retry and delete. Alpha 0.7 owns complete cross-type document assignment/search, shared access and synchronization.

### Frozen processing and privacy boundary

- `Attach only` persists the source locally and invokes no AI. Global `Analyze and propose` and existing-item `Attach and extract` require an explicit action for every processing attempt; the account receives a concise disclosure before its first such action.
- The server authorizes the active invitation and target Trip `Owner` before accepting bytes or retrieved page content. In Alpha 0.6, only that Owner may invoke paid processing; attempts are attributed to the account and Trip and are constrained by a per-user quota. Editor delegation is an Alpha 0.7 concern (now sequenced to `0.7.5`, see the Version boundary section below).
- Raw uploads, transient OCR/layout artifacts and retrieved URL bodies are removed from the processing path immediately after success/failure and no later than 24 hours after receipt. Operational audit/quota/status/latency/cost metadata may remain only without the original payload, full page body or full extracted document text.
- A processing provider is eligible only when its service terms and configuration prohibit training on FamilyTrips source content and extracted data.
- The canonical Alpha 0.6 original remains local, openable and item-owned until explicit confirmed deletion. Cloud/cross-device synchronization of originals, including encryption and synchronized deletion, is deferred to Alpha 0.7 (now sequenced to `0.7.6`, see the Version boundary section below).
- Passports, national-identity documents and visas are not accepted for AI extraction in Alpha 0.6. The Hotel extractor never extracts or retains full payment-card numbers or card security codes.
- Processing-copy deletion does not delete a source or approved Hotel. It is also independent of revoked-account quarantine, whose immediate block, 30-day eligibility delay, no-automatic-deletion rule and separate Product Owner approval remain unchanged.

### Approved first vertical slice — Hotel

- Supported first-slice sources are text/scanned hotel PDF, hotel image from gallery/camera and a public official hotel URL retrievable without user credentials.
- Global Add creates an editable new-Hotel proposal only. An existing Hotel supports both `Attach only` and `Attach and extract`; the latter creates reviewable field proposals and never silently overwrites structured data.
- The Hotel draft represents every readable travel-relevant value present in the source: exact property/provider identity, booking references, stay dates, check-in/check-out times and windows, arrival/departure and reception/key/access instructions, address and exact location/map data, phone/email/official website, guests/rooms/meal plan, price/payment/taxes, cancellation/restrictions, warnings, operational notes and companion-document relationships.
- The slice uses the canonical `Source`, `ProcessingAttempt`, `ExtractedDraft`, `Proposal` and `Attachment` records plus the URL, PDF/layout, image/scan, model, schema-validation and duplicate-resolution adapters. It may not bypass stable source identity, evidence, uncertainty/conflict review, explicit approval, duplicate handling, authorization, observability or partial/failure states.
- Flights, boarding passes, activities/tickets and Insurance were excluded from this first implementation slice only — each was later implemented as its own vertical with its own discovery document and benchmark (Flight `0.6.5`, Attraction/Event `0.6.6`, Insurance `0.6.7`, all now live in Production). Transport and generic multi-type extraction remain excluded, sequenced to Alpha 0.7 (`0.7.4` for first-class Transport items; see the Version boundary section below). Each later type inherits source-relative completeness and requires its own approved type-specific no-omission examples plus benchmark evidence.
- Manual entry and validated `familytrips.import` / `FTI1` / `FTI1C` QR remain independent supported fallback paths and regression oracles.

## Application access, Trip ownership and revoked-account lifecycle

- FamilyTrips is private and invitation-only. Google authentication proves identity but does not authorize application access by itself.
- The normalized verified Google email must match an active Product Owner-controlled invitation/allowlist entry before any Trip, source, document, proposal or Smart Import endpoint is accessible.
- Application access and Trip sharing are separate grants. An invited user may create a private Trip and becomes its `Owner`; this grants no implicit access to the Product Owner's family Trip or another user's data.
- Smart Import performs server-side checks for both an active application invitation and caller authorization on the target Trip before accepting or processing source bytes. Client-side hidden UI is not an authorization boundary.
- Alpha 0.6 data contracts and endpoints are multi-user-ready and never hard-code the Product Owner as the only caller. Full invitation management, active-Trip/multi-trip lifecycle, `Owner`/`Editor` sharing and synchronization remain Alpha 0.7 implementation scope, now sequenced to `0.7.2` (ownership/roles), `0.7.3` (sync) and `0.7.5` (invitation-management/quarantine admin UI) — see the Version boundary section below.
- Revoking an application invitation immediately blocks application and AI-service access and quarantines the account's owned Trips, documents, sources and proposals without silent exposure, deletion or transfer.
- Quarantine begins at the recorded revocation timestamp. Irreversible deletion is prohibited for 30 calendar days.
- Day 30 creates deletion eligibility only. Deletion never runs automatically and requires a separate explicit Product Owner confirmation naming the account and scope.
- Without that approval, quarantined data remains blocked indefinitely. Deleting a revoked account must not remove records owned by another user's Trip merely because the revoked user contributed to them.

## Version boundary

- Alpha 0.5.3 is final NO-GO and remains QA-only. Its accepted `V5-F19`, `V5-F21` and `V5-F22` behavior is preserved as regression evidence.
- Alpha 0.5.4 is final NO-GO. Its Offline, Sign-out, no-orphan, proposal-archive, ownership and Timeline results are preserved; the failed official-URL recognition path is not repaired by another heuristic.
- Alpha 0.5.5 exposes manual and validated QR/JSON as reliable creation paths, removes URL/image/camera-photo from supported new-item intake, retains PDF as explicitly experimental, resets the open editor after out-of-range Cancel and places the rejected archive after active content and actions.
- Alpha 0.5.6 is retained only as a prior Production baseline (superseded — see below).
- **Alpha 0.6 is complete and fully live in Production, superseding Alpha 0.5.6 as the accepted Production baseline.** Dedicated to Smart Import redesign and the direct existing-item attachment foundation, including QR-created items. Its first complete implementation slice was Hotel (measured gate frozen in Discovery V22 and `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V7.md`); three further verticals shipped on the same pipeline and each independently reached Production GO through its own discovery document, benchmark and executable acceptance session: Flight (`0.6.5`), Attraction/Event (`0.6.6` through its `0.6.6.1`–`0.6.6.3` correction cycle) and Insurance (`0.6.7` through its `0.6.7.1`–`0.6.7.4` correction cycle, GO'd 2026-09-10). Current Production build: `0.6.7.4-4fe16e5c`, deploy `6aa255f515287d85356c634e`. Full acceptance-session and correction-cycle detail: `MVP_DELIVERY_PLAN_CURRENT_STATE.md`.
- **Alpha 0.7 owns the previously approved broad MVP-completion scope** — Multi-trip, sharing/synchronization, Shopping, first-class Transport, complete cross-type Intake Inbox/document/contact navigation beyond the Alpha 0.6 minimum projection, participant documents, task expansion, remaining Games content and technical hardening including `V5-W01` — **now sequenced into eight candidates** (Product Owner decision, 2026-09-10): `0.7.1` small independent fixes (global-"+" Task creation, Today packing-list shortcut, category Add presets, Task priority/filters); `0.7.2` multi-Trip ownership + Shared-Trip Owner/Editor roles; `0.7.3` the core near-real-time/offline-reconnect sync engine plus two-device collaboration; `0.7.4` Destination Countries + first-class Transport items; `0.7.5` invitation-management/quarantine admin UI + Editor-level Smart Import permission; `0.7.6` original-source cross-device sync; `0.7.7` Bulk Trip Import from a fixed-template spreadsheet; `0.7.8` Shopping places + scheduled visits. Full per-candidate detail and sequencing rationale: `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V90`'s Alpha 0.7 section. Expenses are confirmed **excluded from MVP scope** (Product Owner decision, 2026-09-10) — not part of Alpha 0.7 or any `0.7.x` candidate; consistent with `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s "Features Beyond the Thailand MVP" section, where Expense tracking has always been listed as deferred.
- A partial implementation that hides Documents without a reachable Intake Inbox, or hides Contacts without item-level and Trip-level access, is not acceptable.
- A partial attachment implementation that creates duplicate items/proposals, loses the original QR/import source, omits camera/gallery/PDF sources, or applies extracted values without explicit approval is not acceptable.
