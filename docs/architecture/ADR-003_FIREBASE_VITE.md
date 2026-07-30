# ADR-003 ג€” Firebase and Vite for Alpha 0.3

Date: 2026-07-30  
Status: Accepted

## Context
Alpha 0.3 requires accounts, private/shared Trips, Owner/Editor authorization, concurrent packing updates, document storage, and offline synchronization. The Alpha 0.2.1 local-only static architecture cannot satisfy these requirements.

## Decision
- Use Firebase Authentication with Google sign-in.
- Use Cloud Firestore for application data and real-time listeners.
- Use Firebase Storage for uploaded document bytes.
- Keep Firestore and Storage deny-all until tested authorization rules are ready.
- Use the Firebase JavaScript SDK through npm.
- Introduce Vite for development and production bundling.
- Continue deploying to Netlify, with `npm run build` and publish directory `dist`.

## Consequences
- Alpha 0.3 requires a controlled migration from the current static deployment.
- Security rules become part of the release quality gate.
- Offline and conflict behavior must be explicitly designed.
- The release package must include a complete Windows upgrade guide and rollback instructions.
- Firebase client configuration may be present in browser code; privileged credentials must not be committed.