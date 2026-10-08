# Family Trips Beta 0.8 Phase 3 (final phase) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase3` (build `0.8.0-phase3-f7ef017e`) on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production). This is the last phase: **Phase 3's own GO triggers the single combined Production promotion of Beta 0.8 (Phases 1–3), decision `V147`.** Scope: `docs/roadmap/FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` (`V11`), Phase 3 section — Games, Settings, Timeline, Shopping, `P12-F3`, `P12-F7`, `P23-F1`, `P23-F2`, §7 empty/loading/offline coverage, and the §9 pass.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** pass over the areas below. Settings → אודות shows the exact `0.8.0-phase3-<hash>`.

## What changed that you should know about before testing

- **Found while testing, fixed:** (1) the calendar cells were 37px wide and the Packing / Tasks / Shopping row's tap zone was a 29px strip of a 56px row — both are now ≥44px high (the whole row opens the editor); (2) the "נסה שוב / מחק" buttons in a Failed document pill were 36px and the dialog's ✕ was 38px — both 44px; (3) an e-mail address in the admin / sharing lists broke mid-word at 20px — now a left-to-right run at 16px; (4) a place whose address equals its name showed the name twice on Shopping.
- **Decisions the Development Agent made** (change any you read differently):
  1. **`P23-F2` — the date is not rendered in `--accent`.** `--accent` on white is 3.9:1 (and 3.8:1 on `--bg`), under the §9 bar of 4.5:1 for normal text. An overdue open task gets the `--accent-soft` row tint, an `--accent` border, an `--accent` clock icon, and the words **"באיחור · 4 באוק׳ 2026"** in `--ink` bold (10:1). Done tasks are never marked, whatever their date; "לכל הטיול" / "ללא תאריך" tasks never are.
  2. **No interactive game exists yet.** All six built-in games are non-interactive activities, so every game page shows instructions + **"התחל פעילות"** (which shows a short notification — it does not run a timer or a flow). The interactive path ("התחל משחק" → "המשך משחק", started flag) is built and unit-tested but **cannot be seen in the app** until an interactive game is added. Say if you want a game built.
  3. **Game filters:** "10 דקות" = a stated duration whose first number is ≤ 10 ("10 דקות", "10–20 דקות"); "בנסיעה" = a flag on five built-ins (no setup needed on the road); "לכולם" = "כל המשפחה". Favourites sort first. The five chips wrap to a second line on a phone (they don't fit in one row at 360–390px).
  4. **`P12-F3`:** the assignment count includes documents/tickets, items, tasks, packing items **and shopping items the participant owns** (the owner is stored by name). The confirmation is in the row (not a browser dialog): first tap on the bin → "למחוק את <name> לצמיתות?" → "מחיקה סופית" / "ביטול". An inactive participant with assignments is blocked too.
  5. **`P12-F7`:** a delete ("מחק") on every document source that is **not confirmed ticket coverage** and not already Failed (Failed keeps its own inside the status pill) — in the Documents list, the item's ticket "⋯" menu (unconfirmed ticket) and the other-document "⋯" menu. Single confirmation, same as the Failed delete. **Deleting also removes the still-open proposals that came only from that source** (their analysis goes with the file); a proposal merged from several sources, accepted items and the rejected archive stay. A confirmed ticket source must be un-confirmed first ("ביטול אישור"), as scoped.
  6. **Tasks screen retitled "משימות"** and given the Packing/Shopping header ("+ משימה חדשה"); its four stacked filters are now two columns. Not asked for — it was the one remaining screen with the old heavy header and a 300px filter stack.
  7. **Calendar:** ink chips for the mode, `--teal-soft` for the shown period and the selected day (selected also gets an ink border), today has an `--accent` border, **each kind of event keeps its own colour** (flight, hotel, transport, attraction, restaurant, shopping place) with a legend under the grid naming them — I had first made every dot `--ink` to honour §1's "one accent per area", the Product Owner overruled that on 2026-10-08, and the spec has no rule on calendar dots either way; **a multi-day event (hotel, rental, ferry) is a bar through every day it covers**, joined across neighbouring days (before, it appeared only on its first day); "הקודם/הבא" became mirrored arrow icons. Day cells are 45px wide at 390px and **40px at 360px** (seven columns cannot reach 44px there); they are 48px+ high.
  8. **Other text/glyph clean-ups:** the English headings "Timeline", "Calendar", "Trip Center", "Games / Activities" are Hebrew; the dialogs' "✕" and the destinations' "↑ ↓" are line icons; 🎲 and 📍 are line icons. A "settings" screen title ("הגדרות") now sits above the section cards, whose titles are at the 22px section scale.
  9. **Shopping:** the owner shows as a chip (as Packing does), "משותף" as a muted word on the second line; the place row has a store icon, name, date and — only when it differs from the name — the address with a pin; no type badge.
  10. **Offline strip:** `--accent-soft`, `--ink`, an icon, counts the waiting changes ("אופליין — 2 שינויים ימתינו לסנכרון"); online with waiting changes: "2 שינויים ממתינים לסנכרון"; gone the moment sync succeeds.

**State of the QA Trip when this session starts:** the leftover `QA12-*` / `QA22-c`, `QA22-d` / `QA23-review` sources were **deleted with `P12-F7`** (14 sources). **Four confirmed ticket sources remain: `QA12-f3.pdf`, `QA22-a.png`, `QA22-b.png`, `QA22-single.png`** — by design they need "ביטול אישור" first; I stopped rather than un-confirm tickets on the shared trip without your say-so (the QA22 activity items that hold them are your test items). Tell me to proceed, or do it yourself from the ticket's "⋯" menu — that is also the best end-to-end test of `P12-F7`'s menu entry. The QA22 items, tasks, packing and shopping items are untouched. A participant `QA3 למחיקה` was created and deleted during verification (gone after a reload).

## Test A — Games (spec §6)

Trip Center → "משחקים ופעילויות".

**Expect:** a compact list (not cards): line icon, name, "who · how long", chevron, and a **separate star button**; rows ≥56px; the star is 44×44 with **8px** between it and the row, and tapping it does **not** open the game; five chips "הכול / מועדפים / 10 דקות / בנסיעה / לכולם" — the active one is ink with white text, the others white with a border. "מועדפים" with none shows an empty state (icon, "אין מועדפים עדיין", one line, "הצגת הכול"). Tapping a row opens a page with a back arrow + icon + name on one line, the description, a facts box (מתאים ל / משך / ציוד) and one wide **"התחל פעילות"** button.

**Development Agent verification (qa, 390px):** ☑ 6 rows 60px, star 44×44, 8px gap; chips in the right order and wording; the page showed back + icon + "20 שאלות", description, facts, "התחל פעילות" (a toast "הפעילות התחילה"); "מועדפים" empty state rendered at 360px. **Not exercised:** the star toggling with a finger, a real favourite round-trip across devices. **Result:** *(to be filled in by the Product Owner)*

## Test B — Shopping (`P2-F8`, `P21-F7`, `P22-F9`)

Trip Center → "קניות".

**Expect:** the title "קניות" with **no emoji** anywhere; "מקומות קניות" and "רשימת קניות" each with a **same-size outline "+" button** ("מקום חדש" / "פריט חדש"), vertically centred with the heading; a quiet bordered place row; item rows like Packing (checkbox, name, owner chip on one line, a muted line below; tap = edit; delete is inside the edit screen). Above the list **two filters, "בעלים" and "מקום"**, both "הכול" by default (owner: הכול / משותף / each active participant; place: הכול / each place / ללא מקום), and a line "3 פריטים" that becomes **"1 מתוך 3 פריטים" with "איפוס"** when a filter is on; the two filters combine; no match → "אין פריטים תואמים".

**Development Agent verification (qa, 390px):** ☑ headings, buttons and place row rendered as above; owner list = הכול, משותף, the 5 active participants (not Test6); place list = הכול, Platinum Fashion Mall, ללא מקום; "3 פריטים" shown; the filtering logic is unit-tested for every combination. **Not exercised:** choosing filters with a finger on the phone's select. **Result:** *(to be filled in by the Product Owner)*

## Test C — Tasks: overdue and the new header (`P23-F2`)

Trip Center → "הכנות" (tasks).

**Expect:** header "משימות" + "+ משימה חדשה"; filters two per row. An open task whose date has passed has a **pink-tinted row with an accent border**, a clock icon and **"באיחור · <date>"**; a done task with an old date, a "לכל הטיול" task and an undated task look normal.

**Development Agent verification (qa):** ☑ 3 tasks marked on the QA trip (dates 4–5 Oct, open); the others not; the rule is unit-tested for done / today / future / "entire" / "none". **Result:** *(to be filled in by the Product Owner)*

## Test D — Category pages (`P23-F1`)

Trip Center → any category (טיסה, מלון, תחבורה, אטרקציה, ביטוח, מסעדה, איש קשר, מסמך).

**Expect:** the back arrow, the type icon and the title ("מלון") are **one line**; the list starts right below.

**Development Agent verification (qa, 390px):** ☑ hotel, flight, transport, activity, document: one row, no second row above the list. **Result:** *(to be filled in by the Product Owner)*

## Test E — Settings (trip form, participants, sharing, admin) and `P12-F3`

Open Settings (the gear).

**Expect:** a "הגדרות" screen title; section cards with 22px titles; each participant is a compact card: name + role/status, then **"עריכה", "השבתה" and a bin button** in one row. For a participant who has anything assigned the bin is **visibly disabled** and the card says **"לא ניתן למחוק: יש N שיוכים. אפשר להשבית את המשתתף במקום."** Add a new participant (no assignments): the bin works — first tap shows **"למחוק את <name> לצמיתות? לא ניתן לשחזר."** with "מחיקה סופית" / "ביטול"; "מחיקה סופית" removes them and shows "המשתתף <name> נמחק" for a moment; after a reload they are still gone. The admin screen (ניהול הרשאות גישה) shows a skeleton for an instant before the list; e-mail addresses read left-to-right.

**Development Agent verification (qa):** ☑ all 6 existing participants have the bin disabled (28 / 29 / 15 … assignments, inactive Test6 included); a new "QA3 למחיקה": bin enabled → named confirmation → deleted, toast shown, 6 participants after a reload. Admin list rendered; the e-mail rows read LTR. **Not exercised:** the skeleton flash (too fast to catch), the sharing section's add/remove flows (unchanged). **Result:** *(to be filled in by the Product Owner)*

## Test F — Deleting document sources (`P12-F7`)

Trip Center → "מסמך" (Documents), and an item's ticket "⋯" menu.

**Expect:** every source that is **not** a confirmed ticket has a **"מחק"** button (a Failed one keeps its own in its pill); one confirmation → the source is gone, its file with it, and any open proposal made only from it; a confirmed ticket source has **no** "מחק" until you choose "ביטול אישור" in its "⋯" menu — then its "⋯" menu offers "מחק".

**Development Agent verification (qa):** ☑ 14 leftover `QA12-*` / `QA22-c`, `QA22-d` / `QA23-review` sources deleted through the button (confirmation auto-accepted by the test harness); the four confirmed ones (`QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single`) correctly showed **no** "מחק". Rule unit-tested (confirmed excluded, Failed excluded, links included). **Not exercised:** the "⋯"-menu "מחק" entry (needs an unconfirmed ticket), the cleanup of the four confirmed sources (see above). **Result:** *(to be filled in by the Product Owner)*

## Test G — Timeline / calendar

Open "ציר הזמן" and try "כל הטיול / יום / שבוע / חודש".

**Expect:** the title "ציר הזמן" (Hebrew); mode chips like the games filters (active = ink); "לוח שנה" with a month picker; day cells in `--teal-soft` for the shown period, today with a terracotta border, the selected day with an ink border; **each kind of event has its own dot colour, named in a legend under the grid**; a hotel (or any multi-day event) is a **coloured bar through every day it covers**, joined from day to day, starting and ending with a rounded end; in day/week/month the "previous / next" are arrow icons pointing the right way for Hebrew (next = left); a period with no events shows an empty state ("אין אירועים בתקופה"). Tapping a day opens it.

**Development Agent verification (qa):** ☑ 390px: cells 45×48 (64 with dots), page width 390, chips and dots as above; day / week / month rendered without overflow. **Not exercised:** swiping a week with a finger. **Result:** *(to be filled in by the Product Owner)*

## Test H — Empty / loading / offline (spec §7)

Put the phone in airplane mode, open any screen, then reconnect. Look at an empty list (Tasks with the filter on "גבוהה" and nothing matching, Shopping with a place that has no items).

**Expect:** a soft-terracotta strip under the app bar, ink text, an offline icon — "אופליין — המידע המקומי זמין" (and, after you change something, "אופליין — N שינויים ימתינו לסנכרון"); it **disappears at once** on reconnect with no success message. Empty lists show a small grey line icon, a bold headline, one grey line, and (where it helps) one button — no illustration.

**Development Agent verification (qa, 360px):** ☑ forced offline: strip text, `rgb(249,236,231)` background, `rgb(18,63,66)` text, icon present; cleared when back online; "אין מועדפים עדיין" empty state rendered with its button. **Not exercised:** a real airplane-mode round-trip and the pending-changes count (needs a real offline edit). **Result:** *(to be filled in by the Product Owner)*

## Test I — the §9 pass across Beta 0.8 (accessibility and visual acceptance)

**Development Agent verification (qa, DOM-measured, 390px unless stated):**

| Check | Method | Result |
|---|---|---|
| Normal-text contrast ≥ 4.5:1 (large text ≥ 3:1), computed for **every visible text node**, effective background blended | in-page script over more than 20 screens/dialogs (Today, Timeline day/week/month, Trip Center, Packing, 5 category pages, Games + a game, Tasks, Shopping, Settings, Admin, item pages of hotel / flight / activity, the "+" dialog and its "מסמך" form) | **0 failures** (also at 360px on 10 screens) |
| Token pairs in use | `tests/beta-0-8-phase-3.mjs`: ink/bg 11.1, ink/surface 11.6, ink/accent-soft 10.0, ink/teal-soft 10.2, white/ink 11.6, muted/bg 5.0, muted/surface 5.2, muted/accent-soft 4.53, muted/teal-soft 4.62 | all ≥ 4.5; `--accent` (3.9 on white) is used **only** as an icon / border / dot colour, never as text (asserted on the stylesheet) |
| No horizontal overflow, nothing clipped | same script, every element's box vs the viewport (the carousels' intentionally clipped neighbours excluded) | none at 390 and 360 |
| Tap targets ≥ 44×44 | same script, every button / link / field | all, except the calendar day cells at 360px (40px wide, 48px high) and the carousels' off-screen slides |
| Focus ring, RTL mirroring | unchanged since Phase 1 (global `:focus-visible` ring in `--ink`; `icon-directional` mirror) — the new arrows and chevrons use it | inherited |
| No emoji, no English headings | asserted over the whole source by a test | none |
| Side-by-side screenshots against the spec's described states | live screenshots of Games, Game page, Shopping, Tasks, Settings, Timeline, Admin, offline strip, empty state taken on the candidate | consistent with §6/§7 as described above |

