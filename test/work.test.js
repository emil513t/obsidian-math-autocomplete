import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVars } from "../src/vars.js";
import { objectContext, OBJECTS } from "../src/objects.js";
import { workFor, WORK_OBJECTS } from "../src/work.js";

const r = String.raw;
const NOTE = "```Vars\n" + r`f(x,y) = x^3 + xy + x^3
h(x) = x^3 - 2x
p = (1, 0)
A = [[2, 1], [1, 3]]
B = [[1, 2, 0], [0, 1, 1], [1, 0, 2]]` + "\n```\n";
const ctx = objectContext(parseVars(NOTE));

test("worked solution: Hessian shows the simplification, each partial and the matrix", () => {
  const md = workFor("hessian", "f:f", ctx);
  assert.match(md, /f\(x, y\) = x\^3 \+ xy \+ x\^3 = 2x\^3 \+ xy/);
  assert.match(md, /f_\{xx\} &= .* = 12x/);
  assert.match(md, /Definition 8\.2/);
  assert.match(md, /\\begin\{pmatrix\} 12x & 1 \\\\ 1 & 0 \\end\{pmatrix\}/);
});

test("worked solution: Hessian at a point plugs in, checks the gradient and classifies", () => {
  const md = workFor("hessian", "fp:f:p", ctx);
  assert.match(md, /f_\{xx\}\(1, 0\) &= 12\(1\) = 12/);
  assert.match(md, /not a critical point/);
});

test("worked solution: inverse via Gauss-Jordan with readable row operations", () => {
  const md = workFor("inverse", "A:A", ctx);
  assert.match(md, /\\det A = 2 \\cdot 3 - 1 \\cdot 1 = 5/);
  assert.match(md, /R_\{2\} \\to R_\{2\} - R_\{1\}/);
  assert.match(md, /R_\{2\} \\to \\frac\{2\}\{5\} R_\{2\}/);
});

test("worked solution: 3x3 determinant by cofactor expansion; 2x2 eigenvalues by the quadratic formula", () => {
  assert.match(workFor("determinant", "A:B", ctx), /= 1 \\cdot 2 - 2 \\cdot \\left\(-1\\right\) \+ 0 \\cdot \\left\(-1\\right\) = 4/);
  assert.match(workFor("eigenvalues", "A:A", ctx), /\\sqrt\{5\}/);
});

test("worked solution: every computing option of every object produces steps", () => {
  const answers = { n: "3", a: "0", k: "3", x0: "1", f: "x^2 y", A: "[[1, 2], [3, 4]]", B: "[[0, 1], [1, 0]]", F: "x^2 y; x + y", p: "(1, 0)" };
  let n = 0;
  for (const obj of OBJECTS.filter((o) => WORK_OBJECTS.includes(o.name))) {
    for (const o of obj.options(ctx)) {
      if (o.error || /^gen|^size-|^def$|^kkt$|^fall:|^ask:|^own|^ap:|^t2:/.test(o.id)) continue;
      assert.ok(workFor(obj.name, o.id, ctx, answers), `${obj.name}:${o.id}`);
      n++;
    }
  }
  assert.ok(n > 50, `only ${n}`);
});

