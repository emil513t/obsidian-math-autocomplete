// Endings that depend on a parameter: one case per range of the parameter.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { paramCases, valueTex } from "../src/cases.js";
import { outcomeOf } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";

const T = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const split = (cmd, b) => {
  const r = paramCases(cmd, note(b));
  return r?.cases ? r.cases.map((c) => `${c.where}: ${c.key}`).join(" | ") : r;
};
function fill(cmd, re, vars) {
  const r = T.find((t) => t.name === cmd).variants.find((v) => re.test(v.label));
  // As in the plugin: the command's name comes along.
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body, command: cmd }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}

test("case splits: definiteness, invertible, min/max/saddle, convex, number of roots", () => {
  assert.equal(split("posdef", "A = [[1, a], [a, 4]]"), "a < -2: ind | a = -2: psd | -2 < a < 2: pd | a = 2: psd | a > 2: ind");
  assert.equal(split("posdef", "A = [[2, 1], [1, a]]"), "a < \\frac{1}{2}: ind | a = \\frac{1}{2}: psd | a > \\frac{1}{2}: pd");
  assert.equal(split("matinv", "A = [[1, a], [a, 4]]"), "a < -2: inv | a = -2: sing | -2 < a < 2: inv | a = 2: sing | a > 2: inv");
  assert.equal(split("critxy", "f(x, y) = x^2 + a x y + y^2"), "a < -2: saddle | a = -2: semi | -2 < a < 2: min | a = 2: semi | a > 2: saddle");
  assert.equal(split("convexfn", "f(x, y) = x^2 + a y^2"), "a < 0: notconvex | a = 0: convex | a > 0: strict");
  assert.equal(split("roots", "f(x) = x^2 + a x + 1"), "a < -2: two | a = -2: double | -2 < a < 2: none | a = 2: double | a > 2: two");
  assert.equal(split("roots", "f(x) = a x^2 + 2x + 1"), "a < 0: two | a = 0: rational | 0 < a < 1: two | a = 1: double | a > 1: none");
  // Assumptions cut the line; irrational values exactly.
  assert.equal(split("posdef", "A = [[1, a], [a, 4]]\na > 0"), "0 < a < 2: pd | a = 2: psd | a > 2: ind");
  assert.equal(split("posdef", "A = [[1, a], [a, 2]]\na >= 1"), "1 \\le a < \\sqrt{2}: pd | a = \\sqrt{2}: psd | a > \\sqrt{2}: ind");
  // No parameter / several parameters.
  assert.equal(paramCases("posdef", note("A = [[2, 1], [1, 3]]")), null);
  assert.deepEqual(paramCases("matinv", note("A = [[a, b], [c, d]]")), { many: ["a", "b", "c", "d"] });
  assert.equal(valueTex(-0.5), "-\\frac{1}{2}");
});

test("the 'with a parameter' routes write every case and get the ★", () => {
  const out = fill("posdef", /^with a parameter/, note("A = [[1, a], [a, 4]]"));
  assert.match(out, /- \$a < -2\$: indefinite\n- \$a = -2\$: positive semi-definite\n- \$-2 < a < 2\$: positive definite/);
  assert.doesNotMatch(out, /\{\{|[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  assert.match(fill("roots", /^with a parameter/, note("f(x) = x^2 + a x + 1")), /- \$-2 < a < 2\$: no real roots/);
  assert.match(fill("convexfn", /^with a parameter/, note("f(x, y) = x^2 + a y^2")), /- \$a > 0\$: strictly convex/);
  assert.match(fill("critxy", /^with a parameter/, note("f(x, y) = x^2 + a x y + y^2")), /- \$-2 < a < 2\$: local minimum/);
  assert.match(fill("hessian", /^depends on a parameter/, note("f(x, y) = x^2 + a x y + y^2")), /- \$a > 2\$: indefinite: saddle point/);
  for (const [cmd, b] of [["posdef", "A = [[1, a], [a, 4]]"], ["roots", "f(x) = x^2 + a x + 1"], ["convexfn", "f(x, y) = x^2 + a y^2"], ["critxy", "f(x, y) = x^2 + a x y + y^2"]]) {
    const stars = T.find((t) => t.name === cmd).variants.filter((v) => routeFit(v, note(b), { command: cmd })?.best).map((v) => v.label);
    assert.equal(stars.length, 1, `${cmd}: ${stars}`);
    assert.match(stars[0], /^with a parameter/);
  }
  // Without a parameter the route is hidden.
  assert.equal(routeFit(T.find((t) => t.name === "posdef").variants.find((v) => /^with a parameter/.test(v.label)), note("A = [[2, 1], [1, 3]]"), { command: "posdef" }).ok, false);
});

test("outcomeOf: the cases with their names; the words are the book's", () => {
  const [o] = outcomeOf("posdef", note("A = [[1, a], [a, 4]]"));
  assert.equal(o.key, "param");
  assert.deepEqual(o.cases.map((c) => c.name), ["indefinite", "positive semi-definite", "positive definite", "positive semi-definite", "indefinite"]);
  const all = ["posdef", "matinv", "critxy", "hessian", "convexfn", "roots"].flatMap((c) => (outcomeOf(c, note("A = [[1, a], [a, 4]]\nf(x, y) = x^2 + a x y + y^2")) || []).flatMap((o) => (o.cases || []).map((x) => x.name)));
  assert.ok(all.length > 10);
  assert.deepEqual(offBook(all.join("\n")), []);
});
