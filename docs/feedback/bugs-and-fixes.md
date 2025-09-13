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