test("every command: every option builds (variable names typed in fields) and every variable is offered or listed with a reason", async () => {
  const { resolveAnswers } = await import("../src/objects.js");
  const note = "```Vars\n" + [
    "h(x) = x^3 - 2x", "f(x,y) = x^3 + xy + y^2", "A = x^4 + xy + y^3", "k(x,y,z) = x y z + z^2",
    "S2 = [[2, 1], [1, 3]]", "S3 = [[1, 2, 0], [0, 1, 1], [1, 0, 2]]", "B = [[1, 2, 3], [4, 5, 6]]",
    "p = (1, 0)", "q = (1, 2, 3)", "u = [1, 2]", "w = [3, 4]", "F = [x^2 y, x + y]",
    "e1 = 2x + y + z = 7", "e2 = x + 2y + z = 8", "e3 = x + y + 2z = 9",
    "c1 = 2x + y \\le 6", "c2 = x + 2y \\le 6", "c3 = x \\ge 0",
    "P(n) = \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}",
  ].join("\n") + "\n```\n";
  const vars = parseVars(note);
  const c = objectContext(vars);
  // The new commands find the note's equations, inequalities and statements.
  const ids = (name) => OBJECTS.find((o) => o.name === name).options(c).map((o) => o.id);
  assert.ok(ids("gauss").includes("gs:eq:e1, e2, e3"), ids("gauss").join());
  assert.ok(ids("fouriermotzkin").includes("fm1:x"), ids("fouriermotzkin").join());
  assert.ok(ids("induction").includes("ind:P"), ids("induction").join());
  const FN = ["hessian", "gradient", "partial", "laplacian", "tangentplane", "directional", "critical", "derivative", "taylor", "evaluate", "jacobian", "quadform"];
  const MAT = ["inverse", "transpose", "rref", "adjugate", "symmetricpart", "determinant", "trace", "rank", "charpoly", "eigenvalues", "matpower", "quadform", "interpolate"];
  const expect = { h: FN, f: FN, A: FN, k: FN, S2: MAT, S3: MAT, B: MAT };
  const seen = {};
  const bad = [];
  for (const obj of OBJECTS) {
    for (const o of obj.options(c)) {
      for (const n of Object.keys(expect)) if (new RegExp(`(^|[^A-Za-z0-9_])${n}([^A-Za-z0-9_]|$)`).test(`${o.id} ${o.label}`)) (seen[n] ||= new Set()).add(obj.name);
      if (o.error || !o.ask) continue;
      const a = {};
      for (const q of o.ask) {
        a[q.key] = q.value ?? "";
        if (q.key === "f") a.f = "A";
        if (q.key === "A" || q.key === "B") a[q.key] = "S2";
        if (q.key === "F") a.F = "f; A";
        if (q.key === "p") a.p = /x, y, z/.test(q.label) ? "q" : /x, y/.test(q.label) || q.label === "Point" ? "p" : /\(x\)/.test(q.label) ? "(1)" : "(0, 1), (1, 3), (2, 7)";
        if (q.key === "d") a.d = /2 numbers/.test(q.label) ? "u" : /3 numbers/.test(q.label) ? "q" : "(1)";
        if (q.key === "x0") a.x0 = "1";
        if (q.key === "r") a.r = "1, 2";
        if (q.key === "e") a.e = /Inequalities/.test(q.label) ? "c1; c2; c3" : /Equations/.test(q.label) ? "e1; e2; e3" : "(x + 1)^2";
        if (q.key === "s") a.s = "P";
        if (q.key === "p" && q.label === "Variable") a.p = "n";
        if (q.key === "x" && /eliminate/.test(q.label)) a.x = "x";
      }
      try { o.build(resolveAnswers(o.ask, a, vars)); } catch (e) { bad.push(`${obj.name}:${o.id} -> ${e.message}`); }
    }
  }
  for (const [n, objs] of Object.entries(expect)) {
    const miss = objs.filter((o) => !(seen[n] || new Set()).has(o));
    if (miss.length) bad.push(`${n} missing from ${miss.join(", ")}`);
  }
  assert.deepEqual(bad, []);
});

