# Build and Deployment Guide

Alpha 0.1 is a static application. There is no compilation step and no generated build folder.

## Quality gate

```bash
npm run check
```

This must pass before release.

## Local server

```bash
npm run dev
```

Default URL:

```text
http://localhost:4173
```

## Netlify settings

- Branch: `main`
- Base directory: empty
- Build command: empty
- Publish directory: `.`

## Post-deployment checks

1. Create a Trip from a document.
2. Create an item.
3. Edit Trip dates.
4. Refresh and confirm persistence.
5. Install the PWA.
6. Verify offline shell behavior.
