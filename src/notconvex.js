// E8 of docs/imo26-coverage/CONTRADICTIONS.md: not convex / not strictly
// convex, decided from the note's own function or set (any number of
// variables), never from one fixed example.
//   - f not convex: a point v and a direction u with u^T ∇²f(v) u < 0 (f'' < 0
//     in one variable) — then f is concave near v along u, and x = v - h u,
//     y = v + h u, t = 1/2 break Definition 4.26 (checked with the numbers).
//   - f convex, not strictly convex: a direction u with u^T ∇²f u = 0 at every
//     point (the null vector of a constant Hessian, Section 2.3), so f is linear
//     on the segment from v to v + u and the strict inequality of Definition 6.1
//     fails (6.6, 8.28, 9.52, 9.54(1)).
//   - a set that is not convex: two of its points whose midpoint is outside
//     (Definition 4.21).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { mainFn } from "./textlink.js";
import { definitenessWitness, zeroSolution } from "./witness.js";
import { noteSet } from "./verdicts.js";
import { latexName } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const ev = (x, env) => { try { return cas.evaluate(x, env); } catch (_) { return NaN; } };
const isConstM = (M) => M.every((r) => r.every((x) => cv(x)));
const Q = (v) => (Number.isInteger(v) ? cas.num(v) : cas.num(Math.round(v * 4), 4));
const tuple = (p) => (p.length === 1 ? T(p[0]) : `(${p.map((x) => T(x)).join(", ")})`);
const envOf = (xs, p) => Object.fromEntries(xs.map((v, i) => [v, p[i]]));
const atExact = (e, xs, p) => cas.subs(e, envOf(xs, p));

const GRID1 = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3];
function grid(n) {
  if (n > 3) return [Array(n).fill(0), Array(n).fill(1)];
  const g = (k) => (k === 0 ? [[]] : g(k - 1).flatMap((t) => GRID1.map((v) => [...t, v])));
  return g(n);
}

// Hessian at a point as exact numbers (null when it is not exact there).
function hessianAt(H, xs, p) {
  const M = H.map((r) => r.map((x) => atExact(x, xs, p)));
  if (isConstM(M)) return M;
  // e^{...}, ln: the numbers, rounded to 6 decimals (only used to find a direction;
  // the pair itself is checked with f's values).
  const env = envOf(xs, p.map((x) => ev(x)));
  const N = H.map((r) => r.map((x) => ev(x, env)));
  if (N.some((r) => r.some((v) => !Number.isFinite(v)))) return null;
  return N.map((r) => r.map((v) => cas.num(Math.round(v * 1e6), 1e6)));
}

// A point v (in the domain: f finite there) and u with u^T H(v) u < 0, or null.
export function concaveDirection(F) {
  const xs = F.vars;
  const H = cas.hessian(F.x, xs);
  const fin = (p) => Number.isFinite(ev(F.x, envOf(xs, p.map((x) => ev(x)))));
  for (const pt of grid(xs.length)) {
    const p = pt.map(Q);
    if (!fin(p)) continue;
    const Hp = hessianAt(H, xs, p);
    if (!Hp) continue;
    const W = definitenessWitness(Hp);
    if (!W || !W.neg) continue;
    return { p, u: W.neg.u, q: W.neg.value, Hp, H };
  }
  return null;
}

// x = v - h u, y = v + h u with f((x + y)/2) > (f(x) + f(y))/2.
export function badPair(F) {
  const D = concaveDirection(F);
  if (!D) return null;
  const xs = F.vars;
  const fv = atExact(F.x, xs, D.p);
  for (let k = 0, h = cas.ONE; k < 14; k++, h = cas.mul(h, cas.num(1, 2))) {
    const x = D.p.map((c, i) => cas.sub(c, cas.mul(h, D.u[i])));
    const y = D.p.map((c, i) => cas.add(c, cas.mul(h, D.u[i])));
    const fx = atExact(F.x, xs, x); const fy = atExact(F.x, xs, y);
    const avg = cas.mul(cas.num(1, 2), cas.add(fx, fy));
    const gap = cas.sub(fv, avg);
    const g = cv(gap);
    const exact = !!g;
    const gn = g ? g.n / g.d : ev(fv) - ev(avg);
    if (!(gn > (exact ? 0 : 1e-9))) continue;
    return { ...D, x, y, mid: D.p, fx, fy, fv, avg, exact };
  }
  return null;
}

