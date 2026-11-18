// Possible endings per command (src/outcomes.md) and which of them the
// note's own values give, from the plugin's exact computations. Used by the
// study card ("Possible endings", and the verdict spoiler).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { noteMatrix, noteMatrices, definitenessWitness, isSym, zeroSolution } from "./witness.js";
import { mainFn, resolveLabel, notePoints, noteFunctions } from "./textlink.js";
import { noteRelations, noteContradiction, contradictionLine } from "./ineqproof.js";
import { gaussInfo } from "./nosolution.js";
import { notOptimal } from "./notoptimal.js";
import { convexVerdict, setBadPair } from "./notconvex.js";
import { topologyVerdict, jump, corner, noteTopSet, unboundedWitness } from "./topology.js";
import { setVerdictE2, truthInfo, tableFn, tableNotInjective, tableNotSurjective, notInjective, notSurjective } from "./failcases.js";
import { noteFG, lagrangeSolve } from "./lagrange.js";
import { signEverywhere } from "./convex.js";
import { setVerdict, limitVerdict, kktVerdict, svmVerdict } from "./verdicts.js";
import { paramCases, caseName } from "./cases.js";
import { firstFailure, inequalityFailure, gradZeroPoints, infeasible } from "./endings.js";
const PARAM_COMMANDS = new Set(["posdef", "matinv", "critxy", "hessian", "convexfn", "roots"]);

// "## \name" sections of "- [key] ending :: how you see it :: conclusion :: route".
export function parseOutcomes(md) {
  const out = new Map();
  let cur = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = line.match(/^## \\(\w+)\s*$/);
    if (h) { cur = []; out.set(h[1], cur); continue; }
    const m = cur && line.match(/^- \[(\w+)\]\s*(.+?)\s*::\s*(.+?)\s*::\s*(.+?)\s*::\s*(.+?)\s*$/);
    if (m) cur.push({ key: m[1], name: m[2], see: m[3], conclude: m[4], route: m[5] === "-" ? null : m[5] });
  }
  return out;
}

const isConstM = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));
const DEF_KEY = {
  "positive definite": "pd", "positive semidefinite": "psd", "negative definite": "nd",
  "negative semidefinite": "nsd", indefinite: "ind", "positive semidefinite and negative semidefinite": "psd",
};
const one = (key, why) => [{ key, why }];

function isPoly1(F) {
  if (!F || F.vars.length !== 1) return false;
  return [...F.x.terms.values()].every((t) => [...t.f.values()].every(({ atom, e }) => atom.t === "sym" && e.d === 1 && e.n >= 0));
}
const degree = (F) => Math.max(0, ...[...F.x.terms.values()].flatMap((t) => [...t.f.values()].map(({ e }) => e.n)));
const num = (x) => cas.evaluate(x, {});

function matrixOutcome(command, vars, ctx) {
  const m = noteMatrix(vars, ctx);
  if (!m) return null;
  const A = m.M;
  const sq = A.length === A[0]?.length;
  if (command === "posdef") {
    if (!isSym(A)) return one("notsym", `${m.name} is not symmetric`);
    if (!isConstM(A)) return one("param", `${m.name} contains a parameter`);
    const d = definitenessWitness(A)?.d;
    return d ? one(DEF_KEY[d], `${m.name} is ${d}`) : null;
  }
  if (command === "matinv") {
    if (!sq) return one("notsq", `${m.name} is ${A.length} × ${A[0].length}`);
    if (!isConstM(A)) return one("param", `${m.name} contains a parameter`);
    return zeroSolution(A) ? one("sing", `${m.name}v = 0 for some v ≠ 0`) : one("inv", `${m.name} is invertible`);
  }
  if (command === "matmul") {
    const ms = noteMatrices(vars);
    if (ms.length < 2) return null;
    const [P, Q] = ms;
    if (P.M[0].length !== Q.M.length) return one("undef", `${P.name} has ${P.M[0].length} columns, ${Q.name} has ${Q.M.length} rows`);
    const out = [{ key: "ok", why: `${P.name}${Q.name} is defined` }];
    if (P.M.length === P.M[0].length && Q.M.length === Q.M[0].length && P.M.length === Q.M.length) {
      const PQ = cas.mat.mul(P.M, Q.M); const QP = cas.mat.mul(Q.M, P.M);
      const same = PQ.every((r, i) => r.every((x, j) => cas.equal(x, QP[i][j])));
      out.push({ key: same ? "comm" : "noncomm", why: same ? `${P.name}${Q.name} = ${Q.name}${P.name}` : `${P.name}${Q.name} ≠ ${Q.name}${P.name}` });
    }
    return out;
  }
  return null;
}

