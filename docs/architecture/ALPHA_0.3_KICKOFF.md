# Alpha 0.3 Kickoff — Accounts, Shared Trips, Participants, Document Ownership

## Objective
Move Family Trips from a single-device local prototype to a privacy-preserving multi-user foundation for the Thailand MVP.

## Scope
- Accounts and session restoration.
- Multiple private Trips per user.
- Share exactly one Trip with an Editor.
- Owner and Editor roles.
- Participants who may not be app users.
- Participant-specific items, tickets, documents, and packing.
- Unassigned document inbox and explicit linking.
- Deleting an item returns documents to the inbox.
- Real-time or near-real-time shared packing.
- Offline queue, visible sync state, and explicit conflict handling.

## First architecture gate
Compare viable authentication, database, real-time, and file-storage options against:
- privacy and row-level authorization;
- offline/mobile PWA behavior;
- concurrent packing edits;
- document access controls;
- low operational burden;
- migration from Alpha 0.2.1;
- Thailand MVP cost.

## Exit criteria
- Two accounts can use private Trips without data leakage.
- An Owner can share one Trip with an Editor.
- Both users can update a shared packing list and see synchronized results.
- Participants can be assigned to relevant entities.
- Documents have explicit inbox, link, assignment, and deletion behavior.
- Offline edits synchronize safely.
- Authorization tests prove unrelated Trips and documents are inaccessible.