# Release Notes — Family Trips Alpha 0.2.1

Release date: 2026-07-30  
Status: Stabilization hotfix for Alpha 0.2

## Fixed release blockers

- Saved link sources can now be opened directly from the related item.
- Calendar dates are selectable and display the events for the selected day.

## Additional fixes

- Long filenames wrap correctly on mobile.
- Full source names remain available through the source row title.
- Contact phone number is optional.
- Removed the duplicate Quick Access section from Today.
- Reduced excessive vertical space in Trip Center category cards.

## Compatibility

- The existing Alpha 0.2 local-storage key is preserved.
- Existing local Alpha 0.2 test data should remain available after deployment.
- No architecture changes are included.

## Out of scope

- Accounts and shared Trips
- Multi-user synchronization
- Participant ownership
- OCR and full Smart Ingestion

## Package revision v4

Critical correction:

- Restored the missing `sourceStep()` function.
- Fixed the freeze caused by pressing the global `+` button.
- Added a quality-gate regression check for the Create Item source-selection flow.

The blocking browser error was:

```text
Uncaught ReferenceError: sourceStep is not defined
```
