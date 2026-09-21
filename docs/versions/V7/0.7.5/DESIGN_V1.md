# FamilyTrips `0.7.5` — Design: administer the sharing model

Document revision: `V1`
Date: 2026-09-21
Scope input: `FAMILY_TRIPS_ALPHA_0_7_5_SCOPE_V1.md` (same handoff, `0_7_5_design_request_20260921`)

## 0. Two findings from current-state verification — read this first

### 0.1 The application-invitation check already lives in two unsynced places, and `0.7.2`'s own design doc named this candidate as the place to fix it

`smart-import-auth.mjs`'s `authorize()` checks the Netlify environment variable `FAMILYTRIPS_ALLOWED_EMAILS` directly. Firestore/Storage rules check a *different* store, the `config/appInvitations` Firestore mirror, seeded once by hand to match the env var. `0.7.2`'s own `DESIGN_V1.md` §2.2 called this out explicitly at the time: *"an explicit, flagged duplication... not a silent one... properly consolidated when `0.7.5` builds the real invitation-management admin UI, which is the natural place to make Firestore the single source of truth for both."* Confirmed still true today — nothing since has touched either side. This candidate is where that consolidation has to happen, or the frozen requirement "revoking immediately blocks application **and AI-service** access" cannot actually be satisfied: an admin panel that only writes to Firestore would leave Smart Import still authorizing against the untouched env var. §7 below makes Firestore the single source for both.

### 0.2 Nothing in the app today distinguishes "the Product Owner" from any other invited user

`config/appInvitations` is a flat `{emails: [...]}` list with no role field, and no code anywhere (`grep`-confirmed, not assumed) checks for a Product-Owner/admin identity — every invited email has symmetric application-level access today. The scope document's Question 1 talks about a "Product-Owner-only application-invitation admin panel," but that requires the app to actually know who the Product Owner is, which nothing currently encodes. §1 below proposes the minimal way to add this. Flagging this as a **new open question, not one of the scope document's original four** — it wasn't asked because building the admin panel is what surfaces it.

## 1. Current-state verification (answers to the design-request prompt's checklist)

- **`0.7.2`'s "add Editor by email" placeholder** (`sharingSection()`, `src/v5-app.js:704-712`): a flat `editorEmails` array field directly on the Trip document (`src/cloud-store.js:177-196`, `addEditorByEmail`/`removeEditorByEmail`). Adding an email is immediate and unconditional — no pending/accepted state, no acceptance step by the invited person. Already Owner-gated in the UI (`state.trip.ownerUid===currentUid()`) and in `firestore.rules`' `isOwner()`-scoped update path. This panel already lives in the right place (Trip Settings); `0.7.5` extends its data model, not its placement.
- **`config/appInvitations` today**: a single Firestore document, `{emails: ["eyalby@gmail.com", "paolakohan@gmail.com"]}`, seeded by hand in the Console during `0.7.2`'s acceptance session, `allow write: if false` in both rules files (admin-only, out of client reach entirely). No pending/accepted/revoked state of any kind — confirmed, not assumed.
- **Quarantine**: `grep -r "quarantine|revoked|revocation" src/ netlify/` returns nothing. Confirmed nothing exists toward this yet, exactly as the scope document expected.
- **Smart Import's Owner-only check**: `registerOrVerifyTrip` in `netlify/functions/_shared/smart-import-quota.mjs:32-46`. It reads the Trip document from Firestore via REST (using the caller's own ID token, no Admin SDK) and throws `403 trip_not_owned` unless `firestoreResult.ownerUid===user.uid` — Editors are rejected outright today, by design (`0.7.2`'s own scope explicitly deferred this). The minimal correct change (§7) is to also parse `editorEmails` from the same REST response already being fetched and accept a matching caller email — no new Firestore read.
- **Smart Import quota tracking**: `consumeDailyQuota` (`smart-import-quota.mjs:47-51`), Netlify Blobs, key `quota/${day}/${user.emailHash}` — already keyed by the *calling* user's own email hash, not the Trip. This already matches the scope document's own recommended default for open question 4; no data-model change needed there, only confirmation (§7).

## 2. Invitation/grant data model

**One unified shape for both layers, not two**, for the same reason `0.7.2` reused `hasTripAccess()` for one check instead of two: both layers reduce to the same three facts — who, current state, when it changed. Concretely:

- **Application-level**: replace the single `config/appInvitations` document with a collection, `invitations/{email}` — the **lowercased email itself as the document ID**, not a hash: Firestore rules cannot compute SHA-256 (no such rules-language function exists), so a rules-side `get()` needs a key it can build directly from `request.auth.token.email`, and an email is already a valid Firestore document ID (no `/` characters). The SHA-256 `emailHash` used elsewhere (`smart-import-auth.mjs`, audit records) stays exactly as it is for those server-side, non-rules uses — it's unrelated to this collection's key. Each document: `{email, state: 'active'|'revoked', isAdmin: boolean, invitedAt, revokedAt|null}`.
- **Trip-level**: keep `editorEmails` as the flat array it is today (rules in both `firestore.rules` and `storage.rules` read it directly in three separate predicates; restructuring it into a subcollection would mean a `get()` per Trip-content read instead of an array membership check already available on the parent document — a real performance cost for zero acceptance-criteria benefit). Add a **history** subcollection, `trips/{tripId}/editorHistory/{email}` (same plain-email-as-ID convention), written alongside every `addEditorByEmail`/`removeEditorByEmail` call: `{email, state: 'active'|'revoked', grantedAt, revokedAt|null}`. `editorEmails` remains the live rules-checked source of truth; `editorHistory` is what the Trip Owner's panel displays (so a revoked Editor doesn't just silently vanish from the list with no record).

