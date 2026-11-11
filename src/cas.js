// A small exact computer-algebra core, offline and dependency free, so the
// vars block and the math popup can compute Hessians, gradients, inverses, ...
// from the note's own variables.
//
// An expression is kept in one canonical form: a sum of terms, each term an
// exact rational coefficient times a product of atoms raised to rational
// powers. Atoms are symbols, function calls (sin(u), exp(u), ...) and sums
// that cannot be expanded (e.g. (x + y)^{-1}, (x^2 + 1)^{1/2}). Products of
// sums are always expanded, so equal expressions get equal keys.

// ---------- exact rationals ----------

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function Q(n, d = 1) {
  if (d === 0) throw new Error("division by zero");
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
const qneg = (a) => ({ n: -a.n, d: a.d });
const qzero = (a) => a.n === 0;
const qone = (a) => a.n === 1 && a.d === 1;
const qint = (a) => a.d === 1;
const qkey = (a) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);

function fromDecimal(s) {
  if (!s.includes(".")) return Q(Number(s));
  const [i, f] = s.split(".");
  const d = 10 ** f.length;
  return Q(Number(i || "0") * d + Number(f) * (s.trim().startsWith("-") ? -1 : 1), d);
}

// Integer root of a rational if it is exact: (4/9)^(1/2) = 2/3.
function qroot(a, k) {
  if (a.n < 0 && k % 2 === 0) return null;
  const r = (x) => {
    const s = Math.sign(x) * Math.round(Math.abs(x) ** (1 / k));
    return s ** k === x ? s : null;
  };
  const n = r(a.n);
  const d = r(a.d);
  return n === null || d === null ? null : Q(n, d);
}

function qpow(a, e) {
  // e is a rational exponent; returns a rational or null if not exact.
  let base = a;
  if (e.n < 0) {
    if (qzero(a)) throw new Error("division by zero");
    base = Q(a.d, a.n);
  }
  const p = Math.abs(e.n);
  if (p > 64) return null;
  let out = Q(1);
  for (let i = 0; i < p; i++) out = qmul(out, base);
  if (e.d === 1) return out;
  return qroot(out, e.d);
}

// ---------- expressions ----------
// expr = { terms: Map<key, { c: Q, f: Map<atomKey, { atom, e: Q }> }> }

const EMPTY = () => ({ terms: new Map() });

function monoKey(f) {
  return [...f.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, x]) => (qone(x.e) ? k : `${k}^${qkey(x.e)}`)).join("*");
}

function addTerm(out, c, f) {
  if (qzero(c)) return;
  const k = monoKey(f);
  const prev = out.terms.get(k);
  if (prev) {
    const s = qadd(prev.c, c);
    if (qzero(s)) out.terms.delete(k);
    else prev.c = s;
  } else {
    out.terms.set(k, { c, f: new Map(f) });
  }
}

export function num(n, d = 1) {
  const out = EMPTY();
  addTerm(out, typeof n === "object" ? n : Q(n, d), new Map());
  return out;
}

export const ZERO = num(0);
export const ONE = num(1);

function atomExpr(atom, e = Q(1)) {
  const out = EMPTY();
  addTerm(out, Q(1), new Map([[atomKey(atom), { atom, e }]]));
  return out;
}

export function sym(name) {
  return atomExpr({ t: "sym", name });
}

function atomKey(a) {
  if (a.t === "sym") return a.name;
  if (a.t === "fn") return `${a.name}(${key(a.arg)})`;
  if (a.t === "sum") return `(${key(a.x)})`;
  if (a.t === "nroot") return `#${qkey(a.v)}`;
  return "?";
}

export function key(x) {
  return [...x.terms.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, t]) => `${qkey(t.c)}${k ? "*" + k : ""}`).join("+") || "0";
}

export const isZero = (x) => x.terms.size === 0;
export const equal = (a, b) => key(a) === key(b);

// The value if x is a plain number, else null.
export function constValue(x) {
  if (x.terms.size === 0) return Q(0);
  if (x.terms.size !== 1) return null;
  const [t] = x.terms.values();
  return t.f.size === 0 ? t.c : null;
}

export function add(...xs) {
  const out = EMPTY();
  for (const x of xs) for (const t of x.terms.values()) addTerm(out, t.c, t.f);
  return out;
}

export function scale(x, c) {
  const out = EMPTY();
  for (const t of x.terms.values()) addTerm(out, qmul(t.c, c), t.f);
  return out;
}

export const neg = (x) => scale(x, Q(-1));
export const sub = (a, b) => add(a, neg(b));

