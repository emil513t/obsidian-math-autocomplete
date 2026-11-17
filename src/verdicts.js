// Verdicts the plugin computes itself for sets, limits, KKT and SVM, so the
// route picker can star the right route and the references follow the
// answer. Every verdict is exact (rationals, Fourier-Motzkin, Gauss) or null
// when it can't be decided; null never stars or hides anything.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { linear, gauss, fmStep } from "./elim.js";
import { findRelation } from "./vars.js";
import { mainFn, fnByName, noteFunctions, pointVar, pointExprs } from "./textlink.js";
import { definitenessWitness } from "./witness.js";
import { limitOf, parsePointText } from "./limit.js";
import { citations } from "./explain.js";

const isConstM = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));
const sgn = (q) => (q.n > 0 ? 1 : q.n < 0 ? -1 : 0);
const constSign = (x) => { const c = cas.constValue(x); return c ? sgn(c) : null; };

// ---------- sets ----------

// Split a condition list at top-level commas / "and" / chains (0 \le x \le 1).
function splitTop(s) {
  const out = []; let depth = 0; let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("{([".includes(c)) depth++;
    if ("})]".includes(c)) depth--;
    if (depth === 0 && (c === "," || c === ";")) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.flatMap((p) => p.split(/\\(?:land|wedge)\b|\\text\{\s*and\s*\}|\\quad|\band\b/)).map((p) => p.trim()).filter(Boolean);
}
const OPS = [
  [/^(\\le|\\leq|\\leqslant|<=|≤)$/, "<="], [/^(\\ge|\\geq|\\geqslant|>=|≥)$/, ">="],
  [/^(<|\\lt)$/, "<"], [/^(>|\\gt)$/, ">"], [/^=$/, "="], [/^(\\neq|\\ne|!=|≠)$/, "!="],
];
const OP_RE = /(\\leqslant|\\geqslant|\\leq|\\geq|\\neq|\\le|\\ge|\\ne|\\lt|\\gt|<=|>=|!=|≤|≥|≠|<|>|=)(?![a-zA-Z])/g;

// One condition (possibly a chain) as [{ e, op }] meaning  e op 0  with op in < <= = !=.
function parseCond(s) {
  const parts = s.split(OP_RE).map((p) => p.trim());
  if (parts.length < 3) return null;
  const out = [];
  for (let i = 0; i + 2 < parts.length; i += 2) {
    const op = OPS.find(([re]) => re.test(parts[i + 1]))?.[1];
    const l = cas.tryParse(parts[i]); const r = cas.tryParse(parts[i + 2]);
    if (!op || !l || !r) return null;
    const d = cas.sub(l, r);
    if (op === "<=" || op === "<" || op === "=" || op === "!=") out.push({ e: d, op });
    else out.push({ e: cas.neg(d), op: op === ">=" ? "<=" : "<" });
  }
  return out;
}

// The set a set command is about: picked (ctx.set), else S/U/F/C/K, else the first set or interval.
// { name, xs, conds: [{ e, op }] } or null.
export function noteSet(vars, ctx = {}) {
  const sets = [...vars.values()].filter((v) => !v.error && ((v.kind === "set" && v.builder) || v.kind === "interval"));
  const v = sets.find((s) => s.name === ctx.set) || sets.find((s) => /^(S|U|F|C|K|A)$/.test(s.name)) || sets[0];
  if (!v) return null;
  if (v.kind === "interval") {
    const x = cas.sym("x");
    const conds = [];
    const [lo, hi] = v.value.map((s) => String(s).trim());
    const inf = (s) => /\\infty|∞|oo/.test(s);
    if (!inf(lo)) { const a = cas.tryParse(lo); if (!a) return null; conds.push({ e: cas.sub(a, x), op: v.lopen ? "<" : "<=" }); }
    if (!inf(hi)) { const b = cas.tryParse(hi); if (!b) return null; conds.push({ e: cas.sub(x, b), op: v.ropen ? "<" : "<=" }); }
    return { name: v.name, xs: ["x"], conds, interval: true };
  }
  const m = String(v.value).match(/^\\\{\s*(.*?)\s*(?:\\mid|\\colon|\||:)\s*(.*?)\s*\\\}$/s);
  if (!m) return null;
  const head = m[1].replace(/\\in\s*\\mathbb\{R\}(\^\{?\d+\}?)?/, "").replace(/^\(|\)$/g, "");
  const xs = head.split(",").map((s) => s.trim()).filter((s) => /^[a-z]$/.test(s));
  if (!xs.length) return null;
  const conds = [];
  for (const c of splitTop(m[2])) {
    const p = parseCond(c);
    if (!p) return null;
    conds.push(...p);
  }
  if (conds.some((c) => [...cas.symbols(c.e)].some((s) => !xs.includes(s)))) return null;
  return { name: v.name, xs, conds };
}

