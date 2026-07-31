# 04 — Netlify Deployment

## Goal

Commit the verified Foundation, push it to `main`, and switch Netlify from static publishing to the Vite production build.

## Starting condition

Documents 01–03 passed.

Do not deploy when local Authentication testing failed.

## Step 1 — Run the final pre-commit quality gate

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
npm run check
```

Expected: smoke tests and production build pass.

## Step 2 — Review repository changes

```powershell
git status
git diff --stat
```

Confirm:

- no unrelated personal files are included
- `.git`, `node_modules`, and `dist` are not being committed
- Foundation source and documentation are present
- only the relevant Alpha 0.3 upgrade guide is included

## Step 3 — Commit

```powershell
git add -A
git commit -m "Add Alpha 0.3 Firebase and Vite foundation"
```

## Step 4 — Push

```powershell
git push origin main
```

## Step 5 — Record the commit SHA

```powershell
git rev-parse HEAD
```

Save the full SHA for the release checklist.

## Step 6 — Verify GitHub

Open the repository and verify:

- the latest commit matches the recorded SHA
- `package.json`, `src`, `public`, `netlify.toml`, and documentation are visible
- the branch is `main`

## Step 7 — Configure Netlify

Open the existing Netlify site for:

```text
familytripz.netlify.app
```

Set:

```text
Production branch: main
Build command: npm run build
Publish directory: dist
```

The committed `netlify.toml` contains the same build and publish settings.

## Step 8 — Trigger or wait for deployment

Netlify should deploy the latest `main`.

Expected build sequence:

- dependency installation
- `npm run build`
- publication of `dist`

## Step 9 — Verify deployment status

Deployment must show a successful production deploy.

Do not continue when:

- dependency installation fails
- Vite build fails
- publish directory is missing
- production deploy is cancelled

## Deployment success criteria

- changes committed and pushed
- SHA recorded
- GitHub shows the same SHA
- Netlify uses `npm run build`
- Netlify publishes `dist`
- production deploy succeeds

## Troubleshooting

### Netlify publishes the old static site

Confirm the production branch is `main`, the deploy uses the latest SHA, and the publish directory is `dist`.

### Build succeeds but deploy is blank

Confirm the deploy contains `dist/index.html` and that the SPA redirect from `netlify.toml` is active.

## Next document

Open:

`docs/guides/05_POST_DEPLOYMENT_TESTING.md`
