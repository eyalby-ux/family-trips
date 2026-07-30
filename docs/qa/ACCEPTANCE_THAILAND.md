# Acceptance Test — Alpha 0.2.1

## Release decision target

Alpha 0.2.1 passes when both Alpha 0.2 release blockers are closed:

1. Saved link sources open from their related item.
2. Calendar date selection displays that day's events.

## Test flow

1. Open the deployed Alpha 0.2 site and confirm existing data.
2. Deploy Alpha 0.2.1.
3. Confirm the same local Trip remains.
4. Add an item from a pasted link.
5. Open the item and open the saved source link.
6. Add events on two different dates.
7. Open Calendar.
8. Select each date and verify the matching events.
9. Select an empty date and verify the empty state.
10. Create a Contact with no phone number.
11. Verify mobile layout with a long filename.
12. Verify PWA and offline shell.

## Pass criteria

- No data loss.
- Both blockers are fixed.
- No critical regression is found.
