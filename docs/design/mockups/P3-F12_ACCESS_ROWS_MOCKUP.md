# P3-F12 — Approved mockup: access list rows (option A)

Approved by the Product Owner (Eyal), 2026-10-11, Beta 0.8 Phase 3 session (Test E). Visual reference for `P3-F12` in `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`.

**Files (`docs/design/mockups/`):** `P3-F12_access_rows_A.html` (standalone, 390px) and `P3-F12_access_rows_A.dc.html` (Design-canvas source). Original: Design artifact "P3-F12 — Access List Rows" (board A) in the Product Owner's claude.ai account.

## Rules (every e-mail list — trip sharing and the admin "גישה" / "ניהול הרשאות גישה" screens)
- One row per address, ≥56px: the e-mail is **one line**, `dir="ltr"`, never broken mid-word; too long → ends in "…" with the full address in `title` / shown on tap.
- Owner/admin: a "מנהל" chip at the end of the row (no remove action).
- Remove: a short outline **"הסרה"** button (44px, one line, `white-space: nowrap`), `aria-label="ביטול הרשאה ל-<email>"`. Option B (icon only) was not chosen.
- Invite: the e-mail field (`dir="ltr"`) and a small outline "הזמנה" button, same height, one line.

Tokens: spec V7 §2, Heebo, RTL, 44px tap targets.
