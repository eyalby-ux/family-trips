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

**State of the QA Trip when this session starts:** the six `QA12` test items the Development Agent created were deleted; the 11 original items have the dates they had before the Development Agent's edits (compared field by field against a snapshot); "Test6" is deactivated; one throwaway task was created and deleted. Everything the Development Agent edited was edited with the Product Owner's permission to verify this round.

## Test 1 — `P11-F11`: item page with documents, on the phone

Open each item that has documents attached (the activities and the flight with ticket documents, the hotels, the cars), one after another.

**Expect:** No horizontal scrolling or zooming-out on any item page. Each document's filename is on **one line** with an ellipsis when long; the controls (participant link, "כרטיס מאושר", "נוצל", open, remove) sit on a second row and wrap if needed. Nothing is cut off at the screen edge.

**Development Agent spot-check (qa, emulated 375px and 320px, DOM-measured):** ☑ all 15 item pages measured exactly the screen width (previously 399–548px at 375px); filename one line with `text-overflow: ellipsis`; controls on the row below the name. Not run on a real phone.
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round.

## Test 2 — `P11-F12`: edit an item's date on the phone

On an activity that has ticket documents (the page that used to break), tap the edit action, change the date/time, and save.

**Expect:** The form fits the screen: the date/time field is fully visible at full width and opens the phone's native picker. "שמירה" is **pinned** at the bottom of the form — visible without scrolling and still there as the form scrolls — and not hidden behind the nav or the keyboard. Saving works.

**Development Agent spot-check (qa, emulated 375px):** ☑ page under the modal 375px; date field x = 16–359px (fully inside); "שמירה" at y = 746–790 of 812 whether the form was scrolled to the top or the bottom. **Not exercised:** the on-screen keyboard (a real phone), and the native date picker.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, real phone (2026-10-05): with the on-screen keyboard open, "שמירה" stays pinned and reachable; the native date/time picker opens and works; saving works and the new date shows.

## Test 3 — Phase 1.1 Tests 1 and 2: a busy day and a transit day (`P11-F2`, `P11-F6`, `P11-F7`)

Create an **activity** that started 1–2 hours ago (with a provider) and another **activity** that started about an hour ago, plus a **train/ferry/bus or car-type transport item** 2 to 3 hours from now, plus a **flight** later today. Open Today.

**Expect:**
- The **transport item (not a flight)** takes the lead — "בעוד X", route/location, confirmation number, Navigate. This is the live non-flight check still owed from Phase 1.1.
- The started activity stays in "היום בתכנית" tagged **"עכשיו"**, with the **full-width filled-ink "סמן כהסתיים"** under a divider. Ending it moves it to "הסתיימו היום" and it does **not** bring an older, already-passed item back as current.
- Swipe the started card sideways: it **follows your finger and fades**; past about a third of its width it slides out and the cards below close up; a short swipe snaps back. With "reduce motion" on in the phone's accessibility settings there is no animation, it just ends.
- "החזר" in the done section restores it.

**Development Agent spot-check (qa, 2026-10-05):** ☑ a **train** (non-flight transport) 1h23 away pre-empted the lead; ☑ the started activity stayed in the plan tagged "עכשיו" with the filled button; ☑ ending it left the 17:00 item in the done section (this was a bug until fixed live); ☑ "החזר" restored it; ☑ synthetic pointer drag: card followed (`translateX(70px)`, opacity 0.79), short drag snapped back in 160ms, drag past a third (100px of 301px) slid out in 200ms, closed up in 180ms, then ended with a toast; ☑ under a forced `prefers-reduced-motion`: ended immediately, no transition. **Not exercised:** a real finger swipe, real OS reduced-motion, a second device.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, real phone (2026-10-05): a started activity led as "עכשיו" with the full-width "סמן כהסתיים"; a real finger swipe follows the finger and fades, a short swipe snaps back, a long swipe slides out, the cards close up, toast shown, item lands in "הסתיימו היום"; "סמן כהסתיים" on the phone showed in "הסתיימו היום" on the computer after reload, and "החזר" from the computer restored it on the phone. **Not run:** OS reduce-motion (the setting could not be found on the phone).

## Test 4 — The 3-hour rules (Phase 1.1 Test 2's deferred items)

The last item of a day should leave the lead 3 hours after it started; a transport item should take the lead 3 hours before it departs.

**Expect:** With nothing left to hand off to, the last item shows as "עכשיו" until exactly 3 hours after its start, then the lead clears (calm-day layout, game suggestion) and it sits in the done section. A genuine 3-hour wait is optional if you trust the check below.

