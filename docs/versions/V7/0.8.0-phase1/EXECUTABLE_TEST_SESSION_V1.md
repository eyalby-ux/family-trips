# Family Trips Beta 0.8 Phase 1 (Foundation) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase1` (Beta 0.8 Phase 1 — Foundation: design tokens, 5-item nav + RTL/bidi, Today's leading/rest structure, participant selection carousel), per `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` §2–§5 and `FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md`'s own Phase 1 acceptance criteria, installed on `version/V7`, deployed to the fixed `qa` alias (build `0.8.0-phase1-60bb4142`, `https://qa--familytripz.netlify.app`)
**Session number:** `V1`. No test has been run yet.
**Instructions:** Run one test at a time, in order. Per §9's own instruction, compare screenshots against the spec as you go — this is a visual/interaction candidate, not a behavioral one, so a screenshot check catches what a functional click-through alone would miss. Record the actual observed result under each test, not just PASS/FAIL.

## What this candidate is, worth restating before testing

This phase is visual and structural only — no data model or backend change. It is **not** promoted to Production on its own, per your own decision recorded at `V147`: Beta 0.8's three phases are pieces of one visual system, not independent features, so all three accumulate on `qa` and only Phase 3's own GO promotes anything. This session's job is to accept (or send back) Phase 1 on `qa`, not to sign off on the whole redesign yet.

**Not reachable from the Development Agent's own environment:** the built-in browser tool used during implementation has no real Google account, so it could only verify the sign-in screen and a hand-built CSS rig (computed styles: token values, nav grid columns, the day-item-time column width, the plus circle's size/color, the needs-attention background, carousel scroll-snap — all confirmed to match the spec exactly). Every test below that requires being signed into a real Trip is genuinely unverified past that point, and needs this session to close the gap.

**Also worth knowing going in — a decision made, not asked, during implementation:** the spec's own 5-item nav (§3) has no Settings slot. Settings was relocated to a new gear-icon button in the always-visible account bar (top of every screen), rather than left unreachable or added as a 6th nav item the spec doesn't call for. Test 10 below checks this.

## Test 1 — Tokens, typography, and spacing

Open any screen with a mix of cards, buttons, and text (Today is fine). Compare against §2's table.

**Expect:** Background `#FCFAF7`, card surfaces `#FFFFFF`, primary text/ink `#123F42`, secondary/muted text `#726B66` (not the old `#79726D`), borders `#E7E1DA`, the terracotta accent `#C86442` used sparingly (never more than one accent per content area). Card radius 16px, button radius 12px, 20px screen side margin, 12px gap between cards, the specified soft shadow only. Screen title 34px/700, section title 22px/600, item title 20px/600, body 16px, metadata 15px. Font is Heebo (check a Hebrew heading renders in it, not the system default).

**Result:** ☐

## Test 2 — Bottom nav: 5 items, central +, tap targets, icons

Look at the bottom nav on any screen.

**Expect:** Exactly 5 items — Today, Timeline, a central `+`, Trip Center, Packing. The `+` is a 56px circle in `--ink` (dark teal, `#123F42`) with a white plus, never terracotta. All icons are plain outline-style line icons (no filled/mixed styles), each with a visible label. Every nav button feels at least 44×44px to tap. Tapping `+` opens the same "add" intake modal the old floating button used to.

**Result:** ☐

## Test 3 — RTL, bidi, and directional icons

Browse a few screens with Latin/numeric content mixed into Hebrew text — an item's time, a provider name, a confirmation number, an airport code.

**Expect:** The whole app reads right-to-left as before. Latin text and numbers embedded in a Hebrew sentence never invert or reorder (a flight time like "14:20" or a code like "NRT" reads left-to-right in place, not reversed). If you can compare a back/chevron-style icon, it should point left under RTL; something like a play/pause icon or the central `+` should NOT flip.

**Result:** ☐

## Test 4 — Pressed and focus states

Tap a few different elements (a nav button, a card, a button) and hold briefly if your device shows the pressed state; separately, if you have a keyboard or switch control handy, Tab through a screen.

**Expect:** A visible pressed feedback (a slight background shift or scale-down) on tap, quick and not bouncy. A clear 2px dark ring around whatever has keyboard focus, never invisible/suppressed.

