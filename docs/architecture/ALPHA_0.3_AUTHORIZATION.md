# Alpha 0.3 Authorization Model

Status: Accepted for implementation  
Date: 2026-07-30

## Roles

### Owner

The Owner can:

- view the Trip;
- add, edit, and delete Trip content;
- manage Participants;
- upload, link, edit, and delete Documents;
- manage Packing Lists;
- invite Editors;
- revoke pending invites;
- remove Editors;
- delete the Trip.

### Editor

An Editor can:

- view the Trip;
- add, edit, and delete Trip content;
- manage Participants;
- upload, link, edit, and delete Documents;
- manage Packing Lists.

An Editor cannot:

- invite users;
- revoke invites;
- remove members;
- change the Owner;
- delete the Trip.

## Concurrency

Alpha 0.3 uses last write wins.

Every mutable entity stores:

- `updatedAt`
- `updatedBy`

The UI displays the last editor and update time where useful. There is no conflict-resolution screen in Alpha 0.3.

## Deletion

- Content deletion is immediate after confirmation.
- There is no Trash feature in Alpha 0.3.
- Only the Owner can delete the Trip.
- Deleting an Item returns linked Documents to the unassigned inbox.
- Document deletion is explicit and removes both metadata and the Storage object.

## Invite flow

1. Owner enters a Gmail address.
2. The app creates a pending Editor invite.
3. The invited person signs in with Google using the same email.
4. The app shows the pending invite.
5. Acceptance creates `trips/{tripId}/members/{uid}` with role `editor`.
6. The invite is marked `accepted`.

## Security-rule requirements

Firestore and Storage rules must enforce:

- authenticated access only;
- Trip access only for a matching membership document;
- Owner-only invite and membership management;
- Owner-only Trip deletion;
- Editor access to Trip content;
- Storage access only when the caller is a Trip member;
- no cross-Trip reads through guessed IDs;
- no privilege escalation by changing a membership role;
- no client-side reassignment of `ownerId`.

The live Firebase rules remain deny-all until these rules are implemented and covered by emulator tests.