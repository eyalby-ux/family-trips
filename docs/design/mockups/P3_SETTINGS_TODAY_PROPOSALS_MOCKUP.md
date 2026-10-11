# Phase 3 Findings — Settings & Today (proposal boards)

Agreed by the Product Owner (Eyal), 2026-10-11, during the Beta 0.8 Phase 3 acceptance session. Visual reference for `P3-F7`–`P3-F11` in `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`. **Where a board and the finding register differ, the register wins.**

**Files (`docs/design/mockups/`):** `P3_settings_today_proposals.html` (standalone snapshot, 390px boards) and `P3_settings_today_{Main,Destinations,Today}.dc.html` (Design-canvas sources). Original: Design artifact "Phase 3 Findings — Settings & Today" in the Product Owner's claude.ai account (private unless shared).

## Boards
1. **Participants (`P3-F9` + `P3-F7` + `P3-F11`):** section header "משתתפים" + small outline "+ משתתף חדש" at the top (no bottom button). Each participant is **one compact row (~64px)**: name + a muted status line on the right — when it can't be deleted the line reads e.g. "פעיל · לא ניתן למחוק (8 שיוכים)" (the reason lives **inside the row**); **no "עריכה" button — tapping the name area opens the edit screen**; on the left a small outline "השבתה" / "הפעלה" and the 44px bin. A blocked bin is clearly greyed (faint fill, muted icon, no border, `disabled` + `aria-disabled`); a deletable participant keeps the normal outline bin; an inactive participant's row is muted with "הפעלה" outlined in ink.
2. **Destinations (`P3-F8`):** each destination is one 52px row — name, then 44px icon buttons ↑, ↓, bin (↑ disabled on the first, ↓ on the last); the add row is the field + a small outline "+ הוספה" of the same height.
3. **Today (`P3-F10`):** the next-item card's action row ("ניווט", "כרטיסים") starts at the card's right content edge, flush under the time column.

Tokens: spec V7 §2 (`--bg #FCFAF7`, `--surface #FFFFFF`, `--ink #123F42`, `--muted #726B66`, `--border #E7E1DA`, `--accent #C86442`), Heebo, RTL, `<bdi>` for Latin/numbers, 44px tap targets, outline line icons. Names and counts are examples.
