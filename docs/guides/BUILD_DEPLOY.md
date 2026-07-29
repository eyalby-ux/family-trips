# Build and Deployment

This is a static PWA with no compile step. Quality gate: `npm run check`. Local server: `npm run dev`. Netlify: Build command empty, Publish directory `.`. After deployment, clear the old Service Worker when a previous release remains cached.
