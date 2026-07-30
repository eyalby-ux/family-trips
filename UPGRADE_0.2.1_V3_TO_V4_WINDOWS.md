# Upgrade Guide — Alpha 0.2.1 Package v3 to v4 on Windows

This v4 package fixes the critical freeze caused by pressing the global `+` button.

## 1. Extract v4

Extract the package to:

```text
C:\Projects\FamilyTrips\family-trips-alpha-0.2.1-v4
```

Confirm that `package.json` exists directly inside that folder.

## 2. Open the repository

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
git checkout main
git pull origin main
git status
```

Continue only when the working tree is clean.

## 3. Create a backup branch

```powershell
git branch archive/alpha-0.2.1-v3
git push -u origin archive/alpha-0.2.1-v3
```

## 4. Copy v4 into the repository

```powershell
robocopy "C:\Projects\FamilyTrips\family-trips-alpha-0.2.1-v4" "C:\Projects\FamilyTrips\family-trips-repository" /MIR /XD ".git" "node_modules"
```

Robocopy exit codes 0–7 are normally successful.

## 5. Run the quality gate

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
npm run check
```

Expected:

```text
Smoke tests passed.
```

## 6. Verify the critical fix locally

```powershell
npm run dev
```

Open:

```text
http://localhost:4173
```

Then:

1. Press the global `+` button.
2. Confirm the source-selection screen opens.
3. Switch between Manual, File, Photo, and Link.
4. Confirm the app remains responsive.
5. Open Developer Tools and confirm there is no `sourceStep is not defined` error.

Stop the server with `Ctrl + C`.

## 7. Commit and push

```powershell
git add -A
git commit -m "Fix Alpha 0.2.1 create item source step"
git push origin main
```

## 8. Netlify

Confirm:

```text
Branch: main
Build command: empty
Publish directory: .
```

Wait for the new deploy to become Published.

## 9. PWA cache

Close the installed PWA completely and reopen it.

When the old version remains:

1. Open the Netlify URL in Edge or Chrome.
2. Press `F12`.
3. Open Application → Service Workers.
4. Select Unregister.
5. Reload the site.

Clearing all site data may remove local test data, so do not do that unless necessary.

## 10. Final verification

- [ ] `+` opens the source-selection screen
- [ ] Manual entry opens
- [ ] File upload opens
- [ ] Photo capture opens
- [ ] Link entry opens
- [ ] No console error
- [ ] Existing Trip data remains
- [ ] Netlify deploy is Published
- [ ] Installed PWA opens
