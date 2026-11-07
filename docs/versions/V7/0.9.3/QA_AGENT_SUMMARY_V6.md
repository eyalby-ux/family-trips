# Beta 0.9.3, sixth build — summary for the QA agent (P93-P7 rebuild path, 360px title)

**Build to test:** `0.9.3-3a11a6d1` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.2-87f38cd2`). Settings → אודות shows the build; if it shows an older `0.9.3-…`, close and reopen the app or clear the site's data. Real phone, 360 and 390px.
**What this build is:** the two items QA listed as blocking promotion in `QA_RESULTS_0_9_3_BUILD3.md` — **P93-P7 (P93-F4)** and the **360px title** — on top of everything in the earlier builds.

## 1. P93-P7 — rebuild path on the participants sub-page (PO decision 2026-11-07 14:09)
**"שמירה והתחלה" is gone from every sub-page.** The sub-page never starts a game. Its button has two states, decided by whether the **saved deck holds enough** for the chosen number:
- **Enough** (Trivia: saved questions ≥ chosen questions; Pantomime: saved phrases ≥ chosen players × rounds; Bingo has no deck): button **"שמירה"**. It saves and returns to the game page, **without any AI call**. If the choice changed, the game is re-dealt but **not started** — the game page then offers "התחל משחק"; if nothing changed, a game in progress is left alone.
- **Not enough:** a line above the button reads **"לכל השאלות צריך 15 — המשחק הנוכחי מכיל 5"** (Pantomime: "לכל הסיבובים צריך 25 — המשחק הנוכחי מכיל 15"; with no deck at all: "עדיין לא נבנה משחק לטיול הזה"), and the button reads **"שמירה ובניית משחק חדש"**. It **saves the choice, then rebuilds** (the palm, one AI call) with the saved number; when the build ends you land on the game page with the new deck and "התחל משחק" (it is not auto-started). The rebuild button is disabled, with the usual hint, when the trip has no destination. A rebuild asks to confirm only if a game is in progress (its progress would be lost).
- **Main page:** the "לכל השאלות צריך N — בנו מחדש" / "לכל הסיבובים צריך N — בנו מחדש" note stays, so the rebuild is reachable without reopening the sub-page.
- **Back arrow:** discards the change.
**Re-test Test 9:** Trivia with a saved deck smaller than the number you pick (e.g. rebuild at 5 first, or use a trip whose deck is smaller) → pick 15 → the line + "שמירה ובניית משחק חדש" → tap → palm → the game page says "15 שאלות מוכנות" and the game has 15 questions. Also try picking a number the deck already covers → button "שמירה", no palm.

## 2. 360px — the sub-page header
The title now wraps instead of being cut: "משתתפים וסיבובים" (Pantomime), "משתתפים ושאלות" (Trivia), "משתתפים" (Bingo) all fit, at 22 px (the main game pages keep their size). Check all three at 360px.

## 3. PO's final wording (2026-11-07 14:13) — no change needed
The summary line already reads "N משתתפים × N תורות לכל משתתף = סה"כ T סיבובים למשחק" for two or more rounds (e.g. "3 משתתפים × 3 תורות לכל משתתף = סה"כ 9 סיבובים למשחק"). With **one** round the build still reads "תור 1" ("… × תור 1 לכל משתתף = …") — the PO's earlier example; **confirmed by the PO (2026-11-07): "תור 1" stays.**

## Developer's live check on this build (qa, QA Test Trip, 5 participants, **360px**)
Build id correct. Titles: "משתתפים וסיבובים" and "משתתפים ושאלות" fit on one line (28 px high, not cut, no horizontal overflow). Trivia (20-question deck): picking 20 or 10 → button "שמירה", no shortage line. Pantomime (15-phrase deck): 5 players × 5 rounds → the line "לכל הסיבובים צריך 25 — המשחק הנוכחי מכיל 15", button "שמירה ובניית משחק חדש", no overflow; back arrow left the saved values unchanged; 2 players × 5 rounds (10 ≤ 15) → "שמירה". **Real rebuild through the new button:** saved 5 rounds, the palm showed, then the game page: "25 ביטויים מוכנים", rows "5 מתוך 5 משתתפים" / "5 — סה"כ 25 סיבובים", button "התחל משחק" (one AI call). **Not exercised live:** the Trivia rebuild itself (same handler, shared code), a second device, a real phone.

## QA trip state after my check
Everybody plays in Pantomime (**5 rounds, 25 phrases** — rebuilt), Trivia (**everybody, 10 questions**, 20-question deck saved) and Bingo (everybody). מזכיר לי is still in the **song** mode (I changed it earlier and do not know the previous mode).

## Still open (not testable by the developer)
Test 9 (Trivia rebuild at 15) re-run; a phone check of the three sub-page titles; onboarding was run by QA; reduce motion removed by the PO.

## Known limits — do not report as new
- Saving a changed choice re-deals the game (an unstarted one); a game in progress is replaced only when the choice changed.
- "1 משתתפים" in Pantomime's summary line while fewer than two are ticked.
- Everything under "Known limits" in the earlier briefs.
