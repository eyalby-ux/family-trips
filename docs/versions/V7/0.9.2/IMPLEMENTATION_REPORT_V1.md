# Beta 0.9.2 — Bingo + shared winner animation + Trivia patch: implementation report (for independent verification)

**Build:** `0.9.2-e03d0d3d` on `qa` (`https://qa--familytripz.netlify.app`) — **not promoted**. Branch `version/V7`. (`374bb57` after it changes only a test pin; the deployed code is identical.)
**Kickoff:** `PROMPT_FOR_CLAUDE_CODE_0_9_2_BINGO_KICKOFF_V1.md` · scope `FAMILY_TRIPS_GAMES_INTERACTIVE_SCOPE_V1.md` (`V12`, md5 `6057fb5c…`) · plan `V177`.
**Gate:** `npm run check` green (syntax, whole suite, production build); new `tests/beta-0-9-2.mjs` (13 tests); older pins updated where this round changes a signature (`triviaPlaying` → `gamePlaying`, the carousel's `scope` argument).

## Commits (the Trivia patch is its own commit, separate from Bingo)
| Hash | What |
|---|---|
| `134d6b5` | Section 0 — plan `V177` committed (repo was `V165`) |
| `6ae26ee` | **Trivia patch (P91-F3, §7a):** the shared winner-animation component (`src/winner-animation.js`, CSS, `fireWinner`) wired into Trivia's per-round scoring tap |
| `8488d45` | **Bingo (§2–§6, §8):** `src/bingo.js` (themes, boards, lines, completions), `src/image-utils.js`, the UI, the migration, the cleanup in `cloud-store.js`, CSS, tests |
| `e03d0d3` | Bingo cells grow instead of clipping a long label (found on the first live look) |
| `374bb57` | test pins for that |

## Shared winner animation (P91-F3)
One pure module builds the markup (`winnerHtml`), `fireWinner` mounts it on a host outside `#app` (so `render()` cannot wipe it, it never blocks a tap, it removes itself after 2.4 s / 3.8 s for the full board). **Four directions, picked at random every time** — confetti burst, falling stars, a pulsing medal, animated burst lines — **the winner's name in the middle** (escaped, in a `<bdi>`), an optional caption. `prefers-reduced-motion` hides the moving layer and keeps the named card. Direction and name are asserted in tests (each direction forced and rendered; random pick covers all four; name escaped).
- **Trivia (live-verified):** a point given → the animation naming that participant; taking the point back → no new one; the 0.9.1 scoring lines are untouched (asserted).
- **Bingo (live-verified):** finishing a row fired "שורה הושלמה!" naming the participant; the full board is the bigger one ("הלוח הושלם!", `big`); `celebratedLines` stops a replay (tested with a full walk of 16 photos: each of the 9 lines celebrates exactly once).
- **Not built:** the old bespoke highlight sweep (superseded, as the kickoff says). Pantomime (`0.9.3`) can call `fireWinner` directly.

## Bingo — what is built
Six themes (airport, beach, city, hotel, onTheRoad, restaurant), 16 spots each, content verbatim from the kickoff (distinct labels asserted). Picker of six tiles, last theme remembered (`activeTheme`), a visible "החלפת מקום" control, the **existing `participantCarousel()`** (now with a `scope` so Bingo's selection never touches Packing's view), a lazily created shuffled 4x4 per (theme, participant), found state strictly per participant, rows/columns/board only (no diagonals), a per-(theme, participant) reset with the house `confirm()`. Photos: camera input `accept="image/*" capture="environment"`, shrunk client-side (long side 1280 px, JPEG), uploaded through the existing `uploadAttachment`, the found cell shows the real photo.

### Migration backfill — actual before / after (from the test, same function the live app ran on the QA trip)
Before: `{"id":"game-airport-bingo","title":"בינגו שדה תעופה","instructions":"חפשו מזוודה אדומה, …","items":"פתק או טלפון",…,"favorite":true,"started":true,"spots":[{"id":"old1",…}],"bingoState":{"found":["old1"]}}` plus a saved `game-photo-hunt` (starred).
After: title **"בינגו לפי מקום"**, `interactive:true`, new instructions / items, `themes` = six keys × 16 spots, `boards:{}`, `celebratedLines:{}`, `activeTheme:''`; **`spots` and `bingoState` are gone (overwritten, not merged)**; `favorite`/`started`/`id` kept; **`game-photo-hunt` is removed from the saved games** (not just from `BUILTIN_GAMES`), game ids after: `["game-airport-bingo","game-road-story","game-20-questions","game-thailand-trivia"]`; **no star carried over** (a starred ציד תמונות with an unstarred Bingo leaves Bingo unstarred — tested; the opposite of 0.9.1's מי אני → 20 שאלות, as specified). Idempotent; played boards, the last theme and a family's own text survive; a bad `activeTheme` is cleared; per-trip copies are `structuredClone`d. Live on `qa`: the catalog showed four games, `ציד תמונות` gone, Bingo titled "בינגו לפי מקום".

### Photo display — `getBytes`, not `getDownloadURL`
`hydrateBingoPhotos()` uses `downloadAttachment(path,'image/jpeg')` (→ `getBytes` → Blob → object URL); a regression test fails if `getDownloadURL` appears in executable code of `v5-app.js`, `bingo.js` or the game-content client, and checks `downloadAttachment` itself still calls `getBytes`. Live: after a full reload all 4 uploaded photos came back from Storage and rendered (no `missing`).

## What didn't check out against source / scope notes (please verify)
1. **The scope's Storage path is refused by `storage.rules`.** The scope/kickoff say `trips/{tripId}/games/{gameId}/{theme}/{participantId}/{spotId}.jpg`, but `storage.rules` allows only `trips/{tripId}/sources/{sourceId}/{fileName}` and denies everything else (`match /{allPaths=**} … if false`). There is no `firebase.json` in the repo, so rules are deployed by hand. **Decision made, to be confirmed:** photos are stored inside the existing layout at `trips/{tripId}/sources/bingo_{theme}_{participantId}/{spotId}.jpg` — no rules change, works on `qa` and Production alike (live-verified: a real upload, a real download after reload, and a real delete). If the scope's path is wanted, a rules change must be deployed by the Product Owner and the one function `bingoPhotoLocation` changed.
2. **Trip cleanup had to be extended.** `deleteAllAttachments` ("delete trip data" / "delete trip") reads known paths from the `sources` records; Bingo photos have no such record, so they would have been orphaned. It now also sweeps every `photoPath` on the game's boards (tested by source). The admin account deletion already sweeps the whole `trips/{id}/` prefix.
3. **No old `spots` / `bingoState` ever existed on the saved record** (the built-in definition carried only the instruction text — same finding as Trivia's "static bank"); the backfill still deletes them if present.
4. **Mockup deviations:** no emoji (✈️/🏖️… → the app's icon set; three icons added: camera, beach/umbrella, city), cell labels are 11 px (the mockup's 8.5 px fails legibility) and **a cell grows rather than clips** a long label (the "(לדוגמה …)" items), so rows are not always perfectly square.
5. **Bingo is not tagged "בנסיעה"** (it was not before; ציד תמונות was). The new "בדרכים" theme lives inside a game that does not appear under that filter — tell me if it should.
6. **Not exercised live:** the real device camera sheet (the test fed a generated JPEG through the same file input and `change` handler); a failed / offline upload (guarded: offline taps explain, a failure marks nothing — source-asserted); `prefers-reduced-motion` rendering; the full-board (big) animation on a real phone; the winner animation's visual quality at 360 px (judged only structurally — please look at all four).
7. **`P91-P2`-style carryover is NOT used here**, as the kickoff says. QA trip state after my testing: Bingo beach board for Eyal was reset (no photos left in Storage); the Trivia game shows a replayed round with two points.
8. The `gamePlaying` rename (was `triviaPlaying`) now means "which game's play screen is open" for both games.
