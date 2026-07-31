# Known Issues — Alpha 0.3 Foundation

Status: Accepted non-blocking limitations
Decision date: 2026-07-31

## KI-001 — Flight filename can be classified as hotel

Example: `ELAL_flight_booking_screenshot.png`

The legacy filename classifier may suggest `hotel` because the broad `booking` rule is evaluated before flight-specific terms.

Classification: **Scheduled Alpha feature — Alpha 0.4 Smart Ingestion**

Release impact: Non-blocking.

Alpha 0.4 must prioritize flight terms such as `flight`, `boarding`, `airline`, and `ELAL`, while keeping user confirmation.

## KI-002 — Offline cold start is limited

- When the application is already open and connectivity is lost, an offline warning is shown and local work can continue.
- When the installed PWA is opened from a fully closed state without connectivity, the browser may display its offline page instead of the complete application shell.

Classification: **Known Alpha 0.3 Foundation limitation**

Release impact: Non-blocking. Full offline cold-start support was not part of the Foundation scope.

## Retained product limitations

- No OCR or complete document extraction.
- Uploaded file bytes are not persisted in the legacy local application.
- File sources cannot be reopened after the original local file-picker session.
- External map selection is not embedded.
- Only one active local Trip is supported.
- Shared Trips, cloud documents, Participants, and synchronization are not implemented in this Foundation release.