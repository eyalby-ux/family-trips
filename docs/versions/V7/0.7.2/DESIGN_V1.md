# FamilyTrips `0.7.2` — Design: Firestore datastore, security rules, migration

**Document revision:** `V1`
**Candidate:** `0.7.2` (Multi-Trip ownership + Shared-Trip roles), `version/V7`
**Status:** Design document only. No `0.7.2` feature code, no deployment. Per `MVP_DELIVERY_PLAN_CURRENT_STATE.md` `V97`, implementation does not begin until the Product Owner reviews this.
**Date:** 2026-09-11

## 0. Executive summary

**Recommendation: keep `0.7.2` as one candidate, but budget it as a genuinely large one** — closer in weight to `0.7.3` (the sync engine) than to `0.7.1`. The reason it still fits as one candidate rather than splitting further: standing up the datastore and enforcing Owner/Editor roles on it are not independently shippable — a datastore with no role enforcement is a security hole, and role enforcement with no datastore is nothing to enforce against. They're one unit of work. See §6 for the full reasoning and risk flags.

Three things verified directly in this pass, not assumed from the prior report:

1. **Firestore and Firebase Storage are both provisioned and reachable** on the existing project (`family-trips-9aef4`) — confirmed via live, unauthenticated REST calls against both APIs, which returned `403 PERMISSION_DENIED` (a real, existing database/bucket enforcing its rules), not `404 NOT_FOUND` (which is what an unprovisioned project returns). This matches `firestore.rules`/`storage.rules`, both `allow read, write: if false` — locked down, not absent.
2. **The app's real persistence is two separate local-only stores**, neither server-side: `localStorage` (key `family-trips-alpha-0.2`) holds all structured state — Trip, items, sources (metadata only), suggestions, tasks, packing, shopping, games, locations (`src/v5-app.js` `load()`/`save()`, lines 28–29); a second, separate `IndexedDB` database (`family-trips-v4`, object store `files`) holds the actual binary bytes of every uploaded document/image, keyed by source id (`src/v5-app.js` `openDb()`, line 430). Nothing in either store is scoped to a user or account.
3. **A real per-request `uid` already exists server-side.** `netlify/functions/_shared/smart-import-auth.mjs`'s `authorize()` verifies the caller's Firebase ID token directly (via `jose`, not the Admin SDK) and returns `{uid, email, emailHash}`. A second file, `smart-import-quota.mjs`, already has a *first-writer-wins* Trip-ownership check (`registerOrVerifyTrip`) — but it's stored in Netlify Blobs, not Firestore, and it only gates who may trigger Smart Import processing for a given `tripId`. It has no relationship to actual Trip data access, because Trip data has never left the browser. This is a real, working precedent to build on and reconcile with, not replace outright — see §2.4.

## 1. Data model

Verified directly against `src/v5-app.js` (`EMPTY`, `save()`, `ensureTrip()`), `src/operational-data.js` (`normalizeOperationalState`), and `src/ingestion.js` (`ITEM_TYPES`, `TYPE_FIELDS`) rather than worked from memory, per the request.

### 1.1 What's persisted today (exact `save()` payload, `src/v5-app.js:29`)

`trip, items, sources, suggestions, rejectedSuggestions, packing, games, tasks, shopping, locationRecords, packingCollapsed, packedCollapsed, timelineCursor` — plus binary file bytes in the separate IndexedDB store, referenced by `source.id`. Everything else in `state.*` (`view`, `category`, `itemId`, `modal`, `timelineMode`, `calendarDate`, `toast`) is ephemeral client navigation/UI state and has no server-side equivalent, same as today.

### 1.2 Proposed Firestore layout

**Subcollections under `/trips/{tripId}`, not top-level collections keyed by a `tripId` field.** Reasoning: Firestore security rules are hierarchical — one rule block on `/trips/{tripId}` and a wildcard match on everything beneath it enforces Trip-membership once for the whole Trip, instead of repeating a manual `tripId` equality check on every collection separately (more rule surface, easier to get one collection wrong). `0.7.4`'s Participants domain fits the same shape without redesign — it's just another subcollection.

