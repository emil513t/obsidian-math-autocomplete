// Endings that depend on a parameter: "a < -2: indefinite, a = -2: positive
// semi-definite, -2 < a < 2: positive definite, ...". The parameter's
// critical values are where the deciding quantity is 0 (the definiteness of
// a symmetric matrix can only change where its D-entries, equivalently
// det A(a), pass 0; invertibility where D = ad - bc ... is 0; the number of
// roots where b^2 - 4ac or the top coefficient is 0). Between and at those
// values one test value decides the case. Assumptions (a > 0) cut the line.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteMatrix } from "./witness.js";
import { mainFn } from "./textlink.js";
import { numericRoots } from "./objects.js";
import { satisfies } from "./vars.js";

const TOL = 1e-7;
const isConstM = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));
const symsOf = (xs) => [...new Set(xs.flatMap((x) => [...cas.symbols(x)]))];

// Real roots of a polynomial in p: exact when rational, else numeric (deduplicated).
function realRoots(poly, p) {
  if (cas.isZero(poly) || !cas.symbols(poly).has(p)) return [];
  const exact = (cas.rationalRoots(poly, p) || []).map((q) => q.n / q.d);
  let num = [];
  try { num = numericRoots(poly, p).filter((z) => Math.abs(z.im) < 1e-5).map((z) => z.re); } catch (_) { /* exact only */ }
  const all = [...exact, ...num].sort((a, b) => a - b);
  const out = [];
  for (const r of all) {
    const snap = exact.find((e) => Math.abs(e - r) < 1e-6);
    const v = snap ?? r;
    if (!out.some((o) => Math.abs(o - v) < 1e-6)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

// A critical value as math: a fraction, ±sqrt(q), or a decimal.
export function valueTex(r) {
  const frac = (x) => {
    for (let d = 1; d <= 64; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return d === 1 ? `${n}` : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`; }
    return null;
  };
  const f = frac(r);
  if (f !== null) return f;
  const sq = frac(Math.round(r * r * 1e6) / 1e6);
  if (sq !== null && !sq.includes("-")) return `${r < 0 ? "-" : ""}\\sqrt{${sq}}`;
  return `${Number(r.toFixed(4))}\\ldots`;
}

// Eigen-free numeric definiteness of a symmetric matrix: symmetric
// Gauss reduction in floats (the same reduction as Section 8.7).
function numericDefiniteness(M) {
  const A = M.map((r) => [...r]);
  const n = A.length;
  const D = [];
  for (let k = 0; k < n; k++) {
    let p = A[k][k];
    if (Math.abs(p) < TOL) {
      // Bring in a later diagonal entry, or add a later row/column with a non-zero entry.
      const j = A.findIndex((r, i) => i > k && Math.abs(r[i]) > TOL);
      if (j > 0) { [A[k], A[j]] = [A[j], A[k]]; for (const r of A) [r[k], r[j]] = [r[j], r[k]]; }
      else {
        const l = A[k].findIndex((x, i) => i > k && Math.abs(x) > TOL);
        if (l > 0) { for (let i = 0; i < n; i++) A[k][i] += A[l][i]; for (let i = 0; i < n; i++) A[i][k] += A[i][l]; }
      }
      p = A[k][k];
    }
    D.push(Math.abs(p) < TOL ? 0 : p);
    if (Math.abs(p) < TOL) continue;
    for (let j = k + 1; j < n; j++) {
      const c = A[k][j] / p;
      for (let i = 0; i < n; i++) A[j][i] -= c * A[k][i];
      for (let i = 0; i < n; i++) A[i][j] -= c * A[i][k];
    }
  }
  const pos = D.some((x) => x > 0); const neg = D.some((x) => x < 0); const zero = D.some((x) => x === 0);
  if (pos && neg) return "ind";
  if (pos) return zero ? "psd" : "pd";
  if (neg) return zero ? "nsd" : "nd";
  return "psd";
}

const evalM = (M, p, x) => M.map((r) => r.map((e) => cas.evaluate(e, { [p]: x })));
const detPoly = (M) => cas.mat.det(M);

// What decides the case, per command: { p, cuts: [numbers], classify(x) -> { key, why } }.
function setup(command, vars, ctx) {
  const defCase = { pd: "positive definite", psd: "positive semi-definite", nd: "negative definite", nsd: "negative semi-definite", ind: "indefinite" };
  const matrixCase = (M, keyOf) => {
    const ps = symsOf(M.flat());
    if (ps.length !== 1) return ps.length > 1 ? { many: ps } : null;
    const p = ps[0];
    return { p, cuts: realRoots(detPoly(M), p), classify: (x) => { const k = numericDefiniteness(evalM(M, p, x)); return { key: keyOf[k] || k, why: defCase[k] }; } };
  };
  if (command === "posdef" || command === "quadform") {
    const m = noteMatrix(vars, ctx);
    if (!m || isConstM(m.M)) return null;
    return matrixCase(m.M, {});
  }
  if (command === "matinv") {
    const m = noteMatrix(vars, ctx);
    if (!m || isConstM(m.M) || m.M.length !== m.M[0].length) return null;
    const ps = symsOf(m.M.flat());
    if (ps.length !== 1) return ps.length > 1 ? { many: ps } : null;
    const p = ps[0];
    const D = detPoly(m.M);
    return { p, cuts: realRoots(D, p), classify: (x) => (Math.abs(cas.evaluate(D, { [p]: x })) < TOL ? { key: "sing", why: "D = 0" } : { key: "inv", why: "D ≠ 0" }) };
  }
  if (["critxy", "hessian", "convexfn", "strictconvex"].includes(command)) {
    const F = mainFn(vars, ctx);
    // f(x, y) = x^2 + a y^2: x, y are declared, a is the parameter.
    const xs = F?.v.declared;
    if (!xs) return null;
    const H = cas.hessian(F.x, xs);
    if (H.some((r) => r.some((e) => [...cas.symbols(e)].some((s) => xs.includes(s))))) return null; // depends on the point
    if (isConstM(H)) return null;
    const keys = command === "critxy" ? { pd: "min", nd: "max", ind: "saddle", psd: "semi", nsd: "semi" }
      : command === "hessian" ? { pd: "pd", nd: "nd", ind: "ind", psd: "semi", nsd: "semi" }
      : command === "convexfn" ? { pd: "strict", psd: "convex", nd: "notconvex", nsd: "notconvex", ind: "notconvex" }
      : { pd: "strict", psd: "convexonly", nd: "notconvex", nsd: "notconvex", ind: "notconvex" };
    return matrixCase(H, keys);
  }
  if (command === "roots") {
    const F = mainFn(vars, ctx);
    if (!F?.v.declared || F.v.declared.length !== 1) return null;
    const x = F.v.declared[0];
    const c = [0, 1, 2].map((k) => { let d = F.x; for (let i = 0; i < k; i++) d = cas.diff(d, x); return cas.scale(cas.subs(d, { [x]: cas.ZERO }), cas.Q(1, [1, 1, 2][k])); });
    if (!cas.isZero(cas.diff(cas.diff(cas.diff(F.x, x), x), x))) return null; // degree > 2
    const ps = symsOf(c);
    if (ps.length !== 1) return ps.length > 1 ? { many: ps } : null;
    const p = ps[0];
    const disc = cas.sub(cas.mul(c[1], c[1]), cas.mul(cas.num(4), cas.mul(c[2], c[0])));
    const cuts = [...realRoots(c[2], p), ...realRoots(disc, p)];
    return {
      p, cuts, classify: (v) => {
        const a2 = cas.evaluate(c[2], { [p]: v });
        if (Math.abs(a2) < TOL) return { key: "rational", why: "x² drops out: a linear equation" };
        const d = cas.evaluate(disc, { [p]: v });
        return d > TOL ? { key: "two", why: "b² − 4ac > 0" } : d < -TOL ? { key: "none", why: "b² − 4ac < 0" } : { key: "double", why: "b² − 4ac = 0" };
      },
    };
  }
  return null;
}

// The ending's name per key (the same words as src/outcomes.md).
const NAMES = {
  posdef: { pd: "positive definite", psd: "positive semi-definite", nd: "negative definite", nsd: "negative semi-definite", ind: "indefinite" },
  matinv: { inv: "invertible", sing: "not invertible" },
  critxy: { min: "local minimum", max: "local maximum", saddle: "saddle point", semi: "Hessian only semi-definite: Theorem 8.12 says nothing" },
  hessian: { pd: "positive definite: local minimum", nd: "negative definite: local maximum", ind: "indefinite: saddle point", semi: "semi-definite: no conclusion from Theorem 8.12" },
  convexfn: { strict: "strictly convex", convex: "convex, not strictly", notconvex: "not convex" },
  strictconvex: { strict: "strictly convex", convexonly: "convex, not strictly", notconvex: "not convex" },
  roots: { two: "two roots", double: "one double root", none: "no real roots", rational: "x² drops out: one root of a linear equation" },
};
export const caseName = (command, key) => NAMES[command]?.[key] || NAMES[command === "quadform" ? "posdef" : ""]?.[key] || key;

// Which command a template's text is about, for {{cases in the parameter}}.
export function commandOfBody(body) {
  if (/roots|b\^2 - 4ac/i.test(body)) return "roots";
  if (/convex/i.test(body)) return "convexfn";
  if (/saddle|min \/ max/i.test(body)) return "critxy";
  if (/\\nabla\^2|Hessian/i.test(body)) return "hessian";
  if (/definite/i.test(body)) return "posdef";
  if (/invertible|inverse/i.test(body)) return "matinv";
  return "posdef";
}

// {{cases in the parameter}}: one line per case. undefined: not this label.
export function resolveCasesLabel(label, vars, ctx = {}) {
  if (!/^cases in (the parameter|a|\w)$/i.test(label.trim())) return undefined;
  const command = ctx.command || commandOfBody(ctx.body || "");
  const C = paramCases(command, vars, ctx);
  if (!C) return null;
  if (C.many) return { value: `It depends on ${C.many.map((p) => `$${p}$`).join(", ")}: give all but one of them a value in the vars block to get the cases.`, prose: true };
  return { value: C.cases.map((c) => `- $${c.where}$: ${caseName(command, c.key)}`).join("\n"), prose: true, from: `the values of $${C.p}$ where it changes` };
}

// { p, cases: [{ where (LaTeX), key, why }] } or { many: [params] } or null.
export function paramCases(command, vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  let S;
  try { S = setup(command, vars, ctx); } catch (_) { return null; }
  if (!S) return null;
  if (S.many) return { many: S.many };
  const { p } = S;
  const as = (vars.assumptions || []).filter((a) => a.name === p);
  const ok = (x) => satisfies(as, p, x);
  const bounds = as.map((a) => Number(a.value)).filter(Number.isFinite);
  const cuts = [...new Set([...S.cuts, ...bounds].map((x) => +x.toFixed(9)))].sort((a, b) => a - b);
  const isCut = (x) => S.cuts.some((c) => Math.abs(c - x) < 1e-9);
  // Pieces of the line: open intervals and the critical values themselves.
  const pieces = [];
  const edges = [-Infinity, ...cuts, Infinity];
  let openLo = null; // a boundary from an assumption (a >= 1) that belongs to the next piece
  for (let i = 0; i + 1 < edges.length; i++) {
    const a = edges[i]; const b = edges[i + 1];
    const t = !Number.isFinite(a) ? (Number.isFinite(b) ? b - 1 : 0) : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
    if (ok(t)) pieces.push({ lo: a, hi: b, loIn: openLo === a, hiIn: false, ...S.classify(t) });
    openLo = null;
    if (!Number.isFinite(b) || !ok(b)) continue;
    if (isCut(b)) { pieces.push({ lo: b, hi: b, loIn: true, hiIn: true, ...S.classify(b) }); continue; }
    const last = pieces[pieces.length - 1];
    if (last && last.hi === b) last.hiIn = true; else openLo = b;
  }
  // Merge neighbours with the same ending.
  const merged = [];
  for (const q of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.key === q.key && last.hi === q.lo && (last.hiIn || q.loIn)) { last.hi = q.hi; last.hiIn = q.hiIn; }
    else merged.push({ ...q });
  }
  const P = p;
  const where = (q) => {
    if (q.lo === q.hi) return `${P} = ${valueTex(q.lo)}`;
    if (!Number.isFinite(q.hi) && Number.isFinite(q.lo)) return `${P} ${q.loIn ? "\\ge" : ">"} ${valueTex(q.lo)}`;
    const lo = Number.isFinite(q.lo) ? `${valueTex(q.lo)} ${q.loIn ? "\\le" : "<"} ` : "";
    const hi = Number.isFinite(q.hi) ? ` ${q.hiIn ? "\\le" : "<"} ${valueTex(q.hi)}` : "";
    return lo || hi ? `${lo}${P}${hi}` : `\\text{every } ${P}`;
  };
  return { p, cases: merged.map((q) => ({ where: where(q), key: q.key, why: q.why })) };
}
