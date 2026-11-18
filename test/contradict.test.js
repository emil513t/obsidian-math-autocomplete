// E4 (inequalities that contradict each other) and E1 (negation) of
// docs/imo26-coverage/CONTRADICTIONS.md, with the book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as cas from "../src/cas.js";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";
import { workFor } from "../src/work.js";
import { contradiction, contradictionProof, separationContradiction } from "../src/ineqproof.js";
import { negate, DEFINITIONS, DEFAULT_NAMES } from "../src/negate.js";

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
const N = (a) => a.map((v) => cas.num(v));

// ---------- E4 ----------

test("E4: the multipliers add up to a false number inequality, with the fewest inequalities", () => {
  const C = contradiction(["x + y \\le 1", "x \\ge 1", "y > 0", "x \\le 7"]);
  assert.ok(C);
  assert.deepEqual(C.used.map((u) => [u.name, u.k]), [["(1)", 1], ["(2)", 1], ["(3)", 1]]); // (4) is not needed
  assert.equal(C.sumTex, "0 < 0");
  assert.equal(contradiction(["x + y \\le 1", "x \\ge 0", "y \\ge 0"]), null);
  // Exercise 9.10 hint: a + b >= 2, 2a + b <= 1 imply a <= -1, so adding a > -1 is impossible.
  const H = contradiction(["a + b \\ge 2", "2a + b \\le 1", "a > -1"]);
  assert.ok(H);
  assert.match(contradictionProof(H), /Fourier–Motzkin elimination \(Section 4\.5\)/);
  // An equation may be used with a negative number.
  const E = contradiction(["x + y = 3", "x \\le 1", "y \\le 1"]);
  assert.deepEqual(E.used.map((u) => u.k), [-1, 1, 1]);
  assert.match(contradictionProof(E), /an equation may be multiplied by any number/);
});

test("E4: Exercise 5.9 (XOR) and Exercise 4.42: no separating line, by adding inequalities", () => {
  const xor = separationContradiction([[-1, 1], [1, -1], [-1, -1], [1, 1]].map(N), N([1, 1, -1, -1]));
  assert.deepEqual(xor.used.map((u) => u.k), [1, 1, 1, 1]);
  assert.equal(xor.sumTex, "0 > 0");
  // (3, 2) between (3, 1) and (3, 5): 4·(1) + 3·(2) + (3), i.e. (3,2) = 3/4 (3,1) + 1/4 (3,5).
  const p = separationContradiction([[3, 2], [3, 1], [3, 5]].map(N), N([1, -1, -1]));
  assert.deepEqual(p.used.map((u) => u.k), [4, 3, 1]);
  assert.equal(separationContradiction([[0, 0], [1, 1]].map(N), N([1, -1])), null);
  // Exercise 5.10, d = 1: v = 1 with label 1 and v = 1 with label -1.
  assert.ok(separationContradiction([[1], [1]].map(N), N([1, -1])));
});

