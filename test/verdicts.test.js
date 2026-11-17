// Verdicts for sets, limits, KKT and SVM: the ★ route and the references.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseVars } from "../src/vars.js";
import * as cas from "../src/cas.js";
import { parseTemplates } from "../src/templates.js";
import { routeFit } from "../src/witness.js";
import { setVerdict, limitVerdict, kktVerdict, svmVerdict } from "../src/verdicts.js";
import { citeFromResult, pyItems } from "../src/resultrefs.js";
import REFS1 from "../src/refs/imo26.json" with { type: "json" };
import REFS2 from "../src/refs/imo26-extra.json" with { type: "json" };

const REFS = [...REFS1, ...REFS2];
const T = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
const note = (body) => parseVars("```vars\n" + body + "\n```\n");
const tmpl = (name) => T.find((t) => t.name === name);
// The route the picker stars for this note.
const star = (name, vars) => tmpl(name).variants.find((v) => routeFit(v, vars, { command: name })?.best)?.label || null;
const cites = (name, vars, re = /./) => {
  const t = tmpl(name);
  const r = t.variants.find((v) => re.test(v.label));
  return citeFromResult(name, [t.desc, r.label, r.body], REFS, vars, {}, r.body, r.label).map((i) => i.label);
};

test("sets: open / closed / bounded / compact", () => {
  const disc = note("S = \\{(x, y) \\mid x^2 + y^2 \\le 1\\}");
  assert.deepEqual(pick(setVerdict(disc)), { open: false, closed: true, bounded: true, compact: true });
  const half = note("U = \\{(x, y) \\mid x + y < 1\\}");
  assert.deepEqual(pick(setVerdict(half)), { open: true, closed: false, bounded: false, compact: false });
  const strip = note("S = \\{(x, y) \\mid 0 \\le x \\le 1\\}");
  assert.deepEqual(pick(setVerdict(strip)), { open: false, closed: true, bounded: false, compact: false });
  const box = note("S = \\{(x, y) \\mid 0 \\le x \\le 1, 0 \\le y \\le 2\\}");
  assert.equal(setVerdict(box).compact, true);
  const I = note("I = [0, 1)");
  assert.deepEqual(pick(setVerdict(I)), { open: false, closed: false, bounded: true, compact: false });
  // Not decidable: no verdict.
  assert.equal(setVerdict(note("S = \\{(x, y) \\mid x y \\le 1, x < 2\\}")).closed, null);
});
function pick(V) { return { open: V.open, closed: V.closed, bounded: V.bounded, compact: V.compact }; }

test("sets: the ★ route follows the verdict", () => {
  const disc = note("S = \\{(x, y) \\mid x^2 + y^2 \\le 1\\}");
  assert.match(star("compact", disc), /^closed \+ bounded/);
  assert.match(star("closedset", disc), /^preimage/);
  assert.match(star("openset", disc), /^NOT open/);
  assert.match(star("bounded", disc), /radius/);
  assert.match(star("evt", disc), /compact \+ continuous/);
  const strip = note("S = \\{(x, y) \\mid 0 \\le x \\le 1\\}");
  assert.match(star("compact", strip), /^NOT compact/);
  assert.match(star("bounded", strip), /^NOT bounded/);
  assert.match(star("evt", strip), /fails/);
  const two = note("U = \\{(x, y) \\mid x > 0, y > 0\\}");
  assert.match(star("openset", two), /union \/ intersection/);
  // References: not bounded cites Remark 5.34, not 5.35.
  const c = cites("bounded", strip, /^NOT bounded/);
  assert.ok(c.includes("Remark 5.34") && !c.includes("Remark 5.35"));
  const k = cites("compact", strip, /^NOT compact/);
  assert.ok(k.includes("Definition 5.33") && !k.includes("Proposition 5.69"));
});

test("limits: continuous / cancel / does not exist", () => {
  assert.equal(limitVerdict(note("f(x) = x^2 + 1\na = 2")).kind, "continuous");
  assert.equal(limitVerdict(note("f(x) = \\frac{x^2 - 1}{x - 1}\na = 1")).kind, "cancel");
  assert.equal(limitVerdict(note("f(x) = \\frac{1}{x}\na = 0")).kind, "none");
  assert.match(star("limit", note("f(x) = x^2 + 1\na = 2")), /^continuity/);
  assert.match(star("limit", note("f(x) = \\frac{x^2 - 1}{x - 1}\na = 1")), /^cancel/);
  assert.match(star("limit", note("f(x) = \\frac{1}{x}\na = 0")), /NOT exist/);
  // Does not exist: no Definition 5.65 (continuity) in the references.
  const c = cites("limit", note("f(x) = \\frac{1}{x}\na = 0"), /NOT exist/);
  assert.ok(c.includes("Definition 5.62") && !c.includes("Definition 5.65"));
  const p = cites("limit", note("f(x) = x^2 + 1\na = 2"), /^continuity/);
  assert.ok(p.includes("Definition 5.65"));
});

test("KKT: optimum, multipliers, strict feasibility", () => {
  // min x^2 + y^2 s.t. 1 - x - y <= 0: optimum (1/2, 1/2), mu = 1.
  const K = kktVerdict(note("f(x, y) = x^2 + y^2\ng1(x, y) = 1 - x - y"));
  assert.deepEqual(K.point.map((x) => cas.tex(x)), ["\\frac{1}{2}", "\\frac{1}{2}"]);
  assert.deepEqual(K.mu.map((x) => cas.tex(x)), ["1"]);
  assert.equal(K.allZero, false);
  assert.equal(K.strictlyFeasible, true);
  assert.match(star("kkt", note("f(x, y) = x^2 + y^2\ng1(x, y) = 1 - x - y")), /case analysis/);
  // Unconstrained minimum (0, 0) is feasible: all λ = 0.
  const Z = note("f(x, y) = x^2 + y^2\ng1(x, y) = x - 1");
  assert.equal(kktVerdict(Z).allZero, true);
  assert.match(star("kkt", Z), /all λ = 0/);
  assert.ok(cites("kkt", Z, /all λ = 0/).includes("Exercise 9.43"));
  // x <= 0 and -x <= 0: no point with both < 0.
  const N = note("f(x, y) = x^2 + y^2\ng1(x, y) = x\ng2(x, y) = -x");
  assert.equal(kktVerdict(N).strictlyFeasible, false);
  assert.match(star("kkt", N), /not strictly feasible/);
});

test("SVM: separable or not (exact), from the note or the python form", () => {
  const sep = note("X = [[2, 1], [3, 2], [-1, -1], [-2, 0]]\nl = (1, 1, -1, -1)");
  assert.equal(svmVerdict(sep).separable, true);
  assert.match(star("svm", sep), /optimal separating/);
  const xor = note("X = [[0, 0], [1, 1], [0, 1], [1, 0]]\nl = (1, 1, -1, -1)");
  assert.equal(svmVerdict(xor).separable, false);
  assert.match(star("svm", xor), /^NOT separable/);
  const c = cites("svm", xor, /^NOT separable/);
  assert.ok(c.includes("Exercise 5.9") && !c.includes("Theorem 9.8"));
  // Python: the points typed into the form.
  const py = pyItems({ name: "svm", desc: "optimal separating hyperplane (Sec 9.1, 9.2)" }, { label: "" }, [], { "points X": "[[0,0],[1,1],[0,1],[1,0]]", "labels +-1": "[1,1,-1,-1]" }, new Map(), REFS).map((i) => i.label);
  assert.ok(py.includes("Exercise 5.9") && !py.includes("Theorem 9.8"));
});
