## Stage 1 (July 2025) 
- [Fixed] NPM EJSONPARSE on `package.json`: rewrote a valid JSON file (removed here-doc wrapper), then `npm install`. 
- [Fixed] Empty files (`main.ts`, `manifest.json`, `styles.css`): recreated minimal working versions. 
- [Fixed] Git timeline/remote issues: corrected remote URL, tags (`v0.1.0`), and backdated both AuthorDate & CommitDate; ensured default branch `main`.  

## Stage 2 (Aug 2025) 
- [Fixed] TS errors: `"Cannot find module 'obsidian'"`: installed `obsidian` and set `include: ["main.ts","src/**/*.ts"]` in `tsconfig.json`. 
- [Fixed] Node type resolution: installed `@types/node`, restarted TypeScript server (Use Workspace Version). 
- [Fixed] Status bar `.setText` typing: created `StatusBarEl` helper type and cast the return of `addStatusBarItem()`. 
- [Fixed] Implicit `any` in settings callbacks: typed `(t: ToggleComponent)` and `(v: boolean)`. 
- [Fixed] Vault event param typing: accept `TAbstractFile` and narrow via `instanceof TFile` before accessing `.extension`/`.path`.

## Stage 3 (Sep 2025)
- [Fix] Re-analysis spam on rapid edits: clear cache on delete; plan debounce in Stage 4.
- [Fix] Similarity quality: add IDF smoothing, max-TF normalization to avoid term frequency bias.

## Stage 4 (Sep 2025)
- [Fixed] Hard-coded thresholds/ignore folders in `main.ts`: moved to persisted settings via `loadData()` / `saveData()`.
- [Fixed] Dry-run suggestions visibility limited to console: added in-app preview modal command for non-technical demos.
- [Fixed] README docs drift: corrected broken notes links and closed an unclosed code fence in Dev Setup.

## Stage 5 (Oct 2025)
- [Fixed] No write path to validate practical linking: added opt-in write mode and active-note apply command.
- [Fixed] Strict TS nullability error (`TS18047: 'view.file' is possibly 'null'`): captured `activeFile` after guard for safe access.
- [Fixed] Related-section writes were ad hoc: centralized to deterministic `upsertRelatedSection()` behavior.

## Stage 6 (Oct 2025)
- [Fixed] Risky bulk write UX: added explicit confirmation modal before apply-all operations.
- [Fixed] Poor post-run visibility for batch writes: added summary counters (`updated`, `unchanged`, `no-links`).

## Stage 7 (Dec 2025)
- [Fixed] Duplicate/low-signal writes when links already existed: added `skipAlreadyLinked` setting and existing-link filtering.
- [Fixed] Existing links with alias/anchor were missed by naive matching: normalized wikilink targets before dedupe checks.

## Stage 8 (Feb 2026)
- [Fixed] No regression checks for writer logic: added lightweight automated tests for path conversion, target normalization, extraction, and related-section upsert.
- [Fixed] No standard test entrypoint in scripts: added `npm test` workflow with Node test runner.
