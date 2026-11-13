// Unicode math pasted from a PDF / web page (− U+2212, ×, ·, ≤, ², α, NBSP)
// must never reach Python, the CAS or the worked solutions. Emil's note had
//   f(x,y) = x^4y^2 + x^2y^4 − 3x^2y^2
// and \critxy wrote `x**2*y**4−3*x**2*y**2` -> SyntaxError U+2212.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import * as cas from "../src/cas.js";
import { parseVars, latexToPy } from "../src/vars.js";
import { parsePySnippets, buildPySnippet, answerToPy, snippetQuestions } from "../src/pysnippets.js";
// The inputs form's prefilled answers, as the plugin inserts them.
const answersFor = (route, vars) => Object.fromEntries(snippetQuestions(route, { vars }).questions.map((q) => [q.key, q.value]));
import { evidencePy } from "../src/evidence.js";

const UNI = "```vars\n" +
  "f(x,y) = x^4y^2 + x^2y^4 − 3x^2y^2\n" +
  "g(x,y) = x² · y – 2×x + y³\n" +
  "A = [[1, −1/2], [0, 1]]\n" +
  "p = (1, −1)\n" +
  "c = 2π\n" +
  "```\n";
const ASCII = "```vars\n" +
  "f(x,y) = x^4y^2 + x^2y^4 - 3x^2y^2\n" +
  "g(x,y) = x^2 \\cdot y - 2 \\times x + y^3\n" +
  "A = [[1, -1/2], [0, 1]]\n" +
  "p = (1, -1)\n" +
  "c = 2\\pi\n" +
  "```\n";
const hasBadChar = (s) => /[−–—×·⋅ ²³≤≥]/.test(String(s));

test("asciiMath maps the usual pasted characters", () => {
  assert.equal(cas.asciiMath("x − 1"), "x - 1");
  assert.equal(cas.asciiMath("x²y³"), "x^2y^3");
  assert.equal(cas.asciiMath("x¹⁰"), "x^{10}");
  assert.equal(cas.asciiMath("a₁"), "a_1");
  assert.match(cas.asciiMath("x ≤ 2"), /\\le/);
  assert.equal(cas.asciiMath("plain ascii"), "plain ascii");
});

test("vars with unicode minus parse exactly like the ASCII note", () => {
  const u = parseVars(UNI), a = parseVars(ASCII);
  for (const name of a.keys()) {
    assert.ok(u.has(name), `missing ${name}`);
    assert.ok(!u.get(name).error, `${name}: ${u.get(name).error}`);
    assert.ok(!hasBadChar(JSON.stringify(u.get(name).value)), `${name} kept unicode: ${JSON.stringify(u.get(name).value)}`);
  }
  assert.equal(cas.tex(cas.parse(u.get("f").value)), cas.tex(cas.parse(a.get("f").value)));
});

test("direct inputs (typed answers, CAS, latexToPy) are cleaned too", () => {
  assert.equal(latexToPy("x^4y^2 − 3x^2y^2"), latexToPy("x^4y^2 - 3x^2y^2"));
  assert.ok(!hasBadChar(answerToPy("(1, −1)")));
  assert.ok(!hasBadChar(answerToPy("x² − y")));
  assert.equal(cas.tex(cas.parse("x² − y")), cas.tex(cas.parse("x^2 - y")));
});

test("every python snippet route built from a unicode note is pure ASCII", () => {
  const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
  const vars = parseVars(UNI);
  let routes = 0;
  for (const s of parsePySnippets(md)) {
    for (const route of s.all) {
      const { text: code } = buildPySnippet(route, { vars, answers: answersFor(route, vars) });
      routes++;
      const line = code.split("\n").find(hasBadChar);
      assert.equal(line, undefined, `${s.name}: ${line}`);
    }
  }
  assert.ok(routes > 50);
});

test("text-template evidence python from a unicode note is pure ASCII", () => {
  const vars = parseVars(UNI);
  const code = evidencePy(["Hessian", "gradient", "critical points"], vars, { fn: "f" });
  assert.ok(!hasBadChar(code), code.split("\n").find(hasBadChar));
});

const hasSympy = (() => {
  const r = spawnSync("python", ["-I", "-c", "import sympy"], { encoding: "utf8", timeout: 60000 });
  return !r.error && r.status === 0;
})();

test("Emil's \\critxy note runs in real Python", { skip: !hasSympy && "no sympy" }, () => {
  const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
  const s = parsePySnippets(md).find((x) => x.name === "critxy");
  assert.ok(s, "critxy snippet");
  const vars = parseVars(UNI);
  const route = s.all[0];
  const { text: code } = buildPySnippet(route, { vars, answers: answersFor(route, vars) });
  const r = spawnSync("python", ["-I", "-c", code], { encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
  // f = x^2 y^2 (x^2 + y^2 - 3): both axes are lines of critical points,
  // listed once as lines (not as repeated single points on them).
  assert.match(r.stdout, /x = 0 with y free/);
  assert.match(r.stdout, /y = 0 with x free/);
  assert.equal((r.stdout.match(/local min/g) || []).length, 4);
  assert.doesNotMatch(r.stdout, /sqrt\(3\)/);
});
