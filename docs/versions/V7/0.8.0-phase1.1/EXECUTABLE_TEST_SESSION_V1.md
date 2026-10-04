# Family Trips Beta 0.8 Phase 1.1 (Phase 1 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase1.1` — the correction package for Phase 1's NO-GO (`docs/versions/V7/0.8.0-phase1/EXECUTABLE_TEST_SESSION_V1.md`), scoped in `FAMILY_TRIPS_BETA_0_8_PHASE_1_1_CORRECTION_SCOPE_V1.md`. Covers the two Blocking findings `F3`, `F6` and the Non-blocking `F4`, `F5`, `F8`, `F9`, `F10a`, `F11`–`F18`. Installed on `version/V7`, deployed to the fixed `qa` alias (build `0.8.0-phase1.1-4f3c239e`, `https://qa--familytripz.netlify.app`). `qa` only — no Production promotion, still gated on Phase 3's GO.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent already spot-checked most items live on `qa` (notes under each test, marked "Development Agent spot-check"); those are supporting evidence, not sign-off.
**Instructions:** Run one test at a time, in order. Record what you actually saw, not just PASS/FAIL. Today is only meaningful relative to the real clock, so Tests 1–3 need items dated **today**; create them yourself with the `+` button, in the QA Test Trip only (its dates now cover today).

## What changed that you should know about before testing

- **`today()` was returning the UTC date, not the local one** (found while fixing `F6`; the correction scope assumed it was already local). Between local midnight and 03:00 in Israel (07:00 in Thailand) the app thought it was still yesterday: wrong date in Today's header, wrong "today" in Timeline, wrong day for tasks. Fixed once at the root, so every screen now agrees. Test 12 checks it.
- **"הסתיים" adds a new synced item field, `endedAt`** (your Decision 1). It rides the normal item sync, so nothing changed in the sync engine or the Firestore rules. An ended item disappears from Today; the item's detail page shows "סומן כהסתיים · ביטול" to bring it back.
- **Behaviors I had to interpret**, each easy to change if you read it differently:
  1. The current item stays leading until the **next item's start**, however long the gap (as written in `F6`). A breakfast at 08:00 with the next item at 19:00 stays "עכשיו" all day unless ended or pre-empted by a transport item inside 3 hours.
  2. When the last item auto-clears (3h after its start) it leaves the leading slot but **stays in the plan list** as a past item; only a manual "הסתיים" removes it from Today entirely.
  3. "הבא בתור" decides on the first in-range item after today: if that one is outside its window (48h, 7 days for transport), the line is hidden even when a flight further out would qualify.
  4. Today now **refreshes once a minute** while it is the visible screen, so "עכשיו", "בעוד X" and the handoffs happen without a reload.
  5. The carousel no longer scrolls: it shows the selected option plus one neighbor each side and a swipe/arrow/tap selects exactly one. This is how `F15` is satisfied (rather than `scroll-snap-stop`, which no longer applies).

## Test 1 — Re-run of Phase 1 Test 6: busy day (non-transit leading item)

Create an **activity** dated today that started 1–2 hours ago, with a **provider**, and another **activity** later today (more than 3 hours from now). Open Today.

**Expect:** The earlier activity is the leading card: the label reads "עכשיו" on **one line**, a terracotta dot, the time in dark text, name and provider, and a "הסתיים" button. The later activity is in "היום בתכנית", not repeated at the top. No game suggestion anywhere. The leading card is **not** replaced by the later one until its start time.

**Development Agent spot-check (qa, TZ Asia/Jerusalem):** ☑ an activity started at 17:00 led as "עכשיו" with the "הסתיים" button while a flight at 23:50 (4h40 away) did not take over; label on one line.
**Result:** ☐

## Test 2 — Re-run of Phase 1 Test 7: transit day, and every `F6` rule

Create a **flight** (or a Transport item) dated today, **2 to 3 hours from now**, with a location and a confirmation number, while an ordinary item that already started is still current. Open Today. Then run the rule checks below in the same session where the clock allows.

