// E9 of docs/imo26-coverage/CONTRADICTIONS.md: a given point is not optimal,
// decided from the note's own f, constraints g_i <= 0 and point (any number of
// variables and constraints, any f and g that the exact CAS can differentiate).
//   - KKT at the point (Theorem 9.37): λ_i = 0 for the inactive constraints,
//     ∇f(v) + Σ λ_i ∇g_i(v) = 0 solved by Gauss elimination; no solution with
//     all λ_i ≥ 0 means v is not optimal when the problem is convex and
//     strictly feasible (Theorem 9.37 (i)). Exercises 9.52(3), 9.56(2), 9.57(2).
//   - a better feasible point w, found by walking from v in a direction where
//     f decreases (along −∇f first, Lemma 7.17): f(w) < f(v) with every
//     g_i(w) ≤ 0, which needs no theorem at all. Exercises 9.46(b), 9.56(2).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { gauss, linear } from "./elim.js";
import { mainFn, noteFunctions, fnByName, pointVar, pointExprs } from "./textlink.js";
import { contradiction } from "./ineqproof.js";
import { definitenessWitness } from "./witness.js";
import { latexName } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const sgn = (x) => { const c = cv(x); return c ? Math.sign(c.n) : null; };
const num = (x) => { const c = cv(x); return c ? c.n / c.d : NaN; };

// f, the constraints g, g1, g_2, ... (each meaning g_i <= 0), the point.
export function noteProblem(vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  const F = mainFn(vars, ctx);
  if (!F) return null;
  const G = noteFunctions(vars).filter((v) => v.name !== F.v.name && /^g(_?\{?\d+\}?)?$/.test(v.name)).map((v) => fnByName(vars, v.name)).filter(Boolean);
  if (!G.length) return null;
  const xs = cas.orderVars(new Set([...F.vars, ...G.flatMap((g) => [...cas.symbols(g.x)])]));
  const P = pointVar(vars, ctx, xs.length);
  if (!P) return null;
  let p;
  try { p = pointExprs(P); } catch (_) { return null; }
  if (p.some((x) => !cv(x))) return null;
  return { F, G, xs, P, p };
}

const at = (e, xs, p) => cas.subs(e, Object.fromEntries(xs.map((v, i) => [v, p[i]])));
const gname = (g) => latexName(g.v.name);

// Convex: constant Hessian that is positive semi-definite; null when the CAS can't tell.
function convex(e, xs) {
  const H = cas.hessian(e, xs);
  if (!H.every((r) => r.every((x) => cv(x)))) return null;
  if (H.every((r) => r.every(cas.isZero))) return true;
  const d = definitenessWitness(H)?.d || "";
  return /^positive (semi)?definite/.test(d.replace("semi-definite", "semidefinite")) || /positive semidefinite/.test(d);
}

// A point with every g_i < 0 (strictly feasible, Definition 9.36), tried on a small grid.
function strictPoint(G, xs) {
  const vals = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3, 0.25, -0.25];
  const grid = (k) => (k === 0 ? [[]] : grid(k - 1).flatMap((t) => vals.map((v) => [...t, v])));
  if (xs.length > 4) return null;
  for (const pt of grid(xs.length)) {
    const q = pt.map((v) => (Number.isInteger(v) ? cas.num(v) : cas.num(Math.round(v * 4), 4)));
    if (G.every((g) => sgn(at(g.x, xs, q)) === -1)) return q;
  }
  return null;
}

