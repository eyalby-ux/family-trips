# Beta 0.8 Phase 3 (final phase) — summary for the QA agent (real-phone acceptance)

**Build:** `0.8.0-phase3-f7ef017e` on `https://qa--familytripz.netlify.app` (qa only, never Production). Check Settings → אודות for the exact string; if the phone shows an older build, close and reopen the app (or clear the site's data) first.
**Trip:** "QA Test Trip". **Full test steps and the Development Agent's own verification:** `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–I). This note is the short version plus what exists on the trip for you.
**What this round is:** the last phase of Beta 0.8 — Games, Settings, Timeline, Shopping, the participant delete (`P12-F3`), the document-source delete (`P12-F7`), `P23-F1`, `P23-F2`, the empty / loading / offline states, and the §9 accessibility pass. **A GO here is the GO for the single combined Production promotion of Beta 0.8 (decision `V147`).**

## What exists on the trip for you (seeded for these tests on 2026-10-11; everything new is prefixed `QA3`)

| Where | What | Use it for |
|---|---|---|
| Trip Center → משחקים ופעילויות | 6 built-in games (none favourited) | the catalog, the five filters, the star, a game page |
| Trip Center → קניות | **places:** "Platinum Fashion Mall" and **`QA3 חנות בדיקה`** (Siam Paragon, no date). **Items:** `QA3 מטען נייד` ×1 (owner **Paula**, at `QA3 חנות בדיקה`), `QA3 מתנות` ×3 (**shared**, at `QA3 חנות בדיקה`), `QA3 קרם הגנה` ×2 (owner **Daniel**, no place), plus the older `נעליים` (Eyal, at Platinum), `QA22 קנייה של פאולה` (Daniel), `QA22 קנייה משותפת` (Paula) | the owner and place filters (e.g. owner Paula + place `QA3 חנות בדיקה` → exactly `QA3 מטען נייד`; place "ללא מקום" → `QA3 קרם הגנה` and the QA22 items), the chips, the place rows |
| Trip Center → הכנות (tasks) | **`QA3 משימה באיחור`** (due 6 Oct, High, open → overdue); **`QA3 משימה שבוצעה (תאריך עבר)`** (due 3 Oct, **done** → must not be highlighted); three older open tasks dated 4–5 Oct (overdue); `QA22 משימה עם שם ארוך…`, `QA22 משימה לכולם` (undated); one "לכל הטיול" task | the overdue highlight, and what is **not** highlighted |
| Settings → משתתפים | the 6 original participants, **all with assignments** (28 / 29 / 15 … each), and **`QA3 ללא שיוך`** — **nothing assigned to them** | the disabled bin with its reason on the six, the working two-step delete on `QA3 ללא שיוך` |
| Trip Center → מסמך | **`QA3-delete-me.png`** — a source saved without analysis (not a ticket, not confirmed) | the "מחק" button and its single confirmation |
| Trip Center → אטרקציה → **QA22 כרטיסים — קרוסלה** | now **3 ticket slides**: `QA22-b.png` (Paula + Daniel, confirmed), `QA22-a.png` (Eyal, confirmed), **`QA3-ticket-unconfirmed.png`** (Paula, **not confirmed**); summary "כרטיסים: 3/6" | "⋯" on the unconfirmed slide offers **"מחק"** (also "שיוך", "הסרה"); on a confirmed slide it offers **"ביטול אישור"** and **no "מחק"** |
| Timeline (October) | hotel Hyatt Regency 5–7 Oct, other multi-day hotels / rentals / ferries, flights, attractions | the coloured dots, the legend and the multi-day bars |
| Trip Center → מסמך | many real sources; **four leftover confirmed tickets: `QA12-f3.pdf`, `QA22-a.png`, `QA22-b.png`, `QA22-single.png`** | the rule that a confirmed ticket has no "מחק" |

**The two delete tests are ready to run** on `QA3 ללא שיוך` (participant) and on `QA3-delete-me.png` / `QA3-ticket-unconfirmed.png` (sources). Each can be deleted once; to repeat a test, create another one (Settings → משתתף חדש; + → מסמך, untick "ניתוח והצעת פריט" → "המשך").

The trip now has 6 active participants (אייל, פאולה, דניאל, עמית, עפרי and `QA3 ללא שיוך`) and one inactive ("Test6") who must **not** appear in the Shopping owner filter; the ticket summary therefore reads "כרטיסים: 3/6", not 3/5.

## What to check (expected results)

1. **Games** (Trip Center → משחקים ופעילויות): a compact list — icon, name, "who · how long", chevron — **not cards**; a separate **star button** at the end of each row with a visible gap; five chips (הכול / מועדפים / 10 דקות / בנסיעה / לכולם), the active one ink with white text. Tapping the star **does not open the game**; "מועדפים" then lists it first; "מועדפים" with none shows an empty state ("אין מועדפים עדיין" + "הצגת הכול"). A row opens a page: back arrow + icon + name on one line, the description, a facts box and one wide **"התחל פעילות"** button (a short toast — no timer). All games are non-interactive, so "התחל משחק / המשך משחק" never appears.
2. **Shopping**: the title "קניות" and the section headings carry **no emoji**; "מקום חדש" and "פריט חדש" are **identical outline buttons with a "+"**, centred with their headings; the place row is a quiet bordered row (store icon, name, date). Two filters **"בעלים"** and **"מקום"** default to "הכול"; pick an owner → only their items, and the line "3 פריטים" becomes **"N מתוך 3 פריטים"** with "איפוס"; pick a place too → both apply; a combination with nothing → "אין פריטים תואמים". Rows: checkbox, name, **owner chip** on one line, a muted line below; tap a row = edit (the delete is inside the edit screen).
3. **Overdue tasks**: an open task whose date has passed is a **pink row with a terracotta border**, a clock and **"באיחור · <date>"**; ticking it done removes the highlight; a done task with an old date, a "לכל הטיול" task and an undated task are normal. The Tasks header is "משימות" + a small "+ משימה חדשה"; the filters are two per row.
4. **Category pages**: Trip Center → any category — the **back arrow, the type icon and the title are one line**.
5. **Settings**: a "הגדרות" title; section cards; each participant is a compact card with **עריכה / השבתה / a bin**. For all six existing participants the bin is **greyed out** and the card says **"לא ניתן למחוק: יש N שיוכים. אפשר להשבית את המשתתף במקום."** On `QA3 ללא שיוך` the bin is active → tap it → **"למחוק את QA3 ללא שיוך לצמיתות? לא ניתן לשחזר."** → "ביטול" closes it; "מחיקה סופית" removes the card and a short message "המשתתף … נמחק" appears; after a reload they are still gone. Optional: before deleting, assign `QA3 ללא שיוך` to a task (edit a task → participants) and confirm the bin becomes greyed out with the reason; unassign to bring it back.
6. **Delete a document source**: Trip Center → מסמך → `QA3-delete-me.png` has a **"מחק"** button → one confirmation → it is gone. On `QA22 כרטיסים — קרוסלה`, the **unconfirmed** `QA3-ticket-unconfirmed.png` slide's "⋯" menu has **"מחק"** → confirm → the slide disappears (the summary stays "3/6": only confirmed tickets count). The four confirmed tickets (`QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single`) have **no** "מחק"; a confirmed one's "⋯" shows "ביטול אישור" and, after un-confirming, "מחק" (this also lets you clean up the leftovers).
7. **Timeline**: the title "ציר הזמן"; the mode chips (כל הטיול / יום / שבוע / חודש) are ink when active; the calendar's **day dots have a colour per kind of event** (flight, hotel, transport, attraction, …) with a **legend** under the grid; a **hotel / multi-day event is a coloured bar through every day it covers** (Hyatt: 5, 6, 7 Oct, joined); today has a terracotta border; the selected day an ink border; in day / week / month the previous / next are **arrows** (next points left). A period with nothing shows an empty state.
8. **Offline strip**: airplane mode on → a soft-terracotta strip "אופליין — המידע המקומי זמין" (after an edit: "… N שינויים ימתינו לסנכרון"); reconnect → it disappears at once, no success message.
9. **General**: nothing cut off or scrolling sideways on any screen; no English headings; dialogs close with a line "✕" icon; buttons are comfortable to tap.

## Known limits — please do not report as new

- **No interactive game exists**, so "התחל משחק / המשך משחק" cannot be seen (built and unit-tested); "התחל פעילות" only shows a toast. Whether to build a game is a Product Owner question.
- **Calendar day cells are 40px wide at 360px screens** (45px at 390px) — seven columns cannot be 44px there. Heights are 56px.
- **`P23-F2` uses the terracotta only for the row border and the clock icon;** the words "באיחור · date" are dark ink on purpose (terracotta text on white is 3.9:1, under the 4.5:1 accessibility bar).
- The five game chips wrap to a second line on a phone.
- **Four confirmed QA ticket sources remain** (`QA12-f3.pdf`, `QA22-a.png`, `QA22-b.png`, `QA22-single.png`) — by design they need "ביטול אישור" first; the Development Agent did not un-confirm tickets on the shared trip without the Product Owner's say-so.
- The admin list's loading skeleton is too brief to see; the offline strip's "N changes" count needs a real offline edit.
- `QA3 ללא שיוך` also shows in the participant pickers and the Shopping owner list while it exists — expected.
- The per-type calendar colours were restored at the Product Owner's request (2026-10-08); spec §1's "one accent per area" does not cover them — recorded in the session document.
- Not Production: Phase 3's own GO triggers the single combined promotion of Beta 0.8.

## Cleaning up afterwards

Delete the `QA3…` items: tasks (tap the row → delete inside the edit screen), shopping items and the place `QA3 חנות בדיקה`, the participant `QA3 ללא שיוך` and the two `QA3` sources if the delete tests did not already remove them. The `QA22` items, packing items, tasks and shopping items are still on the trip from the previous rounds; the `QA22 קטגוריה ריקה` packing category has no delete action (harmless). The four confirmed `QA12` / `QA22` ticket sources can now be removed with "ביטול אישור" → "מחק".
