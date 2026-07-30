# QA Checklist — Alpha 0.2.1

## Mandatory hotfix tests

- [ ] `npm run check` passes.
- [ ] Existing Alpha 0.2 local data remains after the update.
- [ ] A pasted link can be saved as a source.
- [ ] The saved link appears in the related item.
- [ ] Selecting the saved link opens it in a new browser tab.
- [ ] Calendar dates are clickable.
- [ ] The selected date is visually highlighted.
- [ ] Events for the selected date appear below the calendar.
- [ ] A date with no events shows an empty-state message.
- [ ] Long filenames wrap without breaking the mobile layout.
- [ ] Contact creation succeeds without a phone number.
- [ ] Today no longer contains the duplicate Quick Access section.
- [ ] Trip Center cards are more compact.
- [ ] PWA installs and opens.
- [ ] Offline shell still opens after one online load.

## Regression tests

- [ ] Create item.
- [ ] Delete item.
- [ ] Create another item without refreshing.
- [ ] Trip status changes to Planned from a future item.
- [ ] Entire Trip items remain visible in Today.
- [ ] Timeline grouping still works.
- [ ] Packing Lists still persist.
- [ ] Trip date conflicts do not rewrite item dates.
