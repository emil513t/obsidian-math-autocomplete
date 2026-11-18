// E4 of docs/imo26-coverage/CONTRADICTIONS.md: linear inequalities that
// contradict each other, decided from the note's own inequalities (any
// number of them, any variables), never from one fixed example.
//
// Fourier-Motzkin elimination (Section 4.5) is run while remembering, for
// every new inequality, how many times each original inequality went into it.
// When elimination ends in a false number inequality (0 <= -1, 0 < 0), those
// numbers are the book's short proof: "multiply (1) by 2, add (3): 0 <= -1"
// (as in the XOR proof and Exercise 5.9). The set of inequalities used is made
// as small as possible, so the proof names only the ones that matter.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { linear, combo } from "./elim.js";
import { findRelation } from "./vars.js";
import { svmData } from "./verdicts.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const MAX_ROWS = 400;

// One relation -> rows e (<= | <) 0. op: <=, <, >=, >, =.
function rowsOf(rel, i) {
  const r = typeof rel === "string" ? findRelation(rel) : rel;
  if (!r) throw new Error(`"${rel}" is not an inequality`);
  const d = r.expr || cas.sub(cas.parse(String(r.lhs)), cas.parse(String(r.rhs)));
  const op = String(r.op).replace(/^\\/, "");
  const row = (e, strict, sign) => ({ e, strict, src: i, sign });
  if (/^(le|leq|<=|leqslant)$/.test(op)) return [row(d, false, 1)];
  if (op === "<" || op === "lt") return [row(d, true, 1)];
  if (/^(ge|geq|>=|geqslant)$/.test(op)) return [row(cas.neg(d), false, -1)];
  if (op === ">" || op === "gt") return [row(cas.neg(d), true, -1)];
  if (op === "=") return [row(d, false, 1), row(cas.neg(d), false, -1)];
  throw new Error(`can't use the relation ${r.op}`);
}

// A false number inequality c <= 0 / c < 0?
function falseConst(q) {
  if (cas.symbols(q.e).size) return false;
  const c = cv(q.e);
  return !!c && (q.strict ? c.n >= 0 : c.n > 0);
}