```
/trips/{tripId}                          — Trip document itself
  id, name, startDate, endDate, createdAt   (unchanged from today)
  ownerUid                                  (NEW — the creating user's Firebase uid)
  editorEmails: string[]                    (NEW — see §1.4 on why email, not uid)
  timelineCursor, packedCollapsed           (small scalar state, kept on the Trip doc itself)

  /items/{itemId}                — one doc per Item (all types: flight/hotel/car/activity/
                                    restaurant/insurance/contact). Same fields as today's item
                                    shape (type, title, provider, confirmationNumber, location,
                                    website, phone, startAt, endAt, participants[], notes,
                                    schedule, sourceIds[], details{}, warnings[]); insurance's
                                    relatedItemIds[] unchanged, still item-ids as strings.

  /sources/{sourceId}            — metadata only (id, kind, name, type, size, status, createdAt,
                                    storedOffline, fingerprint, extractionEngine,
                                    extractionWarnings[], text?, url? for kind:'link').
                                    storagePath (NEW) replaces the IndexedDB blob reference —
                                    see §1.3.

  /suggestions/{suggestionId}    — pending proposals, unchanged shape.
  /rejectedSuggestions/{id}      — unchanged shape.

  /tasks/{taskId}                — id, title, owner, mode, dueDate, done, priority. Unchanged
                                    from 0.7.1.

  /packingLists/{listId}         — id, name, items: [{id, name, done, owner}]. Kept as an array
                                    field on the list document, not a further subcollection level
                                    — a household packing list is realistically dozens of items at
                                    most, nowhere near Firestore's 1MB document limit, and one
                                    fewer collection to secure/query.

  /shopping/{itemId}             — unchanged shape.
  /locationRecords/{id}          — unchanged shape.
  /games/{gameId}                — the six built-in games plus their per-Trip `favorite` boolean.
                                    Small, fixed catalog; a subcollection here is mostly for
                                    consistency, not because it needs Firestore's query/rule
                                    features — an array field on the Trip doc would work equally
                                    well. Not a meaningful decision either way.

  (0.7.4, not built here) /participants/{participantId} — the shape above already accommodates
                                    it without redesign: another subcollection, same
                                    membership-inherits-from-Trip rule pattern.
```

### 1.3 Binary attachments: Firebase Storage, not Firestore

Firestore documents cap at 1MB and aren't meant for file bytes. Confirmed Storage is provisioned (§0.1) and already exported as `storage` from `src/firebase.js` (unused today, same as `db`). Recommended layout: `trips/{tripId}/sources/{sourceId}/{originalFilename}`, with the `sources/{sourceId}` Firestore document's `storagePath` field pointing at it — this mirrors the *existing* separation between source metadata (`state.sources`) and source bytes (IndexedDB `files` store) almost exactly; only the two stores change, not the shape of the separation itself.

### 1.4 Role representation — folded-in question 1 (how does an Owner grant Editor access)

**`ownerUid` (set once, at Trip creation, always known) + `editorEmails: string[]` (not a uid-keyed members map).** Reasoning: the scope document's recommended "add Editor by email" flow means the Owner names someone who may not have signed into FamilyTrips yet — their `uid` doesn't exist yet to put in a map. Storing the invited email directly avoids needing an email→uid resolution step at grant time. Firestore security rules can compare `request.auth.token.email` (available on every authenticated request, already verified by Firebase Auth) against `resource.data.editorEmails` directly — no separate lookup, no Cloud Function required just to check membership.

This directly informs the Trip-switcher (folded-in question 2): a user's Trip list is *owned Trips* (`where ownerUid == myUid`) plus *shared-with-me Trips* (`where editorEmails array-contains myEmail`) — two queries against the same `/trips` collection group, unioned client-side. Both are directly expressible with a Firestore query; no denormalized "my trips" index collection is needed at this scale.

## 2. Security rules

### 2.1 The two-layer model this needs to reflect

`ARCHITECTURE_CURRENT_STATE.md` (§"Application access, Trip ownership and revoked-account lifecycle") already establishes these as separate grants: **application access** (is this email allowed to use FamilyTrips at all) and **Trip sharing** (does this user have access to *this specific* Trip). Today only the first layer is enforced anywhere, and only for Smart Import (`FAMILYTRIPS_ALLOWED_EMAILS`, checked in `smart-import-auth.mjs`). Firestore rules need to enforce both, independently — Trip-level role membership must never be reachable by someone who isn't even application-invited, even if they somehow guessed/obtained a `tripId`.

