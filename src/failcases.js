// E2 + E3 of docs/imo26-coverage/CONTRADICTIONS.md: a claim that fails, shown
// by one concrete case found from the note's own values (never one fixed example).
// E2 (finite, by trying every element / row):
//   - two sets: an element of one that is not in the other (Def 1.27), for
//     listed sets and set-builder sets over R, Z or N (the book's N starts at 1);
//   - a function given as a table of pairs: two inputs with the same value
//     (not injective), a value of T that is never hit (not surjective) (Def 1.106);
//   - propositions: the row where two of them differ, or where one is false (Def 1.10).
// E3 (functions and numbers):
//   - not injective: f(x1) = f(x2) with x1 ≠ x2 (Def 1.106);
//   - not surjective onto R: a y with f(x) − y of one sign for every x;
//   - a critical point that is not an extremum: f' keeps its sign (Ex 6.38, Prop 6.43);
//   - an inequality with several variables: see endings.js inequalityFailure.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteSet } from "./verdicts.js";
import { parseStatement, toTex, noteStatements } from "./negate.js";
import { mainFn } from "./textlink.js";
import { signEverywhere } from "./convex.js";
import { numericRoots } from "./objects.js";
import { latexName } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const ev = (x, env) => { try { return cas.evaluate(x, env); } catch (_) { return NaN; } };
const Q = (v) => (Number.isInteger(v) ? cas.num(v) : cas.num(Math.round(v * 2), 2));

// ---------- sets ----------

const splitTuple = (s) => {
  const m = String(s).trim().match(/^\((.*)\)$/);
  return m ? m[1].split(",").map((x) => x.trim()) : [String(s).trim()];
};
const keyOf = (s) => splitTuple(s).map((x) => { const p = cas.tryParse(x); return p ? T(p) : x.replace(/\s+/g, ""); }).join(",");
const OPTEX = { "<": "<", "<=": "\\le", "=": "=", "!=": "\\neq" };

function holds(S, env) {
  return S.conds.every(({ e, op }) => condHolds(cas.subs(e, env), op));
}
function condHolds(x, op) {
  const c = cv(x); const n = c ? c.n / c.d : ev(x);
  if (!Number.isFinite(n)) return false;
  return op === "<" ? n < 0 : op === "<=" ? n <= 0 : op === "=" ? n === 0 : n !== 0;
}
const ptTex = (p) => (p.length === 1 ? T(p[0]) : `(${p.map((x) => T(x)).join(", ")})`);

// A set of the note: listed ({1, 2, 3}) or set-builder ({x | ...}, {n ∈ Z | ...}).
export function noteSetByName(vars, name) {
  const v = vars.get(name);
  if (!v || v.kind !== "set" || v.error) return null;
  if (!v.builder) {
    if (v.value.length && v.value.every((s) => splitTuple(s).length === 2) && !/^[AB]$/.test(name) && vars.has("T")) return null; // a function table
    return { name, finite: true, items: v.value.map((s) => String(s).trim()), keys: new Set(v.value.map(keyOf)), v };
  }
  const S = noteSet(vars, { set: name, domains: true });
  return S && S.name === name ? { name, finite: false, S, v } : null;
}
const isTable = (v) => v && v.kind === "set" && !v.builder && v.value.length > 0 && v.value.every((s) => splitTuple(s).length === 2);

// The two sets a set question is about: A and B, else the first two sets (not function tables).
export function twoSets(vars) {
  if (!(vars instanceof Map)) return null;
  const names = [...vars.values()].filter((v) => v.kind === "set" && !v.error && !(isTable(v) && vars.has("T"))).map((v) => v.name);
  const pick = names.includes("A") && names.includes("B") ? ["A", "B"] : names.slice(0, 2);
  if (pick.length < 2) return null;
  const [A, B] = pick.map((n) => noteSetByName(vars, n));
  return A && B ? [A, B] : null;
}

