# Beta 0.8 Phase 2.2 — summary for the QA agent (real-phone re-test)

**Build:** `0.8.0-phase2.2-a13825f7` on `https://qa--familytripz.netlify.app` (qa only, never Production). Check Settings → אודות for the exact string; if the phone shows an older build, close and reopen the app (or clear the site's data) first.
**Trip:** "QA Test Trip". **Full test steps and the Development Agent's own verification:** `docs/versions/V7/0.8.0-phase2.2/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–E). This note is the short version plus what was seeded for you.
**What this round is:** corrections for the 13 Non-blocking findings `P21-F1`–`F6` and `F8`–`F14` from the Phase 2.1 re-test (`P21-F7`, Shopping header alignment, is Phase 3 — do **not** expect it fixed).

## Seeded test data (all prefixed `QA22`, safe to delete afterwards)

| Where | What | Use it for |
|---|---|---|
| Trip Center → אטרקציה → **QA22 כרטיסים — קרוסלה** | provider + website + location; **3 ticket documents** (a: Eyal, **confirmed**; b: Paula + Daniel, not confirmed; c: Eyal + Paula + Daniel, not confirmed) and **1 other document** (`QA22-d.png`) | the ticket carousel (3 slides, loops), a confirmed and unconfirmed slide, "מסמכים נוספים", the inline map / "אתר" links |
| אטרקציה → **QA22 כרטיס יחיד** | provider + location; **1 confirmed ticket** (Paula) | the single-card form (no carousel, no dots) |
| אטרקציה → **QA22 בלי כרטיסים** | no documents | the empty card ("אין מסמכים מצורפים.") |
| אטרקציה → **הפועל תל אביב - הפועל פתח תקווה** (existing) | two confirmed tickets (Eyal, Paula) | a real 2-ticket carousel (does not loop at 2) |
| Trip Center → תחבורה / מלון / טיסה (existing items) | real phone numbers, websites, locations | map / "אתר" / "התקשרות" links on **other item types** |
| Packing → category "מסמכים וכסף" | `QA22 משותף לכולם בלי שיוך` (no one assigned), `QA22 לפאולה ולדניאל` (2), `QA22 לשלושה` (Eyal, Paula, Daniel), `QA22 לארבעה` (Paula, Daniel, Amit, Ofri), `QA22 לכל המשתתפים` (all 5), `QA22 פריט עם שם ארוך מאוד…` (3 people, long name) | chip rules and the chip-on-the-name's-line rule |
| Packing → category **QA22 קטגוריה ריקה** | no items | the empty-category state |
| Tasks | `QA22 משימה עם שם ארוך מאוד…` (3 people), `QA22 משימה לכולם` (everyone) | the chip on task rows |
| Shopping | `QA22 קנייה של פאולה` (owner Paula), `QA22 קנייה משותפת` | the owner dropdown |

The trip has 5 active participants (אייל, פאולה, דניאל, עמית, עפרי) and one inactive ("Test6") who must **not** appear in any picker or in the Shopping owner list.

## What to check (expected results)

1. **Item page** (any `QA22 כרטיסים` item, plus one hotel / transport / flight): a small back arrow and the type chip on **one row**; the **location name is the map link** (pin, underlined) and "אתר" sits **at the end of the provider row**, on **every** type; a phone gets its own "התקשרות" row; **no** "ניווט" / "אתר" / phone buttons and **no "פרטי הכרטיס" card**. Order: facts → "כרטיסים ומסמכים" → הערות → עריכה/מחיקה.
2. **Ticket carousel** (קרוסלה item): one ticket per slide; only a **small sliver (~20px)** of the next slide shows; swipe moves exactly one ticket and loops (3 → 1); "1 / 3" counter; **"⋯" opens a menu that floats above the page and is never cut off** (ביטול אישור / שיוך / הסרה); the unconfirmed slide shows "לא אושר ככרטיס" + a filled **"אישור ככרטיס"** on **one line**; holder name and "כרטיסים: 1/5" are **one line each**; nothing sticks out past the slide's edge. "QA22 כרטיס יחיד" shows one card, no dots.
3. **Packing** (phone): one header row ("רשימות אריזה" + a small outline "+ קטגוריה", no explanation text); the **first category is in the top half of the screen**; select **Paula** → shared items read **"פאולה +3"** (4 people), **"פאולה +2"** (3), **"פאולה, דניאל"** (exactly 2) and **"כולם"** (all 5); select Eyal → "אייל +2"; the chip is on the **same line as the item name**, at the end, a long name is cut with "…" and the chip stays whole. The **"QA22 קטגוריה ריקה"** category says "אין פריטים בקטגוריה" with no progress bar and no "0/0", plus "+ הוספת פריט". (The "משותף" view only lists items with nobody assigned, so chips are only visible in the person views.) **Tasks:** title and chip on one line; priority and date below.
4. **Shopping**: add/edit an item → "בעלים" is a **dropdown** (משותף + the 5 active people, no "Test6"); the chosen name shows on the row and is kept on reopening.
5. **"+" dialog**: four tiles in one row (ידני / מסמך / קישור / משימה), **no QR or JSON**, selected tile soft-teal with an ink border; the file field, the "ניתוח והצעת פריט" checkbox and "המשך" are all on screen **without scrolling** (also with the keyboard open on "ידני"/"קישור").
6. **Analysis screen**: Add → מסמך → pick a real PDF/photo → "המשך": the dialog's options disappear; a **large palm centred**, "מנתח…", the rotating status line, the bar, the reassurance line, a **greyed "המשך" at the bottom**, and the title + ✕ **visible at the top** (not under the dark bar). With "reduce motion" on, the palm does not move.

## Known limits — please do not report as new

- Shopping section headers ("מקום חדש"/"פריט חדש") are not aligned yet — `P21-F7`, Phase 3.
- A document that is not a failed analysis cannot be deleted from the UI (`P12-F7`, Phase 3); the QA Trip has several `QA12-*` / `QA22-*` source documents (Trip Center → מסמך → מקורות) and a few rejected proposals. They are harmless.
- Removing "פרטי הכרטיס" also removed the activity's price, duration, age limit, included items and meeting point from the **saved item page** (still on the review screen) — a decision for the Product Owner, flagged in the session document.
- Participant-view chips use first names ("פאולה +3"); the two-name case in the shared/task rows shows full names.
- Not Production: Phase 3's own GO triggers the single combined promotion.

## Cleaning up afterwards

Delete the `QA22` items (item page → מחיקה; packing / task / shopping rows → tap → "מחיקת …" inside the edit screen). The `QA22 קטגוריה ריקה` packing category has **no delete action** in the app and stays (harmless). Source documents named `QA22-*.png` stay until `P12-F7`.
