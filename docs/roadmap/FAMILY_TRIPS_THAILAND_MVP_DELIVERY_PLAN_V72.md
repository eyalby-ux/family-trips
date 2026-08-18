# Family Trips — Thailand MVP Delivery Plan

**Document revision:** `V72`  
**Status:** Alpha 0.5.6 is the accepted Production baseline. Alpha 0.6.2 still failed configuration because its inventory parser missed an existing Netlify variable (`V6-F03`). Alpha 0.6.3 removes that detection dependency and deterministically recreates the four QA-only Function values, while preserving fixed general QA and the unchanged Smart Import scope. Production promotion remains prohibited until executable V124 acceptance and explicit Product Owner GO.  
**Scope:** Thailand trip only  
**Purpose:** Define the remaining Alpha versions required to complete the MVP, followed by Beta and Release Candidate stages.

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V72 | 2026-08-15 | Alpha 0.6.3 deterministic Netlify environment reset | Registered `V6-F03` from the 0.6.2 configuration run: inventory-based detection missed the existing Places key and retried the forbidden combined update. Authorized a full 0.6.3 correction accepting 0.6.0/0.6.1/0.6.2 handoffs, removing and immediately recreating each of four QA-only variables with Functions scope and both preview contexts, and retaining the mandatory owner plus invitees. Advanced QA to V124. |
| V71 | 2026-08-15 | Alpha 0.6.2 Netlify environment correction | Registered `V6-F02` from the 0.6.1 configuration run: Netlify CLI rejected simultaneous context/scope changes on an existing Places key. Authorized a full 0.6.2 correction accepting 0.6.0/0.6.1 handoffs, updating existing contextual values without changing scope, creating new variables with Functions scope, forcing non-interactive overwrites, and merging additional invitees with the mandatory Product Owner email. Advanced QA to V123. |
| V70 | 2026-08-15 | Alpha 0.6.1 fixed-QA correction | Registered `V6-F01` after 0.6.0 Google sign-in was blocked on the version-specific alias. Authorized a complete 0.6.1 correction package over the 0.6.0 QA handoff, fixed `qa` alias deployment only, focused login retest followed by the unchanged Hotel Smart Import matrix in V122, and continued Production prohibition pending explicit GO. |
| V69 | 2026-08-14 | Alpha 0.6.0 Hotel Smart Import implementation | Closed the V11/V13 technical-spike gate and authorized the integrated first slice. Built the 0.6.0 QA candidate over accepted Production 0.5.6 with PDF/image/public-official-URL Hotel analysis, source-only no-AI retention, complete evidence display, explicit approve-before-write, existing-Hotel attach-only/attach-and-extract, invite-only server authorization, local Trip ownership registration, per-user quota/content-free audit, bounded URL acquisition, and property-first Google Places validation. Retained 0.5.6 in Production and prohibited Production promotion before V121 acceptance. |
| V3 | 2026-08-02 | Alpha 0.4.3 acceptance | Recorded the live 0.4.3 finding register and the external-ingestion fallback specification while keeping correction targets open until acceptance completion. |
| V4 | 2026-08-02 | Alpha 0.4.3 acceptance / Alpha 0.5 planning | Assigned external JSON import and QR scanning support to Alpha 0.5; added explicit scanner scope and acceptance blockers; adopted the mandatory `Vx → Vx+1` controlled-document revision rule. |
| V5 | 2026-08-02 | Alpha 0.4.3 acceptance | Recorded short-regression step 2 PASS: the correct original PDF/image opened from the approved item. |
| V6 | 2026-08-02 | Alpha 0.4.3 acceptance | Recorded short-regression step 3 PASS: deleting the approved item returned/preserved its original source in Documents, where it remained openable; the desktop short regression is complete. |
| V7 | 2026-08-02 | Alpha 0.4.3 deployed-phone acceptance | Recorded the deployed-phone `tel:` action PASS and the offline cold-start FAIL: after network connectivity was disabled and the application was closed, it could not be opened again. Root cause and final version assignment remain pending evidence completion. |
| V8 | 2026-08-02 | Alpha 0.4.3 acceptance closure | Captured the exact installed-PWA offline cold-start evidence and successful online recovery; closed test 13 as FAIL and test 14 as NO-GO. No further user tests remain; correction scope still requires Product Owner approval. |
| V9 | 2026-08-02 | Alpha 0.4.4 correction preparation | Recorded Product Owner approval: V4-F11 and V4-F13 assigned to focused Alpha 0.4.4; V4-F04 and V4-F12 assigned to Alpha 0.5. Prepared one installable correction package with extraction and offline-shell regression tests, automatic rollback and focused acceptance. |
| V10 | 2026-08-03 | Alpha 0.4 closure / Alpha 0.5 handoff | Recorded the 0.4.4 focused-test results and Product Owner closure decision: extraction still produced invalid contextual mappings, offline cold start still failed, 0.4.4 is NO-GO and was not promoted, 0.4.3 remains Production, and V4-F11/V4-F13 move to a broader Alpha 0.5 solution together with V4-F04 and V4-F12. |
| V11 | 2026-08-03 | Controlled-document tracking | Applied the Product Owner rule that the filename must carry the same `Vx` as the document revision; renamed this revision to `FAMILY_TRIPS_THAILAND_MVP_DELIVERY_PLAN_V11.md`. No product-scope decision changed. |
| V12 | 2026-08-03 | Alpha 0.5.0 implementation | Recorded completion of the full approved Alpha 0.5 implementation package, inherited V4 finding coverage, automated tests and the pending installed-device acceptance gate. |
| V13 | 2026-08-03 | Alpha 0.5.0 installer correction | Recorded the initial R1 prerequisite failure and the R2 installer path from the local 0.4.4 NO-GO test state, while retaining 0.4.3 as Production and replacing all 0.4.4-modified runtime files. |
| V14 | 2026-08-03 | Alpha 0.5.0 QA checkpoint | Recorded successful R2 installation/build, deployed Google sign-in after Firebase/Google authorization correction, desktop-and-phone availability, the fixed QA deployment approach, and open findings V5-F05/V5-W01. Acceptance remains incomplete and 0.4.3 remains Production. |
| V15 | 2026-08-04 | Alpha 0.5.0 phone exploratory checkpoint | Recorded five Product Owner phone findings: missing advance mandatory-field marking, Today becoming unreachable after Flight/Insurance creation, incorrect standalone Calendar quick access, missing category-prefilled Add flow, and the clarified start/end-date invariant. Assigned the category-prefilled Add flow to Alpha 0.6; all other confirmed corrections remain in the current Alpha 0.5 acceptance/correction cycle. |
| V16 | 2026-08-04 | Alpha 0.5.0 F08 interaction clarification | Replaced the narrow Calendar-placement wording with the binding Timeline interaction contract: Entire Trip, Week and Day each render a Calendar view; the event list below is filtered to the selected period; week arrow or swipe/scroll navigation updates the visible/selected week and the list in sync. Any additional duration-enabled Timeline period follows the same contract. |
| V17 | 2026-08-04 | Alpha 0.5.0 structured acceptance resumption | Recorded test 1 FAIL because the login screen still displays V4; added release-blocking regressions V5-F11 for missing Settings delete/reset controls and V5-F12 for a blank screen after sign-out/sign-in; preserved test 2 as not started. |
| V18 | 2026-08-04 | Alpha 0.5.0 blocker characterization | Recorded that `V5-F12` persists after `Ctrl+Shift+R`, with the account shell present and main application area blank; reconfirmed the Insurance branch of `V5-F07`; preserved test 2 as not started and made Console error capture the next diagnostic action. |
| V19 | 2026-08-04 | Alpha 0.5.0 Console evidence | Recorded the first complete application error for `V5-F12`: an uncaught promise `TypeError` reading `id` in `v5-app-DoxSbB8E.js`, with `Array.findIndex` in the stack. Classified the concurrent Chrome-extension messages as unrelated noise pending contrary evidence and made exact source-location inspection the next diagnostic action. |
| V20 | 2026-08-04 | Alpha 0.5.0 root-cause confirmation | Source inspection confirmed that Today quick-access duplicate removal reads `.id` from absent hotel/transport candidates before filtering them out. A later valid Flight or Insurance candidate triggers the unsafe scan. Linked `V5-F07` and the observed `V5-F12` re-entry symptom to one render defect, defined the null-safe correction and combined regression scope, and paused further acceptance until a corrected QA build is deployed. |
| V21 | 2026-08-05 | Alpha 0.5.1 QA checkpoint / roadmap completeness audit | Recorded the fixed-QA deployment and focused retest checkpoint, including open `V5-F13`. Corrected the roadmap gap from Alpha 0.3 by making two-user/two-device shared-Trip synchronization binding Alpha 0.6 MVP scope. Added the previously agreed Expenses, Useful Links/booking actions, road-game/trivia/destination-fact content coverage, and an explicit post-trip Magazine/PDF follow-up. Removed collaboration from the unassigned backlog and defined the Alpha 0.6 access, offline-sync, conflict and security gates. |
| V22 | 2026-08-05 | Alpha 0.5.1 QR acceptance coverage | Added an explicit QR-generation acceptance gate before application scanning: identify and run the approved generator, verify its input/output contract, PNG/SVG and sidecar payloads, single-versus-multipart selection, naming, dimensions, quiet zone, error correction, Base64URL/SHA-256 integrity, multi-file source relationships, and exact round-trip comparison. Existing application QR scanning tests remain mandatory. |
| V23 | 2026-08-05 | Task workflow findings and version assignment | Added `V5-F14` for the inability to edit an existing task and made it an Alpha 0.5.1 functional blocker. Refined `V5-F13` to show at most three open preparation tasks in Today Quick Access, including future tasks. Assigned the coherent task-list enhancement—priority field, visible due date and priority, priority/date filtering and sorting—to Alpha 0.6. |
| V24 | 2026-08-06 | Trip Settings information architecture | Added Destination Country as binding Trip metadata and assigned its implementation to Alpha 0.6. Made Trip Settings the canonical entry point for participant management and explicitly removed participant management from Trip Center, which remains a category-first operational area. Added persistence, synchronization, active-Trip switching and navigation acceptance gates for both decisions. |
| V25 | 2026-08-06 | Multi-country Trip model | Replaced the single Destination Country assumption with an ordered one-or-more Destination Countries model in Alpha 0.6. Added structured country identity, add/remove/reorder behavior, migration from the legacy singleton, optional country association for itinerary items and locations, reference-safe removal, import/backup/synchronization coverage, and multi-country acceptance and release gates. |
| V26 | 2026-08-06 | Alpha 0.5.2 focused correction | Reconciled the complete Alpha 0.5.1 QA chat with the frozen correction scope, recorded implementation and automated PASS for the eight approved repairs, preserved passed evidence, retained all Alpha 0.6 deferrals, and recorded `V5-W01` as the only omitted warning awaiting an explicit version decision before package closure. |
| V27 | 2026-08-07 | Alpha 0.5.2 COOP correction decision | Recorded Product Owner approval to include `V5-W01` in Alpha 0.5.2, added the Netlify `same-origin-allow-popups` header and automated configuration evidence, expanded the correction count to nine, and added the deployed Google sign-in/Console acceptance gate. |
| V28 | 2026-08-09 | Trip Center shopping and link ownership | Reconciled the roadmap with `EXECUTABLE_TEST_SESSION_V18.md` and recorded open blocker `V5-F19`: Trip Center must not expose a standalone Links category, while link data and actions remain attached to their owning items and may use a background-only index. Defined Shopping as a standalone Trip Center category containing both shopping places/visits and the shared shopping list; dated shopping visits project into Timeline/Calendar. Added Alpha 0.6 synchronization, migration, acceptance and release gates without expanding the frozen Alpha 0.5.2 correction implementation. |
| V29 | 2026-08-10 | Trip Center location ownership | Recorded open blocker `V5-F21`: Trip Center must not expose Locations as a standalone user-visible category, list, card, tab or Quick Access destination. Location remains item-owned operational metadata used by item details, maps, navigation, country/destination association, import, synchronization and data integrity. Added migration, preservation and acceptance gates and kept the active 0.5.2 candidate NO-GO pending correction and focused retest. |
| V30 | 2026-08-10 | Active QA document alignment | Preserved the V29 location-ownership decision and aligned the next-action pointer with `EXECUTABLE_TEST_SESSION_V29.md`, which also retains the imported-item edit and refresh-persistence PASS results recorded while this roadmap update was in progress. |
| V31 | 2026-08-10 | Alpha 0.5.3 correction plan | Reconciled the final QA evidence in `EXECUTABLE_TEST_SESSION_V40.md`, froze the six-item 0.5.3 correction/retest scope, and preserved all accepted 0.5.2 regressions and the Alpha 0.6 product expansion backlog. |
| V32 | 2026-08-10 | Documents and Contacts ownership / version assignment | Approved that Documents and Contacts are not standalone Trip Center categories. Assigned the complete relocation and ownership model to Alpha 0.6 so unassigned documents retain a reachable Intake Inbox and Trip-level contacts retain a valid access path; preserved the already-built 0.5.3 scope unchanged. |
| V33 | 2026-08-10 | Transport item model / version assignment | Confirmed that Transport is already a Trip Center category and Timeline/Today concept, but lacks a first-class item model. Assigned the complete model for transfers, rail, ferry/boat, rental car and other ground/local transport to Alpha 0.6; preserved the frozen Alpha 0.5.3 correction package unchanged. |
| V34 | 2026-08-10 | Alpha 0.6 preparation-task detail model | Added the supported Preparation Task page/data contract: visible status and due mode, optional participant applicability and checklist, explicit completion/reopen behavior, migration and offline/synchronization/import/export acceptance. Kept Alpha 0.5.3 frozen as QA-only correction work. |
| V35 | 2026-08-10 | Participant-owned passport document model | Defined a passport as a `Document` with `documentType = passport` and a required single `ownerParticipantId`; made it an Alpha 0.6 architecture/data-model addition while preserving the approved participant-document UX and the frozen Alpha 0.5.3 scope. |
| V36 | 2026-08-10 | Camera capture for personal documents | Added direct camera capture as an equal source to file and gallery selection in the personal-document flow. The user reviews the captured image before it is saved; this is part of the Alpha 0.6 participant-document implementation. |
| V37 | 2026-08-11 | Attach documents and tickets to existing items | Added the explicit Alpha 0.6 flow for attaching a camera image, gallery image, PDF or other supported file directly to an existing item, including an item originally created from QR. Defined document types, participant assignment, multiple attachments, `Attach only` versus `Attach and extract information`, source preservation, item/Quick Access presentation and acceptance blockers. Reconciled the revision header with the controlled-document history and preserved the frozen Alpha 0.5.3 scope unchanged. |
| V38 | 2026-08-11 | Alpha 0.5.3 closure and Alpha 0.5.4 stabilization plan | Reconciled final QA evidence in `EXECUTABLE_TEST_SESSION_V61.md`, retained Alpha 0.4.3 in Production, selected a focused Alpha 0.5.4 before Alpha 0.6, froze its correction and acceptance boundaries, assigned `V5-W01` to non-blocking Alpha 0.6 technical hardening, and preserved all closed 0.5.3 evidence and the existing Alpha 0.6 product backlog. |
| V39 | 2026-08-11 | Alpha 0.5.4 implementation | Recorded completion of the frozen stabilization scope, cache-first 0.5.4 shell, blocked Offline Sign out, no-orphan shared-URL intake, persistent rejected-proposal archive, zero-vulnerability dependency disposition, full automated PASS, Production build PASS and pending Product Owner installation/acceptance. |
| V40 | 2026-08-12 | Alpha 0.5.5 implementation and roadmap reset | Reconciled final 0.5.4 NO-GO evidence from `EXECUTABLE_TEST_SESSION_V86.md`; implemented the reliable-intake boundary, experimental-PDF safety UI, out-of-range Cancel editor reset and archive-bottom refinement; created a dedicated Alpha 0.6 Smart Import redesign/discovery release; moved the former MVP-completion scope to Alpha 0.7 and shifted Beta/RC numbering accordingly. |
| V41 | 2026-08-12 | Alpha 0.5.6 focused correction | Reconciled final 0.5.5 NO-GO evidence from `EXECUTABLE_TEST_SESSION_V111.md`; froze 0.5.6 to `V5-F27`, centralized start/end Trip-boundary evaluation, preserved all accepted 0.5.5 behavior and retained Alpha 0.6 Smart Import as blocked until focused 0.5.6 Product Owner GO. |
| V42 | 2026-08-12 | Alpha 0.5.6 Product Owner GO | Recorded completed focused acceptance and explicit GO, closed `V5-F27`, authorized no-build Production promotion of the exact tested `dist`, retained 0.4.3 as live Production until deployment verification, and unblocked the Alpha 0.6 Smart Import discovery session while retaining the frozen-decision/benchmark implementation gate. |
| V43 | 2026-08-12 | Alpha 0.5.6 Production deployment | Recorded successful no-build Production deployment `6a7cc58d2a472ac18bfd44c2`, zero requested/uploaded assets and the remaining one-action-at-a-time live identity, sign-in and data verification gates. Reclassified Alpha 0.4.3 as the last fully verified baseline and rollback reference pending completion. |
| V44 | 2026-08-12 | Alpha 0.5.6 Production sign-in configuration blocker | Recorded live `Alpha 0.5.6` identity PASS and Google sign-in HTTP 403 with the exact Firebase referrer-blocked error. Required the narrow Production-host addition to the existing API-key HTTP referrers, prohibited disabling restrictions or adding a broad wildcard, and kept data/Production closure blocked pending retest. |
| V45 | 2026-08-12 | Alpha 0.5.6 Production sign-in recovery | Recorded successful Google sign-in after the narrow exact-host referrer correction, closed the configuration blocker without code/build/deploy changes, and retained existing Trip/data load as the sole remaining Production closure gate. |
| V46 | 2026-08-12 | Alpha 0.5.6 Production existing-data characterization | Recorded the desktop empty-Trip result after successful sign-in, stopped Production closure without yet declaring data loss, prohibited writes on both devices and required read-only phone-state observation before diagnosis or remediation. |
| V47 | 2026-08-12 | Alpha 0.5.6 Production acceptance / Alpha 0.6 discovery handoff | Recorded the empty-Trip observation on both desktop and phone, explicit Product Owner acceptance as a non-blocking migration/data-baseline limitation, final 0.5.6 Production status, 0.4.3 rollback-only status, no synchronization claim and the handoff to Smart Import discovery. |
| V48 | 2026-08-12 | Multi-user product intent / AI service boundary | Recorded that FamilyTrips is intended for the Product Owner, family members and controlled friend/demo access rather than one owner only. Kept AI-provider access centrally managed by FamilyTrips, required the Alpha 0.6 Smart Import boundary to be multi-user-ready, retained collaboration implementation in Alpha 0.7 and left the exact friend read-only versus isolated-demo behavior for Product Owner decision. |
| V49 | 2026-08-12 | Independent friend Trip ownership | Replaced the Viewer/demo-only friend assumption. Recorded that an authorized friend can create a private Trip and becomes its Owner, with no implicit access to the family Trip; required Smart Import authorization against the caller and target Trip, retained one central AI service and kept complete multi-trip/sharing/synchronization implementation in Alpha 0.7. |
| V50 | 2026-08-12 | Invite-only application access | Froze Product Owner-controlled email invitations as the only route into FamilyTrips. Separated application authorization from Trip sharing, required server-side allowlist enforcement for Smart Import, allowed invited users to create private owned Trips and assigned the full invitation-management lifecycle to Alpha 0.7. |
| V51 | 2026-08-12 | Revoked-account quarantine and approved deletion | Defined immediate access/AI blocking on invitation revocation, quarantine of the user's owned data, a configurable waiting period with no deletion, and a separate Product Owner approval gate after expiry. Prohibited automatic deletion and retained blocked data indefinitely when approval is absent. |
| V52 | 2026-08-12 | Revocation retention duration | Product Owner fixed the quarantine waiting period at 30 calendar days from revocation. Preserved that day 30 creates deletion eligibility only, separate Product Owner approval is mandatory and absent approval leaves data blocked indefinitely. |
| V53 | 2026-08-13 | Alpha 0.6 first delivery slice | Product Owner approved Hotel as the first complete Smart Import vertical slice. Froze hotel PDF/image plus public official hotel URL, both new-Hotel proposal and existing-Hotel attachment/extraction flows, complete hotel-data/evidence/failure invariants and the exclusion of Flight and generic multi-type work from the first implementation slice. |
| V54 | 2026-08-13 | Alpha 0.6 processing and privacy | Product Owner approved hybrid explicit-action consent, no-AI `Attach only`, maximum 24-hour transient processing retention, no provider training, locally retained originals with synchronization deferred to 0.7, Owner-only paid processing with per-user quota, Editor permission deferred to 0.7, and exclusion of passport/identity/visa and full payment-card/security-code extraction. Kept the 30-day revoked-account quarantine as a separate lifecycle. |
| V55 | 2026-08-13 | Alpha 0.6 universal source landing | Product Owner approved identical landing behavior for all item types: Global Add offers default-selected but explicitly confirmed `Analyze and propose item` or no-AI `Save source only`; save-only and failed/unsupported analysis retain the original in Intake Inbox and create no empty item; existing items offer `Attach only` or `Attach and extract`. Preserved Hotel as the only first-slice extractor. |
| V56 | 2026-08-13 | Alpha 0.6 source-relative completeness | Product Owner rejected one fixed minimum-field gate. Required every readable travel-relevant source value, a meaningful evidence-grounded title and, when present in a Hotel source, complete capture of dates, arrival/departure or check-in/check-out times, location, phone and booking number. Missing-in-source values are not blockers; unreadable/ambiguous/conflicting evidence remains needs-review and no value may be fabricated. |
| V57 | 2026-08-13 | Alpha 0.6 bounded external enrichment and initial cost target | Product Owner approved evidence-linked enrichment rather than unbounded search. Added a maximum of three related retrievable public pages and one structured place lookup per attempt, separate enrichment provenance and approval, safe stop/no-invention behavior, private/login and broad-crawl exclusions, and an initial approximately USD 0.10 variable-cost target per import pending Hotel benchmark calibration. |
| V58 | 2026-08-13 | Alpha 0.6 first real Hotel benchmark case | Product Owner designated `Confirmation_for_Booking_ Ban Ta Khun(1).pdf` as the base document. Registered case `H-001` by stable SHA-256, froze its complete source-only expected result and evidence/absence/review behavior in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H001_V1.md`, and retained the remaining benchmark matrix and measured cost/latency gates before integrated implementation. |
| V59 | 2026-08-13 | Alpha 0.6 exact textual Hotel Location | Product Owner clarified that the complete multilingual address in `H-001` is the exact source-extracted Hotel Location. Map links and coordinates are not prerequisites for Location exactness; later geocoding or place verification remains separately labelled derived/enriched data. Updated the benchmark, discovery and architecture references. |
| V60 | 2026-08-13 | Alpha 0.6 property-first Hotel place lookup | Product Owner recalled the earlier Panvaree result that resolved to the general park. Required lookup input to start with the exact Hotel name and only then add address/destination context; generic geographic candidates are rejected rather than stored as the Hotel pin. Updated the benchmark, discovery and architecture references. |
| V61 | 2026-08-13 | Alpha 0.6 second real Hotel source | Registered `Confirmation1819-1.pdf` as `H-002`. Froze its mixed Hebrew/English text-layout, booking/stay/contact/price/time and missing-location/cancellation-policy expectations. Recorded that it is not a scan and therefore does not close the separate OCR benchmark gap. Updated discovery and architecture references. |
| V62 | 2026-08-13 | Alpha 0.6 Hotel-name Location fallback and validation | Product Owner approved exact Hotel name as the Location-field/search fallback when explicit property location is absent. Required automatic validation of the actual Hotel entity, successful display by Hotel name with separately stored resolved map data, and needs-review/no-navigation behavior for failed, generic, conflicting or ambiguous results. Applied the rule to `H-002` V2 and updated discovery/architecture references. |
| V63 | 2026-08-13 | Alpha 0.6 Hotel image/OCR and duplicate companion benchmark | Registered `Panvaree_Hotel_booking.png` as `H-003`. Froze raster OCR, RTL/LTR numeric association, cropped partial-address handling and property-first validation. Exact Panvaree property, two identifiers and dates match `H-001`, so both sources must attach to one stable Hotel/stay in either order without copying invisible pixels, overwriting trusted values or creating a duplicate. Closed the image/OCR, partial-source, companion-document and duplicate-source matrix rows. |
| V64 | 2026-08-13 | Alpha 0.6 accessible official Hotel URL benchmark | Registered the Panvaree official website as `H-004`. Preserved the submitted tracking URL while displaying canonical `https://www.panvaree.com/`, used exactly three pages, froze official identity/location/three WhatsApp contacts/email and all material arrival/boat-transfer/safety notes, and closed both the accessible official-URL and missing-booking-reference rows without fabricating reservation data. |
| V65 | 2026-08-13 | Deferred post-MVP country preparation assistant | Recorded the Product Owner proposal for official-source country-specific preparation discovery after a Destination Country is added. Created `POST_MVP_COUNTRY_PREPARATION_DISCOVERY_V1.md`, retained Alpha 0.7 as country/task foundation only, assigned no MVP/Beta/RC version, and froze no automatic task-creation behavior while review-first versus automatic creation remains an explicit future decision. |
| V66 | 2026-08-13 | Post-MVP country preparation review decision | Product Owner approved review before creation. Updated the post-MVP discovery to V2 and froze that country-requirement refreshes may create/update suggestions only; an authorized explicit acceptance is required to create a Preparation Task, and accepted tasks are never silently changed or deleted by a later refresh. MVP scope and current Alpha 0.6 sequence remain unchanged. |
| V67 | 2026-08-13 | Alpha 0.6 blocked Hotel URL benchmark | Registered real Booking.com reservation-management route `H-005`. Froze explicit login/session-required failure, retained URL source and retry history, zero credential collection/bypass, zero proposal/enrichment without Hotel identity and safe PDF/image/text/save-only recovery. The minimum Hotel source matrix is complete; the bounded technical spike and measured cost/latency gates remain. |
| V68 | 2026-08-13 | Alpha 0.6 technical spike Stage A | Recorded Product Owner approval of the bounded H-001 through H-005 spike. Stage A measured PDF/OCR preprocessing and proved the 0.5.3 legacy interpreter fails semantic completeness. Prepared and smoke-tested an isolated Netlify Gateway `gpt-5.6-luna` strict-schema runner; retained Stage B paid accuracy/usage/cost/latency as unmeasured and blocked final gates/implementation. |

