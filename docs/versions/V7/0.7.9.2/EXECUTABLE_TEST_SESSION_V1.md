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

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 2 — Regression: Smart Import's daily quota still enforces correctly

Run a few Smart Import analyses in a row (comfortably under your configured daily limit) and confirm they all succeed normally.

**Expect:** No change in ordinary, non-concurrent use — `CR-003` only changes the mechanism preventing a rare double-count under simultaneous requests, not the everyday one-at-a-time flow.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 3 — Remove a document from an item (no ticket coverage)

Attach a document to an item (any type) that does *not* have confirmed ticket coverage. Use the new remove/unlink action on that document's own row.

**Expect:** An ordinary confirmation prompt appears (no special warning). Once confirmed, the document disappears from the item's detail view. The item's own other fields are unaffected.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 4 — Remove a document that IS confirmed ticket coverage

On a Flight/Activity/Transport item, confirm a linked document as ticket coverage for a participant (the existing `0.7.9`/`0.7.9.2`-carried-forward "אישור ככיסוי כרטיס" flow), then use the remove/unlink action on that same document.

**Expect:** A distinct, stronger warning appears, explicitly naming the affected participant(s) and stating that removal will also drop their ticket coverage — not just the app's ordinary confirmation. Confirming proceeds with the removal; canceling leaves everything unchanged.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 5 — A removed document is unlinked, not deleted

After removing a document in Test 3 or 4, confirm the underlying document record itself still exists — it should no longer appear on the item you removed it from, but the app should not report having permanently lost it. (There is no dedicated "orphaned documents" browsing UI in this candidate — a reasonable check is that nothing errors, and if you have any way to inspect the Trip's own document list independent of a specific item, confirm it's still there.)

**Expect:** The document is gone from the item's own detail view but not destroyed — a soft unlink, matching how a rejected Smart Import suggestion is archived rather than deleted.

**Result:** ☐ PASS / ☐ FAIL — notes:

## Test 6 — Regression: general spot-check across the full candidate

Spot-check that nothing else regressed: attaching a *new* document to an item still works normally; the document-to-participant auto-link and manual correction (`0.7.9`) are unaffected; the ticket-coverage confirm/used-toggle flow (`0.7.9`/`0.7.9.2`) still works outside of removal.

**Expect:** No unintended side effects outside the scope of Tests 1–5.

**Result:** ☐ PASS / ☐ FAIL — notes:

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| (fill in during acceptance testing) | | | |

## GO/NO-GO decision

Not yet run.

## Production promotion

Not applicable — pending this session's own retest and GO.
