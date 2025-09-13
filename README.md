# Phrase Linker (WIP)

> Auto-suggests wiki-links between related notes in Obsidian.

**Skills:** TypeScript, Node.js, Obsidian API, Git, Markdown, esbuild

## Features
- Vault scan for `.md` files
- Lightweight text parsing (tokens + stopwords)
- Event-driven analysis on create/modify/delete
- (WIP) Related-links suggestion (cosine similarity)

## Install
1) Copy folder into your vault: `.obsidian/plugins/obsidian-phrase-linker`
2) `npm install && npm run build`
3) Reload Obsidian → enable plugin

## Usage
- Command palette:
  - **PL: Scan vault**
  - **PL: Analyze active note**

## Settings
- (Stage 4) Ignored folders, thresholds, link limits

## Dev Setup
```bash
npm install
npm run dev # watch

## Notes & Logs
- [Stage 1 notes](docs/reflections/Stage1-Setup.md)
- [Stage 2 notes](docs/reflections/Stage2-Scanner.md)
- [Bugs & fixes log](docs/feedback/bugs-and-fixes.md)
