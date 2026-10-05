# Family Trips Beta 0.8 Phase 1.2 (second Phase 1 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase1.2` — the correction package for the Phase 1.1 NO-GO (`docs/versions/V7/0.8.0-phase1.1/EXECUTABLE_TEST_SESSION_V1.md`), scoped in `FAMILY_TRIPS_BETA_0_8_PHASE_1_2_CORRECTION_SCOPE_V1.md`. Covers the two Medium findings `P11-F11`, `P11-F12` and the Non-blocking `P11-F1`, `P11-F2`, `P11-F4`–`P11-F10`, `P11-F13`–`P11-F17` (`P11-F3` is superseded by `P11-F10`). Installed on `version/V7`, deployed to the fixed `qa` alias (build `0.8.0-phase1.2-ab9e513c`, `https://qa--familytripz.netlify.app`). `qa` only — no Production promotion, still gated on Phase 3's GO.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent already spot-checked almost everything live on `qa` (notes under each test, marked "Development Agent spot-check"); those are supporting evidence, not sign-off.
**Instructions:** This round needs a **real phone**, not an emulated viewport: the Development Agent's own phone checks were a 375px/320px emulated pane measured through the DOM, and the emulated window never fires a native `resize`/rotation event. Run the tests in order on your phone; use the computer only where a test says so. Record what you actually saw, not just PASS/FAIL. Items dated today are needed for Tests 3–6: create them yourself with the `+` button, in the QA Test Trip only (its dates cover today).

## What changed that you should know about before testing

- **Root causes found along the way:**
  - `P11-F11` was two causes, not one. The document row's controls did not wrap (fixed first), and then a `.list` grid column kept growing to fit the no-wrap filename, so the page was still up to 548px wide at 375px until the column was allowed to shrink. Both fixes are in; every item page now measures exactly the screen width at 320px and 375px.
  - `P11-F12`, as scoped, was re-tested after `P11-F11` was fixed: the edit form fits once the page no longer overflows, so the only form change is that **"שמירה" is pinned at the bottom** (edit-item and task forms).