**Not exercised:** a real contrast-meter reading on the phone's screen, Switch Control / keyboard traversal, OS reduce-motion. **Result:** *(to be filled in by the Product Owner)*

## Finding verification notes (one per item)

| Item | Development Agent verification |
|---|---|
| Games list (§6) | ☑ Test A: compact rows ≥56px, five filters, active/inactive styling, independent 44×44 star with 8px separation. |
| Game page (§6) | ☑ Test A: uniform page; interactive labels built + unit-tested but no interactive game exists (decision 2). |
| Settings / Timeline on the tokens | ☑ Tests E, G, I. |
| Shopping `P2-F8` / `P21-F7` / `P22-F9` | ☑ Test B: no emoji, quiet place rows, matching header rows, Packing-style rows, two combinable filters with a count. |
| `P12-F3` delete a participant | ☑ Test E: blocked with a reason for all 6 existing participants; two-step named confirmation; toast; persisted. |
| `P12-F7` delete a source | ☑ Test F: 14 leftover QA sources removed; confirmed-ticket sources excluded; 4 of those remain. |
| `P23-F1` category header | ☑ Test D. |
| `P23-F2` overdue tasks | ☑ Test C (decision 1: tint + border + icon + ink words, not accent text). |
| §7 empty / loading / offline | ☑ Test H (skeleton + empty states + offline strip). |
| §9 full pass | ☑ Test I. |

## Product Owner session

*(empty — to be filled in during the real-phone test)*

## GO/NO-GO decision

*(pending — Product Owner. A GO here is the GO for the single combined Production promotion of Beta 0.8, decision `V147`.)*
