// Worked solutions for the math objects (\hessian, \gradient, \inverse, ...):
// every intermediate calculation plus a sentence saying what is done and
// which definition/theorem of the book it uses. Inserted under the math
// block in which the answer was put. Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { latexName } from "./vars.js";
import { symmetricReduction, definiteness, definitenessWhy, CONCLUSION } from "./textlink.js";
import { typedFunction, numericRoots, fmtC, taylor2, gaussSources, fmSystem } from "./objects.js";
import { gauss, parseSystem, systemTex, parseIneqs, fmStep, ineqTex, inductionSteps } from "./elim.js";
import { findRelation } from "./vars.js";
import { convexityProof } from "./convex.js";

const T = (x, vars) => cas.tex(x, vars);
const M = (A, vars) => `\\begin{pmatrix} ${A.map((r) => r.map((x) => T(x, vars)).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const Mraw = (rows) => `\\begin{pmatrix} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const col = (xs, vars) => M(xs.map((x) => [x]), vars);
const tup = (xs, vars) => `(${xs.map((x) => T(x, vars)).join(", ")})`;
const paren = (s) => (/^[\w.\\{}^]+$/.test(s) && !/^-/.test(s) ? s : `\\left(${s}\\right)`);
const aligned = (lines) => (lines.length === 1 ? lines[0] : `\\begin{aligned} ${lines.map((l) => l.replace("=", "&=")).join(" \\\\ ")} \\end{aligned}`);
const sub = (name, vs) => `${name}_{${vs.join("")}}`;
const dfrac = (v, n = 1) => (n === 1 ? `\\frac{\\partial}{\\partial ${v}}` : `\\frac{\\partial^{${n}}}{\\partial ${v}^{${n}}}`);
const joinSigned = (parts) => parts.join(" + ").replace(/\+ -/g, "- ");

// LaTeX of x with the variables replaced by the values, before simplifying:
// 3x^2 y at (1, 2) shows as 3(1)^2(2).
function plugIn(x, vars, values) {
  let s = T(x, vars);
  vars.forEach((v, i) => {
    s = s.replace(new RegExp(`(?<![\\\\A-Za-z])${v}(?![A-Za-z])`, "g"), `(${T(values[i])})`);
  });
  return s;
}

// d/dv of f, term by term when f is a sum of a few terms.
function diffLine(lhs, f, v, vars) {
  const d = cas.diff(f, v);
  const ts = cas.termsOf(f);
  const mid = ts.length >= 2 && ts.length <= 6 ? ` = ${joinSigned(ts.map((t) => `${dfrac(v)}${paren(T(t, vars))}`))}` : "";
  // Each term's derivative on its own (0 for terms without v), then simplified.
  const parts = ts.length >= 2 && ts.length <= 6 ? ts.map((t) => cas.diff(t, v)) : [];
  const each = parts.length ? joinSigned(parts.map((t) => T(t, vars))) : "";
  const mid2 = each && each !== T(d, vars) ? ` = ${each}` : "";
  return { tex: `${lhs} = ${dfrac(v)}${paren(T(f, vars))}${mid}${mid2} = ${T(d, vars)}`, d };
}

// f(x, y) = as written = simplified (when collecting terms changes it).
const fnTex = (F) => {
  const simple = T(F.x, F.vars);
  const own = typeof F.v.value === "string" ? F.v.value.trim() : "";
  // Top-level terms as written: x^3 + xy + x^3 has 3, 2x^3 + xy has 2.
  let depth = 0, written = own ? 1 : 0;
  for (let i = 0; i < own.length; i++) {
    const c = own[i];
    if ("{([".includes(c)) depth++;
    else if ("})]".includes(c)) depth--;
    else if ((c === "+" || c === "-") && depth === 0 && i > 0 && own.slice(0, i).trim()) written++;
  }
  const combined = own && written !== cas.termsOf(F.x).length;
  const shown = combined ? `${own} = ${simple}` : own || simple;
  return `${latexName(F.v.name)}(${F.vars.join(", ")}) = ${shown}`;
};
const nameOf = (F) => latexName(F.v.name);

// ---------- building blocks ----------

function firstPartials(F, steps) {
  const lines = [];
  const g = F.vars.map((v) => {
    const { tex, d } = diffLine(sub(nameOf(F), [v]), F.x, v, F.vars);
    lines.push(tex);
    return d;
  });
  steps.push({ text: `Differentiate with respect to one variable at a time and treat the other variables as constants (Definition 7.4, Remark 7.5). Each term is differentiated on its own (sum rule).`, tex: aligned(lines) });
  return g;
}

function secondPartials(F, g, steps) {
  const lines = [];
  const H = F.vars.map((a, i) => F.vars.map((b) => {
    const { tex, d } = diffLine(sub(nameOf(F), [a, b]), g[i], b, F.vars);
    lines.push(tex);
    return d;
  }));
  steps.push({ text: `Differentiate each first partial derivative once more to get the second-order partial derivatives.`, tex: aligned(lines) });
  const sym = H.every((r, i) => r.every((x, j) => cas.equal(x, H[j][i])));
  if (F.vars.length > 1 && sym) steps.push({ text: `The mixed partials agree (${F.vars.length === 2 ? `$${sub(nameOf(F), F.vars)} = ${sub(nameOf(F), [...F.vars].reverse())}$` : "the matrix is symmetric"}), as Clairaut's theorem (Theorem 7.11) says they must; that is a good check.` });
  return H;
}

function atPointLines(name, exprs, vars, values) {
  return exprs.map((x, i) => {
    const plugged = plugIn(x, vars, values);
    const v = T(cas.subs(x, Object.fromEntries(vars.map((u, k) => [u, values[k]]))));
    return `${name(i)}(${values.map((x) => T(x)).join(", ")}) = ${plugged === v ? v : `${plugged} = ${v}`}`;
  });
}

function hessianAtPoint(F, H, p, steps, g) {
  const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
  const lines = [];
  const Hp = H.map((r, i) => r.map((x, j) => {
    const plugged = plugIn(x, F.vars, p.xs);
    const val = cas.subs(x, map);
    if (j >= i) lines.push(`${sub(nameOf(F), [F.vars[i], F.vars[j]])}(${p.xs.map((x) => T(x)).join(", ")}) = ${plugged === T(val) ? T(val) : `${plugged} = ${T(val)}`}`);
    return val;
  }));
  steps.push({ text: `Plug the point $${latexName(p.v.name)} = ${tup(p.xs)}$ into every second partial derivative.`, tex: aligned(lines) });
  steps.push({ text: `So the Hessian at the point is`, tex: `\\nabla^2 ${nameOf(F)}${tup(p.xs)} = ${M(Hp)}` });
  if (g) {
    const gp = g.map((x) => cas.subs(x, map));
    const critical = gp.every(cas.isZero);
    steps.push({ text: critical
      ? `The gradient is $0$ there, so $${latexName(p.v.name)}$ is a critical point (Definition 7.15) and the Hessian test applies.`
      : `Careful: the gradient there is $${tup(gp)}$, not $0$, so $${latexName(p.v.name)}$ is not a critical point and the Hessian test (Theorem 8.12) says nothing about a local extremum there.`,
    tex: `\\nabla ${nameOf(F)}${tup(p.xs)} = ${tup(gp)}` });
    classify(Hp, steps, critical ? latexName(p.v.name) : null);
  }
  return Hp;
}

// The extended matrix (B over A) with a line between the halves.
const extTex = (B, A) => {
  const n = A.length;
  const rows = (R) => R.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ");
  return `\\left(\\begin{array}{${"c".repeat(n)}} ${rows(B)} \\\\ \\hline ${rows(A)} \\end{array}\\right)`;
};
const isSym = (A) => A.every((r, i) => r.every((x, j) => cas.equal(x, A[j][i])));

