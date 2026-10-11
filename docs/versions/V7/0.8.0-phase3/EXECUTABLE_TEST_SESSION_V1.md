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
**Seeded for these tests on 2026-10-11 (all prefixed `QA3`, safe to delete):** participant `QA3 ללא שיוך` (nothing assigned — for `P12-F3`); tasks `QA3 משימה באיחור` (due 6 Oct, open → overdue) and `QA3 משימה שבוצעה (תאריך עבר)` (due 3 Oct, done → not highlighted); shopping place `QA3 חנות בדיקה` with items `QA3 מטען נייד` (Paula), `QA3 מתנות` (shared) and `QA3 קרם הגנה` (Daniel, no place); sources `QA3-delete-me.png` (saved without analysis) and `QA3-ticket-unconfirmed.png` (an unconfirmed ticket for Paula on `QA22 כרטיסים — קרוסלה`, which now has 3 slides and reads "כרטיסים: 3/6"). Because `QA3 ללא שיוך` is a sixth active participant, pickers and the Shopping owner list show six names.

## Test A — Games (spec §6)

Trip Center → "משחקים ופעילויות".

**Expect:** a compact list (not cards): line icon, name, "who · how long", chevron, and a **separate star button**; rows ≥56px; the star is 44×44 with **8px** between it and the row, and tapping it does **not** open the game; five chips "הכול / מועדפים / 10 דקות / בנסיעה / לכולם" — the active one is ink with white text, the others white with a border. "מועדפים" with none shows an empty state (icon, "אין מועדפים עדיין", one line, "הצגת הכול"). Tapping a row opens a page with a back arrow + icon + name on one line, the description, a facts box (מתאים ל / משך / ציוד) and one wide **"התחל פעילות"** button.

**Development Agent verification (qa, 390px):** ☑ 6 rows 60px, star 44×44, 8px gap; chips in the right order and wording; the page showed back + icon + "20 שאלות", description, facts, "התחל פעילות" (a toast "הפעילות התחילה"); "מועדפים" empty state rendered at 360px. **Not exercised:** the star toggling with a finger, a real favourite round-trip across devices. **Result:** **PASS with findings** — Product Owner, 2026-10-11 (`P3-F1`; `P3-F2` backlog).

## Test B — Shopping (`P2-F8`, `P21-F7`, `P22-F9`)

Trip Center → "קניות".

**Expect:** the title "קניות" with **no emoji** anywhere; "מקומות קניות" and "רשימת קניות" each with a **same-size outline "+" button** ("מקום חדש" / "פריט חדש"), vertically centred with the heading; a quiet bordered place row; item rows like Packing (checkbox, name, owner chip on one line, a muted line below; tap = edit; delete is inside the edit screen). Above the list **two filters, "בעלים" and "מקום"**, both "הכול" by default (owner: הכול / משותף / each active participant; place: הכול / each place / ללא מקום), and a line "3 פריטים" that becomes **"1 מתוך 3 פריטים" with "איפוס"** when a filter is on; the two filters combine; no match → "אין פריטים תואמים".

**Development Agent verification (qa, 390px):** ☑ headings, buttons and place row rendered as above; owner list = הכול, משותף, the 5 active participants (not Test6); place list = הכול, Platinum Fashion Mall, ללא מקום; "3 פריטים" shown; the filtering logic is unit-tested for every combination. **Not exercised:** choosing filters with a finger on the phone's select. **Result:** **PASS with findings** — Product Owner, 2026-10-11 (`P3-F3`).

## Test C — Tasks: overdue and the new header (`P23-F2`)

Trip Center → "הכנות" (tasks).

**Expect:** header "משימות" + "+ משימה חדשה"; filters two per row. An open task whose date has passed has a **pink-tinted row with an accent border**, a clock icon and **"באיחור · <date>"**; a done task with an old date, a "לכל הטיול" task and an undated task look normal.

