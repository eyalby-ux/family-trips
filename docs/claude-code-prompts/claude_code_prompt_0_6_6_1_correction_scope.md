Target-version assignment for the first `0.6.6` acceptance session's findings is now confirmed by the Product Owner (Eyal), one finding at a time, per the standard's requirement that this decision happen before any correction package is authored. Please now author the actual correction-package scope document, following the exact structure of `claude/FAMILY_TRIPS_ALPHA_0_6_4_CORRECTION_SCOPE_V1.md` (header/status block, document change history, purpose paragraph, root-cause groupings, per-finding fix specifications with acceptance criteria and named-regression-test requirements, explicit exclusions, package content and deployment contract), and update the finding register / version-naming list accordingly. No implementation yet — this is scope-authoring only, same discipline as every other package this project has produced.

## Naming decision

The correction candidate is **`0.6.6.1`**, not `0.6.7` — `0.6.7` is already reserved for insurance implementation (a separate feature track), so this correction uses patch-style naming instead, matching the `0.5.0`→`0.5.1` pattern from the V5 lifecycle rather than the sequential full-version pattern the `0.6.x` series has used so far. Add this as an explicit new entry to the "For V6" version-naming list in `VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`, following its existing format (package zip name, branch, docs path, baseline, candidate version).

## Two findings retested and closed — update register, no correction-package action needed

- **`V6-F52`** (sign-in vs. About version label mismatch): Eyal retested directly — sign-in screen, browser tab title, and About panel all now read "Alpha 0.6.6" consistently (About panel additionally shows the build hash `0.6.6-9b5b1ed0`). **Confirmed Fixed, verified.**
- **`V6-F53`** (flight direction ambiguity via repetition): Eyal retested with `FL-003` — the two internal extraction calls genuinely disagreed on direction, the ambiguous-direction picker correctly appeared, and he resolved it to the correct direction. This is a real exercise of the new disagreement-detection mechanism, not a lucky pass. **Confirmed Fixed, verified.**

Update both finding register entries from "Implemented, awaiting Eyal's QA retest" to "Fixed, verified" with this evidence noted.

## `V6-F54` merges into `V6-F55` — do not close `V6-F54` separately

Eyal's retest of `V6-F54` (Panvaree Resort merge-conflict warnings, Panan Krabi date-label warning) found no dismiss control visible anywhere in the UI on either item, and both cases show unresolved/stale warning behavior — this is the same underlying problem `V6-F55` already opened. Do not mark `V6-F54` Fixed; instead merge it into `V6-F55` as one combined finding (keep whichever ID reads more naturally as the primary — your call, just don't leave two IDs open for one problem). New evidence to fold in:

