// E1 of docs/imo26-coverage/CONTRADICTIONS.md: the negation of a statement,
// written out one rule at a time, for any statement (from the note or typed),
// with the book's rules only:
//   ¬(∀x ∈ S : p) ≡ ∃x ∈ S : ¬p  and  ¬(∃x ∈ S : p) ≡ ∀x ∈ S : ¬p   (1.3), Section 1.3.4
//   ¬(p ∧ q) ≡ ¬p ∨ ¬q, ¬(p ∨ q) ≡ ¬p ∧ ¬q                          Exercise 1.20
//   ¬(p ⇒ q) ≡ p ∧ ¬q (p ⇒ q is false only when p is true, q false)   Definition 1.10
//   p ⇔ q ≡ (p ⇒ q) ∧ (q ⇒ p)                                        Definition 1.18
//   ¬¬p ≡ p                                                          Definition 1.10
//   ¬(x < y) ≡ x ≥ y, ...  (exactly one of x < y, x = y, x > y)       Definition 1.65
// "Not bounded" comes out exactly as in Remark 5.34, "not continuous" as in
// Section 5.7. Pure, no Obsidian imports.

// ---------- reading a statement ----------

const UNI = [
  [/∀/g, "\\forall "], [/∃/g, "\\exists "], [/¬/g, "\\neg "], [/∧/g, "\\land "], [/∨/g, "\\lor "],
  [/⇔|⟺|<=>/g, "\\Leftrightarrow "], [/⇒|⟹|=>/g, "\\Rightarrow "], [/≤/g, "\\le "], [/≥/g, "\\ge "],
  [/≠/g, "\\neq "], [/∈/g, "\\in "], [/∉/g, "\\notin "], [/⊆/g, "\\subseteq "], [/ε/g, "\\varepsilon "], [/δ/g, "\\delta "],
];
function normalize(s) {
  let t = String(s);
  for (const [re, by] of UNI) t = t.replace(re, by);
  return t
    .replace(/\\(Longleftrightarrow|iff|leftrightarrow)(?![A-Za-z])/g, "\\Leftrightarrow")
    .replace(/\\(implies|Longrightarrow|rightarrow|to)(?![A-Za-z])/g, "\\Rightarrow")
    .replace(/\\wedge(?![A-Za-z])/g, "\\land").replace(/\\vee(?![A-Za-z])/g, "\\lor").replace(/\\lnot(?![A-Za-z])/g, "\\neg")
    .replace(/\\text\{\s*and\s*\}/g, "\\land ").replace(/\\text\{\s*or\s*\}/g, "\\lor ")
    .replace(/\\colon(?![A-Za-z])/g, ":").replace(/\\(,|;|quad|qquad|:|!)/g, " ")
    .replace(/\\leq(?![A-Za-z])/g, "\\le").replace(/\\geq(?![A-Za-z])/g, "\\ge").replace(/\\ne(?![A-Za-z])/g, "\\neq")
    .replace(/\\left|\\right/g, "").replace(/\\ /g, " ").replace(/<=(?!>)/g, "\\le ").replace(/>=/g, "\\ge ").replace(/!=/g, "\\neq ")
    .replace(/\s+/g, " ").trim();
}

// Positions of top-level tokens (outside (), [], {}, |..| is left alone).
function topLevel(s, test) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && (s[i + 1] === "{" || s[i + 1] === "}")) { i++; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (depth === 0) { const n = test(s, i); if (n) return { i, n }; }
  }
  return null;
}
const cmd = (name) => (s, i) => (s.startsWith(name, i) && !/[A-Za-z]/.test(s[i + name.length] || "") ? name.length : 0);
const anyOf = (...fs) => (s, i) => { for (const f of fs) { const n = f(s, i); if (n) return n; } return 0; };
const QUANT = anyOf(cmd("\\forall"), cmd("\\exists"));

