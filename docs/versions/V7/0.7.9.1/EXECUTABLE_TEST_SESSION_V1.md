# Family Trips Alpha 0.7.9.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.9.1` (Pre-Beta Code Health & Security Review V1 correction: `CR-001` Firestore Trip-update rule field-level restriction, `CR-004` dead-code removal), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9.1-8e768772`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** This candidate has no new UI surface at all — `CR-004` is a pure deletion of two fully-dead source files never reachable from the app, and `CR-001` is a Firestore *rules* change (the real security boundary, not something rendered in the UI). There is nothing new to click through. This session is a regression spot-check plus a code-level confirmation, not a normal feature test — matching the precedent `0.7.4.1`'s own Test 3 set (accepted on code-level evidence when there was nothing to independently click-test).

## Important: `CR-001` needs a separate action from you before it's actually live

The rules change is committed to `firestore.rules` in the repo, but Firestore rules are **not** deployed by `netlify deploy` at all — they only take effect once published directly to the Firebase project (Firebase Console → Firestore Database → Rules → paste → Publish), and that publish applies immediately to both `qa` and Production at once (there is no separate qa-rules environment). The exact rules text to paste was given to you directly in chat, not repeated here. **Until you publish it, the app runs on the old, unrestricted rule** — this build's own app code doesn't change that on its own.

## Test 1 — Regression: normal Trip-settings edits still work (unaffected by `CR-001`)

As the Trip Owner, edit the Trip name and/or dates in Trip Settings and save. As an Editor (a second account, if you have one available), do the same.

**Expect:** Both save correctly, exactly as before — the new rule only restricts writes to `ownerUid`/`editorEmails` specifically, every other field is untouched.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes. Pre-check confirmed first: current published Firestore rules (Firebase Console, published today 6:01 PM) include `CR-001`'s restriction on the `update` rule (lines 30-33 — `ownerUid` and `editorEmails` must stay unchanged unless the caller is the owner) — the ruleset is live and current.

## Test 2 — Regression: adding/removing an Editor still works (the Owner-only path `CR-001` explicitly preserves)

As the Trip Owner, add or remove an Editor via Trip Settings' sharing section.

**Expect:** Unchanged from before — the new rule explicitly keeps this working for the Owner (`isOwner(resource)` in the rule's own `editorEmails` clause); only a non-Owner attempting the same write directly against Firestore (not through this app's own UI, which never offers that action to a non-Owner anyway) would now be rejected.

**Result:** ☑ PASS — notes: Editor removal itself works correctly, confirming `CR-001` doesn't block the Owner's own path. New observation, unrelated to `CR-001`/`CR-004`: there is no clear confirmation message next to/for the removed account once it's removed — no explicit "removed" feedback in the UI. Logged below as a pre-existing UX gap, not a defect introduced by this candidate.

## Test 3 — Regression: general spot-check that the app still boots and works normally (`CR-004`)

Open the app fresh (hard refresh) and confirm it loads and behaves normally — sign-in, Trip Center, creating/viewing an item.

**Expect:** No change at all — `legacy-app.js`/`v4-app.js` were never loaded by the running app (confirmed directly: `src/main.js` only ever dynamically imports `src/v5-app.js`), so deleting them removes zero live behavior.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| No clear confirmation message shown when an Editor is removed from a Trip. | Test 2 | Non-blocking, pre-existing UX gap (not introduced by `CR-001`/`CR-004`) | Reported by Product Owner 2026-09-28. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-28, on build `0.7.9.1-8e768772`. All 3 tests PASS. The `CR-001` Firestore rules change was confirmed published and live in the Firebase Console (current ruleset, published today 6:01 PM, includes the `ownerUid`/`editorEmails` restriction on `update`) before testing, and normal Trip-settings edits and Editor add/remove both continue to work correctly for the Owner. `CR-004`'s dead-code removal (`legacy-app.js`/`v4-app.js`) shows no effect on the running app, as expected. One non-blocking finding logged: no confirmation message is shown when an Editor is removed — a pre-existing UX gap, not introduced by this candidate. `0.7.9.1` may proceed to Production promotion as a separate, explicit action (app code via the usual deploy; the Firestore rules are already live for both `qa` and Production, since rules publish to both at once).

## Production promotion

**Promoted 2026-09-28.** Build `0.7.9.1-8e768772` deployed to Production (`familytripz.netlify.app`) via `netlify deploy --dir dist --prod --no-build` — a byte-identical artifact of the same build already accepted on `qa` (0 files/functions changed in the deploy diff). Confirmed live via direct request. Combined with the Firestore rules already published to the shared backend, both halves of `0.7.9.1` (`CR-001`, `CR-004`) are now fully live in Production. One non-blocking finding from this session (no confirmation message when an Editor is removed) is logged above for the planning assistant to schedule separately.
