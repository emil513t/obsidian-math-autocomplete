// Possible endings (src/outcomes.md) and which one the note's values give.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars } from "../src/vars.js";
import { parseTemplates } from "../src/templates.js";
import { parseOutcomes, outcomeOf } from "../src/outcomes.js";
import { citations } from "../src/explain.js";
import { offBook } from "../src/curriculum.js";
import INDEX from "../src/exercise-index.json" with { type: "json" };
import REFS1 from "../src/refs/imo26.json" with { type: "json" };
import REFS2 from "../src/refs/imo26-extra.json" with { type: "json" };

const REFS = [...REFS1, ...REFS2];
const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const OUT = parseOutcomes(src("outcomes.md"));
const T = parseTemplates(src("imo26-templates.md"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const keys = (cmd, b) => (outcomeOf(cmd, note(b)) || []).map((o) => o.key);

test("every IMO26 command has its endings; every route named exists; references and words are the book's", () => {
  const missing = T.map((t) => t.name).filter((n) => !["explain", "chatbot"].includes(n) && !OUT.has(n));
  assert.deepEqual(missing, []);
  const bad = [];
  for (const [cmd, ends] of OUT) {
    const t = T.find((x) => x.name === cmd);
    assert.ok(t, `\\${cmd} is not a command`);
    for (const e of ends) if (e.route && !t.variants.some((v) => v.label.startsWith(e.route))) bad.push(`${cmd}: ${e.route}`);
  }
  assert.deepEqual(bad, []);
  const all = [...OUT.values()].flat().map((e) => `${e.name} ${e.see} ${e.conclude}`).join("\n");
  const known = new Set(REFS.map((r) => `${r.kind}:${r.num}`));
  const exs = new Set(INDEX.map((e) => e.id));
  assert.deepEqual(citations(all).filter((c) => (c.kind === "exercise" ? !exs.has(c.num) : !known.has(`${c.kind}:${c.num}`))).map((c) => c.label), []);
  assert.deepEqual(offBook(all), []);
});

test("matrices: every definiteness, invertible / not / parameter, commuting", () => {
  assert.deepEqual(keys("posdef", "A = [[2, 1], [1, 3]]"), ["pd"]);
  assert.deepEqual(keys("posdef", "A = [[1, 1], [1, 1]]"), ["psd"]);
  assert.deepEqual(keys("posdef", "A = [[-2, 0], [0, -1]]"), ["nd"]);
  assert.deepEqual(keys("posdef", "A = [[1, 2], [2, 1]]"), ["ind"]);
  assert.deepEqual(keys("posdef", "A = [[1, a], [a, 4]]"), ["param"]);
  assert.deepEqual(keys("posdef", "A = [[1, 2], [0, 1]]"), ["notsym"]);
  assert.deepEqual(keys("matinv", "A = [[1, 2], [2, 4]]"), ["sing"]);
  assert.deepEqual(keys("matinv", "A = [[1, 2], [3, 4]]"), ["inv"]);
  assert.deepEqual(keys("matinv", "A = [[1, 2, 3], [4, 5, 6]]"), ["notsq"]);
  assert.deepEqual(keys("matmul", "A = [[1, 2], [3, 4]]\nB = [[0, 1], [1, 0]]"), ["ok", "noncomm"]);
  assert.deepEqual(keys("matmul", "A = [[1, 2, 3]]\nB = [[1, 2]]"), ["undef"]);
});

test("one variable: critical points, roots, convexity, increasing, injective, surjective, continuous", () => {
  assert.deepEqual(keys("crit", "f(x) = x^3 - 3x"), ["max", "min"]);
  assert.deepEqual(keys("crit", "f(x) = x^3"), ["notext"]);
  assert.deepEqual(keys("crit", "f(x) = x^3 + x"), ["none"]);
  assert.deepEqual(keys("roots", "f(x) = x^2 - 3x + 2"), ["rational", "two"]);
  assert.deepEqual(keys("roots", "f(x) = x^2 + 1"), ["none"]);
  assert.deepEqual(keys("roots", "f(x) = x^2 - 2x + 1"), ["rational", "double"]);
  assert.deepEqual(keys("roots", "f(x) = x^3 - 2"), ["odd"]);
  assert.deepEqual(keys("roots", "f(x) = x^4 - 5x^2 + 4"), ["rational", "quartic"]);
  assert.deepEqual(keys("convexfn", "f(x) = x^2 + 1"), ["strict"]);
  assert.deepEqual(keys("convexfn", "f(x) = 3x + 1"), ["linear"]);
  assert.deepEqual(keys("convexfn", "f(x) = x^3"), ["region"]);
  assert.deepEqual(keys("strictconvex", "f(x) = x^4"), ["flat"]);
  assert.deepEqual(keys("strictconvex", "f(x) = -x^2"), ["notconvex"]);
  assert.deepEqual(keys("convexfn", "f(x, y) = x^2 + y^2"), ["strict"]);
  assert.deepEqual(keys("convexfn", "f(x, y) = x^2 - y^2"), ["notconvex"]);
  assert.deepEqual(keys("increasing", "f(x) = x^3"), ["strict"]);
  assert.deepEqual(keys("increasing", "f(x) = x^2"), ["neither"]);
  assert.deepEqual(keys("increasing", "f(x) = -x"), ["dec"]);
  assert.deepEqual(keys("injective", "f(x) = x^3 + x"), ["inj"]);
  assert.deepEqual(keys("injective", "f(x) = x^2"), ["notinj"]);
  assert.deepEqual(keys("surjective", "f(x) = x^3"), ["surj"]);
  assert.deepEqual(keys("surjective", "f(x) = x^2"), ["notsurj"]);
  assert.deepEqual(keys("continuous", "f(x) = x^2 + 1"), ["cont"]);
  assert.deepEqual(keys("continuous", "f(x) = \\frac{1}{x - 1}"), ["quot"]);
});

test("several variables, limits, sets, optimization, separation, vectors", () => {
  assert.deepEqual(keys("critxy", "f(x, y) = x^2 - y^2"), ["saddle"]);
  assert.deepEqual(keys("critxy", "f(x, y) = x^2 + y^2"), ["min"]);
  assert.deepEqual(keys("hessian", "f(x, y) = -x^2 - y^2"), ["nd"]);
  assert.deepEqual(keys("limit", "f(x) = x^2\na = 1"), ["cont"]);
  assert.deepEqual(keys("limit", "f(x) = \\frac{x^2 - 1}{x - 1}\na = 1"), ["cancel"]);
  assert.deepEqual(keys("limit", "f(x) = \\frac{1}{x}\na = 0"), ["none"]);
  assert.deepEqual(keys("compact", "S = \\{(x, y) \\mid x^2 + y^2 \\le 1\\}"), ["compact"]);
  assert.deepEqual(keys("compact", "S = \\{(x, y) \\mid 0 \\le x \\le 1\\}"), ["unbounded"]);
  assert.deepEqual(keys("closedset", "I = [0, 1)"), ["neither"]);
  assert.deepEqual(keys("openset", "U = \\{(x, y) \\mid x + y < 1\\}"), ["open"]);
  assert.deepEqual(keys("evt", "S = \\{x \\mid 0 < x < 1\\}"), ["fail"]);
  assert.deepEqual(keys("lagrange", "f = (x-1)^2 + (y-1)^2\ng = y - x - 1"), ["line", "distance"]);
  assert.deepEqual(keys("lagrange", "f(x, y) = x + y\ng(x, y) = x^2 + y^2 - 1"), ["compact"]);
  assert.deepEqual(keys("kkt", "f(x, y) = x^2 + y^2\ng1(x, y) = x - 1"), ["inner"]);
  assert.deepEqual(keys("kkt", "f(x, y) = x^2 + y^2\ng1(x, y) = 1 - x - y"), ["active"]);
  assert.deepEqual(keys("svm", "X = [[0, 0], [1, 1], [0, 1], [1, 0]]\nl = (1, 1, -1, -1)"), ["notsep"]);
  assert.deepEqual(keys("orthogonal", "u = (1, 2)\nv = (-2, 1)"), ["orth"]);
  assert.deepEqual(keys("orthogonal", "u = (1, 2)\nv = (2, 4)"), ["parallel"]);
});

// Every key the detector can report is an ending listed for that command.
test("audit: detected endings are always listed endings", () => {
  const notes = [
    "f(x) = x^3 - 3x", "f(x) = x^2 + 1", "f(x, y) = x^2 - y^2", "A = [[2, 1], [1, 3]]", "A = [[1, a], [a, 4]]",
    "A = [[1, 2], [2, 4]]\nB = [[0, 1], [1, 0]]", "S = \\{(x, y) \\mid x^2 + y^2 \\le 1\\}", "I = [0, 1)",
    "f(x) = \\frac{1}{x}\na = 0", "f(x, y) = x^2 + y^2\ng1(x, y) = 1 - x - y", "u = (1, 2)\nv = (2, 4)",
    "X = [[2, 1], [3, 2], [-1, -1]]\nl = (1, 1, -1)", "f = (x-1)^2 + (y-1)^2\ng = y - x - 1",
  ];
  for (const b of notes) for (const [cmd, ends] of OUT) {
    for (const o of outcomeOf(cmd, note(b)) || []) assert.ok(ends.some((e) => e.key === o.key), `${cmd} on "${b}": ${o.key}`);
  }
});
