// Math objects from the whole curriculum (Hessian, gradient, inverse, sets,
// intervals, ...) that the popup can build: in $$ math it inserts the LaTeX,
// in a ```vars block it inserts `name = value`. Like the matrix fills, each
// object offers options: computed from the note's variables first, then
// general forms, then "your own" ones that ask for sizes (m, n) or inputs.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { fnExpr, casOf, parseValue, toLatex, latexName, findRelation, derivedValue, pointError } from "./vars.js";
import { gauss, parseSystem, parseIneqs, fmStep, ineqTex } from "./elim.js";

const r = String.raw;

// ---------- LaTeX helpers ----------

export function matTex(rows, env = "pmatrix") {
  return `\\begin{${env}} ${rows.map((row) => row.join(" & ")).join(" \\\\ ")} \\end{${env}}`;
}
const texM = (M, vars, env) => matTex(M.map((row) => row.map((x) => cas.tex(x, vars))), env);
const texCol = (xs, vars, env) => matTex(xs.map((x) => [cas.tex(x, vars)]), env);
const tuple = (xs, vars) => `(${xs.map((x) => cas.tex(x, vars)).join(", ")})`;

const sub = (base, i, j) => (j === undefined ? `${base}_{${i}}` : `${base}_{${i}${j}}`);
const range = (n) => Array.from({ length: n }, (_, i) => i);
const xi = (n) => (n <= 3 ? range(n).map((i) => "xyz"[i]) : range(n).map((i) => `x_{${i + 1}}`));
const partialTex = (f, a, b) => (b === undefined ? r`\frac{\partial ${f}}{\partial ${a}}` : a === b ? r`\frac{\partial^2 ${f}}{\partial ${a}^2}` : r`\frac{\partial^2 ${f}}{\partial ${a} \partial ${b}}`);

const int = (s, d, lo = 1, hi = 12) => {
  const n = Number(String(s ?? "").trim());
  if (!Number.isInteger(n)) return d;
  return Math.max(lo, Math.min(hi, n));
};

// ---------- what the note has ----------

// Sorts the note's variables by what they can be used for.
export function objectContext(vars) {
  const ctx = { vars, fns: [], mats: [], vecs: [], sets: [], rels: [], scalars: [] };
  noteFns = ctx.fns;
  for (const v of vars.values()) {
    if (v.error) continue;
    try {
      if (v.kind === "scalar") {
        const f = fnExpr(v, vars);
        if (f.vars.length) ctx.fns.push({ v, ...f });
        else ctx.scalars.push({ v, x: f.x });
      } else if (v.kind === "matrix") ctx.mats.push({ v, M: casOf(v).M });
      else if (v.kind === "vector") ctx.vecs.push({ v, M: casOf(v).M, xs: casOf(v).M.map((row) => row[0]) });
      else if (v.kind === "set" && !v.builder) ctx.sets.push({ v, items: casOf(v).items });
      else if (v.kind === "relation") ctx.rels.push({ v, x: casOf(v).x });
    } catch (_) {
      // A value the engine can't read is simply not offered.
    }
  }
  return ctx;
}

const fname = (f) => (f.v.params ? `${latexName(f.v.name)}(${f.v.params.join(", ")})` : latexName(f.v.name));
const isConstVec = (p) => p.xs.every((x) => cas.symbols(x).size === 0);
// Points of length n: tuples like (1, 2) first; plain vectors only if there's no tuple.
const pointsFor = (ctx, n) => {
  const all = ctx.vecs.filter((p) => p.xs.length === n && isConstVec(p));
  const tuples = all.filter((p) => p.v.tuple);
  return tuples.length ? tuples : all;
};
const constVecs = (ctx) => ctx.vecs.filter(isConstVec);
// Functions of several variables (one-variable ones use derivative).
const multi = (ctx) => ctx.fns.filter((f) => f.vars.length >= 2);
const square = (ctx) => ctx.mats.filter((m) => m.M.length === m.M[0].length);
const at = (f, p) => Object.fromEntries(f.vars.map((v, i) => [v, p.xs[i]]));

// For every note function: "<label> at a point you type" (the point field
// also takes a variable name). compute(f, p) gets p as { v, xs }.
function askPointFor(ctx, prefix, label, compute, more = []) {
  return ctx.fns.map((f) => ({
    id: `${prefix}:${f.v.name}`, label: `${label(f)} at a point you type`,
    ask: [{ key: "p", label: `Point (${f.vars.join(", ")})`, hint: `(${f.vars.map(() => "1").join(", ")})` }, ...more(f)],
    build: (a) => {
      const m = parsePoint(a.p, f.vars);
      return compute(f, { v: { name: "p" }, xs: f.vars.map((v) => m[v]) }, a);
    },
  }));
}
const noMore = () => [];

// f(a) + ∇f(a)·h + ½ hᵀ ∇²f(a) h with h = x - a.
export function taylor2(f, p) {
  const m = at(f, p);
  const h = f.vars.map((v, i) => cas.sub(cas.sym(v), p.xs[i]));
  const g = cas.gradient(f.x, f.vars).map((e) => cas.subs(e, m));
  const H = cas.hessian(f.x, f.vars).map((r) => r.map((e) => cas.subs(e, m)));
  const quad = cas.add(...H.flatMap((r, i) => r.map((e, j) => cas.mul(e, h[i], h[j]))));
  return cas.add(cas.subs(f.x, m), ...g.map((e, i) => cas.mul(e, h[i])), cas.mul(cas.num(1, 2), quad));
}

// Safe option: computing can fail (singular matrix, ...); then show why.
function computed(id, label, fnc, extra = {}) {
  try {
    return { id, label, ...fnc(), ...extra };
  } catch (e) {
    return { id, label, error: e.message, ...extra };
  }
}

// "Your own": ask for a function and compute from it.
// Every "type it" field of every object: a variable's name (A, @f, f(x, y))
// is replaced by that variable's value, in the format the field expects.
// Letter/variable-name fields are left alone.
export function resolveAnswers(ask = [], answers = {}, vars = new Map()) {
  const out = { ...answers };
  const one = (text, key) => {
    const m = String(text || "").trim().match(/^@?([A-Za-z]\w*)\s*(\([^()]*\))?$/);
    const v = m && vars.get(m[1]);
    if (!v || v.error) return text;
    try {
      if (v.kind === "scalar") {
        try { return cas.tex(fnExpr(v, vars).x); } catch (_) { return v.value; }
      }
      if (v.kind === "matrix") return `[${casOf(v).M.map((r) => `[${r.map((x) => cas.tex(x)).join(", ")}]`).join(", ")}]`;
      if (v.kind === "vector") {
        const xs = casOf(v).M.map((r) => cas.tex(r[0]));
        return /^(p|x0|point)$/i.test(key) ? `(${xs.join(", ")})` : `[${xs.map((x) => `[${x}]`).join(", ")}]`;
      }
      if (v.kind === "set" && !v.builder) return `\\{${v.value.join(", ")}\\}`;
      // Equations, inequalities and statements: lhs op rhs.
      if (v.kind === "relation") return `${v.lhs} ${v.op} ${v.rhs}`;
    } catch (_) { /* keep what was typed */ }
    return text;
  };
  for (const q of ask) {
    const s = out[q.key];
    if (!s || /letter|^variables?\b|^start/i.test(q.label || "")) continue;
    out[q.key] = q.key === "F" || q.key === "e" ? String(s).split(";").map((t) => one(t, q.key)).join("; ") : one(s, q.key);
  }
  return out;
}

// The note's functions from the last objectContext, so a typed name (A, f,
// @g, f(x, y)) in a "function you type" field means that variable.
let noteFns = [];
export function typedFunction(text, fns = noteFns) {
  const m = String(text || "").trim().match(/^@?([A-Za-z]\w*)\s*(\([^()]*\))?$/);
  const hit = m && fns.find((f) => f.v.name === m[1]);
  if (hit) return { x: hit.x, vars: hit.vars, name: hit.v.name, value: hit.v.value };
  const x = cas.parse(text);
  return { x, vars: cas.orderVars(cas.symbols(x)) };
}

function askFunction(id, label, build, more = []) {
  return {
    id, label,
    ask: [{ key: "f", label: "Function (or the name of one of your variables)", hint: "x^2y + y^3, or f" }, { key: "vars", label: "Variables (empty: found in f)", hint: "x, y" }, ...more],
    build: (a) => {
      const t = typedFunction(a.f);
      const vars = a.vars?.trim() ? a.vars.split(",").map((s) => s.trim()).filter(Boolean) : t.vars;
      return build({ x: t.x, vars }, a);
    },
  };
}

function askMatrix(id, label, build, more = []) {
  return {
    id, label,
    ask: [{ key: "A", label: "Matrix", hint: "[[1, 2], [3, 4]]" }, ...more],
    build: (a) => build(casOf(parseValue("A", a.A.trim())).M, a),
  };
}

const sizeAsk = (m = "2", n = "2") => [{ key: "m", label: "Rows m", value: m }, { key: "n", label: "Columns n", value: n }];
const nAsk = (n = "3", label = "Size n") => [{ key: "n", label, value: n }];

// ---------- sized matrices (also offered after \pmatrix, \bmatrix, ...) ----------

