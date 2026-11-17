// Cite from the result: once the note's values are known, keep only the
// references the computed answer actually uses, for every command.
//  - one variable vs several: Cor 6.55 or Thm 8.25, Thm 6.61 or Thm 8.23,
//    Def 6.36 or Def 7.15, ... (whichever matches f; both stay if unknown)
//  - definiteness (\posdef, \quadform, \critxy, \hessian): Prop 3.43 for
//    positive (semi)definite, Def 8.9 / Prop 8.11 / Def 8.8 for indefinite
//  - \matinv / \linsolve: invertible or not
//  - \lagrange on a line: Thm 8.25 + Thm 6.13 (+ Def 5.1 for a distance)
//    instead of Thm 5.84
//  - \continuous of a polynomial: no Remark 5.79 / Prop 5.74
//  - \roots: (2.12) for degree 2, Thm 2.28 for odd degree
// A theorem named only as "does not apply" is not cited either.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteMatrix, definitenessWitness, isSym } from "./witness.js";
import { noteFG, lagrangeSolve } from "./lagrange.js";
import { mainFn, resolveLabel } from "./textlink.js";
import { citations, explainItems, pyRefs } from "./explain.js";

const NONE = { add: "", drop: "" };
const join = (...rs) => ({ add: rs.map((r) => r.add).filter(Boolean).join(" "), drop: rs.map((r) => r.drop).filter(Boolean).join(" ") });
const isConst = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));
const safe = (f) => { try { return f() || NONE; } catch (_) { return NONE; } };

// The one-variable result and its several-variable twin. Only the one that
// matches f is kept, and only when both are cited (a route that is about one
// of them keeps it).
const TWINS = [
  ["Cor 6.55", "Thm 8.25"],
  ["Thm 6.54", "Thm 8.25"],
  ["Thm 6.61", "Thm 8.23"],
  ["Def 6.36", "Def 7.15"],
  ["Lemma 6.37", "Prop 7.20"],
  ["Def 6.17", "Def 7.3"],
];
const keyOf = (s) => citations(s).map((c) => c.label)[0];

function dimensionDrop(items, vars, ctx) {
  const F = mainFn(vars, ctx);
  if (!F || !F.vars.length) return "";
  const one = F.vars.length === 1;
  const have = new Set(items.map((it) => it.label));
  const drop = [];
  for (const [a, b] of TWINS) {
    const [ka, kb] = [keyOf(a), keyOf(b)];
    if (!have.has(ka) || !have.has(kb)) continue;
    drop.push(one ? b : a);
  }
  // "positive semi-definite (Prop 3.43)" next to "f'' >= 0" is the several-variable half.
  if (one && have.has(keyOf("Cor 6.55")) && have.has(keyOf("Prop 3.43"))) drop.push("Prop 3.43");
  return drop.join(" ");
}

const BY_DEFINITENESS = {
  "positive definite": { add: "Sec 3.7.1", drop: "Def 8.9 Prop 8.11" },
  "positive semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "positive semidefinite and negative semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "negative semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "negative definite": { add: "Prop 8.11", drop: "Prop 3.43 Def 8.9" },
  indefinite: { add: "Def 8.9 Prop 8.11", drop: "Prop 3.43" },
};
// The Hessian test (Thm 8.12) at the point, or everywhere when the Hessian is constant.
const BY_HESSIAN = {
  "positive definite": { add: "Prop 8.11", drop: "Def 8.8 Def 8.9" },
  "negative definite": { add: "Prop 8.11", drop: "Def 8.8 Def 8.9" },
  indefinite: { add: "Prop 8.11 Def 8.8", drop: "" },
  // Semidefinite: Thm 8.12 says nothing; a saddle point is still possible.
};

function matrixRefs(name, vars, ctx) {
  const m = noteMatrix(vars, ctx);
  if (!m || !isConst(m.M)) return NONE; // parameters: the answer depends on them
  if (name === "posdef" || name === "quadform") {
    if (!isSym(m.M)) return NONE;
    return BY_DEFINITENESS[definitenessWitness(m.M)?.d] || NONE;
  }
  if (name === "matinv" || name === "linsolve") {
    if (m.M.length !== m.M[0]?.length) return name === "linsolve" ? { add: "", drop: "Def 3.24" } : NONE;
    const d = cas.constValue(cas.mat.det(m.M));
    if (d === null) return NONE;
    const zero = Number(d.n ?? d) === 0;
    if (name === "linsolve") return zero ? { add: "", drop: "Def 3.24" } : NONE;
    // Not invertible: only the definition (a v != 0 with Av = 0) is used.
    if (zero) return { add: "", drop: "Ex 3.26 Thm 2.8 Prop 3.29" };
    return m.M.length === 2 ? NONE : { add: "", drop: "Ex 3.26" };
  }
  return NONE;
}

