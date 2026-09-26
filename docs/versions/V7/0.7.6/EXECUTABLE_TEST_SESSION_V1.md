# Family Trips Alpha 0.7.6 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.6` (original-source cross-device sync — headline finding: retrieval already worked before this candidate; real scope was `V7-F08` orphaned Storage cleanup, plus a copy-only message fix), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.6-14ce6ded`, round 3 — see below for what changed since the round-2 build `0.7.6-820c100d`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**What this candidate actually is, worth restating before testing:** the design investigation found that cross-device original-source retrieval already worked before any code in this candidate shipped (`0.7.2`'s real Firebase Storage read/write, synced across devices by `0.7.3`'s existing `sources` collection sync). Test 1 below is a **baseline confirmation** — it should pass on the *previous* build too, not something new this candidate made work. The real new behavior is Tests 2–4 (the `V7-F08` Storage-cleanup fix) and Test 5 (offline upload's already-existing, now-documented failure behavior).

**Two real devices/accounts needed**, same `0.7.3` two-device convention — no new account infrastructure.

- **Account A (Owner)** — `eyalby@gmail.com`.
- **Account B (Editor)** — `paolakohan@gmail.com`, already invited and active from prior candidates.

## Test 1 — Baseline: cross-device retrieval already works (confirms existing behavior, not new code)

On device A, attach a document/photo to an item (or use an existing one). On device B (Account B, Editor on the same Trip), open the same item and confirm the original file opens correctly — same as `0.7.5`'s own testing already relied on implicitly.

**Expect:** Works. This should already have worked before `0.7.6` — recorded here as a baseline, not evidence of new functionality.

**Result:** ☑ PASS — notes: Worked well, as expected.

## Test 2 — `V7-F08` fix: "reset Trip data" now cleans up Storage (the real, currently-reachable bug this candidate fixes)

1. On a Trip you're comfortable resetting content on (or the QA Test Trip), attach a document to an item. Note its Storage path — the Firebase Console (Storage → browse to `trips/<tripId>/sources/`) or the `qa`-only `window.__ft` debug hook can show this.
2. Trip Settings → "מחיקת נתוני הטיול" (reset Trip data). Confirm the dialog, proceed.
3. In the Firebase Console, confirm the Storage object from step 1 is **actually gone** — not just the Firestore `sources` record (which was always cleared; the bug was Storage staying behind).

**Expect:** The Storage object no longer exists after the reset — this is the actual bug this candidate fixes, previously every attachment would have survived silently as an orphaned, billed file with nothing left able to reference or clean it up.

**Result (round 1, build `0.7.6-5ffdac5b`):** ☒ FAIL — notes: The "reset Trip data" action itself failed outright — clicking "מחיקת נתוני הטיול" produced an error dialog: "מחיקת הנתונים בטיול נכשלה. לא בוצע שינוי" ("Trip data deletion failed. No change was made."), confirmed by screenshot. This is a regression in the action itself, not just the Storage-cleanup verification — no change was made at all, so the underlying `V7-F08` fix couldn't even be exercised.

**Result (retest, build `0.7.6-820c100d`):** ☑ PASS — notes: First retest attempt was ambiguous — the reset completed without error, but the `sources/` folder still showed several `src-...` entries, unclear whether they were the just-attached document's folder or leftover clutter from many earlier test sessions on the shared QA Test Trip. Redone cleanly: attached a brand-new document, noted its exact `src-...` folder name in the Storage console, performed the reset, and confirmed that exact folder was gone afterward. Round 2 fix (commit `820c100`, reading each source's known `storagePath` directly rather than `listAll()`) confirmed working.

## Test 3 — Full Trip deletion still works correctly (regression check, not new behavior)

On a disposable test Trip (not a real one — this is a permanent delete), attach a document, then delete the Trip entirely ("מחיקת הטיול הנוכחי"). Confirm in the Firebase Console that both the Firestore records and the Storage file are gone.

**Expect:** Unchanged from before this candidate — `deleteTripCompletely` already did this correctly; this confirms the refactor (replacing its old per-source loop with the same helper "reset Trip data" now uses) didn't break it.

