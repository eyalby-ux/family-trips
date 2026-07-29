# Family Trips Alpha 0.2 — Complete Windows Installation Guide

This guide is written for Windows only. Follow the steps in order.

---

## 1. What you need before starting

Install these tools:

1. **Visual Studio Code**
2. **Node.js 18 or later**
3. **Git for Windows**
4. **Google Chrome** or **Microsoft Edge**
5. A **GitHub account**
6. A **Netlify account**

After installing Node.js or Git, close every open VS Code and PowerShell window and reopen them.

---

## 2. Create the working folders

Open File Explorer and create:

```text
C:\Projects\FamilyTrips
```

You should end up with this folder:

```text
C:\Projects\FamilyTrips
```

Do not save the project inside Downloads, Desktop, OneDrive, or inside the ZIP file.

---

## 3. Save and extract the Alpha 0.2 ZIP

1. Save the downloaded ZIP file inside:

   ```text
   C:\Projects\FamilyTrips
   ```

2. Right-click the ZIP file.
3. Select **Extract All**.
4. Extract it into:

   ```text
   C:\Projects\FamilyTrips
   ```

5. Confirm that the extracted project folder is:

   ```text
   C:\Projects\FamilyTrips\family-trips-alpha-0.2
   ```

6. Open that folder in File Explorer.
7. Confirm that these files and folders exist directly inside it:

   ```text
   package.json
   index.html
   src
   docs
   tests
   netlify.toml
   manifest.webmanifest
   service-worker.js
   ```

Important: `package.json` must be directly inside:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.2
```

If `package.json` is inside another nested folder, move the project one level up or open the correct inner folder.

---

## 4. Open the project in VS Code

1. Open VS Code.
2. Select:

   ```text
   File → Open Folder
   ```

3. Select:

   ```text
   C:\Projects\FamilyTrips\family-trips-alpha-0.2
   ```

4. Click **Select Folder**.
5. In the Explorer panel on the left, confirm you can see:

   ```text
   package.json
   index.html
   src
   docs
   tests
   netlify.toml
   ```

Do not open only the `src` folder.

---

## 5. Open PowerShell inside VS Code

1. In VS Code select:

   ```text
   Terminal → New Terminal
   ```

2. Confirm the prompt ends with:

   ```text
   C:\Projects\FamilyTrips\family-trips-alpha-0.2>
   ```

If it does not, run:

```powershell
cd C:\Projects\FamilyTrips\family-trips-alpha-0.2
```

Confirm the folder by running:

```powershell
Get-Location
```

The result must be:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.2
```

---

## 6. Verify Node.js, npm, and Git

Run each command separately:

```powershell
node --version
```

```powershell
npm --version
```

```powershell
git --version
```

Expected result:

- Node.js: version 18 or later
- npm: any valid version number
- Git: any valid version number

Example:

```text
v24.18.0
11.16.0
git version 2.51.0.windows.1
```

### If `node` or `npm` is not recognized

Confirm that this folder exists:

```text
C:\Program Files\nodejs
```

Then close all VS Code and PowerShell windows and reopen VS Code.

### If PowerShell blocks `npm.ps1`

Run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Type:

```text
Y
```

Press Enter, close the terminal, open a new terminal, and run:

```powershell
npm --version
```

### If `git` is not recognized

Install Git for Windows, then close and reopen VS Code.

---

## 7. Run the Alpha 0.2 quality gate

From the project root run:

```powershell
npm run check
```

The command checks:

- JavaScript syntax
- Required release files
- PWA manifest
- Core smoke tests

A successful result ends with:

```text
Smoke tests passed.
```

Do not continue when the command fails.

Copy the full error output before making any changes.

---

## 8. Start Alpha 0.2 locally

Run:

```powershell
npm run dev
```

The first time, npm may display:

```text
Need to install the following packages:
serve
Ok to proceed? (y)
```

Type:

```text
y
```

Press Enter.

Then open this address in Chrome or Edge:

```text
http://localhost:4173
```

Keep the terminal open while testing.

