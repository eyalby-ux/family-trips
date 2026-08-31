# Family Trips — Thailand MVP Delivery Plan — Current State

**Document revision:** `V53`
**Status:** **`0.6.6` implementation complete, awaiting Product Owner install and acceptance testing.** Production remains on `0.6.5` (build `0.6.5-a915a440`, deploy `6a9464b101a1690008db8823`) — **`0.6.6` has not been deployed anywhere, per its candidate definition Production stays blocked until explicit Product Owner GO after acceptance.** The Development Agent implemented both halves of the combined scope on `version/V6`: the Attraction/Event Smart Import extraction adapter/schema/prompt/URL-acquisition path (`ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` `V4`), and the three folded-in `0.6.5` Production findings (`V6-F49`–`V6-F51`). All seven `AE-001`–`AE-007` benchmark cases (including the mandatory wild-card `AE-001` and the `AE-003`/`AE-004` companion-pair decision) and all three findings now have named, passing automated regression tests (`tests/v6-6-attraction-event-import.mjs`, `tests/v6-49-51-correction.mjs`) — per the standard's V23 rule, `V6-F49`–`V6-F51` are recorded `Fixed` below. The full quality gate (`npm run check`: syntax, every regression test, production build) passes. **One explicitly accepted, non-blocking gap carried forward exactly as the discovery document named it:** no official venue/museum/OTA URL has been tested end-to-end against the live model — this remains a named step in the executable acceptance session (`EXECUTABLE_TEST_SESSION_V184.md`) for the Product Owner to run, not something the Development Agent can close from here (no live API access, and the standard's own responsibility split reserves Product Owner acceptance testing to the Product Owner).

**Product intent:** FamilyTrips is built for the Product Owner's own family trips, but it must support sharing with friends who create and use their own independently-owned Trip in parallel — not a demo, not a stripped-down mode, a first-class Trip with the same sharing and sync contract. This is confirmed, non-negotiable MVP scope, scheduled in Alpha 0.7 (see "Shared Trips, roles and access" below); Alpha 0.6 (Smart Import) completes first.
**Scope:** Thailand trip only
**Purpose:** Define the remaining Alpha versions required to complete the MVP, followed by Beta and Release Candidate stages. This document holds the current, forward-looking plan and the live status of in-progress work only. Alpha 0.1 through Alpha 0.5.6 are fully delivered; their specifications, every embedded QA checkpoint, acceptance register and handoff narrative are preserved verbatim in `MVP_DELIVERY_HISTORY_V1.md` and are not repeated here.

## Change history (this document)