## 1. Delivery Principles

### Alpha
Alpha versions complete the full MVP functionality.

- Functionality is the priority.
- Architecture must remain stable.
- UI improvements are included only when required for usability or testing.
- Every release must be installable, testable, and deployable.
- Every release includes QA, acceptance tests, regression tests, release notes, and rollback instructions.

### Beta
Beta improves the product experience after MVP functionality is complete.

- Visual design
- HMI and interaction design
- Navigation refinement
- Mobile usability
- Accessibility
- Consistency
- Performance
- Final user-facing wording

### Release Candidate
Release Candidate is limited to:

- Bug fixes
- Data protection
- Reliability
- Offline verification
- Final Thailand-trip acceptance testing
- No new features unless a critical blocker is discovered

## 2. MVP Scope for Thailand

The MVP must support the real Thailand trip from planning through active use.

- Trip creation and management
- Private Trips and explicit shared-Trip access
- Two-user, two-device collaboration on the same Trip
- Near-real-time online synchronization and offline-change synchronization after reconnect
- One or more Destination Countries, destination/route summary, and Trip dates
- Trip lifecycle
- Smart document intake
- Manual item creation
- Dynamic forms by item type
- Item-owned documents plus a non-category Intake Inbox for unassigned sources; no standalone Documents category in Trip Center
- Direct camera/gallery/PDF/file attachment of documents and tickets to existing items, including items created from QR, without duplicate item creation
- Today
- Timeline
- Calendar and date selection
- Trip Center
- Games and travel activities
- Preparations and tasks
- Shopping places, scheduled shopping visits, and shopping lists
- Expense tracking
- Contextual website, booking, provider, document, and navigation actions attached to their owning items; no standalone Links category
- Item-owned locations and map/navigation actions; no standalone Locations category
- First-class Transport items for transfers, rail, ferry/boat, rental vehicles and other local transport
- Participants
- Participant-specific tickets and documents
- Packing lists
- Participant-specific packing
- Item-owned and Trip-level useful contacts; no standalone Contacts category in Trip Center
- Offline use
- Visible synchronization state and deterministic conflict handling
- Local persistence
- PWA installation
- Clear delete/reset behavior
- Interactive release testing

## 3. Completed Foundation

### Alpha 0.1
Validated:

- Empty initial state
- Basic Trip creation
- Basic document intake
- Basic item CRUD
- Today
- Timeline
- Trip Center
- Local persistence
- PWA
- Basic offline support
- Trip date conflict detection

### Alpha 0.2
Delivered scope:

- Multiple item intake methods
- Dynamic item forms
- Date modes
- Entire Trip option
- Improved Today behavior
- Unified Timeline Calendar views for Entire Trip, Week and Day
- Calendar-driven event-list filtering and synchronized period navigation
- Packing Lists foundation
- Contacts improvements
- New application icon
- Interactive test session file

Live acceptance result:

- Mandatory tests completed: 18 / 18
- Optional tests completed: 7 / 7
- Passed: 19
- Failed: 6
- Blocked: 0
- Release blockers: 2
- Release recommendation: **NO-GO as a stable release**

Open release blockers:

1. A saved link source cannot be opened from its related item.
2. Calendar dates cannot be selected to display that day’s events.

### Alpha 0.2.1 — Stabilization Hotfix

## Goal
Close the Alpha 0.2 release blockers and correct small mobile and validation defects before beginning Alpha 0.3 implementation.

## Required corrections

- Make saved link sources open reliably from the related item.
- Make a selected Calendar date display the relevant events, or temporarily remove the misleading selection behavior until the unified Timeline/Calendar implementation is ready.
- Prevent long filenames from exceeding the mobile viewport.
- Preserve access to the complete filename from document details or document opening.
- Make Contact phone optional.
- Remove duplicate quick access on Today.
- Reduce unnecessary vertical space in Trip Center cards on mobile.

## Verification gate

Alpha 0.2.1 is accepted only when:

- Both Alpha 0.2 release blockers pass focused regression tests.
- Documents, Today, Trip Center, and Contact forms pass mobile regression.
- Existing Alpha 0.2 mandatory tests remain green.
- No data migration or persistence regression is introduced.

## 4. Proposed Remaining Alpha Versions

# Alpha 0.3 — Participants, Document Ownership, and Timeline/Calendar Integration

