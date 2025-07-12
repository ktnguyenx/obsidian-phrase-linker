// src/settings.ts
import { App, Notice, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import type PhraseLinkerPlugin from "../main";

export class PhraseLinkerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PhraseLinkerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Phrase Linker" });

    new Setting(containerEl)
      .setName("Example toggle")
      .setDesc("Does nothing yet; real settings come in Stage 4.")
      .addToggle((t: ToggleComponent) => {
        t.setValue(false).onChange((v: boolean) => new Notice(`Example toggle: ${v}`));
      });
  }
}