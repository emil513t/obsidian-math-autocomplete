// E10 of docs/imo26-coverage/CONTRADICTIONS.md: no rational ξ with ξ^n = m,
// the method of Example 1.83, with the book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";
import { irrationalProof } from "../src/irrational.js";

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const T = parseTemplates(src("imo26-templates.md"));
const OUT = parseOutcomes(src("outcomes.md"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const route = (cmd, re) => T.find((t) => t.name === cmd).variants.find((v) => re.test(v.label));
function fill(re, b) {
  const vars = note(b);
  const r = route("irrational", re);
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body, command: "irrational" }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}
const stars = (b) => T.find((t) => t.name === "irrational").variants
  .filter((v) => routeFit(v, note(b), { command: "irrational", endings: OUT.get("irrational") })?.best).map((v) => v.label.split(" (")[0]);

test("E10: Example 1.83 (√2) and Exercise 5.82 (x³ − 2): 2 divides a and b", () => {
  const md = fill(/^lowest terms/, "xi = \\sqrt{2}");
  assert.match(md, /\\iff a\^\{2\} = 2b\^\{2\}\$, so \$2\$ divides \$a\$ \(\$2\$ divides the right side, and if \$a\$ were odd, \$a\^\{2\}\$ would be odd too/);
  assert.match(md, /Write \$a = 2k\$\. Then \$\(2k\)\^\{2\} = 2b\^\{2\}\$, i\.e\. \$2k\^\{2\} = b\^\{2\}\$/);
  assert.doesNotMatch(md, /\{\{/);
  const md3 = fill(/^lowest terms/, "f(x) = x^3 - 2");
  assert.match(md3, /\$f\(\\xi\) = 0, \\text\{ i\.e\. \} \\xi\^\{3\} = 2\$/);
  assert.match(md3, /\$4k\^\{3\} = b\^\{3\}\$/);
  assert.deepEqual(stars("f(x) = x^3 - 2"), ["lowest terms + divisibility"]);
  assert.deepEqual(offBook(md + md3), []);
});

test("E10: other primes by the remainder computation of Example 1.80, and the descent for √8", () => {
  const md = fill(/^lowest terms/, "xi = \\sqrt{3}");
  assert.match(md, /\$a = 3s \+ t\$ with \$t \\in \\\{1, 2\\\}\$.*leaves the remainder \$1, 1\$ when divided by \$3\$/);
  const P8 = irrationalProof({ n: 2, m: 8 });
  assert.equal(P8.p, 2);
  assert.match(P8.substitute, /\$k\^\{2\} = 2b\^\{2\}\$ after dividing by \$4\$; as for \$a\$, \$2\$ divides \$k\$, so write \$k = 2l\$/);
  assert.equal(irrationalProof({ n: 2, m: 12 }).p, 3); // 12 = 2^2 · 3: the 3 decides
  assert.equal(irrationalProof({ n: 3, m: 4 }).p, 2);
});

test("E10: a perfect power is rational after all; ξ² = −1 has no real ξ", () => {
  assert.deepEqual(stars("xi = \\sqrt[3]{27}"), ["it is rational after all: write it as a fraction"]);
  assert.match(fill(/^it is rational/, "xi = \\sqrt[3]{27}"), /\$\\sqrt\[3\]\{27\} = \\sqrt\[3\]\{3\^\{3\}\} = \\frac\{3\}\{1\}\$/);
  assert.equal(irrationalProof({ n: 2, m: 16 }).rational, 4);
  assert.ok(irrationalProof({ n: 2, m: -1 }).noReal);
  assert.equal(irrationalProof({ n: 3, m: -8 }).rational, -2);
});