**Development Agent spot-check (qa):** ☑ run on **real items under a simulated clock** in the live bundle: tomorrow's 16:30 item led as "עכשיו" at 16:30 and at 19:29, and at exactly 19:30 it left the lead (done section 2, header date correct). The 3h-before pre-emption boundary is covered by the automated tests under four timezones. Not a real 3-hour wait.
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round. The optional genuine 3-hour wait was not run.

## Test 5 — `P11-F5`: rescheduling an ended item

End an item, then edit it.

**Expect:** Editing only its notes, or moving its time to **earlier than now**, leaves it ended. Moving its date/time to **later than now** brings it back onto Today (no longer ended).

**Development Agent spot-check (qa):** ☑ notes-only edit kept it ended; ☑ moving to 18:30 (past) kept it ended; ☑ moving to 23:15 (future) cleared it and it reappeared in the plan.
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round.

## Test 6 — Phase 1.1 Test 3: "הבא בתור" in its three layouts (`P11-F8`, `P11-F9`, `P11-F10`)

Look at Today in each state: (a) items still left today and something tomorrow; (b) nothing left today, something coming; (c) nothing left and nothing in the next days. Also: an ordinary item 3+ days out with a flight 5 days out; a flight beyond 7 days.

**Expect:**
- (a) the plan, then the quiet "הבא בתור" row underneath (no box, no fill, no buttons), with its small "הבא בתור" label.
- (b) the "היום בתכנית" heading is **replaced** by a "הבא בתור" section heading over the same quiet row.
- (c) no heading at all — the calm-day layout with a quiet "אין תכניות להיום."
- The day above the time is **one line**: "מחר", or the weekday letter and day.month such as "ו׳ 9.10". The first item within 48 hours is shown; if none, the first **flight/transport** item within 7 days is shown even when an ordinary item comes first. An out-of-range item (the Jan 2027 flight and hotels) never appears.
- The collapsed "הסתיימו היום (N)" section sits **after** "הבא בתור".

