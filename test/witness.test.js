// E6 (docs/imo26-coverage/CONTRADICTIONS.md): matrix witnesses decided from
// the note's own matrix. The book exercises are the test cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as cas from "../src/cas.js";
import { parseVars } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { toLatex } from "../src/vars.js";
import { objectContext, OBJECTS } from "../src/objects.js";
import { workFor } from "../src/work.js";
import {
  definitenessWitness, quadValue, zeroSolution, paramConditions, nonCommuting,
  resolveMatrixLabel, resolveAny, routeFit, chooseOption,
} from "../src/witness.js";

const P = (rows) => rows.map((r) => r.map((x) => cas.parse(String(x))));
const tex = (v) => v.map((x) => cas.tex(x)).join(", ");
const note = (A, extra = "") => parseVars("```vars\nA = " + A + "\n" + extra + "```\n");
const TEMPLATES = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
const route = (name, re) => TEMPLATES.find((t) => t.name === name).variants.find((v) => re.test(v.label));

// Fill a route the way the form does (every computed value kept).
function fill(r, vars) {
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}

test("Ex 3.41: A11 < 0 gives u = e1 with u^T A u = A11", () => {
  const W = definitenessWitness(P([[-1, 2], [2, 5]]));
  assert.equal(tex(W.notPD.u), "1, 0");
  assert.equal(cas.tex(W.notPD.value), "-1");
  // Any size: a 3x3 with the negative entry in the middle.
  const W3 = definitenessWitness(P([[4, 1, 0], [1, -2, 1], [0, 1, 3]]));
  assert.equal(tex(W3.notPD.u), "0, 1, 0");
});

test("Ex 3.42 / 8.30: semidefinite and indefinite witnesses, checked as u^T A u", () => {
  for (const [A, d] of [[[[1, 1], [1, 1]], "positive semidefinite"], [[[1, 2], [2, 1]], "indefinite"], [[[0, 1], [1, 0]], "indefinite"],
    [[[2, -1, 0], [-1, 2, -1], [0, -1, 2]], "positive definite"], [[[1, 2, 3], [2, 4, 6], [3, 6, 9]], "positive semidefinite"], [[[-1, 0], [0, -3]], "negative definite"]]) {
    const M = P(A);
    const W = definitenessWitness(M);
    assert.equal(W.d, d, JSON.stringify(A));
    for (const w of [W.notPD, W.notND, W.pos, W.neg, W.zero].filter(Boolean)) {
      assert.ok(w.u.some((x) => !cas.isZero(x)), "u ≠ 0");
      assert.ok(cas.equal(quadValue(M, w.u), w.value), "the value is u^T A u itself");
    }
    if (d === "positive definite") assert.equal(W.notPD, null);
    if (d === "indefinite") assert.ok(cas.constValue(W.pos.value).n > 0 && cas.constValue(W.neg.value).n < 0);
    if (d === "positive semidefinite") assert.ok(cas.isZero(W.notPD.value));
  }
});

test("Ex 3.25 / 8.38(iii): v ≠ 0 with Av = 0 by Gauss elimination, any size", () => {
  for (const A of [[[1, 2], [2, 4]], [[2, 2, 1], [2, 2, 1], [1, 1, 2]], [[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 2, 3], [2, 4, 6]]]) {
    const M = P(A);
    const v = zeroSolution(M);
    assert.ok(v && v.some((x) => !cas.isZero(x)), JSON.stringify(A));
    assert.ok(cas.mat.mul(M, v.map((x) => [x])).every((r) => cas.isZero(r[0])), "Av = 0");
    assert.ok(v.every((x) => cas.constValue(x).d === 1), "whole numbers");
  }
  assert.equal(zeroSolution(P([[1, 1, 1], [1, 2, 1], [1, 1, 3]])), null, "invertible: only v = 0");
});

test("Ex 8.37: parameters give the inequalities on the diagonal of D", () => {
  const C = paramConditions(P([[2, 1, "a"], [1, 1, 1], ["a", 1, "b"]]));
  assert.equal(C.pd, "$-a^2 + 2a + b - 2 > 0$");
  assert.equal(C.psd, "$-a^2 + 2a + b - 2 \\ge 0$");
  assert.equal(C.note, "");
  // A diagonal entry with a parameter that is divided by is named.
  assert.match(paramConditions(P([["a", 1], [1, 1]])).note, /divides by \$a\$/);
  // The \definiteness object and its worked solution take parameters too.
  const ctx = objectContext(note("[[2, 1, a], [1, 1, 1], [a, 1, b]]"));
  const opt = OBJECTS.find((o) => o.name === "definiteness").options(ctx).find((o) => o.id === "A:A");
  assert.match(opt.value ?? opt.build?.({}).value ?? "", /positive definite\} \\iff -a\^2 \+ 2a \+ b - 2 > 0/);
  const md = workFor("definiteness", "A:A", ctx);
  assert.match(md, /\*\*positive definite\*\* exactly when \$-a\^2 \+ 2a \+ b - 2 > 0\$/);
});

