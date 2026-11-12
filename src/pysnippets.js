// Python computation snippets (\hessian, \kkt, \intersection, ...) for
// ```python blocks, wired to the note's ```vars variables. Pure helpers, no
// Obsidian imports, so node can test them.
//
// Snippet file format (src/py-snippets.md), same as the text templates plus
// directive lines in the intro:
//   ## \hessian — Hessian matrix and definiteness (Def 8.2)
//   @uses sympy              imports: sympy | numpy | plt | scipy | itertools | torch
//   @in f expr               an input: name + kind (expr, matrix, vector, set, number, any)
//   @sym x y                 default symbols when no variable says otherwise
//   ### route label          optional solution routes, as in the text templates
// In the body, $SYMS becomes the symbol list, e.g. [x, y], and $SYM the first
// symbol; {{label}} is a Tab placeholder.

import { parseTemplates } from "./templates.js";
import { toPython, parseValue, splitTop, latexToPy } from "./vars.js";

const IMPORTS = {
  sympy: "import sympy as sp",
  numpy: "import numpy as np",
  plt: "import matplotlib.pyplot as plt",
  scipy: "import scipy.optimize as opt",
  integrate: "import scipy.integrate as si",
  itertools: "import itertools",
  torch: "import torch",
  hashlib: "import hashlib",
  // Exact solutions when sympy can find them, else numeric ones (nsolve from a
  // grid of starting points): 2x + sin x = 0 has no closed form.
  solve: [
    "def solve_all(eqs, syms):",
    "    eqs = list(eqs) if isinstance(eqs, (list, tuple)) else [eqs]",
    "    eqs = [e.lhs - e.rhs if isinstance(e, sp.Equality) else e for e in eqs]",
    "    syms = list(syms) if isinstance(syms, (list, tuple)) else [syms]",
    "    try:",
    "        return sp.solve(eqs, syms, dict=True)",
    "    except NotImplementedError:",
    "        pass",
    "    print(\"(no exact solution from sympy: solving numerically, values rounded to 10 digits)\")",
    "    import itertools",
    "    grid = [-10, -3, -1, -0.5, 0, 0.5, 1, 3, 10] if len(syms) <= 2 else [-3, -1, 0, 1, 3]",
    "    found = []",
    "    for start in itertools.product(grid, repeat=len(syms)):",
    "        try:",
    "            r = sp.nsolve(eqs, list(syms), list(start))",
    "        except Exception:",
    "            continue",
    "        s = {v: sp.Float(round(float(r[i]), 10)) + 0 for i, v in enumerate(syms)}",
    "        if all(abs(float(e.subs(s))) < 1e-8 for e in eqs) and s not in found:",
    "            found.append(s)",
    "    return found",
  ].join("\n"),
};

const KIND_HINT = {
  expr: "expression in x, y, ...",
  matrix: "[[1, 2], [3, 4]]",
  vector: "[1, 2]",
  set: "{1, 2, 3}",
  number: "number",
  any: "value",
};

const PY_WORDS = new Set([
  "sp", "np", "plt", "opt", "si", "math", "itertools", "and", "or", "not", "in", "is", "if", "else",
  "for", "lambda", "True", "False", "None", "oo", "pi", "E", "I",
]);

export function parsePySnippets(md) {
  return parseTemplates(md).map((t) => {
    const variants = (t.variants.length ? t.variants : [{ label: "", body: t.body }]).map((v) => parseDirectives(v.label, v.body));
    const first = variants[0];
    return { ...t, ...first, label: undefined, variants: t.variants.length ? variants : [], all: variants };
  });
}

