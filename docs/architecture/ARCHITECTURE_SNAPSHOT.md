# Architecture Snapshot ג€” Alpha 0.3

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

## Alpha 0.3 platform decision
- Firebase is the selected backend platform.
- Google Authentication is enabled.
- Cloud Firestore stores application data.
- Firebase Storage stores document bytes.
- Firebase project ID: `family-trips-9aef4`.
- Production authorized domain: `familytripz.netlify.app`.
- Firestore and Storage are deny-all until application-specific rules are published.
- Firebase JavaScript SDK is managed with npm.
- Vite is the selected build pipeline.
- Netlify remains the production host and will publish `dist`.

## Remaining architecture work
1. Firestore data model.
2. Firestore and Storage authorization rules.
3. Offline queue and conflict policy.
4. Migration from Alpha 0.2.1 local storage.
5. Environment configuration and Netlify deployment transition.
6. Backup, monitoring, and recovery.