// E6 of docs/imo26-coverage/CONTRADICTIONS.md: matrix witnesses, decided from
// the note's own matrix (any size), never from one fixed example.
//   - not positive definite: a vector u with u^T A u <= 0 (Exercise 3.41: e_i
//     when A_ii <= 0, else column i of B from symmetric reduction B^T A B = D,
//     so u^T A u = d_i, Section 8.7 / Theorem 8.31)
//   - indefinite: u, v with u^T A u > 0 > v^T A v (Definition 8.9)
//   - not invertible: v != 0 with Av = 0 by Gauss elimination (Section 2.3),
//     then v = (BA)v = B(Av) = 0 is the contradiction (Definition 3.24)
//   - (A+B)^2 != A^2 + 2AB + B^2: a B with AB != BA (Proposition 3.17)
//   - matrices with parameters: the inequalities on the diagonal of D
//     (Exercise 8.37)
// Also: the verdict blanks of matrix templates and which routes fit the
// matrix. Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { casOf, satisfies, assumptionsTex } from "./vars.js";
import { symmetricReduction, definiteness, resolveLabel } from "./textlink.js";
import { resolveLagrangeLabel, noteFG, lagrangeSolve } from "./lagrange.js";
import { verdictFit } from "./verdicts.js";
import { resolveCasesLabel, paramCases, commandOfBody } from "./cases.js";
const VERDICT_COMMANDS = new Set(["bounded", "openset", "closedset", "compact", "evt", "limit", "kkt", "svm"]);

