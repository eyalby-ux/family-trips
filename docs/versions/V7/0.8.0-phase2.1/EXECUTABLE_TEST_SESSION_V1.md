# Family Trips Beta 0.8 Phase 2.1 (Phase 2 correction package) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase2.1` on `https://qa--familytripz.netlify.app` (qa only — **not** promoted to Production; only Phase 3's own GO triggers the single combined promotion, decision `V147`). Correction package for the Phase 2 NO-GO (`docs/versions/V7/0.8.0-phase2/EXECUTABLE_TEST_SESSION_V1.md`), scoped in `docs/roadmap/FAMILY_TRIPS_BETA_0_8_PHASE_2_1_CORRECTION_SCOPE_V1.md` (`V2`). Covers `P2-F5` (Medium, also closes backlog `P12-F4`) and `P2-F1`–`P2-F4`, `P2-F6` (Non-blocking).
**Session number:** `V1`. No Product Owner test has been run yet. The Development Agent ran every check it could on the live `qa` build (marked "Development Agent verification"); that is supporting evidence, not sign-off.
**Instructions:** a **real phone** re-test of exactly the four tests the findings came from — Phase 2 Tests **2, 3, 5 and 7**. Every other Phase 2 test is unaffected (this round touched the header, buttons and chips only where the findings required it).
**Build:** see Settings → אודות for the exact `0.8.0-phase2.1-<hash>` string; it must read in the correct order (`<bdi>`).

## What changed that you should know about before testing

- **The swaying palm is now the app's one "in process" symbol** (`P2-F1`/`P2-F2`, spec `V7.4`): a large (112px) floating palm for every full-screen wait — **app start / refresh, sign-in, and Smart Import analysis** — and the existing small palm in lists. The hourglass and the blank start-up screen are gone. Skeleton placeholders were not touched.
- **Found while testing, both fixed:**
  1. `P2-F3` could not work as scoped: the review/creation form has always *shown* the participant picker, but never read it back, so **whatever was ticked there was silently dropped** and never reached the item. It is now kept on the proposal and applied to the item (merging into an existing item is add-only).
  2. The ticket carousel measured its slides and its sliding distance against two different widths, so a three-ticket carousel drifted and clipped the selected ticket. Both use the viewport's own width now.
