# Stage 5 - Active Note Write Mode (October 2025)

## What I added
- Opt-in write mode setting (`enableWriteMode`) to keep file modification explicit and safe.
- New command: `PL: Apply related links to active note (writes)`.
- Writer helpers to convert note paths into wiki-link targets and upsert a `## Related` section.
- Active-note flow now inserts or replaces related-link bullets based on current similarity settings.

## Safety behavior
- Write mode is off by default.
- If write mode is disabled, the command exits with a notice.
- If no related notes pass the threshold, the note is not modified.

## What I learned
- Keeping write operations isolated in a dedicated module makes command logic easier to reason about.
- Upsert behavior is better than append-only for repeatable demos and cleaner notes.
- Reusing the existing suggestion pipeline keeps preview and apply outputs aligned.

## Next (Stage 6)
- Add "apply to all notes" with confirmation and summary.
- Add lightweight tests for related-section upsert behavior.
- Add optional guard to avoid linking already linked notes redundantly.