const T = (x, vars) => cas.tex(x, vars);
export const texM = (A) => `\\begin{pmatrix} ${A.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const texCol = (v) => texM(v.map((x) => [x]));
const paren = (s) => (s.startsWith("-") ? `(${s})` : s);
const isSquare = (M) => M.length > 0 && M.every((r) => r.length === M.length);
export const isSym = (M) => isSquare(M) && M.every((r, i) => r.every((x, j) => cas.equal(x, M[j][i])));
const isConst = (M) => M.every((r) => r.every((x) => cas.constValue(x) !== null));
const sgn = (x) => { const c = cas.constValue(x); return c ? Math.sign(c.n) : null; };
const unit = (n, i) => Array.from({ length: n }, (_, k) => (k === i ? cas.ONE : cas.ZERO));

// The note's matrices, as exact expressions.
export function noteMatrices(vars) {
  if (!(vars instanceof Map)) return [];
  return [...vars.values()].filter((v) => v.kind === "matrix" && !v.error).flatMap((v) => {
    try { return [{ v, name: v.name, M: casOf(v).M }]; } catch (_) { return []; }
  });
}
// The matrix a template is about: the one picked (ctx.matrix), else A, else
// the first square matrix, else the first matrix.
export function noteMatrix(vars, ctx = {}) {
  const ms = noteMatrices(vars);
  return ms.find((m) => m.name === ctx.matrix) || ms.find((m) => m.name === "A") || ms.find((m) => isSquare(m.M)) || ms[0] || null;
}

// u^T A u, computed directly (not read off D), so every witness is checked.
export function quadValue(A, u) {
  const U = u.map((x) => [x]);
  return cas.mat.mul(cas.mat.mul(cas.mat.transpose(U), A), U)[0][0];
}

// Witness vectors for the definiteness of a constant symmetric matrix.
// { R, d, notPD, notND, pos, neg, zero }: each { u, value, how } or null.
export function definitenessWitness(A) {
  if (!isSym(A) || !isConst(A)) return null;
  const R = symmetricReduction(A);
  if (!R) return null;
  const d = definiteness(R.D);
  if (!d) return null;
  const n = A.length;
  // A diagonal entry with the right sign gives u = e_i (Exercise 3.41);
  // otherwise column i of B, where u^T A u = d_i because B^T A B = D.
  const pick = (test) => {
    const i = A.findIndex((r, k) => test(sgn(r[k])));
    if (i >= 0) return { u: unit(n, i), value: A[i][i], how: "unit", i };
    const k = R.D.findIndex((x) => test(sgn(x)));
    if (k < 0) return null;
    const u = R.B.map((r) => r[k]);
    return { u, value: quadValue(A, u), how: "B", i: k };
  };
  const neg = pick((s) => s < 0);
  const pos = pick((s) => s > 0);
  const zero = pick((s) => s === 0);
  return { R, d, notPD: neg || zero, notND: pos || zero, pos, neg, zero };
}

// v != 0 with Av = 0 (any m x n matrix), by Gauss elimination: one free
// unknown set to 1, the rest to 0; scaled to whole numbers. null if none.
export function zeroSolution(A) {
  const n = A[0].length;
  const R = cas.mat.rref(A);
  const lead = R.map((r) => r.findIndex((x) => !cas.isZero(x)));
  const free = [...Array(n).keys()].find((j) => !lead.includes(j));
  if (free === undefined) return null;
  let v = Array.from({ length: n }, () => cas.ZERO);
  v[free] = cas.ONE;
  R.forEach((r, i) => { if (lead[i] >= 0) v[lead[i]] = cas.neg(r[free]); });
  const dens = v.map(cas.constValue);
  if (dens.every(Boolean)) {
    const g = (a, b) => (b ? g(b, a % b) : a);
    const l = dens.reduce((acc, q) => (acc * q.d) / g(acc, q.d), 1);
    if (l !== 1) v = v.map((x) => cas.mul(x, cas.num(l)));
  }
  return v;
}
const zeroRow = (A) => A.findIndex((r) => r.every(cas.isZero));
const zeroCol = (A) => A[0].findIndex((_, j) => A.every((r) => cas.isZero(r[j])));

// A matrix B (the note's, else the first E_ij of the right size) with AB != BA.
export function nonCommuting(A, others = []) {
  if (!isSquare(A)) return null;
  const n = A.length;
  const ok = (B) => isSquare(B) && B.length === n && !cas.mat.mul(A, B).every((r, i) => r.every((x, j) => cas.equal(x, cas.mat.mul(B, A)[i][j])));
  const mine = others.find((m) => ok(m.M));
  if (mine) return { B: mine.M, name: mine.name };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const E = cas.mat.zeros(n, n);
    E[i][j] = cas.ONE;
    if (ok(E)) return { B: E, name: null };
  }
  return null; // A = aI: it gives AB = BA for every B
}

// ---------- inverse of a matrix with parameters ----------
// Gauss elimination on (A | I) with the parameters kept divides by
// expressions in them. Multiplied through by D it gives M (polynomial
// entries) with AM = MA = D I, which is checked by multiplying out
// (Definition 3.4). So A^{-1} = M / D where D != 0 (Definition 3.24), and the
// values with D = 0 are handled one by one (Gauss elimination, Section 2.3).
const params = (A) => [...new Set(A.flat().flatMap((x) => [...cas.symbols(x)]))].sort();
const qnum = (q) => q.n / q.d;
const qtex = (q) => T(cas.num(q));

export function paramInverse(A, assumptions = []) {
  if (!isSquare(A) || isConst(A)) return null;
  const n = A.length;
  const minor = (i, j) => A.filter((_, r) => r !== i).map((r) => r.filter((_, c) => c !== j));
  const D = cas.mat.det(A);
  // M_ij = (-1)^(i+j) D(A without row j, column i): the polynomial version of A^{-1}.
  const M = n === 1 ? [[cas.ONE]] : A.map((_, i) => A.map((_, j) => {
    const d = cas.mat.det(minor(j, i));
    return (i + j) % 2 ? cas.neg(d) : d;
  }));
  const DI = A.map((r, i) => r.map((_, j) => (i === j ? D : cas.ZERO)));
  const same = (X, Y) => X.every((r, i) => r.every((x, j) => cas.equal(x, Y[i][j])));
  if (!same(cas.mat.mul(A, M), DI) || !same(cas.mat.mul(M, A), DI)) return null;
  const ps = params(A);
  const p = ps.length === 1 ? ps[0] : null;
  const roots = p && !isConst([[D]]) ? cas.rationalRoots(D, p) : null;
  const uniq = roots ? roots.filter((r, i) => roots.findIndex((s) => s.n === r.n && s.d === r.d) === i) : null;
  const kept = uniq ? uniq.filter((r) => satisfies(assumptions, p, qnum(r))) : null;
  const excluded = uniq ? uniq.filter((r) => !kept.includes(r)) : [];
  // D written as c (p - r1)(p - r2)... when it splits.
  let Dtex = T(D);
  if (roots && roots.length) {
    // The leading coefficient c: D = c (p - r1)(p - r2)... checked by expanding.
    const prod = cas.mul(...roots.map((r) => cas.sub(cas.sym(p), cas.num(r))));
    const top = cas.pow(cas.sym(p), cas.num(roots.length));
    const lt = cas.termsOf(D).map((s) => cas.constValue(cas.div(s, top))).find(Boolean);
    const c = lt && cas.isZero(cas.sub(D, cas.mul(cas.num(lt), prod))) ? lt : null;
    if (c) {
      const fs = roots.map((r) => (r.n === 0 ? p : `(${T(cas.sub(cas.sym(p), cas.num(r)))})`));
      const pre = c.n === c.d ? "" : c.n === -c.d ? "-" : qtex(c);
      const body = fs.join("");
      const factored = roots.length === 1 && !pre ? T(D) : `${pre}${body}`;
      if (factored !== Dtex) Dtex = `${Dtex} = ${factored}`;
    }
  }
  const cases = (kept || []).map((r) => {
    const Ar = A.map((row) => row.map((x) => cas.subs(x, { [p]: cas.num(r) })));
    const v = zeroSolution(Ar);
    return { r, A: Ar, v };
  });
  return { D, Dtex, M, p, params: ps, roots: uniq, kept, excluded, cases, assumptions: assumptionsTex(assumptions, ps) };
}

// x / D, cancelled when x is a constant multiple of D.
function overD(x, D) {
  if (cas.isZero(x)) return cas.ZERO;
  const [t] = cas.termsOf(D);
  for (const s of cas.termsOf(x)) {
    const q = cas.constValue(cas.div(s, t));
    if (!q) continue;
    const c = cas.num(q);
    if (cas.isZero(cas.sub(x, cas.mul(c, D)))) return c;
  }
  return null;
}
const fracTex = (x, D) => {
  if (cas.constValue(D)) return T(cas.div(x, D));
  const c = overD(x, D);
  return c ? T(c) : `\\frac{${T(x)}}{${T(D)}}`;
};

function paramInverseProse(P, name, label) {
  const p = P.p;
  const neq = (r) => `$${p} \\neq ${qtex(r)}$`;
  if (label === "D nonzero when") {
    if (cas.constValue(P.D)) return `for every value of the parameters ($D = ${T(P.D)} \\neq 0$)`;
    if (!P.roots) return `$${T(P.D)} \\neq 0$${P.assumptions ? ` (with $${P.assumptions}$)` : ""}`;
    const ex = P.excluded.length ? ` ($${P.excluded.map((r) => `${p} = ${qtex(r)}`).join("$, $")}$ ${P.excluded.length > 1 ? "are" : "is"} ruled out by $${P.assumptions}$)` : "";
    if (!P.kept.length) return `for every ${P.assumptions ? `$${P.assumptions}$` : `$${p}$`}${ex}`;
    return `${P.kept.map(neq).join(" and ")}${P.assumptions ? `, with $${P.assumptions}$` : ""}${ex}`;
  }
  // D zero cases
  if (cas.constValue(P.D)) return `This never happens, so $${name}$ is invertible for every value of the parameters.`;
  if (P.roots && !P.kept.length) return `This never happens${P.assumptions ? ` for $${P.assumptions}$` : ""}, so $${name}$ is invertible for all those values.`;
  if (!P.roots) {
    return `Then $${name}M = 0$, so a column $m \\neq 0$ of $M$ gives $${name}m = 0$. If $B$ were an inverse, $m = (B${name})m = B(${name}m) = 0$, a contradiction (Definition 3.24). (Where $M = 0$ as well, do Gauss elimination for that value.)`;
  }
  return P.cases.map(({ r, A, v }) => {
    if (!v) return `For $${p} = ${qtex(r)}$: Gauss elimination on $${texM(A)}$ (Section 2.3).`;
    return `For $${p} = ${qtex(r)}$: $${name} = ${texM(A)}$ and $${name}v = 0$ for $v = ${texCol(v)} \\neq 0$ (Gauss elimination, Section 2.3). If $B$ were an inverse, $v = (B${name})v = B(${name}v) = B0 = 0$, a contradiction (Definition 3.24). So $${name}$ is **not invertible** for $${p} = ${qtex(r)}$.`;
  }).join(" ");
}

// Symmetric reduction of a matrix with parameters (Exercise 8.37). No
// interchanges: a 0 diagonal entry stops it (returns null). divisors: the
// diagonal entries with parameters that were divided by.
export function paramReduction(A) {
  if (!isSym(A)) return null;
  const M = A.map((r) => [...r]);
  const n = M.length;
  const divisors = [];
  for (let k = 0; k < n; k++) {
    const p = M[k][k];
    if (cas.isZero(p)) {
      if (M[k].every((x, j) => j <= k || cas.isZero(x))) continue;
      return null;
    }
    for (let j = k + 1; j < n; j++) {
      if (cas.isZero(M[k][j])) continue;
      if (sgn(p) === null && !divisors.some((x) => cas.equal(x, p))) divisors.push(p);
      const c = cas.neg(cas.div(M[k][j], p));
      for (const r of M) r[j] = cas.add(r[j], cas.mul(c, r[k]));
      M[j] = M[j].map((x, i) => cas.add(x, cas.mul(c, M[k][i])));
    }
  }
  return { D: M.map((r, i) => r[i]), divisors };
}

// "positive definite exactly when b - a^2 + 2a - 2 > 0", from the diagonal of D.
export function paramConditions(A) {
  const R = paramReduction(A);
  if (!R) return null;
  const say = (rel, never) => {
    const conds = R.D.filter((x) => sgn(x) === null);
    if (R.D.some((x) => sgn(x) !== null && !(rel === ">" ? sgn(x) > 0 : sgn(x) >= 0))) return never;
    if (!conds.length) return null;
    return conds.map((x) => `$${T(x)} ${rel === ">" ? ">" : "\\ge"} 0$`).join(" and ");
  };
  const pd = say(">", "never");
  const psd = say(">=", "never");
  const note = R.divisors.length
    ? ` (this divides by $${R.divisors.map((x) => T(x)).join("$, $")}$; where that is $0$ the reduction has to be redone)`
    : "";
  return { D: R.D, pd, psd, note, divisors: R.divisors };
}

// The same as math: "	ext{positive definite} \iff ..., ..." (for \definiteness).
export function paramConditionsTex(A) {
  const R = paramReduction(A);
  if (!R) return null;
  const part = (rel, word) => {
    if (R.D.some((x) => sgn(x) !== null && !(rel === ">" ? sgn(x) > 0 : sgn(x) >= 0))) return `\\text{never ${word}}`;
    const conds = R.D.filter((x) => sgn(x) === null).map((x) => `${T(x)} ${rel === ">" ? ">" : "\\ge"} 0`);
    return conds.length ? `\\text{${word}} \\iff ${conds.join(",\\ ")}` : `\\text{always ${word}}`;
  };
  return `${part(">", "positive definite")};\\quad ${part(">=", "positive semi-definite")}`;
}

// The book's operations, as one sentence each (Section 8.7, (8.11)).
function opsProse(R) {
  if (!R.ops.length) return "No operations are needed: the matrix is already diagonal.";
  const ext = (o) => {
    const n = o.A.length;
    const rows = (X) => X.map((r) => r.map((x) => T(x)).join(" & ")).join(" \\\\ ");
    return `$\\left(\\begin{array}{${"c".repeat(n)}} ${rows(o.B)} \\\\ \\hline ${rows(o.A)} \\end{array}\\right)$`;
  };
  const parts = R.ops.map((o) => {
    const i = o.i + 1, j = o.j + 1;
    if (o.kind === "swap") return `interchange columns ${i} and ${j} (whole matrix) and rows ${i} and ${j} (lower half)`;
    if (o.i > o.j) return `add column ${i} to column ${j} (whole matrix) and row ${i} to row ${j} (lower half)`;
    const c = paren(T(o.c));
    return `add $${c}$ times column ${i} to column ${j} (whole matrix) and $${c}$ times row ${i} to row ${j} (lower half)`;
  });
  const s = parts.join("; then ");
  return `${s[0].toUpperCase()}${s.slice(1)}. This gives ${ext(R.ops[R.ops.length - 1])}.`;
}

// A blank "a / b / c": the option that says `answer` (semi-definite and
// semidefinite count as the same), else null.
export function chooseOption(label, answer) {
  const norm = (s) => s.toLowerCase().replace(/semi-definite/g, "semidefinite").replace(/\s+/g, " ").trim();
  return label.split(" / ").map((s) => s.trim()).find((o) => norm(o) === norm(answer)) || null;
}
const SIGNS = {
  "positive definite": "all > 0", "negative definite": "all < 0", indefinite: "of both signs",
  "positive semidefinite": "all ≥ 0", "negative semidefinite": "all ≤ 0",
  "positive semidefinite and negative semidefinite": "all 0",
};
const DEF_WORDS = /^(not( positive definite)?|indefinite|(positive|negative) (semi-?)?definite)$/i;
const isDefChoice = (l) => l.includes(" / ") && l.split(" / ").every((o) => DEF_WORDS.test(o.trim()));

// Is the template text about a matrix A (not about f's Hessian)?
export const aboutA = (body) => /(^|[^\\\w])A(\s*=\s*\{\{A\}\}|\$|\s*u\b|\^\\top|\\,|\s*v\b)/.test(body) && !/\\nabla\^2|Hessian/.test(body);

// " (with $a > 0$)" for the vars-block assumptions about A's parameters.
const assumed = (vars, A) => { const s = assumptionsTex(vars.assumptions || [], params(A)); return s ? ` (with $${s}$)` : ""; };

// Blanks of the matrix templates, computed from the note's matrix.
// undefined: not a matrix blank here; null: a matrix blank, nothing to compute from.
export function resolveMatrixLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  if (!aboutA(body)) return undefined;
  const m = noteMatrix(vars, ctx);
  const known = isDefChoice(l) || /^(all > 0 \/ all ≥ 0 \/ of both signs|diagonal matrix|row op \+ column op|quadratic form|shift|A inverse|A \| I|I \| A inverse|D of A|M with AM = DI|D nonzero when|A inverse with parameters|D zero cases|A has a zero row \/ A v = 0 for v = \.\.\. ≠ 0|contradiction, e\.g\. v = BAv = B0 = 0|AB|BA)$/.test(l)
    || (/^(u|value)$/.test(l) && /u\^\\top A u = \{\{value\}\}/.test(body))
    || (/^(u|v|positive|negative)$/.test(l) && /\{\{negative\}\} < 0/.test(body))
    || (/^(a|c)$/.test(l) && /\{\{shift\}\}/.test(body))
    || (l === "D" && /D = ad - bc/.test(body))
    || (l === "B" && /AB = \{\{AB\}\} \\neq/.test(body));
  if (!known) return undefined;
  if (!m) return null;
  const A = m.M;
  const from = `@${m.name}`;
  try {
    // Matrices with parameters: the conditions instead of one verdict.
    if ((isDefChoice(l) || /^all > 0/.test(l)) && isSym(A) && !isConst(A)) {
      const P = paramConditions(A);
      if (!P) return null;
      const say = (x) => (x === "never" ? "never" : x || "always");
      return { value: `positive definite exactly when ${say(P.pd)}, positive semi-definite exactly when ${say(P.psd)}${P.note}${assumed(vars, A)}`, prose: true, from: `${from}, diagonal of D with parameters` };
    }
    if (isDefChoice(l) || /^all > 0/.test(l) || /^(diagonal matrix|row op \+ column op)$/.test(l)) {
      if (!isSym(A)) return null;
      const W = definitenessWitness(A);
      if (!W) return null;
      if (l === "diagonal matrix") return { value: texM(A.map((r, i) => r.map((_, j) => (i === j ? W.R.D[i] : cas.ZERO)))), from: `${from}, symmetric reduction` };
      if (l === "row op + column op") return { value: opsProse(W.R), prose: true, from: `${from}, symmetric reduction` };
      if (/^all > 0/.test(l)) return { value: chooseOption(l, SIGNS[W.d]) || SIGNS[W.d], prose: true, from: `${from}, signs of D` };
      const opts = l.split(" / ").map((s) => s.trim());
      let value = chooseOption(l, W.d);
      if (!value && opts.includes("not")) value = W.d === opts[0] ? opts[0] : `not ${opts[0]} (it is ${W.d})`;
      return { value: value || W.d, prose: true, from: `${from}, signs of D` };
    }
    if (/^(u|value)$/.test(l) && /u\^\\top A u = \{\{value\}\}/.test(body)) {
      const W = definitenessWitness(A);
      if (!W || !W.notPD) return null;
      return l === "u" ? { value: texCol(W.notPD.u), from: `${from}, ${W.notPD.how === "unit" ? `entry (${W.notPD.i + 1}, ${W.notPD.i + 1}) of ${m.name}` : `column ${W.notPD.i + 1} of B (symmetric reduction)`}` }
        : { value: T(W.notPD.value), from: `${from}, u^T ${m.name} u` };
    }
    if (/^(u|v|positive|negative)$/.test(l)) {
      const W = definitenessWitness(A);
      if (!W || !W.pos || !W.neg) return null;
      const w = /^(u|positive)$/.test(l) ? W.pos : W.neg;
      return /^(u|v)$/.test(l) ? { value: texCol(w.u), from: `${from}, ${w.how === "unit" ? "unit vector" : "column of B"}` } : { value: T(w.value), from: `${from}, computed` };
    }
    if (/^(quadratic form|shift|a|c)$/.test(l)) {
      if (A.length !== 2 || !isSym(A) || cas.isZero(A[0][0])) return null;
      const [a, b, c] = [A[0][0], A[0][1], A[1][1]];
      const x = cas.sym("x"), y = cas.sym("y");
      if (l === "quadratic form") {
        const q = cas.add(cas.mul(a, cas.pow(x, 2)), cas.mul(cas.num(2), b, x, y), cas.mul(c, cas.pow(y, 2)));
        return { value: T(q, ["x", "y"]), from: `${from}, u = (x, y)` };
      }
      if (l === "a") return { value: T(a), from };
      if (l === "shift") return { value: T(cas.div(b, a)), from: `${from}, b / a` };
      return { value: T(cas.sub(c, cas.div(cas.mul(b, b), a))), from: `${from}, c − b²/a` };
    }
    // Parameters: A^{-1} = M / D, with the values where D = 0 done one by one.
    if (/^(D of A|M with AM = DI|D nonzero when|A inverse with parameters|D zero cases)$/.test(l) || (/^(A inverse|I \| A inverse)$/.test(l) && isSquare(A) && !isConst(A))) {
      const P = paramInverse(A, vars.assumptions || []);
      if (!P) return null;
      const src = `${from}, Gauss elimination on (A | I) with the parameters kept`;
      if (l === "D of A") return { value: P.Dtex, from: `${from}, the number Gauss elimination divides by` };
      if (l === "M with AM = DI") return { value: texM(P.M), from: src };
      if (l === "A inverse" || l === "A inverse with parameters") {
        const c = cas.constValue(P.D);
        return { value: c ? texM(P.M.map((r) => r.map((x) => cas.div(x, P.D)))) : `\\frac{1}{${T(P.D)}}${texM(P.M)}`, from: src };
      }
      if (l === "I | A inverse") return { value: A.map((r, i) => [...r.map((_, j) => (i === j ? "1" : "0")), ...P.M[i].map((x) => fracTex(x, P.D))].join(" & ")).join(" \\\\ "), from: src };
      return { value: paramInverseProse(P, m.name, l), prose: true, from: src };
    }
    if (l === "D") {
      if (A.length !== 2 || !isSquare(A)) return null;
      return { value: T(cas.sub(cas.mul(A[0][0], A[1][1]), cas.mul(A[0][1], A[1][0]))), from: `${from}, ad − bc` };
    }
    if (/^(A inverse|A \| I|I \| A inverse)$/.test(l)) {
      if (!isSquare(A) || zeroSolution(A)) return null;
      const inv = cas.mat.inverse(A);
      const I = cas.mat.identity(A.length);
      const rows = (L, R) => L.map((r, i) => [...r, ...R[i]].map((x) => T(x)).join(" & ")).join(" \\\\ ");
      if (l === "A inverse") return { value: texM(inv), from: `${from}, Gauss elimination on (A | I)` };
      return { value: l === "A | I" ? rows(A, I) : rows(I, inv), from };
    }
    if (/^A has a zero row/.test(l) || /^contradiction, e\.g\./.test(l)) {
      if (!isSquare(A)) return null;
      const zr = zeroRow(A);
      const zc = zeroCol(A);
      const v = zc >= 0 ? unit(A.length, zc) : zr >= 0 ? null : zeroSolution(A);
      if (zr >= 0 && zc < 0) {
        return /^A has/.test(l)
          ? { value: `row ${zr + 1} of $${m.name}$ is $0$`, prose: true, from }
          : { value: `row ${zr + 1} of $${m.name}B$ is $0$ (Definition 3.4), so $${m.name}B \\neq I$`, prose: true, from };
      }
      if (!v) return null;
      return /^A has/.test(l)
        ? { value: `$${m.name} v = 0$ for $v = ${texCol(v)} \\neq 0$${zc >= 0 ? ` (column ${zc + 1} of $${m.name}$ is $0$)` : " (Gauss elimination, Section 2.3)"}`, prose: true, from }
        : { value: `$v = Iv = (B${m.name})v = B(${m.name}v) = B0 = 0$, but $v \\neq 0$`, prose: true, from };
    }
    if (/^(AB|BA|B)$/.test(l)) {
      const others = noteMatrices(vars).filter((x) => x.name !== m.name);
      const N = nonCommuting(A, others);
      if (!N) return null;
      if (l === "B") return { value: texM(N.B), from: N.name ? `@${N.name}` : "first matrix with AB ≠ BA" };
      return { value: texM(l === "AB" ? cas.mat.mul(A, N.B) : cas.mat.mul(N.B, A)), from: `${from} and ${N.name ? "@" + N.name : "that B"}` };
    }
  } catch (_) {
    return null;
  }
  return null;
}

// Matrix blanks first (they depend on the route text), then everything else.
export function resolveAny(label, vars, ctx = {}) {
  const c = vars instanceof Map ? resolveCasesLabel(label, vars, ctx) : undefined;
  if (c !== undefined) return c;
  const r = vars instanceof Map ? resolveMatrixLabel(label, vars, ctx) : undefined;
  if (r !== undefined) return r;
  const g = vars instanceof Map ? resolveLagrangeLabel(label, vars, ctx) : undefined;
  return g !== undefined ? g : resolveLabel(label, vars, ctx);
}

// \lagrange: a linear g with convex (or -f convex) f -> the convexity route.
function lagrangeFit(label, vars, ctx) {
  const fg = vars instanceof Map ? noteFG(vars, ctx) : null;
  if (!fg) return null;
  let S;
  try { S = lagrangeSolve(fg.F, fg.G); } catch (_) { return null; }
  if (!S || S.kind !== "unique" || !S.linearG) return null;
  const conv = /(positive|negative)/.test(S.d || "");
  const g = fg.G.v.name;
  if (/^linear constraint/.test(label)) return conv ? { ok: true, best: true, why: `${g} is linear: one candidate, convexity decides` } : null;
  return { ok: false, why: `${g} = 0 is a line: not compact, Theorem 5.84 does not apply` };
}

// Does this route fit the note's matrix? { ok, why } or null (no opinion).
export function routeFit(route, vars, ctx = {}) {
  const body = route.body || "";
  const label = route.label || "";
  // A parameter in the note: the "with a parameter" route lists every case.
  if (/^(with a parameter|depends on a parameter)/i.test(label) && vars instanceof Map) {
    const pc = paramCases(ctx.command || commandOfBody(`${label}\n${body}`), vars, ctx);
    if (pc?.cases) return { ok: true, best: true, why: `depends on ${pc.p}: ${pc.cases.length} cases` };
    if (pc?.many) return { ok: true, why: `depends on ${pc.many.join(", ")}` };
    return { ok: false, why: "no parameter in the note" };
  }
  // Sets, limits, KKT, SVM: decided in verdicts.js (ctx.command: the template's name).
  if (ctx.command && VERDICT_COMMANDS.has(ctx.command)) return vars instanceof Map ? verdictFit(ctx.command, label, vars, ctx) : null;
  if (/Theorem 7\.39/.test(body) && /^(one constraint|linear constraint)/.test(label)) return lagrangeFit(label, vars, ctx);
  if (!aboutA(body)) return null;
  const m = noteMatrix(vars, ctx);
  if (!m) return null;
  const A = m.M;
  const name = m.name;
  try {
    const defRoute = /positive definite|semi-definite|indefinite|symmetric reduction|complete the square/i.test(label);
    if (defRoute && !/A\^T A/.test(label)) {
      if (!isSym(A)) return { ok: false, why: `${name} is not symmetric` };
      // Parameters: the "with a parameter" route (above) is the one to use.
      if (!isConst(A)) return /symmetric reduction/i.test(label) ? { ok: true, why: `${name} has parameters: gives the inequalities` } : null;
      const W = definitenessWitness(A);
      if (!W) return null;
      const is = `${name} is ${W.d}`;
      // best: the one route to use. Indefinite: the two vectors are the
      // shortest full answer; otherwise symmetric reduction decides everything.
      if (/^NOT positive definite/i.test(label)) return { ok: W.d !== "positive definite", why: is };
      if (/^indefinite/i.test(label)) return { ok: W.d === "indefinite", why: is, best: W.d === "indefinite" };
      if (/complete the square/i.test(label)) return A.length === 2 && !cas.isZero(A[0][0]) ? { ok: true, why: is } : { ok: false, why: A.length === 2 ? `${name}₁₁ = 0` : `only for 2×2, ${name} is ${A.length}×${A.length}` };
      if (/symmetric reduction/i.test(label)) return { ok: true, why: is, best: W.d !== "indefinite" };
      return null;
    }
    if (/invertible|inverse|2x2 formula|\(A \| I\)/i.test(label) && !/of a product|transpose/i.test(label)) {
      if (!isSquare(A)) return { ok: false, why: `${name} is not square` };
      if (!isConst(A)) {
        const ps = params(A).join(", ");
        if (/with parameters/i.test(label)) return { ok: true, best: true, why: `${name} has the parameter${ps.includes(",") ? "s" : ""} ${ps}` };
        if (/2x2 formula/i.test(label)) return A.length === 2 ? { ok: true, why: `${name} has parameters: D = ad − bc ≠ 0 is a condition` } : { ok: false, why: `${name} is ${A.length}×${A.length}` };
        return /Gauss/i.test(label) ? { ok: false, why: `${name} has parameters: it divides by D without saying when D = 0` } : null;
      }
      const singular = !!zeroSolution(A);
      const is = singular ? `${name} is not invertible` : `${name} is invertible`;
      if (/NOT invertible/i.test(label)) return { ok: singular, why: is, best: singular };
      if (/2x2 formula/i.test(label)) return A.length === 2 ? { ok: !singular, why: is, best: !singular } : { ok: false, why: `${name} is ${A.length}×${A.length}` };
      return { ok: !singular, why: is, best: !singular && A.length > 2 && /Gauss/i.test(label) };
    }
    if (/\(A\+B\)\^2/.test(label)) {
      const N = nonCommuting(A, noteMatrices(vars).filter((x) => x.name !== name));
      return N ? { ok: true, best: true, why: N.name ? `${name}${N.name} ≠ ${N.name}${name}` : `found B with ${name}B ≠ B${name}` } : { ok: false, why: `${name} = aI, so ${name}B = B${name} for every B` };
    }
  } catch (_) {
    return null;
  }
  return null;
}
