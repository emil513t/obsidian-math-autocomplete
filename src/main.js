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
import IMO26_NUMBERED from "./refs/imo26.json";
import IMO26_EXTRA from "./refs/imo26-extra.json";
// Numbered items (Definition 4.26, ...), plus sections and the definitions the
// book makes in running text ("positive definite", Section 3.7.1).
const IMO26_REFS = [...IMO26_NUMBERED, ...IMO26_EXTRA];
import { parseRefQuery, rankRefs, formatRef, kindLabel, refKey, refExcerpt } from "./refs.js";
import { envOf, isMatrixEnv } from "./variants.js";
import { parseVars, parseBlock, matchVars, fenceLanguage, insertFor, toLatex, toPython, latexName, displayName, PY_LANGS, fnExpr } from "./vars.js";
import { parseGraph, drawScene, GRAPH_KEYWORDS, graphQuery, graphOptions } from "./graph.js";
import { rankObjects, objectContext, sizedMatrixOptions, findDefinitions, resolveAnswers } from "./objects.js";
import { explainItems, pyExplainLines, textExplain, TEMPLATE_REFS, pyRefs } from "./explain.js";
import { resolveLabel, noteFunctions, notePoints } from "./textlink.js";
import { evidencePy } from "./evidence.js";
import { workFor } from "./work.js";
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
    const explain = this.plugin.pyExplainer(t);
    const put = (v, answers) => insertTemplate(editor, start, end, buildPySnippet(v, { ...state, answers, explain }).text);
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
// Inside ```graph: the drawing commands and the note's variables (with what
// each one will draw).
class GraphSuggest extends EditorSuggest {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.limit = 25;
  }

  onTrigger(cursor, editor) {
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const docBefore = editor.getRange({ line: 0, ch: 0 }, cursor);
    if (fenceLanguage(docBefore) !== "graph") return null;
    // A plain word, or \word like everywhere else (\region, \tangent, or \ alone).
    const m = before.match(/(?:^|[\s,(])(\\?)([A-Za-z][\w]*:?)$/) || before.match(/(?:^|[\s,(])(\\)()$/) || (before.trim() === "" ? [before, "", ""] : null);
    if (!m) return null;
    this.vars = parseVars(editor.getValue());
    const query = m[2];
    if (!this.getSuggestions({ query }).length) return null;
    return { start: { line: cursor.line, ch: cursor.ch - query.length - m[1].length }, end: cursor, query };
  }

  getSuggestions(ctx) {
    const q = ctx.query.toLowerCase();
    const kws = GRAPH_KEYWORDS.filter((k) => k.word.toLowerCase().startsWith(q)).map((k) => ({ kind: "kw", ...k }));
    const what = (v) => {
      if (v.kind === "relation") return /le|ge|<|>/.test(String(v.op)) ? "shaded half-plane (list several for their region)" : "curve";
      if (v.kind === "vector") return v.tuple ? "point" : "point / vector";
      if (v.kind === "matrix") return v.value[0]?.length === 2 ? "rows as points" : "matrix (not drawable)";
      if (v.kind === "scalar") { try { const n = fnExpr(v, this.vars).vars.length; return n === 1 ? "graph y = f(x)" : n === 2 ? "level curves" : n ? `${n} variables (not drawable)` : "number"; } catch (_) { return "?"; } }
      return v.kind;
    };
    const vs = [...(this.vars || new Map()).values()].filter((v) => !v.error && v.name.toLowerCase().startsWith(q)).map((v) => ({ kind: "var", word: v.name, insert: v.name, desc: what(v), v }));
    return [...vs, ...kws];
  }

  renderSuggestion(s, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    const top = left.createDiv({ cls: "mac-template-top" });
    top.createEl("code", { text: s.word });
    top.createSpan({ cls: "mac-tag", text: s.kind === "var" ? `your variable: ${s.desc}` : s.desc });
    if (s.hint) left.createDiv({ cls: "mac-template-snippet", text: s.hint });
  }

  selectSuggestion(s) {
    const { editor, start, end } = this.context;
    editor.replaceRange(s.insert, start, end);
    editor.setCursor({ line: start.line, ch: start.ch + s.insert.length });
  }
}

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
  objectsEnabled: true,
  varsKeepFormula: false,
  pythonStyle: "sympy",
  pythonEnabled: true,
  askInputs: true,
  explainRefs: true,
  textEvidence: true,
  showWork: true,
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
    const kind = v.kind === "matrix" ? `${v.value.length}×${v.value[0].length} matrix`
      : v.kind === "vector" && v.tuple ? "point" : v.params ? "function" : v.kind;
    top.createSpan({ cls: "mac-tag", text: v.formula ? `${kind} = ${v.formula}` : kind });
    if (v.source) top.createSpan({ cls: "mac-tag", text: v.source === "python" ? "from a python block" : "from the note's math" });
    if (v.error) top.createSpan({ cls: "mac-tag mac-error", text: v.error });
    if (this.state.kind === "python") {
      left.createDiv({ cls: "mac-template-snippet", text: toPython(v, this.plugin.settings.pythonStyle) });
    }
    if (!this.plugin.settings.showPreview) return;
    const right = el.createDiv({ cls: "mac-preview" });
    try {
      right.appendChild(renderMath(`${displayName(v)} = ${toLatex(v)}`, false));
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
    this.limit = 120; // \definition lists all 99 definitions
  }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.templatesEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    // \word, \def4.26, or \ref followed by free search words.
    const m = before.match(/(?:^|[\s(>*_[])\\((?:ref|ex|definition|theorem|proposition|lemma|corollary|remark|section)(?:\s[^\\$\n]{0,60})?|[a-zA-Z]+[\w.]*)$/);
    if (!m) return null;
    if (cursorContext(editor.getRange({ line: 0, ch: 0 }, cursor)) !== "text") return null;
    this.plugin.textVars = graphQuery(m[1]) ? parseVars(editor.getValue()) : null;
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
      if (r.kind === "term") top.createSpan({ cls: "mac-tag", text: "definition in the text" });
      top.createSpan({ cls: "mac-uses", text: `p. ${r.page}` });
      // A hit inside the statement: show that part, with the word marked.
      const ex = refExcerpt(r, item.q);
      if (ex) {
        const div = left.createDiv({ cls: "mac-template-snippet" });
        const at = ex.text.toLowerCase().indexOf(ex.word);
        div.appendText(ex.before + ex.text.slice(0, at));
        div.createEl("mark", { text: ex.text.slice(at, at + ex.word.length) });
        div.appendText(ex.text.slice(at + ex.word.length) + ex.after);
      } else left.createDiv({ cls: "mac-template-snippet", text: r.text });
      return;
    }
    if (item.type === "graph") {
      const g = item.g;
      top.createEl("code", { text: "\\graph" });
      top.createSpan({ cls: "mac-template-desc", text: g.label });
      if (g.desc) top.createSpan({ cls: "mac-tag", text: g.desc });
      left.createDiv({ cls: "mac-template-snippet", text: g.lines.join(" · ") });
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
      s.refPicks[refKey(r)] = (s.refPicks[refKey(r)] || 0) + 1;
      this.plugin.saveSettings();
      return;
    }
    if (item.type === "graph") {
      // The block goes on its own lines; the cursor ends on its last line.
      const pre = editor.getLine(start.line).slice(0, start.ch).trim() ? "\n" : "";
      const fence = "`".repeat(3);
      const text = `${pre}${fence}graph\n${item.g.lines.join("\n")}\n${fence}\n`;
      editor.replaceRange(text, start, end);
      const last = start.line + (pre ? 1 : 0) + item.g.lines.length;
      editor.setCursor({ line: last, ch: editor.getLine(last).length });
      return;
    }
    const t = item.t;
    const picks = this.plugin.settings.templatePicks;
    picks[t.name] = (picks[t.name] || 0) + 1;
    this.plugin.saveSettings();
    if (t.variants.length > 1) {
      // Like the matrix fills: second step picks the solution route.
      new RouteModal(this.plugin, t, (v) => this.plugin.insertTextTemplate(editor, start, end, t.name, v, t.desc)).open();
      return;
    }
    this.plugin.insertTextTemplate(editor, start, end, t.name, { label: "", body: t.body }, t.desc);
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
  // pickers: { fns, points, ask(ctx) } to choose which of the note's
  // functions and points the computed fields come from.
  constructor(plugin, name, route, questions, onDone, pickers = null) {
    super(plugin.app);
    this.name = name;
    this.route = route;
    this.questions = questions;
    this.onDone = onDone;
    this.pickers = pickers;
    this.ctx = {};
    this.answers = Object.fromEntries(questions.map((q) => [q.key, q.value]));
  }

  // Refill the fields computed from the picked function / point.
  repick(change, fields, descs) {
    Object.assign(this.ctx, change);
    const fresh = new Map(this.pickers.ask(this.ctx).map((q) => [q.key, q]));
    this.questions.forEach((q, i) => {
      const n = fresh.get(q.key);
      if (!n || !n.desc) return; // a plain variable or a blank: keep what was typed
      q.value = n.value;
      q.desc = n.desc;
      this.answers[q.key] = n.value;
      fields[i].setValue(n.value);
      descs[i].setText(n.desc);
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("mac-inputs");
    const title = `\\${this.name}${this.route.label ? ": " + this.route.label : ""}`;
    if (this.setTitle) this.setTitle(title);
    else contentEl.createEl("h3", { text: title });
    const fields = [];
    const descs = [];
    const p = this.pickers;
    const computed = this.questions.some((q) => q.desc);
    if (p && computed && p.fns.length > 1) {
      new Setting(contentEl).setName("Function").setDesc("The fields below are computed from this function.")
        .addDropdown((d) => {
          for (const n of p.fns) d.addOption(n, n);
          d.setValue(p.fns.includes("f") ? "f" : p.fns[0]);
          d.onChange((n) => this.repick({ fn: n }, fields, descs));
        });
    }
    if (p && computed && p.points.length > 1) {
      new Setting(contentEl).setName("Point").setDesc("Used for v0 and for values at a point.")
        .addDropdown((d) => {
          for (const n of p.points) d.addOption(n, n);
          d.onChange((n) => this.repick({ point: n }, fields, descs));
        });
    }
    for (const q of this.questions) {
      const s = new Setting(contentEl)
        .setName(q.label)
        .setDesc(q.desc || (q.from ? `from @${q.from} in your vars block` : ""))
        .addText((t) => {
          t.setValue(q.value);
          t.inputEl.addClass("mac-inputs-field");
          t.onChange((val) => { this.answers[q.key] = val; });
          t.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); this.submit(); }
          });
          fields.push(t);
        });
      descs.push(s.descEl);
    }
    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Leave all as Tab stops").onClick(() => this.submit(true)))
      .addButton((b) => b.setButtonText("Insert").setCta().onClick(() => this.submit()));
    contentEl.createDiv({ cls: "mac-inputs-help", text: "LaTeX, e.g. x^2 + 1, \\mathbb{R}, (1, 2), or the name of one of your variables (g, @A) to use its value. Empty fields stay as Tab stops. Enter inserts, Esc cancels." });
    setTimeout(() => { fields[0].inputEl.focus(); fields[0].inputEl.select(); }, 0);
  }

  submit(keepBlanks = false) {
    this.close();
    this.onDone(keepBlanks ? {} : this.answers, this.questions, this.ctx);
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
    if (fill.ask) {
      // Sized fills (m×n, n×n identity, ...) ask for their sizes first.
      new AskModal(this.plugin, `\\${this.name}: ${fill.label}`, fill.ask, (answers) => {
        const b = fill.build(answers);
        const firstSlot = b.value.match(/\\begin\{\w+\}(?:\{[^}]*\})? /);
        this.replaceWith({ text: b.value, cursor: b.blank && firstSlot ? firstSlot[0].length : b.value.length });
      }).open();
      return;
    }
    this.replaceWith(fill);
  }

  replaceWith(fill) {
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

// Asks for a few values (sizes m and n, a point, a function, ...). onDone may
// throw; the error is shown and the form stays open.
class AskModal extends Modal {
  constructor(plugin, title, questions, onDone) {
    super(plugin.app);
    this.title = title;
    this.questions = questions;
    this.onDone = onDone;
    this.answers = Object.fromEntries(questions.map((q) => [q.key, q.value ?? ""]));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("mac-inputs");
    if (this.setTitle) this.setTitle(this.title);
    else contentEl.createEl("h3", { text: this.title });
    const fields = [];
    for (const q of this.questions) {
      new Setting(contentEl)
        .setName(q.label)
        .setDesc(q.hint ? `e.g. ${q.hint}` : "")
        .addText((t) => {
          t.setValue(q.value ?? "").setPlaceholder(q.hint || "");
          t.inputEl.addClass("mac-inputs-field");
          t.onChange((val) => { this.answers[q.key] = val; });
          t.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); this.submit(); }
          });
          fields.push(t);
        });
    }
    this.errorEl = contentEl.createDiv({ cls: "mac-inputs-error" });
    new Setting(contentEl).addButton((b) => b.setButtonText("Insert").setCta().onClick(() => this.submit()));
    contentEl.createDiv({ cls: "mac-inputs-help", text: "LaTeX or plain: x^2 y + \\sin y, \\frac{1}{2}, (1, 2), [[1, 2], [3, 4]]. Enter inserts, Esc cancels." });
    setTimeout(() => { fields[0]?.inputEl.focus(); fields[0]?.inputEl.select(); }, 0);
  }

  submit() {
    try {
      this.onDone(this.answers);
      this.close();
    } catch (e) {
      this.errorEl.setText(e.message || String(e));
      this.errorEl.addClass("mac-shake");
      setTimeout(() => this.errorEl.removeClass("mac-shake"), 300);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Second step after \hessian, \inverse, \set, ...: what to build it from.
// Options computed from the note's variables first.
class ObjectModal extends SuggestModal {
  constructor(plugin, obj, options, onPick, vars = new Map()) {
    super(plugin.app);
    this.plugin = plugin;
    this.obj = obj;
    this.options = options;
    this.onPick = onPick;
    this.vars = vars;
    this.setPlaceholder(`\\${obj.name}: ${obj.desc} (Esc keeps what you typed)`);
  }

  getSuggestions(query) {
    const q = query.toLowerCase();
    const picks = this.plugin.settings.fillPicks;
    return this.options
      .map((o, i) => ({ o, i, n: picks[`obj:${this.obj.name}:${o.id.replace(/:.*$/, "")}`] || 0 }))
      .filter((x) => x.o.label.toLowerCase().includes(q))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.o);
  }

  renderSuggestion(o, el) {
    el.addClass("mac-item");
    const left = el.createDiv({ cls: "mac-left mac-template-left" });
    left.createDiv({ cls: "mac-template-top" }).createSpan({ text: o.label });
    if (o.error) left.createDiv({ cls: "mac-template-snippet mac-error", text: o.error });
    else if (o.formula && this.plugin.settings.varsKeepFormula) left.createDiv({ cls: "mac-template-snippet", text: o.formula });
    if (!o.value || !this.plugin.settings.showPreview) return;
    const right = el.createDiv({ cls: "mac-preview mac-fill-preview" });
    try {
      right.appendChild(renderMath(o.value, false));
      finishRenderMath();
    } catch (_) {
      // Preview only.
    }
  }

  onChooseSuggestion(o) {
    if (o.error) { new Notice(`\\${this.obj.name}: ${o.error}`); return; }
    const key = `obj:${this.obj.name}:${o.id.replace(/:.*$/, "")}`;
    const picks = this.plugin.settings.fillPicks;
    picks[key] = (picks[key] || 0) + 1;
    this.plugin.saveSettings();
    if (o.ask) {
      new AskModal(this.plugin, `\\${this.obj.name}: ${o.label}`, o.ask, (answers) => {
        // A variable's name typed in any field means that variable.
        const res = resolveAnswers(o.ask, answers, this.vars);
        let built;
        try { built = o.build(res); } catch (e) {
          const empty = o.ask.filter((q) => !String(res[q.key] ?? "").trim()).map((q) => q.label);
          new Notice(`\\${this.obj.name}: ${empty.length ? `fill in: ${empty.join(", ")}` : e.message}`);
          return;
        }
        this.onPick(o, { ...built, answers: res });
      }).open();
      return;
    }
    this.onPick(o, o);
  }
}

// A free name for a new vars line: H, then H_2, H_3, ...
function freeName(base, vars) {
  if (!vars.has(base)) return base;
  for (let i = 2; ; i++) if (!vars.has(`${base}_${i}`)) return `${base}_${i}`;
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
    // Math, or a ```vars block (values there are LaTeX too).
    const inVars = this.plugin.settings.varsEnabled && fenceLanguage(docBefore) === "vars";
    if (!inVars && !isCursorInMath(docBefore)) return null;
    this.where = inVars ? "vars" : "math";

    // Fully typed and nothing longer to offer: stay out of the way so Enter
    // still makes a newline after e.g. \alpha.
    // The note's variables too: \H inserts H's value (LaTeX Suite turns
    // @a, @b, @D, ... into Greek letters in math, so @ alone is not enough).
    this.vars = this.plugin.settings.varsEnabled ? parseVars(editor.getValue()) : new Map();
    const results = [...this.varItems(m[2]), ...this.plugin.mathSuggestions(m[2], 2, this.where)];
    if (!results.length) return null;
    if (results.length === 1 && results[0].kind !== "object" && results[0].insert === "\\" + m[2]) return null;

    return {
      start: { line: cursor.line, ch: cursor.ch - m[2].length - 1 },
      end: cursor,
      query: m[2],
    };
  }

  getSuggestions(ctx) {
    return [...this.varItems(ctx.query), ...this.plugin.mathSuggestions(ctx.query, this.plugin.settings.maxSuggestions, this.where)];
  }

  varItems(query) {
    if (!this.vars || !this.vars.size) return [];
    // In a vars block, other vars are used by name (H = hessian(f)).
    return matchVars(this.vars, query).filter((v) => v.name.startsWith(query)).slice(0, 4)
      .map((v) => ({ kind: "var", v, insert: this.where === "vars" || v.error ? v.name : toLatex(v) }));
  }

  renderSuggestion(item, el) {
    el.addClass("mac-item");
    if (item.kind === "var") {
      const v = item.v;
      el.addClass("mac-template");
      const left = el.createDiv({ cls: "mac-left mac-template-left" });
      const top = left.createDiv({ cls: "mac-template-top" });
      top.createEl("code", { text: "\\" + v.name });
      top.createSpan({ cls: "mac-tag", text: "your variable" + (v.formula ? ` = ${v.formula}` : "") });
      if (v.error) top.createSpan({ cls: "mac-tag mac-error", text: v.error });
      if (this.plugin.settings.showPreview && !v.error) {
        const right = el.createDiv({ cls: "mac-preview" });
        try { right.appendChild(renderMath(`${displayName(v)} = ${item.insert}`, false)); finishRenderMath(); } catch (_) { /* decoration */ }
      }
      return;
    }
    if (item.kind === "object") {
      el.addClass("mac-template");
      const left = el.createDiv({ cls: "mac-left mac-template-left" });
      const top = left.createDiv({ cls: "mac-template-top" });
      top.createEl("code", { text: "\\" + item.obj.name });
      top.createSpan({ cls: "mac-template-desc", text: item.obj.desc });
      top.createSpan({ cls: "mac-tag", text: this.where === "vars" ? "new variable" : "build" });
      return;
    }
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
    const where = this.where;
    if (item.kind === "object") {
      this.plugin.pickObject(editor, start, end, item.obj, where);
      return;
    }
    if (item.kind === "var") {
      editor.replaceRange(item.insert, start, end);
      editor.setCursor(editor.offsetToPos(editor.posToOffset(start) + item.insert.length));
      return;
    }
    const indent = editor.getLine(start.line).match(/^\s*/)[0];
    const env = envOf(item.insert);
    // In a vars block, a matrix/cases on an empty line gets a name: A = ...
    const lineBefore = editor.getLine(start.line).slice(0, start.ch);
    const prefix = where === "vars" && env && (isMatrixEnv(env) || env === "cases") && !lineBefore.trim()
      ? `${freeName(env === "cases" ? "f" : "A", parseVars(editor.getValue()))} = ` : "";
    const { text, offset } = indentInsert(
      item.insert,
      item.kind === "atom" ? item.insert.length : cursorOffset(item.insert),
      indent,
    );

    editor.replaceRange(prefix + text, start, end);
    const from = editor.posToOffset(start) + prefix.length;
    editor.setCursor(editor.offsetToPos(from + offset));
    this.plugin.recordPick(item.insert);

    if (item.kind !== "builtin" || !this.plugin.settings.askFill) return;
    let fills = fillsFor(item.name, item.insert, this.plugin.stats.atoms);
    if (fills && env && isMatrixEnv(env)) {
      // The note's own matrices and vectors first: the exercise's values.
      const mine = [...parseVars(editor.getValue()).values()]
        .filter((v) => v.kind === "matrix" || v.kind === "vector")
        .map((v) => {
          const t = toLatex(v, env);
          return { id: "var:" + v.name, label: `${v.name} (this note's variable)`, text: t, cursor: t.length, preview: t };
        });
      // Then any size: m×n blank / indexed / zeros, n×n identity, ... (asks m, n).
      const sized = sizedMatrixOptions(env).map((o) => ({ ...o, preview: null }));
      fills = [...mine, ...fills.slice(0, 2), ...sized, ...fills.slice(2)];
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
    this.registerEditorSuggest(new GraphSuggest(this));

    // Reading view: show the ```vars block as rendered math.
    // ```graph: draw functions, regions, points, ... from the note's variables.
    this.registerMarkdownCodeBlockProcessor("graph", async (src, el, ctx) => {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      const doc = file instanceof TFile ? await this.app.vault.cachedRead(file) : "";
      const vars = parseVars(doc);
      const scene = parseGraph(src, vars);
      const box = el.createDiv({ cls: "mac-graph" });
      const canvas = box.createEl("canvas");
      const css = getComputedStyle(document.body);
      const v = (name, d) => css.getPropertyValue(name).trim() || d;
      const theme = { fg: v("--text-normal", "#222"), bg: v("--background-primary", "#fff"), muted: v("--text-muted", "#888"), faint: v("--background-modifier-border", "#ddd") };
      const draw = () => {
        const W = Math.max(280, Math.min(900, box.clientWidth || 600));
        const H = Math.round(W * 0.62);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
        const g = canvas.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        try { drawScene(g, scene, W, H, theme); } catch (e) { g.fillStyle = theme.fg; g.fillText(`Can't draw: ${e.message}`, 10, 20); }
      };
      draw();
      if (typeof ResizeObserver !== "undefined") {
        let last = 0;
        const ro = new ResizeObserver(() => { const w = box.clientWidth; if (Math.abs(w - last) > 4) { last = w; draw(); } });
        ro.observe(box);
      }
      for (const err of scene.errors) box.createDiv({ cls: "mac-graph-error", text: err });
    });

    this.registerMarkdownCodeBlockProcessor("vars", (src, el) => {
      const vars = parseBlock(src);
      if (!vars.length) { el.createEl("pre", { text: src }); return; }
      const box = el.createDiv({ cls: "mac-vars" });
      for (const v of vars) {
        const row = box.createDiv({ cls: "mac-vars-row" });
        if (v.error) {
          row.createEl("code", { text: `${v.name} = ${v.value}` });
          row.createSpan({ cls: "mac-tag mac-error", text: v.error });
          continue;
        }
        try {
          row.appendChild(renderMath(`${displayName(v)} = ${toLatex(v)}`, true));
        } catch (_) {
          row.createEl("code", { text: `${v.name} = ${toLatex(v)}` });
        }
        if (v.formula) row.createSpan({ cls: "mac-tag", text: v.formula });
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
      id: "vars-from-note",
      name: "Create vars from this note's math ($f(x) = ...$, $A = ...$)",
      editorCallback: (editor) => this.createVarsFromNote(editor),
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
  insertTextTemplate(editor, start, end, name, route, desc = "") {
    const vars = this.settings.varsEnabled ? parseVars(editor.getValue()) : [];
    const isMap = vars instanceof Map;
    // ctx: the function and point picked in the form (default: f, the first point).
    const ask = (ctx = {}) => textQuestions(route.body, vars, (v) => toLatex(v), isMap ? (label) => resolveLabel(label, vars, ctx) : null);
    const questions = this.settings.askInputs ? ask() : [];
    const pickers = isMap ? { fns: noteFunctions(vars).map((v) => v.name), points: notePoints(vars).map((v) => v.name), ask } : null;
    // Typing a variable's name (g, @A) in a field inserts its value, or what
    // the field computes from it: "g" in the Hessian field gives g's Hessian.
    const byName = (q, answer, ctx) => {
      const m = isMap && answer !== q.value ? answer.trim().match(/^@?([A-Za-z][\w']*)$/) : null;
      const v = m && vars.get(m[1]);
      if (!v || v.error) return answer;
      const isFn = noteFunctions(vars).includes(v);
      const isPt = notePoints(vars).includes(v);
      const r = isFn || isPt ? resolveLabel(q.label, vars, { ...ctx, ...(isFn ? { fn: v.name } : { point: v.name }) }) : null;
      return r && r.value !== q.label ? r.value : toLatex(v);
    };
    // A folded callout with the definitions and theorems the template cites
    // (general templates like \induction get the book's matching ones).
    const extra = this.settings.imo26 ? TEMPLATE_REFS[name] || "" : "";
    const notes = this.settings.explainRefs ? textExplain(explainItems([desc, route.label, route.body, extra], this.settings.imo26 ? IMO26_REFS : [])) : "";
    if (!questions.length) return insertTemplate(editor, start, end, route.body + notes);
    new TextInputsModal(this, name, route, questions, (answers, qs, ctx) => {
      // A function or point typed into a computed field switches the whole
      // form to it, so "g" in the Hessian field also makes the text say g.
      const typed = (q) => answers[q.key] && answers[q.key] !== q.value && answers[q.key].trim().replace(/^@/, "");
      const fnPick = qs.map((q) => q.desc && typed(q)).find((n) => n && noteFunctions(vars).some((v) => v.name === n));
      const ptPick = qs.map((q) => q.desc && typed(q)).find((n) => n && notePoints(vars).some((v) => v.name === n));
      if (fnPick || ptPick) {
        ctx = { ...ctx, ...(fnPick ? { fn: fnPick } : {}), ...(ptPick ? { point: ptPick } : {}) };
        const fresh = new Map(ask(ctx).map((q) => [q.key, q]));
        answers = { ...answers };
        for (const q of qs) {
          const n = fresh.get(q.key);
          if (q.desc && n && n.desc && (answers[q.key] === q.value || typed(q) === fnPick || typed(q) === ptPick)) answers[q.key] = n.value;
        }
      }
      const done = Object.fromEntries(qs.map((q) => [q.key, answers[q.key] ? byName(q, answers[q.key], ctx) : answers[q.key]]));
      // Python evidence for the blanks that kept their computed value.
      const computed = qs.filter((q) => q.desc && done[q.key] && resolveLabel(q.label, vars, ctx)?.value === done[q.key]).map((q) => q.label);
      const code = this.settings.textEvidence && computed.length ? evidencePy(computed, vars, ctx) : "";
      const evidence = code ? `\n\n\`\`\`python\n${code}\n\`\`\`\n` : "";
      insertTemplate(editor, start, end, fillTextAnswers(route.body, done, qs) + evidence + notes);
    }, pickers).open();
  }

  // Python: print what is computed, the values used and the cited references.
  pyExplainer(t) {
    if (!this.settings.explainRefs) return null;
    const refs = this.settings.imo26 ? IMO26_REFS : [];
    return (used, route) => pyExplainLines({
      title: t.desc,
      label: route.label,
      items: explainItems([t.desc, route.label, pyRefs(t.name, route.label)], refs),
      inputs: used.map((u) => u.input),
    });
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
    // \graph, \plot, \draw, \region, \contour ...: graphs from the note's variables.
    const gq = word ? graphQuery(word) : null;
    if (gq) for (const g of graphOptions(this.textVars || new Map(), gq)) out.push({ type: "graph", g });
    const rq = this.settings.imo26 ? parseRefQuery(raw) : null;
    // With \def, \thm, ... only templates *named* like that, so the
    // references aren't buried under "(Def 1.10)" description matches.
    const keep = (t) => !rq || t.name.toLowerCase().startsWith(word.toLowerCase());
    if (word) for (const t of this.rankTemplates(word)) if (keep(t)) out.push({ type: "template", t });
    const eq = this.settings.imo26 ? exerciseQuery(raw) : null;
    if (eq) for (const t of rankExercises(eq, this.exercises, this.settings.templatePicks)) out.push({ type: "template", t });
    if (rq) for (const ref of rankRefs(IMO26_REFS, rq, this.settings.refPicks)) out.push({ type: "ref", ref, q: rq.q });
    // A plain word (\convex, \softmax, \lipschitz) also offers the book's
    // definitions, results and sections with that word in their title or
    // anywhere in their statement (title hits first).
    if (!rq && !eq && word && word.length >= 4 && this.settings.imo26) {
      for (const ref of rankRefs(IMO26_REFS, { kind: null, q: word, wordStart: true }, this.settings.refPicks).slice(0, 12)) out.push({ type: "ref", ref, q: word });
    }
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

  // The math popup: LaTeX commands plus buildable objects (\hessian, \inverse,
  // \set, ...). In a vars block the objects come first.
  mathSuggestions(query, limit, where = "math") {
    const builtins = this.suggest(query, limit);
    if (!this.settings.objectsEnabled) return builtins;
    const objs = rankObjects(query, this.settings.fillPicks)
      .filter((o) => where === "vars" || !o.varsOnly)
      .map((o) => ({ kind: "object", obj: o, name: o.name, insert: "\\" + o.name, uses: 0 }));
    if (!objs.length) return builtins;
    if (where === "vars") return [...objs, ...builtins].slice(0, limit);
    // In math, what you'd type by hand stays on top (\in before \inverse).
    const head = builtins.filter((b) => b.name === query || b.name.length <= query.length + 1).slice(0, 3);
    const rest = builtins.filter((b) => !head.includes(b));
    return [...head, ...objs.slice(0, 6), ...rest].slice(0, Math.max(limit, head.length + Math.min(objs.length, 6)));
  }

  // \hessian, \inverse, ... was picked: choose what to build it from, then insert.
  pickObject(editor, start, end, obj, where) {
    const doc = editor.getValue();
    const vars = parseVars(doc);
    const ctx = objectContext(vars);
    if (obj.name === "fromnote") ctx.found = findDefinitions(doc, parseVars(doc, { implicit: false }));
    const options = obj.options(ctx).filter((o) => where === "vars" || !o.varsOnly);
    const from = editor.posToOffset(start);
    const len = editor.posToOffset(end) - from;
    const s = this.settings;
    s.fillPicks["obj:" + obj.name] = (s.fillPicks["obj:" + obj.name] || 0) + 1;
    this.saveSettings();
    new ObjectModal(this, obj, options, (o, built) => this.insertObject(editor, from, len, obj, o, built, where, vars), vars).open();
  }

  // Puts markdown on the lines after the math the offset is in: after the
  // closing $$ of a display block, or after the line of an inline $..$.
  insertAfterMath(editor, offset, md) {
    const doc = editor.getValue();
    const before = doc.slice(0, offset);
    const display = ((before.match(/\$\$/g) || []).length % 2) === 1;
    let end = offset;
    if (display) {
      const close = doc.indexOf("$$", offset);
      end = close < 0 ? doc.length : close + 2;
    }
    const nl = doc.indexOf("\n", end);
    const at = nl < 0 ? doc.length : nl;
    editor.replaceRange(`\n\n${md}`, editor.offsetToPos(at));
  }

  insertObject(editor, from, len, obj, o, built, where, vars) {
    const startPos = editor.offsetToPos(from);
    const endPos = editor.offsetToPos(from + len);
    const lineBefore = editor.getLine(startPos.line).slice(0, startPos.ch);
    if (where !== "vars" || lineBefore.trim()) {
      if (!built.value) throw new Error("this one only works inside a vars block");
      editor.replaceRange(built.value, startPos, endPos);
      // The worked solution (every step + why) goes under the math block.
      if (where === "math" && this.settings.showWork) {
        const md = workFor(obj.name, o.id, objectContext(vars), built.answers);
        if (md) this.insertAfterMath(editor, from + built.value.length, md);
      }
      editor.setCursor(editor.offsetToPos(from + built.value.length));
      editor.focus();
      return;
    }
    // A new vars line (or several): name = value.
    const indent = lineBefore;
    let lines = built.lines;
    if (!lines) {
      const name = freeName(built.name || o.name || obj.varName || "v", vars);
      const lhs = built.params ? `${name}(${built.params})` : name;
      const value = this.settings.varsKeepFormula && (built.formula || o.formula) ? (built.formula || o.formula) : built.value;
      lines = [`${lhs} = ${value}`];
    }
    const text = lines.join("\n" + indent);
    editor.replaceRange(text, startPos, endPos);
    // On an empty "name = " line (KKT/LP skeletons), land after the first "= ".
    const firstOpen = lines.findIndex((l) => /=\s*$/.test(l));
    const cursor = firstOpen < 0
      ? from + text.length
      : from + lines.slice(0, firstOpen + 1).join("\n" + indent).length;
    editor.setCursor(editor.offsetToPos(cursor));
    editor.focus();
  }

  // Command: put the definitions written in the note's math into a vars block.
  createVarsFromNote(editor) {
    const doc = editor.getValue();
    const found = findDefinitions(doc, parseVars(doc, { implicit: false }));
    if (!found.length) { new Notice("Math Autocomplete: no definitions like $f(x) = ...$ or $A = \\begin{pmatrix}...$ found."); return; }
    const lines = found.map((d) => d.line);
    // Append to the last vars block, or start one at the cursor.
    const re = /^[ \t]*(```|~~~)[ \t]*vars[ \t]*\n([\s\S]*?)^([ \t]*\1[ \t]*)$/gim;
    let m;
    let last = null;
    while ((m = re.exec(doc))) last = m;
    if (last) {
      const closeAt = last.index + last[0].length - last[3].length;
      editor.replaceRange(lines.join("\n") + "\n", editor.offsetToPos(closeAt));
    } else {
      const cur = editor.getCursor();
      editor.replaceRange("```vars\n" + lines.join("\n") + "\n```\n", { line: cur.line, ch: 0 });
    }
    new Notice(`Math Autocomplete: added ${lines.length} variable${lines.length === 1 ? "" : "s"}: ${found.map((d) => d.name).join(", ")}.`);
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
      .setDesc("Define values once in a ```vars block: A = [[1, 2], [3, 4]], f(x, y) = x^2 y, p = (1, 2), S = \\{1, 2\\}, I = [0, 1), g = x + y \\leq 4, cases, and computed ones like H = hessian(f), Ai = A^{-1}, x = A^{-1} b. Type @A to insert it: LaTeX in math, $A = ...$ in text, Python in python code blocks. The math popup works inside the vars block too.")
      .addToggle((t) => t.setValue(s.varsEnabled).onChange(async (v) => { s.varsEnabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Build objects from your variables")
      .setDesc("\\hessian, \\gradient, \\jacobian, \\inverse, \\determinant, \\rref, \\eigenvalues, \\taylor, \\set, \\union, \\interval, \\matrix (any m×n), ... in math or in a vars block: pick what to build it from (your f, A, p, ...) or type sizes and inputs. Computed offline, no AI.")
      .addToggle((t) => t.setValue(s.objectsEnabled).onChange(async (v) => { s.objectsEnabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Keep computed vars as formulas")
      .setDesc("Off: \\hessian in a vars block writes the computed matrix (H = \\begin{pmatrix}...). On: it writes H = hessian(f), which recomputes whenever f changes.")
      .addToggle((t) => t.setValue(s.varsKeepFormula).onChange(async (v) => { s.varsKeepFormula = v; await this.plugin.saveSettings(); }));

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

    new Setting(containerEl)
      .setName("Explain what is used")
      .setDesc("Python snippets first print what they compute, your values (f = ..., A = ...) and the definitions and theorems they use, with the book's statement. Text templates (\\proof, \\hessian, \\ex1.19, ...) get a folded \"Definitions and results used\" callout.")
      .addToggle((t) => t.setValue(s.explainRefs).onChange(async (v) => { s.explainRefs = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Worked solutions in math")
      .setDesc("When you build something in math mode (\\hessian, \\gradient, \\inverse, \\determinant, \\eigenvalues, \\taylor, ...), the answer goes where you typed and the full worked solution, every intermediate step with a sentence explaining it and the book reference, goes under the math block.")
      .addToggle((t) => t.setValue(s.showWork).onChange(async (v) => { s.showWork = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Python evidence for computed text")
      .setDesc("When a text template fills in values computed from your variables (Hessian, gradient, D, definiteness, f(1, 2), base case, ...), a python block that recomputes them with sympy is inserted under the text.")
      .addToggle((t) => t.setValue(s.textEvidence).onChange(async (v) => { s.textEvidence = v; await this.plugin.saveSettings(); }));

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
