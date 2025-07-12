import { App, Notice, Plugin, PluginSettingTab, Setting, ToggleComponent } from "obsidian";

// helper so status bar has .setText()
type StatusBarEl = HTMLElement & { setText: (text: string) => void };

export default class PhraseLinkerPlugin extends Plugin {
  private statusEl?: StatusBarEl;

  async onload(): Promise<void> {
    console.log("[PhraseLinker] onload (Stage 1)");

    // status bar
    this.statusEl = this.addStatusBarItem() as StatusBarEl;
    this.statusEl.classList.add("phrase-linker-status");
    this.statusEl.setText("Phrase Linker: ready");

    // simple command
    this.addCommand({
      id: "pl-hello",
      name: "Phrase Linker: Hello",
      callback: async () => {
        await new Promise(r => setTimeout(r, 100)); // pretend work
        new Notice("Hello from Phrase Linker 👋");
        this.statusEl?.setText("Phrase Linker: hello ran");
      }
    });

    // placeholder settings tab
    this.addSettingTab(new SimplePLSettingTab(this.app, this));
  }

  onunload(): void {
    console.log("[PhraseLinker] onunload");
    this.statusEl?.setText("");
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