// A direction where f is linear: u^T H u = 0 for every point (exactly), or null.
export function flatDirection(F) {
  const xs = F.vars;
  const H = cas.hessian(F.x, xs);
  const quad = (u) => cas.add(...xs.flatMap((_, i) => xs.map((__, j) => cas.mul(u[i], u[j], H[i][j]))));
  if (xs.length === 1) return cas.isZero(H[0][0]) ? { u: [cas.ONE], H } : null;
  const cands = [];
  if (isConstM(H)) { const z = zeroSolution(H); if (z) cands.push(z); }
  // Not constant: null vectors of H at a sample point, checked everywhere.
  for (const pt of grid(xs.length).slice(0, 12)) {
    const Hp = hessianAt(H, xs, pt.map(Q));
    if (Hp) { const z = zeroSolution(Hp); if (z) cands.push(z); }
  }
  for (const u of cands) {
    const q = quad(u);
    if (cas.isZero(q)) return { u, H };
    // The CAS may not simplify exp/log sums: then check at many points.
    const ok = grid(xs.length).every((pt) => { const v = ev(q, envOf(xs, pt)); return !Number.isFinite(v) || Math.abs(v) < 1e-9; });
    if (ok) return { u, H, numeric: true };
  }
  return null;
}

// Convex everywhere? true / false / null (constant Hessian or one variable only).
function convexKnown(F) {
  const H = cas.hessian(F.x, F.vars);
  if (!isConstM(H)) return null;
  if (H.every((r) => r.every(cas.isZero))) return true;
  const d = definitenessWitness(H)?.d || "";
  return /^positive (semi)?definite|^positive semidefinite/.test(d);
}

// The segment from v to v + u where f is linear: exact values at both ends and the midpoint.
export function linearSegment(F) {
  const L = flatDirection(F);
  if (!L) return null;
  const xs = F.vars;
  const v = xs.map(() => cas.ZERO);
  const w = L.u;
  const mid = w.map((x) => cas.mul(cas.num(1, 2), x));
  const fv = atExact(F.x, xs, v); const fw = atExact(F.x, xs, w); const fm = atExact(F.x, xs, mid);
  return { ...L, v, w, mid, fv, fw, fm, convex: convexKnown(F) };
}

// ---------- sets ----------

const holdsExact = (S, env) => S.conds.every(({ e, op }) => {
  const x = cas.subs(e, env); const c = cv(x);
  const n = c ? c.n / c.d : ev(x);
  if (!Number.isFinite(n)) return false;
  return op === "<" ? n < 0 : op === "<=" ? n <= 0 : op === "=" ? n === 0 : n !== 0;
});
// Two points of the set whose midpoint is not in it, or null.
export function setBadPair(vars, ctx = {}) {
  const S = noteSet(vars, ctx);
  if (!S) return null;
  const vals = [0, 1, -1, 2, -2, 0.5, -0.5, 3, -3];
  const pts = [];
  const g = (k) => (k === 0 ? [[]] : g(k - 1).flatMap((t) => vals.map((v) => [...t, v])));
  if (S.xs.length > 3) return null;
  for (const pt of g(S.xs.length)) {
    const p = pt.map(Q);
    if (holdsExact(S, envOf(S.xs, p))) pts.push(p);
  }
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const m = pts[i].map((x, k) => cas.mul(cas.num(1, 2), cas.add(x, pts[j][k])));
    const env = envOf(S.xs, m);
    if (!holdsExact(S, env)) {
      const broken = S.conds.find(({ e, op }) => !holdsExact({ conds: [{ e, op }] }, env));
      return { S, x: pts[i], y: pts[j], m, broken, value: cas.subs(broken.e, env) };
    }
  }
  return null;
}
const OPTEX = { "<": "<", "<=": "\\le", "=": "=", "!=": "\\neq" };
const NOTOP = { "<": "\\ge", "<=": ">", "=": "\\neq", "!=": "=" };

