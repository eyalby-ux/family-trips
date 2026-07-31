# Release Notes — Family Trips Alpha 0.3 Foundation

Release date: 2026-07-30  
Status: Foundation package for interactive verification

## Included

- Vite development and production build pipeline.
- Firebase JavaScript SDK initialization.
- Google sign-in with popup and redirect fallback.
- Persistent Firebase Authentication session.
- Sign-out control and signed-in account bar.
- Existing Alpha 0.2.1 local application loaded after authentication.
- Existing Alpha 0.2.1 local-storage key retained.
- Firestore and Storage initialized while production access remains deny-all.
- Vite-compatible PWA assets and Service Worker.
- Netlify build configuration for `npm run build` and `dist`.
- Complete Windows-only upgrade and rollback guide from Alpha 0.2.1.

## Not included yet

- Firestore user-profile writes.
- Cloud Trip creation or local-data migration.
- Owner/Editor membership and invites.
- Participants, Document inbox, or shared Packing synchronization.
- Production Firestore or Storage authorization rules.

## Verification status

Passed during package generation:

- JavaScript syntax checks.
- Static smoke tests.

Still requires live Windows verification:

- `npm install`.
- Vite production build.
- Google Authentication.
- Netlify deployment.
- Android PWA update and offline behavior.

The package is not accepted until the interactive Foundation test session passes.
