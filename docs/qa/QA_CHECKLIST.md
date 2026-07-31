# QA Checklist — Alpha 0.3 Foundation

## Build and package

- [ ] `npm install` completes.
- [ ] `npm run check` completes without errors.
- [ ] `npm run build` creates `dist`.
- [ ] `npm run preview` serves the production build.
- [ ] The current Windows upgrade guide is present.
- [ ] No obsolete upgrade guides are included in the release package.

## Authentication

- [ ] Signed-out users see the Google sign-in screen.
- [ ] Google sign-in succeeds locally.
- [ ] The authenticated account is shown.
- [ ] Refresh preserves the session.
- [ ] Sign-out returns to the sign-in screen.
- [ ] Google sign-in succeeds on the Netlify domain.

## Compatibility

- [ ] Existing Alpha 0.2.1 local Trip data remains visible on the same browser profile.
- [ ] Existing items, sources, and Packing Lists remain usable after sign-in.
- [ ] The global Add flow still opens.
- [ ] Calendar and Timeline still render.

## PWA and deployment

- [ ] Netlify uses `npm run build` and `dist`.
- [ ] The production deploy loads without missing assets.
- [ ] The Service Worker updates from Alpha 0.2.1.
- [ ] Android PWA launches after update.
- [ ] Offline shell opens after one online load.

## Security boundary

- [ ] Firestore rules remain deny-all.
- [ ] Storage rules remain deny-all.
- [ ] No service-account credentials or private secrets are included.

## Acceptance

The Foundation is accepted only after all mandatory live checks pass. Static smoke checks alone are not sufficient.
