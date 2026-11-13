// Solves real IMO26 exercises through the same path as the inputs form
// (answers typed as LaTeX or plain math), runs the code in Python, and checks
// the printed result against the known answer. Usage: node scripts/book-check.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parsePySnippets, buildPySnippet, snippetQuestions } from "../src/pysnippets.js";
import { parseVars } from "../src/vars.js";

const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
const all = parsePySnippets(md);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bookcheck-"));

// [exercise, snippet, route label contains, answers, expected substrings, vars block?]
const CASES = [
  ["1.19", "truthtable", "", { "proposition as text": "(p ∧ q) ∨ (¬r)" }, ["0 0 1 | 0", "1 1 1 | 1", "0 0 0 | 1"]],
  ["1.20 i", "equivalent", "", { "first as text": "x1 => x2", "second as text": "(¬x2) => (¬x1)" }, ["logically equivalent): True"]],
  ["1.20 ii", "equivalent", "", { "first as text": "¬(x1 ∨ x2)", "second as text": "(¬x1) ∧ (¬x2)" }, ["logically equivalent): True"]],
  ["1.20 iv", "equivalent", "", { "first as text": "x1 \\implies x2", "second as text": "\\neg x1 \\lor x2" }, ["logically equivalent): True"]],
  ["1.20 not", "equivalent", "", { "first as text": "p => q", "second as text": "q => p" }, ["logically equivalent): False"]],
  ["1.7 ii", "newton", "one equation", { f: "\\cos(x) - x", "start x0": "1" }, ["0.73908513321516"]],
  ["1.8", "sum", "", { "term with k": "1/(sqrt(k) + sqrt(k + 1))", "upper limit": "3" }, [""]],
  ["1.26", "simplify", "", { f: "(a + b)^3" }, ["a**3 + 3*a**2*b + 3*a*b**2 + b**3"]],
  ["2.13", "linsolve", "", { A: "[[1, 3, 1], [-2, -5, 3]]", b: "[2, 4]" }, ["14*x3 - 22", "8 - 5*x3"]],
  ["2.33", "intersection", "two curves", { f: "x + 1", g: "-x + 2" }, ["[1/2]"]],
  ["2.37", "interpolate", "polynomial", { pts: "[[-2, -1], [-1, 1], [1, 1], [2, 1]]" }, ["(-2, -1, -1)", "(2, 1, 1)"]],
  ["4.32", "evt", "", { f: "x^3 + 2x^2 + x + 1", a: "-0.6", b: "0" }, ["23/27"]],
  ["5.13", "perceptron", "", { "points X": "[[0, 0], [0, 1], [1, 1], [1, 0]]", "labels +-1": "[-1, 1, 1, 1]" }, [""]],
  ["7.42", "lagrange", "", { f: "x^2 + y^2", g: "x^2 + xy + y^2 = 4" }, ["8"]],
  ["9.27", "svm", "", { "points X": "[[1, 0], [2, 0], [3, 0], [3, 2], [1, 1], [2, 2]]", "labels +-1": "[1, 1, 1, 1, -1, -1]" }, [""]],
  ["9.47", "kkt", "", { f: "2x_1^2 + 3x_2^2 + 4x_3^2", gs: "[1 - x_1 - x_2 - x_3, x_1 + 2x_2 + 3x_3 - 5]" }, ["12/13"]],
  ["1.38 i", "setbuilder", "integers", { from: "-10", to: "10", "condition on n": "n^2 - 5n + 6 = 0" }, ["S = [2, 3]"]],
  ["1.38 ii", "setbuilder", "pairs", { from: "-3", to: "3", "condition on x, y": "x^2 + y^2 < 5" }, ["|S| = 13"]],
  ["1.39", "setbuilder", "integers", { from: "1", to: "50", "condition on n": "sp.isprime(n) and sp.isprime(n + 2)" }, ["[3, 5, 11, 17, 29, 41]"]],
  ["1.43", "sets", "", { A: "{1, 2, 3, 4, 5}", B: "{-1, 3, 4, 7}" }, ["A & B = {3, 4}"]],
  ["1.52", "cartesian", "identities", { A: "{1, 2}", B: "{3, 4}", C: "{2, 5}", D: "{4, 6}" }, ["(A x B) & (C x D) = (A & C) x (B & D): True", "(A x B) - (C x D) = (A - C) x (B - D): False"]],
  ["1.75", "mediant", "", { fraction: "3/5" }, ["path from 1/1: LRL"]],
  ["1.84", "primes", "", { "how many primes": "6" }, ["30031   prime: False   factorization: {59: 1, 509: 1}"]],
  ["1.93", "sumind", "inequality", { "inequality in n": "2^n < n!", from: "3", to: "5" }, ["n = 3 : False", "n = 4 : True"]],
  ["1.91", "sumind", "sum formula", { "term with k": "k^2", "closed formula in n": "n(n+1)(2n+1)/6" }, ["step: formula(n) + term(n+1) - formula(n+1) = 0"]],
  ["1.98", "hash", "", { text: "hello" }, ["2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"]],
  ["1.102", "tablefn", "", { "f as table": "{1: 7, 2: 8, 3: 9, 4: 7}", "codomain of f": "{7, 8, 9}", "g as table": "{1: 1, 2: 3, 3: 4}" }, ["f o g = {1: 7, 2: 9, 3: 7}", "f o g: injective False"]],
  ["1.103", "composition", "R^n", { "f components in t": "[t^2, t^3]", "g in x, y, z": "cos(xy) + x sin(x + y)" }, ["cos(t**5)"]],
  ["1.125", "network", "two perceptrons", { "perceptron 1 (w1, w2, b)": "(-1, -1, 3/2)", "perceptron 2 (w1, w2, b)": "(1, 1, -1/2)", "output perceptron (w1, w2, b)": "(1, 1, -3/2)" }, ["0 0 | 1 0 | 0", "0 1 | 1 1 | 1", "1 1 | 0 1 | 0"]],
  ["2.19", "polyeval", "", { f: "3x^3 + 2x^2 + x + 5", "value of x": "2" }, ["f(x0) = 39 = 39"]],
  ["2.39", "interpolate", "Shamir", { pts: "[[1, 7], [2, 13], [3, 23]]" }, ["secret p(0) = 5"]],
  ["3.10", "stochastic", "", { P: "[[\\frac{9}{10}, \\frac{1}{2}], [\\frac{1}{10}, \\frac{1}{2}]]" }, ["{p1: 5/6, p2: 1/6}"]],
  ["3.18", "matmul", "identity", { "left side": "(A + B)^2", "right side": "A^2 + 2AB + B^2" }, ["always equal: False"]],
  ["3.18 b", "matmul", "identity", { "left side": "(A + B)^2", "right side": "A^2 + AB + BA + B^2" }, ["always equal: True"]],
  ["3.34", "matinv", "gauss elimination", { A: "[[1, 1, 1], [1, 2, 1], [1, 1, 3]]" }, ["A^-1 = [[5/2, -1, -1/2], [-1, 1, 0], [-1/2, 0, 1/2]]"]],
  ["4.5", "eliminate", "", { f: "xy", g: "2x + y = 10", eliminate: "y", keep: "x" }, ["critical x = 5/2   f = 25/2"]],
  ["5.21", "leastsquares", "line", { pts: "[[1, 2], [2, 1], [4, 3]]" }, ["y = 0.4286 x + 1.0000"]],
  ["5.21 b", "leastsquares", "polynomial", { pts: "[[-2, 2], [-1, 1], [0, 0], [1, 1], [2, 2]]", "degree n": "2" }, ["coefficients, highest power first: [0.4286, 0.0, 0.3429]"]],
  ["6.21", "derivative", "definition", { f: "x^3" }, ["limit h -> 0: 3*x**2"]],
  ["6.25", "derivative", "n-th", { f: "\\sin(x)", "order n": "17" }, ["f^(n) = cos(x)"]],
  ["6.35", "loan", "", { loan: "1000000", "payment per year": "45000", years: "30", "claimed rate": "0.01" }, ["real interest rate: 2.0"]],
  ["6.48", "taylor", "", { f: "\\cos(x)", "degree n": "10", "point a": "0" }, ["x**10/3628800"]],
  ["6.53", "crit", "given point", { f: "e^x + \\log(1 + 2x) - 3x", "point x0": "0" }, ["f'(x0) = 0", "local max"]],
  ["7.13", "hessian", "second order partial", { f: "\\frac{x^2 y}{1 + y^2}" }, ["equal: True"]],
  ["7.14", "newton", "system", { F: "[y^2 - x^3 + x, y^3 - x^2]", "start point": "[1, 1]" }, ["[1.46106951867511"]],
  ["7.21", "critxy", "", { f: "x^3 + xy + y^3" }, ["-1/3"]],
  ["7.27", "compgraph", "sympy", { f: "x^3 + xy + y^3", point: "[1, 1]" }, ["gradf(point) by backpropagation = [4, 4]"]],
  ["7.28", "chainrule", "g o f", { "f components in t": "[t, t^2, t^3]", "g in x, y, z": "x^2 + 3y^6 + 2z^5" }, ["30*t**14 + 36*t**11 + 2*t", "agree: True"]],
  ["7.41", "lagrange", "", { f: "(x - 1)^2 + (y - 1)^2", g: "y - x - 1" }, ["1/2"]],
  ["7.48", "compactopt", "polygon", { f: "x^2 - 2xy + 2y", gs: "[-x, x - 3, -y, y - 2]" }, ["max: ('vertex', {x: 3, y: 0}, 9)"]],
  ["7.49", "compactopt", "polygon", { f: "1 + 4x - 5y", gs: "[-x, -y, 3x + 2y - 6]" }, ["{x: 2, y: 0}, 9)", "{x: 0, y: 3}, -14)"]],
  ["8.37", "posdef", "parameters", { "matrix with parameters": "[[2, 1, a], [1, 1, 1], [a, 1, b]]" }, ["positive definite  <=> (2) > 0 and (1) > 0"]],
  ["9.19", "kernelperceptron", "", {}, ["predicted: [-1, -1, -1, 1, 1]"]],
  ["9.49", "kkt", "", { f: "-x - 4y", gs: "[-x - y, 2x - y - 1, -x + 2y - 1]" }, ["KKT point: {x: 1, y: 1}", "f = -5"]],
];