**Why no real "invited (pending)" state at either layer**: in both cases, granting access is immediate and unconditional today — there is no invitation-acceptance ceremony; a newly-invited person simply gains access the next time they sign in with that email. The frozen requirement text names "invited/accepted/revoked" as the states a lifecycle needs, but nothing in this app's actual sign-in flow produces a distinct "invited-but-not-yet-accepted" moment to represent. **Recommendation: two real states, `active` and `revoked`**, not three — `invitedAt` alone (no separate acceptance event) is enough to answer "when was this granted," and the admin UI can label an `active` grant "ממתין לכניסה ראשונה" (pending first sign-in) vs. "פעיל" purely as a display nicety if the Product Owner wants that distinction visible, without it being a stored state. Flagging this as a simplification to confirm, not shipping it silently.

### New open question 5 — who is `isAdmin`?

Given finding §0.2: **recommended default** — `isAdmin: true` is seeded by hand on exactly one `invitations/{email}` document (the Product Owner's own, `eyalby@gmail.com`), the same one-time Console action already used to seed `config/appInvitations` today. No self-service admin promotion exists or is needed — a two-person family app has one administrator, and adding one by hand once is simpler and safer than building a role-assignment UI for a role that will almost certainly never have a second holder. If that assumption is wrong, flag it — the data model supports more than one `isAdmin:true` document without any further change.

## 3. Quarantine data model and security-rules enforcement

Quarantine is not a new collection — it is the `revoked` state on the `invitations/{email}` document from §2, plus what the rules do with it:

```
function invitation() {
  return get(/databases/$(database)/documents/invitations/$(request.auth.token.email));
}
function isInvited() {
  return request.auth != null && request.auth.token.email_verified == true &&
    invitation() != null && invitation().data.state == 'active';
}
```

This makes revocation **immediately** effective everywhere `isInvited()` is checked — every Trip read/write, every Storage read/write, and (per §7) Smart Import too — with a single document write, no fan-out to individual Trips required. This is exactly the "immediately blocks... application and AI-service use" requirement, enforced server-side.

**Open question 3 (from the scope document — does revocation also strip Editor access on *other* people's Trips):** confirmed still open, no code answers it today. Recommended default unchanged from the scope document: yes, revoking removes live access everywhere, but since `isInvited()` now gates every Trip/Storage check regardless of `editorEmails` membership, **this falls out of the §2/§3 model for free** — a revoked account fails `isInvited()` and is blocked from every Trip it was an Editor on, without needing to also touch `editorEmails` on each of those Trips individually. `editorEmails` itself is left untouched by revocation (the person's *name* stays visible in Trip Owners' Editor lists, just inaccessible) — cleaning `editorEmails` on every other Trip a revoked user was on is unnecessary work the rules model already makes redundant, not a gap.

## 4. 30-day deletion-eligibility mechanism

Confirmed sound: **compute on demand, no scheduled job**, exactly the scope document's recommended default. `revokedAt` is already a stored timestamp (§2); "is this account eligible for deletion" is `now - revokedAt >= 30 days`, computed wherever it's needed (the admin panel's own render, and again — never trusted from the client — inside the deletion Netlify Function itself before it does anything irreversible). No new infrastructure, no cron, no Netlify Scheduled Function. The frozen contract only requires deletion never fire automatically before day 30; it does not require proactive notification the moment day 30 arrives, so there is nothing a background job would need to do that on-demand computation doesn't already cover.

## 5. Deletion action itself

This is the first genuinely destructive admin action and the first time this project needs a **Firebase Admin SDK credential** — every prior server-side Firestore access (`registerOrVerifyTrip`) deliberately used the caller's own rules-respecting ID token instead, specifically to avoid introducing a standing admin credential (`0.7.2` `DESIGN_V1.md` §2.4). Deleting another account's data by admin fiat cannot be done as that account's own caller, so this is unavoidable here — flagged as a real, scoped new piece of infrastructure, not free, and sized into §9.

**New Netlify Function, `admin-delete-account.mjs`** (admin-only):
1. Authorize the caller via the same `authorize()` used by Smart Import, then additionally require `invitation().isAdmin === true` for *this* caller (read via the Admin SDK, since this is the one function allowed to hold that credential).
2. Require the request body to **explicitly name** the target account's email and an explicit confirmation flag — never an implicit "the currently revoked one," matching the frozen "naming the specific account and scope" requirement literally.
3. Re-verify server-side: target's `invitations/{email}` document has `state:'revoked'` and `now - revokedAt >= 30 days`. Refuse otherwise — this is the guarantee that no accidental or automatic path can reach deletion, since the check is re-run inside the one function capable of deleting, not trusted from whatever the admin UI displayed a moment earlier.
4. Delete, via Admin SDK: every Trip where `ownerUid` matches the target's `uid` (Trip document, every subcollection, every Storage object under `trips/{tripId}/`). **Do not** touch any Trip owned by someone else, even where the target appears in that Trip's `editorEmails` or `editorHistory` — per the frozen non-negotiable, their prior contributions there are left exactly as they are (§3 already established that revocation alone, not deletion, is what ends their *access*; deletion only removes what they themselves own).
5. Write an audit record (`invitations/{email}`'s own document is deleted last, after a `deletionAudit/{autoId}` record is written recording who confirmed it, when, and what was removed — mirroring the existing `writeAudit()` pattern in `smart-import-quota.mjs`, kept outside the `invitations` collection so it survives the invitation document's own deletion).

## 6. Admin UI surfaces

Two distinct surfaces, per the scope document's own recommended default for open question 1, now concretely placed:

- **A new top-level admin area** (`state.view==='admin'`), reachable only via a nav entry rendered when the signed-in user's own invitation document has `isAdmin:true` (client-side convenience only — §3/§5 are the real boundary, matching this project's standing "client-hidden UI is not an authorization boundary" rule). Contains: the application-invitation list (email, state, invited-at, revoke button, add-new-invitation form) and the quarantine list (revoked accounts, days-since-revocation, and the deletion action from §5 gated behind a second explicit confirmation step in the UI — typing the account's email to confirm, not just a single click, given how irreversible this is).
- **The existing `sharingSection()` in Trip Settings**, extended (not replaced) to also show `editorHistory` (§2) below the current live list, so a Trip Owner can see who was removed and when — the only change needed there beyond what already ships today.

## 7. Editor-level Smart Import permission mechanism

Two changes, both minimal and scoped:

1. **`registerOrVerifyTrip`** (`smart-import-quota.mjs`): the REST response already fetched at line 24-30 includes every field on the Trip document. Add a read of `body.fields.editorEmails?.arrayValue?.values?.map(v=>v.stringValue)||[]` alongside the existing `ownerUid` read, and accept the caller when either `ownerUid===user.uid` **or** the caller's email is in that array — same shape as `firestore.rules`' own `isOwner(trip) || isEditor(trip)`, just re-expressed against the REST body.
2. **`authorize()`** (`smart-import-auth.mjs`): per §0.1, replace the `FAMILYTRIPS_ALLOWED_EMAILS` env var check with a Firestore REST read of `invitations/{email}` (state must be `'active'`) — the same unauthenticated-until-verified-token pattern already used elsewhere in this function, just pointed at the new collection from §2. This makes Firestore the single source of truth for application access everywhere, retiring the env var as an authorization mechanism (it can be left defined and unused, or removed once this ships and is confirmed working — no rush to delete it).

**Quota (open question 4):** already resolved by the existing implementation, not something this candidate needs to change — `consumeDailyQuota` is keyed by the calling user's own `emailHash` today, which is exactly the scope document's recommended default (an Editor processing on someone else's Trip draws their own quota). Confirming this in the design record; no code change needed here.

## 8. Acceptance-test protocol

Requires two real test accounts, same convention as `0.7.3`'s two-device protocol (confirmed still adequate — no new account infrastructure needed), plus one genuinely disposable third account for the deletion test (never a real family account, given step 4 below is irreversible):

1. Product Owner grants a new application invitation to a second test account via the new admin panel; that account signs in and gains access — confirms the invite path end-to-end.
2. Product Owner revokes that same account via the admin panel; the revoked account, still signed in from before, attempts any Trip/Storage read or write and is denied server-side (not just UI-hidden) — confirms immediate blocking.
3. The revoked account's own owned Trip (create one before revoking, for this test) is confirmed inaccessible to a third invited account, and still present (not deleted) when inspected via the Firebase Console.
4. Attempt deletion on the revoked account **before** 30 days have passed (or with `revokedAt` left at its real just-now value) — confirm the function refuses. Then, on a disposable test account only, manually set `revokedAt` in the Console to 31 days in the past (no test-mode code path needed — see §4) and confirm deletion now succeeds, removes exactly that account's owned data, and leaves everything else untouched.
5. Grant a second test account as Editor on a real (non-disposable) Trip; that account invokes Smart Import (analyze-and-propose) on that Trip successfully; confirm it drew down its own quota, not the Trip Owner's.
6. Revoke that same Editor's application invitation from step 5; confirm the Trip Owner's own content (any items the revoked Editor had edited) is untouched, and the revoked account is now denied even though `editorEmails` on that Trip still lists them (per §3, access is denied by `isInvited()` failing, independent of `editorEmails`).

## 9. Effort/risk assessment

**Larger than `0.7.2`/`0.7.3`.** Three real cost/risk drivers, stated plainly:

- **A Firebase Admin SDK credential, added to this project for the first time** (§5) — new Netlify Function secret, new failure mode (a leaked or misconfigured credential is a materially bigger blast radius than anything shipped so far, since it bypasses rules entirely by design). Recommend this function get the most scrutiny of anything in this candidate, and that its own acceptance test (§8, step 4) never run against real family data.
- **Restructuring `config/appInvitations`** from one document to a collection touches both rules files and the one existing Netlify function that reads it — a real, if mechanical, migration (re-seed `invitations/{email}` for both current users, including `isAdmin` on the Product Owner's own document, before the new rules can go live; the old `config/appInvitations` document can be deleted once confirmed unused).
- **Three real UI surfaces** (admin invitations panel, quarantine panel, extended sharing history) where `0.7.2`/`0.7.3` each shipped essentially one.

**Recommend keeping this as one candidate**, not splitting — all three scope items share the same `invitations/{email}` foundation from §2/§3, and splitting would mean either building that foundation twice or having one sub-candidate block the other. The deletion feature (§5) is the one piece that could theoretically be deferred to its own correction if `0.7.5`'s acceptance session runs long — revocation, quarantine-blocking, and Editor Smart Import are all independently completable and testable without it, and a Product Owner who never actually needs to delete anyone's data loses nothing by that piece landing slightly later. Flagging this as a possible scope-reduction lever, not a recommendation to cut it now.
