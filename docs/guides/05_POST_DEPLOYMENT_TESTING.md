# 05 — Post-Deployment Testing

## Goal

Verify production Authentication, local-data compatibility, PWA behavior, and Service Worker update behavior.

## Production URL

```text
https://familytripz.netlify.app/
```

## Starting condition

Document `04_NETLIFY_DEPLOYMENT.md` passed.

## Part A — Desktop production verification

### Step 1 — Open production in a normal browser window

Open the production URL.

Expected:

- Alpha 0.3 Foundation loads
- no old static Alpha 0.2.1 shell remains
- sign-in state is displayed correctly

### Step 2 — Check Console and Network

Open Developer Tools.

Verify:

- no uncaught JavaScript error
- application assets return HTTP 200
- `service-worker.js` is not permanently cached
- no missing `dist` asset error

### Step 3 — Test Google sign-in

Sign in with Google.

Expected:

- sign-in succeeds on `familytripz.netlify.app`
- the browser does not show `auth/unauthorized-domain`
- local Trip data on this browser remains available

### Step 4 — Test refresh and reopen

- refresh the page
- close and reopen the tab
- reopen the production URL

Expected: session persists.

### Step 5 — Test sign-out and second sign-in

Expected:

- sign-out hides Trip content
- second sign-in succeeds
- local data is not duplicated or deleted

## Part B — Service Worker verification

### Step 6 — Hard refresh

Use:

```text
Ctrl+Shift+R
```

Expected: current Foundation assets load.

### Step 7 — Verify Service Worker

In Developer Tools, open **Application → Service Workers**.

Expected:

- Service Worker is registered for the production origin
- current version controls the page
- no repeating install failure occurs

When the old version remains:

1. close all tabs for the site
2. reopen the site
3. use **Update** in the Service Worker panel
4. reload

Clear site data only when the old cache cannot be replaced. Clearing site data may remove local Alpha data on that browser.

## Part C — Android Chrome and installed PWA

### Step 8 — Open production in Android Chrome

Expected:

- site loads
- Google sign-in succeeds
- layout is usable
- no blank screen occurs

### Step 9 — Update or install the PWA

For an existing installation:

- close the PWA
- open the production site in Chrome
- wait for the new Service Worker
- reopen the PWA

For a new installation, use Chrome's install action.

### Step 10 — Launch the installed PWA

Expected:

- Foundation launches
- Authentication state is correct
- existing local data on that installed origin remains available
- reopening does not show the old version

## Part D — Limited offline check

After one successful online load:

1. keep the app installed or open
2. temporarily disable connectivity
3. reopen the application

Expected for this Foundation:

- cached application shell may open
- Google sign-in itself requires connectivity
- no promise is made for Firestore or Storage offline data because those services are not enabled

Restore connectivity after this check.

## Post-deployment success criteria

- desktop production loads
- Google sign-in/sign-out pass
- session persistence passes
- current Service Worker controls the page
- Android Chrome passes
- installed PWA passes
- no silent local-data deletion occurs

## Next document

Open:

`docs/guides/06_RELEASE_CHECKLIST.md`
