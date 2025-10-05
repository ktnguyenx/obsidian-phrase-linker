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
var import_obsidian4 = require("obsidian");

// src/scanner.ts
var import_obsidian = require("obsidian");
function listMarkdownFiles(vault, opts = {}) {
  const ignores = (opts.ignoreFolders ?? []).map(normalizePrefix);
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

// src/cache.ts
var NoteCache = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  // key: file path
  get(path, hash) {
    const entry = this.map.get(path);
    if (!entry) return void 0;
    return entry.hash === hash ? entry : void 0;
  }
  set(path, value) {
    this.map.set(path, value);
  }
  clear() {
    this.map.clear();
  }
};
function contentHash(s) {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h ^ s.charCodeAt(i);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

// src/vector.ts
function buildVocabAndDf(docs) {
  const vocab = /* @__PURE__ */ new Map();
  let next = 0;
  for (const tf of docs) {
    for (const term of tf.keys()) {
      if (!vocab.has(term)) vocab.set(term, next++);
    }
  }
  const df = new Uint32Array(vocab.size);
  for (const tf of docs) {
    for (const term of tf.keys()) {
      const idx = vocab.get(term);
      df[idx] += 1;
    }
  }
  return { vocab, df };
}
function computeIdf(df, N) {
  const idf = new Float32Array(df.length);
  for (let i = 0; i < df.length; i++) {
    idf[i] = Math.log((N + 1) / (df[i] + 1)) + 1;
  }
  return idf;
}
function tfToVec(tf, vocab, idf) {
  const v = new Float32Array(vocab.size);
  let maxTf = 0;
  tf.forEach((cnt) => {
    if (cnt > maxTf) maxTf = cnt;
  });
  const normTf = maxTf > 0 ? (c) => c / maxTf : (_) => 0;
  tf.forEach((cnt, term) => {
    const idx = vocab.get(term);
    if (idx === void 0) return;
    v[idx] = normTf(cnt) * idf[idx];
  });
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function buildTfIdf(docs) {
  const { vocab, df } = buildVocabAndDf(docs);
  const idf = computeIdf(df, docs.length);
  const tfidf = docs.map((tf) => tfToVec(tf, vocab, idf));
  return { vocab, idf, tfidf };
}

// src/linker.ts
function suggestLinks(tfs, opts = {}) {
  const { tfidf } = buildTfIdf(tfs);
  const minScore = opts.minScore ?? 0.22;
  const maxPer = opts.maxLinksPerNote ?? 5;
  const suggestions = [];
  for (let i = 0; i < tfidf.length; i++) {
    const scores = [];
    for (let j = 0; j < tfidf.length; j++) {
      if (i === j) continue;
      const s = cosine(tfidf[i], tfidf[j]);
      if (s >= minScore) scores.push({ j, s });
    }
    scores.sort((a, b) => b.s - a.s);
    for (let k = 0; k < Math.min(maxPer, scores.length); k++) {
      suggestions.push({ srcIdx: i, dstIdx: scores[k].j, score: +scores[k].s.toFixed(3) });
    }
  }
  return { tfidf, suggestions };
}

// src/settings.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_SETTINGS = {
  ignoreFolders: ["Templates/", "Archive/"],
  minScore: 0.22,
  maxLinksPerNote: 5,
  showPreviewOnBuild: true,
  enableWriteMode: false
};
var PhraseLinkerSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker" });
    new import_obsidian2.Setting(containerEl).setName("Ignored folders").setDesc("Comma-separated folder prefixes. Example: Templates/, Archive/").addTextArea((ta) => {
      ta.setPlaceholder("Templates/, Archive/").setValue(this.plugin.settings.ignoreFolders.join(", ")).onChange(async (value) => {
        const folders = value.split(",").map((v) => v.trim()).filter(Boolean);
        this.plugin.settings.ignoreFolders = folders;
        await this.plugin.saveSettings();
      });
      ta.inputEl.rows = 2;
      ta.inputEl.addClass("phrase-linker-textarea");
    });
    new import_obsidian2.Setting(containerEl).setName("Min similarity score").setDesc("Cosine threshold between 0.00 and 1.00").addText((text) => {
      text.setPlaceholder("0.22").setValue(this.plugin.settings.minScore.toFixed(2)).onChange(async (value) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return;
        this.plugin.settings.minScore = parsed;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Max links per note").setDesc("Top related notes kept per source note").addText((text) => {
      text.setPlaceholder("5").setValue(String(this.plugin.settings.maxLinksPerNote)).onChange(async (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1) return;
        this.plugin.settings.maxLinksPerNote = parsed;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Open preview after build").setDesc("Shows dry-run suggestions panel after running build command").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showPreviewOnBuild).onChange(async (value) => {
        this.plugin.settings.showPreviewOnBuild = value;
        await this.plugin.saveSettings();
        new import_obsidian2.Notice(`Preview on build: ${value ? "on" : "off"}`);
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Enable write mode").setDesc("Allows commands to modify notes (off by default)").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableWriteMode).onChange(async (value) => {
        this.plugin.settings.enableWriteMode = value;
        await this.plugin.saveSettings();
        new import_obsidian2.Notice(`Write mode: ${value ? "enabled" : "disabled"}`);
      });
    });
  }
};