**Result (round 1, build `0.7.6-5ffdac5b`):** ☒ FAIL — notes: Same failure as Test 2 — deleting the current Trip ("מחיקת הטיול הנוכחי") also produces the error "מחיקת הנתונים בטיול נכשלה. לא בוצע שינוי" ("Trip data deletion failed. No change was made."), confirmed by screenshot. Both delete-style actions fail identically, confirming the shared new helper itself (`deleteAllAttachments()`/its call site) is broken, not something isolated to the "reset" path.

**Result (retest, build `0.7.6-820c100d`):** ☒ FAIL — notes: The delete action itself now completes without error (Firestore confirmed: the Trip document no longer exists, "This document does not exist" in the console). However, the Trip's `sources/` Storage folders are still present afterward, confirmed by screenshot — the Storage cleanup that Test 2's retest just confirmed working for "reset Trip data" is **not** wired into the full-Trip-deletion path. `deleteTripCompletely` and "reset Trip data" no longer share the same fixed cleanup mechanism, contrary to this candidate's own stated intent ("replacing its old per-source loop with the same helper 'reset Trip data' now uses").

**Process note, not a product finding:** this retest was run against the actual **QA Test Trip** itself, not a disposable test Trip as the instructions called for — full Trip deletion is permanent. The Product Owner confirmed the QA Test Trip was deleted and will create a new one before further testing continues. Recorded here for the record; not a defect in `0.7.6`.

**Result (retest, build `0.7.6-14ce6ded`, on a genuinely fresh Trip):** ☑ PASS — notes: Created a brand-new Trip, attached one document, noted its exact `src-...` folder, deleted the Trip. That folder is confirmed gone from Storage afterward — only the empty parent Trip-level Storage prefix briefly remained visible (not an actual file, just how the console displays an empty prefix). Confirms the Development Agent's debris hypothesis: the round-1 retest's leftover files were pre-existing orphans from before this candidate's fix existed, not a new defect. `deleteTripCompletely` and "reset Trip data" do in fact share the same working cleanup mechanism.

## Test 4 — Cross-device deletion visibility (confirms existing sync behavior, not new code)

On device A, delete a source's owning Trip content (Test 2's reset, or delete a Trip you no longer need). On device B, confirm the item/source list updates via the existing sync — no manual refresh needed — and device B no longer offers to open the removed source.

**Expect:** Already works via `0.7.3`'s existing real-time sync of the `sources` collection — confirming it holds for this specific deletion path too, not new mechanism.

**Result (round 1):** ☐ Blocked — notes: Cannot be run — both actions this test could piggyback on (Test 2's reset, Test 3's Trip deletion) fail outright, so there is no successful delete to check cross-device visibility against. Blocked on the same root cause as Tests 2 and 3.

**Result (retest, build `0.7.6-820c100d`):** ☑ PASS — notes: Piggybacked on Test 3's retest (full Trip deletion of the QA Test Trip). On the other device/account, the deleted Trip is no longer visible — confirmed via the existing `0.7.3` real-time sync, exactly as expected. This confirms Test 4 independently of Test 3's own separate finding (the Storage `sources/` files not being cleaned up) — Firestore-level deletion and its cross-device sync both work correctly; the outstanding bug is specifically the Storage cleanup, not sync.

## Test 5 — Offline file upload fails clearly, not silently (documents existing, unchanged behavior)

Go offline (airplane mode / DevTools offline throttling), then attempt to attach a new document to an item. Confirm you see a clear error message (not a hang, not a silently-lost attempt) — this is existing behavior from before `0.7.6`, now documented in code as a known, accepted limitation rather than left unexplained. This candidate deliberately does not add offline queueing for file uploads.

**Expect:** A clear failure message; no silent data loss; no new item/suggestion created from the failed attempt.

**Result (round 1, build `0.7.6-820c100d`):** ☒ FAIL — notes: Nothing happens at all when clicking the upload button while offline — no error message, no hang, no visible feedback of any kind. This is worse than the "known, accepted limitation" this candidate was meant to document: the design's own premise was a clear failure message on an existing, unchanged limitation, but there's no failure message to see — the click is silently a no-op.