// No division by something that can be 0, no logs/roots: continuous on all of R^d.
function continuousEverywhere(e) {
  for (const t of e.terms.values()) for (const { atom, e: p } of t.f.values()) {
    if (p.d !== 1) return false;
    if (atom.t === "fn" && !/^(sin|cos|exp)$/.test(atom.name)) return false;
    if (p.n < 0 && atom.t !== "fn") return false;
    if (p.n < 0 && atom.name !== "exp") return false;
  }
  return true;
}
const holds = (S, env) => S.conds.every(({ e, op }) => {
  const v = cas.evaluate(e, env);
  if (!Number.isFinite(v)) return false;
  return op === "<" ? v < -1e-12 : op === "<=" ? v <= 1e-12 : op === "=" ? Math.abs(v) <= 1e-12 : Math.abs(v) > 1e-12;
});
// A point of the set (and one outside it) from a small grid, or null.
function gridPoint(S, inside) {
  const vals = [0, 1, -1, 0.5, -0.5, 2, -2, 0.25, 3, -3, 10, -10];
  const d = S.xs.length;
  const total = vals.length ** d;
  for (let k = 0; k < Math.min(total, 30000); k++) {
    const env = {}; let r = k;
    for (const x of S.xs) { env[x] = vals[r % vals.length]; r = Math.floor(r / vals.length); }
    if (holds(S, env) === inside) return env;
  }
  return null;
}

// Fourier-Motzkin on linear conditions: does x_i have both bounds? (null: not linear)
function linearBounded(S) {
  const ineqs = [];
  for (const c of S.conds) {
    if (c.op === "!=") continue; // removing a point / line keeps (un)boundedness
    if (!linear(c.e, S.xs)) return null;
    ineqs.push({ e: c.e, strict: c.op === "<" });
    if (c.op === "=") ineqs.push({ e: cas.neg(c.e), strict: false });
  }
  for (const x of S.xs) {
    let cur = ineqs;
    for (const y of S.xs) {
      if (y === x) continue;
      const st = fmStep(cur, S.xs, y);
      if (st.contradictions.length) return true; // empty: bounded
      cur = st.next;
    }
    const st = fmStep(cur, S.xs, x);
    if (st.contradictions.length) return true;
    if (!st.lower.length || !st.upper.length) return false;
  }
  return true;
}

// Some condition q(v) <= c (or <, =) with q's Hessian constant positive definite.
function quadraticBounded(S) {
  return S.conds.some((c) => {
    if (c.op === "!=") return false;
    const H = cas.hessian(c.e, S.xs);
    return isConstM(H) && definitenessWitness(H)?.d === "positive definite";
  });
}

// { open, closed, bounded, compact, nonempty, why: {...} }: true / false / null.
export function setVerdict(vars, ctx = {}) {
  const S = noteSet(vars, ctx);
  if (!S) return null;
  const cont = S.conds.every((c) => continuousEverywhere(c.e));
  const strict = S.conds.every((c) => c.op === "<" || c.op === "!=");
  const nonstrict = S.conds.every((c) => c.op === "<=" || c.op === "=");
  const inPt = gridPoint(S, true);
  const outPt = gridPoint(S, false);
  const proper = !!inPt && !!outPt; // neither empty nor all of R^d
  let open = null; let closed = null;
  if (cont && strict) { open = true; if (proper) closed = false; }
  if (cont && nonstrict) { closed = true; if (proper) open = false; }
  if (!S.conds.length) { open = true; closed = true; }
  let bounded = null;
  if (S.interval) bounded = S.conds.length === 2;
  else if (quadraticBounded(S)) bounded = true;
  else {
    const lb = linearBounded(S);
    if (lb === true) bounded = true;
    else if (lb === false && inPt) bounded = false;
    else if (inPt && S.xs.some((x) => S.conds.every((c) => !cas.symbols(c.e).has(x)))) bounded = false;
  }
  // Interval with one open and one closed finite end: neither open nor closed.
  if (S.interval && S.conds.length === 2 && !strict && !nonstrict) { open = false; closed = false; }
  const compact = closed === true && bounded === true ? true : closed === false || bounded === false ? false : null;
  return { name: S.name, set: S, open, closed, bounded, compact, nonempty: !!inPt, several: S.conds.length > 1 };
}

