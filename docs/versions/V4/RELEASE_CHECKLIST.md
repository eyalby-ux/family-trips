# V4 / 0.4.4 Release Checklist

## Package gate

- [x] Product Owner approved V4-F11 and V4-F13 for 0.4.4.
- [x] V4-F04 and V4-F12 remain assigned to 0.5.
- [x] Extraction and offline-shell regression tests included and passing.
- [x] Installer creates an external backup and automatically rolls back on failure.
- [x] Manual rollback restores `src`, `public`, `tests`, `docs`, `scripts`, package metadata and lockfile.
- [x] Package manifest and SHA-256 inventory generated.

## Installation gate

- [ ] Branch is `version/V4` and installed version before correction is 0.4.3.
- [ ] Installer reports `INSTALLATION PASSED` and version 0.4.4.
- [ ] Repository `npm run check` passes.
- [ ] Installer backup path is recorded.

## Focused acceptance gate

- [ ] V4-F11 flight proposal PASS.
- [ ] V4-F11 hotel proposal PASS.
- [ ] Source-preservation short regression PASS.
- [ ] V4-F13 installed-phone offline cold start PASS.
- [ ] Online recovery PASS.
- [ ] Final test 14 GO.

## Release control

- [ ] No merge to `main` before GO.
- [ ] Final evidence synchronized to TEST_RESULTS, KNOWN_ISSUES and delivery plan.
