import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isCursorInMath, extractMath } from "../src/mathContext.js";
import { scanDocument, mergeStats } from "../src/stats.js";
import { rankSuggestions } from "../src/rank.js";
import { cursorOffset, previewSource, DICTIONARY } from "../src/dictionary.js";
import { parseVars, fenceLanguage, insertFor, toLatex, toPython, matchVars, latexToPy } from "../src/vars.js";

test("python snippets use the note's variables", async () => {
  const { parsePySnippets, buildPySnippet, codeBlockBefore, scanPython, rankMembers, definedNames, freeSymbols } = await import("../src/pysnippets.js");
  const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
  const all = parsePySnippets(md);
  const names = all.map((s) => s.name);
  for (const n of ["hessian", "posdef", "kkt", "lagrange", "intersection", "gauss", "eigen", "integral", "taylor", "critxy", "sets", "truthtable"]) {
    assert.ok(names.includes(n), n);
  }
  for (const s of all) for (const v of s.all) assert.ok(v.body.trim(), `\\${s.name} [${v.label}] has a body`);

  const vars = parseVars("```vars\nf = x^2 + xy + 3y^2\nA = [[2, 1], [1, 2]]\nv = [1, 2]\n```\n");
  const hess = all.find((s) => s.name === "hessian").all[0];
  const { text, used } = buildPySnippet(hess, { vars });
  assert.deepEqual(used, [{ input: "f", var: "f" }]);
  assert.ok(text.startsWith("import sympy as sp\nx, y = sp.symbols('x y')\nf = x**2 + x*y + 3*y**2\n"), text);
  assert.ok(text.includes("sp.hessian(f, [x, y])"));

  // Already defined above in the same block: nothing is repeated.
  const before = "import sympy as sp\nx, y = sp.symbols('x y')\nf = x**2\n";
  const again = buildPySnippet(hess, { vars, before }).text;
  assert.ok(!again.includes("import sympy") && !again.includes("sp.symbols") && !again.includes("f = "), again);

  // A differently named variable of the right kind is copied in.
  const posdef = all.find((s) => s.name === "posdef").all[0];
  const B = parseVars("```vars\nM = [[1, 0], [0, 3]]\n```\n");
  assert.ok(buildPySnippet(posdef, { vars: B }).text.includes("A = sp.Matrix([[1, 0], [0, 3]])"));
  // No variable at all: a Tab placeholder.
  assert.ok(/A = \{\{A: \[\[1, 2\], \[3, 4\]\]\}\}/.test(buildPySnippet(posdef, {}).text));

  // Inputs form: every question prefilled, point sized to the variables.
  const { snippetQuestions, checkAnswers, answerToPy, sizeDefault } = await import("../src/pysnippets.js");
  const grad = all.find((s) => s.name === "gradient").all[0];
  const three = parseVars("```vars\nf = x^2 + yz + sin(z)\n```\n");
  const q = snippetQuestions(grad, { vars: three });
  assert.deepEqual(q.syms, ["x", "y", "z"]);
  assert.deepEqual(q.questions.map((x) => [x.key, x.value, x.from]), [
    ["f", "x^2 + yz + sin(z)", "f"], ["point", "[1, 1, 1]", null], ["direction", "[1, 0, 0]", null]]);
  const filled = buildPySnippet(grad, { vars: three, answers: { f: "x^2 + yz + sin(z)", point: "(1, 2, \\frac{1}{2})", direction: "[0, 1, 0]" } }).text;
  assert.ok(!filled.includes("{{"), filled);
  assert.ok(filled.includes("[1, 2, sp.Rational(1, 2)]") && filled.includes("sp.Matrix([0, 1, 0])"), filled);
  // Typed f with no vars block: its symbols come from what was typed.
  const typed = buildPySnippet(grad, { answers: { f: "a^2 b + e^{c}", point: "[1, 1, 1]", direction: "[1, 0, 0]" } });
  assert.deepEqual(typed.syms, ["a", "b", "c"]);
  assert.ok(typed.text.includes("f = a**2*b + sp.E**c"), typed.text);
  assert.equal(checkAnswers(grad, { vars: three }, { f: "", point: "[1, 1]", direction: "" }).error, "There are 3 variables (x, y, z), but point has 2 values.");
  assert.equal(checkAnswers(grad, { vars: three }, { f: "", point: "[1, 1, 1,]", direction: "" }).error, null);
  assert.equal(answerToPy("sp.Matrix([1, 2])"), "sp.Matrix([1, 2])");
  assert.equal(answerToPy("(x + 1)"), "(x + 1)");
  assert.equal(answerToPy("\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}"), "[1, 2]");
  assert.equal(sizeDefault("[0, 0]", "point", 3), "[0, 0, 0]");
  assert.equal(sizeDefault("2", "point", 3), "2");
  // Found by the words an exercise uses, spaces allowed.
  const { rankPySnippets } = await import("../src/pysnippets.js");
  for (const [q, want] of [["computational graph", "compgraph"], ["backprop", "compgraph"], ["partial derivatives", "gradient"],
    ["gradient at point", "gradient"], ["solve linear system", "gauss"], ["saddle point", "critxy"], ["hess", "hessian"]]) {
    assert.equal(rankPySnippets(q, all)[0]?.name, want, q);
  }

  assert.equal(codeBlockBefore("text\n```python\nimport numpy as np\nx = 1\n\\hes"), "import numpy as np\nx = 1");
  assert.deepEqual([...definedNames("x, y = 1, 2\ndef f(t):\n  return t\nfor k in range(3): pass")].sort(), ["f", "k", "x", "y"]);
  assert.deepEqual(freeSymbols("sp.sin(x)**2 + a*y + sp.pi"), ["x", "a", "y"]);

  const counts = scanPython("```python\nnp.linspace(0, 1)\nnp.linspace(0, 2)\nnp.linalg.norm(v)\n```\n$np.array$");
  assert.equal(counts.get("np.linspace"), 2);
  assert.equal(counts.get("np.linalg.norm"), 1);
  assert.equal(rankMembers("np", "li", counts)[0].name, "linspace");
  assert.ok(rankMembers("np", "pi", counts).find((m) => m.name === "pi" && !m.call));
  assert.equal(rankMembers("np.linalg", "no", counts)[0].name, "norm");
});

