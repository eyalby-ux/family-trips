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

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 2 — Regression: adding/removing an Editor still works (the Owner-only path `CR-001` explicitly preserves)

As the Trip Owner, add or remove an Editor via Trip Settings' sharing section.

**Expect:** Unchanged from before — the new rule explicitly keeps this working for the Owner (`isOwner(resource)` in the rule's own `editorEmails` clause); only a non-Owner attempting the same write directly against Firestore (not through this app's own UI, which never offers that action to a non-Owner anyway) would now be rejected.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 3 — Regression: general spot-check that the app still boots and works normally (`CR-004`)

Open the app fresh (hard refresh) and confirm it loads and behaves normally — sign-in, Trip Center, creating/viewing an item.

**Expect:** No change at all — `legacy-app.js`/`v4-app.js` were never loaded by the running app (confirmed directly: `src/main.js` only ever dynamically imports `src/v5-app.js`), so deleting them removes zero live behavior.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| (fill in during acceptance testing) | | | |

## GO/NO-GO decision

Not yet run.

## Production promotion

Not applicable to the app code alone until the Firestore rules are also published (see the note above) — recorded here once both are confirmed.