## Goal
Introduce Participants as a core domain entity and connect documents, tickets, and packing to specific people.

## Required capabilities

### Timeline and Calendar integration
Calendar is an alternate view of the same Timeline data, not a separate destination or data model.

- Entire Trip, Week and Day are Calendar-based views inside Timeline, not a Calendar/list split and not separate destinations.
- The event list immediately below the Calendar displays only events in the active Timeline period.
- Selecting a date makes Day the active period and displays that date's events.
- In Week, moving with previous/next arrows or horizontal swipe/scroll changes the active week, visibly marks it on the Calendar, and refreshes the list to that same week.
- Entire Trip displays the Trip-range Calendar context and all Trip events in the list.
- Any additional duration-enabled Timeline period follows the same Calendar, active-period and synchronized-list contract.
- Use distinct markers for event types such as flight, hotel, restaurant, attraction, and transport.
- Keep one shared filtering and ordering implementation.
- Preserve Trip-range highlighting.
- Avoid independent Calendar-only event state.
- Confirm the final navigation placement before implementation.

### Trip settings
- Destination or route summary
- Destination Countries as an ordered list of one or more countries (roadmap gap identified after Alpha 0.3; implementation is binding Alpha 0.7 scope)
- Start date
- End date
- Participant management entry point; participant management belongs to Trip Settings, not Trip Center

### Participants
Each participant supports:

- Name
- Role or family relationship
- Optional phone
- Optional email
- Optional notes
- Optional avatar or initials
- Active/inactive status

### Participant relationships
Items and documents may apply to:

- One participant
- Several participants
- All participants
- No specific participant

### Tickets and passes
For attractions, flights, transport, and events:

- Multiple participant-specific tickets under one parent item
- Swipe or step through tickets
- Clear participant name on each ticket
- Used / not used state per ticket
- Ability to see which participants remain
- Barcode or QR display when available

### Packing
- Shared packing list
- Personal packing list per participant
- Switch between participants
- Suggested items assignable to one or more participants

### Document lifecycle
The document intake flow uses an Inbox, but Documents is not a standalone Trip Center category:

- Unassigned documents and sources appear in a reachable Intake Inbox outside the category grid
- Assigned documents appear inside the related item
- An existing item exposes a Documents and Tickets area from which the user can attach a camera image, gallery image, PDF or other supported file without creating another item
- An item created from QR retains its QR source and may receive the original document later as an additional linked source/document
- Attachments may be classified as booking confirmation, boarding pass, entry ticket, receipt or other document and may optionally be assigned to one or more participants
- `Attach only` preserves the item data unchanged; `Attach and extract information` may propose updates but applies none until explicit approval
- Optional View All Documents is a secondary search/utility projection, not a Trip Center category
- Deleting an item returns its documents to the unassigned inbox
- Documents are never silently deleted

### Historical delivery gap and reassignment

Alpha 0.3 originally opened as Accounts, Shared Trips, Participants and Document Ownership. It delivered the authentication/Firebase foundation and the participant/document domain work, but it did not deliver shared-Trip authorization, cross-device persistence, or two-user synchronization. Those capabilities are not treated as completed Alpha 0.3 work. They are binding Alpha 0.7 scope below.

Destination Countries and the final participant-management placement are also not treated as completed Alpha 0.3 work. They are binding Alpha 0.7 Trip Settings requirements below.

## Release blockers
- Participant cannot be assigned to item or document
- Personal packing list is unavailable
- Participant ticket switching is unreliable
- Deleting an item loses documents
- Data is not preserved after restart

# Alpha 0.4 — Smart Ingestion and Item Creation

## Goal
Turn real trip documents into structured trip information.

## Required capabilities

### Intake sources
- Upload PDF
- Upload image
- Take photo
- Paste link
- Manual entry

### Ingestion workflow
- Detect likely item type
- Extract title
- Extract dates
- Extract location
- Extract booking or confirmation number
- Extract participant names when available
- Extract provider or company
- Store original source
- Show confidence
- Require confirmation before creating structured data

### Filename and source heuristics
- Recognize provider and travel-domain signals such as airline names, hotel terms, and booking context.
- Do not classify an airline booking screenshot as a Hotel merely because a generic booking word is present.
- Convert filenames into readable proposed titles instead of copying raw filenames unchanged.
- Keep filename classification as a suggestion requiring user confirmation.

### Suggested item flow
- Create suggestion, not silent truth
- User can approve, edit, reject, or defer
- Approved suggestion creates or updates an item
- Original document remains attached

### Duplicate detection
- Warn about possible duplicate reservations
- Allow merge, keep both, or cancel

### Error handling
- Unsupported file
- Extraction failure
- Partial extraction
- Missing date
- Conflicting participant names
- Clear recovery path

### External language-model fallback

If reliable in-app extraction is not ready in time, FamilyTrips must support a documented external conversion path:

- A language model can receive one or multiple PDFs/images in one request.
- It produces one schema-validated `familytrips.import` v1 JSON batch containing sources, proposed items, confidence, warnings and source relationships.
- It may alternatively produce a scannable per-item QR, or both JSON and QR.
- A large item may use a numbered, checksummed QR series; data must not be dropped merely to fit one QR.
- The app imports every external item as a suggestion requiring review and approval.
- Original sources remain attached and duplicate handling keeps merge, keep-both and cancel choices.
- An empty imported value never overwrites a non-empty existing value during merge.
- A surname, passenger name, flight number or ticket number is never accepted as a booking number without explicit booking-reference evidence.
- The standalone operating specification is `FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS.md`, contract version `familytrips.import` v1.
- Application implementation is assigned to Alpha 0.5. This assignment covers both file import and QR scanning; it does not alter the installed Alpha 0.4.3 candidate and does not authorize Alpha 0.4.4.

## Release blockers
- First document does not create Trip
- Document creates incorrect item without confirmation
- Original document is lost
- Duplicate handling causes data loss
- Intake is unavailable after Trip creation

## Alpha 0.4 closure and Alpha 0.5 handoff

Alpha 0.4.3 remains the active Production version. Alpha 0.4.4 was installed and deployed only as a Draft candidate. Its focused acceptance did not resolve V4-F11 or V4-F13, so the Product Owner closed 0.4.4 as **NO-GO** on 2026-08-03 and explicitly chose not to promote it to Production. The Alpha 0.4 test cycle is administratively closed with the accepted Production baseline at 0.4.3; V4-F04, V4-F11, V4-F12 and V4-F13 are assigned to a broader Alpha 0.5 implementation and verification cycle.

Rules used to complete this gate (retained as lifecycle history):

- Continue the remaining Alpha 0.4.3 tests without creating a correction package mid-session.
- Record every finding immediately in this delivery plan and the V4 lifecycle documents.
- Until the session is complete, use the explicit target `TBD after Alpha 0.4.3 acceptance` and list the candidate destinations under consideration.
- Preserve all previous PASS, PASS-WITH-LIMITATION, FAIL and BLOCKED evidence.
- After the last test and short regression, assign each finding to Alpha 0.4.4, Alpha 0.5, a later version, or accepted behavior, with rationale.
- Alpha 0.4.4 is appropriate only for focused, architecture-compatible defects required to accept Alpha 0.4.
- Alpha 0.5 is appropriate for broader operational capabilities or changes that belong to its approved scope and do not block acceptance of Alpha 0.4.

### Final Alpha 0.4 acceptance register

| Finding / test | Current evidence | Status | Target version / disposition |
|---|---|---|---|
| V4-F01 — dynamic fields by item type | Retested on 0.4.3 and passed. | PASS | Closed in 0.4.3 |
| V4-F04 — default dates for new items | New-item defaults passed. An item saved before Trip dates are defined does not receive the initial Trip start date when it is later set; user-entered dates must never be overwritten. | PASS-WITH-LIMITATION; assigned | Alpha 0.5; explicit dates must be preserved |
| V4-F06 — navigation, website and phone actions | Navigation and website passed on desktop. On the deployed 0.4.3 Draft, tapping the phone action opened the device phone application with the correct number ready to dial. | PASS | Closed in 0.4.3 |
| V4-F08 — duplicate detection and merge | Duplicate flow is usable. Merge keeps one item and preserves both original source files. The dedicated F11 isolation test confirmed that the missing dates, website and location were already absent from the proposal before merge or save, so this run provides no evidence of merge data loss. | PASS on 0.4.3; extraction defect tracked separately as V4-F11 | Closed for 0.4.3 duplicate/merge behavior; no correction target |
| V4-F11 — PDF/OCR structured-field extraction | 0.4.3 falsely mapped `YITZHAK` as a booking number and missed visible flight/hotel fields. In 0.4.4 focused acceptance, one EL AL source was not ingested; another flight attempt falsely mapped `SCREENSHOT` as a booking number; and a hotel attempt placed Agoda booking ID `1736468481` in the phone field while dates and other structured fields were missing. The narrow heuristic correction is therefore insufficient. | FAIL in 0.4.4; broader redesign required; deferred by Product Owner | Alpha 0.5: classify document/provider first, extract by label and context, validate each field by type, attach confidence/evidence, leave uncertain values empty, support multi-segment reservations and prevent duplicate imports |
| V4-R01 — edited suggestion title persists | The proposed title was edited to an exact value, approved and reopened. The saved item retained the exact edited title. | PASS; short-regression step 1 complete on 0.4.3 | Closed in 0.4.3 |
| V4-R02 — original source opens from approved item | The original source attached to `בדיקת רגרסיה 0.4.3` was opened from the saved item and the correct PDF/image was displayed. | PASS; short-regression step 2 complete on 0.4.3 | Closed in 0.4.3 |
| V4-R03 — item deletion preserves original source | The user deleted the approved item `בדיקת רגרסיה 0.4.3`, then confirmed in Documents that the original source still existed and could be opened. | PASS; short-regression step 3 complete on 0.4.3; desktop short regression complete | Closed in 0.4.3; evidence retained |
| V4-F12 — external language-model import/QR fallback | A standalone specification defines multi-file PDF/image processing, `familytrips.import` v1 JSON, per-item QR or numbered QR series, source relationships, confidence/evidence, user review and protection against false booking-number mappings. Alpha 0.5 will verify a structured-data round trip rather than re-running OCR after QR creation, using camera scan and selection of a QR image from the gallery. | Specification complete; implementation and round-trip verification not started | Alpha 0.5 |
| V4-F13 — offline cold start after application closure | 0.4.3 failed after the installed PWA was closed and reopened without connectivity. Although the 0.4.4 automated offline-shell regression passed, the real installed application still could not be accessed without an internet connection. The Product Owner judged this non-critical for closing 0.4 and deferred it. | FAIL in 0.4.4 real-device acceptance; accepted deferral | Alpha 0.5: reliable installed-PWA cold start and access to saved trip data without connectivity |

Final disposition: **0.4.3 remains Production**. **0.4.4 is NO-GO and must not be promoted to Production.** No additional Alpha 0.4 user tests remain. The Alpha 0.4 test cycle is closed and the unresolved items above form binding Alpha 0.5 scope.

# Alpha 0.5 — Operational Trip Experience

## Goal
Make the app usable during the actual Thailand trip.

## Implementation status — 0.5.0 candidate

The complete approved Alpha 0.5 scope is implemented in the corrected installable `FAMILY_TRIPS_V5_0_5_0_RELEASE_R2` package. Alpha 0.4.3 remains the accepted Production baseline. Because the local test repository currently reports the rejected 0.4.4 candidate, R2 also supports that exact state as an installer handoff: it backs it up and replaces every runtime file changed by 0.4.4 with the V5 payload. This does not accept, reuse as an approved baseline, or promote 0.4.4.

Automated evidence completed before delivery:

- schema validation and one canonical proposal pipeline for `familytrips.import` JSON, `FTI1` and `FTI1C`;
- exact multipart QR reconstruction, repeated-part tolerance and SHA-256 rejection tests;
- regression protection for `YITZHAK`, `SCREENSHOT`, Agoda booking ID `1736468481`, multi-segment flights, uncertain empty fields and non-destructive merge;
- existing-undated-item backfill when Trip dates are later assigned, without overwriting explicit dates;
- Games/Activities, stable packing/Packed workflow, tasks, shopping, Today quick access, duration-derived Timeline modes, Calendar filtering and location records;
- scope-aware service-worker shell precache plus offline local-session fallback;
- full syntax, legacy regression, V5 unit tests and production build.

All Alpha 0.5 release blockers remain open for installed browser/PWA acceptance until the Product Owner completes `docs/versions/V5/EXECUTABLE_TEST_SESSION_V9.md`. Automated PASS does not promote the candidate to Production.

### QA checkpoint — 2026-08-03

- The corrected R2 installation and local production build passed.
- The candidate was deployed as a Netlify Draft and the application loaded successfully.
- Google sign-in initially failed because the Draft domain was not authorized in Firebase Authentication and in the Google API-key website restrictions. After the required domain/referrer authorization was added, Google sign-in passed. This setup issue is closed as `V5-F04` and is not an application-function failure.
- A fixed QA alias, `qa--familytripz.netlify.app`, is authorized for future versions so a new Firebase/Google domain does not need to be added for every release.
- The repeatable QA deployment flow is: build locally with the approved Firebase environment, deploy the already-built `dist` with `--no-build` to the fixed `qa` alias, run smoke checks, and promote to Production only after explicit Product Owner approval.
- The application is available for use and acceptance testing on both a computer browser and a phone/PWA. Device-specific actions and offline behavior still require their numbered acceptance tests.
- `V5-F05` is confirmed FAIL in structured test 1: the login screen still displays `V4`; the hard-coded label must be changed to the V5/Alpha 0.5 identity before release.
- `V5-W01` remains open as a non-blocking warning: successful Google popup sign-in produces Cross-Origin-Opener-Policy console warnings. Add `Cross-Origin-Opener-Policy = "same-origin-allow-popups"` to the Netlify site headers and verify the console before release.
- The Product Owner paused the session at this checkpoint. No final GO/NO-GO decision has been issued, Alpha 0.5 has not been promoted, and Alpha 0.4.3 remains Production.

### Phone exploratory checkpoint — 2026-08-04

The Product Owner exercised the QA candidate on a phone and reported the following findings. These observations are recorded even though the numbered V5 acceptance sequence remains incomplete.

| Finding | Phone evidence | Expected behavior | Status / target |
|---|---|---|---|
| `V5-F06` — mandatory fields are not marked in advance | No required-field indicator is visible before save. After attempting to save, an inline note appears beside the missing field and saving is correctly blocked. | Every mandatory field must be visibly marked before the first save attempt; the existing blocking validation and field-level explanation must remain. | Usability/validation defect; Alpha 0.5 correction and focused phone regression before GO. |
| `V5-F07` — Today becomes unreachable after Flight or Insurance creation | After creating a Flight item and after creating an Insurance item, the Product Owner could not reach the Today home page. Deleting the relevant item released the condition. Desktop evidence on 2026-08-04 reconfirmed the Insurance branch. Source inspection confirmed that Today builds `[currentHotel, nextTransport, ...critical]` and its duplicate-removal `findIndex` reads `u.id` before absent candidates are filtered. A valid Flight or Insurance therefore makes the scan encounter an earlier `undefined` candidate and throw. | Today must first remove null/undefined quick-access candidates, then deduplicate only valid records by ID while preserving order. It must remain reachable and render safely for every supported item type; deleting data is not an acceptable recovery path. | Root cause confirmed; shared Alpha 0.5 code correction with `V5-F12`, followed by Flight/Insurance separate-and-together regression before GO. |
| `V5-F08` — Timeline period views do not implement the agreed Calendar/list interaction | Calendar is currently exposed as its own quick-access button and the implemented Timeline behavior does not express the complete Calendar-based period contract. | Timeline is the single destination. Entire Trip, Week and Day each render a Calendar; the list below shows only events in the active period. In Week, arrows or swipe/scroll move the active week, the Calendar visibly reflects that week, and the list updates in sync. Any additional duration-enabled period follows the same contract. No standalone Calendar quick-access destination is shown. | Current Alpha 0.5 functional/navigation defect, not future scope; correction and focused phone/desktop regression before GO. |
| `V5-F09` — category-level Add does not preset the current category type | From a specific category, Add does not start creation with that category's item type preset. | Category-level Add must reuse the global creation flow while prefilling the item type from the current category; the user may still change the type when valid. | Previously agreed Scheduled Alpha capability had no exact target; planning gap closed by assignment to Alpha 0.7. |
| `V5-F10` — start/end-date invariant | Changing the start date requires a predictable end-date update rule. | If the existing end date is earlier than the newly selected start date, set the end date automatically to the new start date. If the end date is equal to or later than the new start date, preserve it unchanged. | Clarified date-form requirement; Alpha 0.5 correction/verification before GO. |

