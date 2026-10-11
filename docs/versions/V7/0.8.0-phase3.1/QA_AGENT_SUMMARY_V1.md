# Beta 0.8 Phase 3.1 — summary for the QA agent (real-phone re-test)

**Build:** `0.8.0-phase3.1-3722a839` on `https://qa--familytripz.netlify.app` (qa only, never Production). Check Settings → אודות for the exact string; if the phone shows an older build, close and reopen the app (or clear the site's data) first.
**Trip:** "QA Test Trip". **Full test steps and the Development Agent's own verification:** `docs/versions/V7/0.8.0-phase3.1/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–I). This note is the short version plus what exists on the trip.
**What this round is:** the Phase 3 correction package — `P3-F1`, `P3-F3`–`P3-F16` (`P3-F2`, interactive games, is backlog). **A GO here is the GO for the single combined Production promotion of Beta 0.8 (`V147`).** Design references: `docs/design/mockups/` (`P3_settings_today_proposals.html`, `P3-F12_access_rows_A.html`, `P3-F13_documents_list.html`, `P3-F15_timeline_combined.html`).

## What exists on the trip for you

| Where | What | Use it for |
|---|---|---|
| Trip Center → אטרקציות → **QA22 כרטיסים — קרוסלה** | slides: `QA22-b.png` (confirmed), `QA22-a.png` (confirmed), **`QA31-ticket-unconfirmed.png`** (Paula, **not confirmed**, added 2026-10-11) | the **drawn check** on "✓ אישור" (centred), the "⋯" menu with **מחק under a divider in terracotta** (confirmed slides have no מחק) — `P3-F14` |
| הכנות (tasks) → **`QA3 משימה באיחור`** | now has **notes** ("להזמין שולחן מראש") and a **link** (`https://example.com/menu`); plus the done tasks | task notes + link icons, the link opening, the inline bad-link error, "הושלמו (N)" — `P3-F4`, `P3-F5` |
| Games | "טריוויה תאילנד" still starred | the filled star — `P3-F1` |
| קניות | `QA3` items with owners Paula / Daniel, the older ones with Eyal | first-name chips — `P3-F3` |
| Trip Center → מלונות | the Thai hotel "พันวารยี์รีสอร์ต (Panvaree Resort)" | no boxes in the Thai name — `P3-F6` |
| Settings | the six participants (all blocked, with reasons), destinations, sharing / admin lists | `P3-F7`–`P3-F9`, `P3-F11`, `P3-F12` |
| מסמכים | 46 sources: 23 attached, 18 tickets, 2 links, 3 failed, 0 pending; the four confirmed leftover tickets (`QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single`) kept for this re-test | the list, filters, rows and "⋯" menu — `P3-F13` |
| ציר הזמן (October) | Hyatt Regency 5–7 Oct (band), flights, attractions, restaurants; a day with several items: 5 Oct | the redesign — `P3-F15` |

The trip has 5 active participants and one inactive ("Test6"). Not seeded: a document with a **pending proposal** (needs a real analysis) — "ממתין לאישור · 0" shows the empty state; and an item **later today** (the Timeline's "next item" highlight — create one with + → ידני if you want to see it).

## What to check (expected results)

1. **Games:** star a game → a **filled ink star** on a soft-teal square; un-star → outline on white.
2. **Shopping:** owner chips are **first names** ("פאולה", "דניאל", "אייל").
3. **Tasks:** open a task → **הערות** and **קישור** fields; type a bad link ("hello") → "שמירה" shows a red line under the field and **keeps your text**; "example.com" is saved as `https://example.com`. A task with notes shows a small note icon, one with a link a 44px link icon at the row's end (opens the page). **Done tasks sit under "הושלמו (N)" at the bottom**; tick / untick moves them.
4. **Thai:** the hotel name shows "รีสอร์ต" with the "์" drawn, everywhere it appears.
5. **Settings — participants:** header "משתתפים" with a small "+ משתתף חדש" **at the top**; compact rows (name + "פעיל · לא ניתן למחוק (N שיוכים)"), **no "עריכה"** — tap the name to edit; the blocked bin is a faint grey square that does nothing. **Destinations:** one row each — name + ↑ ↓ bin (44px); the add row = field + "+ הוספה", same height. **Sharing / admin:** each e-mail **one line, never broken**, a short "הסרה"; "מנהל" chip; invite = field + "הזמנה"; tap an address to see it in full.
6. **Today:** (if an item exists today) "ניווט" / "כרטיסים" start flush under the time column.
7. **Documents:** header (back arrow, document icon, "מסמכים", small "+ מסמך") on one line; summary; **filter chips with counts** (scroll sideways); ~60px rows, tap = open; "⋯" = פתיחה / שיוך למשתתף / divider / **מחק** (none on a confirmed ticket); a Failed row keeps "נסה שוב / מחק"; "ממתין לאישור · 0" → empty state + "הצגת הכול".
8. **ציר הזמן:** יום / שבוע / חודש / כל הטיול; the **calendar always on top** with the Hyatt **band under 5–7 Oct**, kind dots, one legend, today ring; יום on 5 Oct → agenda (time column, dot + line, cards, "לינה: Hyatt · לילה 1 מ־2"); שבוע / חודש / כל הטיול → one row per day with a stay bar and **time + title on one line**, "אין תוכניות" days, collapsed empty runs in כל הטיול; arrows move a day / week / month; tap a calendar day → יום.
9. **Categories:** plural tiles and titles (טיסות · מלונות · תחבורה · אטרקציות · מסעדות · ביטוחים · אנשי קשר · מסמכים); a small "+ <type>" in the header row, **no big "הוספה" at the bottom**; a single item's chip stays singular.
10. **General:** nothing cut off or scrolling sideways on any screen above, at 360 and 390px.

## Known limits — please do not report as new

- Calendar day cells are **44px high, 40px wide on 360px screens** (45px wide at 390px) — seven columns cannot be wider.
- The calendar's dots now use the board's palette (flight ink, transport green, attraction terracotta, restaurant gold, shopping teal); stays have their own muted hues, named in the legend.
- Terracotta **text** is `#A4442A` (5.9:1), not the lighter `--accent` (3.9:1 fails the accessibility bar).
- Four confirmed leftover tickets remain on purpose (kept for this re-test).
- The "ממתין לאישור" document chip and the Timeline's "next item" highlight need data that was not seeded (see above).
- Interactive games are backlog (`P3-F2`); every game is still an instructions-only activity.
- Not Production: Phase 3.1's own GO triggers the single combined promotion of Beta 0.8.

## Cleaning up afterwards

Delete `QA31-ticket-unconfirmed.png` (its "⋯" → מחק) and the `QA3…` items from the Phase 3 round (tasks, shopping place and items). The four confirmed leftover tickets can be removed with "ביטול אישור" → "מחק" once the re-test is done.
