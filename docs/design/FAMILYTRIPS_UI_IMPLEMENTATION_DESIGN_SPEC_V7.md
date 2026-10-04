# FamilyTrips — UI Implementation Design Spec

**Version:** V7  
**Purpose:** Visual source of truth for an LLM or developer. Written in English for implementation reliability — this is a work order the model must follow precisely, and English reduces ambiguity in rule-following compared to Hebrew instructional prose. This version replaces V6. Quoted interface strings remain in Hebrew (the product's actual UI copy, per §1), each followed by an English gloss in parentheses for human readers only.  
**Scope:** Design, components, and interface behavior only; no data model or architecture should be inferred from this document.

## 1. Binding principle

Mobile-first interface, Hebrew and full RTL, clean, warm, and quiet. This is an operational family tool used during a trip. Information and the next action take precedence over decoration.

- No gradients, illustrated characters, wavy lines, stickers, or large illustrations. Exactly **two** narrowly-scoped exceptions exist to this rule, and neither is precedent for adding a third: the destination image at the top of Today (§4), and the single small, motion-only vacation icon used for the Smart Import Processing state — a swaying palm, defined precisely in §7. Any future request for a themed or decorative element anywhere else in the app requires its own separately justified exception; it does not follow automatically from either of these two.
- No more than one accent color per content area. `--accent-soft` counts as the same accent as `--accent` for this rule (see the soft-tone mapping in §2.1); `--teal-soft` is the only additional soft tone allowed to appear alongside it in the same area.
- No large cards that don't represent an imminent action.
- UI copy is in Hebrew; provider and place names may remain in their source language, subject to the bidi rules in §3.

## 2. Tokens

| Role | Token | Value |
| --- | --- | --- |
| Background | `--bg` | `#FCFAF7` |
| Surface | `--surface` | `#FFFFFF` |
| Primary text / action | `--ink` | `#123F42` |
| Secondary text | `--muted` | `#726B66` |
| Border | `--border` | `#E7E1DA` |
| Accent | `--accent` | `#C86442` |
| Soft accent | `--accent-soft` | `#F9ECE7` |
| Soft selection | `--teal-soft` | `#E8F3F1` |

`--muted` was updated from `#79726D` to `#726B66`: the previous value measured ~4.54:1 against `--bg` — technically above the §9 target but with almost no margin (0.04 over the line). The new value measures ~5.0:1 against `--bg` and ~5.2:1 against `--surface`, verified with a WCAG relative-luminance script. Re-verify with a contrast tool whenever a token changes. The warm-gray character of the color is preserved.

### 2.1 Soft-tone mapping

- `--accent-soft`: background for the "needs attention" state only (§4), and — per §7's Smart Import processing states — for exactly one Smart Import status, `needs review`, and no other. Text and icon on it are always `--ink` (~10:1 contrast), never `--accent`.
- `--teal-soft`: background for selection/active states unrelated to urgency — e.g. a selected day in a calendar, or an alternate highlighted state on a screen that isn't a day card. Not used for the urgency hierarchy, and never combined with `--accent-soft`.
- Both soft tokens may appear alongside `--accent` in the same content area; neither counts as a second accent color under the rule in §1.
- `--accent-soft` is reserved and must not be spread across multiple simultaneous states in the same list or screen (e.g. giving both a `processing` and a `needs review` row the same soft fill) — doing so dilutes it into background noise and defeats its purpose as the one color that means "look here."

### Typography and spacing

- Font: Heebo; fallback `Arial, sans-serif`. `dir="rtl"`, right-aligned.
- Screen title: 34px/700, line-height 1.3. Section title: 22px/600, line-height 1.3. Item title: 20px/600, line-height 1.35. Body: 16px/400, line-height 1.5. Metadata: 15px/400, line-height 1.4. Line-heights run slightly larger than Latin-only defaults, to give Hebrew — and mixed bidi runs — comfortable room.
- Screen side margin: 20px. Gap between cards: 12px. Card radius: 16px. Button radius: 12px. Border: 1px `--border`. Shadow: `0 2px 10px rgba(28,35,36,.04)` only.

## 3. Navigation, actions, and RTL

- Fixed bottom nav: "היום" (Today), "ציר הזמן" (Timeline), central `+`, "מרכז הטיול" (Trip Center), "אריזה" (Packing). **Games and activities are reached through "מרכז הטיול" (Trip Center) as a category and do not get a separate bottom-nav item** — this is no longer an open decision; see §11.
- `+` is a 56px circle in `--ink` with a white plus; never in terracotta.
- Line icons, 18–24px, with a visible label, from **Tabler Icons, outline weight only** (no "filled" variants). Do not mix icon libraries on the same screen. Tap target: at least 44×44px.
- Short contextual actions only: "ניווט" (Navigate), "אתר" (Website), "כרטיסים" (Tickets). Full context appears in the title and item detail, not on the button.
- Short, quiet animations: 160–220ms `ease-out`; no bounce or showy effect. A continuous, looping indicator (the processing dots and hairline in §7) is the one allowed exception to "short" — it repeats within this same easing and speed per cycle rather than running once, because it signals an operation that is still in progress.
- **Pressed state:** every tappable card, button, and chip gives immediate feedback — a slight background shift toward `--border`, or a subtle scale-down to 98%, within the animation range above. No color change outside the defined tokens.
- **Focus state** (keyboard / switch control): a visible 2px focus ring in `--ink`, offset 2px from the element's edge, on every tappable element without exception. The focus ring is never hidden or replaced with `outline: none`.
- **Directional icons under RTL:** icons that point "forward" in a flow — back, a game-list entry chevron, timeline/week navigation arrows — mirror under RTL to point left. Icons that aren't reading-direction-dependent — play/pause, QR/barcode, digits, the central plus — stay fixed, unmirrored.
- **Bidi:** Latin text and numbers embedded in a Hebrew sentence — a provider name, a booking code, a time — are always wrapped in `<bdi>` or `unicode-bidi: isolate`, so their visual order doesn't invert inside the Hebrew sentence.

## 4. Today — shared structure

1. "היום" (Today) title and date/destination.
2. Short status, when relevant.
3. Leading action card, when an imminent action exists.
4. "היום בתכנית" (Today's plan) — a chronological list.
5. One single game suggestion, only on a free day, before the bottom nav.

A destination image, if present, appears only at the top of Today. The image area is at most 150–160px tall. A `--bg` layer at **65% opacity** sits over the text region, leaving the image visible at roughly 35% underneath it — an exact, screenshot-checkable value rather than a verbal description. Outside the text region the image is fully visible. Text must remain readable even without the image. This is the sole exception to the "no large illustrations" rule in §1.

### Urgency hierarchy

- **Regular item:** standard white card, no accent color.
- **Imminent action:** the single leading action card; a relative time, or a small terracotta dot only (see the day-item card below).
- **Needs attention:** `--accent-soft` background with icon and label in `--ink` (see §2.1); never red except for an actual failure. Color is never the sole indicator — the state icon itself (e.g. a warning glyph) differs from the item's regular icon.

### Day-item card

- Time on the right, in a 76px-wide area, **always `--ink`, weight 600**. For an imminent action only, a small `--accent` dot (8px) sits beside the time as the sole emphasis cue, with a subtle vertical divider separating the time area from the content. The time text itself never changes color — "imminent action" is signaled by the dot and weight, not by text color (the previous approach, `--accent` text, measured ~3.7–3.9:1 and doesn't meet the 4.5:1 normal-text target in §9).
- Content: name and a short, up-to-two-line description. Tapping the card opens details.
- "ניווט" (Navigate) only with a valid location; "אתר" (Website) only with a valid link; "כרטיסים" (Tickets) only when tickets exist. Compact bordered buttons with icon and label, never icon-only.
- On a calm day, all cards stay compact; the game suggestion is a secondary card with no illustration.

### Busy day

- At the top, **one action card** for the imminent action. It includes relative time, name, an operational detail, and relevant actions.
- The rest of the day is a compact chronological list. No game suggestion.

### Transit or flight day

- The transport/flight card is the leading action card; it shows relative time, route, flight/booking number, and departure time.
- Actions shown by context: "ניווט" (Navigate), "כרטיסים" (Tickets), "אתר" (Website). The card is not styled like a boarding pass.
- Below it, only the relevant remainder of the day — e.g. checkout, drive to the airport, check-in. No game suggestion.

## 5. Participant selection carousel

- For choosing one of 2–6 options. From 7 options on, use compact chips instead (last bullet).
- Each carousel item: **avatar and name only**. No counters, status badges, or secondary info.
- The selected item is centered and at full contrast; neighbors are slightly smaller/faded but their names stay legible. With 3 or more options the carousel is an **endless loop**: exactly one neighbor is visible on each side of the selected item, and the neighbors wrap around (the previous neighbor of the first option is the last one, and the reverse), so it never dead-ends at two visible options. With exactly 2 options there is no loop and no repeats: both are shown. Indicator dots below show the selected option's real position among all options.
- Horizontal drag, tap as an alternative; **one swipe moves exactly one option** (it must never skip past a participant on a fast swipe). **Under RTL, dragging right moves to the next item in display order and dragging left to the previous**, matching reading direction; left/right arrow keys (or sequential Tab) follow the same logic for keyboard navigation. The selected person's details render outside the carousel, below it.
- Do not use a carousel for a long list or multi-select. From 7 options on, show compact chips in **one horizontally scrollable row**: the selected chip in `--ink` with white text, the others white with a `--border` border, no terracotta fill, no wrapping onto several rows, minimum height 44px.

## 6. Games and activities

### Games list

- A compact catalog, not a gallery. Title and horizontal filters: "הכול" (All), "מועדפים" (Favorites), "10 דקות" (10 minutes), "בנסיעה" (On the go), "לכולם" (For everyone).
- Active filter: `--ink` background, white text; others: white background, `--border` border.
- Game item: a small line icon (Tabler, see §3), name, a match/duration description, an entry chevron, and a small star. **Minimum row height is 56px**, so the star's accessible tap target fits comfortably without crowding the rest of the row.
- The star toggles favorite state on an independent tap and does not open the game item; its tap target is at least 44×44px, **with at least 8px of separation from the tap zone that opens the item**, to prevent mis-taps between the two adjacent actions.
- At the end of the Today section, a quiet "כל המשחקים" (All games) link, only when an activity is suggested for a free day.

### Game page

- Every game opens on a uniform page: name, description, match, duration, and a primary action.
- Interactive game: "התחל משחק" (Start game); after starting, "המשך משחק" (Continue game). The game itself runs inside the app.
- Non-interactive activity: instructions on the page, with "התחל פעילות" (Start activity).

## 7. Empty, loading, and offline states

These principles apply to every screen. No illustration or decoration is added to fill an empty screen, per §1 — all three states are built from existing tokens only.

- **Empty state:** a small line icon in `--muted`, a short headline in `--ink` naming the empty space (e.g. "אין תכניות היום" / "Nothing planned today"), one line of explanation in `--muted`, and at most one clear action when relevant.
- **Loading state:** a uniform skeleton in `--border` on a `--surface` background, instead of a spinner, on any screen where content is loading. Subtle pulse, within the animation range in §3.
- **Offline/sync state:** a quiet, persistent top strip (never blocking content), `--accent-soft` background, text and icon in `--ink`, e.g. "אופליין — 2 שינויים ימתינו לסנכרון" (Offline — 2 changes will sync). The strip disappears immediately once sync succeeds; no separate "success" message.

### Smart Import processing states

Smart Import's architecture defines seven processing outcomes for a source: queued, processing, partial, needs review, failed, attached and rejected. This subsection gives each one visual treatment, built once as a single reusable **status pill** component and reused wherever Smart Import surfaces status — the Intake Inbox list, an item's Documents and Tickets area, and the proposal review screen. It does not introduce a parallel visual language: it applies the existing token system (§2), the existing urgency hierarchy (§4) and the loading-state principle above to Smart Import specifically.

A live processing/analyzing indicator was missing entirely in Alpha 0.6.3 acceptance testing (`V6-F11`): the UI gave no sign that analysis was running, and confirming before it finished produced an incorrect "no document selected" error. The states below, and the interaction rule at the end of this subsection, are the fix.

**Status pill, one component, seven states:**

- **Queued** (`ממתין בתור`): `--muted` clock icon and label on a bordered `--bg` chip. No accent — nothing has started yet.
- **Processing** (`מנתח…` / Analyzing…): label and icon in `--ink`, not `--muted`, so it reads as active — but still no `--accent-soft` fill. The leading glyph is a **palm tree swaying in the wind**: trunk fixed, the frond cluster rocking gently left-right (±6°, 2.2s `ease-in-out`, looping), with two small `--accent`-filled coconuts as its only color. This is the app's second and final named exception to §1's "no illustrations" rule — see the boxed limits immediately below; it does not open the door to other vacation motifs elsewhere. Beside the label, a small three-dot pulsing indicator in `--accent` (same visual weight as the day-item's imminent-action dot in §4 — one small accent mark, not a background fill) loops within the 160–220ms `ease-out` range per pulse. Below the pill, a one-line rotating status cross-fades every ~2 seconds between three fixed phrases — "קורא את המסמך" (Reading the document), "מזהה פרטים" (Identifying details), "מכין טיוטה" (Preparing draft) — plus a 2px indeterminate `--accent` hairline. Together these give a sense of forward motion without a fabricated percentage, since measured latency for a full analysis runs up to ~27 seconds.

  > **Exception limits, exactly as follows.** The vacation motif is permitted only as this one swaying-palm glyph, only as the Processing state's leading icon, and nowhere else in the app. It stays at icon scale (≤24px, matching §3's 18–24px icon sizing), drawn in the same single outline stroke weight as every other icon in the system, colored only in `--ink` plus the two `--accent` coconuts described above — no gradient, no shading, no background scene, no second illustrated element, and no swap-in of a different vacation icon (a rolling suitcase was considered and set aside in favor of this one). A different or larger use of a vacation or seasonal motif anywhere else is a new decision, not a natural extension of this one.
- **Partial** (`חלקי`): same neutral bordered `--bg` chip as Queued, `--ink` text. Distinguished from Queued and Processing only by its icon (a half-filled circle) and a `--muted` one-line subtext naming what's missing (e.g. "חלק מהפרטים זוהו במקור"). It does not use `--accent-soft`: per the architecture, a partial draft does not block approval, so it is not a "needs attention" state.
- **Needs review** (`דורש בדיקה`): the **only** Smart Import status that uses `--accent-soft` background with `--ink` icon and label — per §2.1, this token is reserved for exactly this one state among the seven, so it is the one pill that visibly stands out rather than blending in with Processing or Partial. This is the correct mapping: "needs review" is the state that genuinely requires the user to resolve a conflict or ambiguity before the draft can be approved, which is exactly what `--accent-soft` already means elsewhere in this spec (§4's "needs attention").
- **Failed** (`נכשל`): the spec's one additional exception to "never red except for an actual failure" (§4) — a small red icon and label on a matching soft-red chip, plus inline compact bordered actions "נסה שוב" (Retry) and "מחק" (Delete).
- **Attached** (`צורף`): a brief `--ink` checkmark confirmation with no persistent badge afterward — consistent with the offline/sync strip's rule above that a success state is transient, not a permanent label.
- **Rejected** (`נדחה`): `--muted` icon and label, shown only in a secondary/archived list (e.g. a collapsed "נדחו" section in the Inbox), never in the primary Inbox or item view.

**Interaction rule:** while a source's status is Processing, any confirming action on that screen (for example, the proposal review screen's "המשך" / Continue) stays visibly disabled — muted styling, not tappable — and only enables once the draft is ready. It must never be tappable mid-analysis and must never produce a false result such as "no document selected"; if the underlying state is genuinely unknown, the action stays disabled rather than guessing. This is a binding behavioral rule, not only a visual one.

A visual reference for these seven states, built from the tokens above, is available at `https://claude.ai/code/artifact/7d1efac4-c740-47ac-8da8-a3c4e73c21f7`.

## 8. Dark mode

This version (V7) is **light-mode only**, explicitly. Dark mode is not supported, and its absence should not be read as an oversight — it's an open product decision that hasn't been made yet, not a documentation gap. Future dark-mode support will need its own tokens and contrast checks, and will be documented as a new version of this spec.

## 9. Accessibility and visual acceptance testing

- Normal text contrast at least 4.5:1, verified with a contrast tool before locking any new or changed token. Color is never the sole carrier of information.
- A visible focus ring (§3) on every tappable element, for keyboard and switch-control navigation.
- No RTL breakage, clipped text, clipped buttons, or unintended horizontal scroll. No reordering of Latin text/numbers embedded in a Hebrew sentence (§3).
- Before approval: compare screenshots against the spec and verify tokens (including the exact opacity value of the Today image), spacing, radii, actions, the soft-tone mapping (§2.1), the absence of decoration, the urgency hierarchy, the Today structure, and the empty/loading/offline states (§7), including the Smart Import processing states and the Processing-state interaction rule.

## 10. Work order for the implementing model

> Implement per `FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md`. Preserve full RTL, the tokens, the soft-tone mapping, the components, and the information hierarchy. Do not add illustrations, gradients, new colors, or navigation patterns that aren't defined here — the two named exceptions in §1 are exact and do not generalize. When uncertain, choose the quieter, more compact, less decorative option. All UI copy renders in Hebrew exactly as quoted above; English glosses in this document are for human reference only and must never be rendered in the app.

## 11. Change history

| Version | Date | Change |
| --- | --- | --- |
| V2 | 2026-08-13 | Unified version replacing V1: added Today states, participant carousel, games screen, favorites filter, list star, and game/activity pages. |
| V3 | 2026-08-14 | Clarified and capped the Today image at 160px; added a three-level urgency hierarchy; shortened actions to "Navigate"/"Website"/"Tickets"; added an accessible tap target for the star. The main entry point for games remained an open decision. |
| V4 | 2026-08-18 | Fixed all gaps raised in design review: imminent-action time moved from `--accent` text to `--ink` text with a separate `--accent` dot (accent text measured ~3.7–3.9:1, below the 4.5:1 target); `--muted` darkened from `#79726D` to `#726B66` for safer contrast on `--bg` and `--surface`; `--accent-soft` and `--teal-soft` explicitly mapped to the "needs attention" and selection states respectively (§2.1); added bidi rules (`bdi`/`isolate`) and RTL icon mirroring; added an RTL drag rule and keyboard alternative for the carousel; named the icon library (Tabler, outline); added pressed and focus states; added the empty/loading/offline states section; added the dark-mode section with an explicit light-mode-only deferral; resolved the games entry point into "Trip Center," no longer an open decision; increased the games-list row height to 56px with at least 8px between the star's and row's tap zones; replaced the Today image's verbal opacity ("~35%") with an exact value (65% `--bg` overlay); clarified that the Today image is the sole exception to "no large illustrations"; added line-heights to every type scale level. |
| V5 | 2026-08-19 | Rewrote the spec in English. This document is a work order for an LLM/developer to implement precisely, and English reduces ambiguity in rule-following compared to Hebrew instructional prose; it also brings this document in line with the rest of the project's English-language controlled documents. Quoted interface strings remain Hebrew, since the product's UI copy is Hebrew per §1, each with an English gloss in parentheses for human readers. No token, measurement, or behavioral rule changed from V4 — this is a language change only, not a content change. |
| V6 | 2026-08-24 | Added the "Smart Import processing states" subsection under §7: one reusable status-pill component for the architecture's seven processing outcomes (queued, processing, partial, needs review, failed, attached, rejected), reused across the Intake Inbox, item-owned Documents and Tickets areas, and the proposal review screen. No new tokens: `--accent-soft` is explicitly reserved for exactly one state (`needs review`) so it stays a distinct, noticeable signal rather than being spread across multiple simultaneous states; Processing uses a small `--accent` dot indicator plus a rotating status line and indeterminate hairline instead of a soft fill; Failed remains the spec's one other permitted red usage. Added a binding interaction rule that the confirming action on a screen must stay disabled and never return a false result while the underlying source is still Processing — the direct design-level fix for acceptance finding `V6-F11` (no processing indicator shown; a premature confirm produced an incorrect "no document selected" error). Updated §1's soft-tone note, §2.1, and §3's animation rule to reference the reserved-token rule and the one allowed continuous-loop animation exception. |
| V7 | 2026-08-25 | Product Owner requested a vacation-themed motion icon for the Processing state (a rolling suitcase or a swaying palm were both sketched); chose the swaying palm. §7's Processing bullet now specifies it as the state's leading glyph — trunk fixed, frond cluster rocking ±6° over 2.2s, two `--accent` coconuts as its only color, ≤24px, single outline stroke, no other color or illustrated element. Named this explicitly in §1 as the app's **second and final** exception to "no illustrations," alongside the existing Today-image exception, with the same "does not generalize" guardrail. A visual reference (rolling-suitcase alternative included for the record) is at the same artifact link named in §7. |
| V7.1 | 2026-10-04 | Beta 0.8 Phase 1 correction package (`0.8.0-phase1.1`), Product Owner decisions after the Phase 1 acceptance session: §3 Timeline nav label "לו״ז" → "ציר הזמן" (`F8`); §5 carousel is an endless loop with one neighbor each side at 3+ options, exactly one option per swipe, dots show real position (`F15`, `F16`); §5 boundary "2–5" → "2–6" options, with compact one-row chips from 7 (`F18`). Applied in the repository copy; the planning project's copy needs the same three edits. |
