# Family Trips Alpha 0.7.5 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.5` (administer the sharing model — real invitation lifecycle, revoked-account quarantine/deletion, Editor-level Smart Import permission), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.5-8508e0cc`, deploy `6ab17aea7e6a29bceb481cc8` — a second `qa` redeploy, same commit `8508e0c`, after an unrelated build-environment problem was found and fixed: the first `qa` deploy of this build had a masked/invalid `VITE_FIREBASE_API_KEY` baked in from a local build-environment issue, unrelated to any `0.7.5` code, blocking sign-in entirely; re-deployed via Netlify's own build once the Product Owner corrected the Netlify environment variable configuration. This is the build every test below actually ran against.)
**Session number:** `V1`. GO recorded, 2026-09-21 — see the GO/NO-GO decision below.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**A real, live-invocation bug was found and fixed during this candidate's own `qa` deployment, before any of this session's tests began** — not by the design review or the local quality gate, both of which could not reproduce it. `admin-delete-account.mjs` crashed with a 502 on every real call: `firebase-admin/auth`'s own internal dependency (`jwks-rsa`) has an unfixed upstream bug that collides with this project's own `jose` package the moment that submodule is imported inside Netlify's actual bundled Function runtime — plain Node import checks and this project's own test harness never touch that runtime, so nothing before deployment could have caught it. Fixed by resolving the target account's Firebase Auth UID via a direct Identity Toolkit REST call instead of `firebase-admin/auth` (`netlify/functions/admin-delete-account.mjs`, commit `6c2b656`). Confirmed live: the endpoint now returns a normal `401 authentication_required` for an unauthenticated request instead of crashing. This is stated here so the first live test of the deletion action (Test 6) isn't the first time this path has ever actually run — it has, once, confirmed working through the authorization step; Test 6 is the first time it runs all the way through a real deletion.

**This candidate needs three real accounts, not two.** Owner/Editor-revocation testing needs a second real account, exactly like `0.7.2`/`0.7.3`; the deletion test (Test 6) additionally needs a **third, genuinely disposable** account — one you're comfortable being permanently deleted, since that's exactly what Test 6 does. Do not use a real family account for it.

- **Account A (Admin/Owner)** — your own account, `eyalby@gmail.com`. Already seeded with `isAdmin:true` at `invitations/eyalby@gmail.com` (confirmed by you before this deployment).
- **Account B (second test account)** — `paolakohan@gmail.com`, reused from `0.7.2`/`0.7.3`'s own testing. Used for the invite/revoke/Editor-Smart-Import tests (2, 3, 4, 7, 8) — none of these delete anything, so this account is safe to reuse.
- **Account C (disposable)** — a genuinely throwaway Google account, used only for Test 6. If you don't already have one set aside, create one before starting Test 6; nothing before it depends on Account C existing yet.

**One thing this session cannot verify from a single-device, human-paced test:** the exact wording of what an Editor sees when their own access is revoked mid-session (do they see a live error immediately, or only on their next action?) depends on Firestore's real-time listener timing, which isn't fully deterministic to script by hand. Test 3 asks you to attempt something as the revoked account shortly after revoking — "shortly after," not to the second — and record what actually happened, not what was expected.

## Test 1 — The admin panel is reachable and correctly shows you as administrator

