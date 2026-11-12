// What a snippet or template uses and why: the book references it cites
// (Def 8.2, Thm 7.39, ...) looked up with their titles and statements, as
// python print lines or as a note callout. Pure, no Obsidian imports.

const KINDS = [
  [/^def(inition)?$/i, "definition", "Definition"],
  [/^thm|^theorem$/i, "theorem", "Theorem"],
  [/^prop(osition)?$/i, "proposition", "Proposition"],
  [/^lem(ma)?$/i, "lemma", "Lemma"],
  [/^cor(ollary)?$/i, "corollary", "Corollary"],
  [/^rem(ark)?$/i, "remark", "Remark"],
  [/^ex(ercise)?$/i, "exercise", "Exercise"],
  [/^sec(tion)?$/i, "section", "Section"],
];

// The book's references for the general text templates (only used with the
// IMO26 pack on, so the templates themselves stay book independent).
export const TEMPLATE_REFS = {
  induction: "Thm 1.86",
  strongind: "Thm 1.86",
  iff: "Def 1.18",
  contrapositive: "Def 1.10",
  contradiction: "Def 1.10",
  counterexample: "Def 1.10",
  bijection: "Def 1.95 Def 1.106",
  epsdelta: "Def 5.62 Remark 5.61",
  definition: "",
};

// Book references for the python routes whose description cites none.
// Keyed by snippet name, or "name|route label" for one route. Routes the book
// has no material for (determinant, rank, eigenvalues, integrals, plotting,
// simplifying, ...) are left out on purpose rather than given a loose match.
export const PY_REFS = {
  "intersection|two lines in R^d: p + t*u and q + s*v": "Def 4.12",
  "intersection|line p + t*u and plane n*x = c": "Def 4.12 Def 4.40",
  "intersection|system of equations": "Thm 2.8",
  inversefn: "Def 1.95 Def 1.106",
  "composition|f o g and g o f (one variable)": "Def 1.95",
  linsolve: "Thm 2.8 Def 3.24",
  roots: "Thm 2.22 Prop 2.23 Thm 2.25",
  matmul: "Def 3.4 Thm 3.19 Prop 3.35",
  matinv: "Def 3.24 Thm 2.8",
  posdef: "Def 8.9 Prop 3.43 Thm 8.31",
  quadform: "Prop 3.43 Thm 8.31",
  "convexfn|one variable: f'' >= 0": "Def 4.26 Cor 6.55 Remark 6.56",
  "convexfn|several variables: Hessian positive semidefinite everywhere": "Def 4.26 Thm 8.25",
  lp: "Def 4.6 Remark 4.8",
  dot: "Def 5.1 Thm 5.24",
  projection: "Def 5.1 Prop 5.15",
  gramschmidt: "Def 5.1",
  derivative: "Def 6.17 Remark 6.19",
  implicit: "Def 7.4 Thm 7.23",
  lhopital: "Def 5.62",
  compgraph: "Def 7.4 Thm 7.23",
  tangentplane: "Def 7.3 Def 7.4",
  critxy: "Def 7.15 Prop 7.20 Def 8.2 Thm 8.12 Def 8.8",
  convexopt: "Def 4.6 Thm 9.37",
  svm: "Thm 9.8 Def 4.40",
};
export const pyRefs = (name, label = "") => [PY_REFS[`${name}|${label}`], PY_REFS[name]].filter(Boolean).join(" ");