### Stop the server

Press:

```text
Ctrl + C
```

### If port 4173 is already in use

Run:

```powershell
npx serve . -l 4174
```

Then open:

```text
http://localhost:4174
```

---

## 9. Perform a local verification before touching GitHub

Complete these checks:

1. Open the app.
2. Confirm the app shows Alpha 0.2.
3. Confirm the initial state is empty after local reset.
4. Create a Trip from a document or item.
5. Create at least one dated item.
6. Open Today.
7. Open Timeline.
8. Open Trip Center.
9. Open Packing Lists.
10. Open Contacts.
11. Open Calendar or date picker.
12. Close and reopen the browser tab.
13. Confirm the data remains.
14. Run:

   ```powershell
   npm run check
   ```

Only continue after the checks pass.

---

## 10. Keep the existing Dolomites repository archived

The existing GitHub repository is:

```text
https://github.com/eyalby-ux/family-trips
```

The Dolomites version must remain archived in:

```text
archive/dolomites-prototype
```

Do not delete that branch.

---

## 11. Open the real GitHub repository folder

The repository folder should be:

```text
C:\Projects\FamilyTrips\family-trips-repository
```

If the repository folder does not exist, create it by running:

```powershell
cd C:\Projects\FamilyTrips
```

```powershell
git clone https://github.com/eyalby-ux/family-trips.git family-trips-repository
```

Then enter it:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Confirm the branch:

```powershell
git branch --show-current
```

Expected result:

```text
main
```

Confirm the repository is clean:

```powershell
git status
```

---

## 12. Copy Alpha 0.2 into the GitHub repository

Run this command from PowerShell:

```powershell
robocopy "C:\Projects\FamilyTrips\family-trips-alpha-0.2" "C:\Projects\FamilyTrips\family-trips-repository" /MIR /XD ".git" "node_modules"
```

Important:

- `/MIR` replaces the old `main` contents with Alpha 0.2.
- `.git` is excluded so the repository history remains intact.
- `node_modules` is excluded.
- Robocopy exit codes from `0` through `7` are normally acceptable.
- A non-zero code does not automatically mean failure.

After the copy completes, enter the repository folder:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Check the changes:

```powershell
git status
```

You should see old files marked as deleted or modified and Alpha 0.2 files as new or modified.

---

## 13. Verify Alpha 0.2 inside the repository

Run:

```powershell
npm run check
```

The command must end with:

```text
Smoke tests passed.
```

Then run the local version from the repository folder:

```powershell
npm run dev
```

Open:

```text
http://localhost:4173
```

Confirm it is Alpha 0.2, not the Dolomites version.

Stop the server with:

```text
Ctrl + C
```

---

## 14. Commit Alpha 0.2 to GitHub

Run each command separately:

```powershell
git add -A
```

Check what will be committed:

```powershell
git status
```

Commit:

```powershell
git commit -m "Release Family Trips Alpha 0.2"
```

Push:

```powershell
git push origin main
```

After the push, open GitHub and confirm:

1. The `main` branch contains Alpha 0.2 files.
2. `package.json` contains version `0.2.0` or the expected Alpha 0.2 release metadata.
3. The archive branch still exists.
4. GitHub Actions starts.

---

## 15. Verify GitHub Actions

1. Open the repository on GitHub.
2. Open the **Actions** tab.
3. Open the latest **Quality Gate** run.
4. Confirm it is green.

Do not deploy a failed commit.

---

## 16. Configure Netlify correctly

Open the existing Netlify site.

Go to:

```text
Site configuration → Build & deploy → Build settings
```

Use these exact settings:

```text
Branch to deploy: main
Base directory: leave empty
Build command: leave empty
Publish directory: .
```

Important:

- Build command must not contain `npm run build`.
- Publish directory must not contain `dist`.
- Publish directory must be exactly:

  ```text
  .
  ```

Save the settings.

---

## 17. Deploy Alpha 0.2 in Netlify

1. Open the **Deploys** page.
2. Select:

   ```text
   Trigger deploy → Deploy site
   ```

