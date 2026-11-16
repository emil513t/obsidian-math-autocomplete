// \limit: the limit of a function at a point, decided and written out with
// the IMO26 book's own tools and wording only:
//   Definition 5.62 (limit, the ε-δ game of Remark 5.61), Definition 5.65
//   (continuous), Remark 5.77 + Proposition 5.75 (polynomials and quotients
//   of polynomials), Lemma 5.72 + Example 5.73 (x and y are continuous),
//   Proposition 5.74 (composition), Section 6.3.2 + Proposition 6.22 +
//   Remark 5.79 (e^x, log, sin, cos), Exercise 6.28 (x^a = e^{a log x}),
//   Example 5.63 (cancel x − a, Proposition 2.23), Exercise 5.64 + (5.19)
//   (the jump function: no limit), Exercise 5.80 (denominator 0, numerator
//   not 0), the hint to Exercise 5.31 (divide by a power as β → ∞),
//   Definition 6.17 / (6.4) / (7.4) and Example 7.6 (derivative as a limit),
//   Definition 4.12 (lines through the point, for two variables).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";

const T = (x, vars) => cas.tex(x, vars);
const Qn = (a, b = 1) => cas.num(a, b);
const qnum = (q) => q.n / q.d;
const paren = (s) => (/^[-\w.]+$|^\\frac\{[^{}]*\}\{[^{}]*\}$/.test(s) && !s.slice(1).includes("-") ? s : `\\left(${s}\\right)`);
const fracTex = (N, D, vars) => (cas.equal(D, cas.ONE) ? T(N, vars) : `\\frac{${T(N, vars)}}{${T(D, vars)}}`);

// ---------- expressions as numerator / denominator ----------

function atomX(a) {
  if (a.t === "sym") return cas.sym(a.name);
  if (a.t === "fn") return cas.fn(a.name, a.arg);
  if (a.t === "sum") return a.x;
  if (a.t === "nroot") return cas.num(a.v);
  throw new Error("unknown atom");
}
const qsum = (a, b) => cas.Q(a.n * b.d + b.n * a.d, a.d * b.d);

// f = N / D with D the product of all denominators (bases with a negative power).
export function fraction(x) {
  const den = new Map();
  for (const t of x.terms.values()) {
    for (const [k, { atom, e }] of t.f) {
      if (e.n >= 0 || atom.t === "nroot") continue;
      const ne = cas.Q(-e.n, e.d);
      const cur = den.get(k);
      if (!cur || qnum(ne) > qnum(cur.e)) den.set(k, { atom, e: ne });
    }
  }
  if (!den.size) return { N: x, D: cas.ONE, dens: [] };
  const parts = [];
  for (const t of x.terms.values()) {
    let term = cas.num(t.c);
    const own = new Map();
    for (const [k, { atom, e }] of t.f) {
      if (den.has(k) && e.n < 0) own.set(k, e);
      else term = cas.mul(term, cas.pow(atomX(atom), e));
    }
    for (const [k, { atom, e }] of den) {
      const rest = own.has(k) ? qsum(e, own.get(k)) : e;
      if (rest.n !== 0) term = cas.mul(term, cas.pow(atomX(atom), rest));
    }
    parts.push(term);
  }
  const dens = [...den.values()].map(({ atom, e }) => ({ base: atomX(atom), e }));
  const D = cas.mul(...dens.map((d) => cas.pow(d.base, d.e)));
  return { N: cas.add(...parts), D, dens };
}

// LaTeX as one fraction (\frac{x - 1}{x^2 + 1} instead of a sum of fractions).
export function nice(x, vars) {
  const fr = fraction(x);
  if (cas.equal(fr.D, cas.ONE) || fr.dens.some((d) => d.e.d !== 1)) return T(x, vars);
  const N = T(fr.N, vars); const D = fr.dens.length === 1 && fr.dens[0].e.n === 1 ? T(fr.D, vars) : fr.dens.map((d) => `\\left(${T(d.base, vars)}\\right)${d.e.n === 1 ? "" : `^{${d.e.n}}`}`).join("");
  return N.startsWith("-") && !N.slice(1).match(/ [-+] /) ? `-\\frac{${N.slice(1)}}{${D}}` : `\\frac{${N}}{${D}}`;
}

// Coefficients c[k] of v^k (expressions free of v), or null if not a polynomial in v.
export function coeffs(P, v) {
  const out = [];
  for (const t of P.terms.values()) {
    let k = 0;
    let rest = cas.num(t.c);
    for (const { atom, e } of t.f.values()) {
      if (atom.t === "sym" && atom.name === v) {
        if (e.d !== 1 || e.n < 0) return null;
        k = e.n;
      } else {
        const ax = atomX(atom);
        if (cas.symbols(ax).has(v)) return null;
        rest = cas.mul(rest, cas.pow(ax, e));
      }
    }
    out[k] = cas.add(out[k] || cas.ZERO, rest);
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i] || cas.ZERO;
  return out.length ? out : [cas.ZERO];
}
const fromCoeffs = (cs, v) => cas.add(...cs.map((c, k) => cas.mul(c, cas.pow(cas.sym(v), k))));
const degree = (cs) => { for (let k = cs.length - 1; k >= 0; k--) if (!cas.isZero(cs[k])) return k; return -1; };

// Division by (v − a) (Theorem 2.22): quotient coefficients and remainder.
function divLinear(cs, a) {
  const n = cs.length - 1;
  if (n < 1) return { q: [cas.ZERO], r: cs[0] || cas.ZERO };
  const q = new Array(n);
  q[n - 1] = cs[n];
  for (let k = n - 1; k >= 1; k--) q[k - 1] = cas.add(cs[k], cas.mul(a, q[k]));
  return { q, r: cas.add(cs[0], cas.mul(a, q[0])) };
}

// ---------- what the book proves continuous ----------

// The book's log is the logarithm with base e (Section 6.3.2): \log and \ln.
const BOOK_FNS = new Set(["exp", "ln", "log", "sin", "cos", "tan"]);

// Which kinds of building blocks f uses (for the continuity citation), or
// { bad } naming a function the book never proves continuous.
function blocks(x, out = { poly: true, quot: false, fns: new Set(), root: false, bad: null }) {
  for (const t of x.terms.values()) {
    for (const { atom, e } of t.f.values()) {
      if (e.n < 0) out.quot = true;
      if (e.d !== 1) out.root = true;
      if (atom.t === "fn") {
        if (!BOOK_FNS.has(atom.name)) out.bad = out.bad || atom.name;
        out.fns.add(atom.name);
        blocks(atom.arg, out);
      } else if (atom.t === "sum") blocks(atom.x, out);
    }
  }
  return out;
}