test("note variables", () => {
  const doc = String.raw`# Ex
$$A = ...$$
` + "```vars\n" + String.raw`A = [[1, 2], [3, 4]]
B = \begin{bmatrix} 1 & 0 \\ \frac{1}{2} & 1 \end{bmatrix}
C = 1 & 2 \\ 3 & 4
v = [1, -1, 2]
n = 5   # steps
h = 1/2
f = x^2 + 3x
M = \begin{pmatrix}
  a & \sqrt[3]{2} \\
  x_1 & 0.5
\end{pmatrix}
` + "```\n" + "```vars\nn = 7\n```\n";
  const vars = parseVars(doc);
  assert.deepEqual([...vars.keys()], ["A", "B", "C", "v", "n", "h", "f", "M"]);
  assert.equal(vars.get("n").value, "7"); // later block wins
  const A = vars.get("A");
  assert.equal(toLatex(A), String.raw`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`);
  assert.equal(toLatex(A, "bmatrix"), String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`);
  assert.deepEqual(vars.get("C").value, A.value);
  assert.equal(toLatex(vars.get("B")), String.raw`\begin{bmatrix} 1 & 0 \\ \frac{1}{2} & 1 \end{bmatrix}`);
  assert.equal(toPython(vars.get("B")), "sp.Matrix([[1, 0], [sp.Rational(1, 2), 1]])");
  assert.equal(toPython(A, "numpy"), "np.array([[1, 2], [3, 4]])");
  assert.equal(toPython(A, "plain"), "[[1, 2], [3, 4]]");
  assert.equal(toPython(vars.get("v")), "sp.Matrix([1, -1, 2])");
  assert.equal(toLatex(vars.get("v")), String.raw`\begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix}`);
  assert.equal(toPython(vars.get("M")), "sp.Matrix([[a, sp.root(2, 3)], [x_1, 0.5]])");
  assert.equal(toLatex(vars.get("h")), String.raw`\frac{1}{2}`);
  assert.equal(insertFor(vars.get("f"), "python", { atLineStart: true }), "f = x**2 + 3*x");
  assert.equal(insertFor(A, "python"), "sp.Matrix([[1, 2], [3, 4]])");
  assert.equal(insertFor(vars.get("n"), "text"), "$n = 7$");
  assert.equal(insertFor(A, "math"), toLatex(A));
  assert.deepEqual(matchVars(vars, "").length, 8);
  assert.deepEqual(matchVars(vars, "a").map((v) => v.name), ["A"]);

  assert.equal(latexToPy(String.raw`\frac{\sqrt{2}}{2} \sin^2 x + 2(x+1)`), "sp.sqrt(2)/2*sp.sin(x)**2 + 2*(x + 1)");
  assert.equal(latexToPy(String.raw`e^{-x} \cdot \pi`), "sp.E**(-x)*sp.pi");
  assert.equal(latexToPy(String.raw`x^23`), "x**2*3");
  assert.equal(latexToPy("a^2 + sin(c) + exp(y)"), "a**2 + sp.sin(c) + sp.exp(y)");
  assert.equal(latexToPy("sqrt(x) + xyz"), "sp.sqrt(x) + x*y*z");
  assert.equal(latexToPy(String.raw`\frac{a+1}{b}`, "np"), "(a + 1)/b");

  assert.equal(fenceLanguage("a\n```python\nx = "), "python");
  assert.equal(fenceLanguage("```python\n```\n"), null);
  assert.equal(fenceLanguage("text"), null);
});