### 2.2 The application-invitation problem: rules can't read a Netlify environment variable

`FAMILYTRIPS_ALLOWED_EMAILS` lives in Netlify's environment and is invisible to Firestore security rules, which only see the request and the database itself. **Recommended default: mirror the allowlist into one small Firestore document**, `config/appInvitations` (e.g. `{emails: ["eyalby@gmail.com", ...]}`), that rules read via `get()`. This is an explicit, flagged duplication — two places that must be kept in sync (the Netlify env var, unchanged, still gates Smart Import exactly as today; the Firestore doc, new, gates Firestore access) — not a silent one. It's the same kind of deliberate, temporary placeholder the original scope document already accepted for "add Editor by email" (a minimal mechanism now, properly consolidated when `0.7.5` builds the real invitation-management admin UI, which is the natural place to make Firestore the single source of truth for both). I could not read the current allowlist's actual contents to seed this document myself — `netlify env:get` masks the value by design (a Netlify secrecy protection, confirmed in the `0.7.1` QA-deploy round, not something to route around) — so seeding `config/appInvitations` needs either the Product Owner supplying the plain email list directly, or a one-time authenticated Netlify Function endpoint that copies the env var's real value into Firestore server-side (never exposed to me or the client).

### 2.3 Draft rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isInvited() {
      return request.auth != null &&
        request.auth.token.email_verified == true &&
        request.auth.token.email in get(/databases/$(database)/documents/config/appInvitations).data.emails;
    }
    function isOwner(trip) { return request.auth.uid == trip.data.ownerUid; }
    function isEditor(trip) { return request.auth.token.email in trip.data.editorEmails; }
    function hasTripAccess(trip) { return isInvited() && (isOwner(trip) || isEditor(trip)); }

    match /config/{document=**} {
      allow read: if request.auth != null;   // rules themselves need to read it; app never writes it
      allow write: if false;                  // admin-only, out of client reach entirely
    }

    match /trips/{tripId} {
      allow create: if isInvited() && request.resource.data.ownerUid == request.auth.uid;
      allow read, update: if hasTripAccess(resource);
      allow delete: if isInvited() && isOwner(resource);   // Owner-only destructive action

      match /{subcollection}/{docId} {
        allow read, write: if hasTripAccess(get(/databases/$(database)/documents/trips/$(tripId)));
      }
    }
  }
}
```

This is a sanity-checked sketch, not a finished, tested rules file — it hasn't been run against the Firestore emulator (not available in this environment; see §6). Two things it deliberately does **not** yet do, both explicitly out of `0.7.2`'s scope per the original scope document: it doesn't distinguish an Editor's write access to Smart Import-triggering fields (`0.7.5`'s job — Smart Import stays server-side/Owner-only through `0.7.2`, enforced in the Netlify Function, not here) and it doesn't implement revoked-account quarantine (`0.7.5`'s job; the quarantine data model itself isn't blocked by anything above — a `quarantined: true` flag on a Trip or a revoked email's removal from `config/appInvitations` would compose with these rules without restructuring them).

### 2.4 Reconciling with the existing Netlify Blobs ownership check

`registerOrVerifyTrip` (`smart-import-quota.mjs`) has its own independent, first-writer-wins notion of Trip ownership, stored in Netlify Blobs, unrelated to Firestore. Left alone, this becomes two ownership records that can disagree — e.g., if `0.7.2`'s migration sets a Trip's Firestore `ownerUid` explicitly, but the Blobs store's record for that same `tripId` (if one already exists, from a real Smart Import call made against Production) was never reconciled to match. **Flagging this as a risk, not silently resolving it**: recommend the Netlify Function's ownership check read the Trip's real `ownerUid` from Firestore server-side instead of maintaining its own separate Blobs record — which means adding a Firestore Admin client (`firebase-admin`, with a service-account credential as a new Netlify Function secret) to the Smart Import function, a real, scoped addition on top of "just add a datastore." Doing this consolidation now avoids carrying forward a latent two-sources-of-truth bug into `0.7.3`/`0.7.5`, both of which will need a trustworthy single ownership record. This is sized into the risk assessment in §6, not treated as free.

## 3. Migration plan

### 3.1 Honest constraint, stated directly rather than worked around

**I cannot inspect the real Production Trip's actual `localStorage`/`IndexedDB` contents from this environment** — that data lives only in the Product Owner's own browser, on their own device, and nothing in this session has access to it (the same standing limitation as every UI-verification gap this whole engagement has recorded). I have no real figure for how many items, tasks, or attachment bytes the live Thailand Trip actually holds, and I'm not going to estimate one. This directly shapes the recommendation below: the migration has to run *inside* the Product Owner's own authenticated browser session, because that is the only place the real data and the real Firebase Auth session coexist.

### 3.2 Recommended approach: one-time, in-app, explicit, verified — not automatic

A small migration routine shipped as part of `0.7.2`'s own client code, **not run automatically on load** and **not run by this Development Agent**:

1. On sign-in, if `localStorage`'s existing Trip has no Firestore counterpart yet (checked by a simple existence query), show an explicit "Move this Trip to the new shared system" action — not silent, not forced, matching this project's own established migration discipline (compare: the `0.6.x` correction packages' own rollback-backup pattern, always explicit and verified, never assumed).
2. On confirmation: read the current `localStorage` state and `IndexedDB` blobs directly (client already has both, synchronously/via the existing `openDb()` helper); write the Trip document with `ownerUid` set to the signed-in user's own `uid` (this **is** the concrete answer to folded-in migration question 3 — set at the moment of migration, by the account actually running it, not asserted in advance from outside); write every subcollection; upload every attachment blob to Storage.
3. **Verify before declaring success**: re-read every migrated collection back from Firestore and Storage, compare counts and a content hash/checksum per record against the source `localStorage`/`IndexedDB` data still sitting untouched in the browser. Only after this passes does the app mark the Trip as migrated and switch its read/write path to Firestore.
4. **Do not delete the local copy immediately.** Keep `localStorage`/`IndexedDB` untouched for some real, explicit retention period (a Product Owner call — a week is a reasonable default) as the rollback path: if anything looks wrong post-migration, the app can be told to keep reading local data instead of Firestore data with no data loss, the same "preserve the prior state before trusting the new one" discipline as every Production-promotion rollback backup this engagement has already used.
5. Run this once, live, with the Product Owner present to confirm the before/after counts themselves (their own real data, their own real judgment of whether it looks right) — mirroring exactly how UI verification has always required their participation in this environment.

### 3.3 What I'm not recommending

A server-side bulk migration script run by me against exported data would require the Product Owner to manually extract their `localStorage`/`IndexedDB` contents first (DevTools export, or similar) and hand them to me — more manual steps, more chances for a stale or partial export, and it removes the in-browser verification step in 3.2 entirely. The in-app approach is more implementation work up front but is the only version of this that's actually verified against live data rather than assumed.

## 4. Client-architecture implications

### 4.1 The core problem

Every `state.*` mutation today is synchronous: click → mutate `state` → `save()` → `localStorage.setItem()` → `render()`, all in one call stack, no await anywhere in that path. Firestore reads/writes are inherently async. This is not a small refactor — `save()` is called from dozens of sites throughout `src/v5-app.js` (every toggle, every form submit, every drag), and the render cycle currently assumes the write has already happened by the time `render()` runs.

### 4.2 Recommended shape for `0.7.2`'s own scope (not `0.7.3`'s full sync engine)

Keep an **in-memory `state` as the source of truth for rendering**, same as today — `render()` stays synchronous, reading only from memory, no UI change in feel or responsiveness. Change what `save()` does: instead of a synchronous `localStorage.setItem()`, it becomes an async Firestore write, fired and not awaited by the caller (the UI already re-renders from the in-memory mutation immediately, matching today's felt behavior), with a small in-flight/error-surface mechanism (a toast on write failure, since today's `localStorage.setItem()` essentially never fails, but a Firestore write can — offline, permission, quota). On load, instead of a synchronous `localStorage.getItem()`, the app subscribes to Firestore's real-time listeners for the active Trip — which has a pleasant side effect worth naming explicitly: **`0.7.3`'s "near-real-time sync" is very likely realized substantially through the same Firestore listeners `0.7.2` sets up for its own single-user reads, not a separately-built sync engine** (noted directly in `MVP_DELIVERY_PLAN_CURRENT_STATE.md`'s `0.7.3` forward-note per `V97`, and repeated here since it's exactly the kind of thing that should inform `0.7.3`'s own design later rather than surprise it). `0.7.2`'s own scope does not need to build conflict resolution, offline queueing, or multi-writer merge logic — those are explicitly `0.7.3`'s job — but choosing Firestore listeners as the read path now means `0.7.3` inherits a real-time-capable foundation instead of having to retrofit one.

### 4.3 Offline

The PWA's offline requirement (`ARCHITECTURE_CURRENT_STATE.md`, "Offline and proposal-lifecycle invariants": *"the installed PWA... and last saved Trip are available on the first cold Offline launch"*) is a real constraint on this design, not a `0.7.3` concern to defer. Firestore's JS SDK has a built-in offline persistence mode (local cache surviving restarts, queued writes replayed on reconnect) that is a close, mostly-drop-in match for what `localStorage` currently guarantees synchronously — recommend enabling it as part of `0.7.2`, not treating offline as something Firestore adds "for free" without verifying it against this project's specific existing invariant (first cold launch after a completed online load, no duplicate/discarded data on reconnect — same wording already frozen in the architecture doc, now needs to be re-verified against Firestore's actual offline behavior specifically, not assumed to transfer automatically).

### 4.4 Rough sizing and risk flags

- **Sizing**: touches nearly every function in `src/v5-app.js` that currently calls `save()` or reads `state.trip`/`state.items`/etc. directly at module load — this is the single largest source-file-breadth change of any candidate so far in this project, larger than any individual `0.6.x` Smart Import vertical.
- **Risk — offline regression**: the existing offline invariant is currently trivially true (everything already is local). Firestore's offline mode needs explicit verification against this project's exact frozen wording, not assumed.
- **Risk — write-failure surfacing**: today a failed save is essentially impossible to observe (synchronous, always succeeds barring disk-full). An async Firestore write introduces a real failure mode (permission, network, quota) that the UI has never had to represent before.
- **Risk — cost**: Firestore is billed per read/write/delete beyond a free daily quota. Real-time listeners on Today/Trip Center (both rendering on nearly every navigation) could multiply read counts compared to today's zero-cost `localStorage` reads. Worth a rough usage estimate before committing to "listen to everything, always" as the default pattern everywhere — flagged, not sized, since real usage data doesn't exist yet.

## 5. Effort/risk assessment — does this fit as one candidate?

**Recommendation: keep it as one `0.7.2` candidate**, per §0's reasoning (a datastore with no role enforcement is a security hole; role enforcement with nothing to enforce against is nothing). But it should be budgeted, reviewed, and acceptance-tested as a large candidate:

- It touches more of the existing codebase (`src/v5-app.js` broadly) than any single `0.6.x` vertical did.
- It introduces a genuinely new production dependency (a live, billed Firestore/Storage backend) where none existed before — this is the first candidate in this project's history to do that.
- Its acceptance session cannot be single-device/single-account, unlike everything through `0.7.1` — Owner/Editor role enforcement is only meaningfully testable with two real accounts, similar to `0.7.3`'s own already-acknowledged two-device requirement. Recommend `0.7.2`'s own executable acceptance session plan for this explicitly, the same way `0.7.3`'s scope already does.
- The migration (§3) is the one irreversible-feeling step touching real Production data — recommend treating it with the same explicit-confirmation, verified-before-and-after, rollback-preserved discipline as every Production promotion this project has already done, not a lighter touch just because it's "only" a migration.

If the Product Owner would rather split further after reading this, the cleanest seam is **datastore + migration first, role enforcement second** — but this reintroduces exactly the security gap named in §0 for the window between the two (a live Firestore Trip with working reads/writes but rules that only check `isInvited()`, not yet real Owner/Editor separation). Not recommended, but naming the seam since it's the only structurally clean one if splitting is preferred.

## 6. What this design document could not verify

- No Firebase emulator or admin-level Firestore/Storage access is available in this environment — the rules sketch (§2.3) is reasoned and cross-checked against the app's real code paths, but not run.
- The real Production Trip's actual data volume (§3.1) — genuinely unknown from here, by design (it's the Product Owner's own private browser data).
- Real-world Firestore read/write cost at this app's actual usage pattern (§4.4) — no usage data exists yet to size against.

These are named explicitly rather than silently assumed away, consistent with how every open question in this project gets handled.
