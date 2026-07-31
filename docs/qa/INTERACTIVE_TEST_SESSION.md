# Interactive Test Session — Alpha 0.3 Foundation

Run one test at a time and wait for the tester's result.

Classify every test as PASS, FAIL, BLOCKED, or NOT TESTED.

## Mandatory tests — 12

1. `npm install` completes.
2. `npm run check` completes and includes a successful Vite build.
3. `npm run dev` opens the signed-out screen.
4. Google sign-in succeeds locally.
5. Refresh preserves the authenticated session.
6. Sign-out returns to the signed-out screen.
7. Existing Alpha 0.2.1 local Trip data remains visible after sign-in.
8. The legacy Add flow opens and remains usable.
9. `npm run preview` serves the production build.
10. Netlify deploy succeeds with `npm run build` and `dist`.
11. Google sign-in succeeds on `familytripz.netlify.app`.
12. Android PWA updates, launches, and opens its offline shell after one online load.

## Security verification — 3 mandatory

1. Firestore remains deny-all.
2. Storage remains deny-all.
3. No privileged credential is present in the package or repository.

## Result

At the end, produce a GO or NO-GO recommendation and record all browser, Netlify, Firebase, and PWA findings.
