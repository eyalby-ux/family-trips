# Migration — Alpha 0.2.1 to Alpha 0.3

Status: Accepted for implementation  
Date: 2026-07-30

## Decision

Migration is user-controlled through an `Import local trip` action after Google sign-in.

There is no silent automatic migration.

## Flow

1. User signs in with Google.
2. The application detects Alpha 0.2.1 local data.
3. The application offers `Import local trip`.
4. A preview shows:
   - Trip name and dates;
   - item count;
   - source/document metadata count;
   - packing-list count.
5. User confirms the import.
6. A new Firebase Trip is created with the signed-in user as Owner.
7. Local entities are converted to the Alpha 0.3 schema.
8. The application verifies the remote write.
9. The local copy remains available until the user confirms successful migration.
10. A local migration marker prevents accidental duplicate imports.

## Duplicate protection

The local migration marker stores:

- source local-storage key;
- imported Trip ID;
- migration timestamp;
- source data checksum.

If the same checksum was already imported, the app opens the existing Trip instead of creating a duplicate.

## File limitation

Alpha 0.2.1 stores uploaded file metadata, not file bytes. Migration therefore imports the metadata into the Document inbox and marks those Documents as requiring re-upload.

Clean URL sources are migrated as editable links.

## Failure behavior

- Partial migration must not delete local data.
- A failed import can be retried.
- The UI reports which entity failed.
- Trip creation and entity writes should use batched writes where Firestore limits allow.