# Family Trips Beta 0.8 Phase 2 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase2` — build `0.8.0-phase2-7f5e33fa` on `https://qa--familytripz.netlify.app` (qa only; **not** promoted to Production — only Phase 3's own GO triggers the single combined promotion, decision `V147`). Commits on `version/V7`: `4af4373` (Phase 2), `8bab6ca` (stale-processing guard), `5c93d00` (lost-update fix), `7f5e33f` (form-label polish).
**Scope:** `docs/roadmap/FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md` (`V6`), Phase 2: the Smart Import status pill (spec V7 §7), the eight refinement items, closing `G1` (item detail, add/edit forms, sign-in, Trip Center, Packing chrome), `P12-F1`, `P12-F2`.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran everything it could on the live `qa` build (marked "Development Agent verification" under each test); that is supporting evidence, not sign-off.
**Which tests are yours:** the ones marked **MANDATORY (PO)** need a real phone, a real finger, or an action the Development Agent deliberately did not take. The rest are accepted on Development Agent verification unless you want them re-run.

## What changed that you should know about before testing

- **Two real bugs found while testing Phase 2, both fixed and both pre-existing (not caused by Phase 2):**
  1. **Lost analysis outcome.** `runSmartAnalysis` kept the source object it was given, but its own save echoes back through the Trip listener, which replaces the in-memory sources while the analysis is still awaiting. The outcome (`proposal_ready` / `failed` / the participant auto-link) was written to a detached copy and lost, leaving the source at "processing" forever. This is why the QA Trip already had **four sources stuck at "processing"** from earlier rounds. The outcome is now written to the live source.
  2. **A stuck "processing" can never be trusted.** A source is now only treated as processing for 5 minutes after it started; older, or one with no start stamp (everything written before Phase 2), is shown as **Failed** with "נסה שוב" / "מחק". Without this the new pill would have spun forever and locked the review screen's confirm buttons.
- **Decisions the Development Agent made** (change any you read differently):
  1. **"Queued" (`ממתין בתור`)** is shown for a source that was saved **without analysis** (it is waiting to be analyzed). The app has no real queue; this is the closest honest meaning.
  2. **A clean draft shows no pill.** The spec defines seven outcomes and "ready" is not one; the row says "ממתין לאישור" in plain muted text. **Partial** = no review blockers but a low-confidence draft, leftover plain warnings, or a missing start date. **Needs review** = a flagged field, a merge conflict, or an ambiguous flight direction nobody has picked.
  3. **Failed "מחק" is a hard delete** of the source (with a confirmation), including its stored original — distinct from the item's softer "הסרה". A source that is *not* failed has no delete action (so test sources of other kinds cannot be removed from the UI; see "State of the QA Trip").
  4. **`V6-F16`** (single add-document picker) was **already true** since `V6-F38`; Phase 2 only pins it with a test. Nothing was built for it.
  5. **Flight label** shows the departure code ("BKK") on the item page; navigation still resolves through the same map search as before.
  6. **Ticket section** (`P12-F5`): one card — coverage (a row per participant), confirmation (confirm / "נוצל" / **ביטול אישור**), the per-ticket-holder detail from the document, then the linked documents. Per-document ticket controls moved out of the document row, so a document with a participant can appear in both the confirmation list and the documents list. This differs from the round-3 "one place only" instruction; say if you want it reverted.
  7. **Primary buttons are now `--ink`** everywhere (spec §2: "primary text / action"), not terracotta; chips are neutral, with the soft teal only for "informational/active". The app header lost its green gradient for the surface colour.
  8. **Merge conflicts:** each conflicting field now has two buttons, "שימוש בערך החדש" (applies it and clears the warning) and "השארת הערך השמור". Same resolver and the same stored-value contract as before.
  9. **`V6-F80`:** "לא נכון — לתקן" opens the item's edit form (or, on the review screen, focuses the flagged field); editing the value is what clears the flag, as before.
  10. **Hotel notes (`V6-F14`)** keep at most **5** detail lines plus one pointer line ("ועוד N פרטים — מופיעים ב…"); the full extraction stays in the evidence panel.
  11. **`P12-F2`:** a picker lists active participants, plus any already assigned. A document is never auto-linked to an inactive participant.
  12. **`CR-005`:** "<email> הוסר מהטיול" toast on a successful Editor removal. **Not exercised by the Development Agent** — the only Editor on the QA Trip is `familytriptzs@gmail.com`, and removing it would cut that account's access (see Test 12).

