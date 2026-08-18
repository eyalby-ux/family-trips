# FamilyTrips Smart Import Technical Spike Results V7

Date: 2026-08-14  
Document revision: `V7`  
Measured sources: V10 full matrix, V11 focused integrity rerun and V13 Google Places validation  
Overall status: **PASS — Alpha 0.6.0 Hotel-first implementation gate is open**

## Change history

| Revision | Date | Change |
| --- | --- | --- |
| V6 | 2026-08-14 | Recorded safe but inadequate V12 public-provider result and authorized the bounded Google Places V13 experiment. |
| V7 | 2026-08-14 | Recorded the passed V10/V11 extraction and integrity gates plus the passed V13 Hotel-place provider gate; closed Decision 6. |

## Executive verdict

The complete measured Smart Import gate passes. The frozen `gpt-5.6-luna` / low-reasoning extraction path provides useful Hotel proposals across text PDF, mixed-RTL PDF, raster screenshot and public official-site sources; a protected Booking.com route stops safely. No measured attempt asserted a false exact critical or integrity value. Google Places Text Search (New) validated both real reference Hotels with the exact Hotel name first, one lookup per property and no generic or competing-property acceptance.

These results authorize a bounded Alpha 0.6.0 QA implementation. They do not authorize unrestricted web search, credentialed retrieval, silent item creation, multi-user sharing/synchronization or automatic Production promotion.

## Extraction and safe-failure results

### V10 — complete matrix, three attempts per case

| Case | Source | Recall across attempts | Integrity | Cost per attempt | Latency |
| --- | --- | ---: | --- | ---: | ---: |
| H-001 | Text Hotel confirmation PDF | 100%, 100%, 100% | 0 false exact critical claims | USD 0.002790–0.003633 | 15.2–20.0 s |
| H-002 | Mixed Hebrew/English Hotel PDF | 100%, 90%, 95% | 0 false exact critical claims | USD 0.002451–0.003307 | 13.7–18.5 s |
| H-003 | Raster/cropped Hotel screenshot | 80%, 90%, 80% | 0 false exact critical claims | USD 0.001032–0.001164 | 6.2–7.1 s |
| H-004 | Public official Hotel website | 95%, 95%, 95% | 0 false exact critical claims | USD 0.006134–0.006744 | 24.0–26.8 s |
| H-005 | Login/session-required booking URL | 100% safe failure in all attempts | `access_required`; no extraction or invention | USD 0 | 0.3–0.4 s |

Aggregate V10 evidence:

- 15 of 15 attempts completed or stopped in the required terminal state.
- 12 paid model attempts; three zero-cost safe-failure attempts.
- Maximum observed variable cost: USD 0.006744 per attempt.
- Total estimated cost for the measured matrix: USD 0.040863.
- Median latency: 14.213 seconds; maximum latency: 26.755 seconds.
- False exact critical count: 0.
- H-003 is intentionally `needs_review`; its lower recall is visible to the user rather than repaired by invention.

### V11 — focused H-003 integrity confirmation

The focused crop strategy was rerun three times against H-003 and three times against the zero-cost H-005 safety case.

- H-003 recall: 80%, 80%, 80%.
- H-003 maximum cost: USD 0.001399.
- H-003 maximum latency: 7.164 seconds.
- H-005: `access_required`, 100% safe-failure recall, zero model cost in all three attempts.
- False exact critical count: 0.
- False exact integrity count: 0.

The acceptance rule is therefore review-first completeness, not automatic finality: every readable travel-relevant value is displayed with evidence, uncertain raster values remain marked for review and absent values remain absent.

## V13 Google Places validation

Measured source: `place-validation-spike-1786705903712.json`.

| Case | Name-first query | Result | Candidates | Accepted identity | Latency |
| --- | --- | --- | ---: | --- | ---: |
| P-001 | `Panvaree Resort, ... Thailand` | Validated | 2 | `Panvaree Resort/พันวารีย์ รีสอร์ท` | 446 ms |
| P-002 | `Alaya Poleg, Israel` | Validated | 1 | `ALAYA-POLEG-אלאיה פולג` | 238 ms |

All V13 gates passed:

- complete matrix: 2/2;
- validated properties: 2/2;
- exactly one provider lookup per Hotel and no automatic retry;
- Hotel name first in both queries;
- lodging type, country and normalized property-name compatibility required;
- competing `Panvaree The Greenery` result rejected as `property_name_not_strong_match`;
- no generic park, dam, city or region accepted;
- coordinates stored only behind a strong match;
- user-facing Location remains the exact Hotel name, while address, place ID, coordinates and Maps URI remain separate canonical metadata;
- maximum provider latency: 446 ms;
- expected charge within the monthly free cap: USD 0; maximum marginal cost for the two measured lookups at the first paid tier: USD 0.064;
- extraction contract unchanged.

The temporary V13 Google Cloud key was deleted by the Product Owner after acceptance. Alpha 0.6.0 QA must use a new dedicated server-only key restricted to Places API (New), paired with the reduced Text Search quota, usage monitoring and a billing alert.

## Frozen implementation gates

1. One explicit paid action per analysis attempt; save-only/attach-only invokes no AI.
2. The original source is retained locally and remains separable from every proposal.
3. Authentication, active invitation, target-Trip ownership and daily quota are checked server-side before source processing.
4. Model output is strict-schema, evidence-linked, non-training (`store: false`) and never silently applied.
5. Protected/private URLs return a safe state and never request credentials or create an empty Hotel.
6. A supplied public URL is bounded to one page and three redirects in the 0.6.0 slice; arbitrary search and broad crawling are prohibited.
7. One Hotel place lookup is permitted after extraction. An unsafe or ambiguous result leaves the Hotel name as unverified text without map coordinates.
8. Per-attempt audit metadata excludes source bytes, retrieved page contents and extracted values.
9. Maximum server analysis payload is 4 MB. Larger originals may still be saved locally without analysis.
10. Alpha 0.6.0 remains Hotel-only. All other travel item types retain manual and QR/validated-JSON paths.

## Remaining Product Owner gate

Run the installable 0.6.0 candidate through `EXECUTABLE_TEST_SESSION_V121.md` on the exact non-Production deploy. Production promotion requires explicit Product Owner GO; measured technical success alone is not a release decision.
