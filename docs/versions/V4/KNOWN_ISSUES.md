# V4 Known Issues and Findings — 0.4.4 correction

## Focused correction register

| ID | 0.4.3 evidence | 0.4.4 state | Retest |
|---|---|---|---|
| V4-F11 | Visible flight/hotel fields were omitted and surname `YITZHAK` was proposed as booking number. | Assigned and implemented; automated regression PASS; user verification pending. | Inspect the flight and hotel proposals before approval, then confirm saved values persist. |
| V4-F13 | Installed PWA failed to reopen after swipe-close while offline. | Assigned and implemented; shell-precache regression PASS; deployed-phone verification pending. | Warm online, disable both networks, swipe-close, reopen from installed icon and view saved items. |

## Deferred by approved assignment

| ID | Disposition |
|---|---|
| V4-F04 | Alpha 0.5 — backfill only genuinely undated existing items when Trip dates are first set; preserve explicit dates. |
| V4-F12 | Alpha 0.5 — external JSON import and single/multipart QR scanning. |

## Preserved results

F01, F06, F08 and short-regression steps R01–R03 passed in 0.4.3. The 0.4.4 package does not reopen their implementation scope; the short source-preservation flow is repeated only as a safety regression.

## Known extraction constraint

The first use of PDF/OCR extraction on a browser profile still requires connectivity to load the extraction engines. That limitation is separate from opening the installed application and viewing previously saved structured items offline.
