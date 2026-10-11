# Beta 0.8 Phase 3 — Product Owner session summary for the Development Agent

**Date:** 2026-10-11 · **Build tested:** `0.8.0-phase3-f7ef017e` on `https://qa--familytripz.netlify.app` (real phone + desktop) · **Tester:** Product Owner (Eyal), run by the QA agent.
**Decision: NO-GO. No Production promotion.** Fix the 15 findings below in a **Phase 3.1 correction round** (`0.8.0-phase3.1`, `qa` only); Phase 3.1's own GO is then the GO for the single combined Production promotion of Beta 0.8 (`V147`).
**Source of truth:** the finding register in `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`. Where this summary and the register differ, the register wins; where a mockup and the register differ, the register wins.

## Where everything is

- **Screenshots from the session** (the "before"): `docs/versions/V7/0.8.0-phase3/screenshots/` — one or more per finding, named `P3-Fxx_*.png` (listed in the table).
- **Approved mockups** (the "after"), all in `docs/design/mockups/` — open the `.html` in any browser; the `.md` beside it is the written spec; `.dc.html` are the Design-canvas sources:
  - `P3_SETTINGS_TODAY_PROPOSALS_MOCKUP.md` + `P3_settings_today_proposals.html` — Participants (`F7`, `F9`, `F11`), Destinations (`F8`), Today card (`F10`).
  - `P3-F12_ACCESS_ROWS_MOCKUP.md` + `P3-F12_access_rows_A.html` — e-mail rows (`F12`, option A).
  - `P3-F13_DOCUMENTS_LIST_MOCKUP.md` + `P3-F13_documents_list.html` — document list, "⋯" menu, filter chips (`F13`).
  - `P3-F15_TIMELINE_COMBINED_MOCKUP.md` + `P3-F15_timeline_combined.html` — ציר הזמן redesign (`F15`).
- These are uncommitted in the repo: commit the screenshots, the mockup files and the updated session document first (`docs: Phase 3 PO session results (NO-GO), screenshots and approved mockups`).

## Results

| Test | Result |
|---|---|
| A — Games | PASS with findings (`F1`; `F2` backlog) |
| B — Shopping | PASS with findings (`F3`) |
| C — Tasks / overdue | PASS with findings (`F4`, `F5`) |
| D — Category pages (`P23-F1`) | PASS (`F6` seen here) |
| E — Settings, participant delete (`P12-F3`) | PASS with findings (`F7`–`F12`) |
| F — Delete document sources (`P12-F7`) | PASS with findings (`F13`, `F14`) |
| G — Timeline / calendar | Findings — redesign (`F15`); re-test after the rebuild |
| H — Offline strip | PASS |
| I — §9 visual pass | PASS with findings (`F16`) |

**Development Agent decisions — all approved/accepted by the PO:** 1 (overdue text in ink, not `--accent`), 2 (instructions-only games for this beta → `P3-F2` backlog), 3 (game filter rules), 4 (in-card two-step participant delete), 5 (deleting a source removes open proposals that came only from it), 6 (Tasks retitled "משימות" with the new header), 7 (per-kind calendar colours + multi-day bar — now carried into `F15`). Decisions 8–10 were not contested.

## Findings to fix in Phase 3.1 (all Non-blocking, all before the Production promotion)