**Development Agent verification (qa):** ☑ 3 tasks marked on the QA trip (dates 4–5 Oct, open); the others not; the rule is unit-tested for done / today / future / "entire" / "none". **Result:** **PASS with findings** — Product Owner, 2026-10-11 (`P3-F4`, `P3-F5`).

## Test D — Category pages (`P23-F1`)

Trip Center → any category (טיסה, מלון, תחבורה, אטרקציה, ביטוח, מסעדה, איש קשר, מסמך).

**Expect:** the back arrow, the type icon and the title ("מלון") are **one line**; the list starts right below.

**Development Agent verification (qa, 390px):** ☑ hotel, flight, transport, activity, document: one row, no second row above the list. **Result:** **PASS** — Product Owner, 2026-10-11 (`P3-F6` seen here).

## Test E — Settings (trip form, participants, sharing, admin) and `P12-F3`

Open Settings (the gear).

**Expect:** a "הגדרות" screen title; section cards with 22px titles; each participant is a compact card: name + role/status, then **"עריכה", "השבתה" and a bin button** in one row. For a participant who has anything assigned the bin is **visibly disabled** and the card says **"לא ניתן למחוק: יש N שיוכים. אפשר להשבית את המשתתף במקום."** Add a new participant (no assignments): the bin works — first tap shows **"למחוק את <name> לצמיתות? לא ניתן לשחזר."** with "מחיקה סופית" / "ביטול"; "מחיקה סופית" removes them and shows "המשתתף <name> נמחק" for a moment; after a reload they are still gone. The admin screen (ניהול הרשאות גישה) shows a skeleton for an instant before the list; e-mail addresses read left-to-right.

**Development Agent verification (qa):** ☑ all 6 existing participants have the bin disabled (28 / 29 / 15 … assignments, inactive Test6 included); a new "QA3 למחיקה": bin enabled → named confirmation → deleted, toast shown, 6 participants after a reload. Admin list rendered; the e-mail rows read LTR. **Not exercised:** the skeleton flash (too fast to catch), the sharing section's add/remove flows (unchanged). **Result:** **PASS with findings** — Product Owner, 2026-10-11 (`P3-F7`–`P3-F12`).

## Test F — Deleting document sources (`P12-F7`)

Trip Center → "מסמך" (Documents), and an item's ticket "⋯" menu.

**Expect:** every source that is **not** a confirmed ticket has a **"מחק"** button (a Failed one keeps its own in its pill); one confirmation → the source is gone, its file with it, and any open proposal made only from it; a confirmed ticket source has **no** "מחק" until you choose "ביטול אישור" in its "⋯" menu — then its "⋯" menu offers "מחק".

**Development Agent verification (qa):** ☑ 14 leftover `QA12-*` / `QA22-c`, `QA22-d` / `QA23-review` sources deleted through the button (confirmation auto-accepted by the test harness); the four confirmed ones (`QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single`) correctly showed **no** "מחק". Rule unit-tested (confirmed excluded, Failed excluded, links included). **Seen but not clicked:** the "⋯"-menu "מחק" entry — on `QA3-ticket-unconfirmed.png` it is offered, on the two confirmed slides it is not (read from the live slide menus; left for the real test). **Not exercised:** the cleanup of the four confirmed sources (see above). **Result:** **PASS with findings** — Product Owner, 2026-10-11 (`P3-F13`, `P3-F14`).

## Test G — Timeline / calendar

Open "ציר הזמן" and try "כל הטיול / יום / שבוע / חודש".

**Expect:** the title "ציר הזמן" (Hebrew); mode chips like the games filters (active = ink); "לוח שנה" with a month picker; day cells in `--teal-soft` for the shown period, today with a terracotta border, the selected day with an ink border; **each kind of event has its own dot colour, named in a legend under the grid**; a hotel (or any multi-day event) is a **coloured bar through every day it covers**, joined from day to day, starting and ending with a rounded end; in day/week/month the "previous / next" are arrow icons pointing the right way for Hebrew (next = left); a period with no events shows an empty state ("אין אירועים בתקופה"). Tapping a day opens it.

