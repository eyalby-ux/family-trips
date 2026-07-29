# Architecture Snapshot — Alpha 0.2

- Today is the operational home and filters by temporal relevance.
- Trip Center is category-first.
- Timeline and Calendar are projections of the same entities.
- One entity has one Detail View.
- Trip may be created from first accepted source or first saved item.
- Scheduling modes: single, range, entire trip, no date.
- Trip state may be inferred from future dated items.
- Changing Trip dates never silently changes source item dates.
- Sources remain linked to items.
- Packing Lists are created when the Trip is created.
