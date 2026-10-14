# Family Trips Beta `0.8.1` (quick-fix bundle) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.1` (build `0.8.1-0ceea747`) on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production, which currently runs `0.8.0-phase3.2-24f0575f`). Scope: `docs/roadmap/FAMILY_TRIPS_0_8_1_SCOPE_V1.md` (`V1`); design spec `V7.5` (`docs/design/FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md`). Covers `P32-F1`, `P32-F2`, the documents-list re-link / linkage indicator / delete, `V7-F14` and `BL-ICONS-1`.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test at 360 and 390px. Settings → אודות shows the exact `0.8.1-<hash>`.

## What changed that you should know about before testing

- **Scope premises that did not match the code, and what I built instead:**
  1. **"הסרה" on the documents list** — that button no longer exists: Phase 3.1 replaced the row buttons with a **"⋯" menu** (פתיחה / שיוך למשתתף / divider / **מחק**, terracotta). The finding's real remaining gap was that **"מחק" was withheld from a confirmed ticket** (`P12-F7` excluded it). It is now offered on **every** document, with the confirmation the scope describes. I kept the label **"מחק"** (the menu pattern you approved in Phase 3), not "הסרה". The item page's own ticket-slide menu is unchanged (no delete on a confirmed ticket there; "הסרה" there still only un-links).
  2. **"Reuse the existing 'Attach to existing item' flow"** — there is no such flow for an *existing* document: the item page's "הוספת מסמך" takes a **new file**. So "קישור לפריט" opens a **small picker** I added (the trip's items grouped by type; an item that already holds the document is shown disabled "כבר מקושר"; "קישור" adds the link; people on a ticket document join a ticket-type item, add-only, as when you assign them).
- **Hard delete (the open question):** **no pushback.** I checked every place a document is referenced: items by `sourceIds` (the delete removes the id from every item), still-open proposals that came only from it (removed with it, as since Phase 3), accepted / rejected proposals (keep a dangling `sourceId`; every reader of it — `sourceById(...)` has 11 callers — tolerates a missing document), the stored file (deleted from Storage as before), and ticket coverage (derived from confirmed linked documents, so it disappears with the document — which is exactly what the confirmation says). Nothing else holds the id. No undo window.
- **`P32-F2` root cause (not just "fixed"):** the selection was never lost — `state.docFilter` is kept and the right chip stayed highlighted. The chip row is a **horizontal scroller** and `render()` rebuilds the whole screen, which makes a new element whose scroll position is back at the start, i.e. at "הכול" on the right. `render()` now carries the row's scroll position across the rebuild.
- **`P32-F1` cause:** the participant select shared a half-width cell with its chevron reserving too little room, so the longest value ("כל המשתתפים") ran under the arrow. It now has its own **full row**, and every select reserves 34px on the chevron side.
- **`V7-F14`:** a revoked or quarantined account's reads and writes are refused by the server with `permission-denied`. That code now gets: *"החשבון שלך הוסר מהטיול הזה, ולכן אין לו עוד גישה לנתוניו…"* (loading) / *"…ולכן השינויים לא נשמרים…"* (saving), both ending "אם זו טעות, פנו לבעל הטיול", shown for **9 seconds** (the usual notice is 2.6s). Every other failure keeps its old wording.
- **`BL-ICONS-1`:** Today's action buttons carry an icon (ניווט = compass, אתר = globe, התקשרות = phone, כרטיסים = ticket) **and** their label. A row of three or more whose icon + label do not fit **switches as a whole to icon-only** (label kept as the accessible name and tooltip); it is **measured after every render, on resize and when the fonts load**, so it follows the phone's text size too. In practice the three-button case (navigate + site + call, the hotel card) is icon-only at **both 360px and 390px**; two-button rows stay icon + label.

**State of the QA Trip when this session starts:** as after the Phase 3.2 re-test. Temporary items I created to measure (`QA81 …`) and my temporary link of `QA31-ticket-unconfirmed.png` to a second item were **removed**. Still on the trip, from your Phase 3.2 session: the items **"היום בערב"** and **"מלון בערב"** you created to test the Today row (dated 12 Oct) — I left them for you to decide.

## Test A — Tasks participant filter (`P32-F1`)

Trip Center → הכנות.
**Expect:** the "משתתף" filter has a **full-width row** of its own; "כל המשתתפים" shows completely with room before the chevron, at 360 and 390px; the other filters are unchanged.
**Development Agent verification (qa, 360px):** ☑ the filter's label spans the whole filter grid (286px), the select reserves 34px on the chevron side, the value is not clipped. **Result:** *(to be filled in by the Product Owner)*

## Test B — Documents chip row (`P32-F2`)

Trip Center → מסמכים; scroll the chip row sideways, tap a chip.
**Expect:** the row **stays where you scrolled it**; the chosen chip is highlighted and its documents are listed.
**Development Agent verification (qa, 360px):** ☑ with the row scrolled by −140px, tapping "לא משויך" left it at −140px (before and after, on the rebuilt element); the chip is active and the list filtered. **Result:** *(to be filled in by the Product Owner)*

## Test C — Documents list: linkage indicator and re-link

