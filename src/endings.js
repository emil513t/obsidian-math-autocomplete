// The blanks of the routes for the "other" endings: sizes that don't match,
// the symmetric matrix with the same u^T A u, points with ∇g = 0, an
// infeasible constraint system, the first n where a formula fails, a value
// where an inequality fails. Each only answers inside its own route (the
// route's text decides). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { linear, gauss, fmStep } from "./elim.js";
import { noteMatrices, noteMatrix, texM } from "./witness.js";
import { mainFn, statementVar, substituteTex, evalSide, noteFunctions, fnByName } from "./textlink.js";
import { noteFG } from "./lagrange.js";
import { contradiction, contradictionLine } from "./ineqproof.js";
import { latexName, satisfies } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const size = (M) => `${M.length} \\times ${M[0].length}`;

function matrixByName(vars, name) {
  const ms = noteMatrices(vars);
  if (name === "A") return noteMatrix(vars) || ms[0];
  return ms.find((m) => m.name === name) || ms.filter((m) => m !== noteMatrix(vars))[0] || null;
}

// The first n (from n0 on) where both sides of P(n) differ; null if none up to n0 + 30.
export function firstFailure(vars) {
  const P = statementVar(vars);
  if (!P || P.kind !== "relation" || !P.params || P.params.length !== 1) return null;
  const n0v = vars.get("n0") || vars.get("n_0");
  const n0 = n0v ? Number(n0v.value) : 1;
  for (let n = n0; n <= n0 + 30; n++) {
    const l = evalSide(substituteTex(P.lhs, P.params[0], String(n)));
    const r = evalSide(substituteTex(P.rhs, P.params[0], String(n)));
    if (!l || !r) return null;
    if (P.op === "=" ? !cas.equal(l, r) : !holdsRel(cas.evaluate(l), P.op, cas.evaluate(r))) return { n, l, r, P };
  }
  return null;
}
function holdsRel(a, op, b) {
  const o = String(op).replace(/^\\/, "");
  if (/^(le|leq|<=)$/.test(o)) return a <= b + 1e-12;
  if (/^(ge|geq|>=)$/.test(o)) return a >= b - 1e-12;
  if (o === "<" || o === "lt") return a < b;
  if (o === ">" || o === "gt") return a > b;
  return Math.abs(a - b) < 1e-12;
}

// A value of x where the inequality "lhs op rhs" in one variable fails.
export function inequalityFailure(vars) {
  const P = [...vars.values()].find((v) => v.kind === "relation" && !v.error && !/^=$/.test(v.op));
  if (!P) return null;
  const l = cas.tryParse(P.lhs); const r = cas.tryParse(P.rhs);
  if (!l || !r) return null;
  const xs = cas.orderVars(new Set([...cas.symbols(l), ...cas.symbols(r)]));
  if (!xs.length || xs.length > 3) return null;
  // E3: one value per variable from a small grid (simple numbers first), keeping
  // the note's assumptions (a > 0, ...); several variables give one tuple.
  const ks = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3, 10, -10, 0.25];
  const qs = ks.map((k) => (Number.isInteger(k) ? cas.num(k) : cas.num(Math.round(k * 4), 4)));
  const A = vars.assumptions || [];
  const tuples = (n) => (n === 0 ? [[]] : tuples(n - 1).flatMap((t) => qs.map((q) => [...t, q])));
  // Whole numbers before fractions, small before large: the example a person would try.
  const size = (t) => t.reduce((s, q) => s + Math.abs(cas.evaluate(q)) + (cas.constValue(q).d > 1 ? 5 : 0), 0);
  const cands = tuples(xs.length).filter((t) => t.every((q, i) => satisfies(A, xs[i], cas.evaluate(q)))).sort((s, t) => size(s) - size(t));
  for (const t of cands) {
    const env = Object.fromEntries(xs.map((x, i) => [x, t[i]]));
    const a = cas.subs(l, env); const b = cas.subs(r, env);
    const av = cas.evaluate(a); const bv = cas.evaluate(b);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) continue;
    if (!holdsRel(av, P.op, bv)) {
      const one = xs.length === 1;
      return { x: one ? xs[0] : `(${xs.join(", ")})`, value: one ? t[0] : null, valueTex: one ? T(t[0]) : `(${t.map((q) => T(q)).join(", ")})`, left: a, right: b, gt: av > bv };
    }
  }
  return null;
}

