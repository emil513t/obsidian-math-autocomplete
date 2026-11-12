import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { parseVars } from "../src/vars.js";
import { resolveLabel } from "../src/textlink.js";
import { evidencePy } from "../src/evidence.js";

const r = String.raw;
const NOTE = "```vars\n" + r`f(x,y) = x^3 - 3x + y^2 + \sin(x y)
p = (1, 0)
q = (1, 0)
g(x,y) = x^2 + x y + y^2
P(n) = \sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}
n0 = 1` + "\n```\n";

const runPy = (code) => {
  const res = spawnSync("python", ["-I", "-c", code], { encoding: "utf8", timeout: 120000 });
  return res.error ? null : res;
};

test("plugging numbers in: 3x with x = 1 is 3, not 31", () => {
  const vars = parseVars(NOTE);
  assert.equal(resolveLabel("f(1, 2)", vars).value, r`2 + \sin 2`);
  assert.match(resolveLabel("check the base case", vars).value, /both sides are \$1\$/);
});

test("evidence: python recomputes the Hessian chain, partials, values and base case", (t) => {
  const vars = parseVars(NOTE);
  const labels = ["Hessian", "Hessian at the point", "diagonal", "definiteness", "local minimum / local maximum / saddle point", "f_x", "f(1, 2)", "check the base case"];
  const code = evidencePy(labels, vars);
  assert.match(code, /H = sp\.hessian\(f, \(x, y\)\)/);
  assert.match(code, /D = symmetric_reduction\(H0\)/);
  assert.equal(evidencePy(["domain", "reason"], vars), "", "prose blanks give no block");
  const res = runPy(code);
  if (!res) return t.skip("python not available");
  assert.equal(res.status, 0, res.stderr);
  const out = res.stdout;
  // Same values as the text.
  assert.match(out, /Hessian at p: Matrix\(\[\[6, 1\], \[1, 2\]\]\)/);
  assert.match(out, /diagonal D \(symmetric reduction\): \[6, 11\/6\]/);
  assert.equal(resolveLabel("definiteness", vars).value, "positive definite");
  assert.match(out, /so H is positive definite/);
  assert.match(out, /p is a local minimum/);
  assert.match(out, /critical point: False/, "p = (1, 0) is not critical for f, and the block says so");
  assert.match(out, /f\(1, 2\) = sin\(2\) \+ 2/);
  assert.match(out, /equal: True/);
});

test("evidence: function picked in the form (g), constant Hessian, no point needed", (t) => {
  const vars = parseVars(NOTE);
  const ctx = { fn: "g" };
  const code = evidencePy(["Hessian", "diagonal", "definiteness"], vars, ctx);
  assert.match(code, /H = sp\.hessian\(g, \(x, y\)\)/);
  assert.doesNotMatch(code, /H\.subs/);
  const res = runPy(code);
  if (!res) return t.skip("python not available");
  assert.equal(res.status, 0, res.stderr);
  assert.equal(resolveLabel("diagonal", vars, ctx).value, r`\begin{pmatrix} 2 & 0 \\ 0 & \frac{3}{2} \end{pmatrix}`);
  assert.match(res.stdout, /\[2, 3\/2\]/);
  assert.match(res.stdout, /positive definite/);
});
