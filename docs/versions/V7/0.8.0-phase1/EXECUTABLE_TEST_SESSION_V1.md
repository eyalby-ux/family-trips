# Family Trips Beta 0.8 Phase 1 (Foundation) — Executable Acceptance Test Session

**Document revision:** `V1`
**Candidate:** `0.8.0-phase1` (Beta 0.8 Phase 1 — Foundation: design tokens, 5-item nav + RTL/bidi, Today's leading/rest structure, participant selection carousel), per `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md` §2–§5 and `FAMILY_TRIPS_BETA_0_8_SCOPE_V1.md`'s own Phase 1 acceptance criteria, installed on `version/V7`, deployed to the fixed `qa` alias (build `0.8.0-phase1-82df5a8a`, `https://qa--familytripz.netlify.app`)
**Session number:** `V1`. Partially run: the Product Owner signed into the `familytriptzs@gmail.com` QA account in the Development Agent's own browser pane, which let the agent spot-check most of this session live (real screenshots, real computed CSS, real clicks) rather than by source-inspection alone. Results below marked "Development Agent spot-check" are that pass, not the Product Owner's own final sign-off — the Product Owner should still re-check anything they want to see themselves, and the tests marked unverified genuinely need the Product Owner's own session (see each one's own note).
**Instructions:** Run one test at a time, in order. Per §9's own instruction, compare screenshots against the spec as you go — this is a visual/interaction candidate, not a behavioral one, so a screenshot check catches what a functional click-through alone would miss. Record the actual observed result under each test, not just PASS/FAIL.

## What this candidate is, worth restating before testing

This phase is visual and structural only — no data model or backend change. It is **not** promoted to Production on its own, per your own decision recorded at `V147`: Beta 0.8's three phases are pieces of one visual system, not independent features, so all three accumulate on `qa` and only Phase 3's own GO promotes anything. This session's job is to accept (or send back) Phase 1 on `qa`, not to sign off on the whole redesign yet.

**Not reachable from the Development Agent's own environment:** the built-in browser tool used during implementation has no real Google account, so it could only verify the sign-in screen and a hand-built CSS rig (computed styles: token values, nav grid columns, the day-item-time column width, the plus circle's size/color, the needs-attention background, carousel scroll-snap — all confirmed to match the spec exactly). Every test below that requires being signed into a real Trip is genuinely unverified past that point, and needs this session to close the gap.

**Also worth knowing going in — a decision made, not asked, during implementation:** the spec's own 5-item nav (§3) has no Settings slot. Settings was relocated to a new gear-icon button in the always-visible account bar (top of every screen), rather than left unreachable or added as a 6th nav item the spec doesn't call for. Test 10 below checks this.

## Test 1 — Tokens, typography, and spacing

Open any screen with a mix of cards, buttons, and text (Today is fine). Compare against §2's table.

**Expect:** Background `#FCFAF7`, card surfaces `#FFFFFF`, primary text/ink `#123F42`, secondary/muted text `#726B66` (not the old `#79726D`), borders `#E7E1DA`, the terracotta accent `#C86442` used sparingly (never more than one accent per content area). Card radius 16px, button radius 12px, 20px screen side margin, 12px gap between cards, the specified soft shadow only. Screen title 34px/700, section title 22px/600, item title 20px/600, body 16px, metadata 15px. Font is Heebo (check a Hebrew heading renders in it, not the system default).

**Result:** ☑ PASS — Development Agent spot-check, real QA Trip. Confirmed via live computed styles: `--bg` `#FCFAF7` (body background), `--ink` `#123F42`, card radius 16px, Heebo font family active on `body`. Visually confirmed on Today/Packing/Settings: card look, spacing, and accent usage all match. Not independently re-checked pixel-by-pixel against every size in §2's table (e.g. exact metadata/body font sizes) — worth a real look in the Product Owner's own pass.

## Test 2 — Bottom nav: 5 items, central +, tap targets, icons

Look at the bottom nav on any screen.

**Expect:** Exactly 5 items — Today, Timeline, a central `+`, Trip Center, Packing. The `+` is a 56px circle in `--ink` (dark teal, `#123F42`) with a white plus, never terracotta. All icons are plain outline-style line icons (no filled/mixed styles), each with a visible label. Every nav button feels at least 44×44px to tap. Tapping `+` opens the same "add" intake modal the old floating button used to.

