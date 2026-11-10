import {
  Plugin,
  PluginSettingTab,
  Setting,
  EditorSuggest,
  SuggestModal,
  Modal,
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
import { parseTemplates, mergeTemplates, expandBody, rankTemplates, exerciseQuery, rankExercises, textQuestions, fillTextAnswers } from "./templates.js";
import { tabstopExtension, startSession } from "./tabstops.js";
import DEFAULT_TEMPLATES_MD from "./default-templates.md";
import IMO26_TEMPLATES_MD from "./imo26-templates.md";
import IMO26_REFS from "./refs/imo26.json";
import { parseRefQuery, rankRefs, formatRef, kindLabel } from "./refs.js";
import { envOf, isMatrixEnv } from "./variants.js";
import { parseVars, parseBlock, matchVars, fenceLanguage, insertFor, toLatex, toPython, latexName, PY_LANGS } from "./vars.js";
import { parsePySnippets, buildPySnippet, snippetQuestions, checkAnswers, sizeDefault, rankPySnippets, codeBlockBefore, scanPython, mergeCounts, rankMembers } from "./pysnippets.js";
import PY_SNIPPETS_MD from "./py-snippets.md";

const PY_SNIPPETS = parsePySnippets(PY_SNIPPETS_MD);

function inPython(editor, cursor) {
  const docBefore = editor.getRange({ line: 0, ch: 0 }, cursor);
  return PY_LANGS.has(fenceLanguage(docBefore) ?? "") ? docBefore : null;
}

// \hessian, \kkt, \intersection, ... inside ```python: a whole computation,
// with the note's ```vars variables filled in as its inputs.
class PySnippetSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = 40;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.pythonEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    // Words with spaces too: \computational graph, \gradient at point.
    const m = before.match(/(?:^|[\s(=,])\\([a-zA-Z][a-zA-Z0-9' -]{0,50}|)$/);
    if (!m) return null;
    const docBefore = inPython(editor, cursor);
    if (docBefore === null) return null;
    if (!this.plugin.rankPySnippets(m[1]).length) return null;
    this.state = { vars: parseVars(editor.getValue()), before: codeBlockBefore(docBefore) };
    return { start: { line: cursor.line, ch: cursor.ch - m[1].length - 1 }, end: cursor, query: m[1] };
  }

  getSuggestions(ctx) {
    return this.plugin.rankPySnippets(ctx.query);
  }

  renderSuggestion(t, el) {
    el.addClass("mac-item", "mac-template");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    const top = left.createDiv({ cls: "mac-template-top" });
    top.createEl("code", { text: "\\" + t.name });
    if (t.desc) top.createSpan({ cls: "mac-template-desc", text: t.desc });
    if (t.all.length > 1) top.createSpan({ cls: "mac-tag", text: `${t.all.length} ways` });
    const { used } = buildPySnippet(t.all[0], this.state);
    if (used.length) top.createSpan({ cls: "mac-tag", text: "uses " + used.map((u) => "@" + u.var).join(", ") });
    const snippet = t.all.length > 1 ? t.all.map((v) => v.label).join(" · ") : (t.body.split("\n").find((l) => l.trim()) || "");
    left.createDiv({ cls: "mac-template-snippet", text: snippet });
  }

  selectSuggestion(t) {
    const { editor, start, end } = this.context;
    const state = this.state;
    const picks = this.plugin.settings.templatePicks;
    picks["py:" + t.name] = (picks["py:" + t.name] || 0) + 1;
    this.plugin.saveSettings();
    const put = (v, answers) => insertTemplate(editor, start, end, buildPySnippet(v, { ...state, answers }).text);
    const insert = (v) => {
      const { questions } = snippetQuestions(v, state);
      if (!this.plugin.settings.askInputs || !questions.length) return put(v, {});
      new InputsModal(this.plugin, t.name, v, state, questions, (answers) => put(v, answers)).open();
    };
    if (t.all.length > 1) new RouteModal(this.plugin, { ...t, name: "py:" + t.name, variants: t.all }, insert).open();
    else insert(t.all[0]);
  }
}

// Asks for everything a Python snippet needs (prefilled from the note's vars
// and sensible defaults) so it inserts complete, with nothing left to replace.
export class InputsModal extends Modal {
  constructor(plugin, name, route, state, questions, onDone) {
    super(plugin.app);
    this.plugin = plugin;
    this.name = name;
    this.route = route;
    this.state = state;
    this.questions = questions;
    this.onDone = onDone;
    this.answers = Object.fromEntries(questions.map((q) => [q.key, q.value]));
    this.touched = new Set();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("mac-inputs");
    this.setTitle?.(`\\${this.name}${this.route.label ? ": " + this.route.label : ""}`);
    if (!this.setTitle) contentEl.createEl("h3", { text: `\\${this.name}` });
    this.symsEl = contentEl.createDiv({ cls: "mac-inputs-syms" });
    this.fields = new Map();
    for (const q of this.questions) {
      const s = new Setting(contentEl).setName(q.label);
      s.setDesc(q.from ? `from @${q.from} in your vars block` : q.hint ? `e.g. ${q.hint}` : "");
      s.addText((t) => {
        t.setValue(q.value).setPlaceholder(q.hint || "");
        t.inputEl.addClass("mac-inputs-field");
        t.onChange((val) => {
          this.answers[q.key] = val;
          this.touched.add(q.key);
          this.refresh(q.key);
        });
        t.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); this.submit(); }
        });
        this.fields.set(q.key, t);
      });
    }
    this.errorEl = contentEl.createDiv({ cls: "mac-inputs-error" });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Leave blanks as Tab stops").onClick(() => this.submit(true)))
      .addButton((b) => b.setButtonText("Insert").setCta().onClick(() => this.submit()));
    contentEl.createDiv({ cls: "mac-inputs-help", text: "Type LaTeX or Python: x^2 + 3xy, \\frac{1}{2}, [1, 2, 3], (1, 1). Enter inserts, Esc cancels." });
    this.refresh(null);
    const first = this.fields.get(this.questions[0].key);
    setTimeout(() => { first.inputEl.focus(); first.inputEl.select(); }, 0);
  }

  // Live: the variables found, untouched point-like defaults resized to them,
  // and a warning when a point has the wrong number of values.
  refresh(changed) {
    const ctx = { vars: this.state.vars, before: this.state.before };
    const { syms } = checkAnswers(this.route, ctx, this.answers);
    if (changed !== null) {
      for (const q of this.questions) {
        if (q.type !== "placeholder" || this.touched.has(q.key)) continue;
        const resized = sizeDefault(this.route.examples[q.key], q.key, syms.length);
        if (resized != null && resized !== this.answers[q.key]) {
          this.answers[q.key] = resized;
          this.fields.get(q.key).setValue(resized);
        }
      }
    }
    const { error } = checkAnswers(this.route, ctx, this.answers);
    this.symsEl.setText(syms.length ? `Variables: ${syms.join(", ")}` : "");
    this.errorEl.setText(error || "");
    this.error = error;
  }

  submit(keepBlanks = false) {
    if (!keepBlanks && this.error) { this.errorEl.addClass("mac-shake"); setTimeout(() => this.errorEl.removeClass("mac-shake"), 300); return; }
    const answers = keepBlanks ? Object.fromEntries(Object.entries(this.answers).filter(([k]) => this.touched.has(k) || this.questions.find((q) => q.key === k).from)) : this.answers;
    this.close();
    this.onDone(answers);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// sp.<...>, np.<...>, np.linalg.<...>, plt.<...>: members ranked by how often
// your notes use them.
class PyMemberSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = 20;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.pythonEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const m = before.match(/(?<![\w.])((?:sp|np|plt|opt|si)(?:\.(?:linalg|random))?)\.([A-Za-z_]\w*)$/);
    if (!m) return null;
    if (inPython(editor, cursor) === null) return null;
    const list = rankMembers(m[1], m[2], this.plugin.pyCounts);
    if (!list.length || (list.length === 1 && list[0].name === m[2])) return null;
    this.lib = m[1];
    return { start: { line: cursor.line, ch: cursor.ch - m[2].length }, end: cursor, query: m[2] };
  }

  getSuggestions(ctx) {
    return rankMembers(this.lib, ctx.query, this.plugin.pyCounts);
  }

  renderSuggestion(item, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left" });
    left.createEl("code", { text: `${this.lib}.${item.name}${item.call ? "()" : ""}` });
    if (item.uses) {
      left.createSpan({ cls: "mac-uses", text: `${item.uses}×` });
      left.createSpan({ cls: "mac-tag", text: "from your notes" });
    }
  }

  selectSuggestion(item) {
    const { editor, start, end } = this.context;
    const text = item.name + (item.call ? "()" : "");
    editor.replaceRange(text, start, end);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(start) + item.name.length + (item.call ? 1 : 0)));
  }
}