**Expect:** under each document row a muted line with a link icon: **"מקושר ל־<item>"** (several items: every name, comma-separated, the type in brackets only when another item has the same name), or **"לא מקושר לפריט"** — on every row, Failed and link rows too. In a row's "⋯": **"קישור לפריט"** opens a picker (items grouped by type; one that already holds this document is greyed "כבר מקושר"); choose an item → "קישור" → a short message "המסמך קושר ל־…" and the row's line now lists the new item too. Un-linking it again from that item's page ("⋯" → "הסרה") puts the line back.
**Development Agent verification (qa, 360px):** ☑ 45 rows: 24 show a linked line, 21 "לא מקושר לפריט"; on `QA31-ticket-unconfirmed.png` the menu is פתיחה / שיוך למשתתף / קישור לפריט / divider / מחק; the picker listed five groups (טיסות, מלונות, תחבורה, אטרקציות, מקום קניות) with 27 items, the already-linked "QA22 כרטיסים — קרוסלה" disabled; linking it to "QA22 בלי כרטיסים" showed "מקושר ל־QA22 כרטיסים — קרוסלה، QA22 בלי כרטיסים"; removing that link from the item page restored it. **Result:** *(to be filled in by the Product Owner)*

## Test D — Documents list: delete (hard delete, three confirmations)

In a row's "⋯" → **מחק** (choose **"ביטול"** on the dialogs unless you want the document gone).
**Expect:** (1) an **unlinked** document: "למחוק את <name> לצמיתות? המסמך והקובץ יימחקו ולא ניתן יהיה לשחזר אותם." and nothing else. (2) a document **linked to one or more items**: the same plus **"המסמך מקושר לפריט/ים: A, B — הקישור יוסר ממנו/מכולם."** — every linked item named. (3) a **confirmed ticket**: additionally **"המסמך מאושר ככיסוי כרטיס עבור <people> — מחיקתו תבטל גם את הכיסוי."** naming the covered people. Confirming deletes the record, the stored file and every link; the document is gone from the list and from the items. **"מחק" now appears on every row**, a confirmed ticket included. (The ticket slide's "⋯" on an item page still has no delete for a confirmed ticket.)
**Development Agent verification (qa):** ☑ all three dialogs captured and cancelled (nothing deleted): `IMG-20260923-WA0089.jpg` (unlinked) → the plain text; `QA31-ticket-unconfirmed.png` (two items, confirmed for פאולה כהן) → names both items and the coverage; `QA22-a.png` (one item, confirmed for אייל בן יצחק) → names the item and the coverage. The delete itself runs the same code as the Failed / archive deletes since Phase 3. **Not exercised:** an actual delete of a covered ticket on `qa` (it would remove QA data you may still need). **Result:** *(to be filled in by the Product Owner)*

## Test E — A removed account's message (`V7-F14`)

**Expect:** when an account that was **removed from the trip** (revoked / quarantined) opens it or tries to save, the notice says plainly that **the account was removed from the trip** and that changes are not saved, ending "אם זו טעות, פנו לבעל הטיול"; it stays up about 9 seconds. A normal connection problem still says "שמירת השינויים בענן נכשלה…" / "טעינת נתוני הטיול נכשלה…".
**Development Agent verification:** ☑ the wording, the `permission-denied` mapping and the unchanged wording of every other failure are unit-tested; both call sites (the save and the trip-load paths) use it and the 9-second duration. **Not exercised live:** it needs a second account that is first added to a trip and then removed (I cannot do that from here). To test: add `familytriptzs@gmail.com` (or any account) in Settings → שיתוף הטיול, sign in with it so the trip is open, remove it from the owner's phone, then edit something on the removed account. **Result:** *(to be filled in by the Product Owner)*

## Test F — Today action buttons (`BL-ICONS-1`)

Create an item **today, later than now**: + → ידני → **מלון**, with location, website and a **phone**, start later today; another without a phone. Open "היום" at 360 and at 390px (and, if you like, with the phone's text size raised).
**Expect:** the row with **ניווט · אתר · התקשרות** shows **three equal icon-only buttons** (compass, globe, phone) when icon + label don't all fit — **all three together, never a mix**; a row with **two** buttons (ניווט · אתר, or ניווט · כרטיסים) shows **icon + label**. Every button is 44px high; a screen reader announces the label; a long-press / hover shows it as a tooltip.
**Development Agent verification (qa, 360 and 390px):** ☑ 360px: the three-button row icon-only (81×44px each), the two-button rows (LY087 and the no-phone item) icon + label (126×44px); 390px: three buttons icon-only (91×44px), two-button rows icon + label (141×44px); forcing the label text 40% larger kept the two-button rows icon + label and the three-button row icon-only; removing it restored the same state (the class is removed before every measurement). **Not exercised:** a four-button row (it needs a confirmed ticket on the same item) and a real phone's text-size setting. **Result:** *(to be filled in by the Product Owner)*

## Test G — Regression

Everything marked PASS in `docs/versions/V7/0.8.0-phase3.2/PO_SESSION_RESULTS_V1.md` still passes (Settings home list, the Documents Failed / archive rows, the category headers, completed tasks, the timeline, the ticket slide).
**Development Agent verification:** ☑ the automated gate (`npm run check`: syntax, the whole test suite, the production build), with the Phase 3.1 / 3.2 pins updated where this round replaces a behaviour (Today row markup, the documents list's delete). **Result:** *(to be filled in by the Product Owner)*

## Finding verification notes (one per item)

| Item | Development Agent verification |
|---|---|
| `P32-F1` | ☑ Test A. |
| `P32-F2` | ☑ Test B — root cause: the rebuilt scroller resets to the start. |
| Re-link affordance | ☑ Test C (a small picker; no existing flow to reuse). |
| Linkage indicator | ☑ Test C. |
| "הסרה" → real delete | ☑ Test D (the menu's "מחק", on every row; hard delete, no pushback). |
| `V7-F14` | ☑ unit-tested; ☐ live (needs a removed account) — Test E. |
| `BL-ICONS-1` | ☑ Test F. |

## Product Owner session

*(empty — to be filled in during the real-phone test)*

## GO/NO-GO decision

*(pending — Product Owner.)*