function member(X, p) {
  if (X.finite) return X.keys.has(p.map((x) => T(x)).join(","));
  if (p.length !== X.S.xs.length || !inDomain(X, p)) return false;
  return holds(X.S, Object.fromEntries(X.S.xs.map((s, i) => [s, p[i]])));
}
const inDomain = (X, p) => X.S.domain === "R" || X.S.domain === "Q" || p.every((x) => { const c = cv(x); return c && c.d === 1 && (X.S.domain !== "N" || c.n >= 1); });
function gridFor(X) {
  const d = X.S.xs.length;
  const vals = X.S.domain === "N" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : X.S.domain === "Z" ? [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6] : [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3];
  const g = (k) => (k === 0 ? [[]] : g(k - 1).flatMap((t) => vals.map((v) => [...t, v])));
  return d > 3 ? [] : g(d).map((p) => p.map(Q));
}
const pointsOf = (X) => (X.finite ? X.items.map((s) => splitTuple(s).map((x) => cas.tryParse(x) || cas.sym(x))) : gridFor(X).filter((p) => member(X, p)));

// Why p is in X / not in X, in words and math.
function whyIn(X, p) {
  if (X.finite) return `it is listed in $${latexName(X.name)}$`;
  const env = Object.fromEntries(X.S.xs.map((s, i) => [s, p[i]]));
  return X.S.conds.map(({ e, op }) => `$${T(cas.subs(e, env))} ${OPTEX[op]} 0$`).join(" and ") + ` (the condition${X.S.conds.length > 1 ? "s" : ""} of $${latexName(X.name)}$ with ${X.S.xs.length === 1 ? `$${X.S.xs[0]} = ${T(p[0])}$` : `$(${X.S.xs.join(", ")}) = ${ptTex(p)}$`})`;
}
function whyNotIn(X, p) {
  if (X.finite) return `$${latexName(X.name)} = \\{${X.items.join(", ")}\\}$ does not list it`;
  if (p.length !== X.S.xs.length) return `it is not of the form $${X.S.xs.length === 1 ? X.S.xs[0] : `(${X.S.xs.join(", ")})`}$`;
  if (!inDomain(X, p)) return `it is not in $\\mathbb{${X.S.domain}}$`;
  const env = Object.fromEntries(X.S.xs.map((s, i) => [s, p[i]]));
  const bad = X.S.conds.find(({ e, op }) => !condHolds(cas.subs(e, env), op));
  return `$${T(cas.subs(bad.e, env))} ${OPTEX[bad.op]} 0$ is false, so the condition $${T(bad.e)} ${OPTEX[bad.op]} 0$ of $${latexName(X.name)}$ fails`;
}

// An element of X that is not in Y, or null.
export function inNotIn(X, Y) {
  for (const p of pointsOf(X)) if (!member(Y, p)) return { p, X, Y };
  return null;
}
// { x, from: A, to: B } (x ∈ from, x ∉ to), equal: bool when it can be decided, or null.
export function setVerdictE2(vars) {
  const two = twoSets(vars);
  if (!two) return null;
  const [A, B] = two;
  const ab = inNotIn(A, B); const ba = inNotIn(B, A);
  const exact = A.finite && B.finite;
  return { A, B, ab, ba, subset: ab ? false : exact ? true : null, equal: ab || ba ? false : exact ? true : null };
}

// ---------- functions given as a table ----------