const DEFAULT_SETTINGS = {
  enabled: true,
  showPreview: true,
  maxSuggestions: 15,
  askFill: true,
  boosts: {},
  fillPicks: {},
  templatesEnabled: true,
  templatesFile: "Math Templates.md",
  exerciseFile: "Math/IMO26 Exercise Templates.md",
  templatePicks: {},
  imo26: false,
  refAsLink: false,
  refWithTitle: false,
  routePicks: {},
  refNote: "",
  refPicks: {},
  varsEnabled: true,
  pythonStyle: "sympy",
  pythonEnabled: true,
  askInputs: true,
};

// @name inserts a variable from the note's ```vars block: LaTeX in math,
// $name = ...$ in text, Python in python code blocks.
class VarSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = 30;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.varsEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const m = before.match(/(?:^|[^\w@])@([A-Za-z]\w*)?$/);
    if (!m) return null;
    const docBefore = editor.getRange({ line: 0, ch: 0 }, cursor);
    const lang = fenceLanguage(docBefore);
    let kind;
    if (lang !== null) {
      if (!PY_LANGS.has(lang)) return null;
      kind = "python";
    } else {
      kind = cursorContext(docBefore);
      if (kind === "code") return null;
    }
    const vars = parseVars(editor.getValue());
    const query = m[1] || "";
    if (!matchVars(vars, query).length) return null;
    const startCh = cursor.ch - query.length - 1;
    this.state = { kind, vars, atLineStart: before.slice(0, startCh).trim() === "" };
    return { start: { line: cursor.line, ch: startCh }, end: cursor, query };
  }

  getSuggestions(ctx) {
    return matchVars(this.state.vars, ctx.query);
  }

  renderSuggestion(v, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    const top = left.createDiv({ cls: "mac-template-top" });
    top.createEl("code", { text: "@" + v.name });
    top.createSpan({ cls: "mac-tag", text: v.kind === "matrix" ? `${v.value.length}×${v.value[0].length} matrix` : v.kind });
    if (this.state.kind === "python") {
      left.createDiv({ cls: "mac-template-snippet", text: toPython(v, this.plugin.settings.pythonStyle) });
    }
    if (!this.plugin.settings.showPreview) return;
    const right = el.createDiv({ cls: "mac-preview" });
    try {
      right.appendChild(renderMath(`${latexName(v.name)} = ${toLatex(v)}`, false));
      finishRenderMath();
    } catch (_) {
      // Preview is decoration only.
    }
  }

  selectSuggestion(v) {
    const { editor, start, end } = this.context;
    const text = insertFor(v, this.state.kind, {
      style: this.plugin.settings.pythonStyle,
      atLineStart: this.state.atLineStart,
    });
    editor.replaceRange(text, start, end);
    editor.setCursor(editor.offsetToPos(editor.posToOffset(start) + text.length));
  }
}

