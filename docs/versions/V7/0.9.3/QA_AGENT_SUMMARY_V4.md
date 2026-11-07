# Beta 0.9.3, fourth build — summary for the QA agent (P93-P4 participant selection, wording)

**Build to test:** `0.9.3-af9b7dc6` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.2-87f38cd2`). Settings → אודות shows the build; if it shows an older `0.9.3-…`, close and reopen the app or clear the site's data. Real phone, 360 and 390px.
**What this build is:** (1) **P93-P4** — choosing which participants play Pantomime, built from the PO's chosen design (**Option 2a + 2b**, canvas `M6RbK8RyX3FyjJhwM3HrvY`); (2) the PO's new wording of the summary line; (3) it **includes the third build's fixes** (R-4 wording, P93-F3 trip deletion), whose re-test brief is `QA_AGENT_SUMMARY_V3.md` — still to be run. **Not built:** P93-P5 (Spotify / YouTube links), P93-P6 (participants in Bingo / Trivia, Trivia question count).

## 1. The summary line (PO, 2026-11-07)
- One round each: **"N משתתפים × תור 1 לכל משתתף = סה"כ N סיבובים למשחק"**.
- More than one round: **"5 משתתפים × 5 תורות לכל משתתף = סה"כ 25 סיבובים למשחק"** (the number of turns is plural: "2 תורות", "3 תורות" …).
It appears on the participants-and-rounds sub-page (below). The deck note on the game page now says "לכל **הסיבובים** צריך T — בנו מחדש" (it said "התורות").

## 2. P93-P4 — who plays (Option 2)
**Game page (Option 2a).** The inline rounds buttons are gone. Under the facts there are **two entry rows** that look like Settings rows, each with a chevron:
- **משתתפים** — sub-line "**4 מתוך 5 משתתפים**" (the design's mock-up says "משחקים", which looks like a typo for "משתתפים"; the build says משתתפים — tell us if the PO meant something else);
- **כמה סיבובים לכל משתתף** — sub-line "**2 — סה"כ 8 סיבובים**".
Tapping either opens the sub-page.
**Sub-page "משתתפים וסיבובים" (Option 2b).** Back arrow; "**מי משחק?**" with the link "**בחירת כולם**"; one row per **active** participant with a checkbox (tap = toggle); "**כמה סיבובים לכל משתתף?**" with 1–5 (all five in one row, 44 px high, no horizontal scroll); the summary line; the button "**שמירה והתחלה**".
**Check:**
- Default: everybody ticked, rounds as last saved (default 2). The summary line follows every tap.
- **Below two ticked participants** the button is disabled and "בחרו לפחות שני משתתפים." shows. ("1 משתתפים" in the summary line at that moment is a known wording glitch.)
- **Back arrow discards** the changes; the rows on the game page keep their old values. Leaving the game (any other tab) also closes the sub-page.
- **"שמירה והתחלה"** saves the choice **and starts a new game at once** (a game in progress is replaced by a fresh one with the new players and rounds). With no deck built yet the button reads "שמירה" and returns to the game page.
- **In the game only the chosen participants take part:** only they act (the order rule P93-P1 applies to them: first lap random, then the same order repeats; two chosen players alternate), only they appear as guessers (the actor is never among them) and only they are in the final tally and the winner animation. A participant who was not ticked never appears.
- **Turns = chosen players × rounds**; the progress reads "ביטוי n/T". A **rebuild** asks the AI for as many phrases as that needs (never fewer than 12): changing players or rounds can make the saved deck too short — the page then says to rebuild and a game just uses what exists.
- The choice is **saved with the game** and syncs: reload / second device show the same "N מתוך M משתתפים". If **everyone** is ticked the game keeps following the trip (a participant added later joins automatically); a partial choice is a fixed list, and a participant who is later deactivated in Settings simply drops out.
- Trivia, Bingo and the other games are unchanged.

## Developer's live check on this build (qa, QA Test Trip, 5 participants, 375px)
Entry rows show "5 מתוך 5 משתתפים" and "5 — סה"כ 25 סיבובים"; the sub-page lists the five participants checked; "בחירת כולם" restores all; with 2 left the line reads "2 משתתפים × 5 תורות לכל משתתף = סה"כ 10 סיבובים למשחק"; with 1 left the button is disabled and the hint shows; chips 54×44 px, no overflow. **Played** 2 chosen players × 2 rounds: 4 phrases, actors אייל, פאולה, אייל, פאולה, the single chip each time is the other player, the tally lists only the two. After saving, the game page showed "2 מתוך 5 משתתפים" / "2 — סה"כ 4 סיבובים"; reopening the sub-page showed the saved selection; the back arrow discarded a change. **I restored the QA trip's Pantomime to everybody, 5 rounds** (the PO's earlier setting). **Not exercised live:** a participant deactivated in Settings mid-way, a second device, 360px, a real phone, an unbuilt-deck trip.

## Still open (not testable by the developer)
`QA_AGENT_SUMMARY_V3.md` items (R-4 wording as superseded above; **P93-F3** trip deletion with a trip the account owns); onboarding with a brand-new account; reduce motion (removed by the PO); the phone check of songs.

## Known limits — do not report as new
- A new game starts when "שמירה והתחלה" is tapped (by design); to continue a game in progress, leave the sub-page with the back arrow and use "המשך משחק".
- "1 משתתפים" in the summary line while fewer than two are ticked (the button is disabled then).
- Everything under "Known limits" in `QA_AGENT_SUMMARY_V2.md` and `V3`.
