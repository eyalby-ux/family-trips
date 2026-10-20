# Beta 0.9.1 (Trivia) — summary for the QA agent (live session with the Product Owner)

**Build:** `0.9.1-9c7691fb` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.8.2-0f740d93`). Settings → אודות shows the exact build; if the phone shows an older one, close and reopen the app or clear the site's data.
**Scope:** Trivia only — `game-thailand-trivia`, now "טריוויה על היעד": an AI-built question deck per trip, played reveal-and-self-judge (the app never grades an answer). Bingo (`0.9.2`) and Pantomime (`0.9.3`) are **not** in this build. Developer's report: `docs/versions/V7/0.9.1/IMPLEMENTATION_REPORT_V1.md`; scope: `FAMILY_TRIPS_GAMES_INTERACTIVE_SCOPE_V1.md` (`V11`); mockup `MOCKUP_GAMES_TRIVIA_V1`.
**Test at 360 and 390px, on a real phone.**

## What is on the QA Test Trip
Destination Spain; a deck of 10 questions is already built (the developer's own test builds) — rebuilding replaces it. The trip "תאילנד 2027" also exists and has a destination but **no deck yet**: use it for the empty / first-build state. To see the "no destination" state, create a throw-away trip without a destination (delete it afterwards).

## Before you start — the AI quota
Every **build** (and "build again") is a real AI call and uses **one of the 10 daily calls** the account shares with document scanning (Smart Import). The developer used about 4 today (the count is per day). Playing, "שחקו שוב", reloading and offline play cost nothing. If the quota runs out the message is "מכסת הניתוח היומית הסתיימה." — expected, not a bug.

## What to check (expected results)
1. **Catalog** — משחקים ופעילויות: the game is titled **"טריוויה על היעד"** (not "…תאילנד") in every trip, old and new. The filter row **"הכול · ★ · 10 דקות · בנסיעה · לכולם" is ONE line**, the favourites filter is a **star** (tap → favourites only, star filled). At a very large phone text size the row may scroll sideways instead — it must never wrap or overlap.
2. **First build, "תאילנד 2027"** — the game page shows "עדיין לא נבנתה טריוויה לטיול הזה", the description and facts, and an enabled **"בנה טריוויה"**.
3. **Building** — tap it: the app's own swaying palm, "בונים טריוויה…", three rotating phrases (one names a hotel/activity from the trip, shortened if long), "זה יכול לקחת כמה שניות" — about 8–15 seconds. **The screen must not become wider than the phone** (the earlier bug) and the header must stay in place. On success: toast "הטריוויה מוכנה", the page shows "10 שאלות מוכנות" and **"התחל משחק"** + **"בנה טריוויה מחדש"**.
4. **Content** — questions are in Hebrew, kid-friendly, about places / culture / daily life of the destination, some about the trip's own hotels / activities; no dates or statistics trivia; no question reveals its answer.
5. **Play** — "התחל משחק": one question at a time ("שאלה N/10"), shuffled, none twice. **"הצג תשובה"** reveals, in place: the answer, **a short explanation** (1–2 simple sentences) and a **"קראו עוד על <answer>"** link (opens a Hebrew Wikipedia *search* for the answer in a new tab). Then **"מי ענה נכון?"**: a chip per active participant with a running score; tap = counted, tap again = taken back; several or none is fine. The button reads "השאלה הבאה", and "לסיכום" on the last question.
6. **End screen** — "סיימתם את הסיבוב!", the tally high → low (🥇🥈🥉 for the top ranks that scored, ties share; no medal for zero). **"שחקו שוב"** (primary): a new order, empty scores, **instant — no palm, no AI call**. **"בנה טריוויה מחדש"** (secondary): a real rebuild.
7. **Rebuild** — rebuild 2–3 times: each deck should be **new** (no repeated or near-repeated questions across decks; some thematic neighbours are acceptable). If a deck comes back shorter than 10 you get a toast saying fresh material is running low — acceptable, report how often. Rebuilding **in the middle of a game** asks for confirmation first (it wipes that game's tally).
8. **Offline** — with a deck built, airplane mode: the game page and play work fully. "בנה טריוויה מחדש" offline gives a clear message (needs a connection) and leaves the deck alone.
9. **Persistence / sync** — reload the app, and (if you have a second device) open the trip there: the deck and score survive; "המשך משחק" appears for a game in progress.
10. **No destination** — in a trip without a destination "בנה טריוויה" is **visible but disabled**, with "הוסיפו יעד לטיול כדי לבנות טריוויה" under it; adding a destination enables it.
11. **Regression** — the other five games open as before (no new fields); document scanning (Smart Import) still works (it shares the quota); the Documents / Tasks screens from `0.8.x` unchanged.

## Not exercised live by the developer — please cover
Check 10 (the gate in a real trip without a destination), check 8's offline *build* message, a failed build (e.g. mid-build connection loss), and the quota-exhausted message. The "top-up call" (when the first AI answer repeats history) was tested with a mocked AI only.

## Known limits — do not report as new
- "קראו עוד" is a **Wikipedia search**, not a hand-picked article (deliberate: a link the AI writes can be dead or wrong); it needs a connection.
- A deck built **before** the explanation change has no explanation text, only the link — rebuild to get explanations.
- A repeated *answer* counts as a repeat when building (even for a different question), so a small destination can yield a slightly short deck.
- 10 questions per build is a placeholder number (scope item, still open).
- Medals follow podium ranking (1, 1, 3 for two winners).
- Bingo, Pantomime, and a "write your own question" screen do not exist yet / are out of scope.
- Not Production: `0.9.1`'s own acceptance GO triggers its promotion.

## After the session
No cleanup needed (a rebuild replaces the deck). Delete the throw-away no-destination trip if you made one.
