// E5 (linear system with no solution) and E9 (a point is not optimal) of
// docs/imo26-coverage/CONTRADICTIONS.md, with the book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";
import { gaussInfo } from "../src/nosolution.js";
import { notOptimal } from "../src/notoptimal.js";
import * as cas from "../src/cas.js";

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

// ---------- E5 ----------

test("E5: \\gauss picks its route from the note's system and proves 'no solution' in one line", () => {
  const none = "e1 = x + y + z = 1\ne2 = x - y + 2z = 3\ne3 = 2x + 3z = 5";
  assert.deepEqual(stars("gauss", none), ["no solutions: an impossible equation"]);
  const md = fill("gauss", /^no solutions/, note(none));
  assert.match(md, /says \$0 = 1\$/);
  assert.match(md, /adding \$e1\$, \$e2\$ and \$-1\$ times \$e3\$ gives \$0 = -1\$/);
  assert.match(md, /\\begin\{array\}\{ccc\|c\}/);
  assert.doesNotMatch(md, /\{\{/);
  assert.deepEqual(stars("gauss", "e1 = x + y = 3\ne2 = x - y = 1"), ["unique solution"]);
  assert.deepEqual(stars("gauss", "e1 = x + y + z = 3\ne2 = x - y + z = 1\ne3 = 2x + 2z = 4"), ["infinitely many solutions"]);
  const uq = fill("gauss", /^unique/, note("e1 = x + y + z = 6\ne2 = x + 2y + 3z = 14\ne3 = x - y + z = 2"));
  assert.match(uq, /\*\*Solution:\*\* \$\(1, 2, 3\)\$/);
});

test("E5: Exercise 3.15 (no λ) and Exercise 5.17 / (5.12) with \\leastsquares", () => {
  const l = gaussInfo(note("e1 = l = 2\ne2 = 2l = 4\ne3 = 3l = 6\ne4 = 4l = 8\ne5 = 5l = 10\ne6 = 6l + 2 = 15"));
  assert.equal(l.G.kind, "none");
  assert.deepEqual(l.K.k.filter(Boolean).length, 2); // two equations already disagree
  const ls = note("A = [[1, 1], [1, -1], [-1, 1]]\nb = [3, 1, 1]");
  assert.deepEqual(stars("leastsquares", "A = [[1, 1], [1, -1], [-1, 1]]\nb = [3, 1, 1]"), ["normal equations"]);
  assert.match(fill("leastsquares", /^first show/, ls), /contradictory row \$0 = 2\$/);
});

// ---------- E9 ----------

test("E9: Exercise 9.52(3): (-1, -1) is not optimal, the KKT equations have no λ", () => {
  const b = "f(x, y) = (x - 1)^2 + (y - 1)^2 + 2xy\ng1(x, y) = x + y\ng2(x, y) = x - y\np = (-1, -1)";
  const N = notOptimal(note(b));
  assert.equal(N.K.ok, false);
  assert.equal(N.K.kind, "none");
  assert.deepEqual(stars("kkt", b), ["NOT optimal: no λ ≥ 0 at the point"]);
  const md = fill("kkt", /^NOT optimal: no λ/, note(b));
  assert.match(md, /\$g_\{2\}\(v\) = 0\$/);
  assert.match(md, /-6 \+ \\lambda_2 = 0,\\quad -6 - \\lambda_2 = 0/);
  assert.match(md, /no solution at all/);
  assert.match(md, /\$z_0 = /);
  assert.doesNotMatch(md, /\{\{/);
});

test("E9: Exercise 9.57(2) (λ_1 = -2 < 0) and 9.56(2) (λ = -1 and a better point)", () => {
  const b57 = "f(x, y) = 2x^2 + 3x + y^2 + y\ng1(x, y) = x^2 + (y + 1)^2 - 1\ng2(x, y) = y - x\np = (0, 0)";
  const N = notOptimal(note(b57));
  assert.equal(N.K.kind, "unique");
  assert.deepEqual(N.K.lambda.map((x) => cas.tex(x)), ["-2", "3"]);
  assert.match(fill("kkt", /^NOT optimal: no λ/, note(b57)), /\\lambda_1 = -2, \\lambda_2 = 3\$, and \$\\lambda_1 < 0\$/);
  const b56 = "f(x, y) = \\frac{1}{2}x^2 + y^2 - 2y + 2\ng(x, y) = -x + 2y - 1\np = (-1, 0)";
  const M = notOptimal(note(b56));
  assert.equal(M.K.ok, false);
  assert.ok(M.B, "a better feasible point");
  const md = fill("kkt", /^NOT optimal: a feasible point/, note(b56));
  assert.match(md, /< f\(v\)/);
  assert.doesNotMatch(md, /\{\{/);
});

test("E9: Exercise 9.46(b): (-1/2, 1/2) is inside, f = -x + y decreases along -∇f", () => {
  const b = "f(x, y) = -x + y\ng1(x, y) = x^2 + y^2 - 1\ng2(x, y) = (x + 1)^2 + (y - 1)^2 - 1\np = (-\\frac{1}{2}, \\frac{1}{2})";
  const N = notOptimal(note(b));
  assert.deepEqual(N.K.active, []);
  assert.ok(N.B && N.B.alongGrad);
  assert.match(fill("kkt", /^NOT optimal: no λ/, note(b)), /all \$\\lambda_i = 0\$ and the conditions say \$\\nabla f\(v\) = \(-1, 1\) = 0\$, which is false/);
});

test("E9: an optimal point is not called 'not optimal'; wording stays in the book", () => {
  // min x^2 + y^2 subject to 1 - x - y <= 0: optimum (1/2, 1/2) with λ = 1.
  const b = "f(x, y) = x^2 + y^2\ng(x, y) = 1 - x - y\np = (\\frac{1}{2}, \\frac{1}{2})";
  assert.equal(notOptimal(note(b)).K.ok, true);
  assert.deepEqual(stars("kkt", b), ["verify a given point satisfies KKT"]);
  const text = T.filter((t) => ["gauss", "kkt"].includes(t.name)).flatMap((t) => t.variants.map((v) => `${v.label}\n${v.body}`)).join("\n");
  assert.deepEqual(offBook(text + fill("kkt", /^NOT optimal: no λ/, note("f(x, y) = (x - 1)^2 + (y - 1)^2 + 2xy\ng1(x, y) = x + y\ng2(x, y) = x - y\np = (-1, -1)"))), []);
});
