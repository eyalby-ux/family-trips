QA acceptance testing 0.6.6 build — a possible fabrication found while testing `AE-007` (Attraction/Event Smart Import benchmark, zoo ticket screenshot). Investigate root cause — do NOT fix yet, same pattern as the other pending findings this session.

## Why this matters more than a typical field-accuracy check

`AE-007`'s frozen ground truth (`ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md`) is explicit and deliberate on this exact point:

> `provider`: a zoo, printed as "גן החיות" (venue's own precise name is not legible beyond this generic label in the source — **frozen as a real location-precision limitation**, not resolved by assumption; correct behavior is to persist what the source actually shows and flag for review rather than guessing a specific zoo brand name)

This is one of the most pointed anti-fabrication tests in the whole `AE-` benchmark: the source genuinely only contains the generic label "גן החיות" (the zoo), and the correct, frozen behavior is to persist that generic label and flag it for review — NOT to guess a specific real-world zoo brand name, however plausible.

## Observed behavior

On the saved `AE-007` item, both `provider` and `location` show "גן החיות התנ\"כי ירושלים" — i.e. "Jerusalem Biblical Zoo," a specific, real, named venue. This is a specific brand name, not the generic "גן החיות" label the ground truth says is all the source actually contains.

## What to check

1. Look at the actual `AE-007` source file (screenshot `AE-007_zoo_ticket_screenshot.png` / `image.png` per the discovery doc) directly — does the string "גן החיות התנ\"כי ירושלים" (or any recognizable variant/abbreviation of "Jerusalem Biblical Zoo") actually appear anywhere in the source image? Read the image directly rather than relying on the discovery doc's transcription, since this determines everything: if the specific name genuinely is in the source, the discovery doc's ground truth (frozen as "venue's own precise name is not legible") would itself be wrong/stale and needs correcting, not the extraction. If the specific name is NOT in the source, this is a real, textbook case of the model substituting real-world/general knowledge for what the source actually says — a fabrication, and a serious one given this exact failure mode is what this benchmark case exists to guard against.
2. If it is a fabrication: check the extraction system prompt/adapter for the `activity` type — is there guidance that should prevent the model from "filling in" a specific named entity when the source only shows a generic descriptor, and if so why didn't it apply here? Compare against how other cases in the set correctly preserved genuine source limitations (e.g. `AE-002`'s "no price in source" being correctly left absent rather than defaulted to 0) — this shows the discipline exists elsewhere, so find out why this specific class of fabrication (a plausible specific name for a generic source label) isn't caught.
3. Also check, and register separately if wrong: whether `location` correctly reflects whatever `provider`'s correct value turns out to be (they currently show the same string) — the ground truth doesn't explicitly require them to differ, just to each be accurate.

## Known related item — same display gap as other `AE-` cases, no new investigation needed

Also missing from the saved item's display: the named participant (בן יצחק אייל / Eyal Ben Yitzhak) with party-of-3 quantity, the transaction number (`1713809`), and the ₪0.00 amount (explicitly present-and-zero in source, per ground truth — distinct from `AE-002`/`AE-003`/`AE-006` where price is simply absent). These look like the same already-tracked rendering gap covered by `V6-F57` and its follow-up investigation (`claude_code_prompt_v6f56_f57_followup.md`) rather than a new defect — please fold `AE-007` into that same generalization check (does the `ticketHolders`/base-field rendering gap explain all of these too?) rather than opening a separate finding for them. The venue-name question above is the one thing on this case that's NOT part of that pattern and needs its own investigation.

## Registration

Do not fix. If the venue name is confirmed as a fabrication (not present in source), register it as a new finding with the next available finding ID, High severity — this is a direct, on-point failure of a benchmark case specifically designed to test against this exact behavior, and a fabricated venue name is a materially different problem than a merely-missing field. If the source turns out to actually contain the specific name (making the discovery doc's ground truth stale/wrong), report that plainly and note the doc needs a correction rather than the code. Report back with root cause and evidence before any correction package is authored. Fold the "known related item" note above into the existing `V6-F57` follow-up rather than a new finding ID. This does not need to block continuing the rest of `0.6.6` acceptance testing.