// Plain text (outside math and code): \proof, \showthat, ... templates and
// book references (\def4.26, \thmcauchy, \ref convex function).
class TemplateSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = 40;
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.templatesEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    // \word, \def4.26, or \ref followed by free search words.
    const m = before.match(/(?:^|[\s(>*_[])\\((?:ref|ex)(?:\s[^\\$\n]{0,60})?|[a-zA-Z]+[\w.]*)$/);
    if (!m) return null;
    if (cursorContext(editor.getRange({ line: 0, ch: 0 }, cursor)) !== "text") return null;
    if (!this.plugin.textSuggestions(m[1]).length) return null;
    return {
      start: { line: cursor.line, ch: cursor.ch - m[1].length - 1 },
      end: cursor,
      query: m[1],
    };
  }

  getSuggestions(ctx) {
    return this.plugin.textSuggestions(ctx.query);
  }

  renderSuggestion(item, el) {
    el.addClass("mac-item", "mac-template");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    const top = left.createDiv({ cls: "mac-template-top" });
    if (item.type === "ref") {
      const r = item.ref;
      top.createEl("code", { text: `${kindLabel(r.kind)} ${r.num}` });
      top.createSpan({ cls: "mac-template-desc", text: r.title });
      top.createSpan({ cls: "mac-uses", text: `p. ${r.page}` });
      left.createDiv({ cls: "mac-template-snippet", text: r.text });
      return;
    }
    const t = item.t;
    top.createEl("code", { text: "\\" + t.name });
    if (t.desc) top.createSpan({ cls: "mac-template-desc", text: t.desc });
    if (t.source === "user") top.createSpan({ cls: "mac-tag", text: "yours" });
    if (t.variants.length > 1) top.createSpan({ cls: "mac-tag", text: `${t.variants.length} ways` });
    const snippet = t.variants.length > 1
      ? t.variants.map((v) => v.label).join(" · ")
      : (t.body.split("\n").find((l) => l.trim()) || "").replace(/\{\{\s*([^{}]+?)\s*\}\}/g, "⟨$1⟩");
    left.createDiv({ cls: "mac-template-snippet", text: snippet });
  }

  selectSuggestion(item) {
    const { editor, start, end } = this.context;
    if (item.type === "ref") {
      const r = item.ref;
      const s = this.plugin.settings;
      const text = formatRef(r, this.plugin.refLinkTarget(), s.refWithTitle);
      editor.replaceRange(text, start, end);
      editor.setCursor(editor.offsetToPos(editor.posToOffset(start) + text.length));
      s.refPicks[`${r.kind}:${r.num}`] = (s.refPicks[`${r.kind}:${r.num}`] || 0) + 1;
      this.plugin.saveSettings();
      return;
    }
    const t = item.t;
    const picks = this.plugin.settings.templatePicks;
    picks[t.name] = (picks[t.name] || 0) + 1;
    this.plugin.saveSettings();
    if (t.variants.length > 1) {
      // Like the matrix fills: second step picks the solution route.
      new RouteModal(this.plugin, t, (v) => this.plugin.insertTextTemplate(editor, start, end, t.name, v)).open();
      return;
    }
    this.plugin.insertTextTemplate(editor, start, end, t.name, { label: "", body: t.body });
  }
}

