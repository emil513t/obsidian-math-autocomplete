// E2 + E3 of docs/imo26-coverage/CONTRADICTIONS.md: one concrete case where a
// claim fails, with the book's exercises as cases.
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
import { notInjective, notSurjective, notExtremum, truthInfo } from "../src/failcases.js";

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

// ---------- E2 ----------

test("E2: Exercise 1.28: {1, 2, 3} ≠ {1, 2, 4}, an element in one and not the other", () => {
  const b = "A = \\{1, 2, 3\\}\nB = \\{1, 2, 4\\}";
  const md = fill("setequal", /^NOT equal/, note(b));
  assert.match(md, /\$3 \\in A\$ because it is listed in \$A\$, but \$3 \\notin B\$ because \$B = \\\{1, 2, 4\\\}\$ does not list it/);
  assert.deepEqual(stars("setequal", b), ["NOT equal: an element in one but not the other"]);
  assert.deepEqual(stars("setequal", "A = \\{1, 2\\}\nB = \\{2, 1\\}"), ["double inclusion"]);
  // Only B has an extra element: the sentence names B as the set with it.
  assert.match(fill("setequal", /^NOT equal/, note("A = \\{1, 2\\}\nB = \\{1, 2, 5\\}")), /\$5 \\in B\$ because it is listed in \$B\$, but \$5 \\notin A\$/);
});

test("E2: set-builder sets over Z and R: the element and the condition that fails", () => {
  const b = "A = \\{ n \\in \\mathbb{Z} \\mid n^2 < 5 \\}\nB = \\{ n \\in \\mathbb{Z} \\mid n \\ge 0 \\}";
  const md = fill("subsetproof", /^not a subset/, note(b));
  assert.match(md, /\$-1 \\in A\$ since \$-4 < 0\$/);
  assert.match(md, /\$-1 \\notin B\$ since \$1 \\le 0\$ is false/);
  assert.deepEqual(stars("subsetproof", b), ["not a subset: an element of A outside B"]);
  assert.doesNotMatch(md, /\{\{/);
});

test("E2: truth tables: Exercise 1.20 (equivalent), p ⇒ q vs q ⇒ p (one row), Exercise 1.11 (the cards)", () => {
  assert.equal(truthInfo(note("P = \\neg(p \\lor q)\nQ = \\neg p \\land \\neg q")).kind, "equiv");
  const b = "P = p \\Rightarrow q\nQ = q \\Rightarrow p";
  assert.deepEqual(stars("truthtable", b), ["NOT equivalent: one row where they differ"]);
  assert.match(fill("truthtable", /^NOT equivalent/, note(b)), /for \$p = t, q = f\$, \$P\$ is f but \$Q\$ is t/);
  // 1.11: "even ⇒ blue" fails exactly on a card that is even and red.
  const c = "P = \\text{even} \\Rightarrow \\text{blue}";
  assert.deepEqual(stars("truthtable", c), ["NOT always true: one row where it is false"]);
  assert.match(fill("truthtable", /^NOT always true/, note(c)), /\\text\{blue\} = f, \\text\{even\} = t\$ gives f/);
  assert.equal(truthInfo(note("P = p \\lor \\neg p")).kind, "taut");
});

test("E2: functions as tables (Ex 1.102, 1.108): two inputs with one value, a value never hit", () => {
  const b = "f = \\{(1, 7), (2, 8), (3, 9), (4, 7)\\}\nT = \\{7, 8, 9\\}";
  assert.deepEqual(stars("injective", b), ["NOT injective: two points with the same value"]);
  assert.match(fill("injective", /^NOT injective/, note(b)), /\$f\(1\) = 7 = f\(4\)\$ but \$1 \\neq 4\$/);
  const s = "f = \\{(1, 1), (2, 2), (3, 4)\\}\nT = \\{1, 2, 3, 4\\}\nS = \\{1, 2, 3\\}";
  assert.deepEqual(stars("surjective", s), ["NOT surjective: a value that is never hit"]);
  assert.match(fill("surjective", /^NOT surjective/, note(s)), /\$y = 3 \\in T\$ has no preimage.*3 inputs can never hit all \$\|T\| = 4\$ values/);
});

// ---------- E3 ----------

test("E3: Exercise 1.109: x^2 is not injective (f(-1) = f(1)) and not surjective (never -1)", () => {
  const W = notInjective(F("f(x) = x^2"));
  assert.deepEqual([W.x1, W.x2].map((x) => cas.tex(x)), ["-1", "1"]);
  const S = notSurjective(F("f(x) = x^2"));
  assert.equal(cas.tex(S.y), "-1");
  const md = fill("surjective", /^NOT surjective/, note("f(x) = x^2"));
  assert.match(md, /\$y = -1 \\in \\mathbb\{R\}\$ has no preimage, since \$f\(x\) = -1\$ would require \$x\^2 = -1\$, i\.e\. \$x\^2 \+ 1 = 0\$; but \$x\^2 \+ 1 > 0\$ for every \$x\$/);
  assert.deepEqual(stars("surjective", "f(x) = e^x"), ["NOT surjective: a value that is never hit"]);
  // x^3 - 3x: f(-1) = 2 = f(2).
  const C = notInjective(F("f(x) = x^3 - 3x"));
  assert.ok(cas.equal(cas.subs(cas.parse("x^3 - 3x"), { x: C.x1 }), cas.subs(cas.parse("x^3 - 3x"), { x: C.x2 })));
  assert.equal(notInjective(F("f(x) = 2x + 1")), null);
});

test("E3: Exercise 6.38: x^3 at 0 is a critical point, not an extremum", () => {
  const W = notExtremum(F("f(x) = x^3"));
  assert.equal(cas.tex(W.x0), "0");
  const md = fill("crit", /NOT an extremum/, note("f(x) = x^3"));
  assert.match(md, /f'\(0\) = 0\$, but \$f'\(x\) = 3x\^2 \\ge 0\$/);
  assert.match(md, /strictly increasing \(Proposition 6\.43\)/);
  assert.doesNotMatch(md, /\{\{/);
});

test("E3: Exercise 1.72(i): a/b ≤ (a+1)/(b+1) fails for a > b, with a, b > 0 from the note", () => {
  const b = "P = \\frac{a}{b} \\le \\frac{a + 1}{b + 1}\na > 0\nb > 0";
  const md = fill("inequality", /^NOT true/, note(b));
  assert.match(md, /For \$\(a, b\) = \(2, 1\)\$ the left side is \$2\$ and the right side is \$\\frac\{3\}\{2\}\$, and \$2 > \\frac\{3\}\{2\}\$/);
  assert.deepEqual(offBook(md + fill("setequal", /^NOT equal/, note("A = \\{1, 2, 3\\}\nB = \\{1, 2, 4\\}"))), []);
});