Temporary continuation note: deleting a Flight or Insurance item may allow testing to continue, but it does not close `V5-F07`, downgrade its severity, or authorize release.

### Task workflow checkpoint — 2026-08-05

| Finding / requirement | Product Owner evidence | Binding behavior | Status / target |
|---|---|---|---|
| `V5-F13` — preparation tasks in Today Quick Access | A future open task is omitted and appears only after its due date is changed to today. | Show up to three open preparation tasks. Include future tasks; order overdue, today, then nearest due date, then undated. Completed tasks are excluded. If more exist, show `All tasks`. Do not repeat a Flight already presented immediately above. | Implemented in Alpha 0.5.2; open pending focused installed-device retest. |
| `V5-F14` — existing tasks cannot be edited | An existing task cannot be reopened and changed. | Every saved task can be opened, edited and saved without changing its stable identity or creating a duplicate. Title, completion state and due date must round-trip correctly. | Implemented in Alpha 0.5.2; open pending focused installed-device retest. |
| Task priority/list discoverability | Task list does not expose a priority model; due date and priority are not both visible or filterable. | Add priority `High / Normal / Low` with `Normal` default. Each task row shows due date and priority. Provide filters for priority and due-date scope, with combined filters, clear/reset and deterministic sorting. | Coherent task-model/list enhancement assigned to Alpha 0.7. |

### Alpha 0.5.1 QA closure and Alpha 0.5.2 implementation — 2026-08-06

The Product Owner completed the pre-planning gate in the application-testing chat. A second reconciliation against the chat evidence confirmed that no functional finding was omitted from the original eight-repair Alpha 0.5.2 scope and that rejected or already-passed findings were not reintroduced. On 2026-08-07, the Product Owner explicitly added the previously non-blocking `V5-W01` configuration warning to the same correction version, bringing the approved total to nine corrections.

Passed evidence preserved without reimplementation:

- `V5-F06`, `V5-F07`, `V5-F10` and `V5-F12` passed focused Product Owner retest.
- Trip-date changes correctly mark items that move outside the Trip range; the earlier `Not defined` finding was incorrect and remains withdrawn.
- QR generation/import, ordinary item CRUD, warm-offline recovery, chronological ordering, out-of-range warning and correct external-link destination passed.

Implemented Alpha 0.5.2 repairs:

| Repair | Implementation | Automated state |
|---|---|---|
| Cold-start offline | Versioned 0.5.2 shell cache now stores both scope and `index.html`; navigation uses an ignore-search cached fallback before background refresh. | PASS; installed phone/PWA retest remains required. |
| `V5-F08` Timeline/Calendar | Entering Timeline resets the initial focus to Entire Trip and the Trip start, while the existing shared Calendar/list period state, arrows, swipe and date selection remain intact. | PASS automated; full phone/desktop interaction retest remains required. |
| `V5-F13` Quick Access | Up to three open tasks are selected in overdue → today → nearest future → undated order; completed tasks are excluded, future tasks fill vacancies, `All tasks` appears when required, and records already shown in Today are excluded from operational Quick Access. | PASS automated; Product Owner retest remains required. |
| `V5-F14` task editing | Every task row exposes Edit; title, owner, mode and due date update the same stable record while completion/uncompletion remains independent and persistent. | PASS automated; Product Owner retest remains required. |
| `V5-F15` — existing URL editing | The item editor always exposes the stored URL field, supports replacement or clearing on the same record, and displays a URL action even when no location exists. | PASS automated; Product Owner retest remains required. |
| `V5-F16` — import proposal phone layout | Modal and proposal content now constrain width, hide horizontal overflow and wrap long source names, addresses, warnings and URLs. | PASS static regression; target-phone retest remains required. |
| `V5-F17` / `V5-F18` — shared-link presentation/title and safe classification | Opaque `share.google` links are proposed as `Link`, keep the URL, use a reliable supplied page title or `Shared link`, and do not infer Flight without reliable provider evidence. | PASS automated; Product Owner retest remains required. |
| `V5-F11` wording | Removed the unsupported promise about other Trips while preserving the already-passed deletion scopes, confirmations and behavior. | PASS automated; delete-cancel smoke check remains required. |
| `V5-W01` — Google popup COOP warning | Netlify serves `Cross-Origin-Opener-Policy: same-origin-allow-popups` for application routes so Google popup sign-in can complete without the previously recorded popup-close policy warnings. | PASS automated configuration check; deployed Google sign-in and Console verification remain required. |

Deferred Alpha 0.7 scope includes the approved product decisions through V37: `V5-F09`, task priority/filters and the complete Preparation Task detail model, Multi-Trip, multi-user/two-device synchronization, participants in Trip Settings, ordered multiple Destination Countries, Expenses, Shopping places/visits, first-class Transport items, complete item-owned link/location/document/contact navigation and synchronization, participant-owned personal documents, removal of standalone Links/Locations/Documents/Contacts destinations, and the remaining Games content. The direct existing-item attachment foundation and optional extraction path move to the dedicated Alpha 0.6 Smart Import release.

QA-chat audit decision: `V5-W01`, the non-blocking Google-popup Cross-Origin-Opener-Policy console warning, is explicitly assigned to Alpha 0.5.2. It remains open until the fixed QA deployment returns `same-origin-allow-popups`, Google popup sign-in succeeds, and the previously recorded COOP warning no longer appears.

### Alpha 0.5.2 installed-device checkpoint — `EXECUTABLE_TEST_SESSION_V18.md`

- Installed-phone/PWA acceptance remains paused and Alpha 0.5.2 is NO-GO.
- Cold-start offline remains an open release blocker.
- `V5-F19` is an open Product defect: Alpha 0.5.2 added a user-visible standalone Links area to Trip Center, but every user-visible link must instead appear under its owning item.
- A background-only link index may be retained for import, lookup, synchronization or data integrity, but it must not render as a Trip Center category, list, card, tab or Quick Access destination.
- The corrected build must preserve item-owned URL editing and opening while removing the standalone Links UI. The finding remains open until focused Product Owner retest passes.
- Acceptance resumes at `V5-F15`; do not silently widen the already implemented Alpha 0.5.2 correction package before the remaining findings are completed and the next correction scope is explicitly frozen.

### Structured desktop resumption — 2026-08-04

| Finding | Desktop evidence | Expected behavior | Status / target |
|---|---|---|---|
| Test 1 / `V5-F05` — stale version identity | The login screen still displays `V4`, not Alpha 0.5. | The login screen and every exposed version label show the exact approved Alpha 0.5 identity, with no stale V4 label. | Test 1 FAIL; Alpha 0.5 correction and repeat verification before GO. |
| `V5-F11` — Settings delete/reset controls missing | The previously available option to delete current Trip data or Trips is absent from Settings. | Settings provide clear, separate destructive scopes with explicit target wording and confirmation; deleting one intended Trip/data scope never affects unrelated Trips. | Confirmed MVP regression and functional release blocker; restore and run focused desktop/phone regression in Alpha 0.5 before GO. |
| `V5-F12` — blank screen after sign-out/sign-in | After signing out and signing back in, authentication completes and the account bar renders, but the returning Today view aborts while main `#app` remains blank; hard refresh does not recover it. Source inspection links this observed re-entry symptom to the same Today quick-access `findIndex` defect as `V5-F07`, not to a separate authentication failure. | A complete sign-in → sign-out → sign-in cycle returns to Today and renders the saved Trip without refresh, data deletion or cache clearing. The null-safe quick-access correction must eliminate the uncaught error on desktop and installed phone PWA. | Keep as a distinct re-entry regression scenario; one shared Alpha 0.5 code correction with `V5-F07`, then desktop and installed-phone verification before GO. |

A hard refresh was used only to characterize `V5-F12` and the screen remained blank. Exact source inspection has completed the diagnosis: absent quick-access candidates must be removed before any `.id` comparison, and duplicate removal must operate only on valid records while preserving order. The simultaneous `chrome-extension://` load failures, host-validation messages and asynchronous-listener response remain browser-extension noise unless later evidence connects them to FamilyTrips. No further Product Owner diagnostic action is required on this broken build, and site data or Trips must not be cleared merely to continue the check.

## External import and QR scanning fallback

Alpha 0.5 must implement the application side of `familytrips.import` version `1.0` and `familytrips.qr.item` version `1.0`, as defined in `FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V3.md`.

Required capabilities:

- Provide or identify the approved repeatable QR-generation command/script used to convert a schema-valid external-ingestion result into a single `FTI1` QR or checksummed `FTI1C` series; a manually fabricated or visually simulated QR is not acceptable evidence.
- The generator must preserve the exact validated payload and source relationships, emit the required image(s) plus matching `.txt` sidecar payload(s), use deterministic series naming/part numbering, and choose multipart output without dropping data when one QR is insufficient.
- Before scanner acceptance, execute the generator against a controlled single-item fixture and a controlled multi-file/oversize fixture; independently decode every output, reconstruct multipart data, verify Base64URL and SHA-256 integrity, and compare the reconstructed `familytrips.import` data field-by-field with the generator input.
- Import one schema-valid `familytrips.import` JSON file containing one or multiple proposed items and sources.
- Scan a single `FTI1` QR with the device camera and allow selection of an existing QR image when camera access is unavailable or denied.
- Scan an `FTI1C` multipart QR series in any order, show collected/missing-part progress, tolerate a repeated part, and allow cancel/restart without creating partial data.
- Verify the schema version, Base64URL decoding and SHA-256 checksum before any proposal is shown.
- Reject unsupported versions, malformed payloads, incomplete multipart series and checksum failures with a clear recovery message.
- Present every decoded item as an editable suggestion requiring explicit approval; never create a final item merely because a QR was scanned.
- Preserve confidence, warnings and source metadata, and clearly indicate when original PDF/image bytes are not included in the QR.
- Run the existing duplicate flow with merge, keep-both and cancel; imported empty values must not overwrite existing non-empty values.
- Keep booking details and other personal travel data local during scanning and warn that an exported QR is not encrypted.
- Support a complete round trip: external model output → JSON or QR → FamilyTrips proposal → user approval → persisted item → reopen after restart.

Implementation sequencing:

- Treat JSON file import as the canonical decoder and validation path.
- Route QR decoding into the same validated import/suggestion pipeline rather than maintaining a separate item-creation implementation.
- Reuse this canonical validation path for the Alpha 0.5 implementation package; the Alpha 0.4 acceptance and assignment gate is closed.

## Games and activities
Games and travel activities are part of the Thailand MVP, based on the previously agreed Dolomites capability set.

Required capabilities:

- A dedicated Games / Activities area
- Family games usable during flights, transfers, waiting time, and evenings
- Activity cards with title, instructions, required items, suitable participants, and estimated duration
- Ability to mark favorites or quickly reopen a game
- Offline availability for saved games and instructions
- Trip activities remain separate from booked attractions and reservations
- The minimum Thailand content set must include road/transfer games, family trivia, and destination facts; if this content set is not accepted in Alpha 0.5, its completion is a binding Alpha 0.7 gap rather than a post-MVP idea

## Packing workflow improvements
- Collapsible packing categories.
- Duplicate prevention or clear duplicate warning across categories.
- Preserve shared and participant-specific ownership.
- Completed items move to a dedicated collapsible `Packed` section rather than jumping unpredictably inside the active list.
- Any movement of a completed item should be visually stable and reversible.

## Preparations and tasks
- Pre-trip preparation checklist
- Task ownership when a participant is relevant
- Due date or Entire Trip / No Date behavior
- Completed / incomplete status
- Quick visibility from the pre-trip Today experience

## Shopping
- Shared shopping list
- Optional participant owner
- Quantity and purchased status
- Items may link to packing or preparation needs
- The current Alpha 0.5 foundation is the list workflow. Shopping places and scheduled visits are an approved Alpha 0.7 completion requirement and do not change the frozen Alpha 0.5.2 implementation scope.

## Today
- Show only events relevant now
- Show today’s events
- Show next upcoming event
- Show active Entire Trip information
- Hide old events by default
- Quick access to current hotel, next transport, insurance, tickets, and emergency contacts
- Remain reachable and render without failure after creating any supported item type, including Flight and Insurance
- During the preparation phase, prioritize actionable packing and preparation tasks in Quick Access and do not repeat the same Flight card already presented immediately above
- Label the item type in Quick Access and expose the relevant website and original-document action when either exists

## Timeline
- Timeline is the single destination; Calendar is not exposed as a standalone quick-access destination.
- The period selector includes Entire Trip, Week and Day. Other period options may appear only when Trip duration makes them useful.
- Every available period is rendered as a Calendar view above a chronological event list.
- Entire Trip shows the Trip-range Calendar context and lists all events in the Trip.
- Week shows the active week and lists only events that intersect that week.
- Day shows the selected day and lists only events that intersect that day.
- Previous/next arrows and swipe/scroll navigation move between periods where applicable.
- In Week, navigation updates the visible and selected week on the Calendar and refreshes the list to the same week in one synchronized state change.
- Selecting a Calendar date updates the active day and the list without changing any source item date.
- Clear current-day and active-period markers are required.
- Any additional duration-enabled period, including Month if offered, follows the same Calendar, active-period and synchronized-list contract.

## Calendar and date selection
- Calendar uses the shared Timeline event source.
- Calendar is the primary visual representation of each Timeline period, with the filtered event list directly below it.
- Highlight Trip date range.
- Visually distinguish the active day, week or broader selected period from the current day.
- Selecting a date filters the list to that date's events and never mutates source dates.
- Week navigation by arrows or swipe/scroll must keep Calendar selection, visible week and event-list filtering synchronized.
- Different event types use distinguishable markers.
- Select item date from Trip range.
- Date-range selection.
- Entire Trip checkbox.
- Out-of-range warning without forced date changes.
- When a start-date change would otherwise leave the end date earlier than the start date, set the end date to the new start date; otherwise preserve the existing end date.

## Form validation
- Mark mandatory fields visibly before the first save attempt.
- Continue blocking save when a mandatory field is empty and keep the field-level explanation beside the relevant field.

