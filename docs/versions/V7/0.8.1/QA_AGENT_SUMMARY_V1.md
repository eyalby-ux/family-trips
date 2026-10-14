# Beta 0.8.1 — summary for the QA agent (real-phone acceptance)

**Build:** `0.8.1-0ceea747` on `https://qa--familytripz.netlify.app` (qa only, never Production — Production runs `0.8.0-phase3.2-24f0575f`). Check Settings → אודות for the exact string; if the phone shows an older build, close and reopen the app (or clear the site's data) first.
**Trip:** "QA Test Trip". **Full steps and the Development Agent's verification:** `docs/versions/V7/0.8.1/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–G). **Scope:** `docs/roadmap/FAMILY_TRIPS_0_8_1_SCOPE_V1.md`; design spec `V7.5`. Check at **360 and 390px**.

## What exists on the trip

As after the Phase 3.2 re-test. Useful for these tests: **`QA22-a.png`** (a confirmed ticket for Eyal, linked to "QA22 כרטיסים — קרוסלה"), **`QA31-ticket-unconfirmed.png`** (confirmed for Paula, linked to the same item), **`IMG-20260923-WA0089.jpg`** and many other documents linked to nothing. The items **"היום בערב"** and **"מלון בערב"** (12 Oct) are the Product Owner's own test items from the Phase 3.2 session — leave or delete as the Product Owner says.

**For Test F the trip already has two prepared hotels** — **"QA 0.8.1 מלון עם טלפון"** (three buttons) and **"QA 0.8.1 מלון בלי טלפון"** (two) — starting today 23:58 and ending tomorrow 11:00, so they show on "היום" (if you test after midnight they are still in progress and show). Delete them afterwards.

**Already verified by the Development Agent (functional PASS, see the session document):** checks 1–5, 7 and the automated gate in 8. **Left for the phone (visual/touch):** the look of all of the above at 360 and 390px; check 6 live (second account).

## What to check (expected results)

1. **Tasks filter (`P32-F1`):** הכנות → the "משתתף" filter has its own **full-width row**; "כל המשתתפים" shows in full with space before the chevron.
2. **Documents chip row (`P32-F2`):** מסמכים → scroll the chips sideways → tap one → the row **stays where you scrolled it**, the chip is highlighted, the list is filtered. (Cause was the scroll position resetting, not the selection.)
3. **Linkage indicator:** every document row has a muted line with a link icon: **"מקושר ל־<item>"** (several: every name; the type in brackets only if two items share a name) or **"לא מקושר לפריט"**.
4. **Re-link:** a row's "⋯" → **"קישור לפריט"** → a picker of the trip's items by type (an item that already has the document is greyed "כבר מקושר") → "קישור" → message "המסמך קושר ל־…" and the row's line now lists it. Remove the extra link afterwards from that item's page ("⋯" → "הסרה").
5. **Delete (hard delete):** a row's "⋯" → **מחק** (press **ביטול** unless you mean it). Three wordings: **unlinked** → "למחוק את … לצמיתות? … ולא ניתן יהיה לשחזר אותם."; **linked** → plus "המסמך מקושר לפריט/ים: A, B — הקישור יוסר ממנו/מכולם."; **confirmed ticket** → plus "המסמך מאושר ככיסוי כרטיס עבור <people> — מחיקתו תבטל גם את הכיסוי." "מחק" is on **every** row now. (The ticket slide's "⋯" on an item page still has no delete for a confirmed ticket, only "הסרה" = un-link.)
6. **Removed account (`V7-F14`):** an account removed from the trip is told **"החשבון שלך הוסר מהטיול הזה…"** (about 9 seconds) instead of the generic cloud message. Needs a second account (add `familytriptzs@gmail.com` in Settings → שיתוף הטיול, open the trip with it, remove it from the owner's phone, then edit something on the removed account); other failures keep their old wording.
7. **Today buttons (`BL-ICONS-1`):** ניווט (compass) · אתר (globe) · התקשרות (phone) · כרטיסים (ticket): rows of **two** show **icon + label**; a row of **three** shows **three equal icon-only buttons together** (at 360 and 390px) — never a mix. All 44px high; the label is the accessible name / tooltip.
8. **Regression:** everything that passed in `docs/versions/V7/0.8.0-phase3.2/PO_SESSION_RESULTS_V1.md` still passes.

## Known limits — please do not report as new

- The documents list's delete is labelled **"מחק"** (the approved Phase 3 menu pattern), not "הסרה"; the old "הסרה" button no longer exists in that list.
- "קישור לפריט" is a **new small picker** — there was no existing "attach an existing document" flow to reuse.
- Hard delete has **no undo window** (as scoped); the confirmation is the safeguard.
- The three-button Today row is icon-only at **both** 360 and 390px (icon + label does not fit); two-button rows keep their labels.
- A four-button row (confirmed ticket on the same item) and the removed-account message were not exercised live by the Development Agent.
- Not Production: `0.8.1`'s own GO triggers its promotion.

## Cleaning up afterwards

Delete the two prepared "QA 0.8.1 …" hotels (or the ones you created) when Test F is done. Do not delete `QA22-a.png`, `QA22-b.png`, `QA22-single.png`, `QA12-f3.pdf` or `QA31-ticket-unconfirmed.png` unless the re-tests are finished (confirmed tickets: "ביטול אישור" first on the item page, or use the new "מחק" with its stronger warning).
