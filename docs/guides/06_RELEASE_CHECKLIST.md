# 06 — Alpha 0.3 Foundation Release Checklist

Decision date: 2026-07-31
Final decision: **GO**

## Quality and deployment

- [x] `npm run check` passed
- [x] smoke tests passed
- [x] Vite production build passed
- [x] local preview passed
- [x] GitHub Quality Gate passed
- [x] Netlify deploy is Published
- [x] production assets return HTTP 200
- [x] Service Worker is activated and running

## Authentication

- [x] Google sign-in passed locally
- [x] Google sign-in passed in production
- [x] session persistence passed
- [x] sign-out passed
- [x] second sign-in passed
- [x] local Trip data remained available

## Safety and scope

- [x] Firestore remains deny-all
- [x] Storage remains deny-all
- [x] no cloud Trip or document feature was accepted
- [x] repository is clean and synchronized
- [x] ELAL filename issue is assigned to Alpha 0.4
- [x] offline cold-start limitation is documented

## Evidence

- `docs/qa/TEST_RESULTS_ALPHA_0.3_FOUNDATION.md`
- `docs/release/KNOWN_ISSUES.md`
- `docs/release/RELEASE_NOTES.md`

## Decision

- [x] **GO — Alpha 0.3 Foundation accepted**
- [ ] NO-GO

## Next process requirement

Starting with Alpha 0.4, upload `EXECUTABLE_TEST_SESSION.md` to ChatGPT before final testing.