// ---------- limits ----------

// The limit point: the note's a / x0 / a point p, or ctx.point text.
function limitPoint(vars, n, ctx) {
  if (ctx.at) { try { return parsePointText(ctx.at, n); } catch (_) { /* next */ } }
  if (n === 1) {
    const a = ["a", "x0", "x_0", "c"].map((k) => vars.get(k)).find((v) => v && !v.error && v.kind === "scalar" && !v.params && cas.tryParse(String(v.value)) && cas.symbols(cas.parse(String(v.value))).size === 0);
    if (a) return { xs: [cas.parse(String(a.value))] };
  }
  const P = pointVar(vars, ctx, n);
  return P ? { xs: pointExprs(P) } : null;
}

// { kind: "continuous" | "cancel" | "none", refs } or null.
export function limitVerdict(vars, ctx = {}) {
  const F = mainFn(vars, ctx);
  if (!F || !F.vars.length) return null;
  const pt = limitPoint(vars, F.vars.length, ctx);
  if (!pt) return null;
  const steps = [];
  const r = limitOf({ ...F, name: F.v.name }, pt, steps);
  if (r.kind === "unknown") return null;
  const text = steps.map((s) => s.text || "").join(" ");
  const kind = r.kind === "none" ? "none" : /limit is the value/.test(text) ? "continuous" : "cancel";
  return { kind, refs: citations(text).map((c) => c.label).join(", "), oneVar: F.vars.length === 1 };
}

// ---------- KKT (quadratic f, linear g_i <= 0) ----------

// The constraint functions g, g1, g2, g_1, ... (everything but f).
function constraintFns(vars, F) {
  return noteFunctions(vars).filter((v) => v.name !== F.v.name && /^g(_?\{?\d+\}?)?$/.test(v.name)).map((v) => fnByName(vars, v.name)).filter(Boolean);
}

// { point, mu, value, allZero, strictlyFeasible, convex } or null.
export function kktVerdict(vars, ctx = {}) {
  const F = mainFn(vars, ctx);
  if (!F) return null;
  const G = constraintFns(vars, F);
  if (!G.length) return null;
  const xs = cas.orderVars(new Set([...F.vars, ...G.flatMap((g) => [...cas.symbols(g.x)])]));
  if (G.some((g) => !linear(g.x, xs))) return null;
  const H = cas.hessian(F.x, xs);
  if (!isConstM(H)) return null;
  const convex = /positive/.test(definitenessWitness(H)?.d || "") || H.every((r) => r.every(cas.isZero));
  // Strictly feasible: all g_i < 0 has a solution (Fourier-Motzkin, exact).
  let cur = G.map((g) => ({ e: g.x, strict: true }));
  let strictlyFeasible = true;
  for (const x of xs) {
    const st = fmStep(cur, xs, x);
    if (st.contradictions.length) { strictlyFeasible = false; break; }
    cur = st.next;
  }
  const mus = G.map((_, i) => `mu${i + 1}`);
  const n = G.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const act = G.map((_, i) => i).filter((i) => mask & (1 << i));
    const unk = [...xs, ...act.map((i) => mus[i])];
    const eqs = [
      ...xs.map((v) => cas.add(cas.diff(F.x, v), ...act.map((i) => cas.mul(cas.sym(mus[i]), cas.diff(G[i].x, v))))),
      ...act.map((i) => G[i].x),
    ];
    const lin = eqs.map((e) => linear(e, unk));
    if (lin.some((l) => !l)) continue;
    const sol = gauss(lin.map((l) => [...l.coef, cas.neg(l.c0)]), unk);
    if (sol.kind !== "unique") continue;
    const point = sol.values.slice(0, xs.length);
    const mu = sol.values.slice(xs.length);
    const env = Object.fromEntries(xs.map((v, i) => [v, point[i]]));
    if (mu.some((m) => constSign(m) === null || constSign(m) < 0)) continue;
    if (G.some((g) => { const s = constSign(cas.subs(g.x, env)); return s === null || s > 0; })) continue;
    return { xs, point, mu, active: act, value: cas.subs(F.x, env), allZero: mu.every((m) => cas.isZero(m)), strictlyFeasible, convex };
  }
  return { xs, point: null, strictlyFeasible, convex };
}

// ---------- SVM: are the labeled points separable? ----------