let pass = 0;
const fails = [];
for (const [id, name, route, answers, expect] of CASES) {
  const s = all.find((t) => t.name === name);
  const v = s && s.all.find((r) => (r.label || "").toLowerCase().includes(route.toLowerCase()));
  if (!v) { fails.push(`${id}: no \\${name} route "${route}"`); continue; }
  const { questions } = snippetQuestions(v, { vars: new Map() });
  const full = Object.fromEntries(questions.map((q) => [q.key, q.value]));
  for (const k of Object.keys(answers)) if (!(k in full)) fails.push(`${id}: \\${name} has no question "${k}" (has: ${Object.keys(full).join(", ")})`);
  const { text } = buildPySnippet(v, { answers: { ...full, ...answers } });
  if (/\{\{/.test(text)) { fails.push(`${id}: blanks left:\n${text}`); continue; }
  const file = path.join(dir, `ex${id.replace(/\W/g, "_")}.py`);
  fs.writeFileSync(file, text);
  const res = spawnSync("python", ["-I", file], { encoding: "utf8", timeout: 120000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  const out = (res.stdout || "") + (res.stderr || "");
  const missing = expect.filter((e) => !out.includes(e));
  if (process.env.SHOW) console.log(`=== ${id} \\${name}\n${out.trim()}\n`);
  if (res.status === 0 && !missing.length) pass++;
  else fails.push(`${id} \\${name}: ${res.status !== 0 ? "crashed" : "expected " + JSON.stringify(missing)}\n--- code\n${text}\n--- output\n${out.trim().split("\n").slice(-12).join("\n")}`);
}
for (const f of fails) console.log("FAIL", f, "\n");
console.log(`${pass}/${CASES.length} book exercises solved correctly`);
process.exit(fails.length ? 1 : 0);
