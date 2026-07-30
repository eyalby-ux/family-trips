# QA Checklist — Alpha 0.2.1

Completed on 2026-07-30.

- [x] `npm run check` passes.
- [x] Existing Alpha 0.2 local data remains available.
- [x] PWA installs, opens, and works offline after one online load.
- [x] Service Worker cache is `family-trips-alpha-0.2.1-v4`.
- [x] Create Item source-selection opens without freezing.
- [x] A clean saved URL opens from the related item.
- [x] Calendar selected-day events work.
- [x] Long filenames remain usable on mobile.
- [x] Contact phone is optional.
- [x] Duplicate Quick Access is removed.
- [x] Trip Center is usable on mobile.
- [x] First PDF creates a Trip and remains in Documents.
- [x] Hotel date range validation works.
- [x] Insurance supports Entire Trip.
- [x] New dated item defaults to Trip start.
- [x] Future item changes Draft to Planned without Trip dates.
- [x] Create → Delete → Create works.
- [x] Map, Timeline filters, conflict persistence, type changes, and deletion confirmations work.

## Result
- 20 / 20 tests passed.
- Release decision: GO for the Alpha 0.2.1 usability baseline.