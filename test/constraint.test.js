// A vars block like Emil's Weekly assignment 10 (Exercise 7.41):
//   y = x + 1
//   f(x, y) = (x - 1)^2 + (y - 1)^2
// y is f's variable, so y = x + 1 is the constraint, never a python value.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parsePySnippets, buildPySnippet, snippetQuestions } from "../src/pysnippets.js";
import { noteFunctions } from "../src/textlink.js";

const NOTE = "```vars \ny = x + 1\nf(x, y) = (x - 1)^2 + (y - 1)^2\n```\n";
const SNIPPETS = parsePySnippets(fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8"));
const TEMPLATES = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
const run = (code) => spawnSync("python", ["-I", "-c", code], { encoding: "utf8", timeout: 120000 });

test("y = x + 1 next to f(x, y) is the constraint g = y - (x + 1)", () => {
  const vars = parseVars(NOTE);
  assert.equal(vars.get("y").constraint, true);
  assert.deepEqual(noteFunctions(vars).map((v) => v.name), ["f", "g"]);
  assert.ok(vars.get("g").fromConstraint === "y");
});

test("python snippets declare y as a symbol (was: TypeError str - int)", () => {
  const vars = parseVars(NOTE);
  for (const name of ["limit", "lagrange", "critxy"]) {
    const s = SNIPPETS.find((x) => x.name === name);
    if (!s) continue;
    for (const v of s.all) for (const viaForm of [false, true]) {
      // viaForm: the inputs form prefills f from the vars block and sends it
      // back as a typed answer (the path the plugin takes by default).
      const answers = viaForm ? Object.fromEntries(snippetQuestions(v, { vars }).questions.map((q) => [q.key, q.value])) : {};
      const { text } = buildPySnippet(v, { vars, answers });
      if (/\{\{/.test(text) || !/\(y - 1\)/.test(text)) continue; // routes that don't use f
      assert.match(text, /x, y = sp\.symbols\('x y'\)/, `\\${name} [${v.label}]`);
      assert.doesNotMatch(text, /^y = /m, `\\${name} [${v.label}] must not assign y`);
      if (v.uses.includes("plt")) continue;
      const r = run(text);
      if (r.error || /No module named/.test(r.stderr)) return;
      assert.equal(r.status, 0, `\\${name} [${v.label}]\n${text}\n${r.stderr}`);
    }
  }
});

test("\\lagrange text on that note: Exercise 7.41 solved", () => {
  const vars = parseVars(NOTE);
  const r = TEMPLATES.find((t) => t.name === "lagrange").variants.find((v) => /^linear constraint/.test(v.label));
  assert.equal(routeFit(r, vars).best, true);
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body }));
  const out = fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
  assert.match(out, /x = \\frac\{1\}\{2\},\\ y = \\frac\{3\}\{2\}/);
  assert.match(out, /is the minimum/);
});