// Every reference cited in `text`, in order, without repeats.
// "Def 8.2", "Definition 8.2", "Thm 7.39", "Prop 8.11", "Ex 7.30-7.34", "Remark 1.120".
export function citations(text) {
  const out = [];
  const seen = new Set();
  const re = /\b(Definition|Def|Theorem|Thm|Proposition|Prop|Lemma|Lem|Corollary|Cor|Remark|Rem|Exercise|Ex|Section|Sec)\.?\s+(\d+(?:\.\d+)*)/g;
  for (const m of String(text).matchAll(re)) {
    const k = KINDS.find(([r]) => r.test(m[1]));
    if (!k) continue;
    const key = `${k[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: k[1], num: m[2], label: `${k[2]} ${m[2]}` });
  }
  return out;
}

// Citations joined with the book's text: { label, title, text }.
export function explainItems(sources, refs = []) {
  const byKey = new Map(refs.map((r) => [`${r.kind}:${r.num}`, r]));
  return citations(sources.filter(Boolean).join(" \n ")).map((c) => {
    const r = byKey.get(`${c.kind}:${c.num}`);
    return { ...c, title: r?.title || null, text: r?.text || null };
  });
}

const ASCII = [
  [/[−–—]/g, "-"], [/[‘’]/g, "'"], [/[“”]/g, '"'], [/…/g, "..."], [/≤/g, "<="], [/≥/g, ">="], [/≠/g, "!="],
  [/≈/g, "~"], [/∈/g, " in "], [/∉/g, " not in "], [/⊆/g, " subset of "], [/⊂/g, " subset of "], [/∪/g, " union "],
  [/∩/g, " intersect "], [/∅/g, "{}"], [/→/g, "->"], [/⇒/g, "=>"], [/⇔/g, "<=>"], [/↦/g, "|->"], [/×/g, "x"],
  [/[·⋅]/g, "*"], [/∇/g, "nabla "], [/∂/g, "d"], [/∑/g, "sum "], [/∏/g, "prod "], [/∫/g, "integral "], [/√/g, "sqrt"],
  [/∞/g, "inf"], [/∀/g, "for all "], [/∃/g, "exists "], [/¬/g, "not "], [/∧/g, " and "], [/∨/g, " or "],
  [/ℝ/g, "R"], [/ℕ/g, "N"], [/ℤ/g, "Z"], [/ℚ/g, "Q"], [/²/g, "^2"], [/³/g, "^3"], [/ⁿ/g, "^n"], [/⁻¹/g, "^-1"], [/ᵀ/g, "^T"],
  [/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => "_" + "₀₁₂₃₄₅₆₇₈₉".indexOf(c)],
];
const GREEK = "αalpha βbeta γgamma δdelta εepsilon ζzeta ηeta θtheta ιiota κkappa λlambda μmu νnu ξxi πpi ρrho σsigma τtau υupsilon φphi χchi ψpsi ωomega ΓGamma ΔDelta ΘTheta ΛLambda ΣSigma ΦPhi ΨPsi ΩOmega"
  .split(" ").map((g) => [g[0], g.slice(1)]);

// Plain ASCII, so print() never crashes a Windows console (cp1252).
export function ascii(s) {
  let t = String(s);
  for (const [re, to] of ASCII) t = t.replace(re, to);
  for (const [g, name] of GREEK) t = t.split(g).join(name);
  return t.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
}

// The whole statement, cleaned of PDF footnotes glued to the text
// ("... is true. 3See the article ...").
export function clean(s) {
  return String(s).replace(/\s+/g, " ").replace(/\s\d{1,2}(?=See |Cf\. |For more )[^.]*\.?/g, "").trim();
}

// Lines of at most `width` characters, broken at spaces (for python prints).
export function wrap(s, width = 96) {
  const out = [];
  let line = "";
  for (const w of String(s).split(" ")) {
    if (line && line.length + 1 + w.length > width) { out.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

const pyStr = (s) => JSON.stringify(ascii(s));

// Python print lines: what is computed, the values used, the references.
// inputs: the snippet's input names that hold the note's values (f, A, ...).
export function pyExplainLines({ title, label, items, inputs = [] }) {
  const lines = [];
  const head = [title, label].filter(Boolean).join(" -- ");
  if (head) lines.push(`print(${pyStr(`== ${head} ==`)})`);
  for (const n of inputs) lines.push(`print(${pyStr(`${n} =`)}, ${n})`);
  for (const it of items) {
    const name = it.title ? `${it.label} (${it.title})` : it.label;
    if (!it.text) { lines.push(`print(${pyStr("Uses " + name)})`); continue; }
    lines.push(`print(${pyStr(name + ":")})`);
    for (const l of wrap(ascii(clean(it.text)))) lines.push(`print("   ", ${pyStr(l)})`);
  }
  if (lines.length) lines.push(`print()`);
  return lines;
}

// A folded callout under a text template: the definitions and theorems it uses.
export function textExplain(items) {
  const withText = items.filter((it) => it.text || it.title);
  if (!withText.length) return "";
  const body = withText.map((it) => `> **${it.label}${it.title ? ` (${it.title})` : ""}.** ${it.text ? clean(it.text) : ""}`.trimEnd());
  return `\n\n> [!note]- Definitions and results used\n${body.join("\n>\n")}\n`;
}
