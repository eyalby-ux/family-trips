# Family Trips Alpha 0.7.4 — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.7.4` (four independent content-model items: `V6-F82`, `V7-F02`, Destination Countries, first-class Transport items, and a from-scratch Participant management build), installed on `version/V7`, deployed to the fixed `qa` alias (build `0.7.4-b9cbbadc`, deploy `6aaff21f699140b4eaa80a34`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw.

**Scope note.** Nothing in this candidate touches the datastore, security rules, or sync engine — no two-device session is required to verify any of this, single-device/single-account testing on the QA Test Trip is sufficient throughout.

## Two open design questions — verified and resolved, reviewed here rather than assumed silently

**1. Destination Countries vs. "destination/route summary":** a direct search of the entire codebase found no separate "route summary" concept anywhere — the MVP scope bullet names one feature, not two. The ordered Destination Countries list *is* the route summary: it's rendered in the app header (every screen) as the countries joined with " → ", in the order you set them in Trip Settings.

**2. Transport's relationship to the existing `car` type:** `car` already existed as a fully working item type (its own dropdown entry, Trip Center tile, field set, QR/JSON import support) — confirmed by direct code inspection before deciding anything. Rather than add new separate type(s) for rail/ferry/transfer alongside it, `car` was broadened in place: relabeled "תחבורה" (Transport), with a new sub-type field (transfer/rail/ferry/rental car/other). No data migration needed for any already-existing `car` item — it keeps working exactly as before, now just with a sub-type to set.

**A third thing worth knowing before testing Participant management:** while verifying whether any participant data might already exist beneath the missing UI (per the kickoff's own explicit request not to assume a clean slate), a real gap was found — a generic `participant` item type already existed in the type system (selectable from the same dropdown as Hotel/Flight/etc., with its own Trip Center tile) since early in this project, long before this candidate. If you or anyone testing this app ever created an item by selecting "משתתף" (participant) from that dropdown, that data still exists in Firestore under the Trip's regular items — it is **not** migrated into the new Participant management system built here, and that old dropdown option/tile no longer exists (so no new one can be created that way going forward). **Worth checking on the QA Test Trip specifically:** if Trip Center ever showed a "משתתף" tile before this candidate and you used it, that data is still there but now unreachable through the UI — flag it as a finding below if so, rather than something to silently work around.

## Test 1 — V6-F82: an item covered by multiple insurance policies shows all of them

Create two separate Insurance items. Link both of them to the same non-insurance item (e.g. an Activity) via each policy's own "קישור לפריטים נוספים" (link additional items) control. Open that Activity item's detail page.

**Expect:** Both insurance policies appear as separate "🛡️ מבוטח באמצעות..." lines, each tappable to navigate to its own policy — not just the first one.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 2 — V7-F02: "open tasks only" filter

Go to Tasks. Mark at least one task as done (checked). Confirm it's still visible by default. Set the new status filter to "משימות פתוחות בלבד" (open tasks only).

**Expect:** The completed task disappears from the list while the filter is active; switching the status filter back to "כל המשימות" (all tasks) brings it back. The status filter combines with priority/due-date the same way those two already combine (e.g. set status to open-only AND a priority — only open tasks of that priority show).

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 3 — Destination Countries: ordered list, visible as the Trip's own route summary

Go to Trip Settings. Add at least two Destination Countries in a specific order (e.g. "תאילנד" then "לאוס"). Confirm they appear in the app header (visible from any screen) in that exact order, joined with " → ". Reorder them (move the second one up). Confirm the header updates to reflect the new order. Remove one.

**Expect:** Add/remove/reorder all work correctly, and the header always reflects the current stored order — not just on the Settings page.

**Result:** ☑ PASS — notes (round 3 of 3):

Round 1: Add/reorder/remove and the header's live update all worked correctly (order confirmed correct, per screenshot: "1. תאילנד" then "2. לאוס", header shows "תאילנד → לאוס"). However, the header's " → " arrow pointed the wrong direction for Hebrew's right-to-left reading order — an LTR-style arrow, not flipped/mirrored for RTL. Recorded FAIL, sent back to the Development Agent.

Round 2 (retest after fix, build `0.7.4-42cadc25`): Development Agent's fix hardcoded the separator to `'←'` (verified via direct DOM injection against the live `qa` page's own CSS/fonts, not through the actual Trip Settings flow — flagged as an honest gap in their own report). Product Owner's retest with the Hebrew country names (תאילנד, לאוס) confirmed correct — **but the same header now shows the destination names in English ("Thailand ← Laos") in this screenshot, and there the hardcoded left-pointing arrow reads backwards** — English is LTR, so "Thailand" (first-added) should be followed by a right-pointing arrow toward "Laos", not a left-pointing one that visually suggests the reverse order. The fix is not bidi-aware — it hardcodes RTL-only and breaks the LTR case. Sent back to the Development Agent for a fix that adapts to the actual script/direction of the rendered names, not a hardcoded arrow.

