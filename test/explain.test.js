import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { citations, explainItems, pyExplainLines, textExplain, ascii, pyRefs } from "../src/explain.js";
import { parseVars, toLatex, toPython, insertFor, pythonDefinitions, pyToLatexValue } from "../src/vars.js";
import { parsePySnippets, buildPySnippet } from "../src/pysnippets.js";

const r = String.raw;
const REFS = JSON.parse(fs.readFileSync(new URL("../src/refs/imo26.json", import.meta.url), "utf8"));

test("one variable, defined anywhere, works in math, text and python", () => {
  const doc = [
    "Let $B = " + r`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}` + "$ and $g(x, y) = x^2 + 3xy$.",
    "```python",
    "import sympy as sp",
    "x, y = sp.symbols('x y')",
    "C = sp.Matrix([[1, sp.Rational(1, 2)], [0, 1]])",
    "h = x**2*sp.sin(y)",
    "v = np.array([1, 2, 3])",
    "H = sp.hessian(h, [x, y])",
    "```",
    "```vars",
    "A = [[2, 1], [1, 3]]",
    "x = 3",
    "```",
  ].join("\n");
  const vars = parseVars(doc);
  // From the vars block, the note's math and a python block.
  assert.equal(vars.get("A").source, undefined);
  assert.equal(vars.get("B").source, "math");
  assert.equal(vars.get("C").source, "python");
  assert.equal(toLatex(vars.get("C")), r`\begin{pmatrix} 1 & \frac{1}{2} \\ 0 & 1 \end{pmatrix}`);
  assert.equal(vars.get("h").value, r`x^2\sin y`);
  assert.deepEqual(vars.get("v").value, ["1", "2", "3"]);
  assert.equal(vars.has("H"), false, "computed python (sp.hessian) is not plain data");
  // Each one inserts in all three places.
  for (const n of ["A", "B", "C"]) {
    const v = vars.get(n);
    assert.ok(insertFor(v, "math").startsWith(r`\begin{pmatrix}`), n);
    assert.ok(insertFor(v, "text").startsWith(`$${n} = `), n);
    assert.ok(insertFor(v, "python", { atLineStart: true }).startsWith(`${n} = sp.Matrix(`), n);
  }
  assert.equal(toPython(vars.get("B")), "sp.Matrix([[1, 2], [3, 4]])");
  // A math or python "x = 3" elsewhere never turns g's x into a number; the vars block's x = 3 is a value, not g's variable either.
  assert.deepEqual(parseVars("$g(x, y) = x^2 y$ and later $x = 3$.").get("g").params, ["x", "y"]);
  assert.equal(pyToLatexValue("[[1, 2], [3, 4]]"), r`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`);
  assert.equal(pyToLatexValue("sp.sqrt(2)/2"), r`\frac{\sqrt{2}}{2}`);
  assert.equal(pyToLatexValue("solve(eq, x)"), null);
  assert.equal(pyToLatexValue("'text'"), null);
  assert.deepEqual(pythonDefinitions("```python\nA = sp.Matrix([1, 2])\n    B = 5\n```\n").map((d) => d.line), ["A = [1, 2]"]);
  // The vars block wins over the same name elsewhere.
  assert.equal(parseVars("$A = 5$\n```vars\nA = 7\n```\n").get("A").value, "7");
});

test("explanations: references, python prints, text callout", () => {
  assert.deepEqual(citations("Hessian (Def 8.2), Clairaut, Thm 7.11 and Definition 8.2 again, Ex 7.30-7.34").map((c) => c.label),
    ["Definition 8.2", "Theorem 7.11", "Exercise 7.30"]);
  const items = explainItems(["Hessian matrix (Def 8.2)", "at a point"], REFS);
  assert.equal(items[0].title, "The Hessian matrix");
  assert.ok(items[0].text.length > 20);

  const all = parsePySnippets(fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8"));
  const t = all.find((s) => s.name === "hessian");
  const vars = parseVars("```vars\nf = x^2 y + y^3\n```\n");
  const explain = (used, route) => pyExplainLines({ title: t.desc, label: route.label, items: explainItems([t.desc, route.label], REFS), inputs: used.map((u) => u.input) });
  const { text } = buildPySnippet(t.all[0], { vars, explain, answers: { point: "[1, 1]" } });
  const lines = text.split("\n");
  const firstPrint = lines.findIndex((l) => l.startsWith("print("));
  assert.ok(lines.findIndex((l) => l.startsWith("f = ")) < firstPrint, "values are defined before they are printed");
  assert.match(lines[firstPrint], /^print\("== Hessian matrix, .* -- at a point =="\)$/);
  assert.ok(text.includes('print("f =", f)'));
  assert.ok(text.includes('print("Definition 8.2 (The Hessian matrix):")\nprint("   ", "'));
  // Full statement, not cut: Theorem 8.12 ends with its case (iii).
  const thm = pyExplainLines({ items: explainItems(["Thm 8.12"], REFS) }).join("\n");
  assert.ok(thm.includes("saddle point if"), thm);
  // Routes whose description cites nothing get the book refs from PY_REFS.
  assert.deepEqual(explainItems(["determinant-free text", pyRefs("critxy")], REFS).map((i) => i.label),
    ["Definition 7.15", "Proposition 7.20", "Definition 8.2", "Theorem 8.12", "Definition 8.8"]);
  assert.ok(lines.filter((l) => l.startsWith('print("   ", ')).every((l) => l.length <= 120), "long statements are wrapped, not cut");
  assert.ok(!text.includes(' ...")'), "no truncation");
  assert.ok(/^[\x00-\x7f]*$/.test(lines.filter((l) => l.startsWith("print(")).join("\n")), "prints are ASCII (Windows console)");

  const callout = textExplain(explainItems(["(Thm 7.39)"], REFS));
  assert.ok(callout.startsWith("\n\n> [!note]- Definitions and results used\n> **Theorem 7.39 (Lagrange multipliers).** "));
  assert.equal(textExplain(explainItems(["no references here"], REFS)), "");
  assert.equal(ascii("λ ≤ ∇f · x₁ ∈ ℝ²"), "lambda <= nabla f * x_1 in R^2");
});