**Development Agent verification (qa):** ☑ 390px: cells 45×48 (64 with dots), page width 390, chips and dots as above; day / week / month rendered without overflow. **Not exercised:** swiping a week with a finger. **Result:** **Findings — redesign `P3-F15`**, Product Owner, 2026-10-11; re-test the new ציר הזמן after the rebuild.

## Test H — Empty / loading / offline (spec §7)

Put the phone in airplane mode, open any screen, then reconnect. Look at an empty list (Tasks with the filter on "גבוהה" and nothing matching, Shopping with a place that has no items).

**Expect:** a soft-terracotta strip under the app bar, ink text, an offline icon — "אופליין — המידע המקומי זמין" (and, after you change something, "אופליין — N שינויים ימתינו לסנכרון"); it **disappears at once** on reconnect with no success message. Empty lists show a small grey line icon, a bold headline, one grey line, and (where it helps) one button — no illustration.

**Development Agent verification (qa, 360px):** ☑ forced offline: strip text, `rgb(249,236,231)` background, `rgb(18,63,66)` text, icon present; cleared when back online; "אין מועדפים עדיין" empty state rendered with its button. **Not exercised:** a real airplane-mode round-trip and the pending-changes count (needs a real offline edit). **Result:** **PASS** — Product Owner, real phone, 2026-10-11.

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

**Not exercised:** a real contrast-meter reading on the phone's screen, Switch Control / keyboard traversal, OS reduce-motion. **Result:** **PASS with findings** — Product Owner, real phone, 2026-10-11 (`P3-F16`).

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

**Product Owner, 2026-10-11. Build check:** Settings → אודות shows `0.8.0-phase3-f7ef017e` — matches.

**Test A (in progress):** step 1 — compact list (icon, name, "who · how long", chevron), separate star with a gap, five chips with "הכול" active in ink — PASS. Step 2 — "מועדפים" with none: icon, "אין מועדפים עדיין", one line, "הצגת הכול" — PASS. Step 3 — star on "טריוויה תאילנד" → listed under "מועדפים" — PASS (starred look → `P3-F1`). Step 4 — favourite sorts first under "הכול" — PASS. Step 5 — "10 דקות" / "לכולם" / "בנסיעה" filters — PASS; **decision 3 (filter rules) accepted**. Step 6 — game page: back + icon + name on one line, description, facts box, wide "התחל פעילות" — PASS; **decision 2 accepted (option A)**: instructions-only activities for this beta, interactive games → backlog (`P3-F2`). **Test A result: PASS with findings** (`P3-F1`).

**Test B (in progress):** step 1 — "קניות" with no emoji; identical outline "+" buttons ("מקום חדש" / "פריט חדש") level with their headings; quiet place rows (store icon, name, date / "ללא תאריך", address when different); "בעלים" and "מקום" filters with "6 פריטים" — PASS (owner chips → `P3-F3`). Step 2 — owner filter: Paula → her 2 items, "2 מתוך 6 פריטים" + "איפוס" — PASS. Step 3 — Paula + "QA3 חנות בדיקה" → only "QA3 מטען נייד"; Paula + Platinum → "אין פריטים תואמים" — PASS. Step 4 — tapping "QA3 מתנות" opens "עריכת פריט קניות" with "בעלים: משותף" and the delete inside the edit screen; the place page (compact header, location link, linked items, עריכה/מחיקה) also checked — PASS. **Test B result: PASS with findings** (`P3-F3`).

**Test C (in progress):** step 1 — "משימות" + "+ משימה חדשה", filters two per row; every open task with a past date is a pink row with a terracotta border, clock and bold ink "באיחור · date"; the done task with an old date and the "לכל הטיול" task are normal — PASS; **decisions 1 (ink text, not `--accent`) and 6 (Tasks header) approved** (task notes/link → `P3-F4`). Step 2 — ticking "QA3 משימה באיחור" done removes the highlight at once; unticking brings it back — PASS (done tasks placement → `P3-F5`). **Test C result: PASS with findings** (`P3-F4`, `P3-F5`).