function mulFactors(f, g) {
  const out = new Map(f);
  let extra = Q(1);
  for (const [k, x] of g) {
    const prev = out.get(k);
    if (!prev) { out.set(k, { atom: x.atom, e: x.e }); continue; }
    const e = qadd(prev.e, x.e);
    if (qzero(e)) out.delete(k);
    else out.set(k, { atom: x.atom, e });
  }
  // Number roots: sqrt(2)*sqrt(2) = 2.
  for (const [k, x] of [...out]) {
    if (x.atom.t !== "nroot") continue;
    const whole = Math.floor(x.e.n / x.e.d);
    if (whole >= 1 || x.e.n < 0) {
      const w = x.e.n < 0 ? Math.floor(x.e.n / x.e.d) : whole;
      const r = qpow(x.atom.v, Q(w));
      if (r) {
        extra = qmul(extra, r);
        const e = qadd(x.e, Q(-w));
        if (qzero(e)) out.delete(k);
        else out.set(k, { atom: x.atom, e });
      }
    }
  }
  return { f: out, c: extra };
}

export function mul(...xs) {
  let acc = ONE;
  for (const x of xs) {
    const out = EMPTY();
    for (const a of acc.terms.values()) {
      for (const b of x.terms.values()) {
        const { f, c } = mulFactors(a.f, b.f);
        addTerm(out, qmul(qmul(a.c, b.c), c), f);
      }
    }
    acc = out;
  }
  return acc;
}

export function pow(x, e) {
  if (typeof e === "number") e = Q(e);
  if (!("n" in e)) {
    const c = constValue(e);
    if (!c) return fn("exp", mul(e, fn("ln", x)));
    e = c;
  }
  if (qzero(e)) return ONE;
  if (qone(e)) return x;
  if (isZero(x)) {
    if (e.n < 0) throw new Error("division by zero");
    return ZERO;
  }
  if (x.terms.size === 1) {
    const [t] = x.terms.values();
    // (c * prod a^k)^e = c^e * prod a^(k e)
    let c = qpow(t.c, e);
    const f = new Map();
    for (const [k, y] of t.f) f.set(k, { atom: y.atom, e: qmul(y.e, e) });
    let extra = ONE;
    if (!c) {
      // c^e not exact: pull the sign out and keep the number as a root atom.
      const sign = t.c.n < 0 && e.d % 2 === 1 ? -1 : 1;
      const abs = Q(Math.abs(t.c.n), t.c.d);
      if (t.c.n < 0 && e.d % 2 === 0) return atomExpr({ t: "sum", x }, e);
      c = Q(sign);
      const nu = abs.n === 1 ? null : { t: "nroot", v: Q(abs.n) };
      const de = abs.d === 1 ? null : { t: "nroot", v: Q(abs.d) };
      if (nu) extra = mul(extra, atomExpr(nu, e));
      if (de) extra = mul(extra, atomExpr(de, qneg(e)));
    }
    const out = EMPTY();
    addTerm(out, c, f);
    return mul(out, extra);
  }
  if (qint(e) && e.n > 0 && e.n <= 12) {
    let out = ONE;
    for (let i = 0; i < e.n; i++) out = mul(out, x);
    return out;
  }
  return atomExpr({ t: "sum", x }, e);
}

export const div = (a, b) => mul(a, pow(b, Q(-1)));

const FN_ZERO = { sin: 0, tan: 0, arcsin: 0, arctan: 0, sinh: 0, tanh: 0, ln: null, exp: null };

export function fn(name, arg) {
  const c = constValue(arg);
  if (c && qzero(c)) {
    if (name === "exp" || name === "cos" || name === "cosh") return ONE;
    if (FN_ZERO[name] === 0) return ZERO;
  }
  if (c && qone(c) && name === "ln") return ZERO;
  if (name === "sqrt") return pow(arg, Q(1, 2));
  if (name === "ln" && arg.terms.size === 1) {
    const [t] = arg.terms.values();
    // ln(e^u) = u
    if (qone(t.c) && t.f.size === 1) {
      const [x] = t.f.values();
      if (x.atom.t === "fn" && x.atom.name === "exp") return scale(x.atom.arg, x.e);
    }
  }
  if (name === "exp" && arg.terms.size === 1) {
    // exp(c * ln(u)) = u^c
    const [t] = arg.terms.values();
    if (t.f.size === 1) {
      const [x] = t.f.values();
      if (x.atom.t === "fn" && x.atom.name === "ln" && qone(x.e)) return pow(x.atom.arg, t.c);
    }
  }
  if (name === "abs" && c) return num(Q(Math.abs(c.n), c.d));
  return atomExpr({ t: "fn", name, arg });
}

// ---------- derivatives ----------

