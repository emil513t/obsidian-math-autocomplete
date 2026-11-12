import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars } from "../src/vars.js";
import { resolveLabel, evalSide, substituteTex } from "../src/textlink.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { explainItems, textExplain, TEMPLATE_REFS } from "../src/explain.js";
import { toLatex } from "../src/vars.js";

const r = String.raw;
const REFS = JSON.parse(fs.readFileSync(new URL("../src/refs/imo26.json", import.meta.url), "utf8"));
const TEMPLATES = parseTemplates(fs.readFileSync(new URL("../src/default-templates.md", import.meta.url), "utf8"));

test("induction: statement, base case (checked), P(k), P(k+1) from the vars", () => {
  const vars = parseVars("```vars\n" + r`P(n) = \sum_{k=1}^{n} k = \frac{n(n+1)}{2}
n0 = 1` + "\n```\n");
  assert.equal(vars.get("P").kind, "relation");
  assert.deepEqual(vars.get("P").params, ["n"]);
  assert.equal(resolveLabel("statement", vars).value, r`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`);
  assert.equal(resolveLabel("n0", vars).value, "1");
  assert.equal(resolveLabel("check the base case", vars).value, r`$P(1)$: $\sum_{k=1}^{1} k = \frac{1(1+1)}{2}$, both sides are $1$`);
  // The sum index k is renamed so it doesn't clash with the induction k.
  assert.equal(resolveLabel("P(k+1)", vars).value, r`\sum_{i=1}^{k+1} i = \frac{(k+1)((k+1)+1)}{2}`);
  assert.equal(resolveLabel("P(k)", vars).value, r`\sum_{i=1}^{k} i = \frac{k(k+1)}{2}`);
  assert.equal(evalSide(r`\sum_{k=1}^{4} k^2`) && evalSide(r`\sum_{k=1}^{4} k^2`).terms.size, 1);

  const t = TEMPLATES.find((x) => x.name === "induction");
  const qs = textQuestions(t.body, vars, (v) => toLatex(v), (l) => resolveLabel(l, vars));
  const byKey = Object.fromEntries(qs.map((q) => [q.key, q]));
  assert.ok(byKey.statement.wrap, "the statement sits in prose, so it gets $...$");
  assert.equal(byKey["check the base case"].wrap, false, "already a sentence with math");
  const filled = fillTextAnswers(t.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
  assert.ok(filled.includes(r`Let $P(n)$ be the statement: $\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$.`), filled);
  assert.ok(filled.includes(r`**Base case** ($n = 1$): $P(1)$: $\sum_{k=1}^{1} k = \frac{1(1+1)}{2}$, both sides are $1$, so $P(1)$ holds.`), filled);
  assert.ok(filled.includes(r`that is $\sum_{i=1}^{k+1} i = \frac{(k+1)((k+1)+1)}{2}$:`), filled);
  assert.ok(filled.includes("{{step, using the hypothesis}}"), "the proof itself is left to you");
  // A false statement is caught at the base case.
  const bad = parseVars("```vars\n" + r`P(n) = \sum_{k=1}^{n} k = n^2` + "\nn0 = 2\n```\n");
  assert.match(resolveLabel("check the base case", bad).value, /left side is \$3\$ and the right side is \$4\$ \(they differ!\)/);
  // And the book's induction principle goes in the callout.
  const callout = textExplain(explainItems([t.desc, TEMPLATE_REFS.induction], REFS));
  assert.ok(callout.includes("**Theorem 1.86 (The induction principle).**"));
});

test("text blanks computed from f: Hessian, gradient, partials, derivatives, values", () => {
  const vars = parseVars("```vars\n" + r`f(x, y) = x^2 y + y^3
h(t) = t^3 - 2t
p = (1, 2)
A = [[2, 1], [1, 3]]` + "\n```\n");
  assert.equal(resolveLabel("Hessian", vars).value, r`\begin{pmatrix} 2y & 2x \\ 2x & 6y \end{pmatrix}`);
  assert.equal(resolveLabel("gradient", vars).value, r`\begin{pmatrix} 2xy \\ x^2 + 3y^2 \end{pmatrix}`);
  assert.equal(resolveLabel("f_x", vars).value, "2xy");
  assert.equal(resolveLabel("f_xy", vars).value, "2x");
  assert.equal(resolveLabel("h'", vars).value, "3t^2 - 2");
  assert.equal(resolveLabel("h''", vars).value, "6t");
  assert.equal(resolveLabel("x, y", vars).value, "x, y");
  assert.equal(resolveLabel("f(1, 2)", vars).value, "10");
  assert.equal(resolveLabel("x0", vars).value, "(1, 2)");
  assert.equal(resolveLabel("A", vars).value, r`\begin{pmatrix} 2 & 1 \\ 1 & 3 \end{pmatrix}`);
  assert.equal(resolveLabel("reason", vars), null);
  assert.equal(resolveLabel("f_q", vars), null, "q is not a variable of f");
  assert.equal(substituteTex(r`\frac{n}{2} + n^2`, "n", "k+1"), r`\frac{k+1}{2} + (k+1)^2`);
});

test("Hessian at a point: picked function and point, symmetric reduction, conclusion", async () => {
  const { diagonalOf, definiteness, noteFunctions, notePoints } = await import("../src/textlink.js");
  const cas = await import("../src/cas.js");
  const vars = parseVars("```vars\nf(x, y) = x^3 + y^3 - 3xy\ng(x, y) = x^2 + 3y^2 + 2xy\np = (1, 1)\nq = [0, 0]\n```\n");
  assert.deepEqual(noteFunctions(vars).map((v) => v.name), ["f", "g"]);
  assert.deepEqual(notePoints(vars).map((v) => v.name), ["p", "q"]);
  assert.equal(resolveLabel("Hessian at v0", vars).value, r`\begin{pmatrix} 6 & -3 \\ -3 & 6 \end{pmatrix}`);
  assert.equal(resolveLabel("local minimum / local maximum / saddle point", vars).value, "local minimum");
  // (0, 0): the first pivot is 0, reduction still works (book's row/column trick).
  assert.equal(resolveLabel("diagonal", vars, { point: "q" }).value, r`\begin{pmatrix} -6 & 0 \\ 0 & \frac{3}{2} \end{pmatrix}`);
  assert.equal(resolveLabel("local min / local max / saddle point", vars, { point: "q" }).value, "saddle point");
  assert.equal(resolveLabel("definiteness", vars, { fn: "g" }).value, "positive definite");
  assert.equal(resolveLabel("function name", vars, { fn: "g" }).value, "g");
  assert.match(resolveLabel("Hessian at v0", parseVars("```vars\nf(x, y) = x^3 + y^2\np = (1, 1)\n```\n")).from, /not a critical point/);
  // Semi-definite: no verdict, the blank stays for you.
  const M = (rows) => rows.map((r) => r.map((x) => cas.num(x)));
  assert.equal(definiteness(diagonalOf(M([[1, 2], [2, 4]]))), null);
  assert.equal(definiteness(diagonalOf(M([[0, 1, 0], [1, 0, 0], [0, 0, 1]]))), "indefinite");
});
