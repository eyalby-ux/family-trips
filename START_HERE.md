# Family Trips Alpha 0.3 Foundation — START HERE

This is the single entry point for a clean Windows installation, local testing, Firebase Authentication testing, Netlify deployment, production verification, and release closure.

Do not skip documents and do not change Netlify settings before the local quality gate passes.

## Current release scope

Alpha 0.3 Foundation includes:

- Vite build pipeline
- Firebase initialization
- Google sign-in and sign-out
- Persistent authentication session
- Existing Alpha 0.2.1 local application and local-storage compatibility
- Netlify production build to `dist`
- PWA and Service Worker foundation

Firestore and Firebase Storage remain deny-all in this Foundation package. Shared Trips, membership rules, cloud documents, and migration to Firestore are not part of this verification sequence.

## Starting point

Use the existing repository:

```text
C:\Projects\FamilyTrips\family-trips-repository
```

Use the extracted release package:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation-v3
```

## Document sequence

Complete the documents in this exact order:

1. `docs/guides/01_INSTALLATION_WINDOWS.md`
2. `docs/guides/02_LOCAL_TESTING.md`
3. `docs/guides/03_FIREBASE_AUTH_TESTING.md`
4. `docs/guides/04_NETLIFY_DEPLOYMENT.md`
5. `docs/guides/05_POST_DEPLOYMENT_TESTING.md`
6. `docs/guides/06_RELEASE_CHECKLIST.md`

Use `docs/guides/07_ROLLBACK.md` only if installation, deployment, or production verification fails and cannot be corrected safely.

## Required evidence

Keep the following evidence while working:

- final output of `npm run check`
- local preview URL and result
- successful Google sign-in and sign-out
- successful session persistence after refresh
- Netlify deploy status
- production URL verification
- Android PWA verification
- final Git commit SHA

## Stop conditions

Stop and do not continue when:

- `git status` is not clean before the release files are copied
- `robocopy` returns exit code 8 or higher
- `npm install` fails
- `npm run check` fails
- Google sign-in fails locally
- the Firebase project or authorized domain does not match the documented values
- Netlify deploy fails
- production behavior differs from local preview

## Next document

Open:

`docs/guides/01_INSTALLATION_WINDOWS.md`
