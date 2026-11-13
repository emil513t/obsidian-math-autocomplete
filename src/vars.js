// Note variables: values given in an exercise, written once in a ```vars block
// and inserted with @name as LaTeX (in math / text) or Python (in code).
// Pure helpers, no Obsidian imports, so node can test them.
//
//   ```vars
//   A = [[1, 2], [3, 4]]
//   B = \begin{bmatrix} 1 & 0 \\ \frac{1}{2} & 1 \end{bmatrix}
//   C = 1 & 2 \\ 3 & 4
//   v = [1, -1, 2]
//   n = 5
//   f = x^2 + 3x
//   ```

import * as cas from "./cas.js";

export const PY_LANGS =new Set(["python", "py", "python3", "sage", "ipython"]);

const GREEK = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi",
  "varphi", "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
  "Phi", "Psi", "Omega",
]);

// ---------- parsing the vars block ----------

// Every variable defined in ```vars blocks of the note, later ones win.
// Returns Map<name, { name, kind: "scalar"|"vector"|"matrix", env?, value }>,
// where value is a LaTeX string (scalar), string[] (vector) or string[][].
// implicit: also variables defined elsewhere in the note, so a matrix works
// everywhere no matter where it was written: $A = \begin{pmatrix}..$ in the
// text or A = sp.Matrix(..) in a python block. The vars block wins on names.
export function parseVars(doc, { implicit = true } = {}) {
  const vars = new Map();
  // ```vars, ```Vars, ```VARS: any capitalisation.
  const re = /^[ \t]*(```|~~~)[ \t]*vars[ \t]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gim;
  let m;
  while ((m = re.exec(doc))) {
    for (const v of parseBlock(m[2], vars)) vars.set(v.name, v);
  }
  if (!implicit) return vars;
  const add = (lines, source) => {
    for (const v of parseBlock(lines.join("\n"), vars)) {
      if (vars.has(v.name) || v.error) continue;
      vars.set(v.name, { ...v, source });
    }
  };
  try { add(pythonDefinitions(doc, vars).map((d) => d.line), "python"); } catch (_) { /* best effort */ }
  try { add(findDefinitions(doc, vars).map((d) => d.line), "math"); } catch (_) { /* best effort */ }
  return vars;
}

// ---------- variables defined in python blocks ----------

const PY_FENCE = /^[ \t]*(```|~~~)[ \t]*(python|py|python3|sage|ipython)[ \t]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;

// Top-level `name = value` lines in python blocks whose value is a number,
// an expression, a list or a matrix: A = sp.Matrix([[1, 2], [3, 4]]),
// v = np.array([1, 2]), f = x**2 + 3*x*y, h = sp.Rational(1, 2).
export function pythonDefinitions(doc, existing = new Map()) {
  const out = [];
  const seen = new Set(existing.keys());
  let m;
  PY_FENCE.lastIndex = 0;
  while ((m = PY_FENCE.exec(doc))) {
    for (const line of m[3].split("\n")) {
      const d = line.match(/^([A-Za-z]\w*)\s*=\s*(.+?)\s*(#.*)?$/);
      if (!d || seen.has(d[1]) || /^(sp|np|plt|opt|si|math)$/.test(d[1])) continue;
      const value = pyToLatexValue(d[2]);
      if (value == null) continue;
      seen.add(d[1]);
      out.push({ name: d[1], line: `${d[1]} = ${value}` });
    }
  }
  return out;
}

const PY_OK_CALLS = /^(Matrix|array|Rational|sqrt|sin|cos|tan|exp|log|ln|asin|acos|atan|sinh|cosh|tanh|Abs|abs|FiniteSet|Interval)$/;

// A python value as vars text (LaTeX), or null if it isn't plain data.
export function pyToLatexValue(py) {
  let s = py.trim().replace(/\b(sp|np|math|sympy|numpy)\./g, "");
  // Only data and arithmetic: no other calls, lambdas, comprehensions, strings.
  if (/["'\]]\s*\(|lambda|\bfor\b|\bif\b|["']/.test(s)) return null;
  for (const c of s.matchAll(/([A-Za-z_]\w*)\s*\(/g)) if (!PY_OK_CALLS.test(c[1])) return null;
  const m = s.match(/^(Matrix|array)\(\s*([\s\S]*)\)$/);
  if (m) s = m[2];
  const fs = s.match(/^FiniteSet\(([\s\S]*)\)$/);
  if (fs) return `\\{${splitTop(fs[1], ",").map(pyExprTex).join(", ")}\\}`;
  if (s.startsWith("[")) {
    const items = splitTop(s.slice(1, s.lastIndexOf("]")), ",");
    if (items.length && items.every((x) => x.startsWith("["))) {
      const rows = items.map((r) => splitTop(r.slice(1, r.lastIndexOf("]")), ",").map(pyExprTex));
      if (rows.some((r) => r.includes(null))) return null;
      return `\\begin{pmatrix} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
    }
    const xs = items.map(pyExprTex);
    return xs.includes(null) ? null : `[${xs.join(", ")}]`;
  }
  if (s.startsWith("(") && closesAtEnd(s) && splitTop(s.slice(1, -1), ",").length > 1) {
    const xs = splitTop(s.slice(1, -1), ",").map(pyExprTex);
    return xs.includes(null) ? null : `(${xs.join(", ")})`;
  }
  return pyExprTex(s);
}

function pyExprTex(e) {
  const t = String(e).trim()
    .replace(/\bRational\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)/g, "($1)/($2)")
    .replace(/\*\*/g, "^").replace(/\blog\(/g, "ln(").replace(/\bAbs\(/g, "abs(")
    .replace(/\bpi\b/g, "\\pi").replace(/\bE\b/g, "e")
    .replace(/\ba(sin|cos|tan)\(/g, "arc$1(");
  const x = cas.tryParse(t);
  return x ? cas.tex(x) : null;
}

export function parseBlock(src, known = new Map()) {
  src = cas.asciiMath(src);
  const out = [];
  const scope = new Map(known);
  const lines = src.split("\n");
  // Every name the block defines (constants like a = 2 may come after f).
  const defined = new Set(lines.map((l) => l.match(/^\s*\\?([A-Za-z][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*:?=/)?.[1]).filter(Boolean));
  for (let i = 0; i < lines.length; i++) {
    const line = stripComment(lines[i]);
    // name = value, or a function with its variables: f(x, y) = ...
    const m = line.match(/^\s*\\?([A-Za-z][A-Za-z0-9_]*)\s*(?:\(\s*([A-Za-z][\w]*(?:\s*,\s*[A-Za-z][\w]*)*)\s*\))?\s*:?=\s*(.*)$/);
    if (!m) continue;
    let value = m[3].trim();
    // Multi-line values: an open \begin{..} or unbalanced brackets continue.
    while (i + 1 < lines.length && unfinished(value)) value += " " + stripComment(lines[++i]).trim();
    let params = m[2] ? m[2].split(",").map((s) => s.trim()) : null;
    // B = f(x) = x^3 + xy: a function written with its usual name on the right.
    const named = !params && value.match(/^[A-Za-z]\w*\s*\(\s*([A-Za-z]\w*(?:\s*,\s*[A-Za-z]\w*)*)\s*\)\s*=\s*([^=]+)$/);
    if (named) {
      params = named[1].split(",").map((s) => s.trim());
      value = named[2].trim();
    }
    // Computed from other variables: H = hessian(f), Ai = A^{-1}, C = AB, ...
    const d = derivedValue(m[1], value, scope);
    const v = d || parseValue(m[1], value);
    if (!v) continue;
    // f(x, y) = ..., and statements like P(n) = \sum_{k=1}^{n} k = \frac{n(n+1)}{2}
    if (params && (v.kind === "scalar" || v.kind === "relation")) {
      v.params = params;
      // f(x) = x^3 + xy also uses y: add the variables the formula uses.
      if (v.kind === "scalar") {
        try {
          const used = fnExpr({ ...v, params: undefined }, scope).vars;
          const extra = used.filter((x) => !params.includes(x) && !defined.has(x) && !scope.has(x));
          if (extra.length) v.params = [...params, ...extra];
        } catch (_) { /* keep the declared variables */ }
      }
    }
    out.push(v);
    scope.set(v.name, v);
  }
  return out;
}

function stripComment(line) {
  // "#" or "%" starts a comment, but not "\%".
  return line.replace(/(^|[^\\])[#%].*$/, "$1");
}

function unfinished(value) {
  if (/\\begin\{/.test(value) && !/\\end\{/.test(value)) return true;
  let depth = 0;
  for (const c of value) {
    if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") depth--;
  }
  return depth > 0;
}

export function parseValue(name, value) {
  if (!value) return null;
  const env = value.match(/^\\begin\{(\w+)\}([\s\S]*)\\end\{\1\}$/);
  if (env && env[1] === "cases") return { name, kind: "piecewise", value: latexRows(env[2]) };
  if (env) return matrixOrVector(name, latexRows(env[2]), env[1]);
  const other = otherValue(name, value);
  if (other) return other;
  if (value.startsWith("[")) {
    const items = splitTop(value.slice(1, value.lastIndexOf("]")), ",");
    if (items.length && items.every((x) => x.startsWith("["))) {
      return matrixOrVector(name, items.map((r) => splitTop(r.slice(1, r.lastIndexOf("]")), ",")), null);
    }
    return { name, kind: "vector", env: null, value: items };
  }
  if (splitTop(value, "&").length > 1 || splitTop(value, "\\\\").length > 1) {
    return matrixOrVector(name, latexRows(value), null);
  }
  return { name, kind: "scalar", value };
}

function latexRows(body) {
  return splitTop(body, "\\\\")
    .filter((r) => r.trim())
    .map((r) => splitTop(r, "&"));
}

function matrixOrVector(name, rows, env) {
  rows = rows.filter((r) => r.length && !(r.length === 1 && r[0] === ""));
  if (!rows.length) return null;
  return { name, kind: "matrix", env, value: rows };
}

// Split on `sep` outside {}, [], (); trims each piece.
export function splitTop(s, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && s.startsWith(sep, i) === false && i + 1 < s.length && sep !== "\\\\") {
      cur += c + s[i + 1];
      i++;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    if (depth === 0 && s.startsWith(sep, i)) {
      out.push(cur.trim());
      cur = "";
      i += sep.length - 1;
      continue;
    }
    if (c === "\\" && i + 1 < s.length) {
      cur += c + s[i + 1];
      i++;
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out.filter((x, i, a) => x !== "" || a.length === 1);
}

// ---------- where is the cursor ----------

// Info string of the fenced code block the end of `text` sits in, or null.
export function fenceLanguage(text) {
  let open = null; // { fence, lang }
  for (const line of text.split("\n")) {
    const m = line.match(/^[ \t]*(```|~~~)\s*([^\s`]*)/);
    if (!m) continue;
    if (!open) open = { fence: m[1], lang: m[2].toLowerCase() };
    else if (m[1] === open.fence) open = null;
  }
  return open ? open.lang : null;
}

// ---------- LaTeX output ----------

export function latexName(name) {
  if (GREEK.has(name)) return "\\" + name;
  const m = name.match(/^([A-Za-z]+?)_?(\d+)$/) || name.match(/^([A-Za-z])_(\w+)$/);
  if (m) return `${GREEK.has(m[1]) ? "\\" + m[1] : m[1]}_{${m[2]}}`;
  return name;
}

function latexEntry(e) {
  const f = String(e).trim().match(/^(-?)(\d+)\s*\/\s*(\d+)$/);
  if (f) return `${f[1]}\\frac{${f[2]}}{${f[3]}}`;
  return String(e).trim().replace(/\*\*/g, "^").replace(/\*/g, " \\cdot ");
}

// One line, like the built-in matrix fills, so it sits inside $$ ... $$.
export function toLatex(v, env) {
  if (v.kind === "scalar" || v.kind === "relation") return latexEntry(v.value);
  if (v.kind === "set") return v.builder ? v.value : v.value.length ? `\\{${v.value.map(latexEntry).join(", ")}\\}` : "\\emptyset";
  if (v.kind === "interval") return `${v.lopen ? "(" : "["}${v.value.map(latexEntry).join(", ")}${v.ropen ? ")" : "]"}`;
  if (v.kind === "piecewise") return `\\begin{cases} ${v.value.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{cases}`;
  if (v.kind === "vector" && v.tuple && !env) return `(${v.value.map(latexEntry).join(", ")})`;
  const rows = v.kind === "vector" ? v.value.map((x) => [x]) : v.value;
  const e = env || v.env || "pmatrix";
  return `\\begin{${e}} ${rows.map((r) => r.map(latexEntry).join(" & ")).join(" \\\\ ")} \\end{${e}}`;
}

// ---------- Python output ----------

// style: "sympy" | "numpy" | "plain"
export function toPython(v, style = "sympy") {
  const lib = style === "sympy" ? "sp" : style === "numpy" ? "np" : "math";
  const entry = (e) => latexToPy(String(e), lib);
  if (v.error) return "None";
  if (v.kind === "scalar") return entry(v.value);
  if (v.kind === "set") {
    if (v.builder) return JSON.stringify(v.value);
    return style === "sympy" ? `sp.FiniteSet(${v.value.map(entry).join(", ")})` : `{${v.value.map(entry).join(", ")}}`;
  }
  if (v.kind === "interval") {
    const [a, b] = v.value.map(entry);
    if (style !== "sympy") return `(${a}, ${b})`;
    return `sp.Interval(${a}, ${b}${v.lopen || v.ropen ? `, ${v.lopen ? "True" : "False"}, ${v.ropen ? "True" : "False"}` : ""})`;
  }
  if (v.kind === "relation") {
    const R = { "=": "Eq", "\\neq": "Ne", "\\leq": "Le", "\\le": "Le", "<=": "Le", "\\geq": "Ge", "\\ge": "Ge", ">=": "Ge", "<": "Lt", "\\lt": "Lt", ">": "Gt", "\\gt": "Gt" };
    const op = { Eq: "==", Ne: "!=", Le: "<=", Ge: ">=", Lt: "<", Gt: ">" }[R[v.op]];
    if (style === "sympy") return `sp.${R[v.op]}(${entry(v.lhs)}, ${entry(v.rhs)})`;
    return `${entry(v.lhs)} ${op} ${entry(v.rhs)}`;
  }
  if (v.kind === "piecewise") {
    const cond = (c) => {
      const t = String(c || "").replace(/\\text\{\s*(if|for|when)?\s*\}|\\text\{\s*(if|for|when)\s+/g, "").replace(/\}$/, "").trim();
      if (!t || /otherwise|else/.test(t)) return "True";
      const r = findRelation(t);
      return r ? toPython({ kind: "relation", ...r }, "sympy") : entry(t);
    };
    return `sp.Piecewise(${v.value.map((r) => `(${entry(r[0])}, ${cond(r[1])})`).join(", ")})`;
  }
  const list = v.kind === "vector"
    ? `[${v.value.map(entry).join(", ")}]`
    : `[${v.value.map((r) => `[${r.map(entry).join(", ")}]`).join(", ")}]`;
  if (style === "sympy") return `sp.Matrix(${list})`;
  if (style === "numpy") return `np.array(${list})`;
  return list;
}

const FUNCS = {
  sin: "sin", cos: "cos", tan: "tan", ln: "log", log: "log", exp: "exp",
  arcsin: "asin", arccos: "acos", arctan: "atan", sinh: "sinh", cosh: "cosh", tanh: "tanh",
  factorial: "factorial", binomial: "binomial", abs: "Abs",
};
const NP_FUNCS = { asin: "arcsin", acos: "arccos", atan: "arctan" };
const SPACING = new Set([",", ";", ":", "!", " ", "quad", "qquad"]);

// Small LaTeX -> Python expression converter for the kind of values exercises
// give: numbers, fractions, roots, powers, a few functions, implicit products.
export function latexToPy(src, lib = "sp") {
  const s = cas.asciiMath(src).trim();
  const frac = s.match(/^(-?)(?:\\[dt]?frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))$/);
  if (frac && lib === "sp") return `${frac[1]}sp.Rational(${frac[2] ?? frac[4]}, ${frac[3] ?? frac[5]})`;
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  const { nodes } = parseSeq(s, 0, null);
  return emit(nodes, lib);
}

function parseSeq(s, i, closer) {
  const nodes = [];
  while (i < s.length) {
    const c = s[i];
    if (closer && c === closer) return { nodes, i: i + 1 };
    if (/\s/.test(c)) { i++; continue; }
    const r = parseAtom(s, i, false);
    if (r.node) nodes.push(r.node);
    i = r.i;
  }
  return { nodes, i };
}

// single: after ^ or _, LaTeX takes one character (x^23 = x^2 * 3).
function parseAtom(s, i, single) {
  while (i < s.length && /\s/.test(s[i])) i++;
  const c = s[i];
  if (c === undefined) return { node: null, i };
  if (/[\d.]/.test(c)) {
    const m = single ? [c] : s.slice(i).match(/^\d*\.?\d+/) || [c];
    return { node: { t: "num", v: m[0] }, i: i + m[0].length };
  }
  if (/[A-Za-z]/.test(c)) {
    // Bare function names without a backslash (sin(c), exp(y), sqrt(x)),
    // otherwise sin(c) would become s*i*n*c.
    const fn = !single && s.slice(i).match(/^(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|exp|ln|log|sqrt|factorial|binomial|abs)(?![A-Za-z_])/);
    if (fn) {
      i += fn[1].length;
      if (fn[1] === "sqrt") {
        const a = parseAtom(s, i, true);
        return { node: { t: "sqrt", idx: null, arg: a.node }, i: a.i };
      }
      return { node: { t: "fn", v: FUNCS[fn[1]] }, i };
    }
    let v = c;
    i++;
    if (!single && s[i] === "_") {
      const sub = parseAtom(s, i + 1, true);
      v += "_" + flat(sub.node);
      i = sub.i;
    }
    return { node: { t: "id", v }, i };
  }
  if (c === "{") {
    const r = parseSeq(s, i + 1, "}");
    return { node: { t: "grp", items: r.nodes, brace: true }, i: r.i };
  }
  if (c === "(" || c === "[") {
    const r = parseSeq(s, i + 1, c === "(" ? ")" : "]");
    return { node: { t: "grp", items: r.nodes }, i: r.i };
  }
  if (c === "^") {
    const a = parseAtom(s, i + 1, true);
    return { node: { t: "pow", arg: a.node }, i: a.i };
  }
  if (c === "\\") {
    const m = s.slice(i + 1).match(/^([A-Za-z]+|.)/);
    const name = m ? m[1] : "";
    i += 1 + name.length;
    if (SPACING.has(name)) return { node: null, i };
    if (name === "left" || name === "right") {
      if (s[i] === ".") i++;
      return { node: null, i };
    }
    if (name === "cdot" || name === "times") return { node: { t: "op", v: "*" }, i };
    if (name === "div") return { node: { t: "op", v: "/" }, i };
    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const n = parseAtom(s, i, true);
      const d = parseAtom(s, n.i, true);
      return { node: { t: "frac", n: n.node, d: d.node }, i: d.i };
    }
    if (name === "sqrt") {
      let idx = null;
      if (s[i] === "[") {
        const r = parseSeq(s, i + 1, "]");
        idx = { t: "grp", items: r.nodes };
        i = r.i;
      }
      const a = parseAtom(s, i, true);
      return { node: { t: "sqrt", idx, arg: a.node }, i: a.i };
    }
    if (FUNCS[name]) return { node: { t: "fn", v: FUNCS[name] }, i };
    if (name === "pi" || name === "infty") return { node: { t: "const", v: name }, i };
    if (name === "mathrm" || name === "text" || name === "operatorname") {
      const a = parseAtom(s, i, true);
      return { node: { t: "id", v: flat(a.node) }, i: a.i };
    }
    return { node: { t: "id", v: name }, i };
  }
  return { node: { t: "op", v: c }, i: i + 1 };
}

function flat(node) {
  if (!node) return "";
  if (node.t === "grp") return node.items.map(flat).join("");
  return node.v ?? "";
}

const isOperand = (n) => n && n.t !== "op";

function emit(nodes, lib) {
  let out = "";
  let prev = null;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    let piece;
    if (n.t === "fn") {
      // \sin^2 x -> sin(x)**2
      let pow = null;
      if (nodes[i + 1]?.t === "pow") pow = nodes[++i].arg;
      const arg = nodes[++i];
      const name = lib === "np" ? NP_FUNCS[n.v] || n.v : n.v;
      piece = `${lib}.${name}(${arg ? bare(arg, lib) : ""})` + (pow ? "**" + atom(pow, lib) : "");
    } else if (n.t === "pow") {
      piece = "**" + (n.arg ? atom(n.arg, lib) : "");
    } else {
      piece = one(n, lib);
    }
    if (isOperand(n) && n.t !== "pow" && isOperand(prev)) out += "*";
    else if (n.t === "op" && /[+\-=<>]/.test(n.v) && out) piece = ` ${piece} `;
    out += piece;
    prev = n;
  }
  return out.replace(/\s+/g, " ").trim();
}

// A node as an operand: parenthesized unless it's already one token.
function atom(n, lib) {
  if (n.t === "grp") return one(n, lib); // already parenthesized when needed
  const s = one(n, lib);
  return /^[\w.]+$/.test(s) || /^[\w.]+\(.*\)$/.test(s) && balanced(s) ? s : `(${s})`;
}

// A node's text without the outer parens a brace group would add.
function bare(n, lib) {
  return n.t === "grp" ? emit(n.items, lib) : one(n, lib);
}

function balanced(s) {
  // "f(a)(b)" isn't one call; only accept when the first "(" closes at the end.
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0 && i !== s.length - 1) return false;
  }
  return true;
}

function one(n, lib) {
  switch (n.t) {
    case "num": return n.v;
    case "id": return n.v === "e" ? (lib === "sp" ? "sp.E" : `${lib}.e`) : n.v;
    case "const":
      if (n.v === "pi") return `${lib}.pi`;
      return lib === "sp" ? "sp.oo" : `${lib}.inf`;
    case "grp": return n.items.length === 1 ? atom(n.items[0], lib) : `(${emit(n.items, lib)})`;
    case "frac": {
      const a = n.n && bare(n.n, lib);
      const b = n.d && bare(n.d, lib);
      if (lib === "sp" && /^\d+$/.test(a) && /^\d+$/.test(b)) return `sp.Rational(${a}, ${b})`;
      return `${wrap(a)}/${wrap(b)}`;
    }
    case "sqrt": {
      const a = n.arg ? bare(n.arg, lib) : "";
      if (!n.idx) return `${lib}.sqrt(${a})`;
      const k = bare(n.idx, lib);
      return lib === "sp" ? `sp.root(${a}, ${k})` : `${wrap(a)}**(1/${wrap(k)})`;
    }
    case "op": return n.v;
    default: return "";
  }
}

function wrap(s) {
  return /^[\w.]+$/.test(s) || /^[\w.]+\(.*\)$/.test(s) && balanced(s) ? s : `(${s})`;
}

// ---------- sets, intervals, points, relations ----------

const REL_OPS = ["\\leq", "\\geq", "\\neq", "\\le", "\\ge", "\\lt", "\\gt", "<=", ">=", "=", "<", ">"];

// The first top-level relation in `s`: { op, lhs, rhs, value } or null.
export function findRelation(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    if (depth !== 0) continue;
    if (c === "\\" && /^\\(left|right)/.test(s.slice(i))) continue;
    for (const op of REL_OPS) {
      if (!s.startsWith(op, i)) continue;
      if (op.startsWith("\\") && /[a-zA-Z]/.test(s[i + op.length] || "")) continue;
      const lhs = s.slice(0, i).trim();
      const rhs = s.slice(i + op.length).trim();
      if (!lhs || !rhs) return null;
      return { op, lhs, rhs, value: s.trim() };
    }
  }
  return null;
}

function otherValue(name, value) {
  if (/^(\\emptyset|\\varnothing|\\\{\s*\\\})$/.test(value)) return { name, kind: "set", value: [] };
  const set = value.match(/^\\\{([\s\S]*)\\\}$/) || value.match(/^\\left\\\{([\s\S]*)\\right\\\}$/);
  if (set) {
    const inner = set[1].trim();
    if (/\\mid|\\colon|(^|[^\\])\||:/.test(inner)) return { name, kind: "set", builder: true, value };
    return { name, kind: "set", value: inner ? splitTop(inner, ",") : [] };
  }
  // Intervals: [a, b), (a, b], ]a, b[, \left[a, b\right]. (a, b) is a point.
  const iv = value.match(/^(\\left)?\s*([[(\]])([\s\S]*?)(\\right)?\s*([\])[])$/);
  if (iv && closesAtEnd(value)) {
    const items = splitTop(iv[3], ",");
    const [open, close] = [iv[2], iv[5]];
    const plainVector = open === "[" && close === "]" && !iv[1];
    const point = open === "(" && close === ")";
    if (point && items.length >= 2) return { name, kind: "vector", tuple: true, value: items };
    if (!plainVector && !point && items.length === 2) {
      return { name, kind: "interval", value: items, lopen: open !== "[", ropen: close !== "]" };
    }
  }
  const rel = findRelation(value);
  if (rel) return { name, kind: "relation", ...rel };
  return null;
}

// True if the bracket opened at the start closes at the very end.
function closesAtEnd(s) {
  const t = s.replace(/^\\left\s*/, "").replace(/\\right\s*(?=[\])[]$)/, "");
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\\") { i++; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    if (depth === 0 && i < t.length - 1 && i > 0) return false;
    if (depth === 0 && i === 0) return false;
  }
  return true;
}

// What the variable looks like on the left of "=": f(x, y), \lambda, A_{1}.
export function displayName(v) {
  return v.params ? `${latexName(v.name)}(${v.params.join(", ")})` : latexName(v.name);
}

// ---------- computed variables: H = hessian(f), Ai = A^{-1}, ... ----------

const DERIVED_FNS = {
  hessian: "hessian", hess: "hessian", grad: "grad", gradient: "grad", matrixderivative: "jacobian", jacobian: "jacobian", jac: "jacobian",
  inv: "inv", inverse: "inv", det: "det", transpose: "transpose", rref: "rref", rank: "rank", trace: "trace", tr: "trace",
  diff: "diff", derivative: "diff", partial: "diff", taylor: "taylor", charpoly: "charpoly", eig: "eig", eigenvalues: "eig",
  adj: "adj", adjugate: "adj", cofactor: "cofactor", dot: "dot", norm: "norm", cross: "cross", subs: "at", at: "at",
  laplacian: "laplacian", identity: "eye", eye: "eye", zeros: "zeros", augment: "augment", expand: "expand",
  proj: "proj", projection: "proj", tangent: "tangent", newton: "newton", quadform: "quadform", sym: "symmetric", symmetric: "symmetric",
  lagrangian: "lagrangian", compose: "compose", interpolate: "interpolate",
};

const STRONG = new RegExp(`(^|[^A-Za-z\\\\])(${Object.keys(DERIVED_FNS).join("|")})\\s*\\(|\\\\nabla`);

// A computed variable, or null if `value` isn't a formula over other variables.
export function derivedValue(name, value, scope) {
  const strong = STRONG.test(value);
  const call = value.match(/^([A-Za-z]\w*)\s*\(([^()]*)\)$/);
  const fnCall = call && scope.get(call[1])?.kind === "scalar";
  const refs = (value.replace(/\\[a-zA-Z]+/g, " ").match(/[A-Za-z]\w*/g) || []).filter((w) => {
    const v = scope.get(w);
    return v && (v.kind === "matrix" || v.kind === "vector");
  });
  const weak = refs.length > 0 && !/^\s*(\[|\\begin|\()/.test(value);
  if (!strong && !fnCall && !weak) return null;
  try {
    const r = new DerivedParser(value, scope).run();
    return { ...toVar(name, r), formula: value };
  } catch (e) {
    if (!strong && !fnCall) return null;
    return { name, kind: "scalar", value, formula: value, error: e.message };
  }
}

// A variable as CAS values: { t: "s", x } or { t: "m", M, vec }.
export function casOf(v, scope = new Map()) {
  const P = (s) => cas.parse(String(s));
  if (v.kind === "matrix") return { t: "m", M: v.value.map((r) => r.map(P)) };
  if (v.kind === "vector") return { t: "m", M: v.value.map((x) => [P(x)]), vec: true };
  if (v.kind === "scalar") return { t: "s", x: fnExpr(v, scope).x };
  if (v.kind === "set" && !v.builder) return { t: "set", items: v.value.map(P) };
  // g(x) <= b as the function g(x) - b (for Lagrangians and KKT).
  if (v.kind === "relation") return { t: "s", x: cas.sub(P(v.lhs), P(v.rhs)) };
  throw new Error(`can't compute with ${v.name} (${v.kind})`);
}

// A function variable: its expression with numeric constants from the vars
// block filled in, and its variables (from f(x, y) = ... or found in it).
export function fnExpr(v, scope = new Map()) {
  let x = cas.parse(v.value);
  const params = v.params || null;
  const consts = {};
  for (const s of cas.symbols(x)) {
    if (params?.includes(s)) continue;
    const c = scope.get(s);
    // Only constants from a vars block: an "x = 3" in a solution elsewhere
    // must not turn f's variable x into a number.
    if (c && c !== v && c.kind === "scalar" && !c.params && !c.source) {
      const val = cas.tryParse(c.value);
      if (val && cas.symbols(val).size === 0) consts[s] = val;
    }
  }
  if (Object.keys(consts).length) x = cas.subs(x, consts);
  const vars = params || cas.orderVars(cas.symbols(x));
  return { x, vars };
}

function toVar(name, r) {
  if (r.t === "s") return { name, kind: "scalar", value: r.tex ?? cas.tex(r.x, r.vars) };
  if (r.t === "list") return { name, kind: "vector", tuple: true, value: r.items.map((x) => cas.tex(x)) };
  if (r.t === "set") return { name, kind: "set", value: r.items.map((x) => cas.tex(x)) };
  const order = r.vars || cas.orderVars(new Set(r.M.flat().flatMap((x) => [...cas.symbols(x)])));
  const rows = r.M.map((row) => row.map((x) => cas.tex(x, order)));
  if (r.vec || rows.every((row) => row.length === 1) && r.vec !== false) return { name, kind: "vector", value: rows.map((row) => row[0]) };
  return { name, kind: "matrix", env: null, value: rows };
}

class DerivedParser {
  constructor(src, scope) {
    this.s = src.replace(/\\cdot|\\times/g, "*").replace(/\\left|\\right/g, "").replace(/\\top|\\mathsf\{T\}|\\intercal/g, "T").replace(/\\,|\\;|\\!/g, " ");
    this.i = 0;
    this.scope = scope;
    this.names = [...scope.keys()].sort((a, b) => b.length - a.length);
  }

  run() {
    const v = this.expr();
    this.ws();
    if (this.i < this.s.length) throw new Error(`can't read "${this.s.slice(this.i)}"`);
    return v;
  }

  ws() { while (/\s/.test(this.s[this.i] || "")) this.i++; }
  peek() { this.ws(); return this.s[this.i]; }

  expr() {
    let v;
    if (this.peek() === "-") { this.i++; v = neg(this.term()); }
    else v = this.term();
    for (;;) {
      const c = this.peek();
      if (c === "+") { this.i++; v = addV(v, this.term()); }
      else if (c === "-") { this.i++; v = addV(v, neg(this.term())); }
      else return v;
    }
  }

  term() {
    let v = this.factor();
    for (;;) {
      const c = this.peek();
      if (c === "*") { this.i++; v = mulV(v, this.factor()); }
      else if (c === "/") { this.i++; const d = this.factor(); if (d.t !== "s") throw new Error("can only divide by a number"); v = mulV(v, { t: "s", x: cas.pow(d.x, -1) }); }
      else if (c && /[A-Za-z0-9(\\{]/.test(c) && !this.s.startsWith("\\end", this.i)) v = mulV(v, this.factor());
      else return v;
    }
  }

  factor() {
    let v = this.primary();
    for (;;) {
      this.ws();
      if (this.s[this.i] !== "^") return v;
      this.i++;
      this.ws();
      let e;
      if (this.s[this.i] === "{") {
        const end = this.s.indexOf("}", this.i);
        e = this.s.slice(this.i + 1, end).trim();
        this.i = end + 1;
      } else {
        e = this.s[this.i++];
      }
      if (e === "T") { v = need(v, "m", "transpose"); v = { t: "m", M: cas.mat.transpose(v.M), vec: false }; continue; }
      const k = Number(e);
      if (!Number.isInteger(k)) {
        if (v.t !== "s") throw new Error(`can't raise a matrix to ${e}`);
        v = { t: "s", x: cas.pow(v.x, cas.parse(e)) };
        continue;
      }
      v = v.t === "m" ? { t: "m", M: cas.mat.power(v.M, k) } : { t: "s", x: cas.pow(v.x, k) };
    }
  }

  callPoint() {
    const a = this.args();
    return a.length === 1 ? a[0] : { t: "list", items: a.map((x) => need(x, "s", "a point").x) };
  }

  args() {
    const out = [];
    this.ws();
    if (this.s[this.i] !== "(") throw new Error("expected (");
    this.i++;
    if (this.peek() === ")") { this.i++; return out; }
    for (;;) {
      out.push(this.expr());
      const c = this.peek();
      this.i++;
      if (c === ")") return out;
      if (c !== ",") throw new Error("expected , or )");
    }
  }

  primary() {
    this.ws();
    const s = this.s;
    const c = s[this.i];
    if (c === undefined) throw new Error("unexpected end");
    if (c === "(") {
      const items = this.args();
      return items.length === 1 ? items[0] : { t: "list", items: items.map((x) => need(x, "s", "a point").x) };
    }
    if (c === "{") { this.i++; const v = this.expr(); this.ws(); this.i++; return v; }
    if (s.startsWith("\\nabla", this.i)) {
      this.i += 6;
      this.ws();
      let order = 1;
      if (s[this.i] === "^") { this.i++; this.ws(); order = Number(s[this.i] === "{" ? s.slice(this.i + 1, s.indexOf("}", this.i)) : s[this.i]); this.i = s[this.i] === "{" ? s.indexOf("}", this.i) + 1 : this.i + 1; }
      const target = this.primary();
      return apply(order === 2 ? "hessian" : "grad", [target], this);
    }
    if (s.startsWith("\\frac", this.i)) {
      this.i += 5;
      const a = this.primary();
      const b = this.primary();
      return mulV(a, { t: "s", x: cas.pow(need(b, "s", "a denominator").x, -1) });
    }
    if (c === "\\") {
      // Other LaTeX (\sqrt{2}, \pi): a scalar.
      const m = s.slice(this.i).match(/^\\[a-zA-Z]+(\{[^{}]*\})*/);
      this.i += m[0].length;
      return { t: "s", x: cas.parse(m[0]) };
    }
    if (/[\d.]/.test(c)) {
      const m = s.slice(this.i).match(/^\d*\.?\d+/);
      this.i += m[0].length;
      return { t: "s", x: cas.parse(m[0]) };
    }
    if (c === "[") {
      // A literal [[1, 2], [3, 4]] or [1, 2].
      let depth = 0;
      let j = this.i;
      for (; j < s.length; j++) {
        if (s[j] === "[") depth++;
        else if (s[j] === "]" && --depth === 0) break;
      }
      const v = parseValue("_", s.slice(this.i, j + 1));
      this.i = j + 1;
      return casOf(v, this.scope);
    }
    const word = s.slice(this.i).match(/^[A-Za-z]\w*/)[0];
    const fname = DERIVED_FNS[word];
    if (fname && /^\s*\(/.test(s.slice(this.i + word.length))) {
      this.i += word.length;
      const r = apply(fname, this.args(), this);
      // grad(f)(p): evaluate the result at a point.
      if (r.vars && s[this.i] === "(") {
        const m = pointMap(r.vars, this.callPoint());
        if (r.t === "m") return { ...r, M: cas.mat.map(r.M, (e) => cas.subs(e, m)) };
        return { ...r, x: cas.subs(r.x, m) };
      }
      return r;
    }
    if (c === "e" && !this.names.some((n) => s.startsWith(n, this.i) && !/\w/.test(s[this.i + n.length] || "")) && !/\w/.test(s[this.i + 1] || "")) {
      this.i++;
      return { t: "s", x: cas.parse("e") };
    }
    const named = this.names.find((n) => s.startsWith(n, this.i) && !/\w/.test(s[this.i + n.length] || ""))
      || this.names.find((n) => s.startsWith(n, this.i));
    if (named) {
      this.i += named.length;
      const v = this.scope.get(named);
      // f(p) or f(1, 2): evaluate a function variable.
      if (v.kind === "scalar" && s[this.i] === "(") return apply("at", [{ t: "fn", v }, ...this.args()], this);
      if (v.kind === "scalar") return { ...casOf(v, this.scope), t: "fn", v };
      return casOf(v, this.scope);
    }
    this.i++;
    let name = c;
    if (s[this.i] === "_") {
      const m = s.slice(this.i).match(/^_(\{\w+\}|\w)/);
      name += "_" + m[1].replace(/[{}]/g, "");
      this.i += m[0].length;
    }
    return { t: "s", x: cas.sym(name) };
  }
}

function need(v, t, what) {
  if (v.t === "fn" && t === "s") return v;
  if (v.t === "list" && t === "m") return { t: "m", M: v.items.map((x) => [x]), vec: true };
  if (v.t !== t && !(t === "s" && v.t === "fn")) throw new Error(`${what} needs ${t === "m" ? "a matrix or vector" : "a number or expression"}`);
  return v;
}

function neg(v) {
  if (v.t === "m") return { ...v, M: cas.mat.scale(v.M, cas.num(-1)) };
  if (v.t === "list") return { t: "list", items: v.items.map(cas.neg) };
  return { t: "s", x: cas.neg(v.x) };
}

function addV(a, b) {
  if (a.t === "list") a = need(a, "m");
  if (b.t === "list") b = need(b, "m");
  if (a.t === "m" && b.t === "m") return { t: "m", M: cas.mat.add(a.M, b.M), vec: a.vec && b.vec };
  if (a.t === "m" || b.t === "m") throw new Error("can't add a number and a matrix");
  return { t: "s", x: cas.add(a.x, b.x) };
}

function mulV(a, b) {
  if (a.t === "list") a = need(a, "m");
  if (b.t === "list") b = need(b, "m");
  if (a.t !== "m" && b.t !== "m") return { t: "s", x: cas.mul(a.x, b.x) };
  if (a.t !== "m") return { ...b, M: cas.mat.scale(b.M, a.x) };
  if (b.t !== "m") return { ...a, M: cas.mat.scale(a.M, b.x) };
  // u^T v of two vectors: a number.
  const M = cas.mat.mul(a.M, b.M);
  if (M.length === 1 && M[0].length === 1 && a.M.length === 1) return { t: "s", x: M[0][0] };
  return { t: "m", M, vec: M[0].length === 1 };
}

// The function behind f, \nabla f, grad(f): its expression and variables.
function fnOf(v, ctx) {
  if (v.t === "fn") return fnExpr(v.v, ctx.scope);
  if (v.t === "s") return { x: v.x, vars: cas.orderVars(cas.symbols(v.x)) };
  throw new Error("needs a function");
}

export function pointError(vars, n) {
  const has = vars.length === 1 ? "is 1 variable" : `are ${vars.length} variables`;
  return `there ${has} (${vars.join(", ")}), but the point has ${n} value${n === 1 ? "" : "s"}`;
}

function pointMap(vars, p) {
  const items = p.t === "list" ? p.items : p.t === "m" ? p.M.flat() : [p.x];
  if (items.length !== vars.length) throw new Error(pointError(vars, items.length));
  return Object.fromEntries(vars.map((v, i) => [v, items[i]]));
}

const colOf = (xs) => ({ t: "m", M: xs.map((x) => [x]), vec: true });

function apply(name, args, ctx) {
  const A = (i) => need(args[i], "m", name).M;
  const S = (i) => need(args[i], "s", name).x;
  const int = (i, d) => (args[i] ? Number(cas.tex(S(i))) : d);
  switch (name) {
    case "hessian": {
      const { x, vars } = fnOf(args[0], ctx);
      let H = cas.hessian(x, vars);
      if (args[1]) { const m = pointMap(vars, args[1]); H = cas.mat.map(H, (e) => cas.subs(e, m)); }
      return { t: "m", M: H, vec: false, vars };
    }
    case "grad": {
      const { x, vars } = fnOf(args[0], ctx);
      let g = cas.gradient(x, vars);
      if (args[1]) { const m = pointMap(vars, args[1]); g = g.map((e) => cas.subs(e, m)); }
      return { ...colOf(g), vars };
    }
    case "laplacian": {
      const { x, vars } = fnOf(args[0], ctx);
      return { t: "s", x: cas.add(...vars.map((v) => cas.diff(x, v, 2))), vars };
    }
    case "jacobian": {
      const F = need(args[0], "m", "jacobian").M.flat();
      const vars = cas.orderVars(new Set(F.flatMap((f) => [...cas.symbols(f)])));
      let J = cas.jacobian(F, vars);
      if (args[1]) { const m = pointMap(vars, args[1]); J = cas.mat.map(J, (e) => cas.subs(e, m)); }
      return { t: "m", M: J, vec: false, vars };
    }
    case "diff": {
      const { x, vars } = fnOf(args[0], ctx);
      const v = args[1] ? cas.tex(S(1)) : vars[0];
      return { t: "s", x: cas.diff(x, v, int(2, 1)), vars };
    }
    case "taylor": {
      const { x, vars } = fnOf(args[0], ctx);
      return { t: "s", x: cas.ZERO, tex: cas.taylorTex(x, vars[0] || "x", args[1] ? S(1) : cas.ZERO, int(2, 2)) };
    }
    case "at": {
      const { x, vars } = fnOf(args[0], ctx);
      const p = args.length > 2 ? { t: "list", items: args.slice(1).map((a) => need(a, "s").x) } : args[1];
      return { t: "s", x: cas.subs(x, pointMap(vars, p)) };
    }
    case "tangent": {
      const { x, vars } = fnOf(args[0], ctx);
      const m = pointMap(vars, args[1]);
      const parts = [cas.subs(x, m), ...vars.map((v) => cas.mul(cas.subs(cas.diff(x, v), m), cas.sub(cas.sym(v), m[v])))];
      return { t: "s", x: cas.add(...parts), vars };
    }
    case "newton": {
      const { x, vars } = fnOf(args[0], ctx);
      const m = pointMap(vars, args[1]);
      const H = cas.mat.map(cas.hessian(x, vars), (e) => cas.subs(e, m));
      const g = cas.gradient(x, vars).map((e) => [cas.subs(e, m)]);
      const step = cas.mat.mul(cas.mat.inverse(H), g);
      return colOf(vars.map((v, i) => cas.sub(m[v], step[i][0])));
    }
    case "quadform": {
      if (args[0].t === "m") {
        const M = A(0);
        const xs = M.map((_, i) => cas.sym(M.length <= 3 ? "xyz"[i] : `x_${i + 1}`));
        return { t: "s", x: cas.mat.mul([xs], cas.mat.mul(M, xs.map((x) => [x])))[0][0] };
      }
      const { x, vars } = fnOf(args[0], ctx);
      return { t: "m", M: cas.mat.scale(cas.hessian(x, vars), cas.num(1, 2)), vec: false, vars };
    }
    case "lagrangian": {
      const { x } = fnOf(args[0], ctx);
      const parts = [x];
      args.slice(1).forEach((g, i) => {
        const gx = g.t === "fn" ? fnExpr(g.v, ctx.scope).x : S(i + 1);
        parts.push(cas.neg(cas.mul(cas.sym(args.length > 2 ? `lambda_${i + 1}` : "lambda"), gx)));
      });
      return { t: "s", x: cas.add(...parts) };
    }
    case "compose": {
      const f = fnOf(args[0], ctx);
      const g = fnOf(args[1], ctx);
      return { t: "s", x: cas.subs(f.x, { [f.vars[0]]: g.x }) };
    }
    case "inv": return { t: "m", M: cas.mat.inverse(A(0)), vec: false };
    case "det": return { t: "s", x: cas.mat.det(A(0)) };
    case "transpose": return { t: "m", M: cas.mat.transpose(A(0)), vec: false };
    case "rref": return { t: "m", M: cas.mat.rref(A(0)), vec: false };
    case "rank": return { t: "s", x: cas.num(cas.mat.rank(A(0))) };
    case "trace": return { t: "s", x: cas.mat.trace(A(0)) };
    case "adj": return { t: "m", M: cas.mat.adjugate(A(0)), vec: false };
    case "cofactor": return { t: "m", M: cas.mat.cofactor(A(0)), vec: false };
    case "symmetric": { const M = A(0); return { t: "m", M: cas.mat.scale(cas.mat.add(M, cas.mat.transpose(M)), cas.num(1, 2)), vec: false }; }
    case "charpoly": return { t: "s", x: cas.charpoly(A(0)) };
    case "eig": {
      const M = A(0);
      const roots = cas.rationalRoots(cas.charpoly(M), "lambda");
      if (!roots && M.length === 2) {
        // (tr ± sqrt(tr^2 - 4 det)) / 2, exact with square roots.
        const tr = cas.mat.trace(M);
        const disc = cas.sub(cas.mul(tr, tr), cas.mul(cas.num(4), cas.mat.det(M)));
        const r = cas.pow(disc, cas.Q(1, 2));
        const half = cas.num(1, 2);
        return { t: "list", items: [cas.mul(half, cas.sub(tr, r)), cas.mul(half, cas.add(tr, r))] };
      }
      if (!roots) throw new Error("the eigenvalues aren't rational numbers; use \\eigen in a python block");
      return { t: "list", items: roots.map((q) => cas.num(q)) };
    }
    case "augment": { const M = A(0); const b = A(1); return { t: "m", M: M.map((r, i) => [...r, ...b[i]]), vec: false }; }
    case "dot": { const u = A(0).flat(); const v = A(1).flat(); return { t: "s", x: cas.add(...u.map((x, i) => cas.mul(x, v[i]))) }; }
    case "norm": { const u = A(0).flat(); return { t: "s", x: cas.pow(cas.add(...u.map((x) => cas.mul(x, x))), cas.Q(1, 2)) }; }
    case "cross": {
      const [a1, a2, a3] = A(0).flat();
      const [b1, b2, b3] = A(1).flat();
      return colOf([cas.sub(cas.mul(a2, b3), cas.mul(a3, b2)), cas.sub(cas.mul(a3, b1), cas.mul(a1, b3)), cas.sub(cas.mul(a1, b2), cas.mul(a2, b1))]);
    }
    case "proj": {
      const u = A(0).flat();
      const v = A(1).flat();
      const c = cas.div(cas.add(...u.map((x, i) => cas.mul(x, v[i]))), cas.add(...v.map((x) => cas.mul(x, x))));
      return colOf(v.map((x) => cas.mul(c, x)));
    }
    case "eye": return { t: "m", M: cas.mat.identity(int(0, 2)), vec: false };
    case "zeros": return { t: "m", M: cas.mat.zeros(int(0, 2), int(1, int(0, 2))), vec: false };
    case "expand": return args[0].t === "m" ? args[0] : { t: "s", x: S(0) };
    case "interpolate": {
      const P = A(0);
      const pts = P[0].length === 2 ? P : cas.mat.transpose(P);
      const x = cas.sym("x");
      let poly = cas.ZERO;
      pts.forEach(([xi, yi], i) => {
        let L = cas.ONE;
        pts.forEach(([xj], j) => { if (j !== i) L = cas.mul(L, cas.div(cas.sub(x, xj), cas.sub(xi, xj))); });
        poly = cas.add(poly, cas.mul(yi, L));
      });
      return { t: "s", x: poly };
    }
    default: throw new Error(`unknown ${name}`);
  }
}

// ---------- variables defined in the note's math ----------

// Definitions written in the note's math: $f(x, y) = ...$, $A = \begin{pmatrix}..$,
// $x_0 = (1, 2)$. Skips names the vars blocks already have.
export function findDefinitions(doc, existing = new Map()) {
  const text = doc.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[^\n]*$/gm, "");
  const re = /\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?![\s$])((?:\\.|[^$\n\\])+?)\$/g;
  const out = [];
  const seen = new Set(existing.keys());
  let m;
  while ((m = re.exec(text))) {
    const math = (m[1] ?? m[2]).trim();
    const parts = /\\begin\{/.test(math) ? math.split(/,\s*\\quad|\\quad|;\s/) : math.split(/\\\\|,\s*\\quad|\\quad|;\s/);
    for (const part of parts) {
      const d = part.trim().match(/^\\?([A-Za-z](?:_\{?\w+\}?)?|\\[a-zA-Z]+)\s*(\(\s*[a-z](?:_\{?\d\}?)?(?:\s*,\s*[a-z](?:_\{?\d\}?)?)*\s*\))?\s*:?=\s*([\s\S]+)$/);
      if (!d) continue;
      let name = d[1].replace(/^\\/, "").replace(/[{}]/g, "");
      if (/^(text|mathrm|frac|sum|int|lim|nabla|partial)$/.test(name)) continue;
      let value = d[3].trim().replace(/[.,]$/, "");
      // Stop at a second "=" (a derivation chain): keep the first value only.
      const rel = findRelation(value);
      if (rel && rel.op === "=") value = rel.lhs;
      if (!value || seen.has(name)) continue;
      const v = parseValue(name, value);
      if (!v) continue;
      seen.add(name);
      out.push({ name, line: `${name}${d[2] ? d[2].replace(/\s+/g, "").replace(/,/g, ", ") : ""} = ${value}` });
    }
  }
  return out;
}

// ---------- what @name inserts ----------

// kind: "math" | "text" | "python"; atLineStart: only spaces before the @.
export function insertFor(v, kind, { style = "sympy", atLineStart = false } = {}) {
  if (kind === "python") {
    const py = toPython(v, style);
    return atLineStart ? `${v.name} = ${py}` : py;
  }
  const tex = toLatex(v);
  if (kind === "text") return `$${displayName(v)} = ${tex}$`;
  return tex;
}

// Variables whose name starts with `query`; exact-case matches first.
export function matchVars(vars, query) {
  const q = query.toLowerCase();
  return [...vars.values()]
    .filter((v) => v.name.toLowerCase().startsWith(q))
    .sort((a, b) => (b.name.startsWith(query) - a.name.startsWith(query)) || a.name.length - b.name.length || a.name.localeCompare(b.name));
}