function hessianAt(vars, ctx, keys) {
  const r = resolveLabel("definiteness", vars, ctx);
  if (!r) return null;
  const d = r.value;
  const k = /positive definite/.test(d) && !/semi/.test(d) ? keys.pd : /negative definite/.test(d) && !/semi/.test(d) ? keys.nd : d === "indefinite" ? keys.ind : keys.semi;
  return one(k, `the Hessian is ${d}${r.from && /at /.test(r.from) ? ` (${r.from.replace(/^Hessian of \w+ /, "")})` : ""}`);
}

function oneVarOutcome(command, vars, ctx) {
  const F = mainFn(vars, ctx);
  if (!F) return null;
  const v = F.vars[0];
  const nm = F.v.name;
  if (command === "continuous") {
    const dens = [...F.x.terms.values()].some((t) => [...t.f.values()].some(({ e }) => e.n < 0));
    return dens ? one("quot", `${nm} is a quotient`) : one("cont", `${nm} is built from continuous pieces`);
  }
  if (F.vars.length !== 1) {
    if (command === "convexfn" || command === "strictconvex") {
      const H = cas.hessian(F.x, F.vars);
      // E8: a point where the Hessian is not positive semi-definite, with a bad pair.
      if (!isConstM(H)) return convexVerdict(F) === "notconvex" ? one("notconvex", `the Hessian of ${nm} is not positive semi-definite at one point`) : null;
      const d = definitenessWitness(H)?.d;
      if (!d) return null;
      if (d === "positive definite") return one("strict", `the Hessian of ${nm} is positive definite everywhere`);
      if (/^positive semidefinite/.test(d)) return one(command === "convexfn" ? (H.every((r) => r.every(cas.isZero)) ? "linear" : "convex") : "convexonly", `the Hessian of ${nm} is positive semi-definite`);
      return one("notconvex", `the Hessian of ${nm} is ${d}`);
    }
    return null;
  }
  const d1 = cas.diff(F.x, v);
  const d2 = cas.diff(d1, v);
  if (command === "convexfn" || command === "strictconvex") {
    const s = signEverywhere(d2, [v]).s;
    const k = { pos: "strict", nonneg: command === "convexfn" ? "strict" : "flat", zero: command === "convexfn" ? "linear" : "convexonly" }[s];
    if (k) return one(k, `${nm}'' = ${cas.tex(d2, [v])} is ${s === "zero" ? "0" : s === "pos" ? "> 0" : "≥ 0 with single zeros"}`);
    if (s === "mixed" || s === "neg" || s === "nonpos") return one(command === "convexfn" && s === "mixed" ? "region" : "notconvex", `${nm}'' = ${cas.tex(d2, [v])} is negative somewhere`);
    return null;
  }
  if (command === "increasing") {
    const s = signEverywhere(d1, [v]).s;
    const k = { pos: "strict", nonneg: "strict", zero: "inc", neg: "dec", nonpos: "dec", mixed: "neither" }[s];
    return k ? one(k, `${nm}' = ${cas.tex(d1, [v])} is ${{ pos: "> 0", nonneg: "≥ 0, 0 only at single points", zero: "0", neg: "< 0", nonpos: "≤ 0", mixed: "of both signs" }[s]}`) : null;
  }
  if (!isPoly1(F)) {
    // E3: e^x, ln, ...: a pair with the same value / a y that is never hit.
    if (command === "injective" && notInjective(F)) return one("notinj", "two points with the same value");
    if (command === "surjective" && notSurjective(F)) return one("notsurj", "a value that is never hit");
    return null;
  }
  const deg = degree(F);
  if (command === "injective") {
    const s = signEverywhere(d1, [v]).s;
    if (["pos", "nonneg", "neg", "nonpos"].includes(s)) return one("inj", `${nm}' has one sign, so ${nm} is strictly increasing or decreasing`);
    if (s === "mixed") return one("notinj", `${nm}' changes sign`);
    return null;
  }
  if (command === "surjective") {
    if (deg % 2 === 1) return one("surj", `odd degree ${deg}: continuous and unbounded both ways`);
    if (deg >= 2) return one("notsurj", `even degree ${deg}: bounded on one side`);
    return null;
  }
  if (command === "roots") {
    const out = [];
    const rr = (cas.rationalRoots(F.x, v) || []).map((q) => cas.num(q)).filter((r, i, a) => a.findIndex((s) => cas.equal(s, r)) === i);
    if (rr.length) out.push({ key: "rational", why: `${nm}(${rr.map((r) => cas.tex(r)).join(") = " + nm + "(")}) = 0` });
    if (deg === 2) {
      const c = [0, 1, 2].map((k) => { let d = F.x; for (let i = 0; i < k; i++) d = cas.diff(d, v); return num(cas.subs(d, { [v]: cas.ZERO })) / [1, 1, 2][k]; });
      const disc = c[1] ** 2 - 4 * c[2] * c[0];
      out.push({ key: disc > 1e-12 ? "two" : disc < -1e-12 ? "none" : "double", why: `b² − 4ac = ${Number(disc.toFixed(6))}` });
    }
    if (deg % 2 === 1) out.push({ key: "odd", why: `degree ${deg} is odd` });
    const odd = [...F.x.terms.values()].some((t) => [...t.f.values()].some(({ e }) => e.n % 2 === 1));
    if (deg === 4 && !odd) out.push({ key: "quartic", why: "only even powers" });
    return out.length ? out : null;
  }
  if (command === "crit") {
    const s1 = signEverywhere(d1, [v]);
    if (s1.s === "pos" || s1.s === "neg") return one("none", `${nm}' = ${cas.tex(d1, [v])} is never 0`);
    const rr = (cas.rationalRoots(d1, v) || []).map((q) => cas.num(q)).filter((r, i, a) => a.findIndex((s) => cas.equal(s, r)) === i);
    if (!rr || !rr.length) return null;
    return rr.map((r) => {
      const val = num(cas.subs(d2, { [v]: r }));
      const at = `${v} = ${cas.tex(r)}`;
      if (val > 1e-12) return { key: "min", why: `${at}: ${nm}'' > 0` };
      if (val < -1e-12) return { key: "max", why: `${at}: ${nm}'' < 0` };
      const s = signEverywhere(d1, [v]).s;
      return { key: s === "nonneg" || s === "nonpos" ? "notext" : "flat", why: `${at}: ${nm}'' = 0` };
    });
  }
  return null;
}

