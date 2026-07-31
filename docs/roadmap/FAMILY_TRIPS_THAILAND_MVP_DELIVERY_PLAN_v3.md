# Family Trips — Thailand MVP Delivery Plan

**Status:** Updated after Alpha 0.2 live acceptance testing  
**Scope:** Thailand trip only  
**Purpose:** Define the remaining Alpha versions required to complete the MVP, followed by Beta and Release Candidate stages.

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
- Destination and Trip dates
- Trip lifecycle
- Smart document intake
- Manual item creation
- Dynamic forms by item type
- Documents linked to items
- Today
- Timeline
- Calendar and date selection
- Trip Center
- Games and travel activities
- Preparations and tasks
- Shopping list
- Locations and maps
- Participants
- Participant-specific tickets and documents
- Packing lists
- Participant-specific packing
- Useful contacts
- Offline use
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
- Improved Timeline
- Calendar foundation
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

- Select a date and display that date’s events.
- Use distinct markers for event types such as flight, hotel, restaurant, attraction, and transport.
- Keep one shared filtering and ordering implementation.
- Preserve Trip-range highlighting.
- Avoid independent Calendar-only event state.
- Confirm the final navigation placement before implementation.

### Trip settings
- Destination
- Start date
- End date
- Participant management entry point

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
Default Documents view becomes an inbox:

- Unassigned documents appear in Documents
- Assigned documents appear inside the related item
- Optional View All Documents
- Deleting an item returns its documents to the unassigned inbox
- Documents are never silently deleted

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

## Release blockers
- First document does not create Trip
- Document creates incorrect item without confirmation
- Original document is lost
- Duplicate handling causes data loss
- Intake is unavailable after Trip creation

# Alpha 0.5 — Operational Trip Experience

## Goal
Make the app usable during the actual Thailand trip.

## Games and activities
Games and travel activities are part of the Thailand MVP, based on the previously agreed Dolomites capability set.

Required capabilities:

- A dedicated Games / Activities area
- Family games usable during flights, transfers, waiting time, and evenings
- Activity cards with title, instructions, required items, suitable participants, and estimated duration
- Ability to mark favorites or quickly reopen a game
- Offline availability for saved games and instructions
- Trip activities remain separate from booked attractions and reservations

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

## Today
- Show only events relevant now
- Show today’s events
- Show next upcoming event
- Show active Entire Trip information
- Hide old events by default
- Quick access to current hotel, next transport, insurance, tickets, and emergency contacts

## Timeline
- Group by day
- All-trip view
- Day view
- Previous / next navigation for day-based views
- Week view only when Trip duration makes it useful
- Previous / next navigation for week-based views
- Month view only for sufficiently long Trips
- Previous / next navigation for month-based views
- Available views are derived from Trip duration rather than always showing every option
- Chronological order
- Clear current-day and selected-period markers

## Calendar and date selection
- Calendar uses the shared Timeline event source.
- A compact calendar/date-picker experience is required.
- Highlight Trip date range.
- Selecting a date opens or filters to that date’s events.
- Different event types use distinguishable markers.
- Select item date from Trip range.
- Date-range selection.
- Entire Trip checkbox.
- Out-of-range warning without forced date changes.

## Location
- Auto-detected location
- Search location
- Pin on map
- Confirm or correct
- Store place name, address, coordinates, source, confidence, and approval state

## Offline
- Trip shell available offline
- Structured items available offline
- Critical documents and tickets available offline
- Clear indication when a resource is not available offline

## Release blockers
- Today shows irrelevant future or past events
- Tickets are unavailable offline
- Maps or locations silently fail
- Calendar changes source dates
- Current hotel or next transport cannot be reached quickly

# Alpha 0.6 — MVP Completion and Hardening

## Goal
Complete all remaining MVP gaps before Beta.

## Required work
- Multi-trip foundation
- Delete current Trip
- Delete all local data
- Clear destructive-action warnings
- Trip archive behavior
- Data consistency checks
- Migration strategy between versions
- Export or backup foundation
- Full Thailand data import
- Dolomites regression review
- Accessibility blockers
- Performance blockers
- Error recovery
- Final Alpha acceptance suite

## Alpha exit criteria
Alpha is complete only when:

- All MVP functions exist
- No critical data-loss bugs remain
- Thailand acceptance test passes
- Core experience works online and offline
- Participant-specific packing and tickets work
- Real documents can be ingested and confirmed
- Today, Timeline, Calendar/date selection, Trip Center, Games/Activities, Preparations, and Shopping are reliable
- No unresolved release blockers remain

## 5. MVP Completeness Audit

The previous version of this roadmap omitted capabilities that had already been discussed or proven in the Dolomites prototype. They are now explicitly included in the Thailand MVP review.

### Confirmed MVP additions
- Games and travel activities
- Pre-trip preparations and tasks
- Shopping list
- Shared packing item ownership
- Personal packing per participant
- Required flag, quantity, and packed status for packing items
- Participant-specific tickets, boarding passes, and attraction entry passes
- Phase-aware Home / Today behavior:
  - Planning: create/select Trip and document inbox
  - Pre-trip: preparations, packing, tasks, and documents
  - During-trip: current activities and operational information

### Items requiring explicit evaluation before implementation
- Exact Trip-duration thresholds for showing Week and Month views
- Final Calendar placement as an alternate Timeline view
- Exact separation between booked attractions and informal family activities/games
- Scope of real-time collaboration required for the Thailand MVP
- Which documents and tickets must be cached offline by default

### Audit rule
Before freezing each Alpha version, compare its scope against:
- This complete MVP inventory
- Previously proven Dolomites capabilities
- Alpha 0.2 live-test observations
- The Thailand acceptance journey

A missing previously agreed MVP capability is a roadmap defect, not automatically a post-MVP feature.

## 6. Features Beyond the Thailand MVP

These features may remain in the same roadmap document, but they are not assigned to Alpha versions until the Thailand MVP is complete or their priority changes.

### Product and platform expansion
- Full account system and authentication
- Family roles and permissions
- Cloud synchronization across devices and users
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

These entries are a backlog register only. They are not commitments, release promises, or architecture approvals.

## 7. Beta Plan

# Beta 0.7 — Visual and Interaction System

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

# Beta 0.8 — Usability and Real-World Refinement

## Goal
Use the app repeatedly with real Thailand data and refine the experience.

Focus:

- Faster daily operation
- Less tapping
- Better ticket presentation
- Better participant switching
- Better packing workflows
- Better offline feedback
- Better conflict resolution
- Better calendar and timeline navigation
- Final wording and accessibility

## 8. Release Candidate

# RC 0.9 — Thailand Release Candidate

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
- Full Thailand document import
- Participant-specific ticket flow
- Personal and shared packing
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

1. Implement Alpha 0.2.1 as a focused stabilization hotfix.
2. Re-run focused regression for both release blockers and the four immediate mobile/validation corrections.
3. Mark Alpha 0.2 accepted only after the Alpha 0.2.1 verification gate passes.
4. Review and approve the unified Timeline/Calendar interaction before Alpha 0.3 implementation.
5. Freeze Alpha 0.3 scope: Participants, document ownership, participant tickets and packing, and Timeline/Calendar integration.
6. Implement Alpha 0.3 without adding unrelated features.
7. Continue with Alpha 0.4 Smart Ingestion after Alpha 0.3 acceptance.
7. Build versions sequentially until Alpha exit criteria are met.
