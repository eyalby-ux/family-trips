# QA Checklist — Alpha 0.1

## Installation and startup

- [ ] The package was fully extracted.
- [ ] `package.json` is in the project root.
- [ ] Node.js is version 18 or later.
- [ ] `npm run check` passes.
- [ ] `npm run dev` starts the server.
- [ ] The app opens at `http://localhost:4173`.
- [ ] No JavaScript errors appear in the Console.

## Initial state

- [ ] A fresh install contains no Trip.
- [ ] Upload and create actions are visible.
- [ ] No Thailand or Dolomites sample data is preloaded.

## Trip creation

- [ ] The first PDF creates a Trip.
- [ ] The first image creates a Trip.
- [ ] The first saved item creates a Trip.
- [ ] Opening the app alone does not create a Trip.
- [ ] Canceling creation does not create a Trip.

## Documents

- [ ] PDF metadata appears under Documents.
- [ ] Image metadata appears under Documents.
- [ ] File name, type, and size are shown.
- [ ] Multi-file intake works.
- [ ] Refresh preserves metadata.

## Items

- [ ] An item can be created.
- [ ] Category, title, dates, location, and notes can be saved.
- [ ] An item can be edited.
- [ ] An item can be deleted.
- [ ] A location opens a map link.

## Navigation

- [ ] Today opens.
- [ ] Timeline opens.
- [ ] Trip Center opens.
- [ ] Settings open.
- [ ] The same Detail View opens from Today, Timeline, and Trip Center.
- [ ] Key categories are quickly reachable.

## Trip dates

- [ ] Start date only can be saved.
- [ ] End date only can be saved.
- [ ] Both dates can be saved.
- [ ] Dates can be changed or removed.
- [ ] End before start is rejected.
- [ ] Changing the Trip range does not move item dates.
- [ ] An out-of-range item is marked as a conflict.
- [ ] Returning it into range clears the conflict.

## Persistence, PWA, and offline

- [ ] Refresh preserves data.
- [ ] Browser restart preserves data.
- [ ] Local reset removes current-browser data.
- [ ] The manifest loads.
- [ ] The Service Worker registers.
- [ ] The PWA can be installed.
- [ ] The app shell opens offline after first online use.
- [ ] Local data appears offline.

## Mobile and RTL

- [ ] Hebrew UI alignment is correct.
- [ ] Buttons are not clipped.
- [ ] Bottom navigation is accessible.
- [ ] Dialogs scroll on small screens.
- [ ] The app is usable on a narrow phone screen.

## Dolomites regression

- [ ] Clear home screen.
- [ ] Timeline access.
- [ ] Fast access to lodging and activities.
- [ ] Map access from details.
- [ ] Mobile and RTL support.
- [ ] Local persistence.
- [ ] Basic offline behavior.
- [ ] No proven capability disappeared without an explicit decision.

## Release decision

- [ ] All blockers passed.
- [ ] Defects were documented.
- [ ] Thailand acceptance testing was completed.
- [ ] Release or stop decision was recorded.