// A generic number for every symbol that is not a variable (so x0 + h with x
// general can still be checked for "not 0").
const GENERIC = [0.3719, 0.6143, 1.2871, 1.9033, 0.8471];
function envFor(x, env) {
  const out = { ...env };
  let i = 0;
  for (const s of cas.symbols(x)) if (!(s in out) && s !== "pi") out[s] = GENERIC[i++ % GENERIC.length];
  return out;
}
// Numbers use the book's log (base e) also where the note writes \log.
function bookLog(x) {
  const fix = (a) => (a.t === "fn" ? cas.fn(a.name === "log" ? "ln" : a.name, bookLog(a.arg)) : a.t === "sum" ? bookLog(a.x) : atomX(a));
  return cas.add(...[...x.terms.values()].map((t) => cas.mul(cas.num(t.c), ...[...t.f.values()].map(({ atom, e }) => cas.pow(fix(atom), e)))));
}
const value = (x, env) => { try { return cas.evaluate(bookLog(x), envFor(x, env)); } catch (_) { return NaN; } };
const exactAt = (x, map) => { try { return cas.subs(x, map); } catch (_) { return null; } };

// Every place where f's formula needs care at the point: denominators,
// log arguments, roots, tan. Returns the list of problems (empty = fine).
function trouble(x, map, env) {
  const out = [];
  const walk = (y) => {
    for (const t of y.terms.values()) {
      for (const { atom, e } of t.f.values()) {
        const ax = atomX(atom);
        if (atom.t === "sum") walk(atom.x);
        if (atom.t === "fn") walk(atom.arg);
        if (atom.t === "nroot") continue;
        const v = value(ax, env);
        if (e.n < 0 && Math.abs(v) < 1e-12) out.push({ kind: "zero", base: ax });
        if (e.d !== 1 && !(v > 1e-12)) out.push({ kind: "root", base: ax });
        if (atom.t === "fn" && (atom.name === "ln" || atom.name === "log") && !(value(atom.arg, env) > 1e-12)) out.push({ kind: "log", base: atom.arg });
        if (atom.t === "fn" && atom.name === "tan" && Math.abs(Math.cos(value(atom.arg, env))) < 1e-12) out.push({ kind: "tan", base: atom.arg });
      }
    }
  };
  walk(x);
  return out;
}

function continuityText(b, nvars) {
  const parts = [];
  if (nvars > 1) parts.push("the coordinate functions $x$, $y$, ... are continuous (Lemma 5.72, Example 5.73), and so are constants (Example 5.66)");
  parts.push(b.quot
    ? "the sum, the product and the quotient of continuous functions are continuous, the quotient where the denominator is not $0$ (Proposition 5.75), so every polynomial is continuous, and so is a quotient of polynomials where its denominator is not $0$ (Remark 5.77)"
    : "the sum and the product of continuous functions are continuous (Proposition 5.75), so every polynomial is continuous (Remark 5.77)");
  const fns = [...b.fns].filter((n) => n !== "tan");
  if (fns.length || b.fns.has("tan")) {
    const name = { exp: "e^x", ln: "\\log(x)", log: "\\log(x)", sin: "\\sin(x)", cos: "\\cos(x)" };
    const list = [...new Set([...fns, ...(b.fns.has("tan") ? ["sin", "cos"] : [])])].map((n) => `$${name[n]}$`).join(", ");
    parts.push(`${list} ${fns.length + (b.fns.has("tan") ? 2 : 0) > 1 ? "are" : "is"} differentiable (Section 6.3.2), hence continuous (Proposition 6.22, Remark 5.79)${b.fns.has("tan") ? `; $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ where $\\cos(x) \\neq 0$` : ""}`);
  }
  if (b.root) parts.push("$x^a = e^{a \\log(x)}$ for $x > 0$ is continuous (Exercise 6.28)");
  if (b.fns.size || b.root) parts.push("and a composition of continuous functions is continuous (Proposition 5.74)");
  return parts.join("; ");
}

// ---------- the point ----------

