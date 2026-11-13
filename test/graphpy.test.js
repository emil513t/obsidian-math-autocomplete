// Every graph the \graph popup offers, and every kind of graph line, turned
// into Python (Plotly, interactive in Code Suite): the script must be short (only what it draws) and must run.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseVars } from "../src/vars.js";
import { graphQuery, graphOptions } from "../src/graph.js";
import { graphToPython, graphIs3D } from "../src/graphpy.js";

const NOTE = "```vars\n" + String.raw`f(x,y) = x^4y^2 + x^2y^4 − 3x^2y^2
g(x) = x^2 - 1
h(x) = \sin(x) + \frac{1}{2}x
a = 2
k(x) = a x^2
p = (1, 1)
q = (2, 0)
u = [1, 2]
c1 = x + 2y \le 6
c2 = x \ge 0
c3 = y \ge 0
circ = x^2 + y^2 = 4
M = [[0, 0], [1, 2], [2, 1]]
B = [[1, -1/2], [0, 1]]` + "\n```\n";

const EXTRA = [
  "contour f: -1, 0, 1",
  "y = x^3 - x\nx: -2..2\ny: -2..2\nequal",
  "x^2 + y^2 = 1",
  "x + y \\le 1",
  "curve (\\cos t, \\sin t), t: 0..2\\pi",
  "polygon (0,0), (1,0), (0,1)",
  "segment p q\nlabel p start",
  "vector u at p",
  "M",
  "k\ntangent k at 1",
  "h",
  "x^2 - 2",
  "f\nnotavar",
  "surface f\np\ntangent plane f at p",
  "f, g",
  "surface f\nx: -1.5..1.5\ny: -1.5..1.5",
];

const python = (() => {
  for (const exe of ["C:/Users/emill/AppData/Local/Programs/Python/Python312/python.exe", "python"]) {
    const r = spawnSync(exe, ["-I", "-c", "import plotly, numpy"], { encoding: "utf8", timeout: 60000 });
    if (!r.error && r.status === 0) return exe;
  }
  return null;
})();

test("graph python is short: only what the graph uses", () => {
  const vars = parseVars(NOTE);
  const code = graphToPython("g", vars);
  assert.match(code, /g = lambda x: x\*\*2 - 1/);
  for (const unused of ["lambda x, y", "c1", "u =", "M =", "meshgrid", "print(", "matplotlib"]) assert.ok(!code.includes(unused), `${unused} in\n${code}`);
  assert.ok(code.split("\n").length <= 12, code);
  // constants from the vars block are filled in
  assert.match(graphToPython("k", vars), /k = lambda x: 2\*x\*\*2/);
  // a line that can't be drawn becomes a comment, the rest still draws
  assert.match(graphToPython("g\nnotavar", vars), /# can't draw notavar/);
});

test("a function of two variables is a 3D surface; contour stays 2D", () => {
  const vars = parseVars(NOTE);
  for (const src of ["f", "surface f", "f, p", "surface f\np\ntangent plane f at p"]) {
    assert.ok(graphIs3D(src, vars), src);
    assert.match(graphToPython(src, vars), /fig\.add_surface\(/, src);
  }
  assert.ok(!graphIs3D("contour f", vars));
  assert.doesNotMatch(graphToPython("contour f", vars), /add_surface/);
  const tp = graphToPython("surface f\ntangent plane f at p", vars);
  assert.match(tp, /f_x = lambda x, y: 4\*x\*\*3\*y\*\*2/);   // exact partial derivatives
  assert.match(tp, /add_scatter3d/);                            // the point sits on the surface
  // things a 3D graph can't show are listed, not silently dropped
  assert.match(graphToPython("f\nc1", vars), /# not drawn in 3D: c1/);
});

test("every \\graph option and graph line runs in Python", { skip: !python && "no plotly" }, () => {
  const vars = parseVars(NOTE);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graphpy-"));
  const cases = [...graphOptions(vars, graphQuery("graph")).map((o) => [o.label, o.lines.join("\n")]), ...EXTRA.map((s) => [s, s])];
  assert.ok(cases.length > 20);
  const fails = [];
  cases.forEach(([label, src], i) => {
    const png = path.join(dir, `g${i}.html`).replace(/\\/g, "/");
    const code = graphToPython(src, vars).replace("fig.show()", `fig.write_html(${JSON.stringify(png)}, include_plotlyjs="cdn")`);
    const r = spawnSync(python, ["-I", "-c", code], { encoding: "utf8", timeout: 120000 });
    if (r.status !== 0 || !fs.existsSync(png)) fails.push(`${label}\n${code}\n${r.stderr.split("\n").slice(-4).join("\n")}`);
  });
  assert.deepEqual(fails, []);
});
