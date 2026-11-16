// \limit: the book's own examples and exercises on limits (Section 5.7,
// Section 6.3.1, Example 7.6) come out right, with the book's citations.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as cas from "../src/cas.js";
import { limitOf, parsePointText, parseCases, limitCases, derivativeLimit } from "../src/limit.js";
import { parseVars } from "../src/vars.js";
import { objectContext, OBJECTS } from "../src/objects.js";
import { workFor } from "../src/work.js";

const r = String.raw;
const run = (src, pt, name = "f") => {
  const x = cas.parse(src);
  const vars = cas.orderVars(cas.symbols(x));
  const steps = [];
  const res = limitOf({ name, x, vars }, parsePointText(pt, vars.length), steps);
  return { ...res, w: res.w && cas.tex(res.w), md: steps.map((s) => `${s.text || ""} ${s.tex || ""}`).join("\n") };
};

test("Example 5.63 and Exercise 5.64: cancel x − a (Proposition 2.23), δ = ε", () => {
  const a = run(r`\frac{x^2 - 1}{x - 1}`, "1");
  assert.equal(a.kind, "value"); assert.equal(a.w, "2");
  assert.match(a.md, /Proposition 2\.23/); assert.match(a.md, /Example 5\.63/); assert.match(a.md, /\\delta = \\varepsilon/);
  const b = run(r`\frac{x^2 - 4}{x - 2}`, "2");
  assert.equal(b.w, "4");
});

test("Exercise 5.80: no limit at 3 (unbounded), limit 1/2 at 1", () => {
  const at3 = run(r`\frac{x^2 - 3x + 2}{x^2 - 4x + 3}`, "3", "g");
  assert.equal(at3.kind, "none"); assert.match(at3.md, /does not exist/); assert.match(at3.md, /\\varepsilon = 1/);
  const at1 = run(r`\frac{x^2 - 3x + 2}{x^2 - 4x + 3}`, "1", "g");
  assert.equal(at1.kind, "value"); assert.equal(at1.w, r`\frac{1}{2}`);
  assert.equal(run(r`\frac{x^3 - 3x + 2}{(x - 1)^2}`, "1").w, "3");
});

test("continuous functions: the limit is the value (Definition 5.65, Remark 5.77, Proposition 6.22)", () => {
  const a = run(r`x^2 + \sin(x) + e^{x}`, "0");
  assert.equal(a.w, "1"); assert.match(a.md, /Definition 5\.65/); assert.match(a.md, /Proposition 6\.22/);
  const b = run(r`x^2 + y^2`, "(1, 2)");
  assert.equal(b.w, "5"); assert.match(b.md, /Lemma 5\.72/);
});

test("the jump function (5.19): no limit at 0 (hint to Exercise 5.64, ε = 1/4)", () => {
  const steps = [];
  const res = limitCases("f", "x", parseCases([["0", r`\text{if } x > 0`], ["1", r`\text{if } x \le 0`]], "x"), parsePointText("0"), steps);
  assert.equal(res.kind, "none");
  assert.match(steps.map((s) => s.text).join(" "), /\\varepsilon = \\frac\{1\}\{4\}/);
  const same = limitCases("f", "x", parseCases([["x^2", r`\text{if } x > 1`], ["2x - 1", r`\text{if } x \le 1`]], "x"), parsePointText("1"), []);
  assert.equal(same.kind, "value"); assert.equal(cas.tex(same.w), "1");
});

test("two variables: different values on lines -> no limit; degree argument -> 0", () => {
  assert.equal(run(r`\frac{x y}{x^2 + y^2}`, "(0, 0)").kind, "none");
  const z = run(r`\frac{x y^2}{x^2 + y^2}`, "(0, 0)");
  assert.equal(z.kind, "value"); assert.equal(z.w, "0"); assert.match(z.md, /\\min\\left\(1/);
  // Lines and curves agree but nothing proves it: say so, never claim it.
  const u = run(r`\frac{x^2 y}{x^4 + y^2}`, "(0, 0)");
  assert.equal(u.kind, "unknown"); assert.match(u.md, /does \*\*not\*\* prove/);
});

test("x → ∞: divide by the power of the denominator (hint to Exercise 5.31)", () => {
  assert.equal(run(r`\frac{3x^2 + 1}{2x^2 - x}`, r`\infty`).w, r`\frac{3}{2}`);
  assert.equal(run(r`\frac{x}{x^2 + 1}`, r`-\infty`).w, "0");
  assert.equal(run(r`\frac{x^3}{x + 1}`, r`\infty`).kind, "none");
});

test("limits the book's methods do not decide are never guessed", () => {
  const s = run(r`\frac{\sin(x)}{x}`, "0");
  assert.equal(s.kind, "unknown"); assert.match(s.md, /a check, not a proof/);
});

test("derivative as a limit of slopes ((6.4), (7.4)) and Example 7.6", () => {
  const st = [];
  const d = derivativeLimit({ name: "f", x: cas.parse("x^3"), vars: ["x"] }, [cas.num(1)], st);
  assert.equal(cas.tex(d.w), "3");
  const e = derivativeLimit({ name: "f", x: cas.parse("x_1 x_2^2 + x_1"), vars: ["x_1", "x_2"] }, [cas.sym("x_1"), cas.sym("x_2")], [], "x_2");
  assert.equal(cas.tex(e.w), "2x_{1}x_{2}");
  const q = derivativeLimit({ name: "f", x: cas.parse(r`\frac{1}{x}`), vars: ["x"] }, [cas.num(2)], []);
  assert.equal(cas.tex(q.w), r`-\frac{1}{4}`);
});

test("\\limit in the popup: note functions, the jump case and the worked solution", () => {
  const note = "```vars\n" + r`g(x) = \frac{x^2 - 3x + 2}{x^2 - 4x + 3}
r(x,y) = \frac{x y}{x^2 + y^2}
J = \begin{cases} 0 & \text{if } x > 0 \\ 1 & \text{if } x \le 0 \end{cases}` + "\n```\n";
  const ctx = objectContext(parseVars(note));
  const obj = OBJECTS.find((o) => o.name === "limit");
  const opts = obj.options(ctx);
  const ids = opts.map((o) => o.id);
  for (const id of ["lf:g", "lf:r", "dq:g", "dp:r:x", "lc:J", "own"]) assert.ok(ids.includes(id), ids.join());
  const lf = opts.find((o) => o.id === "lf:g");
  assert.equal(lf.build({ a: "1" }).value, r`\lim_{x \to 1} g(x) = \frac{1}{2}`);
  assert.equal(opts.find((o) => o.id === "lc:J").build({ a: "0" }).value, r`\lim_{x \to 0} J(x) \text{ does not exist}`);
  assert.equal(opts.find((o) => o.id === "own").build({ f: r`\frac{x^2-1}{x-1}`, p: "1" }).value, r`\lim_{x \to 1} \frac{x^2 - 1}{x - 1} = 2`);
  const md = workFor("limit", "lf:g", ctx, { a: "3" });
  assert.match(md, /Worked solution: the limit of \$g\$/);
  assert.match(md, /Exercise 5\.80/);
});
