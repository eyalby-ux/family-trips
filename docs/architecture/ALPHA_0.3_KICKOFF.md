# Alpha 0.3 Kickoff ג€” Accounts, Shared Trips, Participants, Document Ownership

## Objective
Move Family Trips from a single-device local prototype to a privacy-preserving multi-user foundation for the Thailand MVP.

## Confirmed platform decisions
- Backend platform: Firebase project `family-trips-9aef4`.
- Authentication provider enabled: Google.
- Authorized production domain: `familytripz.netlify.app`.
- Database: Cloud Firestore.
- File storage: Firebase Storage.
- Firestore and Storage remain deny-all until Owner/Editor authorization rules are implemented and tested.
- Client SDK: Firebase JavaScript SDK installed through npm.
- Frontend build system: Vite.
- Deployment remains on Netlify.

## Build and deployment transition
Alpha 0.3 changes the project from a no-build static PWA to a bundled application.

Target Netlify settings:
- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: `main`

The Netlify settings must change only when the Vite build is committed, locally verified, and accompanied by the complete Windows upgrade guide from Alpha 0.2.1.

## Remaining architecture gate
- Firestore collection/document structure.
- Firestore Owner/Editor security rules.
- Storage paths and access rules.
- Offline queue and conflict behavior.
- Alpha 0.2.1 local-data migration.
- Firebase environment configuration for local and Netlify builds.
- Backup, monitoring, and recovery expectations.