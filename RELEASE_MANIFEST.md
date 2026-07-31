# Alpha 0.3 Foundation Release Manifest

Version: `0.3.0-foundation.1`  
Platform instructions: Windows only

## Required entry point

- `START_HERE.md`

## Mandatory operational documents

- `docs/guides/01_INSTALLATION_WINDOWS.md`
- `docs/guides/02_LOCAL_TESTING.md`
- `docs/guides/03_FIREBASE_AUTH_TESTING.md`
- `docs/guides/04_NETLIFY_DEPLOYMENT.md`
- `docs/guides/05_POST_DEPLOYMENT_TESTING.md`
- `docs/guides/06_RELEASE_CHECKLIST.md`
- `docs/guides/07_ROLLBACK.md`

## Mandatory previous-version upgrade guide

- `UPGRADE_0.2.1_TO_0.3_FOUNDATION_WINDOWS.md`

## Application files

- `index.html`
- `package.json`
- `netlify.toml`
- `firestore.rules`
- `storage.rules`
- `src/`
- `public/`
- `tests/`

## Excluded generated content

- `.git`
- `node_modules`
- `dist`

## Release boundary

This package establishes Vite and Firebase Authentication. Firestore and Storage remain deny-all.
