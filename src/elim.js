// Elimination and induction, the way the IMO26 book does them, with every
// step recorded: Gauss elimination + back substitution (Section 2.3),
// Fourier-Motzkin elimination of inequalities (Section 4.5) and proofs by
// induction (Theorem 1.86, Section 1.6.5). Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { findRelation } from "./vars.js";
import { substituteTex, freeIndex } from "./textlink.js";

const T = (x, vars) => cas.tex(x, vars);
const isNeg = (x) => { const c = cas.constValue(x); return c && c.n < 0; };
const isOne = (x) => cas.equal(x, cas.ONE);
const paren = (s) => (/^[\w.\\{}^]+$/.test(s) && !/^-/.test(s) ? s : `\\left(${s}\\right)`);

// ---------- linear forms ----------

// expr = c_1 x_1 + ... + c_n x_n + c_0 with constant c_i, or null.
export function linear(expr, vars) {
  const coef = vars.map((v) => cas.diff(expr, v));
  if (coef.some((c) => cas.symbols(c).size)) return null;
  const c0 = cas.subs(expr, Object.fromEntries(vars.map((v) => [v, cas.ZERO])));
  if (cas.symbols(c0).size) return null;
  return { coef, c0 };
}

// "2x + y - z" from coefficients.
export function combo(coef, vars) {
  const parts = [];
  coef.forEach((c, i) => {
    if (cas.isZero(c)) return;
    const neg = isNeg(c);
    const m = neg ? cas.neg(c) : c;
    const k = isOne(m) ? "" : T(m);
    const s = `${k}${k && /^\d/.test(vars[i]) ? "\\cdot " : ""}${vars[i]}`;
    parts.push(parts.length ? `${neg ? "-" : "+"} ${s}` : `${neg ? "-" : ""}${s}`);
  });
  return parts.length ? parts.join(" ") : "0";
}
const eqLine = (row, vars) => `${combo(row.slice(0, vars.length), vars)} = ${T(row[vars.length])}`;
export const systemTex = (rows, vars) => `\\begin{cases} ${rows.map((r) => eqLine(r, vars)).join(" \\\\ ")} \\end{cases}`;

// Equations as text ("x + 2y = 3; ...") -> { rows: [[a.., b]], vars }.
export function parseSystem(eqs) {
  const lin = eqs.map((e) => {
    const r = typeof e === "string" ? findRelation(e) : e;
    if (!r || r.op !== "=") throw new Error(`"${typeof e === "string" ? e : r?.lhs}" is not an equation`);
    return cas.sub(cas.parse(r.lhs), cas.parse(r.rhs));
  });
  const vars = cas.orderVars(new Set(lin.flatMap((x) => [...cas.symbols(x)])));
  const rows = lin.map((x) => {
    const l = linear(x, vars);
    if (!l) throw new Error("the equations are not linear");
    return [...l.coef, cas.neg(l.c0)];
  });
  return { rows, vars };
}

// ---------- Gauss elimination (Section 2.3) ----------