test("Ex 3.18: a B with AB ≠ BA (the note's, else the first E_ij); aI has none", () => {
  const N = nonCommuting(P([[1, 2], [3, 4]]));
  assert.ok(N && N.name === null);
  const B = P([[0, 1], [1, 0]]);
  assert.equal(nonCommuting(P([[1, 2], [3, 4]]), [{ name: "B", M: B }]).name, "B");
  assert.equal(nonCommuting(P([[2, 0], [0, 2]])), null);
});

test("\\posdef: the verdict blanks are filled from the note's A (class: all definiteness choices)", () => {
  const sym = route("posdef", /symmetric reduction/);
  const out = fill(sym, note("[[1, 2], [2, 1]]"));
  assert.match(out, /\$A\$ is indefinite, since the diagonal entries of \$D\$ are of both signs/);
  assert.match(out, /D = \\begin\{pmatrix\} 1 & 0 \\\\ 0 & -3 \\end\{pmatrix\}/);
  assert.match(out, /Add \$\(-2\)\$ times column 1 to column 2/);
  assert.match(fill(sym, note("[[1, 1], [1, 1]]")), /is positive semi-definite, since the diagonal entries of \$D\$ are all ≥ 0/);
  assert.match(fill(sym, note("[[2, 1], [1, 3]]")), /is positive definite, since the diagonal entries of \$D\$ are all > 0/);
  // Complete the square (Ex 3.44): 2x^2 + 4xy + 3y^2 = 2(x + y)^2 + y^2.
  const sq = fill(route("posdef", /complete the square/), note("[[2, 2], [2, 3]]"));
  assert.match(sq, /= 2x\^2 \+ 4xy \+ 3y\^2 = 2\\left\(x \+ 1\\,y\\right\)\^2 \+ 1\\,y\^2/);
  assert.match(sq, /so \$A\$ is positive definite\./);
  assert.match(fill(route("posdef", /complete the square/), note("[[1, 2], [2, 1]]")), /is not positive definite \(it is indefinite\)/);
  // The witness routes.
  assert.match(fill(route("posdef", /NOT positive definite/), note("[[-1, 2], [2, 5]]")), /u = \\begin\{pmatrix\} 1 \\\\ 0 \\end\{pmatrix\}\$ gives \$u\^\\top A u = -1 \\le 0/);
  const ind = fill(route("posdef", /^indefinite/), note("[[1, 2], [2, 1]]"));
  assert.match(ind, /u\^\\top A u = 1 > 0/);
  assert.match(ind, /v\^\\top A v = -3 < 0/);
  // Hessian templates keep their own blanks (f's Hessian, not A).
  assert.equal(resolveMatrixLabel("positive definite / negative definite / indefinite", note("[[1, 0], [0, 1]]"), { body: "$\\nabla^2 f(v_0) = {{Hessian at v0}}$" }), undefined);
  assert.equal(chooseOption("positive definite / positive semi-definite / indefinite", "positive semidefinite"), "positive semi-definite");
});