export function tableFn(vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  const v = (ctx.fn && vars.get(ctx.fn)) || ["f", "g", "h"].map((n) => vars.get(n)).find(isTable) || [...vars.values()].find(isTable);
  if (!isTable(v)) return null;
  const pairs = v.value.map(splitTuple).map(([a, b]) => ({ x: a, y: b, kx: keyOf(a), ky: keyOf(b) }));
  const Tv = ["T", "codomain", "Y"].map((n) => vars.get(n)).find((s) => s && s.kind === "set" && !s.builder && s !== v);
  const Sv = ["S", "domain", "X"].map((n) => vars.get(n)).find((s) => s && s.kind === "set" && !s.builder && s !== v);
  return { name: v.name, pairs, T: Tv ? Tv.value.map((s) => String(s).trim()) : null, Tname: Tv?.name, S: Sv ? Sv.value.map((s) => String(s).trim()) : null };
}
export function tableNotInjective(F) {
  for (let i = 0; i < F.pairs.length; i++) for (let j = i + 1; j < F.pairs.length; j++) {
    if (F.pairs[i].ky === F.pairs[j].ky && F.pairs[i].kx !== F.pairs[j].kx) return { x1: F.pairs[i].x, x2: F.pairs[j].x, value: F.pairs[i].y };
  }
  return null;
}
export function tableNotSurjective(F) {
  if (!F.T) return null;
  const hit = new Set(F.pairs.map((p) => p.ky));
  const y = F.T.find((t) => !hit.has(keyOf(t)));
  return y ? { y } : null;
}

// ---------- propositions (truth tables) ----------

function atomsOf(n, out = new Set()) {
  if (n.t === "atom") { if (/^[A-Za-z](_?\{?\w+\}?)?$|^\\text\{[^}]*\}$/.test(n.s)) out.add(n.s); else out.add(null); }
  else if (n.t === "rel" || n.t === "forall" || n.t === "exists") out.add(null);
  else { if (n.a) atomsOf(n.a, out); if (n.b) atomsOf(n.b, out); }
  return out;
}
function evalProp(n, env) {
  switch (n.t) {
    case "atom": return env[n.s];
    case "not": return !evalProp(n.a, env);
    case "and": return evalProp(n.a, env) && evalProp(n.b, env);
    case "or": return evalProp(n.a, env) || evalProp(n.b, env);
    case "imp": return !evalProp(n.a, env) || evalProp(n.b, env);
    case "iff": return evalProp(n.a, env) === evalProp(n.b, env);
    default: return undefined;
  }
}
// The note's propositional statements (∧ ∨ ¬ ⇒ ⇔ of letters only).
export function noteProps(vars) {
  return noteStatements(vars).flatMap((S) => {
    let P; try { P = parseStatement(S.text); } catch (_) { return []; }
    const at = atomsOf(P);
    return at.has(null) || !at.size ? [] : [{ name: S.name, P, atoms: [...at], tex: toTex(P) }];
  });
}
// Rows in the book's order (t before f), every letter of both.
function rows(atoms) {
  const out = [];
  for (let k = 0; k < 1 << atoms.length; k++) out.push(Object.fromEntries(atoms.map((a, i) => [a, !((k >> (atoms.length - 1 - i)) & 1)])));
  return out;
}
const tf = (b) => (b ? "t" : "f");
const rowTex = (r) => Object.entries(r).map(([a, b]) => `${a} = ${tf(b)}`).join(", ");
export function truthInfo(vars) {
  const Ps = noteProps(vars);
  if (!Ps.length) return null;
  if (Ps.length >= 2) {
    const [P, Q2] = Ps;
    const atoms = [...new Set([...P.atoms, ...Q2.atoms])].sort();
    const diff = rows(atoms).find((r) => evalProp(P.P, r) !== evalProp(Q2.P, r));
    return { kind: diff ? "differ" : "equiv", P, Q: Q2, row: diff, pv: diff && evalProp(P.P, diff), qv: diff && evalProp(Q2.P, diff) };
  }
  const P = Ps[0];
  const atoms = [...P.atoms].sort();
  const rs = rows(atoms);
  const falseRow = rs.find((r) => !evalProp(P.P, r));
  const trueRow = rs.find((r) => evalProp(P.P, r));
  return { kind: !falseRow ? "taut" : !trueRow ? "contra" : "some", P, row: falseRow };
}

// ---------- functions given by a formula (one variable) ----------

const GRID = [0, 1, -1, 2, -2, 3, -3, 0.5, -0.5, 4, -4, 1.5, -1.5, 5, -5, 6, -6];
const fn1 = (vars, ctx) => { const F = mainFn(vars, ctx); return F && F.vars.length === 1 ? F : null; };

