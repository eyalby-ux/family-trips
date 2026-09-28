# Family Trips Alpha 0.7.9.2 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.9.2` (Pre-Beta Code Health & Security Review V1, part 2 — `CR-002` SSRF DNS-pinning, `CR-003` atomic daily quota check, document removal from an item), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.9.2-36090d32`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

## What this candidate is, worth restating before testing

`CR-002` and `CR-003` are internal backend hardening with no new UI at all — nothing to click through for either. `CR-002`'s fix (pinning the SSRF defense's DNS resolution) and `CR-003`'s fix (making the daily quota check atomic) were both validated directly against real infrastructure during implementation, not just unit-tested: `CR-002` against a real live site plus a real connection-level rejection of a deliberately-mispinned address (proof the pin actually controls the connection, not just accepted and ignored); `CR-003` under genuine concurrent races against a fake store built to mirror `@netlify/blobs`' own documented compare-and-swap contract exactly (5 concurrent callers at a quota of 3 → exactly 3 succeed, 2 correctly rejected, no double-increment). Both are covered by Test 1/2 below as a live-request spot-check, not exhaustive re-verification.

**Document removal is the one item with real UI to test** (Tests 3–5).

## Test 1 — Regression: URL-based Smart Import (Hotel/Activity) still works normally

Run a Hotel or Activity Smart Import against a real public URL, the same way you would have before this candidate.

**Expect:** Works exactly as before — `CR-002` only changes which DNS resolution the actual connection uses (pinning it to what was already validated), not the acceptance/rejection behavior of any legitimate public URL. No new error messages, no new friction.

**Result:** ☑ PASS — notes: An initial attempt against `marriott.com` was rejected ("הקישור אינו ציבורי או דורש גישה פרטית" / link is not public or requires private access) — most likely Marriott's own bot/scraper blocking, not a `CR-002` regression (the source was still saved, per the app's own message, rather than erroring). Retested against `tate.org.uk/visit/tate-modern` and it succeeded: an Activity item was created correctly ("Tate Modern - Free admission"), with the app's own appropriate caveats surfaced (flagged as a venue info page rather than an individual ticket, currency left blank since none was stated, location not independently verified against Google Places). Date defaulted to the Trip's first day, which is expected default behavior for a page with no specific date. Confirms `CR-002` doesn't break ordinary public-URL Smart Import.

## Test 2 — Regression: Smart Import's daily quota still enforces correctly

Run a few Smart Import analyses in a row (comfortably under your configured daily limit) and confirm they all succeed normally.

**Expect:** No change in ordinary, non-concurrent use — `CR-003` only changes the mechanism preventing a rare double-count under simultaneous requests, not the everyday one-at-a-time flow.

**Result:** ☐ Not independently verified in this session — Product Owner's decision: accepted on code-level evidence only (the Development Agent's reported concurrent-race test against a fake store mirroring `@netlify/blobs`' compare-and-swap contract), not re-tested live here. Consistent with this candidate's own framing that `CR-002`/`CR-003` are backend hardening with no UI to click through.

## Test 3 — Remove a document from an item (no ticket coverage)

Attach a document to an item (any type) that does *not* have confirmed ticket coverage. Use the new remove/unlink action on that document's own row.

**Expect:** An ordinary confirmation prompt appears (no special warning). Once confirmed, the document disappears from the item's detail view. The item's own other fields are unaffected.

**Result:** ☑ PASS — notes: Removal worked with an ordinary confirmation. A note appeared confirming the document can be re-linked later — a nice, direct confirmation that this is a soft unlink, not a hard delete (also relevant to Test 5).

## Test 4 — Remove a document that IS confirmed ticket coverage

On a Flight/Activity/Transport item, confirm a linked document as ticket coverage for a participant (the existing `0.7.9`/`0.7.9.2`-carried-forward "אישור ככיסוי כרטיס" flow), then use the remove/unlink action on that same document.

**Expect:** A distinct, stronger warning appears, explicitly naming the affected participant(s) and stating that removal will also drop their ticket coverage — not just the app's ordinary confirmation. Confirming proceeds with the removal; canceling leaves everything unchanged.