**State of the QA Trip when this session starts:** the temporary `QA12` items were deleted and "Test6" is still inactive (6 options). Leftovers the UI cannot remove: **3 sources** named `QA12-AE-002.pdf`, `QA12-attach.png`, `QA12-merge.pdf` (visible under Trip Center → מסמך → מקורות), and **2 more entries** (`Experience Park- Red band` update, `QA12 merge test`) in the collapsed rejected-proposals archive. The 4 sources that were stuck at "processing" now show as **Failed** (retry/delete); they were left alone.

## Test 1 — The seven status states (`Smart Import status pill`)

Open Trip Center → מסמך. Look for each state across the lists: **ממתין בתור** (a source saved without analysis), **מנתח…**, **חלקי**, **דורש בדיקה**, **נכשל** (with "נסה שוב" and "מחק"), **צורף** (only for a few seconds right after an attach-only upload on an item page), **נדחה** (only inside the collapsed "ארכיון הצעות שנדחו").

**Expect:** the same pill everywhere. **Only "דורש בדיקה" has the soft terracotta fill.** "חלקי" is a plain bordered chip with the muted line "חלק מהפרטים זוהו במקור". "נכשל" is the only red. "צורף" is a bare ink checkmark that disappears by itself. "נדחה" never appears in the main list.

**Development Agent verification (qa, 390px):** ☑ queued (save-only upload), processing → failed (a blank image: "נסה שוב"/"מחק" shown), needs review → partial (edited the flagged field on a real analyzed PDF), rejected (appears only after expanding the archive, not in the primary list), attached (appeared, gone ~3.5 s later). All seven also rendered side by side in the dev pane. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner.

## Test 2 — **MANDATORY (PO)**: the Processing pill, on a real phone

Add → מסמך → pick a PDF/photo → "ניתוח והצעת פריט" → "המשך", and watch the screen until it opens the review.

**Expect:** a small **palm tree gently swaying** (trunk still, crown rocking about 6° each way, two small terracotta coconuts, nothing else colourful) beside "מנתח…", three terracotta dots taking turns pulsing, one line under it fading between "קורא את המסמך" → "מזהה פרטים" → "מכין טיוטה" about every 2 seconds, and a thin terracotta bar sweeping underneath. **"המשך" is visibly greyed out and does nothing while it runs.** With "reduce motion" switched on in the phone's accessibility settings, nothing moves (the first phrase just stays).

**Development Agent verification (qa):** ☑ the busy modal showed the Processing pill and a **disabled "המשך"** (measured: `disabled`, pill `processing`); analysis of a real PDF took ~18 s and landed on the review screen. The animation timings are asserted from the CSS in `tests/beta-0-8-phase-2.mjs`; the *feel* on a phone, and the reduced-motion behavior, are not something an emulated pane can judge. **Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner, real phone (2026-10-06): palm sways with two coconuts, dots pulse, the status line fades between phrases, the bar sweeps — smooth; "המשך" greyed throughout. **Not run:** OS reduce-motion. Findings `P2-F1`, `P2-F2`.

## Test 3 — **MANDATORY (PO)**: the interaction rule (`V6-F11`)

While a document is being analyzed, try to reach the review screen's confirm buttons (an update proposal for an item whose document is being re-analyzed, or tap "המשך" repeatedly in the Add dialog).