- **Deviations from the approved mockup** (the mockup wins on disagreement — tell me to change any):
  1. The mockup's card is a top-level card; on the real item page it sits **inside the item's own card**, so it is ~32px narrower than the mockup. The slide width adapts (≤290px, ~36px of the neighbour peeks).
  2. **Two tickets do not loop** (three or more do). That is the participant carousel's own rule for two options (§5: no repeats); the mockup says "loops" without covering two.
  3. A document linked to **several people** is **one slide** ("אייל בן יצחק, פאולה כהן", two lines at most), not one per person — "each document exactly once".
  4. The per-holder / passenger detail Smart Import read ("פרטי כרטיסים מהמסמך (N)") is kept but **folded away** inside the activity / flight summary card above, so no information from the document disappears from the item page; the mockup does not mention it.
  5. The "⋯" menu opens a small popover **inside the slide** (ביטול אישור / שיוך / הסרה); in the "מסמכים נוספים" rows it lists שיוך למשתתף / ניתוח חכם / הסרה.
  6. Coverage bar is 56px (the mockup's 72px made the line wrap on a 390px phone).
  7. For **non-ticket types** (hotel, insurance) the card is titled "מסמכים" and has no summary or carousel.
- **Decisions made** (change any you read differently):
  1. Shopping rows show the free-text owner ("משותף" or a name), not the participant chip — the Shopping owner is not a participant link. The chip rule (two names / "first +N" / "כולם") applies to tasks, Packing items, and a ticket slide's holder.
  2. "כולם" means every **active** participant is assigned (and the trip has at least two); a single-person trip shows the name.
  3. The Failed pill's "מחק" and the orphan-source gap (`P12-F7`) are untouched — still Phase 3.
  4. Emoji removed on the screens Phase 2 touched: the "+" dialog, warnings, the privacy notice, document rows, the empty Trip Center, the type pickers, "✅ הכנות ומשימות". **Left on purpose for Phase 3:** Games / Today's game suggestion and the Shopping screen's 🛒/📍 (named in Phase 3's scope, `P2-F8`).

**State of the QA Trip when this session starts:** the temporary `QA12` items, packing items and shopping items were deleted; the participant counts are as the Product Owner left them (6 active, "Test6" included). Leftovers the UI cannot remove: **sources** named `QA12-*` (about 8, under Trip Center → מסמך → מקורות, mostly unlinked) and **a few** entries in the collapsed rejected-proposals archive. Real items were not modified.

## Test 2 (re-test) — the palm is the only "in process" display (`P2-F1`, `P2-F2`)

On a real phone: (a) refresh / cold-open the app; (b) sign out and tap "התחברות עם Google"; (c) Add → מסמך → pick a document → "ניתוח והצעת פריט" → "המשך".

**Expect:** in all three a **large palm (about 112px) floating in the middle of the screen**, swaying with a slight bob, two terracotta coconuts only, a status line under it and a thin sweeping bar. App start shows "טוען…", sign-in shows "מתחבר…", analysis cross-fades "קורא את המסמך" → "מזהה פרטים" → "מכין טיוטה". **No hourglass, no spinner, no blank screen.** On the analysis screen "המשך" is greyed throughout. In lists (a source being analyzed) the small palm pill is unchanged. With OS "reduce motion" on, nothing moves.

**Development Agent verification (qa, 390px):** ☑ analysis screen: the large palm measured 112px, status line and bar present, "המשך" disabled, no ⏳ anywhere in the bundle. ☑ Source shows the palm is the only wait glyph (`tests/beta-0-8-phase-2-1.mjs`). **Not exercised live:** the app-start and sign-in palm (the pane stays signed in; the first paint is too fast to catch) and OS reduce-motion — those are yours. **Result:** ☐

## Test 3 (re-test) — linking a ticket document while creating the item (`P2-F3`)

Add → מסמך → analyze a ticket document (an attraction/flight/transport one). On the review screen find **"שיוך המסמך למשתתפים"**, tick a participant, tap **"אישור ככרטיס"**, then approve.

**Expect:** the participant is ticked in the item's own "שיוך למשתתפים" picker too (add only — nobody is ever unticked for you); typed edits on the form survive each tap; the new item's page shows that ticket **already confirmed** (a single ticket card, or a carousel from two). Linking **only the item** (no document-level tick) creates **no** ticket coverage. Inactive participants never appear. On the item page, linking a document to someone adds them to the item's participants the same way.

**Development Agent verification (qa, real analysis of a PDF):** ☑ ticked one person on the document → the form's picker switched to "משתתפים נבחרים" with that person ticked, the typed note survived, "אישור ככרטיס" appeared and flipped to "כרטיס מאושר · ביטול אישור"; ticked a second person → both ticked on the item; approved → the item has both as participants and shows one confirmed single card (two names on one slide). ☑ Attached two more documents on the item page and linked each to a new person → both were added to the item's participants. ☑ the pickers all go through the Phase 2 inactive-participant filter (`P12-F2`, unit-tested); none was inactive on the QA Trip at the time, so it was not seen live this round. **Result:** ☐

## Test 5 (re-test) — the one tickets-and-documents card (`P2-F4`)

Open an item with ticket documents (the football match has two), with documents linked to participants, and one with a single ticket. Compare with `docs/design/mockups/P2-F4_item_page_tickets_carousel.html` (390px).

**Expect:** page order **facts + ניווט/אתר/התקשרות → one card "כרטיסים ומסמכים" → הערות → עריכה/מחיקה**. In the card: "כרטיסים: N מתוך M משתתפים" + a small bar + a muted "ללא כרטיס: …"; then **a carousel when two or more ticket documents are linked to a participant** (confirmed or not) — one ticket per slide with the holder, a "כרטיס מאושר" / "לא אושר ככרטיס" chip, the seat/gate line, the file name, **"נוצל"** (confirmed) or a filled **"אישור ככרטיס"** (unconfirmed), "פתיחה" and "⋯"; the next slide peeks faded, "1 / N" under it, one swipe moves exactly one ticket and (from three) loops; **exactly one ticket is a single card with no dots**. Below, "מסמכים נוספים" with every other document **once**; at the bottom the dashed "+ הוספת מסמך". No document appears twice anywhere in the card.

**Development Agent verification (qa, 390px, DOM-measured):** ☑ two tickets: carousel, "1 / 2", arrow keys moved one ticket (Left = next, following screen position) and stopped at the ends; dragging 130px right moved to the next ticket and a short drag snapped back. ☑ three tickets (one confirmed, two not): slide 2/3 showed "לא אושר ככרטיס" + "אישור ככרטיס"; the carousel looped 1→2→3→1 and back; "מסמכים נוספים" held the one unlinked document; the page order matched; ~36px of the neighbour peeks. ☑ exactly one ticket: single card, no carousel, no dots. ☑ the page does not scroll horizontally. **Not exercised:** a real finger swipe and real-phone feel (yours). **Result:** ☐

## Test 7 (re-test) — Packing and Shopping rows, the one-line chip, the Add dialog (`P2-F5`, `P2-F6`)

On a real phone: Packing (with an item for everyone, for five people, for three, for two), Shopping, the "+" dialog.

**Expect:** Packing and Shopping rows are **compact one-line rows** like Tasks — a checkbox, the name, a participant chip — with **no edit/delete buttons on the row**; tapping the row opens the edit screen, and **"מחיקת הפריט"** (existing items only) is inside it, behind a confirmation. The chip is **always one line**: two names in full, more than two "אייל +4", everyone "כולם" — on Packing, Tasks and the ticket slide. The "+" dialog's options (ידני / מסמך / קישור / JSON / QR / משימה) have **line icons in ink, no emoji**; the selected option has the soft teal fill and an ink border (not green).

**Development Agent verification (qa, 390px):** ☑ Packing rows 56–60px, no inline buttons; an item for five of six people showed "אייל +4", three → "אייל +2", two → both names, one → the name; the edit screen offered "מחיקת הפריט" for an existing item only and the delete closed the screen; ☑ Shopping: added an item, tapped it, deleted it from inside the edit screen (`P12-F4` closed); ☑ the "+" dialog measured: every option has an SVG icon, the selected one is `rgb(232,243,241)` (`--teal-soft`); ☑ no horizontal scroll on either screen. **Not exercised:** the "כולם" case with all six assigned (the QA Trip's active count changes with your tests), and the feel on a phone. **Result:** ☐

## Finding verification notes (one per finding)

| Finding | Development Agent verification |
|---|---|
| `P2-F1` large palm | ☑ analysis screen: 112px palm, sway + bob, status line, hairline, disabled "המשך"; reduced-motion rule present (CSS); not run on a real OS setting. |
| `P2-F2` palm everywhere | ☑ source: no ⏳, no spinner element, `loading()` / sign-in / first paint / analysis all use the large palm; ☐ app-start and sign-in not observable in the signed-in pane — Test 2. |
| `P2-F3` ticket linking on creation | ☑ end to end on a real analyzed PDF (see Test 3); also fixed the dropped participant choice. |
| `P2-F4` one card + carousel | ☑ see Test 5; deviations from the mockup listed above. |
| `P2-F5` Packing/Shopping rows (+ `P12-F4`) | ☑ see Test 7; delete lives only inside the edit screens; the old row-level delete test was rewritten. |
| `P2-F6` Add-dialog icons | ☑ see Test 7; emoji removed from the screens Phase 2 touched, Games/Shopping left for Phase 3. |

Also done this round: the Phase 2 session document and the three mockup files committed exactly as recorded; scope `V7`/`V8`, correction scope `V2`, delivery plan `V156`/`V158` and design spec `V7.4` synced into `docs/` (spec `V7.4` differed from `V7.3` also in §7's Processing bullet and the relocated exception box — both consequences of the new loading-indicator subsection, nothing else).
