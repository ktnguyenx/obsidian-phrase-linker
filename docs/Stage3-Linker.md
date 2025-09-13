# Stage 3 – Linker, TF-IDF, Cosine, Cache (September)

## What I added
- TF-IDF vectors and cosine similarity across notes.
- In-memory cache keyed by path + content hash (djb2).
- "Build index & suggest links" command (logs to console only).

## What I learned
- Why IDF smoothing matters; using `log((N+1)/(df+1))+1`.
- Cosine similarity needs normalization; max-TF scaling is a simple heuristic.
- Caching by content hash avoids redundant parsing without persistence yet.

## Next (Stage 4)
- Settings UI: thresholds, ignored folders, max links per note.
- Dry-run preview panel; (optional) write links under a "Related" header.
- Simple debounce for vault event spam; minimal tests.