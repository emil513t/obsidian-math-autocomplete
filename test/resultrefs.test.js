// Cite from the result: the references follow the computed verdict.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVars } from "../src/vars.js";
import { resultRefs, dropRefs, notApplied, pyItems } from "../src/resultrefs.js";
import { explainItems } from "../src/explain.js";
import REFS1 from "../src/refs/imo26.json" with { type: "json" };
import REFS2 from "../src/refs/imo26-extra.json" with { type: "json" };

const REFS = [...REFS1, ...REFS2];
const note = (body) => parseVars("```vars\n" + body + "\n```\n");
const labels = (items) => items.map((i) => i.label);
const POSDEF = { name: "posdef", desc: "(semi)definiteness of a symmetric matrix (Ch3/8)" };
const pyLabels = (t, vars, route = { label: "numbers" }) => labels(pyItems(t, route, [{ input: "A", var: "A" }], {}, vars, REFS));

test("\\posdef python: positive definite cites Prop 3.43, not Def 8.9", () => {
  const got = pyLabels(POSDEF, note("A = [[2, 1], [1, 3]]"));
  assert.ok(got.includes("Proposition 3.43"));
  assert.ok(got.includes("Section 3.7.1"));
  assert.ok(!got.includes("Definition 8.9"));
});

test("\\posdef python: indefinite cites Def 8.9 + Prop 8.11, not Prop 3.43", () => {
  const got = pyLabels(POSDEF, note("A = [[1, 2], [2, 1]]"));
  assert.ok(got.includes("Definition 8.9"));
  assert.ok(got.includes("Proposition 8.11"));
  assert.ok(!got.includes("Proposition 3.43"));
});

test("\\posdef with a parameter, or a typed-in matrix: keeps the general list", () => {
  assert.deepEqual(resultRefs("posdef", note("A = [[2, 1], [1, a]]")), { add: "", drop: "" });
  const typed = pyItems(POSDEF, { label: "numbers" }, [{ input: "A", var: "A", typed: true }], { A: "[[1,2],[2,1]]" }, note("A = [[2, 1], [1, 3]]"), REFS);
  assert.ok(labels(typed).includes("Definition 8.9") && labels(typed).includes("Proposition 3.43"));
});

test("\\matinv: a singular matrix drops the 2x2 formula and Gauss references", () => {
  assert.match(resultRefs("matinv", note("A = [[1, 2], [2, 4]]")).drop, /Ex 3\.26/);
  assert.equal(resultRefs("matinv", note("A = [[1, 2], [3, 4]]")).drop, "");
});

test("\\lagrange on a line: Thm 8.25, 6.13, Def 5.1 in; Thm 5.84 (only 'does not apply') out", () => {
  const r = resultRefs("lagrange", note("f = (x-1)^2 + (y-1)^2\ng = y - x - 1"));
  assert.match(r.add, /Thm 8\.25 Thm 6\.13/);
  assert.match(r.add, /Def 5\.1/);
  assert.equal(r.drop, "Thm 5.84");
  const text = "The set is a line, so Theorem 5.84 does not apply. By Theorem 6.13 ...";
  assert.equal(notApplied(text), "Theorem 5.84");
  const items = dropRefs(explainItems(["Thm 7.39", text, r.add], REFS), [r.drop, notApplied(text)].join(" "));
  assert.deepEqual(labels(items).filter((l) => /5\.84|6\.13|8\.25|5\.1$/.test(l)), ["Theorem 6.13", "Theorem 8.25", "Definition 5.1"]);
  // Not a squared distance: no Def 5.1.
  assert.doesNotMatch(resultRefs("lagrange", note("f = x^2 + 2y^2\ng = x + y - 1")).add, /Def 5\.1/);
});
