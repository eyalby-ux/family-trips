# 07 — Rollback to Alpha 0.2.1

## Goal

Restore the last approved Alpha 0.2.1 code and static Netlify deployment.

Use this document only after a NO-GO decision or an unrecoverable deployment failure.

## Warning

Rollback changes the production branch content and Netlify build settings.

Before rollback, save:

- failing deploy log
- current Alpha 0.3 commit SHA
- screenshots or Console errors
- reason for rollback

## Step 1 — Verify the archive branch

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
git fetch origin
git show-ref --verify refs/remotes/origin/archive/alpha-0.2.1-before-vite
```

Do not continue if the archive branch is missing.

## Step 2 — Create a local rollback branch

```powershell
git checkout -B rollback/alpha-0.2.1 origin/archive/alpha-0.2.1-before-vite
```

## Step 3 — Verify the old baseline locally

```powershell
git status
```

Expected: clean working tree.

Inspect the files and confirm this is the Alpha 0.2.1 static baseline before changing `main`.

## Step 4 — Restore `main`

```powershell
git push --force-with-lease origin rollback/alpha-0.2.1:main
```

Use `--force-with-lease`, not plain `--force`.

## Step 5 — Restore Netlify settings

Set:

```text
Production branch: main
Build command: empty
Publish directory: .
```

Trigger a production deployment.

## Step 6 — Verify production

Open:

```text
https://familytripz.netlify.app/
```

Expected:

- Alpha 0.2.1 loads
- the static app works
- local Trip data remains available on the same browser profile

## Step 7 — Handle stale Service Worker only when required

First:

1. close all site tabs
2. reopen the production URL
3. hard refresh

When the Foundation shell still appears, update or unregister the Service Worker.

Clear site data only as a last resort because it can delete browser-local Trip data.

## Rollback success criteria

- GitHub `main` points to the Alpha 0.2.1 baseline
- Netlify uses an empty build command
- Netlify publishes `.`
- production Alpha 0.2.1 loads
- local data was not intentionally cleared

## Final action

Record the failure and rollback evidence before any new implementation work begins.
