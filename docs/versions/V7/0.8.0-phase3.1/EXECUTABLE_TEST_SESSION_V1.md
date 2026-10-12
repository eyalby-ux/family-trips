# Family Trips Beta 0.8 Phase 3.1 (Phase 3 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase3.1` (build `0.8.0-phase3.1-3722a839`) on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production). Correction package for the Phase 3 NO-GO (`docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`, handoff `PHASE_3_PO_SESSION_SUMMARY_FOR_DEVELOPMENT_AGENT.md`). Covers `P3-F1` and `P3-F3` … `P3-F16`. `P3-F2` (interactive games) stays in the backlog. **Phase 3.1's own GO is the GO for the single combined Production promotion of Beta 0.8 (decision `V147`).**
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test of exactly the areas below. Design references: the mockups in `docs/design/mockups/` (`P3_settings_today_proposals.html`, `P3-F12_access_rows_A.html`, `P3-F13_documents_list.html`, `P3-F15_timeline_combined.html`); where a mockup and the finding register differ, the register wins. Settings → אודות shows the exact `0.8.0-phase3.1-<hash>`.

## What changed that you should know about before testing

- **Found while building, beyond the register:** (1) `P3-F6` had a second cause — the hotel's title contains **legacy Thai Private Use characters** (U+F70E and friends: how an old-font PDF stores "์" and the tone marks), which no font can draw; they are now mapped back to the real Thai marks both when text is read from a document and when anything is displayed (so existing items are fixed too), **in addition to** the Noto Sans Thai fallback you chose; (2) the "מנהל" chip was 3.5:1 (blue on teal) → ink; (3) the category back arrow shrank to 42px beside a long title → 44px; (4) typing a bad task link and tapping "שמירה" would have wiped the form (a notification re-renders it) → the error is now inline and keeps what you typed; (5) the "אישור" check was ink on an ink button, so it was never drawn — the real cause of `P3-F14a` (the empty-state icons and the overdue clock had the same ink-stroke problem and now show their intended muted / terracotta colours).
- **Decisions the Development Agent made** (change any you read differently):
  1. **`P3-F14b` / `P3-F13` terracotta text** is `#A4442A` (the mockup's own colour, 5.9:1 on white), not `--accent` (3.9:1 cannot carry text under §9). The same divider + bin + terracotta "מחק" is used in **every** document menu (the ticket slide's "⋯", the item's other-document "⋯", the Documents list "⋯").
  2. **`P3-F15` calendar cells are 44px tall** (the tap-target rule) where the board shows ~34px; the whole calendar is therefore a little taller. Dots use the board's kind palette (flight ink, transport green, attraction terracotta, restaurant gold, shopping teal), which **replaces** the per-kind colours from Phase 3 decision 7; each stay gets its own muted hue (blue, purple, rose, teal, indigo, olive in order of check-in) — the legend names them. The mode control still hides שבוע / חודש when the trip is too short for them (as before). Leaving "כל הטיול" for יום / שבוע / חודש opens on **today when today is inside the trip**, otherwise where the trip starts. The "לכל הטיול" (whole-trip) items still appear at the bottom of כל הטיול. At 360px the calendar's day cells are 40px wide (seven columns), 44px high.
  3. **`P3-F13`:** "ממתין לאישור" = a source with an open (pending / deferred) proposal; "מצורף" = attached to an item; "כרטיסים" = a confirmed ticket, or an attached document that names people; "לא משויך" = attached to no item and not a ticket (read literally — a loose link counts); a Failed or Processing source shows its status pill (with "נסה שוב / מחק") instead of the chip; the "הצעות פעילות" block shows on הכול and ממתין לאישור; the old "מקורות" heading is gone.
  4. **`P3-F11`:** the status line reads "<role> · פעיל · לא ניתן למחוק (28 שיוכים)". The pointer to deactivation ("אפשר להשבית את המשתתף במקום") now lives in the blocked bin's accessible name and tooltip, not in a line of text, so the card stays 2 lines.
  5. **`P3-F12`:** the sharing and admin invite buttons both read "הזמנה" (the board's wording); tapping an address expands it to show it in full (wrapping only then); the removed-permissions history uses the same row with a "הוסר …" note.
  6. **`P3-F4`:** a link without a scheme ("example.com/menu") is saved as `https://example.com/menu`; only http(s) with a real host is accepted; the link opens from the row (a 44px link icon) and from the task screen (underlined, LTR). The "הושלמו (N)" section is open by default, as Packing's is.
  7. **`P3-F3`:** only an owner that matches a participant by name becomes a first name; an owner typed by hand stays exactly as saved.
  8. **`P3-F16`:** the "+ <type>" button uses the **singular** type name ("+ מלון") beside the **plural** title ("מלונות"); the Documents page's header has "+ מסמך".

**State of the QA Trip when this session starts:** everything from the Phase 3 re-test is still there (`QA3 …` tasks, shopping place and items, the four confirmed leftover tickets — `QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single` — kept for this re-test, favourite game "טריוויה תאילנד"). **Added on 2026-10-11 for this round:** `QA31-ticket-unconfirmed.png` — an **unconfirmed** ticket for Paula on `QA22 כרטיסים — קרוסלה` (to see the drawn check on "אישור" and the new "⋯" menu); the task `QA3 משימה באיחור` now has **notes** ("להזמין שולחן מראש") and a **link** (`https://example.com/menu`). Not seeded: a document with a pending proposal (it needs a real analysis) — the "ממתין לאישור · 0" chip shows the empty state instead; the Timeline's "next item" highlight appears only when an item later **today** exists.

## Test A — Games and Shopping (`P3-F1`, `P3-F3`)

**Expect:** a favourite game's star is **filled ink** on a soft-teal square; a non-favourite is an outline on white. Shopping owner chips are **first names** only ("פאולה", "אייל", "דניאל").
**Development Agent verification (qa):** ☑ CSS: `.game-star.on .ti{fill:var(--ink)}`; owner label unit-tested for known / unknown / shared owners; live: the chips in Shopping read first names. **Not exercised:** the star with a finger. **Result:** *(to be filled in by the Product Owner)*

## Test B — Tasks (`P3-F4`, `P3-F5`)

**Expect:** "משימה חדשה" / editing has **הערות** (multi-line) and **קישור**; a bad link ("not a link") shows a red line under the field **and keeps everything you typed**; a good one saves. A task with notes shows a small note icon; a task with a link shows a 44px link icon at the end of the row that opens the page in the browser; opening the task shows the notes and an underlined link. Done tasks are in **"הושלמו (N)"** at the bottom; ticking one moves it there, unticking brings it back up; "משימות פתוחות בלבד" hides them.
**Development Agent verification (qa, 360/390px):** ☑ validation unit-tested (bare domain, http(s) only, `javascript:` / `ftp:` / no-dot hosts rejected); live on `QA3 משימה באיחור`: bad link → inline error, typed notes kept; good link saved (row shows link + note icons, the date no longer cut); "הושלמו (4)" holds the four done tasks, none left in the open list. **Result:** *(to be filled in by the Product Owner)*

## Test C — Thai text (`P3-F6`)

Trip Center → מלונות → the Thai hotel.
**Expect:** "พันวารยี์รีสอร์ต (Panvaree Resort)" with every mark drawn — no boxes — on the list, the item page and anywhere else the name appears.
**Development Agent verification (qa):** ☑ the stored title had U+F70E twice; displayed text now has none (checked code points); the Noto Sans Thai Thai-range face loads. Unit-tested mapping for the whole U+F700–F71A range. **Not exercised:** a new import of a legacy-font PDF. **Result:** *(to be filled in by the Product Owner)*

## Test D — Settings: participants, destinations, access (`P3-F7`–`P3-F9`, `P3-F11`, `P3-F12`)

**Expect — participants:** the header "משתתפים" with a small outline **"+ משתתף חדש" at the top** and none at the bottom; each participant one compact row: name + a muted status line ("פעיל · לא ניתן למחוק (28 שיוכים)"), a small "השבתה" / "הפעלה" and a bin; **no "עריכה"** — tapping the name opens the editor; a blocked bin is a faint grey square with a muted icon, no border, and does nothing; an inactive participant's row is muted with "הפעלה" outlined. **Destinations:** each one row — name and three 44px icon buttons (↑ ↓ bin; ↑ greyed on the first, ↓ on the last); the add row is the field plus a small outline **"+ הוספה"** of the same height. **Access (sharing and admin):** each address is **one line, left-to-right, never broken**; "הסרה" is a short outline button on one line; the owner has a "מנהל" chip; invite = field + "הזמנה". A very long address ends in "…" and shows in full when tapped.
**Development Agent verification (qa, 390px):** ☑ six participant rows 70px with the grey bins and the reason inside the row; the header button above the list; destination row and add row as described; sharing row "familytriptzs@gmail.com | הסרה" one line (58px); invite row field + "הזמנה". **Not exercised:** the editor opening from the name on a phone; a very long address; the admin screen with several people. **Result:** *(to be filled in by the Product Owner)*

## Test E — Today (`P3-F10`)

**Expect:** on the next-item card the "ניווט" / "כרטיסים" row starts at the **same right edge as the time column** — "ניווט" sits flush under the time.
**Development Agent verification (qa, 360px):** ☑ with a temporary activity later today: the time text, the dot and the first action button were all **13px** from the card's right edge (the temporary item was deleted afterwards). **Result:** *(to be filled in by the Product Owner)*

## Test F — Documents and the ticket menu (`P3-F13`, `P3-F14`)

Trip Center → מסמכים; and `QA22 כרטיסים — קרוסלה`.
**Expect — list:** the header on one line (back, icon, "מסמכים", small "+ מסמך"); a summary "46 מסמכים · …"; **filter chips** הכול · ממתין לאישור · מצורף · לא משויך · כרטיסים · קישורים · נכשל, each with its count (single-select; scroll sideways); ~60px rows — file/link icon, the name on one LTR line, a status chip ("מצורף", "כרטיס מאושר", "ממתין לאישור") and a muted note (the people); **tapping a row opens the file**; the "⋯" has **פתיחה / שיוך למשתתף / a divider / מחק** (terracotta, with a bin) — and **no מחק on a confirmed ticket**; a Failed source keeps "נסה שוב / מחק". An empty filter ("ממתין לאישור · 0") shows an empty state with "הצגת הכול". **Expect — ticket slide:** on the unconfirmed slide **"✓ אישור"** has a **visible white check** and icon + label are **centred together**; in its "⋯", **מחק is below a divider in terracotta with a bin**, apart from שיוך / הסרה.
**Development Agent verification (qa, 390px):** ☑ 46 documents (measured before `QA31-ticket-unconfirmed.png` was added), counts 46 / 0 / 23 / 20 / 18 / 2 / 3; rows 60px (81–100px when a chip and a note wrap, or a Failed pill shows); the menu on a row = פתיחה, שיוך למשתתף, separator, מחק; the confirm button's icon stroke is white and the content gaps are 11px / 11px; the slide menus: confirmed → ביטול אישור, שיוך, הסרה; unconfirmed → שיוך, הסרה, divider, מחק. **Not exercised:** tapping a row to open a file on the phone; a source with a pending proposal. **Result:** *(to be filled in by the Product Owner)*

## Test G — ציר הזמן, end to end (`P3-F15`)

Open ציר הזמן.
**Expect:** the title; **one segmented control — יום / שבוע / חודש / כל הטיול** (active = ink); the **month calendar always on top** — October 2026 with the Hyatt stay as a **coloured band under 5–7 Oct** (rounded at both ends, continuous across the week; a stay that crosses a week keeps going on the next row), small dots by kind, **one legend** (stay names + kinds), a terracotta ring on today, and the range being shown marked (יום: the chosen day filled ink; שבוע: that week's row tinted); the arrows move by the mode's unit (a day, a week, a month) and point the right way for Hebrew; tapping a day opens it in יום. **יום:** the heading ("היום · יום א׳, 11 באוק׳" + count), a line for tonight's stay ("לינה הלילה: … · לילה 2 מ־2" or "ללא לינה מתוכננת הלילה"), and a vertical agenda — **a fixed time column (left-to-right numerals), a coloured dot + line, a card per item**; the next item (today only) outlined in ink with "בעוד N דק׳". **שבוע / חודש / כל הטיול:** one row per day — date ("5.10" + weekday), a stay bar (continuous from check-in to check-out), and each item as **time + title on one line** (times and dates **never wrap into the title**); empty days say "אין תוכניות"; today's row tinted; in כל הטיול runs of empty days collapse ("21.10–1.11 · 12 ימים ללא תוכניות").
**Development Agent verification (qa, 360 and 390px):** ☑ October on the QA Trip: 1 band (Hyatt 5–7), dots, legend; modes rendered with no horizontal overflow and no contrast failures at 360 and 390px; יום on 5 Oct: three cards (ניווט ביער גמזו 11:30, צ׳ק־אין · Hyatt 15:00, היום בערב 19:30), "לינה … לילה 1 מ־2", dots coloured by kind; יום on today with a temporary item: heading "היום · …", "ללא לינה מתוכננת הלילה", the next card outlined with "בעוד 14 דק׳" (temporary item deleted afterwards); כל הטיול: four collapsed runs; שבוע: the shaded row. All the geometry rules are unit-tested (bands across weeks, check-in / check-out, the night, collapsed runs, arrows by unit). **Not exercised:** swiping a week with a finger; a stay crossing two months; several stays in one week. **Result:** *(to be filled in by the Product Owner)*

## Test H — Plural names and the header "+" (`P3-F16`)

Trip Center, then any category.
**Expect:** the tiles and category titles are plural — טיסות · מלונות · תחבורה · אטרקציות · מסעדות · ביטוחים · אנשי קשר · מסמכים; a single item's chip stays singular ("מלון"); each category page has **no large "הוספה" at the bottom** but a small outline **"+ <type>"** (e.g. "+ מלון") in the header row beside the title.
**Development Agent verification (qa, 360/390px):** ☑ tiles read as above; hotel / flight / transport / activity / documents headers in one row, back arrow 44px, nothing overflowing at 360px. **Result:** *(to be filled in by the Product Owner)*

## Test I — the §9 pass on everything this round touched

**Development Agent verification (qa, DOM-measured):** ☑ contrast (every visible text node, effective background blended): **0 failures** at 390px on Today, ציר הזמן (all four modes), Trip Center, five category pages, Games, Tasks, Shopping, Settings, Admin, and at 360px on Today, ציר הזמן (four modes), hotel / activity / documents pages. The one failure found ("מנהל" chip, 3.5:1) is fixed. No horizontal overflow anywhere. Tap targets ≥44px everywhere except the calendar's day cells at 360px (40px wide, 44px high). **Result:** *(to be filled in by the Product Owner)*

## Finding verification notes (one per finding)

| Finding | Development Agent verification |
|---|---|
| `P3-F1` filled favourite star | ☑ Test A (CSS-asserted). |
| `P3-F3` first-name owner chips | ☑ Test A (unit-tested + live). |
| `P3-F4` task notes and link | ☑ Test B. |
| `P3-F5` "הושלמו (N)" | ☑ Test B (live: 4 done, none in the open list). |
| `P3-F6` Thai | ☑ Test C — font **and** the Private Use root cause. |
| `P3-F7` blocked bin / reason in the row | ☑ Test D. |
| `P3-F8` destinations | ☑ Test D. |
| `P3-F9` "+ משתתף חדש" at the top | ☑ Test D. |
| `P3-F10` Today alignment | ☑ Test E (13px / 13px / 13px). |
| `P3-F11` compact participant rows | ☑ Test D (70px incl. reason; no "עריכה"). |
| `P3-F12` access rows | ☑ Test D. |
| `P3-F13` document list | ☑ Test F. |
| `P3-F14` check icon and delete menu entry | ☑ Test F (the check was ink on ink). |
| `P3-F15` ציר הזמן | ☑ Test G. |
| `P3-F16` plural names, header "+" | ☑ Test H. |

Not changed on purpose: `P3-F2` (interactive games, backlog).

## Product Owner session

Real-phone session run 2026-10-12 by the QA agent with the Product Owner. Full results, findings and screenshots: `PO_SESSION_RESULTS_V1.md` and `screenshots/`. Summary: Tests A, B, C, D, F, G, H and the §9 pass on the screens checked passed; the Development Agent decisions 1–5 approved. Findings: P31-F1 (Settings tabs, option C), P31-F2 (Today navigation row), P31-F5 (אטרקציות header cut), P31-F6 (completed tasks section closed by default) fix before Production; P31-F3 (failed document rows) next round; P31-F4 (archive rows) this round if small, otherwise next round. Test E (Today row) to re-test after the fix.

## GO/NO-GO decision

**NO-GO** (Product Owner, 2026-10-12, 17:33). Phase 3.1 is not promoted to Production. Phase 3.2 correction required for P31-F1, F2, F5, F6 (before Production), F3 (next round) and F4 (if small). A later GO for the single combined Production promotion of Beta 0.8 (decision `V147`) follows the Phase 3.2 re-test.