Signed in as Account A, open Settings. Confirm a "ניהול מערכת" (Admin) section appears with a button into "ניהול הרשאות גישה" — this should NOT be visible if you sign in as Account B (not an admin). Open it; confirm your own account (`eyalby@gmail.com`) appears in the active-invitations list, marked "מנהל" (admin), with no revoke button next to it (an admin's own row has no self-revoke action).

**Expect:** Admin panel reachable from Settings, your own account listed and marked admin, admin panel not reachable/visible when signed in as Account B.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — Granting an application invitation, end to end

Still as Account A in the admin panel, invite Account B by email (if not already invited — it should already be, from prior testing; if so, confirm it's listed as active and skip the invite step itself, noting that). If Account B is not yet invited, revoke it first via this session's own flow isn't needed — just invite it and confirm it appears in the active list immediately.

**Expect:** Account B appears in the active-invitations list right after inviting (or is already there); no page reload needed to see it.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — Revoking immediately blocks access, server-side, not just UI-hidden

As Account A, revoke Account B's invitation from the admin panel. Then, **within the next minute or two**, switch to Account B's own already-signed-in session (a different browser/device/profile, still logged in from before) and attempt anything that touches the Trip — open a Trip, view an item, anything. This must fail with a real permission error, not merely have a button hidden.

**Expect:** Account B's already-open session is denied access shortly after revocation — record what you actually saw (an error message, a blank screen, how long after revoking it took effect) rather than just PASS/FAIL.

**Result:** ☑ PASS — notes: Confirmed as expected — after revoking Account B, its already-open session kept showing the locally-cached Trip data (the existing offline-cache behavior), but any actual cloud action (read/write against the live backend) was denied. This is the correct behavior for this test: revocation blocked real server-side access, not merely a hidden UI button — the local cache staying visible is expected/unrelated behavior (same as normal offline mode), not a leak of live access.

## Test 4 — Quarantined data is inaccessible but not deleted

Before revoking (or using a Trip Account B already owns from prior testing), confirm Account B owns at least one Trip. After Test 3's revocation, confirm via the Firebase Console that Account B's owned Trip document still exists in Firestore (it must — quarantine blocks access, it does not delete anything). Also confirm the admin panel's quarantine section now lists Account B with a days-since-revoked count and a disabled delete button (not yet 30 days).

**Expect:** Account B's Trip still exists in Firestore, inaccessible to anyone, correctly listed in the admin panel's quarantine section with a disabled delete action.

**Result:** ☑ PASS — notes: Confirmed as expected — Account B's Trip still exists in Firestore, inaccessible, correctly listed in the admin panel's quarantine section with days-since-revoked count and a disabled delete button. Product Owner enhancement request, logged below: add a one-click "re-activate" action for a quarantined account, instead of the only current path being re-inviting them from scratch.

## Test 5 — Deletion is refused before 30 days, from both the UI and a direct attempt

Confirm the quarantine panel's delete button for Account B stays disabled (Test 4 already showed this). As a stronger check: using the browser DevTools console while signed in as Account A, call the admin-delete-account endpoint directly for Account B's email with `confirm:true` (the same request the UI would send). This must be refused with a `409 not_eligible` error, not silently succeed.

**Expect:** Direct API attempt refused with a clear "not yet eligible" error; nothing deleted.

**Result:** ☑ PASS — notes: Confirmed via a direct browser-console call to the endpoint (using the app's `window.__ft.auth` qa-debug hook to obtain a real ID token, then a raw `fetch` with `targetEmail` and `confirm:true`) — refused with `409` and `{error: 'not_eligible', message: 'This account is not yet eligible for deletion (must be revoked for at least 30 days).'}`, exactly as expected. Nothing was deleted.

## Test 6 — Deletion, for real, on the disposable Account C only

**Do not run this against Account B or any real account.**

1. Sign in as Account C (the disposable one), let it create a Trip with at least one item, so there's something real to confirm gets deleted.
2. As Account A, invite Account C, then revoke it (same as Tests 2–3).
3. In the Firebase Console, manually edit `invitations/<Account C's email>` and set `revokedAt` to a timestamp 31 days in the past. This is the one deliberately manual step in this test — no code path changes just for testing (per the design's own "compute on demand, no scheduled job" choice), so simulating elapsed time means editing the timestamp directly.
4. Back in the admin panel (refresh to pick up the edited timestamp), confirm the quarantine panel now shows Account C as eligible, with an enabled delete button.
5. Click delete. Confirm the typed-email-match prompt appears — first try typing the WRONG email and confirm it refuses with an alert and does nothing. Then click delete again and type the CORRECT email.
6. Confirm: Account C's Trip is gone from Firestore (Console), its Storage attachments (if any) are gone, `invitations/<Account C's email>` is deleted, and a new document exists under `deletionAudit` naming Account C's email, your own account as confirmer, and a timestamp.

**Expect:** Wrong-email attempt refused with no changes; correct-email attempt deletes Account C's Trip data, Storage files, and invitation record, leaving one new `deletionAudit` record behind.

**Result:** ☑ PASS — notes: Confirmed as expected — wrong-email attempt refused with no changes; correct-email attempt deleted Account C's Trip data, Storage files, and invitation record, with one new `deletionAudit` record left behind.

## Test 7 — An Editor can invoke Smart Import on a Trip they don't own

On one of your own real Trips (Account A, Owner), grant Account B as Editor (Trip Settings' own sharing section, unchanged from `0.7.2`). Signed in as Account B, open that same Trip and use Smart Import (analyze any document/photo) — this should now succeed, where it was rejected before `0.7.5`.

**Expect:** Account B, as an Editor (not Owner), can successfully invoke Smart Import on Account A's Trip.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 8 — Editor Smart Import draws the Editor's own quota, not the Owner's

Immediately after Test 7, as Account A, run a Smart Import analysis on the same Trip (or any Trip you own). Confirm your own daily quota is unaffected by Account B's Test 7 usage — i.e., your remaining-quota count reflects only your own analyses, not Account B's.

**Expect:** Account A's quota is untouched by Account B's Smart Import usage from Test 7 — they're tracked separately, per calling account.

**Result:** ☐ Flagged, not run — notes: The test as written assumes a visible "remaining quota" counter in the UI. Checked the app's own source: no such counter exists anywhere — the only quota-related UI is an error message shown once the daily limit is actually hit ("מכסת הניתוח היומית הסתיימה"). Flagged as a documentation mismatch between this test session and the actual UI (not a product defect) — Product Owner's own call: flag it and move on, don't block the session verifying it a different way.

## Test 9 — A revoked Editor's prior contributions on another Owner's Trip survive untouched

Re-invite Account B (undo Test 3's revocation, if it's still revoked from there — or use a fresh grant), have Account B make some real edit to an item on your (Account A's) Trip, then revoke Account B's Editor access on that Trip specifically (the "הסרה" button in Trip Settings' sharing section, not an application-wide revoke). Confirm the item Account B edited still shows their edit, unchanged, and that the sharing section's own "היסטוריית הרשאות שהוסרו" (removed-access history) panel now lists Account B with a removal timestamp.

**Expect:** Account B's prior edit survives untouched; the revoked-history panel correctly shows the removal.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Enhancement request: the quarantine panel should have a one-click "re-activate" action for a revoked account, instead of the only current path being re-inviting them from scratch (which is presumably a fresh invitation, not a restoration of the same prior access). | Test 4 | Enhancement | Reported by Product Owner 2026-09-21. Not a defect in this candidate's own scope — candidate for a future correction package or backlog item. |
| Test 8's own text assumes a visible "remaining quota" counter in the UI; no such counter exists — only an error message once the daily limit is actually hit. Documentation mismatch in this test session, not a product defect. | Test 8 | N/A (test-doc issue) | Flagged by Product Owner 2026-09-21; test not run as written. No product fix needed — this candidate's own quota-per-account behavior is otherwise unaffected. |
| Gap: a newly-invited account with no Trips of their own is blocked from reaching Settings until they create an item in their first Trip — Settings appears gated behind having at least one item, which breaks a brand-new user's very first flow after accepting an invitation. | Not part of this session's own tests A–9 (found live by Product Owner) | Not yet rated by Product Owner | Reported by Product Owner 2026-09-21. Not yet triaged by the Development Agent — needs root-cause and a scope decision. |
| Gap: a "family ticket" (כרטיס משפחתי, one ticket covering multiple participants) is not handled correctly by the ticket system built in `0.7.4` — screenshot shows a single family ticket listed under "כרטיסים (1)" while every participant (איל בן יצחק, פאולה, דניאל, עמית, עפרי) still shows under "משתתפים ללא כרטיסים" (participants without a ticket), even though the family ticket should cover all of them. The ticket model assumes one ticket per participant and has no concept of a single ticket covering a group. | Not part of this session's own tests A–9 (found live by Product Owner) | Not yet rated by Product Owner | Reported by Product Owner 2026-09-21, with screenshot. Not yet triaged by the Development Agent — needs root-cause and a scope decision (this touches `0.7.4`'s ticket model, not `0.7.5`'s own sharing scope). |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-21. Tests 1, 2, 3, 4, 5, 6, 7, 9 all PASS. Test 8 flagged, not run (test-doc mismatch — no such UI element exists — Product Owner's own call to move on rather than block). `0.7.5` may proceed to Production promotion as a separate, explicit action. Four non-blocking findings logged: quarantine re-activate enhancement (Test 4), Test 8's own documentation mismatch, a new-account-blocked-by-Settings gap, and a family-ticket-not-recognized gap (both found live, not part of this session's own tests).

## Production promotion

Not yet — recorded here once GO is confirmed.
