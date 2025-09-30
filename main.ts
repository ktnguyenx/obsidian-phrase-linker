// main.ts
import {
  Notice, Plugin, TFile, TAbstractFile, MarkdownView
} from "obsidian";
import { listMarkdownFiles, readFile, isPathIgnored } from "./src/scanner";
import { tokenize, termFreq, topK } from "./src/parser";
import { NoteCache, contentHash } from "./src/cache";
import { suggestLinks } from "./src/linker";
import {
  PhraseLinkerSettingTab,
  type PhraseLinkerSettings,
  DEFAULT_SETTINGS,
} from "./src/settings";
import { SuggestionsPreviewModal, type SuggestionRow } from "./src/preview";

// helper so status bar has .setText()
type StatusBarEl = HTMLElement & { setText: (text: string) => void };

export default class PhraseLinkerPlugin extends Plugin {
  private statusEl?: StatusBarEl;
  private cache = new NoteCache();
  settings: PhraseLinkerSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    console.log("[PhraseLinker] onload (Stage 4)");
    await this.loadSettings();

    this.statusEl = this.addStatusBarItem() as StatusBarEl;
    this.statusEl.classList.add("phrase-linker-status");
    this.statusEl.setText("Phrase Linker: ready");

    this.addCommand({
      id: "pl-scan-vault",
      name: "PL: Scan vault (list markdown files)",
      callback: () => this.handleScanVault(),
    });

    this.addCommand({
      id: "pl-analyze-active",
      name: "PL: Analyze active note (top terms)",
      callback: () => this.handleAnalyzeActive(),
    });

    // NEW: build index & suggest links (no writes)
    this.addCommand({
      id: "pl-build-and-suggest",
      name: "PL: Build index & suggest links (no writes)",
      callback: () => this.handleBuildAndSuggest(),
    });

    this.addCommand({
      id: "pl-preview-suggestions",
      name: "PL: Preview related links (dry run panel)",
      callback: () => this.handlePreviewSuggestions(),
    });

    this.registerEvent(this.app.vault.on("create", (file: TAbstractFile) =>
      this.onFileChanged("create", file)
    ));
    this.registerEvent(this.app.vault.on("modify", (file: TAbstractFile) =>
      this.onFileChanged("modify", file)
    ));
    this.registerEvent(this.app.vault.on("delete", (file: TAbstractFile) =>
      this.onFileChanged("delete", file)
    ));

    this.addSettingTab(new PhraseLinkerSettingTab(this.app, this));
  }

  onunload(): void {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
    this.cache.clear();
  }

  // ---------- handlers ----------

  private async handleScanVault(): Promise<void> {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.settings.ignoreFolders });
    console.groupCollapsed(`🗂️ ${files.length} markdown files`);
    console.table(files.map(f => ({ path: f.path, name: f.basename })));
    console.groupEnd();
    new Notice(`Scanned ${files.length} notes`);
    this.statusEl?.setText(`Phrase Linker: ${files.length} notes`);
  }

  private async handleAnalyzeActive(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) {
      new Notice("Open a markdown note first.");
      return;
    }
    await this.analyzeFile(view.file);
  }

  private async handleBuildAndSuggest(): Promise<void> {
    const result = await this.collectSuggestions();
    if (!result) return;

    const { files, rows } = result;
    this.logSuggestionRows(rows, files.length);
    new Notice(`Suggested ${rows.length} links (see console)`);
    this.statusEl?.setText(`Suggested links for ${files.length} notes`);

    if (this.settings.showPreviewOnBuild) {
      new SuggestionsPreviewModal(this.app, rows, files.length).open();
    }
  }

  private async handlePreviewSuggestions(): Promise<void> {
    const result = await this.collectSuggestions();
    if (!result) return;
    const { files, rows } = result;
    new SuggestionsPreviewModal(this.app, rows, files.length).open();
    this.statusEl?.setText(`Previewed links for ${files.length} notes`);
  }

  private async onFileChanged(kind: "create" | "modify" | "delete", fileLike: TAbstractFile): Promise<void> {
    if (!(fileLike instanceof TFile)) return;
    const file = fileLike as TFile;
    if (file.extension !== "md") return;
    if (isPathIgnored(file.path, this.settings.ignoreFolders)) return;

    if (kind === "delete") {
      // removing from cache is optional (content hash changes make stale entries harmless),
      // but we’ll just clear all for simplicity in Stage 3.
      this.cache.clear();
      console.log(`🗑️ Deleted: ${file.path}`);
      return;
    }

    console.log(`🔄 ${kind.toUpperCase()}: ${file.path}`);
    await this.analyzeFile(file);
  }

  // ---------- parsing / cache ----------

  private async parseWithCache(file: TFile): Promise<{ tokens: string[]; tf: Map<string, number> }> {
    const text = await readFile(this.app.vault, file);
    const hash = contentHash(text);

    const cached = this.cache.get(file.path, hash);
    if (cached) return { tokens: cached.tokens, tf: cached.tf };

    const tokens = tokenize(text);
    const tf = termFreq(tokens);
    this.cache.set(file.path, { hash, tokens, tf });
    return { tokens, tf };
  }

  private async analyzeFile(file: TFile): Promise<void> {
    try {
      const { tokens, tf } = await this.parseWithCache(file);
      const top = topK(tf, 10);
      console.groupCollapsed(`🔍 Top terms: ${file.path}`);
      console.table(top);
      console.groupEnd();
      this.statusEl?.setText(`Analyzed: ${file.basename} (${tokens.length} tokens)`);
    } catch (err) {
      console.error("Analyze failed:", err);
      new Notice("Analyze failed (see console)");
    }
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
    this.settings.ignoreFolders = this.settings.ignoreFolders
      .map((p) => p.trim())
      .filter(Boolean);
    this.settings.minScore = Math.min(1, Math.max(0, this.settings.minScore));
    this.settings.maxLinksPerNote = Math.max(1, Math.floor(this.settings.maxLinksPerNote));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async collectSuggestions(): Promise<{ files: TFile[]; rows: SuggestionRow[] } | null> {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.settings.ignoreFolders });
    if (files.length < 2) {
      new Notice("Need at least 2 notes for similarity.");
      return null;
    }

    const tfs: Array<Map<string, number>> = [];
    const names: string[] = [];
    for (const f of files) {
      const { tf } = await this.parseWithCache(f);
      tfs.push(tf);
      names.push(f.basename);
    }

    const { suggestions } = suggestLinks(tfs, {
      minScore: this.settings.minScore,
      maxLinksPerNote: this.settings.maxLinksPerNote,
    });

    const rows = suggestions.map((s) => ({
      from: names[s.srcIdx],
      to: names[s.dstIdx],
      score: s.score,
    }));

    return { files, rows };
  }

  private logSuggestionRows(rows: SuggestionRow[], fileCount: number): void {
    console.groupCollapsed(`🔗 Suggestions (no writes) for ${fileCount} notes`);
    console.table(rows);
    console.groupEnd();
  }
}
