# Family Trips Alpha 0.7.2 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.2` (multi-Trip ownership + Shared-Trip Owner/Editor roles, real Firestore/Storage datastore), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.2-2217faeb`, deploy `6aa3b5218010f146fc816a68`)
**Session number:** `V1`, opening a new per-candidate session sequence for `0.7.2`.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V44.md`.

**Before this session can run at all — two one-time Console actions, not yet performed by this Development Agent (see the 0.7.2 implementation report for exactly why and the exact content to paste):**
1. Deploy `firestore.rules` and `storage.rules` (Firebase Console → Firestore Database → Rules / Storage → Rules → paste → Publish).
2. Seed `config/appInvitations` with the two invited emails (Firebase Console → Firestore Database → Data → new document).

Until both are done, every Firestore/Storage operation in the app will fail with a permission error (the databases are currently locked down to deny all access, confirmed live) — this is expected, not a defect, and every test below will fail identically until the seeding is complete.

**This candidate needs two real accounts, not one** — Owner/Editor role enforcement is only meaningfully testable with a genuine second Google account, unlike every candidate through `0.7.1`. Test accounts needed:
- **Account A (Owner)** — the Product Owner's own account, `eyalby@gmail.com`.
- **Account B (Editor)** — the second invited account, `paolakohan@gmail.com`, or any other real Google account already listed in `config/appInvitations`.

**Migration note:** if either account has an existing pre-0.7.2 Trip (data saved under this build's predecessor, still sitting in that browser's `localStorage`), Test 6 below covers migrating it. If neither account has pre-existing local data, Test 6 can be skipped and noted as such — not a gap, since a freshly invited account has nothing to migrate.

## Document change history

| Document revision | Date | Change |
|---|---|---|
| V1 | 2026-09-11 | Initial session drafted by the Development Agent for the `0.7.2` candidate, 8 tests, all results blank pending the Product Owner's run and the two Console actions above. |

---

## Test 1 — Create a Trip, become its Owner, isolation confirmed

On Account A, sign in and create a new Trip (or use an existing one if already migrated — see Test 6). Confirm the Trip loads normally — Today, Trip Center, adding an item all work exactly as before `0.7.2`. On Account B (a separate browser/profile/device), sign in and confirm this Trip is **not** visible or reachable in any way — no Trip switcher entry, no way to guess into it.

**Expect:** Account A can create and use a Trip normally; Account B has zero visibility into it until explicitly granted access.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 2 — Second Trip, Trip switcher

On Account A, create a second, independent Trip (Settings → "התחלת טיול חדש"). Confirm both Trips are fully separate — items/tasks/packing in one never appear in the other. Confirm Settings → "הטיולים שלי" lists both, and tapping the other one switches the active Trip and its content correctly.

**Expect:** Multiple Trips coexist, fully isolated, switchable from Trip Settings.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

## Test 3 — Add an Editor by email

On Account A (Owner), open Trip Settings → "שיתוף הטיול" and add Account B's email. Confirm it appears in the list. On Account B, sign in (or refresh if already signed in) and confirm the shared Trip now appears in its Trip switcher, reachable and showing the same content Account A sees.

**Expect:** A minimal, functional Owner→Editor grant by email; the Editor sees the Trip on their next sign-in, per the design's own stated placeholder scope (no invitation-acceptance flow yet — that's `0.7.5`'s job).

**Result:** ☐ PASS ☐ FAIL — notes: ___________

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
| — | — | — | — |

## GO/NO-GO decision

_To be recorded by the Product Owner after all eight tests above are run. Production promotion additionally requires the same rollback-backup discipline as every prior candidate — and, for this candidate specifically, confirming the deployed security rules and seeded invitation document are the intended production values, not left over from qa-only testing._
