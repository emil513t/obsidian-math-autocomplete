// E11 of docs/imo26-coverage/CONTRADICTIONS.md: find the mistake, from the
// note's own argument.
//   - a chain of steps S_0 ⇔ S_1 ⇔ ... (or ⇒): try values for the letters;
//     a step where the line before is true and this line is false is a wrong
//     "⇒"; when the two lines differ by a factor q (S_{i-1} is q times S_i)
//     and q = 0 there, the step divided by 0 (Exercise 2.2: a − b = 0). A step
//     written ⇔ where this line is true and the line before false is a ⇐ that
//     does not hold (Definition 1.18).
//   - a fake induction (Exercise 1.89): P(n0) true and P(n0 + 1) false, so the
//     induction step fails at n = n0 (Theorem 1.86).
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { findRelation } from "./vars.js";
import { firstFailure } from "./endings.js";

const T = (x) => cas.tex(x);
const ev = (x, env) => { try { return cas.evaluate(x, env); } catch (_) { return NaN; } };
const CONN = /\\iff(?![A-Za-z])|\\Leftrightarrow(?![A-Za-z])|\\Longleftrightarrow(?![A-Za-z])|⟺|⇔|<=>|\\Rightarrow(?![A-Za-z])|\\implies(?![A-Za-z])|\\Longrightarrow(?![A-Za-z])|⇒|=>/g;
const isIff = (c) => /iff|Leftrightarrow|⟺|⇔|<=>/.test(c);

// The chain in the note: a value with ⇔ / ⇒ between relations.
export function noteChain(vars) {
  if (!(vars instanceof Map)) return null;
  const re = () => new RegExp(CONN.source, "g"); // fresh each time: a shared /g regex keeps its position
  const vs = [...vars.values()].filter((v) => !v.error && typeof v.value === "string" && re().test(v.value));
  const v = vs.find((x) => /^(chain|argument|proof|steps)$/.test(x.name)) || vs[0];
  if (!v) return null;
  const text = String(v.value);
  const conns = [...text.matchAll(re())].map((m) => m[0]);
  const parts = text.split(re()).map((s) => s.trim());
  if (parts.length < 2) return null;
  const steps = parts.map((s) => {
    const r = findRelation(s);
    if (!r) return null;
    const l = cas.tryParse(r.lhs); const rr = cas.tryParse(r.rhs);
    return l && rr ? { tex: s, op: String(r.op).replace(/^\\/, ""), l, r: rr, d: cas.sub(l, rr) } : null;
  });
  if (steps.some((s) => !s)) return null;
  return { name: v.name, steps, conns };
}

function truth(S, env) {
  const a = ev(S.l, env); const b = ev(S.r, env);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const o = S.op;
  if (o === "=") return Math.abs(a - b) < 1e-9;
  if (/^(ne|neq|!=)$/.test(o)) return Math.abs(a - b) > 1e-9;
  if (/^(le|leq|<=)$/.test(o)) return a <= b + 1e-9;
  if (/^(ge|geq|>=)$/.test(o)) return a >= b - 1e-9;
  if (o === "<" || o === "lt") return a < b;
  if (o === ">" || o === "gt") return a > b;
  return null;
}
const VALS = [1, 2, 0, -1, 3, -2, 0.5];
function assignments(xs) {
  const g = (k) => (k === 0 ? [[]] : g(k - 1).flatMap((t) => VALS.map((v) => [...t, v])));
  return xs.length > 3 ? [] : g(xs.length).map((p) => Object.fromEntries(xs.map((x, i) => [x, p[i]])));
}
const envTex = (e) => Object.entries(e).map(([k, v]) => `${k} = ${Number.isInteger(v) ? v : T(cas.num(Math.round(v * 2), 2))}`).join(", ");
const valTex = (S, e) => {
  const sub = (x) => { const y = cas.subs(x, Object.fromEntries(Object.entries(e).map(([k, v]) => [k, Number.isInteger(v) ? cas.num(v) : cas.num(Math.round(v * 2), 2)]))); return T(y); };
  return `${sub(S.l)} ${{ "=": "=", ne: "\\neq", neq: "\\neq", le: "\\le", leq: "\\le", ge: "\\ge", geq: "\\ge", "<": "<", ">": ">" }[S.op] || S.op} ${sub(S.r)}`;
};