| # | What is wrong (see screenshot) | Agreed fix | Screenshot · mockup |
|---|---|---|---|
| `P3-F1` | Games: a favourite's star stays an outline; only the button tint changes. | Favourite = **filled ink star** on `--teal-soft`; not favourite = outline star on white. | `P3-F01_games_favourite_star.png` |
| `P3-F3` | Shopping owner chips mix first names and full names ("אייל" vs "פאולה כהן"). | Chip always shows the participant's **first name**; a legacy free-text owner that matches no participant stays as saved. | `P3-F03_shopping_owner_chips.png` |
| `P3-F4` | Tasks have no notes or link. | Task form gets **"הערות"** (multi-line) and **"קישור"** (URL, validated); the row shows small note / link icons when set; opening the task shows the notes, the link opens in the browser (LTR). | `P3-F04-F05_tasks_screen.png` |
| `P3-F5` | Done tasks stay mixed in the list. | Done tasks move to a **"הושלמו (N)"** section at the bottom (as Packing); unticking moves back up; the status filter keeps working. | `P3-F04-F05_tasks_screen.png` |
| `P3-F6` | Thai text shows boxes for tone/vowel marks ("รีสอร□ต"). | Add **Noto Sans Thai** as a fallback after Heebo (Google Fonts, Thai `unicode-range`), everywhere. | `P3-F06_thai_glyphs_hotel_category.png` |
| `P3-F7` | Participants: the bin on a participant who can't be deleted looks active; the reason line sits outside/below the card and reads as the next card's. | Disabled bin clearly greyed (faint fill, muted icon, no border, `aria-disabled`, tap does nothing); reason **inside its own row**. | `P3-F07_participants_bin_and_reason.png` · Settings board |
| `P3-F8` | Destinations: "הוספה" is a huge filled block; ↑ / ↓ / large pink "הסרה" stack over two lines. | Field + small outline "+ הוספה" on one line, same height; each destination one row: name + 44px icon buttons ↑ ↓ bin (first/last disabled accordingly). | `P3-F08_destinations.png` · Settings board |
| `P3-F9` | "משתתף חדש" is a big filled button at the bottom. | Header row "משתתפים" + small outline **"+ משתתף חדש" at the top**; bottom button removed. | `P3-F09_new_participant_button.png` · Settings board |
| `P3-F10` | Today: the "ניווט" / "כרטיסים" row is inset; "ניווט" doesn't line up under the time column. | Action row aligned to the card's right content edge, flush under the time column. | `P3-F10_today_navigation_alignment.png` · Settings board (Today) |
| `P3-F11` | Participant cards are tall (~140px) with a redundant "עריכה". | **Remove "עריכה" — tap the participant to edit**; one compact ~64px row: name + muted status/reason line, small "השבתה"/"הפעלה" + bin. | `P3-F11_participant_cards.png` · Settings board (Participants) |
| `P3-F12` | "גישה": e-mails break mid-word; "ביטול הרשאה" wraps (the LTR fix did not hold on the phone). | **Option A:** each e-mail one line, LTR, never broken, "…" + full address on tap; short outline **"הסרה"** (aria "ביטול הרשאה ל-<email>"); "מנהל" chip; invite field + "הזמנה". All e-mail lists (sharing + admin). | `P3-F12_access_emails.png` · `P3-F12_*` |
| `P3-F13` | Trip Center → מסמך: ~230px cards, three stacked buttons, wrapping status, no filters. | ~60px rows (icon, one-line LTR name, status chip + note, tap = open) with a **"⋯" menu** (פתיחה / שיוך למשתתף / divider / מחק — none on a confirmed ticket); header on one line with "+ מסמך" + summary; **filter chips** הכול · ממתין לאישור · מצורף · לא משויך · כרטיסים · קישורים · נכשל (single-select, counts, empty state). | `P3-F13_documents_list.png` · `P3-F13_*` |
| `P3-F14` | Ticket slide: "אישור" off-centre (the ✓ icon isn't drawn, its space kept); in "⋯", "מחק" looks like "שיוך"/"הסרה". | Draw the check; icon + "אישור" centred together. Divider above "מחק", terracotta text + bin icon (as in `F13`). | `P3-F14_confirm_button_and_menu.png` |
| `P3-F15` | ציר הזמן: dates/times wrap into titles and don't align; the calendar needs a richer view. | **Redesign per `P3-F15_TIMELINE_COMBINED_MOCKUP.md`:** mode control יום / שבוע / חודש / כל הטיול; **month calendar always on top** (stays as coloured bands under their dates, event dots by kind, one legend, today ring, the shown range marked); **below** — יום = day agenda (fixed LTR time column, dot + line, cards, "where we sleep tonight", next item highlighted); שבוע / חודש / כל הטיול = ribbon (one row per day, stay bar, aligned time + title, empty days, collapsed empty runs in כל הטיול). | `P3-F15_timeline_misaligned.png` · `P3-F15_*` |
| `P3-F16` | Category names are singular; category pages end with a large filled "הוספה". | Tiles and category titles **plural** (טיסות · מלונות · תחבורה · אטרקציות · מסעדות · ביטוחים · אנשי קשר · מסמכים); the type chip on a single item stays singular; bottom "הוספה" → small outline **"+ <type>"** in the header row. | `P3-F16_trip_center_singular_names.png`, `P3-F16_category_page_add_button.png` |

**Not in this round:** `P3-F2` — build an interactive game (backlog; the PO will schedule it).

## QA Trip state after the session

- `QA3 ללא שיוך` was **deleted** (Test E) — the trip has 5 active participants again; ticket summaries read "…/5".
- `QA3-delete-me.png` and `QA3-ticket-unconfirmed.png` were **deleted** (Test F).
- `QA22-a.png` was un-confirmed and **re-confirmed** by the PO — unchanged.
- **Leftover confirmed QA tickets** (`QA12-f3`, `QA22-a`, `QA22-b`, `QA22-single`): PO decision — **keep the ones the Phase 3.1 re-test needs**; remove only those no longer needed ("ביטול אישור" → "מחק").
- Starred game "טריוויה תאילנד" left as a favourite (useful for `F1`).
- The other `QA3` items (overdue / done tasks, `QA3 חנות בדיקה`, `QA3 מטען נייד`, `QA3 מתנות`, `QA3 קרם הגנה`) remain for the re-test.

## What's needed

1. Commit the session document, screenshots and mockups (above).
2. Implement `P3-F1`, `F3`–`F16` through the full quality gate (`npm run check`: syntax, tests incl. updated pinning assertions, production build), deployed to `qa` as `0.8.0-phase3.1`. Check every changed screen at **360 and 390px** (no overflow, nothing clipped, tap targets ≥44px, contrast ≥4.5:1, no emoji / English headings).
3. Write `docs/versions/V7/0.8.0-phase3.1/EXECUTABLE_TEST_SESSION_V1.md` (real-phone re-test of exactly these areas, plus the new ציר הזמן end to end) with a Development Agent verification note per finding, and a short QA summary + any seed data, as in previous rounds.
4. Report back: commits, build id, what was built, every decision you made that the mockups/register didn't settle, and anything that didn't check out.
