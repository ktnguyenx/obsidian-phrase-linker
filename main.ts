// main.ts
import { Notice, Plugin, TFile, MarkdownView } from "obsidian";
import { listMarkdownFiles, readFile, isPathIgnored } from "./src/scanner";
import { tokenize, termFreq, topK } from "./src/parser";
import { PhraseLinkerSettingTab } from "./src/settings";

// helper type so .setText() is typed on the status bar element
type StatusBarEl = HTMLElement & { setText: (text: string) => void };

export default class PhraseLinkerPlugin extends Plugin {
  private statusEl?: StatusBarEl;
  // Stage-2 simple defaults (real settings in Stage 4)
  private ignoreFolders: string[] = ["Templates/", "Archive/"];

  async onload(): Promise<void> {
    console.log("[PhraseLinker] onload (Stage 2)");

    // status bar
    this.statusEl = this.addStatusBarItem() as StatusBarEl;
    this.statusEl.classList.add("phrase-linker-status");
    this.statusEl.setText("Phrase Linker: ready");

    // commands
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

    // event-driven hooks
    this.registerEvent(this.app.vault.on("create", (file) => this.onFileChanged("create", file)));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChanged("modify", file)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChanged("delete", file as unknown as TFile)));

    // settings tab
    this.addSettingTab(new PhraseLinkerSettingTab(this.app, this));
  }

  onunload(): void {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
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

  private async onFileChanged(kind: "create" | "modify" | "delete", fileLike: TFile | any): Promise<void> {
    const file = fileLike as TFile;
    if (!file || file.extension !== "md") return;
    if (isPathIgnored(file.path, this.ignoreFolders)) return;

    if (kind === "delete") {
      console.log(`🗑️ Deleted: ${file.path}`);
      return;
    }

    console.log(`🔄 ${kind.toUpperCase()}: ${file.path}`);
    await this.analyzeFile(file);
  }

  // ---------- toy analysis ----------

  private async analyzeFile(file: TFile): Promise<void> {
    try {
      const text = await readFile(this.app.vault, file);
      const tokens = tokenize(text);
      const freq = termFreq(tokens);
      const top = topK(freq, 10);

      console.groupCollapsed(`🔍 Top terms: ${file.path}`);
      console.table(top);
      console.groupEnd();

      this.statusEl?.setText(`Analyzed: ${file.basename}`);
    } catch (err) {
      console.error("Analyze failed:", err);
      new Notice("Analyze failed (see console)");
    }
  }
}