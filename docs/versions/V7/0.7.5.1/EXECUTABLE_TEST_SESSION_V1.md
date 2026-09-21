# Family Trips Alpha 0.7.5.1 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.5.1` (correction: quarantine re-activate action, `V7-F11`; fix for a newly-invited account unable to see the Trip it was invited to, `V7-F12`), found live during `0.7.5`'s own acceptance session, installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.5.1-0b2a2037`, deploy `6ab19bf6ba34ae656cd37ebc`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**`V7-F12`'s real root cause, found by direct code inspection, not the planning assistant's own guess.** The kickoff's own hypothesis (Settings gated on item count) was wrong. The actual cause: `listMyTrips`'s "shared with me" query is evaluated under `firestore.rules`' `allow list: if hasTripAccess(resource)`, which requires `isInvited()` — `0.7.5`'s own application-level invitation check — to be true for the *calling* account, regardless of whether `editorEmails` genuinely lists them. A Trip Owner adding someone as an Editor from Trip Settings (a write governed only by the Owner's own access) can silently create an Editor who cannot see any of their own Trip data at all, if that email was never *separately* application-invited via the admin panel. They land on the empty-Trip screen with no explanation, and its only action creates an unrelated new Trip of their own — not the one they were actually invited to. This isn't a `0.7.5.1` regression of `0.7.5` itself; it's a real interaction gap between the pre-existing (`0.7.2`) Trip-sharing flow and `0.7.5`'s new two-layer invitation model, now closed at the point it's created rather than left for the invited person to discover alone.

**This candidate needs the same three accounts `0.7.5` used, plus a genuinely fourth, never-before-invited one for Test 3.**

- **Account A (Admin/Owner)** — `eyalby@gmail.com`.
- **Account B (second test account)** — `paolakohan@gmail.com`. Used for Test 1 (revoke, then re-activate).
- **Account D (a fourth account, never previously invited at the application level)** — needed for Test 3, specifically because it must have **no** `invitations/{email}` document at all going in, to genuinely reproduce `V7-F12`'s original trigger. Reusing Account B or C won't work — both already have (or had) an `invitations` record from earlier testing. If you don't have a spare Google account for this, a fresh one works — nothing here deletes anything, so it doesn't need to be disposable the way Account C did for `0.7.5`'s own Test 6.

## Test 1 — Quarantine re-activate restores access immediately (`V7-F11`)

1. As Account A, revoke Account B's application invitation (admin panel), same as `0.7.5`'s own Test 3.
2. Confirm Account B is denied access (quick re-check, same as `0.7.5` Test 3 — should still be blocked).
3. As Account A, in the admin panel's quarantine section, click "הפעלה מחדש" (re-activate) next to Account B's entry. Confirm the confirmation dialog's wording makes sense, then confirm.
4. Confirm Account B disappears from the quarantine section and reappears in the active-invitations list.
5. Switch to Account B's own session and confirm it can access its Trip(s) again — **without re-inviting, without Account B needing to sign out/in again.**
6. In the Firebase Console, confirm `invitations/<Account B's email>` now shows `state: 'active'` and `revokedAt: null` (cleared, not left as history — this candidate's own design decision, stated here so the actual field value can be checked against it).

**Expect:** Re-activate restores access immediately with no other action needed; `revokedAt` is cleared to `null`.

**Result:** ☐ — notes:

## Test 2 — Re-activate is available before 30 days, independent of the deletion-eligibility window

While Account B is still within its 30-day quarantine window (freshly revoked, well before eligible for deletion), confirm the re-activate button was still enabled and worked in Test 1 — re-activation was never meant to depend on the same 30-day window deletion does. If Test 1 already demonstrated this (Account B was re-activated immediately after revoking, long before 30 days), this test can be marked confirmed from that same observation rather than repeated separately — note which.

**Expect:** Re-activate works regardless of how recently the account was revoked.

**Result:** ☐ — notes:

## Test 3 — A newly-invited account without an application invitation is warned, not silently left stuck (`V7-F12`)

1. As Account A, on one of your own real Trips, add Account D as an Editor via Trip Settings' sharing section — **do not** invite Account D at the application level first (no admin-panel invite yet). This reproduces the original gap exactly.
2. Confirm a clear warning appears immediately after adding Account D, explaining that this email hasn't been invited to use the app yet and pointing to the admin panel.
3. Sign in as Account D for the first time. Confirm it lands on the empty-Trip screen (expected, unchanged) — it genuinely cannot see the Trip yet, exactly matching the original bug's own starting point, but now you were warned about it in step 2 instead of discovering it blind.
4. As Account A, invite Account D at the application level via the admin panel (the fix this candidate points you toward).
5. Back in Account D's session, reload. Confirm it now lands on the Trip it was actually invited to (or the Trip switcher, if it has more than one) — not stuck on the empty-Trip screen, and without needing to create anything itself first.

**Expect:** Step 2's warning appears; step 5 confirms the actual fix — once both layers are done, Account D reaches the real Trip, no dead end.

**Result:** ☐ — notes:

## Test 4 — Adding an already-invited Editor still works exactly as before, no new friction

As Account A, add Account B (already application-invited from Test 1's re-activation) as an Editor on a Trip. Confirm no warning appears — only the normal "המשתתף נוסף" success toast, exactly like every prior candidate.

**Expect:** No behavior change for the common case (an already-invited person being added as Editor) — the warning is specific to the gap case only.

**Result:** ☐ — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|

## GO/NO-GO decision

**Pending.** Recorded here once every test above has a result.

## Production promotion

Not yet — recorded here once GO is confirmed.
