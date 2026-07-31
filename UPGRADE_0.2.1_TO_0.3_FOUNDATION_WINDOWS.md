# Windows Upgrade — Alpha 0.2.1 to Alpha 0.3 Foundation

This file is retained as the mandatory upgrade guide from the immediately previous approved version.

For the complete guided process, start with:

`START_HERE.md`

The detailed operational steps are split into numbered documents so every document ends with the next required document.

## Upgrade summary

- Static deployment changes to a Vite build.
- Netlify build command changes from empty to `npm run build`.
- Netlify publish directory changes from `.` to `dist`.
- Google Authentication is introduced.
- Existing Alpha 0.2.1 local-storage data remains compatible.
- Firestore and Storage remain deny-all.

## Full sequence

1. `docs/guides/01_INSTALLATION_WINDOWS.md`
2. `docs/guides/02_LOCAL_TESTING.md`
3. `docs/guides/03_FIREBASE_AUTH_TESTING.md`
4. `docs/guides/04_NETLIFY_DEPLOYMENT.md`
5. `docs/guides/05_POST_DEPLOYMENT_TESTING.md`
6. `docs/guides/06_RELEASE_CHECKLIST.md`

Rollback:

`docs/guides/07_ROLLBACK.md`
