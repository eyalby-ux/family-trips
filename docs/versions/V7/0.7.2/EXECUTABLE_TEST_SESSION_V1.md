# Family Trips Alpha 0.7.2 — Executable Acceptance Test Session

**Document revision:** `V5`
**Candidate:** `0.7.2` (multi-Trip ownership + Shared-Trip Owner/Editor roles, real Firestore/Storage datastore), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.2-2504e672`, deploy `6aa40af8e9b537572228c2fe`)
**Session number:** `V1`, opening a new per-candidate session sequence for `0.7.2`. Tests 1–3 have recorded results (see below); Tests 4–8 remain to run. See the `V5` change-history row and the Finding register for the correction just applied to both blocking findings from Tests 2 and 3.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V48.md`.

**Live testing has found and closed seven real bugs against this candidate so far**, per this project's standing discipline of fixing and reporting rather than only reporting: (1) a crash immediately after sign-in (`render()` called `empty()` instead of passing it as a reference); (2) a `403` on a brand-new Trip's very first attachment upload (Storage's rule check needs the Trip's Firestore document to exist first, but the upload path never waited for it); (3) the same class of bug in "reset/delete Trip" for a never-yet-synced Trip; (4) the Trip switcher not picking up a newly-created second Trip until the next reload; (5) a `firestore.rules` catch-22 that kept #2 failing even after the ordering fix — confirmed working end-to-end by the Product Owner's own live retest; (6) **the two blocking findings below** — no "start a new Trip" entry point anywhere (`tripsSection()` hid its own create-Trip button behind a chicken-and-egg "only show this once you already have another Trip" gate) and no "שיתוף הטיול" sharing section at all (`state.trip.ownerUid` was never populated in memory for a Trip created in the current session, since that only ever happened via the real-time Firestore listener, which a brand-new Trip never goes through). All seven are covered by new regression tests (`tests/v7-2-firestore-migration.mjs`, 35 tests). **Please reload the app fully before resuming from Test 2** — Test 3's fix depends on the real-time listener re-populating `ownerUid` for your existing Trip, which only happens on a fresh load, not just navigating around.

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

**Result:** ☑ FAIL — notes: "There is no option to create a new independent trip." Trip Settings (screenshot) shows only the current Trip's own settings (name/dates), "מחיקה ואיפוס" (delete data / delete trip), and build info — no "התחלת טיול חדש" entry point anywhere. Product Owner: this is a blocker to be fixed.

## Test 3 — Add an Editor by email

On Account A (Owner), open Trip Settings → "שיתוף הטיול" and add Account B's email. Confirm it appears in the list. On Account B, sign in (or refresh if already signed in) and confirm the shared Trip now appears in its Trip switcher, reachable and showing the same content Account A sees.

**Expect:** A minimal, functional Owner→Editor grant by email; the Editor sees the Trip on their next sign-in, per the design's own stated placeholder scope (no invitation-acceptance flow yet — that's `0.7.5`'s job).

**Result:** ☑ Blocked — notes: Same Trip Settings screen has no "שיתוף הטיול" (share Trip) section or any invite-by-email entry point at all — reported directly by the Product Owner alongside Test 2's finding. Cannot be tested until this exists. Second blocker.

## Test 4 — Editor can edit content but not perform Owner-only actions

