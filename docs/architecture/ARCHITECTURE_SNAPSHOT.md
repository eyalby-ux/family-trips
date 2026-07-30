# Architecture Snapshot — Alpha 0.3 Kickoff

## Existing decisions retained
- Today is the operational home.
- Trip Center is category-first.
- Timeline and Calendar project the same entities.
- One entity has one Detail View.
- Trip may be created from the first accepted source or saved item.
- Scheduling modes: single, range, entire trip, no date.
- Future dated items may infer Planned status.
- Changing Trip dates never silently changes item dates.
- Sources remain linked to items.
- Packing Lists are created with the Trip.

## Alpha 0.3 extensions
- A user account may own multiple private Trips.
- A user may be Owner of one Trip and Editor of another.
- Sharing one Trip never exposes another Trip.
- Thailand MVP roles: Owner and Editor.
- Participants belong to a Trip and do not need accounts.
- Items, tickets, documents, and packing entries may be participant-specific.
- Documents default to an unassigned inbox.
- Deleting an item returns its documents to the inbox.
- Shared packing requires real-time or near-real-time synchronization.
- Offline mutations require a queue, sync state, and explicit conflict handling.

## Architecture review required
The local-only model cannot satisfy accounts, privacy, sharing, or concurrent editing. Before implementation, select and document:
1. Authentication provider and sign-in methods.
2. Database and real-time synchronization.
3. File/document storage and access control.
4. Owner/Editor authorization.
5. Offline queue and conflict policy.
6. Migration from Alpha 0.2.1 local storage.
7. Deployment, secrets, backup, and recovery.

Do not add account screens on top of local storage before this foundation is decided.