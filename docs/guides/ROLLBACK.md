# Rollback — Alpha 0.3 Foundation to Alpha 0.2.1

Use the rollback branch created by the upgrade guide.

```powershell
cd C:\Projects\FamilyTrips\family-trips-repository
git checkout archive/alpha-0.2.1-before-vite
git push --force-with-lease origin HEAD:main
```

Restore Netlify settings:

```text
Build command: empty
Publish directory: .
```

Trigger a new deploy.

If a browser or installed PWA still loads the Foundation build, clear site data for `familytripz.netlify.app` and reopen the site.

Alpha 0.2.1 local data uses the same local-storage key and should remain available, but rollback verification is still required on the target device.
