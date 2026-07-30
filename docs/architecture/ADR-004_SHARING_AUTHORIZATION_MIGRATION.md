# ADR-004 — Alpha 0.3 Sharing, Authorization, and Migration

Date: 2026-07-30  
Status: Accepted

## Decision summary

- Google sign-in only for Alpha 0.3.
- Sharing is by Gmail address.
- Only the Owner can invite or remove Editors.
- Editors may add, edit, and delete Trip content.
- Only the Owner may delete the Trip.
- Deletion is immediate after confirmation; no Trash.
- Last write wins is the concurrency model.
- Every mutable entity records `updatedAt` and `updatedBy`.
- Alpha 0.2.1 migration is an explicit `Import local trip` flow.
- Live Firestore and Storage rules stay deny-all until tested authorization rules are ready.

## Consequences

- The collaboration model stays simple enough for the Thailand MVP.
- Membership and invite operations require separate rule paths from normal content editing.
- Migration must preserve local data until remote verification succeeds.
- Firebase Emulator Suite authorization tests are mandatory before production rules are published.