// f(x1) = f(x2), x1 ≠ x2: exact on a grid, else x2 ≈ for a polynomial.
export function notInjective(F) {
  const v = F.vars[0];
  const at = (x) => cas.subs(F.x, { [v]: x });
  const pts = GRID.map(Q).map((x) => ({ x, y: at(x) })).filter((p) => cv(p.y) || Number.isFinite(ev(p.y)));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (cas.equal(pts[i].y, pts[j].y)) {
      const [a, b] = num(pts[i].x) < num(pts[j].x) ? [pts[i], pts[j]] : [pts[j], pts[i]];
      return { x1: a.x, x2: b.x, value: a.y, exact: true };
    }
  }
  // Polynomial: the other roots of f(x) − f(x1).
  try {
    for (const x1 of [0, 1, -1, 2].map(Q)) {
      const g = cas.sub(F.x, at(x1));
      const rs = numericRoots(g, v).filter((z) => Math.abs(z.im) < 1e-9 && Math.abs(z.re - num(x1)) > 1e-6);
      if (rs.length) return { x1, x2approx: rs[0].re, value: at(x1), exact: false };
    }
  } catch (_) { /* not a polynomial */ }
  return null;
}
const num = (x) => { const c = cv(x); return c ? c.n / c.d : NaN; };

// A y in R with f(x) − y of one sign for every x: y is never hit.
export function notSurjective(F) {
  const v = F.vars[0];
  for (const y of [-1, 0, 1, -2, 2, -10, 10, -100, 100]) {
    const g = cas.sub(F.x, cas.num(y));
    const s = signEverywhere(g, [v]);
    if (s.s === "pos" || s.s === "neg") return { y: cas.num(y), g, sign: s.s, why: s.why };
  }
  return null;
}

// A critical point x0 where f' keeps its sign (x^3 at 0): not an extremum.
export function notExtremum(F) {
  const v = F.vars[0];
  const d1 = cas.diff(F.x, v);
  const s = signEverywhere(d1, [v]);
  if (s.s !== "nonneg" && s.s !== "nonpos") return null;
  const rr = (cas.rationalRoots(d1, v) || []).map((q) => cas.num(q));
  const x0 = rr[0] || (s.zeros && Number.isInteger(s.zeros[0]) ? cas.num(s.zeros[0]) : null);
  if (!x0) return null;
  return { x0, d1, up: s.s === "nonneg", why: s.why };
}

// ---------- template blanks ----------