test("\\matinv: not invertible from a zero row, a zero column or Gauss elimination", () => {
  const ni = route("matinv", /NOT invertible/);
  assert.match(fill(ni, note("[[1, 2], [0, 0]]")), /row 2 of \$A\$ is \$0\$\. If \$B\$ were an inverse, then row 2 of \$AB\$ is \$0\$/);
  assert.match(fill(ni, note("[[1, 0], [2, 0]]")), /\$A v = 0\$ for \$v = \\begin\{pmatrix\} 0 \\\\ 1 \\end\{pmatrix\} \\neq 0\$ \(column 2/);
  assert.match(fill(ni, note("[[1, 2, 3], [4, 5, 6], [7, 8, 9]]")), /\(Gauss elimination, Section 2\.3\)\. If \$B\$ were an inverse, then \$v = Iv = \(BA\)v = B\(Av\) = B0 = 0\$, but \$v \\neq 0\$/);
  assert.match(fill(route("matinv", /2x2 formula/), note("[[1, 2], [3, 4]]")), /D = ad - bc = -2 \\neq 0/);
  assert.match(fill(route("matinv", /Gauss elimination on/), note("[[1, 1, 1], [1, 2, 1], [1, 1, 3]]")), /A\^\{-1\} = \\begin\{pmatrix\} \\frac\{5\}\{2\} & -1 & -\\frac\{1\}\{2\}/);
});

test("routes are ordered by the note's matrix: fitting first, with the reason", () => {
  const fits = (name, A) => Object.fromEntries(TEMPLATES.find((t) => t.name === name).variants.map((v) => [v.label.split(" (")[0], routeFit(v, note(A))?.ok]));
  assert.deepEqual(fits("posdef", "[[2, 1], [1, 3]]"), {
    "symmetric reduction to a diagonal matrix": true, "with a parameter: which values give which case": false, "complete the square in u^T A u": true,
    "NOT positive definite: one bad vector": false, "indefinite: one positive and one negative direction": false, "A^T A is positive semi-definite": undefined,
    "not symmetric: decide the symmetric matrix with the same u^T A u": false,
  });
  const ind = fits("posdef", "[[1, 2], [2, 1]]");
  assert.equal(ind["NOT positive definite: one bad vector"], true);
  assert.equal(ind["indefinite: one positive and one negative direction"], true);
  assert.equal(fits("posdef", "[[1, 2, 0], [2, 1, 0], [0, 0, 1]]")["complete the square in u^T A u"], false, "3x3");
  assert.equal(fits("posdef", "[[1, 2], [3, 4]]")["symmetric reduction to a diagonal matrix"], false, "not symmetric");
  const sing = fits("matinv", "[[1, 2], [2, 4]]");
  assert.equal(sing["NOT invertible: zero row/column or AB = 0"], true);
  assert.equal(sing["Gauss elimination on"], false);
  assert.equal(fits("matinv", "[[1, 2], [3, 4]]")["NOT invertible: zero row/column or AB = 0"], false);
  assert.equal(routeFit(route("posdef", /^NOT/), note("[[2, 1], [1, 3]]")).why, "A is positive definite");
  // Exactly one ★ route per matrix.
  const best = (name, A) => TEMPLATES.find((t) => t.name === name).variants.filter((v) => routeFit(v, note(A))?.best).map((v) => v.label.split(" (")[0]);
  assert.deepEqual(best("posdef", "[[2, 1], [1, 3]]"), ["symmetric reduction to a diagonal matrix"]);
  assert.deepEqual(best("posdef", "[[1, 2], [2, 1]]"), ["indefinite: one positive and one negative direction"]);
  assert.deepEqual(best("posdef", "[[1, 1], [1, 1]]"), ["symmetric reduction to a diagonal matrix"]);
  assert.deepEqual(best("matinv", "[[1, 2], [2, 4]]"), ["NOT invertible: zero row/column or AB = 0"]);
  assert.deepEqual(best("matinv", "[[1, 2], [3, 4]]"), ["2x2 formula"]);
  assert.deepEqual(best("matinv", "[[1, 1, 1], [1, 2, 1], [1, 1, 3]]"), ["Gauss elimination on"]);
  // (A+B)^2 with the note's B.
  const mm = route("matmul", /\(A\+B\)/);
  const out = fill(mm, note("[[1, 2], [3, 4]]", "B = [[0, 1], [1, 0]]\n"));
  assert.match(out, /AB = \\begin\{pmatrix\} 2 & 1 \\\\ 4 & 3 \\end\{pmatrix\} \\neq \\begin\{pmatrix\} 3 & 4 \\\\ 1 & 2 \\end\{pmatrix\} = BA/);
});

test("\\definiteness worked solution shows the vectors directly", () => {
  const ctx = objectContext(note("[[1, 2], [2, 1]]", "S = [[1, 1], [1, 1]]\n"));
  const md = workFor("definiteness", "A:A", ctx);
  assert.match(md, /Directly \(Definition 8\.9\)/);
  assert.match(md, /u\^\\top A u = 1 > 0/);
  assert.match(md, /v\^\\top A v = -3 < 0/);
  const semi = workFor("definiteness", "A:S", ctx);
  assert.match(semi, /It is not positive definite: \$u\$ = column 2 of \$B\$ is \$\\neq 0\$ and gives \$u\^\\top S u = 0\$/);
});