// Symmetric reduction with every operation written out (Section 8.6,
// Theorem 8.31), then the definiteness read off D. Returns the definiteness
// (or null). name: LaTeX name of the matrix; pointName: the critical point
// when this is a Hessian there (then the Hessian test conclusion is added).
function symReductionSteps(A0, steps, { name = "A", pointName = null, hessian = false } = {}) {
  const R = symmetricReduction(A0);
  if (!R) return null;
  const n = A0.length;
  steps.push({ text: `Symmetric reduction (Section 8.6, Theorem 8.31). Write the identity matrix on top of $${name}$. Every column operation is done on the whole extended matrix, the matching row operation only on the lower half. When the lower half is diagonal it is $D$, the upper half is $B$, and $B^\\top ${name} B = D$.`, tex: extTex(A0.map((_, i) => A0.map((_, j) => (i === j ? cas.ONE : cas.ZERO))), A0) });
  if (!R.ops.length) steps.push({ text: `The lower half is already diagonal, so no operations are needed.` });
  for (let k = 0; k < R.ops.length; k++) {
    const o = R.ops[k];
    const i = o.i + 1, j = o.j + 1;
    let text;
    if (o.kind === "swap") {
      text = `Diagonal entry ${i} is $0$ but diagonal entry ${j} is not: interchange columns ${i} and ${j} (whole matrix) and rows ${i} and ${j} (lower half).`;
    } else if (o.i > o.j) { // the adding trick: a later column/row into column/row j
      text = `The rest of the diagonal is $0$, but row ${j} has a non-zero entry in column ${i}: add column ${i} to column ${j} (whole matrix) and row ${i} to row ${j} (lower half). Now diagonal entry ${j} is not $0$.`;
    } else {
      const c = T(o.c);
      text = `Clear entries $(${i}, ${j})$ and $(${j}, ${i})$: add $${paren(c)}$ times column ${i} to column ${j} (whole matrix), then $${paren(c)}$ times row ${i} to row ${j} (lower half).`;
    }
    steps.push({ text, tex: extTex(o.B, o.A) });
  }
  const Dm = A0.map((_, i) => A0.map((_, j) => (i === j ? R.D[i] : cas.ZERO)));
  const BtAB = cas.mat.mul(cas.mat.mul(cas.mat.transpose(R.B), A0), R.B);
  steps.push({ text: `Read off $B$ (upper half) and $D$ (lower half). $B$ is invertible (it is the identity after column operations), and the check holds:`, tex: `B = ${M(R.B)},\\quad B^\\top ${name} B = ${M(BtAB)} = D` });
  const d = definiteness(R.D);
  if (!d) { steps.push({ text: `The signs of the diagonal entries $${R.D.map((x) => T(x)).join(",\\ ")}$ cannot be decided.` }); return null; }
  const prop = /semi/.test(d) ? "Proposition 3.43" : hessian ? "Proposition 8.11" : "Propositions 3.43 and 8.11";
  let end = "";
  if (pointName) {
    end = /semi/.test(d)
      ? `. A semidefinite Hessian is not covered by the Hessian test (Theorem 8.12), so it does not decide whether $${pointName}$ is a local extremum`
      : `, so by the Hessian test (Theorem 8.12) $${pointName}$ is a **${CONCLUSION[d]}**`;
  }
  steps.push({ text: `$D$ has diagonal $${R.D.map((x) => T(x)).join(",\\ ")}$, so $D$ is ${d} because ${definitenessWhy(d)}. $B$ is invertible, so by ${prop} $${name}$ is **${d}** too${end}.` });
  return d;
}

function classify(Hp, steps, pointName) {
  symReductionSteps(Hp, steps, { name: "H", pointName, hessian: true });
}

// Gauss-Jordan with every row operation written down.
function gaussJordan(A0, steps, { split = null, label = "" } = {}) {
  const A = A0.map((r) => [...r]);
  const rows = A.length;
  const cols = split ?? A[0].length;
  const show = () => (split ? augmented(A, split) : M(A));
  steps.push({ text: `Start${label}:`, tex: show() });
  let lead = 0;
  for (let r = 0; r < rows && lead < cols; r++) {
    let i = r;
    while (i < rows && cas.isZero(A[i][lead])) i++;
    if (i === rows) { lead++; r--; continue; }
    const ops = [];
    if (i !== r) { [A[i], A[r]] = [A[r], A[i]]; ops.push(`R_{${r + 1}} \\leftrightarrow R_{${i + 1}}`); }
    const pv = A[r][lead];
    if (!cas.equal(pv, cas.ONE)) {
      A[r] = A[r].map((x) => cas.div(x, pv));
      const inv = cas.div(cas.ONE, pv);
      ops.push(`R_{${r + 1}} \\to ${cas.equal(inv, cas.neg(cas.ONE)) ? "-" : paren(T(inv))} R_{${r + 1}}`);
    }
    for (let k = 0; k < rows; k++) {
      if (k === r || cas.isZero(A[k][lead])) continue;
      const f = A[k][lead];
      A[k] = A[k].map((x, j) => cas.sub(x, cas.mul(f, A[r][j])));
      const c = cas.constValue(f);
      const neg = c && c.n < 0;
      const m = neg ? cas.neg(f) : f;
      const coef = cas.equal(m, cas.ONE) ? "" : `${paren(T(m))} `;
      ops.push(`R_{${k + 1}} \\to R_{${k + 1}} ${neg ? "+" : "-"} ${coef}R_{${r + 1}}`);
    }
    if (ops.length) steps.push({ text: `Pivot in column ${lead + 1}: ${ops.length === 1 ? "one row operation" : "row operations"} $${ops.join(",\\ ")}$.`, tex: show() });
    lead++;
  }
  return A;
}
const augmented = (A, n) => `\\left(\\begin{array}{${"c".repeat(n)}|${"c".repeat(A[0].length - n)}} ${A.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ")} \\end{array}\\right)`;

function detSteps(A, steps, D = "\\det A") {
  const n = A.length;
  if (n === 1) { steps.push({ text: `A $1\\times1$ matrix is its own determinant.`, tex: `${D} = ${T(A[0][0])}` }); return A[0][0]; }
  if (n === 2) {
    const d = cas.mat.det(A);
    steps.push({ text: `For a $2\\times2$ matrix $\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$.`, tex: `${D} = ${paren(T(A[0][0]))} \\cdot ${paren(T(A[1][1]))} - ${paren(T(A[0][1]))} \\cdot ${paren(T(A[1][0]))} = ${T(d)}` });
    return d;
  }
  const terms = [];
  const minors = [];
  for (let j = 0; j < n; j++) {
    const minor = A.slice(1).map((r) => r.filter((_, k) => k !== j));
    const md = cas.mat.det(minor);
    minors.push(`\\det${M(minor)} = ${T(md)}`);
    terms.push({ sign: j % 2 ? "-" : "+", a: A[0][j], md });
  }
  steps.push({ text: `Expand along the first row (cofactor expansion): $${D} = \\sum_j (-1)^{1+j} a_{1j} \\det A_{1j}$, where $A_{1j}$ is $A$ without row 1 and column j. The minors:`, tex: aligned(minors) });
  const d = cas.mat.det(A);
  steps.push({ text: `Put it together:`, tex: `${D} = ${terms.map((t, j) => `${j ? ` ${t.sign} ` : t.sign === "-" ? "-" : ""}${paren(T(t.a))} \\cdot ${paren(T(t.md))}`).join("")} = ${T(d)}` });
  return d;
}

// ---------- per object ----------

function find(ctx, list, name) { return ctx[list].find((x) => x.v.name === name); }
// A typed function, or the note's variable when its name is typed (A, @f, f(x, y)).
let curCtx = null;
const parseF = (a) => {
  const t = typedFunction(a.f, curCtx ? curCtx.fns : undefined);
  const vars = a.vars?.trim() ? a.vars.split(",").map((s) => s.trim()).filter(Boolean) : t.vars;
  return { v: { name: t.name || "f", value: t.value }, x: t.x, vars };
};
const parsePt = (text, n) => {
  const items = String(text || "").replace(/^\s*[([]|[)\]]\s*$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length !== n) return null;
  return { v: { name: "p" }, xs: items.map((s) => cas.parse(s)) };
};
const parseMat = (text) => {
  const rows = [...String(text).matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1].split(",").map((s) => cas.parse(s.trim())));
  return rows.length ? rows : null;
};

