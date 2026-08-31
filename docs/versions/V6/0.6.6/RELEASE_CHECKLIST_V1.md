# Family Trips Alpha 0.6.6 — Release Checklist

**Document revision:** `V1`
**Candidate:** `0.6.6`

## Development Agent (complete)

- [x] Implement Attraction/Event Smart Import (schema, prompt, `analyze_activity` operation, URL acquisition + `robots_disallowed`, place validation, adapter, UI wiring).
- [x] Implement `V6-F49`, `V6-F50`, `V6-F51` fixes.
- [x] Add one named automated regression test per `AE-001`–`AE-007` (including the mandatory wild-card `AE-001`) and per `V6-F49`/`V6-F50`/`V6-F51`.
- [x] `npm run check` passes in full (syntax, all tests, production build).
- [x] Update the authoritative delivery plan's finding register (`V6-F49`–`V6-F51` → Fixed) and change history.
- [x] Sync the controlling process/architecture documents into the repository.
- [x] Write this candidate's `docs/versions/V6/0.6.6/` lifecycle documents.
- [x] Write the executable acceptance test session (`EXECUTABLE_TEST_SESSION_V184.md`).
- [x] Write installer, configuration and rollback scripts; build the installable package.
- [ ] Merge/PR `version/V6` work back to `main` — **not done; explicitly out of scope until this candidate is accepted and receives Product Owner GO** (this candidate has not been deployed anywhere, including QA).

## Product Owner (next)

- [ ] Install the `0.6.6` package (`scripts/install_V6_0_6_6.ps1`).
- [ ] Configure QA secrets if not already present (`scripts/configure_V6_0_6_6.ps1`).
- [ ] Deploy to the fixed `qa` alias (`scripts/deploy_QA_V6_0_6_6.ps1`).
- [ ] Run `EXECUTABLE_TEST_SESSION_V184.md` one test at a time, including the mandatory `AE-001` wild-card test and the one still-open official-venue/OTA URL verification step.
- [ ] Record every finding immediately; assign each to a disposition at session close.
- [ ] Decide GO / NO-GO.
- [ ] If GO: Production deploy remains its own separate, explicit action — never automatic.