// Pulls the @uses / @in / @sym / @ex lines out of one route's body.
function parseDirectives(label, body) {
  const meta = { label, uses: [], inputs: [], syms: [], examples: {} };
  meta.body = body
    .split("\n")
    .filter((line) => {
      const ex = line.match(/^@ex\s+(.+?)\s+:=\s+(.*)$/);
      if (ex) { meta.examples[ex[1]] = ex[2]; return false; }
      const d = line.match(/^@(uses|in|sym)\s+(.*)$/);
      if (!d) return true;
      const args = d[2].trim().split(/\s+/);
      if (d[1] === "uses") meta.uses.push(...args);
      else if (d[1] === "sym") meta.syms.push(...args);
      else if (!meta.inputs.some((x) => x.name === args[0])) meta.inputs.push({ name: args[0], kind: args[1] || "any", hint: args.slice(2).join(" ") });
      return false;
    })
    .join("\n")
    .replace(/^\s*\n/, "");
  return meta;
}

// Names assigned (or imported) anywhere in `code`.
export function definedNames(code) {
  const names = new Set();
  for (const line of code.split("\n")) {
    const a = line.match(/^\s*([A-Za-z_][\w, ]*?)\s*=(?!=)/);
    if (a) for (const n of a[1].split(",")) if (n.trim()) names.add(n.trim());
    const d = line.match(/^\s*def\s+([A-Za-z_]\w*)/);
    if (d) names.add(d[1]);
    const f = line.match(/^\s*for\s+([\w, ]+?)\s+in\b/);
    if (f) for (const n of f[1].split(",")) if (n.trim()) names.add(n.trim());
  }
  return names;
}

