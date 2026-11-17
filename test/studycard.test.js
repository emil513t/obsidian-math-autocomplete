// Study cards (\card): a plan for an exercise, never its solution.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { studyCard, parseTips, classify, taskType, extractVars } from "../src/studycard.js";
import { parseTemplates } from "../src/templates.js";
import { explainItems, textExplain, citations } from "../src/explain.js";
import { citeFromResult } from "../src/resultrefs.js";
import { routeFit } from "../src/witness.js";
import { offBook, isHidden } from "../src/curriculum.js";
import { parseOutcomes, outcomeOf } from "../src/outcomes.js";
import INDEX from "../src/exercise-index.json" with { type: "json" };
import REFS1 from "../src/refs/imo26.json" with { type: "json" };
import REFS2 from "../src/refs/imo26-extra.json" with { type: "json" };

const REFS = [...REFS1, ...REFS2];
const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const TEMPLATES = [...parseTemplates(src("default-templates.md")), ...parseTemplates(src("imo26-templates.md"))]
  .filter((t) => !isHidden("templates", t.name));
const TIPS = parseTips(src("tips.md"));
const OUTCOMES = parseOutcomes(src("outcomes.md"));
const card = (text, verdict = false) => studyCard({
  text, index: INDEX, tips: TIPS, templates: TEMPLATES, refs: REFS, verdict,
  items: (s) => explainItems(s, REFS),
  cite: (name, s, v) => citeFromResult(name, s, REFS, v),
  fit: (r, name, v) => routeFit(r, v, { command: name }),
  explain: (items) => textExplain(items),
  outcomes: OUTCOMES, outcomeOf,
});

test("tips: every IMO26 command has a section; every reference exists in the book", () => {
  const imo = parseTemplates(src("imo26-templates.md")).map((t) => t.name).filter((n) => !["chatbot"].includes(n));
  const missing = imo.filter((n) => !TIPS.has(n));
  assert.deepEqual(missing, []);
  const all = [...TIPS.values()].flatMap((t) => [...t.show, ...t.prove, ...t.disprove, ...t.trick]).join("\n");
  const known = new Set(REFS.map((r) => `${r.kind}:${r.num}`));
  const exs = new Set(INDEX.map((e) => e.id));
  const bad = citations(all).filter((c) => (c.kind === "exercise" ? !exs.has(c.num) : !known.has(`${c.kind}:${c.num}`)));
  assert.deepEqual(bad.map((c) => c.label), []);
  assert.deepEqual(offBook(all), []);
});

test("Exercise 7.41 in words: \\lagrange, the line as g, |v - p|^2 as f, no solution written", () => {
  const c = card("Find the point on the line $y = x + 1$ closest to $(1, 1)$. What is the smallest distance?");
  assert.equal(c.command, "lagrange");
  assert.deepEqual(c.extracted, ["g = y - (x + 1)", "f(x, y) = (x - 1)^2 + (y - 1)^2"]);
  assert.match(c.markdown, /A line or plane is not compact/);
  assert.match(c.markdown, /```vars\ng = y - \(x \+ 1\)/);
  // Not solved: no point, no value, no verdict.
  assert.doesNotMatch(c.markdown, /\\frac\{1\}\{2\}|3\/2|0\.707|Verdict/);
  // Verdict on: a folded spoiler naming the route.
  const v = card("Find the point on the line $y = x + 1$ closest to $(1, 1)$.", true);
  assert.match(v.markdown, /> \[!warning\]- Verdict \(spoiler/);
  assert.match(v.markdown, /Take the route \*\*linear constraint/);
});

test("a decide question lists both ways; the verdict says which (only when on)", () => {
  const q = "Is $S = \\{(x, y) \\mid 0 \\le x \\le 1\\}$ compact?";
  const c = card(q);
  assert.equal(c.command, "compact");
  assert.equal(c.kinds[0].kind, "decide");
  assert.match(c.markdown, /To show it: closed \+ bounded/);
  assert.match(c.markdown, /To disprove it: NOT compact/);
  assert.match(c.markdown, /If it fails: one of the two fails/);
  assert.doesNotMatch(c.markdown, /Verdict/);
  assert.match(card(q, true).markdown, /S is not bounded\. Take the route \*\*NOT compact/);
});

test("task types", () => {
  assert.equal(taskType("Show that f is convex.")[0].kind, "prove");
  assert.equal(taskType("Compute the gradient.")[0].kind, "compute");
  assert.equal(taskType("What is the smallest distance?")[0].kind, "compute");
  assert.equal(taskType("Is A positive definite?")[0].kind, "decide");
  assert.equal(taskType("Prove that the points cannot be separated by a line.")[0].kind, "disprove");
  assert.equal(taskType("Give an example of a convex function that is not strictly convex.")[0].kind, "disprove");
  // A bare number: the book's classification.
  const c = card("Ex 5.9");
  assert.equal(c.command, "svm");
  assert.equal(c.kinds[0].kind, "disprove");
  assert.match(c.markdown, /To disprove it: NOT separable[\s\S]*To show it/);
});

test("topic words", () => {
  const names = new Set(TEMPLATES.map((t) => t.name));
  const top = (s) => classify(s, INDEX, names).commands[0]?.name;
  assert.equal(top("Decide if A = [[2, 1], [1, 3]] is positive definite."), "posdef");
  assert.equal(top("Show that the set is open."), "openset");
  assert.equal(top("Solve using the KKT conditions."), "kkt");
  assert.equal(top("Is the matrix invertible?"), "matinv");
  assert.equal(top("Compute the limit as x goes to 1."), "limit");
  assert.equal(top("Show that f(x) = x^4 is strictly convex."), "strictconvex");
});

test("extractVars: functions, matrices, sets from $...$", () => {
  assert.deepEqual(extractVars("Let $f(x, y) = x^2 + 3y^2$ and $A = [[1, 2], [2, 1]]$."), ["f(x, y) = x^2 + 3y^2", "A = [[1, 2], [2, 1]]"]);
  assert.deepEqual(extractVars("no math here"), []);
});

// Whole book: every exercise number gives a card for one of its own commands,
// and every card stays in the book's wording.
test("audit: all 289 book exercises by number", () => {
  const names = new Set(TEMPLATES.map((t) => t.name));
  let n = 0;
  for (const e of INDEX) {
    const c = card(`Exercise ${e.id}`);
    const own = e.t.filter((x) => names.has(x) && !["showthat", "iff", "contradiction", "explain", "definition", "proof", "find", "induction"].includes(x));
    if (own.length) assert.ok(own.includes(c.command), `Ex ${e.id}: ${c.command} not in ${own}`);
    assert.deepEqual(offBook(c.markdown.replace(/> \[!note\]-[\s\S]*$/, "")), [], `Ex ${e.id}`);
    n++;
  }
  assert.equal(n, 289);
});

test("possible endings are listed; yours only inside the spoiler", () => {
  const q = "Find the critical points of $f(x) = x^3 - 3x$ and classify them.";
  const off = card(q);
  assert.ok(off.markdown.includes("**Possible endings**"));
  assert.ok(off.markdown.includes("- **local minimum**: f'(x0) = 0, f''(x0) > 0"));
  assert.ok(!off.markdown.includes("Your values end as"));
  const on = card(q, true).markdown;
  const spoiler = on.slice(on.indexOf("> [!warning]- Verdict"));
  assert.ok(spoiler.includes("**Your values end as:** **local maximum** (x = -1: f'' < 0); **local minimum** (x = 1: f'' > 0)"), spoiler.slice(0, 300));
});
