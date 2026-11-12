// Python "evidence" for text templates: the blanks a text template computed
// from the note's variables ({{Hessian}}, {{gradient}}, {{f_x}}, {{diagonal}},
// {{definiteness}}, {{check the base case}}, ...) are recomputed in a sympy
// block inserted under the text, so the note shows where each value came from.
// Pure, no Obsidian imports.
import * as cas from "./cas.js";
import { latexToPy } from "./vars.js";
import {
  mainFn, fnByName, statementVar, pointVar, pointExprs, n0Var, AT_LABELS, CONCLUSION, substituteTex,
} from "./textlink.js";

const pyName = (n, fallback) => (/^[A-Za-z_]\w*$/.test(n) ? n : fallback);
const pyOf = (x, vars) => latexToPy(cas.tex(x, vars));
const isConstMatrix = (M) => M.every((r) => r.every((x) => cas.isZero(x) || cas.constValue(x)));

// The book's symmetric reduction (same steps as textlink.diagonalOf).
const SYMRED = `def symmetric_reduction(A):
    """Diagonal D of B^T A B = D by row-and-column operations (IMO26 Section 3.7.3)."""
    A = sp.Matrix(A)
    n = A.rows
    def add_to(i, j, c):  # row i += c row j, then column i += c column j
        A[i, :] = A[i, :] + c * A[j, :]
        A[:, i] = A[:, i] + c * A[:, j]
    for k in range(n):
        if A[k, k] == 0:
            d = next((j for j in range(k + 1, n) if A[j, j] != 0), None)
            if d is not None:
                A.row_swap(k, d)
                A.col_swap(k, d)
            else:
                j = next((j for j in range(k + 1, n) if A[k, j] != 0), None)
                if j is None:
                    continue
                add_to(k, j, 1)
        for i in range(k + 1, n):
            if A[i, k] != 0:
                add_to(i, k, -A[i, k] / A[k, k])
    return [A[i, i] for i in range(n)]`;

const DEFINITENESS = `def definiteness(D):
    if all(d > 0 for d in D):
        return "positive definite"
    if all(d < 0 for d in D):
        return "negative definite"
    if any(d > 0 for d in D) and any(d < 0 for d in D):
        return "indefinite"
    return "undecided (a zero on the diagonal)"`;

// One side of a statement as sympy: \sum_{k=1}^{n} body -> sp.summation.
function sidePy(tex, syms) {
  const m = tex.trim().match(/^\\(sum|prod)_\{\s*([a-z])\s*=\s*([^{}]+)\}\^\{?([^{}\s]+|[^{}]+)\}?\s*([\s\S]+)$/);
  if (!m) return latexToPy(tex);
  syms.add(m[2]);
  const fn = m[1] === "sum" ? "summation" : "product";
  return `sp.${fn}(${latexToPy(m[5])}, (${m[2]}, ${latexToPy(m[3])}, ${latexToPy(m[4])}))`;
}

