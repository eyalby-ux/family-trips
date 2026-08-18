# FamilyTrips Alpha 0.6.3 Release Checklist

Document revision: `V4`  
Date: 2026-08-15

## Development gate

- [x] Alpha 0.5.6 accepted as installer baseline and current Production release.
- [x] Decisions 1–7 frozen in Discovery V22.
- [x] V10/V11 extraction, integrity, safe-failure, latency and cost gates passed.
- [x] V13 Google Places adequacy and safety gates passed.
- [x] Hotel-first runtime, Netlify Function, automated tests and documentation implemented.
- [x] Full automated regression and Vite Production build passed.
- [x] Complete checksummed installer and rollback path prepared.
- [x] `V6-F01` corrected with a dedicated fixed-general-QA deployment helper and package assertion.
- [x] `V6-F02` documented and the superseded 0.6.2 attempt preserved in history.
- [x] `V6-F03` corrected with deterministic removal/recreation, no inventory parsing and mandatory Product Owner retention.

## Product Owner gate

- [ ] Install the 0.6.3 correction over 0.6.0, 0.6.1 or 0.6.2 on `version/V6` with no manual code edits.
- [ ] Create/configure the dedicated restricted QA Places key and reduced quota.
- [ ] Configure with `scripts/configure_V6_0_6_3.ps1`; confirm both owner and Paola are active and no context/scope error occurs.
- [ ] Deploy exact `dist` and Functions only with `scripts/deploy_QA_V6_0_6_3.ps1` to the fixed `qa` alias.
- [ ] Verify Google sign-in on `https://qa--familytripz.netlify.app` with no unauthorized-domain/referrer error.
- [ ] Complete `EXECUTABLE_TEST_SESSION_V124.md` on desktop and phone.
- [ ] Record findings and explicit GO / NO-GO.

## Production gate

- [ ] Product Owner GO recorded against the exact unique deploy.
- [ ] Exact accepted `dist` and Functions promoted without rebuild.
- [ ] Production identity, invitation boundary and one bounded Smart Import verified.
- [ ] Deploy ID, logs and final rollback reference recorded.
- [ ] Accepted work merged or returned to `main` under the project lifecycle rule.
