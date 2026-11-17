// Theorem 7.39 with the note's f and g: the Lagrange system solved when it is
// linear (quadratic f, linear g, as in Exercise 7.41: distance from a line),
// and why the candidate is the minimum / maximum. A line is not compact, so
// Theorem 5.84 does not apply there; instead f convex along the line plus
// h'(0) = 0 gives the minimum (Theorem 6.13). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { linear, gauss } from "./elim.js";
import { mainFn, fnByName, noteFunctions } from "./textlink.js";
import { definitenessWitness, texM } from "./witness.js";

const T = (x, vars) => cas.tex(x, vars);
const isConstM = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));

// The note's objective f and constraint g (g = 0).
export function noteFG(vars, ctx = {}) {
  const F = mainFn(vars, ctx);
  if (!F) return null;
  const G = fnByName(vars, ctx.g || "g") || noteFunctions(vars).filter((v) => v.name !== F.v.name).map((v) => fnByName(vars, v.name)).find(Boolean);
  if (!G) return null;
  return { F, G };
}

// { xs, eqs, kind, point, lambda, value, linearG, H, d } or null.
export function lagrangeSolve(F, G) {
  const xs = cas.orderVars(new Set([...F.vars, ...cas.symbols(G.x)]));
  const all = [...xs, "lambda"];
  const lam = cas.sym("lambda");
  const eqs = [...xs.map((v) => cas.add(cas.diff(F.x, v), cas.mul(lam, cas.diff(G.x, v)))), G.x];
  const lin = eqs.map((e) => linear(e, all));
  if (lin.some((l) => !l)) return { xs, eqs, kind: "nonlinear" };
  const sol = gauss(lin.map((l) => [...l.coef, cas.neg(l.c0)]), all);
  if (sol.kind !== "unique") return { xs, eqs, kind: sol.kind };
  const point = sol.values.slice(0, xs.length);
  const env = Object.fromEntries(xs.map((v, i) => [v, point[i]]));
  const value = cas.subs(F.x, env);
  const linearG = !!linear(G.x, xs);
  const H = cas.hessian(F.x, xs);
  const d = isConstM(H) ? definitenessWitness(H)?.d || null : null;
  return { xs, eqs, kind: "unique", point, lambda: sol.values[xs.length], value, linearG, H, d, center: squaredDistanceCenter(F.x, xs) };
}

// f = (x - p_1)^2 + ... + (x_d - p_d)^2, i.e. f(v) = |v - p|^2: the point p, else null.
export function squaredDistanceCenter(f, xs) {
  const lin = xs.map((v) => linear(cas.diff(f, v), xs));
  if (lin.some((l) => !l)) return null;
  const S = gauss(lin.map((l) => [...l.coef, cas.neg(l.c0)]), xs);
  if (S.kind !== "unique") return null;
  const sq = cas.add(...xs.map((v, i) => cas.pow(cas.sub(cas.sym(v), S.values[i]), 2)));
  return cas.isZero(cas.sub(f, sq)) ? S.values : null;
}

// "The smallest distance from (1, 1) to the line is \sqrt{1/2} = ...", or "".
export function distanceSentence(S) {
  if (!S.center || !/positive/.test(S.d || "")) return "";
  const p = `(${S.center.map((x) => T(x)).join(", ")})`;
  const root = cas.pow(S.value, cas.Q(1, 2));
  const exact = T(root);
  const approx = Math.sqrt(cas.evaluate(S.value));
  const set = S.xs.length === 2 ? "line" : "plane";
  return ` Since $f(v) = |v - p|^2$ with $p = ${p}$ is the squared distance to $p$ (Definition 5.1), the point of the ${set} closest to $${p}$ is $${pt(S)}$, and the smallest distance is $\\sqrt{${T(S.value)}} = ${exact}${Number.isFinite(approx) && !Number.isInteger(approx) ? ` \\approx ${approx.toFixed(3)}` : ""}$.`;
}

const pt = (S) => `(${S.point.map((x) => T(x)).join(", ")})`;

// The {{...}} blanks of the \lagrange routes. undefined: not ours.
export function resolveLagrangeLabel(label, vars, ctx = {}) {
  const l = label.trim();
  if (!/Theorem 7\.39|Lagrangian/.test(ctx.body || "")) return undefined;
  if (!/^(solve the system|candidate points|values|max|min|why this is the max \/ min)$/.test(l)) return undefined;
  const fg = noteFG(vars, ctx);
  if (!fg) return null;
  let S;
  try { S = lagrangeSolve(fg.F, fg.G); } catch (_) { return null; }
  if (!S || S.kind !== "unique") return null;
  const f = fg.F.v.name;
  const from = `@${f} and @${fg.G.v.name}, Theorem 7.39`;
  const all = [...S.xs, "\\lambda"];
  if (l === "solve the system") {
    return { value: `The system is linear in $${all.join(", ")}$; Gauss elimination (Section 2.3) gives $${[...S.xs.map((v, i) => `${v} = ${T(S.point[i])}`), `\\lambda = ${T(S.lambda)}`].join(",\\ ")}$, the only solution.`, prose: true, from };
  }
  if (l === "candidate points") return { value: pt(S), from };
  if (l === "values") return { value: `${f}${pt(S)} = ${T(S.value)}`, from };
  const min = /positive/.test(S.d || "");
  const max = /negative/.test(S.d || "");
  if (l === "max" || l === "min") {
    if (!S.linearG || !(min || max)) return null;
    if ((l === "min") === min) return { value: `${f}${pt(S)} = ${T(S.value)}`, from };
    return { value: `\\text{none (} ${f} \\text{ is unbounded on the line)}`, from };
  }
  // why this is the max / min
  if (!S.linearG || !(min || max)) return null;
  const word = min ? "minimum" : "maximum";
  const sd = min ? "positive semi-definite" : "negative semi-definite";
  const set = S.xs.length === 2 ? "a line" : "a plane";
  const ff = min ? `$${f}$` : `$-${f}$`;
  const hh = min ? "$h$" : "$-h$";
  return {
    value: `The constraint set $g = 0$ is ${set} ($g$ is linear), which is not bounded, so Theorem 5.84 does not apply. Instead: $\\nabla^2 ${f} = ${texM(S.H)}$ is ${S.d} (symmetric reduction, Section 8.7), in particular ${sd}, so ${ff} is convex (Theorem 8.25). Take any $w$ with $g(w) = 0$, put $u = w - v_0$ and $h(t) = ${f}(v_0 + tu)$. Then ${hh} is convex, and $h'(0) = \\nabla ${f}(v_0) \\cdot u = -\\lambda\\, \\nabla g \\cdot u = 0$ (chain rule, Theorem 7.23; $\\nabla ${f}(v_0) = -\\lambda \\nabla g$ by the system, and $\\nabla g \\cdot u = g(w) - g(v_0) = 0$ as $g$ is linear). By Theorem 6.13, $t = 0$ is the global ${min ? "minimum of $h$" : "minimum of $-h$"}, so $${f}(w) = h(1) ${min ? "\\ge" : "\\le"} h(0) = ${f}(v_0)$. So $v_0 = ${pt(S)}$ is the ${word}: $${f}${pt(S)} = ${T(S.value)}$.${distanceSentence(S)}`,
    prose: true,
    from,
  };
}
