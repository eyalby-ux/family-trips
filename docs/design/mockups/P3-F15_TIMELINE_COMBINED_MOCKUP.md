# P3-F15 — Approved mockup: ציר הזמן (calendar on top, view below)

Approved by the Product Owner (Eyal), 2026-10-11, Beta 0.8 Phase 3 session (Test G), **to be built before the Production promotion**. Visual reference for `P3-F15` in `docs/versions/V7/0.8.0-phase3/EXECUTABLE_TEST_SESSION_V1.md`. Explored options (day strip / ribbon / month bands) are in the PO's Design artifact "Timeline — Calendar View Options"; the chosen mix is "Timeline — Combined View". **Where a board and the register differ, the register wins.**

**Files (`docs/design/mockups/`):** `P3-F15_timeline_combined.html` (three 390px boards) and `P3-F15_timeline_{Main,Week,Trip}.dc.html`.

## Structure (every mode)
1. Title "ציר הזמן".
2. **Mode control** — one segmented row: **יום / שבוע / חודש / כל הטיול** (active = ink, white text; 40–44px).
3. **Month calendar, always shown** (compact, cells ~34px tall, `font-variant-numeric: tabular-nums`, RTL Sunday first):
   - **Hotel / multi-day stays = a coloured band under their dates**, continuous across the week, rounded at the start/end, wrapping to the next week row;
   - single events = small dots by kind (flight, transport, attraction, restaurant, …) — per-kind colours kept (decision 7);
   - **one legend** under the grid (stay names + kinds);
   - today = terracotta ring; **the range shown below is marked**: יום → the chosen day filled ink; שבוע → that week's row shaded `--teal-soft`; חודש / כל הטיול → no extra mark;
   - arrows move by the mode's unit (day / week / month); tapping a day switches to יום for that day.
4. **Below the calendar:**
   - **יום (option A):** heading "היום · יום ו׳, 9 באוק׳" + count; a line saying where you sleep that night ("לינה הלילה: … · לילה 2 מ-2" or "ללא לינה מתוכננת הלילה"); a vertical agenda — **fixed time column (≈50px, LTR, tabular numerals)**, a coloured dot + connector line, and a card per item (title, kind · place); the next item outlined in ink with "בעוד N שע׳".
   - **שבוע / חודש / כל הטיול (option B, ribbon):** one row per day — date column (≈56px, "5.10" + weekday, tabular), a **stay bar** column (continuous from check-in to check-out), and the day's items each as **time (fixed 40px, LTR) + title** on one line with ellipsis; empty day → "אין תוכניות"; today's row shaded; in כל הטיול consecutive empty days collapse ("1–4.10 · 4 ימים ללא תוכניות"); a flight shows its own dot in the bar column.
5. **Alignment rule (the original complaint):** times and dates never wrap into the title text; every time sits in the same fixed column.

Tokens: spec V7 §2, Heebo, RTL, `<bdi>`/LTR for Latin names and times, 44px tap targets. Stay colours: one muted hue per stay (examples #2F6B8F, #6E5A8C), kinds as today. Names and dates are examples from the QA Trip.
