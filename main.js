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
var import_obsidian2 = require("obsidian");

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

// main.ts
var PhraseLinkerPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.ignoreFolders = ["Templates/", "Archive/"];
    this.cache = new NoteCache();
  }
  async onload() {
    console.log("[PhraseLinker] onload (Stage 3)");
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
    this.addSettingTab(new SimplePLSettingTab(this.app, this));
  }
  onunload() {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
    this.cache.clear();
  }
  // ---------- handlers ----------
  async handleScanVault() {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.ignoreFolders });
    console.groupCollapsed(`\u{1F5C2}\uFE0F ${files.length} markdown files`);
    console.table(files.map((f) => ({ path: f.path, name: f.basename })));
    console.groupEnd();
    new import_obsidian2.Notice(`Scanned ${files.length} notes`);
    this.statusEl?.setText(`Phrase Linker: ${files.length} notes`);
  }
  async handleAnalyzeActive() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
    if (!view || !view.file) {
      new import_obsidian2.Notice("Open a markdown note first.");
      return;
    }
    await this.analyzeFile(view.file);
  }
  async handleBuildAndSuggest() {
    const files = listMarkdownFiles(this.app.vault, { ignoreFolders: this.ignoreFolders });
    if (files.length < 2) {
      new import_obsidian2.Notice("Need at least 2 notes for similarity.");
      return;
    }
    const tfs = [];
    const names = [];
    for (const f of files) {
      const { tf } = await this.parseWithCache(f);
      tfs.push(tf);
      names.push(f.basename);
    }
    const { suggestions } = suggestLinks(tfs, { minScore: 0.22, maxLinksPerNote: 5 });
    console.groupCollapsed(`\u{1F517} Suggestions (no writes) for ${files.length} notes`);
    const rows = suggestions.map((s) => ({
      from: names[s.srcIdx],
      to: names[s.dstIdx],
      score: s.score
    }));
    console.table(rows);
    console.groupEnd();
    new import_obsidian2.Notice(`Suggested ${rows.length} links (see console)`);
    this.statusEl?.setText(`Suggested links for ${files.length} notes`);
  }
  async onFileChanged(kind, fileLike) {
    if (!(fileLike instanceof import_obsidian2.TFile)) return;
    const file = fileLike;
    if (file.extension !== "md") return;
    if (isPathIgnored(file.path, this.ignoreFolders)) return;
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
      new import_obsidian2.Notice("Analyze failed (see console)");
    }
  }
};
var SimplePLSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker (Learner Settings)" });
    new import_obsidian2.Setting(containerEl).setName("Example toggle").setDesc("Does nothing yet; here to prove settings work.").addToggle((t) => {
      t.setValue(false).onChange((v) => {
        new import_obsidian2.Notice(`Example toggle: ${v}`);
      });
    });
  }
};
