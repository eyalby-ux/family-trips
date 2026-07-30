# Test Results — Family Trips Alpha 0.2.1

Test date: 2026-07-30  
Environment: Windows local server, Netlify deployment, Android Chrome/PWA  
Package revision: v4

## Result
- New fixes: 7 / 7 passed
- Critical regression: 8 / 8 passed
- Optional regression: 5 / 5 passed
- Total: 20 / 20 passed
- Recommendation: GO for the Alpha 0.2.1 usability baseline

## Corrections verified
- Restored `sourceStep()`.
- Fixed the global Add freeze.
- Bumped the PWA cache to `family-trips-alpha-0.2.1-v4`.
- Verified locally, on Netlify, and in the Android PWA.

## Carried-forward findings
1. Clean URLs open, but descriptive text containing a URL is not parsed. Schedule: Alpha 0.4.
2. Linked source URLs cannot yet be edited. Schedule: document/source ownership.
3. Multi-day items appear only on the start date in Calendar. Schedule: Alpha 0.5.
4. Category-level Add does not prefill the current category. Schedule: Alpha.
5. Trip Center density and FAB positioning require Beta refinement.