# Beta 0.9.3.1 — QA results (Owner-only erase)

Date: 2026-11-07. Build tested: `0.9.3.1-2a4890e4` on `qa`.
Full decision and test log: `PO_DECISIONS_0_9_3.md` (same folder).
Scope: the Owner-only erase correction. A participant who is not the owner of a trip can no longer erase the trip's data or delete the trip. The Owner keeps both buttons. The app gate is the only change; `firestore.rules` is unchanged.

## Verdict

PASS. All 0.9.3.1 checks pass on `0.9.3.1-2a4890e4`. The PO has decided to promote 0.9.3.1 to Production; the deploy is carried out by the developer under the usual promotion record.

## Results

| # | Check | Result |
|---|---|---|
| 13 | Build check: Settings → אודות shows `0.9.3.1-2a4890e4` | PASS |
| 13 | Owner view on the owned QA Test Trip: both buttons, "מחיקת נתוני הטיול" and "מחיקת הטיול" | PASS (nothing pressed) |
| 14 | Non-owner view on "טיול נסיון שני 2026" (shared with the PO): no buttons, both notes ("רק בעל הטיול יכול למחוק…", "הטיול הזה שותף איתך") | PASS |

## Limits (not new; known from the developer's report)

- The gate is in the app. A participant using a modified client could still delete documents directly, as before. Closing this needs Owner-only deletes through a server function, or soft deletes. Firestore rules are not changed in this build.
- Erasing the data of the owned QA trip was not pressed, so the owner erase itself was not re-run on 0.9.3.1 (it passed on 0.9.3-3a11a6d1 for "טיול לצוקים").
- Editor single-item deletes are unchanged by design.

## Decision

- PO (2026-11-07 17:08): "yes, and we can promote 0.9.3.1 to production also". Promotion of 0.9.3.1 to Production is the PO's decision.