test("E4: the \\fm, \\svm and \\kkt routes fill from the note and get the ★", () => {
  const sys = "c1 = x + y \\le 1\nc2 = x \\ge 1\nc3 = y > 0";
  const fm = fill("fm", /^show a system has no solution/, note(sys));
  assert.match(fm, /Eliminating \$x, y\$|Eliminating \$y, x\$/);
  assert.match(fm, /ends in \$0 < 0\$/);
  assert.match(fm, /adding \$c1\$, \$c2\$ \(as \$-x \\le -1\$\) and \$c3\$ \(as \$-y < 0\$\) gives \$0 < 0\$/);
  assert.deepEqual(stars("fm", sys), ["show a system has no solution"]);
  assert.deepEqual(stars("fm", "c1 = x + y \\le 1\nc2 = x \\ge 0"), ["eliminate one variable"]);
  const svm = fill("svm", /^NOT separable/, note("X = [[-1, 1], [1, -1], [-1, -1], [1, 1]]\nl = (1, 1, -1, -1)"));
  assert.match(svm, /\(1\)\\ -\\alpha_1 \+ \\alpha_2 \+ \\beta > 0/);
  assert.match(svm, /adding \(1\), \(2\), \(3\) and \(4\) gives \$0 > 0\$/);
  assert.doesNotMatch(svm, /\{\{/);
});

test("E4: the \\fouriermotzkin worked solution ends with the short proof", () => {
  const vars = note("c1 = x + y \\le 1\nc2 = x \\ge 1\nc3 = y > 0");
  const ctx = { vars, fns: [], vecs: [] };
  const md = workFor("fouriermotzkin", "fmall:y", ctx);
  assert.match(md, /no solution/);
  assert.match(md, /Short proof without the elimination/);
  assert.match(md, /\\text\{sum\}:&\\quad 0 < 0/);
});

// ---------- E1 ----------

test("E1: Remark 5.34 and the jump function in Section 5.7 come out word for word", () => {
  assert.equal(negate("\\exists R \\in \\mathbb{R}\\ \\forall v \\in S : |v| < R").tex, "\\forall R \\in \\mathbb{R}\\ \\exists v \\in S : |v| \\ge R");
  assert.equal(negate("\\forall \\varepsilon > 0\\ \\exists \\delta > 0\\ \\forall u \\in S : d(u, 0) < \\delta \\Rightarrow d(f(u), 1) < \\varepsilon").tex,
    "\\exists \\varepsilon > 0\\ \\forall \\delta > 0\\ \\exists u \\in S : d(u, 0) < \\delta \\land d(f(u), 1) \\ge \\varepsilon");
});

test("E1: Exercise 1.12, Exercise 1.20, chains, unicode and definitions", () => {
  assert.equal(negate("\\text{crime} \\Rightarrow \\neg \\text{alone}").tex, "\\text{crime} \\land \\text{alone}");
  assert.equal(negate("\\neg(x_1 \\lor x_2)").tex, "x_1 \\lor x_2");
  assert.equal(negate("x_1 \\land x_2").tex, "\\neg x_1 \\lor \\neg x_2");
  assert.equal(negate("p ⇔ q").tex, "(p \\land \\neg q) \\lor (q \\land \\neg p)");
  assert.equal(negate("∀x ∈ S, x^2 ≥ 0").tex, "\\exists x \\in S : x^2 < 0");
  assert.equal(negate("\\forall x \\in S : 0 \\le x \\le 1").tex, "\\exists x \\in S : x < 0 \\lor x > 1");
  const def = Object.fromEntries(DEFINITIONS.map((d) => [d.key, negate(d.s(DEFAULT_NAMES)).tex]));
  assert.equal(def.injective, "\\exists x, y \\in S : f(x) = f(y) \\land x \\neq y");
  assert.equal(def.surjective, "\\exists y \\in T\\ \\forall x \\in S : f(x) \\neq y");
  assert.equal(def.open, "\\exists v \\in U\\ \\forall \\varepsilon > 0 : B(v, \\varepsilon) \\not\\subseteq U");
  assert.equal(def.increasing, "\\exists x, y \\in S : x < y \\land f(x) \\ge f(y)");
});

test("E1: \\negate routes, \\contradiction and \\contrapositive blanks fill from the note's statement", () => {
  const vars = note("P = \\exists R \\in \\mathbb{R}\\ \\forall v \\in S : |v| < R");
  const steps = fill("negate", /^step by step/, vars);
  assert.match(steps, /\\equiv \\forall R \\in \\mathbb\{R\}\\ \\exists v \\in S : \|v\| \\ge R/);
  assert.match(steps, /So the negation is \$\\forall R/);
  assert.match(fill("negate", /^proof by contradiction/, vars), /i\.e\. \$\\forall R \\in \\mathbb\{R\}\\ \\exists v \\in S : \|v\| \\ge R\$/);
  const gen = parseTemplates(src("default-templates.md"));
  const body = gen.find((t) => t.name === "contradiction").body;
  const r = resolveAny("the claim is false", vars, { body, command: "contradiction" });
  assert.match(r.value, /^\$\\neg P\$, i\.e\. \$\\forall R/);
  const cp = gen.find((t) => t.name === "contrapositive").body;
  const imp = note("P = \\forall x \\in \\mathbb{R} : x^2 = 1 \\Rightarrow x \\le 1");
  assert.equal(resolveAny("not B", imp, { body: cp, command: "contrapositive" }).value, "$x > 1$");
  assert.equal(resolveAny("not A", imp, { body: cp, command: "contrapositive" }).value, "$x^2 \\neq 1$");
});

test("E1: the \\negate worked solution cites the book's rules, no off-book words", () => {
  const vars = note("P = \\forall x \\in S : x > 0 \\Rightarrow x^2 > 0");
  const md = workFor("negate", "ng:P", { vars, fns: [], vecs: [] });
  assert.match(md, /\(1\.3\), Section 1\.3\.4/);
  assert.match(md, /Exercise 1\.20/);
  assert.match(md, /\\exists x \\in S : x > 0 \\land x\^2 \\le 0/);
  const bnd = workFor("negate", "nd:bounded", { vars: note("S = \\{ 1, 2 \\}"), fns: [], vecs: [] });
  assert.match(bnd, /Remark 5\.34/);
  assert.deepEqual(offBook(md + bnd + src("imo26-templates.md").split("## \\setequal")[0]), []);
});