// Fourier-Motzkin on rows with multipliers m (array over the start rows).
// Returns { row, order } for the first false number inequality, or { order } when none.
function trackedFM(rows0, vars) {
  let cur = rows0.map((q, k) => ({ ...q, m: rows0.map((_, j) => (j === k ? cas.ONE : cas.ZERO)) }));
  const order = [];
  const bad0 = cur.find(falseConst);
  if (bad0) return { row: bad0, order };
  let left = vars.filter((v) => cur.some((q) => !cas.isZero(cas.diff(q.e, v))));
  while (left.length) {
    // Eliminate the variable that makes the fewest new inequalities.
    const count = (x) => {
      let lo = 0, hi = 0;
      for (const q of cur) { const a = cv(cas.diff(q.e, x)); if (a && a.n < 0) lo++; else if (a && a.n > 0) hi++; }
      return lo * hi - lo - hi;
    };
    const x = [...left].sort((a, b) => count(a) - count(b))[0];
    order.push(x);
    const lower = [], upper = [], next = [];
    for (const q of cur) {
      const a = cas.diff(q.e, x);
      if (cas.isZero(a)) { next.push(q); continue; }
      const c = cv(a);
      if (!c) return null; // not linear
      (c.n < 0 ? lower : upper).push({ q, a });
    }
    for (const L of lower) for (const U of upper) {
      const kL = cas.div(cas.ONE, cas.neg(L.a)); const kU = cas.div(cas.ONE, U.a);
      const e = cas.add(cas.mul(kL, L.q.e), cas.mul(kU, U.q.e));
      const m = L.q.m.map((x0, j) => cas.add(cas.mul(kL, x0), cas.mul(kU, U.q.m[j])));
      next.push({ e, strict: L.q.strict || U.q.strict, m });
    }
    const bad = next.find(falseConst);
    if (bad) return { row: bad, order };
    // Drop true number inequalities and repeats.
    cur = [];
    for (const q of next) {
      if (!cas.symbols(q.e).size) continue;
      if (!cur.some((p) => cas.equal(p.e, q.e) && p.strict === q.strict)) cur.push(q);
    }
    if (cur.length > MAX_ROWS) return null;
    left = left.filter((v) => v !== x && cur.some((q) => !cas.isZero(cas.diff(q.e, v))));
  }
  return { order };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
// Rational multipliers -> smallest whole numbers with the same ratios.
function wholeNumbers(xs) {
  const cs = xs.map(cv);
  const lcm = cs.reduce((l, c) => (c.n ? (l * c.d) / gcd(l, c.d) : l), 1);
  const ns = cs.map((c) => (c.n * lcm) / c.d);
  const g = ns.reduce((a, b) => gcd(a, b), 0) || 1;
  return ns.map((n) => n / g);
}

// The system as relations (strings like "x + y \le 1" or { lhs, op, rhs, name }).
// Returns null when it has a solution (or is not linear), else the proof:
// { vars, order, used: [{ i, name, rel, k, rowTex, scaledTex, eq }], sumTex, falseTex, strict }.
export function contradiction(rels, opts = {}) {
  const parsed = rels.map((r) => (typeof r === "string" ? findRelation(r) : r));
  if (parsed.some((r) => !r)) return null;
  let rows;
  try { rows = parsed.flatMap((r, i) => rowsOf(r, i)); } catch (_) { return null; }
  const vars = opts.vars || cas.orderVars(new Set(rows.flatMap((q) => [...cas.symbols(q.e)])));
  const names = opts.names || vars;
  if (rows.some((q) => !linear(q.e, vars))) return null;
  const run = (rs) => { const R = trackedFM(rs, vars); return R && R.row ? R : null; };
  let R = run(rows);
  if (!R) return null;
  // Smallest set: drop one relation at a time while the rest still contradict each other.
  let keep = [...new Set(rows.map((q) => q.src))];
  for (const i of [...keep]) {
    if (!R.row.m.some((x, j) => rows[j].src === i && !cas.isZero(x))) { keep = keep.filter((k) => k !== i); continue; }
    const trial = keep.filter((k) => k !== i);
    const R2 = run(rows.filter((q) => trial.includes(q.src)));
    if (R2) { keep = trial; rows = rows.filter((q) => trial.includes(q.src)); R = R2; }
  }
  rows = rows.filter((q) => keep.includes(q.src));
  R = run(rows);
  if (!R) return null;
  // Per original relation: k_i (an equation may get a negative number).
  const k = wholeNumbers(R.row.m);
  const per = new Map();
  rows.forEach((q, j) => { if (k[j]) per.set(q.src, (per.get(q.src) || 0) + k[j] * (q.sign === -1 && /^=$/.test(String(parsed[q.src].op)) ? -1 : 1)); });
  const used = [];
  let sum = cas.ZERO; let strict = false;
  for (const [i, ki] of [...per.entries()].sort((a, b) => a[0] - b[0])) {
    if (!ki) continue;
    const r = parsed[i];
    const eq = /^=$/.test(String(r.op));
    const q = eq ? rows.find((x) => x.src === i && x.sign === 1) : rows.find((x) => x.src === i);
    const e = q.e;
    const kq = cas.num(eq ? ki : Math.abs(ki));
    sum = cas.add(sum, cas.mul(kq, e));
    if (q.strict) strict = true;
    used.push({ i, name: r.name || `(${i + 1})`, rel: r, k: eq ? ki : Math.abs(ki), eq, flipped: !eq && q.sign === -1, rowTex: leTex(e, eq ? "=" : q.strict ? "<" : "\\le", vars, names), scaledTex: leTex(cas.mul(kq, e), eq ? "=" : q.strict ? "<" : "\\le", vars, names) });
  }
  // The sum must be a number that makes the inequality false.
  if (cas.symbols(sum).size) return null;
  const c = cv(sum);
  if (!(strict ? c.n >= 0 : c.n > 0)) return null;
  // All of them ≥ / >: add them as they stand (no multiplying by −1).
  if (used.every((u) => u.flipped)) {
    for (const u of used) {
      const q = rows.find((x) => x.src === u.i);
      const op = q.strict ? ">" : "\\ge";
      u.flipped = false; u.ge = true;
      u.rowTex = leTex(cas.neg(q.e), op, vars, names);
      u.scaledTex = leTex(cas.mul(cas.num(u.k), cas.neg(q.e)), op, vars, names);
    }
    return { vars: names, order: R.order.map((x) => names[vars.indexOf(x)]), used, sum, strict, sumTex: `0 ${strict ? ">" : "\\ge"} ${T(sum)}` };
  }
  return { vars: names, order: R.order.map((x) => names[vars.indexOf(x)]), used, sum, strict, sumTex: `0 ${strict ? "<" : "\\le"} ${T(cas.neg(sum))}` };
}

// e (op) 0 written as  variable terms (op) number.
function leTex(e, op, vars, names = vars) {
  const l = linear(e, vars);
  if (!l) return `${T(e, vars)} ${op} 0`;
  return `${combo(l.coef, names)} ${op} ${T(cas.neg(l.c0))}`;
}

const relTex = (r) => `${r.lhs} ${String(r.op).startsWith("\\") || /^[<>=]$/.test(r.op) ? r.op : r.op} ${r.rhs}`;
const times = (k) => (k === 1 ? "" : `${k} \\cdot `);

// The proof, Markdown (book wording). opts.what: "the inequalities" / "the constraints";
// opts.point: "(x, y)" to name the assumed solution.
export function contradictionProof(C, opts = {}) {
  if (!C) return "";
  const what = opts.what || "the inequalities";
  const pt = opts.point || (C.vars.length === 1 ? C.vars[0] : `(${C.vars.join(", ")})`);
  const flips = C.used.filter((u) => u.flipped);
  const lines = C.used.map((u) => `${u.name}${u.k === 1 ? "" : ` \\cdot ${u.k < 0 ? `(${u.k})` : u.k}`}:&\\quad ${u.scaledTex}`);
  const say = C.used.map((u) => (u.k === 1 ? `${nm(u)}` : `$${u.k}$ times ${nm(u)}`));
  const list = say.length === 1 ? say[0] : `${say.slice(0, -1).join(", ")} and ${say[say.length - 1]}`;
  const eqs = C.used.some((u) => u.eq) ? " (an equation may be multiplied by any number, also a negative one)" : "";
  const out = [];
  out.push(`**Proof.** Suppose $${pt}$ satisfies all of ${what}.${flips.length ? ` Write ${flips.map((u) => `${nm(u)} as $${u.rowTex}$`).join(", ")} (multiply by $-1$).` : ""} Add ${list}; multiplying an inequality by a positive number and adding inequalities keeps their direction (Definition 1.65)${eqs}:`);
  out.push(`$$\\begin{aligned} ${lines.join(" \\\\ ")} \\\\[4pt] \\text{sum}:&\\quad ${C.sumTex} \\end{aligned}$$`);
  out.push(`The variables cancel, and $${C.sumTex}$ is false — a contradiction. So ${what} have no common solution. $\\blacksquare$`);
  if (C.order.length) out.push(`*The numbers come from Fourier–Motzkin elimination (Section 4.5): eliminating $${C.order.join("$, $")}$ ends in $${C.sumTex}$.*`);
  return out.join("\n\n");
}
const nm = (u) => (/^\(\d+\)$/.test(u.name) ? u.name : `$${u.name}$`);

// One line for a blank: "adding 2·(1) and (3) gives 0 ≤ −1".
export function contradictionLine(C) {
  if (!C) return "";
  const say = C.used.map((u) => `${u.k === 1 ? "" : `$${u.k}$ times `}${nm(u)}${u.flipped ? ` (as $${u.rowTex}$)` : ""}`);
  return `adding ${say.length === 1 ? say[0] : `${say.slice(0, -1).join(", ")} and ${say[say.length - 1]}`} gives $${C.sumTex}$`;
}

// ---------- from the note ----------

// The note's linear relations (c1 = x + y \le 1, ...): at least one inequality, no parameters.
export function noteRelations(vars) {
  if (!(vars instanceof Map)) return [];
  const rels = [...vars.values()].filter((v) => v.kind === "relation" && !v.params && !v.error && v.lhs != null && !/\\forall|\\exists/.test(v.value || ""));
  if (!rels.some((v) => v.op !== "=")) return [];
  return rels;
}
export function noteContradiction(vars) {
  const rels = noteRelations(vars);
  if (rels.length < 2) return null;
  try { return contradiction(rels); } catch (_) { return null; }
}

// Separation (Exercise 5.9): labels l_i = ±1 at points v_i. The line
// alpha · v + beta = 0 separates them strictly when l_i (alpha · v_i + beta) > 0 for all i.
export const separationVars = (d) => (d === 1
  ? { vars: ["alpha", "beta"], names: ["\\alpha", "\\beta"] }
  : { vars: [...Array.from({ length: d }, (_, j) => `alpha_${j + 1}`), "beta"], names: [...Array.from({ length: d }, (_, j) => `\\alpha_${j + 1}`), "\\beta"] });
export function separationRelations(X, y) {
  const { vars } = separationVars(X[0].length);
  return X.map((x, i) => ({ name: `(${i + 1})`, op: ">", lhs: "", rhs: "0", point: x, label: y[i],
    expr: cas.mul(y[i], cas.add(cas.sym("beta"), ...x.map((c, j) => cas.mul(c, cas.sym(vars[j]))))) }));
}
export function separationContradiction(X, y) {
  try { return contradiction(separationRelations(X, y), separationVars(X[0].length)); } catch (_) { return null; }
}
// "(1)\ -\alpha_1 + \alpha_2 + \beta > 0" per point, for the blank.
export function separationTex(X, y) {
  const { vars, names } = separationVars(X[0].length);
  return separationRelations(X, y).map((r, i) => {
    const l = linear(r.expr, vars);
    return `(${i + 1})\\ ${combo(l.coef, names)} > 0`;
  });
}
// "(1), (2), 4 times (3)": the inequalities the proof adds.
export function usedList(C) {
  const say = C.used.map((u) => `${u.k === 1 ? "" : `$${u.k}$ times `}${nm(u)}${u.flipped ? ` (as $${u.rowTex}$)` : ""}`);
  return say.length === 1 ? say[0] : `${say.slice(0, -1).join(", ")} and ${say[say.length - 1]}`;
}

// Template blanks (route text decides which). undefined: not one of these blanks.
export function resolveIneqLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  // \svm / Exercise 5.9: no separating line.
  if (/separates them/.test(body) && /^(inequalities for each point|suitable ones|false inequality)$/.test(l)) {
    const D = svmData(vars, ctx);
    if (!D) return null;
    const C = separationContradiction(D.X, D.y);
    if (!C) return null;
    const from = "the labeled points, Fourier–Motzkin (Section 4.5)";
    if (l === "inequalities for each point") return { value: `$${separationTex(D.X, D.y).join(",\\quad ")}$ (point $i$ on its own side: $\\ell_i(\\alpha^\\top v_i + \\beta) > 0$)`, prose: true, from };
    if (l === "suitable ones") return { value: usedList(C), prose: true, from };
    return { value: C.sumTex, from };
  }
  // \fm: a system with no solution.
  if (/\{\{multiply and add\}\}/.test(body) && /^(eliminated variables|false inequality|multiply and add)$/.test(l)) {
    const C = noteContradiction(vars);
    if (!C) return null;
    const from = `@${noteRelations(vars).map((v) => v.name).join(", @")}, Fourier–Motzkin`;
    if (l === "eliminated variables") return { value: C.order.join(", "), from };
    if (l === "false inequality") return { value: C.sumTex, from };
    return { value: contradictionLine(C), prose: true, from };
  }
  return undefined;
}
export { relTex, times };
