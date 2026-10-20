# Beta 0.9.1 (Trivia) — summary for the QA agent, V2 (re-test after the first PO session)

**Supersedes `QA_AGENT_SUMMARY_V1.md`** (kept for history). **Build to test:** `0.9.1-a44ba098` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.8.2-0f740d93`). Settings → אודות shows the exact build; if the phone shows an older one, close and reopen the app or clear the site's data. Test at **360 and 390px, on a real phone.**
**Why a second round:** the first PO session (`PO_SESSION_RESULTS_V1.md`, build `0.9.1-9c7691fb`) passed Tests 1 (title) and 2–11 and asked for two changes (P91-F1, P91-F2); the PO then also decided to merge two games (P91-P2). All three are in this build. **Everything the PO already passed is unchanged**, so this round is a focused re-test of what changed plus a short regression.

## What changed since the first session (re-test these)

1. **P91-F1 — the games filter row is icons.** On "משחקים ופעילויות" the row stays **ONE line**: **"הכול"** (text) · **★** מועדפים · **clock with a bold "10"** (10 דקות) · **car seen from the side** (בנסיעה) · **group of three people** (לכולם). Each icon chip is a 44px target and is named by its text for screen readers (long-press / hover shows the tooltip). Check: the icons are recognisable and the clock's "10" is legible; each filter works (★ → only favourites, filled when selected; the others list the matching games; "הכול" → all five); nothing wraps, overlaps or scrolls; the page does not become wider than the phone. (Design: artifact "Filter row icons — 0.9.1 catalog".)
2. **P91-F2 — the link under a revealed answer reads just "קרא עוד".** No repeated answer, no missing space. Tapping it opens a **Hebrew Wikipedia search for the answer** in a new tab. (Its spoken name for screen readers is "קרא עוד על <answer>".)
3. **P91-P2 — "20 שאלות" and "מי אני?" are now ONE game, "20 שאלות".** The catalog lists **five** games (טריוויה על היעד, 20 שאלות, בינגו שדה תעופה, ציד תמונות, סיפור בהמשכים) — **no "מי אני?"**. The "20 שאלות" page reads: "אדם אחד בוחר אדם, דמות, מקום או חפץ. האחרים שואלים שאלות כן/לא — עד 20 שאלות, או עד שמישהו מנחש.", 3 ומעלה, 10–20 דקות, ללא ציוד. It is still a plain activity page ("התחל פעילות"), not an in-app game. **Saved trips:** the old "מי אני?" entry disappears on first load; a ★ the family had put on it moves to "20 שאלות"; a family's own custom rules text on "20 שאלות" is kept. On the QA trip the merge has already been applied.

## Short regression (unchanged since the first session — PASS then, confirm still PASS)
- **Trivia end to end** (QA Test Trip already has a deck; "תאילנד 2027" has none): first build with the palm (no page overflow on the building screen), question → "הצג תשובה" → answer + short explanation + link → "מי ענה נכון?" chips (tap / tap again) → "השאלה הבאה" / "לסיכום" → end tally with medals → "שחקו שוב" (instant, no AI) → "בנה טריוויה מחדש" (rebuild asks to confirm mid-game).
- **Offline:** a built deck plays without a connection; an offline rebuild gives a clear message and keeps the deck. **Persistence:** "המשך משחק" after reopening. **No destination:** a trip without a destination shows "בנה טריוויה" visible but disabled, with "הוסיפו יעד לטיול כדי לבנות טריוויה".
- Other games open as before; Documents and Tasks unchanged from `0.8.2`.

## AI quota — read before building
Every **build / "build again"** is a real AI call and uses **one of the account's 10 daily calls**, shared with document scanning (Smart Import). The developer used about 4 on the day of the first session; the count resets daily. Playing, "שחקו שוב", reloading and offline play cost nothing; none of the three changes above uses the AI. If the quota runs out: "מכסת הניתוח היומית הסתיימה." — expected.

## Not exercised live by the developer — please cover if you can
- The filter row **at 390px and at a larger phone text size** (measured only at 360px: one line, no scroll). At very large text sizes the row may scroll sideways instead of wrapping — it must never overlap.
- Tapping through the "20 שאלות" page on a real phone; the merge on a trip that had a starred "מי אני?" (verified in a test, not on a real saved trip).
- The failed / interrupted build message, the quota-exhausted message, and the top-up call against the real model (mocked only).

## Known limits — do not report as new
- "קרא עוד" is a Wikipedia **search**, not a hand-picked article (deliberate: an AI-written link can be dead); it needs a connection. A deck built before the explanation feature has no explanation text — rebuild to get one.
- A repeated *answer* counts as a repeat when building, so a small destination can give a slightly short deck (a toast says so). 10 questions per build is a placeholder number.
- Medals use podium ranking (1, 1, 3 for two winners).
- **Not in this build (planning items):** a winner animation for every game (P91-F3), Bingo categories "בדרכים" / "מסעדות" and removing "ציד תמונות" (P91-P1), the Bingo and Pantomime games themselves (`0.9.2` / `0.9.3`).
- The PO's decision on the first build was NO-GO; this build replaces it for a fresh acceptance. Not Production: its own GO triggers any promotion.

## After the session
No cleanup needed (a rebuild replaces the deck; the merge is permanent for the trip). Delete any throw-away trip you created.
