QA acceptance testing 0.6.6 build — small display bug found while testing `AE-002` (Attraction/Event Smart Import benchmark, `order1955108.pdf`, "Experience Park - Red band"). Investigate root cause and register as a finding — do NOT fix yet, same pattern as the other pending findings this session.

## Observed behavior

On the saved `AE-002` item's detail view, the purchaser/orderer field renders as:

"Purchaser: Purchaser: אייל בן יצחק" (i.e. the label "Purchaser:" appears twice before the name, instead of once).

Screenshot context: this is directly under the date/time field in the detail view, on the line that should read something like "Purchaser: אייל בן יצחק" (or its Hebrew-localized equivalent, consistent with every other label on the page which is in Hebrew — e.g. `ספק:`, `מספר הזמנה:`, `מיקום:`, `מועד:`). Worth noting separately: every other field label on this page is in Hebrew, but this one field's label ("Purchaser") is in English — that may be a related or separate localization gap, please check both.

## What to check

1. Find the template/component responsible for rendering the `activity` item detail view's participant/orderer/purchaser field, and identify why the label is being emitted twice — e.g. a literal string concatenation bug, a field label being prepended by both a generic wrapper and the field-specific renderer, or a leftover debug/placeholder string ("Purchaser" as a hardcoded default that didn't get replaced).
2. Check whether this duplicate-label bug is specific to the `activity` type's purchaser/participant field, or a more general pattern that could affect other item types' fields too (worth a quick grep for the literal string "Purchaser" in the relevant rendering code).
3. Check the localization gap: why is this one label in English ("Purchaser:") when every sibling label on the same page (`ספק:`, `מספר הזמנה:`, `מיקום:`, `מועד:`) is in Hebrew — is there a missing Hebrew translation key for this specific field, causing a fallback to an English default?

## Registration

Do not fix. Register as a new finding with the next available finding ID in the standard's mandatory finding register format — observed behavior, expected behavior (single, correctly Hebrew-localized label), root cause, and proposed fix approach. This is cosmetic/low severity (display-only, doesn't affect stored data), but report it precisely rather than assuming scope.
