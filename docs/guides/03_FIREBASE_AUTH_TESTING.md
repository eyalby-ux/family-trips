# 03 — Firebase Authentication Testing

## Goal

Verify Google sign-in, sign-out, and session persistence locally.

## Approved Firebase project

```text
Project ID: family-trips-9aef4
Web app: Family Trips Web
Authentication provider: Google
Production authorized domain: familytripz.netlify.app
```

Firestore and Storage must remain deny-all during this test.

## Starting condition

Document `02_LOCAL_TESTING.md` passed.

## Step 1 — Start preview

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
npm run preview
```

Open the URL printed by Vite.

## Step 2 — Verify the signed-out state

Expected:

- a clear Google sign-in action is available
- Trip content is not exposed before authentication

## Step 3 — Sign in with Google

Select the Google sign-in action and complete the Google account flow.

Expected:

- popup or redirect completes
- the application opens
- the signed-in user's identity is visible
- no Firebase authorization error appears

## Step 4 — Verify the existing local Trip

Expected:

- Alpha 0.2.1 local Trip data remains available on the same browser profile
- the authentication layer does not overwrite the local Trip

## Step 5 — Refresh

Press:

```text
Ctrl+R
```

Expected:

- the session remains signed in
- the application returns without another login request
- local Trip data remains available

## Step 6 — Close and reopen the tab

Close the application tab, open the preview URL again, and verify:

- session is restored
- no blank intermediate state remains
- application loads normally

## Step 7 — Sign out

Use the application's sign-out action.

Expected:

- the application returns to the sign-in screen
- protected application content is hidden

## Step 8 — Sign in again

Repeat Google sign-in.

Expected:

- sign-in succeeds
- the same local Trip appears
- no duplicate local Trip is created

## Step 9 — Stop preview

Return to PowerShell and press `Ctrl+C`.

## Authentication success criteria

- Google sign-in passes
- refresh preserves the session
- closing and reopening preserves the session
- sign-out hides Trip content
- second sign-in succeeds
- local data remains unchanged

## Troubleshooting

### `auth/unauthorized-domain`

The exact preview host must be listed in Firebase Authentication authorized domains. `localhost` is normally required for local testing.

### Popup is blocked

Allow the sign-in popup for the local preview URL and retry.

### Firestore or Storage permission errors

These services are intentionally deny-all. They must not block Authentication-only Foundation behavior. Record any UI failure caused by these errors.

## Next document

Open:

`docs/guides/04_NETLIFY_DEPLOYMENT.md`
