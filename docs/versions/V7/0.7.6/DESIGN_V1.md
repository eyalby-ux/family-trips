# FamilyTrips `0.7.6` — Design: original-source cross-device sync

Document revision: `V1`
Date: 2026-09-23
Scope input: `FAMILY_TRIPS_ALPHA_0_7_6_SCOPE_V1.md` (same handoff, `0_7_6_design_first_20260923`)

## 0. The headline finding — read this first

**Cross-device original-source retrieval already works today.** This is not new work `0.7.6` needs to build; it is a direct, verified consequence of two things already shipped: `0.7.2`'s own attachment storage (`uploadAttachment`/`downloadAttachment`, `src/cloud-store.js`, writing to and reading from real Firebase Storage — not a browser-local layer) and `0.7.3`'s field-level sync of the `sources` collection (`storagePath` is a plain field on each `sources` document, propagated to every device with Trip access exactly like every other synced field). A second device that receives a synced source record with `storagePath` set can already call `downloadAttachment()` and get the real file bytes, through the same CORS-safe `getBytes()` path `0.7.2`'s own `V7-F06` fix established. **This candidate's real remaining scope is the synchronized-deletion half (`V7-F08`) — and it is smaller than the scope document anticipated, because `admin-delete-account.mjs` already does it correctly.**

## 1. Current-state verification (answers to the design-request prompt's checklist)

