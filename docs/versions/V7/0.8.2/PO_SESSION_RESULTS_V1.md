# Beta 0.8.2 — PO acceptance log (2026-10-14, build 0.8.2-0f740d93, qa only)

**Scope:** one correction, `P81-F1` — a Failed document on an item page keeps "נסה שוב" / "מחק" in its "⋯" menu, not beside the pill (as on the Documents list). Found by the PO on the phone after `0.8.1` was promoted to Production.

| Check | Result |
|---|---|
| P81-F1 — item page, Failed document: the pill stands alone; "⋯" lists נסה שוב · שיוך למשתתף · הסרה · מחק | **PASS** (PO: "fixed, ready", 2026-10-14) |
| Development Agent, live on `qa` at 390px | ☑ no buttons beside the pill; menu entries as above; the temporary link used for the check was removed |

- **Findings:** none new.
- **Decision:** the PO confirmed the fix is ready. **Production promotion of `0.8.2` is not done** — it awaits the PO's explicit instruction (Production runs `0.8.1-0ceea747`).