**Result:** ☑ PASS, after one real bug found and fixed live — Development Agent spot-check. Initial state: the `+` icon rendered in muted gray, nearly invisible against the dark circle (a CSS specificity bug — `.nav button svg{stroke:currentColor}` beat the intended `.nav-plus-circle svg{stroke:#fff}` rule). Fixed (`color:#fff` on `.nav-plus` itself), redeployed, re-verified live: icon now pure white (`rgb(255,255,255)`). All 5 items confirmed present (Today/Timeline/+/Trip Center/Packing), nav buttons computed `min-height:44px`, `+` circle computed 56×56px background `#123F42`. Tapping `+` opened the intake modal correctly.

## Test 3 — RTL, bidi, and directional icons

Browse a few screens with Latin/numeric content mixed into Hebrew text — an item's time, a provider name, a confirmation number, an airport code.

**Expect:** The whole app reads right-to-left as before. Latin text and numbers embedded in a Hebrew sentence never invert or reorder (a flight time like "14:20" or a code like "NRT" reads left-to-right in place, not reversed). If you can compare a back/chevron-style icon, it should point left under RTL; something like a play/pause icon or the central `+` should NOT flip.

**Result:** ☑ PASS (partial) — Development Agent spot-check. `dir="rtl"` confirmed on the document; Hebrew text, dates, and times (e.g. "12:00", "1 באוק׳") render left-to-right in place inside the Hebrew layout, no inversion observed anywhere browsed. Did not have a real directional (back/chevron) icon to compare against in this session's screens — the nav's own icons are deliberately non-directional (home/timeline/folder/suitcase), so this specific mirroring behavior is still only verified at the CSS-rule level (`html[dir="rtl"] .icon-directional{transform:scaleX(-1)}`), not against a real mirrored icon on screen. Worth checking on a screen that has one (e.g. a back chevron, if any exists elsewhere in the app).

## Test 4 — Pressed and focus states

Tap a few different elements (a nav button, a card, a button) and hold briefly if your device shows the pressed state; separately, if you have a keyboard or switch control handy, Tab through a screen.

**Expect:** A visible pressed feedback (a slight background shift or scale-down) on tap, quick and not bouncy. A clear 2px dark ring around whatever has keyboard focus, never invisible/suppressed.

**Result:** ☑ PASS — Development Agent spot-check, Settings screen. Tabbed to a real input field: computed `outline: rgb(18,63,66) solid 2px`, `outline-offset: 2px` — exactly `--ink`, 2px, 2px offset, never suppressed. Pressed-state (background shift) not independently re-verified live with a real tap-and-hold in this session, only via computed CSS rules before this session; low risk (a simple, broadly-applied background-color transition).

## Test 5 — Today: a calm/free day

Find or set up a day with nothing urgent happening (or navigate to a day/state with no upcoming item today).

**Expect:** No leading action card at the top. Today's plan (if anything is listed) shows as plain, compact cards — no accent color, no emphasis dot. If any games are set up for the Trip, exactly one game suggestion appears as a quiet secondary card near the bottom, above the nav, with no illustration.

**Result:** ☑ PASS, after one real bug found and fixed live — Development Agent spot-check. The real QA Trip has no items dated on the actual current day, so Today initially showed a genuinely far-out item ("Platinum Fashion Mall", Oct 1) as if it were an urgent leading action, and its time area showed the time twice ("1 באוק', 12:00" then "12:00" again), cramped in the narrow time column. Root cause: `leading` was being picked from the same list used for the pre-existing "what's coming up next" fallback, not scoped to today's own items. Fixed (leading now only ever comes from items genuinely dated today) and redeployed. Re-verified live: the far-out item now shows as a plain row with no false urgency, and the calm-day game suggestion ("20 שאלות") correctly appeared underneath it, exactly matching this test's own expectation.

## Test 6 — Today: a busy day (non-transit imminent item)

Find or set up a day with an upcoming item today that is NOT a flight or a rental car (e.g. an activity, hotel check-in, or insurance reminder).

**Expect:** One leading action card at the top, showing a relative time ("בעוד X דקות/שעות"), the item's name, and an operational detail line (provider or location). Below it, the rest of today's items as a compact list — the leading item itself does not also appear a second time in that list. No game suggestion anywhere on this screen.