const HANDLERS = {
  hessian(id, ctx, a, steps) {
    let F, p;
    if (id === "own" || id === "ownp") { F = parseF(a); if (id === "ownp") p = parsePt(a.p, F.vars.length); }
    else { const [, fn, pn] = id.split(":"); F = find(ctx, "fns", fn); if (pn) p = find(ctx, "vecs", pn); }
    if (!F) return null;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    const g = firstPartials(F, steps);
    const H = secondPartials(F, g, steps);
    steps.push({ text: `The Hessian is the matrix of all second-order partial derivatives, entry $(i, j)$ is $\\frac{\\partial^2 ${nameOf(F)}}{\\partial x_i \\partial x_j}$ (Definition 8.2).`, tex: `\\nabla^2 ${nameOf(F)} = ${Mraw(F.vars.map((x) => F.vars.map((y) => sub(nameOf(F), [x, y]))))} = ${M(H, F.vars)}` });
    if (p) hessianAtPoint(F, H, p, steps, g);
    else if (H.every((r) => r.every((x) => cas.symbols(x).size === 0))) classify(H, steps, null);
    return `Hessian of $${nameOf(F)}$${p ? ` at $${latexName(p.v.name)}$` : ""}`;
  },
  gradient(id, ctx, a, steps) {
    let F, p;
    if (id === "own") F = parseF(a);
    else { const [, fn, pn] = id.split(":"); F = find(ctx, "fns", fn); if (pn) p = find(ctx, "vecs", pn); }
    if (!F) return null;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    const g = firstPartials(F, steps);
    steps.push({ text: `The gradient collects the first partial derivatives (Section 7.5):`, tex: `\\nabla ${nameOf(F)} = ${Mraw(F.vars.map((v) => [sub(nameOf(F), [v])]))} = ${col(g, F.vars)}` });
    if (p) {
      steps.push({ text: `Plug in $${latexName(p.v.name)} = ${tup(p.xs)}$:`, tex: aligned(atPointLines((i) => sub(nameOf(F), [F.vars[i]]), g, F.vars, p.xs)) });
      const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
      steps.push({ text: `So`, tex: `\\nabla ${nameOf(F)}${tup(p.xs)} = ${col(g.map((x) => cas.subs(x, map)))}` });
    }
    return `gradient of $${nameOf(F)}$`;
  },
  partial(id, ctx, a, steps) {
    const [kind, fn, which] = id.split(":");
    const F = find(ctx, "fns", fn);
    if (!F) return null;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    if (kind === "f") {
      steps.push({ text: `Differentiate with respect to $${which}$ and treat the other variables as constants (Definition 7.4).`, tex: diffLine(sub(nameOf(F), [which]), F.x, which, F.vars).tex });
    } else {
      const [x, y] = which;
      const one = diffLine(sub(nameOf(F), [x]), F.x, x, F.vars);
      steps.push({ text: `First differentiate with respect to $${x}$ (Definition 7.4):`, tex: one.tex });
      steps.push({ text: `Then differentiate that with respect to $${y}$:`, tex: diffLine(sub(nameOf(F), [x, y]), one.d, y, F.vars).tex });
    }
    return `partial derivative of $${nameOf(F)}$`;
  },
  laplacian(id, ctx, a, steps) {
    const F = find(ctx, "fns", id.split(":")[1]);
    if (!F) return null;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    const g = firstPartials(F, steps);
    const lines = F.vars.map((v, i) => diffLine(sub(nameOf(F), [v, v]), g[i], v, F.vars));
    steps.push({ text: `The pure second derivatives:`, tex: aligned(lines.map((l) => l.tex)) });
    steps.push({ text: `The Laplacian is their sum:`, tex: `\\Delta ${nameOf(F)} = ${F.vars.map((v) => sub(nameOf(F), [v, v])).join(" + ")} = ${T(cas.add(...lines.map((l) => l.d)), F.vars)}` });
    return `Laplacian of $${nameOf(F)}$`;
  },
  jacobian(id, ctx, a, steps) {
    let fs, names;
    if (id.startsWith("s:")) {
      const F = find(ctx, "fns", id.slice(2)); if (!F) return null;
      steps.push({ text: `The function:`, tex: fnTex(F) });
      const g = firstPartials(F, steps);
      steps.push({ text: `For one function the Jacobian is the $1 \\times ${F.vars.length}$ row of its partial derivatives (Proposition 7.9), i.e. the gradient written as a row:`, tex: `J = ${M([g], F.vars)}` });
      return `Jacobian of $${nameOf(F)}$`;
    }
    if (id.startsWith("F:")) { const F = find(ctx, "vecs", id.slice(2)); if (!F) return null; fs = F.xs; names = fs.map((_, i) => `${latexName(F.v.name)}_{${i + 1}}`); }
    else if (id === "fns") { const list = ctx.fns.filter((f) => f.vars.length); fs = list.map((f) => f.x); names = list.map((f) => latexName(f.v.name)); }
    else if (id === "own") { fs = a.F.split(";").map((s) => cas.parse(s)); names = fs.map((_, i) => `f_{${i + 1}}`); }
    else return null;
    const vars = cas.orderVars(new Set(fs.flatMap((f) => [...cas.symbols(f)])));
    steps.push({ text: `The component functions:`, tex: aligned(fs.map((f, i) => `${names[i]} = ${T(f, vars)}`)) });
    const lines = [];
    const J = fs.map((f, i) => vars.map((v) => { const l = diffLine(`\\frac{\\partial ${names[i]}}{\\partial ${v}}`, f, v, vars); lines.push(l.tex); return l.d; }));
    steps.push({ text: `Every entry of the Jacobian is a partial derivative: row $i$ is the gradient of the $i$-th component (Proposition 7.9).`, tex: aligned(lines) });
    steps.push({ text: `Collect them in the matrix:`, tex: `J = ${M(J, vars)}` });
    return "Jacobian";
  },
  tangentplane(id, ctx, a, steps) {
    let F, p;
    if (id === "own") { F = parseF(a); p = parsePt(a.p, F.vars.length); }
    else { const [, fn, pn] = id.split(":"); F = find(ctx, "fns", fn); p = find(ctx, "vecs", pn); }
    if (!F || !p) return null;
    const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
    steps.push({ text: `The function and the point:`, tex: `${fnTex(F)}, \\quad ${latexName(p.v.name)} = ${tup(p.xs)}` });
    const f0 = cas.subs(F.x, map);
    steps.push({ text: `The value at the point:`, tex: `${nameOf(F)}${tup(p.xs)} = ${plugIn(F.x, F.vars, p.xs)} = ${T(f0)}` });
    const g = firstPartials(F, steps);
    steps.push({ text: `The partial derivatives at the point:`, tex: aligned(atPointLines((i) => sub(nameOf(F), [F.vars[i]]), g, F.vars, p.xs)) });
    const gp = g.map((x) => cas.subs(x, map));
    const z = F.vars.length === 1 ? "y" : "z";
    const formula = `${z} = ${nameOf(F)}${tup(p.xs)} + ${F.vars.map((v, i) => `${sub(nameOf(F), [v])}${tup(p.xs)}(${v} - ${T(p.xs[i])})`).join(" + ")}`;
    const filled = `${z} = ${T(f0)} + ${F.vars.map((v, i) => `${paren(T(gp[i]))}(${v} - ${paren(T(p.xs[i]))})`).join(" + ")}`;
    const t = cas.add(f0, ...F.vars.map((v, i) => cas.mul(gp[i], cas.sub(cas.sym(v), p.xs[i]))));
    steps.push({ text: `The tangent ${F.vars.length === 1 ? "line" : "plane"} is the first-order approximation: value plus gradient times the displacement.`, tex: aligned([formula, filled, `${z} = ${T(t, F.vars)}`]) });
    return `tangent ${F.vars.length === 1 ? "line" : "plane"} of $${nameOf(F)}$`;
  },
  directional(id, ctx, a, steps) {
    const [fn, pn, dn] = id.split(":");
    const F = find(ctx, "fns", fn); const p = find(ctx, "vecs", pn); const d = find(ctx, "vecs", dn);
    if (!F || !p || !d) return null;
    const g = firstPartials(F, steps);
    const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
    const gp = g.map((x) => cas.subs(x, map));
    steps.push({ text: `The gradient at the point:`, tex: `\\nabla ${nameOf(F)}${tup(p.xs)} = ${tup(gp)}` });
    const val = cas.add(...gp.map((x, i) => cas.mul(x, d.xs[i])));
    steps.push({ text: `The directional derivative is the dot product of the gradient with the direction (Definition 5.1 for the dot product):`, tex: `\\nabla ${nameOf(F)}(${latexName(p.v.name)}) \\cdot ${latexName(d.v.name)} = ${gp.map((x, i) => `${paren(T(x))} \\cdot ${paren(T(d.xs[i]))}`).join(" + ")} = ${T(val)}` });
    return "directional derivative";
  },
  critical(id, ctx, a, steps) {
    const F = find(ctx, "fns", id.split(":")[1]);
    if (!F) return null;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    const g = firstPartials(F, steps);
    steps.push({ text: `A critical point is where every partial derivative is $0$ (Definition 7.15${F.vars.length === 1 ? ", Definition 6.36" : ""}). Solve this system:`, tex: `\\begin{cases} ${g.map((x) => `${T(x, F.vars)} = 0`).join(" \\\\ ")} \\end{cases}` });
    return `critical points of $${nameOf(F)}$`;
  },
  newtonstep(id, ctx, a, steps) {
    const [kind, fn, pn] = id.split(":");
    if (kind === "1d") {
      const F = find(ctx, "fns", fn); if (!F) return null;
      const v = F.vars[0]; const x0 = cas.parse(a.x0 || "1");
      const l = diffLine(`${nameOf(F)}'(${v})`, F.x, v, F.vars);
      steps.push({ text: `The Newton-Raphson method (Section 6.3.5) for ${nameOf(F)}(${v}) = 0$ uses $x_1 = x_0 - \\frac{f(x_0)}{f'(x_0)}$. First the derivative:`, tex: l.tex });
      const f0 = cas.subs(F.x, { [v]: x0 }); const d0 = cas.subs(l.d, { [v]: x0 });
      steps.push({ text: `Values at $x_0 = ${T(x0)}$:`, tex: aligned([`${nameOf(F)}(${T(x0)}) = ${plugIn(F.x, [v], [x0])} = ${T(f0)}`, `${nameOf(F)}'(${T(x0)}) = ${plugIn(l.d, [v], [x0])} = ${T(d0)}`]) });
      steps.push({ text: `One step:`, tex: `x_1 = ${T(x0)} - \\frac{${T(f0)}}{${T(d0)}} = ${T(cas.sub(x0, cas.div(f0, d0)))}` });
      return "Newton step";
    }
    if (kind !== "fp") return null;
    const F = find(ctx, "fns", fn); const p = find(ctx, "vecs", pn);
    if (!F || !p) return null;
    const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
    const g = firstPartials(F, steps);
    const H = secondPartials(F, g, steps);
    const gp = g.map((x) => cas.subs(x, map));
    const Hp = H.map((r) => r.map((x) => cas.subs(x, map)));
    steps.push({ text: `Gradient and Hessian at the starting point $v_0 = ${tup(p.xs)}$:`, tex: `\\nabla ${nameOf(F)}(v_0) = ${col(gp)}, \\quad \\nabla^2 ${nameOf(F)}(v_0) = ${M(Hp)}` });
    const Hi = cas.mat.inverse(Hp);
    steps.push({ text: `Invert the Hessian:`, tex: `\\nabla^2 ${nameOf(F)}(v_0)^{-1} = ${M(Hi)}` });
    const s = cas.mat.mul(Hi, gp.map((x) => [x])).map((r) => r[0]);
    steps.push({ text: `Multiply by the gradient:`, tex: `\\nabla^2 ${nameOf(F)}(v_0)^{-1} \\nabla ${nameOf(F)}(v_0) = ${col(s)}` });
    steps.push({ text: `One step of Newton's method for critical points (Section 8.3), $v_1 = v_0 - \\nabla^2 F(v_0)^{-1}\\nabla F(v_0)$:`, tex: `v_1 = ${col(p.xs)} - ${col(s)} = ${col(p.xs.map((x, i) => cas.sub(x, s[i])))}` });
    return "Newton step";
  },
  lagrangian(id, ctx, a, steps) {
    const [kind, fn, gn] = id.split(":");
    if (kind !== "fg") return null;
    const F = find(ctx, "fns", fn);
    const G = find(ctx, "fns", gn) || find(ctx, "rels", gn);
    if (!F || !G) return null;
    const lam = cas.sym("lambda");
    const L = cas.sub(F.x, cas.mul(lam, G.x));
    const vars = cas.orderVars(new Set([...F.vars, ...cas.symbols(G.x)]));
    steps.push({ text: `The Lagrangian subtracts $\\lambda$ times the constraint $${latexName(G.v.name)} = 0$ from the objective (Theorem 7.39):`, tex: `L = ${nameOf(F)} - \\lambda ${latexName(G.v.name)} = ${T(L, [...vars, "lambda"])}` });
    const ds = vars.map((v) => diffLine(`\\frac{\\partial L}{\\partial ${v}}`, L, v, [...vars, "lambda"]));
    steps.push({ text: `Differentiate $L$ with respect to each variable (Definition 7.4):`, tex: aligned(ds.map((d) => d.tex)) });
    steps.push({ text: `Set them to $0$ together with the constraint; solving this system gives the candidates for the constrained extrema:`, tex: `\\begin{cases} ${[...ds.map((d) => `${T(d.d, [...vars, "lambda"])} = 0`), `${T(G.x, vars)} = 0`].join(" \\\\ ")} \\end{cases}` });
    return "Lagrange conditions";
  },
  derivative(id, ctx, a, steps) {
    const [kind, fn, which] = id.split(":");
    if (kind === "p") return HANDLERS.partial(`f:${fn}:${which}`, ctx, a, steps);
    if (kind === "q") return HANDLERS.partial(`f2:${fn}:${which}`, ctx, a, steps);
    let F;
    if (id === "own") F = parseF(a); else F = find(ctx, "fns", fn);
    if (!F) return null;
    // Several variables: all first partial derivatives.
    if (F.vars.length > 1) return HANDLERS.gradient("own", ctx, a, steps);
    const v = F.vars[0] || "x";
    const n = kind === "2" ? 2 : kind === "n" ? Math.max(1, Math.min(20, Number(a.n) || 3)) : 1;
    steps.push({ text: `The function:`, tex: fnTex(F) });
    let cur = F.x;
    for (let k = 1; k <= n; k++) {
      const l = diffLine(`${nameOf(F)}${"'".repeat(Math.min(k, 3))}${k > 3 ? `^{(${k})}` : ""}(${v})`, cur, v, F.vars);
      steps.push({ text: k === 1 ? `Differentiate term by term (sum and power rules, Section 6.3.2; product rule, Section 6.3.3; chain rule, Section 6.3.4):` : `Differentiate again:`, tex: l.tex });
      cur = l.d;
    }
    return `derivative of $${nameOf(F)}$`;
  },
  taylor(id, ctx, a, steps) {
    if (id.startsWith("t2:")) {
      const F = find(ctx, "fns", id.slice(3));
      const p = F && parsePt(a.p, F.vars.length);
      if (!F || !p) return null;
      const map = Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]));
      steps.push({ text: `For several variables the second-order Taylor polynomial at $a$ (Sections 8.2 and 8.4) is $T_2(x) = f(a) + \\nabla f(a)(x - a) + \\tfrac12 (x - a)^\\top \\nabla^2 f(a)(x - a)$. The function and the point:`, tex: `${fnTex(F)}, \\quad a = ${tup(p.xs)}` });
      steps.push({ text: `The value at $a$:`, tex: `${nameOf(F)}${tup(p.xs)} = ${plugIn(F.x, F.vars, p.xs)} = ${T(cas.subs(F.x, map))}` });
      const g = firstPartials(F, steps);
      const H = secondPartials(F, g, steps);
      steps.push({ text: `Gradient and Hessian at $a$:`, tex: `\\nabla ${nameOf(F)}(a) = ${tup(g.map((x) => cas.subs(x, map)))}, \\quad \\nabla^2 ${nameOf(F)}(a) = ${M(H.map((r) => r.map((x) => cas.subs(x, map))))}` });
      const h = col(F.vars.map((v, i) => cas.sub(cas.sym(v), p.xs[i])), F.vars);
      steps.push({ text: `Insert them, with $x - a = ${h}$, and expand:`, tex: `T_2 = ${T(cas.subs(F.x, map))} + ${tup(g.map((x) => cas.subs(x, map)))} \\cdot ${h} + \\tfrac12 ${h}^\\top ${M(H.map((r) => r.map((x) => cas.subs(x, map))))} ${h} = ${T(taylor2(F, p), F.vars)}` });
      return `second-order Taylor polynomial of $${nameOf(F)}$`;
    }
    let F;
    if (id === "own") F = parseF(a); else F = find(ctx, "fns", id.split(":")[1]);
    if (!F) return null;
    const v = F.vars[0] || "x";
    const at = cas.parse(a.a || "0");
    const n = Math.max(0, Math.min(15, Number(a.n) || 3));
    const lines = [];
    let cur = F.x;
    const coeffs = [];
    for (let k = 0; k <= n; k++) {
      const val = cas.subs(cur, { [v]: at });
      lines.push(`${nameOf(F)}^{(${k})}(${v}) = ${T(cur, F.vars)}, \\quad ${nameOf(F)}^{(${k})}(${T(at)}) = ${T(val)}`);
      coeffs.push(val);
      cur = cas.diff(cur, v);
    }
    steps.push({ text: `Compute the derivatives up to order ${n} and evaluate them at $${v} = ${T(at)}$:`, tex: aligned(lines) });
    const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
    steps.push({ text: `Insert them in $P_n(${v}) = \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(${v} - a)^k$ (Section 6.4):`, tex: `P_{${n}}(${v}) = ${coeffs.map((c, k) => `\\frac{${T(c)}}{${fact(k)}}${k ? `(${v} - ${T(at)})^{${k}}` : ""}`).join(" + ")} = ${cas.taylorTex(F.x, v, at, n)}` });
    return `Taylor polynomial of $${nameOf(F)}$`;
  },
  evaluate(id, ctx, a, steps) {
    const [kind, fn, pn] = id.split(":");
    const F = find(ctx, "fns", fn);
    if (!F) return null;
    const p = kind === "fp" ? find(ctx, "vecs", pn) : parsePt(a.p, F.vars.length);
    if (!p) return null;
    steps.push({ text: `Replace each variable by its value and simplify:`, tex: `${nameOf(F)}${tup(p.xs)} = ${plugIn(F.x, F.vars, p.xs)} = ${T(cas.subs(F.x, Object.fromEntries(F.vars.map((v, i) => [v, p.xs[i]]))))}` });
    return `value of $${nameOf(F)}$`;
  },
  composition(id, ctx, a, steps) {
    const [fn, gn] = id.split(":");
    const F = find(ctx, "fns", fn); const G = find(ctx, "fns", gn);
    if (!F || !G) return null;
    const v = F.vars[0];
    steps.push({ text: `$(${nameOf(F)} \\circ ${nameOf(G)})(${v}) = ${nameOf(F)}(${nameOf(G)}(${v}))$: put $${nameOf(G)}(${v}) = ${T(G.x, G.vars)}$ in place of $${v}$ in $${nameOf(F)}$:`, tex: `${nameOf(F)}(${nameOf(G)}(${v})) = ${T(F.x, F.vars).replace(new RegExp(`(?<![\\\\A-Za-z])${v}(?![A-Za-z])`, "g"), `\\left(${T(G.x, G.vars)}\\right)`)} = ${T(cas.subs(F.x, { [v]: G.x }))}` });
    return "composition";
  },
  quadform(id, ctx, a, steps) {
    const [kind, n] = id.split(":");
    if (kind === "A") {
      const m = find(ctx, "mats", n); if (!m) return null;
      const k = m.M.length; const xs = (k <= 3 ? ["x", "y", "z"] : Array.from({ length: k }, (_, i) => `x_${i + 1}`)).slice(0, k);
      const terms = [];
      m.M.forEach((r, i) => r.forEach((x, j) => terms.push(`${paren(T(x))}${xs[i]}${xs[j]}`)));
      const q = cas.mat.mul([xs.map((s) => cas.parse(s))], cas.mat.mul(m.M, xs.map((s) => [cas.parse(s)])))[0][0];
      steps.push({ text: `$x^\\top A x = \\sum_{i,j} a_{ij} x_i x_j$: multiply out every entry with its two coordinates, then collect like terms.`, tex: `x^\\top ${latexName(m.v.name)} x = ${terms.join(" + ")} = ${T(q)}` });
      return "quadratic form";
    }
    const F = find(ctx, "fns", n); if (!F) return null;
    const g = firstPartials(F, steps);
    const H = secondPartials(F, g, steps);
    steps.push({ text: `For a quadratic form $f(x) = x^\\top A x$ with $A$ symmetric, the Hessian is $2A$, so $A = \\tfrac12 \\nabla^2 f$:`, tex: `A = \\frac{1}{2}${M(H, F.vars)} = ${M(cas.mat.scale(H, cas.num(1, 2)), F.vars)}` });
    return "symmetric matrix of the quadratic form";
  },
  // ----- matrices -----
  inverse(id, ctx, a, steps) {
    if (id.startsWith("os:")) {
      const m = find(ctx, "mats", id.slice(3)); if (!m) return null;
      const A = m.M; const At = cas.mat.transpose(A);
      const right = A.length < A[0].length;
      const N = latexName(m.v.name);
      const G2 = right ? `${N}${N}^\\top` : `${N}^\\top ${N}`;
      const formula = right ? `${N}^\\top (${G2})^{-1}` : `(${G2})^{-1} ${N}^\\top`;
      steps.push({ text: `$${N}$ is ${A.length}×${A[0].length}. Only square matrices have an inverse, so there is no $${N}^{-1}$. A non-square matrix of full rank has a one-sided inverse instead: a **${right ? "right" : "left"} inverse** $X$ with $${right ? `${N}X = I` : `X${N} = I`}$, given by $X = ${formula}$.` });
      steps.push({ text: `The transpose:`, tex: `${N}^\\top = ${M(At)}` });
      const G = right ? cas.mat.mul(A, At) : cas.mat.mul(At, A);
      steps.push({ text: `The square ${G.length}×${G.length} matrix $${G2}$ (Definition 3.4):`, tex: `${G2} = ${M(G)}` });
      const d = detSteps(G, steps, `\\det(${G2})`);
      if (cas.isZero(d)) { steps.push({ text: `That determinant is $0$ (the rank is not full), so there is no one-sided inverse either.` }); return "one-sided inverse"; }
      const Gi = cas.mat.inverse(G);
      steps.push({ text: `Its inverse:`, tex: `(${G2})^{-1} = ${M(Gi)}` });
      const X = right ? cas.mat.mul(At, Gi) : cas.mat.mul(Gi, At);
      steps.push({ text: `Multiply:`, tex: `X = ${right ? `${N}^\\top (${N}${N}^\\top)^{-1}` : `(${N}^\\top ${N})^{-1} ${N}^\\top`} = ${M(X)}` });
      steps.push({ text: `Check:`, tex: `${right ? `${latexName(m.v.name)}X` : `X${latexName(m.v.name)}`} = ${M(right ? cas.mat.mul(A, X) : cas.mat.mul(X, A))}` });
      return `one-sided inverse of $${latexName(m.v.name)}$`;
    }
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    if (A.length !== A[0].length) { steps.push({ text: `This matrix is ${A.length}×${A[0].length}. Only square matrices have an inverse.` }); return "inverse"; }
    const n = A.length;
    steps.push({ text: `First check that the inverse exists: the determinant must not be $0$.` });
    const d = detSteps(A, steps);
    if (cas.isZero(d)) { steps.push({ text: `The determinant is $0$, so there is no inverse.` }); return "inverse"; }
    if (cas.mat.isConst(A)) {
      steps.push({ text: `Row reduce $(A \\mid I)$; when the left side becomes $I$ the right side is $A^{-1}$ (Gauss-Jordan elimination, Section 2.3).` });
      const R = gaussJordan(A.map((r, i) => [...r, ...cas.mat.identity(n)[i]]), steps, { split: n, label: " with $(A \\mid I)$" });
      steps.push({ text: `The right half is the inverse:`, tex: `A^{-1} = ${M(R.map((r) => r.slice(n)))}` });
    } else {
      steps.push({ text: `With symbols in the matrix use $A^{-1} = \\frac{1}{\\det A}\\operatorname{adj}(A)$:`, tex: `A^{-1} = \\frac{1}{${T(d)}}${M(cas.mat.adjugate(A))} = ${M(cas.mat.inverse(A))}` });
    }
    const I = cas.mat.mul(A, cas.mat.inverse(A));
    steps.push({ text: `Check: $AA^{-1} = I$.`, tex: `A A^{-1} = ${M(I)}` });
    return "inverse";
  },
  determinant(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    detSteps(A, steps);
    return "determinant";
  },
  definiteness(id, ctx, a, steps) {
    const own = id === "own";
    const A = own ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A || A.length !== A[0].length || !isSym(A)) return null;
    const name = own ? "A" : latexName(id.split(":")[1]);
    steps.push({ text: `The matrix is symmetric, so its definiteness is defined (Section 3.7).`, tex: `${name} = ${M(A)}` });
    return symReductionSteps(A, steps, { name }) ? `definiteness of $${name}$ by symmetric reduction` : null;
  },
  rref(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    steps.push({ text: `Gauss-Jordan elimination (Section 2.3, Theorem 2.8): for each column make a pivot $1$ and clear the rest of the column with row operations.` });
    const R = gaussJordan(A, steps);
    steps.push({ text: `Reduced row echelon form:`, tex: M(R) });
    return "row reduction";
  },
  rank(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    const R = gaussJordan(A, steps);
    const r = R.filter((row) => row.some((x) => !cas.isZero(x))).length;
    steps.push({ text: `The rank is the number of non-zero rows in the echelon form: **${r}**.` });
    return "rank";
  },
  transpose(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    steps.push({ text: `Row $i$ of $A$ becomes column $i$ of $A^\\top$ (entry $(i,j)$ moves to $(j,i)$).`, tex: `${M(A)}^\\top = ${M(cas.mat.transpose(A))}` });
    return "transpose";
  },
  trace(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    steps.push({ text: `The trace is the sum of the diagonal entries.`, tex: `\\operatorname{tr} A = ${A.map((r, i) => paren(T(r[i]))).join(" + ")} = ${T(cas.mat.trace(A))}` });
    return "trace";
  },
  adjugate(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    const C = cas.mat.cofactor(A);
    steps.push({ text: `Cofactor matrix: entry $(i,j)$ is $(-1)^{i+j}$ times the determinant of $A$ without row $i$ and column $j$.`, tex: `C = ${M(C)}` });
    steps.push({ text: `The adjugate is the transposed cofactor matrix.`, tex: `\\operatorname{adj}(A) = C^\\top = ${M(cas.mat.transpose(C))}` });
    return "adjugate";
  },
  symmetricpart(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    steps.push({ tex: `\\tfrac12(A + A^\\top) = \\tfrac12\\left(${M(A)} + ${M(cas.mat.transpose(A))}\\right) = ${M(cas.mat.scale(cas.mat.add(A, cas.mat.transpose(A)), cas.num(1, 2)))}`, text: `Add the transpose and halve every entry.` });
    return "symmetric part";
  },
  charpoly(id, ctx, a, steps) {
    const A = id === "own" ? parseMat(a.A) : find(ctx, "mats", id.split(":")[1])?.M;
    if (!A) return null;
    const lam = cas.sym("lambda");
    const B = A.map((r, i) => r.map((x, j) => (i === j ? cas.sub(x, lam) : x)));
    steps.push({ text: `Subtract $\\lambda$ on the diagonal:`, tex: `A - \\lambda I = ${M(B)}` });
    detSteps(B, steps, "\\det(A - \\lambda I)");
    return "characteristic polynomial";
  },
  eigenvalues(id, ctx, a, steps) {
    const m = find(ctx, "mats", id.split(":")[1]);
    if (!m) return null;
    HANDLERS.charpoly(`A:${m.v.name}`, ctx, a, steps);
    const p = cas.charpoly(m.M);
    let roots = [];
    try { roots = cas.rationalRoots(p, "lambda") || []; } catch (_) { roots = []; }
    const lam = cas.sym("lambda");
    const at = (v) => cas.subs(p, { lambda: cas.num(v) });
    if (m.M.length === 2) {
      // p = lambda^2 + b lambda + c: read b and c off p(0) and p(1).
      const c = at(0);
      const b = cas.sub(cas.sub(at(1), cas.ONE), c);
      const disc = cas.sub(cas.mul(b, b), cas.mul(cas.num(4), c));
      const sq = cas.pow(disc, cas.Q(1, 2));
      const half = (s) => cas.div(cas.add(cas.neg(b), s), cas.num(2));
      steps.push({ text: `The eigenvalues are the roots of the characteristic polynomial. It has the form $\\lambda^2 + b\\lambda + c$ with $b = ${T(b)}$ and $c = ${T(c)}$; use the quadratic formula:`, tex: aligned([
        `${T(p)} = 0`,
        `\\lambda = \\frac{-b \\pm \\sqrt{b^2 - 4c}}{2} = \\frac{${T(cas.neg(b))} \\pm \\sqrt{${paren(T(b))}^2 - 4 \\cdot ${paren(T(c))}}}{2} = \\frac{${T(cas.neg(b))} \\pm \\sqrt{${T(disc)}}}{2}`,
      ]) });
      const dc = cas.constValue(disc);
      if (dc && dc.n < 0) steps.push({ text: `The discriminant $${T(disc)}$ is negative, so there are no real eigenvalues.` });
      else steps.push({ text: `So the eigenvalues are`, tex: `\\lambda_1 = ${T(half(sq))}, \\quad \\lambda_2 = ${T(half(cas.neg(sq)))}` });
      return "eigenvalues";
    }
    steps.push({ text: `The eigenvalues are the roots of the characteristic polynomial: solve $\\det(A - \\lambda I) = 0$${roots.length ? " (each root α gives a factor λ − α, Proposition 2.23)" : ""}.`, tex: `${T(p)} = 0${roots.length ? ` \\iff \\lambda \\in \\{${roots.map((r) => T(r)).join(", ")}\\}` : ""}` });
    if (roots.length < m.M.length) {
      const rs = numericRoots(p, "lambda");
      steps.push({ text: `Not all roots are rational, so solve numerically (the roots of a cubic or higher have no simple exact form here):`, tex: rs.map((z, i) => `\\lambda_{${i + 1}} \\approx ${fmtC(z)}`).join(",\\quad ") });
    }
    void lam;
    return "eigenvalues";
  },
  product(id, ctx, a, steps) {
    let A, B, an = "A", bn = "B";
    if (id.startsWith("dot:")) {
      const [, x, y] = id.split(":"); const u = find(ctx, "vecs", x); const w = find(ctx, "vecs", y);
      if (!u || !w) return null;
      steps.push({ text: `Multiply coordinate by coordinate and add (Definition 5.1):`, tex: `${latexName(x)} \\cdot ${latexName(y)} = ${u.xs.map((s, i) => `${paren(T(s))} \\cdot ${paren(T(w.xs[i]))}`).join(" + ")} = ${T(cas.add(...u.xs.map((s, i) => cas.mul(s, w.xs[i]))))}` });
      return "dot product";
    }
    if (id === "own") { A = parseMat(a.A); B = parseMat(a.B); }
    else {
      [an, bn] = id.split("*");
      A = (find(ctx, "mats", an) || find(ctx, "vecs", an))?.M; B = (find(ctx, "mats", bn) || find(ctx, "vecs", bn))?.M;
    }
    if (!A || !B) return null;
    const lines = [];
    const C = A.map((r, i) => B[0].map((_, j) => {
      const val = cas.add(...r.map((x, k) => cas.mul(x, B[k][j])));
      lines.push(`c_{${i + 1}${j + 1}} = ${r.map((x, k) => `${paren(T(x))} \\cdot ${paren(T(B[k][j]))}`).join(" + ")} = ${T(val)}`);
      return val;
    }));
    steps.push({ text: `Entry $(i,j)$ of the product is row $i$ of $${latexName(an)}$ times column $j$ of $${latexName(bn)}$ (Definition 3.4):`, tex: aligned(lines) });
    steps.push({ text: `So`, tex: `${latexName(an)}${latexName(bn)} = ${M(C)}` });
    return "matrix product";
  },
  matsum(id, ctx, a, steps) {
    if (id.startsWith("k:")) {
      const m = find(ctx, "mats", id.slice(2)); if (!m) return null;
      const k = cas.parse(a.k || "2");
      steps.push({ text: `Multiply every entry by $${T(k)}$:`, tex: `${T(k)}${M(m.M)} = ${M(cas.mat.scale(m.M, k))}` });
      return "scalar multiple";
    }
    const [x, y] = id.split("+"); const A = find(ctx, "mats", x); const B = find(ctx, "mats", y);
    if (!A || !B) return null;
    steps.push({ text: `Add entry by entry:`, tex: `${M(A.M)} + ${M(B.M)} = ${Mraw(A.M.map((r, i) => r.map((v, j) => `${paren(T(v))} + ${paren(T(B.M[i][j]))}`)))} = ${M(cas.mat.add(A.M, B.M))}` });
    return "matrix sum";
  },
  matpower(id, ctx, a, steps) {
    const m = find(ctx, "mats", id.split(":")[1]); if (!m) return null;
    const k = Math.max(0, Math.min(12, Number(a.k) || 2));
    let P = m.M;
    steps.push({ text: `Multiply the matrix by itself, one factor at a time:`, tex: `${latexName(m.v.name)}^{1} = ${M(P)}` });
    for (let i = 2; i <= k; i++) { P = cas.mat.mul(P, m.M); steps.push({ tex: `${latexName(m.v.name)}^{${i}} = ${latexName(m.v.name)}^{${i - 1}}${latexName(m.v.name)} = ${M(P)}` }); }
    return "matrix power";
  },
  augmented(id, ctx, a, steps) {
    if (!id.startsWith("r:")) return null;
    const [x, y] = id.slice(2).split("|"); const A = find(ctx, "mats", x); const b = find(ctx, "vecs", y);
    if (!A || !b) return null;
    steps.push({ text: `Write the system as the augmented matrix $(A \\mid b)$ and row reduce it (Section 2.3, Theorem 2.8).` });
    const R = gaussJordan(A.M.map((r, i) => [...r, ...b.M[i]]), steps, { split: A.M[0].length });
    steps.push({ text: `Read the solution off the reduced form (a pivot in every column of $A$ gives one solution; a zero row with a non-zero right side means no solution).`, tex: augmented(R, A.M[0].length) });
    return "solving the system";
  },
  dotproduct(id, ctx, a, steps) {
    const [kind, x, y] = id.split(":");
    const u = find(ctx, "vecs", x); const w = y ? find(ctx, "vecs", y) : null;
    if (!u) return null;
    const dot = (p, q) => cas.add(...p.xs.map((s, i) => cas.mul(s, q.xs[i])));
    const dotLine = (p, q, pn, qn) => `${pn} \\cdot ${qn} = ${p.xs.map((s, i) => `${paren(T(s))} \\cdot ${paren(T(q.xs[i]))}`).join(" + ")} = ${T(dot(p, q))}`;
    if (kind === "n") {
      steps.push({ text: `The norm is the square root of the vector dotted with itself (Definition 5.1):`, tex: `|${latexName(x)}| = \\sqrt{${u.xs.map((s) => `${paren(T(s))}^2`).join(" + ")}} = \\sqrt{${T(dot(u, u))}} = ${T(cas.pow(dot(u, u), cas.Q(1, 2)))}` });
      return "norm";
    }
    if (!w) return null;
    if (kind === "d") steps.push({ text: `Multiply coordinate by coordinate and add (Definition 5.1):`, tex: dotLine(u, w, latexName(x), latexName(y)) });
    if (kind === "c") {
      steps.push({ text: `$\\cos\\theta = \\frac{u\\cdot v}{|u|\\,|v|}$ (Definition 5.1). The pieces:`, tex: aligned([dotLine(u, w, latexName(x), latexName(y)), `|${latexName(x)}|^2 = ${T(dot(u, u))}`, `|${latexName(y)}|^2 = ${T(dot(w, w))}`]) });
      steps.push({ text: `So`, tex: `\\cos\\theta = \\frac{${T(dot(u, w))}}{\\sqrt{${T(dot(u, u))}}\\sqrt{${T(dot(w, w))}}} = ${T(cas.mul(dot(u, w), cas.pow(cas.mul(dot(u, u), dot(w, w)), cas.Q(-1, 2))))}` });
    }
    if (kind === "p") {
      const c = cas.div(dot(u, w), dot(w, w));
      steps.push({ text: `Projection of $u$ onto $v$: $\\frac{u\\cdot v}{v\\cdot v} v$.`, tex: aligned([dotLine(u, w, latexName(x), latexName(y)), dotLine(w, w, latexName(y), latexName(y)), `\\operatorname{proj} = \\frac{${T(dot(u, w))}}{${T(dot(w, w))}}${col(w.xs)} = ${col(w.xs.map((s) => cas.mul(c, s)))}`]) });
    }
    if (kind === "x") {
      const [a1, a2, a3] = u.xs; const [b1, b2, b3] = w.xs;
      const e = (p, q, r2, s) => `${paren(T(p))} \\cdot ${paren(T(q))} - ${paren(T(r2))} \\cdot ${paren(T(s))}`;
      steps.push({ text: `Cross product, coordinate by coordinate:`, tex: `${latexName(x)} \\times ${latexName(y)} = ${Mraw([[e(a2, b3, a3, b2)], [e(a3, b1, a1, b3)], [e(a1, b2, a2, b1)]])} = ${col([cas.sub(cas.mul(a2, b3), cas.mul(a3, b2)), cas.sub(cas.mul(a3, b1), cas.mul(a1, b3)), cas.sub(cas.mul(a1, b2), cas.mul(a2, b1))])}` });
    }
    return "vectors";
  },
  line(id, ctx, a, steps) {
    const [x, y] = id.split(":"); const u = find(ctx, "vecs", x); const w = find(ctx, "vecs", y);
    if (!u || !w) return null;
    const t = cas.sym("t");
    steps.push({ text: `The line through $u$ and $v$ is $u + t(v - u)$ (Definition 4.12). The direction:`, tex: `v - u = ${col(w.xs)} - ${col(u.xs)} = ${col(w.xs.map((s, i) => cas.sub(s, u.xs[i])))}` });
    steps.push({ text: `So`, tex: `${col(u.xs)} + t${col(w.xs.map((s, i) => cas.sub(s, u.xs[i])))} = ${col(u.xs.map((s, i) => cas.add(s, cas.mul(t, cas.sub(w.xs[i], s)))))}` });
    return "line";
  },
};
HANDLERS.matrix = null;

