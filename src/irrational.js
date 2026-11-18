// E10 of docs/imo26-coverage/CONTRADICTIONS.md: no rational ξ with ξ^n = m
// (√2, ∛2 in Ex 5.82, √3, √6, √8, ...), proved the way Example 1.83 proves √2
// irrational: write ξ = a/b with no common divisor (Definition 1.54), get
// a^n = m b^n, show a prime p divides a, write a = pk, and show p divides b.
// "p divides c·x^n, so p divides x" is shown by the remainder computation of
// Example 1.80 (x = ps + t, t = 1, ..., p − 1, and c t^n is never divisible by p);
// for p = 2 that is "a product of odd numbers is odd" (Example 1.80, Exercise 1.81).
// Also the other ending: m a perfect n-th power, so ξ is rational after all.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { mainFn } from "./textlink.js";
import { coeffs } from "./limit.js";

const T = (x) => cas.tex(x);
const pw = (x, n) => (n === 1 ? x : `${x}^{${n}}`);
const mod = (a, p) => ((a % p) + p) % p;

function factor(m) {
  const out = new Map(); let x = Math.abs(m);
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { out.set(p, (out.get(p) || 0) + 1); x /= p; }
  if (x > 1) out.set(x, (out.get(x) || 0) + 1);
  return out;
}
// Integer n-th root of m when m is a perfect n-th power, else null.
function nthRoot(m, n) {
  const s = Math.sign(m); const r = Math.round(Math.abs(m) ** (1 / n));
  for (const c of [r - 1, r, r + 1]) if (c >= 0 && c ** n === Math.abs(m)) return s < 0 && n % 2 === 0 ? null : s * c;
  return null;
}

// ξ^n = m from the note: xi = \sqrt{2}, \sqrt[3]{2}, 2^{1/3}, or f(x) = x^n - m.
export function noteRoot(vars, ctx = {}) {
  if (!(vars instanceof Map)) return null;
  for (const v of vars.values()) {
    if (v.error || v.kind !== "scalar" || v.params) continue;
    const s = String(v.value).replace(/\s+/g, "");
    let m = s.match(/^\\sqrt(?:\[(\d+)\])?\{(-?\d+)\}$/);
    if (m) return { n: Number(m[1] || 2), m: Number(m[2]), name: v.name, tex: v.value, from: `@${v.name}` };
    m = s.match(/^\(?(-?\d+)\)?\^\{?(?:\\frac\{1\}\{(\d+)\}|1\/(\d+))\}?$/);
    if (m) return { n: Number(m[2] || m[3]), m: Number(m[1]), name: v.name, tex: v.value, from: `@${v.name}` };
  }
  const F = mainFn(vars, ctx);
  if (F && F.vars.length === 1) {
    const cs = coeffs(F.x, F.vars[0]);
    if (cs && cs.every((c) => { const q = cas.constValue(c); return q && q.d === 1; })) {
      const n = cs.length - 1;
      const nz = cs.map((c, k) => (cas.isZero(c) ? -1 : k)).filter((k) => k >= 0);
      const lead = cas.constValue(cs[n]).n;
      if (n >= 2 && nz.length === 2 && nz[0] === 0 && lead === 1) return { n, m: -cas.constValue(cs[0]).n, name: F.v.name, f: F, from: `@${F.v.name}` };
    }
  }
  return null;
}

// "p divides c·x^n, so p divides x", as Example 1.80 computes it.
function divides(p, c, x, n) {
  const cx = `${c === 1 ? "" : c === -1 ? "-" : c}${pw(x, n)}`;
  if (p === 2) return `if $${x}$ were odd, $${cx}$ would be odd too, since a product of odd numbers is odd (Example 1.80, Exercise 1.81)`;
  const rs = Array.from({ length: p - 1 }, (_, i) => mod(c * (i + 1) ** n, p));
  const ts = p <= 5 ? Array.from({ length: p - 1 }, (_, i) => i + 1).join(", ") : `1, \\dots, ${p - 1}`;
  return `if $${p}$ did not divide $${x}$, then $${x} = ${p}s + t$ with $t \\in \\{${ts}\\}$ and $${cx} = ${p}(\\dots) + ${c === 1 ? "" : c}t^{${n}}$ as in Example 1.80; but $${c === 1 ? "" : c}t^{${n}}$ leaves the remainder $${rs.join(", ")}$ when divided by $${p}$ (for $t = ${Array.from({ length: p - 1 }, (_, i) => i + 1).join(", ")}$), never $0$`;
}

