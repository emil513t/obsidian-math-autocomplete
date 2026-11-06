// Book references (Definition 4.26, Theorem 5.84, ...) for quick citing.
// Pure helpers, no Obsidian imports.

export const KIND_PREFIX = {
  def: "definition",
  thm: "theorem",
  prop: "proposition",
  lem: "lemma",
  rem: "remark",
  cor: "corollary",
};

const KIND_LABEL = {
  definition: "Definition",
  theorem: "Theorem",
  proposition: "Proposition",
  lemma: "Lemma",
  remark: "Remark",
  corollary: "Corollary",
};
export const kindLabel = (k) => KIND_LABEL[k] || k;

// What the text right before the cursor asks for. `raw` is everything after
// the backslash. Returns null when it is no reference query at all.
//   "ref convex fun" -> any kind, words "convex fun"
//   "def4.2"         -> definitions numbered 4.2*
//   "thmcauchy"      -> theorems matching "cauchy"
//   "def"            -> all definitions
export function parseRefQuery(raw) {
  let m = raw.match(/^ref(?:\s+(.*))?$/);
  if (m) return { kind: null, q: (m[1] || "").trim() };
  m = raw.match(/^(def|thm|prop|lem|rem|cor)([\w.]*)$/);
  if (m) return { kind: KIND_PREFIX[m[1]], q: m[2] };
  return null;
}

const numKey = (n) => n.split(".").map(Number);
const byNum = (a, b) => {
  const [x1, y1] = numKey(a.num);
  const [x2, y2] = numKey(b.num);
  return x1 - x2 || y1 - y2;
};

export function rankRefs(refs, { kind, q }, picks = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return refs
    .filter((r) => !kind || r.kind === kind)
    .map((r) => {
      const title = r.title.toLowerCase();
      const hay = `${r.kind} ${r.num} ${title} ${r.text.toLowerCase()}`;
      let score = 1;
      for (const w of words) {
        if (/^\d/.test(w)) {
          if (r.num === w) score += 4;
          else if (r.num.startsWith(w)) score += 3;
          else return null;
        } else if (title.includes(w) || r.kind.startsWith(w)) score += 2;
        else if (hay.includes(w)) score += 1;
        else return null;
      }
      return { r, score, picked: picks[`${r.kind}:${r.num}`] || 0 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.picked - a.picked || byNum(a.r, b.r))
    .map((x) => x.r);
}

// "Definition 4.26 (Convex function)", optionally as a link to the section
// of a vault note that has a heading for it.
export function formatRef(ref, linkNote = null) {
  const label = `${kindLabel(ref.kind)} ${ref.num}`;
  const text = ref.title ? `${label} (${ref.title})` : label;
  if (!linkNote || !ref.heading) return text;
  const heading = ref.heading.replace(/[|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
  return `[[${linkNote}#${heading}|${text}]]`;
}
