`0.6.6.1`'s implementation is approved for QA deployment. Please deploy it, same pattern as every prior deploy this session:

1. Redeploy QA. Build first if needed since these are real code changes (not just env vars) — match the established flow otherwise.
2. Confirm the new deploy is genuinely live using the same freshness check as before (`available_functions` entry / creation timestamp for the relevant functions — `smart-import` at minimum) and confirm the build identifier reflects the new commit (`0.6.6.1-e9f794ca`, `31656f6` on `version/V6`).
3. Report back the new build identifier and deploy ID, and confirm which commit it's built from, so Eyal can verify he's testing the right build before starting his retest.

Do not touch Production. This is QA only.
