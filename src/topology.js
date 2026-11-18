// E7 of docs/imo26-coverage/CONTRADICTIONS.md: not bounded / not open / not
// closed / no limit / not differentiable, each with a witness written as a
// formula in R or ε, found from the note's own set or function.
//   - not bounded (Remark 5.34): a point p of S and a direction d with
//     p + t d ∈ S for every t ≥ 0 (checked on the coefficients of each
//     condition as a polynomial in t); the element p + k d, k = |R| + c
//     (⌈|R|⌉ + c in ℕ, ℤ) has |v| ≥ |R| + 1 > R (Ex 5.36: n = ⌈|R|⌉ + 1).
//   - not open (Def 5.39): v ∈ U on the edge and w = v + (ε/2) d ∉ U for
//     every ε > 0 (Ex 5.42, 5.44, 5.46); finite sets and ℤ, ℕ: a step smaller
//     than the gap to the next element.
//   - not closed (Def 5.47): v ∉ F with v + s d ∈ F for 0 < s ≤ h, so every
//     ball around v meets F (Ex 5.50(d)).
//   - no limit at a jump: the two one-sided values, ε = 1/4 of the gap (Ex 5.64).
//   - not differentiable at a corner: the slopes from the two sides (Ex 6.24, 6.31).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteSet } from "./verdicts.js";
import { coeffs, parseCases, limit1 } from "./limit.js";
import { latexName } from "./vars.js";

const T = (x, vars) => cas.tex(x, vars);
const cv = (x) => cas.constValue(x);
const num = (x) => { const c = cv(x); return c ? c.n / c.d : NaN; };
const ev = (x, env) => { try { return cas.evaluate(x, env); } catch (_) { return NaN; } };
const Q = (v) => (Number.isInteger(v) ? cas.num(v) : cas.num(Math.round(v * 4), 4));
const tupleTex = (p) => (p.length === 1 ? p[0] : `(${p.join(", ")})`);
const ptTex = (p) => tupleTex(p.map((x) => T(x)));

// ---------- the note's set ----------

// { name, kind: "builder" | "finite" | "lattice", xs, conds, domain, points }
export function noteTopSet(vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  const pref = (v) => v.name === ctx.set || /^(S|U|F|C|K|A)$/.test(v.name);
  const all = [...vars.values()].filter((v) => !v.error);
  const lattice = all.filter((v) => v.kind === "scalar" && /^\\mathbb\{[NZ]\}$/.test(String(v.value).trim()));
  const sets = all.filter((v) => v.kind === "interval" || v.kind === "set");
  const v = [...lattice, ...sets].find(pref) || lattice[0] || sets[0];
  if (!v) return null;
  if (lattice.includes(v)) return { name: v.name, kind: "lattice", xs: ["n"], conds: [], domain: String(v.value).match(/[NZ]/)[0] };
  if (v.kind === "set" && !v.builder) {
    const points = v.value.map((s) => String(s).trim().replace(/^\(|\)$/g, "").split(",").map((x) => cas.tryParse(x.trim())));
    if (!points.length || points.some((p) => p.some((x) => !x || !cv(x)) || p.length !== points[0].length)) return null;
    return { name: v.name, kind: "finite", points, d: points[0].length };
  }
  const S = noteSet(vars, { ...ctx, set: v.name, domains: true });
  if (!S || S.name !== v.name) return null;
  return { name: v.name, kind: S.domain === "N" || S.domain === "Z" ? "lattice" : "builder", xs: S.xs, conds: S.conds, domain: S.domain };
}

