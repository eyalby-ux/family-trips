# Production promotion rollback record — `0.7.5`

**Date:** 2026-09-21
**Action:** Promoting `0.7.5` (build `0.7.5-8508e0cc`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.5/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, 8/9 tests PASS, Test 8 flagged not run — test-doc/UI mismatch, Product Owner's own call).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.4.1-72557e8b`
- **Deploy ID:** `6ab11cc9f2b83f4e311ee39e`
- **Deployed:** 2026-09-21T12:02:17.241Z (`0.7.4.1` promotion)
- **Commit:** `7f5579b`
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.4.1-72557e8b`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.5-8508e0cc`
- **Candidate:** `0.7.5` — administer the sharing model. Full implementation: `invitations/{email}` Firestore collection (active/revoked states) replacing the old flat `config/appInvitations` allowlist document, consolidating what had been two independently-unsynced enforcement points (a Netlify env var Smart Import checked vs. the Firestore mirror rules checked) into one; revoked-account quarantine and a 30-day-eligible, explicitly-confirmed deletion action (`admin-delete-account.mjs`, this project's first Firebase Admin SDK credential); Editor-level Smart Import permission (an Editor, not just the Owner, can now invoke Smart Import on a shared Trip, with quota tracked per calling account); a new admin UI (invitation list/invite/revoke, quarantine panel with a live days-remaining countdown, delete gated behind typing the exact target email); and an extended Trip-sharing panel showing a revoked-Editor history.
- **A real, live-invocation-only bug was found and fixed during this candidate's own `qa` deployment**, not by design review or the local quality gate (neither could reproduce it): `admin-delete-account.mjs` crashed with a 502 on every real call, because `firebase-admin/auth`'s own internal dependency (`jwks-rsa`) has an unfixed upstream bug colliding with this project's own `jose` package the moment that submodule is imported inside Netlify's actual bundled Function runtime. Fixed (commit `6c2b656`) by resolving the target account's Firebase Auth UID via a direct, hand-signed Identity Toolkit REST call instead of `firebase-admin/auth`.
- **A second, unrelated build-environment problem was also found and fixed during `qa` deployment**: the first `qa` build (commit `8508e0c`, deploy `6ab16a9f3237b4466697d357`) had a masked/invalid `VITE_FIREBASE_API_KEY` baked into it from a local build-environment issue (unrelated to any `0.7.5` code), blocking Firebase Auth sign-in entirely. The Product Owner corrected the Netlify environment variable configuration (removing an unintended "contains secret values" flag on the `VITE_FIREBASE_*` variables); redeployed via Netlify's own build (same commit `8508e0c`, new deploy `6ab17aea7e6a29bceb481cc8`) with a confirmed-real API key. **This second `qa` deploy is the one every acceptance test actually ran against and the one being promoted here.**
- **Branch:** `version/V7`
- **Implementation commits:** `68c050c` (full implementation), `6c2b656` (the `admin-delete-account.mjs` fix, described above)
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab17aea7e6a29bceb481cc8`
- **Acceptance session:** `docs/versions/V7/0.7.5/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, 8/9 tests PASS (Test 8 flagged, not run — assumed a remaining-quota UI element that doesn't exist; Product Owner's own call to move on, since the underlying per-account quota keying was already confirmed correct by source and by Test 7/8's own observed behavior).
- **Artifact promoted:** the exact, untouched `dist/` built for the second `qa` deploy — no rebuild for this promotion.
- **Shared backend note:** Firestore/Storage rules were already published by the Product Owner directly (manual Console action, before `qa` deployment) — `invitations/{email}` already governs both `qa` and Production identically, since both share one Firebase project. `FIREBASE_ADMIN_SERVICE_ACCOUNT` is already set in Netlify (site-wide, not `qa`-scoped), so `admin-delete-account.mjs` is already correctly configured for Production too.
- **New findings logged during this session, deliberately left unscoped for this candidate:** a quarantine-panel "re-activate" UI enhancement request; a newly-invited account with no Trips being blocked from reaching Settings; and a family-ticket (one ticket covering multiple participants) gap in `0.7.4`'s ticket model. None block this promotion — the latter two are out of `0.7.5`'s own scope entirely.

## Rollback command, if needed

To restore Production to the prior `0.7.4.1` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab11cc9f2b83f4e311ee39e"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.4.1-72557e8b` again.

**Important — this rollback is NOT low-risk, unlike most prior corrections.** `0.7.5` changed the Firestore/Storage security rules (`isInvited()` now reads `invitations/{email}` instead of `config/appInvitations`) and those rules are **already live** for both `qa` and Production, published by the Product Owner before this promotion — rolling back the client/function code does not roll back the rules. A code-only rollback (the command above) would restore the pre-`0.7.5` client bundle and Netlify Functions while the new rules stay in force; since the client rollback target (`0.7.4.1`) never reads/writes `invitations/{email}` and never depended on `config/appInvitations` either (both `0.7.4` and `0.7.4.1` predate this whole invitation-collection redesign — they used the same `isInvited()`/`hasTripAccess()` pattern, just against the old collection), this specific rollback is still safe: `0.7.4.1`'s own code never assumed anything about which collection backs `isInvited()`, so it keeps working unchanged against the new rules. A rollback would only reintroduce the admin panel/quarantine/Editor-Smart-Import UI's absence — it would not break authentication or Trip access for any already-invited user.