test("Gauss, Fourier-Motzkin and induction reproduce the book's examples (2.6), (4.10), (1.18)", async () => {
  const { gauss, parseIneqs, fmStep, inductionSteps } = await import("../src/elim.js");
  const { findRelation } = await import("../src/vars.js");
  const cas = await import("../src/cas.js");
  const n = (x) => cas.tex(x);
  // (2.6): x = 1, y = 2, z = 3, the only solution.
  const g = gauss([[2, 1, 1, 7], [1, 2, 1, 8], [1, 1, 2, 9]].map((r) => r.map((v) => cas.num(v))), ["x", "y", "z"]);
  assert.equal(g.kind, "unique");
  assert.deepEqual(g.values.map(n), ["1", "2", "3"]);
  // (4.10): eliminating x and y leaves 1 <= z <= 4.
  let cur = parseIneqs(["z = x + y", "2x + y \\le 6", "x + 2y \\le 6", "x + 2y \\ge 2", "x \\ge 0", "y \\ge 0"]);
  for (const x of ["x", "y"]) cur = fmStep(cur, ["x", "y", "z"], x).next;
  const last = fmStep(cur, ["z"], "z");
  const num = (b) => { const c = cas.constValue(b); return c.n / c.d; };
  assert.equal(Math.max(...last.lower.map((q) => num(q.b))), 1);
  assert.equal(Math.min(...last.upper.map((q) => num(q.b))), 4);
  // (1.18) proved; a wrong formula is caught; 2^n >= n + 1 and n! >= 2^n (n >= 4) proved.
  const proof = (s, n0) => inductionSteps(findRelation(s), "n", n0).map((x) => x.text || "").join(" ");
  assert.match(proof(String.raw`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`, 1), /blacksquare/);
  assert.match(proof(String.raw`\sum_{k=1}^{n} k = n^2`, 1), /fails/);
  assert.match(proof(String.raw`2^n \ge n + 1`, 1), /blacksquare/);
  assert.match(proof(String.raw`n! \ge 2^{n}`, 4), /blacksquare/);
  assert.match(proof(String.raw`\sum_{k=0}^{n} 2^k = 2^{n+1} - 1`, 0), /blacksquare/);
});

test("every book reference in the plugin exists in the book with the right kind", async () => {
  const fsm = await import("node:fs");
  const dir = new URL("../src/", import.meta.url);
  const refs = JSON.parse(fsm.readFileSync(new URL("refs/imo26.json", dir), "utf8"));
  const extra = JSON.parse(fsm.readFileSync(new URL("refs/imo26-extra.json", dir), "utf8"));
  const have = new Set([...refs.map((r) => `${r.kind.slice(0, 3)}:${r.num}`), ...extra.filter((r) => r.kind === "section").map((r) => `sec:${r.num}`)]);
  const KIND = { Def: "def", Definition: "def", Thm: "the", Theorem: "the", Prop: "pro", Proposition: "pro", Lemma: "lem", Lem: "lem", Corollary: "cor", Cor: "cor", Remark: "rem", Section: "sec", Sec: "sec" };
  const bad = [];
  for (const f of fsm.readdirSync(dir).filter((f) => /\.(js|md)$/.test(f))) {
    const text = fsm.readFileSync(new URL(f, dir), "utf8");
    for (const m of text.matchAll(/\b(Definition|Theorem|Proposition|Lemma|Corollary|Remark|Section|Def|Thm|Prop|Sec|Lem|Cor)s?\.?\s+(\d+(?:\.\d+){1,2})/g)) {
      if (!have.has(`${KIND[m[1]]}:${m[2]}`)) bad.push(`${f}: ${m[1]} ${m[2]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("convexity: decided with the book's tests for standard functions", async () => {
  const fns = {
    a: ["a(x) = x^4", "strictly convex"], b: ["b(x) = x^2 + e^{x}", "strictly convex"], c: ["c(x) = x^3", "not convex"],
    d: ["d(x) = 2x + 1", "not strictly convex"], f: ["f(x,y) = x^2 + xy + y^2", "strictly convex"], g: ["g(x,y) = x^4 + y^2", "convex"],
    h: ["h(x,y) = x^3 + y^2", "not convex"], k: ["k(x,y) = e^{x+y}", "convex"], m: ["m(x,y) = x^2 y^2", "not convex"], r: ["r(x,y) = x^2 - y^2", "not convex"],
  };
  const c = objectContext(parseVars("```vars\n" + Object.values(fns).map((x) => x[0]).join("\n") + "\n```\n"));
  for (const [n, [def, verdict]] of Object.entries(fns)) {
    const md = workFor("convexity", `f:${n}`, c, {});
    assert.ok(md.includes(`**${verdict}**`), `${def}: expected ${verdict}\n${md}`);
  }
  assert.match(workFor("convexity", "f:a", c, {}), /Theorem 6\.54/);
  assert.match(workFor("convexity", "f:f", c, {}), /Theorem 8\.25/);
});
