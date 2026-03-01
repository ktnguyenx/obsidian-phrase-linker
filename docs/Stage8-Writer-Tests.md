# Stage 8 - Writer Tests & Validation (February 2026)

## What I added
- Added lightweight automated tests for writer utilities:
  - `pathToWikiTarget`
  - `normalizeWikiTarget`
  - `extractWikiTargets`
  - `upsertRelatedSection`
- Added `npm test` script using Node's built-in test runner.
- Added a small build step for tests that bundles `src/writer.ts` into an ESM test artifact.

## Why this helps
- Catches regressions in link parsing and section replacement behavior.
- Makes Stage 5-7 write features safer to iterate on.
- Keeps test setup minimal (no extra test framework dependencies).

## What I learned
- A focused test target (writer module) gives high confidence with low maintenance cost.
- Upsert behavior benefits from deterministic tests around replacement boundaries.

## Next
- Add focused tests for apply-all summary counts and skip-already-linked behavior.
