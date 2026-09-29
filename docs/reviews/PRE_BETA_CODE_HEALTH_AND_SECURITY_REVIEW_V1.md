# Pre-Beta Code Health & Security Review — V1

Date: 2026-09-28
From: Product Owner's planning/QA-assistant (document-only)
Scope: requested directly by the Product Owner — *"I want to review now the code of the app to find
duplications or an resolved issues we may want to fix before Beta version, as en example - security, do we
need to change something?"*

**This is a document-only review.** No application code was changed to produce it. Everything below is
findings and recommendations for the Product Owner to schedule (or not) via the planning assistant — the
same as every other backlog item in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`. All findings were confirmed by
reading the actual repository directly (`family-trips-repository`, `version/V7` branch, matching `0.7.9`'s
closed state), not assumed.

## How to read this document

Each finding gets an ID (`CR-001` etc., "Code Review") and a recommended disposition:

- **Fix before Beta** — worth a small, scoped correction candidate before opening the app more broadly.
- **Backlog** — real, but low enough severity/likelihood that it can sit in the normal backlog like any
  other post-MVP item.
- **No action** — noted for completeness, not a real risk.

The Product Owner decides disposition; nothing here is auto-scheduled.

## Security findings

### CR-001 — `trips/{tripId}` Firestore rule has no field-level write restriction

**File:** `firestore.rules`. **Recommended: fix before Beta.**

The Trip-level access rule reads, in effect, `allow list, update: if hasTripAccess(resource)` — anyone who
passes as an Owner or Editor on a Trip can update **any** field of that Trip document, including `ownerUid`
and `editorEmails` themselves. The app's own UI never exposes a way to edit those two fields directly, but
Firestore rules are the actual security boundary — anyone with an Editor's credentials could, in principle,
write directly to Firestore (bypassing the app UI entirely, e.g. via the Firestore REST API with their own
valid ID token) and promote themselves to Owner, or add/remove other people's Editor access, on a Trip they
were only ever invited to edit.

This matters more than it would in a typical app because of this project's specific trust model: Editors are
family members and friends the Product Owner has personally invited — not anonymous users — so the practical
blast radius is limited. But it's a real privilege-escalation gap in the actual security boundary, worth
closing before the app has more than a handful of trusted people using it. The fix is a standard Firestore
rules pattern: restrict `update` to `hasTripAccess(resource) && request.resource.data.ownerUid == resource.data.ownerUid && request.resource.data.editorEmails == resource.data.editorEmails`
(Owner-only fields stay immutable to an ordinary `update`, with a separate, narrower rule for the Owner's own
explicit "change Editors" action) — small, self-contained, no data migration.

### CR-002 — Smart Import's SSRF defense re-resolves DNS after its own private-IP check (rebinding gap)

**File:** `netlify/functions/smart-import.mjs`. **Recommended: backlog (defense-in-depth, not urgent).**

The URL-based Smart Import path (Hotel/Activity only — Flight/Insurance/Car explicitly disallow URLs) has a
genuinely solid SSRF defense: `assertPublicHost()` does real DNS resolution (`dns.lookup(hostname,{all:true})`,
not a hostname string check) and rejects the request if **any** resolved address falls in a private/loopback/
link-local/multicast range — covering IPv4 `10.x`, `127.x`, `169.254.x` (this also blocks cloud metadata
endpoints like `169.254.169.254`), `172.16–31.x`, `192.168.x`, and reserved `224+`, plus IPv6 loopback,
unique-local (`fc00::/7`), and link-local (`fe80::/10`). This check re-runs on every redirect hop (up to 3),
alongside a robots check, a 12-second timeout, and manual (non-automatic) redirect handling. This is a
well-built control, not a naive one.

The one gap: `assertPublicHost()` resolves and validates the hostname, then a **separate** `fetch()` call
does its own independent DNS resolution to actually connect. Between those two lookups there's a narrow
window where a classic DNS-rebinding attack — an attacker-controlled domain configured with a very low TTL
that returns a public IP for the check and a private IP for the real connection — could theoretically slip
past the check. Exploiting this requires the attacker to control a domain's DNS with precise timing, which is
a meaningfully higher bar than most SSRF bypasses; given the feature also fails closed on ambiguous cases (a
non-2xx or a 4th redirect just errors) and only ever feeds the extracted text into an LLM call (not back into
anything else with elevated trust), this is worth fixing eventually but doesn't block Beta by itself. The
robust fix, if picked up, is to resolve once and pin the connection to that resolved IP for the actual fetch
(e.g. a custom DNS lookup function passed to Node's `fetch`/`undici` dispatcher) rather than trusting a
second, independent resolution.

### CR-003 — Daily Smart Import quota check has a non-atomic race

**File:** `netlify/functions/_shared/smart-import-quota.mjs`, `consumeDailyQuota()`. **Recommended: no
action.**

`consumeDailyQuota` reads the current count, checks it against the limit, then writes `count+1` back — three
separate steps, not an atomic increment. Two Smart Import requests from the same account arriving at almost
the same instant could both read a count just under the limit and both be allowed through, overshooting the
daily quota by a request or two. This is purely a cost-control mechanism (capped at 100/day, not a security
boundary — the request itself is still fully authorized and rate-limited elsewhere), and the realistic
trigger is a person double-tapping "analyze" while impatient, not an attack. Not worth spending Beta-prep time
on; flagging only so it's a known, deliberate non-issue rather than an unreviewed gap.

### What was reviewed and found solid (no issues)

For completeness, so this reads as a real review rather than a cherry-picked list — these were read in full
and specifically checked, not skimmed:

- **`storage.rules`** — correctly mirrors `firestore.rules` via cross-service `firestore.get()` checks, with
  a proper `allow read, write: if false` default-deny catch-all for anything not explicitly matched.
- **`netlify/functions/_shared/smart-import-auth.mjs`** — every Smart Import call verifies a real Firebase ID
  token against Google's own public JWKS (not a shared secret), checks `email_verified`, then re-checks active
  invitation status via a rules-respecting REST call using the *caller's own* token — never a privileged
  credential.
- **`netlify/functions/admin-delete-account.mjs`** — the one function in the codebase that uses a privileged
  Admin SDK credential, and it's handled carefully: caller must independently pass both `authorize()` and a
  fresh server-side `isAdmin` re-check, requires explicit `targetEmail`+`confirm:true`, refuses self-deletion,
  independently re-verifies the 30-day quarantine window server-side (deliberately not trusting the client-
  facing copy of that logic), writes an audit record before deleting, and deletes Storage before Firestore.
- **`netlify/functions/_shared/smart-import-quota.mjs`'s Trip-ownership check** — reconciled against
  Firestore's own `ownerUid`/`editorEmails` via the caller's own token (not an Admin bypass), with a
  documented, narrow fallback to the legacy pre-`0.7.2` record only for Trips that predate Firestore
  migration.
- **`netlify/functions/_shared/place-validation.mjs`** — no injection surface; builds its Google Places query
  from already-normalized fields and calls the API with a server-side key from environment, never exposed to
  the client.
- **Client-side XSS posture** — the app's own `esc()` HTML-escaping helper is used consistently everywhere
  user-authored or extracted text is interpolated into a rendered template in `src/v5-app.js` (item titles,
  notes, provider/location/confirmation-number fields, participant and task names, Trip name, etc. — every
  instance sampled across the file was wrapped in `esc()`). No `eval()` or `new Function()` anywhere in the
  codebase.
- **Server-side secrets** — confirmed via a full grep of server-side env reads: only four env vars are read
  (`FIREBASE_ADMIN_SERVICE_ACCOUNT`, `FAMILYTRIPS_GOOGLE_PLACES_API_KEY`,
  `FAMILYTRIPS_FIREBASE_PROJECT_ID`/its public `VITE_` fallback, `FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA`), all
  via `Netlify.env.get()`, never sent to the client. `src/firebase.js`'s `VITE_FIREBASE_API_KEY` is Firebase's
  standard public Web API key, not a secret by design (it's meaningless without the rules layer behind it,
  which is exactly what `firestore.rules`/`storage.rules` provide).
- **Smart Import's OpenAI client** — instantiated with no explicit key (`new OpenAI()`), relies on the SDK's
  own default `OPENAI_API_KEY` env read — never constructed with, or logged alongside, a client-supplied
  value.

## Duplication / dead code

### CR-004 — `src/legacy-app.js` and `src/v4-app.js` are fully dead code

**Recommended: fix before Beta (pure deletion, essentially zero risk).**

Confirmed directly: the app's actual entry point (`src/main.js`) dynamically imports only
`src/v5-app.js` (`await import('./v5-app.js')`, line 104). A full search of every `.js`/`.html` file in the
repo for the strings `legacy-app` and `v4-app` turns up **zero** references anywhere outside the files
themselves — nothing imports, requires, or dynamically loads either one. Both are relics from the Alpha
0.2–0.4 era (their own internal `KEY` constant is still literally `'family-trips-alpha-0.2'`), last touched
only incidentally in a bulk branch-sync commit on 2026-08-18 (not a real edit), genuinely orphaned since
`v5-app.js` took over. Combined, that's 142 lines (`legacy-app.js`: 36, `v4-app.js`: 106) that can be deleted
outright with no functional risk — nothing reachable depends on them. No other duplication of this kind was
found; the rest of the codebase (adapters, shared Netlify function helpers) reads as intentionally organized,
not duplicated.

## Already-known open/deferred findings (consolidated for reference)

Pulled together here from across the delivery plan's history so the Product Owner has one place to see
everything currently open, not just what this review found new. Nothing below is new — all pre-existed this
review.

| ID | What it is | Current disposition |
|---|---|---|
| `V6-F80` | Needs-review Smart Import warning has no explicit "not correct" affordance, only "confirm as correct" | Assigned, target **Beta** |
| `V7-F14` | A revoked/quarantined account's local session shows only a generic "cloud unavailable" message, not that the account was removed | Open, unassigned, no target version |
| `V7-F15` | Item detail view still shows two visually separate ticket-related sections rather than one unified section | Deferred to a future Beta-version UI pass, no specific version yet |
| `V7-F16` | No undo/un-confirm action for a mistaken "confirm as ticket coverage" click | Open, unscheduled |
| `WC-001` | A photographed composite document (Swedish hotel folio + card slip) produces no Smart Import extraction proposal at all — a genuine, pre-existing recognition gap, not something any recent candidate introduced | Open, logged, explicitly non-blocking, no target version |

(`V6-F79` and `V6-F82` are already fully resolved and closed — included in the search that produced this
table, but left out of it since they need no further tracking.)

## Recommendation

Two items (`CR-001`, `CR-004`) are small, self-contained, and worth a short scoped correction candidate
before Beta — neither touches the sync architecture or requires a design gate. `CR-002` and `CR-003` are
real but fine to leave in the backlog. The known open items above (`V6-F80`, `V7-F14`, `V7-F15`, `V7-F16`,
`WC-001`) are unchanged by this review; listed here only for a single consolidated view.

**Awaiting the Product Owner's call** on whether to scope `CR-001`+`CR-004` as a standalone pre-Beta
correction candidate (recommended — both are small and low-risk) or fold them into whatever the next
scheduled candidate turns out to be.