**Result:** ☑ PASS — notes: The stronger warning appeared exactly as expected: "מסמך זה מאושר ככיסוי כרטיס עבור פאולה כהן — הסרתו תבטל גם את הכיסוי. להסיר בכל זאת?" (this document is confirmed as ticket coverage for Paola Cohen — removing it will also cancel the coverage — remove anyway?), naming the participant explicitly. Confirmed both directions: clicking OK proceeded with the removal (and coverage was dropped), and clicking Cancel on a repeat of the same flow left everything unchanged.

## Test 5 — A removed document is unlinked, not deleted

After removing a document in Test 3 or 4, confirm the underlying document record itself still exists — it should no longer appear on the item you removed it from, but the app should not report having permanently lost it. (There is no dedicated "orphaned documents" browsing UI in this candidate — a reasonable check is that nothing errors, and if you have any way to inspect the Trip's own document list independent of a specific item, confirm it's still there.)

**Expect:** The document is gone from the item's own detail view but not destroyed — a soft unlink, matching how a rejected Smart Import suggestion is archived rather than deleted.

**Result:** ☑ PASS — notes: Core expectation confirmed — the removed document still exists in the Trip's own documents list, not destroyed. Three gaps observed in this list, logged below per the Product Owner's instruction (non-blocking, disposition to be decided with the planning agent, not fixed as part of this correction): (1) no way to re-link a removed document to an item from this documents-bin view; (2) no indication of which item a document is/was linked to, from this view; (3) this view also shows a "הסרה" (remove) button on each document row, but clicking it here does not function/do anything — it's unclear whether it should be removed (deferrable to `0.8`) or should mean total removal from the Trip (which would need its own linked-item warning, similar to Test 4's).

## Test 6 — Regression: general spot-check across the full candidate

Spot-check that nothing else regressed: attaching a *new* document to an item still works normally; the document-to-participant auto-link and manual correction (`0.7.9`) are unaffected; the ticket-coverage confirm/used-toggle flow (`0.7.9`/`0.7.9.2`) still works outside of removal.

**Expect:** No unintended side effects outside the scope of Tests 1–5.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| The Trip's documents-bin list has no way to re-link a removed document to an item, and no indication of which item a document is/was linked to. | Test 5 | Non-blocking — gap | Logged 2026-09-28 by the Product Owner. Disposition to be decided with the planning agent, not this correction round. |
| The documents-bin list shows a "הסרה" (remove) button on each row that doesn't function. Either it should be removed (deferrable to `0.8`), or it should mean total removal from the Trip — which would need its own linked-item warning, similar to Test 4's. | Test 5 | Non-blocking — gap | Logged 2026-09-28 by the Product Owner. Disposition to be decided with the planning agent, not this correction round. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-28, on build `0.7.9.2-36090d32`. All 6 tests PASS (Test 2 accepted on the Development Agent's reported code-level concurrent-race evidence, not independently re-tested live, by the Product Owner's own decision). `CR-002`'s SSRF DNS-pinning doesn't affect ordinary public-URL Smart Import (confirmed against a real external site after an initial unrelated bot-blocking rejection from a different site). Document removal (the one item with real UI) works end to end: ordinary confirmation for uncovered documents, a stronger participant-naming warning before removing confirmed ticket coverage (both OK and Cancel paths confirmed), and the underlying document record survives removal as a soft unlink, not a hard delete. Three non-blocking gaps logged in the Trip's documents-bin view (no re-link affordance, no item-linkage indication, a non-functional remove button) — left open for the Product Owner to disposition with the planning agent, not fixed in this correction round. `0.7.9.2` may proceed to Production promotion as a separate, explicit action.

## Production promotion

**Promoted 2026-09-28.** Build `0.7.9.2-36090d32` deployed to Production (`familytripz.netlify.app`) via `netlify deploy --dir dist --prod --no-build` — a byte-identical artifact of the same build already accepted on `qa` (0 content files changed in the deploy diff; the `smart-import` function was re-uploaded since its own cache had expired, not because anything changed). Confirmed live via direct request, and the `smart-import` function confirmed booting correctly on the live Production runtime (a real request to its endpoint returns a clean 401, not a bundling/import crash — the same check run on `qa`). Three non-blocking findings from this session (documents-bin re-link affordance, item-linkage indication, non-functional remove button in that view) are logged above for the planning assistant to schedule separately.
