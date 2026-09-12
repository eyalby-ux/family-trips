# Family Trips Alpha 0.7.2 — Executable Acceptance Test Session

**Document revision:** `V7`
**Candidate:** `0.7.2` (multi-Trip ownership + Shared-Trip Owner/Editor roles, real Firestore/Storage datastore), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.2-06aaff10`, deploy `6aa419819910cec4b6bdd85e`)
**Session number:** `V1`. NO-GO stands from the Product Owner's `V6` retest, which found the `V6` correction's Test 7 and Test 8 fixes did not hold up (Test 7 unchanged CORS failure; Test 8 regressed to a hard crash). See the `V7` change-history row and Finding register for what changed this round: Test 7 is now **confirmed fixed by the Product Owner's own live retest on both accounts** (a genuine GCS bucket CORS configuration, not a code change); Test 8 has real error handling added but is not claimed fixed, only hardened, pending a live retest; Test 5 now has a working `qa`-only debug hook for a real live check. Test 4's scope question remains open.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V50.md`.

**The `V6` round's two "fixed and regression-tested" claims did not survive the Product Owner's retest** — recorded honestly rather than glossed over, because it matters for how the results below should be read: Test 7's `getBytes()` change was based on a wrong assumption (that the Storage SDK's download path is exempt from CORS the way uploads appear to be — it is not; `getBytes()` still issues a real cross-origin request, confirmed by the retest showing the identical rejection via `XMLHttpRequest` instead of `fetch`), and Test 8's fix made the failure worse (an empty-Trip screen became a hard crash), because it unblocked a code path — Firestore's real-time listeners — that had never run offline before and had its own separate, pre-existing gap (no error handling at all).

**This round:**

- **Test 7 — now genuinely fixed and confirmed.** No code change resolves this; it required the Storage bucket's own GCS CORS configuration, applied directly by the Product Owner via Cloud Shell (`gsutil cors set`, allowing the `qa` and Production origins). **Confirmed working by the Product Owner's own live retest, on both accounts.**
- **Test 8 — hardened, not claimed fixed.** The specific gap that turned this into a crash is closed: `subscribeToTrip()`'s Firestore listeners never had an error callback (a gap present since this module's first version, only exercised once the `V6` auth-restore fix let `boot()` reach this code offline for the first time). Every listener now has one, wired through to a visible error message instead of a blank page, with a top-level `boot()` backstop as well. **This cannot be verified as a complete fix from this environment** — there is no way to simulate true offline conditions against a real Firestore session here — only that the failure mode should now degrade visibly instead of crashing silently. A live retest is still needed.
- **Test 5 — tooling gap closed.** The Product Owner's own attempt at a live console check failed on tooling, not a rules result: this app's modular Firebase SDK exposes no global `firebase`/`db` object. A `qa`-only debug hook (`window.__ft = {auth, db, storage}`, gated on the `qa` origin at runtime, never exposed on Production) is now live, making a real live check possible.

All of this is covered by regression tests (`tests/v7-2-firestore-migration.mjs`, 42 tests) — though, per the above, a passing regression suite is explicitly not being treated as sufficient evidence of a live fix this round. **Test 4's finding (Smart Import unavailable to Editors) is still not addressed** — the original `0.7.2` design document and kickoff explicitly scoped Smart Import as Owner-only through this candidate, with Editor-level processing permission assigned to `0.7.5`. Expanding it now would be a real scope change beyond what was approved, not a bug fix — still awaiting an explicit Product Owner decision.

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
| V7 | 2026-09-12 | Records that the `V6` correction's two claimed fixes did not survive retest (Test 7 unchanged CORS failure; Test 8 regressed to a hard crash), acknowledged directly rather than glossed over. This revision: Test 7 closed via a genuine GCS bucket CORS configuration (applied directly by the Product Owner, not a code change) and confirmed working on both accounts; Test 8 given real error handling closing the specific gap that turned the failure into a crash, explicitly not claimed as a complete fix (cannot be verified offline from this environment); Test 5's tooling gap closed with a live `qa`-only debug hook (`window.__ft`). Test 4 remains an open scope question. Build identifier updated to `0.7.2-06aaff10`. The NO-GO stands; session remains open pending a live retest of Tests 5 and 8 and a decision on Test 4. |
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

**Result (initial):** ☑ Deferred — notes: Product Owner's call: this is a direct server-side security-rule check via raw Firestore access in DevTools, not a normal UI click-through — better suited to the Development Agent confirming and reporting it than to manual live-QA execution.

**Development Agent's response:** a logic-equivalent proof, not a live execution (see the note above the tests and its Finding register row) — explicitly presented as not a substitute for a real live check.

