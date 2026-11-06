import {
  Plugin,
  PluginSettingTab,
  Setting,
  EditorSuggest,
  SuggestModal,
  TFile,
  Notice,
  renderMath,
  finishRenderMath,
  debounce,
} from "obsidian";
import { isCursorInMath, cursorContext } from "./mathContext.js";
import { scanDocument, mergeStats } from "./stats.js";
import { cursorOffset, previewSource } from "./dictionary.js";
import { rankSuggestions } from "./rank.js";
import { fillsFor } from "./fills.js";
import { parseTemplates, mergeTemplates, expandBody, rankTemplates } from "./templates.js";
import { tabstopExtension, startSession } from "./tabstops.js";
import DEFAULT_TEMPLATES_MD from "./default-templates.md";

const DEFAULT_SETTINGS = {
  enabled: true,
  showPreview: true,
  maxSuggestions: 15,
  askFill: true,
  boosts: {},
  fillPicks: {},
  templatesEnabled: true,
  templatesFile: "Math Templates.md",
  templatePicks: {},
};

// \proof, \showthat, ... in plain text (outside math and code).
class TemplateSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.templatesEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const m = before.match(/(^|[\s(>*_])\\([a-zA-Z]+)$/);
    if (!m) return null;
    if (cursorContext(editor.getRange({ line: 0, ch: 0 }, cursor)) !== "text") return null;
    if (!this.plugin.rankTemplates(m[2]).length) return null;
    return {
      start: { line: cursor.line, ch: cursor.ch - m[2].length - 1 },
      end: cursor,
      query: m[2],
    };
  }

  getSuggestions(ctx) {
    return this.plugin.rankTemplates(ctx.query);
  }

  renderSuggestion(t, el) {
    el.addClass("mac-item", "mac-template");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    const top = left.createDiv({ cls: "mac-template-top" });
    top.createEl("code", { text: "\\" + t.name });
    if (t.desc) top.createSpan({ cls: "mac-template-desc", text: t.desc });
    if (t.source === "user") top.createSpan({ cls: "mac-tag", text: "yours" });
    const first = t.body.split("\n").find((l) => l.trim()) || "";
    left.createDiv({ cls: "mac-template-snippet", text: first.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, "⟨$1⟩") });
  }

  selectSuggestion(t) {
    const { editor, start, end } = this.context;
    const indent = editor.getLine(start.line).match(/^\s*/)[0];
    const { text } = indentInsert(expandBody(t.body), 0, indent);
    editor.replaceRange(text, start, end);
    const from = editor.posToOffset(start);
    const picks = this.plugin.settings.templatePicks;
    picks[t.name] = (picks[t.name] || 0) + 1;
    this.plugin.saveSettings();

    const view = editor.cm;
    if (view) startSession(view, from, from + text.length);
    else editor.setCursor(editor.offsetToPos(from + text.length));
  }
}

// Re-indent a multi-line insert to the current line's indentation, keeping the
// cursor offset pointing at the same character.
function indentInsert(text, offset, indent) {
  if (!text.includes("\n") || !indent) return { text, offset };
  const linesBefore = text.slice(0, offset).split("\n").length - 1;
  return { text: text.split("\n").join("\n" + indent), offset: offset + indent.length * linesBefore };
}

// Second step after inserting a construct (\frac, \sum, a matrix, ...): pick
// what to fill it with. "Blank" or Esc keeps what's already in the note.
class FillModal extends SuggestModal {
  constructor(plugin, editor, name, fills, from, length) {
    super(plugin.app);
    this.plugin = plugin;
    this.editor = editor;
    this.name = name;
    this.fills = fills;
    this.from = from;
    this.length = length;
    this.setPlaceholder(`Fill \\${name} with… (Enter on Blank or Esc keeps it empty)`);
  }