function insertTemplate(editor, start, end, body) {
  const indent = editor.getLine(start.line).match(/^\s*/)[0];
  const { text } = indentInsert(expandBody(body), 0, indent);
  editor.replaceRange(text, start, end);
  const from = editor.posToOffset(start);
  const view = editor.cm;
  if (view) startSession(view, from, from + text.length);
  else editor.setCursor(editor.offsetToPos(from + text.length));
  editor.focus();
}

// The math inputs of a text template (A, f, x0, ...), prefilled from the
// note's ```vars block. Blank answers stay as Tab stops.
class TextInputsModal extends Modal {
  constructor(plugin, name, route, questions, onDone) {
    super(plugin.app);
    this.name = name;
    this.route = route;
    this.questions = questions;
    this.onDone = onDone;
    this.answers = Object.fromEntries(questions.map((q) => [q.key, q.value]));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("mac-inputs");
    const title = `\\${this.name}${this.route.label ? ": " + this.route.label : ""}`;
    if (this.setTitle) this.setTitle(title);
    else contentEl.createEl("h3", { text: title });
    const fields = [];
    for (const q of this.questions) {
      new Setting(contentEl)
        .setName(q.label)
        .setDesc(q.from ? `from @${q.from} in your vars block` : "")
        .addText((t) => {
          t.setValue(q.value);
          t.inputEl.addClass("mac-inputs-field");
          t.onChange((val) => { this.answers[q.key] = val; });
          t.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); this.submit(); }
          });
          fields.push(t);
        });
    }
    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Leave all as Tab stops").onClick(() => this.submit(true)))
      .addButton((b) => b.setButtonText("Insert").setCta().onClick(() => this.submit()));
    contentEl.createDiv({ cls: "mac-inputs-help", text: "LaTeX, e.g. x^2 + 1, \\mathbb{R}, (1, 2). Empty fields stay as Tab stops. Enter inserts, Esc cancels." });
    setTimeout(() => { fields[0].inputEl.focus(); fields[0].inputEl.select(); }, 0);
  }

  submit(keepBlanks = false) {
    this.close();
    this.onDone(keepBlanks ? {} : this.answers);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Pick how to solve it: each route of a template cites the definitions,
// lemmas and theorems it uses by number.
class RouteModal extends SuggestModal {
  constructor(plugin, template, onPick) {
    super(plugin.app);
    this.plugin = plugin;
    this.t = template;
    this.onPick = onPick;
    this.setPlaceholder(`\\${template.name}: how do you want to solve it? (Esc keeps what you typed)`);
  }

  getSuggestions(query) {
    const q = query.toLowerCase();
    const picks = this.plugin.settings.routePicks;
    return this.t.variants
      .map((v, i) => ({ v, i, n: picks[`${this.t.name}:${v.label}`] || 0 }))
      .filter((x) => x.v.label.toLowerCase().includes(q) || x.v.body.toLowerCase().includes(q))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.v);
  }

  renderSuggestion(v, el) {
    el.addClass("mac-item", "mac-template");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    left.createDiv({ cls: "mac-template-top" }).createSpan({ text: v.label });
    const first = v.body.split("\n").find((l) => l.trim()) || "";
    left.createDiv({ cls: "mac-template-snippet", text: first.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, "⟨$1⟩") });
  }

  onChooseSuggestion(v) {
    const key = `${this.t.name}:${v.label}`;
    const picks = this.plugin.settings.routePicks;
    picks[key] = (picks[key] || 0) + 1;
    this.plugin.saveSettings();
    this.onPick(v);
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
    let fills = fillsFor(item.name, item.insert, this.plugin.stats.atoms);
    const env = envOf(item.insert);
    if (fills && env && isMatrixEnv(env)) {
      // The note's own matrices and vectors first: the exercise's values.
      const mine = [...parseVars(editor.getValue()).values()]
        .filter((v) => v.kind !== "scalar")
        .map((v) => {
          const t = toLatex(v, env);
          return { id: "var:" + v.name, label: `${v.name} (this note's variable)`, text: t, cursor: t.length, preview: t };
        });
      fills = [...mine, ...fills];
    }
    if (fills) new FillModal(this.plugin, editor, item.name, fills, from, text.length).open();
  }
}