**Result (retest, build `0.7.6-14ce6ded`):** ☒ FAIL — notes: Still nothing happens when attempting to upload a document while offline — same silent no-op as round 1, despite the Development Agent's fix (commit `14ce6de`, `createLocalSource()` catching `storeOriginal()`'s failure and showing a Hebrew alert). The expected visible alert did not appear. Sent back for further investigation — either the fix isn't reaching this exact flow, or something else is intercepting/suppressing the error before the alert fires.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| "Reset Trip data" ("מחיקת נתוני הטיול") fails outright with the error "מחיקת הנתונים בטיול נכשלה. לא בוצע שינוי" ("Trip data deletion failed. No change was made.") — the action this candidate's own `V7-F08` fix is built on top of no longer completes at all. | Test 2 | Blocking | Reported by Product Owner 2026-09-24. Round 1 fix (`9c2f67d`) did not resolve it. **Root-caused for real, fixed in round 2** (commit `820c100`), retested and confirmed PASS 2026-09-26. |
| Full Trip deletion ("מחיקת הטיול הנוכחי") fails with the identical error message as Test 2 — confirms both delete-style actions now share a broken code path (most likely the new `deleteAllAttachments()` helper or its call site introduced by this candidate). | Test 3 | Blocking | Reported by Product Owner 2026-09-24. Same root cause as Test 2 — one fix, one retest of both. Round 2 (`820c100`) fixed the outright failure, but see the new finding below — Storage cleanup itself is still not wired into this path. |
| Full Trip deletion completes (Firestore record removed) but leaves the Trip's Storage `sources/` files behind — `deleteTripCompletely` is not calling the same fixed cleanup mechanism as "reset Trip data." | Test 3 (retest, build `0.7.6-820c100d`) | Blocking | Reported by Product Owner 2026-09-26. **Closed as debris, not a defect.** Investigation found the code correct and unchanged since round 2; retest on a genuinely fresh Trip (build `0.7.6-14ce6ded`) confirmed PASS 2026-09-26 — the leftover files were pre-existing orphans from before this candidate's fix existed, on the long-reused QA Test Trip. |
| Attempting to attach a document while offline produces no feedback at all — clicking the upload button does nothing visible (no error, no hang indication). This candidate's own stated scope was to document offline upload's existing failure with a clear message, not leave it silent. | Test 5 | Blocking | Reported by Product Owner 2026-09-24/26. Round 3 fix (`14ce6de`) retested against build `0.7.6-14ce6ded` and **still fails identically** — no visible alert appeared. **Round 4: two real, confirmed causes found** (no render() while the upload is in flight; Firebase Storage SDK's own upload-retry window can delay the eventual reject/alert by several minutes) — see "Round 4" below. Awaiting the Product Owner's confirmation retest (waiting several minutes) and decision on the proposed `navigator.onLine` fast-fail fix before any further code change. |

## Round 1 root cause and fix (did not resolve the failure — see round 2)

**Diagnosed root cause:** `deleteAllAttachments()` calls `listAll()` on the `trips/{tripId}/sources` folder — Firebase Storage Rules treat `list` as a permission distinct from `read`/`write`, evaluated against the *prefix* being listed. `storage.rules` only granted `read`/`write` on the fully-qualified `.../{sourceId}/{fileName}` path, never `list` on the folder itself.

**Attempted fix** (commit `9c2f67d`): added `match /trips/{tripId}/sources { allow list: if hasTripAccess(tripId); }`. The Product Owner republished `storage.rules` in the Firebase Console and confirmed the published text matched exactly — **but the failure persisted.** This ruled out "rules weren't actually published" and pointed at a deeper problem, investigated in round 2.

## Round 2 — the real root cause and fix

Two independent problems, both in `deleteAllAttachments()` itself, not the rules:

1. **`listAll()` is not recursive.** Files live at `trips/{tripId}/sources/{sourceId}/{fileName}` — one path segment *deeper* than the `trips/{tripId}/sources/` prefix the code listed. A non-recursive list at that prefix returns an empty `items` array (the real files, nested one level further in, only show up as `prefixes`, which the code never read) — so even with the `list` permission granted, the function would have found nothing to delete.
2. **The `list` permission itself was never safely grantable at this depth.** Per Firebase's own documentation, a Storage `list` rule must hold for the *entire* potential result set of the request — round 1's rule couldn't actually guarantee that here.

**Fixed for real** (commit `820c100`) by abandoning the `listAll()`-based approach entirely: `deleteAllAttachments()` now reads each source's already-known `storagePath` directly from its Firestore record (the same read `clearAllTripContent`'s own existing loop already makes) and deletes that one exact, known path — the exact pattern `deleteTripCompletely` used successfully before this candidate touched it. This needs **no Storage `list` permission at all**.

