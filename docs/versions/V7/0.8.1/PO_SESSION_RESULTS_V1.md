# Beta 0.8.1 — PO acceptance session log (2026-10-14, build 0.8.1-0ceea747, qa only)

Session document: `docs/versions/V7/0.8.1/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–G).

## Summary
- **Decision: GO** (Product Owner, 2026-10-14 19:05), build `0.8.1-0ceea747`. Production promotion of 0.8.1 follows.
- **Results:** all tests A–G recorded as PASS on the PO's verdict: A (Tasks filter), B (Documents chip row), C (linkage indicator and re-link), D (delete confirmations, cancelled), E (removed-account message exists), F (Today icon buttons), G step 1 (partial regression: timeline week mode, Settings home list).
- **Not covered:** the rest of the Phase 3.2 regression list on this build; width and wording details for A, B, E, F were not recorded by the PO.
- **QA trip:** may be changed before each round; no revert needed at the end of a round. Test C's extra link was left in place.
- **Open for Claude Code:** none blocking. Findings: none new in this round.

| Test | Result | Notes |
|---|---|---|
| A — Tasks participant filter label, full width (P32-F1) | PASS (PO: "pass", 2026-10-14 18:53) | PO did not say which widths (360 / 390px) were checked. Confirm if needed. |
| B — Documents chip row keeps its scroll position and selection (P32-F2) | PASS (PO: "pass", 2026-10-14 18:54) | PO did not say which width (360px requested) was checked. |
| D — documents hard delete, three confirmation wordings, cancelled (P81 delete) | PASS (PO: "pass", 2026-10-14 18:57; the reply does not split the three wordings; nothing was deleted) | |
| E — removed account's message says the account was removed (V7-F14) | PASS (PO: "the message exists, pass", 2026-10-14 19:02) | PO did not record the wording or the width. |
| F — Today action buttons: icon-only three-button row, icon + label two-button rows (BL-ICONS-1) | PASS (PO: "pass", 2026-10-14 19:03) | PO did not say which widths or rows were checked; the three-button hotel may not have been visible yet (starts 23:58). Confirm. |
| G1 — regression, timeline week mode and Settings home list | PASS (PO: "pass", 2026-10-14 19:04) | Partial regression. The full Phase 3.2 T6 list passed on build 24f0575f; this round changed Tasks, Documents and Today only. |
| C — linkage indicator on every row, "קישור לפריט" picker, link and un-link (indicator / re-link) | PASS (PO: "pass", 2026-10-14 18:55) | PO did not confirm the extra link was removed afterwards. |

## Findings (P81-F#)
- **P81-F1 (post-GO, found by the PO on the phone after the 0.8.1 Production promotion, 2026-10-14):** on an item page, a **Failed** document in "מסמכים מצורפים" still showed "נסה שוב" and "מחק" as buttons beside the pill, while the Documents list already had them in the "⋯" menu. **Fixed in `0.8.2`** (`docs/versions/V7/0.8.2/`); the PO accepted the fix.

## GO/NO-GO decision
- 2026-10-14 19:05 — **GO** (Product Owner), build `0.8.1-0ceea747`. Per the scope, Production promotion of 0.8.1 follows this acceptance session.
- Carried over: the rest of the Phase 3.2 regression list was not re-run on this build (the PO chose GO after Test G step 1). The PO did not record which widths were checked in Tests A, B, F.
- QA trip: the PO's instruction is that the QA trip may be modified before every test round, and no reverting is needed at the end of a round. No cleanup is required. The extra link from Test C was not reverted, per that instruction.
