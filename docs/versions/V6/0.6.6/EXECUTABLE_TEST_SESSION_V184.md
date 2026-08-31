# Family Trips Alpha 0.6.6 — Executable Acceptance Test Session

**Document revision:** `V1` (session number `V184`, continuing the project's session-numbering sequence from `V169`/`0.6.5`)
**Candidate:** `0.6.6`, installed on `version/V6`, deployed to the fixed `qa` alias
**Instructions:** Run one test at a time, in order. Record the actual observed result under each test, not just PASS/FAIL — a finding is only useful with what you actually saw. Findings are recorded immediately with target `TBD after acceptance completion`, per `VERSION_PACKAGE_AUTHORING_STANDARD_V29.md`; do not assign a finding to a version until the whole session is complete.

---

## Part 1 — Attraction/Event Smart Import benchmark (`benchmark_AE/AE-001`–`AE-007`)

For each test: use the global **+** → Document (or the matching Attraction item's Attach-and-extract), upload the named file, confirm **Analyze and propose item**, and compare the resulting proposal against the expected values below — every field in "Expect", plus: is the title meaningful (not a filename/generic word)? Is any warning shown accurate and not misleading? Is any expected `needs_review` flag actually present where the discovery document calls for one?

### Test 1 — `AE-001_FCB679102D6E6915.pdf` (MANDATORY WILD-CARD)

This is the required non-canonical wild-card test per the standard's mandatory-wild-card rule — run it as its own numbered test, not folded into general notes.

**Expect:** Title "FC Barcelona - Girona FC"; location "Estadi Olímpic Lluís Companys" (not "Barcelona"); date/time 30/03/2025 16:15; confirmation number `FCB679102D6E6915`; **two** participants (Eyal Ben Yitzchak Ben Yitzchak, Amit Ben Yitzhak), each with their own seat/gate/row/section evidence; price ≈€149.00 + €3.50 service fee per ticket, shown as two separate figures, not collapsed into one.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 2 — `AE-002_order1955108.pdf`

**Expect:** Title "Experience Park - Red band"; location "אמפי ואהל (Amphi Wahl)"; date/time 31/03/2021 20:00 (a past date — must be shown exactly as printed, not corrected); confirmation number `1955108`; one participant; **no price field shown at all** — must not display €0 or ₪0, must simply have no amount.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 3 — `AE-003_SmarTicket_eticket_...6868cd6cad9f9.pdf`

**Expect:** Title "כניסה למוזיאון"; location "Bloomfield Science Museum Jerusalem"; date/time 05/07/2025 10:00; three ticket numbers `2133782`, `2133783`, `2133785` — confirm `2133784` does **not** appear anywhere; one participant (אייל בן יצחק), not three identical entries; no price shown (free).

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 4 — `AE-004_SmarTicket_eticket_...6868cfab5aa01.pdf` (companion-pair verification)

Run this test **after** Test 3's proposal has been approved into an item.

**Expect on the proposal itself:** Title "פילים – סיפורה של ליטלפוט" (a distinct show, not merged with Test 3's museum entrance); location "...Auditorium"; date/time 05/07/2025 13:00; three ticket numbers `2133855`/`2133856`/`2133857` with seats Row 5 Seat 11/10/9; price ₪5 each.

**Expect on approval:** because this shares the same provider and calendar date as the item you approved from Test 3, the app should show the **duplicate/companion dialog** (not silently create a disconnected second item, and not silently merge it into the Test 3 item). Choose **"Keep both"** (שמירת שניהם). Confirm the result is two separate items — the museum entrance and the auditorium show — both visible in Trip Center, not one item with the wrong combined data and not two unrelated-looking items with no indication they're the same visit.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 5 — `AE-005_Tickets.pdf`

**Expect:** Title "ניווט ביער גמזו" (the page's own "- tickets sold out" suffix must **not** appear in the title); location "גמזו... מודיעין מכבים רעות" (a plus-code/area description, not a fabricated street address); date/time 17/01/2026 08:30; confirmation/order number `2ZTN-G53R-GJ8` and a **separate** ticket number `2ZTN-G53R-GJ81P` — confirm these two near-identical strings are shown as genuinely different values, not merged into one; price ₪120.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 6 — `AE-006_1713265782549_entryTickets_1.pdf`

**Expect:** Title referencing the day-park entry (not "zoo" — this is WaterLand); location "WaterLand" only (no fabricated address); date 24/04/2024 with **no time** shown as meaningful (a date-only value, not implying a specific hour); **zero named participants** (confirm the form does not show three fake names) with four ticket numbers `623000111`–`623000114` still individually visible; no price shown (charge field was blank in the source) — the ₪20 deposit note, if shown, must read as a deposit, not as the ticket price.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 7 — `AE-007_zoo_ticket_screenshot.png` (image-format case)

Upload as an image (not PDF) — via gallery/file selection of the PNG.

**Expect:** Title referencing the zoo entry 2020; **exactly one** named participant (בן יצחק אייל), with a note or field showing the total party size is 3 (not three fabricated names); confirmation/transaction number `1713809`; **price shown as ₪0.00** (an explicit zero, distinguishable from Tests 2/3/6's simply-absent price — check the field actually shows "0", not blank); the club-voucher eligibility/access-requirement note visible somewhere on the proposal.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Part 2 — URL acquisition sub-scope

### Test 8 — Official venue/museum/OTA URL (the one still-open verification step)

**This is the single most important test in this session.** No official venue/museum/OTA URL has been tested end-to-end through this pipeline at any point before now — everything tested during discovery was a ticket-resale platform (the side expected to fail). Use the global **+** → Link, and enter a real official venue/museum/OTA ticket or booking page URL (a museum's own site, or an OTA like Klook/GetYourGuide/Viator with a real listing).

**Expect:** the page is fetched and produces a real proposal (or, if it turns out to be genuinely login-gated or otherwise blocked, a clear `access_required`/`robots_disallowed` state — but confirm which one, and confirm it is NOT silently treated as success with blank/wrong fields).

**Result:** ☐ PASS ☐ FAIL ☐ Blocked — no URL available — notes: ___________

### Test 9 — Ticket-resale platform URL (expected safe-fail)

Use a real Ticketmaster / vivenu / tickets.hapoelbc.com / tickets.leaan.net ticket URL if you have one on hand (from your own inbox, matching the discovery document's pre-implementation research).

**Expect:** the import fails safely with a clear message distinguishing *why* — most likely "האתר חוסם גישה אוטומטית לדף זה (robots.txt)" (robots-blocked) based on the 4/4 pre-implementation evidence, though a login wall (`access_required`) is also an acceptable, correctly-labelled outcome. This is expected behavior, not a defect, **unless** the failure message is wrong/misleading or the app does something worse (crash, blank proposal presented as real data).

**Result:** ☐ PASS ☐ FAIL ☐ Skipped — no URL available — notes: ___________

---

## Part 3 — `V6-F49` / `V6-F50` / `V6-F51` (folded-in `0.6.5` Production findings)

### Test 10 — `V6-F49`: a needs-review warning clears on edit; an unresolved-sourced one offers Dismiss

Find or produce a Hotel/Activity proposal with a needs-review warning tied to a specific field (e.g. an ambiguous date). Edit that field to a corrected value and save the edit.

**Expect:** the warning tied to that field disappears. Separately, if any warning is shown with a "התעלמות" (dismiss) button next to it, click it and confirm it disappears immediately and does not reappear on refresh.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

### Test 11 — `V6-F50`: a date the model explains only in free text still reaches the date field

If you have (or can produce) a source where the model's evidence panel shows a resolved-but-uncertain date only in prose form, confirm the actual date field is populated (marked needs-review), not blank.

**Result:** ☐ PASS ☐ FAIL ☐ Not reproduced this session — notes: ___________

### Test 12 — `V6-F51`: review screen pre-fills the Trip start date

Import any new Hotel/Flight/Activity source whose date is genuinely absent from the source (or use Save-only then a later blank-date scenario). Open the resulting suggestion for review before approving.

**Expect:** the date field shows the Trip's start date pre-filled, not empty — and remains freely editable before you approve.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Part 4 — Short regression

### Test 13 — Hotel and Flight Smart Import still work

Run one Hotel import and one Flight import (real sources, or the existing QA benchmark files) to confirm nothing in this candidate's shared-code changes (`ingestion.js`, `smart-import-adapter.js`, `smart-import-schema.mjs`, `v5-app.js`) regressed either prior vertical.

**Result:** ☐ PASS ☐ FAIL — notes: ___________

---

## Session close

- [ ] Every finding above recorded with an explicit target/disposition (not left `TBD`).
- [ ] GO / NO-GO decision recorded, with rationale.
- [ ] If GO: this document's revision is finalized and referenced from `MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md`'s next change-history row, alongside the actual Production-deploy decision (a separate, explicit action).