// The KKT test at the point. { feasible, active, grads, lambda, ok, why, ... }.
export function kktAtPoint(Pr) {
  const { F, G, xs, p } = Pr;
  const gv = G.map((g) => at(g.x, xs, p));
  if (gv.some((x) => sgn(x) === null)) return null;
  const violated = gv.map((x, i) => (sgn(x) > 0 ? i : -1)).filter((i) => i >= 0);
  const active = gv.map((x, i) => (cas.isZero(x) ? i : -1)).filter((i) => i >= 0);
  const df = xs.map((v) => at(cas.diff(F.x, v), xs, p));
  const dg = G.map((g) => xs.map((v) => at(cas.diff(g.x, v), xs, p)));
  if ([...df, ...dg.flat()].some((x) => !cv(x))) return null;
  const lam = active.map((i) => `lambda_${i + 1}`);
  const lamTex = active.map((i) => `\\lambda_${i + 1}`);
  // Equation j: df_j + Σ λ_i dg_ij = 0.
  const rows = xs.map((_, j) => [...active.map((i) => dg[i][j]), cas.neg(df[j])]);
  const out = { xs, p, gv, violated, active, df, dg, lamTex, rows };
  if (violated.length) return { ...out, feasible: false, ok: false };
  if (!active.length) {
    const zero = df.every(cas.isZero);
    return { ...out, feasible: true, ok: zero, kind: zero ? "unique" : "none", lambda: [] };
  }
  const S = gauss(rows, lam);
  out.feasible = true;
  if (S.kind === "none") return { ...out, ok: false, kind: "none" };
  if (S.kind === "unique") {
    const neg = S.values.map((x, k) => (sgn(x) < 0 ? k : -1)).filter((k) => k >= 0);
    return { ...out, ok: !neg.length, kind: "unique", lambda: S.values, negative: neg };
  }
  // Infinitely many λ: is one of them ≥ 0? (equations + λ ≥ 0, Fourier–Motzkin)
  const rels = [
    ...rows.map((r) => ({ expr: cas.add(...active.map((_, k) => cas.mul(r[k], cas.sym(lam[k]))), cas.neg(r[active.length])), op: "=", lhs: "", rhs: "0" })),
    ...lam.map((l) => ({ expr: cas.sym(l), op: "\\ge", lhs: "", rhs: "0" })),
  ];
  const C = contradiction(rels, { vars: lam, names: lamTex });
  return { ...out, ok: !C, kind: "infinite", certificate: C };
}

// A feasible point with a smaller value of f, or null.
export function betterPoint(Pr) {
  const { F, G, xs, p } = Pr;
  const fp = at(F.x, xs, p);
  const grad = xs.map((v) => at(cas.diff(F.x, v), xs, p));
  if (grad.some((x) => !cv(x))) return null;
  const dirs = [grad.map(cas.neg)];
  const n = xs.length;
  for (let j = 0; j < n; j++) for (const s of [1, -1]) dirs.push(xs.map((_, k) => cas.num(k === j ? s : 0)));
  for (let j = 0; j < n; j++) for (let k = j + 1; k < n; k++) for (const a of [1, -1]) for (const b of [1, -1]) dirs.push(xs.map((_, i) => cas.num(i === j ? a : i === k ? b : 0)));
  for (const [di, d] of dirs.entries()) {
    const slope = cas.add(...grad.map((g, i) => cas.mul(g, d[i])));
    if (!(sgn(slope) < 0)) continue;
    for (let e = 0, t = cas.ONE; e < 12; e++, t = cas.mul(t, cas.num(1, 2))) {
      const q = p.map((x, i) => cas.add(x, cas.mul(t, d[i])));
      const fq = at(F.x, xs, q);
      if (!(num(fq) < num(fp))) continue;
      const gq = G.map((g) => at(g.x, xs, q));
      if (gq.every((x) => sgn(x) !== null && sgn(x) <= 0)) return { q, fq, fp, gq, t, d, alongGrad: di === 0 };
    }
  }
  return null;
}

const tuple = (v) => `(${v.map((x) => T(x)).join(", ")})`;

// Everything the routes and the ★ need, or null.
export function notOptimal(vars, ctx = {}) {
  const Pr = noteProblem(vars, ctx);
  if (!Pr) return null;
  let K, B;
  try { K = kktAtPoint(Pr); } catch (_) { K = null; }
  if (!K) return null;
  try { B = K.ok ? null : betterPoint(Pr); } catch (_) { B = null; }
  const conv = [Pr.F, ...Pr.G].map((h) => convex(h.x, Pr.xs));
  const z0 = strictPoint(Pr.G, Pr.xs);
  return { Pr, K, B, convex: conv.every((c) => c === true) ? true : conv.some((c) => c === false) ? false : null, z0 };
}

