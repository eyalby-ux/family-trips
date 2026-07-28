# Rollback Guide

## Netlify

1. Open the site in Netlify.
2. Open `Deploys`.
3. Select a previously approved deploy.
4. Select `Publish deploy`.

## Git

Inspect history:

```bash
git log --oneline
```

Revert the bad commit:

```bash
git revert COMMIT_ID
npm run check
git push
```

## Local data warning

Alpha 0.1 has no migration or export mechanism. Use separate Netlify sites or browser profiles when testing incompatible releases.
