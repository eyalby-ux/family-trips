# 01 — Installation on Windows

## Goal

Safely copy Alpha 0.3 Foundation into the existing Git repository, install dependencies, and leave the project ready for local testing.

## Prerequisites

- Windows 10 or 11
- PowerShell
- Git
- Node.js 20.19 or later
- Existing repository at:

```text
C:\Projects\FamilyTrips\family-trips-repository
```

- Extracted package at:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation-v3
```

## Step 1 — Open PowerShell

Open a normal PowerShell window.

## Step 2 — Verify Node.js and Git

Run:

```powershell
node --version
npm --version
git --version
```

Expected:

- Node.js is `20.19.0` or later.
- npm and Git return version numbers.

Do not continue if Node.js is older.

## Step 3 — Enter the repository

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

## Step 4 — Verify the working tree

```powershell
git status
```

Expected:

```text
nothing to commit, working tree clean
```

If files are modified, stop. Do not overwrite them.

## Step 5 — Synchronize `main`

```powershell
git checkout main
git pull origin main
```

Expected:

- branch is `main`
- pull completes without conflict

## Step 6 — Create and push the rollback branch

```powershell
git branch archive/alpha-0.2.1-before-vite
git push origin archive/alpha-0.2.1-before-vite
```

If the branch already exists, verify it:

```powershell
git branch --list archive/alpha-0.2.1-before-vite
git ls-remote --heads origin archive/alpha-0.2.1-before-vite
```

Both commands must show the branch.

## Step 7 — Copy the release package

Run:

```powershell
robocopy "C:\Projects\FamilyTrips\family-trips-alpha-0.3-foundation-v3" "C:\Projects\FamilyTrips\family-trips-repository" /MIR /XD ".git" "node_modules" "dist"
```

Robocopy exit codes `0` through `7` are successful.

Check the most recent exit code:

```powershell
$LASTEXITCODE
```

Do not continue if it is `8` or higher.

## Step 8 — Verify critical files

```powershell
Test-Path .\package.json
Test-Path .\src\main.js
Test-Path .\src\firebase.js
Test-Path .\netlify.toml
Test-Path .\START_HERE.md
```

Expected: five `True` values.

## Step 9 — Install dependencies

```powershell
npm install
```

If npm reports blocked install scripts, review them:

```powershell
npm install-scripts ls
```

For this package, the expected dependencies are:

- `@firebase/util`
- `esbuild`
- `protobufjs`

Approve only those packages:

```powershell
npm install-scripts approve @firebase/util esbuild protobufjs
```

Then run:

```powershell
npm install
```

## Step 10 — Confirm installation state

```powershell
git status --short
```

Expected: release files and dependency-lock changes may be listed. There must be no merge-conflict markers.

## Installation success criteria

Installation passes when:

- rollback branch exists locally and on GitHub
- `robocopy` returned 0–7
- dependencies installed
- the five critical files exist

## Troubleshooting

### `node` is not recognized

Install a supported Node.js version, close PowerShell, open a new PowerShell window, and repeat this document.

### `git pull` reports conflicts

Stop. Do not run `robocopy`.

### `npm install` fails

Copy the complete error output before making another change.

## Next document

Open:

`docs/guides/02_LOCAL_TESTING.md`