const env = (xs, p) => Object.fromEntries(xs.map((x, i) => [x, p[i]]));
function condOk(x, op) {
  const c = cv(x); const n = c ? c.n / c.d : ev(x);
  if (!Number.isFinite(n)) return false;
  return op === "<" ? n < 0 : op === "<=" ? n <= 0 : op === "=" ? n === 0 : n !== 0;
}
const inDom = (S, p) => !(S.domain === "N" || S.domain === "Z") || p.every((x) => { const c = cv(x); return c && c.d === 1 && (S.domain !== "N" || c.n >= 1); });
export function member(S, p) {
  if (S.kind === "finite") return S.points.some((q) => q.every((x, i) => cas.equal(x, p[i])));
  return inDom(S, p) && S.conds.every(({ e, op }) => condOk(cas.subs(e, env(S.xs, p)), op));
}
function grid(S) {
  const d = S.xs.length;
  const vals = S.kind === "lattice" ? (S.domain === "N" ? [1, 2, 3, 4, 5, 6] : [0, 1, -1, 2, -2, 3, -3, 4, -4])
    : d === 1 ? [0, 1, -1, 0.5, -0.5, 2, -2, 1.5, -1.5, 3, -3, 0.25, -0.25] : [0, 1, -1, 0.5, -0.5, 2, -2, 3, -3];
  const g = (k) => (k === 0 ? [[]] : g(k - 1).flatMap((t) => vals.map((x) => [...t, x])));
  return d > 3 ? [] : g(d).map((p) => p.map(Q));
}

// Coefficients c_0, c_1, ... of e(p + t d) as a polynomial in t, or null.
function along(e, xs, p, d) {
  const t = cas.sym("tt");
  const g = cas.subs(e, Object.fromEntries(xs.map((x, i) => [x, cas.add(p[i], cas.mul(t, d[i]))])));
  const cs = coeffs(g, "tt");
  return cs && cs.every((c) => cv(c)) ? cs.map(num) : null;
}
// Sign of the polynomial for all t > 0 from its coefficients: "pos" (> 0), "neg" (< 0), "zero", or null.
function signForPositive(cs) {
  const nz = cs.filter((c) => c !== 0);
  if (!nz.length) return "zero";
  if (cs.every((c) => c >= 0)) return "pos";
  if (cs.every((c) => c <= 0)) return "neg";
  return null;
}
// Does the condition hold for every t > 0 (respectively ≥ 0 with t = 0 included)?
function holdsForAllT(cs, op) {
  if (!cs) return false;
  const s = signForPositive(cs); const c0 = cs[0];
  if (op === "<=") return c0 <= 0 && (s === "neg" || s === "zero");
  if (op === "<") return c0 < 0 && (s === "neg" || s === "zero" || cs.slice(1).every((c) => c <= 0));
  if (op === "=") return s === "zero";
  return c0 !== 0 && cs.slice(1).every((c) => Math.sign(c) === 0 || Math.sign(c) === Math.sign(c0));
}
// Does the condition FAIL for every t > 0 (with t = 0 on the edge: c_0 = 0)?
function failsForAllT(cs, op) {
  if (!cs || cs[0] !== 0) return false;
  const s = signForPositive(cs.slice(1).concat([]));
  if (op === "<=") return s === "pos";
  if (op === "<") return s === "pos" || s === "zero";
  if (op === "=") return s === "pos" || s === "neg";
  return false;
}
const DIRS = (d) => {
  const out = [];
  for (let i = 0; i < d; i++) for (const s of [1, -1]) out.push(Array.from({ length: d }, (_, k) => cas.num(k === i ? s : 0)));
  if (d === 2) for (const a of [1, -1]) for (const b of [1, -1]) out.push([cas.num(a), cas.num(b)]);
  return out;
};

// ---------- not bounded ----------

