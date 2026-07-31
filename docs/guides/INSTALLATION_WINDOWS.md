# Windows Installation — Alpha 0.3 Foundation

This guide is for a clean local verification of the Alpha 0.3 Foundation package.

For upgrading the existing Git repository and Netlify deployment from Alpha 0.2.1, use `UPGRADE_0.2.1_TO_0.3_FOUNDATION_WINDOWS.md` instead.

## Prerequisites

- Windows 10 or 11
- Node.js 20.19 or later
- npm
- Git
- VS Code

Verify:

```powershell
node --version
npm --version
git --version
```

## 1. Extract the package

Extract the ZIP to:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation
```

## 2. Open the package in VS Code

```powershell
code C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation
```

Open a PowerShell terminal in VS Code.

## 3. Install dependencies

```powershell
cd C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation
npm install
```

Do not approve additional install scripts unless they are reviewed separately.

## 4. Run the quality gate

```powershell
npm run check
```

The command must finish without errors and include a successful production build.

## 5. Run locally

```powershell
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Verify:

1. The Google sign-in screen appears.
2. Google sign-in succeeds.
3. The Alpha 0.2.1 local Trip remains visible on the same browser profile.
4. Sign-out returns to the sign-in screen.
5. Refresh preserves the authenticated session.

Stop the server with `Ctrl+C`.

## 6. Verify the production build

```powershell
npm run build
npm run preview
```

Open the URL printed by Vite Preview and repeat the authentication and local-data checks.

## Important

- Firestore and Storage remain deny-all in this Foundation package.
- This package does not yet migrate Trip data to Firebase.
- Do not change the production Netlify settings until the complete upgrade guide has been followed.