export function sizedMatrixOptions(env = "pmatrix") {
  return [
    { id: "size-blank", label: "Blank m×n (asks m, n)", ask: sizeAsk("2", "3"), build: (a) => ({ value: matTex(range(int(a.m, 2)).map(() => range(int(a.n, 2)).map(() => "")), env), blank: true }) },
    { id: "size-idx", label: "Indexed m×n: a_{ij} (asks m, n)", ask: [...sizeAsk("2", "3"), { key: "a", label: "Letter", value: "a" }], build: (a) => ({ value: matTex(range(int(a.m, 2)).map((i) => range(int(a.n, 2)).map((j) => sub(a.a || "a", i + 1, j + 1))), env) }) },
    { id: "size-zero", label: "Zero m×n (asks m, n)", ask: sizeAsk(), build: (a) => ({ value: matTex(range(int(a.m, 2)).map(() => range(int(a.n, 2)).map(() => "0")), env) }) },
    { id: "size-id", label: "Identity n×n (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => range(int(a.n, 3)).map((j) => (i === j ? "1" : "0"))), env) }) },
    { id: "size-diag", label: "Diagonal (asks the entries)", ask: [{ key: "d", label: "Diagonal entries", hint: "1, 2, 3" }], build: (a) => { const d = a.d.split(",").map((s) => s.trim()); return { value: matTex(d.map((x, i) => d.map((_, j) => (i === j ? x : "0"))), env) }; } },
    { id: "size-sym", label: "Symmetric n×n: a_{ij} = a_{ji} (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => range(int(a.n, 3)).map((j) => sub("a", Math.min(i, j) + 1, Math.max(i, j) + 1))), env) }) },
    { id: "size-upper", label: "Upper triangular n×n (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => range(int(a.n, 3)).map((j) => (j >= i ? sub("a", i + 1, j + 1) : "0"))), env) }) },
    { id: "size-lower", label: "Lower triangular n×n (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => range(int(a.n, 3)).map((j) => (j <= i ? sub("a", i + 1, j + 1) : "0"))), env) }) },
    { id: "size-col", label: "Column vector with n entries (asks n)", ask: [...nAsk(), { key: "a", label: "Letter", value: "x" }], build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => [sub(a.a || "x", i + 1)]), env) }) },
    { id: "size-row", label: "Row vector with n entries (asks n)", ask: [...nAsk(), { key: "a", label: "Letter", value: "x" }], build: (a) => ({ value: matTex([range(int(a.n, 3)).map((i) => sub(a.a || "x", i + 1))], env) }) },
    { id: "size-unit", label: "Unit vector e_i in R^n (asks n, i)", ask: [...nAsk(), { key: "i", label: "Index i", value: "1" }], build: (a) => ({ value: matTex(range(int(a.n, 3)).map((k) => [k + 1 === int(a.i, 1) ? "1" : "0"]), env) }) },
    { id: "size-ones", label: "All ones m×n (asks m, n)", ask: sizeAsk(), build: (a) => ({ value: matTex(range(int(a.m, 2)).map(() => range(int(a.n, 2)).map(() => "1")), env) }) },
  ];
}

// ---------- the catalog ----------

