# Beta 0.8 Phase 3.2 — summary for the QA agent (real-phone re-test)

**Build:** `0.8.0-phase3.2-24f0575f` on `https://qa--familytripz.netlify.app` (qa only, never Production). Check Settings → אודות for the exact string; if the phone shows an older build, close and reopen the app (or clear the site's data) first.
**Trip:** "QA Test Trip". **Full test steps and the Development Agent's verification:** `docs/versions/V7/0.8.0-phase3.2/EXECUTABLE_TEST_SESSION_V1.md` (Tests A–F). This note is the short version.
**What this round is:** the correction package for the Phase 3.1 NO-GO — `P31-F1` … `P31-F6`. **A GO here is the GO for the single combined Production promotion of Beta 0.8 (`V147`).** Check at **360 and 390px**.

## What exists on the trip

Unchanged since the Phase 3.1 re-test: `QA3 …` tasks / shopping, `QA31-ticket-unconfirmed.png`, the four confirmed leftover tickets, 46 documents (2 failed, 11 archived proposals), 5 done tasks. The temporary items I created to measure the Today row were deleted.

**For Test B you need an item today** (the Today row only exists for an item later today): + → **ידני** → type **מלון** (the type with a phone field) → title "QA32 …", location (e.g. "Siam Paragon, Bangkok"), website, **phone** (e.g. +66 2 123 4567), start = **later today**, end = tomorrow → save. Open **היום**. To see the two-button form, edit it and clear the phone. Delete the item afterwards.

## What to check (expected results)

1. **Settings (`P31-F1`):** the gear opens a **home list**: labels **הטיול הנוכחי** (פרטי הטיול ויעדים · משתתפים · שיתוף הטיול), **חשבון** (הטיולים שלי · ניהול מערכת — managers only), **כללי** (אודות with "Beta 0.8.0-phase3.2" · a **red "מחיקה"** row with a bin). Rows ≥56px with a title, a muted subtitle and a chevron. Each row opens its page (back arrow + title on one row; the back arrow returns to the list); "אודות" shows the version **and the full build**; "משתתפים" / "שיתוף הטיול" / "ניהול מערכת" keep the Phase 3.1 rules (compact rows, one-line e-mails). No tab bar anywhere.
2. **Today (`P31-F2`, E1):** the item card = header (text, divider, time column) then a **hairline** and a **full-width row of equal buttons** that never crosses the divider: **ניווט · אתר · התקשרות** with a phone number, **ניווט · אתר** without.
3. **Documents (`P31-F3`, `P31-F4`):** a Failed row = the file name and, under it, the red **"נכשל"** pill (fully visible, nothing beside it), ~70px; its **"⋯" menu = נסה שוב / פתיחה / שיוך / divider / מחק**. **"ארכיון הצעות שנדחו (11)"** expanded: ~60px rows, the title on one line, a muted "נדחה" chip and the file name inside the card.
4. **Category header (`P31-F5`):** אטרקציות (and the other categories): full title visible; at **390px** "+ אטרקציה" with its label; at **360px** a 44px **"+"** only.
5. **Tasks (`P31-F6`):** **"הושלמו (5)" with the same triangle as the document archive** (▾ open / ◂ closed, at the start of the row), **open by default**; tap = collapse / expand.
6. **Regression:** everything that passed in `PO_SESSION_RESULTS_V1.md` still passes.

## Known limits — please do not report as new

- **"מחיקה" stays under "כללי"** (as on the board). If deletion should live on each trip's own page instead, that is a Product Owner decision (open question in the handoff).
- A Failed row has **no buttons**: "נסה שוב" and "מחק" are in its "⋯" menu (the Product Owner's request after the first Phase 3.2 look).
- A Failed row is ~73px and grows with the phone's text size; the file name is never squeezed behind the pill.
- At 360px the header add control is just a **"+"** (its accessible name is "הוספת <type>"); the label shows from 390px.
- The Today time column is 96px (the design's value).
- Non-manager / non-owner views (no "ניהול מערכת" / "שיתוף הטיול" rows) were not exercised with another account.
- Calendar day cells are still 40px wide at 360px (Phase 3.1 note).
- Not Production: Phase 3.2's own GO triggers the single combined promotion of Beta 0.8.

## Cleaning up afterwards

Delete the item you created for Test B. The `QA3…` / `QA31-…` items from the earlier rounds and the four confirmed leftover tickets can be removed once the re-test is done ("ביטול אישור" → "מחק" for the tickets).