function dAtom(a, v) {
  if (a.t === "sym") return a.name === v ? ONE : ZERO;
  if (a.t === "nroot") return ZERO;
  if (a.t === "sum") return diff(a.x, v);
  const u = a.arg;
  const du = diff(u, v);
  if (isZero(du)) return ZERO;
  const f = (n) => fn(n, u);
  let outer;
  switch (a.name) {
    case "sin": outer = f("cos"); break;
    case "cos": outer = neg(f("sin")); break;
    case "tan": outer = add(ONE, pow(f("tan"), 2)); break;
    case "exp": outer = f("exp"); break;
    case "ln": outer = pow(u, -1); break;
    case "log": outer = pow(mul(u, fn("ln", num(10))), -1); break;
    case "arcsin": outer = pow(sub(ONE, pow(u, 2)), Q(-1, 2)); break;
    case "arccos": outer = neg(pow(sub(ONE, pow(u, 2)), Q(-1, 2))); break;
    case "arctan": outer = pow(add(ONE, pow(u, 2)), -1); break;
    case "sinh": outer = f("cosh"); break;
    case "cosh": outer = f("sinh"); break;
    case "tanh": outer = sub(ONE, pow(f("tanh"), 2)); break;
    case "abs": outer = div(u, f("abs")); break;
    default: throw new Error(`can't differentiate ${a.name}`);
  }
  return mul(outer, du);
}

export function diff(x, v, times = 1) {
  let cur = x;
  for (let n = 0; n < times; n++) {
    const out = [];
    for (const t of cur.terms.values()) {
      const entries = [...t.f.entries()];
      for (let i = 0; i < entries.length; i++) {
        const [k, { atom, e }] = entries[i];
        const da = dAtom(atom, v);
        if (isZero(da)) continue;
        const rest = new Map(t.f);
        if (qone(e)) rest.delete(k);
        else rest.set(k, { atom, e: qadd(e, Q(-1)) });
        const term = EMPTY();
        addTerm(term, qmul(t.c, e), rest);
        out.push(mul(term, da));
      }
    }
    cur = add(...out);
  }
  return cur;
}

// ---------- substitution, symbols, numbers ----------

export function subs(x, map) {
  const parts = [];
  for (const t of x.terms.values()) {
    let term = num(t.c);
    for (const { atom, e } of t.f.values()) term = mul(term, pow(subsAtom(atom, map), e));
    parts.push(term);
  }
  return add(...parts);
}

function subsAtom(a, map) {
  if (a.t === "sym") return map[a.name] ?? atomExpr(a);
  if (a.t === "nroot") return atomExpr(a);
  if (a.t === "sum") return subs(a.x, map);
  return fn(a.name, subs(a.arg, map));
}

const CONSTANTS = new Set(["pi"]);

export function symbols(x, out = new Set()) {
  for (const t of x.terms.values()) {
    for (const { atom } of t.f.values()) {
      if (atom.t === "sym" && !CONSTANTS.has(atom.name)) out.add(atom.name);
      else if (atom.t === "fn") symbols(atom.arg, out);
      else if (atom.t === "sum") symbols(atom.x, out);
    }
  }
  return out;
}

// Variables in the usual order: x, y, z, w first, then the rest alphabetically.
export function orderVars(names) {
  const rank = (n) => { const i = ["x", "y", "z", "w"].indexOf(n.replace(/_.*/, "")); return i < 0 ? 9 : i; };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "en", { numeric: true }));
}

export function evaluate(x, env = {}) {
  let s = 0;
  for (const t of x.terms.values()) {
    let p = t.c.n / t.c.d;
    for (const { atom, e } of t.f.values()) p *= evalAtom(atom, env) ** (e.n / e.d);
    s += p;
  }
  return s;
}

function evalAtom(a, env) {
  if (a.t === "sym") {
    if (a.name === "pi") return Math.PI;
    if (!(a.name in env)) throw new Error(`no value for ${a.name}`);
    return env[a.name];
  }
  if (a.t === "nroot") return a.v.n / a.v.d;
  if (a.t === "sum") return evaluate(a.x, env);
  const u = evaluate(a.arg, env);
  const F = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, abs: Math.abs };
  return F[a.name](u);
}

// ---------- parsing (LaTeX or plain) ----------

const FUNCS = new Set(["sin", "cos", "tan", "exp", "ln", "log", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "sqrt", "abs"]);
const GREEK = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota",
  "kappa", "lambda", "mu", "nu", "xi", "rho", "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega"]);
const SKIP = new Set(["left", "right", ",", ";", ":", "!", " ", "quad", "qquad", "displaystyle", "big", "Big", "bigg", "Bigg"]);

