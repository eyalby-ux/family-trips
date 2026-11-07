# Beta 0.9.3.3 — summary for the QA agent (Bingo intro page, 3×3 places, "במטוס")

**Build to test:** `0.9.3.3-5cf52fda` on `https://qa--familytripz.netlify.app` — qa only, **not** Production. Settings → אודות shows `0.9.3.3`. Real phone, 360 and 390px. Design: `https://claude.ai/artifact/RccEa7eEDDDG6RNTM8QCmn` (approved). Developer's report: `IMPLEMENTATION_REPORT_V1.md`.
**Scope (Bingo only):** the place moved to the intro page; the game page keeps only "איפוס הלוח"; a ninth place "במטוס"; the places in a 3 × 3 grid. (`0.9.3.2` — two Bingo labels — is also on qa and has its own report.)

## Check
1. **Intro page** (open the game from the games list, before playing): description, facts, **"איפה אתם עכשיו?" with nine places in a 3 × 3 grid** (שדה תעופה, מטוס, חוף / עיר, מלון, בדרכים / מסעדות, טבע, גן חיות), the chosen one highlighted; "משתתפים" row; the start button. At 360px the tiles fit, nothing scrolls sideways, the labels are not cut.
2. **First visit** (a trip that never chose a place — a new trip, or one that never opened Bingo): no tile highlighted; the start button is **disabled** with "בחרו מקום כדי להתחיל."; choosing a place enables it ("התחל משחק").
3. **Changing the place** is done **here**: pick another tile → "המשך משחק" opens that place's board. Progress and photos of each place are kept separately (go back, switch, come back).
4. **Game page:** the toolbar has only the **place as plain text** (icon + name, not tappable) and **"איפוס הלוח"**; no picker, no "החלפת מקום". The carousel of participants, "N/16 נמצאו" and the 4 × 4 board are as before. The back arrow returns to the intro page.
5. **"במטוס"** — a new place, sixteen spots: חלון עגול, כנף המטוס, עננים מבחוץ, מגש אוכל, חגורת בטיחות, כרטיס הוראות בטיחות, כרית צוואר, מתחת לכיסא, אונייה בים, מסך בידור, אי קטן בים, כפתור קריאה לדיילת, מנורת קריאה, כוס עם שתייה, סלפי עם דייל/ת, שלט יציאת חירום. **PO review needed:** is each spot findable from a seat and acceptable (note: "סלפי עם דייל/ת" is the PO's own item — a selfie with a crew member; check it reads clearly and that "מתחת לכיסא", "אונייה בים" and "אי קטן בים" make sense in the list)? Take one photo on this place to confirm the camera / save works as in the others.
6. Existing boards (other places, photos, found counts) are untouched; participants selection (the "משתתפים" row) still works.

## Known limits — do not report as new
- The "במטוס" list was written by the developer and is awaiting the PO's review.
- The place label on the game page is text only (by the design); the only way to another place is the back arrow.
- Developer's live check did not take a photo or test the first-visit state (it is pinned by a test).
