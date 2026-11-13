// Connects the note's variables to the blanks of text templates (\induction,
// \hessian, \epsdelta, ...): a blank is filled from a variable with the same
// name, or computed from one: {{Hessian}} from f, {{f_x}}, {{f'}}, {{x, y}},
// {{statement}} and {{P(k+1)}} from P(n) = ..., {{check the base case}} from
// P(n) and n0. Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { fnExpr, toLatex, displayName } from "./vars.js";

const texM = (M, vars) => `\\begin{pmatrix} ${M.map((r) => r.map((x) => cas.tex(x, vars)).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;

// The note's functions: scalar vars with at least one variable in them.
export function noteFunctions(vars) {
  return [...vars.values()].filter((v) => {
    if (v.kind !== "scalar" || v.error) return false;
    try { return fnExpr(v, vars).vars.length > 0; } catch (_) { return false; }
  });
}

// The note's points: constant vectors and tuples, (1, 2) or [1, 2].
export function notePoints(vars) {
  return [...vars.values()].filter((v) => v.kind === "vector" && !v.error && Array.isArray(v.value)
    && v.value.every((x) => { const e = cas.tryParse(String(x)); return e && cas.symbols(e).size === 0; }));
}

// The function to compute from: the one picked in the form (ctx.fn), else f,
// else the first function in the note.
export function mainFn(vars, ctx = {}) {
  const fns = noteFunctions(vars);
  const pick = fns.find((v) => v.name === ctx.fn) || fns.find((v) => v.name === "f") || fns[0];
  if (!pick) return null;
  try { return { v: pick, ...fnExpr(pick, vars) }; } catch (_) { return null; }
}

export function fnByName(vars, name) {
  const v = vars.get(name);
  if (!v || v.kind !== "scalar" || v.error) return null;
  try { return { v, ...fnExpr(v, vars) }; } catch (_) { return null; }
}

// The statement for induction: P(n) = ..., or the first relation with a parameter.
export function statementVar(vars) {
  for (const name of ["P", "statement", "claim", "S"]) {
    const v = vars.get(name);
    if (v && (v.kind === "relation" || v.params)) return v;
  }
  return [...vars.values()].find((v) => v.kind === "relation" && v.params) || null;
}

// The point: the one picked in the form (ctx.point), else the first tuple, else any constant vector.
export function pointVar(vars, ctx = {}, size = 0) {
  const pts = notePoints(vars).filter((v) => !size || v.value.length === size);
  return pts.find((v) => v.name === ctx.point) || pts.find((v) => v.tuple && !v.source) || pts.find((v) => v.tuple) || pts[0] || null;
}
export const pointExprs = (P) => P.value.map((x) => cas.parse(String(x)));

// Symmetric reduction of a constant symmetric matrix: the diagonal D of
// B^T A B = D, by the same row-and-column operations as in the book: clear
// below each pivot; a 0 pivot is fixed by swapping in a later non-zero
// diagonal entry or by adding a later row and column. null when not constant.
export function diagonalOf(M) {
  const r = symmetricReduction(M);
  return r ? r.D : null;
}

// The book's schematic procedure (Section 8.6, Theorem 8.31) on the extended
// matrix (I over A): every column operation hits the whole extended matrix,
// the matching row operation only the lower half. The upper half ends as B,
// the lower half as D, and B^T A B = D. Returns { D, B, A: final lower half,
// ops: [{ kind: "swap" | "add", i, j, c, B, A }] } (B, A after the op pair),
// or null when the matrix is not a constant square matrix.
export function symmetricReduction(M) {
  if (!M.length || M.some((r) => r.length !== M.length)) return null;
  if (!M.every((r) => r.every((x) => cas.isZero(x) || cas.constValue(x)))) return null;
  const A = M.map((r) => [...r]);
  const n = A.length;
  const B = A.map((_, i) => A.map((_, j) => (i === j ? cas.ONE : cas.ZERO)));
  const ops = [];
  const snap = (op) => ops.push({ ...op, B: B.map((r) => [...r]), A: A.map((r) => [...r]) });
  const swap = (i, j) => {
    for (const r of [...B, ...A]) [r[i], r[j]] = [r[j], r[i]]; // columns, whole matrix
    [A[i], A[j]] = [A[j], A[i]]; // rows, lower half
    snap({ kind: "swap", i, j });
  };
  const add = (i, j, c) => { // c times column i to column j (whole), c times row i to row j (lower half)
    for (const r of [...B, ...A]) r[j] = cas.add(r[j], cas.mul(c, r[i]));
    A[j] = A[j].map((x, k) => cas.add(x, cas.mul(c, A[i][k])));
    snap({ kind: "add", i, j, c });
  };
  for (let k = 0; k < n; k++) {
    if (cas.isZero(A[k][k])) {
      const d = A.findIndex((r, j) => j > k && !cas.isZero(r[j]));
      if (d > k) swap(k, d);
    }
    if (cas.isZero(A[k][k])) {
      // The diagonal from k on is all 0: adding a column/row with a non-zero
      // entry in row k makes a_kk = 2 a_kj, not 0.
      const j = A[k].findIndex((x, j) => j > k && !cas.isZero(x));
      if (j < 0) continue; // row k is already 0
      add(j, k, cas.ONE);
    }
    for (let j = k + 1; j < n; j++) {
      if (cas.isZero(A[k][j])) continue;
      add(k, j, cas.neg(cas.div(A[k][j], A[k][k])));
    }
  }
  return { D: A.map((r, i) => r[i]), B, A, ops };
}

const sign = (x) => { const c = cas.constValue(x); return c ? Math.sign(c.n) : cas.isZero(x) ? 0 : null; };
// Definiteness of A from the diagonal D of B^T A B = D (B invertible, so
// Propositions 3.43 and 8.11 carry every case over, zeros included).
export function definiteness(D) {
  const s = D.map(sign);
  if (s.some((x) => x === null)) return null;
  if (s.every((x) => x > 0)) return "positive definite";
  if (s.every((x) => x < 0)) return "negative definite";
  if (s.some((x) => x > 0) && s.some((x) => x < 0)) return "indefinite";
  if (s.every((x) => x === 0)) return "positive semidefinite and negative semidefinite";
  if (s.every((x) => x >= 0)) return "positive semidefinite";
  return "negative semidefinite";
}
const NO_TEST = "no conclusion from the Hessian test (semidefinite)";
export const CONCLUSION = {
  "positive definite": "local minimum", "negative definite": "local maximum", indefinite: "saddle point",
  "positive semidefinite": NO_TEST, "negative semidefinite": NO_TEST, "positive semidefinite and negative semidefinite": NO_TEST,
};
// Why D gives that answer, in words.
export function definitenessWhy(d) {
  return {
    "positive definite": "all diagonal entries of $D$ are positive",
    "negative definite": "all diagonal entries of $D$ are negative",
    indefinite: "$D$ has both a positive and a negative diagonal entry",
    "positive semidefinite": "all diagonal entries of $D$ are $\\ge 0$ and at least one is $0$",
    "negative semidefinite": "all diagonal entries of $D$ are $\\le 0$ and at least one is $0$",
    "positive semidefinite and negative semidefinite": "$D$ is the zero matrix",
  }[d];
}
export const n0Var = (vars) => ["n0", "n_0", "n_{0}"].map((n) => vars.get(n)).find(Boolean);

// Replace the variable `p` in LaTeX by `arg` (as text), bracketed when needed.
export function substituteTex(tex, p, arg) {
  const a = /^[\w\\{}]+$/.test(arg) ? arg : `(${arg})`;
  // Alone in a {group} (\frac{n}{2}, ^{n}) it needs no brackets.
  return tex
    .replace(new RegExp(`\\{\\s*${p}\\s*\\}`, "g"), `{${arg}}`)
    // 3x with x = 1 is 3 \cdot 1, not 31.
    .replace(new RegExp(`(?<![\\\\A-Za-z])${p}(?![A-Za-z])`, "g"), (_, off, s) => {
      const before = s.slice(0, off);
      // In an exponent or index: 2^{k+1}, not 2^(k+1).
      if (/[\^_]\s*$/.test(before)) return `{${arg}}`;
      return /[\d}]\s*$/.test(before) && /^[\d.]/.test(a) ? `\\cdot ${a}` : a;
    });
}

// P(k+1) with a statement whose sum index is also k: rename the index first.
export function freeIndex(tex, avoid) {
  const m = tex.match(/\\(?:sum|prod)_\{\s*([a-z])\s*=/);
  if (!m || m[1] !== avoid) return tex;
  const fresh = ["i", "j", "l", "m"].find((c) => !new RegExp(`(?<![\\\\A-Za-z])${c}(?![A-Za-z])`).test(tex));
  return fresh ? substituteTex(tex, m[1], fresh) : tex;
}

// Numeric value of one side, with \sum_{i=a}^{b} / \prod over the rest of it.
export function evalSide(tex) {
  const m = tex.trim().match(/^\\(sum|prod)_\{\s*([a-z])\s*=\s*([^{}]+)\}\^\{?([^{}\s]+|[^{}]+)\}?\s*([\s\S]+)$/);
  if (m) {
    const a = cas.constValue(cas.parse(m[3]));
    const b = cas.constValue(cas.parse(m[4]));
    if (!a || !b || a.d !== 1 || b.d !== 1 || b.n - a.n > 1000) return null;
    const body = cas.parse(m[5]);
    let acc = m[1] === "sum" ? cas.ZERO : cas.ONE;
    for (let i = a.n; i <= b.n; i++) {
      const t = cas.subs(body, { [m[2]]: cas.num(i) });
      acc = m[1] === "sum" ? cas.add(acc, t) : cas.mul(acc, t);
    }
    return acc;
  }
  const x = cas.tryParse(tex);
  return x && cas.symbols(x).size === 0 ? x : null;
}

// LaTeX (or a sentence with $...$ when prose) for a template blank, or null.
// Returns { value, from, prose }.
export function resolveLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const exact = vars.get(l);
  if (exact && !exact.error) return { value: toLatex(exact), from: `@${exact.name}` };
  const at = atPoint(l, vars, ctx);
  if (at !== undefined) return at;
  const f = () => mainFn(vars, ctx);
  try {
    if (/^(hessian|hesse|H|nabla\^?2 ?f|\\nabla\^2 ?f)$/i.test(l)) {
      const F = f(); if (!F) return null;
      return { value: texM(cas.hessian(F.x, F.vars), F.vars), from: `Hessian of ${F.v.name}` };
    }
    if (/^(gradient|grad|nabla ?f|\\nabla ?f)$/i.test(l)) {
      const F = f(); if (!F) return null;
      return { value: texM(cas.gradient(F.x, F.vars).map((e) => [e]), F.vars), from: `gradient of ${F.v.name}` };
    }
    if (/^(x, ?y(, ?z)?|variables)$/i.test(l)) {
      const F = f(); if (!F) return null;
      return { value: F.vars.join(", "), from: `variables of ${F.v.name}` };
    }
    // f_x, f_xy, f_{xx}: partial derivatives.
    let m = l.match(/^([A-Za-z])_\{?([a-z]{1,3})\}?$/);
    if (m) {
      const F = fnByName(vars, m[1]); if (!F) return null;
      if (![...m[2]].every((c) => F.vars.includes(c))) return null;
      let d = F.x;
      for (const c of m[2]) d = cas.diff(d, c);
      return { value: cas.tex(d, F.vars), from: `computed from ${m[1]}` };
    }
    // f', f'': derivatives of a one-variable function.
    m = l.match(/^([A-Za-z])('+)$/);
    if (m) {
      const F = fnByName(vars, m[1]); if (!F || F.vars.length !== 1) return null;
      return { value: cas.tex(cas.diff(F.x, F.vars[0], m[2].length)), from: `computed from ${m[1]}` };
    }
    // P(n), P(k+1), P(n0), f(x), f(x0), f(1, 2).
    m = l.match(/^([A-Za-z])\((.+)\)$/);
    if (m) {
      const v = vars.get(m[1]) || (m[1] === "P" ? statementVar(vars) : null);
      if (!v || !(v.kind === "scalar" || v.kind === "relation")) return null;
      const params = v.params || (v.kind === "scalar" ? fnExpr(v, vars).vars : []);
      const args = m[2].split(",").map((s) => s.trim());
      if (args.join(",") === params.join(",")) return { value: v.value, from: `@${v.name}` };
      if (args.length !== params.length) return null;
      // Named arguments (n0, x0) are replaced by their values.
      const argTex = args.map((a) => { const av = vars.get(a.replace(/[{}]/g, "")); return av && av.kind === "scalar" ? av.value : a; });
      let tex = v.value;
      params.forEach((p, i) => { tex = substituteTex(freeIndex(tex, argTex[i].match(/[a-z]/)?.[0]), p, argTex[i]); });
      if (v.kind === "scalar") {
        const x = cas.tryParse(tex);
        if (x) tex = cas.tex(x);
      }
      return { value: tex, from: `${displayName(v)} with ${params.map((p, i) => `${p} = ${argTex[i]}`).join(", ")}` };
    }
    if (/^(statement|claim|proposition)$/i.test(l)) {
      const v = statementVar(vars); if (!v) return null;
      return { value: v.value, from: `@${v.name}` };
    }
    if (/^n_?\{?0\}?$/.test(l)) {
      const v = n0Var(vars); if (!v) return null;
      return { value: v.value, from: `@${v.name}` };
    }
    if (/^check the base cases?$/i.test(l)) return baseCase(vars);
    if (/^(LHS|RHS)$/.test(l)) {
      const v = statementVar(vars) || [...vars.values()].find((x) => x.kind === "relation");
      if (!v) return null;
      return { value: l === "LHS" ? v.lhs : v.rhs, from: `@${v.name}` };
    }
    if (/^(hessian entries|partials matrix)$/i.test(l)) {
      const F = f(); if (!F) return null;
      const n = F.v.name;
      const rows = F.vars.map((a) => F.vars.map((b) => `${n}_{${a}${b}}`).join(" & ")).join(" \\\\ ");
      return { value: `\\begin{pmatrix} ${rows} \\end{pmatrix}`, from: `second partials of ${n}` };
    }
    if (/^(fn name|function name|name of f)$/i.test(l)) {
      const F = f(); if (!F) return null;
      return { value: F.v.name, from: `@${F.v.name}` };
    }
    if (/^(x0|v0|x_0|v_0|p|point)$/.test(l)) {
      const F = f();
      const v = pointVar(vars, ctx, F ? F.vars.length : 0); if (!v) return null;
      return { value: toLatex(v), from: `@${v.name}` };
    }
    if (/^(formula|f\(x\)|expression|function)$/i.test(l)) {
      const F = f(); if (!F) return null;
      return { value: F.v.value, from: `@${F.v.name}` };
    }
  } catch (_) {
    return null;
  }
  return null;
}

// Blanks about f at the point v0: the Hessian there, its symmetric reduction,
// the definiteness and the conclusion of the Hessian test (Thm 8.12).
// undefined: not such a label; null: such a label but nothing to compute from.
export const AT_LABELS = [
  ["H", /^(hessian|\\nabla\^2 ?f) (at|in) (v0|v_0|x0|p|the point)$|^hessian\((v0|v_0|x0|p)\)$/i],
  ["D", /^(diagonal|D|symmetric reduction)$/i],
  ["def", /^positive definite \/ negative definite \/ indefinite$|^definiteness$/i],
  ["end", /^local min(imum)? \/ local max(imum)? \/ saddle point$|^conclusion$/i],
];
function atPoint(l, vars, ctx) {
  const kind = AT_LABELS.find(([, re]) => re.test(l))?.[0];
  if (!kind) return undefined;
  try {
    const F = mainFn(vars, ctx); if (!F) return null;
    let H = cas.hessian(F.x, F.vars);
    let where = "";
    const constant = H.every((r) => r.every((x) => cas.constValue(x) || cas.isZero(x)));
    const P = pointVar(vars, ctx, F.vars.length);
    if (!constant) {
      if (!P) return null;
      const pt = pointExprs(P);
      const map = Object.fromEntries(F.vars.map((x, i) => [x, pt[i]]));
      H = H.map((r) => r.map((x) => cas.subs(x, map)));
      where = ` at ${P.name}`;
      const g = cas.gradient(F.x, F.vars).map((x) => cas.subs(x, map));
      if (!g.every(cas.isZero)) where += ` (careful: the gradient of ${F.v.name} is not 0 there, so ${P.name} is not a critical point)`;
    }
    const from = `Hessian of ${F.v.name}${where}`;
    if (kind === "H") return { value: texM(H, F.vars), from };
    const D = diagonalOf(H);
    if (!D) return null;
    if (kind === "D") return { value: texM(H.map((r, i) => r.map((_, j) => (i === j ? D[i] : cas.ZERO))), F.vars), from: `${from}, by symmetric reduction` };
    const d = definiteness(D);
    if (!d) return null;
    const end = /min \//.test(l) ? CONCLUSION[d].replace("minimum", "min").replace("maximum", "max") : CONCLUSION[d];
    return { value: kind === "def" ? d : end, prose: true, from: `${from}, signs of D` };
  } catch (_) {
    return null;
  }
}

// "P(1): 1 = \frac{1(1+1)}{2}, and both sides are 1": checked, not just copied.
function baseCase(vars) {
  const P = statementVar(vars);
  const n0 = n0Var(vars);
  if (!P || P.kind !== "relation" || !P.params || P.params.length !== 1) return null;
  const start = n0 ? n0.value : "1";
  const lhs = substituteTex(P.lhs, P.params[0], start);
  const rhs = substituteTex(P.rhs, P.params[0], start);
  const a = evalSide(lhs);
  const b = evalSide(rhs);
  const shown = `$P(${start})$: $${lhs} ${P.op} ${rhs}$`;
  if (!a || !b) return { value: shown, prose: true, from: `@${P.name}` };
  const ta = cas.tex(a);
  const tb = cas.tex(b);
  const holds = P.op === "=" ? cas.equal(a, b) : null;
  const verdict = holds === null ? `the left side is $${ta}$ and the right side is $${tb}$`
    : holds ? `both sides are $${ta}$` : `but the left side is $${ta}$ and the right side is $${tb}$ (they differ!)`;
  return { value: `${shown}, ${verdict}`, prose: true, from: `@${P.name} with ${P.params[0]} = ${start}, both sides computed` };
}