// Parses one expression. `names` (optional): multi-letter names that are one
// symbol (e.g. a variable called "x0"), otherwise "xy" means x*y.
export function parse(src, names = []) {
  const p = new Parser(String(src), names);
  const x = p.expr();
  p.ws();
  if (p.i < p.s.length) throw new Error(`can't read "${p.s.slice(p.i)}"`);
  return x;
}

export function tryParse(src, names) {
  try { return parse(src, names); } catch (_) { return null; }
}

class Parser {
  constructor(s, names) {
    this.s = s.replace(/\\[dt]frac/g, "\\frac").replace(/\*\*/g, "^").replace(/\\cdot|\\times|·/g, "*");
    this.i = 0;
    this.names = [...names].sort((a, b) => b.length - a.length);
  }

  ws() {
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
      const m = this.s.slice(this.i).match(/^\\([a-zA-Z]+|[,;:! ])/);
      if (m && SKIP.has(m[1])) { this.i += m[0].length; continue; }
      if (this.s[this.i] === "&") { this.i++; continue; }
      return;
    }
  }

  peek() { this.ws(); return this.s[this.i]; }

  expr() {
    let x;
    const c = this.peek();
    if (c === "-" || c === "+") { this.i++; x = this.term(); if (c === "-") x = neg(x); }
    else x = this.term();
    for (;;) {
      const o = this.peek();
      if (o === "+") { this.i++; x = add(x, this.term()); }
      else if (o === "-") { this.i++; x = sub(x, this.term()); }
      else return x;
    }
  }

  term() {
    let x = this.unary();
    for (;;) {
      const o = this.peek();
      if (o === "*") { this.i++; x = mul(x, this.unary()); }
      else if (o === "/") { this.i++; x = div(x, this.unary()); }
      else if (o !== undefined && this.startsFactor()) x = mul(x, this.power());
      else return x;
    }
  }

  unary() {
    const c = this.peek();
    if (c === "-") { this.i++; return neg(this.unary()); }
    if (c === "+") { this.i++; return this.unary(); }
    return this.power();
  }

  startsFactor() {
    const c = this.s[this.i];
    if (c === "|") return !this.abs;
    if (/[A-Za-z0-9.({[]/.test(c)) return true;
    if (c === "\\") {
      const m = this.s.slice(this.i).match(/^\\([a-zA-Z]+|\{)/);
      return !!m && !["end", "right", "mid", "in", "leq", "geq", "le", "ge", "neq"].includes(m[1]);
    }
    return false;
  }

  power() {
    let base = this.primary();
    for (;;) {
      const c = this.peek();
      if (c === "^") {
        this.i++;
        const e = this.script();
        base = base === "e" ? fn("exp", e) : pow(base, e);
      } else if (c === "'" ) {
        throw new Error("primes are not supported");
      } else break;
    }
    return base === "e" ? fn("exp", ONE) : base;
  }

  // A ^ or _ argument: {..} or one token.
  script() {
    this.ws();
    if (this.s[this.i] === "{") { this.i++; const x = this.expr(); this.expect("}"); return x; }
    if (this.s[this.i] === "-") { this.i++; return neg(this.script()); }
    if (/\d/.test(this.s[this.i])) return num(Number(this.s[this.i++]));
    return this.primary(true);
  }

  expect(ch) {
    this.ws();
    if (this.s[this.i] !== ch) throw new Error(`expected ${ch}`);
    this.i++;
  }

  group(open, close) {
    this.i += open.length;
    const x = this.expr();
    this.ws();
    if (close === ")" && this.s.startsWith("\\right)", this.i)) this.i += 7;
    else this.expect(close);
    return x;
  }

  // A function argument: (..), {..} or the next factor (\sin x, \sin 2x).
  fnArg() {
    const c = this.peek();
    if (c === "(" || c === "{" || c === "[") return this.primary();
    return this.power();
  }

  primary(single = false) {
    this.ws();
    const s = this.s;
    const c = s[this.i];
    if (c === undefined) throw new Error("unexpected end");
    if (/[\d.]/.test(c)) {
      const m = single ? [c] : s.slice(this.i).match(/^\d*\.?\d+/);
      this.i += m[0].length;
      return num(fromDecimal(m[0]));
    }
    if (c === "(") return this.group("(", ")");
    if (c === "[") return this.group("[", "]");
    if (c === "{") return this.group("{", "}");
    if (c === "|") { this.i++; this.abs = (this.abs || 0) + 1; const x = this.expr(); this.abs--; this.expect("|"); return fn("abs", x); }
    if (c === "\\") {
      const m = s.slice(this.i + 1).match(/^([a-zA-Z]+|\{|\|)/);
      if (!m) throw new Error("bad command");
      const name = m[1];
      this.i += 1 + name.length;
      if (name === "{") { const x = this.expr(); this.expect("\\"); this.expect("}"); return x; }
      if (name === "frac") {
        const a = this.script();
        const b = this.script();
        return div(a, b);
      }
      if (name === "sqrt") {
        this.ws();
        if (s[this.i] === "[") {
          this.i++;
          const k = this.expr();
          this.expect("]");
          return pow(this.script(), div(ONE, k));
        }
        return pow(this.script(), Q(1, 2));
      }
      if (name === "pi") return sym("pi");
      if (name === "mathrm" || name === "text" || name === "operatorname" || name === "mathit") {
        const save = this.i;
        this.ws();
        const mm = s.slice(this.i).match(/^\{([a-zA-Z]+)\}/);
        if (mm && FUNCS.has(mm[1])) { this.i += mm[0].length; return this.applyFn(mm[1]); }
        if (mm && mm[1] === "e") { this.i += mm[0].length; return "e"; }
        this.i = save;
        return this.script();
      }
      if (FUNCS.has(name)) return this.applyFn(name);
      if (name === "lvert" || name === "|") { const x = this.expr(); this.ws(); this.s.startsWith("\\rvert", this.i) ? (this.i += 6) : this.expect("|"); return fn("abs", x); }
      if (GREEK.has(name)) return this.subscripted(name);
      throw new Error(`unknown command \\${name}`);
    }
    if (/[A-Za-z]/.test(c)) {
      if (!single) {
        const named = this.names.find((n) => s.startsWith(n, this.i) && !/[A-Za-z0-9_]/.test(s[this.i + n.length] || ""));
        if (named && named.length > 1) { this.i += named.length; return sym(named); }
        const f = s.slice(this.i).match(/^(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|exp|ln|log|sqrt|abs)(?![A-Za-z])/);
        if (f) { this.i += f[1].length; return this.applyFn(f[1]); }
      }
      this.i++;
      if (c === "e" && !/[_]/.test(s[this.i] || "") && !this.names.includes("e")) return "e";
      return single ? sym(c) : this.subscripted(c);
    }
    throw new Error(`unexpected "${c}"`);
  }

  subscripted(name) {
    if (this.s[this.i] === "_") {
      this.i++;
      this.ws();
      let sub;
      if (this.s[this.i] === "{") {
        const end = this.s.indexOf("}", this.i);
        sub = this.s.slice(this.i + 1, end).replace(/\s+/g, "");
        this.i = end + 1;
      } else {
        sub = this.s[this.i++];
      }
      return sym(`${name}_${sub}`);
    }
    return sym(name);
  }

  applyFn(name) {
    // \sin^2 x = (\sin x)^2
    this.ws();
    let p = null;
    if (this.s[this.i] === "^") { this.i++; p = this.script(); }
    const arg = this.fnArg();
    const x = name === "abs" ? fn("abs", arg) : fn(name, arg);
    return p ? pow(x, p) : x;
  }
}

// ---------- LaTeX output ----------

const TEX_FN = { sin: "\\sin", cos: "\\cos", tan: "\\tan", ln: "\\ln", log: "\\log", arcsin: "\\arcsin", arccos: "\\arccos",
  arctan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh" };

function symTex(name) {
  const [base, sub] = name.split("_");
  const b = GREEK.has(base) || base === "pi" ? "\\" + base : base;
  return sub ? `${b}_{${sub}}` : b;
}

function termDegree(t) {
  let d = 0;
  for (const { atom, e } of t.f.values()) if (atom.t === "sym" && atom.name !== "pi") d += e.n / e.d;
  return d;
}

// Terms in reading order: highest degree first, then alphabetical.
function sortedTerms(x, vars) {
  const names = vars || orderVars(symbols(x));
  // Graded lexicographic: x^2 before xy before y^2.
  const expOf = (t, v) => {
    for (const { atom, e } of t.f.values()) if (atom.t === "sym" && atom.name === v) return e.n / e.d;
    return 0;
  };
  const lex = (a, b) => {
    for (const v of names) {
      const d = expOf(b, v) - expOf(a, v);
      if (d) return d;
    }
    return 0;
  };
  return [...x.terms.entries()]
    .sort(([ka, a], [kb, b]) => termDegree(b) - termDegree(a) || lex(a, b) || (b.f.size === 0) - (a.f.size === 0) || (ka < kb ? -1 : ka > kb ? 1 : 0))
    .map(([, t]) => t);
}

function atomTex(a, vars) {
  if (a.t === "sym") return symTex(a.name);
  if (a.t === "nroot") return qkey(a.v);
  if (a.t === "sum") return `\\left(${tex(a.x, vars)}\\right)`;
  if (a.name === "exp") return null; // handled in powTex
  if (a.name === "abs") return `\\left|${tex(a.arg, vars)}\\right|`;
  const inner = tex(a.arg, vars);
  const simple = /^[a-zA-Z0-9]$|^\\[a-zA-Z]+$|^[a-zA-Z]_\{\w+\}$/.test(inner);
  return `${TEX_FN[a.name] || `\\operatorname{${a.name}}`}${simple ? " " + inner : `\\left(${inner}\\right)`}`;
}

// a^e for one factor; e > 0 (negative exponents go to the denominator).
function powTex(atom, e, vars) {
  if (atom.t === "fn" && atom.name === "exp") {
    const ex = qone(e) ? atom.arg : scale(atom.arg, e);
    const inner = tex(ex, vars);
    return inner === "1" ? "e" : `e^{${inner}}`;
  }
  if (atom.t === "nroot" || atom.t === "sum" || atom.t === "sym") {
    if (e.d === 2 && e.n === 1) return `\\sqrt{${atom.t === "sum" ? tex(atom.x, vars) : atomTex(atom, vars)}}`;
    if (e.d > 2 && e.n === 1) return `\\sqrt[${e.d}]{${atom.t === "sum" ? tex(atom.x, vars) : atomTex(atom, vars)}}`;
  }
  let base = atomTex(atom, vars);
  if (qone(e)) return base;
  // \sin^2 x style for functions with a simple argument
  if (atom.t === "fn" && !/\\left/.test(base) && qint(e)) return base.replace(/^(\\[a-z]+)/, `$1^{${e.n}}`);
  if (atom.t === "fn") base = `\\left(${base}\\right)`;
  const es = qint(e) ? `${e.n}` : `\\frac{${e.n}}{${e.d}}`;
  return es.length === 1 ? `${base}^${es}` : `${base}^{${es}}`;
}

function productTex(parts) {
  // \sin x followed by more factors reads wrong (\sin xy): use \sin(x).
  parts = parts.map((p, i) => (i < parts.length - 1 ? p.replace(/^(\\[a-z]+(?:\^\{\d+\})?) ([a-zA-Z0-9]|\\[a-zA-Z]+|[a-zA-Z]_\{\w+\})$/, "$1($2)") : p));
  // Juxtapose, but put \cdot between two numbers.
  let out = "";
  for (const p of parts) {
    if (out && /\d$/.test(out) && /^[\d.]/.test(p)) out += " \\cdot ";
    else if (out && /\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z]/.test(p)) out += " ";
    out += p;
  }
  return out;
}

function termTex(t, vars) {
  const numParts = [];
  const denParts = [];
  const facs = [...t.f.values()].sort((a, b) => {
    const r = (x) => (x.atom.t === "nroot" ? 0 : x.atom.t === "sym" ? 1 : x.atom.t === "fn" && x.atom.name === "exp" ? 2 : x.atom.t === "fn" ? 3 : 4);
    const vi = (x) => (vars && x.atom.t === "sym" ? (vars.indexOf(x.atom.name) + 100) % 100 : 0);
    return r(a) - r(b) || vi(a) - vi(b) || (atomKey(a.atom) < atomKey(b.atom) ? -1 : 1);
  });
  for (const { atom, e } of facs) {
    if (e.n > 0) numParts.push(powTex(atom, e, vars));
    else denParts.push(powTex(atom, qneg(e), vars));
  }
  // A lone sum in the denominator needs no brackets: \frac{1}{x + y}.
  if (denParts.length === 1 && t.c.d === 1) denParts[0] = denParts[0].replace(/^\\left\((.*)\\right\)$/, (m, inner) => (balancedParens(inner) ? inner : m));
  const c = t.c;
  const sign = c.n < 0 ? "-" : "";
  const n = Math.abs(c.n);
  const d = c.d;
  let body;
  if (!denParts.length && d === 1) {
    body = productTex([...(n !== 1 || !numParts.length ? [String(n)] : []), ...numParts]);
  } else {
    const top = productTex([...(n !== 1 || !numParts.length ? [String(n)] : []), ...numParts]);
    const bottom = productTex([...(d !== 1 ? [String(d)] : []), ...denParts]);
    body = `\\frac{${top}}{${bottom}}`;
  }
  return { sign, body };
}

function balancedParens(s) {
  let d = 0;
  for (const m of s.matchAll(/\\left|\\right/g)) {
    d += m[0] === "\\left" ? 1 : -1;
    if (d < 0) return false;
  }
  return d === 0;
}

// LaTeX for an expression. `vars` orders the terms (x before y, ...).
export function tex(x, vars = null) {
  if (x.terms.size === 0) return "0";
  let out = "";
  for (const t of sortedTerms(x, vars)) {
    const { sign, body } = termTex(t, vars);
    if (!out) out = sign + body;
    else out += sign ? ` - ${body}` : ` + ${body}`;
  }
  return out;
}

// ---------- matrices (arrays of rows of expressions) ----------

export const mat = {
  map: (A, f) => A.map((r, i) => r.map((x, j) => f(x, i, j))),
  transpose: (A) => A[0].map((_, j) => A.map((r) => r[j])),
  add: (A, B) => {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error(`can't add a ${A.length}×${A[0].length} and a ${B.length}×${B[0].length} matrix`);
    return A.map((r, i) => r.map((x, j) => add(x, B[i][j])));
  },
  scale: (A, c) => A.map((r) => r.map((x) => mul(x, c))),
  mul: (A, B) => {
    if (A[0].length !== B.length) throw new Error(`can't multiply a ${A.length}×${A[0].length} by a ${B.length}×${B[0].length} matrix`);
    return A.map((r) => B[0].map((_, j) => add(...r.map((x, k) => mul(x, B[k][j])))));
  },
  identity: (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO))),
  zeros: (m, n) => Array.from({ length: m }, () => Array.from({ length: n }, () => ZERO)),
  det(A) {
    const n = A.length;
    if (n !== A[0].length) throw new Error("the determinant needs a square matrix");
    if (n === 1) return A[0][0];
    if (n === 2) return sub(mul(A[0][0], A[1][1]), mul(A[0][1], A[1][0]));
    if (mat.isConst(A)) return mat.detConst(A);
    const parts = [];
    for (let j = 0; j < n; j++) {
      if (isZero(A[0][j])) continue;
      const minor = A.slice(1).map((r) => r.filter((_, k) => k !== j));
      const term = mul(A[0][j], mat.det(minor));
      parts.push(j % 2 ? neg(term) : term);
    }
    return add(...parts);
  },
  isConst: (A) => A.every((r) => r.every((x) => constValue(x) !== null)),
  detConst(A) {
    const M = A.map((r) => r.map(constValue));
    const n = M.length;
    let det = Q(1);
    for (let c = 0; c < n; c++) {
      let p = c;
      while (p < n && qzero(M[p][c])) p++;
      if (p === n) return ZERO;
      if (p !== c) { [M[p], M[c]] = [M[c], M[p]]; det = qneg(det); }
      det = qmul(det, M[c][c]);
      for (let r = c + 1; r < n; r++) {
        const f = qdiv(M[r][c], M[c][c]);
        for (let k = c; k < n; k++) M[r][k] = qadd(M[r][k], qneg(qmul(f, M[c][k])));
      }
    }
    return num(det);
  },
  cofactor(A) {
    const n = A.length;
    if (n === 1) return [[ONE]];
    return A.map((_, i) => A.map((__, j) => {
      const minor = A.filter((_, r) => r !== i).map((r) => r.filter((_, k) => k !== j));
      const d = mat.det(minor);
      return (i + j) % 2 ? neg(d) : d;
    }));
  },
  adjugate: (A) => mat.transpose(mat.cofactor(A)),
  inverse(A) {
    if (A.length !== A[0].length) throw new Error("only square matrices have an inverse");
    const d = mat.det(A);
    if (isZero(d)) throw new Error("the determinant is 0, so the matrix has no inverse");
    if (mat.isConst(A)) {
      const R = mat.rref(A.map((r, i) => [...r, ...mat.identity(A.length)[i]]));
      return R.map((r) => r.slice(A.length));
    }
    return mat.scale(mat.adjugate(A), pow(d, -1));
  },
  // Reduced row echelon form, exact (numbers; symbolic pivots must be non-zero).
  rref(A) {
    const M = A.map((r) => [...r]);
    const rows = M.length;
    const cols = M[0].length;
    let lead = 0;
    for (let r = 0; r < rows && lead < cols; r++) {
      let i = r;
      while (isZero(M[i][lead])) {
        i++;
        if (i === rows) { i = r; lead++; if (lead === cols) return M; }
      }
      [M[i], M[r]] = [M[r], M[i]];
      const pv = M[r][lead];
      M[r] = M[r].map((x) => div(x, pv));
      for (let k = 0; k < rows; k++) {
        if (k === r || isZero(M[k][lead])) continue;
        const f = M[k][lead];
        M[k] = M[k].map((x, j) => sub(x, mul(f, M[r][j])));
      }
      lead++;
    }
    return M;
  },
  rank: (A) => mat.rref(A).filter((r) => r.some((x) => !isZero(x))).length,
  trace: (A) => add(...A.map((r, i) => r[i])),
  power(A, k) {
    if (k < 0) return mat.power(mat.inverse(A), -k);
    let out = mat.identity(A.length);
    for (let i = 0; i < k; i++) out = mat.mul(out, A);
    return out;
  },
};

// Hessian, gradient, Jacobian of expressions in the given variables.
export const hessian = (f, vars) => vars.map((a) => vars.map((b) => diff(diff(f, a), b)));
export const gradient = (f, vars) => vars.map((v) => diff(f, v));
export const jacobian = (fs, vars) => fs.map((f) => vars.map((v) => diff(f, v)));

// Characteristic polynomial det(A - lambda I) in the variable `v`.
export function charpoly(A, v = "lambda") {
  const l = sym(v);
  return mat.det(A.map((r, i) => r.map((x, j) => (i === j ? sub(x, l) : x))));
}

// Rational roots of a polynomial in one variable (for eigenvalues), with
// multiplicity; null if it doesn't split over the rationals.
export function rationalRoots(p, v) {
  const coeffs = [];
  for (const t of p.terms.values()) {
    let deg = 0;
    for (const { atom, e } of t.f.values()) {
      if (atom.t !== "sym" || atom.name !== v || !qint(e) || e.n < 0) return null;
      deg = e.n;
    }
    coeffs[deg] = qadd(coeffs[deg] || Q(0), t.c);
  }
  const deg = coeffs.length - 1;
  if (deg < 1) return [];
  const c = Array.from({ length: deg + 1 }, (_, i) => coeffs[i] || Q(0));
  // Clear denominators.
  const L = c.reduce((m, q) => (m * q.d) / gcd(m, q.d), 1);
  let a = c.map((q) => (q.n * L) / q.d);
  const roots = [];
  while (a.length > 1 && a[0] === 0) { roots.push(Q(0)); a = a.slice(1); }
  const divisors = (n) => { const out = []; n = Math.abs(n); for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i); return out; };
  const evalAt = (arr, q) => arr.reduceRight((acc, k) => qadd(qmul(acc, q), Q(k)), Q(0));
  let changed = true;
  while (a.length > 1 && changed) {
    changed = false;
    for (const pn of divisors(a[0])) {
      for (const qd of divisors(a[a.length - 1])) {
        for (const s of [1, -1]) {
          const r = Q(s * pn, qd);
          if (!qzero(evalAt(a, r))) continue;
          roots.push(r);
          // Synthetic division (coefficients low -> high).
          const hi = [...a].reverse();
          const outHi = [hi[0]];
          for (let i = 1; i < hi.length - 1; i++) outHi.push(hi[i] + (outHi[i - 1] * r.n) / r.d);
          a = outHi.reverse();
          if (a.some((x) => !Number.isInteger(x))) return null;
          changed = true;
          break;
        }
        if (changed) break;
      }
      if (changed) break;
    }
  }
  return a.length === 1 ? roots.sort((x, y) => x.n / x.d - y.n / y.d) : null;
}

// Taylor polynomial of f in x around a, degree n, as LaTeX with (x - a)^k
// kept unexpanded.
export function taylorTex(f, x, a, n) {
  const parts = [];
  let d = f;
  let fact = 1;
  for (let k = 0; k <= n; k++) {
    if (k > 0) { d = diff(d, x); fact *= k; }
    const c = scale(subs(d, { [x]: a }), Q(1, fact));
    if (isZero(c)) continue;
    const ca = constValue(a);
    const base = ca && qzero(ca) ? symTex(x) : `\\left(${tex(sub(sym(x), a))}\\right)`;
    const xk = k === 0 ? "" : k === 1 ? base : `${base}^{${k}}`;
    const cv = constValue(c);
    let s;
    if (!xk) s = tex(c);
    else if (cv && qone(cv)) s = xk;
    else if (cv && cv.n === -1 && cv.d === 1) s = "-" + xk;
    else if (cv) s = `${tex(c)}${xk.startsWith("\\left") ? "" : " "}${xk}`.replace(/^(-?)\\frac\{(\d+)\}\{(\d+)\} ?(.*)$/, (m, sg, p, q, rest) => (p === "1" ? `${sg}\\frac{${rest}}{${q}}` : `${sg}\\frac{${p}${rest.startsWith("\\left") ? "" : " "}${rest}}{${q}}`));
    else s = `\\left(${tex(c)}\\right)${xk}`;
    parts.push(s);
  }
  if (!parts.length) return "0";
  return parts.reduce((out, p) => (!out ? p : p.startsWith("-") ? `${out} - ${p.slice(1)}` : `${out} + ${p}`), "");
}