**Test D:** category page (מלון): back arrow, type icon and title on one line, list directly below — **PASS** (Thai glyphs → `P3-F6`).

**Test E (in progress):** step 1 — participant cards with עריכה / השבתה / bin; the bin on the six participants with assignments is **not** visibly disabled, and the reason line sits outside/below each card so it reads as belonging to the next card → `P3-F7`. Settings also → `P3-F8` (destinations), `P3-F9` ("משתתף חדש"), `P3-F11` (compact participant rows); Today → `P3-F10`. Step 2 — "QA3 ללא שיוך": bin → in-card confirmation; "ביטול" closes; "מחיקה סופית" removes the card with a short message — PASS; **decision 4 accepted**. Step 3 — still gone after a reload — PASS. Step 4 — "גישה": e-mail addresses break mid-word and "ביטול הרשאה" wraps → `P3-F12`. **Test E result: PASS with findings** (`P3-F7`–`P3-F12`).

**Test F (in progress):** step 1 — Trip Center → מסמך: "QA3-delete-me.png" has "מחק", one confirmation, gone — PASS; **decision 5 (open proposals from only that source go with it) approved**. The document list itself is bulky (large cards, three stacked buttons, status wrapping) → `P3-F13` (approved). Step 2 — QA22 carousel: unconfirmed "QA3-ticket-unconfirmed.png" → "⋯" → "מחק" → confirmed once → slide gone; summary "כרטיסים: 3/5" (first number unchanged; 5 since `QA3 ללא שיוך` was deleted) — PASS. Step 3 — confirmed QA22-a: "⋯" = ביטול אישור / שיוך / הסרה, **no "מחק"**; after "ביטול אישור" the menu gains "מחק" (PO re-confirmed the ticket afterwards) — PASS ("אישור" button / menu styling → `P3-F14`). **Test F result: PASS with findings** (`P3-F13`, `P3-F14`). **Leftover confirmed QA tickets** (QA12-f3, QA22-a, QA22-b, QA22-single): PO decision — keep the ones needed for the next round of testing; the Development Agent removes only those no longer needed.

**Test G (in progress):** the timeline list misaligns dates/times (they wrap into titles) and the calendar needs a richer view → `P3-F15` (approved, combined design; decision 7 colours kept inside it). Remaining calendar checks are superseded by the `P3-F15` redesign and move to its re-test. **Test G result: findings — redesign (`P3-F15`); re-test after the rebuild.**

**Test H:** airplane mode → soft-terracotta strip "אופליין — המידע המקומי זמין"; an offline edit → "… שינויים ימתינו לסנכרון"; reconnect → strip gone at once, no success message — **PASS**.

**Test I:** visual pass on the phone — new: category naming / add button → `P3-F16` (earlier P3 findings not re-reported). **Test I result: PASS with findings** (`P3-F16`; and every layout finding above).

## Finding register (Product Owner session, 2026-10-11)

