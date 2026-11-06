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
  const flush = () => {
    if (!cur) return;
    cur.body = cur.lines.join("\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
    delete cur.lines;
    if (cur.body) out.push(cur);
  };
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const h = line.match(/^##\s+\\([A-Za-z][\w-]*)\s*(?:(?:—|–|-|:|\|)\s*(.*))?$/);
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