export function unboundedWitness(S) {
  if (S.kind === "finite") return null;
  const d = S.xs.length;
  const pts = grid(S).filter((p) => member(S, p)).sort((a, b) => a.filter((x) => !cas.isZero(x)).length - b.filter((x) => !cas.isZero(x)).length);
  for (const p of pts) {
    for (const dir of DIRS(d)) {
      if (!S.conds.every(({ e, op }) => holdsForAllT(along(e, S.xs, p, dir), op))) continue;
      const i = dir.findIndex((x) => !cas.isZero(x));
      return { p, dir, i, int: S.kind === "lattice" };
    }
  }
  return null;
}
// v = p + k d with k = |R| + |p_i| + 1 (whole numbers: ⌈|R|⌉ + |p_i| + 1).
// The point p + t d with t chosen so that |v_i| = R̃ + 1 (R̃ = |R|, or ⌈|R|⌉ in ℕ, ℤ),
// written the way a person would: n = ⌈|R|⌉ + 1 for ℕ (Ex 5.36).
export function unboundedTex(S, W) {
  const Rt = W.int ? "\\lceil |R| \\rceil" : "|R|";
  const pi = num(W.p[W.i]); const di = num(W.dir[W.i]);
  // Same sign (or 0) and |p_i| ≤ 1: walk until |v_i| = R̃ + 1 exactly.
  const absorbed = pi * di >= 0 && Math.abs(pi) <= 1;
  const c = absorbed ? 1 - Math.abs(pi) : Math.abs(pi) + 1;
  const t = c === 0 ? Rt : `${Rt} + ${T(Q(c))}`;
  const comp = W.p.map((x, j) => {
    const dj = num(W.dir[j]);
    if (dj === 0) return T(x);
    if (j === W.i && absorbed) return dj > 0 ? `${Rt} + 1` : `-(${Rt} + 1)`;
    if (cas.isZero(x)) return dj > 0 ? t : `-(${t})`;
    return `${T(x)} ${dj > 0 ? "+" : "-"} ${c === 0 ? t : `(${t})`}`;
  });
  const v = tupleTex(comp);
  const vi = absorbed ? `${Rt} + 1` : `|${comp[W.i]}| \\ge ${Rt} + 1`;
  const nz = comp.filter((x) => x !== "0");
  const norm = W.p.length === 1 || nz.length === 1 ? vi : `\\sqrt{${nz.map((x) => (/^[\w\\{}]+$/.test(x) ? `${x}^2` : `(${x})^2`)).join(" + ")}} \\ge ${vi}`;
  return { v, norm };
}

// ---------- not open / not closed ----------

// v ∈ U and a direction d with v + s d ∉ U for every s > 0: w = v + (ε/2) d.
export function notOpenWitness(S) {
  if (S.kind === "finite") {
    const v = S.points[0];
    const others = S.points.slice(1).filter((q) => q.slice(1).every((x, i) => cas.equal(x, v[i + 1]))).map((q) => Math.abs(num(cas.sub(q[0], v[0])))).filter((x) => x > 0);
    const gap = others.length ? Math.min(...others) : null;
    return { v, step: gap ? `\\frac{\\min(\\varepsilon, ${T(cas.parse(String(gap)))})}{2}` : "\\frac{\\varepsilon}{2}", axis: 0, why: gap ? `it lies strictly between elements of $${S.name}$ on that line` : `it is not the one point of $${S.name}$`, d: S.d };
  }
  if (S.kind === "lattice") {
    const v = grid(S).find((p) => member(S, p));
    return v ? { v, step: "\\frac{\\min(\\varepsilon, 1)}{2}", axis: 0, why: `its first coordinate is not a whole number`, d: v.length } : null;
  }
  for (const v of grid(S).filter((p) => member(S, p))) {
    for (const dir of DIRS(v.length).slice(0, 2 * v.length)) {
      const bad = S.conds.find(({ e, op }) => failsForAllT(along(e, S.xs, v, dir), op));
      if (bad) return { v, dir, bad, d: v.length };
    }
  }
  return null;
}
// v ∉ F and a direction d with v + s d ∈ F for 0 < s ≤ h.
export function notClosedWitness(S) {
  if (S.kind !== "builder") return null;
  const hs = [Infinity, 1, 0.5, 0.25];
  for (const v of grid(S)) {
    if (member(S, v)) continue;
    // v must be on the edge: only conditions that are 0 there fail.
    if (!S.conds.every(({ e, op }) => condOk(cas.subs(e, env(S.xs, v)), op) || cas.isZero(cas.subs(e, env(S.xs, v))))) continue;
    for (const dir of DIRS(v.length).slice(0, 2 * v.length)) {
      for (const h of hs) {
        const ok = S.conds.every(({ e, op }) => {
          const cs = along(e, S.xs, v, dir);
          if (!cs) return false;
          if (h === Infinity) {
            if (cs[0] !== 0) return holdsForAllT(cs, op);
            // On the edge at s = 0: the condition must hold for every s > 0.
            const s1 = signForPositive(cs.slice(1));
            if (op === "<" || op === "<=") return s1 === "neg";
            if (op === "=") return s1 === "zero";
            return s1 === "pos" || s1 === "neg";
          }
          // 0 < s ≤ h: sample the polynomial (checked at 200 points and at h).
          for (let k = 1; k <= 200; k++) {
            const s = (h * k) / 200;
            const y = cs.reduce((acc, c, j) => acc + c * s ** j, 0);
            if (!(op === "<" ? y < 0 : op === "<=" ? y <= 1e-12 : op === "=" ? Math.abs(y) < 1e-12 : Math.abs(y) > 1e-12)) return false;
          }
          return true;
        });
        if (ok) return { v, dir, h };
      }
    }
  }
  return null;
}
const stepTex = (h) => (h === Infinity ? "\\frac{\\varepsilon}{2}" : `\\min\\left(\\frac{\\varepsilon}{2}, ${T(Q(h))}\\right)`);
function moveTex(v, dir, step) {
  return tupleTex(v.map((x, i) => {
    const d = num(dir[i]);
    if (d === 0) return T(x);
    const s = d > 0 ? "+" : "-";
    return cas.isZero(x) ? (d > 0 ? step : `-${step}`) : `${T(x)} ${s} ${step}`;
  }));
}

