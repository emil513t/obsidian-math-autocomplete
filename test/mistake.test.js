// E11 of docs/imo26-coverage/CONTRADICTIONS.md: find the mistake, with the
// book's exercises as cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars, toLatex } from "../src/vars.js";
import { parseTemplates, textQuestions, fillTextAnswers } from "../src/templates.js";
import { resolveAny, routeFit } from "../src/witness.js";
import { parseOutcomes } from "../src/outcomes.js";
import { offBook } from "../src/curriculum.js";
import { noteChain, chainMistakes } from "../src/mistake.js";

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const T = parseTemplates(src("imo26-templates.md"));
const OUT = parseOutcomes(src("outcomes.md"));
const note = (b) => parseVars("```vars\n" + b + "\n```\n");
const route = (re) => T.find((t) => t.name === "fakeproof").variants.find((v) => re.test(v.label));
function fill(re, b) {
  const vars = note(b);
  const r = route(re);
  const qs = textQuestions(r.body, vars, (v) => toLatex(v), (l) => resolveAny(l, vars, { body: r.body, command: "fakeproof" }));
  return fillTextAnswers(r.body, Object.fromEntries(qs.map((q) => [q.key, q.value])), qs);
}
const stars = (b) => T.find((t) => t.name === "fakeproof").variants
  .filter((v) => routeFit(v, note(b), { command: "fakeproof", endings: OUT.get("fakeproof") })?.best).map((v) => v.label.split(" (")[0]);
const EX22 = "chain = a = b \\iff a^2 = ab \\iff a^2 - b^2 = ab - b^2 \\iff (a+b)(a-b) = b(a-b) \\iff a + b = b \\iff 2b = b \\iff 2 = 1";

test("E11: Exercise 2.2 (2 = 1): the step that divides by a − b, which the first line makes 0", () => {
  const M = chainMistakes(noteChain(note(EX22)));
  assert.deepEqual(M.map((m) => [m.i, m.kind]), [[1, "onlyif"], [4, "div0"]]);
  const md = fill(/^division by zero/, EX22);
  assert.match(md, /going from \$\(a\+b\)\(a-b\) = b\(a-b\)\$ to \$a \+ b = b\$ divides by \$a - b\$, which is \$0\$ because the first line, \$a = b\$, says exactly that/);
  assert.match(fill(/^⇐ used/, EX22), /for \$a = 0, b = 1\$ the line \$a\^2 = ab\$ is true \(\$0 = 0\$\) but \$a = b\$ is false/);
  assert.deepEqual(stars(EX22), ["division by zero", "⇐ used where only ⇒ holds"]);
  assert.doesNotMatch(md, /\{\{/);
});

test("E11: squaring is only ⇒ (Def 1.18); a correct chain has no mistake", () => {
  const b = "chain = x = -1 \\iff x^2 = 1";
  assert.deepEqual(stars(b), ["⇐ used where only ⇒ holds"]);
  assert.match(fill(/^⇐ used/, b), /for \$x = 1\$ the line \$x\^2 = 1\$ is true/);
  assert.deepEqual(chainMistakes(noteChain(note("chain = 2x + 1 = 5 \\iff 2x = 4 \\iff x = 2"))), []);
});

test("E11: Exercise 1.89: the fake induction breaks between n = 1 and n = 2", () => {
  const b = "P(n) = 2^n = 2";
  assert.deepEqual(stars(b), ["induction step fails for a small n"]);
  const md = fill(/^induction step/, b);
  assert.match(md, /\$P\(1\)\$ is true but \$P\(2\)\$ is false: \$4 \\neq 2\$; for example, using \$P\(n - 1\)\$ needs \$P\(0\)\$ when \$n = 1\$\), which fails for \$n = 1\$/);
  assert.deepEqual(offBook(md + fill(/^division by zero/, EX22)), []);
});