export default class MathAutocompletePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign(structuredClone(DEFAULT_SETTINGS), await this.loadData());
    this.fileStats = new Map(); // path -> per-document counts
    this.pyFileCounts = new Map(); // path -> lib.member counts in python blocks
    this.pyCounts = new Map();
    this.stats = { cmds: new Map(), atoms: new Map() };

    this.buildDefaultTemplates();
    this.templates = mergeTemplates(this.defaultTemplates, []);
    this.exercises = [];

    this.registerEditorSuggest(new MathSuggest(this));
    this.registerEditorSuggest(new TemplateSuggest(this));
    this.registerEditorSuggest(new VarSuggest(this));
    this.registerEditorSuggest(new PySnippetSuggest(this));
    this.registerEditorSuggest(new PyMemberSuggest(this));

    // Reading view: show the ```vars block as rendered math.
    this.registerMarkdownCodeBlockProcessor("vars", (src, el) => {
      const vars = parseBlock(src);
      if (!vars.length) { el.createEl("pre", { text: src }); return; }
      const box = el.createDiv({ cls: "mac-vars" });
      for (const v of vars) {
        const row = box.createDiv({ cls: "mac-vars-row" });
        try {
          row.appendChild(renderMath(`${latexName(v.name)} = ${toLatex(v)}`, true));
        } catch (_) {
          row.createEl("code", { text: `${v.name} = ${toLatex(v)}` });
        }
      }
      finishRenderMath();
    });
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
      this.loadExercises();
      const rescan = debounce((file) => this.scanFile(file).then(() => this.rebuild()), 2000, true);
      const reloadTemplates = debounce(() => this.loadUserTemplates(), 500, true);
      const reloadExercises = debounce(() => this.loadExercises(), 500, true);
      this.registerEvent(this.app.vault.on("modify", (f) => {
        if (!(f instanceof TFile) || f.extension !== "md") return;
        if (f.path === this.settings.templatesFile) reloadTemplates();
        else if (f.path === this.settings.exerciseFile) reloadExercises();
        else rescan(f);
      }));
      this.registerEvent(this.app.vault.on("create", (f) => {
        if (!(f instanceof TFile)) return;
        if (f.path === this.settings.templatesFile) reloadTemplates();
        if (f.path === this.settings.exerciseFile) reloadExercises();
      }));
      this.registerEvent(this.app.vault.on("delete", (f) => { this.fileStats.delete(f.path); this.pyFileCounts.delete(f.path); this.rebuild(); }));
      this.registerEvent(this.app.vault.on("rename", (f, old) => {
        const s = this.fileStats.get(old);
        if (s) { this.fileStats.delete(old); this.fileStats.set(f.path, s); }
        const c = this.pyFileCounts.get(old);
        if (c) { this.pyFileCounts.delete(old); this.pyFileCounts.set(f.path, c); }
      }));
    });
  }

  async scanFile(file) {
    const text = await this.app.vault.cachedRead(file);
    this.fileStats.set(file.path, scanDocument(text));
    this.pyFileCounts.set(file.path, scanPython(text));
  }

  async scanVault() {
    this.fileStats.clear();
    this.pyFileCounts.clear();
    const skip = new Set([this.settings.templatesFile, this.settings.exerciseFile]);
    const files = this.app.vault.getMarkdownFiles().filter((f) => !skip.has(f.path));
    await Promise.all(files.map((f) => this.scanFile(f)));
    this.rebuild();
  }

  async loadUserTemplates() {
    const f = this.app.vault.getAbstractFileByPath(this.settings.templatesFile);
    const user = f instanceof TFile ? parseTemplates(await this.app.vault.read(f)) : [];
    this.templates = mergeTemplates(this.defaultTemplates, user);
  }

  // \ex1.19 templates: one per IMO26 exercise, generated into the vault
  // (docs/imo26-coverage/exercise_templates.py) since they hold book text.
  async loadExercises() {
    const f = this.app.vault.getAbstractFileByPath(this.settings.exerciseFile);
    this.exercises = f instanceof TFile
      ? parseTemplates(await this.app.vault.read(f)).filter((t) => /^ex\d/.test(t.name)).map((t) => ({ ...t, source: "exercise" }))
      : [];
  }

  // Asks for the template's math inputs (prefilled from ```vars), then inserts.
  insertTextTemplate(editor, start, end, name, route) {
    const vars = this.settings.varsEnabled ? parseVars(editor.getValue()) : [];
    const questions = this.settings.askInputs ? textQuestions(route.body, vars, (v) => toLatex(v)) : [];
    if (!questions.length) return insertTemplate(editor, start, end, route.body);
    new TextInputsModal(this, name, route, questions, (answers) =>
      insertTemplate(editor, start, end, fillTextAnswers(route.body, answers))).open();
  }

  async openTemplatesFile() {
    const path = this.settings.templatesFile;
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) f = await this.app.vault.create(path, DEFAULT_TEMPLATES_MD);
    await this.app.workspace.getLeaf(true).openFile(f);
  }

  buildDefaultTemplates() {
    const imo = this.settings.imo26 ? parseTemplates(IMO26_TEMPLATES_MD) : [];
    this.defaultTemplates = [...parseTemplates(DEFAULT_TEMPLATES_MD), ...imo];
  }

  rankPySnippets(query) {
    const picks = Object.fromEntries(Object.entries(this.settings.templatePicks)
      .filter(([k]) => k.startsWith("py:")).map(([k, n]) => [k.slice(3), n]));
    return rankPySnippets(query, PY_SNIPPETS, picks);
  }

  rankTemplates(query) {
    return rankTemplates(query, this.templates, this.settings.templatePicks);
  }

  // Everything the plain-text popup offers for `raw` (text after the \).
  textSuggestions(raw) {
    const out = [];
    const word = raw.match(/^[a-zA-Z]+$/) ? raw : null;
    const rq = this.settings.imo26 ? parseRefQuery(raw) : null;
    // With \def, \thm, ... only templates *named* like that, so the
    // references aren't buried under "(Def 1.10)" description matches.
    const keep = (t) => !rq || t.name.toLowerCase().startsWith(word.toLowerCase());
    if (word) for (const t of this.rankTemplates(word)) if (keep(t)) out.push({ type: "template", t });
    const eq = this.settings.imo26 ? exerciseQuery(raw) : null;
    if (eq) for (const t of rankExercises(eq, this.exercises, this.settings.templatePicks)) out.push({ type: "template", t });
    if (rq) for (const ref of rankRefs(IMO26_REFS, rq, this.settings.refPicks)) out.push({ type: "ref", ref });
    return out;
  }

  // Link target for references, if that note exists in the vault.
  refLinkTarget() {
    if (!this.settings.refAsLink) return null;
    const f = this.app.vault.getAbstractFileByPath(this.settings.refNote);
    return f instanceof TFile ? f.basename : null;
  }

  rebuild() {
    this.stats = mergeStats(this.fileStats.values());
    this.pyCounts = mergeCounts(this.pyFileCounts.values());
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

    new Setting(containerEl).setName("Math popup").setHeading();

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
      .setName("Max suggestions")
      .addSlider((sl) => sl.setLimits(5, 40, 1).setValue(s.maxSuggestions).setDynamicTooltip()
        .onChange(async (v) => { s.maxSuggestions = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Note variables").setHeading();

    new Setting(containerEl)
      .setName("Enable @variables")
      .setDesc("Define values once in a ```vars block (A = [[1, 2], [3, 4]], n = 5, f = x^2 + 3x). Type @A to insert it: LaTeX in math, $A = ...$ in text, Python in python code blocks. Matrices also show up in the matrix fill list.")
      .addToggle((t) => t.setValue(s.varsEnabled).onChange(async (v) => { s.varsEnabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Python style")
      .setDesc("How matrices and fractions are written in Python. @A at the start of a line inserts A = ... .")
      .addDropdown((d) => d
        .addOption("sympy", "SymPy: sp.Matrix, sp.Rational (exact)")
        .addOption("numpy", "NumPy: np.array")
        .addOption("plain", "Plain lists")
        .setValue(s.pythonStyle)
        .onChange(async (v) => { s.pythonStyle = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Python").setHeading();

    new Setting(containerEl)
      .setName("Python snippets and completion")
      .setDesc("Inside ```python blocks: \\hessian, \\kkt, \\intersection, \\gauss, ... insert a whole computation with this note's variables already filled in, and sp. / np. / plt. complete with what your notes use most.")
      .addToggle((t) => t.setValue(s.pythonEnabled).onChange(async (v) => { s.pythonEnabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Ask for inputs first")
      .setDesc("After picking a snippet (\\gradient, \\hessian, ...), a form asks for everything it needs (function, point, direction, ...), prefilled from your vars block, and inserts finished code. Text templates (\\proof, \\ex1.19, ...) ask for their math inputs the same way. Off: insert with Tab stops instead.")
      .addToggle((t) => t.setValue(s.askInputs).onChange(async (v) => { s.askInputs = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Proof and question templates").setHeading();

    new Setting(containerEl)
      .setName("Enable templates")
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

    new Setting(containerEl).setName("Course pack: IMO26").setHeading();

    new Setting(containerEl)
      .setName("IMO26 problem templates and references")
      .setDesc("For N. Lauritzen, Introduction to Mathematics and Optimization (IMO26). Adds templates for every exercise type (\\gauss, \\kkt, \\lagrange, ...) and the book's definitions, theorems, propositions, lemmas, corollaries and remarks: \\def4.26, \\thmcauchy, \\ref convex function.")
      .addToggle((t) => t.setValue(s.imo26).onChange(async (v) => {
        s.imo26 = v;
        await this.plugin.saveSettings();
        this.plugin.buildDefaultTemplates();
        this.plugin.loadUserTemplates();
      }));

    new Setting(containerEl)
      .setName("Exercise templates file")
      .setDesc("Vault note with one template per exercise: \\ex1.19, or \\ex followed by words from the exercise. Generate it with docs/imo26-coverage/exercise_templates.py (it holds book text, so it is not shipped with the plugin).")
      .addText((t) => t.setValue(s.exerciseFile).onChange(async (v) => {
        s.exerciseFile = v.trim() || DEFAULT_SETTINGS.exerciseFile;
        await this.plugin.saveSettings();
        this.plugin.loadExercises();
      }));

    new Setting(containerEl)
      .setName("Add the title to references")
      .setDesc("Off: \"Definition 4.26\" exactly as the book cites it. On: \"Definition 4.26 (Convex function)\".")
      .addToggle((t) => t.setValue(s.refWithTitle).onChange(async (v) => { s.refWithTitle = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Link references to your notes")
      .setDesc("Insert references as links to the matching heading in this note (plain text if the note or heading is missing).")
      .addToggle((t) => t.setValue(s.refAsLink).onChange(async (v) => { s.refAsLink = v; await this.plugin.saveSettings(); }))
      .addText((t) => t.setPlaceholder("Folder/Note.md").setValue(s.refNote).onChange(async (v) => { s.refNote = v.trim(); await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Learning").setHeading();

    const learned = Object.keys(s.boosts).length + Object.keys(s.fillPicks).length + Object.keys(s.templatePicks).length
      + Object.keys(s.routePicks).length + Object.keys(s.refPicks).length;
    new Setting(containerEl)
      .setName("Forget picks")
      .setDesc(`Reset what the popups learned from your selections (${learned} entries).`)
      .addButton((b) => b.setButtonText("Reset").onClick(async () => {
        s.boosts = {};
        s.fillPicks = {};
        s.templatePicks = {};
        s.routePicks = {};
        s.refPicks = {};
        await this.plugin.saveSettings();
        this.display();
      }));
  }
}