test("math detection", () => {
  assert.equal(isCursorInMath("hello $x + \\fr"), true);
  assert.equal(isCursorInMath("hello $x$ and \\fr"), false);
  assert.equal(isCursorInMath("$$\na = \\fr"), true);
  assert.equal(isCursorInMath("$$\na\n$$\nafter \\fr"), false);
  assert.equal(isCursorInMath("costs \\$5 and \\fr"), false);
  assert.equal(isCursorInMath("```\n$x \\fr"), false);
  assert.equal(isCursorInMath("```\n$x\n```\n$\\fr"), true);
  assert.equal(isCursorInMath("`$` then \\fr"), false);
  assert.equal(isCursorInMath("lonely $ dollar\n\nnew para \\fr"), false);
  assert.equal(isCursorInMath("$$\n\\begin{aligned}\n\na &= \\fr"), true);
});

test("extract + scan", () => {
  assert.deepEqual(extractMath("a $x^2$ b $$\\frac{d}{dx}$$ `$no$`"), ["x^2", "\\frac{d}{dx}"]);
  const s = scanDocument("$\\frac{d}{dx} f$ and $\\frac{d}{dx}g$ and $\\sum_{i=1}^{n} i$");
  assert.equal(s.cmds.get("frac"), 2);
  assert.equal(s.atoms.get("\\frac{d}{dx}"), 2);
  assert.equal(s.atoms.get("\\sum_{i=1}^{n}"), 1);
});

test("ranking", () => {
  const stats = { cmds: new Map([["frac", 10], ["int", 50]]), atoms: new Map([["\\frac{d}{dx}", 4]]) };
  const r = rankSuggestions("fr", stats);
  assert.equal(r[0].insert, "\\frac{}{}");
  assert.ok(r.some((x) => x.insert === "\\frac{d}{dx}"));
  assert.equal(rankSuggestions("in", stats)[0].insert, "\\in");
  assert.equal(rankSuggestions("i", stats)[0].insert, "\\int_{}^{}");
  const boosted = rankSuggestions("fr", stats, { "\\frac{d}{dx}": 5 });
  assert.equal(boosted[0].insert, "\\frac{d}{dx}");
  assert.equal(rankSuggestions("alpha", stats).length, 1);
});

test("cursor offsets", () => {
  assert.equal(cursorOffset("\\frac{}{}"), 6);
  assert.equal(cursorOffset("\\lim_{ \\to }"), 6);
  assert.equal(cursorOffset("\\alpha"), 6);
  assert.equal(cursorOffset("\\begin{pmatrix}  \\end{pmatrix}"), 16);
});

