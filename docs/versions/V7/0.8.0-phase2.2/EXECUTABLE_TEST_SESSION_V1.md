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

**Development Agent verification (qa, 390px, DOM-measured):** ☑ F1: back-row 44px, 12px to the title; F2/F3: all 17 items across hotel/flight/car/activity render the links and none has a separate button (Tate Modern, which has no location, shows only "אתר"); F4: no "פרטי הכרטיס" on any activity; a flight shows "פרטי הטיסה" only. F11: peek = 20px, action row 85–325px inside the slide 70–340px, holder and summary 24px (one line); the "⋯" menu opened inside the viewport on top of the page, closed on an outside tap and on choosing an item; an unconfirmed slide's "אישור ככרטיס" is 44px high (one line). **Not exercised:** a real finger on the carousel and the popover under a real thumb. **Result:** ☐

## Test B — Packing and task rows (`P21-F5`, `P21-F6`, `P21-F12`, `P21-F13`)

Open Packing; select a participant (Paula) and look at a shared item; look at an empty category; look at a Tasks row with a participant.

**Expect:** **(F12)** one header row — "רשימות אריזה" on one line and a small outline "+ קטגוריה" — no explanation text; a compact carousel; **the first category sits in the top half of the screen**. **(F13)** a category with nothing in it says a muted "אין פריטים בקטגוריה", with **no progress bar and no "0/0"**, and "+ הוספת פריט" (dashed); "הכול נארז." only when a category has items and all are packed. **(F5)** in Paula's view an item shared by several people reads **"פאולה +3"** (or "פאולה, דניאל" for exactly two); the shared view keeps "אייל +3". **(F6)** the chip is on the **same line as the item name**, at the end; a long name is cut with an ellipsis and the chip stays whole; same on a task row (title + chip on one line, priority/date below).

**Development Agent verification (qa, 390px):** ☑ header 44px on one row, no explanation, first category at y=326 of 800; "בגדים" (empty for the shared view) showed "אין פריטים בקטגוריה" with no badge/bar; a four-person item showed "אייל +3" in Eyal's view and **"פאולה +3"** in Paula's, a three-person item "פאולה +2"; the chip and the name share a line (rows 56px) and a 70-character name was ellipsised; the Tasks row put "אייל בן יצחק" on the title line. (The chip-squeeze bug above was found and fixed here.) **Result:** ☐

## Test C — Shopping (`P21-F14`; `P21-F7` is Phase 3)

Add or edit a Shopping item.

**Expect:** "בעלים" is a **dropdown**: "משותף" and the **active** participants only (no inactive one). The chosen name shows on the row and is selected again when you reopen the item. (The "מקום חדש"/"פריט חדש" header alignment is Phase 3.)

**Development Agent verification (qa):** ☑ options: משותף, אייל בן יצחק, פאולה כהן, דניאל, עמית, עפרי (the inactive "Test6" absent); no free-text field left; saved "פאולה כהן", the row showed it, reopening kept it; deleted from inside the edit screen. **Result:** ☐

## Test D — the "+" dialog (`P21-F8`, `P21-F9`)

Tap "+" on the phone.

**Expect:** **four tiles in one row** — ידני / מסמך / קישור / משימה — icon over label, ~72px tall; **no QR, no JSON**; the selected tile has the soft teal fill and an ink border; the file field, the "ניתוח והצעת פריט" checkbox and "המשך" are all visible **without scrolling**.

**Development Agent verification (qa, 390px):** ☑ four tiles, each 82×72px on one row, all with icons; "QR" and "JSON" appear nowhere on the screen; the dialog spans y=371–800 with "המשך" ending at y=780 and no inner scrolling. **Not exercised:** the on-screen keyboard and a real file picker (yours). **Result:** ☐

## Test E — the analysis screen (`P21-F10`)

Add → מסמך → pick a document → "המשך".

**Expect:** the dialog's options **disappear** and the screen shows a large palm **centred**, "מנתח…", the rotating status line, the thin bar, "הניתוח יכול לקחת מספר שניות. אין צורך לסגור את המסך.", and a **greyed "המשך" at the bottom**; the title and ✕ at the top are visible (not under the dark bar). When the analysis ends you land on the review screen as before.

**Development Agent verification (qa, real PDF analysis):** ☑ the palm measured 112px and centred (x=195 of 390), label, note and a disabled "המשך" present, the tiles gone; the analysis finished and opened the review screen. The top-bar overlap found on the first look (title and ✕ hidden under the dark bar) was fixed, and re-checked on the final build `0.8.0-phase2.2-a13825f7`: the title row starts at y=72, below the bar's y=58. **Result:** ☐

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