- **Panvaree Resort:** after merging the PNG (wrong dates) and PDF (correct dates, now correctly showing as June in the saved item), the warning box still displays "new value discovered for `startAt`: 2027-01-17 — saved value kept, needs manual review" — describing a conflict that already resolved correctly (the correct June date IS what's saved), but rendering as if something still needs attention. The warning is stale/misleading, not just slow to clear.
- **Panan Krabi:** Eyal had to actively edit both the check-in and check-out dates to clear most of the warning, but **one warning still remains** even after editing both fields directly — worse than the previously-reported "edit clears it" fallback, since the fallback itself is now incomplete.
- **No dismiss control observed:** neither item shows any per-warning dismiss affordance — only the item-level Edit/Delete/Add-document buttons. If `V6-F54`'s fix added a dismiss control to `detailView()`, verify why it isn't rendering in either of these two real cases.

**Eyal's proposed fix direction (Product Owner input, to guide but not dictate the implementation approach):** rather than silently keeping one value and showing a warning that may never clear, the app should actively resolve the conflict with the user — either present a picker asking which value is correct (reusing the existing `directionAmbiguous`/`directionCandidates` picker pattern rather than building a new UI), or propose a value based on the Trip's own date range and require explicit user confirmation of that choice. Either approach replaces "silent-keep + indefinite warning" with a real decision point, and should be evaluated as the primary fix candidate for the merged `V6-F54`/`V6-F55` finding.

Severity: **High** (Product Owner decision) — this is a cross-cutting warning-lifecycle mechanism shared by Hotel and other item types, not an Activity-specific cosmetic issue.

## Confirmed scope for the `0.6.6.1` correction package — 11 finding IDs, four groups

All below are Product-Owner-confirmed for target `0.6.6.1`, one at a time, with severity as stated (some adjusted from my initial proposal after discussion — use the severities below, not any earlier draft):

**Group A — Activity-type extraction/prompt defects** (same adapter/system-prompt surface for the `activity` type; investigate together, one prompt-tightening pass may close several at once):
- `V6-F56` — High. `ticketHolderSchema` has no DNI/national-ID field at all (`name`, `ticketNumber`, `seatOrSection`, `evidence`, `certainty` only, `additionalProperties:false`) — structurally impossible to capture, independent of source quality. Needs a schema field addition, not just a prompt change.
- `V6-F59` — Medium. `AE-006`'s saved title is "WaterLand" (the venue name) instead of the frozen correct title "כניסה לפארק יום" (day park entry / the actual activity name) — a real title-extraction defect, not a display gap.
- `V6-F63` — Medium. `provider` shows the ticketing platform ("SmarTicket.co.il"/"SmarTicket") instead of the venue (Bloomfield Science Museum) on `AE-003`/`AE-004` — confirmed root cause: the extraction prompt has no guidance on which to prefer when a source names both a venue and a separate ticket-selling platform.
- `V6-F64` — **High** (elevated from an initial Medium proposal at Product Owner request: location accuracy is one of Decision 4's explicit no-omission blockers for this item type, not a required-when-present field, so this fails a hard project rule, not just a nicety). `AE-004`'s location shows only "אודיטוריום" (Auditorium), dropping "Bloomfield Science Museum Jerusalem" entirely — the sub-venue overwrote the venue instead of both being combined.
- `V6-F65` — High, effectively confirmed. `AE-007`'s `provider`/`location` show "גן החיות התנ\"כי ירושלים" (Jerusalem Biblical Zoo) where the frozen ground truth — and two independently verified plain-text occurrences on the actual source, per the prior investigation — show only the generic label "גן החיות." Google Places lookup was already ruled out as the source of the specific name. This is the one benchmark case in the whole `AE-` set specifically built to catch a model substituting real-world knowledge for what the source actually says. The only unresolved detail is one small stylized logo graphic that couldn't be read with confidence at available resolution — note this caveat in the finding but do not let it block treating this as confirmed.

**Group B — Activity detail-view rendering gaps** (data correctly captured, `v5-app.js`'s `detailView()` never renders it; one rendering-completeness pass likely closes all three, plus the regression-test gap):
- `V6-F57` — Low. `ticketHolders` (name/seat/ticketNumber) and `amount`/`currency` are captured correctly into `proposed.details.*` but never read anywhere in the rendering path — confirmed uniform across `AE-001`, `AE-002`, `AE-004`, `AE-005`, `AE-006` (five of five tested cases with this kind of data).
- `V6-F58` — Low-Medium, fold into Group B's work rather than treat as separate implementation: `tests/v6-6-attraction-event-import.mjs` has fixture data for `AE-005`'s `amount` and `AE-002`/`AE-004`'s `seatOrSection` but never asserts them — add the missing assertions as part of this same pass, don't scope it separately.
- `V6-F60` — Low. Date-only values render a synthetic "12:00" (from `dateTime()`) that's visually indistinguishable from a genuinely extracted time — confirmed as a deliberate code-level default, not model fabrication, but still a real display-trust gap since the user can't tell the difference.
- `V6-F61` — Low, cosmetic. `AE-002`'s purchaser field renders "Purchaser: Purchaser: <name>" — doubled and in English, unlike every sibling Hebrew label on the same page. Root cause: the same "no canonical field slot" gap class as `V6-F56`.

**Group C — Missing capability** (standalone):
- `V6-F62` — Medium. `activity`-type items have no attach-existing-document control at all (unlike Hotel), confirmed as the actual root cause of `AE-003`/`AE-004` never linking as a companion pair — the existing duplicate-detection logic is real, tested, and unrelated; it simply never had a document-attach event to fire on. Fix: add the missing attach-document control for `activity` items, mirroring Hotel's existing pattern.

**Group — Warning lifecycle** (cross-cutting, High severity, per above):
- `V6-F55` (merged with `V6-F54`) — see full detail above.

## What's explicitly out of scope for `0.6.6.1`

Nothing else from this session — everything investigated during the first `0.6.6` acceptance pass now has an explicit disposition (Fixed/verified, merged, or assigned above). Confirm this in the scope document's exclusions section the same way `FAMILY_TRIPS_ALPHA_0_6_4_CORRECTION_SCOPE_V1.md` did for its own out-of-scope findings.

## What to produce

1. `claude/FAMILY_TRIPS_ALPHA_0_6_6_1_CORRECTION_SCOPE_V1.md` — the full correction-package scope document, structured like the `0.6.4` precedent: header/status/candidate/baseline block, change history, purpose paragraph, the root-cause groupings above (feel free to refine grouping labels, but keep the finding-to-group mapping as decided), per-finding fix specifications with concrete acceptance criteria and named-regression-test requirements, explicit exclusions, package content and deployment contract.
2. Update `VERSION_PACKAGE_AUTHORING_STANDARD_V30.md`'s "For V6" version-naming list with the new `0.6.6.1` entry (package zip name, branch, docs path, baseline `0.6.6`, candidate `0.6.6.1`).
3. Update `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`'s finding register: `V6-F52`/`V6-F53` to Fixed/verified with evidence; `V6-F54` merged into `V6-F55`; all eleven findings in the confirmed scope above moved from `TBD after acceptance completion` to `Assigned — target 0.6.6.1` with the severities as stated (note the `V6-F64` severity change from the initial Medium proposal to High, with rationale, so the audit trail is honest about the revision).

Do not begin implementation yet — this is scope-authoring and register-update only. Report back once the scope document is written so Eyal can review it before implementation starts.