- **Central question — does cross-device retrieval already work:** **Yes, confirmed by direct code inspection, not assumption.** `uploadAttachment` (`cloud-store.js:274`) writes to `trips/{tripId}/sources/{sourceId}/{filename}` in real Firebase Storage via `uploadBytes()`. `downloadAttachment` (`cloud-store.js:288`) reads back via `getBytes()` — the Storage SDK's own network layer, deliberately chosen over `getDownloadURL()` + `fetch()` specifically to avoid a browser-CORS dependency (`V7-F06`'s own fix, already live). `sources` is a `SYNCED_COLLECTIONS` entry (`operational-data.js`), so `storagePath` reaches every device with Trip access through the exact same field-level sync every other record already uses — no new sync mechanism needed. `openSource()` (`v5-app.js:957`) is the one call site that reads `source.storagePath` and downloads; it works identically regardless of which device originally uploaded the file.
- **`deleteAttachment`'s actual call sites:** exactly one — `deleteTripCompletely` (`cloud-store.js:167`), the full "מחיקת הטיול הנוכחי" (delete this Trip) action. Confirmed by `grep`, not assumed. **A second, more significant gap found that the scope document's own framing didn't name:** `clearAllTripContent` (`cloud-store.js:152`) — the "מחיקת נתוני הטיול" (reset Trip data, keep the Trip itself) action — deletes every record in every `SYNCED_COLLECTIONS` collection, **including `sources`, and never calls `deleteAttachment` at all.** Every attachment on a Trip becomes a permanently orphaned Storage object the moment a user resets Trip data, with no code path ever able to clean it up afterward (the Firestore record holding `storagePath` is gone too). This is a real, currently-reachable bug, not a hypothetical — and it's a bigger source of orphaned Storage than the scope document's own "deleting an attachment or Item" framing, because **neither of those is actually possible today**: `sourceRow()` (`v5-app.js:437`) has no delete action at all (only open/analyze), and `delete-item` (`v5-app.js:1275`) never touches `state.sources` — it only unlinks a source back to "unassigned," explicitly preserving it (confirmed by its own confirm-dialog text, "המקורות יחזרו למסמכים"). So the real, complete picture of `V7-F08` today is: **the only two ways a source's Storage file is ever removed are `deleteTripCompletely` (handles it correctly) and `clearAllTripContent` (doesn't handle it at all).**
- **`admin-delete-account.mjs`'s own deletion path (open question 3):** **already correct — no fix needed.** It calls `getStorage(app).bucket().deleteFiles({prefix:'trips/${tripId}/'})` *before* `firestore.recursiveDelete(tripDoc.ref)` (`admin-delete-account.mjs:135-145`), deliberately ordered so a failure partway through never leaves an orphaned Storage prefix with nothing left to explain it — the same ordering discipline `deleteTripCompletely` already uses, just via a prefix-based bulk delete instead of per-source iteration. This is actually the *better* pattern of the two existing approaches (§4 below proposes reusing it).
- **Offline file upload (open question 4):** **not currently supported, and fails cleanly, not silently.** `storeOriginal` (`v5-app.js:946`) directly `await`s `uploadAttachment`, a real Firebase Storage network call with no offline queueing (Storage's SDK has no equivalent to Firestore's own offline persistence, which `0.7.3`'s design work already established is specific to Firestore documents). Its caller (`ingest()`, and the equivalent `smartIngest()`/`attachIngest()` paths) wraps the call in try/catch: on failure, the source is removed from `state.sources` and the user sees a clear `alert()` ("שמירת המקור נכשלה. לא נוצרה הצעה.") — no suggestion or item is created. This satisfies the frozen "no silent data loss" invariant already (the user is told plainly, immediately), it just doesn't queue-and-retry the way a structured-data edit does.
- **Storage/security-rules coverage:** `storage.rules`' `hasTripAccess(tripId)` already scopes attachment access to the Trip's own `ownerUid`/`editorEmails` — the same rule `0.7.2` wrote and `0.7.5` left untouched (0.7.5's own `isInvited()` change composes with it unchanged). No gap found here.

## 2. Original-source sync mechanism

No new mechanism to build. §1 already confirms retrieval works today via the existing Storage read + `0.7.3`'s existing field-level `sources` sync. The one behavioral gap worth closing, not because retrieval is broken but because the messaging is stale: `openSource()`'s own fallback message when `!source.storagePath` reads "קובץ המקור אינו זמין אופליין במכשיר זה" ("the source file isn't available offline on this device") — implying a per-device availability problem. In the cross-device-confirmed-working world this design establishes, the only way `storagePath` is genuinely absent is a source that was never actually uploaded (e.g., a `save-only` source saved before an upload completed, or a source predating `0.7.2`'s own Storage migration) — not a device-specific gap. **Recommendation:** reword this one message to reflect what it actually means now ("קובץ המקור אינו זמין — ייתכן שהוא לא הועלה בהצלחה" / "the source file is unavailable — it may not have uploaded successfully"), a copy-only change, not a mechanism change.

## 3. Encryption and retention semantics (open question 1)

**Encryption:** Firebase Storage encrypts all data at rest by default, a Google Cloud platform guarantee independent of this project's own code — nothing to build or configure. Stated here explicitly, per the scope document's own request, rather than left as a silent assumption.

**Retention:** already fully answered by the frozen contract's own text, unchanged by this candidate: an original persists until explicit deletion (of the source, or of the whole Trip), no time-based expiry. `0.7.2`'s 24-hour processing-*copy* retention (raw uploads, OCR artifacts) is a completely separate, already-closed concern — the *canonical* original this candidate is about is never subject to that window.

**One thing this design cannot verify from this environment:** whether the Firebase Storage bucket itself has any GCS-level lifecycle-management rule configured (e.g., an automatic object-expiry policy) outside this project's own code — that is a Console/`gsutil` configuration matter, not visible from a code read, and this project has no automated way to inspect it from here. **Recommendation:** the Product Owner confirm directly in the Firebase Console (Storage → bucket → Lifecycle rules) that no such policy exists; if one does, it would silently violate the frozen "persists until explicit deletion" contract regardless of what this candidate's own code does. Flagged as a verification step, not assumed clean.

**Conclusion:** no new code needed for either half of this open question — confirmation and documentation only, exactly as the scope document's own recommended default anticipated.

## 4. Synchronized deletion

### 4.1 The real `V7-F08` fix

Per §1's finding, the actual gap is narrower and different in shape than the scope document described: **`clearAllTripContent` needs to clean up Storage; `deleteTripCompletely` already does, correctly.**

**Recommended fix — extract and reuse `admin-delete-account.mjs`'s own prefix-based approach**, rather than extending `deleteTripCompletely`'s per-source iteration pattern to `clearAllTripContent`:

```js
// cloud-store.js
async function deleteAllAttachments(tripId){
  // one prefix-based sweep, not a per-source iteration -- catches any Storage object under this
  // Trip regardless of whether its owning source record still exists in Firestore, unlike the
  // current deleteTripCompletely approach (which can only delete what it can still enumerate).
  const prefix=`trips/${tripId}/sources/`;
  const list=await listAll(ref(storage,prefix));
  await Promise.all(list.items.map(item=>deleteObject(item)));
}
```

Called from both `clearAllTripContent` (new) and `deleteTripCompletely` (replacing its current per-source loop) — one single deletion-cleanup mechanism for the whole client-side codebase, mirroring how `admin-delete-account.mjs` already does it server-side. This is a genuinely small, self-contained fix: one new function, two call-site changes, no data-model or rules change.

### 4.2 Cross-device visibility of a deletion

Already correct, for free: `sources` is a synced collection, so deleting a source's Firestore record (as part of either reset or full-delete) already propagates to every device via `0.7.3`'s existing real-time listener — a second device's `openSource()` call will see the record gone (or `storagePath` gone) and correctly refuse to fetch a file that no longer exists. No new sync-visibility work needed; §4.1's fix is purely about the Storage side no longer being left behind.

### 4.3 `admin-delete-account.mjs` (open question 3)

**No fix needed** — confirmed in §1, its existing `bucket().deleteFiles({prefix})` approach already correctly removes every Storage object under a deleted account's owned Trips, ordered before the Firestore delete. If anything, §4.1's new `deleteAllAttachments` helper could be seen as bringing the *client-side* code up to the standard `admin-delete-account.mjs` already set, not the other way around — worth noting for anyone who assumed the server-side deletion function was the less-careful one.

## 5. Offline file upload (open question 4)

Per §1: not supported today, fails cleanly and visibly (an `alert()`, no silent loss), not a mechanism `0.7.3`'s offline queueing extends to. **Recommendation: document this as a known, accepted limitation, not a defect this candidate needs to fix.** Building real offline-queued binary upload (persist the file locally, retry on reconnect, reconcile if the same source was also modified elsewhere while queued) is materially different work from anything else in this candidate's scope — closer in shape to `0.7.3`'s own original sync-engine design effort than to a documentation confirmation. Recommend treating it as explicitly out of `0.7.6`'s scope, flagged as a possible future candidate if the Product Owner decides offline file capture is worth the real design work it would need — not silently deferred, but not built here either.

## 6. Acceptance-test protocol

Two real accounts/devices needed, matching `0.7.3`'s own established two-device convention (no new account infrastructure required):

1. **Cross-device retrieval (confirms §0/§1's own finding, not new behavior):** upload a source (any Smart Import document or manual attachment) on device A. On device B (a second browser/device signed into the same Trip), open the same item/source and confirm the original file opens correctly — this should already work today, on the current Production build, before any `0.7.6` code ships; running it here is a baseline confirmation, not a test of new code.
2. **`V7-F08` fix — reset Trip data cleans up Storage:** on device A, note a source's `storagePath` (via the Firebase Console or the `qa`-only `window.__ft` debug hook). Reset Trip data ("מחיקת נתוני הטיול"). Confirm in the Firebase Console that the Storage object at that path is actually gone, not just the Firestore record.
3. **`V7-F08` fix — full Trip deletion still works:** confirm `deleteTripCompletely`'s existing, already-correct behavior is unaffected by the `deleteAllAttachments` refactor (a regression check, not new behavior).
4. **Cross-device deletion visibility:** delete a source's owning Trip content on device A (either reset or full delete); confirm device B's own `sources` list updates via the existing sync (no manual refresh needed) and no longer offers to open the removed source.
5. **Offline upload's documented behavior:** attempt a file upload while device A is offline; confirm the existing clear failure message appears (not a hang, not a silent loss) — confirms §5's documented-limitation decision matches actual behavior, not just intent.
6. **Storage-cleanup regression test:** a genuine test-suite assertion (not just manual QA) confirming `deleteAllAttachments` is called from both `clearAllTripContent` and `deleteTripCompletely`, and that the old per-source-iteration code path in `deleteTripCompletely` is gone, not left alongside the new helper.

## 7. Effort/risk assessment

**Smaller than `0.7.2`/`0.7.3`/`0.7.5` — the design-first gate was the right call to *request*, but the investigation it produced shows most of the anticipated risk doesn't actually exist.** The central technical uncertainty (does cross-device sync need to be built) resolved to "already works," and the account-deletion question resolved to "already correct." What remains is: one new helper function (`deleteAllAttachments`), two call-site changes, one copy-text fix (§2), and documentation of two already-true facts (encryption, retention) plus one already-true limitation (offline upload). No new data model, no new security rule, no new Netlify Function, no new dependency.

**Recommend going straight to implementation as a single small candidate, not splitting further** — there's no natural sub-candidate boundary here, and the actual code change is comparable in size to `0.7.4.1`/`0.7.5.1`'s own corrections despite this candidate's design-first origin. The one genuine open item requiring a Product Owner decision before implementation, not a code question: whether to spend design/implementation effort on real offline file-upload queueing (§5) or explicitly defer it — recommend deferring, as stated there.