function hessianRefs(vars, ctx) {
  const r = resolveLabel("definiteness", vars, ctx);
  return (r && BY_HESSIAN[r.value]) || NONE;
}

function lagrangeRefs(vars, ctx) {
  const fg = noteFG(vars, ctx);
  if (!fg) return NONE;
  const S = lagrangeSolve(fg.F, fg.G);
  if (!S || S.kind !== "unique") return NONE;
  const min = /positive/.test(S.d || "");
  const max = /negative/.test(S.d || "");
  // A line or plane is not compact: convexity (Thm 8.25, 6.13) gives the answer.
  if (S.linearG && (min || max)) {
    return { add: `Thm 8.25 Thm 6.13 Sec 8.7${S.center && min ? " Def 5.1" : ""}`, drop: "Thm 5.84" };
  }
  return NONE;
}

// Every term a number times non-negative whole powers of the variables.
function isPoly(x) {
  return [...x.terms.values()].every((t) => [...t.f.values()].every(({ atom, e }) => atom.t === "sym" && e.d === 1 && e.n >= 0));
}
function degreeIn(x, v) {
  let deg = 0;
  for (const t of x.terms.values()) for (const { atom, e } of t.f.values()) if (atom.name === v) deg = Math.max(deg, e.n);
  return deg;
}

function functionRefs(name, vars, ctx) {
  const F = mainFn(vars, ctx);
  if (!F) return NONE;
  if (name === "continuous") return isPoly(F.x) ? { add: "", drop: "Remark 5.79 Prop 5.74" } : NONE;
  if (name === "roots" && F.vars.length === 1 && isPoly(F.x)) {
    const d = degreeIn(F.x, F.vars[0]);
    if (d === 2) return { add: "Sec 2.4.2", drop: "" };
    if (d % 2 === 1 && d >= 3) return { add: "Thm 2.28", drop: "" };
  }
  return NONE;
}

export function resultRefs(name, vars, ctx = {}) {
  if (!(vars instanceof Map)) return NONE;
  if (name === "lagrange") return safe(() => lagrangeRefs(vars, ctx));
  if (name === "critxy" || name === "hessian") return safe(() => hessianRefs(vars, ctx));
  return join(safe(() => matrixRefs(name, vars, ctx)), safe(() => functionRefs(name, vars, ctx)));
}

// Items without the dropped references.
export function dropRefs(items, drop) {
  const gone = new Set(citations(drop).map((c) => c.label));
  return gone.size ? items.filter((it) => !gone.has(it.label)) : items;
}

// A theorem the text names only to say it does not apply ("so Theorem 5.84
// does not apply") is not one it uses.
export function notApplied(text) {
  const out = [];
  for (const m of String(text).matchAll(/(Definition|Theorem|Proposition|Lemma|Corollary)\s+(\d+(?:\.\d+)*)\s+does not apply/g)) out.push(`${m[1]} ${m[2]}`);
  return out.join(" ");
}

// The references for `sources` (title, route label, text, ...) cited from the
// result for command `name` with the note's `vars`.
// The references the route's own title names ("saddle point: two directions
// (Def 8.8)") always stay: that route is about them.
export function citeFromResult(name, sources, refs, vars, ctx = {}, text = "", label = "") {
  if (!refs.length || !(vars instanceof Map)) return explainItems(sources, refs);
  const r = resultRefs(name, vars, ctx);
  const items = explainItems([...sources, r.add], refs);
  let dim = "";
  try { dim = dimensionDrop(items, vars, ctx); } catch (_) { /* keep both */ }
  const keep = new Set(citations(label).map((c) => c.label));
  const drop = citations([r.drop, notApplied(text), dim].join(" ")).map((c) => c.label).filter((l) => !keep.has(l));
  return dropRefs(items, drop.join(" "));
}

// The vars entry a python input came from, if the form answer is still its value.
export function fromVars(u, answers = {}, vars = new Map()) {
  const same = (a, b) => String(a).replace(/\s+/g, "") === String(b).replace(/\s+/g, "");
  const n = vars.get(u.var);
  return n && !n.error && (!u.typed || same(answers[u.input], n.value)) ? n : null;
}

// The references above a python block, cited from the result when every input
// is the note's own value (a different matrix typed in keeps the general list).
// t: the snippet { name, desc }, route: { label }, refs: the book's references.
export function pyItems(t, route, used, answers, vars, refs) {
  const sources = [t.desc, route.label, pyRefs(t.name, route.label)];
  const own = used.every((u) => fromVars(u, answers, vars));
  return own ? citeFromResult(t.name, sources, refs, vars, {}, "", route.label) : explainItems(sources, refs);
}