// ----- elimination and induction (Sections 2.3, 4.5, 1.6.5) -----
HANDLERS.gauss = (id, ctx, a, steps) => {
  let rows, vars;
  if (id === "own") ({ rows, vars } = parseSystem(String(a.e || "").split(";").map((s) => s.trim()).filter(Boolean)));
  else { const s = gaussSources(ctx).find((x) => `gs:${x.id}` === id); if (!s) return null; ({ rows, vars } = s); }
  const g = gauss(rows, vars);
  steps.push({ text: `Gauss elimination (Section 2.3): multiply an equation by a number and subtract it from another one. By Theorem 2.8 this gives the same result as isolating a variable and inserting it, so the solutions never change. Number the equations:`, tex: systemTex(g.steps[0].rows, vars) });
  for (const st of g.steps.slice(1)) {
    steps.push({ text: `Eliminate $${vars[st.col]}$ below equation (${g.pivots.find((p) => p.col === st.col).row + 1}): ${st.ops.join("; ")}.`, tex: `\\iff ${systemTex(st.rows, vars)}` });
  }
  if (g.kind === "none") {
    steps.push({ text: `Equation (${g.bad + 1}) has become $0 = ${cas.tex(g.rows[g.bad][vars.length])}$, which is false. So the system has **no solution**.` });
    return "Gauss elimination";
  }
  steps.push({ text: `The system is now in echelon form: each equation has fewer unknowns than the one above. Solve from the bottom up (back substitution), inserting the values already found.` });
  for (const b of g.back) {
    const lines = [b.eq];
    if (b.plugged) lines.push(`${b.plugged} \\quad (${b.known.join(",\\ ")})`);
    lines.push(`${b.var} = ${cas.tex(b.value)}`);
    steps.push({ tex: `\\begin{aligned} ${lines.map((l, i) => (i ? `\\Rightarrow\\ & ${l}` : `& ${l}`)).join(" \\\\ ")} \\end{aligned}` });
  }
  if (g.kind === "infinite") steps.push({ text: `${g.free.map((f) => `$${f}$`).join(", ")} ${g.free.length === 1 ? "has" : "have"} no pivot, so ${g.free.length === 1 ? "it is a free parameter" : "they are free parameters"}: there are **infinitely many solutions**, one for each value of ${g.free.map((f) => `$${cas.tex(g.params[f])}$`).join(", ")}.`, tex: vars.map((v, i) => `${v} = ${cas.tex(g.values[i])}`).join(",\\quad ") });
  else {
    steps.push({ text: `The **only** solution (every step was an equivalence $\\iff$):`, tex: `(${vars.join(", ")}) = (${g.values.map((x) => cas.tex(x)).join(", ")})` });
    const check = rows.map((r) => `${cas.tex(cas.add(...vars.map((_, j) => cas.mul(r[j], g.values[j]))))} = ${cas.tex(r[vars.length])}`);
    steps.push({ text: `Check: insert the solution in the original equations.`, tex: `\\begin{aligned} ${check.map((c, i) => `(${i + 1}):\\ & ${c}`).join(" \\\\ ")} \\end{aligned}` });
  }
  return "Gauss elimination";
};

