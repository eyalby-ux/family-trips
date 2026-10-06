# P2-F4 — Approved mockup: "Item Page — Tickets Carousel"

Approved by the Product Owner (Eyal), 2026-10-06, during the Beta 0.8 Phase 2 acceptance session (Test 5).
Authoritative visual reference for `P2-F4` in `FAMILY_TRIPS_BETA_0_8_PHASE_2_1_CORRECTION_SCOPE_V1.md`.

**Files (in the repository, `docs/design/mockups/`):**
- `P2-F4_item_page_tickets_carousel.html` — standalone static snapshot (opens in any browser, phone width 390px).
- `P2-F4_item_page_tickets_carousel.dc.html` — the original Design-canvas source (needs the canvas runtime to render; kept for exactness of spacing/colours).
- The interactive original is a Design artifact in the Product Owner's claude.ai account ("Item Page — Tickets Carousel"); it is private unless he shares it.

## What the mockup shows (phone, 390px, RTL)

Page order on the item detail page:
1. Type, title, facts, and contact actions (ניווט / אתר / התקשרות) on top — unchanged.
2. **One card: "כרטיסים ומסמכים"** (below).
3. Notes (הערות) — **below** the tickets card.
4. עריכה / מחיקה at the bottom.

Inside "כרטיסים ומסמכים":
1. **Coverage summary:** "כרטיסים: 2 מתוך 5 משתתפים" with a small ink progress bar; one muted line "ללא כרטיס: דניאל, עמית, עפרי".
2. **Ticket carousel** — one ticket per slide, 290px slides, 12px gap, the next slide peeking at the edge (faded ~55%), the selected slide with an ink border. **The carousel holds ticket documents linked to a participant — confirmed and not-yet-confirmed alike** (slide 2 in the mockup is a linked, unconfirmed ticket). Each slide:
   - holder name (20px/600) + status chip — "כרטיס מאושר" (`--teal-soft` fill) or "לא אושר ככרטיס" (bordered, plain);
   - seat/gate/row detail from the document (16px);
   - file name (14px, muted, one line with ellipsis, `<bdi>`);
   - action row under a divider: confirmed → "נוצל" checkbox; unconfirmed → filled-ink "אישור ככרטיס"; then "פתיחה" and a "⋯" overflow (ביטול אישור / שיוך / הסרה).
   - Below the carousel: dots plus a "1 / N" counter. One swipe = exactly one ticket, loops, follows the finger, ~180ms ease-out slide (same mechanics as the §5 participant carousel); reduced motion → instant.
   - **Exactly one ticket → a single card, no carousel, no dots.**
3. **"מסמכים נוספים"** — every other document (not a ticket for a participant) as a compact row: file icon, name (one line, ellipsis), "פתיחה", "⋯". **Each document appears exactly once in the whole card.**
4. **"הוספת מסמך"** — full-width dashed button at the bottom of the card.

Tokens: spec V7 §2 only (`--bg #FCFAF7`, `--surface #FFFFFF`, `--ink #123F42`, `--muted #726B66`, `--border #E7E1DA`, `--teal-soft #E8F3F1`), Heebo, 16px card radius, 12px button radius, 44px minimum tap targets, Tabler outline icons in ink (no emoji).

Placeholders in the mockup: seat details on slides 2–3, the third holder, and the "[מסמך נוסף].pdf" row.