Round 3 (retest after fix, build `0.7.4-fe61afe4`): Development Agent identified the real issue — Destination Countries is a plain free-text field, not tied to any single language, so a fixed direction could never be correct for both scripts. Fix now detects whether the typed country names contain Hebrew and picks `←` or `→` accordingly, rather than assuming the app's primary language; verified against the live page for both cases before committing, plus a new behavioral test (Hebrew/Latin/mixed/empty) rather than just a source-text check. Product Owner confirmed **PASS** — correct with the Hebrew names in place, per this retest.

## Test 4 — First-class Transport items

Create a new item, selecting "תחבורה" (Transport) as the type. Set its sub-type (e.g. "רכבת" — rail). Fill in provider/confirmation number/pickup location/times as applicable. Save. Confirm it appears correctly in Trip Center (under the Transport tile), and on Timeline/Today at its scheduled time, showing the specific sub-type you chose (not a generic "Transport" label). Try importing a Transport item via QR/JSON too, if convenient.

**Expect:** Transport behaves like every other item type — dynamic form, correct Timeline/Today placement, manual creation and QR/JSON import both work. No AI Smart Import option should be offered for it (expected — explicitly out of scope for this candidate).

**Result:** ☑ PASS — notes: Confirmed as expected, including the expected absence of AI Smart Import for Transport (explicitly out of scope for this candidate — confirmed not offered, as intended, not a defect). Product Owner saved benchmark example documents at `tests/fixtures/Trans_benchmark` in the repo, for whenever Transport Smart Import is built in a future candidate.

## Test 5 — Participant management: add, edit, deactivate

Go to Trip Settings → Participants. Add a new participant with a name, relationship, phone, email, and avatar initials. Confirm it appears in the list. Edit it (change the relationship). Deactivate it, then reactivate it.

**Expect:** All fields save and reload correctly; deactivating clearly marks the participant as inactive without deleting their record (their data survives reactivation). No participant management UI appears anywhere in Trip Center — Trip Settings is the only place this lives.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 6 — Item-participant relationship: none / all / specific

Add at least two participants if you haven't already. Create or edit an item (e.g. a Hotel). Set its participant assignment to "משתתפים נבחרים" (specific participants) and select one of them. Save, and confirm the item's detail page shows "משויך ל: [that participant's name]". Edit it again and change the assignment to "כל המשתתפים" (all participants) — confirm the detail page now shows all participant names or an "all" indication. Change it back to "ללא שיוך ספציפי" (no specific participant) — confirm the line disappears.

**Expect:** All three states (none/all/specific) work and are clearly visible on the item's own detail page.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 7 — Tickets and passes

Open a Flight, Activity, or Transport item. Add a ticket for one participant, optionally with a barcode/QR code value. Confirm it appears with that participant's name. Mark it as used. Add a second ticket for a different participant. Confirm the "משתתפים ללא כרטיס" (participants without a ticket) hint correctly reflects who still doesn't have one. Remove one ticket.

**Expect:** Tickets are per-item, per-participant, each independently markable as used/not-used, removable, and the remaining-participants hint stays accurate throughout. (Note: tickets display as a plain list, not a swipeable carousel, and any entered code shows as plain text, not a rendered scannable barcode/QR image — both deliberate simplifications given this codebase has no existing infrastructure for either; flag if this feels insufficient for real use.)

