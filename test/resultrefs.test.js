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

import fs from "node:fs";
import { parseTemplates } from "../src/templates.js";
import { parsePySnippets } from "../src/pysnippets.js";
import { citeFromResult } from "../src/resultrefs.js";

const route = (name, re) => parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8")).find((t) => t.name === name).variants.find((v) => re.test(v.label));
const cite = (name, r, vars, text = r.body) => labels(citeFromResult(name, [r.label, text], REFS, vars, {}, text));

test("one variable vs several: Thm 6.61 or Thm 8.23, Cor 6.55 or Thm 8.25", () => {
  const r = route("convexfn", /graph above tangents/);
  const one = cite("convexfn", r, note("f(x) = x^4"));
  assert.ok(one.includes("Theorem 6.61") && !one.includes("Theorem 8.23"));
  const two = cite("convexfn", r, note("f(x, y) = x^2 + y^2"));
  assert.ok(two.includes("Theorem 8.23") && !two.includes("Theorem 6.61"));
  const nc = route("strictconvex", /^NOT convex/);
  const one2 = cite("strictconvex", nc, note("f(x) = x^3"));
  assert.ok(one2.includes("Corollary 6.55") && !one2.includes("Theorem 8.25") && !one2.includes("Proposition 3.43"));
  const two2 = cite("strictconvex", nc, note("f(x, y) = x^2 - y^2"));
  assert.ok(two2.includes("Theorem 8.25") && !two2.includes("Corollary 6.55"));
  // No f in the note: both stay.
  const none = cite("convexfn", r, note("A = [[1, 0], [0, 1]]"));
  assert.ok(none.includes("Theorem 6.61") && none.includes("Theorem 8.23"));
});

test("\\critxy python: Def 8.8 (saddle) only when the Hessian is indefinite", () => {
  const CRIT = { name: "critxy", desc: "critical points and classification" };
  const used = [{ input: "f", var: "f" }];
  const bowl = labels(pyItems(CRIT, { label: "" }, used, {}, note("f(x, y) = x^2 + y^2"), REFS));
  assert.ok(bowl.includes("Theorem 8.12") && !bowl.includes("Definition 8.8"));
  const saddle = labels(pyItems(CRIT, { label: "" }, used, {}, note("f(x, y) = x^2 - y^2"), REFS));
  assert.ok(saddle.includes("Definition 8.8") && saddle.includes("Proposition 8.11"));
  // The text route about saddle points keeps Def 8.8 even for a bowl.
  const r = route("critxy", /^saddle point/);
  assert.ok(labels(citeFromResult("critxy", [r.label, r.body], REFS, note("f(x, y) = x^2 + y^2"), {}, r.body, r.label)).includes("Definition 8.8"));
});

test("\\continuous of a polynomial: no Remark 5.79 / Prop 5.74; \\roots degree 2 adds (2.12)", () => {
  const r = route("continuous", /^polynomials/);
  const poly = cite("continuous", r, note("f(x, y) = x^2 y + 3"));
  assert.ok(poly.includes("Remark 5.77") && !poly.includes("Remark 5.79") && !poly.includes("Proposition 5.74"));
  const sin = cite("continuous", r, note("f(x) = \\sin(x) + x"));
  assert.ok(sin.includes("Remark 5.79"));
  assert.match(resultRefs("roots", note("f(x) = x^2 - 3x + 2")).add, /Sec 2\.4\.2/);
  assert.match(resultRefs("roots", note("f(x) = x^3 - 2")).add, /Thm 2\.28/);
});

test("\\linsolve: Def 3.24 only for an invertible square A", () => {
  assert.equal(resultRefs("linsolve", note("A = [[1, 2], [3, 4]]")).drop, "");
  assert.equal(resultRefs("linsolve", note("A = [[1, 2], [2, 4]]")).drop, "Def 3.24");
  assert.equal(resultRefs("linsolve", note("A = [[1, 2, 3], [4, 5, 6]]")).drop, "Def 3.24");
});

// Whole curriculum: every text route and python route, with several kinds of
// notes, never throws and never cites something outside the general list
// plus the result's additions.
test("audit: every command and route cites from the result without errors", () => {
  const notes = [
    "", "f(x) = x^2 - 3x + 2", "f(x, y) = x^2 - y^2", "f(x, y) = (x-1)^2 + (y-1)^2\ng = y - x - 1",
    "A = [[2, 1], [1, 3]]", "A = [[1, 2], [2, 4]]", "A = [[1, a], [a, 4]]\na > 0", "f(x) = \\sin(x)\np = (0)",
  ].map(note);
  const T = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
  const S = parsePySnippets(fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8"));
  const ADDS = new Set(labels(explainItems(["Sec 3.7.1 Prop 8.11 Def 8.9 Def 8.8 Thm 8.25 Thm 6.13 Sec 8.7 Def 5.1 Sec 2.4.2 Thm 2.28"], REFS)));
  let n = 0;
  for (const vars of notes) {
    for (const t of T) for (const v of t.variants) {
      const general = new Set(labels(explainItems([t.desc, v.label, v.body], REFS)));
      for (const l of labels(citeFromResult(t.name, [t.desc, v.label, v.body], REFS, vars, {}, v.body))) {
        assert.ok(general.has(l) || ADDS.has(l), `${t.name} / ${v.label}: ${l}`);
      }
      n++;
    }
    for (const s of S) for (const v of s.all) {
      pyItems(s, v, [], {}, vars, REFS);
      n++;
    }
  }
  assert.ok(n > 1000);
});