**Expect:**
- **Pre-emption (the reported failure):** the flight takes the leading slot even though the earlier item is still current; it shows "בעוד X", the route/location and the confirmation number, and Navigate if it has a location. The earlier item moves into the plan list. Moving the flight to 3h 05m away hands the lead back to the current item.
- **Handoff:** when an ordinary next item's start time arrives, it becomes the leading item (within a minute, no reload).
- **Manual end:** "הסתיים" on a started leading item removes it from Today immediately, shows a toast, and survives a reload and a second device. A horizontal swipe on the card does the same. The item's detail page shows "סומן כהסתיים · ביטול"; tapping ביטול brings it back.
- **Auto-clear:** the last item of the day, with nothing after it, stops leading 3 hours after its own start; Today then shows the calm-day presentation with a game suggestion.
- The same holds for a rental car, train, ferry, bus or transfer in place of the flight.

**Development Agent spot-check (qa):** ☑ flight at 21:30 (2h22 away) pre-empted an activity started at 17:00 ("בעוד 2 שע׳", route, confirmation number, Navigate); ☑ moved to 23:50 the activity led again as "עכשיו"; ☑ "הסתיים" removed it, toast shown, the flight then led; ☑ the removal survived a full reload; ☑ detail page "ביטול" restored it. **Not exercised live:** the swipe-to-end gesture, a second device, the auto-clear (needs a 3-hour wait), the 3-hour boundary minute, and car/train/ferry types — the boundary, handoff, auto-clear and end rules are covered by the automated tests under four timezones.
**Result:** ☐

## Test 3 — `F3`: Today's plan lists only today; "הבא בתור" for what comes next

With items today **and** an in-range item tomorrow, open Today. Then check an ordinary item 3+ days out only, a flight 5 days out only, and the Trip's out-of-range items (the Jan 2027 flight and hotel).

**Expect:** "היום בתכנית" lists only today's items. Below it, a quiet "הבא בתור" line (no fill, no accent, no buttons) shows the first item after today **only if** it is within 48 hours (7 days when it is a flight/transport), with the **day above the time** ("מחר" or a weekday and date) — never time alone. Tapping it opens the item. An out-of-range item (LY087 Jan 7 2027, Panvaree) **never** appears there. When today has nothing at all and there is nothing after, the existing "פריטים מחוץ לטווח" fallback still works as before.

**Development Agent spot-check (qa):** ☑ an item tomorrow 10:00 showed "מחר / 10:00 / הבא בתור" with no fill or actions, below today's plan; the Jan 2027 items were absent. **Not exercised live:** the 3+ day and 5-day-flight boundaries and the out-of-range fallback screen (covered by the automated tests).
**Result:** ☐

## Test 4 — `F4`: "כרטיסים" opens the tickets

On a flight, activity or transport item that has a document confirmed as ticket coverage, use "כרטיסים" on its Today card.

**Expect:** The item's detail opens scrolled to its tickets area, not the top. When every participant is already covered, there is no "כיסוי כרטיסים" block, so it opens at the Documents section instead.

**Development Agent spot-check (qa):** ☑ the scroll mechanism (same attributes the button uses) landed on the item's tickets section. **Not exercised:** the real button, which needs a confirmed-ticket document.
**Result:** ☐

## Test 5 — `F5` and `F9`: label width and icons

Look at the leading card and a needs-attention card.

