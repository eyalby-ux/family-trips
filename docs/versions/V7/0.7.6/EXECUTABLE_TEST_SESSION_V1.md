# Family Trips Alpha 0.7.6 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.6` (original-source cross-device sync — headline finding: retrieval already worked before this candidate; real scope was `V7-F08` orphaned Storage cleanup, plus a copy-only message fix), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.6-5ffdac5b`, deploy `6ab42f17f604f07f4a1bb668`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What this candidate actually is, worth restating before testing:** the design investigation found that cross-device original-source retrieval already worked before any code in this candidate shipped (`0.7.2`'s real Firebase Storage read/write, synced across devices by `0.7.3`'s existing `sources` collection sync). Test 1 below is a **baseline confirmation** — it should pass on the *previous* build too, not something new this candidate made work. The real new behavior is Tests 2–4 (the `V7-F08` Storage-cleanup fix) and Test 5 (offline upload's already-existing, now-documented failure behavior).

**Two real devices/accounts needed**, same `0.7.3` two-device convention — no new account infrastructure.

- **Account A (Owner)** — `eyalby@gmail.com`.
- **Account B (Editor)** — `paolakohan@gmail.com`, already invited and active from prior candidates.

## Test 1 — Baseline: cross-device retrieval already works (confirms existing behavior, not new code)

On device A, attach a document/photo to an item (or use an existing one). On device B (Account B, Editor on the same Trip), open the same item and confirm the original file opens correctly — same as `0.7.5`'s own testing already relied on implicitly.

**Expect:** Works. This should already have worked before `0.7.6` — recorded here as a baseline, not evidence of new functionality.

**Result:** ☐ — notes:

## Test 2 — `V7-F08` fix: "reset Trip data" now cleans up Storage (the real, currently-reachable bug this candidate fixes)

1. On a Trip you're comfortable resetting content on (or the QA Test Trip), attach a document to an item. Note its Storage path — the Firebase Console (Storage → browse to `trips/<tripId>/sources/`) or the `qa`-only `window.__ft` debug hook can show this.
2. Trip Settings → "מחיקת נתוני הטיול" (reset Trip data). Confirm the dialog, proceed.
3. In the Firebase Console, confirm the Storage object from step 1 is **actually gone** — not just the Firestore `sources` record (which was always cleared; the bug was Storage staying behind).

**Expect:** The Storage object no longer exists after the reset — this is the actual bug this candidate fixes, previously every attachment would have survived silently as an orphaned, billed file with nothing left able to reference or clean it up.

**Result:** ☐ — notes:

## Test 3 — Full Trip deletion still works correctly (regression check, not new behavior)

On a disposable test Trip (not a real one — this is a permanent delete), attach a document, then delete the Trip entirely ("מחיקת הטיול הנוכחי"). Confirm in the Firebase Console that both the Firestore records and the Storage file are gone.

**Expect:** Unchanged from before this candidate — `deleteTripCompletely` already did this correctly; this confirms the refactor (replacing its old per-source loop with the same helper "reset Trip data" now uses) didn't break it.

**Result:** ☐ — notes:

## Test 4 — Cross-device deletion visibility (confirms existing sync behavior, not new code)

On device A, delete a source's owning Trip content (Test 2's reset, or delete a Trip you no longer need). On device B, confirm the item/source list updates via the existing sync — no manual refresh needed — and device B no longer offers to open the removed source.

**Expect:** Already works via `0.7.3`'s existing real-time sync of the `sources` collection — confirming it holds for this specific deletion path too, not new mechanism.

**Result:** ☐ — notes:

## Test 5 — Offline file upload fails clearly, not silently (documents existing, unchanged behavior)

Go offline (airplane mode / DevTools offline throttling), then attempt to attach a new document to an item. Confirm you see a clear error message (not a hang, not a silently-lost attempt) — this is existing behavior from before `0.7.6`, now documented in code as a known, accepted limitation rather than left unexplained. This candidate deliberately does not add offline queueing for file uploads.

**Expect:** A clear failure message; no silent data loss; no new item/suggestion created from the failed attempt.

**Result:** ☐ — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|

## GO/NO-GO decision

**Pending.** Recorded here once every test above has a result.

## Production promotion

Not yet — recorded here once GO is confirmed.