const VAULT = process.env.OBSIDIAN_VAULT || "";
test("real vault scan", { skip: !VAULT || !fs.existsSync(VAULT) }, () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) files.push(p);
    }
  };
  walk(VAULT);
  const t0 = Date.now();
  const stats = mergeStats(files.map((f) => scanDocument(fs.readFileSync(f, "utf8"))));
  const ms = Date.now() - t0;
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join("  ");
  console.log(`files=${files.length} cmds=${stats.cmds.size} atoms=${stats.atoms.size} in ${ms}ms`);
  console.log("TOP CMDS ", top(stats.cmds, 20));
  console.log("TOP ATOMS", top(stats.atoms, 15));
  for (const q of ["fr", "su", "ma", "in", "le"]) {
    console.log(`\\${q} ->`, rankSuggestions(q, stats).slice(0, 6).map((x) => x.insert).join(" | "));
  }
  assert.ok(stats.cmds.size > 0);
});

import { envOf, variantsFor, buildEnv, previewOf } from "../src/variants.js";

test("environment fills", () => {
  const BS = String.fromCharCode(92);
  assert.equal(envOf(`${BS}begin{pmatrix}  ${BS}end{pmatrix}`), "pmatrix");
  assert.equal(envOf(`${BS}frac{}{}`), null);
  assert.equal(variantsFor("frac"), null);
  const v = (env, id) => variantsFor(env).find((x) => x.id === id);

  const abcd = buildEnv("pmatrix", v("pmatrix", "abcd"));
  assert.equal(abcd.text, `${BS}begin{pmatrix} a & b ${BS}${BS} c & d ${BS}end{pmatrix}`);
  assert.ok(!abcd.text.includes("\n"), "fills stay on one line");
  assert.equal(abcd.cursor, abcd.text.length);

  const id3 = buildEnv("bmatrix", v("bmatrix", "id3")).text;
  assert.ok(id3.includes(`1 & 0 & 0 ${BS}${BS} 0 & 1 & 0`));

  const blank = buildEnv("pmatrix", v("pmatrix", "blank2"));
  assert.equal(blank.text.slice(blank.cursor, blank.cursor + 3), " & ");

  const al = buildEnv("aligned", v("aligned", "chain")).text;
  assert.equal(al, `${BS}begin{aligned} &= ${BS}${BS} &= ${BS}end{aligned}`);

  assert.ok(previewOf("align", v("align", "eq2")).startsWith(`${BS}begin{aligned}`));
  assert.ok(previewOf("pmatrix", v("pmatrix", "blank2")).includes(`${BS}square & ${BS}square`));
});

import { fillsFor } from "../src/fills.js";
import { cursorContext } from "../src/mathContext.js";
import { parseTemplates, mergeTemplates, expandBody, rankTemplates, nextPlaceholder, mirrorChanges, placeholders } from "../src/templates.js";

import { parseRefQuery, rankRefs, formatRef } from "../src/refs.js";