// ---------- jumps and corners (one variable, two formulas) ----------

function pieces(vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  const f = (ctx.fn && vars.get(ctx.fn)) || vars.get("f") || [...vars.values()].find((v) => v.kind === "piecewise");
  if (!f || f.kind !== "piecewise" || f.error) return null;
  const v = (f.params && f.params[0]) || "x";
  let rows;
  try { rows = parseCases(f.value, v); } catch (_) { return null; }
  const a0 = ["a", "x0", "x_0", "c"].map((k) => vars.get(k)).find((x) => x && x.kind === "scalar" && !x.params && cas.tryParse(String(x.value)) && cv(cas.parse(String(x.value))));
  const a = a0 ? cas.parse(String(a0.value)) : rows.find((r) => r.cond)?.cond.c;
  if (!a || !cv(a)) return null;
  const av = num(a);
  const holds = (cond, x) => !cond || { "≤": x <= num(cond.c), "≥": x >= num(cond.c), "<": x < num(cond.c), ">": x > num(cond.c), "=": Math.abs(x - num(cond.c)) < 1e-12 }[cond.op];
  const pick = (x) => rows.findIndex((r, i) => holds(r.cond, x) && rows.slice(0, i).every((p) => !holds(p.cond, x)));
  const L = pick(av - 1e-7); const R = pick(av + 1e-7); const A = pick(av);
  if (L < 0 || R < 0 || A < 0) return null;
  return { name: f.name, v, rows, a, L, R, A };
}
// The values the formulas approach from the two sides of a, ε = 1/4 of the gap.
export function jump(vars, ctx = {}) {
  const P = pieces(vars, ctx);
  if (!P || P.L === P.R) return null;
  const side = (i) => limit1({ name: "g", vars: [P.v], x: P.rows[i].x }, { xs: [P.a] }, [], { quiet: true });
  const l = side(P.L); const r = side(P.R);
  if (l.kind !== "value" || r.kind !== "value" || cas.equal(l.w, r.w)) return null;
  const gap = cas.sub(r.w, l.w);
  return { ...P, left: l.w, right: r.w, eps: cas.div(num(gap) < 0 ? cas.neg(gap) : gap, cas.num(4)) };
}
// A corner: f continuous at a, the slopes from the two sides differ.
export function corner(vars, ctx = {}) {
  const P = pieces(vars, ctx);
  if (!P || P.L === P.R) return null;
  const at = (i) => cas.subs(P.rows[i].x, { [P.v]: P.a });
  const fa = at(P.A);
  if (!cas.equal(at(P.L), fa) || !cas.equal(at(P.R), fa)) return null;
  const slope = (i) => cas.subs(cas.diff(P.rows[i].x, P.v), { [P.v]: P.a });
  const sl = slope(P.L); const sr = slope(P.R);
  if (cas.equal(sl, sr)) return null;
  const linear = (i) => cas.isZero(cas.diff(cas.diff(P.rows[i].x, P.v), P.v));
  return { ...P, left: sl, right: sr, exactL: linear(P.L), exactR: linear(P.R) };
}

// ---------- template blanks ----------

