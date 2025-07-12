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
var import_obsidian = require("obsidian");
var PhraseLinkerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("[PhraseLinker] onload (Stage 1)");
    this.statusEl = this.addStatusBarItem();
    this.statusEl.classList.add("phrase-linker-status");
    this.statusEl.setText("Phrase Linker: ready");
    this.addCommand({
      id: "pl-hello",
      name: "Phrase Linker: Hello",
      callback: async () => {
        await new Promise((r) => setTimeout(r, 100));
        new import_obsidian.Notice("Hello from Phrase Linker \u{1F44B}");
        this.statusEl?.setText("Phrase Linker: hello ran");
      }
    });
    this.addSettingTab(new SimplePLSettingTab(this.app, this));
  }
  onunload() {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
  }
};
var SimplePLSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker (Learner Settings)" });
    new import_obsidian.Setting(containerEl).setName("Example toggle").setDesc("Does nothing yet; here to prove settings work.").addToggle((t) => {
      t.setValue(false).onChange((v) => {
        new import_obsidian.Notice(`Example toggle: ${v}`);
      });
    });
  }
};
