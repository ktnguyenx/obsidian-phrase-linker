import { App, Modal } from "obsidian";

export interface SuggestionRow {
  from: string;
  to: string;
  score: number;
}

export class SuggestionsPreviewModal extends Modal {
  constructor(
    app: App,
    private rows: SuggestionRow[],
    private fileCount: number
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText("Phrase Linker: Dry-run Suggestions");
    contentEl.empty();

    contentEl.createEl("p", {
      text: `Scanned ${this.fileCount} notes. Suggested ${this.rows.length} links (no writes).`,
    });

    if (this.rows.length === 0) {
      contentEl.createEl("p", {
        text: "No suggestions matched the current threshold.",
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

  onClose(): void {
    this.contentEl.empty();
  }
}