HANDLERS.fouriermotzkin = (id, ctx, a, steps) => {
  let ineqs, vars, elim;
  if (id === "own") {
    ineqs = parseIneqs(String(a.e || "").split(";").map((s) => s.trim()).filter(Boolean));
    vars = cas.orderVars(new Set(ineqs.flatMap((q) => [...cas.symbols(q.e)])));
    elim = String(a.x || vars[0]).split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const sys = fmSystem(ctx); if (!sys) return null;
    ({ ineqs, vars } = sys);
    elim = id.startsWith("fmall:") ? vars.slice(0, -1) : [id.split(":")[1]];
  }
  const list = (qs, vs) => `\\begin{cases} ${qs.map((q) => ineqTex(q, vs)).join(" \\\\ ")} \\end{cases}`;
  steps.push({ text: `Fourier-Motzkin elimination (Section 4.5). The system (an equation $a = b$ counts as the two inequalities $a \\le b$ and $a \\ge b$):`, tex: list(ineqs, vars) });
  let cur = ineqs;
  let left = [...vars];
  for (const x of elim) {
    const st = fmStep(cur, left, x);
    const others = left.filter((v) => v !== x);
    const L = st.lower.map((q) => `${cas.tex(q.b, others)} ${q.strict ? "<" : "\\le"} ${x}`);
    const U = st.upper.map((q) => `${x} ${q.strict ? "<" : "\\le"} ${cas.tex(q.b, others)}`);
    steps.push({ text: `**Eliminate $${x}$.** Isolate $${x}$ in every inequality that contains it, as in (4.11): lower bounds on the left, upper bounds on the right.${st.rest.length ? ` The ${st.rest.length} inequalit${st.rest.length === 1 ? "y" : "ies"} without $${x}$ ${st.rest.length === 1 ? "is" : "are"} kept as ${st.rest.length === 1 ? "it is" : "they are"}.` : ""}`, tex: `\\begin{aligned} ${[...L, ...U].map((l) => `& ${l}`).join(" \\\\ ")} \\end{aligned}` });
    if (!st.lower.length || !st.upper.length) {
      steps.push({ text: `$${x}$ only has ${st.lower.length ? "lower" : "upper"} bounds, so a value of $${x}$ can always be found: the inequalities with $${x}$ simply drop out.` });
    } else {
      const lo = st.lower.map((q) => cas.tex(q.b, others)); const hi = st.upper.map((q) => cas.tex(q.b, others));
      steps.push({ text: `So there is such an $${x}$ exactly when the largest lower bound is at most the smallest upper bound, as in (4.12)-(4.13):`, tex: `\\max(${lo.join(", ")}) \\le ${x} \\le \\min(${hi.join(", ")}) \\iff \\max(${lo.join(", ")}) \\le \\min(${hi.join(", ")})` });
      steps.push({ text: `Expand into one inequality per (lower, upper) pair, ${st.lower.length}·${st.upper.length} = ${st.pairs.length} in all, using $\\max(a,b) \\le c \\iff a \\le c \\wedge b \\le c$:`, tex: `\\begin{aligned} ${st.pairs.map((q) => `& ${cas.tex(q.L.b, others)} ${q.strict ? "<" : "\\le"} ${cas.tex(q.U.b, others)}`).join(" \\\\ ")} \\end{aligned}` });
    }
    if (st.contradictions.length) { steps.push({ text: `One of them says a false thing about numbers, so the system has **no solution**.` }); return "Fourier-Motzkin elimination"; }
    cur = st.next;
    left = others;
    steps.push({ text: cur.length ? `Simplified (true number inequalities like $0 \\le 4$ dropped, duplicates removed), the system without $${x}$ is:` : `Nothing is left: every value of the remaining variables works.`, tex: cur.length ? list(cur, left) : undefined });
  }
  if (left.length === 1 && cur.length) {
    const v = left[0];
    const st = fmStep(cur, left, v);
    const lo = st.lower.map((q) => q.b); const hi = st.upper.map((q) => q.b);
    const num = (x) => { const c = cas.constValue(x); return c ? c.n / c.d : null; };
    const maxL = lo.length ? lo.reduce((m, x) => (num(x) > num(m) ? x : m)) : null;
    const minU = hi.length ? hi.reduce((m, x) => (num(x) < num(m) ? x : m)) : null;
    steps.push({ text: `Only $${v}$ is left. Isolating it gives the possible values:`, tex: `${maxL ? `${cas.tex(maxL)} \\le ` : ""}${v}${minU ? ` \\le ${cas.tex(minU)}` : ""}` });
  }
  return "Fourier-Motzkin elimination";
};

