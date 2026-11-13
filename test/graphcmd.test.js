// \graph (\plot, \draw, \region, \contour ...) in the note's text offers
// ready-made graphs from the note's variables; every offered graph must draw
// without errors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVars } from "../src/vars.js";
import { graphQuery, graphOptions, parseGraph } from "../src/graph.js";

const NOTE = "```vars\n" + String.raw`f(x,y) = x^4y^2 + x^2y^4 − 3x^2y^2
g(x) = x^2 - 1
p = (1, 1)
q = (2, 0)
u = [1, 2]
c1 = x + 2y \le 6
c2 = x \ge 0
c3 = y \ge 0
k = x^2 + y^2 = 4` + "\n```\n";

test("graph words trigger, others don't", () => {
  for (const w of ["gr", "graph", "gra", "plot", "draw", "sketch", "region", "contour", "tangent", "gradient", "feasible"]) assert.ok(graphQuery(w), w);
  for (const w of ["frac", "in", "induction", "def"]) assert.equal(graphQuery(w), null, w);
});

test("\\graph offers every kind of graph the note has, all drawable", () => {
  const vars = parseVars(NOTE);
  const opts = graphOptions(vars, graphQuery("graph"));
  const labels = opts.map((o) => o.label);
  for (const want of ["graph of g", "g with its tangent", "3D surface of f", "3D surface of f + tangent plane at p", "level curves of f", "level curves of f + gradient at p", "feasible region of c1, c2, c3", "feasible region + level curves of f", "the curve k", "the points p, q, u", "line through p and q", "vector u", "everything in the note", "empty graph"]) {
    assert.ok(labels.includes(want), `missing "${want}" in ${JSON.stringify(labels)}`);
  }
  for (const o of opts) assert.deepEqual(parseGraph(o.lines.join("\n"), vars).errors, [], o.label);
});

test("\\region / \\tangent narrow the list", () => {
  const vars = parseVars(NOTE);
  assert.ok(graphOptions(vars, graphQuery("region")).every((o) => o.tags.includes("region")));
  assert.deepEqual(graphOptions(vars, graphQuery("tangent")).map((o) => o.label), ["g with its tangent", "3D surface of f + tangent plane at p", "3D surface of f + tangent plane at q", "3D surface of f + tangent plane at u"]);
});

test("an empty note still offers an empty graph", () => {
  assert.deepEqual(graphOptions(new Map(), graphQuery("graph")).map((o) => o.label), ["empty graph"]);
});
