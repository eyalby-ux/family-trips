# Family Trips Beta 0.8 Phase 2.2 (Phase 2.1 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase2.2` on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production; only Phase 3's own GO triggers the single combined promotion, decision `V147`). Correction package for the Phase 2.1 NO-GO (`docs/versions/V7/0.8.0-phase2.1/EXECUTABLE_TEST_SESSION_V1.md`), scoped in `docs/roadmap/FAMILY_TRIPS_BETA_0_8_PHASE_2_2_CORRECTION_SCOPE_V1.md` (`V2`). Covers `P21-F1`–`P21-F6` and `P21-F8`–`P21-F14` (all Non-blocking). `P21-F7` (Shopping header alignment) is Phase 3.
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test of the five areas the findings touch: the item page, Packing (and task rows), Shopping, the "+" dialog, and the Smart Import analysis screen. Design reference: `docs/design/mockups/P21_findings_proposals.html` (boards for `P21-F1`–`F10`) and `P2-F4_item_page_tickets_carousel.html`. Settings → אודות shows the exact `0.8.0-phase2.2-<hash>`.

## What changed that you should know about before testing

- **Found while testing, fixed:** (1) a long Packing item name squeezed the participant chip down to a few letters — the chip now keeps its width and the **name** truncates; (2) the full-screen analysis dialog's title and close button sat under the sticky account bar — it now clears the bar.
- **Decisions the Development Agent made** (change any you read differently):
  1. **Removing the "פרטי הכרטיס" card removes more than the holder list.** For an activity that card also showed price, duration, age limit, what is included/not included, meeting point and ticket quantity. As scoped (`P21-F4`: "remove the card entirely") those rows are no longer on the saved item page; they are still on the review screen and still stored on the item. A flight keeps its own "פרטי הטיסה" card (flight number, airports, gates…) but without the passenger list. Say if you want any of the activity rows back (the meeting point is the likely one).
  2. **Participant view chip (`P21-F5`):** in a participant's own view the chip uses **first names** ("פאולה +3", "פאולה, דניאל"), as the scope's examples show; the shared view keeps the original rule (two names in full, "אייל +4", "כולם").
  3. **A ticket slide's holder** (one line): one person → the full name; two → first names ("פאולה, דניאל"); three or more → "אייל +2".
  4. **E-mail** gets the same inline treatment as the phone: an "אימייל" link on its own row, not a button.
  5. **Coverage summary** reads "כרטיסים: 2/5" (the scope's suggested short label) with the 56px bar; "ללא כרטיס: …" stays a second, muted line and may wrap.
  6. **"+" dialog form:** the two radios became **one checkbox** "ניתוח והצעת פריט"; unticked = save the source without AI. The long "Smart Import" disclosure box is now a one-line note. The dialog title is "הוספה".
  7. **Analysis screen** includes the ✕ (the analysis keeps running if you close it) and a greyed "המשך" at the bottom. The same screen is used by the per-item "הוספת מסמך" dialog.
  8. **Shopping owner** is stored as the owner's **name**, exactly as the free-text field stored it, so existing items are untouched; an old/inactive owner stays selectable in the list while editing that item.
  9. QR / JSON are removed from the dialog only; their code paths still exist but are unreachable.

**State of the QA Trip when this session starts:** all `QA12` items, packing items and shopping items created by the Development Agent were deleted; real items were not changed. Leftover that the UI cannot remove: `QA12-*` document sources (Trip Center → מסמך → מקורות; delete-from-UI is `P12-F7`, Phase 3) and a few entries in the rejected-proposals archive.

## Test A — the item page (`P21-F1`–`P21-F4`, `P21-F11`)

Open a hotel, a flight, a transport item and an activity with two tickets, on the phone.

**Expect:** **(F1)** a small back arrow (no border) and the type chip on **one row**, the title directly below — no big "חזרה" button. **(F2)** the location name is itself the map link (pin icon, underlined) on **every** type; no "ניווט" button. **(F3)** an "אתר" link with a globe at the **end of the provider row** (its own row when there is no provider); "התקשרות" on its own row for a phone number. **(F4)** no "פרטי הכרטיס" card (a flight keeps its flight-details card); the page goes facts → "כרטיסים ומסמכים" → notes → עריכה/מחיקה. **(F11)** in the carousel: tapping "⋯" opens a menu that is **never clipped** (it floats above the card); only a **small sliver (~20px)** of the next ticket shows; the "אישור ככרטיס" / "נוצל" / "פתיחה" / "⋯" row sits **inside** the slide with no wrapped button; the holder name and the "כרטיסים: 2/5" line are **one line each**.

**Development Agent verification (qa, 390px, DOM-measured):** ☑ F1: back-row 44px, 12px to the title; F2/F3: all 17 items across hotel/flight/car/activity render the links and none has a separate button (Tate Modern, which has no location, shows only "אתר"); F4: no "פרטי הכרטיס" on any activity; a flight shows "פרטי הטיסה" only. F11: peek = 20px, action row 85–325px inside the slide 70–340px, holder and summary 24px (one line); the "⋯" menu opened inside the viewport on top of the page, closed on an outside tap and on choosing an item; an unconfirmed slide's "אישור ככרטיס" is 44px high (one line). **Not exercised:** a real finger on the carousel and the popover under a real thumb. **Result:** **PASS with findings** — Product Owner, real phone, 2026-10-08 (findings `P22-F2`–`P22-F7`; see the Product Owner session section).

## Test B — Packing and task rows (`P21-F5`, `P21-F6`, `P21-F12`, `P21-F13`)

Open Packing; select a participant (Paula) and look at a shared item; look at an empty category; look at a Tasks row with a participant.

**Expect:** **(F12)** one header row — "רשימות אריזה" on one line and a small outline "+ קטגוריה" — no explanation text; a compact carousel; **the first category sits in the top half of the screen**. **(F13)** a category with nothing in it says a muted "אין פריטים בקטגוריה", with **no progress bar and no "0/0"**, and "+ הוספת פריט" (dashed); "הכול נארז." only when a category has items and all are packed. **(F5)** in Paula's view an item shared by several people reads **"פאולה +3"** (or "פאולה, דניאל" for exactly two); the shared view keeps "אייל +3". **(F6)** the chip is on the **same line as the item name**, at the end; a long name is cut with an ellipsis and the chip stays whole; same on a task row (title + chip on one line, priority/date below).

**Development Agent verification (qa, 390px):** ☑ header 44px on one row, no explanation, first category at y=326 of 800; "בגדים" (empty for the shared view) showed "אין פריטים בקטגוריה" with no badge/bar; a four-person item showed "אייל +3" in Eyal's view and **"פאולה +3"** in Paula's, a three-person item "פאולה +2"; the chip and the name share a line (rows 56px) and a 70-character name was ellipsised; the Tasks row put "אייל בן יצחק" on the title line. (The chip-squeeze bug above was found and fixed here.) **Result:** **PASS with findings** — Product Owner, real phone, 2026-10-08 (findings `P22-F1`, `P22-F8`).

## Test C — Shopping (`P21-F14`; `P21-F7` is Phase 3)

Add or edit a Shopping item.

**Expect:** "בעלים" is a **dropdown**: "משותף" and the **active** participants only (no inactive one). The chosen name shows on the row and is selected again when you reopen the item. (The "מקום חדש"/"פריט חדש" header alignment is Phase 3.)

**Development Agent verification (qa):** ☑ options: משותף, אייל בן יצחק, פאולה כהן, דניאל, עמית, עפרי (the inactive "Test6" absent); no free-text field left; saved "פאולה כהן", the row showed it, reopening kept it; deleted from inside the edit screen. **Result:** **PASS with findings** — Product Owner, real phone, 2026-10-08 (`P22-F9` → Phase 3).

## Test D — the "+" dialog (`P21-F8`, `P21-F9`)

Tap "+" on the phone.

**Expect:** **four tiles in one row** — ידני / מסמך / קישור / משימה — icon over label, ~72px tall; **no QR, no JSON**; the selected tile has the soft teal fill and an ink border; the file field, the "ניתוח והצעת פריט" checkbox and "המשך" are all visible **without scrolling**.

**Development Agent verification (qa, 390px):** ☑ four tiles, each 82×72px on one row, all with icons; "QR" and "JSON" appear nowhere on the screen; the dialog spans y=371–800 with "המשך" ending at y=780 and no inner scrolling. **Not exercised:** the on-screen keyboard and a real file picker (yours). **Result:** **PASS with findings** — Product Owner, real phone, 2026-10-08 (`P22-F10`).

## Test E — the analysis screen (`P21-F10`)

Add → מסמך → pick a document → "המשך".

**Expect:** the dialog's options **disappear** and the screen shows a large palm **centred**, "מנתח…", the rotating status line, the thin bar, "הניתוח יכול לקחת מספר שניות. אין צורך לסגור את המסך.", and a **greyed "המשך" at the bottom**; the title and ✕ at the top are visible (not under the dark bar). When the analysis ends you land on the review screen as before.

**Development Agent verification (qa, real PDF analysis):** ☑ the palm measured 112px and centred (x=195 of 390), label, note and a disabled "המשך" present, the tiles gone; the analysis finished and opened the review screen. The top-bar overlap found on the first look (title and ✕ hidden under the dark bar) was fixed, and re-checked on the final build `0.8.0-phase2.2-a13825f7`: the title row starts at y=72, below the bar's y=58. **Result:** **PASS** — Product Owner, real phone, 2026-10-08 (OS reduce-motion not run).

## Finding verification notes (one per finding)

| Finding | Development Agent verification |
|---|---|
| `P21-F1` back row | ☑ Test A (44px row, 12px to title). |
| `P21-F2` map link | ☑ Test A, all types. |
| `P21-F3` website / phone | ☑ Test A: "אתר" at the end of the provider row on hotel/transport/activity; phone row on hotels/transport. |
| `P21-F4` no ticket-details card | ☑ Test A; **decision 1 above** (more than the holder list leaves the page). |
| `P21-F5` viewer-first chip | ☑ Test B ("פאולה +3"); unit-tested for every count and for "כולם". |
| `P21-F6` chip on the name's line | ☑ Test B, Packing and Tasks. |
| `P21-F8` QR/JSON removed | ☑ Test D. |
| `P21-F9` four compact tiles | ☑ Test D. |
| `P21-F10` analysis screen | ☑ Test E. |
| `P21-F11` carousel layout | ☑ Test A (peek 20px, no clip, no wrap, one-line holder/summary). |
| `P21-F12` Packing header | ☑ Test B (one row; first category at y=326/800). |
| `P21-F13` empty category | ☑ Test B. |
| `P21-F14` owner dropdown | ☑ Test C. |

Also done this round: the Phase 2.1 session document committed as recorded (`9d2347d`); scope `V9`, correction scope `V2`, plan `V160` and the seven `P21_*` mockup files committed (`344494e`).

## Product Owner session (real phone, 2026-10-08)

**Build check:** Settings → אודות shows `0.8.0-phase2.2-a13825f7` — matches.

**Test A (in progress):** F1 back row + chip on one row — PASS; F2 location name is the map link — PASS; F3 "אתר" at the end of the provider row — PASS (layout issue → `P22-F3`); F4 page order facts → "כרטיסים ומסמכים" → הערות, no "פרטי הכרטיס" — PASS (evidence: PO screenshots of the football-match item). Decision 1 (activity details) → `P22-F4`. Step 3 — "⋯" menu opens fully on top of the page, not clipped — PASS (unconfirmed-slide action row → `P22-F5`). Holder name ("אייל +2") and "כרטיסים: 3/5" each on one line — PASS. Step 4 — swipe moves one ticket, counter follows, loops 3 → 1 — PASS (note `P22-F6`). Step 5 — single ticket shows one card, no dots/counter — PASS. Step 6 — hotel: location map link, "אתר" at the end of the provider row, "התקשרות" on its own row, no buttons — PASS. Step 7 — flight: "פרטי הטיסה" kept without the passenger list, no "פרטי הכרטיס", links inline — PASS (page top → `P22-F7`). Step 8 — item with no documents: "אין מסמכים מצורפים." + "+ הוספת מסמך" — PASS. Step 9 — transport: links inline, no buttons — PASS. **Test A result: PASS with findings** (`P22-F2`–`P22-F7`).

**Test B (in progress):** step 1 — Packing header: one row, no explanation, compact carousel, first category in the top half — PASS (title truncation → `P22-F1`). Step 2 — Paula's view chips "פאולה, דניאל" / "פאולה +2" / "פאולה +3" / "כולם", chip on the name's line, long name ellipsised with the chip whole — PASS (name room → `P22-F8`). Step 3 — Eyal's view "אייל +2" — PASS. Step 4 — empty category: "אין פריטים בקטגוריה", no bar, no "0/0", "+ הוספת פריט" — PASS. Step 5 — task rows: title + chip on one line ("אייל +2", "כולם"), priority/date below — PASS. **Test B result: PASS with findings** (`P22-F1`, `P22-F8`).

**Test C:** step 1 — "בעלים" is a dropdown: משותף + the 5 active participants, no "Test6", "פאולה כהן" preselected — PASS. Step 2 — owner changed and saved, row shows it, reopening keeps it — PASS. **Test C result: PASS with findings** (`P22-F9` → Phase 3; `P21-F7` seen as expected).

**Test D:** four tiles in one row with icons, no QR/JSON, selected tile soft-teal with ink border; on "מסמך" the file field, "ניתוח והצעת פריט" and "המשך" fit without scrolling; on "ידני" the longer form scrolls with "יצירת פריט" kept at the bottom — **PASS with findings** (`P22-F10`).

**Test E:** Add → מסמך → real file → "המשך": options gone, large palm centred with "מנתח…", status line, bar and reassurance line, greyed "המשך" at the bottom, title and ✕ visible below the account bar; finished on the review screen — **PASS**. OS reduce-motion not run.

## Finding register (Product Owner session, 2026-10-08)

| Finding | Where | Severity | Disposition |
|---|---|---|---|
| `P22-F1` — Packing: the title "רשימות אריזה" is cut to "רשימות א…" beside "+ קטגוריה". | Packing (before Test A) | Non-blocking | Next round. Title becomes **"אריזה"** (matches the bottom-tab label). |
| `P22-F2` — Tickets card: (a) the coverage bar reads as a swipe indicator but never changes while swiping; (b) a sliver of the next ticket still shows, and the last slide (2 / 2) is off-centre with an empty gap on its left. | Item page, tickets carousel (before Test A) | Non-blocking | Next round. (a) **Remove the coverage bar**; keep the text "כרטיסים: 2/5" and "ללא כרטיס: …". (b) **No peek**: each ticket is a full-width card, centred on every slide including the last; the dots and the "1 / N" counter show there are more. Supersedes the peek in the `P2-F4` mockup and `P21-F11`. |
| `P22-F3` — Item page: (a) "אתר" wraps mid-word ("את / ר") beside a wrapping provider name; (b) the yellow "שם לחיפוש" chip under the location takes a line and isn't needed. | Item page (before Test A) | Non-blocking | Next round, **every item type**. (a) **Globe icon only** at the end of the provider row (44px tap target, accessible name "אתר"); the provider row stays on one line. (b) **Remove the "שם לחיפוש" chip**; the location stays the underlined map link. |
| `P22-F4` — Item page: removing "פרטי הכרטיס" (`P21-F4`) also removed the activity's meeting point, duration, price, age limit, included/not-included and ticket quantity from the saved item page (Development Agent decision 1). | Test A, step 2 | Non-blocking | Next round. **Replaces decision 1.** A collapsed **"פרטים נוספים"** row at the bottom of "כרטיסים ומסמכים" (before "+ הוספת מסמך", no extra ticket card); tap to expand in place; lists only rows that have a value — נקודת מפגש (map link), משך, מחיר, הגבלת גיל, כלול / לא כלול (ticket quantity may join); no values → no row; no ticket/holder info inside. Approved mockup: `docs/design/mockups/P22-F4_ITEM_PAGE_ADDITIONAL_DETAILS_MOCKUP.md` + `P22-F4_item_page_additional_details.html`. |
| `P22-F5` — Tickets carousel: on an unconfirmed slide the action row ("אישור ככרטיס" + "פתיחה" + "⋯") is too wide; "⋯" sticks out past the slide's left border (seen on QA22 slide 3/3). | Test A, step 3 | Non-blocking | Next round. The confirm button becomes **"אישור" with a check icon** (the status chip "לא אושר ככרטיס" already says what is confirmed); all three buttons fit inside the slide on one row; confirmed and unconfirmed slides keep the same height. |
| `P22-F6` — Tickets carousel: with only a few tickets the dots alone are enough; the "1 / N" counter isn't needed. | Test A, step 4 | Planning note | **No change now** (PO, 2026-10-08). Recorded for a later design pass. |
| `P22-F7` — Hotel and flight item pages still have the old top: a large "חזרה" button, a "פריטים" label above the title, and a lot of empty space. | Test A, steps 6–7 | Non-blocking | Next round. **Every page with a back action** uses the compact header from `P21-F1`: a small back arrow (44px tap target, no border) with the type chip on the same row where one applies, the title directly below; **no "חזרה" buttons anywhere**; **remove the "פריטים" label**. **The Development Agent audits every page in the app** (item pages of all types, edit pages, sub-pages, settings) and fixes any that don't match; list the pages checked/changed in the report. |
| `P22-F8` — Packing (and task) rows: item names get ~130px beside the chip because the rows sit two cards deep, so short names are cut hard ("QA22 לפאולה ולדניאל" → "QA22 לפ…"). | Test B, step 2 | Non-blocking | Next round. **Both:** (1) remove one layer of card padding on the phone so rows are wider; (2) the name may wrap to **two lines** before the ellipsis, the chip stays on the row beside it. **Everything must fit the phone screen width** (no horizontal overflow, nothing clipped) — check at 360px and 390px. Same on task rows. |
| `P22-F9` — Shopping: no way to filter the list by owner or by shopping place. | Test C | Non-blocking (enhancement) | **Phase 3**, with the Shopping restyle (`P2-F8`). Two filters above "רשימת קניות" — owner (הכול / משותף / each active participant) and place (הכול / each shopping place / ללא מקום) — combinable, with a count of matching items. |
| Note on `P21-F7` (Phase 3, not re-reported): section buttons still misaligned, as expected; also the "קניות" title uses a 🛒 emoji — replace with an ink line icon in the Phase 3 Shopping restyle (spec: no emoji). | Test C | — | Phase 3 (`P21-F7` / `P2-F8`). |
| `P22-F10` — "+" dialog → מסמך: the file picker is the browser's default control (grey "בחירת קובץ" button + "לא נבחר קובץ"), off-design. | Test D | Non-blocking | Next round. A styled field per the `P21` AddDialog board: dashed box, upload icon, "בחירת קובץ" (≥52px, whole box tappable); once picked, it shows the file name (`<bdi>`, ellipsis) with a "החלפה" link. **Everywhere a file is picked**, including the item page's "הוספת מסמך". |

## GO/NO-GO decision

**NO-GO** — Product Owner decision, 2026-10-08. The eight next-round findings (`P22-F1`, `F2`, `F3`, `F4`, `F5`, `F7`, `F8`, `F10`) go to a Phase 2.3 correction round before Phase 2 is accepted; `P22-F9` goes to Phase 3; `P22-F6` is a planning note (no change). Everything stays on `qa` only. Tests A–E all run on a real phone: A, B, C, D PASS with findings; E PASS. No Blocking or Medium findings. Ten findings (`P22-F1`–`P22-F10`): eight Non-blocking for the next round (`F1`, `F2`, `F3`, `F4`, `F5`, `F7`, `F8`, `F10`); `F6` planning note (no change); `F9` enhancement → Phase 3. OS reduce-motion not run.
