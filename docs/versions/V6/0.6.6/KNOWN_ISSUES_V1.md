# Family Trips Alpha 0.6.6 — Known Issues

**Document revision:** `V1`
**Candidate:** `0.6.6`

## Open, explicitly accepted (not a defect — a named verification gap)

- **No official venue/museum/OTA URL has been tested end-to-end against the live model.** Every URL exercised during discovery was a ticket-resale/box-office platform (Ticketmaster, tickets.hapoelbc.com, tickets.leaan.net) — the side of the URL sub-scope expected to safe-fail on `robots.txt`, not the side expected to succeed. This is the one mandatory step in `EXECUTABLE_TEST_SESSION_V184.md` (Test 9) that requires a real venue/museum/OTA ticket page and cannot be closed without one. Carried forward unchanged from `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`'s own explicitly-accepted gap.

## Carried forward from `0.6.5` Production monitoring — no `0.6.6` action

Per `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` `V51`, these four require nothing in this candidate:

- `V6-F45` (corrupted lockfile blocking the first Production deploy) — Fixed, live.
- `V6-F46` (Product Owner locked out of Production Smart Import) — Fixed, live.
- `V6-F47` (Hotel PDF failed Smart Import 3 times — genuine OpenAI 5xx responses) — Accepted, not a defect.
- `V6-F48` (file picker reopened on the very first-ever upload, once, never recurred) — Monitoring, not assigned to any version.

## Fixed in this candidate, not yet verified by the Product Owner

- `V6-F49`, `V6-F50`, `V6-F51` — code-level regression tests pass (`tests/v6-49-51-correction.mjs`); the Product Owner's own live confirmation is Tests 8–10 in `EXECUTABLE_TEST_SESSION_V184.md`.

## Inherent, not a defect

- The `unresolved`-sourced-warning dismiss control (`V6-F49` backstop) removes a warning permanently once dismissed — there is no "undo." This is intentional: the warning has no field to re-derive from, so there is nothing to re-check against later. If dismissed in error, the source can be re-analyzed (Retry) to regenerate a fresh draft.
- The `V6-F50` free-text date fallback is deliberately narrow (a labelled `"... date: <value>"` pattern, matching the exact real-world case that motivated it) — it is a lower-confidence backstop for when the tightened prompt doesn't produce a structured field, not a general-purpose date parser, and will not catch every possible phrasing.
