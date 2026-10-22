# Beta 0.9.2 (Bingo + winner animation) — summary for the QA agent, V2 (re-test after the first PO session)

**Build to test:** `0.9.2-87f38cd2` on `https://qa--familytripz.netlify.app` — qa only, **not** Production (Production runs `0.9.1-a44ba098`). Settings → אודות shows the exact build; if the phone shows an older one, close and reopen the app or clear the site's data. **Real phone, 360 and 390px.**
**Why a second round:** the first PO session (`PO_DECISIONS_0_9_2.md`, `QA_AGENT_SUMMARY_0_9_2.md`, build `0.9.2-e03d0d3d`) was a NO-GO with one finding (P92-F1) and several requests. Everything below is in this build. Developer's report: `IMPLEMENTATION_REPORT_V1.md` (same folder). Scope: `FAMILY_TRIPS_GAMES_INTERACTIVE_SCOPE_V1.md` (`V12`).

## What changed since the first PO session — re-test these

1. **P92-F1 — Today: the suggested game opens directly.** On "היום" the card under "אין תכניות" is now **two identical rows** (icon, chevron, same 286×64px): the suggested game ("הצעת משחק ליום פנוי", the suggestion varies with favourites) and **"כל המשחקים"**. Tap the first → that game's own page; the second → the catalog. Both must look the same size (PO feedback: symmetrical).
2. **The camera opens on the REAR camera.** Tapping an empty Bingo cell (or "החלפת תמונה") now opens **the app's own viewfinder**: full screen, "ביטול" · round shutter · "הפיכת מצלמה" (flip rear/front). **The first time the browser asks permission to use the camera — accept.** Check: it opens on the **main (rear) camera**, not the selfie one; the flip button switches; the shutter takes the photo, the viewfinder closes, the cell becomes found; "ביטול" and the phone's Back gesture close it without taking a photo. If camera permission is refused, the device's own camera picker opens instead, with the message "אין גישה למצלמה באפליקציה — נפתחת מצלמת המכשיר."
3. **Offline play.** With the connection off (airplane mode) tapping a cell and taking a photo **works**: the cell is found at once, a small orange clock badge ("ממתין להעלאה") shows on it, the toast says "התמונה נשמרה במכשיר ותעלה כשיהיה חיבור." (The earlier refusal "צילום ללוח דורש חיבור לאינטרנט" is intentionally gone — the first session's Test 8 expectation is **replaced**.) Turn the connection back on: within a few seconds the badge disappears (the photo uploaded). Photos shown once are kept on the device, so a board you opened before also opens offline. A row/column/board completed offline still celebrates.
4. **The enlarged photo.** Tap a **found** cell → the photo opens **full screen** (dark background): the spot's name and the participant's first name on top, the photo as large as possible, and **"החלפת תמונה" / "מחיקת תמונה"** side by side underneath (small buttons, as designed). **Ways to close it: the white "סגירה" button (× + word) at the top, a tap on the photo, the phone's Back gesture, Escape.** (A bug found in this round: the account bar used to cover the close button — it is above it now; please confirm the button is visible and tappable.) **Replace** opens the camera for the same cell and swaps the picture. **Erase** asks "למחוק את התמונה של "…"? …", then the cell returns to unfound and the file is deleted; if that undoes a completed row, finishing it again celebrates again. A photo still waiting to upload says so inside the viewer. Offline: erasing an **uploaded** photo is refused with "מחיקת תמונה דורשת חיבור לאינטרנט"; a never-uploaded one can be erased offline.
5. **Reset (איפוס הלוח)** — as before (confirm text "לאפס את הלוח של <name> <place>? …", photos deleted, reshuffled board). New: offline it is refused only if it would have to delete photos already in the cloud ("איפוס הלוח דורש חיבור לאינטרנט — התמונות נמחקות גם מהענן").

## Passed in the first session — confirm still passing (short regression)
Catalog: **four games** (טריוויה על היעד, 20 שאלות, בינגו לפי מקום, סיפור בהמשכים) — no "ציד תמונות", no "מי אני?" · Bingo opens on an **eight-tile picker** (שדה תעופה, חוף, עיר, מלון, בדרכים, מסעדות, **טבע, גן חיות** — the last two are new, see below); the last place is remembered; a board is 4×4 / 16 cells with "N/16 נמצאו"; each participant has their **own shuffled board** per place · a photo fills its cell · a completed **row or column** plays the winner animation naming the participant (**diagonals do not animate — correct**); the full board plays the bigger one · the filter row on the games page (icons, one line), Trivia (build, play, scoring), "20 שאלות" page, Documents and Tasks unchanged.

## Also new in `0.9.2` (not yet seen by the PO)
- **Two new Bingo places: טבע (Nature) and גן חיות (ZOO)**, 16 items each (leaf and paw icons): עץ גבוה, פרח בצבע בולט, פרפר, נחל או מפל, … and פיל, ג'ירפה, קוף, אריה, פינגווין, … The **item lists are the developer's draft — the PO has not reviewed the wording yet**; please read both lists in full (every item should be one specific thing a family can photograph, none involving a person) and report any to change. Check also: the picker with eight tiles looks balanced, and each new board opens, takes a photo and celebrates like the others.
- **The winner animation in Trivia plays when the ROUND is won — not on each correct answer.** Tapping who answered right shows nothing. After the **last question** ("לסיכום") one **bigger animation, picked at random from four (confetti, falling stars, a medal, burst rays), shows the winner's name in the middle** with "ניצחון בסיבוב!"; a **tie** shows every top scorer's name with "ניצחון משותף בסיבוב!"; **if nobody scored there is none**. Leaving the finished game and coming back must not replay it. Please look at **all four** at full size on the phone (play a few rounds) and confirm the **name is readable in the middle**. With "reduce motion" on, only the named card shows.

## Not exercised live by the developer — please cover
A **real rear camera** and a real **airplane-mode** round trip (the developer simulated both) · replace / erase while offline · the four animations on a phone · "reduce motion" · what happens on a **second phone** while the first has photos not yet uploaded (it shows those cells as found with a placeholder until the upload happens) · a failed upload on a bad connection (the photo stays pending and retries).

## Known limits — do not report as new
- A photo that has **not uploaded yet exists only on the phone that took it**; if that phone's site data is cleared first it is lost (the cell stays "pending" — use replace). Other phones show a placeholder meanwhile.
- Photos are stored at `trips/{tripId}/sources/bingo_{place}_{participant}/…` (PO decision: no storage-rules change).
- The enlarged view's two buttons are 28px high (approved design) with an invisible 44px touch area.
- Diagonals do not complete a line (rows, columns and the full board only).
- Not in this build (planning items): diagonal celebrations, Pantomime (`0.9.3`).
- Not Production: `0.9.2`'s own acceptance GO triggers any promotion. Promoting it also ships the offline photo store and the camera viewfinder (browser-side only; no backend or rules change).

## After the session
Photos taken in tests stay on the QA trip's Bingo boards; use "איפוס הלוח" or the erase button to clean them. No other cleanup.

## QA re-test results — build `0.9.2-87f38cd2` (QA agent, 2026-10-23, 00:17)

Source: `PO_DECISIONS_0_9_2.md` in the same folder (full log).

| # | Check | Result |
|---|---|---|
| R1 | Today: suggested game opens its own page (P92-F1) | PASS |
| R2 | Rear camera opens with flip button | PASS |
| R3 | Offline photo: cell found at once, "ממתין להעלאה" badge | PASS |
| R4 | Enlarged photo: buttons visible and tappable, close works | PASS (replace and erase not run by PO) |
| R5 part 1 | Online reset clears the board as before | PASS |
| R5 part 2 | Offline reset refused when it would delete cloud photos | PASS (PO did not describe the message) |
| R6 | Trivia animation only at end of a round, name in the middle | PASS |
| — | Enlarged-photo buttons on a phone; real rear camera | PASS (PO verdict; individual checks not described) |
| — | Round definition | CONFIRMED by PO: "a round means full set of questions" |
| — | Name appears in the middle of the winner animation | PASS (PO: "yes, it appears") |
| — | Four animations at full size on a phone | Not checked individually: PO: "it doesn't matter, its random" |
| — | Reduce motion | SKIPPED by PO |
| — | Failed upload on a bad connection | SKIPPED by PO |
| — | Second phone with photos not yet uploaded | Not run |

**Change request, moved to 0.9.3 (PO, 00:17):** the Trivia end-of-round winner animation should repeat twice, so it is longer. Not in `0.9.2-87f38cd2`; not checked in 0.9.2.

**Still for the PO:** the Nature and ZOO item lists have not been reviewed in a PO session. The QA agent flagged two close pairs ("ציפור על ענף" and "ציפור צבעונית"; "טביעות כפות בבוץ" may be hard to photograph).

**Round status:** NO-GO on `0.9.2-e03d0d3d` (first session), with P92-F1 and P92-F2 to fix. P92-F2 (Trivia animation after every question) is fixed in `0.9.2-87f38cd2`, as re-tested in R6.
