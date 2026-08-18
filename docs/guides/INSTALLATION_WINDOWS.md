# FamilyTrips Alpha 0.6.3 — Windows Installation

Use the package-root scripts. Do not copy application files manually.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
.\scripts\configure_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
```

The installer requires an installed Alpha 0.6.0, 0.6.1 or 0.6.2 handoff on `version/V6`, takes an external backup, verifies checksums, installs dependencies, runs the complete quality gate and does not deploy.

The configuration helper prompts privately for a dedicated Google Places API key and invite-only email list. It removes and immediately recreates the four Alpha 0.6 QA values only as server Function values for Deploy Preview and Branch Deploy contexts. Never store this key in `.env.local`, a `VITE_` variable, Git or browser code.

Deploy the exact built artifact to QA:

```powershell
.\scripts\deploy_QA_V6_0_6_3.ps1 -RepoPath "C:\Projects\FamilyTrips\family-trips-repository"
```

This deploys only to `https://qa--familytripz.netlify.app`. Continue with `docs/versions/V6/EXECUTABLE_TEST_SESSION_V124.md`. Do not deploy to Production before Product Owner GO.