**Expect:** the confirming button is greyed and not tappable; pressing Enter in the form does nothing; you never get a "no document selected" message. When the analysis ends the buttons enable.

**Development Agent verification:** ☑ source-level and behavioral: the busy dialog's "המשך" is `disabled`; the review screen's approve/save buttons carry `disabled` while a source is processing or has an unknown state; a submit that slips through returns silently (tests, plus a mutation check that the tests fail when the guard is removed). The tapping-while-busy sequence itself needs a human thumb. **Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, real phone (2026-10-06): repeated taps on the greyed "המשך" during analysis did nothing; no double submit, no "לא נבחר מסמך"; the review opened once. Finding `P2-F3` raised during this test.

## Test 4 — Needs-review and merge-conflict actions (`V6-F80`, one-click accept-new-value)

On a review screen with a flagged field, tap **"לא נכון — לתקן"**; then edit and save. On a proposal that conflicts with an existing item's values (attach-and-extract a document to an item whose values differ), use the two buttons under each conflicting field.

**Expect:** "לא נכון — לתקן" takes you to the flagged field (focused). "אישור כנכון" still works. Each conflict shows the saved value and the new value side by side; **"שימוש בערך החדש"** puts the new value in the form and removes that conflict in one tap; **"השארת הערך השמור"** keeps the old one and removes it. Nothing is overwritten without one of the two taps.

**Development Agent verification (qa, real analysis of a PDF):** ☑ "לא נכון" focused the `provider` field; editing it changed the pill from needs-review to partial. ☑ On a test item with a conflicting provider/booking number/title, four conflicts appeared; "שימוש בערך החדש" for the provider set it in the form; "השארת הערך השמור" for the title kept the old one; the two buttons removed their conflicts and the other two remained. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner.

## Test 5 — The ticket section on an item page (`P12-F5`, `V7-F15`, `V7-F16`)

Open an activity with ticket documents (e.g. the football match), on the phone.

**Expect:** one card "כרטיסים ומסמכים". **כיסוי כרטיסים:** "N מתוך M משתתפים עם כרטיס" and a row per participant ("יש כרטיס" / "ללא כרטיס"). **אישור כרטיסים:** each confirmed document with its participant(s), a "נוצל" checkbox and **"ביטול אישור"**; a document linked to a participant but not yet confirmed shows "אישור ככיסוי כרטיס". Then the per-holder detail from the document, then **מסמכים מקושרים** (name, status, שיוך / פתיחה / הסרה). Tapping "ביטול אישור" removes that coverage at once and the count drops; confirming again restores it. No horizontal scrolling.

**Development Agent verification (qa, 390px/320px):** ☑ undo took 2 of 5 to 1 of 5 and back to 2 of 5 after re-confirming; "נוצל" toggles and persists; **all 13 item pages measured exactly the screen width** (no horizontal scroll) at 390px. A deactivated participant who holds a ticket stays in the coverage list as "(לא פעיל)". **MANDATORY (PO) part:** just look at it on your phone and say whether the four parts read as separate, clear pieces. **Result:** ☐