const nm = (i) => `(${i + 1})`;
// rows: [[a_1..a_n, b]]. Returns the steps and the solution.
export function gauss(rows0, vars) {
  const rows = rows0.map((r) => [...r]);
  const n = vars.length;
  const steps = [{ ops: [], rows: rows.map((r) => [...r]) }];
  const pivots = [];
  let r = 0;
  for (let c = 0; c < n && r < rows.length; c++) {
    let p = r;
    while (p < rows.length && cas.isZero(rows[p][c])) p++;
    if (p === rows.length) continue;
    const ops = [];
    if (p !== r) { [rows[p], rows[r]] = [rows[r], rows[p]]; ops.push(`swap equations ${nm(r)} and ${nm(p)}`); }
    for (let k = r + 1; k < rows.length; k++) {
      if (cas.isZero(rows[k][c])) continue;
      const f = cas.div(rows[k][c], rows[r][c]);
      rows[k] = rows[k].map((x, j) => cas.sub(x, cas.mul(f, rows[r][j])));
      const neg = isNeg(f);
      const m = neg ? cas.neg(f) : f;
      ops.push(`${neg ? "add" : "subtract"} ${isOne(m) ? "" : `$${T(m)}$ times `}equation ${nm(r)} ${neg ? "to" : "from"} equation ${nm(k)}`);
    }
    pivots.push({ row: r, col: c });
    if (ops.length) steps.push({ ops, col: c, rows: rows.map((x) => [...x]) });
    r++;
  }
  // 0 = b with b != 0: no solution.
  const bad = rows.findIndex((row) => row.slice(0, n).every(cas.isZero) && !cas.isZero(row[n]));
  if (bad >= 0) return { steps, rows, pivots, kind: "none", bad };
  // Back substitution from the last pivot up; columns without a pivot are free.
  const free = vars.filter((_, c) => !pivots.some((p) => p.col === c));
  const params = Object.fromEntries(free.map((v, i) => [v, cas.sym(free.length === 1 ? "t" : `t_${i + 1}`)]));
  const val = { ...params };
  const back = [];
  for (const { row, col } of [...pivots].reverse()) {
    const R = rows[row];
    const known = vars.map((v, j) => (j !== col && !cas.isZero(R[j]) ? { j, v } : null)).filter(Boolean);
    const rest = cas.add(...known.map(({ j, v }) => cas.mul(R[j], val[v])));
    const x = cas.div(cas.sub(R[n], rest), R[col]);
    // a x + (known terms, now numbers) = b  ->  x = (b - rest)/a
    const restTex = T(rest);
    const lhs = `${combo([R[col]], [vars[col]])}${known.length ? (restTex.startsWith("-") ? ` - ${T(cas.neg(rest))}` : ` + ${restTex}`) : ""}`;
    back.push({ var: vars[col], eq: eqLine(R, vars), known: known.map(({ v }) => `${v} = ${T(val[v])}`), plugged: known.length ? `${lhs} = ${T(R[n])}` : null, value: x });
    val[vars[col]] = x;
  }
  return { steps, rows, pivots, kind: free.length ? "infinite" : "unique", free, params, values: vars.map((v) => val[v]), back };
}

// ---------- Fourier-Motzkin (Section 4.5) ----------

// An inequality e (op) 0 kept as  e <= 0  (or < 0 when strict).
export function parseIneqs(list) {
  const out = [];
  for (const e of list) {
    const r = typeof e === "string" ? findRelation(e) : e;
    if (!r) throw new Error(`"${e}" is not an inequality`);
    const d = cas.sub(cas.parse(r.lhs), cas.parse(r.rhs));
    const op = String(r.op).replace(/^\\/, "");
    if (/^(le|leq|<=|leqslant)$/.test(op)) out.push({ e: d, strict: false });
    else if (op === "<" || op === "lt") out.push({ e: d, strict: true });
    else if (/^(ge|geq|>=|geqslant)$/.test(op)) out.push({ e: cas.neg(d), strict: false });
    else if (op === ">" || op === "gt") out.push({ e: cas.neg(d), strict: true });
    else if (op === "=") { out.push({ e: d, strict: false, eq: true }); out.push({ e: cas.neg(d), strict: false, eq: true }); }
    else throw new Error(`can't use the relation ${r.op}`);
  }
  return out;
}

const cmp = (s) => (s ? "<" : "\\le");
// e <= 0 shown as   lhs <= rhs  with the variable terms left, constants right.
export function ineqTex(q, vars) {
  const l = linear(q.e, vars);
  if (!l) return `${T(q.e, vars)} ${cmp(q.strict)} 0`;
  // -y <= 0 reads better as y >= 0: flip when the first coefficient is negative.
  const first = l.coef.find((c) => !cas.isZero(c));
  if (first && isNeg(first)) return `${combo(l.coef.map(cas.neg), vars)} ${q.strict ? ">" : "\\ge"} ${T(l.c0)}`;
  return `${combo(l.coef, vars)} ${cmp(q.strict)} ${T(cas.neg(l.c0))}`;
}

// One elimination step for variable x. Returns the bounds and the new system.
export function fmStep(ineqs, vars, x) {
  const lower = []; const upper = []; const rest = [];
  for (const q of ineqs) {
    const a = cas.diff(q.e, x);
    const r = cas.sub(q.e, cas.mul(a, cas.sym(x)));
    if (cas.isZero(a)) { rest.push(q); continue; }
    const bound = cas.div(cas.neg(r), a); // a x + r <= 0  ->  x <= -r/a (a > 0) or x >= -r/a (a < 0)
    if (isNeg(a)) lower.push({ b: bound, strict: q.strict }); else upper.push({ b: bound, strict: q.strict });
  }
  const pairs = [];
  for (const L of lower) for (const U of upper) pairs.push({ e: cas.sub(L.b, U.b), strict: L.strict || U.strict, L, U });
  const next = [];
  const contradictions = [];
  for (const q of [...rest, ...pairs]) {
    if (cas.symbols(q.e).size === 0) {
      const c = cas.constValue(q.e);
      const ok = q.strict ? c.n < 0 : c.n <= 0;
      if (!ok) contradictions.push(q);
      continue; // a true constant inequality drops out
    }
    if (!next.some((p) => cas.equal(p.e, q.e) && p.strict === q.strict)) next.push({ e: q.e, strict: q.strict });
  }
  return { lower, upper, rest, pairs, next, contradictions };
}

