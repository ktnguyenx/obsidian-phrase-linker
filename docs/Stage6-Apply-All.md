# Stage 6 - Apply Related Links to All Notes (October 2025)

## What I added
- New write command: `PL: Apply related links to all notes (writes)`.
- Confirmation modal before running vault-wide updates.
- Per-run summary notice: updated, unchanged, and no-links counts.
- Reused active-note write logic so section formatting stays consistent.

## Safety behavior
- Requires write mode to be enabled first.
- Cancel path in confirmation modal exits without modifications.
- Notes with no qualifying suggestions are skipped.

## What I learned
- A confirmation modal is a practical guardrail for bulk operations.
- Reporting updated vs unchanged notes makes runs easier to trust and debug.
- Upsert-based writes are deterministic and safer than append-only behavior.

## Next (Stage 7)
- Improve link quality with duplicate-link guards and stronger filtering.
- Add tests for upsert edge cases and apply-all summary counts.
