# FamilyTrips Alpha 0.6.3 Release Notes

Document revision: `V4`  
Date: 2026-08-15  
Status: QA candidate; not yet approved for Production

## Correction in 0.6.1

- Fixes `V6-F01`: Alpha 0.6.0 was deployed to a version-specific Netlify alias that was not in the Firebase OAuth/API-key referrer allowlists, so Google sign-in was blocked.
- Adds a guarded deployment helper that always uses the authorized general `qa` alias and the exact already-built artifact with `--no-build`.
- Keeps the Hotel Smart Import runtime, security boundary and product scope unchanged.

## Correction in 0.6.3

- Fixes `V6-F03`: the 0.6.2 inventory parser missed the existing Places variable and repeated the forbidden combined context/scope update.
- Removes each of the four Alpha 0.6 QA variables with `--force`, then immediately recreates it with Functions scope and only Deploy Preview/Branch Deploy contexts.
- Does not parse Netlify inventory and does not deploy while configuration is running.
- Always retains `eyalby@gmail.com` as Product Owner and merges additional invitations; `paolakohan@gmail.com` is the default additional account.

## Included

- Hotel-first Smart Import for PDF, PNG/JPEG/WebP and one bounded public URL page.
- Explicit **Save/Attach only** paths that invoke no AI.
- Explicit **Analyze and propose / Attach and extract** paths with review-before-apply.
- Evidence, certainty, important notes, unresolved values and explicit absences retained in the proposal.
- Original source kept separately and reachable from the Hotel Documents/Tickets area.
- Exact Hotel name first in Google Places validation; display Location remains the Hotel name and canonical place metadata remains separate.
- Server-side Firebase-token verification, invite-only email allowlist, Trip-owner registration, daily per-user quota and content-free audit metadata.
- Protected/private URL safety, SSRF controls, payload/page/redirect limits and non-retained model calls.
- Existing manual and validated QR/JSON paths, Offline shell and 0.5.6 Trip-range correction retained.

## Not included

- Automatic item creation or silent overwrite.
- Login/session/CAPTCHA retrieval or credential collection.
- Broad web search or crawling.
- Non-Hotel Smart Import.
- Multi-trip, invitations UI, Owner/Editor sharing, cloud synchronization, Expenses, Shopping, first-class Transport or expanded Tasks; these remain Alpha 0.7 or later.

## Acceptance

Install with `scripts/install_V6_0_6_3.ps1`, configure server-only QA values with `scripts/configure_V6_0_6_3.ps1`, deploy with `scripts/deploy_QA_V6_0_6_3.ps1`, and follow `EXECUTABLE_TEST_SESSION_V124.md`. Production promotion requires explicit Product Owner GO on the exact tested artifact.