// undefined: not one of these blanks.
export function resolveTopologyLabel(label, vars, ctx = {}) {
  if (!(vars instanceof Map)) return undefined;
  const l = label.trim();
  const body = ctx.body || "";
  if (/element depending on R/.test(body) && /^(element depending on R|norm)$/.test(l)) {
    const S = noteTopSet(vars, ctx); if (!S) return null;
    const W = unboundedWitness(S); if (!W) return null;
    const t = unboundedTex(S, W);
    const from = `@${S.name}: a ray inside ${S.name} from ${ptTex(W.p)}`;
    return l === "norm" ? { value: t.norm, from } : { value: t.v, from };
  }
  // \openset NOT open
  if (/no \$\\varepsilon > 0\$ has \$B\(v, \\varepsilon\) \\subseteq U\$/.test(body) && /^(v|point depending on ε)$/.test(l)) {
    const S = noteTopSet(vars, ctx); if (!S) return null;
    const W = notOpenWitness(S); if (!W) return null;
    const from = `@${S.name}`;
    if (l === "v") return { value: ptTex(W.v), from };
    if (W.step) {
      const w = W.v.map((x, i) => (i === W.axis ? (cas.isZero(x) ? W.step : `${T(x)} + ${W.step}`) : T(x)));
      return { value: tupleTex(w), from: `${from}: ${W.why}` };
    }
    return { value: moveTex(W.v, W.dir, "\\frac{\\varepsilon}{2}"), from: `${from}: the condition ${T(W.bad.e)} fails there` };
  }
  // \closedset NOT closed
  if (/not closed\*\*: the complement is not open/.test(body) && /^(v|point depending on ε)$/.test(l)) {
    const S = noteTopSet(vars, ctx); if (!S) return null;
    const W = notClosedWitness(S); if (!W) return null;
    const from = `@${S.name}`;
    if (l === "v") return { value: ptTex(W.v), from };
    return { value: moveTex(W.v, W.dir, stepTex(W.h)), from: `${from}: it is in ${S.name}` };
  }
  // \compact NOT compact
  if (/is \*\*not compact\*\*/.test(body) && /^not bounded/.test(l)) {
    const S = noteTopSet(vars, ctx); if (!S) return null;
    const U = unboundedWitness(S);
    if (U) { const t = unboundedTex(S, U); return { value: `not bounded: for every $R$, $v = ${t.v} \\in ${latexName(S.name)}$ has $|v| \\ge |R| + 1 > R$ (Remark 5.34)`, prose: true, from: `@${S.name}` }; }
    const C = notClosedWitness(S);
    if (C) return { value: `not closed: $${ptTex(C.v)} \\notin ${latexName(S.name)}$, but every ball around it meets $${latexName(S.name)}$ in $${moveTex(C.v, C.dir, stepTex(C.h))}$ (Definition 5.47)`, prose: true, from: `@${S.name}` };
    return null;
  }
  // \limit: different values on the two sides
  if (/different values on the two sides|forces \$L\$ close to both values/.test(body) && /^(a|value for x > a|value for x < a|epsilon)$/.test(l)) {
    const J = jump(vars, ctx); if (!J) return null;
    const from = `@${J.name}: the two formulas at ${T(J.a)}`;
    return { value: T({ a: J.a, "value for x > a": J.right, "value for x < a": J.left, epsilon: J.eps }[l]), from };
  }
  // \derivative NOT differentiable at a point
  if (/so no such \$c\$ exists/.test(body) && /^(x0|right value|left value)$/.test(l)) {
    const C = corner(vars, ctx); if (!C) return null;
    const from = `@${C.name}: the slopes of the two formulas at ${T(C.a)}`;
    if (l === "x0") return { value: T(C.a), from };
    const right = l === "right value";
    const val = right ? C.right : C.left;
    return { value: (right ? C.exactR : C.exactL) ? T(val) : `\\text{close to } ${T(val)}`, from };
  }
  return undefined;
}

// For the ★: verdicts for sets setVerdict can't read (finite, ℕ, ℤ) and witnesses.
export function topologyVerdict(vars, ctx = {}) {
  const S = noteTopSet(vars, ctx);
  if (!S) return null;
  if (S.kind === "finite") return { name: S.name, bounded: true, open: false, closed: true, compact: true, nonempty: true };
  const unb = !!unboundedWitness(S);
  if (S.kind === "lattice") return { name: S.name, bounded: unb ? false : null, open: false, closed: true, compact: unb ? false : null, nonempty: true };
  return null;
}
