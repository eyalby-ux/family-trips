# Beta 0.9.3.1 — erasing a trip's data is Owner-only (implementation report)

**Build:** `0.9.3.1-2a4890e4` on `qa` only (Production runs `0.9.3-3a11a6d1`, promoted 2026-11-07). Commits `e119f5e` (the change and its tests), `2a4890e` (version bump to `0.9.3.1`), on `version/V7`. Kickoff: `PROMPT_FOR_CLAUDE_CODE_0_9_3_1_TRIP_DATA_ERASE_CORRECTION_KICKOFF_V1.md` (planning handoff folder). Full gate green: syntax checks, all tests (`beta-0-9-3.mjs` 23, including the F3 test extended for this change), production build.

## What changed (app side)
- **`deleteSection()`** (Settings → מחיקה): for a trip the account does **not own**, "מחיקת נתוני הטיול" no longer shows a button; it shows "רק בעל הטיול יכול למחוק את נתוני הטיול. הטיול הזה שותף איתך." — the same pattern the "מחיקת הטיול הנוכחי" option already had. The Owner sees both buttons exactly as before.
- **`resetCurrentTrip(removeTrip)`**: now refuses a non-owner on **both** branches (erase data and delete the trip), **before** touching anything: "רק בעל הטיול יכול למחוק את נתוני הטיול. לא בוצע שינוי." / "רק בעל הטיול יכול למחוק אותו. לא בוצע שינוי." An Editor's ordinary single-item deletes (a task, a shopping item, un-finding a Bingo cell…) are untouched — they never pass through this function.

## The server-side boundary — decision (Product Owner, 2026-11-07): **app gate only**
The kickoff flagged that `firestore.rules` lets any Editor delete subcollection documents directly (`match /{subcollection}/{docId} { allow read, write: if hasTripAccess(...) }`). What I found when designing the fix:
- **Rules cannot tell "erase all data" from ordinary single deletes.** The app deletes through the same per-document batches in both cases (`syncTripState` → `batch.delete`, and `clearAllTripContent` → `batch.delete`); a per-document rule sees only one delete at a time, so any rule that blocks the bulk wipe also blocks an Editor's everyday single delete.
- **`firestore.rules` is not deployed from this repository** (there is no `firebase.json`), and the Firebase project is shared by `qa` and Production — a rules change would go live for Production immediately, outside the qa → Production gate.
- Options put to the PO: (1) app gate only, (2) Owner-only deletes in the rules plus a Netlify function for Editors' single deletes (a large change to the sync engine and to offline deletes; a looped Editor could still wipe through the function unless rate-limited), (3) soft delete for Editors with Owner-only purge (the only truly enforced option; touches every list view and the sync engine — a separate version). **The PO chose (1).**
- **Consequence, stated plainly:** a non-owner Editor can no longer erase a shared trip's data **through the app**; an Editor using a modified client or the Firebase API directly could still delete documents, exactly as before (the same trust among invited family members as for any other edit). `firestore.rules` is unchanged.

## Verified live on `qa` (build `0.9.3.1-2a4890e4`, Settings → מחיקה)
- Owned trip (QA Test Trip): both buttons present (`reset-trip-data`, `delete-current-trip`).
- Shared trip ("טיול ניסיון 2026", the account is an Editor): no buttons; both notes shown ("רק בעל הטיול יכול למחוק את נתוני הטיול. הטיול הזה שותף איתך." and "רק בעל הטיול יכול למחוק אותו. הטיול הזה שותף איתך.").
- Not exercised: pressing "מחיקת נתוני הטיול" on the owned trip (it would destroy the QA data); the handler's refusal is pinned by the test and by the button not being reachable.

## Not promoted
`0.9.3.1` is on `qa` for independent verification. Production stays on `0.9.3` until the Product Owner instructs otherwise.