## Location
- Auto-detected location
- Search location; for a Hotel, construct the query with the exact evidence-grounded property name first and the most specific address/destination context second
- Pin on map
- Confirm or correct
- Store place name, address, coordinates, source, confidence, and approval state
- Accept a Hotel pin only when the candidate matches the named property and compatible address context. Reject generic park, dam, lake, island, city or regional results rather than attaching them to the Hotel.
- When explicit property location is absent, prefill the Location review field/search candidate with the exact Hotel name and mark it pending validation.
- Validate accommodation/entity type, normalized Hotel-name match, non-conflicting available phone/email/domain identity, usable provider place identity/map position and absence of unresolved competing Hotel candidates.
- On success, display the exact Hotel name in Location and store resolved address, coordinates, provider place identity, timestamp and match evidence behind it with external provenance. On failure/ambiguity, keep only a visible `needs_review` textual candidate and disable map/navigation actions.
- A location is operational metadata owned by a relevant item or entity; it is not a standalone user-visible Trip Center category, list, card, tab or Quick Access destination (`V5-F21`).
- Item details/editors may display their location and map/navigation actions. A general map may aggregate item-owned pins without creating a separate user-facing Locations collection or duplicate records.
- The data layer may keep background geospatial records or indexes for search, import, duplicate detection, distance calculation, synchronization and data integrity.
- Existing standalone Location records must be associated with an appropriate owning item or preserved in a recoverable background/inbox flow; removing the standalone UI must never silently delete coordinates, addresses, sources or country/destination associations.

## Offline
- Trip shell available offline
- Structured items available offline
- Critical documents and tickets available offline
- Clear indication when a resource is not available offline

## Release blockers
- Today shows irrelevant future or past events
- Today becomes unreachable or fails to render after a Flight or Insurance item is created
- Tickets are unavailable offline
- Maps or locations silently fail
- Calendar changes source dates
- A Timeline period Calendar and the event list below it represent different periods, or week navigation fails to update both in sync
- Current hotel or next transport cannot be reached quickly
- Preparation-stage Quick Access contains no actionable packing/preparation entry when one exists, or confusingly repeats the same Flight already shown on the screen (`V5-F13`)
- A valid `familytrips.import` v1 file cannot be reviewed and imported.
- A valid `FTI1` QR or complete `FTI1C` series cannot be decoded into the same review flow.
- Invalid, incomplete or checksum-failing QR data creates or partially writes an item.
- QR or file import bypasses user approval, loses source relationships, or overwrites a non-empty value with an empty value.

# Alpha 0.6 — Smart Import Redesign

## Goal

Replace the failed browser-only heuristics for creating or enriching travel items from a URL, image/camera capture or PDF with one evidence-backed, source-preserving and review-first architecture. This release is dedicated to Smart Import and must not absorb the former broad MVP-completion backlog.

## Entry gate — Product Owner discovery session

**Entry gate: PASSED.** `SMART_IMPORT_REDESIGN_DISCOVERY_V22.md` freezes Decisions 1–7 and preserves H-001 through H-005 as the complete minimum source matrix. Three-attempt V10/V11 measurement produced 80–100% source-relative recall by case, zero false exact integrity claims, required `access_required` behavior for H-005, sub-27-second completed-model latency and maximum observed cost of USD 0.006744 per attempt. V13 validated both real Hotel identities with one name-first Google Places lookup each, all safety gates passed and maximum provider latency was 446 ms. Controlled evidence is in `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V7.md`.

The first delivery slice, processing/privacy, universal source landing, source-relative completeness/evidence and bounded public-enrichment policies are closed. The measured cost is comfortably below the initial USD 0.10 per-import target. Integrated Hotel-first Alpha 0.6.3 is authorized for fixed-general-QA execution after safe environment configuration; Production remains gated by the executable Product Owner session.

## Frozen processing and privacy contract

- `Attach only` is local and invokes no AI. `Analyze and propose` and `Attach and extract` are explicit per-attempt processing actions, preceded by a concise first-use disclosure for that account.
- Raw source bytes, transient OCR/layout artifacts and retrieved page content are deleted from the processing path immediately after completion/failure and no later than 24 hours after receipt. Eligible providers may not use FamilyTrips data for model training.
- The Alpha 0.6 original remains locally openable and linked to its Hotel until explicit confirmed deletion. Original-source cloud/cross-device synchronization is deferred to Alpha 0.7.
- Only the target Trip `Owner` may invoke paid AI processing in Alpha 0.6, with server-side invitation/ownership checks, attempt attribution and a per-user quota. `Editor` processing permission is deferred to Alpha 0.7.
- Passport, national-identity and visa documents are not processed by AI in Alpha 0.6. The Hotel extractor must not extract or retain a full payment-card number or security code.
- The 24-hour processing-copy rule is independent of revoked-account data: revocation still triggers immediate blocking and the separately approved 30-day quarantine/deletion-approval lifecycle.

## Frozen universal source-landing contract

- The same landing interaction applies to all current and future item types; support for that interaction does not imply that Alpha 0.6 can extract every type.
- Global Add presents **Analyze and propose item** as the default-selected path and **Save source only** as the no-AI path. Processing begins only after explicit confirmation and any required first-use disclosure.
- **Save source only** stores the unassigned original in the non-category Intake Inbox.
- Failed, unsupported or insufficient analysis creates no empty/generic item. The original remains in Intake Inbox with an explicit state and **Retry** / **Delete** actions.
- A successful analysis creates editable proposals only and requires approval before final creation.
- Every existing item exposes **Attach only** and **Attach and extract**. Until that item's extraction contract is supported, the second action reports a truthful unsupported state and keeps the source attached without changing structured data. Attachment never creates a duplicate item and extraction never silently applies values.
- Alpha 0.6 implements and benchmarks extraction only for Hotel. Other types use truthful unsupported, save-only or attachment behavior until their own extraction contract is approved.
- Alpha 0.6 includes the minimum non-category Intake Inbox required by this contract: retained sources are listable/openable and expose status, retry and delete. Alpha 0.7 still owns the complete cross-type document-management, assignment/search, sharing and synchronization experience.

## Frozen source-relative completeness and evidence contract

- Smart Import has no fixed absolute minimum field count. A sparse source may produce a sparse draft; a field absent from the source remains empty and is not fabricated.
- Every readable travel-relevant value present in the source must appear in the review draft with evidence. For Hotel, dates, arrival/departure or check-in/check-out times/windows, location/address/map data, phone and booking/confirmation number are explicit no-omission blockers whenever present.
- A complete, unambiguous source address is the exact Hotel Location. A map link or coordinates are not required for source-extraction exactness and their absence must not downgrade the Location. Any later geocoding, map pin or external place verification is optional derived/enriched data with separate provenance.
- If explicit property location is absent, the exact source Hotel name is the derived Location-field/search candidate. It becomes a mapped Location only after place validation; successful display remains the Hotel name and resolved address/coordinates stay separately provenanced.
- The named Hotel fields are not a ceiling. Property/provider name, website/email, guests/rooms/meal plan, price/payment/taxes, restrictions, operational instructions, warnings, notes and companion-document relationships are also mandatory when present and readable.
- Every proposal requires a meaningful evidence-grounded title. A generic type label, raw filename, URL host or opaque identifier is not sufficient. Exact Hotel property name is used when present; otherwise the title may combine other direct evidence but never invent a property.
- Missing-in-source values do not block approval. Unreadable, ambiguous or conflicting present values stay visible as unresolved/needs-review. A draft cannot be approved until it has a meaningful title, represents all readable source content and resolves or explicitly accepts approval-blocking uncertainty.
- Each proposed value carries direct field evidence and provenance. Confidence informs review state; no numeric score permits omission, fabrication or silent external enrichment.

## Frozen bounded external-enrichment policy

- Source extraction is completed first. External enrichment never substitutes for source-relative completeness and never hides a readable value that was omitted from the supplied document.
- Each processing attempt may retrieve at most three evidence-linked public HTTP/HTTPS pages in total, including the supplied URL when the source is a URL, and may perform at most one structured place lookup.
- Every Hotel place lookup starts with the exact evidence-grounded property name, followed by the most specific source address/destination context. Candidate acceptance requires property-identity and address compatibility; a generic park, dam, lake, island, city or regional result is rejected or left `needs_review` and never becomes the Hotel pin.
- Recipient/guest country or address is not property-location evidence. If no property address exists, lookup remains property-name-first and uses compatible official identity signals such as exact email domain or phone; any resulting property address/pin remains separately labelled enrichment.
- Missing-address validation requires a compatible accommodation entity, normalized Hotel-name match, no conflict in available identity signals, a usable provider place/map identity and no unresolved competing Hotel candidates. Success keeps the Hotel name as the field label; failure/ambiguity creates no coordinates or navigation action.
- Eligible relationships are grounded in embedded/QR links, an official Hotel site, a directly related public booking page, map/place evidence or another public page safely matched to the same Hotel/booking.
- Every enriched field is labelled separately and retains field-level provenance, source URL/service, acquisition timestamp and match/review state. It remains a proposal until explicit approval.
- Login/session/CAPTCHA/credential-protected pages, private booking automation, email/cloud-drive integration, arbitrary open-web search and broad crawling are excluded from Alpha 0.6.
- Ambiguous identity, blocked retrieval or an exhausted page/lookup/cost boundary stops enrichment with an empty or needs-review field. It never triggers an unbounded retry, guess or misleading item.
- The initial benchmark target is approximately USD 0.10 or less in variable third-party cost per import across extraction and paid enrichment. Every attempt records cost and latency; the final production limits are frozen after the Hotel technical spike.

## Approved first vertical slice — Hotel

The first Alpha 0.6 technical spike and integrated implementation support only:

- text and scanned hotel PDFs;
- hotel images from gallery or camera;
- public official hotel URLs retrievable without user credentials;
- a new-Hotel proposal from global Add;
- `Attach only` and `Attach and extract` from an existing Hotel.

The slice must return a reviewable, evidence-backed representation of every readable travel-relevant hotel value present in the source, including exact property/provider identity, booking references, stay and check-in/check-out dates/times, arrival/departure and reception/key/access instructions, address and exact location/map data, phone/email/official website, guests/rooms/meal plan, price/payment/taxes, cancellation/restrictions, warnings, operational notes and companion-document relationships. Values that are missing, unreadable, uncertain or conflicting remain visibly unresolved and are never guessed.

This is a complete architecture slice, not a hotel-specific shortcut: immutable source identity, processing attempts, field evidence, proposal review, explicit approval, duplicate handling, multi-source relationships, attachment ownership, partial/failure states, authorization and audit/cost/latency measurement all apply. Flights, boarding passes, activities/tickets, Transport, Insurance and generic multi-type extraction are not implemented in this first slice and require later Product Owner-approved type contracts and benchmark evidence.

## Required capabilities

### One source pipeline

- Camera capture, gallery image, PDF/file and URL all enter one source-ingestion pipeline with immutable original-source identity and traceable processing attempts.
- Manual item creation and validated `familytrips.import` / `FTI1` / `FTI1C` remain independent trusted paths and are not replaced.
- URL ingestion retrieves actual allowed page content through an approved server-side acquisition path; it never classifies from the URL string, filename or user-entered label alone.
- When a provider blocks retrieval, content is inaccessible or confidence is insufficient, the flow fails clearly and creates no misleading item or fabricated field.

### Reviewable structured result

- Every extracted value carries field-level evidence, source reference, extraction method and confidence.
- Values absent from the source or unsupported by direct evidence remain empty. Every readable present value—including date, time, specific location, provider/official website, booking reference, route and participant/ticket ownership where applicable—must be represented in the draft or explicitly marked unresolved.
- Extraction creates a proposal only. No structured value is saved, merged or used to overwrite an existing item without explicit approval.
- One source may propose multiple items, and multiple sources may support one item, without losing source lineage.
- Duplicate detection runs before approval and preserves non-empty trusted values.

### Existing-item attachment

- `Attach only` is a reliable foundation: camera, gallery, PDF/file and supported ticket images may attach directly to an existing item, including an item created from QR, without creating another item or proposal.
- `Attach and extract` uses the same Smart Import pipeline and returns field-level proposals requiring approval.
- The original QR/import source and each later attachment remain separate traceable records owned by the same stable item.

### Safety and observability

- The user can cancel, retry, reject or keep the original source without accepting extracted data.
- Processing state distinguishes queued, processing, partial, needs review, failed, attached and rejected outcomes.
- Logs and diagnostics identify acquisition, OCR/document parsing, model/schema validation and persistence failures without exposing personal travel data.
- Offline behavior is explicit: originals already stored locally remain openable; network-required extraction is queued or blocked with a clear explanation.

## First-slice acceptance benchmark

The first-slice benchmark uses real, Product Owner-approved Hotel examples covering at least:

- frozen base case `H-001`: the Agoda text PDF `Confirmation_for_Booking_ Ban Ta Khun(1).pdf`, including its exact textual Hotel Location, property-first place-lookup regression and complete expected result in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H001_V3.md`;
- frozen case `H-002`: the mixed Hebrew/English text PDF `Confirmation1819-1.pdf`, including layout-aware RTL/LTR label-value association, operational times/contact/prices and the validated `Alaya Poleg` Location-name fallback in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H002_V2.md`;
- frozen case `H-003`: raster Agoda screenshot `Panvaree_Hotel_booking.png`, including mixed-direction OCR, two booking identifiers versus phone, cropped partial-address behavior, and one-item companion/duplicate reconciliation with `H-001` in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H003_V1.md`;
- frozen case `H-004`: accessible official `https://www.panvaree.com/`, including canonical tracking-free website identity, exact three-page acquisition, official address/contact evidence, complete operational arrival/boat notes and correct absence of reservation-specific values in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H004_V1.md`;
- frozen case `H-005`: Booking.com reservation-management URL `https://secure.booking.com/myreservations.html`, including explicit access-required classification, retained source/retry history, no credentials or bypass, no Hotel proposal/enrichment and safe PDF/image/text/save-only recovery in `SMART_IMPORT_HOTEL_BENCHMARK_CASE_H005_V1.md`;
- a partial or unreadable hotel source; `H-003` supplies the approved vertically cropped partial-source case;
- a hotel source missing a booking reference; `H-004` supplies the approved general official-website case (`H-001` separately covers an absent official website);
- multiple companion documents for one hotel booking; `H-001` and `H-003` supply the approved pair;
- duplicate sources for the same hotel booking; `H-003` must match `H-001` in either import order and create one stable Hotel/stay.

First-slice blockers include a generic/non-meaningful title; any silent omission of a readable Hotel value or operational note; omission of dates, arrival/departure or check-in/check-out times/windows, location, phone or booking number when present; fabricated data; silent write; lost original; wrong owning item; duplicate final Hotel; unsupported-source success claim; a proposed value without visible evidence; unlabelled external enrichment; or an attempt exceeding the three-page/one-place-lookup boundary. Missing-in-source values are not blockers. The initial cost target is approximately USD 0.10 or less per import; the final measured latency and calibrated production-cost gates are frozen after the spike and before integrated implementation. Expansion to another item type requires a separately approved type contract and benchmark; Hotel success does not imply Flight or generic multi-type support.

## Explicit exclusions

- Multi-trip, sharing/synchronization, Expenses, Shopping expansion, first-class Transport, task-model expansion, broad visual redesign and the remaining MVP-completion backlog stay in Alpha 0.7.
- Flight, boarding-pass, activity/ticket, Transport, Insurance and generic multi-type extraction are excluded from the first Smart Import implementation slice.
- The external-model `familytrips.import` and QR contract remains a supported fallback and test oracle; Alpha 0.6 does not silently change its schema.
- Alpha 0.5.5's experimental PDF path is evidence collection only and is not treated as the Alpha 0.6 architecture.

## Alpha 0.6 release gate

