# FamilyTrips Alpha 0.6.3 Known Issues

Document revision: `V4`  
Date: 2026-08-15  
Status: Open QA expectations, not accepted Production limitations

| ID | Current behavior | Product boundary / QA expectation |
| --- | --- | --- |
| V6-K01 | Smart Import supports Hotel only. | Other types continue through manual or validated QR/JSON. Cross-type Smart Import is later scope. |
| V6-K02 | Analysis requires network, an active invitation and remaining daily quota. | Original save/attach remains available without AI; UI must explain the blocked action. |
| V6-K03 | Binary analysis payload is capped at 4 MB and public HTML at 1 MB. | Larger originals may be retained locally but are not analyzed in 0.6.3. |
| V6-K04 | Public URL processing acquires one HTML page and at most three redirects. | No arbitrary search, authenticated retrieval or broad crawl is promised. |
| V6-K05 | Raster H-003 extraction is intentionally `needs_review` and measured at 80% recall in V11. | No false exact integrity claim is allowed; visible uncertain values must remain reviewable. |
| V6-K06 | Google Places validation requires a separately configured billing-enabled server key. | Without a strong match, Location remains the Hotel name as unverified text and map coordinates are disabled. |
| V6-K07 | Original-source cloud synchronization and shared multi-user Trips are not implemented. | Phone QA checks responsive behavior, not cross-device persistence. Full synchronization remains Alpha 0.7. |
| V6-K08 | Revocation lifecycle administration has no UI in 0.6.3. | Server allowlist removal blocks AI immediately. Full invitation/quarantine/deletion administration remains Alpha 0.7, under the frozen 30-day-plus-owner-approval contract. |

`V6-F01`, `V6-F02` and `V6-F03` are not accepted issues: fixed general QA and successful deterministic QA-variable recreation are mandatory. Any version-specific alias or failed/partial configuration invalidates the QA deployment.

Any source-present Hotel identity, date/time, phone, booking number, location evidence, important instruction or meaningful-title omission discovered in the controlled QA matrix is a new release finding, not an accepted issue.
