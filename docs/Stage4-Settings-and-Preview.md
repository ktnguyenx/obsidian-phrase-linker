# Stage 4 - Settings + Dry-run Preview (September 2025)

## What I added
- Persistent plugin settings via `loadData()` / `saveData()`.
- Settings UI for:
  - ignored folders,
  - minimum similarity score,
  - max links per note,
  - auto-open preview after build.
- Dry-run preview modal with a table of suggested links (`from`, `to`, `score`).
- New command: "PL: Preview related links (dry run panel)".

## What I learned
- It is cleaner to separate settings and preview UI into dedicated `src/` modules.
- Reusing one shared suggestion pipeline keeps command behavior consistent.
- Lightweight UI feedback in Obsidian (Notice + status bar + modal) improves trust before write mode exists.

## Next
- Add opt-in write mode to insert links under a "Related" header.
- Add preview confirmation before any file writes.
- Add small tests for tokenizer, similarity thresholding, and settings normalization.
