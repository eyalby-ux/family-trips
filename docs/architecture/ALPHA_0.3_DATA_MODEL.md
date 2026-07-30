# Alpha 0.3 Data Model

Status: Accepted for implementation  
Date: 2026-07-30

## Principles

- All Trip-owned data is nested under a Trip document.
- Sharing one Trip never grants access to another Trip.
- A Participant is not necessarily an application user.
- User accounts and Trip Participants are separate concepts.
- Documents enter an unassigned inbox before optional linkage.
- Last write wins is the Alpha 0.3 concurrency policy.
- Mutable entities store `updatedAt` and `updatedBy`.

## Collections

### `users/{uid}`

Stores the signed-in user's application profile.

Required fields:

- `displayName`
- `email`
- `photoURL`
- `createdAt`
- `updatedAt`

### `trips/{tripId}`

Required fields:

- `name`
- `ownerId`
- `status`
- `startDate`
- `endDate`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `trips/{tripId}/members/{uid}`

Required fields:

- `role`: `owner` or `editor`
- `email`
- `displayName`
- `joinedAt`
- `invitedBy`

There is exactly one Owner membership per Trip.

### `trips/{tripId}/participants/{participantId}`

Required fields:

- `name`
- `relationship`
- `linkedUserId`: optional
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `trips/{tripId}/items/{itemId}`

Required fields:

- `type`
- `title`
- `schedule`
- `startAt`
- `endAt`
- `location`
- `notes`
- `participantIds`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `trips/{tripId}/documents/{documentId}`

Required fields:

- `name`
- `mimeType`
- `size`
- `storagePath`
- `status`: `unassigned` or `linked`
- `itemId`: optional
- `participantIds`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Deleting an Item sets related Documents back to `unassigned` and clears `itemId`. It does not delete the Document.

### `trips/{tripId}/packingLists/{listId}`

Required fields:

- `name`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `trips/{tripId}/packingLists/{listId}/items/{packingItemId}`

Required fields:

- `name`
- `done`
- `suggested`
- `participantIds`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `tripInvites/{inviteId}`

Required fields:

- `tripId`
- `tripName`
- `email`
- `role`: always `editor` in Alpha 0.3
- `status`: `pending`, `accepted`, or `revoked`
- `invitedBy`
- `createdAt`
- `acceptedAt`: optional
- `acceptedBy`: optional

The invited user receives access only after signing in with the same Google email and accepting the invite.

## Query strategy

- Owned and shared Trips are loaded from membership collection-group queries by authenticated `uid`.
- Trip content is loaded only after membership is confirmed.
- Pending invites are queried by the signed-in user's Google email.
- No global Trip list is exposed to clients.