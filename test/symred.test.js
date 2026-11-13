// Symmetric reduction B^T A B = D (Section 8.6, Theorem 8.31): the JS version
// (math worked solutions) and the Python version (\posdef route, evidence
// blocks) must give the same D, the check must hold, and zeros on the
// diagonal must give the semidefinite cases instead of "undecided".
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as cas from "../src/cas.js";
import { symmetricReduction, definiteness } from "../src/textlink.js";
import { workFor } from "../src/work.js";
import { OBJECTS } from "../src/objects.js";
import { SYMRED, DEFINITENESS } from "../src/pyhelpers.js";

const Mx = (rows) => rows.map((r) => r.map((x) => cas.num(x)));
const CASES = [
  [[[1, 2, 3], [2, 8, 4], [3, 4, 16]], "positive definite"],
  [[[0, 0, 1, 1], [0, 0, 2, 3], [1, 2, 1, 4], [1, 3, 4, 0]], "indefinite"],
  [[[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]], "indefinite"],
  [[[1, 1], [1, 1]], "positive semidefinite"],
  [[[-1, 2], [2, -4]], "negative semidefinite"],
  [[[0, 0], [0, 0]], "positive semidefinite and negative semidefinite"],
  [[[-2, 1], [1, -3]], "negative definite"],
  [[[0, 1], [1, 0]], "indefinite"],
];
const btab = (A, B) => cas.mat.mul(cas.mat.mul(cas.mat.transpose(B), A), B);
const isDiagOf = (X, D) => X.every((r, i) => r.every((x, j) => cas.equal(x, i === j ? D[i] : cas.ZERO)));

test("symmetric reduction: B^T A B = D and the right definiteness, zeros included", () => {
  for (const [rows, want] of CASES) {
    const A = Mx(rows);
    const R = symmetricReduction(A);
    assert.ok(isDiagOf(btab(A, R.B), R.D), `B^T A B = D for ${JSON.stringify(rows)}`);
    assert.equal(definiteness(R.D), want, JSON.stringify(rows));
  }
  // Random symmetric integer matrices, many with zero diagonals.
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % 5) - 2;
  for (let t = 0; t < 300; t++) {
    const n = 2 + (t % 4);
    const A = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) A[i][j] = A[j][i] = i === j && t % 2 ? 0 : rnd();
    const R = symmetricReduction(Mx(A));
    assert.ok(isDiagOf(btab(Mx(A), R.B), R.D), JSON.stringify(A));
    assert.ok(!cas.isZero(cas.mat.det(R.B)), "B invertible");
  }
});

test("math: \\definiteness writes every operation, B, the check and the verdict", () => {
  const ctx = { mats: [{ v: { name: "A" }, M: Mx(CASES[2][0]) }], fns: [], vecs: [], sets: [], vars: new Map() };
  const md = workFor("definiteness", "A:A", ctx);
  assert.match(md, /identity matrix on top/);
  assert.match(md, /\\hline/);
  assert.match(md, /add column \d to column \d \(whole matrix\) and row \d to row \d \(lower half\)/, "adding trick explained");
  assert.match(md, /B\^\\top A B = /);
  assert.match(md, /\*\*indefinite\*\*/);
  const semi = workFor("definiteness", "own", ctx, { A: "[[1, 1], [1, 1]]" });
  assert.match(semi, /\*\*positive semidefinite\*\*/);
  assert.match(semi, /Proposition 3\.43/);
  // Not symmetric: listed with a reason, no worked solution.
  const o = OBJECTS.find((x) => x.name === "definiteness");
  const opts = o.options({ ...ctx, mats: [{ v: { name: "N" }, M: Mx([[1, 2], [3, 4]]) }] });
  assert.match(opts[0].error, /not symmetric/);
  assert.equal(o.options(ctx)[0].value, "\\text{indefinite}");
  assert.equal(workFor("definiteness", "own", ctx, { A: "[[1, 2], [3, 4]]" }), "");
});

const hasSympy = (() => {
  const r = spawnSync("python", ["-I", "-c", "import sympy"], { encoding: "utf8", timeout: 60000 });
  return !r.error && r.status === 0;
})();

test("python symmetric_reduction gives the same D and verdict as the JS one", (t) => {
  if (!hasSympy) return t.skip("python with sympy not available");
  const mats = CASES.map(([rows]) => rows);
  const code = `import sympy as sp\n\n${SYMRED}\n\n${DEFINITENESS}\n\nimport json\nout = []\nfor A in ${JSON.stringify(mats)}:\n    D, B = symmetric_reduction(A, verbose=(len(out) == 2))\n    A = sp.Matrix(A)\n    assert B.T * A * B == sp.diag(*D)\n    out.append([[str(d) for d in D], definiteness(D)])\nprint("JSON" + json.dumps(out))\n`;
  const res = spawnSync("python", ["-I", "-c", code], { encoding: "utf8", timeout: 120000 });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /adding|add \(1\) \* column/);
  const got = JSON.parse(res.stdout.split("JSON")[1]);
  CASES.forEach(([rows, want], k) => {
    const R = symmetricReduction(Mx(rows));
    assert.deepEqual(got[k][0], R.D.map((d) => { const c = cas.constValue(d); return String(c.d) === "1" ? String(c.n) : `${c.n}/${c.d}`; }), JSON.stringify(rows));
    assert.equal(got[k][1], want);
  });
});
