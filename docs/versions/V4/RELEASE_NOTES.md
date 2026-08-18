# V4 / 0.4.4 Release Notes

Status: focused correction candidate; installation and user acceptance pending.

## Approved scope

- `V4-F11` — correct PDF/OCR structured-field extraction and classification.
- `V4-F13` — restore installed-PWA cold start without connectivity.

`V4-F04` and `V4-F12` remain assigned to Alpha 0.5 and are not implemented here.

## Corrections

- A booking number is proposed only when an explicit booking/reference label supports it; a surname such as `YITZHAK` is no longer accepted by a generic alphanumeric fallback.
- Flight proposals can map airline, flight number, airport route, departure/arrival dates and visible times.
- Hotel proposals retain labelled confirmation, address, website, dates and times when present.
- All extracted values remain editable suggestions and require user approval.
- The Service Worker now reads the production index during installation and precaches its hashed JavaScript/CSS assets together with the manifest and icons.
- The new cache name removes the incomplete 0.4.3 shell after activation.
- Existing local trip data, original documents and the V4 storage key are unchanged.

## Automated coverage

- Extraction regression for the real failure shape: `YITZHAK`, `LY087`, TLV → HKT, departure and arrival timestamps.
- Labelled hotel extraction and identical-source duplicate regression.
- Service Worker install simulation proving that the navigation shell and discovered production assets are cached before install completes.

## Release control

Do not merge to `main` or declare GO until the focused F11/F13 tests, short source-preservation regression and installed-phone offline cold-start test pass.
