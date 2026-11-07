# Production promotion rollback record — Beta `0.9.3.3` (Bingo: place on the intro page, "במטוס", content corrections)

**Date:** 2026-11-07
**Action:** Promoting Beta `0.9.3.3` (build `0.9.3.3-5cf52fda`) to Production on the Product Owner's explicit instruction ("promote 0.9.3.3 to production"). Content, all built from the same `version/V7` head (commit `5cf52fd`):
- **`0.9.3.2`** — two Bingo content items: `zoo-8` "ציפור צבעונית" → "ציפור בתעופה", `nature-13` "טביעות כפות בבוץ" → "שורש עץ בולט מהאדמה" (ids unchanged).
- **`0.9.3.3`** — Bingo: the place is chosen on the intro page in a 3 × 3 grid (start disabled until a place is chosen); the game page keeps only the place as text and "איפוס הלוח"; a ninth place **"מטוס" / "במטוס"** (sixteen spots, four of them chosen by the PO: "סלפי עם דייל/ת", "מתחת לכיסא", "אונייה בים", "אי קטן בים"); the new `cloud` icon.
**Acceptance note:** the Product Owner reviewed and edited the new place's list in the session and gave the promotion instruction. `QA_AGENT_SUMMARY_V1.md` for `0.9.3.3` exists in this version's folder; a separate QA run on this exact build is **not** recorded — the checks that were made are the developer's live check on `qa` (360px: 3 × 3 grid, intro / game split, plane board) and the full gate.

## Prior Production state (to be replaced)
- **Build identifier:** `0.9.3.1-2a4890e4`
- **Deploy ID:** `6aef3f4da7eb59ba81b6addd` (deployed 2026-11-07T15:10:16Z, state `ready`)
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion (`build-version` read `0.9.3.1-2a4890e4`) and the deploy list.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state
- **Build identifier:** `0.9.3.3-5cf52fda`
- **Deploy ID:** `6aef59b5582b8598b406daf1` (context `production`, state `ready`)
- **Deployed:** 2026-11-07T17:02:57Z — `netlify deploy --dir dist --prod --no-build`, run by the Development Agent at the Product Owner's explicit instruction.
- **Verified (fresh cache-bypassed fetches):** `build-version` reads `0.9.3.3-5cf52fda`; all 11 files of `dist/` return HTTP 200 and are byte-identical to the local `dist/` (identical=11, different=0); both functions answer an unauthenticated POST with HTTP 401. **Not done:** no real trip was opened or written on Production (the same code ran live on `qa`).
- **Artifact:** the exact, untouched `dist/` that was on `qa` (`qa`, `dist/` and Production all read `0.9.3.3-5cf52fda`; no source change since commit `5cf52fd`; no rebuild).
- **Backend:** no `firestore.rules` / `storage.rules` / function change.
- **Known, carried:** the "במטוס" list was drafted by the developer and edited by the PO but not run through a separate QA pass on this build; "סלפי עם דייל/ת" asks for a photo with a crew member, who has to agree; the commits since `7b32ab1` are local until pushed from the owner's machine.

## Rollback command, if needed
```
npx netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aef3f4da7eb59ba81b6addd"}'
```
Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.9.3.1-2a4890e4` again. Interface only. **Data notes:** a trip that opened `0.9.3.3` carries the ninth Bingo place in its saved game; `0.9.3.1` re-copies its own eight places on load and ignores a `plane` board (the board and any photo taken on it stay in Firestore / Storage, unused), and an `activeTheme` of `plane` falls back to "no place chosen" there.