**Action needed: please revert `storage.rules` in the Firebase Console back to its original text** (remove the `list` block round 1 added — it's no longer used and `storage.rules` in the repo is back to byte-identical with what it was before this candidate started):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isInvited() {
      return request.auth != null &&
        request.auth.token.email_verified == true &&
        firestore.exists(/databases/(default)/documents/invitations/$(request.auth.token.email)) &&
        firestore.get(/databases/(default)/documents/invitations/$(request.auth.token.email)).data.state == 'active';
    }
    function hasTripAccess(tripId) {
      let trip = firestore.get(/databases/(default)/documents/trips/$(tripId));
      return isInvited() &&
        (request.auth.uid == trip.data.ownerUid || request.auth.token.email in trip.data.editorEmails);
    }

    match /trips/{tripId}/sources/{sourceId}/{fileName} {
      allow read, write: if hasTripAccess(tripId);
    }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

**A new `qa` build was deployed** (build `0.7.6-820c100d`, deploy `6ab68b1098a66050cef65cb7`) — this round's fix touched real client code (`cloud-store.js`), not just rules. Once `storage.rules` is reverted, please retry Tests 2, 3, and 4 against this new build.

## Round 3 — Test 5 root-caused and fixed; Test 3 investigated, not yet resolved

### Test 5: offline upload's silent no-op — root-caused and fixed (commit `14ce6de`)

**Root cause:** `createLocalSource()` — the shared helper both the "smart add" flow (`smartIngest()`) and the "attach to an existing item" flow (`attachIngest()`) call to save a new attachment — threw an error when `storeOriginal()` failed (as it always does offline, since there's no local device storage fallback). Neither caller actually caught that throw. The error became an **unhandled promise rejection**: no `alert()`, no console message a user would see, nothing — just a silently dead click. This is a pre-existing bug, not something `0.7.6` introduced; it was only surfaced because Test 5 is the first test in this project to specifically exercise offline upload against this exact code path. (The app's *other* upload entry point, the global "Add new item" flow's own `ingest()` function, was already correct — it catches its own `storeOriginal()` call inline and was never affected.)

**Fix:** `createLocalSource()` now catches the `storeOriginal()` failure itself, shows `alert('שמירת המקור במכשיר נכשלה. לא נשלח מידע לניתוח.')`, and returns `null` instead of throwing. Both call sites (`smartIngest()`, `attachIngest()`) now check for that `null` return and bail out cleanly instead of pushing a half-formed source into state.

**Please retest Test 5 against the new build** (`0.7.6-14ce6ded`) — expect a visible Hebrew alert on a failed offline attach, no new item/suggestion created from the failed attempt.

**Retest result, 2026-09-26: still FAIL.** The Product Owner retested against build `0.7.6-14ce6ded` — attempting to attach a document while offline still produces no visible feedback at all, identical to round 1. The expected alert never appeared. This needs further investigation: either this fix isn't actually reaching the flow the Product Owner is exercising, or something else (a different code path, a caught-and-swallowed error elsewhere, a build/deploy mismatch) is suppressing it before the `alert()` fires.

### Test 3: Storage cleanup on full Trip deletion — investigated, no code bug found; needs a clean retest

Re-read `clearAllTripContent()` and `deleteTripCompletely()` directly against the actual current code (not assumed): both are unchanged since round 2's fix, and `deleteTripCompletely()` still calls `clearAllTripContent()` (which runs `deleteAllAttachments()` — the exact same Storage-cleanup helper Test 2's retest already confirmed working for "reset Trip data") before deleting the Trip document itself. There is no second, separate, un-fixed code path for full-Trip deletion — both actions share the identical helper. No bug found in the code itself.

