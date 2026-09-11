# Family Trips Alpha 0.7.2 — Executable Acceptance Test Session

**Document revision:** `V6`
**Candidate:** `0.7.2` (multi-Trip ownership + Shared-Trip Owner/Editor roles, real Firestore/Storage datastore), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.2-c436685f`, deploy `6aa4149d0661c7af7c2d8c26`)
**Session number:** `V1`. All 8 tests have recorded results and the Product Owner recorded a NO-GO with two blocking findings open (Tests 7 and 8) plus Test 5 deferred to the Development Agent and a non-blocking scope question from Test 4 — see the `V6` change-history row and Finding register for the correction now applied to Tests 5, 7 and 8. Test 4's scope question is still open, awaiting a Product Owner decision (see its finding register row).
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V49.md`.

**Live testing has found and closed ten real bugs against this candidate so far**, per this project's standing discipline of fixing and reporting rather than only reporting. In addition to the seven recorded through `V5` (sign-in crash, Storage-upload ordering, reset/delete on an unsynced Trip, stale Trip switcher, a `firestore.rules` create catch-22, and the two Trip Settings entry-point gaps from Tests 2/3), this revision closes the two blocking findings the NO-GO left open and addresses the deferred Test 5:

- **Test 7 (blocking, "Can't open" — live CORS rejection).** `getDownloadURL()`+`fetch()` is a raw cross-origin browser request to `storage.googleapis.com` that needs the Storage bucket's own CORS configuration — a separate GCS infrastructure step, not deployable through this repo or Firebase's rules system. Switched to `getBytes()`, which downloads through the Storage SDK's own network layer (the same mechanism uploads already used successfully) — **no bucket CORS configuration needed at all.**
- **Test 8 (blocking, offline cold launch showed an empty Trip).** `boot()` needs a restored `auth.currentUser` to know which Trip to open, but `main.js`'s offline cold-launch path deliberately skipped Firebase Auth initialization entirely — safe under the old, pure-`localStorage` architecture, silently broken once `boot()` started depending on a restored session. Restoring an *already-persisted* session from IndexedDB is itself local, not network work, so it now still runs in that branch (unlike `getRedirectResult()` or the live auth-state stream, both still correctly skipped offline).
- **Test 5 (deferred to the Development Agent).** No Firebase emulator or second real authenticated session is available in this environment (an established limitation throughout this project), so this cannot be a live execution of the deployed rules. Instead, `hasTripAccess`/`isOwner`/`isEditor`'s exact boolean logic is reimplemented as a pure function — kept honest by asserting the deployed rule *text* matches what it mirrors — and exercised against every access pattern the test describes, including the specific "invited but neither Owner nor Editor of this Trip" case. **Stated plainly: this is logic-equivalent to the deployed rules, not a live execution of them** — a genuine live retest by the Product Owner (or Account B) remains valuable and is not being presented as a substitute for one.

All ten are covered by regression tests (`tests/v7-2-firestore-migration.mjs`, 38 tests). **Test 4's finding (Smart Import unavailable to Editors) is not addressed here** — the original `0.7.2` design document and kickoff explicitly scoped Smart Import as Owner-only through this candidate, with Editor-level processing permission assigned to `0.7.5`. Expanding it now would be a real scope change beyond what was approved, not a bug fix — flagged for an explicit Product Owner decision rather than silently implemented or silently left unaddressed.

**Both one-time Console actions this session originally required, plus one re-publish following fix #5, are complete** — performed directly by the Product Owner on 2026-09-11: `firestore.rules`/`storage.rules` published; `config/appInvitations` seeded with `{emails: ["eyalby@gmail.com", "paolakohan@gmail.com"]}` (confirmed against a Console screenshot); `firestore.rules` re-published a second time after fix #5, confirmed working by the Product Owner's own live retest.

**This candidate needs two real accounts, not one** — Owner/Editor role enforcement is only meaningfully testable with a genuine second Google account, unlike every candidate through `0.7.1`. Test accounts:
- **Account A (Owner)** — the Product Owner's own account, `eyalby@gmail.com`. Already signed into the `qa` build.
- **Account B (Editor)** — `paolakohan@gmail.com`. Not yet signed in as of this revision — needed for Tests 3, 4 and 5 specifically; Tests 1, 2, 6, 7 and 8 can be run solo on Account A first.

**Known, pre-existing, unrelated data:** the Firestore project already contains an orphaned `trips/dolomites` document from earlier, unrelated work — it has no `ownerUid`/`editorEmails` fields, so the `0.7.2` security rules cannot grant it access and it will never appear in the app's Trip switcher or any query. No action needed; not in scope for this session.

