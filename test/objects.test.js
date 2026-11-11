import { test } from "node:test";
import assert from "node:assert/strict";
import * as c from "../src/cas.js";
import { parseVars, toLatex, toPython, insertFor } from "../src/vars.js";
import { OBJECTS, objectContext, rankObjects, sizedMatrixOptions, findDefinitions } from "../src/objects.js";

const r = String.raw;

test("cas: exact algebra, derivatives, matrices", () => {
  const t = (s) => c.tex(c.parse(s));
  assert.equal(t("x^2 + 3xy"), "x^2 + 3xy");
  assert.equal(t("(x+1)^2"), "x^2 + 2x + 1");
  assert.equal(t("x/(x+y)"), r`\frac{x}{x + y}`);
  assert.equal(t(r`\frac{\sqrt{2}}{2}`), r`\frac{\sqrt{2}}{2}`);
  assert.equal(t(r`\left(x+1\right)^{3}`), "x^3 + 3x^2 + 3x + 1");
  assert.equal(t("|x|"), r`\left|x\right|`);
  assert.equal(t(r`e^{t}\sin t \cos t`), r`e^{t}\cos(t)\sin t`);
  const f = c.parse("x^3 + 2x^2 y - y^2");
  assert.deepEqual(c.hessian(f, ["x", "y"]).map((row) => row.map((e) => c.tex(e))), [["6x + 4y", "4x"], ["4x", "-2"]]);
  const A = [[c.num(2), c.num(1)], [c.num(1), c.num(3)]];
  assert.equal(c.tex(c.mat.det(A)), "5");
  assert.deepEqual(c.mat.inverse(A).map((row) => row.map((e) => c.tex(e))), [[r`\frac{3}{5}`, r`-\frac{1}{5}`], [r`-\frac{1}{5}`, r`\frac{2}{5}`]]);
  assert.throws(() => c.mat.inverse([[c.num(1), c.num(2)], [c.num(2), c.num(4)]]), /determinant is 0/);
  const S = [[c.parse("a"), c.parse("b")], [c.parse("c"), c.parse("d")]];
  assert.equal(c.tex(c.mat.inverse(S)[0][0]), r`\frac{d}{ad - bc}`);
  assert.equal(c.taylorTex(c.parse("e^x"), "x", c.num(0), 3), r`1 + x + \frac{x^{2}}{2} + \frac{x^{3}}{6}`);
  // Every LaTeX output parses back to the same expression.
  for (const s of ["x^3 + 2x^2 y - y^2 + e^{xy}", r`\frac{x}{x+y}`, r`\sin(x)\cos(y)`, r`\sqrt{x^2+y^2}`, r`e^{t}\sin t`, r`\lambda x^2 + \frac{3}{4}`]) {
    const x = c.parse(s);
    assert.ok(c.equal(x, c.parse(c.tex(x))), s);
  }
});

