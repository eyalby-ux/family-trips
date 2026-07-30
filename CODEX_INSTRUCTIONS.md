# Codex Instructions

Codex is the Development Agent. Preserve the frozen architecture: Today is operational home; Trip Center is category-first; one entity has one Detail View; Trip dates remain optional; source dates are never silently rewritten. Run `npm run check` before and after changes. Technical documentation and code comments are English. Product UI remains Hebrew RTL. Any architecture conflict requires an Architecture Change Request before implementation.

## Mandatory Upgrade Guide Rule

Every release after the first release must include a complete upgrade guide from the immediately preceding version.

A release is not complete and must not be described as ready until this guide exists and has been verified.

The guide must be written for Windows only unless the Product Owner explicitly requests another platform.

It must include:

- Exact source and destination folder paths
- Repository pre-checks
- Confirmation that the working tree is clean
- Pulling the current `main` branch
- Creating and pushing an archive branch for the previous version
- The exact file-copy command
- Protection of the `.git` directory
- Quality-gate commands
- Local verification
- Commit and push commands
- GitHub verification
- Netlify build and publish settings
- Deployment verification
- PWA and Service Worker cache handling
- Local-data compatibility and migration warnings
- Post-deployment acceptance checks
- Rollback instructions
- A final upgrade checklist

The required file name format is:

```text
UPGRADE_<previous-version>_TO_<new-version>_WINDOWS.md
```

Examples:

```text
UPGRADE_0.2_TO_0.2.1_WINDOWS.md
UPGRADE_0.2.1_TO_0.3_WINDOWS.md
```

The release manifest, `START_HERE.md`, and `README.md` must link to the upgrade guide.

The quality gate must verify that the expected upgrade guide exists.
