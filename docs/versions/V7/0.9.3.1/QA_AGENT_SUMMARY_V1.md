# Beta 0.9.3.1 — summary for the QA agent (erasing a trip's data is Owner-only)

**Build to test:** `0.9.3.1-2a4890e4` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.3-3a11a6d1`). Settings → אודות shows `0.9.3.1`; if it shows `0.9.3`, close and reopen the app or clear the site's data. Developer's report: `IMPLEMENTATION_REPORT_V1.md`.
**Scope:** one correction, nothing else. The PO reversed the 2026-11-07 14:16 decision: a non-owner Editor must **not** be able to erase a shared trip's data (only the Owner may erase data or delete the trip).

## What to check (Settings → מחיקה)
1. **A trip you own** (e.g. QA Test Trip): both options show their buttons, unchanged — "מחיקת נתוני הטיול" and "מחיקת הטיול הנוכחי". *Do not press the erase button on the QA trip unless you mean to destroy its data; use a throw-away trip you created.* On a throw-away owned trip, erasing the data still works (the trip name and dates stay) and deleting the trip still works.
2. **A trip shared with you** (you are an Editor, e.g. "טיול ניסיון 2026" under "משותפים איתי"): **neither button is shown.** Each option shows a note instead: "רק בעל הטיול יכול למחוק את נתוני הטיול. הטיול הזה שותף איתך." and "רק בעל הטיול יכול למחוק אותו. הטיול הזה שותף איתך."
3. **An Editor's ordinary deletes still work** on the shared trip: delete one task, one shopping item, one item; un-find a Bingo cell (single-item deletes are unchanged).
4. 360px: the two notes wrap cleanly, no horizontal scroll.

## Known limit — do not report as new (PO decision, 2026-11-07)
The enforcement is **in the app only**. `firestore.rules` is unchanged and still lets an Editor delete documents directly, so an Editor using a modified client could still do it; Firestore rules cannot tell "erase all" from ordinary single deletes, and a stronger design (Owner-only deletes through a server function, or soft delete) was declined for this correction. Do not test by calling Firestore directly.

## Developer's live check
Owner trip: both buttons present. Shared trip ("טיול ניסיון 2026"): no buttons, both notes shown. Not exercised: pressing erase on the owned QA trip.