// The proof for ξ^n = m, or { rational } when m is a perfect n-th power.
export function irrationalProof(R) {
  const { n, m } = R;
  if (m === 0) return null;
  if (m < 0 && n % 2 === 0) return { noReal: true };
  const root = nthRoot(m, n);
  if (root !== null) return { rational: root };
  const fs = factor(m);
  const p = [...fs.keys()].find((q) => fs.get(q) % n !== 0);
  let v = fs.get(p);
  const names = ["a", "k", "l", "j", "i"];
  let M = m; let X = "a"; let step = 0;
  const parts = [];
  const whyA = `$${p}$ divides the right side, and ${divides(p, 1, "a", n)}`;
  // a = p k, (p k)^n = M b^n; divide while p^n still divides M.
  for (;;) {
    const Y = names[++step] || `k_${step}`;
    const pn = p ** n;
    if (v >= n) {
      M /= pn; v -= n;
      parts.push(`$(${p}${Y})^{${n}} = ${M * pn}b^{${n}}$, i.e. $${pw(Y, n)} = ${M === 1 ? "" : M === -1 ? "-" : M}b^{${n}}$ after dividing by $${pn}$; as for $${X}$, $${p}$ divides $${Y}$, so write $${Y} = ${p}${names[step + 1] || `k_${step + 1}`}$`);
      X = Y;
      continue;
    }
    // Now p divides M exactly v < n times: divide by p^v.
    const left = p ** (n - v); const Mp = M / p ** v;
    parts.push(`$(${p}${Y})^{${n}} = ${M}b^{${n}}$, i.e. $${left}${pw(Y, n)} = ${Mp === 1 ? "" : Mp === -1 ? "-" : Mp}b^{${n}}$ after dividing by $${p ** v}$. The left side is divisible by $${p}$, so $${p}$ divides $${Mp === 1 ? "" : Mp}b^{${n}}$; ${divides(p, Mp, "b", n)}`);
    break;
  }
  return { p, n, m, eqXi: `\\xi^{${n}} = ${m}`, eqAB: `a^{${n}} = ${m}b^{${n}}`, whyA, substitute: parts.join(". Then "), firstVar: "k" };
}

// Template blanks of \irrational. undefined: not one of these blanks.
export function resolveIrrationalLabel(label, vars, ctx = {}) {
  const l = label.trim();
  const body = ctx.body || "";
  const lowest = /have no common divisor \(Definition 1\.54\)/.test(body);
  const after = /so it is rational \(Definition 1\.54\)/.test(body);
  if (!(lowest && /^(equation in xi|equation in a, b|p|why p divides a|substitute)$/.test(l)) && !(after && /^(number|simplify|a|b)$/.test(l))) return undefined;
  const R = noteRoot(vars, ctx);
  if (!R) return null;
  const P = irrationalProof(R);
  if (!P || P.noReal) return null;
  const from = `${R.from}: ξ^${R.n} = ${R.m}`;
  if (after) {
    if (P.rational === undefined) return null;
    if (l === "number") return { value: R.tex || `\\sqrt[${R.n}]{${R.m}}`, from };
    if (l === "simplify") return { value: `\\sqrt[${R.n}]{${P.rational}^{${R.n}}}`.replace("\\sqrt[2]", "\\sqrt"), from };
    return { value: String(l === "a" ? P.rational : 1), from };
  }
  if (P.rational !== undefined) return null;
  if (l === "equation in xi") return { value: R.f ? `${R.name}(\\xi) = 0, \\text{ i.e. } ${P.eqXi}` : P.eqXi, from };
  if (l === "equation in a, b") return { value: `\\frac{a^{${P.n}}}{b^{${P.n}}} = ${P.m} \\iff ${P.eqAB}`, from };
  if (l === "p") return { value: String(P.p), from: `${from}: ${P.p} divides ${P.m}` };
  if (l === "why p divides a") return { value: P.whyA, prose: true, from };
  return { value: P.substitute, prose: true, from };
}

export function irrationalVerdict(vars, ctx = {}) {
  const R = noteRoot(vars, ctx);
  if (!R) return null;
  const P = irrationalProof(R);
  if (!P || P.noReal) return null;
  return P.rational !== undefined ? { rational: P.rational } : { irrational: true, p: P.p };
}
