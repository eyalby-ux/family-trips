# Beta 0.9.3, fifth build — summary for the QA agent (P93-P5 song links, P93-P6 participants in Bingo and Trivia)

**Build to test:** `0.9.3-3f65090a` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.2-87f38cd2`). Settings → אודות shows the build; if it shows an older `0.9.3-…`, close and reopen the app or clear the site's data. Real phone, 360 and 390px.
**What this build is:** the two remaining planning items from `QA_RESULTS_0_9_3_BUILD2.md` — **P93-P5** and **P93-P6** — on top of everything in the earlier builds (`QA_AGENT_SUMMARY_V3.md`: R-4 wording and **P93-F3** trip deletion; `QA_AGENT_SUMMARY_V4.md`: Pantomime participant selection). Those briefs' items are still to be run.
Quota: nothing in this build calls the AI by itself; only **rebuilding** the Trivia deck does (one call).

## 1. P93-P5 — song links (מזכיר לי)
On the **song** suggestion card, under the title and artist, two buttons: **Spotify** and **YouTube** (screen-reader names "חיפוש ב-Spotify" / "חיפוש ב-YouTube"). Each opens a **search** for "title artist" in a new tab (`open.spotify.com/search/…`, `youtube.com/results?search_query=…`). The link is built by the app from the suggestion — **the AI never makes a link**. The word card has no links.
**Check:** with a song suggestion on screen (switch to the song mode; no new AI call needed if one is saved) — both buttons are 44 px high, side by side, no horizontal scroll at 360/390px; tap each: the search page opens with the right song; try a title with an apostrophe, an accent or an ampersand if one comes up; **replace the suggestion** and confirm the links follow the new song.

## 2. P93-P6 — participants (and Trivia's number of questions) for every relevant game
The same entry rows and the same sub-page as Pantomime (`QA_AGENT_SUMMARY_V4.md`), now also in:
- **Bingo** — one row **משתתפים** ("N מתוך M משתתפים") on the game page. Sub-page **"משתתפים"**: "מי משחק?" checklist, "בחירת כולם", the summary "N משתתפים — לכל משתתף לוח משלו", button **"שמירה"** (it only saves and returns; no rounds option, by the PO's decision). Minimum **one** participant ("בחרו לפחות משתתף אחד."). In the game, **only the chosen participants have a board** in the participant carousel; a participant who is not chosen keeps their boards and photos untouched and returns when chosen again.
- **Trivia** — two rows: **משתתפים** and **כמה שאלות במשחק** ("10 שאלות"). Sub-page **"משתתפים ושאלות"**: the checklist, the number of questions **5 / 10 / 15 / 20** (default 10), the summary "N משתתפים · Q שאלות במשחק", and "**שמירה והתחלה**" (saves and starts a fresh game when a deck exists, otherwise "שמירה"). In the game only the chosen participants appear as answer chips, in the tally and as winners; the game has exactly Q questions ("שאלה n/Q").
- **A Trivia rebuild asks the AI for Q questions** (server limit 5–20). If the saved deck is **smaller** than Q the page says "לכל השאלות צריך Q — בנו מחדש" and the game simply uses what exists; if it is larger, a game uses Q of them.
- **Not in scope (PO, 09:34):** 20 שאלות and מזכיר לי have **no** participants choice.
- As in Pantomime: the back arrow discards; leaving the game closes the sub-page; the choice is saved with the game and syncs; "everybody ticked" keeps following the trip (later additions join), a partial choice is a fixed list and deactivated participants drop out.
**Check:** Bingo — pick two participants, save, open the game: the carousel shows only those two; boards of the others are still there after "בחירת כולם". Trivia — pick 3 participants and 5 questions, "שמירה והתחלה", play: 5 questions, 3 chips, a 3-row tally; then 15 or 20 with the 10-question deck: the "בנו מחדש" note appears; rebuild once and confirm the count (15/20 questions).

## Developer's live check on this build (qa, QA Test Trip, 5 participants, 375px)
Trivia: rows "5 מתוך 5 משתתפים" / "10 שאלות"; sub-page "משתתפים ושאלות", chips 5 10* 15 20 (44 px), summary "5 משתתפים · 10 שאלות במשחק"; 3 participants + 5 questions: summary "3 משתתפים · 5 שאלות במשחק"; "שמירה והתחלה" → played 5 questions with 3 chips each and a 3-row tally. Bingo: sub-page "משתתפים" (no number option, button "שמירה"); 2 chosen → the game page said "2 מתוך 5" and the carousel showed two participants (אייל, פאולה), no overflow. Songs: the saved song "Gracias a la Vida — Mercedes Sosa" showed both buttons (44 px) with the correct search URLs, `target=_blank`, `rel=noopener noreferrer`. **The QA trip was restored** (Trivia and Bingo: everybody, Trivia 10 questions). Note: switching to the song mode to see the card set the מזכיר לי mode to **song**. **A bug was found and fixed during this check:** the Trivia and Bingo rows first did nothing (the sub-page only opened for Pantomime). **Not exercised live:** a Trivia rebuild with 15/20 (no AI call was spent), a second device, 360px, a real phone, opening the Spotify / YouTube pages themselves.

## Still open (not testable by the developer)
`V3` items (**P93-F3** trip deletion with an owned trip), `V4` items (Pantomime selection on a phone), onboarding with a brand-new account, reduce motion (removed by the PO), the phone check of songs.

## Known limits — do not report as new
- The Spotify / YouTube buttons open a **search**, not the song itself (PO decision); an invented song simply finds nothing.
- Trivia's "שמירה והתחלה" replaces a game in progress with a fresh one (as in Pantomime).
- "1 משתתפים" in Pantomime's summary line while fewer than two are ticked.
- Everything under "Known limits" in the earlier briefs.
