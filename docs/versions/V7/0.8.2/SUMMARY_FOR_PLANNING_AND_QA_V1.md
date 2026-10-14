# Beta 0.8.1 → 0.8.2 — summary for the planning agent and the QA agent (2026-10-14)

## Where things stand
- **`0.8.1` (`0.8.1-0ceea747`) is in Production** since 2026-10-14 16:36 UTC (deploy `6acfaf9401c95aa749502d67`). PO acceptance: **GO** at 19:05, tests A–G recorded PASS (`docs/versions/V7/0.8.1/PO_SESSION_RESULTS_V1.md`). Rollback record: `docs/versions/V7/0.8.1/production-promotion-backup-20261014-193429/` (restore deploy `6acd3625c1bf3a8da6b3cd18` = `0.8.0-phase3.2-24f0575f`).
- **`0.8.2` (`0.8.2-0f740d93`) is on `qa` only**, not in Production. The PO has confirmed its single fix is ready; promotion awaits the PO's instruction.

## What 0.8.1 delivered (all PASS)
P32-F1 (Tasks "משתתף" filter has its own full row), P32-F2 (Documents chip row keeps its scroll; root cause: `render()` rebuilt the scroller at its start — the selection was never lost), documents-list linkage line and "קישור לפריט" picker, hard delete with three confirmation wordings (unlinked / linked / confirmed ticket) offered on every document row, V7-F14 (removed-account message, 9 s), BL-ICONS-1 (icon + label; a row of ≥3 that doesn't fit goes icon-only as a whole).
Scope premises that differed from the code: the documents list's "הסרה" no longer existed (it is the "⋯" menu's "מחק"); there was no existing "attach existing document" flow, so "קישור לפריט" is a new small picker. Hard delete: no pushback — every reader of a document id tolerates a missing document.

## New finding after the Production promotion — `P81-F1`
On an **item page**, a **Failed** document (under "מסמכים מצורפים") still showed "נסה שוב" and "מחק" as buttons beside the pill; only the Documents list had them in "⋯". The 0.8.1 scope and test session covered the Documents list, not this second surface — a gap in my coverage, not a regression.
**Fix (`0.8.2`, commit `0f740d9`):** the pill stands alone; "⋯" lists נסה שוב · שיוך למשתתף · הסרה · מחק. A Failed row previously had no "מחק" in the menu (the inline button did that job), so it is now offered there; confirmed tickets still have no delete on the item page.
**Verification:** full gate green (new `tests/beta-0-8-2.mjs`; one older pin in `tests/beta-0-8-phase-3.mjs` updated); live on `qa` at 390px; PO accepted ("fixed, ready").

## For the QA agent
- Build to test: Settings → אודות must read `0.8.2-0f740d93` (reopen the app or clear site data if not).
- One check: an item with a **Failed** document → the pill alone, no buttons beside it; "⋯" → נסה שוב / שיוך למשתתף / הסרה / מחק. To get one: the QA Trip's failed `13688.pdf` or `IMG-20261006-WA0012.jpg` (linked to nothing) → Documents → "⋯" → קישור לפריט → pick an item → open that item.
- Regression: everything from `0.8.1` (Tests A–G) unchanged.
- Carried, not blocking: the rest of the Phase 3.2 regression list was not re-run on `0.8.1`; widths weren't recorded for 0.8.1 tests A, B, E, F; V7-F14 was never exercised live (needs a removed second account).

## For the planning agent
- Suggest recording `0.8.1` as promoted (2026-10-14) and `0.8.2` as qa-accepted, promotion pending the PO.
- Suggested follow-up: a one-line check in future scopes that lists every surface a shared component appears on (here: Failed-document actions live on both the Documents list and the item page).
- Still open from the backlog: V7-F14 live check, `P3-F2` interactive games.
