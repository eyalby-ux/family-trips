# 02 — Local Testing

## Goal

Verify syntax, smoke tests, production build, and local production preview before testing Firebase Authentication.

## Starting condition

Document `01_INSTALLATION_WINDOWS.md` passed.

Run all commands from:

```text
C:\Projects\FamilyTrips\family-trips-repository
```

## Step 1 — Run the complete quality gate

```powershell
npm run check
```

Expected sequence:

- JavaScript syntax checks complete
- `Smoke tests passed.`
- Vite production build completes
- `dist` is created

A successful ending resembles:

```text
✓ built in ...
```

Do not continue if any command fails.

## Step 2 — Verify the production output

```powershell
Test-Path .\dist\index.html
Get-ChildItem .\dist
Get-ChildItem .\dist\assets
```

Expected:

- `dist\index.html` exists
- generated asset files exist

## Step 3 — Start local production preview

```powershell
npm run preview
```

Vite normally prints:

```text
http://localhost:4173
```

Keep this PowerShell window open.

## Step 4 — Open the preview

Open the URL printed by Vite in Chrome or Edge.

Expected:

- the page loads
- Hebrew RTL layout is visible
- a Google sign-in screen or signed-in application is visible
- no blank screen appears

## Step 5 — Check browser errors

Open Developer Tools with `F12`, then open **Console**.

Expected:

- no uncaught JavaScript errors
- no failed module-load errors
- no Firebase initialization error

Warnings may be recorded, but unexplained red errors fail this step.

## Step 6 — Verify existing local data safety

Before changing or deleting anything, confirm whether the existing Alpha 0.2.1 Trip appears after authentication.

This release must not silently delete the existing local-storage data.

Do not clear browser storage during this test.

## Step 7 — Stop preview after verification

Return to PowerShell and press:

```text
Ctrl+C
```

## Local-testing success criteria

- `npm run check` passed
- `dist` exists
- local preview loads
- browser Console has no blocking errors
- local data was not silently removed

## Known out-of-scope observation

`ELAL_flight_booking_screenshot.png` may be suggested as a hotel because the Alpha 0.2.1 filename classifier checks a broad `booking` rule.

Classification: **Scheduled Alpha feature — Alpha 0.4 Smart Ingestion**.

Do not patch this during Alpha 0.3 Foundation verification.

## Troubleshooting

### Preview port is already in use

Use the URL Vite prints. Do not assume port 4173.

### Blank page

Check Console, confirm `npm run check` passed, and confirm the page was opened from `npm run preview`, not by double-clicking `dist\index.html`.

## Next document

Open:

`docs/guides/03_FIREBASE_AUTH_TESTING.md`
