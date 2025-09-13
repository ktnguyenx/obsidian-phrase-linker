// main.ts
import {
  App, Notice, Plugin, PluginSettingTab, Setting, ToggleComponent,
  TFile, TAbstractFile, MarkdownView
} from "obsidian";
import { listMarkdownFiles, readFile, isPathIgnored } from "./src/scanner";
import { tokenize, termFreq, topK } from "./src/parser";
import { NoteCache, contentHash } from "./src/cache";
import { suggestLinks } from "./src/linker";

// helper so status bar has .setText()
type StatusBarEl = HTMLElement & { setText: (text: string) => void };

export default class PhraseLinkerPlugin extends Plugin {
  private statusEl?: StatusBarEl;
  private ignoreFolders: string[] = ["Templates/", "Archive/"];
  private cache = new NoteCache();

  async onload(): Promise<void> {
    console.log("[PhraseLinker] onload (Stage 3)");

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

    this.registerEvent(this.app.vault.on("create", (file: TAbstractFile) =>
      this.onFileChanged("create", file)
    ));
    this.registerEvent(this.app.vault.on("modify", (file: TAbstractFile) =>
      this.onFileChanged("modify", file)
    ));
    this.registerEvent(this.app.vault.on("delete", (file: TAbstractFile) =>
      this.onFileChanged("delete", file)
    ));

    this.addSettingTab(new SimplePLSettingTab(this.app, this));
  }

  onunload(): void {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
    this.cache.clear();
  }

  // ---------- handlers ----------

  private async handleScanVault(): Promise<void> {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.ignoreFolders });
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
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.ignoreFolders });
    if (files.length < 2) {
      new Notice("Need at least 2 notes for similarity.");
      return;
    }

    // parse all files (cached)
    const tfs: Array<Map<string, number>> = [];
    const names: string[] = [];
    for (const f of files) {
      const { tf } = await this.parseWithCache(f);
      tfs.push(tf);
      names.push(f.basename);
    }

    const { suggestions } = suggestLinks(tfs, { minScore: 0.22, maxLinksPerNote: 5 });

    // pretty print
    console.groupCollapsed(`🔗 Suggestions (no writes) for ${files.length} notes`);
    const rows = suggestions.map(s => ({
      from: names[s.srcIdx],
      to: names[s.dstIdx],
      score: s.score
    }));
    console.table(rows);
    console.groupEnd();

    new Notice(`Suggested ${rows.length} links (see console)`);
    this.statusEl?.setText(`Suggested links for ${files.length} notes`);
  }

  private async onFileChanged(kind: "create" | "modify" | "delete", fileLike: TAbstractFile): Promise<void> {
    if (!(fileLike instanceof TFile)) return;
    const file = fileLike as TFile;
    if (file.extension !== "md") return;
    if (isPathIgnored(file.path, this.ignoreFolders)) return;

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
}

class SimplePLSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PhraseLinkerPlugin) {
    super(app, plugin);
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker (Learner Settings)" });

    new Setting(containerEl)
      .setName("Example toggle")
      .setDesc("Does nothing yet; here to prove settings work.")
      .addToggle((t: ToggleComponent) => {
        t.setValue(false).onChange((v: boolean) => {
          new Notice(`Example toggle: ${v}`);
        });
      });
  }
}
