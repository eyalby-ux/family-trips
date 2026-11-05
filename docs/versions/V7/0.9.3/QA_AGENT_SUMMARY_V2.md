# Beta 0.9.3, second build — summary for the QA agent (re-test)

**Build to test:** `0.9.3-2c4327cb` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.2-87f38cd2`). Settings → אודות shows the exact build; if the phone shows `0.9.3-c2889884`, close and reopen the app or clear the site's data. **Real phone, 360 and 390px.**
**What this build is:** only the changes the Product Owner decided after the first QA round (`QA_RESULTS_0_9_3.md`, `PO_DECISIONS_0_9_3.md`). Everything that passed on `c2889884` is unchanged — the first brief, `QA_AGENT_SUMMARY_V1.md`, still applies for those checks (its Pantomime item 4 and the מזכיר לי text item were updated in place). Developer's report: `IMPLEMENTATION_REPORT_V2_NEXT_BUILD.md`.

## AI quota
A deck rebuild is one of the account's 10 daily AI calls. Picking a number of rounds, playing, "שחקו שוב" and reloading cost nothing. The developer used **one** call on the QA account today (the live check below).

## What to re-test

### 1. P93-P1 — who acts (replaces "random each round, never twice in a row")
Round 1 is a random participant. Every following round it is one of the participants who have **not yet acted**, one per round, until everyone has acted once. Then **the same order repeats** (A B C … A B C …).
- Play a full game and write the names in order: the first lap must contain every participant exactly once, and each later lap must repeat the first lap **in the same order**.
- Two participants alternate strictly (A B A B …).
- **Resume:** leave mid-round, reload, come back: the same participant is named for that round; the phrase is hidden again until they tap. Closing the app between rounds must not change the next actor.
- A game saved by the previous build (no saved order) simply cycles the participants in their list order — expected, not a bug.
- There is still no manual picker; the look-away screen and the "נבחר/ה אוטומטית להציג" badge are unchanged.

### 2. P93-P2 / P93-P3 — rounds per player
- On the Pantomime page (with or without a deck) a row **"כמה סיבובים לכל משתתף?"** offers **1 2 3 4 5**, default **2**, the chosen one highlighted; **44 px touch targets, no horizontal scroll at 360/390px**.
- Under it: "**N משתתפים × R = T תורות במשחק**" (active participants × rounds). Check it for several values and after adding/deactivating a participant (Settings).
- The game has exactly **T turns**: progress reads "ביטוי n/T", everyone acts exactly R times (count the names), and the end screen appears after turn T.
- **Deck size:** a new build requests as many phrases as the turns need (never fewer than 12, at most 40): with 5 participants × 3 rounds a rebuild gives **15**. The page says "N ביטויים מוכנים". If the saved deck is **shorter** than the turns, the page adds "לכל התורות צריך T — בנו מחדש" and a game simply has as many turns as phrases — rebuild to get the full count.
- Changing the number **before a game starts** (or after it ended) re-deals the game at once; **mid-game** it only takes effect from the next play (the game in progress keeps its turns). "שחקו שוב" uses the current number and calls no AI.
- The choice is saved with the game: reload / open on a second device and the same number is selected.
- Trivia is unaffected (still 10 questions per build).

### 3. Test 9 — מזכיר לי instructions text
The game page shows the Product Owner's exact text, word for word: *שני אופנים לשחק: (1) מילים — משתתף ראשון אומר מילה, הבא אומר מילה שמזכירה לו את הקודמת, וממשיכים כך סביב המשתתפים. (2) שירים — משתתף ראשון בוחר שיר ומשמיע אותו, הבא בוחר שיר שמזכיר לו את השיר הקודם (מילה דומה בשם השיר, נושא דומה או מילה דומה משיר) ומשמיע אותו, וממשיכים כך. אם כולם מסכימים, אפשר לדלג לשיר הבא לפני שנגמר השיר הנוכחי, או להמשיך להאזין עד הסוף.* The QA trip already existed with the first draft; it should now show the new text without any action (a one-time update on load). Report any word that differs.

### 4. P93-F1 — Pantomime phrases must not name specific foods or items
**Rebuild the deck at least twice** (each is a quota call) and read **every** phrase. Generic is fine: "שוקו חם", "סלט", "גבינה", "סטייק", "מנגנים בתוף". **Not** fine: a named dish, cheese, pastry, drink or product ("גבינת פטה", "סופלקי", "אמפנדה", "אלפחורס") or any other specific foreign name nobody can mime. Also still no place names (city, landmark, country). Report every offending phrase with the trip's destination (it tunes the prompt; the guard is prompt-only, so a rare slip is possible).

## Developer's live check on this build (qa, 5 participants)
Rounds picker 5/1/3 → text "5 × R = T" correct, chips 38×44 px, no horizontal overflow at 375px; deck of 12 with 3 rounds selected → hint "צריך 15 — בנו מחדש"; one rebuild → 15 phrases; a full game of 15 turns: אייל, עפרי, דניאל, פאולה, עמית, then the same five again, twice more; end screen after turn 15; phrases showed no place names and only generic foods (שוקו חם, סטייק, סלט טרי); one phrase read "מניפים דגל כחול־לבן" (a flag, no name — judge it). מזכיר לי text matched the PO's text exactly. **Not exercised live:** two participants, reload mid-round, the second device, 360px, real phone.

## Still open from the first round (not testable by the developer)
Onboarding with a brand-new Google account; "reduce motion"; the phone check of real songs; confirmation that the throw-away no-destination trip was deleted.

## Known limits — do not report as new
- The food/item rule, like the place-name rule, is a prompt guard only (no list, no external check).
- Changing rounds mid-game does not change the game in progress (by design).
- A deck built before this build keeps its phrases until rebuilt; its game cycles participants in list order until "שחקו שוב".
- Song accuracy is prompt-only (PO decision); the look-away sub-line keeps the mockup's gender-slashed wording.
- Not Production: `0.9.3`'s own GO triggers any promotion, and promoting it also ships the sync fix described in the first brief.