**Migration note:** if either account has an existing pre-0.7.2 Trip (data saved under this build's predecessor, still sitting in that browser's `localStorage`), Test 6 below covers migrating it. If neither account has pre-existing local data, Test 6 can be skipped and noted as such — not a gap, since a freshly invited account has nothing to migrate.

**Known, non-blocking gap, found during the same round of fixes, not yet closed:** deleting an individual attachment or Item never removes its underlying file from Firebase Storage (`deleteAttachment`, `cloud-store.js`, is only ever called from the whole-Trip-deletion path) — an orphaned-storage-cost hygiene gap, not a functional defect; nothing in this session's 8 tests exercises it. Flagged here rather than left silently unmentioned.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V6 | 2026-09-11 | Records the correction for the NO-GO's two blocking findings (Test 7 Storage CORS, Test 8 offline invariant) and the deferred Test 5, per the note above and the Finding register. Both blocking findings fixed and regression-tested; Test 5 given a Development-Agent-side proof, explicitly not a live rules execution. Test 4's Smart-Import-for-Editors gap left open as a genuine scope question, not fixed -- awaiting a Product Owner decision. Build identifier updated to `0.7.2-c436685f`. GO/NO-GO not re-recorded here; the `V5` NO-GO stands pending retest. |
| V5 | 2026-09-11 | Records the correction for both blocking findings from the Product Owner's paused session (Test 2: no start-new-Trip entry point; Test 3: no sharing section) -- both fixed, regression-tested, and deployed (`0.7.2-2504e672`). Finding register dispositions updated from "reported, session paused" to "Fixed, awaiting retest"; session status changed from Paused to Resuming. Adds a reload note: Test 3's fix depends on the real-time Firestore listener re-populating `ownerUid` for an already-existing Trip, which requires a full app reload, not just navigating around. |
| V4 | 2026-09-11 | Records a fifth bug (`firestore.rules`' create-existence-check catch-22, see the note above) found while the Product Owner continued testing after `V3`'s four fixes — fixed, regression-tested, and **confirmed working end-to-end by the Product Owner's own live retest** of the attachment-upload flow. Build identifier updated to `0.7.2-be094295`; `firestore.rules` re-published a second time (Storage rules unaffected, not re-published). No test result formally recorded yet. |
| V3 | 2026-09-11 | Records four bugs found during the Product Owner's own live testing on this build (two reported directly, two more found by the Development Agent proactively auditing the same root-cause class before they could surface the same way) — all fixed, regression-tested, and redeployed; build identifier updated to `0.7.2-610c0ab0`. Adds the known non-blocking Storage-orphan gap. No test result formally recorded yet — testing is in progress against this build. |
| V2 | 2026-09-11 | Pre-session revision: records that both one-time Console actions (rules deploy, `config/appInvitations` seed) are now complete, performed directly by the Product Owner and confirmed against a Console screenshot; notes the pre-existing, unrelated `trips/dolomites` orphaned document found during that verification; records that Account A is already signed in and suggests running Tests 1/2/6/7/8 solo before bringing in Account B for Tests 3/4/5. No test results changed — session number stays `V1`, no round has been run yet. |
| V1 | 2026-09-11 | Initial session drafted by the Development Agent for the `0.7.2` candidate, 8 tests, all results blank pending the Product Owner's run and the two Console actions above. |

---

## Test 1 — Create a Trip, become its Owner, isolation confirmed

On Account A, sign in and create a new Trip (or use an existing one if already migrated — see Test 6). Confirm the Trip loads normally — Today, Trip Center, adding an item all work exactly as before `0.7.2`. On Account B (a separate browser/profile/device), sign in and confirm this Trip is **not** visible or reachable in any way — no Trip switcher entry, no way to guess into it.

**Expect:** Account A can create and use a Trip normally; Account B has zero visibility into it until explicitly granted access.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Second Trip, Trip switcher

On Account A, create a second, independent Trip (Settings → "התחלת טיול חדש"). Confirm both Trips are fully separate — items/tasks/packing in one never appear in the other. Confirm Settings → "הטיולים שלי" lists both, and tapping the other one switches the active Trip and its content correctly.

**Expect:** Multiple Trips coexist, fully isolated, switchable from Trip Settings.

**Result (retest on build `0.7.2-2504e672`):** ☑ PASS — notes: "Pass." Confirmed after the fix to `tripsSection()`'s create-button gating.

_Prior result (build `0.7.2-be094295`): FAIL — "There is no option to create a new independent trip." Trip Settings (screenshot) showed only the current Trip's own settings (name/dates), "מחיקה ואיפוס" (delete data / delete trip), and build info — no "התחלת טיול חדש" entry point anywhere. Fixed per Finding register._

## Test 3 — Add an Editor by email

On Account A (Owner), open Trip Settings → "שיתוף הטיול" and add Account B's email. Confirm it appears in the list. On Account B, sign in (or refresh if already signed in) and confirm the shared Trip now appears in its Trip switcher, reachable and showing the same content Account A sees.

**Expect:** A minimal, functional Owner→Editor grant by email; the Editor sees the Trip on their next sign-in, per the design's own stated placeholder scope (no invitation-acceptance flow yet — that's `0.7.5`'s job).

**Result (retest on build `0.7.2-2504e672`, after full reload):** ☑ PASS — notes: "Pass." Confirmed after the fix to `ensureTrip()` populating `ownerUid`/`editorEmails` at creation time.

_Prior result (build `0.7.2-be094295`): Blocked — no "שיתוף הטיול" (share Trip) section or any invite-by-email entry point existed at all. Fixed per Finding register._

## Test 4 — Editor can edit content but not perform Owner-only actions

On Account B (now an Editor on Account A's Trip), confirm normal editing works: add an item, toggle a packing item, create a task. Confirm these changes appear on Account A's own view of the same Trip (may need a refresh — `0.7.2`'s own scope does not include live conflict-resolution/merge, only that both sides eventually see the same data). Separately, confirm Account B does **not** see the "שיתוף הטיול" section at all in Trip Settings (Owner-only), and cannot delete or reset the Trip (Trip Settings' danger-zone actions).

**Expect:** An Editor has real read/write access to Trip content, but Trip Settings' sharing controls and destructive actions remain invisible/unavailable to them.

**Result:** ☑ PASS — notes: "Pass, but with one finding — Editor can't do Smart Import, and they should be able to." Core read/write access and Owner-only gating (sharing section, delete/reset) confirmed working as expected; Smart Import access for Editors flagged as a gap.

## Test 5 — Server-side enforcement, not just hidden UI

This is the one test that needs a technical check beyond normal app usage, since it's specifically testing that access control isn't merely a client-side UI decision. On Account B, open the browser's DevTools console and attempt a raw Firestore read/write against a Trip Account B has **not** been granted access to (any `tripId` neither owned nor shared) — e.g. via the Firestore SDK already loaded on the page. Confirm this is rejected with a permission error, not merely hidden from the UI.

**Expect:** Firestore's own security rules reject the unauthorized access directly — the same enforcement a determined user bypassing the UI entirely would hit, matching `ARCHITECTURE_CURRENT_STATE.md`'s existing "Client-side hidden UI is not an authorization boundary" principle.

**Result:** ☑ Deferred — notes: Product Owner's call: this is a direct server-side security-rule check via raw Firestore access in DevTools, not a normal UI click-through — better suited to the Development Agent confirming and reporting it (e.g., an automated regression test exercising the rules directly against a denied Trip ID and showing the rejection) than to manual live-QA execution. Routed back to the Development Agent; not run by the Product Owner in this session.

## Test 6 — Migration of pre-existing local data (skip with a note if neither account has any)

On whichever account (if any) still has real pre-0.7.2 Trip data sitting locally (this build's predecessor never having been used since upgrading), open Trip Settings and confirm the migration banner appears ("העברת טיול קיים למערכת המשותפת"). Tap it, confirm it completes and reports success, and spot-check that the migrated Trip's items/tasks/packing/documents all genuinely match what was there before — not just that the button didn't error. Confirm the original local data is still present afterward (this build does not clear it automatically).

**Expect:** An explicit, verified migration that neither silently loses data nor silently runs without being asked.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — Attachments survive the move to Firebase Storage

On either account, attach a document/image to an item (or use one already attached, migrated in Test 6). Confirm it can still be opened/previewed exactly as before. Upload a new attachment and confirm it opens correctly too — this confirms Firebase Storage (replacing the old per-device IndexedDB store) is genuinely wired end-to-end, not just that the write succeeded.

**Expect:** Attachments work exactly as before from the user's perspective, now backed by Storage instead of a local-only store.

**Result:** ☑ FAIL — notes: "Can't open." Console (screenshot) shows: `Access to fetch at 'https://firebasestorage.googleapis.com/v0/b/family-trips-9aef4.firebasestor...' from origin 'https://qa--familytripz.netlify.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`, followed by `net::ERR_FAILED 200 (OK)` and `TypeError: Failed to fetch`. Attachment cannot be opened/previewed at all.

## Test 8 — Short regression (confirm nothing else broke, including Smart Import)

Spot-check Smart Import still works end-to-end for at least one type (e.g. a Hotel or Flight source) — `0.7.2` touches how the Trip's data is stored but not the extraction pipeline itself. Confirm `0.7.1`'s four items (global-"+" Task creation, Today packing shortcut, category-preset Add, Task priority/filters) still work unchanged. Confirm offline behavior: put the device in airplane mode, reload the app, and confirm the last-loaded Trip is still available (per the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant) rather than showing a blank or error screen.

**Result:** ☑ FAIL — notes: "Offline mode - all the data is gone, and it displays an empty trip. All other functionalities are working." Smart Import spot-check and 0.7.1's four items all confirmed working; the offline/airplane-mode check violates the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| No entry point anywhere in the app to create a second, independent Trip ("התחלת טיול חדש" is missing from Trip Settings — only the current Trip's own settings, delete-data/delete-trip, and build info are shown) | Test 2 | Blocking | Reported by Product Owner 2026-09-11. **Fixed and confirmed**, build `0.7.2-2504e672`: `tripsSection()` was hiding its own "start a new Trip" button behind a gate meant only for the Trip *list*, not the create action — the button is now always rendered. Product Owner retested — PASS. |
| No "שיתוף הטיול" (share Trip) section or any invite-Editor-by-email UI anywhere in Trip Settings | Test 3 (also blocks 4, 5) | Blocking | Reported by Product Owner 2026-09-11 alongside the Test 2 finding. **Fixed and confirmed**, build `0.7.2-2504e672`: the section was correctly wired in, but its own Owner-only gate (`state.trip.ownerUid===currentUid()`) could never pass for a Trip created in the current session, since `ownerUid` was only ever populated by the real-time Firestore listener, which a brand-new Trip never goes through. `ensureTrip()` now sets it directly. Product Owner retested after a full reload — PASS. |
| Smart Import is not available to Editors — Product Owner expects Editors to have this capability | Test 4 | Non-blocking (scope question) | Reported by Product Owner 2026-09-11. **Not a bug** — the original `0.7.2` design document and kickoff explicitly scoped Smart Import as Owner-only through this candidate (Editor-level processing permission is `0.7.5`'s job). Expanding it now would be a real scope change, not a fix. **Awaiting an explicit Product Owner decision**: expand it now as part of this correction, defer it to `0.7.5` as originally scoped, or something else — not something to silently implement or silently drop. |
| Attachments cannot be opened — Firebase Storage requests are blocked by CORS (`No 'Access-Control-Allow-Origin' header`), resulting in `TypeError: Failed to fetch` | Test 7 | Blocking | Reported by Product Owner 2026-09-11, with console evidence. **Fixed**, build `0.7.2-c436685f`: `downloadAttachment()` switched from a raw cross-origin `fetch()` against the Storage download URL to `getBytes()`, which downloads through the Storage SDK's own network layer — no bucket CORS configuration needed. Regression-tested. Awaiting retest. |
| Offline/airplane-mode cold launch shows an empty Trip instead of the last-loaded Trip's data — breaks the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant | Test 8 | Blocking | Reported by Product Owner 2026-09-11. **Fixed**, build `0.7.2-c436685f`: `main.js`'s offline cold-launch path now restores the persisted Firebase Auth session (a local, not network, operation) before rendering, so `boot()` can determine which Trip to open from Firestore's own offline cache — previously it skipped Auth initialization entirely and always fell back to the empty state. Regression-tested. Awaiting retest. |
| Test 5 (server-side rule enforcement) deferred by the Product Owner to the Development Agent | Test 5 | N/A (verification method, not a finding) | **Addressed**: `hasTripAccess`'s exact logic reimplemented as a pure function, kept honest against the deployed rule text, and exercised against the specific denied-access pattern Test 5 describes. Explicitly not a live execution of the deployed rules (no emulator/second session available in this environment) — a genuine live retest remains valuable. |

## Session status

**Correction applied for Tests 5, 7 and 8; awaiting retest.** Test 4's scope question remains open pending a Product Owner decision — not fixed, not dropped. All fixes regression-tested (247/247 assertions) and deployed to `qa` (`0.7.2-c436685f`).

## GO/NO-GO decision

**NO-GO stands from `V5`** pending the retest below — this revision does not itself record a new GO. Recorded by the Product Owner (Eyal), 2026-09-11: two blocking findings (Test 7 CORS, Test 8 offline invariant) plus Test 5 deferred and Test 4's non-blocking scope gap. As of this revision: Tests 7 and 8 are fixed and regression-tested, awaiting the Product Owner's live retest; Test 5 has a Development-Agent-side proof (see its register row) but a live retest remains valuable; Test 4 awaits an explicit Product Owner scope decision, not a fix. Session remains open pending retest of Tests 5, 7 and 8 and a decision on Test 4.