function stripParens(s) {
  for (;;) {
    s = s.trim();
    if (!/^[([]/.test(s)) return s;
    let depth = 0, end = -1;
    for (let i = 0; i < s.length; i++) {
      if ("([{".includes(s[i])) depth++;
      else if (")]}".includes(s[i])) { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== s.length - 1) return s;
    s = s.slice(1, -1);
  }
}

// Relations an atom can have; negated by Definition 1.65 (order) or by the meaning of ≠, ∉.
const RELS = [
  ["\\not\\subseteq", "\\subseteq"], ["\\subseteq", "\\not\\subseteq"], ["\\notin", "\\in"], ["\\in", "\\notin"],
  ["\\neq", "="], ["\\le", ">"], ["\\ge", "<"], ["\\lt", "\\ge"], ["\\gt", "\\le"], ["<", "\\ge"], [">", "\\le"], ["=", "\\neq"],
];
const relAt = (s, i) => {
  for (const [r] of RELS) if (s.startsWith(r, i) && !(r.startsWith("\\") && /[A-Za-z]/.test(s[i + r.length] || ""))) {
    if (r === "=" && (s[i - 1] === "<" || s[i - 1] === ">" || s[i + 1] === ">")) continue;
    return r.length;
  }
  return 0;
};

export function parseStatement(src) {
  return parse(normalize(src));
}
function parse(s0) {
  const s = stripParens(s0);
  if (!s) throw new Error("empty statement");
  // Binary connectives before the first top-level quantifier (its scope runs to the end).
  const q = topLevel(s, QUANT);
  const head = q ? s.slice(0, q.i) : s;
  for (const [op, test, right] of [["iff", cmd("\\Leftrightarrow"), false], ["imp", cmd("\\Rightarrow"), true], ["or", cmd("\\lor"), false], ["and", cmd("\\land"), false]]) {
    const hit = right ? topLevel(head, test) : lastTop(head, test);
    if (hit && head.slice(0, hit.i).trim()) return { t: op, a: parse(s.slice(0, hit.i)), b: parse(s.slice(hit.i + hit.n)) };
  }
  if (/^\\neg(?![A-Za-z])/.test(s)) return { t: "not", a: parse(s.slice(4)) };
  if (q && q.i === 0) {
    const kind = s.startsWith("\\forall") ? "forall" : "exists";
    const rest = s.slice(kind === "forall" ? 7 : 7).trim();
    // The binder ends at ":" or at the next quantifier (∃R ∈ ℝ ∀v ∈ S : ...).
    const colon = topLevel(rest, (t, i) => (t[i] === ":" ? 1 : 0));
    const next = topLevel(rest, QUANT);
    let end = [colon, next].filter(Boolean).sort((a, b) => a.i - b.i)[0];
    let skip = end ? (end === colon ? 1 : 0) : 0;
    if (!end) {
      // ∀x ∈ S, p(x): a comma after the binder's relation.
      const rel = topLevel(rest, relAt);
      const comma = rel && topLevel(rest.slice(rel.i), (t, i) => (t[i] === "," ? 1 : 0));
      if (!comma) throw new Error("can't see where the quantifier ends: write ':' after it");
      end = { i: rel.i + comma.i }; skip = 1;
    }
    const binder = rest.slice(0, end.i).trim();
    if (!binder) throw new Error("a quantifier needs a variable");
    return { t: kind, v: binder, a: parse(rest.slice(end.i + skip)) };
  }
  return atom(s);
}
// The last top-level match (left-associative ∧, ∨).
function lastTop(s, test) {
  let found = null, from = 0;
  for (;;) {
    const h = topLevel(s.slice(from), test);
    if (!h) return found;
    found = { i: from + h.i, n: h.n };
    from = found.i + h.n;
  }
}
function atom(s) {
  // A chain 0 \le t \le 1 is two relations joined by ∧.
  const parts = []; let rest = s; let ops = [];
  for (;;) {
    const r = topLevel(rest, relAt);
    if (!r) { parts.push(rest.trim()); break; }
    parts.push(rest.slice(0, r.i).trim()); ops.push(rest.slice(r.i, r.i + r.n)); rest = rest.slice(r.i + r.n);
  }
  if (!ops.length || parts.some((p) => !p)) return { t: "atom", s: s.trim() };
  if (ops.length === 1) return { t: "rel", l: parts[0], op: ops[0], r: parts[1] };
  let node = { t: "rel", l: parts[0], op: ops[0], r: parts[1] };
  for (let k = 1; k < ops.length; k++) node = { t: "and", a: node, b: { t: "rel", l: parts[k], op: ops[k], r: parts[k + 1] }, chain: true };
  return node;
}

// ---------- writing a statement ----------

const OPTEX = { iff: "\\Leftrightarrow", imp: "\\Rightarrow", or: "\\lor", and: "\\land" };
const simpleAtom = (n) => n.t === "atom" && /^[\w\\{}^]+(\([^()]*\))?$/.test(n.s);
// parent: the type of the node around n (null at the top). Mixed ∧ / ∨ / ⇒
// always get brackets, as in Exercise 1.20.
export function toTex(n, parent = null) {
  switch (n.t) {
    case "atom": return simpleAtom(n) || !parent ? n.s : `(${n.s})`;
    case "rel": return `${n.l} ${n.op} ${n.r}`;
    case "not": return simpleAtom(n.a) ? `\\neg ${n.a.s}` : `\\neg(${toTex(n.a, null)})`;
    case "forall": case "exists": {
      // ∃R ∈ ℝ ∀v ∈ S : body — the book writes a chain without colons in between.
      const head = [];
      let m = n;
      while (m.t === "forall" || m.t === "exists") { head.push(`\\${m.t} ${m.v}`); m = m.a; }
      const s = `${head.join("\\ ")} : ${toTex(m, null)}`;
      return parent ? `(${s})` : s;
    }
    default: {
      if (n.chain && n.a.t === "rel" && n.b.t === "rel" && n.a.r === n.b.l) return `${n.a.l} ${n.a.op} ${n.a.r} ${n.b.op} ${n.b.r}`;
      const s = `${toTex(n.a, n.t)} ${OPTEX[n.t]} ${toTex(n.b, n.t)}`;
      const same = parent === n.t && (n.t === "and" || n.t === "or");
      return parent && !same ? `(${s})` : s;
    }
  }
}

// ---------- pushing ¬ inside, one rule at a time ----------

const NEG_REL = Object.fromEntries(RELS);
const RULES = {
  forall: { rule: "¬∀ becomes ∃¬", ref: "(1.3), Section 1.3.4" },
  exists: { rule: "¬∃ becomes ∀¬", ref: "(1.3), Section 1.3.4" },
  and: { rule: "¬(p ∧ q) ≡ ¬p ∨ ¬q", ref: "Exercise 1.20 (iii)" },
  or: { rule: "¬(p ∨ q) ≡ ¬p ∧ ¬q", ref: "Exercise 1.20 (ii)" },
  imp: { rule: "¬(p ⇒ q) ≡ p ∧ ¬q", ref: "Definition 1.10" },
  iff: { rule: "p ⇔ q ≡ (p ⇒ q) ∧ (q ⇒ p)", ref: "Definition 1.18" },
  not: { rule: "¬¬p ≡ p", ref: "Definition 1.10" },
  rel: { rule: "negate the relation", ref: "Definition 1.65" },
};
const ORDER_OPS = new Set(["<", ">", "\\le", "\\ge", "\\lt", "\\gt"]);
const MIRROR = { "<": ">", ">": "<", "\\le": "\\ge", "\\ge": "\\le", "\\lt": "\\gt", "\\gt": "\\lt" };
// The rule, as math for the right-hand column of the chain.
const RULE_TEX = {
  forall: "\\neg\\forall \\text{ becomes } \\exists\\neg",
  exists: "\\neg\\exists \\text{ becomes } \\forall\\neg",
  and: "\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q",
  or: "\\neg(p \\lor q) \\equiv \\neg p \\land \\neg q",
  imp: "\\neg(p \\Rightarrow q) \\equiv p \\land \\neg q",
  iff: "p \\Leftrightarrow q \\equiv (p \\Rightarrow q) \\land (q \\Rightarrow p)",
  not: "\\neg\\neg p \\equiv p",
  rel: "\\text{negate the relation}",
};

// One rewrite of the outermost ¬ that is not in front of a plain statement.
function step(n) {
  if (n.t === "not") {
    const a = n.a;
    switch (a.t) {
      case "forall": return { n: { t: "exists", v: a.v, a: { t: "not", a: a.a } }, k: "forall" };
      case "exists": return { n: { t: "forall", v: a.v, a: { t: "not", a: a.a } }, k: "exists" };
      case "and": return { n: { t: "or", a: { t: "not", a: a.a }, b: { t: "not", a: a.b } }, k: "and" };
      case "or": return { n: { t: "and", a: { t: "not", a: a.a }, b: { t: "not", a: a.b } }, k: "or" };
      case "imp": return { n: { t: "and", a: a.a, b: { t: "not", a: a.b } }, k: "imp" };
      case "iff": return { n: { t: "not", a: { t: "and", a: { t: "imp", a: a.a, b: a.b }, b: { t: "imp", a: a.b, b: a.a } } }, k: "iff" };
      case "not": return { n: a.a, k: "not" };
      case "rel": {
        if (!NEG_REL[a.op]) return null;
        let { l, r } = a; let op = NEG_REL[a.op];
        // 0 > x reads better as x < 0.
        if (ORDER_OPS.has(op) && /^-?\d+(\.\d+)?$/.test(l.trim()) && !/^-?\d+(\.\d+)?$/.test(r.trim())) { [l, r] = [r, l]; op = MIRROR[op]; }
        return { n: { t: "rel", l, op, r }, k: "rel", order: ORDER_OPS.has(a.op) };
      }
      default: return null;
    }
  }
  for (const key of ["a", "b"]) {
    if (!n[key]) continue;
    const r = step(n[key]);
    if (r) return { ...r, n: { ...n, [key]: r.n } };
  }
  return null;
}

// { tex, steps: [{ tex, rule, ref }], node }
export function negate(src) {
  const P = typeof src === "string" ? parseStatement(src) : src;
  let cur = { t: "not", a: P };
  const steps = [{ tex: toTex(cur), rule: null, ref: null }];
  for (let k = 0; k < 60; k++) {
    const r = step(cur);
    if (!r) break;
    cur = r.n;
    const R = RULES[r.k];
    steps.push({ tex: toTex(cur), rule: r.k === "rel" && !r.order ? "negate the relation" : R.rule, ref: r.k === "rel" && !r.order ? null : R.ref, k: r.k });
  }
  // Steps that change one quantifier/relation at a time; merge runs of the same rule.
  const merged = [];
  for (const s of steps) {
    const last = merged[merged.length - 1];
    if (last && last.k && last.k === s.k && ["forall", "exists", "rel"].includes(s.k)) { merged[merged.length - 1] = s; continue; }
    merged.push(s);
  }
  return { tex: toTex(cur), steps: merged, node: cur, statement: toTex(P) };
}

// The chain ¬P ≡ ... ≡ result, as an aligned block (rule and reference on the right).
export function negationChain(N) {
  const rows = N.steps.map((s, i) => `${i ? "&\\equiv " : "&"}${s.tex}${s.k ? ` && ${RULE_TEX[s.k]}${s.ref ? `\\ \\text{(${s.ref})}` : ""}` : ""}`);
  return `\\begin{aligned} ${rows.join(" \\\\ ")} \\end{aligned}`;
}

// ---------- definitions from the book, negated ----------

// Each one: the statement with the note's names put in.
export const DEFINITIONS = [
  { key: "bounded", label: "S is NOT bounded", ref: "Def 5.33, Remark 5.34", words: "bounded radius ball", s: (n) => `\\exists R \\in \\mathbb{R}\\ \\forall v \\in ${n.S} : |v| < R`, says: (n) => `$${n.S}$ is bounded` },
  { key: "open", label: "U is NOT open", ref: "Def 5.39", words: "open ball epsilon", s: (n) => `\\forall v \\in ${n.U}\\ \\exists \\varepsilon > 0 : B(v, \\varepsilon) \\subseteq ${n.U}`, says: (n) => `$${n.U}$ is open` },
  { key: "limit", label: "f(u) does NOT have limit w as u → v", ref: "Def 5.62 (5.20)", words: "limit epsilon delta game", s: (n) => `\\forall \\varepsilon > 0\\ \\exists \\delta > 0\\ \\forall u \\in ${n.S} : d(u, ${n.v}) < \\delta \\Rightarrow d(${n.f}(u), ${n.w}) < \\varepsilon`, says: (n) => `$\\lim_{u \\to ${n.v}} ${n.f}(u) = ${n.w}$` },
  { key: "continuous", label: "f is NOT continuous at v", ref: "Def 5.65 (5.21)", words: "continuous continuity epsilon delta", s: (n) => `\\forall \\varepsilon > 0\\ \\exists \\delta > 0\\ \\forall u \\in ${n.S} : d(u, ${n.v}) < \\delta \\Rightarrow d(${n.f}(u), ${n.f}(${n.v})) < \\varepsilon`, says: (n) => `$${n.f}$ is continuous at $${n.v}$` },
  { key: "injective", label: "f is NOT injective", ref: "Def 1.106 (i)", words: "injective one to one", s: (n) => `\\forall x, y \\in ${n.S} : ${n.f}(x) = ${n.f}(y) \\Rightarrow x = y`, says: (n) => `$${n.f}$ is injective` },
  { key: "surjective", label: "f is NOT surjective", ref: "Def 1.106 (ii)", words: "surjective onto", s: (n) => `\\forall y \\in ${n.T}\\ \\exists x \\in ${n.S} : ${n.f}(x) = y`, says: (n) => `$${n.f}$ is surjective` },
  { key: "convexset", label: "C is NOT convex", ref: "Def 4.21", words: "convex set segment", s: (n) => `\\forall x, y \\in ${n.C}\\ \\forall t \\in [0, 1] : (1-t)x + ty \\in ${n.C}`, says: (n) => `$${n.C}$ is convex` },
  { key: "convexfn", label: "f is NOT convex", ref: "Def 4.26", words: "convex function", s: (n) => `\\forall x, y \\in ${n.C}\\ \\forall t \\in [0, 1] : ${n.f}((1-t)x + ty) \\le (1-t)${n.f}(x) + t${n.f}(y)`, says: (n) => `$${n.f}$ is convex` },
  { key: "increasing", label: "f is NOT strictly increasing", ref: "Def 6.41", words: "increasing strictly monotone", s: (n) => `\\forall x, y \\in ${n.S} : x < y \\Rightarrow ${n.f}(x) < ${n.f}(y)`, says: (n) => `$${n.f}$ is strictly increasing` },
];
export const DEFAULT_NAMES = { S: "S", U: "U", C: "C", T: "T", f: "f", v: "v", w: "w" };

// ---------- from the note ----------

const LOGIC = /\\(forall|exists|neg|lnot|land|lor|wedge|vee|Rightarrow|implies|Leftrightarrow|iff)(?![A-Za-z])|[∀∃¬∧∨⇒⇔]/;
// Statements in the note: P = ..., claim = ..., or any value with ∀ ∃ ¬ ∧ ∨ ⇒ ⇔.
export function noteStatements(vars) {
  if (!(vars instanceof Map)) return [];
  const out = [];
  for (const v of vars.values()) {
    const text = String(v.value ?? "");
    if (!text || Array.isArray(v.value)) continue;
    const named = /^(P|Q|p|q|claim|statement|proposition)(_?\{?\w*\}?)?$/.test(v.name);
    if (!LOGIC.test(text) && !(named && v.kind === "relation")) continue;
    try { out.push({ name: v.name, text, N: negate(text) }); } catch (_) { /* not a statement */ }
  }
  return out;
}
export function noteStatement(vars) {
  const all = noteStatements(vars);
  return all.find((s) => /^(P|claim|statement)$/.test(s.name)) || all[0] || null;
}

// Template blanks. undefined: not one of these blanks.
export function resolveNegationLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  const negBody = /\\neg|negation|for contradiction|Proof by contradiction/i.test(body);
  if (!negBody) return undefined;
  if (/^(the claim is false|negation|negation of the statement)$/i.test(l)) {
    const S = noteStatement(vars);
    if (!S) return null;
    if (/^the claim is false$/i.test(l)) return { value: `$\\neg ${/^[\w{}]+$/.test(S.name) ? S.name : `(${S.N.statement})`}$, i.e. $${S.N.tex}$`, prose: true, from: `@${S.name}, negated (Section 1.3.4, Exercise 1.20)` };
    return { value: S.N.tex, from: `@${S.name}, negated` };
  }
  if (/^(statement|claim)$/i.test(l) && /\{\{negation/.test(body)) {
    const S = noteStatement(vars);
    return S ? { value: S.N.statement, from: `@${S.name}` } : null;
  }
  if (/^negation steps$/i.test(l)) {
    const S = noteStatement(vars);
    return S ? { value: negationChain(S.N), from: `@${S.name}, rule by rule` } : null;
  }
  return undefined;
}
// \contrapositive-style blanks: A ⇒ B in the note gives A, B, not A, not B.
export function resolveImplicationLabel(label, vars, ctx = {}) {
  const l = label.trim();
  if (!/^(A|B|not A|not B)$/.test(l) || !/\{\{not B\}\}/.test(ctx.body || "")) return undefined;
  const S = noteStatement(vars);
  if (!S) return null;
  let P;
  try { P = parseStatement(S.text); } catch (_) { return null; }
  while (P.t === "forall") P = P.a;
  if (P.t !== "imp") return null;
  const part = /A$/.test(l) ? P.a : P.b;
  if (!/^not/.test(l)) return { value: `$${toTex(part)}$`, prose: true, from: `@${S.name}` };
  return { value: `$${negate(part).tex}$`, prose: true, from: `@${S.name}, negated (Exercise 1.20, Definition 1.65)` };
}
