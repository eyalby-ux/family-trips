# Production rollback record — captured before promoting `0.6.7.4`

**Captured:** 2026-09-10, immediately before promoting `0.6.7.4` (build `0.6.7.4-4fe16e5c`, commit `719c8b7`) to Production.

## Production state being replaced

- **Build version:** `0.6.6.3-8f6c1b95`
- **Git commit:** `8f6c1b9` (`version/V6`) — "Doc: FL-002 direction independently confirmed (V6-F72), no code change"
- **Netlify deploy ID:** `6a9db97e87bedefe568f0be0`
- **Netlify site ID:** `72aed09d-86e4-48f9-901d-0f52f6c16078`
- **Promoted originally via:** `netlify deploy --dir dist --prod --no-build` (see `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` `V79`)
- **Confirmed live** via fresh, cache-bypassed fetch of `https://familytripz.netlify.app` immediately before this promotion — `build-version` meta tag read `0.6.6.3-8f6c1b95`, matching the recorded state exactly. Raw response saved alongside this file as `production-index-before-promotion.html`.

## How to roll back

Netlify retains every previous deploy and can restore any of them without a rebuild:

```bash
netlify api restoreSiteDeploy --data '{"site_id":"72aed09d-86e4-48f9-901d-0f52f6c16078","deploy_id":"6a9db97e87bedefe568f0be0"}'
```

Or via the Netlify dashboard: Deploys → find deploy `6a9db97e87bedefe568f0be0` → Publish deploy.

Either restores the exact `0.6.6.3-8f6c1b95` bits Production was serving before this promotion, with no rebuild and no risk of environment drift.

## Why this record exists

Kept outside Netlify's own deploy history as a redundant, git-independent record of exactly what Production was serving and how to get back to it, in case Netlify's own dashboard/deploy history is inaccessible when a rollback is needed. Per the `0.6.7.4` production-promotion prompt's explicit request for a "timestamped external rollback backup... standard practice for every promotion."
