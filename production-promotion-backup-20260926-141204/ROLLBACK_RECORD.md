# Production promotion rollback record — `0.7.7.1`

**Date:** 2026-09-26
**Action:** Promoting `0.7.7.1` (build `0.7.7.1-a6ba2266`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.7.1/EXECUTABLE_TEST_SESSION_V2.md`, `V2`, all 8 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.7-e54a61fc`
- **Deploy ID:** `6ab7ac638a010dc998a15c35`
- **Deployed:** 2026-09-26T11:28:35.035Z (`0.7.7` promotion)
- **Commit:** `e54a61f`
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.7-e54a61fc`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.7.1-a6ba2266`
- **Deploy ID:** `6ab7d2eeb824cd426eed648f`
- **Deployed:** 2026-09-26T14:13:02.345Z — confirmed via fresh fetch of `https://familytripz.netlify.app/` immediately after: `build-version` reads `0.7.7.1-a6ba2266`. Netlify reported "0 files/0 functions uploaded" — byte-identical to the already-accepted `qa` artifact.
- **Candidate:** `0.7.7.1` — correction to `0.7.7`. Went through two rounds: **V1** (build `0.7.7.1-77e2157d`) added `linkedShoppingListEntries(item)`, a reverse lookup on a shopping place's detail view showing which shopping-list entries reference it, mirroring the existing `insuranceCoveringItems` pattern — all 4 of its own tests PASS, but the Product Owner recorded a **NO-GO** on scope grounds: three further observations surfaced during that same acceptance session (Test 1) were to be folded in rather than deferred. **V2** (build `0.7.7.1-a6ba2266`, this promotion) added, on top of V1's unchanged work: (1) editing a shopping-list entry, mirroring `task-form`'s own edit-in-place pattern; (2) marking an entry purchased directly from a shopping place's own reverse-lookup section — explicitly confirmed by the Product Owner as the intended meaning of this finding, superseding V1's own "plain rows, not clickable" behavior by direct authorization, not a silent change; (3) purchased shopping-list entries now move into a separate, hidden-by-default section, mirroring the Equipment/Packing list's own `packedCollapsed` pattern exactly (`shoppingPurchasedCollapsed`, same defaulting, added to `TRIP_TOP_LEVEL_FIELDS`). GO 2026-09-26, 8/8 tests PASS, with one accepted spec deviation logged (clicking a reverse-lookup row toggles purchased status, rather than doing nothing as originally specified — judged more useful, left as-is, not a defect).
- **Branch:** `version/V7`
- **Implementation commits:** `77e2157` (V1), `a6ba226` (V2)
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab7ba29cfc6661977148629`
- **Acceptance session:** `docs/versions/V7/0.7.7.1/EXECUTABLE_TEST_SESSION_V2.md`, `V2` (supersedes `V1`'s own NO-GO), **GO**, all 8 tests PASS.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy (via Netlify CLI's own build emulation, which correctly injects the site's real environment variables) — confirmed locally (`dist/index.html`'s own `build-version` meta reads `0.7.7.1-a6ba2266`, matching the live `qa` fetch) — no rebuild for this promotion.
- **Rules note:** no `firestore.rules`/`storage.rules` change in this correction at all — every change is client-side rendering/state logic on already-covered `state.items`/`state.shopping` records.
- **Shared backend note:** same Firebase project/Firestore/Storage bucket as `qa` (`family-trips-9aef4`) — no schema or rules migration; `shoppingPurchasedCollapsed` is a new Trip-level field with the same schemaless, no-migration-needed treatment every prior `TRIP_TOP_LEVEL_FIELDS` addition has had (defaults itself on first read via `normalizeOperationalState`).

## Rollback command, if needed

To restore Production to the prior `0.7.7` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab7ac638a010dc998a15c35"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.7-e54a61fc` again.

**Important:** low-risk rollback — no data model or security-rules change. A rollback would just remove the reverse-lookup section, the shopping-list edit action, and the hidden-purchased-list split; any already-edited entries or their `purchased`/`placeId` values would remain in Firestore untouched, simply rendered by the prior version's own (still-correct) logic again.
