// Cite from the result: once the note's matrix / f and g are known, keep only
// the references the computed answer actually uses. \posdef on a positive
// definite matrix cites Prop 3.43, not Def 8.9 (indefinite); \lagrange on a
// line cites Thm 8.25 + Thm 6.13 (convexity) instead of Thm 5.84
// (compactness), and Def 5.1 when f is a squared distance.
// { add, drop }: reference strings ("Def 8.9 Prop 8.11"). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteMatrix, definitenessWitness, isSym } from "./witness.js";
import { noteFG, lagrangeSolve } from "./lagrange.js";
import { citations, explainItems, pyRefs } from "./explain.js";

const NONE = { add: "", drop: "" };
const isConst = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));

const BY_DEFINITENESS = {
  "positive definite": { add: "Sec 3.7.1", drop: "Def 8.9 Prop 8.11" },
  "positive semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "positive semidefinite and negative semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "negative semidefinite": { add: "", drop: "Def 8.9 Prop 8.11" },
  "negative definite": { add: "Prop 8.11", drop: "Prop 3.43 Def 8.9" },
  indefinite: { add: "Def 8.9 Prop 8.11", drop: "Prop 3.43" },
};

function matrixRefs(name, vars, ctx) {
  const m = noteMatrix(vars, ctx);
  if (!m || !isConst(m.M)) return NONE; // parameters: the answer depends on them
  if (name === "posdef" || name === "quadform") {
    if (!isSym(m.M)) return NONE;
    return BY_DEFINITENESS[definitenessWitness(m.M)?.d] || NONE;
  }
  if (name === "matinv") {
    if (m.M.length !== m.M[0]?.length) return NONE;
    let d;
    try { d = cas.constValue(cas.mat.det(m.M)); } catch (_) { return NONE; }
    if (d === null) return NONE;
    // Not invertible: only the definition (a v != 0 with Av = 0) is used.
    if (Number(d.n ?? d) === 0) return { add: "", drop: "Ex 3.26 Thm 2.8 Prop 3.29" };
    return m.M.length === 2 ? NONE : { add: "", drop: "Ex 3.26" };
  }
  return NONE;
}

function lagrangeRefs(vars, ctx) {
  const fg = noteFG(vars, ctx);
  if (!fg) return NONE;
  let S;
  try { S = lagrangeSolve(fg.F, fg.G); } catch (_) { return NONE; }
  if (!S || S.kind !== "unique") return NONE;
  const min = /positive/.test(S.d || "");
  const max = /negative/.test(S.d || "");
  // A line or plane is not compact: convexity (Thm 8.25, 6.13) gives the answer.
  if (S.linearG && (min || max)) {
    return { add: `Thm 8.25 Thm 6.13 Sec 8.7${S.center && min ? " Def 5.1" : ""}`, drop: "Thm 5.84" };
  }
  return NONE;
}

export function resultRefs(name, vars, ctx = {}) {
  if (!(vars instanceof Map)) return NONE;
  try {
    if (name === "lagrange") return lagrangeRefs(vars, ctx);
    return matrixRefs(name, vars, ctx);
  } catch (_) {
    return NONE;
  }
}

// Items without the dropped references.
export function dropRefs(items, drop) {
  const gone = new Set(citations(drop).map((c) => c.label));
  return gone.size ? items.filter((it) => !gone.has(it.label)) : items;
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
  const own = refs.length > 0 && used.every((u) => fromVars(u, answers, vars));
  const r = own ? resultRefs(t.name, vars) : NONE;
  return dropRefs(explainItems([t.desc, route.label, pyRefs(t.name, route.label), r.add], refs), r.drop);
}

// A theorem the text names only to say it does not apply ("so Theorem 5.84
// does not apply") is not one it uses.
export function notApplied(text) {
  const out = [];
  for (const m of String(text).matchAll(/(Definition|Theorem|Proposition|Lemma|Corollary)\s+(\d+(?:\.\d+)*)\s+does not apply/g)) out.push(`${m[1]} ${m[2]}`);
  return out.join(" ");
}