// ---------- induction (Theorem 1.86) ----------

// Exponentials and factorials in k, the way one handles them by hand:
// 2^k is one unknown E, so 2^{k+1} = 2E; k! is F, so (k+1)! = (k+1)F.
let kBase = null;
export function kParse(tex) {
  // 2^{(k+1)+1} -> 2^{k+2}
  let s = String(tex).replace(/\^\s*\{\s*\(\s*k\s*\+\s*(\d+)\s*\)\s*\+\s*(\d+)\s*\}/g, (_, a, b) => `^{k+${Number(a) + Number(b)}}`);
  const bases = new Set();
  s = s.replace(/(\d+|[a-jl-zA-Z])\s*\^\s*(?:\{\s*\(?\s*k\s*(?:\+\s*(\d+))?\s*\)?\s*\}|k(?![A-Za-z]))/g, (_, b, m) => {
    bases.add(b);
    return m ? `${b}^{${m}} \\cdot E` : "E";
  });
  s = s.replace(/\(\s*k\s*\+\s*1\s*\)\s*!/g, "(k+1) F").replace(/(?<![\w)])k\s*!/g, "F");
  if (bases.size > 1) throw new Error("several different exponentials");
  if (bases.size) kBase = [...bases][0];
  return cas.parse(s);
}
export function kTex(x) {
  const put = (s, sym, val) => s.replace(new RegExp(`(?<![\\\\A-Za-z])${sym}(\\^)?`, "g"), (_, pow, off, str) => {
    const dot = /[\d}]\s*$/.test(str.slice(0, off)) ? " \\cdot " : "";
    const after = /^[A-Za-z]/.test(str.slice(off + 1 + (pow ? 1 : 0))) ? " \\cdot " : "";
    return pow ? `${dot}\\left(${val}\\right)^` : `${dot}${val}${after}`;
  });
  return put(put(typeof x === "string" ? x : T(x), "E", `${kBase}^{k}`), "F", "k!");
}

const SUM = /^\\(sum|prod)_\{\s*([a-z])\s*=\s*([^{}]+)\}\^\{?([^{}\s]+|[^{}]+?)\}?\s*([\s\S]+)$/;