**Product Owner attempted the live console check** after the Test 7/8 retest results raised doubt about accepting unverified fix claims. Blocked on a technical detail, not a rule-enforcement result: the app uses the modern modular Firebase SDK (confirmed in `src/firebase.js`), which never creates a global `firebase` object — the suggested one-line console command failed with `Uncaught ReferenceError: firebase is not defined`, because there is nothing on `window` for the console to reach into. **Still Deferred** — awaiting a small, `qa`-only, temporary debug hook (e.g. `window.__qaDebug` exposing the existing Firestore connection) from the Development Agent so a reliable live console check becomes possible. Not a finding about the rules themselves — a tooling gap in how to test them live.

## Test 6 — Migration of pre-existing local data (skip with a note if neither account has any)

On whichever account (if any) still has real pre-0.7.2 Trip data sitting locally (this build's predecessor never having been used since upgrading), open Trip Settings and confirm the migration banner appears ("העברת טיול קיים למערכת המשותפת"). Tap it, confirm it completes and reports success, and spot-check that the migrated Trip's items/tasks/packing/documents all genuinely match what was there before — not just that the button didn't error. Confirm the original local data is still present afterward (this build does not clear it automatically).

**Expect:** An explicit, verified migration that neither silently loses data nor silently runs without being asked.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — Attachments survive the move to Firebase Storage

On either account, attach a document/image to an item (or use one already attached, migrated in Test 6). Confirm it can still be opened/previewed exactly as before. Upload a new attachment and confirm it opens correctly too — this confirms Firebase Storage (replacing the old per-device IndexedDB store) is genuinely wired end-to-end, not just that the write succeeded.

**Expect:** Attachments work exactly as before from the user's perspective, now backed by Storage instead of a local-only store.

**Result (build `0.7.2-be094295`):** ☑ FAIL — notes: "Can't open." Console shows: `Access to fetch at 'https://firebasestorage.googleapis.com/v0/b/family-trips-9aef4.firebasestor...' from origin 'https://qa--familytripz.netlify.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`, followed by `net::ERR_FAILED 200 (OK)` and `TypeError: Failed to fetch`. Attachment cannot be opened/previewed at all.

**Retest (build `0.7.2-c436685f`, after `getBytes()` fix):** ☑ STILL FAIL — notes: "Still fails." Console now shows the *same* CORS rejection, just via `XMLHttpRequest` instead of `fetch`: `Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/family-trips-9aef4.firebasestor...398b3aa230f98...' from origin 'https://qa--familytripz.netlify.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`, twice, each followed by `net::ERR_FAILED 200 (OK)`. This directly contradicts the fix's stated reasoning that `getBytes()` avoids the bucket's CORS requirement entirely — it evidently still issues a cross-origin XHR against `storage.googleapis.com` under the hood, which the bucket's CORS config still needs to allow. The underlying GCS bucket CORS configuration issue was not actually resolved by this code change.

**Retest (build `0.7.2-06aaff10`, after direct GCS bucket CORS configuration):** ☑ PASS — notes: "Works in both accounts." The Product Owner applied CORS directly to the bucket via Cloud Shell (`gsutil cors set cors.json gs://family-trips-9aef4.firebasestorage.app`, allowing the `qa` and Production origins for `GET`) — no app code or deploy involved in this final fix. Confirmed working on both Account A and Account B.

## Test 8 — Short regression (confirm nothing else broke, including Smart Import)

Spot-check Smart Import still works end-to-end for at least one type (e.g. a Hotel or Flight source) — `0.7.2` touches how the Trip's data is stored but not the extraction pipeline itself. Confirm `0.7.1`'s four items (global-"+" Task creation, Today packing shortcut, category-preset Add, Task priority/filters) still work unchanged. Confirm offline behavior: put the device in airplane mode, reload the app, and confirm the last-loaded Trip is still available (per the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant) rather than showing a blank or error screen.

**Result (build `0.7.2-be094295`):** ☑ FAIL — notes: "Offline mode - all the data is gone, and it displays an empty trip. All other functionalities are working." Smart Import spot-check and 0.7.1's four items all confirmed working; the offline/airplane-mode check violates the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant.

**Retest (build `0.7.2-c436685f`, after Auth-restore fix):** ☑ STILL FAIL, and worse — notes: "Fail - after refresh during offline - white page." The empty-Trip screen has regressed to a hard failure (blank/white page) on offline cold reload, rather than showing an empty Trip. The Auth-restore fix did not resolve the underlying invariant break and appears to have introduced a crash on this path.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| No entry point anywhere in the app to create a second, independent Trip ("התחלת טיול חדש" is missing from Trip Settings — only the current Trip's own settings, delete-data/delete-trip, and build info are shown) | Test 2 | Blocking | Reported by Product Owner 2026-09-11. **Fixed and confirmed**, build `0.7.2-2504e672`: `tripsSection()` was hiding its own "start a new Trip" button behind a gate meant only for the Trip *list*, not the create action — the button is now always rendered. Product Owner retested — PASS. |
| No "שיתוף הטיול" (share Trip) section or any invite-Editor-by-email UI anywhere in Trip Settings | Test 3 (also blocks 4, 5) | Blocking | Reported by Product Owner 2026-09-11 alongside the Test 2 finding. **Fixed and confirmed**, build `0.7.2-2504e672`: the section was correctly wired in, but its own Owner-only gate (`state.trip.ownerUid===currentUid()`) could never pass for a Trip created in the current session, since `ownerUid` was only ever populated by the real-time Firestore listener, which a brand-new Trip never goes through. `ensureTrip()` now sets it directly. Product Owner retested after a full reload — PASS. |
| Smart Import is not available to Editors — Product Owner expects Editors to have this capability | Test 4 | Non-blocking (scope question) | Reported by Product Owner 2026-09-11. **Not a bug** — the original `0.7.2` design document and kickoff explicitly scoped Smart Import as Owner-only through this candidate (Editor-level processing permission is `0.7.5`'s job). Expanding it now would be a real scope change, not a fix. **Awaiting an explicit Product Owner decision**: expand it now as part of this correction, defer it to `0.7.5` as originally scoped, or something else — not something to silently implement or silently drop. |
| Attachments cannot be opened — Firebase Storage requests are blocked by CORS (`No 'Access-Control-Allow-Origin' header`), resulting in `TypeError: Failed to fetch` | Test 7 | Was blocking | Reported by Product Owner 2026-09-11. First attempted fix (`getBytes()`) did not resolve it — confirmed a wrong assumption about the SDK, not a real fix. **Actually fixed**, build `0.7.2-06aaff10`: GCS bucket CORS configuration applied directly by the Product Owner (`gsutil cors set`, `qa`/Production origins, `GET`) — no code change involved in the real fix. **Confirmed working on both accounts.** Closed. |
| Offline/airplane-mode cold launch shows an empty Trip instead of the last-loaded Trip's data — breaks the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant | Test 8 | Blocking | Reported by Product Owner 2026-09-11. First attempted fix (Auth-restore) made it worse — a crash instead of an empty Trip — by unblocking a code path (Firestore listeners) with its own separate, pre-existing gap: no error handling at all. Build `0.7.2-06aaff10` adds real error handling at every level (listener → `openTrip()` → a `boot()` backstop) so a failure can no longer crash silently. **Not claimed fixed** — genuinely cannot be verified from this environment (no way to simulate true offline conditions against a real Firestore session here). Awaiting a live retest. |
| Test 5 (server-side rule enforcement) deferred by the Product Owner to the Development Agent | Test 5 | N/A (verification method, not a finding) | Development Agent provided a logic-equivalent proof (not a live execution), not accepted as sufficient given Tests 7/8's fixes didn't hold up. Product Owner's own live console attempt then hit a tooling gap (no global `firebase`/`db` object with the modular SDK). **Closed**: `window.__ft = {auth, db, storage}` is now live on `qa` (gated on the `qa` origin, never exposed on Production), making a real live console check possible. Awaiting that live retest. |

## Session status

**Test 7 closed and confirmed.** Test 8 hardened, awaiting a live retest — not claimed fixed. Test 5's tooling gap closed (debug hook live), awaiting a live retest. Test 4's scope question remains open pending a Product Owner decision. All code changes regression-tested (251/251 assertions) and deployed to `qa` (`0.7.2-06aaff10`).

## GO/NO-GO decision

**NO-GO stands from `V6`.** This revision does not itself record a new GO — three of the four open items still need a live retest or decision:
- **Test 7 (Storage CORS): confirmed fixed.** The Product Owner applied the actual fix directly (GCS bucket CORS configuration, not a code change) and confirmed attachments now open on both accounts.
- **Test 8 (offline invariant): hardened, not confirmed fixed.** Real error handling closes the specific gap that turned the failure into a crash, but this genuinely cannot be verified as a complete fix from this environment. Awaiting a live retest.
- **Test 5 (server-side enforcement): tooling gap closed, not yet retested live.** `window.__ft` is now available on `qa` for a real console check.
- **Test 4:** still an open scope decision, not a fix — Smart Import for Editors.

Session remains open pending a live retest of Tests 5 and 8, and a decision on Test 4.
