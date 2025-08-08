# Stage 2 – Vault Scanner & Events (August)

## What I added
- Scanner to list `.md` files (respects hard-coded ignored folders).
- Toy parser (tokenize → count → top terms).
- Event-driven hooks for create/modify/delete to re-analyze changed notes.

## What I learned
- Obsidian Vault API returns `TFile` objects and emits vault events.
- Even a simple normalization/stopword pass surfaces useful top terms.

## Rough edges / TODO
- Hard-coded ignore list; real settings/persistence in Stage 4.
- Active view typing works with `MarkdownView` but I want safer null checks.
- Stopword list is tiny and English-only.

## Next (Stage 3)
- Extract normalized term vectors and compute cosine similarity.
- In-memory cache to avoid redundant parsing.
- Log candidate links (no writes yet).