**Development Agent spot-check (qa, 2026-10-05, on the QA Trip's own items — the Product Owner allowed editing them, and every date was restored afterwards and compared with a snapshot):** ☑ (a) the plan, then the quiet row with its small label — "מחר / 10:00" on one line; ☑ (b) with nothing left today the heading became "הבא בתור" over the row "ו׳ 9.10 / 23:38" — and it picked the **flight** although an ordinary item (Oct 9, 15:00) came first chronologically (`P11-F8`); ☑ (c) with the flight moved beyond 7 days and the ordinary item 4 days out: **no heading at all**, just "אין תכניות להיום.", the done section and the game suggestion; ☑ the 7-day window: a flight 6.7 days out appeared as "ב׳ 12.10 / 14:00", the same flight 7 days and 2 hours out disappeared; ☑ the 48-hour window: an ordinary item 37 hours out appeared as "ד׳ 7.10 / 10:00" (weekday label, one line); ☑ the Jan 2027 flight/hotel never appeared; ☑ the done section sits after "הבא בתור". Not exercised: the "מחוץ לטווח" fallback screen (needs a Trip with nothing today and nothing after at all).
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round.

## Test 7 — Phase 1.1 Test 4: "כרטיסים" (`P11-F4` of Phase 1.1)

On an item with a document confirmed as ticket coverage, tap "כרטיסים" on its Today card.

**Expect:** The item opens scrolled to its tickets area (or to Documents when everyone is already covered), and that page is now usable on the phone (Test 1).

**Development Agent spot-check (qa, 2026-10-05):** ☑ the **real button**: an activity with confirmed-ticket documents was moved to today, its Today card showed ניווט / אתר / **כרטיסים**, and tapping "כרטיסים" opened that item scrolled to "כיסוי כרטיסים" (18px from the top of the screen) with the page exactly 375px wide. The landing page is usable on the phone-sized view: each filename on one line with an ellipsis, the five controls wrapped onto two rows, "הוספת מסמך" / "עריכה" / "מחיקה" below. (The case where everyone is already covered, which scrolls to Documents instead, was checked by mechanism only.)
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round.

## Test 8 — Phase 1.1 Test 8: Quick Access and tasks (`P11-F13`)

Look at Today's Quick Access card and then the Tasks screen (from "משימות").

**Expect:** The header — "גישה מהירה", "משימות", "קניות (N)" — is on **one line**. Each task row is a compact ~56px row: checkbox, the title, and one meta line that starts with the **priority chip** (High: dark text on the soft warm fill; Normal/Low: plain bordered chip) then the date and participant. **Tapping a row opens that task for editing**; there is no delete button on the row. The task's edit screen has "שמירה" pinned at the bottom and a red "מחיקת המשימה" (existing tasks only) that asks for confirmation. The same design appears on the Tasks screen. Equipment rows in Packing keep their delete button.

**Development Agent spot-check (qa, emulated 375px, 2026-10-05):** ☑ header 44px tall (one line); ☑ rows 58–60px with the chip first; ☑ **the Tasks screen shows the same compact rows** (no delete on any row; page exactly the screen width); ☑ the new-task screen has no delete button; ☑ tapping a row opens its edit screen, whose sticky bar holds "שמירה" and "מחיקת המשימה"; ☑ declining the confirmation ("למחוק את המשימה לצמיתות?") keeps the task and the screen open; ☑ accepting deletes it and closes the screen (done with a throwaway task, which is gone). Below 340px the header may wrap. **Not exercised:** a real phone; a Trip with zero open tasks (the Product Owner confirmed that one in Phase 1.1).
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round. (Task delete through the edit screen also confirmed working by the Product Owner during Test 13.)

## Test 9 — Phase 1.1 Test 10: the participant carousel (`P11-F14`, `P11-F15`, `P11-F17`)

On Packing, on the phone, with the QA Trip's 6 options: swipe both ways, tap a neighbor, and (computer) click a neighbor and then press the arrow keys. Also try a fast swipe.

**Expect:** The selected option centered at full size, one neighbor each side, faded; at the first option the previous neighbor is the **last** option (it loops). One swipe/tap/arrow moves exactly one option, even on a fast swipe. The row **follows your finger and slides one position** (about 180ms) when released; a short drag snaps back. Dots show the real position. With 7 or more participants a **"N / total"** counter (such as "1 / 7") replaces the dots, readable left-to-right. On the computer, after a **mouse click** on a neighbor the arrow keys still work (focus stays on the selected option). With exactly 2 options both show side by side with no repeats. With "reduce motion" on, selection is instant.

**Development Agent spot-check (qa):** ☑ 5 options mounted (2 clipped and hidden), 3 visible; ☑ synthetic drag followed the finger (`translateX(90px)`), release set `transform 180ms ease-out`, selection and indicator updated ("2 / 7"), and **focus landed on the new selected item**; ☑ a short drag snapped back with the selection unchanged; ☑ two back-to-back swipes moved exactly one option; ☑ a mouse click on the neighbor, then real ArrowRight keypresses, moved 3 / 7 to 4 / 7; ☑ the 7-option counter reads "1" left of "7" (measured from glyph positions); ☑ the 6-option case shows 6 dots. **Not exercised:** the visible slide on screen (the hidden pane does not advance CSS transitions), a real touch swipe, the 2-option case, real OS reduced motion.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, real phone (2026-10-05): swipes both ways including fast flicks move exactly one option with a visible slide; tapping a neighbor selects and centers it; with 7 options ("Test6" reactivated) the counter reads "1 / 7" left to right and updates; with 2 options both show side by side with no repeats. **Decision confirmed:** the counter starts at 7 options. **Not run:** OS reduce-motion.

## Test 10 — `P11-F16`: the computer layout, and rotating/resizing

On the computer, open Packing in a wide window, then narrow the window below about 770px (or rotate a tablet/phone to landscape).

**Expect:** In a wide window where everyone fits, **all participants are side by side on one line**, the selected one highlighted and the others faded, clicking selects, no dots and no counter. Narrowing the window below 768px, or to a width where they no longer fit, turns it into the carousel **without reloading**; widening it turns it back. (The landscape phone case: if the phone is ≥768px wide and everyone fits, it becomes the row; otherwise it stays a carousel.) Please tell the Development Agent the breakpoint reads right: 768px plus a measured fit.

**Development Agent spot-check (qa):** ☑ at 1280px: 7 participants in a row, all inside the container, others faded, no indicator; ☑ the resize listener, triggered by dispatching the event, switched row → carousel (5 mounted). **Not exercised:** a native window resize or rotation — the emulated pane does not fire the browser's own `resize` event (0 fired), so this one is genuinely open for a real window.
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, computer (2026-10-05): wide window → all 7 participants side by side; narrowing below ~770px switched to the carousel without reload (native resize); widening switched back. **Decision approved:** 768px plus the measured-fit rule.

## Test 11 — Phase 1.1 Test 11: Packing header (`P11-F17` of Phase 1.1)

**Expect:** "רשימות אריזה", the line mentioning "נארזו", and the folded "נארזו (N)" — no English; no chips anywhere (they were removed with this round).

**Development Agent spot-check (qa):** ☑ Hebrew header; chips gone from the code and CSS.
**Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-05: not re-run by the Product Owner; the Development Agent's live spot-check above is accepted as sign-off for this round.

## Test 12 — `P11-F4`: the Beta label

**Expect:** The browser tab reads "Family Trips · Beta 0.8.0-phase1.2"; the sign-in screen's kicker reads "Beta 0.8.0-phase1.2" (not a bare "Beta" or "Alpha"); the header subtitle on the first-run landing banner uses the same.

**Development Agent spot-check (qa):** ☑ the tab title is "Family Trips · Beta 0.8.0-phase1.2". **Not exercised:** the sign-in screen (the pane was signed in).
**Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner (2026-10-05): tab title "Family Trips · Beta 0.8.0-phase1.2"; sign-in kicker "Beta 0.8.0-phase1.2" in the correct order. The installed app's window title still prefixes "Family Trips Alpha 0.6.5" (stale manifest) — **known and out of scope, not a finding** (PO decision). The sign-in screen's terracotta-filled "התחברות עם Google" button is added to the `G1` restyle list.

## Test 13 — General regression

Create and edit an item, run a Smart Import, confirm phone↔computer sync, open Settings from the gear.

**Expect:** Unchanged.

**Development Agent spot-check (qa):** ☑ created four item types through the add form, edited notes and times, opened detail and edit, deleted items, opened Settings through the gear, deactivated a participant; every main screen kept rendering. **Not exercised:** a real Smart Import and cross-device sync.
**Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner (2026-10-05): a real Smart Import ran end to end and was approved; an item edited on the phone showed on the computer after reload. Findings `P12-F2`–`P12-F5`.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| `P12-F1` — The About line shows the build string bidi-scrambled: "בנייה phase1.2-ab9e513c-0.8.0" instead of "0.8.0-phase1.2-ab9e513c". | Setup (build check) | Low | Wrap the build string and the "Beta 0.8.0-phase1.2" label in `<bdi>` (spec §3). |
| `P12-F2` — A deactivated participant ("Test6", "לא פעיל") is still offered and selectable in "שיוך מסמך למשתתפים" (and likely ticket coverage / event owners). | Test 13 | Non-blocking | Inactive participants are not offered for new assignments; existing assignments stay, shown greyed "(לא פעיל)" and can be unticked; "משתתפים ללא כרטיס" and ticket coverage ignore inactive participants. |
| `P12-F3` — Participants cannot be deleted, only deactivated. | Test 13 | Backlog (PO to schedule with the planning agent) | Delete always allowed, even when linked: first confirmation lists what will change (documents, tickets, packing items, tasks); second "cannot be undone" confirmation; then removed from every assignment with a notification summarising what was removed. |
| `P12-F4` — Shopping-list items cannot be deleted (pre-existing; tasks confirmed deletable through their edit screen). | Test 13 | Backlog (PO to schedule with the planning agent) | Same pattern as tasks: tap the item → edit screen → red "מחיקת הפריט" with confirmation. |
| `P12-F5` — The tickets/documents section on every item type needs a redesign. | Test 13 | Planning note | Partly planned (item-detail redesign under `G1`/Phase 2). When `G1` is revised, name the tickets/documents section explicitly for every item type — ticket coverage, linked documents, "used" tracking — not only the page layout. |

## GO/NO-GO decision

**GO** — Product Owner, 2026-10-05, on build `0.8.0-phase1.2-ab9e513c`. Beta 0.8 Phase 1 (including corrections 1.1 and 1.2) is accepted on `qa`. `P12-F1` (Low) and `P12-F2` (Non-blocking) ride along into Phase 2; `P12-F3` and `P12-F4` go to the backlog for the Product Owner to schedule with the planning agent; `P12-F5` goes into the `G1` scope revision, which must be done before Phase 2's kickoff. No Production promotion — still gated on Phase 3's GO (`V147`). Scope of this session: the six real-phone items only; Tests 1, 4, 5, 6, 7, 8, 11 accepted on Development Agent verification (PO decision). Results: all run items PASS; OS reduce-motion not run (Tests 3, 9); genuine 3-hour wait not run. Findings: one Low (`P12-F1`), one Non-blocking (`P12-F2`), two backlog (`P12-F3`, `P12-F4`), one planning note (`P12-F5`). No Blocking or Medium findings.

**Development Agent decisions — Product Owner disposition (2026-10-05):** 768px + measured-fit breakpoint — approved; "N / total" counter from 7 options — approved; quiet "אין תכניות להיום." when nothing is left and nothing is coming — keep; Test6 deactivated rather than deleted — noted (deletion itself is `P12-F3`); task delete in the edit screen — confirmed working; done-section contents, Alpha→Beta test-file scope, swipe threshold and the <340px header wrap — not raised, stand as implemented.

## Production promotion

**Not applicable to this phase.** Per `V147`, Phase 1 and its corrections accumulate on `qa` only; Production promotion happens once, after Phase 3's own GO.
