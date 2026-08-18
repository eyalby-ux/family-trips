# V4 Test Results — Alpha 0.4.4 correction cycle

Version: V4 / 0.4.4  
Previous candidate: 0.4.3 — NO-GO  
Current status: correction package prepared; installation and focused user tests pending.

## Preserved 0.4.3 evidence

- Google authentication, manual intake, approve/edit/reject/defer, original-source opening, duplicate/merge, deletion/source preservation and phone `tel:` action passed.
- V4-F11 failed: structured flight/hotel fields were missing and `YITZHAK` was falsely proposed as booking number.
- V4-F13 failed: the installed PWA did not cold-open offline after swipe-close.
- Test 14 ended NO-GO.

## 0.4.4 automated evidence

| Check | Expected | Package result |
|---|---|---|
| False booking mapping | `YITZHAK` without a booking label remains empty | PASS |
| Explicit confirmation | `Booking confirmation ABC123` maps to `ABC123` | PASS |
| Flight fields | `LY087`, TLV → HKT and departure/arrival timestamps are proposed | PASS |
| Hotel fields | Labelled confirmation, address, website and dates are proposed | PASS |
| Offline install shell | Navigation HTML and discovered built JS/CSS are cached before Service Worker install completes | PASS |
| Package layout | Installer, rollback, payload, lifecycle documents and checksums are present | PASS |

The installer also runs the repository's complete `npm run check`; that evidence is recorded after installation on the Product Owner's repository.

## Focused user evidence still required

1. F11 labelled EL AL screenshot proposal and persisted result.
2. F11 labelled hotel source proposal and persisted result.
3. Short regression: edit/approve, open original, delete item, reopen original from Documents.
4. F13 installed-phone offline cold start after online warm-up and swipe-close.
5. Final GO / NO-GO.
