// Is f convex / strictly convex? Decided with the book's own tools and
// written out as a proof: Corollary 6.55, Proposition 6.43 + Theorem 6.54,
// Theorem 8.25 with symmetric reduction (Theorem 8.31, Propositions 3.43 and
// 8.11). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { latexName } from "./vars.js";
import { numericRoots } from "./objects.js";

const T = (x, vars) => cas.tex(x, vars);
const M = (A, vars) => `\\begin{pmatrix} ${A.map((r) => r.map((x) => T(x, vars)).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const val = (x, env) => { try { return cas.evaluate(x, env); } catch (_) { return NaN; } };
const coefOf = (t) => [...t.terms.values()][0];

// Sign of an expression for ALL values of its variables.
//   pos: > 0 everywhere;  nonneg: >= 0, zero only on a small set;  zero;
//   neg / nonpos likewise;  mixed: takes both signs (witness: where < 0);
//   unknown: could not decide.
export function signEverywhere(x, vars) {
  const c = cas.constValue(x);
  if (c) return c.n > 0 ? { s: "pos", why: "a positive constant" } : c.n < 0 ? { s: "neg", why: "a negative constant" } : { s: "zero", why: "zero" };
  // Structure: every term a positive number times even powers / e^(...).
  const termSign = (t) => {
    const { c: k, f } = coefOf(t);
    let even = true; let strict = true;
    for (const { atom, e } of f.values()) {
      if (atom.t === "fn" && atom.name === "exp") continue;
      if (e.d === 1 && e.n % 2 === 0) { strict = false; continue; }
      even = false;
    }
    return even ? { pos: k.n > 0, strict } : null;
  };
  const ts = cas.termsOf(x).map(termSign);
  if (ts.every((t) => t && t.pos)) {
    return ts.some((t) => t.strict)
      ? { s: "pos", why: "a sum of terms that are each $\\ge 0$ (even powers, $e^{\\dots}$) with at least one always $> 0$" }
      : { s: "nonneg", why: "a sum of even powers with positive coefficients, so $\\ge 0$ and $= 0$ only where all of them vanish" };
  }
  // One variable polynomial: its real roots and the sign between them.
  if (vars.length === 1) {
    const v = vars[0];
    let deg = 0; let d = x;
    while (!cas.isZero(d) && deg < 12) { d = cas.diff(d, v); deg++; }
    if (deg >= 1 && deg < 12 && cas.symbols(d).size === 0) {
      const roots = numericRoots(x, v).filter((z) => z.im === 0).map((z) => z.re).sort((a, b) => a - b);
      const cuts = [-Infinity, ...roots, Infinity];
      const signs = [];
      for (let i = 0; i + 1 < cuts.length; i++) {
        const a = cuts[i]; const b = cuts[i + 1];
        const m = !Number.isFinite(a) ? (Number.isFinite(b) ? b - 1 : 0) : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
        signs.push({ a, b, s: Math.sign(val(x, { [v]: m })) });
      }
      const fmt = (r) => String(Number(r.toFixed(4)));
      if (signs.every((s) => s.s > 0)) return roots.length ? { s: "nonneg", why: `a polynomial that is $> 0$ except at its root${roots.length > 1 ? "s" : ""} $${roots.map(fmt).join(", ")}$`, zeros: roots } : { s: "pos", why: "a polynomial without real roots that is positive at one point" };
      if (signs.every((s) => s.s < 0)) return { s: roots.length ? "nonpos" : "neg", why: "a polynomial that is negative" };
      const negPart = signs.find((s) => s.s < 0);
      const w = !Number.isFinite(negPart.a) ? (Number.isFinite(negPart.b) ? negPart.b - 1 : 0) : !Number.isFinite(negPart.b) ? negPart.a + 1 : (negPart.a + negPart.b) / 2;
      const nice = Number.isInteger(Math.round(w)) && Math.round(w) > negPart.a && Math.round(w) < negPart.b ? Math.round(w) : Number(w.toFixed(3));
      return { s: "mixed", why: "it changes sign", witness: { [v]: nice }, intervals: signs.map((s) => ({ ...s, a: s.a, b: s.b })), roots };
    }
  }
  // Otherwise look for a point where it is negative on a grid.
  const grid = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
  const pts = vars.length === 1 ? grid.map((a) => [a]) : vars.length === 2 ? grid.flatMap((a) => grid.map((b) => [a, b])) : grid.flatMap((a) => grid.flatMap((b) => grid.map((c) => [a, b, c])));
  let neg = null; let pos = false;
  for (const p of pts) {
    const env = Object.fromEntries(vars.map((v, i) => [v, p[i]]));
    const y = val(x, env);
    if (y < -1e-12) { neg = neg || env; } else if (y > 0) pos = true;
  }
  if (neg) return { s: pos ? "mixed" : "neg", why: "it is negative at a point", witness: neg };
  return { s: "unknown", why: "it is $\\ge 0$ at every point I tried, but I can't prove it for all points" };
}

// Symmetric reduction with expressions as entries: the diagonal entries
// (pivots) of B^T H B = D, clearing below each pivot (Section 8.7).
function symbolicPivots(H) {
  const A = H.map((r) => [...r]);
  const n = A.length;
  const piv = [];
  for (let k = 0; k < n; k++) {
    if (cas.isZero(A[k][k])) {
      // A zero row below/right of it: d_k = 0 and nothing to clear.
      if (A[k].every((x, j) => j <= k || cas.isZero(x))) { piv.push(cas.ZERO); continue; }
      return null; // would need a swap or row addition: not done symbolically
    }
    piv.push(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const f = cas.div(A[i][k], A[k][k]);
      for (let j = k; j < n; j++) A[i][j] = cas.sub(A[i][j], cas.mul(f, A[k][j]));
      for (let j = k; j < n; j++) A[j][i] = A[i][j];
    }
  }
  return piv;
}

function diagNumeric(H) {
  const A = H.map((r) => [...r]);
  const n = A.length;
  for (let k = 0; k < n; k++) {
    if (Math.abs(A[k][k]) < 1e-12) {
      const j = A[k].findIndex((x, j) => j > k && Math.abs(x) > 1e-12);
      if (j < 0) continue;
      for (let c = 0; c < n; c++) A[k][c] += A[j][c];
      for (let r = 0; r < n; r++) A[r][k] += A[r][j];
    }
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(A[k][k]) < 1e-12) continue;
      const f = A[i][k] / A[k][k];
      for (let c = 0; c < n; c++) A[i][c] -= f * A[k][c];
      for (let r = 0; r < n; r++) A[r][i] -= f * A[r][k];
    }
  }
  return A.map((r, i) => r[i]);
}

// steps: [{ text, tex }]. Returns the verdict as LaTeX for the note.
export function convexityProof(F, steps) {
  const name = latexName(F.v.name);
  const vars = F.vars;
  const fx = `${name}(${vars.join(", ")})`;
  steps.push({ text: `The function, defined on all of $\\mathbb{R}${vars.length > 1 ? `^${vars.length}` : ""}$ (an open convex set):`, tex: `${fx} = ${T(F.x, vars)}` });
  if (vars.length === 1) {
    const v = vars[0];
    const d1 = cas.diff(F.x, v); const d2 = cas.diff(d1, v);
    steps.push({ text: `Differentiate twice:`, tex: `\\begin{aligned} ${name}'(${v}) &= ${T(d1, vars)} \\\\ ${name}''(${v}) &= ${T(d2, vars)} \\end{aligned}` });
    const s = signEverywhere(d2, vars);
    if (s.s === "pos") {
      steps.push({ text: `$${name}''(${v}) > 0$ for every $${v}$: it is ${s.why}. By Corollary 6.55, $${name}$ is **strictly convex** (in particular convex).` });
      return `${name} \\text{ is strictly convex on } \\mathbb{R}`;
    }
    if (s.s === "nonneg") {
      steps.push({ text: `$${name}''(${v}) \\ge 0$ for every $${v}$ (${s.why}), so $${name}$ is convex by Corollary 6.55. Corollary 6.55 alone does not give *strict* convexity, because $${name}''$ is not $> 0$ everywhere (Remark 6.56).` });
      steps.push({ text: `But $${name}''(${v}) = 0$ only at isolated points, so $${name}''> 0$ on the open intervals between them and $${name}'$ is strictly increasing on each (Proposition 6.43); being continuous, $${name}'$ is strictly increasing on all of $\\mathbb{R}$. By Theorem 6.54, $${name}$ is **strictly convex**.` });
      return `${name} \\text{ is strictly convex on } \\mathbb{R}`;
    }
    if (s.s === "zero") {
      steps.push({ text: `$${name}'' = 0$, so $${name}$ is linear: convex (Corollary 6.55), but **not strictly convex**: on any segment $${name}((1-t)u + tv) = (1-t)${name}(u) + t${name}(v)$, so the strict inequality of Definition 6.1 fails.` });
      return `${name} \\text{ is convex but not strictly convex}`;
    }
    if (s.s === "mixed" || s.s === "neg" || s.s === "nonpos") {
      const w = s.witness || { [v]: 0 };
      const at = val(d2, w);
      steps.push({ text: `$${name}''$ is negative somewhere: $${name}''(${Number(w[v].toFixed ? w[v].toFixed(4) : w[v])}) = ${Number(at.toFixed(4))} < 0$. Corollary 6.55 is an "if and only if", so $${name}$ is **not convex** on $\\mathbb{R}$ (and not strictly convex).` });
      if (s.intervals) {
        const fmt = (r) => (Number.isFinite(r) ? String(Number(r.toFixed(4))) : r > 0 ? "\\infty" : "-\\infty");
        const good = s.intervals.filter((I) => I.s > 0).map((I) => `(${fmt(I.a)}, ${fmt(I.b)})`);
        if (good.length) steps.push({ text: `On the open interval${good.length > 1 ? "s" : ""} where $${name}'' > 0$ it is strictly convex (Corollary 6.55 applied to that interval):`, tex: good.join(",\\quad ") });
      }
      return `${name} \\text{ is not convex on } \\mathbb{R}`;
    }
    steps.push({ text: `I could not decide the sign of $${name}''(${v}) = ${T(d2, vars)}$ for all $${v}$ (${s.why}). Show $${name}'' \\ge 0$ (convex) or $> 0$ (strictly convex) to use Corollary 6.55.` });
    return `${name}'' = ${T(d2, vars)}`;
  }
  // Several variables: the Hessian and Theorem 8.25.
  const H = cas.hessian(F.x, vars);
  steps.push({ text: `The Hessian (Definition 8.2). Its second order partial derivatives are polynomials${cas.termsOf(F.x).some((t) => [...coefOf(t).f.values()].some((a) => a.atom.t === "fn")) ? " or built from continuous functions" : ""}, so continuous, as Theorem 8.25 requires:`, tex: `\\nabla^2 ${name} = ${M(H, vars)}` });
  const constH = H.every((r) => r.every((x) => cas.symbols(x).size === 0));
  const piv = symbolicPivots(H);
  if (!piv) {
    steps.push({ text: `A diagonal entry becomes $0$ while its row is not $0$, so symmetric reduction needs a row/column addition first (Section 8.7); below, definiteness is checked point by point instead.` });
  } else {
    steps.push({ text: `Symmetric reduction (Theorem 8.31, Section 8.7): clearing below each diagonal entry turns $\\nabla^2 ${name}$ into a diagonal matrix $D$ with the same definiteness at every point (Propositions 3.43 and 8.11). Its diagonal entries:`, tex: piv.map((p, i) => `d_{${i + 1}} = ${T(p, vars)}`).join(",\\quad ") });
    const signs = piv.map((p) => signEverywhere(cas.mul(p, cas.ONE), vars));
    if (signs.every((s) => s.s === "pos")) {
      steps.push({ text: `Every $d_i > 0$ at every point (${[...new Set(signs.map((s) => s.why))].join("; ")}), so $\\nabla^2 ${name}$ is positive definite at every point of $\\mathbb{R}^${vars.length}$. By Theorem 8.25, $${name}$ is **strictly convex** (in particular convex).` });
      return `${name} \\text{ is strictly convex on } \\mathbb{R}^${vars.length}`;
    }
    if (signs.every((s) => s.s === "pos" || s.s === "nonneg" || s.s === "zero")) {
      steps.push({ text: `Every $d_i \\ge 0$ at every point, so $\\nabla^2 ${name}$ is positive semi-definite everywhere and $${name}$ is **convex** by Theorem 8.25. ${constH ? `A $d_i$ is $0$, so the Hessian is not positive definite and Theorem 8.25 says nothing about *strict* convexity; check Definition 6.1 on a segment along which $${name}$ is linear.` : "Where a $d_i$ is $0$ the Hessian is only semi-definite, so for *strict* convexity Theorem 8.25 is not enough; use Definition 6.1."}` });
      return `${name} \\text{ is convex on } \\mathbb{R}^${vars.length}`;
    }
  }
  // Find a point where the Hessian is not positive semi-definite.
  const grid = [-2, -1, 0, 1, 2, 0.5, -0.5, 3, -3];
  const pts = vars.length === 2 ? grid.flatMap((a) => grid.map((b) => [a, b])) : grid.flatMap((a) => grid.flatMap((b) => grid.map((c) => [a, b, c].slice(0, vars.length))));
  for (const p of pts) {
    const env = Object.fromEntries(vars.map((v, i) => [v, p[i]]));
    const Hn = H.map((r) => r.map((x) => val(x, env)));
    const D = diagNumeric(Hn);
    const k = D.findIndex((d) => d < -1e-9);
    if (k >= 0) {
      const Hp = H.map((r) => r.map((x) => cas.subs(x, Object.fromEntries(vars.map((v, i) => [v, cas.num(Math.round(p[i] * 2), 2)])))));
      steps.push({ text: `At the point $(${p.join(", ")})$ the Hessian is not positive semi-definite: symmetric reduction gives a negative diagonal entry.`, tex: `\\nabla^2 ${name}(${p.join(", ")}) = ${M(Hp)}, \\quad D = \\operatorname{diag}(${D.map((d) => Number(d.toFixed(4))).join(", ")})` });
      steps.push({ text: `Theorem 8.25 is an "if and only if", so $${name}$ is **not convex** on $\\mathbb{R}^${vars.length}$ (and not strictly convex).${piv ? ` It is strictly convex on any open convex set where all of $${piv.map((q) => T(q, vars)).join(", \\ ")}$ are $> 0$ (Theorem 8.25 on that set).` : ""}` });
      return `${name} \\text{ is not convex on } \\mathbb{R}^${vars.length}`;
    }
  }
  steps.push({ text: `I could not decide the signs of $d_i$ for every point. Show they are $> 0$ everywhere (strictly convex) or $\\ge 0$ (convex) to apply Theorem 8.25.` });
  return `\\nabla^2 ${name} = ${M(H, vars)}`;
}