test("imo26 templates + references", () => {
  const imo = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
  const generic = parseTemplates(fs.readFileSync(new URL("../src/default-templates.md", import.meta.url), "utf8"));
  assert.ok(imo.length >= 45, `imo26 templates: ${imo.length}`);
  const routes = imo.reduce((n, t) => n + t.variants.length, 0);
  assert.ok(routes >= 150, `routes: ${routes}`);
  const proof = generic.find((t) => t.name === "proof");
  assert.ok(proof.variants.length >= 6, "proof has strategies");
  assert.equal(proof.body, proof.variants[0].body, "first route is the default body");
  const open = imo.find((t) => t.name === "openset");
  assert.ok(open.variants.some((v) => v.label.includes("Prop 5.68")), "routes cite results by number");
  const names = [...generic, ...imo].map((t) => t.name);
  assert.equal(new Set(names).size, names.length, "no duplicate template names");
  for (const t of [...imo, ...generic]) for (const v of t.variants) {
    assert.ok(!v.body.includes("###"), `${t.name}: ${v.label}`);
    for (const m of v.body.matchAll(/\$\$([\s\S]*?)\$\$/g)) assert.ok(!m[1].includes("\n"), `${t.name}/${v.label}: $$ on one line`);
    assert.ok(!/[_^]\{\{/.test(v.body), `${t.name}/${v.label}: wrap sub/superscript blanks in braces`);
    // A leftover "{{word" means a blank didn't expand (e.g. braces inside it).
    assert.ok(!/\{\{\s*[A-Za-z_,]/.test(expandBody(v.body)), `${t.name}/${v.label}: every {{ }} expands`);
  }
  for (const t of imo) {
    assert.match(t.name, /^[a-zA-Z]+$/, "names are letters only (trigger regex)");
    for (const m of t.body.matchAll(/\$\$([\s\S]*?)\$\$/g)) assert.ok(!m[1].includes("\n"), `${t.name}: $$ on one line`);
    assert.ok(!/[_^]\{\{/.test(t.body), `${t.name}: wrap sub/superscript blanks in braces`);
    const expanded = expandBody(t.body);
    assert.ok(!/\{\{\s*[A-Za-z_,]/.test(expanded), `${t.name}: every {{ }} expands`);
    // Template names must not be swallowed by a reference prefix.
    const rq = parseRefQuery(t.name);
    if (rq) assert.equal(rankRefs([], rq).length, 0);
  }
  assert.deepEqual(mirrorChanges("a ⟨_⟩ b ⟨_⟩", "_", "t"), [], "{{_}} never mirrors");

  const refs = JSON.parse(fs.readFileSync(new URL("../src/refs/imo26.json", import.meta.url), "utf8"));
  assert.equal(refs.length, 133);
  for (const r of refs) assert.ok(r.title && r.num && r.page, `${r.kind} ${r.num}`);
  const kinds = new Set(refs.map((r) => r.kind));
  for (const k of ["definition", "theorem", "proposition", "lemma", "remark", "corollary"]) assert.ok(kinds.has(k), k);

  assert.deepEqual(parseRefQuery("def4.2"), { kind: "definition", q: "4.2" });
  assert.deepEqual(parseRefQuery("ref convex fun"), { kind: null, q: "convex fun" });
  assert.equal(parseRefQuery("proof"), null);
  assert.equal(parseRefQuery("prop").kind, "proposition");

  assert.equal(rankRefs(refs, parseRefQuery("def4.26"))[0].title, "Convex function");
  assert.equal(rankRefs(refs, parseRefQuery("thmcauchy"))[0].num, "5.24");
  assert.equal(rankRefs(refs, parseRefQuery("ref extreme value"))[0].num, "5.84");
  assert.equal(rankRefs(refs, parseRefQuery("lem")).length, 5);
  assert.ok(rankRefs(refs, parseRefQuery("ref kkt")).some((r) => r.num === "9.37"));
  assert.equal(rankRefs(refs, parseRefQuery("def")).length, 42);

  const d = refs.find((r) => r.kind === "definition" && r.num === "4.26");
  assert.equal(formatRef(d), "Definition 4.26", "plain, exactly as the book cites it");
  assert.equal(formatRef(d, null, true), "Definition 4.26 (Convex function)");
  assert.match(formatRef(d, "IMO26_ALL_DEFINITIONS"), /^\[\[IMO26_ALL_DEFINITIONS#Definition 4\.26 .*\|Definition 4\.26\]\]$/);
  const rem = refs.find((r) => r.kind === "remark");
  assert.ok(!formatRef(rem, "X").startsWith("[["), "no link without a heading");
});

test("templates", () => {
  const BS = String.fromCharCode(92);
  const md = fs.readFileSync(new URL("../src/default-templates.md", import.meta.url), "utf8");
  const defs = parseTemplates(md);
  const names = defs.map((t) => t.name);
  for (const n of ["proof", "showthat", "induction", "contradiction", "epsdelta", "invariant", "solution"]) assert.ok(names.includes(n), n);
  assert.equal(defs.find((t) => t.name === "proof").desc, "proof, pick a strategy");
  assert.ok(!defs.some((t) => t.body.includes("## ")), "bodies don't swallow headings");
  for (const t of defs) {
    // Display math must stay on one line (Emil's rule from the fills work).
    for (const m of t.body.matchAll(/\$\$([\s\S]*?)\$\$/g)) assert.ok(!m[1].includes("\n"), `${t.name} $$ one line`);
    assert.ok(placeholders(expandBody(t.body)).length > 0, `${t.name} has placeholders`);
  }

  // Contexts: only plain text gets templates.
  assert.equal(cursorContext("hi \\pr"), "text");
  assert.equal(cursorContext("hi $x \\pr"), "math");
  assert.equal(cursorContext("```\n\\pr"), "code");
  assert.equal(cursorContext("`\\pr"), "code");

  // User file overrides by name and adds new ones.
  const user = parseTemplates(`## ${BS}proof - mine\nMy {{x}}\n\n## ${BS}lemma\nLemma {{y}}\n# other\nignored`);
  assert.equal(user.length, 2);
  assert.equal(user[1].body, "Lemma {{y}}");
  const all = mergeTemplates(defs, user);
  assert.equal(all.find((t) => t.name === "proof").body, "My {{x}}");
  assert.equal(all.find((t) => t.name === "proof").source, "user");
  assert.ok(all.some((t) => t.name === "lemma"));

  // Ranking: prefix first, picks break ties, description search for 2+ chars.
  assert.equal(rankTemplates("pr", defs)[0].name, "proof");
  assert.equal(rankTemplates("ind", defs)[0].name, "induction");
  assert.ok(rankTemplates("limit", defs).some((t) => t.name === "epsdelta"), "matches description");
  assert.equal(rankTemplates("zzz", defs).length, 0);
  assert.equal(rankTemplates("c", defs, { counterexample: 3 })[0].name, "counterexample");

  // Placeholders, jumping, mirroring.
  const text = expandBody("Show {{a}} then {{b}} and {{a}} again");
  assert.equal(text, "Show ⟨a⟩ then ⟨b⟩ and ⟨a⟩ again");
  const ps = placeholders(text);
  assert.equal(ps.length, 3);
  assert.equal(nextPlaceholder(text, 0, 1).label, "a");
  assert.equal(nextPlaceholder(text, ps[0].to, 1).label, "b");
  assert.equal(nextPlaceholder(text, ps[2].to, 1).from, 5, "wraps to first");
  assert.equal(nextPlaceholder(text, ps[1].from, -1).from, ps[0].from);
  assert.equal(nextPlaceholder("no markers", 0, 1), null);

  const filled = "Show x+1 then ⟨b⟩ and ⟨a⟩ again";
  const ch = mirrorChanges(filled, "a", "x+1");
  assert.equal(ch.length, 1);
  assert.equal(filled.slice(0, ch[0].from) + ch[0].insert + filled.slice(ch[0].to), "Show x+1 then ⟨b⟩ and x+1 again");
  assert.deepEqual(mirrorChanges(filled, "a", ""), [], "empty value doesn't erase");
  assert.deepEqual(mirrorChanges(text, "a", "⟨a⟩"), [], "unfilled doesn't mirror");
});

test("general fills", () => {
  const BS = String.fromCharCode(92);
  const atoms = new Map([[`${BS}frac{1}{2}`, 9], [`${BS}frac{x}{y}`, 3], [`${BS}frac{q}{r}`, 1], [`${BS}sum_{j=1}^{m}`, 4]]);
  const frac = fillsFor("frac", `${BS}frac{}{}`, atoms);
  assert.equal(frac[0].id, "blank");
  assert.equal(frac[1].text, `${BS}frac{1}{2}`);
  assert.equal(frac[1].uses, 9);
  assert.equal(frac[2].text, `${BS}frac{x}{y}`);
  assert.ok(!frac.some((f) => f.text === `${BS}frac{q}{r}`), "single-use atoms are skipped");
  assert.equal(frac.filter((f) => f.text === `${BS}frac{1}{2}`).length, 1, "no duplicate of curated");

  assert.equal(fillsFor("sum", `${BS}sum_{}^{}`, atoms)[1].text, `${BS}sum_{j=1}^{m}`);
  assert.ok(!fillsFor("ddx", `${BS}frac{d}{dx}`, atoms).some((f) => f.uses), "aliases skip vault atoms");
  assert.equal(fillsFor("alpha", `${BS}alpha`, atoms), null);
  assert.equal(fillsFor("pmatrix", `${BS}begin{pmatrix}  ${BS}end{pmatrix}`, atoms)[0].id, "blank2");
  assert.equal(fillsFor("begin", `${BS}begin{}  ${BS}end{}`, atoms), null);

  // Nothing the plugin can insert spans more than one line.
  for (const d of DICTIONARY.values()) {
    assert.ok(!d.template.includes("\n"), d.name);
    for (const f of fillsFor(d.name, d.template, atoms) || []) assert.ok(!f.text.includes("\n"), `${d.name}:${f.id}`);
  }
  assert.ok(previewSource(DICTIONARY.get("pmatrix").template).includes(`a & b ${BS}${BS} c & d`));
  assert.equal(previewSource(DICTIONARY.get("begin").template), `${BS}text{env}`);
});

import { exerciseQuery, rankExercises, textQuestions, fillTextAnswers } from "../src/templates.js";

test("exercise templates and text inputs", () => {
  const D = String.fromCharCode(36);
  assert.deepEqual(exerciseQuery("ex1.19"), { num: "1.19", words: [] });
  assert.deepEqual(exerciseQuery("ex truth table"), { num: null, words: ["truth", "table"] });
  assert.equal(exerciseQuery("explain"), null);
  assert.equal(exerciseQuery("def4.26"), null);

  const B = String.fromCharCode(92);
  const md = [
    `## ${B}ex1.1 — first [${B}proof]`, "**Exercise 1.1** Prove it.", `### ${B}proof: direct`, "body",
    `## ${B}ex1.19 — Construct the truth table [${B}truthtable]`, "**Exercise 1.19** truth table for p.", `### ${B}truthtable: one`, "x",
    `## ${B}ex1.190 — fake`, "**Exercise 1.190** other.",
  ].join("\n");
  const ex = parseTemplates(md);
  assert.deepEqual(ex.map((t) => t.name), ["ex1.1", "ex1.19", "ex1.190"]);
  assert.equal(ex[1].variants[0].label, `${B}truthtable: one`);
  assert.ok(ex[1].variants[0].body.startsWith("**Exercise 1.19**"), "statement prepended to each route");
  assert.deepEqual(rankExercises(exerciseQuery("ex1.19"), ex).map((t) => t.name), ["ex1.19", "ex1.190"]);
  assert.deepEqual(rankExercises(exerciseQuery("ex1.1"), ex).map((t) => t.name)[0], "ex1.1");
  assert.deepEqual(rankExercises(exerciseQuery("ex truth table"), ex).map((t) => t.name), ["ex1.19"]);

  const body = `Divide ${D}f(x) = {{f}}${D} by ${D}{{d}}${D}. Let ${D}x ${B}in {{A}}${D}, {{reason}}, ${D}{{_}}${D} and ${D}{{f}}${D} again.`;
  const vars = [{ name: "f", kind: "scalar" }, { name: "A", kind: "matrix" }];
  const qs = textQuestions(body, vars, (v) => `LATEX(${v.name})`);
  assert.deepEqual(qs.map((q) => q.key), ["f", "d", "A"], "prose and anonymous blanks are not asked");
  assert.equal(qs[0].value, "LATEX(f)", "value slot gets the variable's value");
  assert.equal(qs[2].value, "A", "name slot gets the variable's name");
  assert.equal(qs[1].value, "");
  const filled = fillTextAnswers(body, { f: "x^2", d: "", A: "S" });
  assert.ok(filled.includes(`${D}f(x) = x^2${D}`) && filled.includes(`${D}x^2${D} again`));
  assert.ok(filled.includes("{{d}}") && filled.includes("{{reason}}"), "empty answers stay as blanks");
});

test("generated exercise file", { skip: !fs.existsSync("docs/imo26-coverage/IMO26 Exercise Templates.md") }, () => {
  const ex = parseTemplates(fs.readFileSync("docs/imo26-coverage/IMO26 Exercise Templates.md", "utf8"));
  assert.equal(ex.length, 289);
  for (const t of ex) {
    assert.match(t.name, /^ex\d+\.\d+$/);
    assert.ok(t.variants.length >= 1, t.name);
    for (const v of t.variants) assert.ok(v.body.startsWith(`**Exercise ${t.name.slice(2)}**`), t.name);
  }
  assert.equal(rankExercises(exerciseQuery("ex1.19"), ex)[0].name, "ex1.19");
  assert.equal(rankExercises(exerciseQuery("ex truth table hand"), ex)[0].name, "ex1.19");
  assert.ok(rankExercises(exerciseQuery("ex lagrange"), ex).length > 0);
});
