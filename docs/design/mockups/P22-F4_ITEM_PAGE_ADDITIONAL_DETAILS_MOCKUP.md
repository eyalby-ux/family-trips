# P22-F4 — Approved mockup: "Item Page — Additional Details"

Approved by the Product Owner (Eyal), 2026-10-08, during the Beta 0.8 Phase 2.2 real-phone re-test (Test A).
Visual reference for `P22-F4` in `docs/versions/V7/0.8.0-phase2.2/EXECUTABLE_TEST_SESSION_V1.md`. It replaces the Development Agent's Phase 2.2 decision 1 (the activity details simply left the saved item page when "פרטי הכרטיס" was removed under `P21-F4`).

**Files (in the repository, `docs/design/mockups/`):**
- `P22-F4_item_page_additional_details.html` — standalone static snapshot of both boards (opens in any browser, phone width 390px).
- `P22-F4_additional_details_Main.dc.html` (closed) and `P22-F4_additional_details_Expanded.dc.html` (open) — the Design-canvas sources (need the canvas runtime; kept for exact spacing/colours).
- The original is a Design artifact in the Product Owner's claude.ai account ("Item Page — Additional Details"); private unless he shares it.

## What the mockup shows (phone, 390px, RTL)

1. **Closed (default):** inside the "כרטיסים ומסמכים" card, after the ticket carousel's dots/counter and **before** "+ הוספת מסמך", one full-width row button **"פרטים נוספים"** — info icon, the label, a muted count ("5 פרטים" = how many detail rows have a value), and a down chevron. 52px tall, `--border` outline, 12px radius. **No additional ticket card** is added; the carousel is unchanged.
2. **Open:** tapping the row expands it in place (same card, ink outline, header row on `--teal-soft` with an up chevron; `aria-expanded` toggles). It lists **only the details that have a value**, one fact row each (label 104px muted, value 16px):
   - **נקודת מפגש** — a map link (pin + underlined), same pattern as the location;
   - **משך**, **מחיר**, **הגבלת גיל**;
   - **כלול** — what is included, with "לא כלול: …" as a muted second line;
   - ticket quantity, if stored, may join as "כמות כרטיסים".
   Tapping the header again collapses it.
3. **No values at all → no "פרטים נוספים" row.** Closed every time the page opens (no remembered state needed).
4. Applies to activity/attraction items (the rows the removed "פרטי הכרטיס" card used to show). A flight keeps its own "פרטי הטיסה" card; no ticket/holder information goes into "פרטים נוספים" (that lives only in the ticket slides).

The boards also reflect the other decisions from the same session: `P22-F2` (no coverage bar — text "כרטיסים: 2/5" + "ללא כרטיס: …" only; the ticket is a full-width centred card, no peek) and `P22-F3` (globe icon only at the end of the provider row; no "שם לחיפוש" chip). Where these differ from the earlier `P2-F4` / `P21` mockups, these win.

Tokens: spec V7 §2 only (`--bg #FCFAF7`, `--surface #FFFFFF`, `--ink #123F42`, `--muted #726B66`, `--border #E7E1DA`, `--teal-soft #E8F3F1`), Heebo, `<bdi>` for Latin/numbers, 44px minimum tap targets, Tabler outline icons in ink (no emoji).

Placeholders in the mockup: every value in square brackets ([נקודת מפגש], [משך], [מחיר], [הגבלת גיל], [מה כלול], [הערות הפריט]).