export function parsePointText(text, n = 1) {
  const s = String(text ?? "").trim();
  if (n === 1) {
    if (/^\+?\s*(\\infty|∞|oo|inf(inity)?)$/i.test(s)) return { inf: 1 };
    if (/^-\s*(\\infty|∞|oo|inf(inity)?)$/i.test(s)) return { inf: -1 };
    const x = cas.parse(s.replace(/^\s*[a-z]\s*(\\to|->|→)\s*/i, ""));
    return { xs: [x] };
  }
  const items = s.replace(/^\s*[([]|[)\]]\s*$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
  if (items.length !== n) throw new Error(`the point needs ${n} coordinates`);
  return { xs: items.map((t) => cas.parse(t)) };
}

const limTex = (vars, pt, body) => {
  if (pt.inf) return `\\lim_{${vars[0]} \\to ${pt.inf > 0 ? "" : "-"}\\infty} ${body}`;
  if (vars.length === 1) return `\\lim_{${vars[0]} \\to ${T(pt.xs[0])}} ${body}`;
  return `\\lim_{(${vars.join(", ")}) \\to (${pt.xs.map((x) => T(x)).join(", ")})} ${body}`;
};
const co = (c) => (cas.equal(c, cas.ONE) ? "" : `${T(c)}\\, `);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const numFmt = (y) => (Number.isFinite(y) ? String(Number(y.toPrecision(6))) : "\\text{--}");

// Values of f near the point (a check, never a proof).
function tableNear(F, pt) {
  const v = F.vars[0];
  const a = pt.inf ? null : value(pt.xs[0], {});
  const xs = pt.inf ? [10, 100, 1000, 10000].map((s) => s * pt.inf) : [0.1, 0.01, 0.001, -0.001, -0.01, -0.1].map((h) => a + h);
  const rows = xs.map((x) => `${numFmt(x)} & ${numFmt(value(F.x, { [v]: x }))}`);
  return `\\begin{array}{c|c} ${v} & ${F.name}(${v}) \\\\ \\hline ${rows.join(" \\\\ ")} \\end{array}`;
}

// ---------- one variable ----------

// Result: { kind: "value", w } | { kind: "none" } | { kind: "unknown" }.
// steps gets { text, tex } items in the book's words.
export function limit1(F, pt, steps, opts = {}) {
  const v = F.vars[0];
  const nm = F.name || "f";
  const fx = `${nm}(${v})`;
  if (pt.inf) return limitInf(F, pt, steps);
  const a = pt.xs[0];
  const map = { [v]: a };
  const env = { [v]: value(a, {}) };
  const aT = T(a);
  const b = blocks(F.x);
  const fr = fraction(F.x);
  const lim = limTex([v], pt, fx);
  if (b.bad) {
    steps.push({ text: `$${fx}$ uses $\\${b.bad}$, which the book never proves continuous, so its methods do not decide this limit. Values of $${nm}$ near $${v} = ${aT}$ (a check, not a proof):`, tex: tableNear(F, pt) });
    return { kind: "unknown" };
  }
  const tr = trouble(F.x, map, env);
  if (!tr.length) {
    // Continuous at a: the limit is the value (Definition 5.65).
    const w = exactAt(F.x, map);
    steps.push({ text: `${opts.quiet ? "" : "Is $" + nm + "$ continuous at $" + v + " = " + aT + "$? Yes: "}${opts.quiet ? cap(continuityText(b, 1)) : continuityText(b, 1)}.${fr.dens.length ? ` The denominator is not $0$ at $${v} = ${aT}$:` : ""}`, tex: fr.dens.length ? `${T(fr.D)} = ${T(exactAt(fr.D, map))} \\neq 0` : undefined });
    steps.push({ text: `So $${nm}$ is continuous at $${v} = ${aT}$, and by Definition 5.65 the limit is the value there: insert $${v} = ${aT}$.`, tex: `${lim} = ${nm}(${aT}) = ${T(w)}` });
    if (!opts.quiet) gameStep(F, a, w, steps);
    return { kind: "value", w };
  }
  const zero = tr.filter((p) => p.kind === "zero");
  const other = tr.filter((p) => p.kind !== "zero");
  if (other.length) {
    const p = other[0];
    steps.push({ text: `At $${v} = ${aT}$ the formula needs ${p.kind === "log" ? `$\\log$ of $${T(p.base)} = ${T(exactAt(p.base, map))}$, but $\\log(t)$ is defined only for $t > 0$` : p.kind === "root" ? `a root of $${T(p.base)} = ${T(exactAt(p.base, map))}$, and $x^a = e^{a\\log(x)}$ is defined (and continuous) only for $x > 0$ (Exercise 6.28)` : `$\\tan$ where $\\cos = 0$`}. The methods in these notes do not decide this limit. Values of $${nm}$ near $${v} = ${aT}$ (a check, not a proof):`, tex: tableNear(F, pt) });
    return { kind: "unknown" };
  }
  // A denominator is 0 at a.
  const Na = exactAt(fr.N, map);
  const Da = exactAt(fr.D, map);
  steps.push({ text: `Write $${nm}$ as one fraction. At $${v} = ${aT}$ the denominator is $0$, so the formula breaks down there and we cannot just insert $${v} = ${aT}$:`, tex: `${fx} = ${fracTex(fr.N, fr.D, [v])}, \\qquad ${T(fr.D)}\\big|_{${v} = ${aT}} = ${T(Da)}` });
  if (!trouble(fr.N, map, env).length && Math.abs(value(Na, {})) > 1e-12) return noLimitBlowUp(F, fr, a, Na, steps);
  // 0/0: cancel v − a (Example 5.63, Proposition 2.23).
  let cN = coeffs(fr.N, v);
  let cD = coeffs(fr.D, v);
  if (!cN || !cD) {
    steps.push({ text: `The numerator is also $0$ at $${v} = ${aT}$, and $${nm}$ is not a quotient of polynomials, so the method of Example 5.63 (the factor $${v} - ${paren(aT)}$ cancels) does not apply. Values of $${nm}$ near $${v} = ${aT}$ (a check, not a proof):`, tex: tableNear(F, pt) });
    return { kind: "unknown" };
  }
  const factor = cas.equal(a, cas.ZERO) ? v : `(${v} ${value(a, {}) < 0 ? "+" : "-"} ${T(value(a, {}) < 0 ? cas.neg(a) : a)})`;
  let k = 0;
  while (k < 12) {
    const dn = divLinear(cN, a);
    const dd = divLinear(cD, a);
    if (!cas.isZero(dn.r) || !cas.isZero(dd.r)) break;
    k++;
    steps.push({ text: `${k === 1 ? `Both the numerator and the denominator are $0$ at $${v} = ${aT}$ (as in Example 5.63), so $${aT}$ is a root of both and by Proposition 2.23 both can be written as $${factor}$ times a polynomial:` : `Still both are $0$ at $${v} = ${aT}$, so divide by $${factor}$ once more:`}`, tex: `\\begin{aligned} ${T(fromCoeffs(cN, v), [v])} &= ${factor}\\left(${T(fromCoeffs(dn.q, v), [v])}\\right) \\\\ ${T(fromCoeffs(cD, v), [v])} &= ${factor}\\left(${T(fromCoeffs(dd.q, v), [v])}\\right) \\end{aligned}` });
    cN = dn.q; cD = dd.q;
    const N1 = fromCoeffs(cN, v); const D1 = fromCoeffs(cD, v);
    steps.push({ text: `So for every $${v} \\neq ${aT}$ the factor $${factor}$ cancels. The limit only speaks about the values of $${nm}$ near $${aT}$, not at $${aT}$ (Example 5.63), so we may use the simpler formula:`, tex: `${fx} = \\frac{${factor}\\left(${T(N1, [v])}\\right)}{${factor}\\left(${T(D1, [v])}\\right)} = ${fracTex(N1, D1, [v])} \\quad \\text{for } ${v} \\neq ${aT}` });
    const N1a = exactAt(N1, map); const D1a = exactAt(D1, map);
    if (Math.abs(value(D1a, {})) > 1e-12) {
      const G = { name: "g", vars: [v], x: cas.div(N1, D1) };
      const w = exactAt(G.x, map);
      steps.push({ text: `The new denominator is $${T(D1a)} \\neq 0$ at $${v} = ${aT}$. The formula $g(${v}) = ${fracTex(N1, D1, [v])}$ is ${cas.equal(D1, cas.ONE) ? "a polynomial" : "a quotient of polynomials"}, so it is continuous at $${aT}$ (${cas.equal(D1, cas.ONE) ? "Remark 5.77" : "Remark 5.77, Proposition 5.75"}) and the limit is its value there (Definition 5.65):`, tex: `${lim} = ${limTex([v], pt, `\\left(${fracTex(N1, D1, [v])}\\right)`)} = ${T(w)}` });
      steps.push({ text: `Notice that the limit exists even though $${nm}(${aT})$ does not: the formula for $${nm}$ breaks down at $${aT}$ (as in Example 5.63).` });
      gameStep(G, a, w, steps, nm);
      return { kind: "value", w };
    }
    if (Math.abs(value(N1a, {})) > 1e-12) return noLimitBlowUp({ ...F, x: cas.div(N1, D1) }, { N: N1, D: D1 }, a, N1a, steps, true);
  }
  steps.push({ text: `The methods in these notes do not decide this limit. Values of $${nm}$ near $${v} = ${aT}$ (a check, not a proof):`, tex: tableNear(F, pt) });
  return { kind: "unknown" };
}

// Denominator 0, numerator not 0 (Exercise 5.80): no limit.
function noLimitBlowUp(F, fr, a, Na, steps, after = false) {
  const v = F.vars[0]; const nm = F.name || "f"; const aT = T(a);
  steps.push({ text: `${after ? "Now" : "Here"} the numerator is $${T(Na)} \\neq 0$ at $${v} = ${aT}$ while the denominator is $0$ (as for $\\lim_{x \\to 3} g(x)$ in Exercise 5.80). Near $${aT}$ the numerator stays close to $${T(Na)}$ (it is continuous, Definition 5.65), while the denominator comes as close to $0$ as we like. So $|${nm}(${v})|$ is unbounded near $${aT}$: it gets larger than any number. Values of $${nm}$ near $${v} = ${aT}$:`, tex: tableNear({ ...F, x: cas.div(fr.N, fr.D) }, { xs: [a] }) });
  steps.push({ text: `Then no number $w$ can be the limit. Play the ε–δ game (Remark 5.61) as the skeptic: demand $\\varepsilon = 1$. Whatever $\\delta > 0$ is offered, the strip $d(${v}, ${aT}) < \\delta$ contains inputs $${v}$ with $|${nm}(${v})| > |w| + 1$, and for them, by the triangle inequality (Section 5.5.1),`, tex: `d(${nm}(${v}), w) = |${nm}(${v}) - w| \\ge |${nm}(${v})| - |w| > 1 = \\varepsilon` });
  steps.push({ text: `So the negation of (5.20) holds for every candidate $w$: **the limit does not exist**.` });
  return { kind: "none" };
}

// The ε-δ game (Remark 5.61) for the simple cases the book plays itself.
function gameStep(G, a, w, steps, orig = null) {
  const v = G.vars[0];
  const cs = coeffs(G.x, v);
  if (!cs || cs.some((c) => cas.symbols(c).size)) return;
  const deg = degree(cs);
  const nm = orig || G.name || "f";
  if (deg <= 0) {
    steps.push({ text: `In the ε–δ game (Remark 5.61) any $\\delta > 0$ wins: ${orig ? `near $${T(a)}$, $${nm}$ is` : `$${nm}$ is`} the constant $${T(w)}$, so $d(${nm}(${v}), ${T(w)}) = 0 < \\varepsilon$ (as for $g(x) = c$ in Example 5.66).` });
  } else if (deg === 1) {
    const c = cs[1];
    const cv = cas.constValue(c);
    const absC = cv && cv.n < 0 ? cas.neg(c) : c;
    const dT = cas.equal(absC, cas.ONE) ? "\\varepsilon" : `\\frac{\\varepsilon}{${T(absC)}}`;
    steps.push({ text: `The ε–δ game (Remark 5.61) is easy to win here: if the skeptic demands $\\varepsilon$, answer $\\delta = ${dT}$, since for every $${v}${orig ? ` \\neq ${T(a)}` : ""}$ with $d(${v}, ${T(a)}) < \\delta$ (as in Example 5.63):`, tex: `d(${nm}(${v}), ${T(w)}) = |${T(G.x, [v])} - ${paren(T(w))}| = ${cas.equal(absC, cas.ONE) ? "" : T(absC)}|${v} - ${paren(T(a))}| < ${cas.equal(absC, cas.ONE) ? "\\varepsilon" : `${T(absC)} \\cdot ${dT} = \\varepsilon`}` });
  }
}

// x → ±∞ for a quotient of polynomials: divide by the highest power of the
// denominator (as in the hint to Exercise 5.31).
function limitInf(F, pt, steps) {
  const v = F.vars[0]; const nm = F.name || "f";
  const fr = fraction(F.x);
  const cN = coeffs(fr.N, v); const cD = coeffs(fr.D, v);
  const lim = limTex([v], pt, `${nm}(${v})`);
  const sgn = pt.inf > 0 ? "" : "-";
  steps.push({ text: `Definition 5.62 is about a point $v$; as $${v} \\to ${sgn}\\infty$ we follow the hint to Exercise 5.31 instead: divide the numerator and the denominator by a power of $${v}$, and use that $\\frac{c}{${v}^k}$ tends to $0$ as $${v} \\to ${sgn}\\infty$ for $k > 0$.` });
  if (!cN || !cD || cN.concat(cD).some((c) => cas.symbols(c).size)) {
    steps.push({ text: `$${nm}$ is not a quotient of polynomials with number coefficients, so this method does not decide it. Values for large $|${v}|$ (a check, not a proof):`, tex: tableNear(F, pt) });
    return { kind: "unknown" };
  }
  const n = degree(cN); const m = degree(cD);
  const vk = m === 1 ? v : `${v}^{${m}}`;
  const div = (cs) => cs.map((c, k) => ({ c, k: k - m })).filter((t) => !cas.isZero(t.c)).reverse()
    .map((t, i) => { const s = T(t.c); const neg = s.startsWith("-"); const body = neg ? s.slice(1) : s; const pw = t.k === 0 ? body : t.k > 0 ? `${body === "1" ? "" : body}${v}${t.k > 1 ? `^{${t.k}}` : ""}` : `\\frac{${body}}{${v}${t.k < -1 ? `^{${-t.k}}` : ""}}`; return `${i ? (neg ? " - " : " + ") : neg ? "-" : ""}${pw}`; }).join("");
  steps.push({ text: `The denominator has degree ${m}. Divide the numerator and the denominator by $${m ? vk : "1"}$:`, tex: `${nm}(${v}) = ${fracTex(fr.N, fr.D, [v])} = \\frac{${div(cN)}}{${div(cD)}}` });
  if (n < m) {
    steps.push({ text: `Every term in the numerator is $\\frac{c}{${v}^k}$ with $k > 0$, so it tends to $0$, while the denominator tends to $${T(cD[m])} \\neq 0$:`, tex: `${lim} = \\frac{0}{${T(cD[m])}} = 0` });
    return { kind: "value", w: cas.ZERO };
  }
  if (n === m) {
    const w = cas.div(cN[n], cD[m]);
    steps.push({ text: `All terms except the constants tend to $0$:`, tex: `${lim} = ${cas.equal(cD[m], cas.ONE) || `\\frac{${T(cN[n])}}{${T(cD[m])}}` === T(w) ? "" : `\\frac{${T(cN[n])}}{${T(cD[m])}} = `}${T(w)}` });
    return { kind: "value", w };
  }
  steps.push({ text: `The numerator still contains $${cas.equal(cN[n], cas.ONE) ? "" : cas.equal(cN[n], cas.neg(cas.ONE)) ? "-" : T(cN[n])}${v}${n - m > 1 ? `^{${n - m}}` : ""}$, which is unbounded as $${v} \\to ${sgn}\\infty$, while the denominator tends to $${T(cD[m])}$. So $|${nm}(${v})|$ gets larger than any number and **there is no limit** (the values are unbounded). Values for large $|${v}|$:`, tex: tableNear(F, pt) });
  return { kind: "none" };
}

// ---------- the jump case: different formulas for v < c and v > c ----------

// rows: [{ x: cas, cond: { op, c } | null (otherwise) }]
export function parseCases(value, v) {
  const rows = [];
  for (const [e, c] of value) {
    const t = String(c || "").replace(/\\text\{\s*(if|for|when)?\s*\}|\\text\{\s*(if|for|when)\s+|\\(?:quad|,)|\}$/g, " ").replace(/^\s*(if|for|when)\b/, "").trim();
    let cond = null;
    if (t && !/otherwise|else/.test(t)) {
      const m = t.replace(/\\leq?|≤|<=/g, "≤").replace(/\\geq?|≥|>=/g, "≥").replace(/\\lt/g, "<").replace(/\\gt/g, ">").match(new RegExp(`^${v}\\s*(≤|≥|<|>|=)\\s*(.+)$`));
      if (!m) throw new Error(`can't read the condition "${t}"`);
      cond = { op: m[1], c: cas.parse(m[2]) };
    }
    rows.push({ x: cas.parse(e), cond, tex: e });
  }
  return rows;
}
const holds = (cond, x) => {
  if (!cond) return true;
  const c = value(cond.c, {});
  return { "≤": x <= c, "≥": x >= c, "<": x < c, ">": x > c, "=": Math.abs(x - c) < 1e-12 }[cond.op];
};
const condTex = (cond, v) => (cond ? `${v} ${{ "≤": "\\le", "≥": "\\ge", "<": "<", ">": ">", "=": "=" }[cond.op]} ${T(cond.c)}` : "\\text{otherwise}");
const pick = (rows, x) => rows.findIndex((r, i) => holds(r.cond, x) && rows.slice(0, i).every((p) => !holds(p.cond, x)));

export function limitCases(name, v, rows, pt, steps) {
  const lim = limTex([v], pt, `${name}(${v})`);
  const casesTex = `${name}(${v}) = \\begin{cases} ${rows.map((r) => `${T(r.x, [v])} & \\text{if } ${condTex(r.cond, v)}`).join(" \\\\ ")} \\end{cases}`;
  if (pt.inf) {
    const i = pick(rows, pt.inf * 1e9);
    steps.push({ text: `For large $|${v}|$ only one formula is used:`, tex: casesTex });
    return limit1({ name, vars: [v], x: rows[i].x }, pt, steps);
  }
  const a = pt.xs[0]; const av = value(a, {}); const aT = T(a);
  const h = 1e-7;
  const L = pick(rows, av - h); const R = pick(rows, av + h);
  steps.push({ text: `$${name}$ is given by different formulas on different parts of its domain, like the jump function (5.19):`, tex: casesTex });
  if (L < 0 || R < 0) { steps.push({ text: `The conditions do not cover the inputs on both sides of $${aT}$.` }); return { kind: "unknown" }; }
  if (L === R) {
    steps.push({ text: `Near $${v} = ${aT}$ (on both sides) only the formula $${T(rows[L].x, [v])}$ is used, and the limit only speaks about the values near $${aT}$. So the limit is the limit of that formula:` });
    return limit1({ name, vars: [v], x: rows[L].x }, pt, steps, { quiet: false });
  }
  // Two formulas meet at a: find the value each one approaches.
  const sideSteps = [];
  const one = (i, side) => {
    const sub = [];
    const r = limit1({ name: `${name}_{${side}}`, vars: [v], x: rows[i].x }, pt, sub, { quiet: true });
    sideSteps.push({ side, i, r, sub });
    return r;
  };
  const rl = one(L, "1"); const rr = one(R, "2");
  steps.push({ text: `For $${v} < ${aT}$ the formula $${name}_1(${v}) = ${T(rows[L].x, [v])}$ is used and for $${v} > ${aT}$ the formula $${name}_2(${v}) = ${T(rows[R].x, [v])}$. Find the value each formula approaches at $${aT}$:` });
  for (const s of sideSteps) for (const st of s.sub) steps.push(st);
  if (rl.kind !== "value" || rr.kind !== "value") {
    if (rl.kind === "none" || rr.kind === "none") {
      steps.push({ text: `One side is unbounded near $${aT}$, so as above the skeptic wins with $\\varepsilon = 1$: **the limit does not exist**.` });
      return { kind: "none" };
    }
    steps.push({ text: `The methods in these notes do not decide one of the sides.` });
    return { kind: "unknown" };
  }
  const w1 = rl.w; const w2 = rr.w;
  if (Math.abs(value(w1, {}) - value(w2, {})) < 1e-12 && cas.equal(cas.sub(w1, w2), cas.ZERO)) {
    const fa = pick(rows, av) >= 0 ? exactAt(rows[pick(rows, av)].x, { [v]: a }) : null;
    steps.push({ text: `Both formulas approach the same value $${T(w1)}$. In the ε–δ game (Remark 5.61): if the skeptic demands $\\varepsilon$, take a $\\delta_1$ that works for the inputs $${v} < ${aT}$ and a $\\delta_2$ that works for $${v} > ${aT}$; then $\\delta = \\min(\\delta_1, \\delta_2)$ works for all inputs. So`, tex: `${lim} = ${T(w1)}` });
    if (fa) steps.push({ text: cas.equal(fa, w1) ? `Here $${name}(${aT}) = ${T(fa)}$ is the limit, so $${name}$ is continuous at $${aT}$ (Definition 5.65).` : `But $${name}(${aT}) = ${T(fa)} \\neq ${T(w1)}$, so $${name}$ is not continuous at $${aT}$ (Definition 5.65).` });
    return { kind: "value", w: w1 };
  }
  const gap = cas.sub(w2, w1);
  const gv = Math.abs(value(gap, {}));
  const eps = cas.div(cas.constValue(gap) && cas.constValue(gap).n < 0 ? cas.neg(gap) : gap, Qn(4));
  steps.push({ text: `The two formulas approach different values, $${T(w1)}$ and $${T(w2)}$, with $d(${T(w1)}, ${T(w2)}) = ${numFmt(gv)}$. Play the skeptic, as in the hint to Exercise 5.64: whichever candidate limit $w$ is proposed, demand $\\varepsilon = ${T(eps)}$ ($\\frac{1}{4}$ of the distance). Every $\\delta$-strip around $${aT}$ contains inputs $u_1 < ${aT}$ with $d(${name}(u_1), ${T(w1)}) < \\varepsilon$ and inputs $u_2 > ${aT}$ with $d(${name}(u_2), ${T(w2)}) < \\varepsilon$. Both cannot be within $\\varepsilon$ of $w$, since then the triangle inequality (Section 5.5.1) would give`, tex: `d(${T(w1)}, ${T(w2)}) \\le d(${T(w1)}, ${name}(u_1)) + d(${name}(u_1), w) + d(w, ${name}(u_2)) + d(${name}(u_2), ${T(w2)}) < 4\\varepsilon = d(${T(w1)}, ${T(w2)})` });
  steps.push({ text: `which is false. So **the limit does not exist**, and $${name}$ is not continuous at $${aT}$ (Definition 5.65).` });
  return { kind: "none" };
}

// ---------- several variables ----------

export function limitN(F, pt, steps) {
  const vars = F.vars; const nm = F.name || "f";
  const map = Object.fromEntries(vars.map((x, i) => [x, pt.xs[i]]));
  const env = Object.fromEntries(vars.map((x, i) => [x, value(pt.xs[i], {})]));
  const pT = `(${pt.xs.map((x) => T(x)).join(", ")})`;
  const fx = `${nm}(${vars.join(", ")})`;
  const lim = limTex(vars, pt, fx);
  const b = blocks(F.x);
  if (b.bad) { steps.push({ text: `$${fx}$ uses $\\${b.bad}$, which the book never proves continuous, so its methods do not decide this limit.` }); return { kind: "unknown" }; }
  const tr = trouble(F.x, map, env);
  const fr = fraction(F.x);
  if (!tr.length) {
    const w = exactAt(F.x, map);
    steps.push({ text: `Is $${nm}$ continuous at $${pT}$? Yes: ${continuityText(b, vars.length)}.${fr.dens.length ? ` The denominator is not $0$ at $${pT}$:` : ""}`, tex: fr.dens.length ? `${T(fr.D, vars)} = ${T(exactAt(fr.D, map))} \\neq 0` : undefined });
    steps.push({ text: `So $${nm}$ is continuous at $${pT}$ (as in Exercise 5.76), and by Definition 5.65 the limit is the value there:`, tex: `${lim} = ${nm}${pT} = ${T(w)}` });
    return { kind: "value", w };
  }
  if (tr.some((p) => p.kind !== "zero")) { steps.push({ text: `At $${pT}$ the formula needs a $\\log$ or a root of a number that is not $> 0$; the methods in these notes do not decide this limit.` }); return { kind: "unknown" }; }
  steps.push({ text: `Write $${nm}$ as one fraction. At $${pT}$ the denominator is $0$, so we cannot just insert the point:`, tex: `${fx} = ${fracTex(fr.N, fr.D, vars)}, \\qquad ${T(fr.D, vars)}\\big|_{${pT}} = ${T(exactAt(fr.D, map))}` });
  if (vars.length !== 2) { steps.push({ text: `With more than two variables the methods in these notes do not decide this limit.` }); return { kind: "unknown" }; }
  const [x, y] = vars; const [a, bb] = pt.xs;
  const t = "t";
  // Inputs on a family of curves through the point, parametrized by t → 0.
  const family = (label, ux, uy, dist) => {
    const g = cas.subs(fr.N, { [x]: ux, [y]: uy }); const h = cas.subs(fr.D, { [x]: ux, [y]: uy });
    const cN = coeffs(g, t); const cD = coeffs(h, t);
    if (!cN || !cD) return null;
    const low = (cs) => cs.findIndex((c) => !cas.isZero(c));
    const kN = low(cN); const kD = low(cD);
    if (kD < 0) return null;
    let w = null; let blow = false;
    if (kN < 0) w = cas.ZERO;
    else if (kN > kD) w = cas.ZERO;
    else if (kN === kD) w = cas.div(cN[kN], cD[kD]);
    else blow = true;
    return { label, g, h, kN, kD, w, blow, ux, uy, dist };
  };
  const m = "m";
  const tT = (e) => T(e, [t, m]);
  const line = family(`the line through $${pT}$ with direction $(1, m)$`, cas.add(a, cas.sym(t)), cas.add(bb, cas.mul(cas.sym(m), cas.sym(t))), `|t|\\sqrt{1 + m^2}`);
  const vert = family(`the line through $${pT}$ with direction $(0, 1)$`, a, cas.add(bb, cas.sym(t)), "|t|");
  const showFam = (F2) => `\\begin{aligned} u &= (${tT(F2.ux)}, ${tT(F2.uy)}), \\quad d(u, ${pT}) = ${F2.dist} \\\\ ${nm}(u) &= ${fracTex(F2.g, F2.h, [t, m])} \\end{aligned}`;
  steps.push({ text: `The limit must hold for every input $u$ near $${pT}$ (Definition 5.62), in particular for the inputs on a line through the point (Definition 4.12). Take $u = ${pT} + t(1, m)$, which is within $\\delta$ of $${pT}$ when $|t|$ is small:`, tex: line ? showFam(line) : undefined });
  if (!line || !vert) { steps.push({ text: `The methods in these notes do not decide this limit.` }); return { kind: "unknown" }; }
  const famText = (F2) => (F2.kN < 0 ? `the numerator is $0$, so $${nm}(u) = 0$ for every $t \\neq 0$` : F2.blow ? `the smallest power of $t$ in the denominator is higher than in the numerator, so the values are unbounded` : `the smallest power of $t$ is $t^{${F2.kD}}$ in the denominator${F2.kN >= 0 ? ` and $t^{${F2.kN}}$ in the numerator` : ""}; for $t \\neq 0$ the factor $t^{${F2.kD}}$ cancels, then insert $t = 0$`);
  steps.push({ text: `On these inputs ${famText(line)}${line.w ? ":" : "."}`, tex: line.w ? `${nm}(u) \\to ${T(line.w, [m])} \\quad \\text{as } t \\to 0` : undefined });
  if (line.blow) { steps.push({ text: `So $|${nm}|$ is unbounded near $${pT}$ and, as in the one variable case (Exercise 5.80), the skeptic wins with $\\varepsilon = 1$: **the limit does not exist**.` }); return { kind: "none" }; }
  const values = [];
  if (cas.symbols(line.w).has(m)) {
    const w0 = cas.subs(line.w, { [m]: cas.ZERO }); const w1 = cas.subs(line.w, { [m]: cas.ONE });
    if (!cas.equal(w0, w1)) values.push({ a: "$m = 0$", wa: w0, b: "$m = 1$", wb: w1 });
  }
  steps.push({ text: `On the line with direction $(0, 1)$: ${famText(vert)}.`, tex: `${showFam(vert)} \\to ${vert.w ? T(vert.w) : "\\text{unbounded}"}` });
  if (vert.blow) { steps.push({ text: `So the values are unbounded near $${pT}$: **the limit does not exist**.` }); return { kind: "none" }; }
  const w = cas.symbols(line.w).has(m) ? cas.subs(line.w, { [m]: cas.ZERO }) : line.w;
  if (!values.length && !cas.equal(w, vert.w)) values.push({ a: "direction $(1, m)$", wa: w, b: "direction $(0, 1)$", wb: vert.w });
  let curve = null;
  if (!values.length) {
    curve = family(`the curve through $${pT}$`, cas.add(a, cas.mul(cas.sym(m), cas.pow(cas.sym(t), 2))), cas.add(bb, cas.sym(t)), `|t|\\sqrt{1 + m^2 t^2}`);
    if (curve) {
      steps.push({ text: `Every line gives $${T(w)}$. Try inputs on curves through the point too: $u = (${tT(curve.ux)}, ${tT(curve.uy)})$, also within $\\delta$ of $${pT}$ for small $|t|$. Here ${famText(curve)}${curve.w ? ":" : "."}`, tex: curve.w ? `\\begin{aligned} ${nm}(u) &= ${fracTex(curve.g, curve.h, [t, m])} \\\\ &\\to ${T(curve.w, [m])} \\quad \\text{as } t \\to 0 \\end{aligned}` : undefined });
      if (curve.blow) { steps.push({ text: `So the values are unbounded near $${pT}$: **the limit does not exist**.` }); return { kind: "none" }; }
      const c1 = cas.subs(curve.w, { [m]: cas.ONE });
      if (!cas.equal(c1, w)) values.push({ a: "the lines", wa: w, b: "the curve with $m = 1$", wb: c1 });
    }
  }
  if (values.length) {
    const { a: la, wa, b: lb, wb } = values[0];
    const gap = cas.sub(wb, wa); const gv = Math.abs(value(gap, {}));
    const eps = cas.div(cas.constValue(gap) && cas.constValue(gap).n < 0 ? cas.neg(gap) : gap, Qn(4));
    steps.push({ text: `Two kinds of inputs approach different values: ${la} gives $${T(wa)}$ and ${lb} gives $${T(wb)}$. As in the hint to Exercise 5.64, play the skeptic: whichever $w$ is proposed, demand $\\varepsilon = ${T(eps)}$. Every $\\delta$-ball around $${pT}$ contains inputs of both kinds with values within $\\varepsilon$ of $${T(wa)}$ and of $${T(wb)}$, and both cannot be within $\\varepsilon$ of $w$ (triangle inequality, Section 5.5.1: $d(${T(wa)}, ${T(wb)}) < 4\\varepsilon = ${numFmt(gv)}$ would be false). So **the limit does not exist**.` });
    return { kind: "none" };
  }
  const est = cas.isZero(w) ? estimateZero(fr, x, y, a, bb, pT, nm) : null;
  if (est) {
    steps.push({ text: `Every line and curve used above gives $0$, so $0$ is the only possible limit. Prove it with Definition 5.62. Write $r = d(u, ${pT})$ for $u = (${x}, ${y})$; then $|${T(est.X)}| \\le r$ and $|${T(est.Y)}| \\le r$ (by (5.4)). The denominator is at least $${co(est.k)}r^2 = ${co(est.k)}\\left((${T(est.X)})^2 + (${T(est.Y)})^2\\right)$, and every term of the numerator has degree at least 3, so for $r \\le 1$ (using $|${T(est.X)}|^i |${T(est.Y)}|^j \\le r^{i+j} \\le r^3$):`, tex: `|${nm}(u) - 0| = \\frac{|${T(fr.N, vars)}|}{${T(fr.D, vars)}} \\le \\frac{${co(est.S)}r^3}{${co(est.k)}r^2} = ${co(est.C)}r` });
    steps.push({ text: `So the ε–δ game (Remark 5.61) is won by answering $\\delta = \\min\\left(1, ${cas.equal(est.C, cas.ONE) ? "\\varepsilon" : `\\frac{\\varepsilon}{${T(est.C)}}`}\\right)$: then $d(u, ${pT}) < \\delta$ gives $d(${nm}(u), 0) \\le ${co(est.C)}r < \\varepsilon$. So`, tex: `${lim} = 0` });
    return { kind: "value", w: cas.ZERO };
  }
  steps.push({ text: `Every line and curve used above gives $${T(w)}$, so $${T(w)}$ is the only possible limit. This does **not** prove that the limit is $${T(w)}$: Definition 5.62 needs every input $u$ near $${pT}$, not only those on the lines and curves used above. The methods in these notes do not decide this limit.` });
  return { kind: "unknown", w };
}

// The bound |N| / D <= C r for D = k1 X^2 + k2 Y^2 (k1, k2 > 0) and N a
// polynomial in X = x − a, Y = y − b whose terms all have degree >= 3.
function estimateZero(fr, x, y, a, b, pT, nm) {
  const X = cas.sub(cas.sym(x), a); const Y = cas.sub(cas.sym(y), b);
  const shift = (P) => cas.subs(P, { [x]: cas.add(cas.sym("X"), a), [y]: cas.add(cas.sym("Y"), b) });
  const terms = (P) => {
    const out = [];
    for (const t of P.terms.values()) {
      let i = 0; let j = 0;
      for (const { atom, e } of t.f.values()) {
        if (atom.t !== "sym" || e.d !== 1 || e.n < 0) return null;
        if (atom.name === "X") i = e.n; else if (atom.name === "Y") j = e.n; else return null;
      }
      out.push({ c: t.c, i, j });
    }
    return out;
  };
  const nT = terms(shift(fr.N)); const dT = terms(shift(fr.D));
  if (!nT || !dT || dT.length !== 2 || !nT.length) return null;
  const k1 = dT.find((t) => t.i === 2 && t.j === 0); const k2 = dT.find((t) => t.i === 0 && t.j === 2);
  if (!k1 || !k2 || k1.c.n <= 0 || k2.c.n <= 0) return null;
  if (nT.some((t) => t.i + t.j < 3)) return null;
  const k = qnum(k1.c) <= qnum(k2.c) ? cas.num(k1.c) : cas.num(k2.c);
  const S = cas.add(...nT.map((t) => cas.num(cas.Q(Math.abs(t.c.n), t.c.d))));
  return { X, Y, k, S, C: cas.div(S, k) };
}

// ---------- derivative as a limit ((6.4), (7.4), Example 7.6) ----------

export function derivativeLimit(F, x0, steps, wrt = null) {
  const vars = F.vars; const nm = F.name || "f";
  const h = "h";
  const k = wrt ? vars.indexOf(wrt) : 0;
  const v = vars[k];
  const pt = x0;
  const at = Object.fromEntries(vars.map((x, i) => [x, pt[i]]));
  const shifted = { ...at, [v]: cas.add(pt[k], cas.sym(h)) };
  const fh = cas.subs(F.x, shifted); const f0 = cas.subs(F.x, at);
  const plusH = (p) => (cas.isZero(p) ? "h" : `${T(p)} + h`);
  const ptT = pt.map((x) => T(x)).join(", ");
  const argH = vars.map((x, i) => (i === k ? plusH(pt[i]) : T(pt[i]))).join(", ");
  const lhs = vars.length === 1 ? `${nm}'(${ptT})` : `\\frac{\\partial ${nm}}{\\partial ${v}}(${ptT})`;
  steps.push({ text: vars.length === 1
    ? `Dividing (6.4) in Definition 6.17 by $h$ gives the derivative as a limit of slopes (Section 6.3.1, (7.4)): $${nm}'(x_0) = \\lim_{h \\to 0} \\frac{${nm}(x_0 + h) - ${nm}(x_0)}{h}$. Here $x_0 = ${ptT}$:`
    : `By Definition 7.4 the partial derivative with respect to $${v}$ is the derivative of $${nm}$ in $${v}$ with the other variables as constants (Remark 7.5), so by (7.4), as in Example 7.6:`, tex: `${lhs} = \\lim_{h \\to 0} \\frac{${nm}(${argH}) - ${nm}(${ptT})}{h}` });
  // The numerator f(x0 + h) − f(x0) as one fraction N / D; q = N / (D h).
  const fr = fraction(cas.sub(fh, f0));
  const cN = coeffs(fr.N, h); const cD = coeffs(fr.D, h);
  const lim0 = (G) => { const sub = []; const r = limit1(G, { xs: [cas.ZERO] }, sub, { quiet: true }); return { r, sub }; };
  if (cN && cD && cas.isZero(cN[0]) && cas.isZero(cas.subs(fr.D, { [h]: cas.ZERO })) === false) {
    const N1 = fromCoeffs(cN.slice(1), h);
    // The denominator kept as the product of the two denominators.
    const Dfac = fr.dens.map((d) => `\\left(${T(d.base, [h])}\\right)${d.e.n === 1 && d.e.d === 1 ? "" : `^{${d.e.n}}`}`).join("");
    const one = cas.equal(fr.D, cas.ONE);
    const Dt = (body) => (one ? `\\frac{${body}}{h}` : `\\frac{${body}}{h${Dfac}}`);
    const first = one ? Dt(`${T(fh, [h])} - ${paren(T(f0))}`) : `\\frac{1}{h}\\left(${nice(fh, [h])} - ${nice(f0)}\\right)`;
    steps.push({ text: `Insert and expand the numerator${one ? "" : " (as one fraction)"}. Every term contains $h$, so for $h \\neq 0$ the factor $h$ cancels; the limit only speaks about $h$ near $0$ (Example 5.63):`, tex: `\\begin{aligned} \\frac{${nm}(${argH}) - ${nm}(${ptT})}{h} &= ${first} \\\\ &= ${Dt(T(fr.N, [h]))} = ${Dt(`h\\left(${T(N1, [h])}\\right)`)} \\\\ &= ${one ? T(N1, [h]) : `\\frac{${T(N1, [h])}}{${Dfac}}`} \\quad \\text{for } h \\neq 0 \\end{aligned}` });
    const G = { name: "g", vars: [h], x: cas.div(N1, fr.D) };
    const { r, sub } = lim0(G);
    if (r.kind === "value") {
      const gb = blocks(G.x);
      steps.push({ text: `The formula left is ${cas.equal(fr.D, cas.ONE) && !gb.fns.size && !gb.root ? "a polynomial in $h$, so it is continuous (Remark 5.77)" : `continuous at $h = 0$: ${continuityText(gb, 1)}`}. So insert $h = 0$ (Definition 5.65):`, tex: `${lhs} = \\lim_{h \\to 0} ${one ? `\\left(${T(N1, [h])}\\right)` : `\\frac{${T(N1, [h])}}{${Dfac}}`} = ${nice(r.w)}` });
      return { kind: "value", w: r.w };
    }
    for (const s of sub) steps.push(s);
    return r;
  }
  const { r, sub } = lim0({ name: "q", vars: [h], x: cas.div(cas.sub(fh, f0), cas.sym(h)) });
  for (const s of sub) steps.push(s);
  if (r.kind === "value") steps.push({ text: `So`, tex: `${lhs} = ${T(r.w)}` });
  return r;
}

// ---------- entry points used by the \limit object ----------

// Answer line for the note: \lim_{x \to a} f(x) = w  /  ... does not exist.
export function limitAnswer(F, pt, r, bodyTex) {
  const lim = limTex(F.vars, pt, bodyTex);
  if (r.kind === "value") return `${lim} = ${nice(r.w)}`;
  if (r.kind === "none") return `${lim} \\text{ does not exist}`;
  return `${lim} = \\ ?`;
}

export function limitOf(F, pt, steps = []) {
  if (F.vars.length <= 1) {
    const G = F.vars.length ? F : { ...F, vars: ["x"] };
    return limit1(G, pt, steps);
  }
  return limitN(F, pt, steps);
}
