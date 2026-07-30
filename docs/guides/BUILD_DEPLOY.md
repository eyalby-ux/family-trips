# Build and Deployment

## Alpha 0.2.1
Alpha 0.2.1 is a static PWA with no compile step.

- Quality gate: `npm run check`
- Local server: `npm run dev`
- Netlify build command: empty
- Netlify publish directory: `.`

## Alpha 0.3 transition
Alpha 0.3 introduces Firebase npm modules and a Vite build pipeline.

Target commands:
- Development: `npm run dev`
- Quality gate: `npm run check`
- Production build: `npm run build`
- Local production preview: `npm run preview`

Target Netlify settings:
- Production branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`

Do not change the live Netlify settings before:
1. Vite configuration is committed.
2. The production build succeeds locally on Windows.
3. Authentication, asset paths, PWA registration, and offline behavior are verified from `dist`.
4. A complete Windows-only upgrade guide from Alpha 0.2.1 is included.
5. Rollback instructions restore the Alpha 0.2.1 static deployment settings.

Firebase Web configuration is client-visible configuration, not a service-account secret. Service-account JSON, private keys, OAuth client secrets, access tokens, and passwords must never be committed.