**Result:** ☐ Not completed in this session — genuinely needs the Product Owner. The QA Trip's own date range (Oct 1 – Nov 1, 2026) doesn't include the real current date (Sept 29), so no item can be both "today" and inside the Trip's range; creating a same-day test item triggers the app's own pre-existing "date outside Trip range — save anyway?" confirmation, and the Development Agent's browser tool auto-declines native confirm dialogs (a tool limitation, not an app bug). This case IS covered by a code-level regression test and by the exact same `dayItemCard()` rendering already confirmed live in Test 8 below (just with `leading` rendering skipped) — but the leading-card path itself still needs a real look. Easiest path: either test this once the Trip is actually underway (a real today-dated item will exist), or the Product Owner creates a same-day test item directly (they can accept their own browser's real confirm dialog) and looks at it here.

## Test 7 — Today: a transit/flight day

Find or set up a day with an upcoming Flight or rental-car item.

**Expect:** The transport/flight item is the leading action card, showing relative time, route/location, and its confirmation number if it has one — not styled like a boarding pass. Below it, only the rest of the day (e.g. checkout, drive to the airport). No game suggestion.

**Result:** ☐ Not completed in this session — same blocker as Test 6 above (no same-day item possible within the Trip's own date range without a real confirm dialog). A test Flight item (`LY999`, `TLV`) was drafted with today's date to check this but the save was correctly blocked by the same guard.

## Test 8 — Day-item card: time, urgency dot, and contextual actions

On the leading action card and on at least one regular (non-leading) day item, look closely at the time area and the action buttons.

**Expect:** The time is always dark ink-colored text, never a color change to signal urgency — only the leading card gets a small terracotta dot beside its time. `ניווט` (Navigate) only appears when the item has a real location; `אתר` (Website) only with a real link; `כרטיסים` (Tickets) only when a linked document has actually been confirmed as ticket coverage for that item. None of these are icon-only — each has a visible label.

**Result:** ☑ PASS (regular/non-leading card only) — Development Agent spot-check. "Platinum Fashion Mall" (a real item, has a location and a website, no linked ticket document): time area showed `12:00` once, in dark text, no dot (correct — it's not a leading card). Both `🧭 ניווט` and `🌐 אתר` appeared with visible labels, no `🎫 כרטיסים` (correct, no confirmed ticket document exists for it). The leading-card variant (the dot + relative-time label) is not independently confirmed against a real leading item in this session — see Test 6/7's own note — but was confirmed earlier against a hand-built CSS rig with the exact same markup/classes.

## Test 9 — Needs-attention state

Find or create an item whose date falls outside the Trip's own date range (the existing "מחוץ לטווח" condition) so it shows up as a day-item card.

**Expect:** A soft warm background (not white, not red), with a distinct warning icon next to the item's name — not just a background-color change with the same icon as a regular item.

**Result:** ☐ Not independently confirmed against a real Today row in this session (no item both "today" and out-of-Trip-range was available/creatable, same blocker as Test 6/7). Confirmed at the CSS level: a hand-built `.day-item.needs-attention` element computed `background-color: rgb(249,236,231)` (`--accent-soft`) exactly, with the warning icon (`.urgency-icon-attention`) rendered inline before the item name — but not seen live against a real item.

## Test 10 — Settings relocation to the account bar

Look at the top of any screen (the account bar) and tap the new gear icon there.

**Expect:** A gear-icon button sits in the account bar, always visible, separate from the person/sign-out area. Tapping it opens Settings, the same screen the old nav's Settings tab used to reach. Settings is not reachable from the bottom nav anymore (only 5 items, per Test 2).

**Result:** ☑ PASS — Development Agent spot-check. Gear icon visible in the account bar next to the person's name; tapping it opened "הגדרות הטיול" (Trip Settings) correctly. The bottom nav remained visible with all 5 items, none marked active (correct — Settings has no nav slot).

## Test 11 — Participant selection carousel (Packing)

Open Packing on a Trip with 2–5 active participants.

**Expect:** Instead of (or replacing) the old row of plain buttons, a horizontally-scrollable carousel shows each participant (plus "משותף"/shared) as an avatar + name, with the selected one centered and at full size/contrast, and neighbors slightly smaller/faded but still legible. Small indicator dots below show your position. Dragging/swiping snaps between options; tapping a neighbor also selects it and re-centers. If you have a keyboard, try the left/right arrow keys while a carousel item is focused — they should also step through the options.

**Result:** ☑ PASS — Development Agent spot-check, real 3-option carousel (משותף + 2 participants). Confirmed live: selected item computed `opacity:1`, `transform:scale(1)`; a neighbor computed `opacity:0.5`, `scale(0.88)`; avatar background `rgb(232,243,241)` (`--teal-soft`); indicator dots present. Tap-to-select not independently re-tested by clicking a neighbor in this session (the initial selection/centering was confirmed correct on load). Drag-with-snap and the arrow-key alternative rely on native browser scroll-snap and a keydown delegate respectively — not separately exercised live here, only confirmed at the code/CSS level.

## Test 12 — Participant carousel: falls back for a long list

If the Trip has more than 5 active participants (or add test participants to reach 6+), open Packing again.

**Expect:** The carousel is NOT used here — the original plain row-of-buttons switcher appears instead, per the spec's own "don't use a carousel for a long list" rule.

**Result:** ☐ Not tested live in this session (would need adding 3+ more participants to the real QA Trip to reach 6+, which felt like more data mutation than this spot-check pass warranted). Confirmed at the code level: `packingView()` only calls `participantCarousel()` when the option count is ≤5, falling back to the original flat switcher otherwise.

## Test 13 — General regression: nothing else broke

Spot-check outside this phase's own scope: create or edit an item normally, run a Smart Import against a real document/URL, confirm sync still works (edit on one device/tab, see it reflected elsewhere or after reload).

**Expect:** All fully unaffected — this phase is visual/structural only, no data-model or behavioral change.

**Result:** ☑ PASS (partial) — Development Agent spot-check. Item detail view (Platinum Fashion Mall) opened and rendered correctly — unaffected, and correctly still using its pre-Phase-1 look (item detail redesign is Phase 2 scope, not this phase's). Packing's checkbox rows, edit/delete buttons, and category collapse all worked normally. Did not run a real Smart Import or a genuine cross-device sync check in this session — those still need a real pass.

---

## Finding register

| Finding | Test | Severity | Disposition |
|---|---|---|---|
| The nav's central `+` icon rendered in muted gray (`--muted`), not white — a CSS specificity conflict (`.nav button svg{stroke:currentColor}` beat the intended `.nav-plus-circle svg{stroke:#fff}`). | Test 2 | Blocking — visual bug, spec violation | **Fixed** live during this session (commit `187e962`), redeployed to `qa`, re-verified. |
| Today's leading action card could show an item several days away as if it were an urgent, happening-now action (picked from the same list as the pre-existing "what's coming up next" fallback, not scoped to items actually dated today) — and its time area duplicated the time text in that case. | Tests 5/6/7 | Blocking — real logic bug, misleading urgency signal | **Fixed** live during this session (commit `82df5a8`), redeployed to `qa`, re-verified against the real QA Trip (now correctly shows the calm-day case). |
| Tests 6, 7, 9, and 12 could not be completed live in this session — the QA Trip's own date range doesn't cover the real current date, so no same-day test item can be created without a native browser confirm dialog the Development Agent's tool can't accept; the >5-participant carousel fallback wasn't tested live to avoid unnecessary data mutation on the shared QA Trip. | Tests 6, 7, 9, 12 | Non-blocking for this record, but genuinely unverified — needs the Product Owner's own pass | Logged 2026-09-29. Each covered by a code-level regression test and (for 6/7/9) by the same `dayItemCard()` rendering already confirmed live in Test 8, just not the `leading`/`needs-attention` variants specifically. |

## GO/NO-GO decision

**Pending.** Most of this session was spot-checked live by the Development Agent (see results above) with the Product Owner's real QA account, catching and fixing two real bugs along the way. Four items (Tests 6, 7, 9, 12) still need a direct look from the Product Owner before a GO/NO-GO call — see the finding register.

## Production promotion

**Not applicable to this phase.** Per the Product Owner's own decision (`V147`), Phase 1 accumulates on `qa` only; Production promotion happens once, after Phase 3's own GO.