  getSuggestions(query) {
    const q = query.toLowerCase();
    const picks = this.plugin.settings.fillPicks;
    return this.fills
      .filter((f) => (f.label || f.text).toLowerCase().includes(q))
      .map((f, i) => ({ f, i, n: picks[`${this.name}:${f.id}`] || 0 }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.f);
  }

  renderSuggestion(fill, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left" });
    if (fill.label) left.createSpan({ text: fill.label });
    else left.createEl("code", { text: fill.text });
    if (fill.uses) {
      left.createSpan({ cls: "mac-uses", text: `${fill.uses}×` });
      left.createSpan({ cls: "mac-tag", text: "from your notes" });
    }
    if (!fill.preview || !this.plugin.settings.showPreview) return;
    const right = el.createDiv({ cls: "mac-preview mac-fill-preview" });
    try {
      right.appendChild(renderMath(fill.preview, false));
      finishRenderMath();
    } catch (_) {
      // Preview is decoration; the fill still works without it.
    }
  }

  onChooseSuggestion(fill) {
    const key = `${this.name}:${fill.id}`;
    this.plugin.settings.fillPicks[key] = (this.plugin.settings.fillPicks[key] || 0) + 1;
    this.plugin.saveSettings();
    if (fill.id === "blank") return;

    const { editor, from } = this;
    const start = editor.offsetToPos(from);
    const indent = editor.getLine(start.line).match(/^\s*/)[0];
    const { text, offset } = indentInsert(fill.text, fill.cursor, indent);
    editor.replaceRange(text, start, editor.offsetToPos(from + this.length));
    editor.setCursor(editor.offsetToPos(from + offset));
  }

  onClose() {
    super.onClose();
    this.editor.focus();
  }
}

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
    const indent = editor.getLine(start.line).match(/^\s*/)[0];
    const { text, offset } = indentInsert(
      item.insert,
      item.kind === "atom" ? item.insert.length : cursorOffset(item.insert),
      indent,
    );

    editor.replaceRange(text, start, end);
    const from = editor.posToOffset(start);
    editor.setCursor(editor.offsetToPos(from + offset));
    this.plugin.recordPick(item.insert);

    if (item.kind !== "builtin" || !this.plugin.settings.askFill) return;
    const fills = fillsFor(item.name, item.insert, this.plugin.stats.atoms);
    if (fills) new FillModal(this.plugin, editor, item.name, fills, from, text.length).open();
  }
}

export default class MathAutocompletePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.fileStats = new Map(); // path -> per-document counts
    this.stats = { cmds: new Map(), atoms: new Map() };

    this.defaultTemplates = parseTemplates(DEFAULT_TEMPLATES_MD);
    this.templates = mergeTemplates(this.defaultTemplates, []);

    this.registerEditorSuggest(new MathSuggest(this));
    this.registerEditorSuggest(new TemplateSuggest(this));
    this.registerEditorExtension(tabstopExtension);
    this.addSettingTab(new MathAutocompleteSettingTab(this));

    this.addCommand({
      id: "open-templates-file",
      name: "Open (or create) the editable templates file",
      callback: () => this.openTemplatesFile(),
    });

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
      this.loadUserTemplates();
      const rescan = debounce((file) => this.scanFile(file).then(() => this.rebuild()), 2000, true);
      const reloadTemplates = debounce(() => this.loadUserTemplates(), 500, true);
      this.registerEvent(this.app.vault.on("modify", (f) => {
        if (!(f instanceof TFile) || f.extension !== "md") return;
        if (f.path === this.settings.templatesFile) reloadTemplates();
        else rescan(f);
      }));
      this.registerEvent(this.app.vault.on("create", (f) => f instanceof TFile && f.path === this.settings.templatesFile && reloadTemplates()));
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
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path !== this.settings.templatesFile);
    await Promise.all(files.map((f) => this.scanFile(f)));
    this.rebuild();
  }

  async loadUserTemplates() {
    const f = this.app.vault.getAbstractFileByPath(this.settings.templatesFile);
    const user = f instanceof TFile ? parseTemplates(await this.app.vault.read(f)) : [];
    this.templates = mergeTemplates(this.defaultTemplates, user);
  }

  async openTemplatesFile() {
    const path = this.settings.templatesFile;
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) f = await this.app.vault.create(path, DEFAULT_TEMPLATES_MD);
    await this.app.workspace.getLeaf(true).openFile(f);
  }

  rankTemplates(query) {
    return rankTemplates(query, this.templates, this.settings.templatePicks);
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
      .setName("Offer fills after inserting")
      .setDesc("After picking \\frac, \\sum, \\int, \\lim, a matrix and more, offer filled versions: the ones you write most first, then common ones.")
      .addToggle((t) => t.setValue(s.askFill).onChange(async (v) => { s.askFill = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Proof & question templates")
      .setDesc("Type \\proof, \\showthat, \\induction, ... in normal text (outside math) to insert a template. Tab jumps between the ⟨placeholders⟩.")
      .addToggle((t) => t.setValue(s.templatesEnabled).onChange(async (v) => { s.templatesEnabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Templates file")
      .setDesc("Vault note with your own templates (## \\name — description, then the body; {{variable}} for blanks). Same names override the built-in ones.")
      .addText((t) => t.setValue(s.templatesFile).onChange(async (v) => {
        s.templatesFile = v.trim() || DEFAULT_SETTINGS.templatesFile;
        await this.plugin.saveSettings();
        this.plugin.loadUserTemplates();
      }))
      .addButton((b) => b.setButtonText("Open / create").onClick(() => this.plugin.openTemplatesFile()));

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