**Product Owner result (V1 session):** **Partial** — Product Owner, phone (2026-10-06): the ticket actions work (Development Agent verified), but the mandatory readability check failed — three separate parts ("אישור כרטיסים", "פרטי כרטיסים מהמסמך", "מסמכים מקושרים") with the same document listed twice. Finding `P2-F4` (reverses Phase 2 decision #1 at the PO's request).

## Test 6 — Item detail page redesign (`G1`)

Open a hotel, a flight, an activity and a transport item.

**Expect:** the type chip and title, a quiet fact list (ספק / מספר הזמנה / מיקום / מועד / סיום / משויך ל), bordered contact actions with line icons (ניווט / אתר / התקשרות / אימייל), notes under their own heading, then the ticket/documents section, then עריכה / מחיקה at the bottom. The flight's location reads **"TLV"** (departure code), not "TLV → HKT".

**Development Agent verification (qa):** ☑ all four types render and fit 320px and 390px with zero overflow; the page actions sit below the content (not hidden behind the bottom nav). **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner.

## Test 7 — **MANDATORY (PO)**: add / edit forms on the phone (`G1`)

Edit an item of each type, add a task, add a participant, add a packing item, add a shopping item. Do this with the on-screen keyboard open.

**Expect:** grouped sections (פרטים כלליים / הזמנה / מיקום וקשר / מועדים / שיוך / הערות), one column, labels attached to their fields (tapping a label focuses it), nothing cut off, **"שמירה" always reachable** at the bottom. Dates open the phone's native picker.

**Development Agent verification (qa):** ☑ every one of those forms measured with **zero overflow at 320px** (no control past the edge); changing the type in the add form regenerates the right fields; the required-field star stays on the label's line. Keyboard behavior and native pickers are phone-only. **Result:** ☐

**Product Owner result (V1 session):** **PASS with findings** — Product Owner, real phone (2026-10-06): item edit form with the keyboard open (grouped sections, labels focus their fields, "שמירה" reachable); native date picker works; add forms for task, participant, packing item and shopping item fit with the keyboard open. Findings `P2-F5` (Medium), `P2-F6`, `P2-F7`, `P2-F8`.

## Test 8 — Sign-in screen (`G1`)

Sign out and look at the sign-in screen.

**Expect:** the warm background (no green gradient), a bordered white card, **"התחברות עם Google" filled in the dark ink colour, not terracotta**, the version label "Beta 0.8.0-phase2" reading left-to-right without scrambling.

**Development Agent verification (dev + qa):** ☑ viewed in the pane on the qa build before signing in (button ink-filled, background plain). **MANDATORY (PO):** a quick look on your phone, since signing out is yours to do. **Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner, phone (2026-10-06): warm plain background, bordered white card, ink-filled "התחברות עם Google", "Beta 0.8.0-phase2" in the correct order.

## Test 9 — Trip Center and Packing chrome (`G1`)

**Expect:** Trip Center tiles show line icons (not emoji), two per row on a phone, title 20px, count underneath; category lists have a chevron pointing left. Packing: each category is a bordered card with a progress bar and "packed/total"; each item is a compact bordered row; the edit / delete buttons share the row with the name when there is room and drop under it on a very narrow phone.

**Development Agent verification (qa, 390px/320px):** ☑ tiles, lists and the three Packing categories render without overflow; rows measured 54–70px. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner. (On a real phone during Test 7 the Packing rows overlapped — see `P2-F5`.)

## Test 10 — `P12-F2`: inactive participants in pickers

Deactivate a participant who is assigned to a document, then open "שיוך למשתתף" for that document and any "שיוך למשתתפים" picker.

**Expect:** the inactive participant is **not offered** for anything new; where already assigned, they stay, greyed "(לא פעיל)", ticked and removable. "Test6" (inactive) appears in no picker.

**Development Agent verification (qa):** ☑ deactivated a participant already assigned to a test document: the picker showed "עפרי (לא פעיל) ✓" (ticked), the coverage list showed "עפרי (לא פעיל) — יש כרטיס", and "Test6" appeared nowhere; the participant was then re-activated. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner.

## Test 11 — `P12-F1`: the About line

Settings → אודות.

**Expect:** "Beta 0.8.0-phase2 · בנייה 0.8.0-phase2-7f5e33fa" reads in that order, with no scrambled digits.

**Development Agent verification (qa):** ☑ both strings are inside `<bdi>`; the text read in the expected order. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner. Also seen live by the Product Owner at the build check: "Beta 0.8.0-phase2 · בנייה 0.8.0-phase2-7f5e33fa" in the correct order (`P12-F1` fixed).

## Test 12 — **MANDATORY (PO)**: `CR-005`, removing an Editor

Settings → שיתוף הטיול → remove an Editor you are willing to re-invite.

**Expect:** after the removal, a toast "<email> הוסר מהטיול", and the Editor is gone from the list.

**Development Agent verification:** ☑ code and test only (the toast is on the success path after `removeEditorByEmail`). Not exercised live: the only Editor on the QA Trip is the shared test account `familytriptzs@gmail.com`, and removing it would cut that account's access. **Result:** ☐

**Product Owner result (V1 session):** **PASS** — Product Owner (2026-10-06): removed `familytriptzs@gmail.com` — toast "familytriptzs@gmail.com הוסר מהטיול" and gone from the list; re-invited as Editor afterwards and back in the list.

## Test 13 — Add document, Hotel notes, Flight label (`V6-F16`, `V6-F14`)

On a hotel or activity page, "הוספת מסמך". Analyze a hotel confirmation and open the review.

**Expect:** a single file picker (image or PDF), no separate Photo/PDF choice. The Hotel review's notes hold only a handful of lines (at most 5, plus a "ועוד N פרטים…" pointer), with the complete extraction still in "כל המידע והראיות שנקלטו".

**Development Agent verification (qa):** ☑ the picker is one input accepting PDF/PNG/JPEG/WebP/TIFF. The Hotel notes scoping is a pure function with tests (limit, pointer line, duplicate collapse); **no hotel document was analyzed live** (only an attraction PDF was, to avoid spending on a fixture the Development Agent does not have for hotels) — **MANDATORY (PO)** if you want to see it on a real hotel confirmation. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner. The single file picker is verified; the Hotel notes 5-line cap was accepted on the pure-function tests (no real hotel confirmation analyzed live).

## Test 14 — Regression

Today, Timeline, Tasks, Shopping, Games, Settings, the participant carousel (arrow keys, swipe), "סמן כהסתיים".

**Expect:** unchanged behavior. Button and chip colours are now ink/neutral instead of terracotta; Timeline, Games, Settings and Shopping are otherwise visually as before — they are Phase 3.

**Development Agent verification:** ☑ the full automated suite (45 test files, run by `npm run check`) passes; 11 older suites had source-pinning assertions updated in place with explanatory comments; the Phase 1/1.1/1.2 suites pass unchanged. **Result:** ☐

**Product Owner result (V1 session):** **Accepted on Development Agent verification (PO decision)** — Product Owner, 2026-10-06: not re-run by the Product Owner.

## Finding register

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| `P2-F1` — The Processing palm is too small; it should be a large palm floating in the middle of the screen while analyzing. | Test 2 | Non-blocking | Next correction round. Large palm (~96–120px) centered on the analysis screen with gentle sway and a slight bob; rotating status line and hairline below; "המשך" stays disabled; the small pill version stays in lists; ink + the two terracotta coconuts only; respects reduced motion. **Spec change:** §1 and §7 (the palm's "icon scale only" limit is lifted by the PO). |
| `P2-F2` — Refreshing/loading the app shows an hourglass; the palm should be the app's only "in process" display. | Test 2 | Non-blocking | Next correction round. Large floating palm for full-screen waits (app start/refresh, sign-in, Smart Import analysis), small palm for inline waits (saving, syncing, list pills); hourglass and any other spinner removed. **Skeleton placeholders stay** for content that is loading (PO agreed). **Spec change:** §1 and §7 — the palm becomes the single in-progress symbol. |
| `P2-F3` — During item creation a ticket document cannot be linked to a participant (only the item can), so linking is done twice. | Test 3 | Non-blocking | Next correction round. The review/creation screen offers "שיוך למשתתפים" (and confirm-as-ticket) on the attached document; linking a ticket document to a participant automatically adds them to the item's participants (add only, never remove); linking only the item does not create ticket coverage; same automatic link on the item page; inactive participants never offered. |
| `P2-F4` — The item page has three ticket/document parts and lists the same document twice. | Test 5 | Non-blocking | Next correction round, with `P2-F3`. **Reverses Phase 2 decision #1 (dual listing) at the PO's request.** One card "כרטיסים ומסמכים": coverage summary on top ("כרטיסים: N מתוך M" + who has no ticket); **two or more tickets → a carousel, one ticket per slide** (holder name, seat/gate detail, status chip, "נוצל" or "אישור ככרטיס", file name, פתיחה, ⋯ for ביטול אישור / שיוך / הסרה; one swipe = one ticket, loops, "1 / N" counter, neighbor peeks); one ticket → a single card; other documents in a short list below, each document once; "הוספת מסמך" at the bottom. **Page order:** type/title/facts and contact actions (ניווט / אתר / התקשרות) on top as usual → the tickets & documents card → notes → עריכה / מחיקה. Mockup: Design artifact "Item Page — Tickets Carousel" (approved). |
| `P2-F5` — Packing rows on the phone: the edit/delete buttons overlap the item names and the participant chip; a chip with five names wraps one word per line. | Test 7 | **Medium** | Next correction round. Packing **and Shopping** rows adopt the Tasks pattern (`P11-F13`): compact row (checkbox, name, participant chip), tap the row to edit, delete inside the edit screen with confirmation — reverses the Phase 1.2 "equipment keeps its delete" exception. Participant chip on one line: two names shown; more than two → first name + count ("אייל +4"); everyone → "כולם" (also on task and shopping rows). **Closes backlog `P12-F4`** (shopping delete), pulled forward into this round by the PO. |
| `P2-F6` — The "+" add dialog's options use coloured emoji (✍️ 📎 🔗 ⬆️ ▦ ✅) and the selected option uses the old green fill. | Test 7 | Non-blocking | Next correction round. Tabler outline icons in `--ink`; selected option in the spec's selection style (`--teal-soft` background, ink border); same for any other emoji left on the screens Phase 2 touched. |
| `P2-F7` — Request: a photo for each participant, shown in the carousel and wherever participants appear. | Test 7 | Backlog (PO to plan) | Optional photo on the participant form (gallery or camera, cropped to a circle, stored small); shown in the participant carousel, participant chips, ticket coverage/carousel and pickers; falls back to the initial-letter circle; replace/remove from the edit form. |
| `P2-F8` — The Shopping screen still looks old (🛒/📍 emoji, heavy place cards, row layout). | Test 7 | Planning note | Already Phase 3 restyle scope; the Phase 3 scope must name the Shopping screen explicitly (line icons instead of emoji, quieter place cards, compact rows from `P2-F5`). |

## GO/NO-GO decision

**NO-GO** — Product Owner, 2026-10-06, on build `0.8.0-phase2-7f5e33fa`. Route `P2-F1`–`P2-F6` (one Medium, five Non-blocking; `P2-F5` also closes `P12-F4`) into a Phase 2.1 correction round, then re-test on a real phone: Test 2 (large palm, palm as the only in-progress display), Test 3 (ticket linking during creation), Test 5 (one section + ticket carousel, page order), Test 7 (Packing/Shopping rows, chip rule, add-dialog icons). `P2-F7` → backlog; `P2-F8` → Phase 3 scope. Session detail: Tests 1, 4, 6, 9, 10, 11, 13, 14 accepted on Development Agent verification (PO decision); mandatory tests 2, 3, 7, 8, 12 PASS (2 and 7 with findings), Test 5 Partial. OS reduce-motion not run. No Blocking findings; one Medium (`P2-F5`); five Non-blocking (`P2-F1`–`P2-F4`, `P2-F6`); one backlog (`P2-F7`); one planning note (`P2-F8`). `P12-F4` pulled forward and closed by `P2-F5`.

## Production promotion

**Not applicable to this phase.** Per `V147`, Production promotion happens once, after Phase 3's own GO.