test("vars: more value types and computed variables", () => {
  const doc = "```vars\n" + r`f(x, y) = x^3 + a x y^2 - y
a = 2
p = (1, 2)
A = [[2, 1], [1, 3]]
b = [1, 4]
H = hessian(f)
Hp = hessian(f, p)
G = \nabla f
Gp = grad(f)(p)
Ai = A^{-1}
x0 = A^{-1} b
d = det(A)
fp = f(p)
E = eig([[2, 0], [0, 3]])
S = \{1, 2, 3\}
U = \{x \in \mathbb{R} \mid x > 0\}
I = [0, 1)
c = x + 2y \leq 4
q = \begin{cases} x & \text{if } x \geq 0 \\ -x & \text{otherwise} \end{cases}
bad = inv([[1, 2], [2, 4]])
` + "\n```\n";
  const vars = parseVars(doc);
  const L = (n) => toLatex(vars.get(n));
  assert.deepEqual(vars.get("f").params, ["x", "y"]);
  assert.equal(L("H"), r`\begin{pmatrix} 6x & 4y \\ 4y & 4x \end{pmatrix}`, "a = 2 filled in");
  assert.equal(L("Hp"), r`\begin{pmatrix} 6 & 8 \\ 8 & 4 \end{pmatrix}`);
  assert.equal(vars.get("G").kind, "vector");
  assert.deepEqual(vars.get("Gp").value, ["11", "7"]);
  assert.equal(vars.get("Ai").formula, "A^{-1}");
  assert.deepEqual(vars.get("x0").value, [r`-\frac{1}{5}`, r`\frac{7}{5}`]);
  assert.equal(vars.get("d").value, "5");
  assert.equal(vars.get("fp").value, "7");
  assert.equal(L("E"), "(2, 3)");
  assert.equal(L("p"), "(1, 2)");
  assert.equal(toPython(vars.get("S")), "sp.FiniteSet(1, 2, 3)");
  assert.ok(vars.get("U").builder);
  assert.equal(toPython(vars.get("I")), "sp.Interval(0, 1, False, True)");
  assert.equal(toPython(vars.get("c")), "sp.Le(x + 2*y, 4)");
  assert.equal(toPython(vars.get("q")), "sp.Piecewise((x, sp.Ge(x, 0)), (-x, True))");
  assert.match(vars.get("bad").error, /determinant is 0/);
  assert.equal(toPython(vars.get("bad")), "None");
  assert.equal(insertFor(vars.get("f"), "text"), "$f(x, y) = x^3 + a x y^2 - y$");
  // Old behaviour kept: [a, b] is still a vector, f = ... still a plain expression.
  const old = parseVars("```vars\nv = [1, 2]\ng = x^2 + 3x\nw = (x+1)(x-1)\n```\n");
  assert.equal(old.get("v").kind, "vector");
  assert.equal(old.get("g").kind, "scalar");
  assert.equal(old.get("g").formula, undefined);
  assert.equal(old.get("w").kind, "scalar", "a product of brackets is not a point");
});

test("objects: build from the note's variables, any size, sets", () => {
  const vars = parseVars("```vars\n" + r`f(x, y) = x^2 y + y^3
p = (1, 2)
A = [[2, 1], [1, 3]]
b = [1, 4]
S = \{1, 2, 3\}
T = \{2, 3, 4\}
E = [x + 2y = 3, 4x - y = 1]
` + "\n```\n");
  const ctx = objectContext(vars);
  const opts = (name) => OBJECTS.find((o) => o.name === name).options(ctx);
  const h = opts("hessian");
  assert.equal(h[0].label, "Hessian of f(x, y)");
  assert.equal(h[0].value, r`\begin{pmatrix} 2y & 2x \\ 2x & 6y \end{pmatrix}`);
  assert.equal(h[0].formula, "hessian(f)");
  assert.equal(h[1].value, r`\begin{pmatrix} 4 & 2 \\ 2 & 12 \end{pmatrix}`, "at the point p");
  assert.equal(h.find((o) => o.id === "genn").build({ n: "2" }).value.match(/\\partial\^2/g).length, 4);
  const own = h.find((o) => o.id === "ownp");
  assert.throws(() => own.build({ f: "x^2 y", vars: "", p: "(1, 2, 3)" }), /2 variables \(x, y\), but the point has 3 values/);
  assert.equal(opts("inverse")[0].formula, "inv(A)");
  assert.equal(opts("determinant")[0].value, "5");
  assert.equal(opts("intersection")[0].value, r`\{2, 3\}`);
  assert.equal(opts("augmented").find((o) => o.id === "sys:E").value, r`\left(\begin{array}{cc|c} 1 & 2 & 3 \\ 4 & -1 & 1 \end{array}\right)`);
  // Any size, like \pmatrix: m and n are asked.
  const sized = sizedMatrixOptions("bmatrix");
  assert.equal(sized.find((o) => o.id === "size-zero").build({ m: "2", n: "3" }).value, r`\begin{bmatrix} 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix}`);
  assert.equal(sized.find((o) => o.id === "size-id").build({ n: "2" }).value, r`\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}`);
  // Every object lists its options, and every option without inputs is ready.
  for (const o of OBJECTS) {
    for (const op of o.options(ctx)) assert.ok(op.error || op.ask || op.value || op.lines, `${o.name}: ${op.label}`);
  }
  assert.deepEqual(rankObjects("hess").map((o) => o.name), ["hessian"]);
  assert.equal(rankObjects("nabla")[0].name, "gradient");
  const found = findDefinitions("Let $f(x, y) = x^2 + y$ and $A = " + r`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}` + "$, $x_0 = (1, 1)$.", new Map());
  assert.deepEqual(found.map((d) => d.line), ["f(x, y) = x^2 + y", r`A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`, "x_0 = (1, 1)"]);
});
