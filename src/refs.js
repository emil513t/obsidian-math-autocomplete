// Book references (Definition 4.26, Theorem 5.84, ...) for quick citing.
// Pure helpers, no Obsidian imports.

export const KIND_PREFIX = {
  def: "definition",
  thm: "theorem",
  prop: "proposition",
  lem: "lemma",
  rem: "remark",
  cor: "corollary",
  sec: "section",
  term: "term",
};

const KIND_LABEL = {
  definition: "Definition",
  theorem: "Theorem",
  proposition: "Proposition",
  lemma: "Lemma",
  remark: "Remark",
  corollary: "Corollary",
  section: "Section",
  term: "Section",
};
export const kindLabel = (k) => KIND_LABEL[k] || k;

// What the text right before the cursor asks for. `raw` is everything after
// the backslash. Returns null when it is no reference query at all.
//   "ref convex fun" -> any kind, words "convex fun"
//   "def4.2"         -> definitions numbered 4.2*
//   "thmcauchy"      -> theorems matching "cauchy"
//   "def"            -> all definitions (numbered ones and the ones made in
//                       running text, like "positive definite" in Section 3.7.1)
//   "sec3.7"         -> sections;  "termsoftmax" -> the running-text definitions
//   "theorem", "lemma cauchy", "definition8.2", "theo" -> full words work too,
//                       and so does any start of one (3+ letters) while typing
const FULL_WORDS = ["definition", "theorem", "proposition", "lemma", "corollary", "remark", "section"];
export function parseRefQuery(raw) {
  let m = raw.match(/^ref(?:\s+(.*))?$/);
  if (m) return { kind: null, q: (m[1] || "").trim() };
  const lower = raw.toLowerCase();
  for (const w of FULL_WORDS) {
    // The whole word, then an optional number or search words.
    if (lower.startsWith(w)) return { kind: w, q: raw.slice(w.length).trim() };
    // Still typing it: "theo", "lemm", "defin".
    if (lower.length >= 4 && w.startsWith(lower)) return { kind: w, q: "" };
  }
  m = raw.match(/^(def|thm|prop|lem|rem|cor|sec(?:tion)?|term)([\w.]*)$/);
  if (m) return { kind: KIND_PREFIX[m[1]] || KIND_PREFIX[m[1].slice(0, 3)], q: m[2] };
  return null;
}

const numKey = (n) => n.split(".").map(Number);
const byNum = (a, b) => {
  const [x1, y1] = numKey(a.num);
  const [x2, y2] = numKey(b.num);
  return x1 - x2 || y1 - y2;
};

// One key per reference (several running-text definitions share a section).
export const refKey = (r) => (r.kind === "term" ? `term:${r.num}:${r.title}` : `${r.kind}:${r.num}`);

// A word that starts a word somewhere in `s` ("conv" hits "is convex", not "nonconvex").
const startsWord = (w, s) => new RegExp(`(^|[^a-z])${w.replace(/[^a-z0-9]/g, "")}`).test(s);

// titleOnly: words must start a word in the title.
// wordStart: like titleOnly, but the statement text counts too (title hits rank first).
export function rankRefs(refs, { kind, q, titleOnly = false, wordStart = false }, picks = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return refs
    .filter((r) => !kind || r.kind === kind || (kind === "definition" && r.kind === "term"))
    .map((r) => {
      const title = r.title.toLowerCase();
      const text = r.text.toLowerCase();
      const hay = `${r.kind} ${r.num} ${title} ${text}`;
      let score = 1;
      for (const w of words) {
        if (/^\d/.test(w)) {
          if (r.num === w) score += 4;
          else if (r.num.startsWith(w)) score += 3;
          else return null;
        } else if (titleOnly || wordStart) {
          if (startsWord(w, title)) score += 2;
          else if (wordStart && startsWord(w, text)) score += 1;
          else return null;
        } else if (title.includes(w) || r.kind.startsWith(w)) score += 2;
        else if (hay.includes(w)) score += 1;
        else return null;
      }
      return { r, score, picked: picks[refKey(r)] || 0 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.picked - a.picked || byNum(a.r, b.r))
    .map((x) => x.r);
}

// The part of the statement around the first search word that is not in the
// title, so a hit deep inside a long theorem is visible in the popup.
// Returns null when the title already explains the hit (or there are no words).
export function refExcerpt(ref, q, width = 110) {
  const title = ref.title.toLowerCase();
  const text = ref.text;
  const lower = text.toLowerCase();
  for (const w of (q || "").toLowerCase().split(/\s+/).filter((w) => w && !/^\d/.test(w))) {
    if (title.includes(w)) continue;
    const at = lower.indexOf(w);
    if (at < 0) continue;
    if (at + w.length <= width) return null; // already in the visible start
    const from = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 40)) + 1);
    const cut = text.slice(from, from + width);
    return { before: from > 0 ? "…" : "", text: cut, after: from + width < text.length ? "…" : "", word: w };
  }
  return null;
}

// "Definition 4.26" exactly as the book cites it. Optionally with the title,
// and/or as a link to the section of a vault note that has a heading for it.
export function formatRef(ref, linkNote = null, withTitle = false) {
  // "positive definite matrix (Section 3.7.1)": the book defines it in running text.
  if (ref.kind === "term") return `${ref.title} (Section ${ref.num})`;
  const label = `${kindLabel(ref.kind)} ${ref.num}`;
  const text = withTitle && ref.title ? `${label} (${ref.title})` : label;
  if (!linkNote || !ref.heading) return text;
  const heading = ref.heading.replace(/[|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
  return `[[${linkNote}#${heading}|${text}]]`;
}