- **Bugs the Development Agent found in its own correction while testing live (all fixed, listed so you know what to look for):** ending the *current* item used to resurrect an older, already-passed item as "current"; the carousel's "N / total" counter rendered as "7 / 1" under RTL; the carousel slide distance was measured from left edges and was a few pixels off for the faded neighbors; the compact task row was 77–79px tall and its priority chip, last on the line, could be cut off by the ellipsis.
- **Decisions the Development Agent made** (change any you read differently):
  1. **Breakpoint (`P11-F16`):** a viewport of **768px or wider** counts as wide, and everyone is shown side by side only if they all fit the measured width (96px per option, 8px gap, against the viewport — capped at 1080px — minus page and card padding). Below 768px it is always the carousel. On a 1280px window, 7 participants sit on one line; on a phone, any count is a carousel.
  2. **Stray "Test6":** participants cannot be deleted in this app, only deactivated, so it was **deactivated** (reversible from Settings → "הפעלה"). The QA Trip now has 6 options, which is the case other tests need.
  3. **Done section:** manually ended items, items superseded by a later one, and an auto-cleared last item all land in the collapsed "הסתיימו היום (N)"; "החזר" appears only on manually ended ones. It opens and stays open across the minute refresh.
  4. **With nothing left today and nothing upcoming** there is no heading, just a quiet one-line "אין תכניות להיום." (so the screen is not blank); the game suggestion still follows. Say if you want even that line gone.
  5. **Alpha → Beta (`P11-F4`):** only **two** test files actually asserted the label (`v6-correction`, `v6-5-flight-import`); the other files named in the scope mention "Alpha" only in historical console messages and comments, so those were left as history. `public/manifest.webmanifest` still says "Alpha 0.6.5" (left alone, as scoped).
  6. **Swipe on a Today card** ends it (≥ a third of the card's width), with the card following the finger; the button does the same. Motion is skipped under `prefers-reduced-motion`.
  7. **Tasks:** delete is gone from the task row and lives in the task's edit screen (existing tasks only), behind the same confirmation; equipment rows are unchanged. The `0.7.9` test that pinned the row-level delete was rewritten to assert the new behavior.
  8. Below 340px the Quick Access header may wrap onto two lines instead of overflowing the page by a pixel.

## Test 1 — `P11-F11`: item page with documents, on the phone

Open each item that has documents attached (the activities and the flight with ticket documents, the hotels, the cars), one after another.

**Expect:** No horizontal scrolling or zooming-out on any item page. Each document's filename is on **one line** with an ellipsis when long; the controls (participant link, "כרטיס מאושר", "נוצל", open, remove) sit on a second row and wrap if needed. Nothing is cut off at the screen edge.

**Development Agent spot-check (qa, emulated 375px and 320px, DOM-measured):** ☑ all 15 item pages measured exactly the screen width (previously 399–548px at 375px); filename one line with `text-overflow: ellipsis`; controls on the row below the name. Not run on a real phone.
**Result:** ☐

## Test 2 — `P11-F12`: edit an item's date on the phone

On an activity that has ticket documents (the page that used to break), tap the edit action, change the date/time, and save.

**Expect:** The form fits the screen: the date/time field is fully visible at full width and opens the phone's native picker. "שמירה" is **pinned** at the bottom of the form — visible without scrolling and still there as the form scrolls — and not hidden behind the nav or the keyboard. Saving works.

**Development Agent spot-check (qa, emulated 375px):** ☑ page under the modal 375px; date field x = 16–359px (fully inside); "שמירה" at y = 746–790 of 812 whether the form was scrolled to the top or the bottom. **Not exercised:** the on-screen keyboard (a real phone), and the native date picker.
**Result:** ☐

## Test 3 — Phase 1.1 Tests 1 and 2: a busy day and a transit day (`P11-F2`, `P11-F6`, `P11-F7`)

Create an **activity** that started 1–2 hours ago (with a provider) and another **activity** that started about an hour ago, plus a **train/ferry/bus or car-type transport item** 2 to 3 hours from now, plus a **flight** later today. Open Today.

**Expect:**
- The **transport item (not a flight)** takes the lead — "בעוד X", route/location, confirmation number, Navigate. This is the live non-flight check still owed from Phase 1.1.
- The started activity stays in "היום בתכנית" tagged **"עכשיו"**, with the **full-width filled-ink "סמן כהסתיים"** under a divider. Ending it moves it to "הסתיימו היום" and it does **not** bring an older, already-passed item back as current.
- Swipe the started card sideways: it **follows your finger and fades**; past about a third of its width it slides out and the cards below close up; a short swipe snaps back. With "reduce motion" on in the phone's accessibility settings there is no animation, it just ends.
- "החזר" in the done section restores it.

**Development Agent spot-check (qa, 2026-10-05):** ☑ a **train** (non-flight transport) 1h23 away pre-empted the lead; ☑ the started activity stayed in the plan tagged "עכשיו" with the filled button; ☑ ending it left the 17:00 item in the done section (this was a bug until fixed live); ☑ "החזר" restored it; ☑ synthetic pointer drag: card followed (`translateX(70px)`, opacity 0.79), short drag snapped back in 160ms, drag past a third (100px of 301px) slid out in 200ms, closed up in 180ms, then ended with a toast; ☑ under a forced `prefers-reduced-motion`: ended immediately, no transition. **Not exercised:** a real finger swipe, real OS reduced-motion, a second device.
**Result:** ☐

## Test 4 — The 3-hour rules (Phase 1.1 Test 2's deferred items)

The last item of a day should leave the lead 3 hours after it started; a transport item should take the lead 3 hours before it departs.

**Expect:** With nothing left to hand off to, the last item shows as "עכשיו" until exactly 3 hours after its start, then the lead clears (calm-day layout, game suggestion) and it sits in the done section. A genuine 3-hour wait is optional if you trust the check below.

**Development Agent spot-check (qa):** ☑ run on **real items under a simulated clock** in the live bundle: tomorrow's 16:30 item led as "עכשיו" at 16:30 and at 19:29, and at exactly 19:30 it left the lead (done section 2, header date correct). The 3h-before pre-emption boundary is covered by the automated tests under four timezones. Not a real 3-hour wait.
**Result:** ☐

## Test 5 — `P11-F5`: rescheduling an ended item

End an item, then edit it.

**Expect:** Editing only its notes, or moving its time to **earlier than now**, leaves it ended. Moving its date/time to **later than now** brings it back onto Today (no longer ended).

**Development Agent spot-check (qa):** ☑ notes-only edit kept it ended; ☑ moving to 18:30 (past) kept it ended; ☑ moving to 23:15 (future) cleared it and it reappeared in the plan.
**Result:** ☐

## Test 6 — Phase 1.1 Test 3: "הבא בתור" in its three layouts (`P11-F8`, `P11-F9`, `P11-F10`)

Look at Today in each state: (a) items still left today and something tomorrow; (b) nothing left today, something coming; (c) nothing left and nothing in the next days. Also: an ordinary item 3+ days out with a flight 5 days out; a flight beyond 7 days.

**Expect:**
- (a) the plan, then the quiet "הבא בתור" row underneath (no box, no fill, no buttons), with its small "הבא בתור" label.
- (b) the "היום בתכנית" heading is **replaced** by a "הבא בתור" section heading over the same quiet row.
- (c) no heading at all — the calm-day layout with a quiet "אין תכניות להיום."
- The day above the time is **one line**: "מחר", or the weekday letter and day.month such as "ו׳ 9.10". The first item within 48 hours is shown; if none, the first **flight/transport** item within 7 days is shown even when an ordinary item comes first. An out-of-range item (the Jan 2027 flight and hotels) never appears.
- The collapsed "הסתיימו היום (N)" section sits **after** "הבא בתור".

**Development Agent spot-check (qa):** ☑ (a) shown with "מחר / 10:00" on one line and the small label; ☑ the done section collapsed below it; Jan 2027 items absent. The rules for (b)/(c), the 48h/7-day windows and the "ו׳ 9.10" format are covered by the automated tests under four timezones; not walked through live because the QA Trip always has something today or tomorrow.
**Result:** ☐

## Test 7 — Phase 1.1 Test 4: "כרטיסים" (`P11-F4` of Phase 1.1)

On an item with a document confirmed as ticket coverage, tap "כרטיסים" on its Today card.

**Expect:** The item opens scrolled to its tickets area (or to Documents when everyone is already covered), and that page is now usable on the phone (Test 1).

**Development Agent spot-check (qa):** ☑ the scroll mechanism landed on the tickets section (same attributes as the button); the real button needs a Trip with a confirmed-ticket item on today's plan.
**Result:** ☐

## Test 8 — Phase 1.1 Test 8: Quick Access and tasks (`P11-F13`)

Look at Today's Quick Access card and then the Tasks screen (from "משימות").

**Expect:** The header — "גישה מהירה", "משימות", "קניות (N)" — is on **one line**. Each task row is a compact ~56px row: checkbox, the title, and one meta line that starts with the **priority chip** (High: dark text on the soft warm fill; Normal/Low: plain bordered chip) then the date and participant. **Tapping a row opens that task for editing**; there is no delete button on the row. The task's edit screen has "שמירה" pinned at the bottom and a red "מחיקת המשימה" (existing tasks only) that asks for confirmation. The same design appears on the Tasks screen. Equipment rows in Packing keep their delete button.

**Development Agent spot-check (qa, emulated 375px):** ☑ header 44px tall (one line); ☑ rows 58–60px with the chip first; below 340px the header is allowed to wrap. **Not exercised:** deleting a task through the edit screen (no throwaway task was created), and a real phone.
**Result:** ☐

## Test 9 — Phase 1.1 Test 10: the participant carousel (`P11-F14`, `P11-F15`, `P11-F17`)

On Packing, on the phone, with the QA Trip's 6 options: swipe both ways, tap a neighbor, and (computer) click a neighbor and then press the arrow keys. Also try a fast swipe.

**Expect:** The selected option centered at full size, one neighbor each side, faded; at the first option the previous neighbor is the **last** option (it loops). One swipe/tap/arrow moves exactly one option, even on a fast swipe. The row **follows your finger and slides one position** (about 180ms) when released; a short drag snaps back. Dots show the real position. With 7 or more participants a **"N / total"** counter (such as "1 / 7") replaces the dots, readable left-to-right. On the computer, after a **mouse click** on a neighbor the arrow keys still work (focus stays on the selected option). With exactly 2 options both show side by side with no repeats. With "reduce motion" on, selection is instant.

**Development Agent spot-check (qa):** ☑ 5 options mounted (2 clipped and hidden), 3 visible; ☑ synthetic drag followed the finger (`translateX(90px)`), release set `transform 180ms ease-out`, selection and indicator updated ("2 / 7"), and **focus landed on the new selected item**; ☑ a short drag snapped back with the selection unchanged; ☑ two back-to-back swipes moved exactly one option; ☑ a mouse click on the neighbor, then real ArrowRight keypresses, moved 3 / 7 to 4 / 7; ☑ the 7-option counter reads "1" left of "7" (measured from glyph positions); ☑ the 6-option case shows 6 dots. **Not exercised:** the visible slide on screen (the hidden pane does not advance CSS transitions), a real touch swipe, the 2-option case, real OS reduced motion.
**Result:** ☐

## Test 10 — `P11-F16`: the computer layout, and rotating/resizing

On the computer, open Packing in a wide window, then narrow the window below about 770px (or rotate a tablet/phone to landscape).

**Expect:** In a wide window where everyone fits, **all participants are side by side on one line**, the selected one highlighted and the others faded, clicking selects, no dots and no counter. Narrowing the window below 768px, or to a width where they no longer fit, turns it into the carousel **without reloading**; widening it turns it back. (The landscape phone case: if the phone is ≥768px wide and everyone fits, it becomes the row; otherwise it stays a carousel.) Please tell the Development Agent the breakpoint reads right: 768px plus a measured fit.

**Development Agent spot-check (qa):** ☑ at 1280px: 7 participants in a row, all inside the container, others faded, no indicator; ☑ the resize listener, triggered by dispatching the event, switched row → carousel (5 mounted). **Not exercised:** a native window resize or rotation — the emulated pane does not fire the browser's own `resize` event (0 fired), so this one is genuinely open for a real window.
**Result:** ☐

## Test 11 — Phase 1.1 Test 11: Packing header (`P11-F17` of Phase 1.1)

**Expect:** "רשימות אריזה", the line mentioning "נארזו", and the folded "נארזו (N)" — no English; no chips anywhere (they were removed with this round).

**Development Agent spot-check (qa):** ☑ Hebrew header; chips gone from the code and CSS.
**Result:** ☐

## Test 12 — `P11-F4`: the Beta label

**Expect:** The browser tab reads "Family Trips · Beta 0.8.0-phase1.2"; the sign-in screen's kicker reads "Beta 0.8.0-phase1.2" (not a bare "Beta" or "Alpha"); the header subtitle on the first-run landing banner uses the same.

**Development Agent spot-check (qa):** ☑ the tab title is "Family Trips · Beta 0.8.0-phase1.2". **Not exercised:** the sign-in screen (the pane was signed in).
**Result:** ☐

## Test 13 — General regression

Create and edit an item, run a Smart Import, confirm phone↔computer sync, open Settings from the gear.

**Expect:** Unchanged.

**Development Agent spot-check (qa):** ☑ created four item types through the add form, edited notes and times, opened detail and edit, deleted items, opened Settings through the gear, deactivated a participant; every main screen kept rendering. **Not exercised:** a real Smart Import and cross-device sync.
**Result:** ☐

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| _(none yet)_ | | | |

## GO/NO-GO decision

**Pending.** Awaiting this session.

## Production promotion

**Not applicable to this phase.** Per `V147`, Phase 1 and its corrections accumulate on `qa` only; Production promotion happens once, after Phase 3's own GO.
