# Production promotion rollback record — `0.7.4`

**Date:** 2026-09-21
**Action:** Promoting `0.7.4` (build `0.7.4-fe61afe4`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.4/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all 9 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.3.1-f83cbb80`
- **Deploy ID:** `6aafe89469914077f4a8089a`
- **Deployed:** 2026-09-20T14:07:16.600Z (`0.7.3.1` promotion)
- **Commit:** `f83cbb8` (implementation)
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.3.1-f83cbb80`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.4-fe61afe4`
- **Candidate:** `0.7.4` — four independent content-model items: `V6-F82` (insurance reverse-lookup shows all covering policies), `V7-F02` (task "open only" filter), Destination Countries (ordered list, doubling as the Trip's own route summary in the header), first-class Transport items (broadened `car` type with a sub-type field), and a from-scratch Participant management build (separate `participants` collection, item-participant relationships, tickets and passes, personal-vs-shared packing lists). No datastore, security-rules, or sync-engine changes.
- **Branch:** `version/V7`
- **Implementation commits:** `b9cbbad` (main implementation); `42cadc2` and `fe61afe` (Test 3 correction rounds — Destination Countries header arrow direction, resolved as script-aware detection rather than a hardcoded direction)
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab0f5015b7bbc9d10221b7b`
- **Acceptance session:** `docs/versions/V7/0.7.4/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 9 tests PASS. Test 3 required three rounds: round 1 found the header's route-summary arrow reading backwards for Hebrew country names; round 2's hardcoded fix broke the same display for English country names; round 3's script-aware fix (detects Hebrew vs. Latin content per render, no single hardcoded direction) was confirmed correct.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** unchanged — Firestore/Storage (`family-trips-9aef4`) is one shared backend for both `qa` and Production. No security-rules or data-model change beyond a new `participants` subcollection, already covered by the existing wildcard subcollection rule (`match /{subcollection}/{docId}`).
- **Known gap, verified during design, not fixed by this candidate:** a generic `participant` item type existed in the type system before this candidate (selectable in the manual create-type dropdown, its own Trip Center tile) and may already hold real data under it on some Trip — not migrated into the new participants collection built here. Flagged prominently in the acceptance session document itself.
- **Non-blocking findings carried forward, not addressed by this promotion:** an enhancement request (auto-link attached documents to their participant) and a leftover UI duplication (the old free-text participants field still showing alongside the new picker on item edit forms) — the latter scoped by the Product Owner to a future `0.7.4.1` correction.

## Rollback command, if needed

To restore Production to the prior `0.7.3.1` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6aafe89469914077f4a8089a"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.3.1-f83cbb80` again.

**Important:** low-risk rollback — no security-rules or data-model change beyond one new, additively-covered subcollection (`participants`). A rollback would re-hide the new Trip Settings features (Destinations, Participants, Transport sub-typing, item-participant relationships, tickets, personal packing lists) but does not put any already-synced data at risk — any `participants` documents written after this promotion would simply sit unread by the older client, not lost, and would reappear correctly once `0.7.4` is promoted again.
