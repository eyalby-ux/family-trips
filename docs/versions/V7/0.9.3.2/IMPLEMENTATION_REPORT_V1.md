# Beta 0.9.3.2 — two Bingo content items (implementation report)

**Build:** `0.9.3.2-bab21112` on `qa` only (Production runs `0.9.3.1-2a4890e4`). Commit `bab2111` on `version/V7` (the two strings plus the version bump in `package.json`). Kickoff: `PROMPT_FOR_CLAUDE_CODE_0_9_3_2_BINGO_CONTENT_CORRECTION_KICKOFF_V1.md` (planning handoff folder). Full gate green (syntax checks, all tests, production build).

## What changed
In `src/bingo.js`, `BINGO_THEMES`:
- `zoo`, 8th entry (`zoo-8`): "ציפור צבעונית" → **"ציפור בתעופה"**
- `nature`, 13th entry (`nature-13`): "טביעות כפות בבוץ" → **"שורש עץ בולט מהאדמה"**

**Confirmation that nothing else changed:** I compared the old and the new `BINGO_THEMES` programmatically for every theme (label, `inLabel`, icon, number of spots, every spot id and label): the only differences are exactly those two labels (`nature-13`, `zoo-8`). Both pools still have 16 items.

## Answer to item 4 (ids)
Confirmed: `pool()` derives each id from the theme key and the array position (`` `${key}-${index+1}` ``), not from the text, so `zoo-8` and `nature-13` are unchanged and saved board layouts keep working, showing the new label. No migration or backfill needed. (Existing trips pick the new labels up on load: `backfillBingo` re-copies the shipped `BINGO_THEMES` into the game; boards, found spots and photos are stored by id and are untouched.)

## Tests
No test pins the old strings (only `src/bingo.js` and the old 0.9.2 documents mention them), so no test changed; no new test was added, as the kickoff expected.

## Live check on `qa`
The served bundle contains both new strings and neither old one. Not exercised: opening the Nature / ZOO boards in the app.

## Not promoted
`0.9.3.2` is on `qa` only. Commits `bab2111` (and this report) need the usual push from the Product Owner's machine: `git push origin version/V7`.
