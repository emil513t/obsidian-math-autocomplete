import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVars } from "../src/vars.js";
import { parseGraph, drawScene } from "../src/graph.js";

const r = String.raw;
const vars = parseVars("```vars\n" + [
  "h(x) = x^3 - 2x", "f(x,y) = x^2 + xy + y^2 - 3x", "p = (1, 0)", "u = [1, 2]",
  r`c1 = 2x + y \le 6`, r`c2 = x + 2y \le 6`, r`c3 = x \ge 0`, "D = [[0, 1], [1, 3], [2, 2]]",
].join("\n") + "\n```\n");

// A 2D context that only counts what it is asked to draw.
const fakeCtx = () => {
  const calls = {};
  const count = (name) => () => { calls[name] = (calls[name] || 0) + 1; };
  const ctx = new Proxy({ calls, measureText: (t) => ({ width: t.length * 7 }) }, {
    get: (o, k) => (k in o ? o[k] : count(k)),
    set: (o, k, v) => { o[k] = v; return true; },
  });
  return ctx;
};

test("graph: every kind of line parses into something drawable", () => {
  const src = [
    "h", "y = \\sin(x)", "tangent h at 1", "region c1, c2, c3", "x + y = 4", "x \\ge -1", "contour f: 0, 1",
    "gradient f at p", "p", "(2, 3)", "vector u at p", "line p (2, 2)", "segment (0,0), (1,1)", "D",
    "curve (\\cos t, \\sin t), t: 0..2\\pi", "polygon (0,0), (1,0), (0,1)", "label (1, 2) top", "x: -3..3", "equal",
  ].join("\n");
  const s = parseGraph(src, vars);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(s.win.x, [-3, 3]);
  assert.equal(s.win.equal, true);
  const kinds = new Set(s.items.map((i) => i.t));
  for (const k of ["fn", "region", "implicit", "contour", "arrow", "point", "points", "line", "segment", "param", "polygon", "label"]) assert.ok(kinds.has(k), k);
  const ctx = fakeCtx();
  const w = drawScene(ctx, s, 600, 400);
  assert.ok(ctx.calls.stroke > 50 && ctx.calls.fillRect > 100, JSON.stringify(ctx.calls));
  assert.equal(w.X[1] - w.X[0] > 0, true);
});

test("graph: bad lines are explained, not silently dropped", () => {
  const s = parseGraph("k\ncontour h\nblah blah", vars);
  assert.equal(s.errors.length, 3);
  assert.match(s.errors[0], /isn't one of your variables/);
  assert.match(s.errors[1], /two variables/);
});

test("graph: the window keeps points in view and fits implicit curves", () => {
  const s = parseGraph("x^2 + y^2 = 4\nD", vars);
  const w = drawScene(fakeCtx(), s, 600, 400);
  assert.ok(w.X[0] < -2 && w.X[1] > 2 && w.Y[1] > 3, JSON.stringify(w));
  assert.ok(w.X[1] < 8, "not zoomed out to the whole plane");
});