Alpha 0.6 receives GO only after Decision 6 is completed in Discovery V21, the approved end-to-end Hotel vertical slice passes its benchmark including `H-001` through `H-005`, all supported Hotel sources share the same proposal and ownership invariants, the bounded enrichment and measured accuracy/cost/latency gates pass, failure branches create no misleading data, and the exact tested build passes privacy, offline, schema, duplicate, persistence and regression gates.

# Alpha 0.7 — MVP Completion and Hardening

## Goal
Complete all remaining MVP gaps before Beta.

## Required work

### Trip identity and settings

- Trip Settings is the canonical place to view and edit the Trip name/title, destination or route summary, ordered Destination Countries, start date and end date.
- Every Trip has one or more Destination Countries. The data model stores them as an ordered list of structured country entries with a stable country code and display name; duplicate countries are not allowed.
- Alpha 0.7 country management does not search for immigration, driving, health or other regulatory requirements and does not generate country preparation tasks. That intelligence is explicitly deferred to the post-MVP discovery in `POST_MVP_COUNTRY_PREPARATION_DISCOVERY_V1.md`.
- The user can add, remove and reorder Destination Countries. The displayed order represents the intended Trip route, but does not constrain event dates or require all items to be grouped by country.
- Existing single-country Trip data migrates to a one-entry Destination Countries list without user action or loss of metadata.
- Itinerary items, bookings, documents and saved locations may optionally reference one country from the Trip's Destination Countries list. Items that span borders may remain Trip-wide or describe their route without being forced into one country.
- Removing a country that is referenced by existing records is blocked until those records are reassigned or the country association is explicitly cleared; country removal never silently deletes or rewrites Trip content.
- Destination Countries persist across restart and active-Trip switching and participate in import, backup/export and the cloud synchronization contract.
- Expense currency is independent of Destination Countries: a multi-country Trip can contain any supported original currencies, and no currency is silently inferred or rewritten from the country list.
- Trip Settings contains the participant-management entry point and supports adding, editing, activating and deactivating participants.
- Trip Center remains a category-first operational area for Trip content. It does not own Trip identity, dates, Destination Countries, participant management, sharing permissions, destructive data/lifecycle actions or standalone technical collections for Links, Locations, Documents or Contacts.
- Trip Center exposes Shopping as a standalone operational category, but it does not expose Links, Locations, Documents or Contacts as standalone categories, lists, cards, tabs or Quick Access destinations.
- Participant relationships on tickets, documents, packing, tasks, shopping and other items remain available from their relevant operational contexts; only participant administration moves to Trip Settings.

### Multi-trip and lifecycle completion

- Every authorized signed-in user can create a private Trip and becomes that Trip's `Owner`; this applies equally to the Product Owner, family members and friends.
- Multi-trip foundation with explicit active-Trip selection
- Create, open, archive and restore a Trip without affecting another Trip
- Delete current Trip data, delete one selected Trip, and delete all local/account data as separate actions
- Clear destructive-action warnings that name the exact target and scope
- Migration strategy between versions
- Export or backup foundation

### Shared Trips, roles and access

- FamilyTrips application access is invitation-only. The Product Owner controls an allowlist of invited email addresses; Google sign-in alone does not authorize use.
- The verified sign-in email must match an active invitation before any Trip metadata, document, source, proposal or AI endpoint is accessible.
- Application invitation and Trip sharing are separate grants: accepting an app invitation permits creation of a private owned Trip but grants no access to an existing Trip.
- Trips are private by default
- The Owner can share one Trip with a second signed-in user as an Editor and can revoke that access
- MVP roles are `Owner` and `Editor`; Trip participants do not need application accounts
- Both Owner and Editor can edit the same shared Trip from separate devices
- Authorization is enforced for structured Trip data and stored documents; a user cannot read or modify a Trip they neither own nor share
- Firestore and Storage remain deny-by-default until Owner/Editor rules and storage paths pass automated and real-account tests
- Family members are intended real application users of the shared Trip, not merely participant records; each family member who edits must use an authorized signed-in account.
- Friends use FamilyTrips as independent users: each may create and manage a private Trip they own. Creating an account or Trip grants no implicit access to the Product Owner's family Trip.
- A friend may access another user's Trip only through the same explicit sharing and revocation rules as any other signed-in user; no separate demo-only or automatic `Viewer` path is required by this decision.
- All application users consume the centrally managed FamilyTrips AI service according to their authorized role and future quota; no role requires an external AI-provider account, model choice or API key.
- The Product Owner can add, view and revoke application invitations. Revocation immediately blocks application and AI access and quarantines the user's owned Trips, documents, sources and proposals without transfer or exposure.
- Each revoked account records a revocation timestamp and a deletion-eligibility date exactly 30 calendar days later. No deletion is permitted before that date.
- Reaching the deletion-eligibility date does not delete anything. The Product Owner must issue a separate explicit confirmation that identifies the account and scope before irreversible deletion begins.
- If the Product Owner does not approve deletion, the account and owned data remain blocked indefinitely.
- Account deletion must not remove records owned by another user's Trip; contribution/audit handling must be defined and tested separately.

### Cloud synchronization contract

For the Thailand MVP, cloud synchronization means two users on two separate devices editing the same shared Trip data.

- Online changes appear on the other device in near real time without manual refresh
- Offline create, edit, complete and delete operations are queued locally and synchronized automatically after connectivity returns
- A visible state distinguishes synced, syncing, offline-with-pending-changes, and conflict/error conditions
- Synchronization preserves stable item identity and must not create duplicate items merely because the same queue is retried
- Independent list-item changes merge without dropping unrelated changes
- Concurrent changes to the same value resolve by one documented deterministic rule; when automatic resolution would risk data loss, the application shows the conflict and requires an explicit choice
- The same final state is reached on both devices after all pending operations are processed

The minimum synchronized data set is:

- Shared and participant-specific packing
- Intake Inbox, sources and item-owned Documents
- Bookings, Hotels, Flights and Transport items
- Attractions, Activities and itinerary items
- Expenses
- Shopping lists, shopping places and scheduled shopping visits
- Preparation tasks
- Trip settings—including the ordered Destination Countries list and optional record-to-country associations—participants, Trip-level contacts, shared contact records, item-owned document/location metadata, background geospatial records and background link records required by the records above

### Expenses

- Add, edit, delete and view an expense
- Store description, amount, original currency, category, date, payer and optional notes/receipt
- Preserve original-currency amounts and show totals per currency; any base-currency conversion uses an explicit stored rate rather than silently changing historical values
- Work offline and synchronize with the shared Trip under the cloud-sync contract
- Include expenses in export/backup so synchronization or migration cannot silently lose financial records

### Shopping places, visits and lists

- Shopping is a standalone Trip Center category, separate from Attractions.
- The category contains two coordinated views or sections: shopping places/visits and the shared shopping list.
- Shopping places include malls, markets, outlets and destination stores.
- A shopping place/visit can store title, place type, optional date and start/end time or duration, location/map action, country/destination association, notes, planned stores and relevant item-owned website/navigation actions.
- When a shopping visit has a date or time, the same entity appears automatically in Timeline/Calendar; the application must not create a duplicate schedule record.
- A shopping place may remain unscheduled as a saved candidate and later receive a date without changing identity.
- Shopping-list entries retain quantity, purchased status and optional participant owner, and may optionally link to a specific shopping place/visit.
- Removing a shopping place never silently deletes linked list entries; the user must retain them unassigned or explicitly reassign them.
- Shopping places, visits, links and list relationships work offline, synchronize under the shared-Trip contract and survive restart, import/backup/export and active-Trip switching.

### Transport items

- Transport remains one Trip Center category, but it is backed by a first-class `Transport` item rather than by a generic activity or free-text note.
- Supported modes in the Thailand MVP are: private/shared transfer or shuttle, train/rail, ferry/boat, rental car, bus/public transport and `Other transport`. A mode changes the form and primary action; it does not create a separate top-level category.
- Every Transport item supports title, mode, provider, booking/reference number, date/time or date range, route, item-owned pickup and drop-off locations, participant applicability, notes, links, documents, relevant contact and country/destination association.
- Scheduled transport (rail, ferry, bus and comparable services) additionally supports carrier, service/route number, departure and arrival place/time, platform/pier/gate when known, coach/seat when applicable, and participant-specific tickets/passes with the same full-screen barcode/QR behavior used for flights and attractions.
- A transfer/shuttle additionally supports pickup instructions and time, driver/provider, vehicle description or plate when known, passenger and luggage notes, and direct call/message actions for the relevant contact.
- Rental car additionally supports pickup and return location/time, provider and booking reference, vehicle details, assigned drivers, rental documents/insurance and optional parking/return instructions. It does not duplicate the Insurance item; it links to the relevant policy/document when present.
- The item Detail is the canonical context for route, map/navigation, tickets, documents, provider links and contact actions. Transport does not create independent Locations, Links, Documents or Contacts collections.
- A dated Transport item projects once into Timeline/Calendar and can become Today’s `next transport` Quick Access item. The primary action is context-dependent: navigation to the pickup/departure point, opening a participant ticket, or contacting the provider/driver.
- Transport items work offline, synchronize under the shared-Trip contract, and survive restart, active-Trip switching, import, backup/export and migration without losing route, ticket, contact or item-owned location relationships.

### Preparation Task detail model

- `PreparationTask` is a first-class pre-trip record, rather than a generic note or dated itinerary item. It remains reachable from Preparations/Tasks and does not create a Trip Center category.
- Every task supports a stable ID, required title, optional description/notes, status (`open` or `completed`), due mode (`date`, `entire-trip`, or `none`) and, when date mode is selected, one due date. The three due modes are mutually exclusive and no synthetic date may be created for an undated task.
- A task may be shared or be applicable to one or more existing Trip participants. Participant applicability is optional and preserves the participant relationship across edit, restart, active-Trip switching, import/export and synchronization.
- A task may contain an ordered optional checklist of child entries. Each entry has its own completed state; an empty checklist is not rendered in the Detail page. Completing every child never silently completes the parent task; parent completion and reopening remain explicit user actions.
- The Detail page must expose the task title, completion status, due mode/date, applicable participants and checklist when present. Editing updates the same stable record and never creates a duplicate.
- Completing a task removes it from Today Quick Access and the open-task list, and places it in a dedicated collapsible completed section. Reopening restores that same record to open tasks and to Quick Access when eligible, applying the existing maximum-three and ordering rules. It must not duplicate the record or alter unrelated task ordering.
- Task links, documents and notes remain owned by the task. They follow the item-owned link/document rules and do not create standalone Links, Documents or Contacts areas.
- Existing Alpha 0.5 preparation tasks migrate losslessly to the new model: current title, completion state, due value and ownership are preserved; missing new fields receive only explicit empty/default values (`open` where no stored completion state exists, no participant applicability and no checklist).
- Preparation tasks, including participant applicability, checklist state and completion/reopen transitions, work offline and survive restart, active-Trip switching, authorized-device synchronization, import, backup/export and migration.

### Item-owned links and actions

- `V5-F19`: Trip Center has no user-visible standalone Links category, area, list, card, tab or Quick Access destination.
- Every user-visible link belongs to a relevant owning item or entity, such as a Hotel, booking, Flight, document, Attraction, Restaurant, Shopping place or other saved place.
- Items support relevant website, booking-management, navigation and original-document actions when available
- The same actions are reachable from item details and from a Quick Access card that presents that item
- Missing links/documents hide only the unavailable action; they do not hide the item or fail silently
- The data layer may maintain a background-only link/source index for import, lookup, synchronization, duplicate detection and data integrity; it is not rendered as a separate user-facing collection.
- A pasted or shared URL may remain an Inbox/source proposal until the user associates it with an owning item or approves creation of an appropriate owning item. It must not create a standalone visible Links collection.
- Existing standalone Link records are migrated or associated without URL/source loss. Unassociated legacy records remain recoverable through the background data/inbox flow and are not silently deleted.

### Item-owned locations and map actions

- `V5-F21`: Trip Center has no user-visible standalone Locations category, area, list, card, tab or Quick Access destination.
- Every user-visible location belongs to a relevant item or entity, such as a Hotel, Flight endpoint, Attraction, Restaurant, Shopping place or itinerary item, and is shown in that context.
- Item details and relevant Quick Access cards may expose map, route or navigation actions without creating a second location entity.
- A general Trip map may aggregate item-owned pins and support filtering, but it is a projection of the same entities rather than a standalone Locations collection.
- Background-only geospatial records or indexes are permitted for search, import, duplicate detection, distance calculation, synchronization and data integrity, but are not rendered as a separate user-facing collection.
- Existing standalone Location records are associated or migrated without loss of place name, address, coordinates, source, confidence, approval state or country/destination association. Unassociated legacy records remain recoverable through the background/inbox flow and are not silently deleted.

### Item-owned documents and Intake Inbox

- Trip Center has no user-visible standalone Documents category, area, list, card, tab or Quick Access destination.
- A document assigned to a Hotel, Flight, booking, Attraction, Insurance item, participant ticket or other entity is displayed and managed from that owning context.
- Every supported existing item Detail page includes a **Documents and Tickets** area with an **Add** action. The action supports **Take photo**, **Choose from gallery**, and **Choose PDF or file**; camera capture includes review/retake before save.
- Direct attachment applies to every existing item regardless of how it was created, including manual creation, URL/file/image import and `FTI1`/`FTI1C` QR scanning. Attaching to an item created from QR updates that same stable item and never creates a second item or a new unassigned proposal.
- The user classifies each attachment as **Booking confirmation**, **Boarding pass**, **Entry ticket**, **Receipt**, or **Other**. An item may contain zero, one or multiple documents/tickets, and each participant-specific ticket may be assigned to one or more existing Trip participants.
- The attachment confirmation offers two explicit modes: **Attach only**, which does not change structured item fields, and **Attach and extract information**, which may generate reviewable proposals for fields such as gate, platform/pier, seat, booking reference, date or time. Extraction never overwrites the item, fills empty fields or creates another item without explicit field-level approval.
- The original QR/import/source relationship and the newly attached file remain separately traceable and linked to the same item. Adding, replacing or removing one attachment never silently deletes another source, attachment or structured item field.
- Documents open from the owning item. A relevant Today/Quick Access card may expose an `Open document` or `Open ticket` action without becoming a Documents destination. Boarding passes and entry tickets support participant switching and full-screen barcode/QR presentation when machine-readable data is available.
- Attachment creation, type, ownership, participant relationships, source lineage and approved extracted updates survive offline use, restart, active-Trip switching, import/backup/export, migration and authorized two-device synchronization.
- Unassigned uploads, scans, imported sources and documents remain reachable through an Intake Inbox outside the Trip Center category grid until they are assigned, rejected or converted into an item.
- A secondary `View All Documents` search/utility view may aggregate documents for retrieval, but it is a projection and not a primary Trip Center category.
- Deleting an owning item returns its documents to the Intake Inbox unless the user explicitly deletes the documents; no document, ticket, receipt or source is silently lost.
- Migration removes the standalone Documents category only after item-owned documents and unassigned documents both have verified access paths. Import, offline cache, synchronization and export preserve document identity, ownership and participant relationships.

### Participant-owned personal documents and passports

