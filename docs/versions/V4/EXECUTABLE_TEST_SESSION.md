# V4 Executable Test Session — Alpha 0.4.4

Do not restart the full V4 session. Preserve every 0.4.3 result and execute the following steps one at a time.

## Test order

1. Record installer output and complete automated-check evidence.
2. F11 flight: upload the same labelled EL AL screenshot. Before approval verify Flight, EL AL, empty booking number unless a real booking label exists, `LY087` in notes, TLV → HKT, and displayed departure/arrival timestamps. Approve and verify persistence.
3. F11 hotel: upload one labelled hotel PDF/image. Before approval verify confirmation, address, website and check-in/check-out values that are visibly present. Approve and verify persistence.
4. Short regression: edit a proposal title, approve it, open the correct original, delete the item, and reopen the preserved original from Documents.
5. Deploy 0.4.4 to a test URL and warm the installed PWA online.
6. F13: disable Wi-Fi and mobile data, swipe-close the installed application, reopen from its icon, and view a previously saved structured item.
7. Restore connectivity and verify normal online recovery.
8. Record final GO / NO-GO.

Any blocking failure returns the candidate to NO-GO without erasing earlier evidence. PDF/OCR engines may require connectivity on their first use; the offline test concerns application-shell cold start and viewing previously saved structured data.
