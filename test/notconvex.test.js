// E8 of docs/imo26-coverage/CONTRADICTIONS.md: not convex / not strictly
// convex, with the book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as cas from "../src/cas.js";
import { parseVars, toLatex } from "../src/vars.js";
import { mainFn } from "../src/textlink.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";
import { badPair, linearSegment, setBadPair } from "../src/notconvex.js";

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
const F = (b) => mainFn(note(b));
const num = (x) => cas.evaluate(x);

test("E8: a bad pair breaks Definition 4.26, checked with the numbers", () => {
  for (const b of ["f(x) = x^3", "f(x) = -x^2 + 4x", "f(x, y) = x^2 - y^2", "f(x, y) = xy"]) {
    const B = badPair(F(b));
    assert.ok(B, b);
    assert.ok(num(B.fv) > num(B.avg), `${b}: f(mid) > average`);
  }
  assert.equal(badPair(F("f(x, y) = x^2 + y^2")), null);
  // Exercise 9.53(1): x^2 + y^2 - e^{x - y} - 1 is not convex (not a polynomial Hessian).
  const B = badPair(F("f(x, y) = x^2 + y^2 - e^{x - y} - 1"));
  assert.ok(B);
  assert.ok(num(B.fv) - num(B.avg) > 1e-9);
});

test("E8: convex but not strictly convex: f is linear on a segment (6.6, 8.28, 9.52, 9.54(1))", () => {
  const S = linearSegment(F("f(x) = 3x + 1"));
  assert.ok(S);
  const S52 = linearSegment(F("f(x, y) = (x - 1)^2 + (y - 1)^2 + 2xy"));
  assert.ok(S52 && S52.convex);
  assert.ok(cas.equal(cas.mul(cas.num(2), S52.fm), cas.add(S52.fv, S52.fw)), "linear: f(mid) = average");
  const S54 = linearSegment(F("f(x_1, x_2, x_3, x_4) = (x_1 - x_3)^2 + (x_2 - x_4)^2"));
  assert.ok(S54 && S54.convex);
  const S28 = linearSegment(F("f(x, y) = \\log(e^x + e^y)"));
  assert.ok(S28, "8.28: log(e^x + e^y) is linear along (1, 1)");
  assert.deepEqual(S28.u.map((x) => Math.abs(num(x))), [1, 1]);
  // The book: "log(x) denotes the logarithm with base e" (Section 6).
  assert.equal(cas.tex(cas.diff(cas.parse("\\log(x)"), "x")), cas.tex(cas.parse("\\frac{1}{x}")));
  assert.ok(Math.abs(cas.evaluate(cas.parse("\\log(x)"), { x: Math.E }) - 1) < 1e-12);
  assert.equal(linearSegment(F("f(x, y) = x^2 + y^2")), null);
});

test("E8: the routes fill from the note and get the ★", () => {
  const md = fill("convexfn", /^NOT convex/, note("f(x, y) = x^2 - y^2"));
  assert.match(md, /> .* = \\frac\{f\(x\) \+ f\(y\)\}\{2\}/);
  assert.doesNotMatch(md, /\{\{/);
  assert.deepEqual(stars("convexfn", "f(x, y) = x^2 + y^2 - e^{x - y} - 1"), ["NOT convex: one bad pair of points"]);
  const h = fill("strictconvex", /^NOT convex/, note("f(x) = x^3"));
  assert.match(h, /f''\(-1\) = -6/);
  const lin = fill("strictconvex", /^convex but NOT strictly/, note("f(x, y) = (x - 1)^2 + (y - 1)^2 + 2xy"));
  assert.match(lin, /from \$\(0, 0\)\$ to \$\(1, -1\)\$|from \$\(0, 0\)\$ to \$\(-1, 1\)\$/);
  assert.deepEqual(stars("strictconvex", "f(x, y) = (x - 1)^2 + (y - 1)^2 + 2xy"), ["convex but NOT strictly convex"]);
});

test("E8: a set that is not convex: two points, the midpoint outside (Def 4.21)", () => {
  const vars = note("C = \\{ (x, y) \\mid x^2 + y^2 \\ge 1 \\}");
  const B = setBadPair(vars);
  assert.ok(B);
  const md = fill("convexset", /^NOT convex/, vars);
  assert.match(md, /the midpoint .* = \$\(0, 0\)\$|\\frac\{1\}\{2\}\(x \+ y\) = \(0, 0\)/);
  assert.doesNotMatch(md, /\{\{/);
  assert.deepEqual(stars("convexset", "C = \\{ (x, y) \\mid x^2 + y^2 \\ge 1 \\}"), ["NOT convex: a segment leaves the set"]);
  assert.equal(setBadPair(note("C = \\{ (x, y) \\mid x + y \\le 1, x \\ge 0 \\}")), null);
  assert.deepEqual(offBook(md), []);
});