- A passport is not a Trip item and not a new top-level entity. It is a `Document` with `documentType = passport`.
- In **Add/Replace Personal Document**, the source choices are **Take photo**, **Choose from gallery**, and **Choose file**. `Take photo` opens the device camera and is supported for a passport and every other personal-document type.
- After camera capture, the user sees a private review step with the captured image and the explicit actions **Use photo** and **Retake**. The document is not created, replaced or uploaded until the user chooses **Save document** on the following confirmation step.
- The app preserves the selected source file/image as the document payload. Camera capture does not imply OCR or automatic extraction of passport data; any future extraction must remain optional, non-sensitive and subject to the established review/approval rules.
- Every passport document has one required `ownerParticipantId`. It belongs to that participant, including when the participant has no linked application account.
- A passport does not use the general item assignment lifecycle: it is not sent to the Intake Inbox when an item is deleted and it must not require `itemId` or a generic `participantIds` list to establish ownership.
- A participant may have one active passport document. Replacing it is an explicit user action: the new document becomes active and the previous stored copy is removed only after confirmation. The MVP does not extract, display or synchronize passport number, birth date, nationality or expiry data.
- The only required user flow is the already-approved participant-context flow: **Trip Settings → Participants → [Participant] → Personal Documents → Add/Replace/View/Remove Passport**. The participant list exposes only the non-sensitive state `Passport saved`.
- A passport may be opened only by an authorized Trip owner or editor. It may be referenced from a relevant item as an action/link, but remains a single participant-owned document and is never duplicated into the item’s document collection.
- Offline storage, encrypted/synchronized payload handling, import/export, account-link/unlink and participant deletion must preserve the passport's ownership and access constraints. Deleting an item cannot affect it; deleting a participant requires an explicit confirmation that identifies the linked personal documents.

### Contextual and Trip-level contacts

- Trip Center has no user-visible standalone Contacts category, area, list, card, tab or Quick Access destination.
- A contact is shown within the item or entity it serves, such as a Hotel, driver/transport, Restaurant, Attraction, airline or booking.
- The data model retains contacts as reusable records so one contact can be linked to several items without copying phone numbers, email addresses or notes.
- General contacts—such as a travel agent, insurer, embassy/consulate or emergency contact—may belong directly to the Trip and remain reachable from a secondary `More / Useful information` or Trip-level context rather than the Trip Center category grid.
- Search and an optional `All contacts` utility view may aggregate contacts without becoming a primary Trip Center category.
- Phone, message, email and website actions remain available from the owning item, relevant Quick Access card or Trip-level contact context.
- Migration associates existing standalone Contact records with items or the Trip without data loss. Unassociated records remain recoverable until explicitly assigned or deleted.

### Remaining content and interaction gaps

- Category-level Add presets the item type from the current category while reusing the global creation flow (`V5-F09`)
- Preparation tasks include priority `High / Normal / Low` with `Normal` as the default; the priority/list enhancement extends the supported Preparation Task detail model above.
- Every task row visibly shows due date and priority; undated tasks are explicitly identified
- The task list can filter by one or more priorities and by due-date scope (overdue, today, upcoming, undated, or an explicit date range); filters can be combined and cleared
- Default task ordering is overdue, today, priority, nearest due date, then undated; within an equal key, preserve deterministic stable ordering
- Complete the minimum Games content set with road/transfer games, family trivia and destination facts, all usable offline
- Full Thailand data import
- Dolomites regression review
- Resolve exact Trip-duration thresholds for optional Week and Month views
- Define which critical documents and tickets are cached offline by default

### Hardening

- Data consistency checks across local and cloud state
- Accessibility blockers
- Performance blockers
- Error recovery, retry and recovery from interrupted synchronization
- Resolve or explicitly accept the remaining non-functional `V5-W01` Google popup-close Console warning while preserving the verified `same-origin-allow-popups` response header and successful popup sign-in
- Final Alpha acceptance suite on desktop and installed phone PWA

## Alpha 0.7 release blockers

- A Trip cannot save, display or reorder more than one Destination Country, or a duplicate country can be added
- Destination Countries or their order are lost after restart or active-Trip switching, omitted from import/backup/export, or fail to synchronize between authorized devices
- Migrating a legacy single-country Trip loses its country, or removing a referenced country silently deletes or rewrites associated Trip content
- Participant management is not reachable from Trip Settings, or Trip Center remains the primary participant-management destination
- A shared Trip cannot be opened and edited by the invited Editor
- Either device requires manual refresh to receive normal online updates
- An offline edit is lost, duplicated, or not synchronized after reconnect
- Two devices settle on different final data after queues complete
- Owner/Editor authorization exposes another private Trip or document
- Packing, Documents, bookings, itinerary, Expenses, Shopping or Preparation tasks are excluded from synchronization
- A Preparation Task loses its status, due mode/date, applicable participants or checklist state after edit, restart, active-Trip switching, import/backup/export, migration or synchronization
- Completing or reopening a Preparation Task duplicates it, leaves it in the wrong open/completed list, or makes Today Quick Access disagree with the same task record
- A Transport item, its route/times, participant tickets, contact, documents or item-owned pickup/drop-off locations are lost, duplicated or excluded from synchronization, import or export
- An expense loses its original amount/currency or is omitted from export/backup
- Shopping cannot represent both shopping places/visits and list entries, or a dated shopping visit does not appear in Timeline/Calendar as the same entity
- A shopping place/list relationship is lost after restart, synchronization, migration or export, or deleting a place silently deletes linked list entries
- Trip Center still exposes a standalone Links category, list, card, tab or Quick Access destination
- Trip Center still exposes a standalone Locations category, list, card, tab or Quick Access destination
- Trip Center still exposes a standalone Documents category, list, card, tab or Quick Access destination
- Trip Center still exposes a standalone Contacts category, list, card, tab or Quick Access destination
- A saved booking/provider/document link cannot be opened from its relevant Trip or item context
- Removing the standalone Links UI loses a stored URL/source or makes an item-owned link unreachable
- Removing the standalone Locations UI loses a stored address, coordinate, source or country/destination association, or makes an item-owned map/navigation action unreachable
- Removing the standalone Documents UI makes an assigned document unavailable from its owning item, makes an unassigned document unreachable from the Intake Inbox, or loses a document/source relationship
- A supported existing item cannot receive a camera image, gallery image, PDF or supported file directly from its Detail page
- Attaching a document to an item created from QR creates a duplicate item/proposal, replaces or loses the QR source, or makes either source untraceable
- `Attach only` changes structured item data, or `Attach and extract information` applies a proposed value without explicit approval
- Multiple documents or participant-specific tickets cannot coexist under one item, lose their participant assignment, or cannot be opened in the required item/Quick Access context
- Removing the standalone Contacts UI makes an item-owned or Trip-level contact unreachable, duplicates shared contact data, or loses a phone/email/action
- Road games, trivia or destination facts are unavailable offline

## Alpha exit criteria
Alpha is complete only when:

- All MVP functions exist
- No critical data-loss bugs remain
- Thailand acceptance test passes
- Core experience works online and offline
- Participant-specific packing and tickets work
- Real documents can be ingested and confirmed; assigned documents are reachable from their owning items and unassigned documents remain reachable through the Intake Inbox without a standalone Trip Center category
- Trip Settings reliably preserves one or more ordered Destination Countries, dates and participant administration, while Trip Center remains category-first and does not duplicate participant management
- Today, Timeline, Calendar/date selection, Trip Center, Games/Activities, Preparations, shopping places/visits and shopping lists are reliable
- Two users on two devices can edit the same authorized Trip online and offline and converge on the same state
- Expenses, item-owned link/location/document/contact actions, removal of the standalone Links, Locations, Documents and Contacts UI collections, and the minimum road-game/trivia/destination-fact content set are complete
- No unresolved release blockers remain

## 5. MVP Completeness Audit

The previous version of this roadmap omitted capabilities that had already been discussed or proven in the Dolomites prototype. They are now explicitly included in the Thailand MVP review.

### Confirmed MVP additions
- One or more ordered Destination Countries as structured Trip metadata in Trip Settings, with optional country association for relevant records
- Participant management in Trip Settings rather than Trip Center
- Games and travel activities
- Pre-trip preparations and tasks
- Shopping places/visits plus a shared shopping list in one standalone Shopping category, with dated visits projected into Timeline/Calendar
- Expense tracking with original currency preserved
- Item-owned Trip/booking/provider links and consistent website/document/navigation actions, with no standalone user-visible Links category
- Item-owned locations and consistent map/navigation actions, with no standalone user-visible Locations category
- Item-owned documents plus a reachable non-category Intake Inbox for unassigned documents, with no standalone user-visible Documents category
- Reusable item-owned or Trip-level contacts with contextual actions and optional secondary aggregate access, with no standalone user-visible Contacts category
- Shared packing item ownership
- Personal packing per participant
- Required flag, quantity, and packed status for packing items
- Participant-specific tickets, boarding passes, and attraction entry passes
- Phase-aware Home / Today behavior:
  - Planning: create/select Trip and document inbox
  - Pre-trip: preparations, packing, tasks, and documents
  - During-trip: current activities and operational information
- Private Trips with Owner/Editor sharing
- Two-user/two-device near-real-time synchronization, offline queueing, visible sync state and deterministic conflict handling
- Road/transfer games, family trivia and destination facts available offline

### Items requiring explicit evaluation before implementation
- Exact Trip-duration thresholds for showing Week and Month views
- Exact separation between booked attractions and informal family activities/games
- Which documents and tickets must be cached offline by default
- Exact deterministic resolution rule and recovery UI for concurrent edits to the same value; the requirement for deterministic, non-silent behavior is already binding

### Audit rule
Before freezing each Alpha version, compare its scope against:
- This complete MVP inventory
- Previously proven Dolomites capabilities
- Alpha 0.2 live-test observations
- The Thailand acceptance journey

A missing previously agreed MVP capability is a roadmap defect, not automatically a post-MVP feature.

Calendar placement and behavior are no longer open evaluation items: Timeline is the single destination; Entire Trip, Week and Day are Calendar-based views; the list below is filtered to the active period; and week arrow or swipe/scroll navigation keeps the visible/selected week and list synchronized. This is binding Alpha 0.5 behavior. Evidence-backed URL/image/PDF Smart Import, direct existing-item attachment and the minimum non-category Intake Inbox required for save-only/failed-source list/open/status/retry/delete are binding Alpha 0.6 requirements. The ordered one-or-more Destination Countries model in Trip Settings, participant management in Trip Settings rather than Trip Center, category-prefilled Add, Expenses, Shopping places/visits, complete cross-type item-owned link/location/document/contact ownership and navigation with no standalone Links, Locations, Documents or Contacts categories, the full Intake Inbox/document-management experience, the minimum Games content set and the two-user/two-device synchronization contract are binding Alpha 0.7 requirements.

## 6. Features Beyond the Thailand MVP

These features may remain in the same roadmap document, but they are not assigned to Alpha versions until the Thailand MVP is complete or their priority changes.

### Product and platform expansion
- Advanced account administration beyond Google sign-in and the MVP Owner/Editor roles
- Additional family roles and permission levels beyond Owner/Editor
- Collaboration with more than two simultaneous users and cross-family/public sharing
- Direct email inbox integration
- Direct Google Drive or cloud-storage import
- Operating-system Share Target integration
- Notifications and reminders
- Global search across Trips
- Advanced multi-trip portfolio and cross-trip reuse
- Reusable Trip templates beyond packing suggestions
- Collaborative comments and activity history
- Version history and restore
- Advanced export and backup
- Supplier or travel-agent integrations

### Intelligence expansion
- Proactive recommendations beyond confirmed Trip data
- Country-specific preparation discovery and task suggestions based on Destination Countries, Trip dates, participant applicability and planned driving, with official links, verification timestamps and change handling. Product decisions are defined in `POST_MVP_COUNTRY_PREPARATION_DISCOVERY_V2.md`; review-before-task-creation is frozen, no release is assigned and it is not part of Alpha 0.6, Alpha 0.7, Beta 0.8, Beta 0.9 or RC 0.10.
- Automatic itinerary optimization
- Cost and budget analysis
- Cross-document contradiction resolution
- Broader destination intelligence
- Predictive packing based on weather and behavior

### Social and content expansion
- Shared public itineraries
- Community games and activity packs
- User-created templates and recommendations
- Trip memories, albums, and post-trip storytelling

### First post-trip follow-up — Magazine/PDF

- Generate an end-of-trip family magazine as a downloadable PDF from the completed Trip
- Combine itinerary, destinations, selected facts, expenses summary, memories/photos and user-selected highlights
- Provide preview and explicit selection before export; never include private documents, booking numbers or receipts by default
- Keep this after the Thailand operational release because it does not block planning or in-trip use, but retain it as a committed follow-up rather than an unassigned storytelling idea

These entries are a backlog register only. They are not commitments, release promises, or architecture approvals.

## 7. Beta Plan

# Beta 0.8 — Visual and Interaction System

## Goal
Bring the application to the desired product quality for the Thailand trip.

Focus:

- Approved modern card-based visual direction
- Green brand language
- Consistent typography
- Clear spacing
- Rounded cards
- Color-coded statuses
- Consistent icons
- Better empty states
- Better forms
- Better navigation
- Better loading and error states
- Full mobile and RTL polish
- Compact mobile card layouts for Today and Trip Center
- Filename truncation and wrapping rules that never break the viewport
- Remove duplicate navigation and quick-access patterns

# Beta 0.9 — Usability and Real-World Refinement

## Goal
Use the app repeatedly with real Thailand data and refine the experience.

Focus:

- Faster daily operation
- Less tapping
- Better ticket presentation
- Better participant switching
- Better packing workflows
- Better offline feedback
- Better presentation and recovery around the deterministic Alpha 0.7 conflict rules
- Better calendar and timeline navigation
- Final wording and accessibility

## 8. Release Candidate

# RC 0.10 — Thailand Release Candidate

Allowed:

- Bug fixes
- Performance fixes
- Data migration fixes
- Offline fixes
- Security and privacy fixes
- Accessibility fixes
- Documentation fixes

Not allowed:

- New non-critical features
- Architecture changes
- Major navigation changes

Final tests:

- Fresh install
- Upgrade from previous version
- Create and save a multi-country Trip; add, remove and reorder Destination Countries; verify legacy single-country migration, restart persistence, active-Trip switching, import/backup/export and two-device synchronization
- Verify optional item/location country associations and confirm that removing a referenced country cannot silently lose or rewrite content
- Participant add/edit/activate/deactivate from Trip Settings, with no participant-management destination in Trip Center
- Full Thailand document import
- Participant-specific ticket flow
- Personal and shared packing
- Create, edit, complete and reopen a Preparation Task with a dated deadline, applicable participants and a checklist; verify that it remains one stable record, moves correctly between open and completed sections, is eligible for Today Quick Access only while open, and survives offline use, restart, import/export and two-device synchronization
- Two-user/two-device shared-Trip authorization and near-real-time synchronization
- Offline edits on both devices, reconnect synchronization and deterministic conflict handling
- Expense entry, multi-currency totals and backup/export preservation
- Create an unscheduled shopping place, schedule it, and verify the same record appears in Timeline/Calendar; link and preserve shopping-list entries through restart and synchronization
- Verify Trip Center has Shopping but no standalone Links, Locations, Documents or Contacts destination, while website/booking/document/map/navigation/contact actions still work from their owning items, Trip-level contexts and relevant Quick Access cards; verify unassigned documents remain reachable in the Intake Inbox
- Create an item from an approved QR payload, then attach the original PDF/image from the existing item's Documents and Tickets area. Verify no duplicate item or proposal is created, the QR source and attachment are both retained, `Attach only` changes no structured fields, and `Attach and extract information` applies only explicitly approved proposals
- Add multiple boarding passes or entry tickets to one Flight/Attraction/Transport item, assign them to different participants, open them from the item and relevant Quick Access context, switch participants, display any available barcode/QR full screen, and verify offline/restart/import-export/two-device preservation
- Migrate legacy standalone Link data without URL/source loss and verify any background index remains non-user-facing
- Migrate legacy standalone Location data without address/coordinate/source/association loss and verify any background geospatial index remains non-user-facing
- Offline road games, trivia and destination facts
- Today during planned and active states
- Offline usage
- Restart and persistence
- Delete/reset safety
- Netlify deployment
- Installed PWA on phone

