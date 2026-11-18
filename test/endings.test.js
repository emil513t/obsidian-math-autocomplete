// Phase 3: a route for every ending, its blanks computed from the note, the
// ★ from the ending the note's values give, and python for parameters.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes, outcomeOf } from "../src/outcomes.js";
import { parsePySnippets, buildPySnippet } from "../src/pysnippets.js";
import { offBook } from "../src/curriculum.js";

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const T = parseTemplates(src("imo26-templates.md"));
const OUT = parseOutcomes(src("outcomes.md"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const route = (cmd, re) => T.find((t) => t.name === cmd).variants.find((v) => re.test(v.label));
function fill(cmd, re, vars) {
  const r = route(cmd, re);
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body, command: cmd }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}
const stars = (cmd, b) => T.find((t) => t.name === cmd).variants
  .filter((v) => routeFit(v, note(b), { command: cmd, endings: OUT.get(cmd) })?.best).map((v) => v.label.split(" (")[0]);

test("every ending has a route now", () => {
  const none = [...OUT].flatMap(([c, es]) => es.filter((e) => !e.route).map((e) => `${c}: ${e.name}`));
  assert.deepEqual(none, []);
  const text = T.flatMap((t) => t.variants.map((v) => `${v.label}\n${v.body}`)).join("\n");
  assert.deepEqual(offBook(text), []);
});

test("the new routes fill themselves from the note", () => {
  assert.match(fill("matmul", /^NOT defined/, note("A = [[1, 2, 3]]\nB = [[1, 2]]")), /\$A\$ is \$1 \\times 3\$ and \$B\$ is \$1 \\times 2\$/);
  assert.match(fill("matinv", /^not square/, note("A = [[1, 2, 3], [4, 5, 6]]")), /is \$2 \\times 3\$, not square/);
  assert.match(fill("posdef", /^not symmetric/, note("A = [[1, 2], [0, 1]]")), /S = \\frac\{1\}\{2\}\(A \+ A\^\\top\) = \\begin\{pmatrix\} 1 & 1 \\\\ 1 & 1 \\end\{pmatrix\}/);
  assert.match(fill("kkt", /^no feasible point/, note("f(x, y) = x^2 + y^2\ng1(x, y) = x - 1\ng2(x, y) = 2 - x")), /eliminating \$x\$ ends in \$0 \\le -1\$, which is false; directly: adding \$g_\{1\} \\le 0\$ and \$g_\{2\} \\le 0\$ gives \$0 \\le -1\$/);
  assert.match(fill("lagrange", /^∇g = 0/, note("f(x, y) = x + y\ng(x, y) = x^2 - y^2")), /\(0, 0\)\\text\{ \(on \} g = 0\\text\{: add it\)\}/);
  assert.match(fill("sumind", /^the formula is wrong/, note("P(n) = \\sum_{k=1}^{n} k = n^2")), /For \$n = 2\$ the left side is \$3\$ and the right side is \$4\$/);
  assert.match(fill("inequality", /^NOT true for all values/, note("I(x) = x^2 \\ge 2x + 1")), /For \$x = 0\$ the left side is \$0\$ and the right side is \$1\$, and \$0 < 1\$/);
  for (const [c, re, b] of [["matmul", /^NOT defined/, "A = [[1, 2, 3]]\nB = [[1, 2]]"], ["kkt", /^no feasible/, "f(x, y) = x^2\ng1(x, y) = x - 1\ng2(x, y) = 2 - x"]]) {
    assert.doesNotMatch(fill(c, re, note(b)), /\{\{|[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  }
});

test("the ★ follows the ending your values give, for any command", () => {
  assert.deepEqual(stars("crit", "f(x) = x^3 - 3x"), ["find critical points + second derivative"]);
  assert.deepEqual(stars("crit", "f(x) = x^3"), ["a critical point that is NOT an extremum"]);
  assert.deepEqual(stars("roots", "f(x) = x^2 + 1"), ["roots of a quadratic: formula"]);
  assert.deepEqual(stars("increasing", "f(x) = x^3"), ["sign of f'"]);
  assert.deepEqual(stars("injective", "f(x) = x^2"), ["NOT injective: two points with the same value"]);
  assert.deepEqual(stars("matmul", "A = [[1, 2, 3]]\nB = [[1, 2]]"), ["NOT defined: the sizes don't match"]);
  assert.deepEqual(stars("matinv", "A = [[1, 2, 3], [4, 5, 6]]"), ["not square: no inverse"]);
  assert.deepEqual(stars("posdef", "A = [[1, 2], [0, 1]]"), ["not symmetric: decide the symmetric matrix with the same u^T A u"]);
  assert.deepEqual(stars("kkt", "f(x, y) = x^2 + y^2\ng1(x, y) = x - 1\ng2(x, y) = 2 - x"), ["no feasible point: the constraints contradict each other"]);
  assert.deepEqual(stars("sumind", "P(n) = \\sum_{k=1}^{n} k = n^2"), ["the formula is wrong: a small n where it fails"]);
  // Endings detected without a fitting route stay neutral: no ★ invented.
  assert.deepEqual(outcomeOf("lagrange", note("f(x, y) = x + y\ng(x, y) = x^2 - y^2")).map((o) => o.key), ["gradzero"]);
});

test("python: one parameter, every case (same as the plugin's own cases)", () => {
  const S = parsePySnippets(src("py-snippets.md"));
  const run = (cmd, b) => {
    const v = S.find((s) => s.name === cmd).all.find((x) => /with one parameter/.test(x.label));
    const { text } = buildPySnippet(v, { vars: note(b) });
    const r = spawnSync("python", ["-I", "-c", text], { encoding: "utf8", timeout: 120000 });
    return { ...r, stdout: String(r.stdout || "").replace(/\r\n/g, "\n") };
  };
  const py = run("posdef", "A = [[1, a], [a, 4]]");
  if (py.error || /No module named/.test(py.stderr)) return;
  assert.equal(py.status, 0, py.stderr);
  assert.match(py.stdout, /a < -2: indefinite\na = -2: positive semidefinite\n-2 < a < 2: positive definite/);
  assert.match(run("critxy", "f(x, y) = x^2 + a x y + y^2").stdout, /-2 < a < 2: local minimum\na = 2: only semi-definite/);
  assert.match(run("convexfn", "f(x, y) = x^2 + a y^2").stdout, /a = 0: convex, not strictly\na > 0: strictly convex/);
  assert.match(run("roots", "f(x) = a x^2 + 2x + 1").stdout, /0 < a < 1: 2 real root\(s\)\na = 1: 1 real root\(s\)\na > 1: 0 real root\(s\)/);
});