// Each object: name (\name), words (also found by), desc, varName (default
// name in vars), options(ctx) -> [{ id, label, value?, formula?, lines?,
// ask?, build?, error?, varsOnly? }].
export const OBJECTS = [
  // ----- several variables (Ch7-8) -----
  {
    name: "hessian", words: "second derivatives hesse squarednabla", desc: "Hessian matrix ∇²f (Def 8.2)", varName: "H",
    options: (ctx) => [
      ...ctx.fns.flatMap((f) => [
        computed(`f:${f.v.name}`, `Hessian of ${fname(f)}`, () => ({ value: texM(cas.hessian(f.x, f.vars), f.vars), formula: `hessian(${f.v.name})` })),
        ...pointsFor(ctx, f.vars.length).map((p) => computed(`fp:${f.v.name}:${p.v.name}`, `Hessian of ${fname(f)} at ${p.v.name} = ${tuple(p.xs)}`, () => ({
          value: texM(cas.mat.map(cas.hessian(f.x, f.vars), (e) => cas.subs(e, at(f, p))), f.vars), formula: `hessian(${f.v.name}, ${p.v.name})`,
        }))),
      ]),
      ...askPointFor(ctx, "ap", (f) => `Hessian of ${fname(f)}`, (f, p) => ({ value: texM(cas.mat.map(cas.hessian(f.x, f.vars), (e) => cas.subs(e, at(f, p))), f.vars) }), noMore),
      { id: "gen2", label: "General 2×2: f_xx, f_xy, ...", value: matTex([[partialTex("f", "x", "x"), partialTex("f", "x", "y")], [partialTex("f", "y", "x"), partialTex("f", "y", "y")]]) },
      { id: "gen3", label: "General 3×3", value: matTex(xi(3).map((a) => xi(3).map((b) => partialTex("f", a, b)))) },
      { id: "genn", label: "General n×n (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(xi(int(a.n, 3)).map((p) => xi(int(a.n, 3)).map((q) => partialTex("f", p, q)))) }) },
      askFunction("own", "Of a function you type", ({ x, vars }) => ({ value: texM(cas.hessian(x, vars), vars) })),
      askFunction("ownp", "Of a function you type, at a point", ({ x, vars }, a) => {
        const p = parsePoint(a.p, vars);
        return { value: texM(cas.mat.map(cas.hessian(x, vars), (e) => cas.subs(e, p)), vars) };
      }, [{ key: "p", label: "Point", hint: "(1, 2)" }]),
    ],
  },
  {
    name: "gradient", words: "grad nabla partial derivatives", desc: "gradient ∇f (Sec 7.5)", varName: "g",
    options: (ctx) => [
      ...ctx.fns.flatMap((f) => [
        computed(`f:${f.v.name}`, `∇${fname(f)} as a column`, () => ({ value: texCol(cas.gradient(f.x, f.vars), f.vars), formula: `grad(${f.v.name})` })),
        computed(`fr:${f.v.name}`, `∇${fname(f)} as a row (… , …)`, () => ({ value: tuple(cas.gradient(f.x, f.vars), f.vars) })),
        ...pointsFor(ctx, f.vars.length).map((p) => computed(`fp:${f.v.name}:${p.v.name}`, `∇${fname(f)} at ${p.v.name} = ${tuple(p.xs)}`, () => ({
          value: texCol(cas.gradient(f.x, f.vars).map((e) => cas.subs(e, at(f, p)))), formula: `grad(${f.v.name}, ${p.v.name})`,
        }))),
      ]),
      ...askPointFor(ctx, "ap", (f) => `∇${fname(f)}`, (f, p) => ({ value: texCol(cas.gradient(f.x, f.vars).map((e) => cas.subs(e, at(f, p)))) }), noMore),
      { id: "gen2", label: "General (f_x, f_y)", value: matTex(xi(2).map((a) => [partialTex("f", a)])) },
      { id: "genn", label: "General with n variables (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(xi(int(a.n, 3)).map((p) => [partialTex("f", p)])) }) },
      askFunction("own", "Of a function you type", ({ x, vars }) => ({ value: texCol(cas.gradient(x, vars), vars) })),
    ],
  },
  {
    name: "jacobian", words: "jacobi derivative matrix vector function DF", desc: "Jacobian matrix of a vector function (Prop 7.9)", varName: "J",
    options: (ctx) => [
      ...ctx.vecs.filter((F) => F.xs.some((x) => cas.symbols(x).size)).map((F) => computed(`F:${F.v.name}`, `Jacobian of ${F.v.name} = ${tuple(F.xs)}`, () => {
        const vars = cas.orderVars(new Set(F.xs.flatMap((x) => [...cas.symbols(x)])));
        return { value: texM(cas.jacobian(F.xs, vars), vars), formula: `jacobian(${F.v.name})` };
      })),
      ...(sameVars(ctx).length >= 2 ? [computed("fns", `Jacobian of (${sameVars(ctx).map((f) => f.v.name).join(", ")})`, () => {
        const fs = sameVars(ctx);
        const vars = cas.orderVars(new Set(fs.flatMap((f) => f.vars)));
        return { value: texM(cas.jacobian(fs.map((f) => f.x), vars), vars) };
      })] : []),
      // One function: its Jacobian is the 1×n row of partial derivatives.
      ...ctx.fns.map((f) => computed(`s:${f.v.name}`, `Jacobian of ${fname(f)} alone (1×${f.vars.length} row)`, () => ({ value: texM([cas.gradient(f.x, f.vars)], f.vars), formula: `jacobian(${f.v.name})` }))),
      { id: "genmn", label: "General m×n: ∂f_i/∂x_j (asks m, n)", ask: sizeAsk("2", "2"), build: (a) => ({ value: matTex(range(int(a.m, 2)).map((i) => xi(int(a.n, 2)).map((x) => partialTex(`f_{${i + 1}}`, x)))) }) },
      { id: "own", label: "Of functions you type", ask: [{ key: "F", label: "Functions, separated by ;", hint: "x^2 y; x + \\sin y" }], build: (a) => {
        const fs = a.F.split(";").map((s) => cas.parse(s));
        const vars = cas.orderVars(new Set(fs.flatMap((f) => [...cas.symbols(f)])));
        return { value: texM(cas.jacobian(fs, vars), vars) };
      } },
    ],
  },
  {
    name: "partial", words: "partial derivative fx fxy mixed", desc: "partial derivatives ∂f/∂x, ∂²f/∂x∂y", varName: "fx",
    options: (ctx) => [
      ...ctx.fns.flatMap((f) => [
        ...f.vars.map((v) => computed(`f:${f.v.name}:${v}`, `∂${f.v.name}/∂${v}`, () => ({ value: cas.tex(cas.diff(f.x, v), f.vars), formula: `diff(${f.v.name}, ${v})` }), { name: `${f.v.name}_${v}` })),
        ...f.vars.flatMap((a, i) => f.vars.slice(i).map((b) => computed(`f2:${f.v.name}:${a}${b}`, (a === b ? `∂²${f.v.name}/∂${a}²` : `∂²${f.v.name}/∂${a}∂${b}`), () => ({ value: cas.tex(cas.diff(cas.diff(f.x, a), b), f.vars) }), { name: `${f.v.name}_${a}${b}` }))),
      ]),
      { id: "gen", label: "General ∂f/∂x", value: partialTex("f", "x") },
      { id: "gen2", label: "General ∂²f/∂x∂y", value: partialTex("f", "x", "y") },
    ],
  },
  {
    name: "laplacian", words: "laplace delta", desc: "Laplacian f_xx + f_yy + ...", varName: "Lf",
    options: (ctx) => [
      ...ctx.fns.map((f) => computed(`f:${f.v.name}`, `Laplacian of ${fname(f)}`, () => ({ value: cas.tex(cas.add(...f.vars.map((v) => cas.diff(f.x, v, 2))), f.vars), formula: `laplacian(${f.v.name})` }))),
      { id: "gen", label: "General Δf", value: r`\frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2}` },
    ],
  },
  {
    name: "tangentplane", words: "tangent plane linear approximation linearization", desc: "tangent plane z = f(a) + ∇f(a)·(x - a)", varName: "T",
    options: (ctx) => [
      ...ctx.fns.flatMap((f) => pointsFor(ctx, f.vars.length).map((p) => computed(`fp:${f.v.name}:${p.v.name}`, `Tangent of ${fname(f)} at ${p.v.name} = ${tuple(p.xs)}`, () => {
        const m = at(f, p);
        const x = cas.add(cas.subs(f.x, m), ...f.vars.map((v) => cas.mul(cas.subs(cas.diff(f.x, v), m), cas.sub(cas.sym(v), m[v]))));
        return { value: `${f.vars.length === 1 ? "y" : "z"} = ${cas.tex(x, f.vars)}`, formula: `tangent(${f.v.name}, ${p.v.name})` };
      }))),
      ...askPointFor(ctx, "ap", (f) => `Tangent of ${fname(f)}`, (f, p) => {
        const m = at(f, p);
        const x = cas.add(cas.subs(f.x, m), ...f.vars.map((v) => cas.mul(cas.subs(cas.diff(f.x, v), m), cas.sub(cas.sym(v), m[v]))));
        return { value: `${f.vars.length === 1 ? "y" : "z"} = ${cas.tex(x, f.vars)}` };
      }, noMore),
      { id: "gen", label: "General formula, 2 variables", value: r`z = f(a, b) + f_x(a, b)(x - a) + f_y(a, b)(y - b)` },
      askFunction("own", "Of a function you type, at a point", ({ x, vars }, a) => {
        const m = parsePoint(a.p, vars);
        const t = cas.add(cas.subs(x, m), ...vars.map((v) => cas.mul(cas.subs(cas.diff(x, v), m), cas.sub(cas.sym(v), m[v]))));
        return { value: `${vars.length === 1 ? "y" : "z"} = ${cas.tex(t, vars)}` };
      }, [{ key: "p", label: "Point", hint: "(1, 2)" }]),
    ],
  },
  {
    name: "directional", words: "directional derivative direction", desc: "directional derivative ∇f(p)·v", varName: "Dv",
    options: (ctx) => ctx.fns.flatMap((f) => pointsFor(ctx, f.vars.length).flatMap((p) => constVecs(ctx).filter((d) => d !== p && d.xs.length === f.vars.length).map((d) => computed(`${f.v.name}:${p.v.name}:${d.v.name}`, `∇${f.v.name}(${p.v.name})·${d.v.name}`, () => {
      const g = cas.gradient(f.x, f.vars).map((e) => cas.subs(e, at(f, p)));
      return { value: cas.tex(cas.add(...g.map((e, i) => cas.mul(e, d.xs[i])))) };
    })))).concat(askPointFor(ctx, "ap", (f) => `∇${f.v.name}·v`, (f, p, a) => {
      const g = cas.gradient(f.x, f.vars).map((e) => cas.subs(e, at(f, p)));
      const d = parsePoint(a.d, f.vars);
      return { value: cas.tex(cas.add(...g.map((e, i) => cas.mul(e, d[f.vars[i]])))) };
    }, (f) => [{ key: "d", label: `Direction v (${f.vars.length} numbers)`, hint: `(${f.vars.map(() => "1").join(", ")})` }]),
    [{ id: "gen", label: "General ∇f(p)·v", value: r`\nabla f(p) \cdot v` }]),
  },
  {
    name: "critical", words: "critical point stationary gradient zero equations", desc: "the equations ∇f = 0 for critical points (Def 7.15)", varName: "eqs",
    options: (ctx) => [
      ...ctx.fns.map((f) => computed(`f:${f.v.name}`, f.vars.length > 1 ? `∇${fname(f)} = 0` : `${f.v.name}' = 0`, () => {
        const g = cas.gradient(f.x, f.vars).map((e) => `${cas.tex(e, f.vars)} = 0`);
        return { value: `\\begin{cases} ${g.join(" \\\\ ")} \\end{cases}` };
      })),
      { id: "gen", label: "General f_x = 0, f_y = 0", value: r`\begin{cases} f_x(x, y) = 0 \\ f_y(x, y) = 0 \end{cases}` },
    ],
  },
  {
    name: "newtonstep", words: "newton method step iteration minimize", desc: "one Newton step x - H⁻¹∇f (Sec 8.3) / x - f/f' (Sec 6.3.5)", varName: "x_1",
    options: (ctx) => [
      ...ctx.fns.flatMap((f) => pointsFor(ctx, f.vars.length).map((p) => computed(`fp:${f.v.name}:${p.v.name}`, `Newton step for min ${f.v.name} from ${p.v.name} = ${tuple(p.xs)}`, () => {
        const m = at(f, p);
        const H = cas.mat.map(cas.hessian(f.x, f.vars), (e) => cas.subs(e, m));
        const g = cas.gradient(f.x, f.vars).map((e) => [cas.subs(e, m)]);
        const step = cas.mat.mul(cas.mat.inverse(H), g);
        return { value: texCol(f.vars.map((v, i) => cas.sub(m[v], step[i][0]))), formula: `newton(${f.v.name}, ${p.v.name})` };
      }))),
      ...ctx.fns.filter((f) => f.vars.length === 1).map((f) => ({ id: `1d:${f.v.name}`, label: `Newton for ${f.v.name}(x) = 0 from x_0 (asks x_0)`, ask: [{ key: "x0", label: "x_0", value: "1" }], build: (a) => {
        const x0 = cas.parse(a.x0);
        const m = { [f.vars[0]]: x0 };
        return { value: cas.tex(cas.sub(x0, cas.div(cas.subs(f.x, m), cas.subs(cas.diff(f.x, f.vars[0]), m)))) };
      } })),
      ...askPointFor({ ...ctx, fns: ctx.fns.filter((f) => f.vars.length > 1) }, "ap", (f) => `Newton step for min ${f.v.name}`, (f, p) => {
        const m = at(f, p);
        const H = cas.mat.map(cas.hessian(f.x, f.vars), (e) => cas.subs(e, m));
        const g = cas.gradient(f.x, f.vars).map((e) => [cas.subs(e, m)]);
        const step = cas.mat.mul(cas.mat.inverse(H), g);
        return { value: texCol(f.vars.map((v, i) => cas.sub(m[v], step[i][0]))) };
      }, noMore),
      { id: "gen", label: "General formula", value: r`v_{n+1} = v_n - \nabla^2 F(v_n)^{-1} \nabla F(v_n)^\top` },
    ],
  },
  {
    name: "quadform", words: "quadratic form symmetric matrix xTAx", desc: "quadratic form ⇄ symmetric matrix", varName: "A",
    options: (ctx) => [
      ...ctx.fns.map((f) => computed(`f:${f.v.name}`, `Symmetric matrix of ${fname(f)} (½·Hessian)`, () => ({ value: texM(cas.mat.scale(cas.hessian(f.x, f.vars), cas.num(1, 2)), f.vars), formula: `quadform(${f.v.name})` }))),
      ...notSquare(ctx, "the quadratic form xᵀAx"),
      ...square(ctx).map((m) => computed(`A:${m.v.name}`, `x^T ${m.v.name} x`, () => {
        const xs = xi(m.M.length).map((s) => cas.parse(s));
        return { value: cas.tex(cas.mat.mul([xs], cas.mat.mul(m.M, xs.map((x) => [x])))[0][0]), formula: `quadform(${m.v.name})`, name: "q" };
      })),
      { id: "gen", label: "General x^T A x", value: r`x^\top A x` },
    ],
  },
  {
    name: "lagrangian", words: "lagrange multiplier constraint kkt", desc: "Lagrangian L = f - λ g (Thm 7.39)", varName: "L",
    options: (ctx) => {
      const gs = [...ctx.rels.map((g) => ({ name: g.v.name, x: g.x })), ...ctx.fns.filter((g) => /^[gh]/.test(g.v.name)).map((g) => ({ name: g.v.name, x: g.x }))];
      return [
        ...ctx.fns.filter((f) => !/^[gh]/.test(f.v.name)).flatMap((f) => [
          ...gs.map((g) => computed(`fg:${f.v.name}:${g.name}`, `${f.v.name} - λ ${g.name}`, () => ({ value: cas.tex(cas.sub(f.x, cas.mul(cas.sym("lambda"), g.x))), formula: `lagrangian(${f.v.name}, ${g.name})` }))),
          ...(gs.length > 1 ? [computed(`fall:${f.v.name}`, `${f.v.name} - Σ λ_i g_i (all ${gs.length} constraints)`, () => ({ value: cas.tex(cas.sub(f.x, cas.add(...gs.map((g, i) => cas.mul(cas.sym(`lambda_${i + 1}`), g.x))))) }))] : []),
        ]),
        { id: "gen", label: "General L(x, λ)", value: r`L(x, \lambda) = f(x) - \lambda g(x)` },
        { id: "kkt", label: "KKT conditions (general)", value: r`\nabla f(x) + \sum_{i} \lambda_i \nabla g_i(x) = 0, \quad \lambda_i \geq 0, \quad \lambda_i g_i(x) = 0` },
      ];
    },
  },
  // ----- one variable (Ch4-6) -----
  {
    name: "derivative", words: "diff d/dx prime f' second nth", desc: "derivative f', f'', f^(n)", varName: "df",
    options: (ctx) => [
      ...ctx.fns.filter((f) => f.vars.length === 1).flatMap((f) => [
        computed(`1:${f.v.name}`, `${f.v.name}'`, () => ({ value: cas.tex(cas.diff(f.x, f.vars[0])), formula: `diff(${f.v.name})` })),
        computed(`2:${f.v.name}`, `${f.v.name}''`, () => ({ value: cas.tex(cas.diff(f.x, f.vars[0], 2)), formula: `diff(${f.v.name}, ${f.vars[0]}, 2)` })),
        { id: `n:${f.v.name}`, label: `${f.v.name}^{(n)} (asks n)`, ask: nAsk("3", "Order n"), build: (a) => ({ value: cas.tex(cas.diff(f.x, f.vars[0], int(a.n, 3, 1, 20))) }) },
      ]),
      // Functions of several variables: their partial derivatives.
      ...multi(ctx).flatMap((f) => [
        ...f.vars.map((v) => computed(`p:${f.v.name}:${v}`, `∂${f.v.name}/∂${v} of ${fname(f)}`, () => ({ value: cas.tex(cas.diff(f.x, v), f.vars), formula: `diff(${f.v.name}, ${v})` }), { name: `${f.v.name}_${v}` })),
        ...f.vars.flatMap((a, i) => f.vars.slice(i).map((b) => computed(`q:${f.v.name}:${a}${b}`, a === b ? `∂²${f.v.name}/∂${a}²` : `∂²${f.v.name}/∂${a}∂${b}`, () => ({ value: cas.tex(cas.diff(cas.diff(f.x, a), b), f.vars) }), { name: `${f.v.name}_${a}${b}` }))),
      ]),
      askFunction("own", "Of a function you type (or a variable name)", ({ x, vars }) => (vars.length > 1
        ? { value: matTex(vars.map((v) => [cas.tex(cas.diff(x, v), vars)])) }
        : { value: cas.tex(cas.diff(x, vars[0] || "x")) })),
      { id: "def", label: "Definition (limit)", value: r`f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}` },
    ],
  },
  {
    name: "taylor", words: "taylor polynomial maclaurin series expansion", desc: "Taylor polynomial of degree n at a (Sec 6.4)", varName: "P",
    options: (ctx) => [
      ...ctx.fns.filter((f) => f.vars.length === 1).map((f) => ({ id: `f:${f.v.name}`, label: `Of ${fname(f)} (asks a, n)`, ask: [{ key: "a", label: "Around a", value: "0" }, { key: "n", label: "Degree n", value: "3" }], build: (a) => ({ value: cas.taylorTex(f.x, f.vars[0], cas.parse(a.a || "0"), int(a.n, 3, 0, 15)), formula: `taylor(${f.v.name}, ${a.a || 0}, ${int(a.n, 3, 0, 15)})` }) })),
      // Several variables: the second-order Taylor polynomial at a point.
      ...askPointFor({ ...ctx, fns: ctx.fns.filter((f) => f.vars.length > 1) }, "t2", (f) => `2nd-order Taylor of ${fname(f)}`, (f, p) => ({ value: cas.tex(taylor2(f, p), f.vars) }), noMore),
      askFunction("own", "Of a function you type", ({ x, vars }, a) => ({ value: cas.taylorTex(x, vars[0] || "x", cas.parse(a.a || "0"), int(a.n, 3, 0, 15)) }), [{ key: "a", label: "Around a", value: "0" }, { key: "n", label: "Degree n", value: "3" }]),
      { id: "gen", label: "General formula", value: r`P_n(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x - a)^k` },
    ],
  },
  {
    name: "evaluate", words: "value at point substitute f(p) subs", desc: "f at a point", varName: "v",
    options: (ctx) => ctx.fns.flatMap((f) => pointsFor(ctx, f.vars.length).map((p) => computed(`fp:${f.v.name}:${p.v.name}`, `${f.v.name}(${p.v.name}) with ${p.v.name} = ${tuple(p.xs)}`, () => ({ value: cas.tex(cas.subs(f.x, at(f, p))), formula: `${f.v.name}(${p.v.name})` }))))
      .concat(ctx.fns.map((f) => ({ id: `ask:${f.v.name}`, label: `${fname(f)} at a point you type`, ask: [{ key: "p", label: `Point (${f.vars.join(", ")})`, hint: "(1, 2)" }], build: (a) => ({ value: cas.tex(cas.subs(f.x, parsePoint(a.p, f.vars))) }) }))),
  },
  {
    name: "composition", words: "compose fog f∘g composite", desc: "composition f∘g", varName: "h",
    options: (ctx) => ctx.fns.flatMap((f) => ctx.fns.filter((g) => g !== f && f.vars.length === 1).map((g) => computed(`${f.v.name}:${g.v.name}`, `${f.v.name}∘${g.v.name}`, () => ({ value: cas.tex(cas.subs(f.x, { [f.vars[0]]: g.x })), formula: `compose(${f.v.name}, ${g.v.name})` }))))
      .concat([{ id: "gen", label: "General (f∘g)(x) = f(g(x))", value: r`(f \circ g)(x) = f(g(x))` }]),
  },
  // ----- linear algebra (Ch2-3, 5) -----
  {
    name: "matrix", words: "pmatrix bmatrix matrix m×n identity zero", desc: "a matrix of any size (asks m, n)", varName: "A",
    options: (ctx) => [...ctx.mats.map((m) => ({ id: `v:${m.v.name}`, label: `${m.v.name} (this note's variable)`, value: toLatex(m.v) })), ...sizedMatrixOptions()],
  },
  {
    name: "vector", words: "column row point tuple unit", desc: "a vector or point of any length (asks n)", varName: "v",
    options: (ctx) => [
      ...ctx.vecs.map((p) => ({ id: `v:${p.v.name}`, label: `${p.v.name} (this note's variable)`, value: toLatex(p.v) })),
      { id: "col", label: "Column x_1 … x_n (asks n)", ask: [...nAsk(), { key: "a", label: "Letter", value: "x" }], build: (a) => ({ value: matTex(range(int(a.n, 3)).map((i) => [sub(a.a || "x", i + 1)])) }) },
      { id: "tuple", label: "Point (x_1, …, x_n) (asks n)", ask: [...nAsk(), { key: "a", label: "Letter", value: "x" }], build: (a) => ({ value: `(${range(int(a.n, 3)).map((i) => sub(a.a || "x", i + 1)).join(", ")})` }) },
      { id: "own", label: "Point with values you type", ask: [{ key: "p", label: "Values", hint: "1, 2, 3" }], build: (a) => ({ value: `(${a.p.replace(/^[([]|[)\]]$/g, "")})` }) },
      { id: "zero", label: "Zero vector (asks n)", ask: nAsk(), build: (a) => ({ value: matTex(range(int(a.n, 3)).map(() => ["0"])) }) },
      { id: "unit", label: "Unit vector e_i (asks n, i)", ask: [...nAsk(), { key: "i", label: "Index i", value: "1" }], build: (a) => ({ value: matTex(range(int(a.n, 3)).map((k) => [k + 1 === int(a.i, 1) ? "1" : "0"])) }) },
    ],
  },
  matOp("inverse", "inv A^{-1}", "inverse matrix A⁻¹ (Ch3)", "Ai", (M) => cas.mat.inverse(M), "inv", { square: true }),
  matOp("transpose", "transposed A^T", "transpose Aᵀ", "At", (M) => cas.mat.transpose(M), "transpose"),
  matOp("rref", "row reduce echelon gauss elimination", "reduced row echelon form (Sec 2.3)", "R", (M) => cas.mat.rref(M), "rref"),
  matOp("adjugate", "adj cofactor classical adjoint", "adjugate matrix adj(A)", "Ad", (M) => cas.mat.adjugate(M), "adj", { square: true }),
  matOp("symmetricpart", "symmetric part (A + A^T)/2", "symmetric part ½(A + Aᵀ)", "S", (M) => cas.mat.scale(cas.mat.add(M, cas.mat.transpose(M)), cas.num(1, 2)), "symmetric", { square: true }),
  scalarOp("determinant", "det |A|", "determinant det A", "d", (M) => cas.mat.det(M), "det", { square: true }),
  scalarOp("trace", "tr sum diagonal", "trace tr A", "t", (M) => cas.mat.trace(M), "trace", { square: true }),
  scalarOp("rank", "rank dimension column space", "rank of A", "r", (M) => cas.num(cas.mat.rank(M)), "rank"),
  scalarOp("charpoly", "characteristic polynomial det(A - λI) eigen", "characteristic polynomial det(A - λI)", "p", (M) => cas.charpoly(M), "charpoly", { square: true }),
  {
    name: "eigenvalues", words: "eigen eig lambda spectrum", desc: "eigenvalues (exact when 2×2 or rational)", varName: "E",
    options: (ctx) => square(ctx).map((m) => computed(`A:${m.v.name}`, `Eigenvalues of ${m.v.name}`, () => {
      try {
        const d = derivedFrom(ctx, `eig(${m.v.name})`);
        return { value: d.value, formula: `eig(${m.v.name})` };
      } catch (_) {
        // Not exact (irrational roots of a 3×3, ...): numeric values.
        const rs = numericRoots(cas.charpoly(m.M), "lambda");
        return { value: rs.map((z, i) => `\\lambda_{${i + 1}} \\approx ${fmtC(z)}`).join(",\\ ") };
      }
    })).concat(notSquare(ctx, "eigenvalues"), [{ id: "gen", label: "General det(A - λI) = 0", value: r`\det(A - \lambda I) = 0` }]),
  },
  {
    name: "product", words: "multiply matmul AB times", desc: "matrix product AB, Av", varName: "C",
    options: (ctx) => {
      const all = [...ctx.mats, ...ctx.vecs];
      const out = [];
      for (const a of all) for (const b of all) {
        if (a.M[0].length !== b.M.length || out.length > 30) continue;
        out.push(computed(`${a.v.name}*${b.v.name}`, `${a.v.name}${b.v.name}`, () => ({ value: texM(cas.mat.mul(a.M, b.M)), formula: `${a.v.name} ${b.v.name}` })));
      }
      for (const a of constVecs(ctx)) for (const b of constVecs(ctx)) {
        if (a.xs.length === b.xs.length && a !== b) out.push(computed(`dot:${a.v.name}:${b.v.name}`, `${a.v.name}ᵀ${b.v.name} (dot product)`, () => ({ value: cas.tex(cas.add(...a.xs.map((x, i) => cas.mul(x, b.xs[i])))), formula: `dot(${a.v.name}, ${b.v.name})`, name: "s" })));
      }
      return out.concat([askMatrix("own", "Of two matrices you type", (A, a) => ({ value: texM(cas.mat.mul(A, casOf(parseValue("B", a.B.trim())).M)) }), [{ key: "B", label: "Matrix B", hint: "[[1, 0], [0, 1]]" }])]);
    },
  },
  {
    name: "matsum", words: "sum add plus A + B linear combination", desc: "A + B, kA", varName: "C",
    options: (ctx) => {
      const out = [];
      for (const a of ctx.mats) for (const b of ctx.mats) {
        if (a !== b && a.M.length === b.M.length && a.M[0].length === b.M[0].length) out.push(computed(`${a.v.name}+${b.v.name}`, `${a.v.name} + ${b.v.name}`, () => ({ value: texM(cas.mat.add(a.M, b.M)), formula: `${a.v.name} + ${b.v.name}` })));
      }
      for (const a of ctx.mats) out.push({ id: `k:${a.v.name}`, label: `k·${a.v.name} (asks k)`, ask: [{ key: "k", label: "k", value: "2" }], build: (x) => ({ value: texM(cas.mat.scale(a.M, cas.parse(x.k))), formula: `${x.k} ${a.v.name}` }) });
      return out;
    },
  },
  {
    name: "matpower", words: "power A^k A^n markov", desc: "matrix power Aᵏ", varName: "P",
    options: (ctx) => square(ctx).map((m) => ({ id: `A:${m.v.name}`, label: `${m.v.name}^k (asks k)`, ask: [{ key: "k", label: "k", value: "2" }], build: (a) => ({ value: texM(cas.mat.power(m.M, int(a.k, 2, -10, 50))), formula: `${m.v.name}^{${int(a.k, 2, -10, 50)}}` }) })).concat(notSquare(ctx, "a matrix power Aᵏ")),
  },
  {
    name: "augmented", words: "augmented [A|b] system gauss linear equations", desc: "augmented matrix [A | b] (Sec 2.3)", varName: "M",
    options: (ctx) => {
      const out = [];
      for (const a of ctx.mats) for (const b of constVecs(ctx)) {
        if (a.M.length !== b.M.length || b.v.tuple) continue;
        out.push(computed(`${a.v.name}|${b.v.name}`, `[${a.v.name} | ${b.v.name}]`, () => ({ value: augTex(a.M, b.M), formula: `augment(${a.v.name}, ${b.v.name})` })));
        out.push(computed(`r:${a.v.name}|${b.v.name}`, `rref [${a.v.name} | ${b.v.name}] (solved)`, () => ({ value: augTex(...splitAug(cas.mat.rref(a.M.map((row, i) => [...row, ...b.M[i]])), a.M[0].length)), formula: `rref(augment(${a.v.name}, ${b.v.name}))` })));
      }
      const sys = systems(ctx);
      for (const s of sys) {
        out.push(computed(`sys:${s.name}`, `From the equations ${s.name}: [A | b]`, () => ({ value: augTex(s.A, s.b) })));
        out.push({ id: `sysAb:${s.name}`, label: `From the equations ${s.name}: A and b as two variables`, varsOnly: true, lines: [`A = ${texM(s.A)}`, `b = ${texCol(s.b.map((r) => r[0]))}`] });
      }
      out.push({ id: "gen", label: "General m×n system (asks m, n)", ask: sizeAsk("2", "3"), build: (a) => ({ value: augTex(range(int(a.m, 2)).map((i) => range(int(a.n, 3)).map((j) => sub("a", i + 1, j + 1))), range(int(a.m, 2)).map((i) => [sub("b", i + 1)]), true) }) });
      return out;
    },
  },
  {
    name: "system", words: "linear system equations cases", desc: "system of equations (asks m, n)", varName: "eqs",
    options: () => [
      { id: "gen", label: "General m×n system (asks m, n)", ask: sizeAsk("2", "2"), build: (a) => ({ value: `\\begin{cases} ${range(int(a.m, 2)).map((i) => `${xi(int(a.n, 2)).map((x, j) => `${sub("a", i + 1, j + 1)}${x}`).join(" + ")} = ${sub("b", i + 1)}`).join(" \\\\ ")} \\end{cases}` }) },
      { id: "own", label: "Equations you type", ask: [{ key: "e", label: "Equations, separated by ;", hint: "x + 2y = 3; 4x - y = 1" }], build: (a) => ({ value: `\\begin{cases} ${a.e.split(";").map((s) => s.trim()).join(" \\\\ ")} \\end{cases}` }) },
    ],
  },
  {
    name: "gauss", words: "gauss elimination gaussian solve linear system equations back substitution eliminate", desc: "solve a linear system by Gauss elimination + back substitution (Sec 2.3)", varName: "sol",
    options: (ctx) => [
      ...gaussSources(ctx).map((s) => computed(`gs:${s.id}`, `Solve ${s.label}`, () => ({ value: gaussAnswer(s.rows, s.vars) }))),
      { id: "own", label: "Equations you type (or variable names)", ask: [{ key: "e", label: "Equations, separated by ;", hint: "2x + y + z = 7; x + 2y + z = 8; x + y + 2z = 9" }], build: (a) => {
        const { rows, vars } = parseSystem(a.e.split(";").map((s) => s.trim()).filter(Boolean));
        return { value: gaussAnswer(rows, vars) };
      } },
    ],
  },
  {
    name: "fouriermotzkin", words: "fourier motzkin elimination fm inequalities eliminate variable linear inequalities feasible", desc: "eliminate variables from linear inequalities (Sec 4.5)", varName: "S",
    options: (ctx) => {
      const sys = fmSystem(ctx);
      const out = [];
      if (sys) {
        for (const x of sys.vars) out.push(computed(`fm1:${x}`, `Eliminate ${x} from ${sys.label}`, () => ({ value: fmAnswer(sys.ineqs, sys.vars, [x]) })));
        if (sys.vars.length > 1) {
          const last = sys.vars[sys.vars.length - 1];
          out.push(computed(`fmall:${last}`, `Eliminate all but ${last} (bounds for ${last}) from ${sys.label}`, () => ({ value: fmAnswer(sys.ineqs, sys.vars, sys.vars.slice(0, -1)) })));
        }
      }
      out.push({ id: "own", label: "Inequalities you type", ask: [{ key: "e", label: "Inequalities, separated by ;", hint: "2x + y \\le 6; x + 2y \\le 6; x \\ge 0; y \\ge 0" }, { key: "x", label: "Variables to eliminate, separated by ,", hint: "x" }], build: (a) => {
        const ineqs = parseIneqs(a.e.split(";").map((s) => s.trim()).filter(Boolean));
        const vars = cas.orderVars(new Set(ineqs.flatMap((q) => [...cas.symbols(q.e)])));
        const elim = String(a.x || vars[0]).split(",").map((s) => s.trim()).filter(Boolean);
        return { value: fmAnswer(ineqs, vars, elim) };
      } });
      return out;
    },
  },
  {
    name: "induction", words: "induction proof base case step sum formula principle", desc: "proof by induction of a statement P(n) (Thm 1.86)", varName: "P",
    options: (ctx) => {
      const stmts = [...ctx.vars.values()].filter((v) => v.kind === "relation" && v.params && v.params.length === 1);
      const n0 = ctx.vars.get("n0") || ctx.vars.get("n_0");
      const start = n0 && n0.kind === "scalar" ? String(n0.value) : "1";
      return [
        ...stmts.map((v) => ({ id: `ind:${v.name}`, label: `Prove ${v.name}(${v.params[0]}): ${v.lhs} ${v.op} ${v.rhs}`, value: `\\forall ${v.params[0]} \\ge ${start}:\\ ${v.lhs} ${v.op} ${v.rhs}`, start })),
        { id: "own", label: "A statement you type", ask: [{ key: "s", label: "Statement P(n)", hint: "\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}" }, { key: "p", label: "Variable", value: "n" }, { key: "n0", label: "Start n_0", value: "1" }], build: (a) => {
          const r = findRelation(a.s);
          if (!r) throw new Error("type a statement with =, \\le or \\ge");
          return { value: `\\forall ${a.p || "n"} \\ge ${a.n0 || 1}:\\ ${r.lhs} ${r.op} ${r.rhs}` };
        } },
      ];
    },
  },
  {
    name: "dotproduct", words: "dot inner product norm length angle orthogonal", desc: "dot product, norm, angle (Ch5)", varName: "s",
    options: (ctx) => {
      const out = [];
      for (const a of constVecs(ctx)) {
        out.push(computed(`n:${a.v.name}`, `|${a.v.name}| (norm)`, () => ({ value: cas.tex(cas.pow(cas.add(...a.xs.map((x) => cas.mul(x, x))), cas.Q(1, 2))), formula: `norm(${a.v.name})` })));
        for (const b of constVecs(ctx)) {
          if (a === b || a.xs.length !== b.xs.length) continue;
          out.push(computed(`d:${a.v.name}:${b.v.name}`, `${a.v.name}·${b.v.name}`, () => ({ value: cas.tex(cas.add(...a.xs.map((x, i) => cas.mul(x, b.xs[i])))), formula: `dot(${a.v.name}, ${b.v.name})` })));
          out.push(computed(`c:${a.v.name}:${b.v.name}`, `cos θ between ${a.v.name} and ${b.v.name}`, () => {
            const dot = cas.add(...a.xs.map((x, i) => cas.mul(x, b.xs[i])));
            const na = cas.add(...a.xs.map((x) => cas.mul(x, x)));
            const nb = cas.add(...b.xs.map((x) => cas.mul(x, x)));
            return { value: cas.tex(cas.mul(dot, cas.pow(cas.mul(na, nb), cas.Q(-1, 2)))) };
          }));
          out.push(computed(`p:${a.v.name}:${b.v.name}`, `projection of ${a.v.name} onto ${b.v.name}`, () => {
            const c = cas.div(cas.add(...a.xs.map((x, i) => cas.mul(x, b.xs[i]))), cas.add(...b.xs.map((x) => cas.mul(x, x))));
            return { value: texCol(b.xs.map((x) => cas.mul(c, x))), formula: `proj(${a.v.name}, ${b.v.name})` };
          }));
          if (a.xs.length === 3) out.push(computed(`x:${a.v.name}:${b.v.name}`, `${a.v.name} × ${b.v.name} (cross product)`, () => {
            const [a1, a2, a3] = a.xs; const [b1, b2, b3] = b.xs;
            return { value: texCol([cas.sub(cas.mul(a2, b3), cas.mul(a3, b2)), cas.sub(cas.mul(a3, b1), cas.mul(a1, b3)), cas.sub(cas.mul(a1, b2), cas.mul(a2, b1))]), formula: `cross(${a.v.name}, ${b.v.name})` };
          }));
        }
      }
      out.push({ id: "gen", label: "General u·v = |u||v|cos θ", value: r`u \cdot v = |u|\,|v| \cos\theta` });
      return out;
    },
  },
  {
    name: "line", words: "line through two points parametric segment", desc: "line through two points (Def 4.12)", varName: "l",
    options: (ctx) => {
      const out = [];
      for (const a of constVecs(ctx)) for (const b of constVecs(ctx)) {
        if (a === b || a.xs.length !== b.xs.length) continue;
        out.push(computed(`${a.v.name}:${b.v.name}`, `Through ${a.v.name} and ${b.v.name}`, () => {
          const t = cas.sym("t");
          return { value: texCol(a.xs.map((x, i) => cas.add(x, cas.mul(t, cas.sub(b.xs[i], x))))) };
        }));
      }
      out.push({ id: "gen", label: "General (1 - t)u + tv", value: r`\{(1 - t)u + tv \mid t \in \mathbb{R}\}` });
      return out;
    },
  },
  {
    name: "interpolate", words: "interpolation polynomial through points lagrange shamir", desc: "polynomial through given points (Sec 2.5)", varName: "p",
    options: (ctx) => ctx.mats.filter((m) => m.M[0].length === 2).map((m) => computed(`P:${m.v.name}`, `Through the points (rows) of ${m.v.name}`, () => ({ value: derivedFrom(ctx, `interpolate(${m.v.name})`).value, formula: `interpolate(${m.v.name})` })))
      .concat(ctx.mats.filter((m) => m.M[0].length !== 2).map((m) => ({ id: `nc:${m.v.name}`, label: `${m.v.name} (${size(m)}): not possible`, error: `${m.v.name} has ${m.M[0].length} columns; interpolation needs one point (x, y) per row, i.e. 2 columns.` })))
      .concat([{ id: "own", label: "Through points you type", ask: [{ key: "p", label: "Points", hint: "(0, 1), (1, 3), (2, 7)" }], build: (a) => {
        const pts = [...a.p.matchAll(/\(([^()]*)\)/g)].map((m) => m[1].split(",").map((s) => s.trim()));
        const v = parseValue("P", `[${pts.map((p) => `[${p.join(", ")}]`).join(", ")}]`);
        return { value: derivedFrom({ vars: new Map([["P", v]]) }, "interpolate(P)").value };
      } }]),
  },
  {
    name: "polynomial", words: "polynomial degree roots factor", desc: "polynomial of degree n, or from its roots", varName: "p",
    options: () => [
      { id: "gen", label: "General degree n (asks n)", ask: nAsk("3", "Degree n"), build: (a) => {
        const n = int(a.n, 3, 1, 12);
        return { value: range(n + 1).reverse().map((k) => `a_{${k}}${k === 0 ? "" : k === 1 ? "x" : `x^{${k}}`}`).join(" + ") };
      } },
      { id: "roots", label: "From its roots (asks the roots)", ask: [{ key: "r", label: "Roots", hint: "1, -2, 3" }], build: (a) => {
        const x = cas.sym("x");
        return { value: cas.tex(cas.mul(...a.r.split(",").map((s) => cas.sub(x, cas.parse(s))))) };
      } },
      { id: "expand", label: "Expand an expression you type", ask: [{ key: "e", label: "Expression", hint: "(x + 1)^3" }], build: (a) => ({ value: cas.tex(cas.parse(a.e)) }) },
    ],
  },
  // ----- sets, functions, logic (Ch1) -----
  {
    name: "set", words: "set elements finite braces", desc: "a set {…}", varName: "S",
    options: (ctx) => [
      ...ctx.sets.map((s) => ({ id: `v:${s.v.name}`, label: `${s.v.name} (this note's variable)`, value: toLatex(s.v) })),
      { id: "own", label: "Elements you type", ask: [{ key: "e", label: "Elements", hint: "1, 2, 3" }], build: (a) => ({ value: `\\{${a.e.split(",").map((s) => s.trim()).join(", ")}\\}` }) },
      { id: "range", label: "{1, 2, …, n} (asks n)", ask: nAsk("5"), build: (a) => ({ value: `\\{${range(int(a.n, 5, 1, 40)).map((i) => i + 1).join(", ")}\\}` }) },
      { id: "builder", label: "Set-builder {x ∈ U | condition}", ask: [{ key: "x", label: "Element", value: "x" }, { key: "U", label: "Universe", value: "\\mathbb{R}" }, { key: "c", label: "Condition", hint: "x^2 < 4" }], build: (a) => ({ value: `\\{${a.x} \\in ${a.U} \\mid ${a.c}\\}` }) },
      { id: "empty", label: "Empty set", value: "\\emptyset" },
      { id: "R", label: "ℝ", value: "\\mathbb{R}" },
      { id: "Rn", label: "ℝⁿ", value: "\\mathbb{R}^n" },
      { id: "N", label: "ℕ", value: "\\mathbb{N}" },
      { id: "Z", label: "ℤ", value: "\\mathbb{Z}" },
      { id: "Q", label: "ℚ", value: "\\mathbb{Q}" },
    ],
  },
  setOp("union", "cup ∪ or", "union A ∪ B", "\\cup", (a, b) => uniq([...a, ...b])),
  setOp("intersection", "cap ∩ and common", "intersection A ∩ B", "\\cap", (a, b) => a.filter((x) => b.some((y) => cas.equal(x, y)))),
  setOp("difference", "setminus minus \\ complement", "difference A \\ B", "\\setminus", (a, b) => a.filter((x) => !b.some((y) => cas.equal(x, y)))),
  setOp("symdiff", "symmetric difference triangle xor", "symmetric difference A △ B", "\\triangle", (a, b) => [...a.filter((x) => !b.some((y) => cas.equal(x, y))), ...b.filter((x) => !a.some((y) => cas.equal(x, y)))]),
  {
    name: "cartesian", words: "cartesian product times pairs A×B", desc: "Cartesian product A × B (Def 1.50)", varName: "P",
    options: (ctx) => {
      const out = [];
      for (const a of ctx.sets) for (const b of ctx.sets) {
        if (a.items.length * b.items.length > 64) continue;
        out.push({ id: `${a.v.name}x${b.v.name}`, label: `${a.v.name} × ${b.v.name}`, value: `\\{${a.items.flatMap((x) => b.items.map((y) => `(${cas.tex(x)}, ${cas.tex(y)})`)).join(", ")}\\}` });
      }
      return out.concat([{ id: "gen", label: "General A × B", value: r`A \times B = \{(a, b) \mid a \in A, b \in B\}` }]);
    },
  },
  {
    name: "powerset", words: "power set subsets P(A) 2^A", desc: "power set P(A)", varName: "PS",
    options: (ctx) => ctx.sets.filter((s) => s.items.length <= 5).map((s) => ({ id: `${s.v.name}`, label: `P(${s.v.name})`, value: `\\{${subsets(s.items).map((x) => (x.length ? `\\{${x.map((e) => cas.tex(e)).join(", ")}\\}` : "\\emptyset")).join(", ")}\\}` }))
      .concat([{ id: "gen", label: "General P(A)", value: r`\mathcal{P}(A) = \{B \mid B \subseteq A\}` }]),
  },
  {
    name: "interval", words: "interval closed open half [a, b]", desc: "interval [a, b], (a, b), …", varName: "I",
    options: () => ["[]", "()", "[)", "(]"].map((br) => ({
      id: br, label: `${br[0]}a, b${br[1]} (asks a, b)`, ask: [{ key: "a", label: "a", value: "0" }, { key: "b", label: "b", value: "1" }],
      build: (a) => ({ value: br === "[]" ? `\\left[${a.a}, ${a.b}\\right]` : br === "()" ? `\\left(${a.a}, ${a.b}\\right)` : `${br[0]}${a.a}, ${a.b}${br[1]}` }),
    })).concat([{ id: "inf", label: "[a, ∞)", ask: [{ key: "a", label: "a", value: "0" }], build: (a) => ({ value: `[${a.a}, \\infty)` }) }]),
  },
  {
    name: "function", words: "function f(x) f(x,y) define map", desc: "a function f(x) = … or f(x, y) = …", varName: "f",
    options: () => [
      { id: "1", label: "f(x) = … (asks the expression)", ask: [{ key: "e", label: "f(x) =", hint: "x^2 + 1" }], build: (a) => ({ value: a.e, params: "x" }) },
      { id: "2", label: "f(x, y) = … (asks the expression)", ask: [{ key: "e", label: "f(x, y) =", hint: "x^2 y + y^3" }], build: (a) => ({ value: a.e, params: "x, y" }) },
      { id: "n", label: "f(x_1, …, x_n) (asks n and the expression)", ask: [...nAsk("3"), { key: "e", label: "Expression", hint: "x_1^2 + x_2 x_3" }], build: (a) => ({ value: a.e, params: range(int(a.n, 3)).map((i) => `x_${i + 1}`).join(", ") }) },
      { id: "vec", label: "Vector function F = (f_1, …, f_m) (asks them)", ask: [{ key: "F", label: "Components, separated by ;", hint: "x^2 y; x + y" }], build: (a) => ({ value: `(${a.F.split(";").map((s) => s.trim()).join(", ")})` }) },
      { id: "map", label: "f: A → B notation", value: r`f\colon A \to B` },
    ],
  },
  {
    name: "piecewise", words: "cases piecewise if otherwise abs", desc: "piecewise function (cases)", varName: "f",
    options: () => [
      { id: "2", label: "2 cases (asks them)", ask: [{ key: "a", label: "First value", hint: "x" }, { key: "c", label: "if", hint: "x \\geq 0" }, { key: "b", label: "Otherwise", hint: "-x" }], build: (a) => ({ value: `\\begin{cases} ${a.a} & \\text{if } ${a.c} \\\\ ${a.b} & \\text{otherwise} \\end{cases}` }) },
      { id: "n", label: "n cases (asks n)", ask: nAsk("3", "Cases n"), build: (a) => ({ value: `\\begin{cases} ${range(int(a.n, 3)).map(() => " & \\text{if } ").join(" \\\\ ")} \\end{cases}`, blank: true }) },
      { id: "abs", label: "|x|", value: r`\begin{cases} x & \text{if } x \geq 0 \\ -x & \text{if } x < 0 \end{cases}` },
    ],
  },
  {
    name: "constraint", words: "constraint inequality g(x) <= 0 feasible", desc: "constraint g(x) ≤ 0", varName: "g",
    options: () => [
      { id: "le", label: "g(x) ≤ b (asks it)", ask: [{ key: "g", label: "g", hint: "x + 2y" }, { key: "b", label: "b", value: "0" }], build: (a) => ({ value: `${a.g} \\leq ${a.b}` }) },
      { id: "eq", label: "g(x) = b (asks it)", ask: [{ key: "g", label: "g", hint: "x^2 + y^2" }, { key: "b", label: "b", value: "1" }], build: (a) => ({ value: `${a.g} = ${a.b}` }) },
      { id: "kktlines", label: "KKT problem: f and k constraints g_i ≤ 0 (asks k)", varsOnly: true, ask: nAsk("2", "Constraints k"), build: (a) => ({ lines: ["f(x, y) = ", ...range(int(a.n, 2, 1, 9)).map((i) => `g_${i + 1} = `)] }) },
      { id: "lp", label: "Linear program c, A, b (asks m, n)", varsOnly: true, ask: sizeAsk("2", "2"), build: (a) => ({ lines: [`c = [${range(int(a.n, 2)).map(() => "0").join(", ")}]`, `A = [${range(int(a.m, 2)).map(() => `[${range(int(a.n, 2)).map(() => "0").join(", ")}]`).join(", ")}]`, `b = [${range(int(a.m, 2)).map(() => "0").join(", ")}]`] }) },
    ],
  },
  {
    name: "proposition", words: "logic and or not implies truth table", desc: "logic formula p ∧ q, p ⇒ q, …", varName: "P",
    options: () => [
      { id: "and", label: "p ∧ q", value: r`p \land q` },
      { id: "or", label: "p ∨ q", value: r`p \lor q` },
      { id: "imp", label: "p ⇒ q", value: r`p \Rightarrow q` },
      { id: "iff", label: "p ⇔ q", value: r`p \Leftrightarrow q` },
      { id: "dm", label: "¬(p ∧ q) ⇔ ¬p ∨ ¬q", value: r`\neg(p \land q) \Leftrightarrow \neg p \lor \neg q` },
      { id: "contra", label: "(p ⇒ q) ⇔ (¬q ⇒ ¬p)", value: r`(p \Rightarrow q) \Leftrightarrow (\neg q \Rightarrow \neg p)` },
      { id: "own", label: "Formula you type", ask: [{ key: "e", label: "Formula", hint: "(p \\land q) \\lor \\neg r" }], build: (a) => ({ value: a.e }) },
    ],
  },
  {
    name: "fromnote", words: "create vars from note scan exercise definitions", desc: "create variables from the math in this note", varName: "",
    varsOnly: true,
    options: (ctx) => (ctx.found || []).length
      ? [{ id: "all", label: `All ${ctx.found.length} definitions found in the note`, varsOnly: true, lines: ctx.found.map((d) => d.line) }, ...ctx.found.map((d) => ({ id: d.line, label: d.line, varsOnly: true, lines: [d.line] }))]
      : [{ id: "none", label: "No definitions like $f(x) = …$ or $A = \\begin{pmatrix}…$ found outside the vars block", error: "nothing found" }],
  },
];

// The note's matrices that don't fit, listed with the reason instead of hidden.
const size = (m) => `${m.M.length}×${m.M[0].length}`;
function notSquare(ctx, what) {
  return ctx.mats.filter((m) => m.M.length !== m.M[0].length).map((m) => ({
    id: `ns:${m.v.name}`, label: `${m.v.name} (${size(m)}): not possible`,
    error: `${m.v.name} is ${size(m)}, and ${what} only exists for square (n×n) matrices.`,
  }));
}

// ---------- elimination helpers ----------

// Linear systems in the note: the equations among the vars, [A | b] from a
// matrix and a vector, and the rows of an augmented matrix.
export function gaussSources(ctx) {
  const out = [];
  for (const s of systems(ctx)) out.push({ id: `eq:${s.name}`, label: `the equations ${s.name}`, rows: s.A.map((r, i) => [...r, s.b[i][0]]), vars: s.vars });
  const xs = (n) => (n <= 3 ? ["x", "y", "z"].slice(0, n) : Array.from({ length: n }, (_, i) => `x_${i + 1}`));
  for (const a of ctx.mats) for (const b of constVecs(ctx)) {
    if (b.v.tuple || a.M.length !== b.M.length) continue;
    out.push({ id: `Ab:${a.v.name}:${b.v.name}`, label: `${a.v.name}x = ${b.v.name}`, rows: a.M.map((r, i) => [...r, b.M[i][0]]), vars: xs(a.M[0].length) });
  }
  for (const a of ctx.mats) if (a.M[0].length >= 2 && a.M.every((r) => r.every((x) => cas.symbols(x).size === 0))) {
    out.push({ id: `aug:${a.v.name}`, label: `${a.v.name} as an augmented matrix [A | b]`, rows: a.M.map((r) => [...r]), vars: xs(a.M[0].length - 1) });
  }
  return out;
}
export function gaussAnswer(rows, vars) {
  const g = gauss(rows, vars);
  if (g.kind === "none") return r`\text{no solution}`;
  return vars.map((v, i) => `${v} = ${cas.tex(g.values[i])}`).join(",\\ ") + (g.kind === "infinite" ? `,\\ ${g.free.map((f) => `${cas.tex(g.params[f])} \\in \\mathbb{R}`).join(", ")}` : "");
}
// All linear inequalities among the vars (c1 = x + 2y \le 6, ...).
export function fmSystem(ctx) {
  // Equations join in (the book first uses them to substitute), but there
  // must be at least one inequality.
  const rels = [...ctx.vars.values()].filter((v) => v.kind === "relation" && !v.params);
  if (!rels.some((v) => v.op !== "=")) return null;
  try {
    const ineqs = parseIneqs(rels);
    const vars = cas.orderVars(new Set(ineqs.flatMap((q) => [...cas.symbols(q.e)])));
    return { ineqs, vars, label: rels.map((v) => v.name).join(", ") };
  } catch (_) { return null; }
}
export function fmAnswer(ineqs, vars, elim) {
  let cur = ineqs;
  for (const x of elim) {
    const st = fmStep(cur, vars, x);
    if (st.contradictions.length) return r`\text{no solution (the inequalities contradict each other)}`;
    cur = st.next;
  }
  const left = vars.filter((v) => !elim.includes(v));
  return cur.length ? `\\begin{cases} ${cur.map((q) => ineqTex(q, left)).join(" \\\\ ")} \\end{cases}` : r`\text{no conditions left: every value works}`;
}

// Roots of a polynomial in `v`, numerically (Durand-Kerner), as {re, im}.
export function numericRoots(p, v) {
  const coef = [];
  let d = p;
  for (let k = 0, fact = 1; k < 30; k++, fact *= k || 1) {
    const c = cas.constValue(cas.subs(d, { [v]: cas.ZERO }));
    coef.push(c ? c.n / c.d / fact : 0);
    d = cas.diff(d, v);
    if (cas.isZero(d)) break;
  }
  const n = coef.length - 1;
  const lead = coef[n];
  const a = coef.map((c) => c / lead); // monic, a[k] for x^k
  const mul = (x, y) => ({ re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re });
  const div = (x, y) => { const q = y.re * y.re + y.im * y.im; return { re: (x.re * y.re + x.im * y.im) / q, im: (x.im * y.re - x.re * y.im) / q }; };
  const evalP = (z) => { let s = { re: 1, im: 0 }; for (let k = n - 1; k >= 0; k--) s = { re: mul(s, z).re + a[k], im: mul(s, z).im }; return s; };
  let z = Array.from({ length: n }, (_, k) => { let w = { re: 1, im: 0 }; for (let i = 0; i < k; i++) w = mul(w, { re: 0.4, im: 0.9 }); return w; });
  for (let it = 0; it < 500; it++) {
    z = z.map((zi, i) => {
      let den = { re: 1, im: 0 };
      z.forEach((zj, j) => { if (j !== i) den = mul(den, { re: zi.re - zj.re, im: zi.im - zj.im }); });
      const step = div(evalP(zi), den);
      return { re: zi.re - step.re, im: zi.im - step.im };
    });
  }
  return z.map((w) => ({ re: Math.abs(w.re) < 1e-10 ? 0 : w.re, im: Math.abs(w.im) < 1e-9 ? 0 : w.im })).sort((x, y) => x.re - y.re || x.im - y.im);
}
export const fmtC = (z) => {
  const f = (x) => String(Number(x.toFixed(4)));
  return z.im === 0 ? f(z.re) : `${f(z.re)} ${z.im < 0 ? "-" : "+"} ${f(Math.abs(z.im))}i`;
};

// A^+ for a non-square matrix: right inverse A^T (A A^T)^{-1} when it has more
// columns than rows, left inverse (A^T A)^{-1} A^T when more rows.
export function oneSidedInverse(A) {
  const At = cas.mat.transpose(A);
  return A.length < A[0].length ? cas.mat.mul(At, cas.mat.inverse(cas.mat.mul(A, At))) : cas.mat.mul(cas.mat.inverse(cas.mat.mul(At, A)), At);
}

function matOp(name, words, desc, varName, f, formula, { square: sq = false } = {}) {
  const what = desc.split(" (")[0];
  return {
    name, words, desc, varName,
    options: (ctx) => (sq ? square(ctx) : ctx.mats).map((m) => computed(`A:${m.v.name}`, `${desc.split(" ")[0]} of ${m.v.name}`, () => ({ value: texM(f(m.M)), formula: `${formula}(${m.v.name})` })))
      .concat(sq && name === "inverse"
        ? ctx.mats.filter((m) => m.M.length !== m.M[0].length).map((m) => computed(`os:${m.v.name}`, `${m.v.name} is ${size(m)}: one-sided inverse (${m.M.length < m.M[0].length ? "right" : "left"} inverse)`, () => ({ value: texM(oneSidedInverse(m.M)), formula: `pinv(${m.v.name})` })))
        : sq ? notSquare(ctx, `the ${what}`) : [])
      .concat([askMatrix("own", "Of a matrix you type (or a variable name)", (M) => ({ value: texM(f(M)) }))]),
  };
}

function scalarOp(name, words, desc, varName, f, formula, { square: sq = false } = {}) {
  const what = desc.split(" (")[0];
  return {
    name, words, desc, varName,
    options: (ctx) => (sq ? square(ctx) : ctx.mats).map((m) => computed(`A:${m.v.name}`, `${desc.split(" ")[0]} of ${m.v.name}`, () => ({ value: cas.tex(f(m.M)), formula: `${formula}(${m.v.name})` })))
      .concat(sq ? notSquare(ctx, `the ${what}`) : [])
      .concat([askMatrix("own", "Of a matrix you type (or a variable name)", (M) => ({ value: cas.tex(f(M)) }))]),
  };
}

function setOp(name, words, desc, op, f) {
  return {
    name, words, desc, varName: "C",
    options: (ctx) => {
      const out = [];
      for (const a of ctx.sets) for (const b of ctx.sets) {
        if (a === b) continue;
        const items = f(a.items, b.items);
        out.push({ id: `${a.v.name}:${b.v.name}`, label: `${a.v.name} ${SET_SYM[op]} ${b.v.name}`, value: items.length ? `\\{${items.map((x) => cas.tex(x)).join(", ")}\\}` : "\\emptyset" });
      }
      return out.concat([{ id: "gen", label: `General A ${op} B`, value: `A ${op} B` }]);
    },
  };
}

// The largest group of the note's functions with the same variables.
function sameVars(ctx) {
  const groups = new Map();
  for (const f of multi(ctx)) {
    const k = f.vars.join(",");
    groups.set(k, [...(groups.get(k) || []), f]);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length)[0]?.slice(0, 4) || [];
}

const SET_SYM = { "\\cup": "∪", "\\cap": "∩", "\\setminus": "∖", "\\triangle": "△" };

function uniq(xs) {
  const out = [];
  for (const x of xs) if (!out.some((y) => cas.equal(x, y))) out.push(x);
  return out;
}

function subsets(xs) {
  return xs.reduce((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]]).sort((a, b) => a.length - b.length);
}

function augTex(A, b, general = false) {
  const n = A[0].length;
  const rows = A.map((row, i) => [...row.map((x) => (general ? x : cas.tex(x))), general ? b[i][0] : cas.tex(b[i][0])]);
  return `\\left(\\begin{array}{${"c".repeat(n)}|c} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{array}\\right)`;
}

function splitAug(M, n) {
  return [M.map((r) => r.slice(0, n)), M.map((r) => r.slice(n))];
}

// Linear systems in the note: a vector of equations, or relation variables.
function systems(ctx) {
  const out = [];
  const build = (name, eqs) => {
    try {
      const lin = eqs.map((e) => cas.sub(cas.parse(e.lhs), cas.parse(e.rhs)));
      const vars = cas.orderVars(new Set(lin.flatMap((x) => [...cas.symbols(x)])));
      const A = lin.map((x) => vars.map((v) => cas.diff(x, v)));
      if (A.flat().some((x) => cas.symbols(x).size)) return;
      const zero = Object.fromEntries(vars.map((v) => [v, cas.ZERO]));
      const b = lin.map((x) => [cas.neg(cas.subs(x, zero))]);
      out.push({ name, A, b, vars });
    } catch (_) {
      // Not linear: skip.
    }
  };
  for (const v of ctx.vars.values()) {
    if (v.kind !== "vector") continue;
    const eqs = v.value.map((e) => findRelation(String(e))).filter((e) => e && e.op === "=");
    if (eqs.length === v.value.length && eqs.length) build(v.name, eqs);
  }
  const rels = ctx.rels.filter((r) => r.v.op === "=");
  if (rels.length >= 2) build(rels.map((r) => r.v.name).join(", "), rels.map((r) => r.v));
  return out;
}

// Evaluate a formula against the note's variables (reuses the vars engine).
function derivedFrom(ctx, formula) {
  const lines = [...ctx.vars.values()];
  const scope = new Map(lines.map((v) => [v.name, v]));
  const v = derivedValue("_", formula, scope);
  if (!v || v.error) throw new Error(v?.error || "can't compute");
  return { value: toLatex(v), v };
}

export function parsePoint(text, vars) {
  const items = String(text || "").replace(/^\s*[([]|[)\]]\s*$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length !== vars.length) throw new Error(pointError(vars, items.length));
  return Object.fromEntries(vars.map((v, i) => [v, cas.parse(items[i])]));
}

// ---------- ranking ----------

export function rankObjects(query, picks = {}) {
  const q = query.toLowerCase();
  const scored = [];
  for (const o of OBJECTS) {
    let s = 0;
    if (o.name === q) s = 4;
    else if (o.name.startsWith(q)) s = 3;
    else if (o.words.split(/\s+/).some((w) => w.toLowerCase().startsWith(q))) s = 2;
    else if (q.length >= 3 && (o.name.includes(q) || o.desc.toLowerCase().includes(q))) s = 1;
    if (s) scored.push({ o, s, n: picks["obj:" + o.name] || 0 });
  }
  // Ties keep the catalog order (most used topics first).
  return scored.sort((a, b) => b.s - a.s || b.n - a.n).map((x) => x.o);
}

// Definitions written in the note's math live in vars.js (they are variables too).
export { findDefinitions } from "./vars.js";