| Finding | Where | Severity | Disposition |
|---|---|---|---|
| `P3-F1` — Games: a favourited game's star icon stays an outline; only the button background turns soft teal, so favourites are hard to tell apart at a glance. | Test A, step 3 | Non-blocking | Fix before the Production promotion. A favourite shows a **filled ink star** on the `--teal-soft` button; not favourited = outline star on white. |
| `P3-F2` — Games: no interactive game exists; every game is an instructions-only activity, so the built "התחל משחק / המשך משחק" flow is never seen. | Test A, step 6 (decision 2) | Backlog | **Backlog** — the Product Owner will schedule interactive games later. Accepted as-is for Beta 0.8. |
| `P3-F3` — Shopping: owner chips mix first names and full names ("אייל", "דניאל" vs "פאולה כהן") because the chip shows the stored owner name as saved. | Test B, step 1 | Non-blocking | Fix before the Production promotion. The owner chip always shows the participant's **first name** (as Packing does); a legacy free-text owner that matches no participant stays as saved. |
| `P3-F4` — Tasks: no place for a comment or a web link on a task. | Test C, step 1 | Non-blocking (enhancement) | **Add before the Production promotion** (PO, option A). Task form gets **"הערות"** (multi-line) and **"קישור"** (URL, validated); the row shows a small note icon and/or link icon when set; opening the task shows the notes and the link opens in the browser (`<bdi>`, LTR). Existing tasks unaffected (empty fields). |
| `P3-F5` — Tasks: done tasks stay mixed in the list instead of moving to the bottom. | Test C, step 2 | Non-blocking | Fix before the Production promotion (with `P3-F4`). Done tasks move to a **"הושלמו (N)"** section at the bottom, as in Packing; unticking moves a task back up; the status filter keeps working. |
| `P3-F6` — Thai text shows empty boxes for tone/vowel marks ("รีสอร□ต") — Heebo has no Thai glyphs and the fallback does not render the combining marks. Affects every Thai name from documents. | Test D | Non-blocking | Fix before the Production promotion (PO, option A). Add **Noto Sans Thai** as a fallback after Heebo (Google Fonts, `unicode-range` Thai only), everywhere text is shown. |
| `P3-F7` — Settings → participants: a participant that cannot be deleted does not look that way — (a) the bin looks the same as an active one; (b) the reason "לא ניתן למחוק: יש N שיוכים…" sits outside and below the card, reading as part of the next card. | Test E, step 1 | Non-blocking | Fix before the Production promotion. (a) Disabled bin clearly greyed (muted icon, no border, faint fill), `aria-disabled`, tap does nothing; (b) the reason line moves **inside its own card**, muted 14px under the name/status. |
| `P3-F8` — Settings → "יעדים": the "הוספה" button is a tall filled block twice the field's height; each destination row stacks ↑ / ↓ and a large pink "הסרה" over two lines. | Test E (Settings) | Non-blocking | Fix before the Production promotion. Add row: field + a small outline "+ הוספה" on one line, same height as the field. Destination row: name, then three 44px icon buttons on the same line — ↑, ↓, bin (aria-labels "הזזה למעלה/למטה", "הסרה"); ↑ disabled on the first, ↓ on the last. Board: "Phase 3 Findings — Settings & Today" → Destinations. |
| `P3-F9` — Settings → participants: "משתתף חדש" is a large filled button at the bottom of the list. | Test E (Settings) | Non-blocking | Fix before the Production promotion. Section header row like Packing/Shopping/Tasks: "משתתפים" + a small outline "+ משתתף חדש" **at the top**; the bottom button goes. Board: "Phase 3 Findings — Settings & Today" → Participants (also shows `P3-F7`). |
| `P3-F10` — Today: on the next-item card the action row ("ניווט", "כרטיסים") is inset from the right; "ניווט" does not line up with the time column above. | Today (seen during Test E) | Non-blocking | Fix before the Production promotion. Align the action row with the card's right content edge so "ניווט" sits flush under the time column; same padding as the rest of the card; order and size unchanged. Board: "Phase 3 Findings — Settings & Today" → Today. |
| `P3-F11` — Settings → participants: each participant card is tall (~140px) with three buttons; "עריכה" is redundant. | Test E (Settings) | Non-blocking | Fix before the Production promotion (with `P3-F7`, `P3-F9`). **Remove "עריכה"; tapping the participant opens the edit screen** (as Packing/Shopping/Tasks rows). One compact row (~64px): name + muted status/reason line inside the row; small outline "השבתה"/"הפעלה" and the bin on the same row. Board: "Phase 3 Findings — Settings & Today" → Participants (updated). |
| `P3-F12` — Settings → "גישה" (and every e-mail list): addresses break mid-word ("familytriptzs@gma / il.com") and "ביטול הרשאה" wraps to two lines — the Development Agent's LTR fix did not hold on the phone. | Test E, step 4 | Non-blocking | Fix before the Production promotion. **Option A** (PO): each e-mail on one line, LTR, never broken; too long → "…" with the full address on tap; a short outline **"הסרה"** button on one line (`aria-label` "ביטול הרשאה ל-<email>"); "מנהל" chip for the owner; invite field + small "הזמנה". Applies to sharing and admin lists. Mockup: `docs/design/mockups/P3-F12_ACCESS_ROWS_MOCKUP.md` + `P3-F12_access_rows_A.html`. |
| `P3-F13` — Trip Center → מסמך: the document list is bulky (≈230px cards, "שיוך למשתתף" / "פתיחה" / "מחק" stacked, status lines wrapping) and cannot be filtered. | Test F, step 1 | Non-blocking | Fix before the Production promotion. Compact ~60px rows (icon, one-line LTR name with ellipsis, status chip + muted note, tap = open) with a **"⋯" menu** (פתיחה / שיוך למשתתף / מחק — no "מחק" on a confirmed ticket); header on one line with "+ מסמך" and a summary line; **filter chips** הכול · ממתין לאישור · מצורף · לא משויך · כרטיסים · קישורים · נכשל (single-select, counts, empty state). Mockup: `docs/design/mockups/P3-F13_DOCUMENTS_LIST_MOCKUP.md` + `P3-F13_documents_list.html`. |
| `P3-F14` — Ticket slide: (a) on an unconfirmed slide the "אישור" label sits off-centre — the "✓" icon from `P22-F5` is not drawn but its space is kept; (b) in the slide's "⋯" menu "מחק" looks the same as "שיוך" / "הסרה". | Test F, step 3 | Non-blocking | Fix before the Production promotion. (a) Draw the check icon; icon + "אישור" centred together in the button. (b) Divider above "מחק", terracotta text + bin icon (as in the `P3-F13` menu), so the permanent delete stands apart from "remove from this item". |
| `P3-F15` — ציר הזמן: dates and times are not aligned (they wrap into the titles), and the calendar view should be richer. | Test G | Non-blocking (enhancement) | **Build before the Production promotion** (PO, option A). Mode control יום / שבוע / חודש / כל הטיול; the **month calendar always on top** with stays as coloured bands under their dates, event dots by kind, one legend, today ring, the shown range marked; **below**: יום = day agenda (fixed LTR time column, dot + line, cards, "where you sleep tonight", next item highlighted); שבוע / חודש / כל הטיול = ribbon (one row per day, stay bar, aligned time + title, empty days, collapsed empty runs in כל הטיול). Mockup: `docs/design/mockups/P3-F15_TIMELINE_COMBINED_MOCKUP.md` + `P3-F15_timeline_combined.html`. |
| `P3-F16` — Trip Center / category pages: category names are singular ("מלון", "טיסה"…), and each category page ends with a large full-width filled "הוספה" button unlike every other list. | Test I | Non-blocking | Fix before the Production promotion. (a) Tiles and category page titles **plural**: טיסות · מלונות · תחבורה · אטרקציות · מסעדות · ביטוחים · אנשי קשר · מסמכים; the **type chip on a single item stays singular** ("מלון"); "N פריטים" unchanged. (b) Replace the bottom "הוספה" with a small outline **"+ <type>"** (e.g. "+ מלון") in the header row beside the title (same pattern as Packing/Shopping/Tasks). |

## GO/NO-GO decision

**NO-GO** — Product Owner decision, 2026-10-11. **No Production promotion.** Results: A, B, C, E, F, I PASS with findings; D, H PASS; G findings (redesign). 16 findings: `P3-F1`, `F3`–`F16` (15) to fix **before the Production promotion** in a Phase 3.1 correction round; `P3-F2` (interactive games) → backlog. No Blocking or Medium findings. Handoff: `docs/versions/V7/0.8.0-phase3/PHASE_3_PO_SESSION_SUMMARY_FOR_DEVELOPMENT_AGENT.md`; screenshots in `docs/versions/V7/0.8.0-phase3/screenshots/`; mockups in `docs/design/mockups/` (`P3_*`, `P3-F12_*`, `P3-F13_*`, `P3-F15_*`).