**Result:** ☐

## Test 5 — Today: a calm/free day

Find or set up a day with nothing urgent happening (or navigate to a day/state with no upcoming item today).

**Expect:** No leading action card at the top. Today's plan (if anything is listed) shows as plain, compact cards — no accent color, no emphasis dot. If any games are set up for the Trip, exactly one game suggestion appears as a quiet secondary card near the bottom, above the nav, with no illustration.

**Result:** ☐

## Test 6 — Today: a busy day (non-transit imminent item)

Find or set up a day with an upcoming item today that is NOT a flight or a rental car (e.g. an activity, hotel check-in, or insurance reminder).

**Expect:** One leading action card at the top, showing a relative time ("בעוד X דקות/שעות"), the item's name, and an operational detail line (provider or location). Below it, the rest of today's items as a compact list — the leading item itself does not also appear a second time in that list. No game suggestion anywhere on this screen.

**Result:** ☐

## Test 7 — Today: a transit/flight day

Find or set up a day with an upcoming Flight or rental-car item.

**Expect:** The transport/flight item is the leading action card, showing relative time, route/location, and its confirmation number if it has one — not styled like a boarding pass. Below it, only the rest of the day (e.g. checkout, drive to the airport). No game suggestion.

**Result:** ☐

## Test 8 — Day-item card: time, urgency dot, and contextual actions

On the leading action card and on at least one regular (non-leading) day item, look closely at the time area and the action buttons.

**Expect:** The time is always dark ink-colored text, never a color change to signal urgency — only the leading card gets a small terracotta dot beside its time. `ניווט` (Navigate) only appears when the item has a real location; `אתר` (Website) only with a real link; `כרטיסים` (Tickets) only when a linked document has actually been confirmed as ticket coverage for that item. None of these are icon-only — each has a visible label.

**Result:** ☐

## Test 9 — Needs-attention state

Find or create an item whose date falls outside the Trip's own date range (the existing "מחוץ לטווח" condition) so it shows up as a day-item card.

**Expect:** A soft warm background (not white, not red), with a distinct warning icon next to the item's name — not just a background-color change with the same icon as a regular item.

**Result:** ☐

## Test 10 — Settings relocation to the account bar

Look at the top of any screen (the account bar) and tap the new gear icon there.

**Expect:** A gear-icon button sits in the account bar, always visible, separate from the person/sign-out area. Tapping it opens Settings, the same screen the old nav's Settings tab used to reach. Settings is not reachable from the bottom nav anymore (only 5 items, per Test 2).

**Result:** ☐

## Test 11 — Participant selection carousel (Packing)

Open Packing on a Trip with 2–5 active participants.

**Expect:** Instead of (or replacing) the old row of plain buttons, a horizontally-scrollable carousel shows each participant (plus "משותף"/shared) as an avatar + name, with the selected one centered and at full size/contrast, and neighbors slightly smaller/faded but still legible. Small indicator dots below show your position. Dragging/swiping snaps between options; tapping a neighbor also selects it and re-centers. If you have a keyboard, try the left/right arrow keys while a carousel item is focused — they should also step through the options.

**Result:** ☐

## Test 12 — Participant carousel: falls back for a long list

If the Trip has more than 5 active participants (or add test participants to reach 6+), open Packing again.

**Expect:** The carousel is NOT used here — the original plain row-of-buttons switcher appears instead, per the spec's own "don't use a carousel for a long list" rule.

**Result:** ☐

## Test 13 — General regression: nothing else broke

Spot-check outside this phase's own scope: create or edit an item normally, run a Smart Import against a real document/URL, confirm sync still works (edit on one device/tab, see it reflected elsewhere or after reload).

**Expect:** All fully unaffected — this phase is visual/structural only, no data-model or behavioral change.

**Result:** ☐

---

## Finding register (fill in during/after this session)

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| _(none yet — fill in during the session)_ | | | |

## GO/NO-GO decision

**Pending.** Awaiting this session.

## Production promotion

**Not applicable to this phase.** Per the Product Owner's own decision (`V147`), Phase 1 accumulates on `qa` only; Production promotion happens once, after Phase 3's own GO.
