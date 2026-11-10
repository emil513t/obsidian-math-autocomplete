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
import { toPython } from "./vars.js";

const IMPORTS = {
  sympy: "import sympy as sp",
  numpy: "import numpy as np",
  plt: "import matplotlib.pyplot as plt",
  scipy: "import scipy.optimize as opt",
  integrate: "import scipy.integrate as si",
  itertools: "import itertools",
  torch: "import torch",
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
  if (kind === "set" || kind === "list") return v.kind === "vector";
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
export function buildPySnippet(s, { vars = new Map(), before = "" } = {}) {
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
  const text = [...header, ...defs, ...(header.length || defs.length ? [""] : []), body].join("\n").replace(/\n{3,}/g, "\n\n");
  return { text, used, syms };
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