// Points with ∇g = 0 and g = 0 (∇g linear: Gauss), as LaTeX; "\text{none}" if there are none.
export function gradZeroPoints(vars, ctx) {
  const fg = noteFG(vars, ctx);
  if (!fg) return null;
  const xs = cas.orderVars(new Set([...fg.F.vars, ...cas.symbols(fg.G.x)]));
  const grad = xs.map((v) => cas.diff(fg.G.x, v));
  const lin = grad.map((e) => linear(e, xs));
  if (lin.some((l) => !l)) return null;
  const S = gauss(lin.map((l) => [...l.coef, cas.neg(l.c0)]), xs);
  if (S.kind === "none") return "\\text{no point (}\\nabla g \\neq 0\\text{ everywhere)}";
  if (S.kind !== "unique") return null;
  const env = Object.fromEntries(xs.map((v, i) => [v, S.values[i]]));
  const pt = `(${S.values.map((x) => T(x)).join(", ")})`;
  return cas.isZero(cas.subs(fg.G.x, env)) ? `${pt}\\text{ (on } g = 0\\text{: add it)}` : `\\text{none on } g = 0 \\text{ (}\\nabla g = 0 \\text{ only at } ${pt}, \\text{ where } g \\neq 0)`;
}

// Fourier-Motzkin on the constraints g_i <= 0: the contradiction, or null when feasible / not linear.
export function infeasible(vars, ctx) {
  const F = mainFn(vars, ctx);
  const G = noteFunctions(vars).filter((v) => (!F || v.name !== F.v.name) && /^g(_?\{?\d+\}?)?$/.test(v.name)).map((v) => fnByName(vars, v.name)).filter(Boolean);
  if (!G.length) return null;
  const xs = cas.orderVars(new Set(G.flatMap((g) => [...cas.symbols(g.x)])));
  if (G.some((g) => !linear(g.x, xs))) return null;
  // E4: name the constraints and the numbers to add them with.
  try {
    const C = contradiction(G.map((g) => ({ expr: g.x, op: "\\le", lhs: "", rhs: "0", name: `${latexName(g.v.name)} \\le 0` })), { vars: xs });
    if (C) return `eliminating $${C.order.join(", ")}$ ends in $${C.sumTex}$, which is false; directly: ${contradictionLine(C)}`;
  } catch (_) { /* fall back to plain elimination */ }
  let cur = G.map((g) => ({ e: g.x, strict: false }));
  for (const x of xs) {
    const st = fmStep(cur, xs, x);
    if (st.contradictions.length) {
      const c = st.contradictions[0];
      return `eliminating $${xs.slice(0, xs.indexOf(x) + 1).join(", ")}$ leaves $${T(c.e)} \\le 0$, which is false`;
    }
    cur = st.next;
  }
  return null;
}

// undefined: not one of these routes' blanks.
export function resolveEndingLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  if (/^size of ([A-Z])$/.test(l) && /not defined|not square/.test(body)) {
    const m = matrixByName(vars, l.slice(-1));
    return m ? { value: size(m.M), from: `@${m.name}` } : null;
  }
  if (l === "S" && /A \+ A\^\\top/.test(body)) {
    const m = noteMatrix(vars, ctx);
    if (!m || m.M.length !== m.M[0].length) return null;
    const S = m.M.map((r, i) => r.map((x, j) => cas.scale(cas.add(x, m.M[j][i]), cas.Q(1, 2))));
    return { value: texM(S), from: `@${m.name}` };
  }
  if (l === "points" && /\\nabla g = 0/.test(body)) {
    const v = gradZeroPoints(vars, ctx);
    return v ? { value: v, from: "∇g = 0 and g = 0" } : null;
  }
  if (l === "elimination" && /no feasible point|no optimum/.test(body)) {
    const v = infeasible(vars, ctx);
    return v ? { value: v, prose: true, from: "Fourier–Motzkin on the constraints" } : null;
  }
  if (/^(n|left|right)$/.test(l) && /no induction/.test(body)) {
    const f = firstFailure(vars);
    if (!f) return null;
    return { value: l === "n" ? String(f.n) : T(l === "left" ? f.l : f.r), from: `@${f.P.name} at n = ${f.n}` };
  }
  if (/^(variable|value|left|right|> \/ <)$/.test(l) && /does not hold for every value/.test(body)) {
    const f = inequalityFailure(vars);
    if (!f) return null;
    const v = { variable: f.x, value: f.valueTex, left: T(f.left), right: T(f.right), "> / <": f.gt ? ">" : "<" }[l];
    return { value: v, from: `${f.x} = ${f.valueTex}` };
  }
  return undefined;
}
