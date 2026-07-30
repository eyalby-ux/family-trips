# Upgrade Guide — Alpha 0.2 to Alpha 0.2.1 on Windows

This guide assumes:

- Your GitHub repository is `https://github.com/eyalby-ux/family-trips`
- The local repository folder is:
  `C:\Projects\FamilyTrips\family-trips-repository`
- The extracted Alpha 0.2.1 package folder is:
  `C:\Projects\FamilyTrips\family-trips-alpha-0.2.1`
- Netlify deploys the `main` branch
- Netlify publish directory is `.`
- Netlify build command is empty

Do not copy files into the repository until the backup steps are complete.

---

## 1. Download and extract Alpha 0.2.1

1. Download the Alpha 0.2.1 ZIP file.
2. Save it in:
   ```text
   C:\Projects\FamilyTrips
   ```
3. Right-click the ZIP.
4. Select **Extract All**.
5. Confirm the extracted folder is:
   ```text
   C:\Projects\FamilyTrips\family-trips-alpha-0.2.1
   ```
6. Confirm this file exists:
   ```text
   C:\Projects\FamilyTrips\family-trips-alpha-0.2.1\package.json
   ```

Do not open or edit files directly inside the ZIP.

---

## 2. Open the existing Git repository

Open PowerShell and run:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Confirm that this is the repository:

```powershell
git status
```

Expected result:

```text
On branch main
```

---

## 3. Make sure the repository is clean

Run:

```powershell
git status
```

If the result says:

```text
nothing to commit, working tree clean
```

continue.

If there are uncommitted changes, do not continue until they are committed or intentionally discarded.

---

## 4. Update the local `main` branch

Run:

```powershell
git checkout main
```

Then:

```powershell
git pull origin main
```

This ensures the local repository matches GitHub before the upgrade.

---

## 5. Create a backup branch for Alpha 0.2

Run:

```powershell
git branch archive/alpha-0.2
```

Push the backup branch to GitHub:

```powershell
git push -u origin archive/alpha-0.2
```

Verify the command completed successfully before continuing.

This branch preserves the complete Alpha 0.2 state.

---

## 6. Copy Alpha 0.2.1 into the repository

Run this command exactly:

```powershell
robocopy "C:\Projects\FamilyTrips\family-trips-alpha-0.2.1" "C:\Projects\FamilyTrips\family-trips-repository" /MIR /XD ".git" "node_modules"
```

Important:

- `/MIR` makes the repository files match the 0.2.1 package.
- `.git` is excluded, so Git history is preserved.
- `node_modules` is excluded.
- Robocopy exit codes from `0` through `7` are normally successful.
- Do not delete the `.git` folder.

---

## 7. Review the file changes

Run:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Then:

```powershell
git status
```

Expected:

- Modified files
- Possibly added files
- Possibly deleted files
- No error saying this is not a Git repository

Review the summary before continuing.

---

## 8. Run the Alpha 0.2.1 quality gate

Run:

```powershell
npm run check
```

Expected final message:

```text
Smoke tests passed.
```

Do not commit or deploy if this command fails.

---

## 9. Test Alpha 0.2.1 locally

Start the local server:

```powershell
npm run dev
```

Open:

```text
http://localhost:4173
```

Complete these minimum checks:

1. Existing Alpha 0.2 local data still appears.
2. A saved link can be opened from its linked item.
3. Selecting a date in Calendar displays that day's events.
4. Long file names do not break the mobile layout.
5. Contact phone remains optional.
6. Today no longer contains duplicate Quick Access.
7. Trip Center cards are displayed correctly.

Stop the server with:

```text
Ctrl + C
```

---

## 10. Commit Alpha 0.2.1

Run:

```powershell
git add -A
```

Then:

```powershell
git commit -m "Upgrade Family Trips to Alpha 0.2.1"
```

Verify the commit was created successfully.

---

## 11. Push Alpha 0.2.1 to GitHub

Run:

```powershell
git push origin main
```

Then open GitHub and verify:

- The latest commit is `Upgrade Family Trips to Alpha 0.2.1`
- The `main` branch contains the 0.2.1 files
- The `archive/alpha-0.2` branch exists

---

## 12. Verify Netlify settings

In Netlify open:

```text
Site configuration → Build & deploy → Build settings
```

Confirm:

```text
Branch to deploy: main
Build command: empty
Publish directory: .
```

Do not use:

```text
npm run build
```

Do not use:

```text
dist
```

This release is a static application served directly from the repository root.

---

## 13. Trigger and verify the Netlify deployment

After the GitHub push, Netlify should start a new deployment automatically.

In Netlify:

1. Open **Deploys**.
2. Open the newest deployment.
3. Confirm it uses the latest `main` commit.
4. Confirm the deployment status is **Published**.
5. Open the deployed URL.

---

## 14. Clear the old PWA cache

Because Alpha 0.2 was installed as a PWA, the browser may continue to show cached files.

### Chrome or Edge on Windows

1. Open the deployed Netlify site.
2. Press:
   ```text
   F12
   ```
3. Open the **Application** tab.
4. Select **Service Workers**.
5. Click **Unregister**.
6. Select **Storage**.
7. Click **Clear site data**.
8. Close the browser tab.
9. Open the Netlify site again.

### Installed PWA

1. Close the installed app completely.
2. Clear the site data using the browser steps above.
3. Reopen the app.
4. If the old icon or version remains, uninstall the PWA and install it again.

Warning: clearing site data can remove local application data. Complete the data-preservation check below before clearing data.

---

## 15. Preserve Alpha 0.2 local data

Alpha 0.2 and 0.2.1 use compatible local storage, but browser cache clearing can remove local data.

Before clearing site data:

1. Open the current application.
2. Confirm important Trip information is recorded elsewhere when necessary.
3. Do not select **Clear site data** until you are prepared to recreate local test data.
4. Use the same Netlify URL and browser profile to preserve compatible local storage.

This release does not yet include a full export/import migration tool.

---

## 16. Verify the deployed Alpha 0.2.1 version

Complete these checks on the Netlify site:

1. Open the app.
2. Confirm the Trip appears.
3. Open an item with a saved source link.
4. Confirm the source link opens.
5. Open Calendar.
6. Select a date containing events.
7. Confirm those events are displayed.
8. Open Today.
9. Confirm Quick Access is not duplicated.
10. Open Trip Center.
11. Confirm compact cards display correctly.
12. Close and reopen the app.
13. Confirm data remains.
14. Test the installed PWA.
15. Test offline opening after one successful online load.

---

## 17. Roll back when required

### Fast Netlify rollback

1. Open Netlify.
2. Open **Deploys**.
3. Select the last successful Alpha 0.2 deployment.
4. Select **Publish deploy**.

### Git rollback to the Alpha 0.2 archive branch

Run:

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
```

Then:

```powershell
git checkout archive/alpha-0.2
```

Do not push this branch over `main` unless you intentionally want to restore Alpha 0.2.

For a safe `main` rollback, create a new rollback commit or use Netlify's previous deployment while investigating.

---

## 18. Final upgrade checklist

- [ ] Alpha 0.2.1 package extracted
- [ ] Local repository opened
- [ ] `main` updated from GitHub
- [ ] `archive/alpha-0.2` created locally
- [ ] `archive/alpha-0.2` pushed to GitHub
- [ ] Files copied with Robocopy
- [ ] `npm run check` passed
- [ ] Local tests passed
- [ ] Commit created
- [ ] `main` pushed
- [ ] Netlify settings verified
- [ ] New deployment published
- [ ] PWA cache handled
- [ ] 0.2.1 fixes verified
- [ ] Rollback path confirmed