**Expect:** "בעוד 3 שע׳" (or any relative label) stays on one line in the 76px column. Navigate, Website, Tickets, Needs-attention and "הסתיים" use outline line icons in dark ink — no colored emoji anywhere on Today (the game suggestion's 🎲 is not part of this correction). The action buttons are ink on white with a border, not terracotta text.

**Development Agent spot-check (qa):** ☑ one-line label; ☑ compass and check icons are outline, dark. **Not exercised live:** the world, ticket and alert icons; the Tabler path data was written from memory of the open-source set, so please look at the shapes.
**Result:** ☐

## Test 6 — `F10a`: a needs-attention card says why

Make today's date fall outside the Trip's range, or use a case where an out-of-range item is shown, so a needs-attention card appears.

**Expect:** A soft warm background, a dark alert-triangle icon, and one short dark line under the title: "התאריך מחוץ לטווח הטיול". (With several problems it would read "N בעיות"; only one condition exists today, so you will see the single reason.)

**Development Agent spot-check:** not run live — with the Trip's dates covering today no item can be both today and out of range, and "הבא בתור" never shows out-of-range items. Covered by assertion on `attentionReasons()`.
**Result:** ☐

## Test 7 — `F8`: nav label

**Expect:** The bottom nav reads היום · ציר הזמן · (+) · מרכז הטיול · אריזה.

**Development Agent spot-check (qa):** ☑.
**Result:** ☐

## Test 8 — `F11`–`F13`: Quick Access on Today

**Expect:** No "ציוד" button. The header always has "משימות" (even with zero open tasks) and "קניות (N)" with the number of unbought shopping items. Both open their screens.

**Development Agent spot-check (qa):** ☑ "משימות" and "קניות (2)" present, no "ציוד". **Not exercised:** a Trip with zero open tasks.
**Result:** ☐

## Test 9 — `F14`: task priority chips

Open Today's Quick Access tasks or the Tasks screen with High, Normal and Low tasks.

**Expect:** High: dark text on the soft warm fill. Normal: plain bordered chip, dark text. Low: plain bordered chip, grey text. No terracotta text on any priority chip.

**Development Agent spot-check (qa):** ☑ all three visible and as described.
**Result:** ☐

## Test 10 — `F15`, `F16`: the participant carousel

Open Packing on a Trip with 3–6 participants (the QA Trip has 6 options).

**Expect:** The selected option centered at full size, one neighbor each side, faded. At the first option the previous neighbor is the **last** option, and at the last the next neighbor is the first — it loops and never dead-ends. One swipe, one arrow press or one tap moves exactly one option, never two, even on a fast swipe. Dragging **right** selects the next option; the arrow keys follow (Right = next, Left = previous) and focus stays on the selected item so you can keep pressing. The dots show the real position among all options. With exactly 2 options both are shown with no repeats.

**Development Agent spot-check (qa, 6 options):** ☑ first option showed the last as its previous neighbor; ☑ a real drag right moved exactly one option (משותף → אייל, dot 1); ☑ arrow keys moved as expected with focus following. **Not exercised:** a phone-speed swipe on a touch screen, and the 2-option case.
**Result:** ☐

## Test 11 — `F17`, `F18`: Packing header and the 7+ participant chips

**Expect:** The Packing screen reads "רשימות אריזה", "…לאזור \"נארזו\"…" and the folded section "נארזו (N)" — no English. With **7 or more** options the carousel is replaced by compact chips in a single horizontally scrollable row (selected chip dark with white text, the others white with a border, no terracotta fill, no wrapping onto several rows). Up to 6 options still use the carousel.

**Development Agent spot-check (qa):** ☑ Hebrew strings; ☑ 6 options → carousel. ☑ chip styling checked in a rig with the real classes (one row, scrolls, dark selected chip, 44px tall). **Not exercised:** a real 7-participant Trip (adding participants to the shared QA Trip was not done).
**Result:** ☐

## Test 12 — The local-day fix (`today()`), and the minute refresh

**Expect:** Today's header date matches the calendar date on your device at all hours, including between local midnight and 03:00. Leaving Today open, "בעוד X" and the leading item change by themselves within about a minute; typing in a form is never interrupted by the refresh.

**Development Agent spot-check:** the local-day logic is covered by automated checks under Asia/Jerusalem, Asia/Bangkok, UTC and America/Los_Angeles. Not checked live after midnight. 
**Result:** ☐

## Test 13 — General regression

Create and edit an item, run a Smart Import, confirm sync between phone and computer, open Settings from the gear.

**Expect:** Unchanged. Adding `endedAt` changes no existing item behavior; items without it behave exactly as before.

**Result:** ☐

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| _(none yet)_ | | | |

## GO/NO-GO decision

**Pending.** Awaiting this session.

## Production promotion

**Not applicable to this phase.** Per `V147`, Phase 1 and its correction accumulate on `qa` only; Production promotion happens once, after Phase 3's own GO.
