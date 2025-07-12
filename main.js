"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PhraseLinkerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/scanner.ts
var import_obsidian = require("obsidian");
function listMarkdownFiles(vault, opts = {}) {
  const ignores = (opts.ignoreFolders ?? []).map((p) => normalizePrefix(p));
  const isIgnored = (path) => ignores.some((prefix) => path.startsWith(prefix));
  const isMd = (f) => f instanceof import_obsidian.TFile && f.extension === "md";
  const all = vault.getAllLoadedFiles();
  return all.filter(isMd).filter((f) => !isIgnored(f.path));
}
function normalizePrefix(p) {
  return p.endsWith("/") ? p : p + "/";
}
async function readFile(vault, file) {
  return vault.read(file);
}
function isPathIgnored(path, ignoreFolders = []) {
  const prefixes = ignoreFolders.map(normalizePrefix);
  return prefixes.some((pref) => path.startsWith(pref));
}

// src/parser.ts
var STOPWORDS = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "and",
  "in",
  "is",
  "it",
  "that",
  "for",
  "on",
  "with",
  "as",
  "at",
  "by",
  "be",
  "are",
  "was",
  "were",
  "this",
  "from",
  "or",
  "but",
  "so"
]);
function tokenize(text) {
  const cleaned = text.toLowerCase().replace(/[#*_\[\](){}<>`~^=+|:\\/]/g, " ").replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const raw = cleaned.split(/\s+/).filter(Boolean);
  return raw.filter((t) => !STOPWORDS.has(t));
}
function termFreq(tokens) {
  const m = /* @__PURE__ */ new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}
function topK(freq, k = 10) {
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([term, count]) => ({ term, count }));
}

// src/settings.ts
var import_obsidian2 = require("obsidian");
var PhraseLinkerSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker" });
    new import_obsidian2.Setting(containerEl).setName("Example toggle").setDesc("Does nothing yet; real settings come in Stage 4.").addToggle((t) => {
      t.setValue(false).onChange((v) => new import_obsidian2.Notice(`Example toggle: ${v}`));
    });
  }
};

// main.ts
var PhraseLinkerPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    // Stage-2 simple defaults (real settings in Stage 4)
    this.ignoreFolders = ["Templates/", "Archive/"];
  }
  async onload() {
    console.log("[PhraseLinker] onload (Stage 2)");
    this.statusEl = this.addStatusBarItem();
    this.statusEl.classList.add("phrase-linker-status");
    this.statusEl.setText("Phrase Linker: ready");
    this.addCommand({
      id: "pl-scan-vault",
      name: "PL: Scan vault (list markdown files)",
      callback: () => this.handleScanVault()
    });
    this.addCommand({
      id: "pl-analyze-active",
      name: "PL: Analyze active note (top terms)",
      callback: () => this.handleAnalyzeActive()
    });
    this.registerEvent(this.app.vault.on("create", (file) => this.onFileChanged("create", file)));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChanged("modify", file)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChanged("delete", file)));
    this.addSettingTab(new PhraseLinkerSettingTab(this.app, this));
  }
  onunload() {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
  }
  // ---------- handlers ----------
  async handleScanVault() {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.ignoreFolders });
    console.groupCollapsed(`\u{1F5C2}\uFE0F ${files.length} markdown files`);
    console.table(files.map((f) => ({ path: f.path, name: f.basename })));
    console.groupEnd();
    new import_obsidian3.Notice(`Scanned ${files.length} notes`);
    this.statusEl?.setText(`Phrase Linker: ${files.length} notes`);
  }
  async handleAnalyzeActive() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!view || !view.file) {
      new import_obsidian3.Notice("Open a markdown note first.");
      return;
    }
    await this.analyzeFile(view.file);
  }
  async onFileChanged(kind, fileLike) {
    const file = fileLike;
    if (!file || file.extension !== "md") return;
    if (isPathIgnored(file.path, this.ignoreFolders)) return;
    if (kind === "delete") {
      console.log(`\u{1F5D1}\uFE0F Deleted: ${file.path}`);
      return;
    }
    console.log(`\u{1F504} ${kind.toUpperCase()}: ${file.path}`);
    await this.analyzeFile(file);
  }
  // ---------- toy analysis ----------
  async analyzeFile(file) {
    try {
      const text = await readFile(this.app.vault, file);
      const tokens = tokenize(text);
      const freq = termFreq(tokens);
      const top = topK(freq, 10);
      console.groupCollapsed(`\u{1F50D} Top terms: ${file.path}`);
      console.table(top);
      console.groupEnd();
      this.statusEl?.setText(`Analyzed: ${file.basename}`);
    } catch (err) {
      console.error("Analyze failed:", err);
      new import_obsidian3.Notice("Analyze failed (see console)");
    }
  }
};