**Result:** ☑ PASS — notes: Confirmed as expected — per-participant tickets, used/not-used state, remaining-participants hint, and removal all worked correctly. Plain-list ticket display and plain-text code display (the two stated deliberate simplifications) were not flagged as insufficient. Product Owner enhancement request, logged below: when a document is attached to an item, the system should recognize which participant it belongs to and link it to them automatically.

## Test 8 — Packing: shared list + personal list per participant

Go to Packing Lists. Confirm a participant switcher appears (if you have active participants) with "משותף" (shared) plus one button per participant. Add a new packing item assigned to a specific participant (or two). Switch to "משותף" — confirm that item does *not* appear (it's personal, not shared). Switch to that participant's own view — confirm it *does* appear, alongside any genuinely shared items. Add another item with no participant assignment — confirm it shows up in every view (shared items are visible from everyone's personal view too).

**Expect:** The shared/personal distinction behaves as described; switching views is immediate and doesn't lose any data.

**Result:** ☑ PASS — notes: Confirmed as expected; no notes.

## Test 9 — Regression: `0.7.1`–`0.7.3.1`'s existing feature set undisturbed

Spot-check a few things unrelated to this candidate's own scope: create/edit a Hotel or Flight item normally (confirm the participant-assignment addition doesn't get in the way of the existing flow), confirm the sync engine (field-level merge, pending-sync indicator, offline behavior) still works as it did in `0.7.3`/`0.7.3.1`, confirm existing packing lists/tasks/shopping items created before this candidate still display correctly.

**Expect:** Nothing from prior candidates regressed.

**Result:** ☑ PASS — notes: No other regression found. One leftover issue: editing a Hotel item now shows both the old free-text "משתתפים" (participants) field and the new participant-assignment dropdown/checkboxes — duplicated in the same form, with the old field no longer relevant now that real participant management exists. Product Owner's own call: non-blocking, logged as a cleanup finding rather than held against this candidate's GO.

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| Destination Countries header arrow direction — resolved after 3 rounds. Round 1: LTR-style " → " read backwards for Hebrew names. Round 2 (hardcoded `'←'`): fixed Hebrew, broke the LTR/English case. Round 3 (script-detection, `←` for Hebrew content / `→` otherwise): confirmed correct by Product Owner retest. | Test 3 | Resolved | Reported by Product Owner 2026-09-21 (round 1), regression found 2026-09-21 (round 2). Fixed correctly in round 3, build `0.7.4-fe61afe4`, confirmed by Product Owner retest 2026-09-21. Closed. |
| Enhancement request: when a document is attached to an item, the system should recognize which participant it belongs to and link it to them automatically (currently no such auto-recognition/auto-link exists). | Test 7 | Enhancement | Reported by Product Owner 2026-09-21. Not a defect in this candidate's own scope — candidate for a future correction package or backlog item. |
| Leftover UI duplication: editing a Hotel item's form still shows the old free-text "משתתפים" (participants) field alongside the new participant-assignment dropdown/checkboxes built in this candidate. The old field is no longer relevant and should be removed. | Test 9 | Minor (cosmetic/UI clutter only, no functional or data-loss impact) | Reported by Product Owner 2026-09-21, with screenshot. **Scoped to correction `0.7.4.1`** — Product Owner decision, 2026-09-21. Not yet triaged by the Development Agent — likely applies to other item types too (Flight, Activity, etc.), worth checking during triage. |

## GO/NO-GO decision

**GO.** Recorded by the Product Owner (Eyal), 2026-09-21. All 9 tests PASS — Test 3 required three rounds (header arrow direction, resolved with a script-aware fix, build `0.7.4-fe61afe4`). `0.7.4` may proceed to Production promotion as a separate, explicit action. Two non-blocking findings remain open: an enhancement request (auto-link attached documents to participants) and a leftover UI duplication (old participants field still shown alongside the new one on item edit forms) — both pending a fix-version scoping decision.
