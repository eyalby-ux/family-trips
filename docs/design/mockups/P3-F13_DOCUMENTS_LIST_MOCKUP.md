# P3-F13 — Approved mockup: Trip Center → מסמך (document list)

Approved by the Product Owner (Eyal), 2026-10-11, Beta 0.8 Phase 3 session (Test F). Visual reference for `P3-F13` in `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`. **Where a board and the register differ, the register wins.**

**Files (`docs/design/mockups/`):** `P3-F13_documents_list.html` (standalone, two 390px boards) and `P3-F13_documents_{Main,Menu}.dc.html` (Design-canvas sources). Original: Design artifact "P3-F13 — Document List" in the Product Owner's claude.ai account.

## Layout
1. **Header (one line):** back arrow + documents icon + "מסמכים" + small outline "+ מסמך"; below it a muted summary "N מסמכים · M ממתינים לאישור".
2. **Filter chips** (one horizontally scrollable row, 44px, single-select, count in each; active = ink with white text): **הכול · ממתין לאישור · מצורף · לא משויך · כרטיסים · קישורים · נכשל**.
   - ממתין לאישור = analysed, proposal not yet accepted/rejected; מצורף = attached to an item; לא משויך = not attached to any item and not a ticket; כרטיסים = ticket documents (confirmed or not); קישורים = saved links; נכשל = failed analysis.
   - Counts update live; an empty filter → empty state + "הצגת הכול".
3. **Rows (~60px)** instead of ~230px cards: file / link icon, the name on **one line** (`dir="ltr"`, ellipsis), then a status chip ("ממתין לאישור" `--accent-soft`; "מצורף" / "כרטיס מאושר" `--teal-soft`) and an optional muted note (assignees, "חילוץ ממתין לאישור", "קישור"). **Tap the row = open**.
4. **"⋯" (44px) menu** per row: **פתיחה**, **שיוך למשתתף**, divider, **מחק** (terracotta text + bin, single confirmation as today). "מחק" is **absent for a confirmed ticket** (it needs "ביטול אישור" first); a Failed source keeps "נסה שוב / מחק".

Tokens: spec V7 §2, Heebo, RTL, `<bdi>`/LTR for file names and URLs, 44px tap targets, line icons (no emoji). Names and counts are examples.
