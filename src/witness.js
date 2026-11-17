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
import { casOf } from "./vars.js";
import { symmetricReduction, definiteness, resolveLabel } from "./textlink.js";

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
const aboutA = (body) => /(^|[^\\\w])A(\s*=\s*\{\{A\}\}|\$|\s*u\b|\^\\top|\\,|\s*v\b)/.test(body) && !/\\nabla\^2|Hessian/.test(body);

// Blanks of the matrix templates, computed from the note's matrix.
// undefined: not a matrix blank here; null: a matrix blank, nothing to compute from.
export function resolveMatrixLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  if (!aboutA(body)) return undefined;
  const m = noteMatrix(vars, ctx);
  const known = isDefChoice(l) || /^(all > 0 \/ all ≥ 0 \/ of both signs|diagonal matrix|row op \+ column op|quadratic form|shift|A inverse|A \| I|I \| A inverse|A has a zero row \/ A v = 0 for v = \.\.\. ≠ 0|contradiction, e\.g\. v = BAv = B0 = 0|AB|BA)$/.test(l)
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
      return { value: `positive definite exactly when ${say(P.pd)}, positive semi-definite exactly when ${say(P.psd)}${P.note}`, prose: true, from: `${from}, diagonal of D with parameters` };
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
  const r = vars instanceof Map ? resolveMatrixLabel(label, vars, ctx) : undefined;
  return r !== undefined ? r : resolveLabel(label, vars, ctx);
}

// Does this route fit the note's matrix? { ok, why } or null (no opinion).
export function routeFit(route, vars, ctx = {}) {
  const body = route.body || "";
  const label = route.label || "";
  if (!aboutA(body)) return null;
  const m = noteMatrix(vars, ctx);
  if (!m) return null;
  const A = m.M;
  const name = m.name;
  try {
    const defRoute = /positive definite|semi-definite|indefinite|symmetric reduction|complete the square/i.test(label);
    if (defRoute && !/A\^T A/.test(label)) {
      if (!isSym(A)) return { ok: false, why: `${name} is not symmetric` };
      if (!isConst(A)) return /symmetric reduction/i.test(label) ? { ok: true, why: `${name} has parameters: gives the inequalities` } : null;
      const W = definitenessWitness(A);
      if (!W) return null;
      const is = `${name} is ${W.d}`;
      if (/^NOT positive definite/i.test(label)) return { ok: W.d !== "positive definite", why: is };
      if (/^indefinite/i.test(label)) return { ok: W.d === "indefinite", why: is };
      if (/complete the square/i.test(label)) return A.length === 2 && !cas.isZero(A[0][0]) ? { ok: true, why: is } : { ok: false, why: A.length === 2 ? `${name}₁₁ = 0` : `only for 2×2, ${name} is ${A.length}×${A.length}` };
      if (/symmetric reduction/i.test(label)) return { ok: true, why: is };
      return null;
    }
    if (/invertible|inverse|2x2 formula|\(A \| I\)/i.test(label) && !/of a product|transpose/i.test(label)) {
      if (!isSquare(A)) return { ok: false, why: `${name} is not square` };
      if (!isConst(A)) return null;
      const singular = !!zeroSolution(A);
      const is = singular ? `${name} is not invertible` : `${name} is invertible`;
      if (/NOT invertible/i.test(label)) return { ok: singular, why: is };
      if (/2x2 formula/i.test(label)) return A.length === 2 ? { ok: !singular, why: is } : { ok: false, why: `${name} is ${A.length}×${A.length}` };
      return { ok: !singular, why: is };
    }
    if (/\(A\+B\)\^2/.test(label)) {
      const N = nonCommuting(A, noteMatrices(vars).filter((x) => x.name !== name));
      return N ? { ok: true, why: N.name ? `${name}${N.name} ≠ ${N.name}${name}` : `found B with ${name}B ≠ B${name}` } : { ok: false, why: `${name} = aI, so ${name}B = B${name} for every B` };
    }
  } catch (_) {
    return null;
  }
  return null;
}
