// E7 of docs/imo26-coverage/CONTRADICTIONS.md: not bounded / not open / not
// closed / no limit / not differentiable, with the book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const T = parseTemplates(src("imo26-templates.md"));
const OUT = parseOutcomes(src("outcomes.md"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const route = (cmd, re) => T.find((t) => t.name === cmd).variants.find((v) => re.test(v.label));
function fill(cmd, re, b) {
  const vars = note(b);
  const r = route(cmd, re);
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body, command: cmd }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}
const stars = (cmd, b) => T.find((t) => t.name === cmd).variants
  .filter((v) => routeFit(v, note(b), { command: cmd, endings: OUT.get(cmd) })?.best).map((v) => v.label.split(" (")[0]);
const STEP = "\\\\frac\\{\\\\varepsilon\\}\\{2\\}";

test("E7: Exercise 5.36: N is not bounded, n = ⌈|R|⌉ + 1 (Remark 5.34)", () => {
  const md = fill("bounded", /^NOT bounded/, "S = \\mathbb{N}");
  assert.match(md, /Take \$v = \\lceil \|R\| \\rceil \+ 1 \\in S\$\. Then \$\|v\| = \\lceil \|R\| \\rceil \+ 1 \\ge R\$/);
  assert.deepEqual(stars("bounded", "S = \\mathbb{N}"), ["NOT bounded: elements of arbitrarily large norm"]);
  // A set the old test could not decide: y ≥ x² contains (0, |R| + 1).
  assert.match(fill("bounded", /^NOT bounded/, "S = \\{ (x, y) \\mid y \\ge x^2 \\}"), /\$v = \(0, \|R\| \+ 1\) \\in S\$/);
  assert.deepEqual(stars("bounded", "S = \\{ (x, y) \\mid y \\ge x^2 \\}"), ["NOT bounded: elements of arbitrarily large norm"]);
  assert.deepEqual(stars("compact", "C = \\{ (x, y) \\mid y \\ge x^2 \\}"), ["NOT compact: unbounded or not closed"]);
});

test("E7: Exercises 5.42, 5.44, 5.46: not open, a point outside every ball", () => {
  assert.match(fill("openset", /^NOT open/, "U = \\{ (x, y) \\mid y = 0 \\}"), new RegExp(`\\$v = \\(0, 0\\) \\\\in U\\$, every ball \\$B\\(v, \\\\varepsilon\\)\\$ contains \\$\\(0, ${STEP}\\) \\\\notin U\\$`));
  assert.match(fill("openset", /^NOT open/, "U = [0, 1)"), new RegExp(`v = 0 \\\\in U.*contains \\$-${STEP} \\\\notin U`));
  assert.match(fill("openset", /^NOT open/, "U = \\{0\\}"), new RegExp(`contains \\$${STEP} \\\\notin U`));
  assert.match(fill("openset", /^NOT open/, "U = \\{0, 2\\}"), /\\frac\{\\min\(\\varepsilon, 2\)\}\{2\}/);
  assert.deepEqual(stars("openset", "U = \\{1\\}"), ["NOT open: a point with no ball inside"]);
  assert.deepEqual(stars("openset", "U = \\mathbb{Z}"), ["NOT open: a point with no ball inside"]);
});

test("E7: Exercise 5.50(d): [0, 1) is not closed; the disc x² + y² < 1 is not closed", () => {
  assert.match(fill("closedset", /^NOT closed/, "F = [0, 1)"), /since \$1 \\notin F\$ but every ball around it meets \$F\$ \(in \$1 - \\min\\left\(\\frac\{\\varepsilon\}\{2\}, 1\\right\)\$\)/);
  assert.match(fill("closedset", /^NOT closed/, "F = \\{ (x, y) \\mid x^2 + y^2 < 1 \\}"), /\$\(0, 1\) \\notin F\$/);
  assert.match(fill("compact", /^NOT compact/, "C = [0, 1)"), /not closed: \$1 \\notin C\$/);
});

test("E7: Exercise 5.64 (jump: ε = 1/4) and Exercises 6.24, 6.31 (corners)", () => {
  const jumpF = "f(x) = \\begin{cases} 0 & \\text{if } x < 0 \\\\ 1 & \\text{if } x \\ge 0 \\end{cases}";
  const md = fill("limit", /NOT exist/, jumpF);
  assert.match(md, /with \$x > 0\$, \$f\(x\)\$ is close to \$1\$; with \$x < 0\$, \$f\(x\)\$ is close to \$0\$.*\\varepsilon = \\frac\{1\}\{4\}/);
  assert.deepEqual(stars("limit", jumpF), ["limit does NOT exist: different values on the two sides of a"]);
  const relu = "f(x) = \\begin{cases} 0 & \\text{if } x < 0 \\\\ x & \\text{if } x \\ge 0 \\end{cases}";
  assert.match(fill("derivative", /^NOT differentiable/, relu), /this quotient is \$1\$ when \$h > 0\$ and \$0\$ when \$h < 0\$/);
  assert.deepEqual(stars("derivative", relu), ["NOT differentiable at a point"]);
  // |x| written in two formulas (Ex 6.31): slopes 1 and -1.
  assert.match(fill("derivative", /^NOT differentiable/, "f(x) = \\begin{cases} -x & \\text{if } x < 0 \\\\ x & \\text{if } x \\ge 0 \\end{cases}"), /is \$1\$ when \$h > 0\$ and \$-1\$ when \$h < 0\$/);
  assert.deepEqual(offBook(md), []);
});