| Document revision | Date | Product phase | Change |
|---|---|---|---|
| V53 | 2026-08-31 | `0.6.6` implementation complete on `version/V6`, awaiting Product Owner install/acceptance | Development Agent implemented the full combined `0.6.6` scope: (1) Attraction/Event Smart Import — `activityImportSchema`/`activitySystemPrompt` (`netlify/functions/_shared/smart-import-schema.mjs`), the `analyze_activity` operation and a public-URL acquisition path with a new distinct `robots_disallowed` safe-failure code (`netlify/functions/smart-import.mjs`), a generalized `validateActivityPlace` reusing Hotel's property-first place-validation gate (`netlify/functions/_shared/place-validation.mjs`), and a new `src/activity-import-adapter.js` mapping per-ticket-holder evidence into the existing `activity` item type — no data-model change, confirming the `V49` correction note. Implementation decisions made explicit and tested: `AE-003`/`AE-004` (Bloomfield companion pair) land as two separate items, surfaced to the Product Owner via the app's existing generic duplicate-detection dialog rather than silently merged or duplicated; `AE-006` (WaterLand, no per-person names) yields zero fabricated participants with all four physical tickets still individually represented via `details.ticketNumbers`/`details.ticketHolders`. (2) `V6-F49`–`V6-F51` — `NEEDS_REVIEW_FIELD_MAP` (`src/ingestion.js`) gained Hotel/Activity-shaped key entries it previously had none of at all, and `smart-import-adapter.js` now keys a needs-review entry by the resolved proposed-field name instead of the raw model key, so a manual field edit can actually match and clear it; an `unresolved`-sourced warning (no field key, can never auto-match) is now wrapped as a dismissible object with a manual dismiss control wired into the review screen; a date resolved only in `unresolved`/`importantNotes` free text now has a regex fallback that still reaches `startAt`/`endAt` (flagged `needs_review`); the tightened Hotel/Activity system prompts instruct the model to resolve a conflict into a field from the start rather than prose only; the Smart Import review screen now pre-fills a blank date with the Trip start date, mirroring `manualCreateDefaults`/`suggestionToItem`. All three findings **Fixed** below, each with a named regression test per the standard's V23 rule. Full quality gate (`npm run check`) passes: 8 pre-existing suites unchanged/still passing, 2 new suites added (`tests/v6-49-51-correction.mjs`, `tests/v6-6-attraction-event-import.mjs`), production build succeeds, build identifier `0.6.6-128eabae`. New executable acceptance session drafted: `EXECUTABLE_TEST_SESSION_V184.md`, covering all seven `AE-` cases (`AE-001` as the mandatory wild-card), the companion-pair and URL-scope steps, and `V6-F49`–`V6-F51` as first-class numbered tests — not yet run; installation and acceptance are the Product Owner's next step, per the standard's responsibility split. Production remains untouched and blocked until explicit Product Owner GO after this candidate's own acceptance completes. |
| V52 | 2026-08-31 | `0.6.6` implementation package authored on the combined scope | `VERSION_PACKAGE_AUTHORING_STANDARD_V28.md` was updated to `V29` to add the `V6-F49`–`V6-F51` scope (fix approach, source-file pointers, and mandatory named regression tests per finding) to the existing `0.6.6` candidate definition, alongside the already-frozen Attraction/Event feature scope. `package_0_6_6/PROMPT_FOR_CLAUDE_CODE.md` — the implementation handoff prompt for the Development Agent — was updated to instruct on the combined scope explicitly, rather than Attraction/Event alone, and the package zip was rebuilt from the updated docs. Updates "Next Actions" item 5 below to point at `VERSION_PACKAGE_AUTHORING_STANDARD_V29.md` (was stale at `V27`) and to describe the combined scope rather than Attraction/Event alone. No finding disposition, scope assignment, or historical fact changed — this revision only brings the process documents and the handoff package in line with the `V51` scope decision. |
| V51 | 2026-08-31 | `0.6.5` Production findings folded into `0.6.6` scope | Product Owner supplied a real post-launch engineering log covering `0.6.5` Production monitoring since the `V50` GO. Seven items total, individually registered: two already-fixed-and-live issues (`V6-F45` corrupted lockfile blocking the first deploy attempt — already recorded in `V47`, now given a finding ID for register completeness; `V6-F46` Product Owner locked out of Production Smart Import because `FAMILYTRIPS_ALLOWED_EMAILS` held only the QA test invite, not `eyalby@gmail.com` — new, fixed same-day by correcting the Functions-scoped env var and redeploying); one investigated-and-accepted non-bug (`V6-F47`, three consecutive Hotel-PDF Smart Import failures traced to genuine OpenAI 5xx responses via distinct request IDs, not a FamilyTrips defect — accepted, no fix, retry recommended); one monitored-not-reproduced issue (`V6-F48`, file picker reopened on the very first-ever upload, has not recurred, existing `V6-F05`/`V6-F11` regression coverage already matches the reviewed code path — left open as Monitoring, not assigned); and three real open defects with proposed root causes and fixes, all tracing to the same underlying gap — the model sometimes resolves a conflict into free-text `draft.unresolved` prose instead of a structured field, and the app only trusts structured fields: `V6-F49` (needs-review warnings sourced from `unresolved` text carry no field key and can never be cleared by editing, unlike `needsReviewFields`-sourced warnings), `V6-F50` (a date the model actually resolved correctly can end up only in `unresolved` prose and never reach `startAt`/`endAt` at all — a real silent-omission case, not merely a UX rough edge, given every other rule in this project's history exists to prevent exactly this), and `V6-F51` (the Smart Import review screen doesn't pre-fill blank dates with the Trip start date the way the manual-create form and `suggestionToItem` both already do — low severity, UX consistency only). **Product Owner decision:** `V6-F49`–`V6-F51` are assigned to `0.6.6`, bundled together with the already-frozen Attraction/Event Smart Import feature scope in one combined candidate, rather than as a separate focused correction package the way `0.6.1`–`0.6.4` were. This is a deliberate deviation from the one-slice-per-candidate pattern every prior `0.6.x` candidate followed; it is recorded here explicitly rather than silently reinterpreted. `V6-F45`–`V6-F48` require no `0.6.6` action; they are registered for finding-register completeness and audit trail only. |
| V50 | 2026-08-31 | `0.6.6` entry gate PASSED — implementation starting | `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` reached `V4`/Frozen: Product Owner resolved all three open Decision 4 questions in chat (ticket/confirmation number is required-when-present, not a no-omission blocker; location must be accurate, property-first discipline frozen; ticket-platform/venue URLs in scope), the benchmark grew from zero to seven real, individually catalogued documents with frozen field-by-field expected values (`AE-001`–`AE-007` — FC Barcelona/Girona LaLiga ticket as mandatory wild-card, Bloomfield Science Museum companion-source pair, Gamzu orienteering order/ticket-number precision case, WaterLand 4-in-1 family ticket, a zoo-ticket screenshot closing the image-format gap), and a `V4` sub-decision on URL scope: ship URL acquisition, with ticket-resale/box-office platform URLs (Ticketmaster, vivenu/leaan.net, hapoelbc.com) expected to safe-fail — backed by real evidence, 4 independently tested ticket-platform URLs, 4/4 blocked by `robots.txt` — while official venue/museum/OTA URLs remain the real target of this sub-scope and are still untested, an explicitly accepted gap carried into implementation rather than assumed closed. Implementation package authoring for `0.6.6` begins now. |
| V49 | 2026-08-31 | `0.6.6` retargeted from Restaurant to Attraction/Event — prior "Activity blocked" claim was wrong | Product Owner spotted a live Trip Center category tile for `אטרקציה` (Attraction) in the running app, directly contradicting this document's own `V16`/`Blocked` claim that "Activities do not yet exist as a first-class Trip item type." Direct code inspection (`src/ingestion.js`) confirmed it: `ITEM_TYPES.activity` and `TYPE_FIELDS.activity` are full peers of every other type (including `restaurant`), used by the same generic dynamic-form system since `V4-F01` (Alpha 0.4.3) — there was never a data-model blocker. Separately, brainstorming surfaced that Restaurant's real-world sources are disproportionately phone/walk-in/informal-email rather than the PDF/image/URL documents Smart Import is built to read, while Attraction/Event sources are ticket-shaped (PDF, QR/barcode) — a closer fit to the pipeline already proven on Flight boarding passes (`FL-008`). Decision: `0.6.6` is retargeted to Attraction/Event Smart Import. `claude/RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md` is shelved at `V2` (preserved, not deleted — a real candidate for a later slice). New draft: `claude/ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`, mirroring the same discovery structure. Same gate as before: blocked on Product Owner review of three open questions and a real Attraction/Event benchmark set (including one wild-card), not yet supplied. Implementation has not started. |
| V48 | 2026-08-31 | Production import test confirmed; `0.6.6` discovery started | Product Owner confirmed both a Hotel import and a Flight import were tested separately against Production and both worked — the last open item from `0.6.5` is closed. Two repo loose ends from the Production push were also resolved and pushed to `version/V6`: the flight benchmark fixture rename (`e0be719`) and removal of a stray file accidentally committed in `d56482b` (`128eaba`). Started `0.6.6`: drafted `claude/RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md` proposing the Restaurant-specific type contract (Decision 4/7 equivalents), mirroring the Hotel/Flight discovery pattern. That document is explicitly a draft, not frozen — it is blocked on two things only the Product Owner can supply: review/approval of three open product questions, and a real Restaurant benchmark document set (including one wild-card document) with frozen expected values. Implementation has not started and must not start before that document reaches Frozen status. |
| V47 | 2026-08-30 | Production live — post-deploy test blocked on sign-in | First Production build attempt (`94a32a2`) failed at `npm install`: `@firebase/installations@0.6.33` returned a 404 from the npm registry (a bad/stale lockfile pin, not the Node-version issue originally guessed — confirmed via the actual Netlify build log, which the Product Owner retrieved and pasted in rather than accepting the first guess). Netlify's atomic deploys meant nothing went live from the failed attempt — Production stayed safely on the old `0.3.0` build throughout. Claude Code fixed the lockfile (`@firebase/installations` fix + firebase `12.17.0`→`12.18.0`, verified via full test suite), pushed as commit `a915a44`, and the retry succeeded. **Production is now live**: deploy `6a9464b101a1690008db8823`, commit `a915a44`, state `ready`, build identifier `0.6.5-a915a440`. Claude Code then attempted the agreed live Hotel + Flight import test against Production (signed in as eyalby@gmail.com) but hit Google's real sign-in page with no existing session — it correctly declined to enter credentials itself and is waiting for the Product Owner to sign in in the shared browser pane before continuing. |
| V46 | 2026-08-30 | Production baseline correction — this is a first release, not a promotion | `origin/main` was found at `0.3.0-foundation`, 19 commits behind — not Alpha 0.5.6 as documented. This push is the first-ever Production release of the whole V4/V5/V6 line. Product Owner authorized proceeding. |
| V45 | 2026-08-27 | Production environment variables set | All 3 required variables confirmed set for the `production` context via CLI (dashboard UI bug worked around). |
| V44 | 2026-08-27 | Production promotion — OpenAI credential mystery resolved | Confirmed the OpenAI credential is provided automatically by Netlify's account-level AI Gateway, not a site variable. |
| V43 | 2026-08-27 | Production Smart Import secrets — launch decision made | Launch Flight Smart Import to Production now, Flight-only, rather than wait for `0.6.6`. |
| V42 | 2026-08-27 | **`0.6.5` GO** | All findings closed, all 8 Flight benchmark cases pass. |
| V41 | 2026-08-27 | `FL-007` fully passes — `V6-F35` and `V6-F44` Closed | All 8 `FL-001`–`FL-008` benchmark cases now pass. |
| V40 | 2026-08-27 | Seventh `0.6.5` fix pass reported | `V6-F35` (departure side) and `V6-F44` (baggage regression). Commit `94a32a2`. |
| V39 | 2026-08-27 | Retest of sixth fix pass — partial pass | Arrival side of `V6-F35` fixed; departure side reproduced; new regression `V6-F44`. |
| V38 | 2026-08-27 | Sixth `0.6.5` fix pass reported | `V6-F35` two root causes found and fixed. Commit `a95d0aa`. |
| V37 | 2026-08-27 | Two new Alpha 0.7 product decisions | Task creation from the global floating "+"; Today page Packing-list shortcut link. |
| V36 | 2026-08-27 | Retest of fifth fix pass | `V6-F35`'s general fix did not hold on the real `FL-007` source. |
| V35 | 2026-08-27 | Fifth `0.6.5` fix pass reported | Commit `1e42062`. |
| V34 | 2026-08-27 | Full `0.6.5` retest — 4 new findings, `V6-F35` reopened | `V6-F40`–`V6-F43`. |
| V33 | 2026-08-27 | Fourth `0.6.5` fix pass reported | `V6-F35`–`V6-F39` + QA quota increase. Commit `b500469`. |
| V32 | 2026-08-27 | Third `0.6.5` fix pass retested — 5 new findings | `V6-F35`–`V6-F39`. |
| V31 | 2026-08-27 | Third `0.6.5` fix pass reported | `V6-F34` + revised `V6-F32` strategy. Commit `716f950`. |
| V30 | 2026-08-27 | `V6-F32` reclassified | Non-determinism root-caused; `V6-F34` discovered. |
| V29 | 2026-08-26 | Today out-of-range fallback confirmed | — |
| V28 | 2026-08-26 | Retest of second fix pass — partial | — |
| V27 | 2026-08-26 | Second `0.6.5` fix pass reported | Commit `b10e48a`. |
| V26 | 2026-08-26 | `0.6.5` full retest — 2 new findings | `V6-F32`/`V6-F33`. |
| V25 | 2026-08-26 | Retest paused — QA quota; `V6-F31` | — |
| V24 | 2026-08-26 | `0.6.5` fix pass reported | `V6-F25`–`V6-F30`. |
| V23 | 2026-08-26 | Add-flow UX simplification | — |
| V22 | 2026-08-25/26 | `0.6.5` first live QA pass — 6 findings | `V6-F25`–`V6-F30`. |
| V21 | 2026-08-25 | `V6-F24` confirmed live in Production | Alpha 0.6.4 fully closed. |
| V20 | 2026-08-25 | `0.6.5` entry gate passed | — |
| V19 | 2026-08-25 | `V6-F21`–`V6-F23` promoted; `V6-F24` discovered; secrets decision | Commit `3c63e16`. |
| V18 | 2026-08-25 | `V6-F23` closed defensively | — |
| V17 | 2026-08-25 | `V6-F21`/`V6-F22` closed; `V6-F23` partial | — |
| V16 | 2026-08-25 | Restaurant approved as 0.6.6; Activity blocked | — |
| V15 | 2026-08-25 | Alpha 0.6.4 Production promotion; new findings | `V6-F21`–`V6-F23`. |
| V14 | 2026-08-24 | Alpha 0.6.3 finding assignment | 12 findings. |
| V13 | 2026-08-24 | Flight Smart Import approved as 0.6.5 | — |
| V12 | 2026-08-24 | Alpha 0.6.3 acceptance closure — NO-GO | — |
| V1–V11 | 2026-08-23/24 | Alpha 0.6.3 acceptance testing and earlier history | Preserved in `MVP_DELIVERY_HISTORY_V1.md`. |

