# Interactive Test Session — Alpha 0.2.1

Mandatory tests: 15
Optional tests: 5

## New fixes — 7 mandatory
1. Create Item source-selection opens without freezing.
2. A clean saved URL opens from the linked item.
3. Selecting a Calendar date displays that day's events.
4. Long filenames remain usable on mobile.
5. Contact creation succeeds without a phone number.
6. Today has no duplicate Quick Access section.
7. Trip Center category cards are usable on mobile.

## Critical regression — 8 mandatory
1. First PDF creates a Trip.
2. The uploaded source remains available after Trip creation.
3. Hotel date range validates start/end order.
4. Insurance supports Entire Trip.
5. A new dated item defaults to Trip start when available.
6. A future item changes a Trip without dates from Draft to Planned.
7. Create → Delete → Create another item works without refresh.
8. Persistence, PWA launch, and offline shell work.

## Optional regression — 5
1. Map action opens the item's location externally.
2. Timeline all/month/week/day filters work.
3. Out-of-range conflict remains after restart.
4. Changing item type updates the form.
5. Delete current Trip and clear all are distinct confirmed actions.

## Completed result — 2026-07-30
- New fixes: 7 / 7 passed
- Critical regression: 8 / 8 passed
- Optional regression: 5 / 5 passed
- Total: 20 / 20 passed
- Release decision: GO for the Alpha 0.2.1 usability baseline

## Findings carried forward
- A clean URL opens correctly. Pasted text containing a URL is not yet parsed; URL extraction belongs to Smart Ingestion in Alpha 0.4.
- A linked source URL cannot yet be edited from the item edit form; this is scheduled for document/source ownership work.
- Multi-day items are marked on their start date only; continuous Calendar visualization is scheduled for Alpha 0.5.
- Category-level Add duplicates the global Add flow; category-prefilled creation is a Scheduled Alpha feature.
- Trip Center density and FAB overlap require Beta refinement.