// undefined: not one of these blanks.
export function resolveFailLabel(label, vars, ctx = {}) {
  if (!(vars instanceof Map)) return undefined;
  const l = label.trim();
  const body = ctx.body || "";
  // \setequal NOT equal (either direction) and \subsetproof not a subset (A not in B).
  const neq = /\{\{the other set\}\}/.test(body);
  const nsub = /\\not\\subseteq \{\{B\}\}/.test(body);
  if ((neq && /^(element|the set with it|the other set|why in it|why not in the other)$/.test(l)) || (nsub && /^(element|why in A|why not in B)$/.test(l))) {
    const V = setVerdictE2(vars);
    if (!V) return null;
    const W = V.ab || (neq ? V.ba : null);
    if (!W) return null;
    const from = `@${V.A.name}, @${V.B.name}: ${W.X.finite ? "every element tried" : "points tried on a grid"}`;
    if (l === "the set with it") return { value: latexName(W.X.name), from };
    if (l === "the other set") return { value: latexName(W.Y.name), from };
    if (l === "element") return { value: ptTex(W.p), from };
    if (/^why in/.test(l)) return { value: whyIn(W.X, W.p), prose: true, from };
    return { value: whyNotIn(W.Y, W.p), prose: true, from };
  }
  // \injective NOT injective.
  if (/\*\*not injective\*\*/.test(body) && /^(x1|x2|value)$/.test(l)) {
    const Tb = tableFn(vars, ctx);
    if (Tb) {
      const W = tableNotInjective(Tb);
      if (!W) return null;
      return { value: { x1: W.x1, x2: W.x2, value: W.value }[l], from: `@${Tb.name}, its table` };
    }
    const F = fn1(vars, ctx);
    if (!F) return undefined;
    const W = notInjective(F);
    if (!W) return null;
    const from = `@${F.v.name}: ${W.exact ? "values compared on a grid" : `the other root of ${F.v.name}(x) = ${F.v.name}(${T(W.x1)})`}`;
    if (l === "x1") return { value: T(W.x1), from };
    if (l === "x2") return { value: W.exact ? T(W.x2) : `x_2 \\approx ${Number(W.x2approx.toFixed(6))}`, from };
    return { value: T(W.value), from };
  }
  // \surjective NOT surjective.
  if (/\*\*not surjective\*\*/.test(body) && /^(y|codomain|impossible condition)$/.test(l)) {
    const Tb = tableFn(vars, ctx);
    if (Tb) {
      const W = tableNotSurjective(Tb);
      if (!W) return null;
      const from = `@${Tb.name} and @${Tb.Tname}`;
      if (l === "y") return { value: W.y, from };
      if (l === "codomain") return { value: latexName(Tb.Tname), from };
      return { value: `a pair $(x, ${W.y})$ in the table of $${Tb.name}$, and there is none (its values are $${[...new Set(Tb.pairs.map((p) => p.y))].join(", ")}$)${Tb.S && Tb.T && Tb.S.length < Tb.T.length ? `; in fact ${Tb.S.length} inputs can never hit all $|${Tb.Tname}| = ${Tb.T.length}$ values` : ""}`, prose: true, from };
    }
    const F = fn1(vars, ctx);
    if (!F) return undefined;
    const W = notSurjective(F);
    if (!W) return null;
    const from = `@${F.v.name}: ${F.v.name}(x) − y has one sign`;
    if (l === "y") return { value: T(W.y), from };
    if (l === "codomain") return { value: "\\mathbb{R}", from };
    const v = F.vars[0];
    return { value: `$${T(F.x, [v])} = ${T(W.y)}$, i.e. $${T(W.g, [v])} = 0$; but $${T(W.g, [v])} ${W.sign === "pos" ? ">" : "<"} 0$ for every $${v}$ (${W.why})`, prose: true, from };
  }
  // \truthtable: the row where two propositions differ / where one is false.
  if (/differ in this row|is false in this row/.test(body) && /^(P|Q|row|P value|Q value|proposition)$/.test(l)) {
    const I = truthInfo(vars);
    if (!I) return null;
    const from = `@${I.P.name}${I.Q ? `, @${I.Q.name}` : ""}: every row of the truth table`;
    if (l === "P" || l === "proposition") return { value: I.P.tex, from };
    if (l === "Q") return I.Q ? { value: I.Q.tex, from } : null;
    if (!I.row) return null;
    if (l === "row") return { value: rowTex(I.row), from };
    if (l === "P value") return { value: tf(I.Q ? I.pv : false), prose: true, from };
    return I.Q ? { value: tf(I.qv), prose: true, from } : null;
  }
  // \crit: a critical point that is not an extremum.
  if (/converse of Lemma 6\.37 fails/.test(body) && /^(f|x0|why f' keeps its sign|strictly increasing \/ strictly decreasing)$/.test(l)) {
    const F = fn1(vars, ctx);
    if (!F) return undefined;
    const W = notExtremum(F);
    if (!W) return null;
    const v = F.vars[0];
    const from = `@${F.v.name}`;
    if (l === "f") return { value: T(F.x, [v]), from };
    if (l === "x0") return { value: T(W.x0), from };
    if (l === "why f' keeps its sign") return { value: `$${latexName(F.v.name)}'(${v}) = ${T(W.d1, [v])} ${W.up ? "\\ge" : "\\le"} 0$ (${W.why})`, prose: true, from };
    return { value: W.up ? "strictly increasing" : "strictly decreasing", prose: true, from };
  }
  return undefined;
}
