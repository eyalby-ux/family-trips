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

**Product Owner result (V1 session):** **PASS with findings** — Product Owner, live on `qa` (2026-10-04). Hapoel (19:45, started) led as "עכשיו" on one line with dot, dark time, provider and the done button; a later item (Tate 22:00) stayed in the plan, not at the top; no game suggestion. Interpretation #1 is the PO's own `F6` rule (no new approval needed). Findings `P11-F1`, `P11-F2`, `P11-F3` (superseded by `P11-F10`), `P11-F4`.

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

**Product Owner result (V1 session):** **PASS with findings** — Product Owner, live on `qa` (2026-10-04). Passed live: flight (LY087 23:38) pre-empted a started item (Hapoel 21:16) and showed "בעוד 2 שע׳", route, confirmation number `ABC123`, Navigate; hand-off to the next ordinary item at its start without reload (Tate 21:30); manual end by swipe on the phone, removed from Today with toast, gone on the computer after reload; detail-page "ביטול" restored it. **Deferred:** the 3-hour auto-clear and non-flight transport types (car/train/ferry/bus/transfer) — covered by automated tests. Findings `P11-F5`, `P11-F6`, `P11-F7`.

## Test 3 — `F3`: Today's plan lists only today; "הבא בתור" for what comes next

With items today **and** an in-range item tomorrow, open Today. Then check an ordinary item 3+ days out only, a flight 5 days out only, and the Trip's out-of-range items (the Jan 2027 flight and hotel).

**Expect:** "היום בתכנית" lists only today's items. Below it, a quiet "הבא בתור" line (no fill, no accent, no buttons) shows the first item after today **only if** it is within 48 hours (7 days when it is a flight/transport), with the **day above the time** ("מחר" or a weekday and date) — never time alone. Tapping it opens the item. An out-of-range item (LY087 Jan 7 2027, Panvaree) **never** appears there. When today has nothing at all and there is nothing after, the existing "פריטים מחוץ לטווח" fallback still works as before.

**Development Agent spot-check (qa):** ☑ an item tomorrow 10:00 showed "מחר / 10:00 / הבא בתור" with no fill or actions, below today's plan; the Jan 2027 items were absent. **Not exercised live:** the 3+ day and 5-day-flight boundaries and the out-of-range fallback screen (covered by the automated tests).
**Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner, live on `qa` (2026-10-04). Today's plan lists only today; an ordinary item >48h out shows no up-next line; a flight 5 days out shows with weekday/date above the time once nothing ordinary precedes it; out-of-range items never appear (Trip end set to today). Interpretation #3 replaced by `P11-F8`. Findings `P11-F8`, `P11-F9`, `P11-F10`.

## Test 4 — `F4`: "כרטיסים" opens the tickets

On a flight, activity or transport item that has a document confirmed as ticket coverage, use "כרטיסים" on its Today card.

**Expect:** The item's detail opens scrolled to its tickets area, not the top. When every participant is already covered, there is no "כיסוי כרטיסים" block, so it opens at the Documents section instead.

**Development Agent spot-check (qa):** ☑ the scroll mechanism (same attributes the button uses) landed on the item's tickets section. **Not exercised:** the real button, which needs a confirmed-ticket document.
**Result:** ☐

**Product Owner result (V1 session):** **Partial** — Product Owner, live on phone (2026-10-04). The "כרטיסים" jump works (lands on "כיסוי כרטיסים"), but the landing page is unusable on the phone. Findings `P11-F11` (Medium), `P11-F12` (Medium).

## Test 5 — `F5` and `F9`: label width and icons

Look at the leading card and a needs-attention card.

