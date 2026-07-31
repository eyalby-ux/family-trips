# Release Notes — Family Trips Alpha 0.3 Foundation

Release date: 2026-07-31
Status: **GO — accepted technical baseline**

## Included

- Vite development and production build pipeline.
- Firebase SDK initialization.
- Google sign-in, sign-out, and persistent Authentication session.
- Existing Alpha 0.2.1 local application and local-storage compatibility.
- Firestore and Storage initialized while production access remains deny-all.
- Vite-compatible PWA assets and Service Worker.
- Netlify build using `npm run build` and publish directory `dist`.
- Firebase configuration through `VITE_FIREBASE_*`.
- GitHub Quality Gate with `npm ci` and Node 24.
- Windows-only installation, deployment, rollback, and verification documentation.

## Corrections completed during verification

- Rebuilt `package-lock.json` to remove invalid `postcss@8.5.25`.
- Added `npm ci` to GitHub Actions.
- Updated GitHub Actions to Node 24.
- Moved Firebase configuration from source values to build-time environment variables.
- Updated smoke tests for `VITE_FIREBASE_*`.
- Added all seven Firebase environment variables in Netlify.
- Completed a clean-cache Netlify deployment.

## Verification

Final executable session result: **16 / 16 tests passed**

## Not included yet

- Firestore user-profile writes.
- Cloud Trip creation or local-data migration.
- Owner/Editor membership and invites.
- Participants, Document inbox, or shared Packing synchronization.
- Production Firestore or Storage authorization rules.

## Decision

**GO — Alpha 0.3 Foundation is accepted as the technical baseline.**