// P(n): lhs op rhs in the variable p, from n0. Returns the proof steps
// [{ text, tex }] or throws when the algebra can't be done exactly.
export function inductionSteps(stmt, p, n0) {
  const steps = [];
  const L = stmt.lhs.trim(); const R = stmt.rhs.trim(); const op = stmt.op;
  const at = (tex, v) => substituteTex(freeIndex(tex, "k"), p, v);
  const opTex = op === "=" ? "=" : op;
  steps.push({ text: `Let $P(${p})$ be the statement below. We prove it for every $${p} \\ge ${n0}$ by induction (Theorem 1.86, Section 1.6.5): show the base case $P(${n0})$, and show that $P(k)$ implies $P(k+1)$ for every $k \\ge ${n0}$.`, tex: `P(${p}):\\quad ${L} ${opTex} ${R}` });
  // Base case: both sides computed.
  const side = (tex) => {
    const m = tex.match(SUM);
    if (m) {
      const a = cas.parse(m[3]); const b = cas.parse(m[4]);
      const ca = cas.constValue(a); const cb = cas.constValue(b);
      if (!ca || !cb || ca.d !== 1 || cb.d !== 1) return null;
      const terms = [];
      for (let i = ca.n; i <= cb.n; i++) terms.push(cas.subs(cas.parse(m[5]), { [m[2]]: cas.num(i) }));
      return { terms, value: m[1] === "sum" ? cas.add(...terms) : cas.mul(...terms), kind: m[1] };
    }
    const fact = (d) => (d <= 1 ? 1 : d * fact(d - 1));
    const x = cas.tryParse(tex.replace(/\(?(\d+)\)?\s*!/g, (_, d) => String(fact(Number(d)))));
    return x && cas.symbols(x).size === 0 ? { value: x } : null;
  };
  const bl = side(at(L, n0)); const br = side(at(R, n0));
  if (!bl || !br) throw new Error("can't evaluate the base case exactly");
  const show = (s, tex) => (s.terms && s.terms.length > 1 ? `${tex} = ${s.terms.map((t) => T(t)).join(s.kind === "sum" ? " + " : " \\cdot ")} = ${T(s.value)}` : `${tex} = ${T(s.value)}`);
  const o = String(op).replace(/^\\/, "");
  const holds = (a, b) => {
    const d = cas.constValue(cas.sub(a, b));
    if (!d) return null;
    if (o === "=") return d.n === 0;
    if (/^(ge|geq|>=)$/.test(o)) return d.n >= 0;
    if (/^(gt|>)$/.test(o)) return d.n > 0;
    if (/^(le|leq|<=)$/.test(o)) return d.n <= 0;
    if (/^(lt|<)$/.test(o)) return d.n < 0;
    return null;
  };
  const ok = holds(bl.value, br.value);
  steps.push({ text: `**Base case** $${p} = ${n0}$: compute both sides.`, tex: `\\begin{aligned} \\text{left: } & ${show(bl, at(L, n0))} \\\\ \\text{right: } & ${show(br, at(R, n0))} \\end{aligned}` });
  steps.push({ text: ok ? `${op === "=" ? "Both sides agree" : "The inequality holds"}, so $P(${n0})$ is true.` : `The base case FAILS (${T(bl.value)} vs ${T(br.value)}), so the statement is false for $${p} = ${n0}$.` });
  if (!ok) return steps;
  // Induction step.
  const Lk = at(L, "k"); const Rk = at(R, "k"); const Lk1 = at(L, "k+1"); const Rk1 = at(R, "k+1");
  steps.push({ text: `**Induction step.** Let $k \\ge ${n0}$ and assume the induction hypothesis $P(k)$:`, tex: `${Lk} ${opTex} ${Rk}` });
  steps.push({ text: `We must show $P(k+1)$:`, tex: `${Lk1} ${opTex} ${Rk1}` });
  const m = L.match(SUM);
  const done = `By induction (Theorem 1.86), $P(${p})$ holds for all $${p} \\ge ${n0}$. $\\blacksquare$`;
  kBase = null;
  const Rk1x = kParse(Rk1);
  const Rkx = kParse(Rk);
  if (m && (m[4].trim() === p || m[4].trim() === `{${p}}`) && op === "=") {
    const body1tex = substituteTex(m[5], m[2], "k+1");
    const body1 = kParse(body1tex);
    const isSum = m[1] === "sum";
    const viaIH = isSum ? cas.add(Rkx, body1) : cas.mul(Rkx, body1);
    const sep = isSum ? "+" : "\\cdot";
    steps.push({ text: `Split off the last ${isSum ? "term" : "factor"} ($i = k+1$) and use the induction hypothesis on the rest, as in the book's proof of (1.18):`, tex: `\\begin{aligned} ${Lk1} &= ${Lk} ${sep} ${paren(body1tex)} \\\\ &= ${paren(Rk)} ${sep} ${paren(body1tex)} \\quad \\text{(by } P(k)\\text{)} \\\\ &= ${kTex(viaIH)} \\end{aligned}` });
    steps.push({ text: `Expand the right-hand side of $P(k+1)$ for comparison:`, tex: `${Rk1} = ${kTex(Rk1x)}` });
    const same = cas.equal(viaIH, Rk1x);
    steps.push({ text: same ? `The two expressions are equal, so $P(k) \\Rightarrow P(k+1)$. ${done}` : `They are NOT equal, so the induction step fails: the formula is wrong.` });
    return steps;
  }
  const Lkx = kParse(Lk); const Lk1x = kParse(Lk1);
  const ge = /^(ge|geq|>=|gt|>)$/.test(o);
  const j = cas.sym("j");
  // Is e >= 0 for every k >= n0? Put k = n0 + j: all coefficients >= 0 is enough.
  const nonneg = (e) => {
    const shifted = cas.subs(e, { k: cas.add(cas.num(n0), j) });
    // j >= 0, and E = b^k > 0, F = k! > 0: non-negative coefficients suffice.
    const ok = [...cas.symbols(shifted)].every((s) => s === "j" || s === "E" || s === "F")
      && cas.termsOf(shifted).every((t) => [...t.terms.values()][0].c.n >= 0);
    return { shifted, ok };
  };
  // Left side of P(k+1) a constant multiple of the left side of P(k)
  // (2^{k+1} = 2 \cdot 2^k, (k+1)! = (k+1) k!): use P(k) on that factor.
  const ratio = cas.div(Lk1x, Lkx);
  const rc = cas.symbols(ratio).size === 0 ? cas.constValue(ratio) : null;
  const rk = !rc && op !== "=" && [...cas.symbols(ratio)].every((s) => s === "k") ? ratio : null;
  if (op !== "=" && ((rc && rc.n > 0) || rk)) {
    const r = rc ? ratio : rk;
    const rTex = kTex(r);
    const bound = cas.mul(r, Rkx);
    const pos = rc ? `since $${rTex} > 0$` : `since $${rTex} > 0$ for $k \\ge ${n0}$`;
    steps.push({ text: `Write the left side of $P(k+1)$ in terms of the left side of $P(k)$ and use the induction hypothesis (${pos}, multiplying keeps the inequality):`, tex: `\\begin{aligned} ${Lk1} &= ${paren(rTex)} \\cdot ${paren(Lk)} \\\\ &${ge ? "\\ge" : "\\le"} ${paren(rTex)} \\cdot ${paren(Rk)} \\quad \\text{(by } P(k)\\text{)} \\\\ &= ${kTex(bound)} \\end{aligned}` });
    const need = ge ? cas.sub(bound, Rk1x) : cas.sub(Rk1x, bound);
    const { shifted, ok } = nonneg(need);
    steps.push({ text: `It remains to see that this is ${ge ? "at least" : "at most"} the right side of $P(k+1)$, $${Rk1} = ${kTex(Rk1x)}$:`, tex: `${ge ? `${paren(kTex(bound))} - ${paren(kTex(Rk1x))}` : `${paren(kTex(Rk1x))} - ${paren(kTex(bound))}`} = ${kTex(need)} \\ge 0 \\quad \\text{for } k \\ge ${n0}` });
    steps.push(ok
      ? { text: `With $k = ${n0} + j$, $j \\ge 0$, every coefficient is non-negative (and $b^k > 0$, $k! > 0$ where they occur), so it is $\\ge 0$. Hence $P(k) \\Rightarrow P(k+1)$. ${done}`, tex: `${kTex(need)} = ${kTex(shifted)} \\quad (k = ${n0} + j)` }
      : { text: `With $k = ${n0} + j$ this is $${kTex(shifted)}$; show it is $\\ge 0$ for $j \\ge 0$ to finish the step.` });
    return steps;
  }
  // Otherwise: compare how much each side changes from k to k+1.
  const dL = cas.sub(Lk1x, Lkx); const dR = cas.sub(Rk1x, Rkx);
  steps.push({ text: `Compare how much each side changes from $k$ to $k+1$:`, tex: `\\begin{aligned} \\text{left: } & ${paren(Lk1)} - ${paren(Lk)} = ${kTex(dL)} \\\\ \\text{right: } & ${paren(Rk1)} - ${paren(Rk)} = ${kTex(dR)} \\end{aligned}` });
  const diff = cas.sub(dL, dR);
  if (op === "=") {
    steps.push({ text: cas.isZero(diff) ? `Both sides change by the same amount, so adding it to both sides of $P(k)$ gives $P(k+1)$. ${done}` : `The changes differ by $${kTex(diff)}$, so the induction step fails.` });
    return steps;
  }
  const need = ge ? diff : cas.neg(diff);
  const { shifted, ok: grows } = nonneg(need);
  steps.push({ text: `It is enough that the left side ${ge ? "grows at least as much as" : "grows at most as much as"} the right side (adding these changes to both sides of $P(k)$ keeps the inequality): we need`, tex: `${kTex(need)} \\ge 0 \\quad \\text{for } k \\ge ${n0}` });
  steps.push(grows
    ? { text: `With $k = ${n0} + j$, $j \\ge 0$, every coefficient is non-negative (and $b^k > 0$, $k! > 0$ where they occur), so it is $\\ge 0$. Hence $P(k) \\Rightarrow P(k+1)$. ${done}`, tex: `${kTex(need)} = ${kTex(shifted)} \\quad (k = ${n0} + j)` }
    : { text: `With $k = ${n0} + j$ this is $${kTex(shifted)}$; show it is $\\ge 0$ for $j \\ge 0$ (or use a different estimate) to finish the step.` });
  return steps;
}
