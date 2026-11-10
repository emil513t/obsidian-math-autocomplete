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

export const PY_LANGS = new Set(["python", "py", "python3", "sage", "ipython"]);

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
export function parseVars(doc) {
  const vars = new Map();
  const re = /^[ \t]*(```|~~~)[ \t]*vars[ \t]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;
  let m;
  while ((m = re.exec(doc))) {
    for (const v of parseBlock(m[2])) vars.set(v.name, v);
  }
  return vars;
}

export function parseBlock(src) {
  const out = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = stripComment(lines[i]);
    const m = line.match(/^\s*\\?([A-Za-z][A-Za-z0-9_]*)\s*:?=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    // Multi-line values: an open \begin{..} or unbalanced brackets continue.
    while (i + 1 < lines.length && unfinished(value)) value += " " + stripComment(lines[++i]).trim();
    const v = parseValue(m[1], value);
    if (v) out.push(v);
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
  if (env) return matrixOrVector(name, latexRows(env[2]), env[1]);
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
  if (v.kind === "scalar") return latexEntry(v.value);
  const rows = v.kind === "vector" ? v.value.map((x) => [x]) : v.value;
  const e = env || v.env || "pmatrix";
  return `\\begin{${e}} ${rows.map((r) => r.map(latexEntry).join(" & ")).join(" \\\\ ")} \\end{${e}}`;
}

// ---------- Python output ----------

// style: "sympy" | "numpy" | "plain"
export function toPython(v, style = "sympy") {
  const lib = style === "sympy" ? "sp" : style === "numpy" ? "np" : "math";
  const entry = (e) => latexToPy(String(e), lib);
  if (v.kind === "scalar") return entry(v.value);
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
};
const NP_FUNCS = { asin: "arcsin", acos: "arccos", atan: "arctan" };
const SPACING = new Set([",", ";", ":", "!", " ", "quad", "qquad"]);

// Small LaTeX -> Python expression converter for the kind of values exercises
// give: numbers, fractions, roots, powers, a few functions, implicit products.
export function latexToPy(src, lib = "sp") {
  const s = src.trim();
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

// ---------- what @name inserts ----------

// kind: "math" | "text" | "python"; atLineStart: only spaces before the @.
export function insertFor(v, kind, { style = "sympy", atLineStart = false } = {}) {
  if (kind === "python") {
    const py = toPython(v, style);
    return atLineStart ? `${v.name} = ${py}` : py;
  }
  const tex = toLatex(v);
  if (kind === "text") return `$${latexName(v.name)} = ${tex}$`;
  return tex;
}

// Variables whose name starts with `query`; exact-case matches first.
export function matchVars(vars, query) {
  const q = query.toLowerCase();
  return [...vars.values()]
    .filter((v) => v.name.toLowerCase().startsWith(q))
    .sort((a, b) => (b.name.startsWith(query) - a.name.startsWith(query)) || a.name.length - b.name.length || a.name.localeCompare(b.name));
}
