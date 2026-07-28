# Acceptance Test — Thailand Trip

## Objective

Start from an empty application and import real Thailand trip documents after installation. No sample trip data may be bundled.

## Preparation

1. Perform a local reset.
2. Confirm no Trip exists.
3. Prepare real PDFs and images.
4. Do not copy them into the source repository.

## Test flow

1. Upload one real document.
2. Confirm the Trip is created only after acceptance.
3. Confirm the document appears under Documents.
4. Upload the remaining files individually and in a group.
5. Record file name, type, size, result, time, and any error.
6. Create one manual dated item.
7. Open it from Today, Timeline, and Trip Center.
8. Set Trip start and end dates.
9. Change the range so the item falls outside it.
10. Confirm a conflict appears.
11. Confirm the original item date remains unchanged.
12. Refresh and reopen the app.
13. Confirm local persistence.
14. Test the offline shell after one online load.

## Pass criteria

- No crash.
- No loss of local data.
- Supported PDFs and images are accepted.
- Trip creation timing is correct.
- Primary navigation works.
- Trip date changes never rewrite source item dates.
- Conflicts appear when required.

## Expected limitation

Alpha 0.1 does not perform OCR. Acceptance covers intake flow, not extraction accuracy.
