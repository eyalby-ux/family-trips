# Production promotion rollback record — Beta `0.8.0-phase3.2` (Beta 0.8, Phases 1–3)

**Date:** 2026-10-12
**Action:** Promoting Beta `0.8.0-phase3.2` (build `0.8.0-phase3.2-24f0575f`) to Production — the single combined promotion of Beta 0.8 (Phases 1, 2 and 3, with their correction rounds 1.1, 1.2, 2.1, 2.2, 2.3, 3.1 and 3.2), decision `V147`, following the Product Owner's Phase 3.2 acceptance-session GO (2026-10-12 22:25, `docs/versions/V7/0.8.0-phase3.2/PO_SESSION_RESULTS_V1.md`).

## Prior Production state (replaced)

- **Build identifier:** `0.7.9.2-36090d32`
- **Deploy ID:** `6ababdcb51b0254432c59f58`
- **Deployed:** 2026-09-28T19:19:59Z
- **Confirmed via:** fresh fetch of `https://familytripz.netlify.app/` immediately before the promotion — `build-version` read `0.7.9.2-36090d32`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state

- **Build identifier:** `0.8.0-phase3.2-24f0575f`
- **Deploy ID:** `6acd3625c1bf3a8da6b3cd18` (context `production`, state `ready`)
- **Deployed:** 2026-10-12T19:34:13Z — run by the Product Owner (`netlify deploy --dir dist --prod --no-build`; the Development Agent's own attempt was blocked by the environment's permission guard and was not worked around).
- **Verified by the Development Agent, fresh cache-bypassed fetches after the deploy:** `build-version` reads `0.8.0-phase3.2-24f0575f` on both Production and `qa`; Production's `index.html`, `manifest.webmanifest` and all five asset files (`index-*.js`/`.css`, `v5-app-*.js`/`.css`, icons directory) are byte-identical to the local `dist/` that was built for and accepted on `qa`; the service worker carries the same build string; every asset returns HTTP 200.
- **Artifact:** the exact, untouched `dist/` of the accepted `qa` build — no rebuild for the promotion.
- **Branch / commit:** `version/V7`, build commit `24f0575`; acceptance and session documents committed through `71503fd`.
- **Rules note:** no `firestore.rules` / `storage.rules` change in Beta 0.8 — it is client-side rendering and state logic. **Shared backend note:** same Firebase project, Firestore and Storage bucket as `qa`; no schema or rules migration. New trip-level and item fields added during Beta 0.8 (for example `endedAt`, task `notes` / `link`) are schemaless, additive and default themselves on first read.
- **Known non-blocking items carried (not promoted-blocking):** `P32-F1` (Tasks "משתתף" filter label cut at its left edge), `P32-F2` (Documents filter chips jump back to "הכול" after a selection), backlog `BL-ICONS-1` (icon buttons on the Today card) and `P3-F2` (interactive games).

## Rollback command, if needed

To restore Production to the prior `0.7.9.2` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ababdcb51b0254432c59f58"}'
```

Then confirm via a fresh fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.9.2-36090d32` again.

**Important:** no data-model or security-rules change, so a rollback only returns the interface to the prior version. Data written by Beta 0.8 (task notes and links, `endedAt`, participants removed with the new delete) stays in Firestore untouched; the prior version simply ignores fields it does not know. Users with the PWA installed pick up the restored version after the service worker updates (close and reopen the app, or clear the site's data).