// ---------- template blanks ----------

// undefined: not one of these blanks.
export function resolveConvexLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  if (!(vars instanceof Map)) return undefined;
  // \convexset NOT convex: the midpoint leaves the set.
  if (/the midpoint \$?\\frac\{1\}\{2\}\(x \+ y\)/.test(body) && /^(x|y|midpoint|reason)$/.test(l)) {
    const B = setBadPair(vars, ctx);
    if (!B) return null;
    const from = `@${B.S.name}, points tried on a grid`;
    if (l === "x") return { value: tuple(B.x), from };
    if (l === "y") return { value: tuple(B.y), from };
    if (l === "midpoint") return { value: tuple(B.m), from };
    return { value: `$${T(B.value)} ${NOTOP[B.broken.op]} 0$ there, so the condition $${T(B.broken.e)} ${OPTEX[B.broken.op]} 0$ fails`, prose: true, from };
  }
  const F = mainFn(vars, ctx);
  if (!F) return undefined;
  const nm = latexName(F.v.name);
  // \convexfn NOT convex: one bad pair.
  if (/\\frac\{f\(x\) \+ f\(y\)\}\{2\}/.test(body) && /^(x|y|value|value 2)$/.test(l)) {
    const B = badPair(F);
    if (!B) return null;
    const from = `@${F.v.name}: ${F.vars.length === 1 ? `${F.v.name}'' < 0 at ${T(B.p[0])}` : `u^T ∇²${F.v.name} u < 0 at ${tuple(B.p)}`}`;
    if (l === "x") return { value: tuple(B.x), from };
    if (l === "y") return { value: tuple(B.y), from };
    const fmt = (x) => (B.exact ? T(x) : `${T(x)} \\approx ${Number(ev(x).toFixed(6))}`);
    return { value: l === "value" ? fmt(B.fv) : fmt(B.avg), from };
  }
  // \strictconvex NOT convex: the Hessian / f'' at one point.
  if (/is an "if and only if"/.test(body) && /^(point|f'' or the Hessian|value|negative \/ not positive semi-definite.*|U)$/.test(l)) {
    const D = concaveDirection(F);
    if (!D) return null;
    const one = F.vars.length === 1;
    const from = `@${F.v.name}`;
    if (l === "point") return { value: `${one ? F.vars[0] : `(${F.vars.join(", ")})`} = ${tuple(D.p)}`, from };
    if (l === "f'' or the Hessian") return { value: one ? `${nm}''(${T(D.p[0])})` : `\\nabla^2 ${nm}${tuple(D.p)}`, from };
    if (l === "value") return { value: one ? T(D.Hp[0][0]) : `\\begin{pmatrix} ${D.Hp.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`, from };
    if (l === "U") return { value: one ? "\\mathbb{R}" : `\\mathbb{R}^{${F.vars.length}}`, from };
    return { value: one ? "negative" : `not positive semi-definite: $u = ${tuple(D.u)}$ gives $u^\\top \\nabla^2 ${nm} u = ${T(D.q)} < 0$ (Definition 8.9)`, prose: true, from };
  }
  // \strictconvex convex but NOT strictly convex: f linear on a segment.
  if (/it is linear there/.test(body) && /^(u|v)$/.test(l)) {
    const S = linearSegment(F);
    if (!S) return null;
    const from = `@${F.v.name}: along ${tuple(S.u)} the second derivative is 0${S.numeric ? " (checked at many points)" : ""}`;
    return { value: tuple(l === "u" ? S.v : S.w), from };
  }
  return undefined;
}

// For the ★ (outcomes.js): "notconvex" with a pair, "convexonly" with a flat direction of a convex f.
export function convexVerdict(F) {
  try {
    if (badPair(F)) return "notconvex";
    const S = linearSegment(F);
    if (S && S.convex) return "convexonly";
  } catch (_) { /* no opinion */ }
  return null;
}