const nums = (s) => { try { return JSON.parse(String(s).replace(/\s+/g, "")); } catch (_) { return null; } };
// Points (rows of X) and labels ±1 from the note (X / P and l / labels / ell), or the python form.
function svmData(vars, ctx) {
  const a = ctx.answers || {};
  let X = nums(a["points X"]); let y = nums(a["labels +-1"]);
  if (!Array.isArray(X) || !Array.isArray(y)) {
    const Xv = ["X", "P", "D"].map((k) => vars.get(k)).find((v) => v && v.kind === "matrix" && !v.error);
    const yv = ["l", "labels", "label", "ell", "y_labels", "L"].map((k) => vars.get(k)).find((v) => v && (v.kind === "vector" || v.kind === "set") && !v.error);
    if (!Xv || !yv) return null;
    X = Xv.value.map((r) => r.map((x) => cas.parse(String(x))));
    y = yv.value.map((x) => cas.parse(String(x)));
  } else {
    X = X.map((r) => r.map((x) => cas.parse(String(x))));
    y = y.map((x) => cas.parse(String(x)));
  }
  if (X.length !== y.length || !X.length || y.some((t) => Math.abs(constSign(t) ?? 0) !== 1)) return null;
  return { X, y };
}

// { separable: true/false, d } or null.
export function svmVerdict(vars, ctx = {}) {
  const D = svmData(vars, ctx);
  if (!D) return null;
  const d = D.X[0].length;
  const unk = [...Array.from({ length: d }, (_, i) => `a${i + 1}`), "b"];
  // y_i (a . x_i + b) >= 1   <=>   1 - y_i (a . x_i + b) <= 0
  let cur = D.X.map((x, i) => ({ e: cas.sub(cas.ONE, cas.mul(D.y[i], cas.add(cas.sym("b"), ...x.map((c, j) => cas.mul(c, cas.sym(unk[j])))))), strict: false }));
  for (const u of unk) {
    const st = fmStep(cur, unk, u);
    if (st.contradictions.length) return { separable: false, d };
    cur = st.next;
  }
  return { separable: true, d };
}

// ---------- route fit (★) and references per command ----------

const fit = (ok, why, best = false) => ({ ok, why, best });

export function verdictFit(command, label, vars, ctx = {}) {
  try {
    if (["bounded", "openset", "closedset", "compact", "evt"].includes(command)) {
      const V = setVerdict(vars, ctx);
      if (!V) return null;
      const say = (p, yes, no) => (V[p] === true ? `${V.name} is ${yes}` : `${V.name} is ${no}`);
      const not = /^NOT|fails/.test(label);
      if (command === "bounded") {
        if (V.bounded === null) return null;
        if (/^NOT/.test(label)) return fit(!V.bounded, say("bounded", "bounded", "not bounded"), !V.bounded);
        if (/radius/.test(label)) return fit(V.bounded, say("bounded", "bounded", "not bounded"), V.bounded);
        return V.bounded ? null : fit(false, `${V.name} is not bounded`);
      }
      if (command === "openset" || command === "closedset") {
        const p = command === "openset" ? "open" : "closed";
        if (V[p] === null) return null;
        const why = say(p, p, `not ${p}`);
        if (not) return fit(!V[p], why, !V[p]);
        if (/preimage/.test(label)) return fit(V[p], why, V[p] && !V.several);
        if (/union \/ intersection/.test(label)) return fit(V[p], why, V[p] && V.several);
        return V[p] ? fit(true, why) : fit(false, why);
      }
      if (command === "compact") {
        if (V.compact === null) return null;
        const why = V.compact ? `${V.name} is closed and bounded` : `${V.name} is ${V.bounded === false ? "not bounded" : "not closed"}`;
        return not ? fit(!V.compact, why, !V.compact) : fit(V.compact, why, V.compact);
      }
      if (command === "evt") {
        if (V.compact === null) return null;
        const why = V.compact ? `${V.name} is compact` : `${V.name} is not compact`;
        return not ? fit(!V.compact, why, !V.compact) : fit(V.compact, why, V.compact);
      }
    }
    if (command === "limit") {
      const L = limitVerdict(vars, ctx);
      if (!L || !L.oneVar) return null;
      const why = { continuous: "f is continuous there: plug in", cancel: "0/0: cancel the common factor", none: "the limit does not exist" }[L.kind];
      if (/^continuity/.test(label)) return fit(L.kind === "continuous", why, L.kind === "continuous");
      if (/^cancel/.test(label)) return fit(L.kind === "cancel", why, L.kind === "cancel");
      if (/NOT exist/.test(label)) return fit(L.kind === "none", why, L.kind === "none");
      if (/ε–δ/.test(label)) return fit(L.kind !== "none", why);
      return null;
    }
    if (command === "kkt") {
      const K = kktVerdict(vars, ctx);
      if (!K) return null;
      if (/not strictly feasible/.test(label)) return fit(!K.strictlyFeasible, K.strictlyFeasible ? "strictly feasible" : "no point has all g_i < 0", !K.strictlyFeasible);
      if (!K.point) return null;
      const at = `optimum (${K.point.map((x) => cas.tex(x)).join(", ")})`;
      if (/all λ = 0/.test(label)) return fit(K.allZero, K.allZero ? `${at}, all λ = 0` : `${at} has an active constraint`, K.allZero && K.strictlyFeasible);
      if (/case analysis/.test(label)) return fit(K.strictlyFeasible, at, !K.allZero && K.strictlyFeasible);
      return fit(true, at);
    }
    if (command === "svm") {
      const S = svmVerdict(vars, ctx);
      if (!S) return null;
      const why = S.separable ? "the points are separable" : "the points are not separable";
      if (/^NOT separable/.test(label)) return fit(!S.separable, why, !S.separable);
      if (/optimal separating/.test(label)) return fit(S.separable, why, S.separable);
      if (/perceptron/.test(label)) return fit(S.separable, S.separable ? why : `${why}: the perceptron never stops`);
    }
  } catch (_) {
    return null;
  }
  return null;
}