// Free symbol names in a Python expression (not functions or attributes).
export function freeSymbols(py) {
  const out = [];
  const noStrings = py.replace(/(["'])(?:\\.|(?!\1).)*\1/g, "");
  for (const m of noStrings.matchAll(/(?<![\w.])([A-Za-z_]\w*)(?!\s*\()/g)) {
    if (PY_WORDS.has(m[1]) || out.includes(m[1])) continue;
    out.push(m[1]);
  }
  return out;
}

function fits(v, kind) {
  if (kind === "any") return false; // only ever matched by name
  if (kind === "matrix") return v.kind === "matrix";
  if (kind === "vector") return v.kind === "vector" || (v.kind === "matrix" && (v.value.length === 1 || v.value.every((r) => r.length === 1)));
  if (v.error) return false;
  if (kind === "set") return v.kind === "vector" || (v.kind === "set" && !v.builder);
  if (kind === "list") return v.kind === "vector";
  if (kind === "points") return v.kind === "vector" || (v.kind === "matrix" && v.value.every((r) => r.length === 2));
  if (kind === "number") return v.kind === "scalar" && /^-?[\d./\\{}frac\s]+$/.test(v.value);
  if (kind === "expr") return v.kind === "scalar" && /[A-Za-z]/.test(v.value.replace(/\\(frac|sqrt|pi)\b/g, ""));
  return false;
}

function pyValue(v, kind, style) {
  const lib = style === "numpy" ? "numpy" : "sympy";
  const e = (x) => toPython({ kind: "scalar", value: x }, lib);
  if (kind === "list") return `[${v.value.map(e).join(", ")}]`;
  if (kind === "points") return v.kind === "matrix" ? `[${v.value.map((r) => `(${r.map(e).join(", ")})`).join(", ")}]` : `[${v.value.map(e).join(", ")}]`;
  if (kind === "set") return `{${v.value.map((e) => toPython({ kind: "scalar", value: e }, style)).join(", ")}}`;
  return toPython(v, style);
}

function replaceName(body, from, to) {
  if (from === to) return body;
  return body.replace(new RegExp(`(?<![\\w.'"])${from}(?![\\w'"])`, "g"), to);
}

// Builds the text inserted for snippet variant `body` of snippet `s`.
//   vars:   Map from parseVars (the note's variables)
//   before: the python code above the cursor in the same block
// Returns the body with an import / symbols / variables header, and the
// variables it used: [{ input, var }].
// s: one route from parsePySnippets (s.all[i]), or the snippet itself.
// answers: { name or placeholder label: typed text } from the inputs form;
// an empty or missing answer falls back to the note's vars / a Tab placeholder.
// explain(used) -> python lines printed before the computation (what it
// computes, the values used, the book references).
export function buildPySnippet(s, { vars = new Map(), before = "", answers = {}, explain = null } = {}) {
  let body = s.body;
  const defined = definedNames(before);
  const style = s.uses.includes("sympy") ? "sympy" : s.uses.includes("numpy") ? "numpy" : "plain";
  const header = [];
  const used = [];
  const taken = new Set();
  const defs = [];
  let syms = [];
  let anyUnresolved = false;

  for (const u of s.uses) {
    const line = IMPORTS[u];
    if (line && !before.includes(line)) header.push(line);
  }

  for (const inp of s.inputs) {
    if (defined.has(inp.name)) continue; // already in the code above: reuse it
    const typed = (answers[inp.name] ?? "").trim();
    if (typed) {
      const py = typedInput(inp, typed, style);
      defs.push(`${inp.name} = ${py}`);
      used.push({ input: inp.name, var: inp.name, typed: true });
      if (inp.kind !== "set" && inp.kind !== "any") {
        for (const n of freeSymbols(py)) if (!vars.has(n) && !syms.includes(n)) syms.push(n);
      }
      continue;
    }
    // Same name first (A for A), else the first unused variable of the right
    // kind that isn't meant for another input of this snippet.
    const same = vars.get(inp.name);
    const pick = same && !taken.has(same.name) && (inp.kind === "any" || fits(same, inp.kind))
      ? same
      : [...vars.values()].find((v) => fits(v, inp.kind) && !taken.has(v.name) && !s.inputs.some((i) => i !== inp && i.name === v.name));
    if (pick) {
      taken.add(pick.name);
      used.push({ input: inp.name, var: pick.name });
      // The snippet keeps its own names; a differently named variable is
      // copied in (A = b), so its printed labels stay right.
      if (defined.has(pick.name)) {
        defs.push(`${inp.name} = ${pick.name}`);
      } else {
        const py = pyValue(pick, inp.kind, style);
        defs.push(`${inp.name} = ${py}`);
        if (inp.kind !== "set") {
          for (const n of freeSymbols(py)) if (!vars.has(n) && !syms.includes(n)) syms.push(n);
        }
      }
    } else {
      anyUnresolved = true;
      defs.push(`${inp.name} = {{${inp.hint || `${inp.name}: ${KIND_HINT[inp.kind] || "value"}`}}}`);
    }
  }

  // Symbols: the variables' own, or the snippet's defaults.
  if (!syms.length || anyUnresolved) for (const n of s.syms) if (!syms.includes(n)) syms.push(n);
  if (!syms.length) syms = [...s.syms];
  syms.sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const needSym = syms.filter((n) => !defined.has(n));
  if (style === "sympy" && needSym.length && (s.syms.length || used.length || s.inputs.some((i) => i.kind === "expr"))) {
    header.push(needSym.length === 1
      ? `${needSym[0]} = sp.symbols('${needSym[0]}')`
      : `${needSym.join(", ")} = sp.symbols('${needSym.join(" ")}')`);
  }

  const symList = `[${syms.join(", ")}]`;
  body = body.replace(/\$SYMS\b/g, symList).replace(/\$SYM\b/g, syms[0] || "x");
  body = body.replace(/\{\{\s*([^{}\n]+?)\s*\}\}/g, (m, label) => {
    const typed = (answers[label] ?? "").trim();
    return typed ? answerToPy(typed, style, label) : m;
  });
  const ex = explain ? explain(used, s) : [];
  const text = [...header, ...defs, ...(header.length || defs.length ? [""] : []), ...ex, body].join("\n").replace(/\n{3,}/g, "\n\n");
  return { text, used, syms };
}

// ---------- finding a snippet by the words an exercise uses ----------

// Extra words people (and exercise texts) use for each snippet.
export const KEYWORDS = {
  compgraph: "computational graph computation graph backpropagation backprop back propagation autodiff automatic differentiation autograd reverse mode forward pass backward pass pytorch torch neural network chain rule adjoint",
  gradient: "nabla grad partial derivatives partials directional derivative steepest at a point",
  hessian: "second derivatives second order partials definiteness at a point mixed partials clairaut symmetric f_xy",
  jacobian: "derivative matrix total derivative differential",
  chainrule: "composite composition derivative g of f t vector function",
  derivative: "differentiate diff slope tangent line rate of change nth derivative definition difference quotient limit",
  tangentplane: "linear approximation linearization",
  critxy: "stationary points saddle point local minimum maximum extrema extremum two variables classify",
  crit: "stationary points local minimum maximum extrema extremum higher derivative test local max min at a point",
  evt: "extreme value theorem global maximum minimum closed interval",
  lagrange: "constraint constrained multiplier multipliers optimization equality",
  kkt: "karush kuhn tucker inequality constraints constrained optimization",
  compactopt: "compact set global max min boundary rectangle triangle polygon region vertices edges",
  convexopt: "constrained minimum numeric optimize scipy",
  newtonopt: "minimize newton optimization",
  newton: "newton raphson root finding numeric system jacobian iteration",
  ivt: "intermediate value theorem bisection root",
  mvt: "mean value theorem",
  lhopital: "hopital l'hopital indeterminate",
  taylor: "approximation expansion polynomial series maclaurin",
  limit: "lim limits",
  continuous: "continuity",
  integral: "integrate antiderivative double integral area under",
  area: "between curves",
  sum: "series summation sigma",
  solve: "equation inequality solutions",
  simplify: "factor expand partial fractions",
  subs: "evaluate plug in value at point",
  gauss: "gaussian elimination row reduce reduction rref echelon linear system equations",
  linsolve: "linear system equations solve ax b",
  matinv: "inverse invert matrix row reduction gauss jordan",
  det: "determinant cofactor",
  rank: "null space kernel column space image dimension basis",
  eigen: "eigenvalues eigenvectors diagonalize diagonalization characteristic polynomial",
  posdef: "positive definite semidefinite negative indefinite symmetric parameters for which values principal minors",
  quadform: "quadratic form",
  matmul: "matrix multiplication product transpose power identity general matrices symbolic",
  dot: "dot product inner product norm length angle orthogonal",
  projection: "project orthogonal projection",
  gramschmidt: "gram schmidt orthonormal basis orthogonalize",
  leastsquares: "least squares regression best fit line linear regression polynomial quadratic circle normal equations",
  lp: "linear programming linprog simplex optimize",
  fm: "fourier motzkin elimination",
  convexset: "convex set",
  convexfn: "convex function convexity",
  strictconvex: "strictly convex",
  line: "line through points parametric",
  svm: "support vector machine margin hyperplane classifier support vectors",
  perceptron: "classifier linear separable",
  truthtable: "truth table logic proposition and or not implies",
  equivalent: "logically equivalent logic de morgan contrapositive",
  sets: "set union intersection difference subset",
  cartesian: "cartesian product power set product identities pairs",
  setbuilder: "set builder predicate integers pairs twin primes list elements",
  intersection: "intersect meet where",
  injective: "one to one injection",
  surjective: "onto surjection",
  inversefn: "inverse function",
  composition: "compose composite function vector function g of f",
  preimage: "inverse image",
  sumind: "induction proof sum formula inequality induction check n",
  polydiv: "polynomial division long division remainder",
  roots: "zeros factor polynomial",
  interpolate: "interpolation polynomial through points shamir secret sharing lagrange interpolation",
  monotone: "increasing decreasing monotonic",
  plot: "plot graph draw curve function",
  contour: "contour level curves level sets",
  region: "shade region feasible inequalities",
  lambdify: "numpy function fast numeric",
  implicit: "implicit differentiation dy dx",
  mediant: "stern brocot tree fractions mediant naive addition rational",
  primes: "prime numbers factorization factor euclid primorial infinitely many primes",
  hash: "sha256 sha-256 md5 hash function cryptographic",
  tablefn: "table function injective surjective bijective composition inverse finite",
  network: "neural network perceptron xor and or hidden layer weights bias parameters count",
  horner: "horner evaluate polynomial multiplications fast",
  markov: "markov chain stochastic matrix stable distribution stationary powers steady state",
  eliminate: "word problem optimization constraint eliminate substitute fence box cylinder area volume maximize minimize",
  softmax: "softmax temperature dial beta probabilities attention sigmoid classes",
  annuity: "loan interest rate payments bank annuity mortgage",
  logistic: "logistic regression sigmoid log likelihood classification probability",
  kernelperceptron: "kernel perceptron nonlinear separation feature map",
};

// Rank snippets for a query of one or more words: \compg, \computational graph,
// \gradient at point. Every word must appear in the name, description or
// keywords; name-prefix matches come first.
export function rankPySnippets(query, snippets, picks = {}) {
  const q = query.toLowerCase().trim();
  const words = q.split(/[\s-]+/).filter(Boolean).filter((w) => !STOP.has(w) || q.split(/\s+/).length === 1);
  return snippets
    .map((t, i) => {
      const n = t.name.toLowerCase();
      const hay = `${n} ${t.desc.toLowerCase()} ${KEYWORDS[t.name] || ""}`;
      let score = 0;
      if (!q) score = 1;
      else if (!q.includes(" ") && n.startsWith(q)) score = t.name.startsWith(query) ? 6 : 5;
      else if (words.length && fitsWords(words, hay, n)) {
        score = 1 + (n.startsWith(words[0]) ? 2 : 0) + words.filter((w) => (KEYWORDS[t.name] || "").includes(w) || t.desc.toLowerCase().includes(w)).length / 10;
        if (hay.includes(q)) score += 1; // the whole phrase, e.g. "computational graph"
      }
      return { t, i, score, picked: picks[t.name] || 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.picked - a.picked || a.i - b.i)
    .map((x) => x.t);
}

// Every word matches, or all but one when the query has 3+ words.
function fitsWords(words, hay, n) {
  const hit = words.filter((w) => (w.length >= 2 ? hay.includes(w) : n.startsWith(w))).length;
  return hit === words.length || (words.length >= 3 && hit >= words.length - 1);
}

const STOP = new Set(["of", "the", "a", "an", "at", "in", "for", "to", "and", "with", "on", "by", "is", "f", "x", "y"]);

// ---------- the inputs form: ask for everything before inserting ----------

const PY_ONLY = /\b(sp|np|plt|opt|si|math|torch|hashlib|itertools)\.|\*\*|\blambda\b|\bfor\b|\brange\(|["'%@]|^\{[^{}]*:/;
const POINTISH = /point|direction|x0|start/i;
const TEXTISH = /\b(text|string|word|name)\b/i;

// Split t at top-level (outside brackets) matches of re; keeps the separators.
function splitAt(t, re) {
  const out = [];
  let depth = 0, cur = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    if (depth === 0) {
      const m = t.slice(i).match(re);
      if (m && m.index === 0 && m[0].length) {
        out.push(cur, m[0]);
        cur = "";
        i += m[0].length - 1;
        continue;
      }
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

const CMP = /^(<=|>=|==|!=|\\leq?|\\geq?|\\neq|≤|≥|≠|<|>|=)/;
const CMP_PY = { "\\le": "<=", "\\leq": "<=", "≤": "<=", "\\ge": ">=", "\\geq": ">=", "≥": ">=", "\\neq": "!=", "≠": "!=", "=": "==" };
const LOGIC = /^(\s+(and|or)\s+|\s*\\(land|lor|wedge|vee)\s*)/;

// A typed value (LaTeX or Python) as a Python expression. Lists, (a, b)
// tuples and {a, b} sets are converted element by element; conditions
// (x^2 - 5x + 6 = 0, x < 1 and y > 2) become Python comparisons; Python is
// kept as it is. A label like "text" keeps the answer as a string.
export function answerToPy(text, style = "sympy", label = "") {
  let t = text.trim();
  if (TEXTISH.test(label) && !/^["']/.test(t)) return JSON.stringify(t);
  if (PY_ONLY.test(t)) return t;
  const lib = style === "numpy" ? "np" : style === "plain" ? "math" : "sp";
  const set = t.match(/^\\?\{([\s\S]*?)\\?\}$/);
  if (set && balancedPair(t.replace(/^\\\{/, "{").replace(/\\\}$/, "}"))) {
    const items = splitTop(set[1], ",").filter((x) => x !== "");
    if (items.length > 1 || /^\\\{/.test(t)) return `{${items.map((x) => answerToPy(x, style)).join(", ")}}`;
  }
  const list = listItems(t);
  if (list) return `[${list.map((x) => answerToPy(x, style)).join(", ")}]`;
  const logic = splitAt(t, LOGIC);
  if (logic.length > 1) {
    return logic.map((p, i) => (i % 2 ? (/or|lor|vee/.test(p) ? " or " : " and ") : answerToPy(p, style))).join("");
  }
  const cmp = splitAt(t, CMP);
  if (cmp.length > 1) {
    return cmp.map((p, i) => (i % 2 ? ` ${CMP_PY[p] || p} ` : answerToPy(p, style))).join("");
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  t = t.replace(/(\b[A-Za-z0-9]+|\([^()]*\))!(?!=)/g, "factorial($1)");
  return latexToPy(t, lib);
}

// An equation typed for an expression input (\pi r^2 h = V) as lhs - (rhs).
function equationAsExpr(typed, style) {
  const cmp = splitAt(typed, CMP);
  if (cmp.length === 3 && cmp[1] === "=") return `${answerToPy(cmp[0], style)} - (${answerToPy(cmp[2], style)})`;
  return null;
}

// [a, b, c] / (a, b, c) / \begin{pmatrix} a \\ b \end{pmatrix} -> ["a", "b", "c"]; else null.
function listItems(t) {
  const env = t.match(/^\\begin\{[pbv]?matrix\}([\s\S]*)\\end\{[pbv]?matrix\}$/);
  if (env) {
    const rows = splitTop(env[1], "\\\\").filter((r) => r.trim());
    if (rows.length > 1 && rows.every((r) => splitTop(r, "&").length === 1)) return rows.map((r) => r.trim());
    const cols = rows.length === 1 ? splitTop(rows[0], "&") : null;
    return cols && cols.length > 1 ? cols : null;
  }
  const br = t.match(/^\[([\s\S]*)\]$/) || t.match(/^\(([\s\S]*)\)$/);
  if (!br || !balancedPair(t)) return null;
  const items = splitTop(br[1], ",").filter((x) => x !== "");
  if (t.startsWith("(") && items.length < 2) return null; // (x + 1) is just brackets
  return items;
}

function balancedPair(t) {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if ("([{".includes(t[i])) depth++;
    else if (")]}".includes(t[i])) depth--;
    if (depth === 0 && i < t.length - 1) return false;
  }
  return depth === 0;
}

function typedInput(inp, typed, style) {
  if (inp.kind === "any" || PY_ONLY.test(typed)) return typed;
  if (inp.kind === "expr") {
    const eq = equationAsExpr(typed, style);
    if (eq) return eq;
  }
  if (inp.kind === "set" || inp.kind === "list" || inp.kind === "points") {
    const items = listItems(typed.replace(/^\{([\s\S]*)\}$/, "[$1]"));
    if (items) {
      const py = items.map((x) => answerToPy(x, style));
      if (inp.kind === "set") return `{${py.join(", ")}}`;
      if (inp.kind === "points") return `[${py.map((p) => p.startsWith("[") ? `(${p.slice(1, -1)})` : p).join(", ")}]`;
      return `[${py.join(", ")}]`;
    }
  }
  const v = parseValue(inp.name, typed);
  return v ? pyValue(v, inp.kind, style) : typed;
}

// The note-side text of a vars variable, to prefill the form.
function sourceText(v) {
  if (v.kind === "scalar" || v.kind === "relation") return v.value;
  if (v.kind === "vector") return `[${v.value.join(", ")}]`;
  if (v.kind === "set") return v.builder ? v.value : `[${v.value.join(", ")}]`;
  if (v.kind === "interval") return `${v.lopen ? "(" : "["}${v.value.join(", ")}${v.ropen ? ")" : "]"}`;
  if (v.kind === "piecewise") return v.value.map((r) => r.join(" ")).join("; ");
  return `[${v.value.map((r) => `[${r.join(", ")}]`).join(", ")}]`;
}

// Resize a point-like default ([1, 1]) to the number of variables.
export function sizeDefault(example, label, n) {
  if (example == null || !POINTISH.test(label) || n < 2) return example;
  const items = listItems(example.trim());
  if (!items || items.length === n || items.some((x) => listItems(x))) return example;
  const same = items.every((x) => x === items[0]);
  const out = Array.from({ length: n }, (_, i) => items[i] ?? (same ? items[0] : "0"));
  return `[${out.join(", ")}]`;
}

// Everything route `s` needs answered to insert with no blanks left:
// its inputs (prefilled from the note's vars) and its {{placeholders}}
// (prefilled from @ex, point-like ones sized to the variables).
export function snippetQuestions(s, { vars = new Map(), before = "" } = {}) {
  const defined = definedNames(before);
  const { used, syms } = buildPySnippet(s, { vars, before });
  const questions = [];
  for (const inp of s.inputs) {
    if (defined.has(inp.name)) continue;
    const u = used.find((x) => x.input === inp.name);
    const v = u && vars.get(u.var);
    questions.push({
      key: inp.name, type: "input", kind: inp.kind, label: inp.name,
      value: v ? sourceText(v) : "", from: v ? v.name : null,
      hint: inp.hint || KIND_HINT[inp.kind] || "value",
    });
  }
  const seen = new Set();
  for (const m of s.body.matchAll(/\{\{\s*([^{}\n]+?)\s*\}\}/g)) {
    const label = m[1];
    if (seen.has(label)) continue;
    seen.add(label);
    const ex = s.examples[label];
    questions.push({ key: label, type: "placeholder", label, value: sizeDefault(ex, label, syms.length) ?? "", from: null, hint: ex ?? "" });
  }
  return { questions, syms };
}

// Problems with the answers: a point with the wrong number of coordinates.
// Returns { syms, error } (error null when fine).
export function checkAnswers(s, ctx, answers) {
  const { syms } = buildPySnippet(s, { ...ctx, answers });
  if (syms.length < 2) return { syms, error: null };
  for (const [label, text] of Object.entries(answers)) {
    if (!POINTISH.test(label) || !text.trim() || s.inputs.some((i) => i.name === label)) continue;
    const items = listItems(text.trim());
    if (items && !items.some((x) => listItems(x)) && items.length !== syms.length) {
      return { syms, error: `There are ${syms.length} variables (${syms.join(", ")}), but ${label} has ${items.length} value${items.length === 1 ? "" : "s"}.` };
    }
  }
  return { syms, error: null };
}

// x, y, z first, then the rest alphabetically: matches how notes write them.
function order(n) {
  const i = ["x", "y", "z", "t", "u", "v", "w"].indexOf(n);
  return i === -1 ? 100 : i;
}

// ---------- member completion: sp.<...>, np.<...>, plt.<...> ----------

// Counts of lib.member uses inside ```python blocks of a document.
export function scanPython(doc) {
  const counts = new Map();
  const re = /^[ \t]*(```|~~~)[ \t]*(python|py|python3)[^\n]*\n([\s\S]*?)^[ \t]*\1/gm;
  let m;
  while ((m = re.exec(doc))) {
    for (const a of m[3].matchAll(/(?<![\w.])((?:sp|np|plt|opt|si)(?:\.(?:linalg|random))?)\.([A-Za-z_]\w*)/g)) {
      const k = `${a[1]}.${a[2]}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return counts;
}

export function mergeCounts(list) {
  const out = new Map();
  for (const c of list) for (const [k, n] of c) out.set(k, (out.get(k) || 0) + n);
  return out;
}

// Common members, so completion works before the vault has examples.
// A trailing "()" means it's called; the cursor lands inside the parens.
const CURATED = {
  sp: "symbols() Symbol() Matrix() Rational() diff() integrate() limit() solve() solveset() linsolve() nonlinsolve() simplify() expand() factor() collect() cancel() apart() together() series() summation() product() lambdify() hessian() Eq() Ne() Lt() Le() Gt() Ge() Interval() S oo pi E I sqrt() root() exp() log() ln() sin() cos() tan() asin() acos() atan() Abs() sign() Max() Min() Piecewise() N() nsimplify() Poly() div() roots() real_roots() nroots() degree() interpolate() zeros() ones() eye() diag() GramSchmidt() Implies() And() Or() Not() Equivalent() simplify_logic() satisfiable() FiniteSet() Union() Intersection() Complement() ProductSet() EmptySet floor() ceiling() binomial() factorial() gcd() lcm() isprime() factorint() latex() pprint() subsets() Function() Derivative() Integral() dsolve() plot() maximum() minimum() stationary_points() is_convex() function_range() continuous_domain()",
  np: "array() linspace() arange() zeros() ones() eye() diag() dot() cross() outer() matmul() transpose() sum() mean() median() std() var() min() max() argmin() argmax() abs() sqrt() exp() log() log10() sin() cos() tan() arcsin() arccos() arctan() pi e inf nan round() allclose() isclose() all() any() where() meshgrid() vstack() hstack() column_stack() concatenate() reshape() cumsum() prod() sort() unique() polyfit() polyval() roots() poly1d() ones_like() zeros_like() full() identity() trace() logical_and() logical_or() power() clip() sign() floor() ceil()",
  "np.linalg": "solve() inv() det() eig() eigh() eigvals() eigvalsh() norm() matrix_rank() lstsq() pinv() qr() svd() cholesky() matrix_power()",
  "np.random": "rand() randn() randint() choice() seed() default_rng() uniform() normal() shuffle() permutation()",
  plt: "plot() show() figure() subplots() subplot() title() xlabel() ylabel() legend() grid() scatter() bar() hist() axhline() axvline() xlim() ylim() xticks() yticks() xscale() yscale() contour() contourf() imshow() colorbar() fill_between() quiver() text() annotate() savefig() tight_layout() axis() gca() suptitle() boxplot() clabel()",
  opt: "minimize() linprog() root() fsolve() brentq() bisect() newton() minimize_scalar() curve_fit() least_squares()",
  si: "quad() dblquad() tplquad() nquad() solve_ivp() odeint() simpson() trapezoid()",
};

const CURATED_LIST = Object.fromEntries(Object.entries(CURATED).map(([lib, s]) => [lib, s.split(" ")]));

// lib: "sp" | "np" | "np.linalg" | ...; prefix: what's typed after the dot.
// Returns [{ name, call, uses }] best first.
export function rankMembers(lib, prefix, counts) {
  const out = new Map();
  CURATED_LIST[lib]?.forEach((m, i) => {
    const call = m.endsWith("()");
    const name = call ? m.slice(0, -2) : m;
    out.set(name, { name, call, uses: counts.get(`${lib}.${name}`) || 0, i });
  });
  for (const [k, n] of counts) {
    if (!k.startsWith(lib + ".")) continue;
    const name = k.slice(lib.length + 1);
    if (name.includes(".")) continue;
    if (!out.has(name)) out.set(name, { name, call: /^[a-z_]/.test(name) && !["pi", "e", "inf", "nan", "oo"].includes(name), uses: n, i: 1000 });
  }
  const p = prefix.toLowerCase();
  return [...out.values()]
    .filter((m) => m.name.toLowerCase().startsWith(p))
    .sort((a, b) => (b.name.startsWith(prefix) - a.name.startsWith(prefix)) || b.uses - a.uses || a.i - b.i);
}

// The code of the current fenced block above the cursor line (docBefore ends
// at the cursor).
export function codeBlockBefore(docBefore) {
  const lines = docBefore.split("\n");
  lines.pop(); // the cursor's own line
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[ \t]*(```|~~~)/.test(lines[i])) return lines.slice(i + 1).join("\n");
  }
  return lines.join("\n");
}