// [{ key, why }] for the note's values (several for e.g. several critical points), or null.
export function outcomeOf(command, vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  try {
    // A parameter: every case, with the range of the parameter for each.
    if (PARAM_COMMANDS.has(command)) {
      const pc = paramCases(command, vars, ctx);
      if (pc?.cases) return [{ key: "param", why: `depends on ${pc.p}`, p: pc.p, cases: pc.cases.map((c) => ({ ...c, name: caseName(command, c.key) })) }];
    }
    const sets = ["bounded", "openset", "closedset", "compact", "evt"];
    if (sets.includes(command)) {
      const V0 = setVerdict(vars, ctx) || topologyVerdict(vars, ctx);
      if (!V0) return null;
      // E7: a ray inside the set decides "not bounded" when the general test can't.
      const V = { ...V0 };
      if (V.bounded === null) {
        const S = noteTopSet(vars, ctx);
        if (S && unboundedWitness(S)) { V.bounded = false; V.compact = false; }
      }
      const n = V.name;
      if (command === "bounded" && V.bounded !== null) return one(!V.nonempty ? "empty" : V.bounded ? "bounded" : "unbounded", `${n} is ${V.bounded ? "" : "not "}bounded`);
      if (command === "openset" && V.open !== null) return one(V.open && V.closed ? "both" : V.open ? "open" : "notopen", `${n} is ${V.open ? "" : "not "}open`);
      if (command === "closedset" && V.closed !== null) return one(V.closed ? "closed" : V.open === false ? "neither" : "notclosed", `${n} is ${V.closed ? "" : "not "}closed`);
      if (command === "compact" && V.compact !== null) return one(V.compact ? "compact" : V.bounded === false ? "unbounded" : "notclosed", V.compact ? `${n} is closed and bounded` : `${n} is ${V.bounded === false ? "not bounded" : "not closed"}`);
      if (command === "evt" && V.compact !== null) return one(V.compact ? "both" : "fail", `${n} is ${V.compact ? "" : "not "}compact`);
      return null;
    }
    // E7: a jump (two formulas) and a corner.
    if (command === "limit" || command === "continuous") {
      const J = jump(vars, ctx);
      if (J) return one(command === "limit" ? "none" : "jump", `the two formulas approach ${cas.tex(J.left)} and ${cas.tex(J.right)}`);
    }
    if (command === "derivative") {
      const C = corner(vars, ctx);
      if (C) return one("corner", `the slopes from the two sides are ${cas.tex(C.left)} and ${cas.tex(C.right)}`);
    }
    if (command === "limit") {
      const L = limitVerdict(vars, ctx);
      if (!L) return null;
      const key = L.kind === "continuous" ? "cont" : L.kind === "cancel" ? "cancel" : L.oneVar ? "none" : "paths";
      return one(key, { cont: "continuous at the point", cancel: "0/0 that cancels", none: "the limit does not exist", paths: "the value depends on how you approach the point" }[key]);
    }
    if (command === "sumind") {
      const f = firstFailure(vars);
      return f ? one("wrong", `the two sides differ at n = ${f.n}`) : null;
    }
    if (command === "inequality") {
      const f = inequalityFailure(vars);
      return f ? one("fails", `it fails at ${f.x} = ${f.valueTex}`) : null;
    }
    if (command === "gauss" || command === "leastsquares") {
      // E5: Gauss elimination on the note's own system.
      const I = gaussInfo(vars);
      if (!I) return null;
      const k = I.G.kind;
      if (command === "leastsquares") return one(k === "none" ? "ls" : "exact", k === "none" ? "Av = b has no solution" : "Av = b can be solved");
      return one(k, k === "none" ? `row ${I.G.bad + 1} says 0 = ${cas.tex(I.G.rows[I.G.bad][I.sys.vars.length])}` : k === "unique" ? "every unknown gets a value" : `${I.G.free.join(", ")} free`);
    }
    if (command === "kkt") {
      if (infeasible(vars, ctx)) return one("none", "the constraints contradict each other");
      // E9: a point in the note is tested first.
      const N = notOptimal(vars, ctx);
      if (N) return N.K.ok ? one("isopt", "λ ≥ 0 solves the KKT equations at the point") : one("notopt", N.K.feasible ? "no λ ≥ 0 at the point" : "the point breaks a constraint");
      const K = kktVerdict(vars, ctx);
      if (!K) return null;
      if (!K.strictlyFeasible) return one("notsf", "no point has all g_i < 0");
      if (!K.point) return null;
      return one(K.allZero ? "inner" : "active", `optimum (${K.point.map((x) => cas.tex(x)).join(", ")})${K.allZero ? ", all λ = 0" : ""}`);
    }
    // E2: sets, propositions and function tables, every element / row tried.
    if (command === "setequal" || command === "subsetproof") {
      const V = setVerdictE2(vars);
      if (!V) return null;
      if (command === "subsetproof") return V.subset === null ? null : one(V.subset ? "yes" : "no", V.subset ? `every element of ${V.A.name} is in ${V.B.name}` : `${V.A.name} has an element outside ${V.B.name}`);
      if (V.equal === null) return null;
      if (V.equal) return one("eq", `${V.A.name} and ${V.B.name} have the same elements`);
      return one(V.ab && V.ba ? "neq" : "sub", V.ab && V.ba ? "each has an element the other lacks" : "one inclusion only");
    }
    if (command === "truthtable") {
      const I = truthInfo(vars);
      return I ? one(I.kind, { taut: "true in every row", contra: "false in every row", some: "false in some row", equiv: "the same in every row", differ: "they differ in one row" }[I.kind]) : null;
    }
    if (command === "injective" || command === "surjective") {
      const Tb = tableFn(vars, ctx);
      if (Tb) {
        if (command === "injective") return one(tableNotInjective(Tb) ? "notinj" : "inj", tableNotInjective(Tb) ? "two inputs with the same value" : "all values differ");
        if (!Tb.T) return null;
        return one(tableNotSurjective(Tb) ? "notsurj" : "surj", tableNotSurjective(Tb) ? "a value of T is never hit" : "every value of T is hit");
      }
    }
    if (command === "convexset") {
      // E8: two points of the set whose midpoint is outside.
      const B = setBadPair(vars, ctx);
      return B ? one("notconvex", "the midpoint of two of its points is outside") : null;
    }
    if (command === "fm") {
      // E4: the note's inequalities contradict each other, or elimination ends without that.
      const rels = noteRelations(vars);
      if (rels.length < 2) return null;
      const C = noteContradiction(vars);
      if (C) return one("none", `${contradictionLine(C).replace(/\$/g, "")}`);
      return noteFunctions(vars).length ? null : one("solvable", "elimination ends without a contradiction");
    }
    if (command === "svm") {
      const S = svmVerdict(vars, ctx);
      return S ? one(S.separable ? "sep" : "notsep", S.separable ? "the points are separable" : "the points are not separable") : null;
    }
    if (command === "lagrange") {
      const fg = noteFG(vars, ctx);
      if (!fg) return null;
      const S = lagrangeSolve(fg.F, fg.G);
      if (S.linearG && S.kind === "unique" && /definite/.test(S.d || "")) {
        const out = [{ key: "line", why: `${fg.G.v.name} is linear: one candidate, ${S.d.startsWith("positive") ? "a minimum" : "a maximum"} by convexity` }];
        if (S.center && /positive/.test(S.d)) out.push({ key: "distance", why: `${fg.F.v.name} = |v − p|²` });
        return out;
      }
      const gz = gradZeroPoints(vars, ctx);
      if (gz && /add it/.test(gz)) return one("gradzero", "∇g = 0 at a point of g = 0");
      const HG = cas.hessian(fg.G.x, S.xs);
      if (isConstM(HG) && /^positive definite/.test(definitenessWitness(HG)?.d || "")) return one("compact", `${fg.G.v.name} = 0 is a closed and bounded curve`);
      return null;
    }
    if (command === "critxy" || command === "hessian") {
      const keys = command === "critxy" ? { pd: "min", nd: "max", ind: "saddle", semi: "semi" } : { pd: "pd", nd: "nd", ind: "ind", semi: "semi" };
      return hessianAt(vars, ctx, keys);
    }
    if (command === "orthogonal") {
      const pts = notePoints(vars);
      if (pts.length < 2 || pts[0].value.length !== pts[1].value.length) return null;
      const [u, w] = pts.slice(0, 2).map((p) => p.value.map((x) => cas.parse(String(x))));
      const dot = num(cas.add(...u.map((x, i) => cas.mul(x, w[i]))));
      const nu = Math.sqrt(u.reduce((s, x) => s + num(x) ** 2, 0)); const nw = Math.sqrt(w.reduce((s, x) => s + num(x) ** 2, 0));
      if (Math.abs(dot) < 1e-12) return one("orth", `${pts[0].name} · ${pts[1].name} = 0`);
      return one(Math.abs(Math.abs(dot) - nu * nw) < 1e-9 ? "parallel" : "notorth", `${pts[0].name} · ${pts[1].name} = ${Number(dot.toFixed(6))}`);
    }
    return matrixOutcome(command, vars, ctx) || oneVarOutcome(command, vars, ctx);
  } catch (_) {
    return null;
  }
}