const R = (add, drop = "") => ({ add, drop });
// { add, drop } references for the verdict, or null.
export function verdictRefs(command, vars, ctx = {}) {
  try {
    if (["bounded", "openset", "closedset", "compact", "evt", "boundary"].includes(command)) {
      const V = setVerdict(vars, ctx);
      if (!V) return null;
      const out = [];
      if (command === "bounded" && V.bounded !== null) out.push(V.bounded ? R("Def 5.33 Remark 5.35", "Remark 5.34") : R("Def 5.33 Remark 5.34", "Remark 5.35"));
      if ((command === "openset" || command === "compact") && V.open !== null && command === "openset") {
        out.push(V.open ? R(`Def 5.39 Prop 5.68 Prop 5.51 Prop 5.74 Prop 5.75${V.several ? " Prop 5.45" : ""}`, V.several ? "" : "Prop 5.45") : R("Def 5.39", "Prop 5.68 Prop 5.51 Prop 5.45 Cor 5.27"));
      }
      if (command === "closedset" && V.closed !== null) {
        out.push(V.closed ? R(`Def 5.47 Prop 5.69 Prop 5.52 Prop 5.74 Prop 5.75${V.several ? " Prop 5.49" : ""}`, V.several ? "" : "Prop 5.49") : R("Def 5.47 Remark 5.48", "Prop 5.69 Prop 5.52 Prop 5.49"));
      }
      if (command === "compact" && V.compact !== null) {
        out.push(V.compact ? R("Def 5.53 Prop 5.69 Def 5.33") : V.bounded === false ? R("Def 5.53 Def 5.33 Remark 5.34", "Prop 5.69") : R("Def 5.53 Def 5.47 Remark 5.48", "Prop 5.69 Def 5.33"));
      }
      if (command === "evt" && V.compact !== null) out.push(V.compact ? R("Thm 5.84 Def 5.53", "Ex 5.85") : R("Ex 5.85"));
      return out.length ? { add: out.map((r) => r.add).join(" "), drop: out.map((r) => r.drop).join(" ") } : null;
    }
    if (command === "limit") {
      const L = limitVerdict(vars, ctx);
      if (!L) return null;
      if (L.kind === "none") return R(`Def 5.62 ${L.refs}`, "Def 5.65 Remark 5.61");
      if (L.kind === "continuous") return R(`Def 5.65 ${L.refs}`);
      return R(`Def 5.62 ${L.refs}`, "Def 5.65");
    }
    if (command === "kkt") {
      const K = kktVerdict(vars, ctx);
      if (!K) return null;
      if (!K.strictlyFeasible) return R("Def 9.36 Ex 9.40");
      if (!K.point) return R("Def 9.36 Thm 9.37", "Ex 9.40");
      return R(`Def 9.36 Thm 9.37${K.allZero ? " Ex 9.43" : ""}`, `Ex 9.40${K.allZero ? "" : " Ex 9.43"}`);
    }
    if (command === "svm") {
      const S = svmVerdict(vars, ctx);
      if (!S) return null;
      return S.separable ? R("Thm 9.8 Thm 9.37", "Ex 5.9") : R("Ex 5.9", "Thm 9.8 Prop 5.14 Sec 5.3.2 Thm 9.37");
    }
  } catch (_) {
    return null;
  }
  return null;
}
