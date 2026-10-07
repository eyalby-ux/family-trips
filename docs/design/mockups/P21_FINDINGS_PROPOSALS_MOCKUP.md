# Phase 2.1 Findings — Proposals (approved mockup)

Approved by the Product Owner (Eyal), 2026-10-06, during the Beta 0.8 Phase 2.1 re-test session.
Visual reference for `P21-F1` to `P21-F10` in `docs/versions/V7/0.8.0-phase2.1/EXECUTABLE_TEST_SESSION_V1.md` and the Phase 2.2 correction scope.
**Where the mockup and the finding register differ, the register wins** — it records later PO decisions (see "Not shown" below).

**Files (in the repository, `docs/design/mockups/`):**
- `P21_findings_proposals.html` — standalone static snapshot of all five boards side by side (opens in any browser; each board is phone width 390px).
- `P21_proposals_Main.dc.html`, `P21_proposals_Packing.dc.html`, `P21_proposals_Shopping.dc.html`, `P21_proposals_AddDialog.dc.html`, `P21_proposals_Analyzing.dc.html` — the original Design-canvas sources (need the canvas runtime to render; kept for exact spacing/colours).
- The interactive original is a Design artifact in the Product Owner's claude.ai account ("Phase 2.1 Findings — Proposals"); it is private unless he shares it.

## Boards

### 1. Item page top — `P21-F1` to `P21-F4`
- **F1:** compact 44px back arrow (no label) and the type chip ("אטרקציה") on **one row** at the top of the card; no empty space above the title.
- **F2:** the location name itself is the map link (pin icon + underlined name) — no separate "ניווט" button.
- **F3:** "אתר" link (globe icon) at the **end of the provider row** — no separate website button. Applies to **every item type**. Phone number: a "התקשרות" link on its own fact row (confirmed by the PO 2026-10-07; not drawn on the board).
- **F4:** no "פרטי הכרטיס" card — the page goes facts → "כרטיסים ומסמכים" (per the `P2-F4` mockup) → notes.

### 2. Packing — `P21-F5`, `P21-F6`
- **F5:** with Paula selected, a shared item's chip starts with the selected participant: "פאולה +4"; two owners → "פאולה, דניאל".
- **F6:** the chip sits on the **same line** as the item name, at the end; long names truncate with an ellipsis, the chip never wraps. Same rule on task rows.

### 3. Shopping — `P21-F7` (Phase 3)
- "מקום חדש" and "פריט חדש" are outline buttons aligned at the end of their section header rows.

### 4. Add dialog — `P21-F8`, `P21-F9`
- **F8:** no QR / JSON options.
- **F9:** four compact tiles in one row — ידני / מסמך / קישור / משימה — ink line icons, selected tile `--teal-soft` with an ink border; the rest of the form is visible without scrolling.

### 5. Analysing — `P21-F10`
- Large swaying palm **centred** on screen with "מנתח…", the step line, a thin progress bar and the reassurance text; "המשך" greyed and disabled at the bottom.

## Not shown on the boards (text in the register governs)
- `P21-F11` carousel layout fixes, `P21-F12` Packing header row with a small "+ קטגוריה" outline button and no three-line explanation, `P21-F13` empty category → "אין פריטים בקטגוריה", `P21-F14` Shopping owner as a dropdown of active participants. These were raised after the boards were approved.
- The Packing board's header predates `P21-F12`; build the header per F12.

Tokens: spec V7 §2 only (`--bg #FCFAF7`, `--surface #FFFFFF`, `--ink #123F42`, `--muted #726B66`, `--border #E7E1DA`, `--accent #C86442`, `--accent-soft #F9ECE7`, `--teal-soft #E8F3F1`), Heebo, RTL, `<bdi>` for Latin/numbers, 44px minimum tap targets, Tabler outline icons in ink (no emoji).
