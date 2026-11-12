// Text templates (\proof, \showthat, ...) for plain markdown. Pure helpers, no
// Obsidian imports, so they can be unit-tested with plain node.

// Placeholders become ⟨label⟩ in the note: visible, searchable, and unlikely
// to clash with anything the user writes themselves.
export const OPEN = "⟨";
export const CLOSE = "⟩";
export const MARKER_RE = /⟨([^⟨⟩\n]+)⟩/g;

// Parses a templates file: every `## \name` (optionally `— description` or
// `- description`) heading starts a template; the body runs to the next one.
export function parseTemplates(md) {
  const out = [];
  let cur = null;
  const tidy = (lines) => lines.join("\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
  const flush = () => {
    if (!cur) return;
    // `### label` lines split the body into solution routes ("variants").
    // Text before the first ### is a shared intro prepended to every route.
    const intro = [];
    const variants = [];
    for (const line of cur.lines) {
      const v = line.match(/^###\s+(.+?)\s*$/);
      if (v) variants.push({ label: v[1], lines: [] });
      else (variants.length ? variants[variants.length - 1].lines : intro).push(line);
    }
    const pre = tidy(intro);
    cur.variants = variants
      .map((v) => ({ label: v.label, body: [pre, tidy(v.lines)].filter(Boolean).join("\n") }))
      .filter((v) => v.body);
    cur.body = cur.variants.length ? cur.variants[0].body : pre;
    delete cur.lines;
    if (cur.body) out.push(cur);
  };
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const h = line.match(/^##\s+\\([A-Za-z][\w.-]*?)\s*(?:(?:—|–|-|:|\|)\s*(.*))?$/);
    if (h) {
      flush();
      cur = { name: h[1], desc: (h[2] || "").trim(), lines: [] };
    } else if (/^#{1,2}\s/.test(line)) {
      flush();
      cur = null; // Any other h1/h2 ends the current template.
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  flush();
  return out;
}

// User templates override defaults with the same name; new ones are added.
export function mergeTemplates(defaults, user) {
  const map = new Map(defaults.map((t) => [t.name, { ...t, source: "default" }]));
  for (const t of user) map.set(t.name, { ...t, source: "user" });
  return [...map.values()];
}

// {{label}} -> ⟨label⟩
export function expandBody(body) {
  return body.replace(/\{\{\s*([^{}\n]+?)\s*\}\}/g, (_, l) => OPEN + l + CLOSE);
}

export function placeholders(text) {
  return [...text.matchAll(MARKER_RE)].map((m) => ({ label: m[1], from: m.index, to: m.index + m[0].length }));
}

export function rankTemplates(query, templates, picks = {}) {
  const q = query.toLowerCase();
  return templates
    .map((t, i) => {
      const n = t.name.toLowerCase();
      let score = 0;
      if (t.name.startsWith(query)) score = 3;
      else if (n.startsWith(q)) score = 2;
      else if (q.length >= 2 && (n.includes(q) || t.desc.toLowerCase().includes(q))) score = 1;
      return { t, i, score, picked: picks[t.name] || 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.picked - a.picked || a.i - b.i)
    .map((x) => x.t);
}

// Next placeholder to jump to, given the session text and cursor (both
// relative to the session start). dir 1 = forward, -1 = back. Wraps around.
export function nextPlaceholder(text, pos, dir, skip = null) {
  const all = placeholders(text);
  if (!all.length) return null;
  if (dir > 0) return all.find((p) => p.from >= pos && p.from !== skip) || all.find((p) => p.from !== skip) || null;
  const back = all.filter((p) => p.to <= pos && p.from !== skip);
  return back[back.length - 1] || [...all].reverse().find((p) => p.from !== skip) || null;
}

// After the user filled one placeholder with `value`, copy it into every other
// ⟨label⟩ still in `text`. Returns the changes, relative to `text`.
// Labels starting with "_" ({{_}}) are anonymous blanks: never mirrored.
export function mirrorChanges(text, label, value) {
  if (!value || value === OPEN + label + CLOSE || label.startsWith("_")) return [];
  return placeholders(text)
    .filter((p) => p.label === label)
    .map((p) => ({ from: p.from, to: p.to, insert: value }));
}

// Exercise templates (\ex1.19, or \ex followed by words from the exercise).
// Returns null when `raw` is not an exercise query.
export function exerciseQuery(raw) {
  const m = raw.match(/^ex(?:(\d[\d.]*)|\s+(.*)|)$/i);
  if (!m) return null;
  if (m[1] !== undefined) return { num: m[1], words: [] };
  const words = (m[2] || "").toLowerCase().split(/\s+/).filter(Boolean);
  return { num: null, words };
}

export function rankExercises(q, exercises, picks = {}) {
  const hay = (t) => (t.hay ??= (t.name + " " + t.desc + " " + t.body).toLowerCase());
  return exercises
    .map((t, i) => ({ t, i, picked: picks[t.name] || 0 }))
    .filter(({ t }) => {
      if (q.num !== null) {
        const n = t.name.slice(2);
        return n === q.num || n.startsWith(q.num.endsWith(".") ? q.num : q.num + ".") || n.startsWith(q.num);
      }
      return q.words.every((w) => hay(t).includes(w));
    })
    .sort((a, b) => {
      if (q.num !== null) {
        const ea = a.t.name.slice(2) === q.num, eb = b.t.name.slice(2) === q.num;
        if (ea !== eb) return ea ? -1 : 1;
      }
      return b.picked - a.picked || a.i - b.i;
    })
    .map((x) => x.t);
}

// Blanks the inputs form asks for before a text template is inserted: short
// names used inside $...$ (A, f, x0, alpha, f'), not prose like {{reason}}.
// A matching ```vars variable prefills the answer: its LaTeX value when the
// blank is a value slot (`f(x) = {{f}}`), otherwise just its name.
// resolve(label) -> { value, from, prose } | null fills other blanks from the
// variables too: {{Hessian}}, {{f_x}}, {{statement}}, {{P(k+1)}}, ...
// (see textlink.js); those are asked even outside math, prefilled.
export function textQuestions(body, vars = [], latexOf = (v) => v.name, resolve = null) {
  const byName = vars instanceof Map ? vars : new Map(vars.map((v) => [v.name, v]));
  const math = [...body.matchAll(/\$\$[^$]*\$\$|\$[^$\n]*\$/g)].map((m) => [m.index, m.index + m[0].length]);
  const inMath = (i) => math.some(([a, b]) => i > a && i < b);
  const seen = new Map();
  for (const m of body.matchAll(/\{\{\s*([^{}\n]+?)\s*\}\}/g)) {
    const label = m[1];
    if (label.startsWith("_")) continue;
    const q = seen.get(label) || { key: label, label, math: false, valueSlot: false, simple: /^[A-Za-z][\w']{0,9}$/.test(label) };
    q.math ||= inMath(m.index);
    q.valueSlot ||= /=\s*$/.test(body.slice(0, m.index));
    seen.set(label, q);
  }
  return [...seen.values()].flatMap((q) => {
    const v = q.simple ? byName.get(q.label) : null;
    if (v) return q.math ? [{ key: q.key, label: q.label, from: v.name, value: q.valueSlot ? latexOf(v) : v.name }] : [];
    const r = resolve ? resolve(q.label) : null;
    if (r) return [{ key: q.key, label: q.label, from: null, desc: `from ${r.from}`, value: r.value, wrap: !q.math && !r.prose }];
    return q.math && q.simple ? [{ key: q.key, label: q.label, from: null, value: "" }] : [];
  });
}

// Puts the form's answers into the body. Empty answers stay {{blanks}}.
// questions: answers to blanks outside math get $...$ around them.
export function fillTextAnswers(body, answers, questions = []) {
  const wrap = new Set(questions.filter((q) => q.wrap).map((q) => q.key));
  return body.replace(/\{\{\s*([^{}\n]+?)\s*\}\}/g, (all, label) => {
    const a = answers[label];
    if (!a) return all;
    return wrap.has(label) && !a.includes("$") ? `$${a}$` : a;
  });
}
