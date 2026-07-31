# Build and Deployment — Alpha 0.3 Foundation

## Local development

```powershell
npm install
npm run dev
```

## Quality gate

```powershell
npm run check
```

The quality gate performs syntax checks, smoke tests, and a Vite production build.

## Production build

```powershell
npm run build
```

Output directory:

```text
dist
```

## Local production preview

```powershell
npm run preview
```

## Netlify

Use:

```text
Production branch: main
Build command: npm run build
Publish directory: dist
```

Change the live Netlify settings only after the Windows upgrade guide is completed and the local production build is verified.

## Firebase

- Google Authentication is enabled.
- `familytripz.netlify.app` must remain in Firebase Authentication Authorized domains.
- Firestore and Storage remain deny-all until authorization rules pass emulator tests.
- Firebase client configuration is browser-visible configuration.
- Never commit service-account JSON, private keys, OAuth client secrets, access tokens, or passwords.