On Account B (now an Editor on Account A's Trip), confirm normal editing works: add an item, toggle a packing item, create a task. Confirm these changes appear on Account A's own view of the same Trip (may need a refresh — `0.7.2`'s own scope does not include live conflict-resolution/merge, only that both sides eventually see the same data). Separately, confirm Account B does **not** see the "שיתוף הטיול" section at all in Trip Settings (Owner-only), and cannot delete or reset the Trip (Trip Settings' danger-zone actions).

**Expect:** An Editor has real read/write access to Trip content, but Trip Settings' sharing controls and destructive actions remain invisible/unavailable to them.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 5 — Server-side enforcement, not just hidden UI

This is the one test that needs a technical check beyond normal app usage, since it's specifically testing that access control isn't merely a client-side UI decision. On Account B, open the browser's DevTools console and attempt a raw Firestore read/write against a Trip Account B has **not** been granted access to (any `tripId` neither owned nor shared) — e.g. via the Firestore SDK already loaded on the page. Confirm this is rejected with a permission error, not merely hidden from the UI.

**Expect:** Firestore's own security rules reject the unauthorized access directly — the same enforcement a determined user bypassing the UI entirely would hit, matching `ARCHITECTURE_CURRENT_STATE.md`'s existing "Client-side hidden UI is not an authorization boundary" principle.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 6 — Migration of pre-existing local data (skip with a note if neither account has any)

On whichever account (if any) still has real pre-0.7.2 Trip data sitting locally (this build's predecessor never having been used since upgrading), open Trip Settings and confirm the migration banner appears ("העברת טיול קיים למערכת המשותפת"). Tap it, confirm it completes and reports success, and spot-check that the migrated Trip's items/tasks/packing/documents all genuinely match what was there before — not just that the button didn't error. Confirm the original local data is still present afterward (this build does not clear it automatically).

**Expect:** An explicit, verified migration that neither silently loses data nor silently runs without being asked.

**Result:** ☐ PASS ☐ FAIL — notes: ___________ (or ☐ Skipped — no pre-existing local data on either test account)

## Test 7 — Attachments survive the move to Firebase Storage

On either account, attach a document/image to an item (or use one already attached, migrated in Test 6). Confirm it can still be opened/previewed exactly as before. Upload a new attachment and confirm it opens correctly too — this confirms Firebase Storage (replacing the old per-device IndexedDB store) is genuinely wired end-to-end, not just that the write succeeded.

**Expect:** Attachments work exactly as before from the user's perspective, now backed by Storage instead of a local-only store.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 8 — Short regression (confirm nothing else broke, including Smart Import)

Spot-check Smart Import still works end-to-end for at least one type (e.g. a Hotel or Flight source) — `0.7.2` touches how the Trip's data is stored but not the extraction pipeline itself. Confirm `0.7.1`'s four items (global-"+" Task creation, Today packing shortcut, category-preset Add, Task priority/filters) still work unchanged. Confirm offline behavior: put the device in airplane mode, reload the app, and confirm the last-loaded Trip is still available (per the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant) rather than showing a blank or error screen.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| No entry point anywhere in the app to create a second, independent Trip ("התחלת טיול חדש" is missing from Trip Settings — only the current Trip's own settings, delete-data/delete-trip, and build info are shown) | Test 2 | Blocking | Reported by Product Owner 2026-09-11. **Fixed**, build `0.7.2-2504e672`: `tripsSection()` was hiding its own "start a new Trip" button behind a gate meant only for the Trip *list*, not the create action — the button is now always rendered. Regression-tested. Awaiting retest. |
| No "שיתוף הטיול" (share Trip) section or any invite-Editor-by-email UI anywhere in Trip Settings | Test 3 (also blocks 4, 5) | Blocking | Reported by Product Owner 2026-09-11 alongside the Test 2 finding. **Fixed**, build `0.7.2-2504e672`: the section was correctly wired in, but its own Owner-only gate (`state.trip.ownerUid===currentUid()`) could never pass for a Trip created in the current session, since `ownerUid` was only ever populated by the real-time Firestore listener, which a brand-new Trip never goes through. `ensureTrip()` now sets it directly. Regression-tested. Awaiting retest — **requires a full app reload** for an already-existing Trip (see note above the tests). |

## Session status

**Resuming.** Both blocking findings from the 2026-09-11 pause are fixed, regression-tested, and deployed (`0.7.2-2504e672`) as of this revision. Tests 1 and 2 have recorded results (PASS / FAIL — Test 2's FAIL predates this fix); Tests 3–8 remain to run. Please reload the app and resume from Test 2.

## GO/NO-GO decision

_Not yet reached — session paused with two blocking findings outstanding (see above). To be recorded by the Product Owner once corrections are made and testing resumes/completes. Production promotion additionally requires the same rollback-backup discipline as every prior candidate — and, for this candidate specifically, confirming the deployed security rules and seeded invitation document are the intended production values, not left over from qa-only testing._
