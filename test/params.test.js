// Parameters in matrices (\matinv for which a), assumptions like a > 0 in the
// vars block, Exercise 7.41 (Lagrange on a line) and the python layout
// (explanation above the block as Markdown, results only inside).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseVars, toLatex, parseAssumptions, satisfies } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parsePySnippets, buildPySnippet } from "../src/pysnippets.js";
import { pyExplainMarkdown } from "../src/explain.js";

const TEMPLATES = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
const SNIPPETS = parsePySnippets(fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8"));
const route = (name, re) => TEMPLATES.find((t) => t.name === name).variants.find((v) => re.test(v.label));
const note = (body) => parseVars("```vars\n" + body + "\n```\n");
function fill(r, vars) {
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}

test("assumptions: a > 0, b >= 1, 0 < t < 1, c ≠ 0, a, b \\le 2", () => {
  const as = parseAssumptions("a > 0\nb >= 1\n0 < t < 1\nc ≠ 0\nd \\leq -1/2\np, q \\le 2\nf = x^2\nx = 3");
  const s = as.map((a) => `${a.name}${a.op}${a.value}`);
  assert.deepEqual(s, ["a>0", "b>=1", "t>0", "t<1", "c!=0", "d<=-0.5", "p<=2", "q<=2"]);
  assert.equal(satisfies(as, "a", -2), false);
  assert.equal(satisfies(as, "a", 2), true);
  assert.equal(satisfies(as, "t", 1), false);
  // They don't become variables, and the matrix still parses.
  const v = note("A = [[1, a], [a, 4]]\na > 0");
  assert.deepEqual([...v.keys()], ["A"]);
  assert.equal(v.assumptions[0].text, "a > 0");
});

test("\\matinv with a parameter: D, M with AM = DI, the a with D = 0 done one by one", () => {
  const r = route("matinv", /with parameters/);
  const out = fill(r, note("A = [[a, 1, 0], [1, a, 0], [0, 0, 1]]"));
  assert.match(out, /D = a\^2 - 1 = \(a \+ 1\)\(a - 1\)/);
  assert.match(out, /M = \\begin\{pmatrix\} a & -1 & 0 \\\\ -1 & a & 0 \\\\ 0 & 0 & a\^2 - 1 \\end\{pmatrix\}/);
  assert.match(out, /\$a \\neq -1\$ and \$a \\neq 1\$/);
  assert.match(out, /For \$a = 1\$: .*\$Av = 0\$ for \$v = \\begin\{pmatrix\} -1 \\\\ 1 \\\\ 0 \\end\{pmatrix\} \\neq 0\$/);
  assert.match(out, /\*\*not invertible\*\* for \$a = -1\$/);
  assert.doesNotMatch(out, /\{\{|[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  // a > 0 rules out a = -2.
  const pos = fill(r, note("A = [[1, a], [a, 4]]\na > 0"));
  assert.match(pos, /D = -a\^2 \+ 4 = -\(a \+ 2\)\(a - 2\)/);
  assert.match(pos, /\$a \\neq 2\$, with \$a > 0\$ \(\$a = -2\$ is ruled out by \$a > 0\$\)/);
  assert.doesNotMatch(pos, /For \$a = -2\$/);
  // Several parameters: the condition D != 0 and the general argument.
  const abcd = fill(r, note("A = [[a, b], [c, d]]"));
  assert.match(abcd, /\$ad - bc \\neq 0\$/);
  assert.match(abcd, /a column \$m \\neq 0\$ of \$M\$/);
  // The route is the one picked; plain Gauss is flagged.
  assert.equal(routeFit(r, note("A = [[1, a], [a, 4]]")).best, true);
  assert.equal(routeFit(route("matinv", /^Gauss/), note("A = [[1, a], [a, 4]]")).ok, false);
});

test("\\posdef with parameters mentions the assumptions", () => {
  const out = fill(route("posdef", /symmetric reduction/), note("A = [[2, 1], [1, a]]\na > 0"));
  assert.match(out, /\$-\\frac\{1\}\{2\} \+ a > 0\$|\$a - \\frac\{1\}\{2\} > 0\$/);
  assert.match(out, /\(with \$a > 0\$\)/);
});

test("Exercise 7.41: Lagrange on the line y = x + 1, min by convexity (not compactness)", () => {
  const vars = note("f = (x-1)^2 + (y-1)^2\ng = y - x - 1");
  const r = route("lagrange", /^linear constraint/);
  assert.equal(routeFit(r, vars).best, true);
  assert.equal(routeFit(route("lagrange", /^one constraint/), vars).ok, false);
  const out = fill(r, vars);
  assert.match(out, /x = \\frac\{1\}\{2\},\\ y = \\frac\{3\}\{2\},\\ \\lambda = -1/);
  assert.match(out, /v_0 = \(\\frac\{1\}\{2\}, \\frac\{3\}\{2\}\)/);
  assert.match(out, /not bounded, so Theorem 5\.84 does not apply/);
  assert.match(out, /By Theorem 6\.13/);
  assert.match(out, /is the minimum: \$f\(\\frac\{1\}\{2\}, \\frac\{3\}\{2\}\) = \\frac\{1\}\{2\}\$/);
  assert.doesNotMatch(out, /\{\{|[\x00-\x08\x0b\x0c\x0e-\x1f]/);
});

test("python: a > 0 becomes positive=True; explanation is Markdown, not prints", () => {
  const s = SNIPPETS.find((x) => x.name === "matinv").all.find((v) => /parameters/.test(v.label));
  const vars = note("A = [[1, a], [a, 4]]\na > 0\nb > 3");
  const { text, used } = buildPySnippet(s, { vars });
  assert.match(text, /a = sp\.symbols\('a', positive=True\)/);
  assert.doesNotMatch(text, /print\(".*(Definition|Theorem|Proposition|Exercise)/);
  const md = pyExplainMarkdown({ name: "matinv", title: "inverse matrix", label: s.label, items: [{ label: "Definition 3.24", title: "Inverse", text: "AB = BA = I" }], inputs: used.map((u) => ({ name: u.input, tex: toLatex(vars.get(u.var)) })), assumptions: "a > 0" });
  assert.match(md, /^\*\*\\matinv\*\* · inverse matrix/);
  assert.match(md, /Using \$A = \\begin\{pmatrix\} 1 & a \\\\ a & 4 \\end\{pmatrix\}\$, \$a > 0\$\./);
  assert.match(md, /> \[!note\] Definitions and results used/);
  // Runs, and a > 0 drops the root a = -2.
  const py = spawnSync("python", ["-I", "-c", text], { encoding: "utf8", timeout: 120000 });
  if (py.error || /No module named/.test(py.stderr)) return;
  assert.equal(py.status, 0, py.stderr);
  assert.match(py.stdout, /a = 2: not invertible/);
  assert.doesNotMatch(py.stdout, /a = -2/);
});

test("no python snippet prints book references (they go in the Markdown above)", () => {
  const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
  const bad = md.split("\n").filter((l) => /print\(.*\b(Definition|Theorem|Proposition|Exercise|Corollary|Lemma|Prop|Thm)\s*\d/.test(l));
  assert.deepEqual(bad, []);
});