*Full text of older change-history entries is preserved verbatim in this document's prior published versions and in `MVP_DELIVERY_HISTORY_V1.md`; this revision compresses older entries to keep the table readable.*

## IMPORTANT — Production baseline was misdocumented; corrected 2026-08-30

Every prior revision of this plan (and the repo's own QA-package README) stated or assumed Production was at Alpha 0.5.6. **This was wrong.** Direct inspection of `origin/main` in the real repository showed it at `0.3.0-foundation`, 19 commits behind. Practically: Production has been running a much older build than anyone realized throughout this entire `0.6.x` engagement — none of V4, V5, or V6 (including all of Alpha 0.6.4, previously recorded above as "live in Production") had actually reached `main`. **This means the "Alpha 0.6.4 fully closed and live in Production" status recorded in every prior revision of this document needs re-verification** — it's now unclear whether that referred to a different deploy target than `main`, or whether that record was itself inaccurate. Flagging this explicitly rather than silently correcting it, since it affects how much to trust other "confirmed live in Production" statements in this document's history. **Follow-up needed:** now that the current push is confirmed live, verify directly (not from documentation) exactly what Production is serving and reconcile this document's Alpha 0.6.4 status accordingly.

## Findings status — Alpha 0.6.4 (2026-08-25)

- **`V6-F21`**–**`V6-F24`** — All **Closed** in QA/testing terms. **Production-live status now uncertain — see baseline-correction note above.**

## Findings status — Alpha 0.6.5 (2026-08-27) — FINAL (QA)

- **`V6-F25`**–**`V6-F44`** — **All Closed.**
- All 8 `FL-001`–`FL-008` benchmark cases pass.
- Minor cosmetic note (non-blocking, Beta 0.8 candidate): Flight route-location label shows the full route rather than a single airport code; resolution itself is correct.
- Today out-of-range fallback (`FL-008`) — Confirmed working exactly as specified. `0.7` backlog item logged for a smarter version.

**`0.6.5` release gate: PASSED. GO in QA. Production: live, real-import verification CONFIRMED (2026-08-31) — Product Owner tested both Hotel and Flight imports against Production separately; both worked.** Full record: `EXECUTABLE_TEST_SESSION_V169.md`.

## Decision made — Production Smart Import secrets and credentials

**Decided 2026-08-27: launch Flight Smart Import to Production now, Flight-only.** As of `V46`, this is understood to mean launching the entire V4/V5/V6 line at once (see baseline-correction note above), not just Flight in isolation — the Product Owner has been informed of this and explicitly authorized proceeding anyway.

**Production environment-variable status (updated 2026-08-27):**

| Variable | Needed by Smart Import? | Production status |
|---|---|---|
| `FAMILYTRIPS_ALLOWED_EMAILS` | Yes — allow-list gate on every call | **Set** (via CLI, dashboard UI would not persist it) — currently `eyalby@gmail.com,paolakohan@gmail.com`. Who else should be invited to Production remains an open Product Owner decision, not yet made. |
| `FAMILYTRIPS_GOOGLE_PLACES_API_KEY` | Yes — Hotel location verification only (non-fatal if unset) | **Set** (via CLI) |
| `FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA` | Yes — per-user daily cap (defaults to 10 if unset) | **Set** (via CLI) |
| `FAMILYTRIPS_FIREBASE_PROJECT_ID` | Yes, but falls back to `VITE_FIREBASE_PROJECT_ID`, already correctly set in Production | No action needed |
| `FAMILYTRIPS_V13_GOOGLE_PLACES_API_KEY` | No — confirmed unused anywhere in the codebase (stale) | Ignore |
| `OPENAI_API_KEY` | Yes — every extraction call | Not a site variable — provided by Netlify's account-level AI Gateway, already active for this site across all contexts |

**Known Netlify dashboard bug encountered:** editing an existing variable's Production value through the web UI and clicking Save silently failed. Worked around via `netlify env:set VAR "value" --context production` directly in a local terminal.

**Deploy mechanism (confirmed 2026-08-30):** the `familytripz` Netlify site auto-builds Production from `main` only. Promotion = `git push origin <commit>:main`.

**First Production deploy attempt failed, second succeeded (2026-08-30):** `94a32a2` failed to build — `npm install` hit a 404 on `@firebase/installations@0.6.33` (bad lockfile pin; the Node-version hypothesis first offered was wrong and was ruled out by getting the actual build log rather than guessing). Netlify's atomic deploys meant Production stayed on the old build throughout — no user-facing impact. Fix pushed as commit `a915a44`; deploy `6a9464b101a1690008db8823` succeeded, state `ready`, **live build identifier `0.6.5-a915a440`** (differs from `0.6.5-94a32a28` only because of the extra fix commit — no functional change, only `package-lock.json`).

**Uncommitted working-tree changes (2026-08-30) — resolved 2026-08-31:** the two renamed test fixture images under `tests/fixtures/flight_benchmark/` were committed as-is (`e0be719`) and pushed to `version/V6`. A separate, previously-undiscovered issue was also found and fixed while investigating: a stray file accidentally committed back in `d56482b` ("Add Alpha 0.3 Firebase and Vite foundation") — leftover `less`-pager text from a botched shell command, tracked in the repo under a garbled filename — was removed (`128eaba`) and pushed. Working tree is clean on `version/V6`.

Before ramping real Production traffic: (1) ~~live Production Hotel + Flight import test~~ — **CONFIRMED 2026-08-31**: Product Owner tested both separately against Production, both worked; (2) check AI Gateway billing/usage in Netlify (Team → Usage/Billing) — account currently shows `ai_usage_limit_enforced: false` with no cap, which is a configuration state, not a cost guarantee — **still open**; (3) decide who beyond the Product Owner and the QA test account should be added to the Production `FAMILYTRIPS_ALLOWED_EMAILS` allowlist — **still open, Product Owner decision, deliberately deferred for now.**

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
- Multiple independently-owned Trips running in parallel — the Product Owner's family Trip and any number of friends' own Trips, each fully isolated from the others unless explicitly shared by its Owner. This is non-negotiable MVP scope, not a post-MVP nicety: FamilyTrips is built to be shared with friends who create and manage their own Trip alongside the Product Owner's.
- Private Trips and explicit shared-Trip access — on any Trip, whether the Product Owner's family Trip or a friend's own independently-owned Trip
- Two-user, two-device collaboration on any shared Trip — the same Owner/Editor sharing and synchronization contract applies identically whether the Trip belongs to the Product Owner or to a friend; there is no reduced or "friend-tier" version of sharing or sync
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

*Alpha 0.1 through Alpha 0.5.6 delivered this scope incrementally; see `MVP_DELIVERY_HISTORY_V1.md` for what shipped in each version. What follows is the current and future plan.*

# Alpha 0.6 — Smart Import Redesign

## Goal

Replace the failed browser-only heuristics for creating or enriching travel items from a URL, image/camera capture or PDF with one evidence-backed, source-preserving and review-first architecture. This release is dedicated to Smart Import and must not absorb the former broad MVP-completion backlog.

## Entry gate — Product Owner discovery session

**Entry gate: PASSED.** `SMART_IMPORT_REDESIGN_DISCOVERY_V22.md` freezes Decisions 1–7 for Hotel. `FLIGHT_SMART_IMPORT_DISCOVERY_V1.md` freezes the Flight-specific type contract and benchmark, inheriting the generic decisions unchanged.

## Alpha 0.6.4 — correction package: QA-confirmed; Production-live status uncertain (see `V46` baseline-correction note)

`0.6.4` corrected the twelve findings assigned in `V14`, plus seven findings discovered during its own QA/post-promotion retesting (`V6-F18`–`V6-F24`), all Closed against QA. Prior revisions of this document stated this was "live in Production" — that claim is now uncertain given the `V46` discovery that `main` was still at `0.3.0-foundation`. Needs direct re-verification now that the current push is live.

## Alpha 0.6.5 — Flight Smart Import: GO in QA; Production live and verified

Approved 2026-08-24. Entry gate passed 2026-08-25. Seven fix passes sent across the engagement, plus one Production-only lockfile fix. **All 8 `FL-001`–`FL-008` benchmark cases pass; all findings (`V6-F25`–`V6-F44`) closed; `0.6.5` release gate PASSED against QA.** Product Owner decided to launch to Production now — this turned out to be the first-ever Production release of the whole V4/V5/V6 line (see `V46`), explicitly authorized. **Production is live**, build `0.6.5-a915a440`, deploy `6a9464b101a1690008db8823`. **The live Hotel + Flight import test against Production is confirmed complete (2026-08-31)** — the Product Owner tested both separately and both worked. `0.6.5` is fully closed. Full status: `EXECUTABLE_TEST_SESSION_V169.md`.

## Approved scope addition — Attraction/Event Smart Import + 0.6.5 Production findings (0.6.6) — discovery FROZEN, entry gate PASSED, implementation package authoring underway

`0.6.6` was originally approved as Restaurant on 2026-08-25/27. Retargeted to Attraction/Event on 2026-08-31 (`V49`) — see correction note below. Entry gate passed 2026-08-31 (`V50`, `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` `V4`). Sequenced after `0.6.5` (Flight), to launch independently to Production when ready. **As of `V51`, scope also includes three findings from `0.6.5` Production monitoring** (`V6-F49`–`V6-F51`) — Product Owner decision to bundle a correction scope into this feature candidate rather than spin up a separate `0.6.6`-correction/`0.6.7`-feature split. See the `V51` change-history row above for the full finding list and the four items (`V6-F45`–`V6-F48`) requiring no `0.6.6` action.

### Attraction/Event Smart Import feature scope

- **Correction — the prior "Activity is blocked" claim was wrong, not just stale.** This document previously stated (`V16`) that Activities do not exist as a first-class Trip item type and are therefore blocked. Product Owner spotted a live `אטרקציה` (Attraction) Trip Center category tile in the running app; direct code inspection confirmed `ITEM_TYPES.activity` / `TYPE_FIELDS.activity` in `src/ingestion.js` are full peers of every other type, including `restaurant` — same generic dynamic-form system since `V4-F01` (Alpha 0.4.3). There was never a data-model blocker; what was actually missing is exactly what was missing for Restaurant: the Smart Import extraction contract and benchmark.
- **Why Attraction/Event instead of Restaurant:** brainstorming surfaced that real-world Restaurant sources are disproportionately phone/walk-in/informal-email — a thin match for a pipeline built to read PDF/image/URL documents. Attraction/Event sources are ticket-shaped (PDF, QR/barcode), which is architecturally closer to the boarding-pass case Flight already proved out (`FL-008`). Restaurant is shelved, not abandoned — `claude/RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md` is preserved at `V2` as a real candidate for a later slice.
- **Discovery FROZEN 2026-08-31 (`ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` `V4`):** `claude/ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` defines the frozen Attraction/Event type contract — inheriting Decisions 1/2/3/5 unchanged, with Decision 4 (no-omission fields), Decision 6 (benchmark) and Decision 7 (delivery slice) all frozen.
- **Decision 4, frozen:** event/attraction name, date, time and venue/location are no-omission blockers; location must be accurate (property-first, same discipline as Hotel). Ticket/confirmation number is explicitly **not** a no-omission blocker — required-when-present, same treatment as Restaurant would have had, not Flight's PNR-blocker treatment (Product Owner decision, reversing the `V1` proposal).
- **Decision 6, frozen:** seven real, individually catalogued benchmark documents, `AE-001`–`AE-007`, each with SHA-256 identity and frozen field-by-field expected values — `AE-001` (FC Barcelona vs Girona FC, LaLiga) is the mandatory wild-card; `AE-003`/`AE-004` (Bloomfield Science Museum) is a real companion/duplicate-source pair; `AE-005` (Gamzu orienteering) is a real order-number-vs-ticket-number precision case; `AE-006` (WaterLand) is a 4-tickets-in-one-PDF family case with no per-person names; `AE-007` (a zoo ticket screenshot) closes the image-format gap and carries an explicit lower-confidence note on its barcode digits. Both PDF and image source formats are represented.
- **Decision 7, frozen:** ticket PDFs and images from global Add or existing-item attach, mirroring Hotel/Flight. Public URL acquisition is **in scope**, with an explicit `V4` sub-decision on how to treat it: official venue/museum/OTA URLs are the real target and are expected to work; ticket-resale/box-office platform URLs (Ticketmaster, vivenu/leaan.net, hapoelbc.com) are expected to land on a safe-failure state, and that is documented as expected behavior — backed by real evidence gathered before implementation (4 independently tested ticket-platform URLs, 4/4 blocked by `robots.txt`, a new named failure reason alongside Hotel's `access_required`/login pattern). **One explicitly accepted, non-blocking gap:** zero official venue/museum/OTA URLs have been tested end-to-end yet — the implementation package carries this as a named verification step, not an assumed pass.
- **Entry gate: PASSED (2026-08-31).**

### `0.6.5` Production findings folded into `0.6.6` (added `V51`)

| Finding | Status | Disposition |
|---|---|---|
| `V6-F45` — corrupted lockfile blocked the first Production deploy attempt | Fixed, live | Already recorded in `V47`; registered here with a finding ID for register completeness only. No `0.6.6` action. |
| `V6-F46` — Product Owner locked out of Production Smart Import (`FAMILYTRIPS_ALLOWED_EMAILS` missing `eyalby@gmail.com`) | Fixed, live | Corrected same-day via the Functions-scoped env var and a redeploy. No `0.6.6` action. |
| `V6-F47` — Hotel PDF (Hyatt Regency Phuket Voucher) failed Smart Import 3 times in a row | Accepted, not a defect | Netlify function logs show three genuine OpenAI 5xx responses (distinct request IDs); a Flight import succeeded around the same time, confirming the AI Gateway path itself is healthy. No code change. Recommendation carried into support docs: retry; escalate to OpenAI with request IDs if the same document keeps failing while others succeed. |
| `V6-F48` — file picker reopened after selecting the very first upload on the account | Monitoring | One-time occurrence, has not recurred (including a second Flight upload). Reviewed code path already matches existing `V6-F05`/`V6-F11` regression coverage — no gap found. Left open as Monitoring, not assigned to any version, revisit only if it recurs. |
| `V6-F49` — needs-review warnings sourced from `draft.unresolved` free text never clear after a manual correction | **Fixed** (`0.6.6`, `version/V6`, not yet Production) | Root cause: `needsReviewFields`-sourced warnings were keyed by the raw model canonical key, which `NEEDS_REVIEW_FIELD_MAP` had no entries for at all, so nothing could ever match and clear them, regardless of source; `unresolved`-sourced warnings carry no field key by nature. Fixed: `NEEDS_REVIEW_FIELD_MAP` gained the missing Hotel/Activity-shaped entries and `smart-import-adapter.js`/`activity-import-adapter.js` now key by the resolved proposed-field name, so a structured needs-review warning genuinely clears on edit; an `unresolved`-sourced warning is wrapped `{message,dismissible:true}` with a manual dismiss control wired into the review screen (`v5-app.js`'s `isDismissibleWarning`/`dismiss-warning`); the tightened Hotel/Activity system prompts now instruct the model to resolve a conflict into a field from the start. Regression test: `tests/v6-49-51-correction.mjs` (both the structured-path clearing and the unresolved-path dismissibility). `src/ingestion.js:154-171`, `src/smart-import-adapter.js`, `src/v5-app.js`. |
| `V6-F50` — a date the model resolved correctly can silently never reach `startAt`/`endAt` | **Fixed** (`0.6.6`, `version/V6`, not yet Production) | Same root cause as `V6-F49`. Fixed: same prompt tightening as `V6-F49`, plus a regex fallback (`scanFreeTextForDate`, exported from `smart-import-adapter.js`, reused by `activity-import-adapter.js`) that recovers a labelled date from `unresolved`/`importantNotes` free text when the structured `fields` extraction found nothing, flagging the result `needs_review` rather than presenting it as confident. Regression test: `tests/v6-49-51-correction.mjs`, using the exact real Hyatt Regency free-text wording, plus a negative case proving the scan stays inert on unlabelled text. `src/smart-import-adapter.js`. |
| `V6-F51` — Smart Import review screen doesn't pre-fill blank dates with the Trip start date | **Fixed** (`0.6.6`, `version/V6`, not yet Production) | Low severity, UX consistency only. Fixed: new `suggestionReviewDefaults` (`src/ingestion.js`) mirrors `suggestionToItem`'s own trip-start fallback condition exactly (new-item suggestions only, respects schedule), applied in `suggestionView` before rendering `proposalFields`. Regression test: `tests/v6-49-51-correction.mjs`, covering range/single schedules, an already-dated suggestion (must not be overwritten), an update/attach-and-extract suggestion (must not get the new-item default), and no-trip-yet. `src/v5-app.js:145`, `src/ingestion.js:178-193`. |

Per `VERSION_PACKAGE_AUTHORING_STANDARD_V29.md`'s mandatory regression-test rule, `V6-F49`–`V6-F51` are recorded `Fixed` above because `tests/v6-49-51-correction.mjs` exists, is named for each finding ID, asserts the specific expected behavior recorded in this register (not merely that the code runs), and passes as part of the permanent `npm test` suite. "Fixed" here means fixed in the `0.6.6` candidate on `version/V6` — none of the three has reached Production, which remains on `0.6.5` until `0.6.6` completes its own acceptance and receives explicit Product Owner GO.

Implementation of the combined `0.6.6` scope (Attraction/Event feature + `V6-F49`–`V6-F51` corrections) is complete on `version/V6` and awaiting Product Owner install/acceptance testing — see the `V53` change-history row above.

*The full frozen processing/privacy, universal source-landing, source-relative completeness/evidence and bounded external-enrichment contracts, the approved first vertical slice definition, the first-slice acceptance benchmark, explicit exclusions and the Alpha 0.6 release gate are unchanged from prior revisions and are preserved verbatim below.*

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
- Failed, unsupported or insufficient analysis creates no empty/generic item. The original remains in Intake Inbox with an explicit state and **Retry** / **Delete** actions. Retry now shows a loading indicator (`V6-F42` Closed).
- A successful analysis creates editable proposals only and requires approval before final creation.
- Every existing item exposes **Attach only** and **Attach and extract**. Until that item's extraction contract is supported, the second action reports a truthful unsupported state and keeps the source attached without changing structured data.
- Alpha 0.6 implements and benchmarks extraction for Hotel, with Flight (`0.6.5`) and Attraction/Event (`0.6.6`) approved as further vertical slices.
- Alpha 0.6 includes the minimum non-category Intake Inbox required by this contract.
- **No manual item-type picker is specified by this contract.** Removed in the `0.6.5` fix pass, confirmed working on retest.
- **Top-level Add options, revised:** `Manual` / `Document` / `Link` / `QR` / `JSON`. Confirmed working on retest. The per-item attach modal now matches — confirmed on retest (`V6-F38` Closed). **Note: `Manual` from the global floating "+" does not currently support creating a Task directly — new Alpha 0.7 item, see below.**
- **Today** now falls back to showing out-of-Trip-range items when it would otherwise be empty — confirmed working exactly as specified via `FL-008`. A smarter version is a `0.7` backlog item, not a `0.6.5` blocker.

## Frozen source-relative completeness and evidence contract

- Smart Import has no fixed absolute minimum field count. A sparse source may produce a sparse draft; a field absent from the source remains empty and is not fabricated. Confirmed again via `FL-007`: an invalid source time value is correctly left blank rather than guessed.
- Every readable travel-relevant value present in the source must appear in the review draft with evidence. For Hotel, dates, arrival/departure or check-in/check-out times/windows, location/address/map data, phone and booking/confirmation number are explicit no-omission blockers whenever present. For Flight, see `FLIGHT_SMART_IMPORT_DISCOVERY_V1.md`. For the Attraction/Event proposal under discovery, see `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` (Restaurant's shelved equivalent: `RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md`). `FL-007`'s baggage-allowance evidence and airline-reference ambiguity both confirmed correct on final retest (`V6-F44` Closed).
- A complete, unambiguous source address is the exact Hotel Location. A map link or coordinates are not required for source-extraction exactness. Flight route-type locations confirmed resolving correctly (`V6-F41` Closed); label wording is a minor Beta 0.8 candidate.
- If explicit property location is absent, the exact source Hotel name is the derived Location-field/search candidate.
- The named Hotel fields are not a ceiling.
- Every proposal requires a meaningful evidence-grounded title.
- Missing-in-source values do not block approval. Unreadable, ambiguous or conflicting present values stay visible as unresolved/needs-review. **Needs-review evidence must be correctly scoped to the actual field it concerns** — `V6-F43` confirmed fixed. **A field's needs-review warning must clear/re-evaluate whenever that field's value changes, by any means** — `V6-F35` confirmed fixed on both arrival and departure fields.
- Each proposed value carries direct field evidence and provenance.
- **An ambiguous or unresolved field must never block unrelated fields from populating.** `V6-F34` — confirmed fixed.
- **Duplicate detection must preserve non-empty trusted values, including a manually-resolved direction/location and any field populated as a result.** `V6-F33`/`V6-F39` — confirmed fixed on retest.

## Frozen bounded external-enrichment policy

- Source extraction is completed first. External enrichment never substitutes for source-relative completeness.
- Each processing attempt may retrieve at most three evidence-linked public pages and perform at most one structured place lookup.
- Every Hotel place lookup starts property-name-first; a generic park/dam/lake/island/city/region result is rejected or left `needs_review`.
- Every enriched field is labelled separately and retains field-level provenance.
- Login/session/CAPTCHA/credential-protected pages and broad crawling are excluded.
- The initial benchmark target is approximately USD 0.10 or less in variable third-party cost per import.

## Approved first vertical slice — Hotel

The first Alpha 0.6 technical spike and integrated implementation support text/scanned hotel PDFs, hotel images, public official hotel URLs, a new-Hotel proposal from global Add, and `Attach only`/`Attach and extract` from an existing Hotel. This is a complete architecture slice: immutable source identity, processing attempts, field evidence, proposal review, explicit approval, duplicate handling, multi-source relationships, attachment ownership, partial/failure states, authorization and audit/cost/latency measurement all apply.

## Required capabilities

### One source pipeline

- Camera capture, gallery image, PDF/file and URL all enter one source-ingestion pipeline with immutable original-source identity and traceable processing attempts.
- Manual item creation and validated `familytrips.import` / `FTI1` / `FTI1C` remain independent trusted paths.
- URL ingestion retrieves actual allowed page content through an approved server-side acquisition path.

### Reviewable structured result

- Every extracted value carries field-level evidence, source reference, extraction method and confidence.
- Values absent from the source or unsupported by direct evidence remain empty.
- Extraction creates a proposal only.
- Duplicate detection runs before approval and preserves non-empty trusted values. Confirmed on retest.
- An ambiguous field's unresolved status must never withhold unrelated fields. Confirmed fixed.

### Existing-item attachment

- `Attach only` is a reliable foundation.
- `Attach and extract` uses the same Smart Import pipeline and returns field-level proposals requiring approval.

### Safety and observability

- The user can cancel, retry, reject or keep the original source without accepting extracted data.
- Processing state distinguishes queued, processing, partial, needs review, failed, attached and rejected outcomes.
- Offline behavior is explicit.

## First-slice acceptance benchmark

The first-slice benchmark uses real, Product Owner-approved Hotel examples covering `H-001` through `H-005` plus the partial/missing-reference/companion/duplicate matrix rows — full detail preserved in `SMART_IMPORT_REDESIGN_DISCOVERY_V22.md`. The Flight benchmark (`FL-001`–`FL-008`) is preserved in `FLIGHT_SMART_IMPORT_DISCOVERY_V1.md`. **All 8 Flight cases pass in QA — GO. Production is live and the real-import test is confirmed.** The Attraction/Event benchmark is drafted but open in `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`, pending real Product Owner-supplied documents. The Restaurant benchmark drafted earlier is shelved in `RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md` (`V2`).

## Explicit exclusions

- Multi-trip, sharing/synchronization, Shopping expansion, first-class Transport, task-model expansion, broad visual redesign and the remaining MVP-completion backlog stay in Alpha 0.7.
- Boarding-pass/Flight extraction is approved scope, sequenced to `0.6.5`. Attraction/Event ticket extraction is approved scope, sequenced to `0.6.6` (retargeted from Restaurant — `V49`; Activity was never actually blocked by the data model, see correction note above). Restaurant, Transport, Insurance and generic multi-type extraction remain excluded from `0.6.x` — Restaurant is shelved, not blocked, and is a real candidate for a later slice.
- The external-model `familytrips.import` and QR contract remains a supported fallback and test oracle.

## Alpha 0.6 release gate

Alpha 0.6 receives GO only after the approved end-to-end Hotel vertical slice passes its benchmark, all supported Hotel sources share the same proposal and ownership invariants, the bounded enrichment and measured accuracy/cost/latency gates pass, failure branches create no misleading data, and the exact tested build passes privacy, offline, schema, duplicate, persistence and regression gates. Flight (`0.6.5`) has its own equivalent gate, defined in `FLIGHT_SMART_IMPORT_DISCOVERY_V1.md` — **PASSED against QA. Production is live and the real-import verification is confirmed. `0.6.5` is fully closed.** Attraction/Event (`0.6.6`) will get its own equivalent gate once its type contract and benchmark reach Frozen status in `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` and its own independent Production promotion once implemented and accepted.

# Alpha 0.7 — MVP Completion and Hardening

*Full required-work, release-blocker and exit-criteria detail is unchanged from prior revisions — see `MVP_DELIVERY_HISTORY_V1.md` or the prior published version of this document. Two new product decisions added 2026-08-27, both confirmed by the Product Owner and assigned here:*

- **Task creation from the global floating "+".** Currently, creating a Task is only reachable from within the Preparations/Tasks section; the global Add ("+") flow does not offer Task as a creatable type. This is a genuine gap, not previously covered by any existing finding (`V5-F09` is a different, category-preset concern — it's about prefilling the current category's type when using Add *from within* that category, not about which types are available at all from the global entry point). Fix: Task must be a selectable type from the global floating "+", the same as any other manually-created item type.
- **Today page: Packing list shortcut, not individual items.** Open preparation Tasks already surface correctly in Today's pre-trip Quick Access (`V5-F13`, implemented Alpha 0.5.2 — up to 3 open tasks, overdue → today → nearest due → undated, with an "All tasks" overflow link). Packing/equipment list items currently do not appear in Today at all. Product Owner decision: do not add individual packing items into the same "top 3 urgent" Quick Access slots as Tasks — instead, add a shortcut link to the full Packing list (the same overflow-link pattern already used for "All tasks"), so packing stays visible and reachable pre-trip without crowding out the most urgent tasks.

*Whether to add cloud-synchronized Trip storage earlier than planned is worth revisiting during Alpha 0.7 planning. Backlog item carried from `V34`: a smarter Today-page data-quality alert design (for out-of-range/problematic items). New minor item from `V42`: Flight route-location label wording (full route vs. single airport code). (The open question about adding an explicit Activity item type is resolved as of `V49` — it already exists; see the Alpha 0.6 correction note above.)*

## 3. MVP Completeness Audit

*Unchanged from prior revisions.*

## 4. Features Beyond the Thailand MVP

*Unchanged from prior revisions — Expense tracking (deferred), product/platform expansion, intelligence expansion, social/content expansion, and the post-trip Magazine/PDF backlog entry.*

## 5. Beta Plan

# Beta 0.8 — Visual and Interaction System

Focus unchanged from prior revisions, including the carried-forward refinements: `V6-F14` (Hotel review notes field scoped down), `V6-F16` (unified "Add document" source-type selector), and the new Flight route-location label wording note from `V42`.

# Beta 0.9 — Usability and Real-World Refinement

Unchanged from prior revisions.

## 6. Release Candidate

# RC 0.10 — Thailand Release Candidate

Unchanged from prior revisions.

## 7. Feedback Classification Rule

Unchanged from prior revisions.

## 8. Working Responsibilities

Unchanged from prior revisions.

## 9. Next Actions

1. Alpha 0.6.4: QA-confirmed. **Production-live status uncertain — re-verify now that the current push is live (see baseline-correction note).**
2. **`0.6.5` Flight Smart Import: fully closed.** GO in QA, Production live — build `0.6.5-a915a440`, deploy `6a9464b101a1690008db8823`, state `ready` — and the live Hotel + Flight import test against Production is confirmed (2026-08-31).
3. ~~Product Owner signs in and drives the live import test~~ — **done.**
4. Remaining from the Production push: (a) re-verify Alpha 0.6.4's actual Production-live status directly — **still open**; (b) check Netlify AI Gateway billing/usage before real user traffic ramps up — **still open**; (c) decide who beyond the Product Owner and the QA account should be added to the Production allowlist — **still open, deliberately deferred.** The uncommitted test-fixture changes and the stray committed junk file are both resolved and pushed (`e0be719`, `128eaba`).
5. **`0.6.6` (Attraction/Event + three folded-in `0.6.5` Production findings): implementation complete as of `V53`, awaiting Product Owner install and acceptance.** All seven `AE-001`–`AE-007` benchmark cases and `V6-F49`–`V6-F51` have named, passing regression tests; the full quality gate passes; build identifier `0.6.6-128eabae`. **Next, and only the Product Owner can do this per the standard's responsibility split:** install the package, run `EXECUTABLE_TEST_SESSION_V184.md` one test at a time — including the mandatory `AE-001` wild-card test and, especially, the one still-open verification step neither the discovery document nor this implementation could close: a real official venue/museum/OTA URL test end-to-end (every URL tested so far was a ticket-resale platform, the side expected to safe-fail) — then assign any findings and decide GO/NO-GO. Production stays on `0.6.5` until that GO. Restaurant is shelved, not scheduled — `RESTAURANT_SMART_IMPORT_DISCOVERY_V1.md` (`V2`) stays available as a future candidate.
6. ~~Decide when to add an Activity item type to the roadmap~~ — **resolved as of `V49`: it already exists, no roadmap decision needed.**
7. Keep Alpha 0.6 limited to Hotel, Flight (`0.6.5`) and Attraction/Event (`0.6.6`) Smart Import and direct existing-item attachment; do not mix in Alpha 0.7 synchronization, Multi-trip, Shopping, Transport or task-expansion work.
8. After Alpha 0.6 fully closes (both `0.6.5` and `0.6.6` live and verified), proceed to the reassigned Alpha 0.7 scope — now also carrying: Task creation from the global "+", the Today packing-list shortcut, the smarter Today-alerting backlog item, and the Flight route-location label wording note — followed by Beta 0.8, Beta 0.9 and RC 0.10.

## 10. Process-rule pointers

Two process rules that were originally recorded directly in this delivery plan have a single canonical home now: `VERSION_PACKAGE_AUTHORING_STANDARD_V25.md`, under its "Responsibility split" and "Controlled-document revision rule" sections respectively. The original wording, preserved for the record, is in `MVP_DELIVERY_HISTORY_V1.md`.
