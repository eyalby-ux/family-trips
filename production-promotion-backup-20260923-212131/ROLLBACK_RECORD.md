# Production promotion rollback record — `0.7.5.1`

**Date:** 2026-09-23
**Action:** Promoting `0.7.5.1` (build `0.7.5.1-0b2a2037`) to Production, following the Product Owner's acceptance-session GO (`docs/versions/V7/0.7.5.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, all 4 tests PASS).

## Prior Production state (being replaced)

- **Build identifier:** `0.7.5-8508e0cc`
- **Deploy ID:** `6ab1933c16a639a05c338320`
- **Deployed:** 2026-09-21T20:27:40.901Z (`0.7.5` promotion)
- **Commit:** `af93e96`
- **Confirmed via:** fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` immediately before this promotion — `build-version` read `0.7.5-8508e0cc`.
- **Snapshot saved in this directory:** `production-index-before-promotion.html`.

## New Production state (being promoted)

- **Build identifier:** `0.7.5.1-0b2a2037`
- **Candidate:** `0.7.5.1` — a fast correction package addressing two findings from `0.7.5`'s own acceptance session, per `PROMPT_FOR_CLAUDE_CODE_0_7_5_1_CORRECTION_V1.md`, mirroring `0.7.4.1`'s own precedent (no separate scope document).
  - **`V7-F11` — quarantine re-activate.** A direct admin-panel action (`reactivateInvitation`) flipping a still-quarantined `invitations/{email}` document back to `state: 'active'` and clearing `revokedAt`, on the same `isAdmin()`-gated write path invite/revoke already use — no rules change. Confirmed, not assumed: `isInvited()`/`hasTripAccess()` key off nothing but this one field, so the flip alone restores access immediately.
  - **`V7-F12` — a newly-invited, Trip-less account left stuck.** Root-caused by direct code inspection, not the planning assistant's own guess (item-count gating): `listMyTrips`'s "shared with me" query requires `0.7.5`'s own `isInvited()` check to pass for the *calling* account, independent of `editorEmails` membership — so a Trip Owner adding an Editor via Trip Settings can silently create an Editor with zero visible Trip data, if that email was never separately application-invited. Fixed at the point the gap is created: the add-editor-form handler now checks for an active application invitation and warns the Trip Owner clearly if one's missing (`getInvitation`), rather than leaving the invited person to discover it alone. No rules change, no new friction for the already-invited common case.
- **Branch:** `version/V7`
- **Implementation commit:** `0b2a203`; test session draft `480b62b`; acceptance record `9f32c6f`
- **`qa` deploy ID (source of the exact artifact being promoted):** `6ab19bf6ba34ae656cd37ebc`
- **Acceptance session:** `docs/versions/V7/0.7.5.1/EXECUTABLE_TEST_SESSION_V1.md`, `V1`, **GO**, all 4 tests PASS — including Test 3, which reproduced `V7-F12`'s original trigger exactly with a genuinely fourth, never-before-invited test account, confirming both the warning and the actual fix end-to-end.
- **Artifact promoted:** the exact, untouched `dist/` built for the `qa` deploy (built via Netlify CLI's own local-build emulation, which correctly injects the site's real environment variables — not a plain `npm run build`, per the lesson from `0.7.5`'s own deployment) — no rebuild for this promotion.
- **Shared backend note:** unchanged — no data-model or security-rules change in this correction, purely client-side admin-panel logic plus one new Firestore read (`getInvitation`) already covered by the existing `invitations/{email}` `allow read: if request.auth != null` rule.
- **New finding logged during this session, deliberately left unscoped:** a revoked account's local session shows only a generic "cloud unavailable, data saved locally" message, not stating the account was actually removed — Product Owner's own call to log and leave unscoped, not part of this correction.
- **`V7-F13`** (the `0.7.4` family-ticket gap) remains untouched and unscoped, per its own `V114` sequencing decision — not part of this correction.

## Rollback command, if needed

To restore Production to the prior `0.7.5` state:

```
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6ab1933c16a639a05c338320"}'
```

Then confirm via a fresh, cache-bypassed fetch of `https://familytripz.netlify.app/` that `build-version` reads `0.7.5-8508e0cc` again.

**Important:** low-risk rollback — no data model or security-rules change. A rollback would just bring back the "re-invite from scratch" quarantine flow and the silent newly-invited-account gap; it puts no already-synced data at risk.
