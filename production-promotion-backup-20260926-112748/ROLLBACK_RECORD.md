# Production promotion rollback record — `0.7.7`

**Date:** 2026-09-26
**Action:** Promoting `0.7.7` (build `0.7.7-e54a61fc`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.7/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all 8 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.6-9f63dadc`
- **Deploy ID:** `6ab78bb62cf8dc7924ae9a9f`
- **Deployed:** 2026-09-26T09:09:10.556Z (`0.7.6` promotion)
- **Commit:** `9f63dad`
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.6-9f63dadc`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.7-e54a61fc`
- **Deploy ID:** `6ab7ac638a010dc998a15c35`
- **Deployed:** 2026-09-26T11:28:35.035Z — confirmed via fresh fetch of `https://familytripz.netlify.app/` immediately after: `build-version` reads `0.7.7-e54a61fc`. Netlify reported "0 files/0 functions uploaded" — byte-identical to the already-accepted `qa` artifact.
- **Candidate:** `0.7.7` — Shopping places + scheduled shopping visits. A new `shoppingPlace` `ITEM_TYPES` entry (name, location, website, phone, notes, participant scope), reachable from the same "🛒 קניות" Trip Center tile as the pre-existing shared shopping list, not a separate tile. May be saved undated (a place to remember) or dated (schedules the *same* record into Timeline/Calendar, no duplicate) — the mutable-per-instance-schedule design question was verified directly, not assumed: every reader already treats `item.schedule` as per-item, but the only writer (`buildItemFormValues`) recomputed it from a fixed per-type default on every save, which would have silently reset a shopping place's schedule back to `'none'` on the very save meant to add a date. Fixed with a shared `scheduleForType` helper (also used by `updateSuggestion`). Shopping-list entries gained an optional place reference (`placeId`), rendered as "📍 <place name>", with no cascading delete — a render-time-only lookup, not a stored back-reference the deleted place's own removal has to know about. Two scoped extensions beyond the literal ask, both required to actually deliver the agreed acceptance criteria: (1) `center()`'s generic Trip Center tile grid excludes `shoppingPlace`, matching `link`/`participant`, so Shopping stays one combined category; (2) found only during implementation — `manualCreateDefaults()`'s Trip-start-date pre-fill is skipped for `shoppingPlace` only, since it would otherwise defeat "may be saved without a date at all."
- **Branch:** `version/V7`
- **Implementation commit:** `e54a61f`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab79f4e9c6ca30cea6de8bb`
- **Acceptance session:** `docs/versions/V7/0.7.7/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 8 tests PASS on the first attempt — no correction rounds needed this candidate, unlike `0.7.6`'s five.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy (via Netlify CLI's own build emulation, which correctly injects the site's real environment variables) — confirmed locally (`dist/index.html`'s own `build-version` meta reads `0.7.7-e54a61fc`, matching the live `qa` fetch) — no rebuild for this promotion.
- **Rules note:** no `firestore.rules`/`storage.rules` change in this candidate at all — `shoppingPlace` is just another `state.items` record, already covered by every existing Trip-access rule; no Firebase Console action needed for this promotion.
- **Shared backend note:** same Firebase project/Firestore/Storage bucket as `qa` (`family-trips-9aef4`) — no schema or rules migration; the new field (`placeId` on a `state.shopping` entry) is schemaless, needing no migration for existing entries (they simply have no `placeId` until edited).
- **One non-blocking finding logged, deliberately scoped rather than left open:** a shopping place's own detail view has no reverse lookup showing which shopping-list items reference it (only the list-entry → place direction was in the original acceptance criteria) — **scoped for a dedicated `0.7.7.1` correction**, per the Product Owner's own call recorded in the test session document.

## Rollback command, if needed

To restore Production to the prior `0.7.6` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab78bb62cf8dc7924ae9a9f"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.6-9f63dadc` again.

**Important:** low-risk rollback — no data model or security-rules change beyond one new, optional, schemaless field on shopping-list entries. A rollback would just remove the ability to create/view shopping places and the place-reference field; any already-created `shoppingPlace` items or `placeId` references would remain in Firestore, simply unreachable through the UI again until re-promoted, not deleted.
