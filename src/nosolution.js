// E5 of docs/imo26-coverage/CONTRADICTIONS.md: a linear system with no
// solution, decided from the note's own system (equations c1 = x + y = 3, ...
// or a matrix A with a vector b), never from one fixed example.
//   - Gauss elimination (Section 2.3, Theorem 2.8) ends in a row 0 = c, c ≠ 0;
//   - the same contradiction in one line: numbers y_i with
//     y_1 (1) + ... + y_m (m) = "0 = c" (solve A^T y = 0, b^T y = 1 by Gauss).
// Also fills the other \gauss routes (unique, infinitely many) and the
// \leastsquares "no exact solution" route (Exercise 5.17). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { linear, combo, gauss } from "./elim.js";
import { casOf } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const XS = (n) => (n <= 3 ? ["x", "y", "z"].slice(0, n) : Array.from({ length: n }, (_, i) => `x_${i + 1}`));

// The note's linear system: { rows: [[a.., b]], vars, names: ["(1)", ...] | ["c1", ...], label } or null.
export function noteSystem(vars) {
  if (!(vars instanceof Map)) return null;
  const eqs = [...vars.values()].filter((v) => v.kind === "relation" && v.op === "=" && !v.params && !v.error && !/\\forall|\\exists/.test(v.value || ""));
  if (eqs.length >= 2) {
    try {
      const lin = eqs.map((v) => cas.sub(cas.parse(String(v.lhs)), cas.parse(String(v.rhs))));
      const xs = cas.orderVars(new Set(lin.flatMap((x) => [...cas.symbols(x)])));
      const ls = lin.map((x) => linear(x, xs));
      if (xs.length && ls.every(Boolean)) return { rows: ls.map((l) => [...l.coef, cas.neg(l.c0)]), vars: xs, names: eqs.map((v) => v.name), label: eqs.map((v) => v.name).join(", ") };
    } catch (_) { /* not linear */ }
  }
  // A v = b: a constant matrix and a constant column of the same height.
  const mats = [...vars.values()].filter((v) => v.kind === "matrix" && !v.error);
  const vecs = [...vars.values()].filter((v) => v.kind === "vector" && !v.error && !v.tuple);
  const A = mats.find((v) => v.name === "A") || mats[0];
  if (!A) return null;
  let M;
  try { M = casOf(A).M; } catch (_) { return null; }
  const b = vecs.find((v) => v.name === "b" && v.value.length === M.length) || vecs.find((v) => v.value.length === M.length);
  if (!b || M.some((r) => r.some((x) => !cv(x)))) return null;
  let bv;
  try { bv = b.value.map((x) => cas.parse(String(x))); } catch (_) { return null; }
  if (bv.some((x) => !cv(x))) return null;
  return { rows: M.map((r, i) => [...r, bv[i]]), vars: XS(M[0].length), names: M.map((_, i) => `(${i + 1})`), label: `${A.name}v = ${b.name}` };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function whole(xs) {
  const cs = xs.map(cv);
  const lcm = cs.reduce((l, c) => (c.n ? (l * c.d) / gcd(l, c.d) : l), 1);
  const ns = cs.map((c) => (c.n * lcm) / c.d);
  const g = ns.reduce((a, b) => gcd(a, b), 0) || 1;
  // First nonzero positive reads better.
  const s = Math.sign(ns.find((n) => n) || 1);
  return ns.map((n) => (s * n) / g);
}

// Numbers y_i (whole, as few nonzero as possible) with sum y_i a_i = 0 and sum y_i b_i = c != 0.
export function combination(rows, n) {
  const m = rows.length;
  const ys = Array.from({ length: m }, (_, i) => `y_${i + 1}`);
  // A^T y = 0 (n equations), b^T y = 1.
  const eq = [...Array.from({ length: n }, (_, j) => [...rows.map((r) => r[j]), cas.ZERO]), [...rows.map((r) => r[n]), cas.ONE]];
  // Try small sets of equations first (fewest rows used).
  const subsets = [];
  for (let mask = 1; mask < 1 << m; mask++) subsets.push(mask);
  subsets.sort((a, b) => popcount(a) - popcount(b) || a - b);
  for (const mask of subsets.slice(0, 4096)) {
    const idx = ys.map((_, i) => i).filter((i) => mask & (1 << i));
    const sub = eq.map((r) => [...idx.map((i) => r[i]), r[m]]);
    const S = gauss(sub, idx.map((i) => ys[i]));
    if (S.kind === "none") continue;
    const free = S.free || [];
    const zero = Object.fromEntries(free.map((_, i) => [free.length === 1 ? "t" : `t_${i + 1}`, cas.ZERO]));
    const vals = S.values.map((x) => cas.subs(x, zero));
    if (vals.some((x) => !cv(x))) continue;
    const y = Array.from({ length: m }, () => cas.ZERO);
    idx.forEach((i, k) => { y[i] = vals[k]; });
    if (idx.some((i) => cas.isZero(y[i]))) continue; // a smaller set does it
    const k = whole(y);
    const c = rows.reduce((s, r, i) => cas.add(s, cas.mul(cas.num(k[i]), r[n])), cas.ZERO);
    return { k, c };
  }
  return null;
}
const popcount = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

const nm = (s) => (/^\(\d+\)$/.test(s) ? s : `$${s}$`);
export function combinationLine(sys, K) {
  const used = K.k.map((k, i) => ({ k, name: sys.names[i] })).filter((u) => u.k);
  const say = used.map((u) => (u.k === 1 ? nm(u.name) : `$${u.k}$ times ${nm(u.name)}`));
  const list = say.length === 1 ? say[0] : `${say.slice(0, -1).join(", ")} and ${say[say.length - 1]}`;
  return `adding ${list} gives $0 = ${T(K.c)}$`;
}
export function combinationTex(sys, K) {
  const n = sys.vars.length;
  const lines = K.k.map((k, i) => ({ k, i })).filter((u) => u.k).map(({ k, i }) => {
    const r = sys.rows[i].map((x) => cas.mul(cas.num(k), x));
    return `${sys.names[i]}${k === 1 ? "" : ` \\cdot ${k < 0 ? `(${k})` : k}`}:&\\quad ${combo(r.slice(0, n), sys.vars)} = ${T(r[n])}`;
  });
  return `\\begin{aligned} ${lines.join(" \\\\ ")} \\\\[4pt] \\text{sum}:&\\quad 0 = ${T(K.c)} \\end{aligned}`;
}

// Everything the routes need: { sys, G (gauss), K (combination, when none) }.
export function gaussInfo(vars) {
  const sys = noteSystem(vars);
  if (!sys) return null;
  const G = gauss(sys.rows, sys.vars);
  return { sys, G, K: G.kind === "none" ? combination(sys.rows, sys.vars.length) : null };
}

const arrayRows = (rows) => rows.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ");
const withBar = (rows, n) => `\\left(\\begin{array}{${"c".repeat(n)}|c} ${arrayRows(rows)} \\end{array}\\right)`;

// Template blanks. undefined: not one of these blanks.
export function resolveGaussLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  const isGauss = /Gauss elimination|Theorem 2\.8/.test(body);
  if (!isGauss) return undefined;
  const LS = /best approximation \(Theorem 5\.16\)/.test(body);
  const mine = /^(system rows|reduced system|nonzero|elimination steps|system after elimination|row|combination|x1|x2|x3|free variable|x = \.\.\., y = \.\.\.|solution vector in terms of t|x3, then x2, then x1|check in the original equations)$/.test(l);
  if (!mine) return undefined;
  const I = gaussInfo(vars);
  if (!I) return null;
  const { sys, G, K } = I;
  const n = sys.vars.length;
  const from = `@${sys.label}, Gauss elimination`;
  const three = n === 3; // the routes' arrays have 3 columns before the bar
  try {
    if (l === "system rows") return three ? { value: arrayRows(sys.rows), from } : null;
    if (l === "reduced system") return three ? { value: arrayRows(G.rows), from } : null;
    if (l === "system after elimination") return { value: withBar(G.rows, n), from };
    if (l === "elimination steps") {
      const ops = G.steps.flatMap((s) => s.ops);
      return { value: ops.length ? `${ops.join(", ")}` : "nothing to eliminate", prose: true, from };
    }
    if (G.kind === "none") {
      if (l === "nonzero") return { value: T(G.rows[G.bad][n]), from: LS ? `@${sys.label}` : from };
      if (l === "row") return { value: String(G.bad + 1), from };
      if (l === "combination") return K ? { value: combinationLine(sys, K), prose: true, from: `@${sys.label}, numbers from Gauss elimination` } : null;
      return null;
    }
    if (/^x[123]$/.test(l) && G.kind === "unique") { const i = Number(l[1]) - 1; return i < n ? { value: T(G.values[i]), from } : null; }
    if (l === "x3, then x2, then x1" && G.kind === "unique") return { value: G.back.map((b) => `$${b.var} = ${T(b.value)}$`).join(", then "), prose: true, from };
    if (l === "check in the original equations" && G.kind === "unique") {
      const ok = sys.rows.map((r) => `$${T(cas.add(...sys.vars.map((_, j) => cas.mul(r[j], G.values[j]))))} = ${T(r[n])}$`);
      return { value: ok.join(", "), prose: true, from };
    }
    if (G.kind === "infinite") {
      if (l === "free variable") return { value: G.free[0], from };
      if (l === "x = ..., y = ...") return { value: sys.vars.filter((v) => !G.free.includes(v)).map((v) => `${v} = ${T(G.values[sys.vars.indexOf(v)])}`).join(",\\ "), from };
      if (l === "solution vector in terms of t") return { value: `(${G.values.map((x) => T(x)).join(", ")})`, from };
    }
  } catch (_) { return null; }
  return null;
}
