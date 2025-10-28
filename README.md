# Phrase Linker (WIP)

> Auto-suggests wiki-links between related notes in Obsidian.

**Skills:** TypeScript, Node.js, Obsidian API, Git, Markdown, esbuild

## Features
- Vault scan for `.md` files
- Lightweight text parsing (tokens + stopwords)
- Event-driven analysis on create/modify/delete
- Related-links suggestion (TF-IDF + cosine similarity)
- Dry-run preview panel for suggested links
- Persistent settings for ignore folders and link thresholds

## Install
1) Copy folder into your vault: `.obsidian/plugins/obsidian-phrase-linker`
2) `npm install && npm run build`
3) Reload Obsidian → enable plugin

## Usage
- Command palette:
  - **PL: Scan vault**
  - **PL: Analyze active note**
  - **PL: Build index & suggest links (no writes)**
  - **PL: Preview related links (dry run panel)**
  - **PL: Apply related links to active note (writes)**
  - **PL: Apply related links to all notes (writes)**

## Settings
- Ignored folders (comma-separated)
- Minimum similarity score (0.00-1.00)
- Max links per note
- Auto-open preview after build
- Enable write mode (required for note modifications)

## Dev Setup
```bash
npm install
npm run dev # watch
```

## Notes & Logs
- [Stage 1 notes](docs/Stage1-Setup.md)
- [Stage 2 notes](docs/Stage2-Scanner.md)
- [Stage 3 notes](docs/Stage3-Linker.md)
- [Stage 4 notes](docs/Stage4-Settings-and-Preview.md)
- [Stage 5 notes](docs/Stage5-Write-Mode.md)
- [Stage 6 notes](docs/Stage6-Apply-All.md)
- [Bugs & fixes log](docs/feedback/bugs-and-fixes.md)