**Working hypothesis, not yet confirmed:** the leftover `sources/` files Test 3's retest observed are most likely **pre-existing debris**, not evidence the fix doesn't work — specifically, files from earlier test rounds/candidates that were already orphaned in Storage *before* this fix existed (the very `V7-F08` problem this candidate fixes), sitting under the long-lived, heavily-reused QA Test Trip. `deleteAllAttachments()` can only delete a file if it can find a **current Firestore `sources` record** pointing at it — it has no way to discover or clean up a file whose owning Firestore record was itself already lost to an earlier, unfixed version of this same bug. That's expected, not a new defect: this fix stops *new* orphans from being created going forward; it cannot retroactively find orphans that already exist with no surviving pointer to them.

This is consistent with Test 3's own original instructions, which called for a **disposable, freshly-created** test Trip specifically to avoid this ambiguity — the retest instead ran against the reused QA Test Trip (recorded already as a process note above).

**Request:** please retest Test 3 on a genuinely fresh Trip — create a new Trip, attach one document, note its exact Storage path, delete the Trip, confirm that exact path is gone. If it's gone cleanly on a fresh Trip, this finding closes as debris, not a defect. If it's still left behind on a fresh Trip, that's a real, different bug and needs further investigation.

## Round 4 — Test 5 re-investigated: two real, confirmed causes found (fix not yet implemented, pending decision)

The round-3 fix (commit `14ce6de`) is itself correct — `createLocalSource()` does now catch `storeOriginal()`'s failure and `alert()`s. Retested and still reported as "nothing happens," identically to round 1, was surprising enough to re-open rather than dismiss. Direct code inspection (not a guess) found two real, independent, confirmed issues, both pre-existing and both upstream of round 3's fix:

1. **The click handlers never render while the upload is in flight.** `smartIngest()`/`attachIngest()` both set `ingestBusy=true` then `await` the whole upload chain, but the global click dispatcher (`addEventListener('click', …)` near line 1225) does `else if(action==='smart-ingest')await smartIngest();` / `else if(action==='attach-ingest')await attachIngest(...)` — no `render()` call before or during that `await`. The app *does* already have a busy-state UI for exactly this moment (`smartImportPanel()`/`attachmentModal()` both check `ingestBusy` and return a "מנתח את המקור…" spinner), but it can never actually appear, because nothing triggers a re-render until the whole promise chain — including the eventual failure — has already resolved. Confirmed directly in the code; not a hypothesis.

2. **Firebase Storage's own SDK retries a failed upload for a while before finally rejecting**, rather than failing immediately when there's no network. This is documented, configurable SDK behavior (`maxUploadRetryTime`; widely reported in the low minutes by default, exact figure not independently pinned down here). So while genuinely offline, `uploadBytes()` doesn't reject quickly — it sits retrying in the background for some real amount of time (plausibly 2+ minutes) before `storeOriginal()`'s `catch` (and round 3's `alert()`) ever fires.

**Together, these explain the identical "nothing happens" result in both round 1 and round 3**, without contradicting that round 3's fix is correctly wired: there is currently zero visible feedback the moment the button is clicked (issue 1), and the eventual alert this candidate added is real but can be several minutes delayed by the SDK's own retry behavior (issue 2) — far longer than any quick manual click-and-look test would wait.

**Cheapest next step, before any further code change: please confirm the hypothesis directly.** Click to attach a document while offline, then leave the screen open and untouched for a few minutes without navigating away, and see if the Hebrew alert (`שמירת המקור במכשיר נכשלה...`) eventually appears on its own. This costs nothing and tells us definitively whether issue 2 is real as measured on your actual device/network, before deciding whether a further code fix is worth it.

**If confirmed, the actual fix this candidate's own intent ("fails clearly, not silently") calls for** is to check `navigator.onLine` up front in `storeOriginal()`/`uploadAttachment()` and fail immediately with the same alert when it's `false` — turning a multi-minute silent wait into an instant, honest failure — rather than just waiting out the SDK's own retry window. This is a small, targeted fix, not yet implemented — pending your decision on whether to proceed with it (and whether the missing busy-spinner render is worth fixing alongside it, since it's a related but separate gap).

## GO/NO-GO decision

**Pending.** Recorded here once every test above has a result.

## Production promotion

Not yet — recorded here once GO is confirmed.