// Template blanks of the \kkt NOT optimal routes. undefined: not one of these blanks.
export function resolveNotOptimalLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  if (!/is \*\*not optimal\*\*/.test(body)) return undefined;
  if (!/^(point|active constraints|equations for λ|why no λ ≥ 0|convex and strictly feasible|value at point|better point|check constraints|value at better point)$/.test(l)) return undefined;
  const N = notOptimal(vars, ctx);
  if (!N) return null;
  const { Pr, K, B } = N;
  const from = `@${Pr.F.v.name}, @${Pr.G.map((g) => g.v.name).join(", @")} at @${Pr.P.name}`;
  if (l === "point") return { value: tuple(Pr.p), from: `@${Pr.P.name}` };
  if (l === "active constraints") {
    if (!K.feasible) return { value: `none needed: $${K.violated.map((i) => `${gname(Pr.G[i])}(v) = ${T(K.gv[i])} > 0`).join(", ")}$, so $v$ is not even feasible`, prose: true, from };
    return { value: K.active.length ? K.active.map((i) => `$${gname(Pr.G[i])}(v) = 0$`).join(", ") : "none (every $g_i(v) < 0$)", prose: true, from };
  }
  if (l === "equations for λ") {
    const eqs = Pr.xs.map((_, j) => `${T(K.df[j])}${K.active.map((i, k) => { const c = K.dg[i][j]; if (cas.isZero(c)) return ""; const ct = T(c); return ` ${ct.startsWith("-") ? "-" : "+"} ${ct.replace(/^-/, "") === "1" ? "" : ct.replace(/^-/, "")}${K.lamTex[k]}`; }).join("")} = 0`);
    return { value: `$${eqs.join(",\\quad ")}$`, prose: true, from: `${from}, ∇f(v) and ∇g_i(v)` };
  }
  if (l === "why no λ ≥ 0") {
    if (!K.feasible) return { value: "Nothing to solve: $v$ breaks a constraint", prose: true, from };
    if (K.ok) return { value: `These DO have a solution with every $\\lambda_i \\ge 0$${K.lambda?.length ? ` ($${K.lamTex.map((t, k) => `${t} = ${T(K.lambda[k])}`).join(", ")}$)` : ""}, so this route does not apply: $v$ satisfies the KKT conditions`, prose: true, from };
    if (!K.active.length) return { value: `No constraint is active, so all $\\lambda_i = 0$ and the conditions say $\\nabla f(v) = ${tuple(K.df)} = 0$, which is false`, prose: true, from };
    if (K.kind === "none") return { value: "Gauss elimination (Section 2.3) shows these equations have no solution at all", prose: true, from };
    if (K.kind === "unique") return { value: `Their only solution is $${K.lamTex.map((t, k) => `${t} = ${T(K.lambda[k])}`).join(", ")}$, and $${K.negative.map((k) => `${K.lamTex[k]} < 0`).join(", ")}$`, prose: true, from };
    return { value: "Every solution has some $\\lambda_i < 0$ (Fourier–Motzkin on the equations and $\\lambda_i \\ge 0$, Section 4.5, ends in a contradiction)", prose: true, from };
  }
  if (l === "convex and strictly feasible") {
    const c = N.convex === true ? `$${Pr.F.v.name}$ and every $g_i$ have a positive semi-definite Hessian (Theorem 8.25)` : N.convex === false ? "**check this: a function here is NOT convex**" : `${"show"} $${Pr.F.v.name}$ and the $g_i$ are convex`;
    const s = N.z0 ? `$z_0 = ${tuple(N.z0)}$ has every $g_i(z_0) < 0$` : "find $z_0$ with every $g_i(z_0) < 0$";
    return { value: `${c}; ${s}`, prose: true, from };
  }
  if (!B) return null;
  if (l === "value at point") return { value: T(B.fp), from };
  if (l === "better point") return { value: tuple(B.q), from: `${from}, ${B.alongGrad ? "a step along −∇f(v) (Lemma 7.17)" : "a step from v where f decreases"}` };
  if (l === "check constraints") return { value: Pr.G.map((g, i) => `$${gname(g)}(w) = ${T(B.gq[i])} \\le 0$`).join(", "), prose: true, from };
  if (l === "value at better point") return { value: T(B.fq), from };
  return null;
}
