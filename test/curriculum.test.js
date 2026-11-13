// Only wording from the IMO26 book: every visible command name, description,
// option label, template, worked solution, Python snippet (prints and code),
// graph keyword and Python evidence is checked against the banned list in
// src/curriculum.js (terms that never occur in the book).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars } from "../src/vars.js";
import { objectContext, OBJECTS } from "../src/objects.js";
import { workFor, WORK_OBJECTS } from "../src/work.js";
import { parsePySnippets, KEYWORDS, buildPySnippet, snippetQuestions } from "../src/pysnippets.js";
import { parseTemplates } from "../src/templates.js";
import { GRAPH_KEYWORDS, graphOptions, graphQuery } from "../src/graph.js";
import { graphToPython } from "../src/graphpy.js";
import { evidencePy } from "../src/evidence.js";
import { HIDDEN, offBook } from "../src/curriculum.js";

const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const NOTE = "```vars\n" + String.raw`h(x) = x^3 - 2x
f(x,y) = x^3 + xy + y^2
k(x,y,z) = x y z + z^2
S2 = [[2, 1], [1, 3]]
S3 = [[1, 2, 0], [0, 1, 1], [1, 0, 2]]
B = [[1, 2, 3], [4, 5, 6]]
P = [[0, 0], [1, 2], [2, 1]]
p = (1, 0)
q = (1, 2, 3)
u = [1, 2]
w = [3, 4]
F = [x^2 y, x + y]
e1 = 2x + y + z = 7
e2 = x + 2y + z = 8
e3 = x + y + 2z = 9
c1 = x + 2y \le 6
c2 = x \ge 0
X = {1, 2, 3}
Y = {2, 3}
T(n) = \sum_{k=1}^{n} k = \frac{n(n+1)}{2}` + "\n```\n";

// In Python only what is read counts as wording: string literals (prints,
// labels) and comments, not library names like add_contour or .det().
const pyWording = (code) => [
  ...String(code).matchAll(/#[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g),
].map((m) => m[0]).join("\n");

const problems = [];
const check = (where, text) => { for (const hit of offBook(text)) problems.push(`${where}: ${hit}`); };

test("math commands: names, descriptions, labels and worked solutions use only book wording", () => {
  const ctx = objectContext(parseVars(NOTE));
  const answers = { n: "3", a: "0", k: "3", x0: "1", f: "x^2 y", A: "[[1, 2], [3, 4]]", B: "[[0, 1], [1, 0]]", F: "x^2 y; x + y", p: "(1, 0)", e: "x + y = 1; x - y = 0", x: "x", s: "\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}" };
  let n = 0;
  for (const obj of OBJECTS) {
    if (HIDDEN.objects.has(obj.name)) continue;
    check(`\\${obj.name}`, `${obj.name} ${obj.words || ""} ${obj.desc}`);
    let opts = [];
    try { opts = obj.options(ctx); } catch (_) { /* options need more context */ }
    for (const o of opts) {
      check(`\\${obj.name} option ${o.id}`, `${o.label} ${o.error || ""}`);
      if (!WORK_OBJECTS.includes(obj.name) || o.error) continue;
      let md = "";
      try { md = workFor(obj.name, o.id, ctx, answers) || ""; } catch (_) { md = ""; }
      if (md) { n++; check(`\\${obj.name} ${o.id} worked solution`, md); }
    }
  }
  assert.ok(n > 50, `only ${n} worked solutions checked`);
});

test("python snippets: names, descriptions, routes, keywords and code use only book wording", () => {
  const vars = parseVars(NOTE);
  for (const s of parsePySnippets(read("py-snippets.md"))) {
    if (HIDDEN.py.has(s.name)) continue;
    check(`\\${s.name} (python)`, `${s.name} ${s.desc} ${KEYWORDS[s.name] || ""}`);
    for (const v of s.all) {
      check(`\\${s.name} route "${v.label}"`, v.label);
      const answers = Object.fromEntries(snippetQuestions(v, { vars }).questions.map((q) => [q.key, q.value]));
      check(`\\${s.name} route "${v.label}" code`, pyWording(buildPySnippet(v, { vars, answers }).text));
    }
  }
});

test("text templates use only book wording", () => {
  for (const file of ["imo26-templates.md", "default-templates.md"]) {
    for (const t of parseTemplates(read(file))) {
      if (HIDDEN.templates.has(t.name)) continue;
      check(`${file} \\${t.name}`, `${t.name} ${t.desc}`);
      for (const v of t.variants.length ? t.variants : [{ label: "", body: t.body }]) check(`${file} \\${t.name} "${v.label}"`, `${v.label}\n${v.body}`);
    }
  }
});

test("graphs and python evidence use only book wording", () => {
  const vars = parseVars(NOTE);
  for (const k of GRAPH_KEYWORDS) check(`graph keyword ${k.word}`, `${k.word} ${k.desc} ${k.hint}`);
  for (const o of graphOptions(vars, graphQuery("graph"))) {
    check(`\\graph option ${o.label}`, `${o.label} ${o.desc} ${o.lines.join(" ")}`);
    check(`\\graph option ${o.label} python`, pyWording(graphToPython(o.lines.join("\n"), vars)));
  }
  const labels = ["Hessian", "gradient", "Hessian at v0", "diagonal", "definiteness", "local minimum / local maximum / saddle point", "f_x", "f'", "f(1, 2)", "check the base case"];
  check("python evidence", pyWording(evidencePy(labels, vars, { fn: "f" })));
});

test("no off-book wording anywhere visible (summary)", () => {
  assert.deepEqual([...new Set(problems)], []);
});
