# Stage 7 - Link Quality & Duplicate Guards (December 2025)

## What I added
- New setting: `skipAlreadyLinked` (default: on).
- Write commands now detect existing `[[wikilinks]]` in a note and avoid re-adding those targets.
- Active-note write flow now reports how many existing links were skipped.
- Apply-all summary now includes `skipped-existing` counts for clearer run feedback.

## Safety and quality impact
- Reduces redundant links and noisy "Related" sections.
- Keeps write operations cleaner in notes that already have manual links.
- Maintains opt-in write mode requirement from Stage 5/6.

## What I learned
- Link extraction and normalization (`alias` / `anchor` handling) are important before dedupe decisions.
- Summary metrics improve confidence when running bulk edits.

## Next (Stage 8)
- Add lightweight tests for writer parsing/upsert behavior.
- Add optional backlink balancing or symmetry constraints.