HANDLERS.convexity = (id, ctx, a, steps) => {
  const F = id === "own" ? parseF(a) : find(ctx, "fns", id.slice(2));
  if (!F) return null;
  convexityProof(F, steps);
  return `is $${latexName(F.v.name)}$ convex?`;
};

HANDLERS.induction = (id, ctx, a, steps) => {
  let stmt, p, n0;
  if (id === "own") {
    const r = findRelation(String(a.s || "")); if (!r) return null;
    stmt = r; p = a.p || "n"; n0 = Number(a.n0 || 1);
  } else {
    const v = ctx.vars.get(id.slice(4)); if (!v) return null;
    stmt = v; p = v.params[0];
    const s = ctx.vars.get("n0") || ctx.vars.get("n_0");
    n0 = s && s.kind === "scalar" ? Number(s.value) : 1;
  }
  for (const s of inductionSteps(stmt, p, n0)) steps.push(s);
  return "proof by induction";
};

// Markdown for the worked solution, or "" when there is nothing to show.
export function workFor(objName, optionId, ctx, answers = {}) {
  const h = HANDLERS[objName];
  if (!h) return "";
  const steps = [];
  let title = null;
  // "... at a point you type" (ap:NAME): the typed point (and direction)
  // become note-like points p and v, then the usual worked solution runs.
  if (/^ap:/.test(optionId)) {
    const fn = optionId.slice(3);
    const F = ctx.fns.find((f) => f.v.name === fn);
    const p = F && parsePt(answers?.p, F.vars.length);
    if (!p) return "";
    const extra = [p];
    if (objName === "directional") {
      const d = parsePt(answers?.d, F.vars.length);
      if (!d) return "";
      d.v = { name: "v" };
      extra.push(d);
    }
    ctx = { ...ctx, vecs: [...extra, ...ctx.vecs] };
    optionId = objName === "directional" ? `${fn}:p:v` : `fp:${fn}:p`;
  }
  curCtx = ctx;
  try { title = h(optionId, ctx, answers || {}, steps); } catch (_) { return ""; }
  if (!title || !steps.length) return "";
  const out = [`**Worked solution: ${title}**`, ""];
  let n = 0;
  for (const s of steps) {
    if (s.text) { n++; out.push(`**${n}.** ${s.text}`); }
    if (s.tex) out.push(`$$${s.tex}$$`);
    out.push("");
  }
  return out.join("\n").trimEnd() + "\n";
}

export const WORK_OBJECTS = Object.keys(HANDLERS).filter((k) => HANDLERS[k]);
