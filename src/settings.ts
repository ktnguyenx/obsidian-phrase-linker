import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type PhraseLinkerPlugin from "../main";

export interface PhraseLinkerSettings {
  ignoreFolders: string[];
  minScore: number;
  maxLinksPerNote: number;
  showPreviewOnBuild: boolean;
}

export const DEFAULT_SETTINGS: PhraseLinkerSettings = {
  ignoreFolders: ["Templates/", "Archive/"],
  minScore: 0.22,
  maxLinksPerNote: 5,
  showPreviewOnBuild: true,
};

export class PhraseLinkerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PhraseLinkerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker" });

    new Setting(containerEl)
      .setName("Ignored folders")
      .setDesc("Comma-separated folder prefixes. Example: Templates/, Archive/")
      .addTextArea((ta) => {
        ta.setPlaceholder("Templates/, Archive/")
          .setValue(this.plugin.settings.ignoreFolders.join(", "))
          .onChange(async (value) => {
            const folders = value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);

            this.plugin.settings.ignoreFolders = folders;
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 2;
        ta.inputEl.addClass("phrase-linker-textarea");
      });

    new Setting(containerEl)
      .setName("Min similarity score")
      .setDesc("Cosine threshold between 0.00 and 1.00")
      .addText((text) => {
        text.setPlaceholder("0.22")
          .setValue(this.plugin.settings.minScore.toFixed(2))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return;
            this.plugin.settings.minScore = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Max links per note")
      .setDesc("Top related notes kept per source note")
      .addText((text) => {
        text.setPlaceholder("5")
          .setValue(String(this.plugin.settings.maxLinksPerNote))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed < 1) return;
            this.plugin.settings.maxLinksPerNote = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Open preview after build")
      .setDesc("Shows dry-run suggestions panel after running build command")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showPreviewOnBuild)
          .onChange(async (value) => {
            this.plugin.settings.showPreviewOnBuild = value;
            await this.plugin.saveSettings();
            new Notice(`Preview on build: ${value ? "on" : "off"}`);
          });
      });
  }
}