// src/preview.ts
var import_obsidian3 = require("obsidian");
var SuggestionsPreviewModal = class extends import_obsidian3.Modal {
  constructor(app, rows, fileCount) {
    super(app);
    this.rows = rows;
    this.fileCount = fileCount;
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText("Phrase Linker: Dry-run Suggestions");
    contentEl.empty();
    contentEl.createEl("p", {
      text: `Scanned ${this.fileCount} notes. Suggested ${this.rows.length} links (no writes).`
    });
    if (this.rows.length === 0) {
      contentEl.createEl("p", {
        text: "No suggestions matched the current threshold."
      });
      return;
    }
    const table = contentEl.createEl("table", { cls: "phrase-linker-preview-table" });
    const head = table.createEl("thead");
    const headRow = head.createEl("tr");
    headRow.createEl("th", { text: "From" });
    headRow.createEl("th", { text: "To" });
    headRow.createEl("th", { text: "Score" });
    const body = table.createEl("tbody");
    for (const row of this.rows) {
      const tr = body.createEl("tr");
      tr.createEl("td", { text: row.from });
      tr.createEl("td", { text: row.to });
      tr.createEl("td", { text: row.score.toFixed(3), cls: "phrase-linker-score" });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/writer.ts
function pathToWikiTarget(path) {
  return path.replace(/\.md$/i, "");
}
function upsertRelatedSection(content, links) {
  const uniqueLinks = Array.from(new Set(links));
  const relatedBlock = [
    "## Related",
    ...uniqueLinks.map((link) => `- [[${link}]]`)
  ];
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const start = lines.findIndex((line) => /^##\s+Related\s*$/i.test(line));
  if (start === -1) {
    const body = normalized.trimEnd();
    return `${body}

${relatedBlock.join("\n")}
`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const nextLines = [
    ...lines.slice(0, start),
    ...relatedBlock,
    ...lines.slice(end)
  ];
  return `${nextLines.join("\n").replace(/\n+$/g, "")}
`;
}

// main.ts
var PhraseLinkerPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.cache = new NoteCache();
    this.settings = { ...DEFAULT_SETTINGS };
  }
  async onload() {
    console.log("[PhraseLinker] onload (Stage 4)");
    await this.loadSettings();
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
    this.addCommand({
      id: "pl-build-and-suggest",
      name: "PL: Build index & suggest links (no writes)",
      callback: () => this.handleBuildAndSuggest()
    });
    this.addCommand({
      id: "pl-preview-suggestions",
      name: "PL: Preview related links (dry run panel)",
      callback: () => this.handlePreviewSuggestions()
    });
    this.addCommand({
      id: "pl-apply-related-active",
      name: "PL: Apply related links to active note (writes)",
      callback: () => this.handleApplyActiveNoteLinks()
    });
    this.registerEvent(this.app.vault.on(
      "create",
      (file) => this.onFileChanged("create", file)
    ));
    this.registerEvent(this.app.vault.on(
      "modify",
      (file) => this.onFileChanged("modify", file)
    ));
    this.registerEvent(this.app.vault.on(
      "delete",
      (file) => this.onFileChanged("delete", file)
    ));
    this.addSettingTab(new PhraseLinkerSettingTab(this.app, this));
  }
  onunload() {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
    this.cache.clear();
  }
  // ---------- handlers ----------
  async handleScanVault() {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.settings.ignoreFolders });
    console.groupCollapsed(`\u{1F5C2}\uFE0F ${files.length} markdown files`);
    console.table(files.map((f) => ({ path: f.path, name: f.basename })));
    console.groupEnd();
    new import_obsidian4.Notice(`Scanned ${files.length} notes`);
    this.statusEl?.setText(`Phrase Linker: ${files.length} notes`);
  }
  async handleAnalyzeActive() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    if (!view || !view.file) {
      new import_obsidian4.Notice("Open a markdown note first.");
      return;
    }
    await this.analyzeFile(view.file);
  }
  async handleBuildAndSuggest() {
    const result = await this.collectSuggestions();
    if (!result) return;
    const { files, rows } = result;
    this.logSuggestionRows(rows, files.length);
    new import_obsidian4.Notice(`Suggested ${rows.length} links (see console)`);
    this.statusEl?.setText(`Suggested links for ${files.length} notes`);
    if (this.settings.showPreviewOnBuild) {
      new SuggestionsPreviewModal(this.app, rows, files.length).open();
    }
  }
  async handlePreviewSuggestions() {
    const result = await this.collectSuggestions();
    if (!result) return;
    const { files, rows } = result;
    new SuggestionsPreviewModal(this.app, rows, files.length).open();
    this.statusEl?.setText(`Previewed links for ${files.length} notes`);
  }
  async handleApplyActiveNoteLinks() {
    if (!this.settings.enableWriteMode) {
      new import_obsidian4.Notice("Write mode is disabled. Enable it in settings first.");
      return;
    }
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    if (!view || !view.file) {
      new import_obsidian4.Notice("Open a markdown note first.");
      return;
    }
    const activeFile = view.file;
    const result = await this.collectSuggestions();
    if (!result) return;
    const { files, suggestions } = result;
    const srcIdx = files.findIndex((f) => f.path === activeFile.path);
    if (srcIdx < 0) {
      new import_obsidian4.Notice("Active note is outside current scan scope.");
      return;
    }
    const links = this.linksForSourceNote(srcIdx, files, suggestions);
    if (links.length === 0) {
      new import_obsidian4.Notice("No related links passed the threshold for this note.");
      return;
    }
    const original = await readFile(this.app.vault, activeFile);
    const updated = upsertRelatedSection(original, links);
    await this.app.vault.modify(activeFile, updated);
    new import_obsidian4.Notice(`Inserted ${links.length} related links into ${activeFile.basename}`);
    this.statusEl?.setText(`Updated related links: ${activeFile.basename}`);
  }
  async onFileChanged(kind, fileLike) {
    if (!(fileLike instanceof import_obsidian4.TFile)) return;
    const file = fileLike;
    if (file.extension !== "md") return;
    if (isPathIgnored(file.path, this.settings.ignoreFolders)) return;
    if (kind === "delete") {
      this.cache.clear();
      console.log(`\u{1F5D1}\uFE0F Deleted: ${file.path}`);
      return;
    }
    console.log(`\u{1F504} ${kind.toUpperCase()}: ${file.path}`);
    await this.analyzeFile(file);
  }
  // ---------- parsing / cache ----------
  async parseWithCache(file) {
    const text = await readFile(this.app.vault, file);
    const hash = contentHash(text);
    const cached = this.cache.get(file.path, hash);
    if (cached) return { tokens: cached.tokens, tf: cached.tf };
    const tokens = tokenize(text);
    const tf = termFreq(tokens);
    this.cache.set(file.path, { hash, tokens, tf });
    return { tokens, tf };
  }
  async analyzeFile(file) {
    try {
      const { tokens, tf } = await this.parseWithCache(file);
      const top = topK(tf, 10);
      console.groupCollapsed(`\u{1F50D} Top terms: ${file.path}`);
      console.table(top);
      console.groupEnd();
      this.statusEl?.setText(`Analyzed: ${file.basename} (${tokens.length} tokens)`);
    } catch (err) {
      console.error("Analyze failed:", err);
      new import_obsidian4.Notice("Analyze failed (see console)");
    }
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...loaded ?? {} };
    this.settings.ignoreFolders = this.settings.ignoreFolders.map((p) => p.trim()).filter(Boolean);
    this.settings.minScore = Math.min(1, Math.max(0, this.settings.minScore));
    this.settings.maxLinksPerNote = Math.max(1, Math.floor(this.settings.maxLinksPerNote));
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async collectSuggestions() {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.settings.ignoreFolders });
    if (files.length < 2) {
      new import_obsidian4.Notice("Need at least 2 notes for similarity.");
      return null;
    }
    const tfs = [];
    const names = [];
    for (const f of files) {
      const { tf } = await this.parseWithCache(f);
      tfs.push(tf);
      names.push(f.basename);
    }
    const { suggestions } = suggestLinks(tfs, {
      minScore: this.settings.minScore,
      maxLinksPerNote: this.settings.maxLinksPerNote
    });
    const rows = suggestions.map((s) => ({
      from: names[s.srcIdx],
      to: names[s.dstIdx],
      score: s.score
    }));
    return { files, suggestions, rows };
  }
  logSuggestionRows(rows, fileCount) {
    console.groupCollapsed(`\u{1F517} Suggestions (no writes) for ${fileCount} notes`);
    console.table(rows);
    console.groupEnd();
  }
  linksForSourceNote(srcIdx, files, suggestions) {
    const links = [];
    for (const s of suggestions) {
      if (s.srcIdx !== srcIdx) continue;
      links.push(pathToWikiTarget(files[s.dstIdx].path));
    }
    return Array.from(new Set(links));
  }
};
