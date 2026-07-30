# Release Package Rules

## Mandatory upgrade documentation

Every release after the initial release must include a verified, step-by-step upgrade guide from the immediately preceding version.

The release is incomplete without it.

The guide must:

1. Be Windows-only unless another platform is explicitly requested.
2. State exactly where the new package must be extracted.
3. State exactly which repository folder must be opened.
4. Verify the active branch and clean working tree.
5. Pull the latest `main`.
6. Create and push an archive branch for the previous release.
7. Provide the exact Robocopy command.
8. Exclude `.git` and `node_modules`.
9. Run the release quality gate.
10. Test the release locally.
11. Provide exact commit and push commands.
12. Verify GitHub and Netlify settings.
13. Explain PWA and Service Worker cache handling.
14. Warn about local-data compatibility and migration.
15. Provide post-deployment acceptance checks.
16. Provide a rollback path.
17. End with a complete upgrade checklist.

Required naming convention:

```text
UPGRADE_<previous-version>_TO_<new-version>_WINDOWS.md
```

Required links:

- `START_HERE.md`
- `README.md`
- `docs/release/MANIFEST.json`
- `CODEX_INSTRUCTIONS.md`

## Release gate

The release quality gate must fail when the required upgrade guide is missing.
