import {
  Plugin,
  PluginSettingTab,
  Setting,
  EditorSuggest,
  TFile,
  Notice,
  renderMath,
  finishRenderMath,
  debounce,
} from "obsidian";
import { isCursorInMath } from "./mathContext.js";
import { scanDocument, mergeStats } from "./stats.js";
import { cursorOffset, previewSource } from "./dictionary.js";
import { rankSuggestions } from "./rank.js";

const DEFAULT_SETTINGS = {
  enabled: true,
  showPreview: true,
  maxSuggestions: 15,
  boosts: {},
};

class MathSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = plugin.settings.maxSuggestions;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.enabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const m = before.match(/(^|[^\\])\\([a-zA-Z]+)$/);
    if (!m) return null;
    const docBefore = editor.getRange({ line: 0, ch: 0 }, cursor);
    if (!isCursorInMath(docBefore)) return null;

    // Fully typed and nothing longer to offer: stay out of the way so Enter
    // still makes a newline after e.g. \alpha.
    const results = this.plugin.suggest(m[2], 2);
    if (results.length === 1 && results[0].insert === "\\" + m[2]) return null;

    return {
      start: { line: cursor.line, ch: cursor.ch - m[2].length - 1 },
      end: cursor,
      query: m[2],
    };
  }

  getSuggestions(ctx) {
    return this.plugin.suggest(ctx.query, this.plugin.settings.maxSuggestions);
  }

  renderSuggestion(item, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left" });
    left.createEl("code", { text: item.insert.replace(/\n/g, " ") });
    if (item.uses > 0) left.createSpan({ cls: "mac-uses", text: `${item.uses}×` });
    if (item.kind === "atom") left.createSpan({ cls: "mac-tag", text: "from your notes" });

    if (this.plugin.settings.showPreview) {
      const right = el.createDiv({ cls: "mac-preview" });
      try {
        const src = item.kind === "atom" ? item.insert : previewSource(item.insert);
        right.appendChild(renderMath(src, false));
        finishRenderMath();
      } catch (_) {
        // MathJax can't render some fragments (e.g. lone \left); skip the preview.
      }
    }
  }

  selectSuggestion(item) {
    const { editor, start, end } = this.context;
    let text = item.insert;
    let offset = item.kind === "atom" ? text.length : cursorOffset(text);

    // Keep multi-line environments aligned with the current indentation.
    if (text.includes("\n")) {
      const indent = editor.getLine(start.line).match(/^\s*/)[0];
      const lines = text.split("\n");
      offset += indent.length * text.slice(0, offset).split("\n").slice(1).length;
      text = lines.join("\n" + indent);
    }

    editor.replaceRange(text, start, end);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(start) + offset));
    this.plugin.recordPick(item.insert);
  }
}

export default class MathAutocompletePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.fileStats = new Map(); // path -> per-document counts
    this.stats = { cmds: new Map(), atoms: new Map() };

    this.registerEditorSuggest(new MathSuggest(this));
    this.addSettingTab(new MathAutocompleteSettingTab(this));

    this.addCommand({
      id: "rescan-vault",
      name: "Rescan vault for LaTeX usage",
      callback: async () => {
        await this.scanVault();
        new Notice(`Math Autocomplete: learned ${this.stats.cmds.size} commands from your notes.`);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.scanVault();
      const rescan = debounce((file) => this.scanFile(file).then(() => this.rebuild()), 2000, true);
      this.registerEvent(this.app.vault.on("modify", (f) => f instanceof TFile && f.extension === "md" && rescan(f)));
      this.registerEvent(this.app.vault.on("delete", (f) => { this.fileStats.delete(f.path); this.rebuild(); }));
      this.registerEvent(this.app.vault.on("rename", (f, old) => {
        const s = this.fileStats.get(old);
        if (s) { this.fileStats.delete(old); this.fileStats.set(f.path, s); }
      }));
    });
  }

  async scanFile(file) {
    this.fileStats.set(file.path, scanDocument(await this.app.vault.cachedRead(file)));
  }

  async scanVault() {
    this.fileStats.clear();
    await Promise.all(this.app.vault.getMarkdownFiles().map((f) => this.scanFile(f)));
    this.rebuild();
  }

  rebuild() {
    this.stats = mergeStats(this.fileStats.values());
  }

  suggest(query, limit) {
    return rankSuggestions(query, this.stats, this.settings.boosts, limit);
  }

  recordPick(insert) {
    this.settings.boosts[insert] = (this.settings.boosts[insert] || 0) + 1;
    this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MathAutocompleteSettingTab extends PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    new Setting(containerEl)
      .setName("Enable popup")
      .setDesc("Show suggestions when you type \\ followed by a letter inside math.")
      .addToggle((t) => t.setValue(s.enabled).onChange(async (v) => { s.enabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Rendered preview")
      .setDesc("Render each suggestion with MathJax next to its source.")
      .addToggle((t) => t.setValue(s.showPreview).onChange(async (v) => { s.showPreview = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Max suggestions")
      .addSlider((sl) => sl.setLimits(5, 40, 1).setValue(s.maxSuggestions).setDynamicTooltip()
        .onChange(async (v) => { s.maxSuggestions = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Forget picks")
      .setDesc(`Reset what the popup learned from your selections (${Object.keys(s.boosts).length} entries).`)
      .addButton((b) => b.setButtonText("Reset").onClick(async () => {
        s.boosts = {};
        await this.plugin.saveSettings();
        this.display();
      }));
  }
}
