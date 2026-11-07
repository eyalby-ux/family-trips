# Beta 0.9.3, third build — summary for the QA agent (re-test of R-4 and P93-F3)

**Build to test:** `0.9.3-7b531008` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.2-87f38cd2`). Settings → אודות shows the build; if it shows `0.9.3-2c4327cb`, close and reopen the app or clear the site's data.
**What this build is:** only the two items from `QA_RESULTS_0_9_3_BUILD2.md` that were ready to build: **R-4** (wording) and **P93-F3** (trip deletion). The planned items **P93-P4** (participant selection, Option 2), **P93-P5** (Spotify / YouTube links) and **P93-P6** (participants in Bingo / Trivia) are **not built** — they are in planning. Everything else is unchanged from `2c4327cb`.

## 1. R-4 — the summary line
Pantomime page, under the rounds picker. The line now reads **"N משתתפים × תור R לכל משתתף = סה"כ T סיבובים למשחק"**, e.g. 5 participants, 1 each: "5 משתתפים × תור 1 לכל משתתף = סה"כ 5 סיבובים למשחק". Check it for rounds 1–5 and after adding/deactivating a participant; the line must wrap cleanly at 360/390px (no horizontal scroll).

## 2. P93-F3 — trip deletion
**Diagnosis (code, not yet confirmed on the PO's trip):** the throw-away trip "טיול לצוקים" is listed under **"משותפים איתי"** — the signed-in account is an **Editor**, not the Owner. The security rules allow only the **Owner** to delete a trip document; an Editor may erase its content. The old code first erased everything, then failed on the trip document with "מחיקת הנתונים בענן נכשלה. לא בוצע שינוי." — which was also **wrong**: the content had already been erased ("nothing changed" was false).
**What changed:**
- For a trip that is **not yours**, Settings → מחיקת הטיול הנוכחי no longer shows the button; it shows "רק בעל הטיול יכול למחוק אותו. הטיול הזה שותף איתך."
- The delete handler refuses a non-owner **before touching anything** ("רק בעל הטיול יכול למחוק אותו. לא בוצע שינוי.").
- For a trip **you own** nothing changed: the button and the deletion work as before.
**To test:** (a) open "טיול לצוקים" (or any trip under "משותפים איתי") → Settings → the delete section shows the note, no button; "מחיקת נתוני הטיול" is unchanged. (b) **Create a trip with the account that will own it** (the onboarding form, or "התחלת טיול חדש"), add a destination, then delete it with "מחיקת הטיול הנוכחי": it must disappear from "הטיולים שלי", and after a reload it must not return. **If (b) fails with the same message, the diagnosis is wrong — report the exact message and the console error.** Then delete the throw-away trip if you own it; "טיול לצוקים" belongs to another account and must be removed by its owner.

## Not exercised by the developer
The browser pane was signed out when this build was ready, so **neither fix was clicked through live**; both are covered by source-level tests and the full gate. Not run: onboarding (needs a brand-new account), reduce motion (removed by the PO), the phone check of songs.

## Known limits — do not report as new
- An **Editor can still erase a shared trip's content** with "מחיקת נתוני הטיול" (the rules allow it; unchanged, and flagged to the PO as a possible follow-up).
- Everything listed under "Known limits" in `QA_AGENT_SUMMARY_V2.md`.