## 9. Feedback Classification Rule

Every new note from Alpha 0.2 testing is classified as:

### Immediate correction
A clear bug or small change that fits the current architecture.

### Scheduled Alpha feature
Required for Thailand MVP but belongs in a later Alpha version.

### Architecture review
A change affecting domain entities, ownership, lifecycle, data integrity, or multiple major screens.

### Beta refinement
A visual, HMI, wording, or interaction improvement that does not block MVP functionality.

### Post-Thailand backlog
Useful, but not required for the Thailand MVP.

Only Architecture Review items require explicit discussion before implementation.

During an open acceptance session, classification and version assignment are separate steps. Every finding receives an immediate classification, but its target remains `TBD after acceptance completion` until the full session and short regression are complete. The target version must then be recorded here before any correction or next-version package is created.

## 10. Alpha 0.2 Test-Driven Roadmap Changes

The following roadmap assignments were confirmed by the Alpha 0.2 live test session:

### Alpha 0.2.1
- Link source opening
- Calendar day-selection blocker containment or correction
- Documents mobile filename overflow
- Optional Contact phone
- Today duplicate quick access
- More compact Trip Center mobile cards

### Alpha 0.3
- Calendar as an alternate Timeline view
- Date selection opens that day’s events
- Distinct event-type markers
- Shared Timeline/Calendar data and filtering model

### Alpha 0.4
- Better filename-based item classification
- Airline versus hotel recognition
- Human-readable suggested titles
- Explicit approve, edit, reject, or defer behavior

### Alpha 0.5
- Previous and next navigation for Day, Week, and Month
- Trip-duration-based availability of Week and Month views
- Complete map search, pin, confirm, and coordinate persistence flow
- Collapsible packing categories
- Duplicate prevention across packing categories
- Stable completed-item behavior using a `Packed` section

### Beta
- Broader visual refinement, spacing, HMI consistency, and final RTL polish after Alpha functionality is complete.

## 11. Working Responsibilities

### Architecture Guardian
- Maintains this roadmap
- Classifies feedback
- Protects architecture
- Approves architecture changes
- Defines release gates

### Development Agent / Codex
- Implements approved version scope
- Runs tests
- Updates technical documentation
- Does not change architecture without approval

### Product Owner
- Tests the installed version
- Reports real behavior
- Approves trade-offs
- Defines what is necessary for the Thailand trip

## 12. Next Actions

1. Install Alpha 0.6.3 over the installed 0.6.0, 0.6.1 or 0.6.2 QA handoff on `version/V6`.
2. Run `scripts/configure_V6_0_6_3.ps1`; the owner `eyalby@gmail.com` remains mandatory and `paolakohan@gmail.com` is the default additional invited account. Each of the four Alpha 0.6 QA values is removed and immediately recreated with Functions scope in both preview contexts.
3. Run `scripts/deploy_QA_V6_0_6_3.ps1`; it deploys the exact built `dist` plus `netlify/functions` only to the fixed general QA alias `qa` without rebuilding.
4. Execute `EXECUTABLE_TEST_SESSION_V124.md` in order, beginning with configuration and Google sign-in before the unchanged H-001 through H-005 regression matrix.
5. Record Product Owner GO or NO-GO against the exact deploy. Do not promote, rebuild or repair during the acceptance run.
6. Keep Alpha 0.6 limited to Hotel Smart Import and direct existing-item attachment; do not mix in Alpha 0.7 synchronization, Multi-trip, Expenses, Shopping, Transport or task-expansion work.
7. After Alpha 0.6 GO and exact-artifact Production verification, proceed to the reassigned Alpha 0.7 scope, followed by Beta 0.8, Beta 0.9 and RC 0.10.

## 13. Version Package Execution Rule — Added for V4

The Development Agent implements the complete approved version, updates code/tests/documents, performs automated checks, and produces one installable package. The Product Owner does not manually apply implementation patches or fill release records. Product Owner participation begins after package delivery: installation, real-device/user acceptance tests, trade-off approval, and GO / NO-GO.

Every future version package must include this authoritative delivery plan under `docs/roadmap/`.

The Alpha 0.4 test cycle is closed. The 0.4.4 focused candidate ended NO-GO on 2026-08-03 and was not promoted; 0.4.3 remains Production. V4-F04, V4-F11, V4-F12 and V4-F13 are transferred to Alpha 0.5, whose package and executable acceptance session must keep these findings synchronized with this plan.

## 14. Controlled-document revision rule

Every content change to this delivery plan increments its `Document revision` by exactly one (`Vx → Vx+1`) and adds one row to the change-history table in the same edit. Document revision is independent of the application version, patch number and data-contract version. The canonical file and its history are updated in place; a content change must not be recorded by creating an untracked duplicate copy.

## Alpha 0.5.4 stabilization candidate

Alpha 0.5.4 is required before Alpha 0.6. Alpha 0.5.3 ended final `NO-GO / acceptance complete`, and its remaining failures affect the stable Alpha 0.5 operational baseline. Mixing their correction with Alpha 0.6 would combine service-worker, intake and proposal-lifecycle risk with major synchronization and ownership-model expansion.

### Frozen correction scope

1. **Cold-start Offline and navigation-cache stability:** a fully closed installed PWA must open the cached application shell and last saved Trip on the first Offline launch. Repeated Offline launches and refreshes must remain consistently successful; the deterministic odd/even browser-error alternation must not recur. Reconnect must recover automatically without duplication or data loss.
2. **`V5-F23` — Offline Sign out:** while Offline, Sign out is disabled. The application shows a clear explanation that connectivity is required and preserves the current local session and visible Trip. It must not navigate, clear the usable local shell or reach a browser connection-error page. An Offline-capable signed-out shell is deferred unless later approved as a separate capability.
3. **`V5-F17` and `V5-F24` — shared-URL intake and ownership:** `Shared link` is not a proposal or final-item fallback. The application creates a proposal only when it extracts enough meaningful data to identify a supported owning item/type and presents that result for explicit approval. If extraction is insufficient, it shows a clear import failure and creates no proposal, source or record. A standalone Link is never savable. Manual URL entry remains supported inside an existing item's editor.
4. **`V5-F25` — proposal lifecycle:** rejecting a pending proposal removes it immediately from active Suggestions and places exactly one persistent record in a separate archive. Archived/rejected proposals do not precede, obscure or count as active suggestions. A later pending proposal stays in the active section without duplication.
5. **Dependency advisory triage:** inspect the recorded high-severity advisory before package closure. Preserve the tested dependency graph unless a reviewed, compatible and necessary correction is identified; record the exact disposition in package evidence.

### Preserved closed scope

- `V5-F19` remains closed: no standalone Links destination; item-owned URLs remain usable.
- `V5-F21` remains closed: the out-of-range warning, Cancel, Proceed, marker and restoration behavior remain unchanged.
- `V5-F22` remains closed: no standalone Locations destination; item-owned location/map/navigation behavior remains usable.
- The corrected Panvaree `FTI1C` QR smoke and the full earlier QR matrix remain accepted. Alpha 0.5.4 repeats only the smallest proposal rejection/archive path needed for `V5-F25`; the standing source remains `Confirmation_for_Booking_ Ban Ta Khun.pdf` unless the Product Owner supplies another document.
- Existing URL, item-owned location/map, warm-Offline edit/reconnect and Timeline Entire Trip/Week/Day regressions remain accepted and are repeated only as a compact smoke around changed code.

### `V5-W01` disposition

`V5-W01` does not block Alpha 0.5.4. The fixed QA response already served `Cross-Origin-Opener-Policy: same-origin-allow-popups`, Google popup sign-in completed successfully and no functional authentication failure was observed. The recurring popup-close Console warning remains open technical-hardening work assigned to Alpha 0.6. Alpha 0.5.4 retains the header and includes one functional Google sign-in smoke, but its GO gate does not require eliminating this warning.

### Release gate

Alpha 0.5.4 may receive GO only after its automated checks and Production build pass, the exact tested `dist` is deployed to fixed QA, every frozen finding passes focused Product Owner retest, compact regression passes without duplication/data loss, and dependency-advisory disposition is recorded. Alpha 0.4.3 remains Production until that GO. Alpha 0.6 implementation begins only after Alpha 0.5.4 is accepted; no Alpha 0.6 capability may be used to close a 0.5.4 finding.

The executable plan is `EXECUTABLE_TEST_SESSION_V63.md`.

### Alpha 0.5.4 implementation evidence

- The service worker uses cache identity `family-trips-alpha-0.5.4-shell-v1`, precaches the built shell and resolves navigations from the cached shell before attempting network access.
- Offline Sign out is disabled with a visible connectivity explanation; the local session and Trip remain loaded.
- Insufficient shared URLs produce a clear failure and create no source, proposal or record. Supported URLs create only a meaningful owning-item proposal, and Link is excluded from final item types.
- Rejected proposals migrate out of active Suggestions into a separately persisted, deduplicated archive.
- Vite was updated within major version 7 and transitive `nanoid` was updated to 3.3.18; `npm audit` reports zero vulnerabilities.
- All syntax, V4/V5 regression, ingestion, QR, operational, correction, Offline and 0.5.4 stabilization suites passed. Vite Production build passed with 33 transformed modules.
- These automated results do not close the Product Owner findings. Alpha 0.4.3 remains Production until focused acceptance and explicit GO.

## Alpha 0.5.4 final outcome and Alpha 0.5.5 handoff

Alpha 0.5.4 acceptance is complete and final NO-GO under `EXECUTABLE_TEST_SESSION_V86.md`. Cold-start Offline, Offline Sign out, orphan-Link prevention, rejected-proposal lifecycle, item-owned URL/location behavior, warm-Offline edit/reconnect and Timeline synchronization passed. The official Panvaree URL was rejected instead of creating a supported Hotel proposal, and out-of-range Cancel left an unsaved stale date visible until the editor was closed. Alpha 0.4.3 remains Production.

The Product Owner rejected another narrow URL-recognizer correction and clarified that direct Smart Import from URL, image/camera or PDF is not reliable enough. Alpha 0.5.5 therefore establishes a safe supported boundary; the complete redesign moves to dedicated Alpha 0.6.

## Alpha 0.5.5 implemented scope

- Manual item creation remains supported, including an optional item-owned URL.
- Validated `familytrips.import` JSON and `FTI1`/`FTI1C` QR remain supported review-first import paths and may populate an item-owned URL.
- New-item URL intake is removed. Image upload and camera-photo intake are hidden until Alpha 0.6.
- PDF remains available only as a visibly experimental, PDF-only, source-preserving and proposal-only path. Missing extracted dates do not default from Trip start.
- Out-of-range Cancel immediately re-renders an existing-item editor from persisted data.
- The rejected archive is rendered after active suggestions, items, Sources and the Add action while retaining its accepted persistence and deduplication behavior.
- Displayed/package/cache identity advances to Alpha `0.5.5`.
- The exact executable acceptance plan is `EXECUTABLE_TEST_SESSION_V87.md`.
- At the Alpha 0.5.5 handoff, the Alpha 0.6 discovery and feasibility plan was `SMART_IMPORT_REDESIGN_DISCOVERY_V21.md` and Stage A was recorded in `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V1.md`. The current frozen outcome is Discovery V22 plus Technical Spike Results V7; H-001 through H-005 remain the corresponding controlled ground-truth cases.
- All syntax checks and ten ordered automated suites passed; Vite 7.3.6 transformed 33 modules and completed the Production build in 1.97 seconds; `npm audit` reported zero vulnerabilities.

## Roadmap reassignment rule

From V40 onward:

- Alpha 0.6 means only Smart Import redesign plus the reliable direct existing-item attachment foundation.
- Every pre-V40 active roadmap assignment to the former broad Alpha 0.6 MVP-completion scope moves to Alpha 0.7 unless V40 explicitly retains it in Smart Import.
- Beta Visual/Interaction becomes 0.8, Beta real-world refinement becomes 0.9 and the Thailand Release Candidate becomes 0.10.
- Historical change-history rows retain the version labels that were correct when those decisions were recorded; this V40 rule is the authoritative current assignment.

## Alpha 0.5.5 final outcome and Alpha 0.5.6 handoff

Alpha 0.5.5 is final NO-GO under `EXECUTABLE_TEST_SESSION_V111.md`. All focused intake, manual/QR URL ownership, experimental-PDF safety, Cancel reset, archive placement and supporting baseline checks passed. `V5-F27` remains the only release blocker: a range item whose start is inside the Trip and whose end is after the Trip end is not marked `מחוץ לטווח` after persistence and re-entry.

Alpha 0.5.6 changes only the shared range predicate. Both the pre-save confirmation and persisted marker evaluate every present boundary (`startAt`, `endAt`) against the inclusive Trip range. No 0.5.5 finding is reopened, no Smart Import work is included and no broader regression matrix is repeated.

The clean implementation gate passed on 2026-08-12: all syntax checks and eleven ordered suites passed, Vite 7.3.6 transformed 33 modules and built Production in 1.67 seconds, and the dependency audit reported zero vulnerabilities.

The executable acceptance plan is `EXECUTABLE_TEST_SESSION_V112.md`. The exact locally tested `dist` must be deployed to fixed QA with `netlify deploy --dir dist --alias qa --no-build`. `V5-F27` remains open until focused Product Owner retest and explicit GO; Alpha 0.4.3 remains Production until then.

## Alpha 0.5.6 final outcome and Production handoff

The complete focused acceptance recorded through `EXECUTABLE_TEST_SESSION_V120.md` passed on exact fixed-QA deploy `6a7c8754377fb5dae3ba989c`. Product Owner GO was issued on 2026-08-12 and `V5-F27` is closed. The untouched tested `dist` was deployed successfully to Production with `netlify deploy --dir dist --prod --no-build` as deploy `6a7cc58d2a472ac18bfd44c2`; Netlify requested and uploaded zero assets, proving no deployment-time build or changed artifact was introduced. Live identity and Google sign-in passed. Desktop and phone both began with an empty Trip; the Product Owner explicitly accepts this as non-blocking because no meaningful data requires restoration. The state is recorded as an accepted migration/data-baseline limitation, not confirmed data loss and not proof of multi-device synchronization. Alpha 0.5.6 is the Production baseline and Alpha 0.4.3 is retained only as its rollback reference.

Alpha 0.5.6 requires no further testing, build or deployment and remains the accepted Production baseline. Benchmark cases H-001 through H-005 are frozen, V11 extraction/safe-failure measurement and V13 place validation pass the complete Decision 6 entry gate, and `SMART_IMPORT_TECHNICAL_SPIKE_RESULTS_V7.md` is the controlled evidence summary. Alpha 0.6.0 was blocked by `V6-F01`; Alpha 0.6.1 stopped on `V6-F02`; Alpha 0.6.2 still stopped on `V6-F03`. Alpha 0.6.3 retains the complete Hotel-first runtime, deterministically recreates only the four QA Function values, preserves the owner invitation and requires fixed general QA under `EXECUTABLE_TEST_SESSION_V124.md`. Production remains blocked until explicit Product Owner GO.