// The mistakes of the chain, in order: { i (step S_{i-1} → S_i), kind: "div0" | "onlyif" | "invalid", env, q }.
export function chainMistakes(C) {
  const xs = cas.orderVars(new Set(C.steps.flatMap((s) => [...cas.symbols(s.d)])));
  const envs = assignments(xs);
  const out = [];
  // Values that make the first line true: the argument starts there.
  const starts = envs.filter((e) => truth(C.steps[0], e) === true);
  for (let i = 1; i < C.steps.length; i++) {
    const A = C.steps[i - 1]; const B = C.steps[i];
    // A step may use every line before it: the values must make all of them true.
    const fwd = starts.find((e) => C.steps.slice(0, i).every((S) => truth(S, e) === true) && truth(B, e) === false);
    if (fwd) {
      // S_{i-1} = q · S_i (sides moved over): the step divided both sides by q.
      let q = null;
      try {
        const r = cas.div(A.d, B.d);
        const polyLike = !/\\frac|\^\{-/.test(T(r));
        if (polyLike && cas.symbols(r).size) q = r;
      } catch (_) { q = null; }
      const qz = q && Math.abs(ev(q, fwd)) < 1e-9;
      out.push({ i, kind: qz ? "div0" : "invalid", env: fwd, q: qz ? q : null, A, B });
      break; // from here on the argument proves nothing

    }
    if (isIff(C.conns[i - 1])) {
      const back = envs.find((e) => truth(B, e) === true && truth(A, e) === false);
      if (back) out.push({ i, kind: "onlyif", env: back, A, B });
    }
  }
  return out;
}

// Fake induction: P(n0) holds, the first n where it fails is n0 + k.
export function inductionMistake(vars) {
  const f = firstFailure(vars);
  if (!f) return null;
  const n0v = vars.get("n0") || vars.get("n_0");
  const n0 = n0v ? Number(n0v.value) : 1;
  return f.n > n0 ? { ...f, prev: f.n - 1 } : null;
}

// Template blanks of \fakeproof. undefined: not one of these blanks.
export function resolveMistakeLabel(label, vars, ctx = {}) {
  if (!(vars instanceof Map)) return undefined;
  const l = label.trim();
  const body = ctx.body || "";
  const route = /divides by \$\{\{expression\}\}\$/.test(body) ? "div0" : /cannot be read backwards/.test(body) ? "onlyif" : /from this step on the argument proves nothing/.test(body) ? "invalid" : /Theorem 1\.86 does not apply/.test(body) ? "ind" : null;
  if (!route) return undefined;
  if (route === "ind") {
    if (!/^(n|assumption, e\.g\. two overlapping groups)$/.test(l)) return undefined;
    const M = inductionMistake(vars);
    if (!M) return null;
    const from = `@${M.P.name}: P(n) checked for n = ${M.prev} and ${M.n}`;
    if (l === "n") return { value: String(M.prev), from };
    const p = M.P.params[0];
    return { value: `a case it does not have ($P(${M.prev})$ is true but $P(${M.n})$ is false: $${T(M.l)} \\neq ${T(M.r)}$${M.prev === 1 ? `; for example, using $P(${p} - 1)$ needs $P(0)$ when $${p} = 1$` : ""})`, prose: true, from };
  }
  const labels = { div0: /^(before|after|expression|reason)$/, onlyif: /^(A|B|an example where ⇐ fails)$/, invalid: /^(step|why that inference is not valid)$/ };
  if (!labels[route].test(l)) return undefined;
  const C = noteChain(vars);
  if (!C) return null;
  const all = chainMistakes(C);
  const M = all.find((m) => m.kind === route) || (route === "invalid" ? all.find((m) => m.kind !== "onlyif") : null);
  if (!M) return null;
  const from = `@${C.name}: step ${M.i}, values tried for the letters`;
  if (route === "div0") {
    if (l === "before") return { value: M.A.tex, from };
    if (l === "after") return { value: M.B.tex, from };
    if (l === "expression") return { value: T(M.q), from };
    // Is q = 0 for every choice that makes the first line true?
    const xs = cas.orderVars(new Set(C.steps.flatMap((s) => [...cas.symbols(s.d)])));
    const starts = assignments(xs).filter((e) => truth(C.steps[0], e) === true);
    const always = starts.length && starts.every((e) => Math.abs(ev(M.q, e)) < 1e-9);
    return { value: always ? `the first line, $${C.steps[0].tex}$, says exactly that ($${T(M.q)} = 0$ whenever it holds)` : `it is $0$ for $${envTex(M.env)}$, where $${M.A.tex}$ holds ($${valTex(M.A, M.env)}$) but $${M.B.tex}$ does not ($${valTex(M.B, M.env)}$)`, prose: true, from };
  }
  if (route === "onlyif") {
    if (l === "A") return { value: M.A.tex, from };
    if (l === "B") return { value: M.B.tex, from };
    return { value: `for $${envTex(M.env)}$ the line $${M.B.tex}$ is true ($${valTex(M.B, M.env)}$) but $${M.A.tex}$ is false ($${valTex(M.A, M.env)}$)`, prose: true, from };
  }
  if (l === "step") return { value: `${M.A.tex} \\Rightarrow ${M.B.tex}`, from };
  return { value: `for $${envTex(M.env)}$ the line before is true ($${valTex(M.A, M.env)}$) but this line is false ($${valTex(M.B, M.env)}$)${M.q ? `; the step divided by $${T(M.q)}$, which is $0$ there` : ""}`, prose: true, from };
}

// For the ★: every kind of mistake the note's argument has.
export function mistakeVerdict(vars) {
  const C = noteChain(vars);
  if (C) {
    const ks = [...new Set(chainMistakes(C).map((m) => m.kind))].filter((k) => k !== "invalid");
    if (ks.length) return ks;
  }
  return inductionMistake(vars) ? ["ind"] : null;
}