3. Wait for the deploy to finish.
4. Confirm the log includes:

   ```text
   Preparing Git Reference refs/heads/main
   ```

5. Confirm the deploy is published successfully.

---

## 18. Remove the old PWA cache

Because Alpha 0.1 and the Dolomites prototype used Service Workers, the browser may display an older version after a successful deployment.

### First check

Open the Netlify URL in an InPrivate window:

```text
Ctrl + Shift + N
```

If Alpha 0.2 appears there, the deployment is correct and the normal browser has old cached data.

### Clear the normal browser cache

In Chrome or Edge:

1. Open the Netlify site.
2. Press:

   ```text
   F12
   ```

3. Open **Application**.
4. Open **Service Workers**.
5. Click **Unregister**.
6. Open **Storage**.
7. Click **Clear site data**.
8. Close Developer Tools.
9. Reload the page with:

   ```text
   Ctrl + F5
   ```

Warning: clearing site data removes the locally stored Trip data for that browser.

---

## 19. Install Alpha 0.2 as a Windows PWA

In Chrome or Edge:

1. Open the Netlify URL.
2. Confirm Alpha 0.2 is displayed.
3. Click the install icon in the address bar, or open the browser menu.
4. Select:

   ```text
   Install Family Trips
   ```

5. Confirm installation.
6. Launch the app from the Start menu or desktop shortcut.

If an older installed version exists:

1. Uninstall the old PWA.
2. Clear site data.
3. Open the new Netlify deployment.
4. Install again.

---

## 20. Run the interactive test session

Open:

```text
docs\qa\INTERACTIVE_TEST_SESSION.md
```

Start a new ChatGPT conversation and upload that file.

Use this instruction:

```text
Run the Alpha 0.2 interactive test session from this file.
Give me one test at a time.
```

The session must show:

- Number of mandatory tests
- Number of optional tests
- Current progress
- PASS / FAIL / BLOCKED / NOT TESTED
- Release blockers
- Final GO / NO-GO recommendation

---

## 21. Commands for later Alpha 0.2 fixes

Open the repository folder:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Before every push:

```powershell
npm run check
```

Then:

```powershell
git add -A
```

```powershell
git commit -m "Describe the Alpha 0.2 fix"
```

```powershell
git push origin main
```

Netlify should deploy automatically.

---

## 22. Common problems

### Netlify runs `npm run build`

Remove the Build command from the Netlify UI.

### Netlify says `dist` does not exist

Change Publish directory from `dist` to:

```text
.
```

### Netlify still shows Dolomites

Check:

```powershell
git status
```

Then:

```powershell
git log -1 --oneline
```

Confirm the Alpha 0.2 commit is on `main`.

Also clear the Service Worker and site data.

### `npm run check` says the script is missing

You are probably in the old Dolomites folder or the wrong directory.

Run:

```powershell
Get-Location
```

Then verify `package.json` belongs to Alpha 0.2.

### Git push uses `USERNAME`

Check:

```powershell
git remote -v
```

The remote must be:

```text
https://github.com/eyalby-ux/family-trips.git
```

Correct it with:

```powershell
git remote set-url origin https://github.com/eyalby-ux/family-trips.git
```

### PowerShell blocks npm

Run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then close and reopen the terminal.

---

## 23. Final installation completion checklist

- [ ] Alpha 0.2 ZIP extracted
- [ ] Correct folder opened in VS Code
- [ ] Node.js, npm, and Git verified
- [ ] `npm run check` passed locally
- [ ] Alpha 0.2 opened at `localhost`
- [ ] Alpha 0.2 copied into the Git repository
- [ ] `npm run check` passed inside the repository
- [ ] Alpha 0.2 committed and pushed to `main`
- [ ] GitHub Actions passed
- [ ] Netlify Build command is empty
- [ ] Netlify Publish directory is `.`
- [ ] Netlify deployment succeeded
- [ ] Old Service Worker cache cleared
- [ ] Alpha 0.2 installed as a PWA
- [ ] Interactive test session started
