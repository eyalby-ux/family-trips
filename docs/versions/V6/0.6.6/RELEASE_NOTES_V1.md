# Family Trips Alpha 0.6.6 — Release Notes

**Document revision:** `V1`
**Candidate:** `0.6.6` (branch `version/V6`)
**Status:** Implementation complete, not yet installed or accepted. Production remains on `0.6.5` (`0.6.5-a915a440`) until this candidate passes its own executable acceptance session and receives explicit Product Owner GO.

## What's new

### Attraction/Event Smart Import

The third Smart Import vertical, after Hotel (`0.6.0`–`0.6.4`) and Flight (`0.6.5`). Extracts entry/admission tickets — museum, theme park, zoo, tour, sports match, show — directly into the existing `activity` item type (`ITEM_TYPES.activity`/`TYPE_FIELDS.activity` in `src/ingestion.js` were already full peers of every other type before this package; no data-model change was needed).

- Same architecture as Hotel/Flight: `Source`/`ProcessingAttempt`/`ExtractedDraft`/`Proposal`/`Attachment`, the two-choice Global Add flow, `Attach only`/`Attach and extract` on an existing Attraction item, review-before-apply, explicit approval.
- Sources: PDF and image/screenshot (gallery or camera), plus **public URL** — unlike Flight, URL acquisition is in scope. An official venue/museum/OTA URL is the intended target and expected to work; a ticket-resale/box-office platform URL (Ticketmaster, vivenu, hapoelbc.com) is expected to land on a safe-failure state — either the existing `access_required` (login wall) or the new `robots_disallowed` (blocked by the site's own `robots.txt`, backed by real pre-implementation evidence: 4 independently tested ticket-platform URLs, 4/4 blocked this way).
- Per-ticket-holder evidence: a source with several physical tickets (e.g. a family of four) reports each one's own name (when the source actually names individuals), ticket number and seat/section — never collapsing several named people into one entry, and never fabricating names when the source genuinely doesn't provide them.
- Location validation reuses the same property-first Google Places accuracy gate Hotel already has, generalized to attraction/venue place types instead of lodging types.
- Required-fields policy (frozen in `ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md` `V4`): event/attraction name, date, time and venue/location are no-omission blockers; ticket/confirmation number is required-when-present, not a blocker (unlike Flight's PNR treatment).

**Implementation decisions made explicit** (per the discovery document's own instruction not to resolve these silently):
- A companion/duplicate-source pair describing two distinct bookable things at the same venue on the same day (e.g. general museum entrance + a separately-ticketed show) lands as **two separate items**, surfaced to the Product Owner through the app's existing generic duplicate-detection dialog — an explicit "keep both" choice, never a silent merge or a silent, disconnected duplicate.
- A source with multiple physical tickets but no per-person names anywhere (e.g. a family day-park ticket) reports **zero fabricated participants**, with every individual ticket still represented via `details.ticketNumbers`/`details.ticketHolders`.

### Three `0.6.5` Production findings fixed (`V6-F49`, `V6-F50`, `V6-F51`)

Found during real post-launch `0.6.5` Production use (see `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md` `V51`) and folded into this same candidate. All three traced to one root cause: the model sometimes resolved a conflict into free-text `draft.unresolved` prose instead of a structured field, and the app only trusted structured fields.

- **`V6-F49`** — a needs-review warning now genuinely clears when its field is edited (a mapping gap meant it never could, for any Hotel field); a warning with no field to match against (sourced from free text) is now clearly marked and offers a manual dismiss control.
- **`V6-F50`** — a date the model resolves correctly but only explains in free text now still reaches the date field (flagged for review), instead of rendering silently blank.
- **`V6-F51`** — the Smart Import review screen now pre-fills a blank date with the Trip's start date, matching what manual item creation and approval-time defaulting already did.

## Quality gate

`npm run check` passes in full: every `node --check` syntax pass, the entire automated test suite (14 suites, including 2 new ones — `tests/v6-49-51-correction.mjs`, `tests/v6-6-attraction-event-import.mjs`), and the production build. Build identifier: `0.6.6-128eabae`.

## What this package does not include

- **No live model verification.** Every test above exercises the extraction *adapter* against hand-verified transcriptions of the real `AE-001`–`AE-007` documents (the same pattern already used for Hotel/Flight) — there is no API access from this environment to run the actual model call. A live QA pass against the deployed candidate is required; see `EXECUTABLE_TEST_SESSION_V184.md`.
- **No official venue/museum/OTA URL has been tested end-to-end.** This is an explicitly accepted, named gap carried from the discovery document — every URL tested so far (during discovery, before implementation) was a ticket-resale platform, the side expected to safe-fail. This is the one mandatory verification step in the acceptance session that only a live test against a real venue URL can close.
- **No deploy of any kind.** This candidate has not been installed, deployed to QA, or deployed to Production. Production remains on `0.6.5`.
