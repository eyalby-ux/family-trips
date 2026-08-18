# V5 Release Notes — Alpha 0.5.6

**Document revision:** `V8`  
**Candidate status:** Focused `V5-F27` range-boundary correction; Product Owner installation and acceptance required  
**Base:** installed Alpha 0.5.5 NO-GO handoff; Alpha 0.4.3 remains Production

## Document change history

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V1 | 2026-08-03 | Alpha 0.5.0 implementation | Initial V5 candidate release notes and inherited V4 finding closure targets. |
| V2 | 2026-08-03 | Alpha 0.5.0 installer correction | Reissued the package as R2 so installation can proceed from the local 0.4.4 NO-GO test state without accepting or promoting that candidate. |
| V3 | 2026-08-04 | Alpha 0.5.1 correction package | Added focused corrections for V5-F05, F06, F07/F12, F08, F10 and F11; V5-F09 remains scheduled for Alpha 0.6. |
| V4 | 2026-08-06 | Alpha 0.5.2 correction package | Added the eight QA-approved repairs for cold-start offline, Timeline focus, task Quick Access/editing, URL editing, mobile proposal layout, safe shared-link handling and deletion wording; preserved passed evidence and Alpha 0.6 deferrals. |
| V5 | 2026-08-07 | Alpha 0.5.2 COOP correction | Added the Product Owner-approved `V5-W01` Netlify header correction, its automated configuration assertion and deployed Google sign-in/Console acceptance gate. |
| V6 | 2026-08-11 | Alpha 0.5.4 stabilization | Added deterministic cache-first Offline navigation, blocked Offline Sign out, meaningful-owner shared-URL intake, rejected-proposal archive, compatible dependency updates and the V63 focused acceptance gate. |
| V7 | 2026-08-12 | Alpha 0.5.5 intake reset | Removed unsupported new-item URL/image/photo paths, retained PDF as explicitly experimental, preserved manual and QR/JSON URL ownership, corrected immediate Cancel reset and archive placement, added the V87 acceptance gate and split Smart Import into dedicated Alpha 0.6 discovery/implementation. |
| V8 | 2026-08-12 | Alpha 0.5.6 range-boundary correction | Added one shared start/end Trip-boundary predicate for persisted marking and pre-save confirmation, preserved every passed 0.5.5 result and added focused V112 acceptance plus exact no-build QA deployment evidence. |

## Alpha 0.5.6 changes

- Corrects `V5-F27`: an item with an in-range start and an end after the Trip end is marked `מחוץ לטווח`.
- Uses one tested predicate for both the pre-save warning and the marker shown after saving/re-entry.
- Adds boundary coverage for end-after, start-before, both-inside, single-date, entire-Trip and missing-Trip cases.
- Preserves all accepted 0.5.5 intake, PDF safety, Cancel reset, archive, Offline, QR and Timeline behavior.
- Keeps Alpha 0.6 Smart Import and Alpha 0.7 MVP completion completely excluded.
- `V5-F27` remains open until `EXECUTABLE_TEST_SESSION_V112.md` focused Product Owner acceptance and explicit GO.

## Preserved Alpha 0.5.5 changes

- The new-item source menu now exposes only Manual, Experimental PDF, validated JSON and QR.
- URL, image upload and camera-photo are removed from supported new-item intake and assigned to the dedicated Alpha 0.6 Smart Import redesign.
- Manual item create/edit and validated QR/JSON still support an item-owned URL without a standalone Link.
- PDF remains available for quick tests, but is PDF-only, visibly experimental, proposal-only, source-preserving and does not fill a missing date from the Trip start.
- Cancel on an out-of-range edit immediately restores the persisted date in the still-open editor.
- The rejected-proposal archive remains persistent/deduplicated and now appears below active content, Sources and Add.
- All automated suites, zero-vulnerability audit and Production build pass. Product Owner criteria remain open until V87 acceptance.

## Delivered

- Contextual field extraction with label/type validation, confidence/evidence and multi-segment flight proposals.
- Safe date backfill for existing undated items after Trip dates are set.
- `familytrips.import` 1.0 JSON import and `FTI1` / `FTI1C` QR decoding through one validation and review pipeline.
- Camera QR scanning, gallery-image decoding, multipart progress, checksum rejection and cancel/restart.
- Non-destructive duplicate merge and complete source-reference preservation.
- Games/Activities, improved packing, preparations/tasks, shopping and location records.
- Operational Today, duration-derived Timeline modes and shared Calendar filtering.
- New offline shell cache and offline local-session startup path.

No imported proposal becomes a final item without explicit approval.

## Alpha 0.5.2 corrections

- More reliable installed-PWA cold start through a versioned cached `index.html`/scope navigation fallback and background online refresh.
- Timeline opens focused on Entire Trip and the Trip start while preserving embedded Calendar/list synchronization for Entire Trip, Week and Day.
- Today Quick Access shows up to three open tasks, including future tasks, ordered overdue, today, nearest future and undated; completed tasks are excluded and `All tasks` is offered when needed.
- Existing tasks can be edited and saved on the same stable record without duplication.
- Existing item URLs can be replaced or removed; URL access no longer depends on a location field.
- Imported proposal content stays within the phone viewport and wraps long addresses and URLs.
- Opaque `share.google` URLs are presented as Link, use a reliable supplied page title or `Shared link`, and are not classified as Flight without reliable evidence.
- Settings deletion wording no longer promises multi-Trip behavior that does not exist in this version.
- Netlify application routes send `Cross-Origin-Opener-Policy: same-origin-allow-popups` to resolve the recorded Google popup sign-in COOP warning; deployed verification remains part of acceptance.
- Public identity and cache markers now show Alpha 0.5.2.

`V5-F09`, task priority/filtering, multi-Trip, shared multi-user synchronization, participant management, multiple Destination Countries, Expenses, Useful Links and remaining Games content are not included and remain planned for Alpha 0.6. None of the Alpha 0.5.2 findings is closed until it passes the guided QA retest.

`V5-W01` is implemented in Alpha 0.5.2 but remains open until the fixed QA deployment confirms the response header, successful Google popup sign-in and a clean Console for the previously recorded warning.