**Expect:** "בעוד 3 שע׳" (or any relative label) stays on one line in the 76px column. Navigate, Website, Tickets, Needs-attention and "הסתיים" use outline line icons in dark ink — no colored emoji anywhere on Today (the game suggestion's 🎲 is not part of this correction). The action buttons are ink on white with a border, not terracotta text.

**Development Agent spot-check (qa):** ☑ one-line label; ☑ compass and check icons are outline, dark. **Not exercised live:** the world, ticket and alert icons; the Tabler path data was written from memory of the open-source set, so please look at the shapes.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, live on phone (2026-10-04). Relative label on one line; compass/globe/ticket/check outline icons in dark ink, recognizable; no emoji; action buttons ink on white with border.

## Test 6 — `F10a`: a needs-attention card says why

Make today's date fall outside the Trip's range, or use a case where an out-of-range item is shown, so a needs-attention card appears.

**Expect:** A soft warm background, a dark alert-triangle icon, and one short dark line under the title: "התאריך מחוץ לטווח הטיול". (With several problems it would read "N בעיות"; only one condition exists today, so you will see the single reason.)

**Development Agent spot-check:** not run live — with the Trip's dates covering today no item can be both today and out of range, and "הבא בתור" never shows out-of-range items. Covered by assertion on `attentionReasons()`.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, live on `qa` (2026-10-04), Trip start temporarily set to tomorrow: today's leading card showed the soft warm background, dark outline alert triangle, and the reason line "התאריך מחוץ לטווח הטיול"; leading + needs-attention combine correctly.

## Test 7 — `F8`: nav label

**Expect:** The bottom nav reads היום · ציר הזמן · (+) · מרכז הטיול · אריזה.

**Development Agent spot-check (qa):** ☑.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner (2026-10-04): היום · ציר הזמן · (+) · מרכז הטיול · אריזה.

## Test 8 — `F11`–`F13`: Quick Access on Today

**Expect:** No "ציוד" button. The header always has "משימות" (even with zero open tasks) and "קניות (N)" with the number of unbought shopping items. Both open their screens.

**Development Agent spot-check (qa):** ☑ "משימות" and "קניות (2)" present, no "ציוד". **Not exercised:** a Trip with zero open tasks.
**Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner (2026-10-04). No "ציוד"; "קניות (2)" opens Shopping with 2 unbought items; "משימות" opens Tasks; with all tasks done the "משימות" button stays visible. Finding `P11-F13`.

## Test 9 — `F14`: task priority chips

Open Today's Quick Access tasks or the Tasks screen with High, Normal and Low tasks.

**Expect:** High: dark text on the soft warm fill. Normal: plain bordered chip, dark text. Low: plain bordered chip, grey text. No terracotta text on any priority chip.

**Development Agent spot-check (qa):** ☑ all three visible and as described.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner (2026-10-04): High = dark text on soft warm fill; Normal = plain bordered, dark text; Low = plain bordered, grey text; no terracotta text.

## Test 10 — `F15`, `F16`: the participant carousel

Open Packing on a Trip with 3–6 participants (the QA Trip has 6 options).

**Expect:** The selected option centered at full size, one neighbor each side, faded. At the first option the previous neighbor is the **last** option, and at the last the next neighbor is the first — it loops and never dead-ends. One swipe, one arrow press or one tap moves exactly one option, never two, even on a fast swipe. Dragging **right** selects the next option; the arrow keys follow (Right = next, Left = previous) and focus stays on the selected item so you can keep pressing. The dots show the real position among all options. With exactly 2 options both are shown with no repeats.

**Development Agent spot-check (qa, 6 options):** ☑ first option showed the last as its previous neighbor; ☑ a real drag right moved exactly one option (משותף → אייל, dot 1); ☑ arrow keys moved as expected with focus following. **Not exercised:** a phone-speed swipe on a touch screen, and the 2-option case.
**Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner (2026-10-04). Phone: selected centered with one faded neighbor each side, loops at the ends, dots show real position; fast swipes move exactly one; 2 options shown side by side with no repeats. Computer: clicking works, arrow keys do not. Interpretation #5 approved with the animation in `P11-F14`. Findings `P11-F14`, `P11-F15` (Low, no fix), `P11-F16`.

## Test 11 — `F17`, `F18`: Packing header and the 7+ participant chips

**Expect:** The Packing screen reads "רשימות אריזה", "…לאזור \"נארזו\"…" and the folded section "נארזו (N)" — no English. With **7 or more** options the carousel is replaced by compact chips in a single horizontally scrollable row (selected chip dark with white text, the others white with a border, no terracotta fill, no wrapping onto several rows). Up to 6 options still use the carousel.

**Development Agent spot-check (qa):** ☑ Hebrew strings; ☑ 6 options → carousel. ☑ chip styling checked in a rig with the real classes (one row, scrolls, dark selected chip, 44px tall). **Not exercised:** a real 7-participant Trip (adding participants to the shared QA Trip was not done).
**Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner (2026-10-04). Hebrew header ("רשימות אריזה", "נארזו") — no English. With 7 options the chips render as specified (one scrollable row, no terracotta) but are rejected on the phone (only part visible, selected chip scrolled out of view). Finding `P11-F17`.

## Test 12 — The local-day fix (`today()`), and the minute refresh

**Expect:** Today's header date matches the calendar date on your device at all hours, including between local midnight and 03:00. Leaving Today open, "בעוד X" and the leading item change by themselves within about a minute; typing in a form is never interrupted by the refresh.

**Development Agent spot-check:** the local-day logic is covered by automated checks under Asia/Jerusalem, Asia/Bangkok, UTC and America/Los_Angeles. Not checked live after midnight. 
**Result:** ☐

**Product Owner result (V1 session):** **Partial** — Product Owner (2026-10-04). Live minute refresh confirmed in Test 2 (Tate took the lead at 21:30 without reload; interpretation #4 stands). **Deferred to Claude Code (Development Agent to verify and report with evidence):** the refresh never interrupts typing in an open form; the header/today date is the local date between 00:00 and 03:00.

## Test 13 — General regression

Create and edit an item, run a Smart Import, confirm sync between phone and computer, open Settings from the gear.

**Expect:** Unchanged. Adding `endedAt` changes no existing item behavior; items without it behave exactly as before.

**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner (2026-10-04): item create/edit on the computer, a real Smart Import run end to end and approved, phone↔computer sync, Settings via the gear, unchanged.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| `P11-F1` — Passed items look identical to upcoming ones and can't be ended from the list. | Test 1 | Non-blocking | Passed items (not leading, not current) and auto-cleared items move to a collapsed "הסתיימו היום (N)" section at the bottom of the plan; opened, greyed rows with "החזר". Resolves interpretation #2. Mockup: Design artifact "Today — Done Button & Finished Section". |
| `P11-F2` — "הסתיים" reads as a status label, not a button (past tense; same look as the info links). | Test 1 | Non-blocking | Full-width **filled ink** button under a divider (mockup variant A) with the wording **"סמן כהסתיים"** (variant B). |
| `P11-F3` — With nothing left today, the up-next row sits directly under "היום בתכנית" and reads as a today item. | Test 1 | — | **Superseded by `P11-F10`.** |
| `P11-F4` — Browser tab reads "Family Trips · Alpha 0.8.0-phase1…". | Test 1 | Non-blocking | Label as **Beta** 0.8. |
| `P11-F5` — Moving an ended item's date/time later keeps it hidden from Today. | Test 2 | Non-blocking | Changing an ended item's date/time to later than now clears `endedAt` automatically; other edits keep it. |
| `P11-F6` — Swipe-to-end has no motion; the card just vanishes. | Test 2 | Non-blocking | Card follows the finger and fades; past ~1/3 width it slides out (160–220ms ease-out, cards below close up); otherwise snaps back. |
| `P11-F7` — A pre-empted current item (in the plan while a transport leads) cannot be ended from Today. | Test 2 | Non-blocking | In the plan it gets an "עכשיו" tag, the "סמן כהסתיים" button and swipe; ending moves it to "הסתיימו היום". |
| `P11-F8` — Up-next only considers the very first item after today, so an ordinary item can hide a flight within 7 days (interpretation #3). | Test 3 | Non-blocking | Show the first item within 48h; if none, the first **transportation** item within 7 days even if ordinary items come first. Spec note. |
| `P11-F9` — Up-next weekday/date wraps onto three ragged lines in the 76px column. | Test 3 | Non-blocking | Short form on one line, e.g. "ו׳ 9.10", above the time. |
| `P11-F10` — When nothing is left today, "היום בתכנית" heading remains with only the up-next row under it (and stays empty when nothing is coming up). | Test 3 | Non-blocking | Nothing left today → the "היום בתכנית" heading is replaced by a "הבא בתור" section heading with the quiet row (no box, short date). Nothing left and nothing upcoming → no heading, calm-day layout. Items left today → plan, then the quiet up-next line (no box). Supersedes `P11-F3`. |
| `P11-F11` — Item detail tickets/documents area is unusable on the phone: filename wraps 2–3 characters per line down the screen, buttons cut off, page wider than the screen. | Test 4 | **Medium** — must be in the next correction round | Filename on one line with ellipsis (or full-width wrap), buttons wrap to a second row, no horizontal scroll on the item page. Full item-page redesign stays under `G1`. |
| `P11-F12` — Item edit form on the phone: date/time fields and Save are cut off and unreachable — dates cannot be edited on the phone. | Test 4 | **Medium** — must be in the next correction round | Form scrolls fully within the viewport (nothing behind the nav/keyboard); "שמירה" pinned at the bottom; date fields full width with the native picker. Full form redesign stays under `G1` (high priority). |
| `P11-F13` — Quick Access on the phone: header wraps, task rows ~1/3 screen tall, big edit/delete on every row (red delete easy to mis-tap, terracotta edit text). | Test 8 | Non-blocking | Compact ~56px rows (checkbox, title, one meta line with inline priority chip); tap opens the task for edit; delete inside the edit screen with confirmation; header on one line. |
| `P11-F14` — Carousel changes selection with no motion. | Test 10 | Non-blocking | Row follows the finger, slides one position on release (160–220ms ease-out); same slide for tap/arrow. Interpretation #5 approved with this. |
| `P11-F15` — Arrow keys don't move the carousel on the computer (clicking works). | Test 10 | Low | **Logged, no fix** (PO decision). |
| `P11-F16` — On the computer the carousel shows only 3 participants in a wide empty row. | Test 10 | Non-blocking | Wide screens: when all participants fit on one line, show them all side by side (selected highlighted, others faded, click to select, no dots/loop); carousel only when they don't fit. Spec §5 note. |
| `P11-F17` — 7+ chips on the phone show only part of the list; the selected chip can be scrolled out of view. | Test 11 | Non-blocking | Phone: the carousel for any number of participants ("4 / 9" counter instead of dots when many); computer per `P11-F16`. Replaces Phase 1 `F18`'s chips rule; spec §5 "no carousel for long lists" reversed for the phone. |

## GO/NO-GO decision

**NO-GO** — Product Owner, 2026-10-04. No Blocking findings remain (Phase 1's `F3`/`F6` closed live), but the findings from this session route into a Phase 1.2 correction round before Phase 2: Medium `P11-F11`, `P11-F12` (phone usability) and Non-blocking `P11-F1`, `P11-F2`, `P11-F4`–`P11-F10`, `P11-F13`, `P11-F14`, `P11-F16`, `P11-F17` (`P11-F3` superseded; `P11-F15` Low, no fix). Deferred to the Development Agent within that round: Test 12's typing-during-refresh and 00:00–03:00 local-date checks. Still deferred to automated tests: Test 2's auto-clear and non-flight transport types. Re-test on `qa` after the correction: each corrected finding, plus Tests 1–4, 8, 10, 11 on the phone.

## Production promotion

**Not applicable to this phase.** Per `V147`, Phase 1 and its correction accumulate on `qa` only; Production promotion happens once, after Phase 3's own GO.

---

## Development Agent verification notes (2026-10-04)

Added after the Product Owner's results and NO-GO were recorded (`79a726c`). The Development Agent checked each recorded result against the live `qa` build (`0.8.0-phase1.1-4f3c239e`) and the code, read-only: no app code was changed and no test data was left behind. **These notes do not change any recorded result, severity or disposition above;** they flag what is unclear, contradictory or technically doubtful so it can be settled before a Phase 1.2 correction package is scoped. A phone was emulated at 375px in the browser pane (DOM measurements; screenshots of the emulated view were unreliable), so nothing here replaces a real-phone re-test.

### Recorded results confirmed

| Item | How checked | Verdict |
|---|---|---|
| `P11-F10` | Live: with nothing left today, the "היום בתכנית" heading shows "אין תכניות נוספות היום" and the up-next row sits directly under it. | Matches the finding. |
| `P11-F13` | Live at 375px: Quick Access header 100px tall (title wraps to 2 lines, the two buttons stack, the second 54px lower); task rows 134–136px each. | Matches. (The register's "~1/3 screen tall" is closer to 17% of the viewport height here; the point stands.) |
| `P11-F9` | The weekday/date string `יום ו׳, 9 באוק׳` lays out on 2 lines in the 76px column, plus the time line. | Matches ("three ragged lines"). |
| `P11-F5` | Code: an item edit does `Object.assign(item, values)`, so `endedAt` survives any edit; Today filters on `endedAt` alone. | Matches. |
| `P11-F7` | Code: `dayItemCard()` only enables "הסתיים" (button and swipe) for the leading card. | Matches. |
| `P11-F6` / `P11-F14` | Code: no transition on the swipe path; every selection calls `render()`, which rebuilds the DOM, so the carousel's existing opacity/transform transitions never run. | Match. |
| `P11-F17` | Live, 7 options at 375px: 3 chips fit (4 at the end). Selecting each chip in turn kept the selected chip fully visible every time. | "Only part visible" is inherent to a scrolling row. **"Selected chip scrolled out of view" was not reproduced** by selecting; it can only happen if the row is scrolled by hand afterwards. |
| Test 12 (deferred to the Development Agent) | (a) Page clock frozen at 01:30 Israel time on Oct 5 (still Oct 4 in UTC): header reads Oct 5; at 23:59:59 it reads Oct 4. (b) Add-item form left open through a full minute-refresh interval: text intact, same DOM node, still focused, zero re-renders of the app root. | **Both pass.** Refresh is guarded by `!state.modal`, and Today itself has no text inputs. |
| Trip dates (Tests 3, 6) | Live: Trip now reads 1 Oct – 1 Nov 2026. | The temporary date changes were restored. |

### Findings that are unclear, contradictory or technically doubtful

1. **`P11-F11` is pre-existing, not a Phase 1/1.1 regression.** The document row's controls (participant link, ticket confirmed/used, remove) are already in Production (0.7.9.2). Measured at 375px: the row is a non-wrapping flex line with five fixed-width controls (94 + 63 + 57 + 76 + 68 ≈ 358px), so the filename column collapses to 27px and wraps to 18 lines, and the row pushes the page to 498px. Phase 1 only bumped `.row b` to 20px. Item pages whose documents have no ticket controls (hotels, cars) stay at 375px. The proposed fix (ellipsis or full-width wrap, buttons on a second row, no horizontal scroll) is technically sound. **Open question:** item detail is Phase 2 scope per the Beta 0.8 scope; "must be in the next correction round" is a deliberate pull-forward, not a Phase 1 defect.
2. **`P11-F12` is very probably a consequence of `P11-F11`.** On the overflowing activity page the edit modal inherits the 498px layout width and its date field starts at x = −107px. On a hotel (page does not overflow) the same form fits: modal 375px wide, both date fields inside the screen (16–359px), Save reachable after scrolling the modal (749–793 of 812px). Recommend fixing `P11-F11` first and re-testing `P11-F12` before scoping it as a separate form change. The "Save pinned at the bottom" part is an independent nicety, and keyboard-open behavior on a real phone is untested.
3. **`P11-F15` ("Logged, no fix") is a bug in the Development Agent's implementation, not a limitation.** After any click-selection, focus lands on `BODY` (confirmed live), so the arrow-key handler (which requires focus inside the carousel) has nothing to act on. The Development Agent's own earlier live arrow-key check passed only because it focused the item by hand first. Spec §5 and §9 require keyboard support. It is a few lines to fix (re-focus the selected item after a selection that started inside the carousel). Chips and most other re-render-based actions drop focus the same way, which is a broader, pre-existing accessibility gap.
4. **`P11-F4` (label as Beta) has hidden coupling.** `appVersionLabel()` parses `/Alpha\s+/` from the page title, so changing the title alone makes the sign-in screen and header fall back to a bare "Alpha". Nine test files assert "Alpha", and `public/manifest.webmanifest` still names the installed PWA "Family Trips Alpha 0.6.5" (pre-existing). The scope should say which of these change.
5. **`P11-F1`: "החזר" is ambiguous.** Passed items are derived from time (a later item has started), not ended by the user, so "restoring" them has no defined meaning. Does "החזר" apply only to manually ended items? Also unspecified: whether `endAt` ever ends an item (today the latest-started item stays "עכשיו" regardless of its own `endAt`, per the Product Owner's rule).
6. **`P11-F1` and `P11-F10` leave a layout case undefined.** When nothing is left today but items sit in the collapsed "הסתיימו היום" section: is the order "הבא בתור" then the done section, or the reverse? Is the done section shown at all in the "nothing left and nothing upcoming" calm-day layout?
7. **`P11-F13` scope is unclear.** The register says "Quick Access", but `taskRow` is shared with the Tasks screen, so changing it changes both. The task edit modal has no delete today, so "delete inside the edit screen with confirmation" is new UI. It also reverses the 0.7.9 acceptance that asked for delete buttons on task and equipment rows (an existing test pins this).
8. **`P11-F14` is larger than it reads.** "Row follows the finger" needs about five rendered items (the carousel renders three, so nothing sits beyond the neighbor to slide in). Sliding needs a non-destructive update path, because `render()` rebuilds the whole screen. The app has no `prefers-reduced-motion` handling anywhere, so new motion (`P11-F6`, `P11-F14`) should include it. The 160–220ms figure is the spec's own.
9. **`P11-F16` / `P11-F17` need a definition of "fit" and a trigger.** "Wide screens" and "when all participants fit on one line" are unspecified (breakpoint? measured width?). The app has no resize or orientation re-render, so the layout would not follow a rotation. "Counter instead of dots when many" has no threshold. These also reverse the chips rule the Product Owner chose earlier the same day (Phase 1.1 `F18`, option C), which makes the repository copy of spec §5 (change-history row V7.1) and the chips code and tests obsolete.
10. **`P11-F9` format.** "ו׳ 9.10" is day.month (Israeli convention) and fits the column, but it has no year and "9.10" can be misread as a decimal; acceptable if intended.
11. **Housekeeping in this document.**
    - The header line "No Product Owner test has been run yet" is stale.
    - Every per-test **Result:** box above the Product Owner results is still unchecked.
    - "Medium" is a new severity level (earlier sessions used Blocking / Non-blocking) and is not defined.
    - The NO-GO rests on Medium findings, not Blocking ones; that is consistent with the stated rule but worth saying once.
    - Test 13 (general regression) has no Development Agent spot-check.
    - The QA Trip now contains a participant named "Test6", which makes it 7 options and hides the carousel; remove it before any carousel re-test.

### Not verified

A real phone (keyboard-open behavior, true viewport height), a second device, the 3-hour auto-clear, non-flight transport types, and the swipe-to-end gesture were not exercised by the Development Agent.