// labels: the computed blanks of the inserted text. ctx: { fn, point } picked in the form.
// Returns the code of a python block (without the fence), or "" when nothing is computable.
export function evidencePy(labels, vars, ctx = {}) {
  const head = [];   // symbols and inputs
  const body = [];   // the computations
  const done = new Set();
  const helpers = new Set();
  const syms = new Set();
  const once = (key, fn) => { if (!done.has(key)) { done.add(key); fn(); } };

  const F = mainFn(vars, ctx);
  const useF = (G = F) => {
    if (!G) return null;
    const n = pyName(G.v.name, "f");
    G.vars.forEach((v) => syms.add(v));
    once(`fn:${n}`, () => head.push(`${n} = ${pyOf(G.x, G.vars)}`, `print("${n}(${G.vars.join(", ")}) =", ${n})`));
    return n;
  };
  const tuple = (G) => (G.vars.length === 1 ? `(${G.vars[0]},)` : `(${G.vars.join(", ")})`);
  const hess = () => { const n = useF(); once("H", () => body.push(`H = sp.hessian(${n}, ${tuple(F)})`, `print("Hessian of ${n}:", H)`)); };
  const grad = () => { const n = useF(); once("grad", () => body.push(`grad = sp.Matrix([sp.diff(${n}, v) for v in ${tuple(F)}])`, `print("gradient of ${n}:", grad.T)`)); };

  // The at-point chain: H at the point -> D -> definiteness -> conclusion.
  const atPoint = (kind) => {
    if (!F) return;
    hess();
    const constant = isConstMatrix(cas.hessian(F.x, F.vars));
    const P = constant ? null : pointVar(vars, ctx, F.vars.length);
    if (!constant && !P) return;
    once("Hp", () => {
      if (constant) { body.push("H0 = H  # constant: the same at every point"); return; }
      grad();
      const pt = pointExprs(P).map((x) => pyOf(x));
      const pn = pyName(P.name, "p0");
      head.push(`${pn} = {${F.vars.map((v, i) => `${v}: ${pt[i]}`).join(", ")}}`);
      body.push(
        `print("gradient at ${P.name}:", grad.subs(${pn}).T, "-> critical point:", all(g == 0 for g in grad.subs(${pn})))`,
        `H0 = H.subs(${pn})`,
        `print("Hessian at ${P.name}:", H0)`,
      );
    });
    if (kind === "H") return;
    helpers.add(SYMRED);
    once("D", () => body.push("D = symmetric_reduction(H0)", 'print("diagonal D (symmetric reduction):", D)'));
    if (kind === "D") return;
    helpers.add(DEFINITENESS);
    once("def", () => body.push("kind = definiteness(D)", 'print("so H is", kind)'));
    if (kind === "def") return;
    once("end", () => body.push(
      `conclusion = ${JSON.stringify(CONCLUSION)}.get(kind, "no conclusion from the Hessian test")`,
      `print("Hessian test (Theorem 8.12): ${constant ? "every critical point" : P.name} is a", conclusion)`,
    ));
  };

  for (const raw of labels) {
    const l = raw.trim();
    try {
      const at = AT_LABELS.find(([, re]) => re.test(l))?.[0];
      if (at) { atPoint(at); continue; }
      if (/^(hessian|hesse|H|nabla\^?2 ?f|\\nabla\^2 ?f)$/i.test(l)) { if (F) hess(); continue; }
      if (/^(gradient|grad|nabla ?f|\\nabla ?f)$/i.test(l)) { if (F) grad(); continue; }
      let m = l.match(/^([A-Za-z])_\{?([a-z]{1,3})\}?$/);
      if (m) {
        const G = fnByName(vars, m[1]);
        if (!G || ![...m[2]].every((c) => G.vars.includes(c))) continue;
        const n = useF(G);
        once(`d:${l}`, () => body.push(`print("${n}_${m[2]} =", sp.diff(${n}, ${[...m[2]].join(", ")}))`));
        continue;
      }
      m = l.match(/^([A-Za-z])('+)$/);
      if (m) {
        const G = fnByName(vars, m[1]);
        if (!G || G.vars.length !== 1) continue;
        const n = useF(G);
        once(`d:${l}`, () => body.push(`print("${n}${m[2]}(${G.vars[0]}) =", sp.diff(${n}, ${G.vars[0]}, ${m[2].length}))`));
        continue;
      }
      m = l.match(/^([A-Za-z])\((.+)\)$/);
      if (m) {
        const G = fnByName(vars, m[1]);
        if (!G) continue;
        const args = m[2].split(",").map((s) => s.trim());
        if (args.length !== G.vars.length || args.join(",") === G.vars.join(",")) continue;
        const vals = args.map((a) => { const av = vars.get(a.replace(/[{}]/g, "")); return av && av.kind === "scalar" ? av.value : a; });
        const n = useF(G);
        once(`v:${l}`, () => body.push(`print("${n}(${vals.join(", ")}) =", sp.nsimplify(${n}.subs({${G.vars.map((v, i) => `${v}: ${latexToPy(vals[i])}`).join(", ")}})))`));
        continue;
      }
      if (/^check the base cases?$/i.test(l)) {
        const P = statementVar(vars);
        if (!P || P.kind !== "relation" || !P.params || P.params.length !== 1) continue;
        const start = n0Var(vars)?.value || "1";
        const p = P.params[0];
        once("base", () => {
          const lhs = sidePy(substituteTex(P.lhs, p, start), syms);
          const rhs = sidePy(substituteTex(P.rhs, p, start), syms);
          body.push(
            `lhs = sp.nsimplify(${lhs})`,
            `rhs = sp.nsimplify(${rhs})`,
            `print("base case P(${start}): left side =", lhs, ", right side =", rhs, ", equal:", sp.simplify(lhs - rhs) == 0)`,
          );
        });
      }
    } catch (_) { /* a blank we can't reproduce in python is simply left out */ }
  }
  if (!body.length) return "";
  const symLine = syms.size ? [`${[...syms].join(", ")} = sp.symbols("${[...syms].join(" ")}")`] : [];
  return [
    "# Where the values in the text come from (recomputed with sympy)",
    "import sympy as sp",
    ...[...helpers].flatMap((h) => ["", h]),
    "",
    ...symLine,
    ...head,
    ...body,
  ].join("\n");
}
