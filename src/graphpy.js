// A ```graph block as a short matplotlib script: same lines, same window, but
// Python draws it (Code Suite runs it inline). Only what the graph uses is
// written: no input forms, no explanation prints, no unused variables.
//
//   graphToPython("f\ngradient f at p", vars) ->
//     import numpy as np
//     import matplotlib.pyplot as plt
//     f = lambda x, y: x**2 + y**2
//     ...
//     plt.show()
import * as cas from "./cas.js";
import { fnExpr, findRelation, latexToPy, casOf } from "./vars.js";
import { graphWindow, pointOf, splitList, isIneq, fnOf } from "./graph.js";

const r4 = (n) => {
  if (!Number.isFinite(n)) return "np.nan";
  const s = String(Math.round(n * 1e4) / 1e4);
  return s === "-0" ? "0" : s;
};
const pyName = (s) => (/^[A-Za-z_]\w*$/.test(s) && !["x", "y", "t", "X", "Y", "T", "np", "plt", "lambda"].includes(s) ? s : null);
const q = (s) => JSON.stringify(String(s));

// Python (numpy) for a cas expression.
const py = (x) => latexToPy(cas.tex(x), "np");
// A constant expression still has to give an array on a grid.
const arr = (x, vs) => {
  const s = py(x);
  return cas.symbols(x).size ? s : `${s} + 0*${vs[0] || "x"}`;
};

// Level curves; without given levels they are spread over the values actually
// in view (percentiles), so a function that explodes at the edges still shows
// its shape in the middle.
const levelCurves = (f, levels) => [
  `Z = ${f}(X, Y)`,
  `cs = plt.contour(X, Y, Z, ${levels || "np.unique(np.percentile(Z, np.linspace(2, 98, 15)))"})`,
  `plt.clabel(cs, fontsize=7)`,
];

export function graphToPython(src, vars = new Map()) {
  const win = graphWindow(src, vars);
  const [X0, X1] = win.X; const [Y0, Y1] = win.Y;
  const defs = [];       // f = lambda ..., p = (1, 2)
  const body = [];       // plt.... lines
  const defined = new Set();
  let grid = false; let line1 = false;
  const notes = win.errors.map((e) => `# can't draw ${e}`);

  // A note function as a lambda (constants filled in), once.
  const fnDef = (name) => {
    const F = fnOf(name, vars);
    if (!F) return null;
    if (!defined.has(name)) {
      defined.add(name);
      defs.push(`${pyName(name) || "_" + name} = lambda ${F.vars.join(", ")}: ${arr(F.x, F.vars)}`);
    }
    return { ...F, py: pyName(name) || "_" + name };
  };
  // A point: a note variable (defined once, by name) or numbers.
  const pt = (s) => {
    const t = String(s).trim();
    const p = pointOf(t, vars);
    if (!p) return null;
    const n = pyName(t);
    if (n && vars.has(t)) {
      if (!defined.has(t)) { defined.add(t); defs.push(`${n} = (${r4(p.x)}, ${r4(p.y)})`); }
      return { ...p, x0: `${n}[0]`, y0: `${n}[1]`, name: t };
    }
    return { ...p, x0: r4(p.x), y0: r4(p.y), name: null };
  };
  const exprOf = (tex) => {
    const pseudo = { name: "_", kind: "scalar", value: String(tex) };
    return fnExpr(pseudo, vars).x;
  };
  const gridXY = (x) => { grid = true; return arr(x, ["X"]).replace(/\bx\b/g, "X").replace(/\by\b/g, "Y"); };
  const ineqPy = (lhs, op, rhs) => {
    const g = cas.add(exprOf(lhs), cas.scale(exprOf(rhs), cas.Q(-1)));
    return /ge|>/.test(String(op)) ? `(${gridXY(g)} >= 0)` : `(${gridXY(g)} <= 0)`;
  };
  const region = (rels, label) => {
    const conds = rels.map((r) => ineqPy(r.lhs, r.op, r.rhs));
    body.push(`ok = ${conds.join(" & ")}`);
    body.push(`plt.contourf(X, Y, ok.astype(float), levels=[0.5, 1.5], alpha=0.3)`);
    for (const r of rels) {
      const g = cas.add(exprOf(r.lhs), cas.scale(exprOf(r.rhs), cas.Q(-1)));
      body.push(`plt.contour(X, Y, ${gridXY(g)}, levels=[0], linewidths=1)`);
    }
    if (label) body.push(`plt.plot([], [], " ", label=${q(label)})`);
  };
  const relOf = (s) => {
    const v = vars.get(String(s).trim());
    if (v && v.kind === "relation" && !v.error) return v;
    return findRelation(String(s));
  };
  const drawName = (name) => {
    const v = vars.get(name);
    if (!v || v.error) return;
    if (v.kind === "relation") {
      if (isIneq(v.op)) { region([v], `${name}: ${v.lhs} ${v.op} ${v.rhs}`); return; }
      const g = cas.add(exprOf(v.lhs), cas.scale(exprOf(v.rhs), cas.Q(-1)));
      body.push(`plt.contour(X, Y, ${gridXY(g)}, levels=[0])`);
      return;
    }
    if (v.kind === "vector") { const p = pt(name); if (p) body.push(`plt.plot(${p.x0}, ${p.y0}, "o")`, `plt.annotate(${q(name)}, ${pyName(name) || `(${p.x0}, ${p.y0})`}, textcoords="offset points", xytext=(5, 5))`); return; }
    if (v.kind === "matrix") {
      const M = casOf(v).M;
      const n = pyName(name) || "_" + name;
      defs.push(`${n} = np.array([${M.map((r) => `[${r.map((e) => r4(cas.evaluate(e, {}))).join(", ")}]`).join(", ")}])`);
      body.push(`plt.plot(${n}[:, 0], ${n}[:, 1], "o", label=${q(name)})`);
      return;
    }
    const F = fnDef(name);
    if (F && F.vars.length === 1) { line1 = true; body.push(`plt.plot(xs, ${F.py}(xs), label=${q(`${name}(${F.vars[0]})`)})`); return; }
    if (F && F.vars.length === 2) { grid = true; body.push(...levelCurves(F.py, null)); }
  };

  for (const raw of String(src).split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line || /^[xy]\s*:/.test(line) || /^equal$/i.test(line)) continue;
    if (win.errors.some((e) => e.startsWith(line + ":"))) continue;
    let m;
    if ((m = line.match(/^label\s+(\([^()]*\)|\w+)\s+(.+)$/))) { const p = pt(m[1]); if (p) body.push(`plt.annotate(${q(m[2])}, (${p.x0}, ${p.y0}), textcoords="offset points", xytext=(5, 5))`); continue; }
    if ((m = line.match(/^region\s+(.+)$/i))) {
      const rs = splitList(m[1]).map(relOf).filter(Boolean);
      const ineqs = rs.filter((r) => isIneq(r.op));
      if (ineqs.length) region(ineqs, `region ${m[1]}`);
      continue;
    }
    if ((m = line.match(/^contour\s+(\w+)\s*(?::\s*(.+))?$/i))) {
      const F = fnDef(m[1]); grid = true;
      const lv = m[2] ? `[${splitList(m[2]).map((s) => r4(cas.evaluate(exprOf(s), {}))).join(", ")}]` : null;
      body.push(...levelCurves(F.py, lv));
      continue;
    }
    if ((m = line.match(/^tangent\s+(\w+)\s+at\s+(.+)$/i))) {
      const F = fnDef(m[1]); line1 = true;
      const d = `d${F.py}`;
      if (!defined.has(d)) { defined.add(d); defs.push(`${d} = lambda ${F.vars[0]}: ${arr(cas.diff(F.x, F.vars[0]), F.vars)}   # ${m[1]}'`); }
      body.push(`a = ${r4(cas.evaluate(exprOf(m[2]), {}))}`);
      body.push(`plt.plot(xs, ${F.py}(a) + ${d}(a)*(xs - a), "--", label=${q(`tangent of ${m[1]} at ${m[2]}`)})`);
      body.push(`plt.plot(a, ${F.py}(a), "ko")`);
      continue;
    }
    if ((m = line.match(/^gradient\s+(\w+)\s+at\s+(.+)$/i))) {
      const F = fnDef(m[1]); const p = pt(m[2]);
      const [u, w] = F.vars;
      const gx = `${F.py}_${u}`; const gy = `${F.py}_${w}`;
      if (!defined.has(gx)) {
        defined.add(gx);
        defs.push(`${gx} = lambda ${u}, ${w}: ${arr(cas.diff(F.x, u), F.vars)}`, `${gy} = lambda ${u}, ${w}: ${arr(cas.diff(F.x, w), F.vars)}`);
      }
      body.push(`plt.quiver(${p.x0}, ${p.y0}, ${gx}(${p.x0}, ${p.y0}), ${gy}(${p.x0}, ${p.y0}), angles="xy", scale_units="xy", scale=1, color="C3", label=${q(`gradient of ${m[1]} at ${m[2]}`)})`);
      body.push(`plt.plot(${p.x0}, ${p.y0}, "ko")`);
      continue;
    }
    if ((m = line.match(/^vector\s+(.+?)(?:\s+at\s+(.+))?$/i))) {
      const d = pt(m[1]) || pt(`(${m[1]})`); const o = m[2] ? pt(m[2]) : { x0: "0", y0: "0" };
      body.push(`plt.quiver(${o.x0}, ${o.y0}, ${d.x0}, ${d.y0}, angles="xy", scale_units="xy", scale=1, label=${q(m[1])})`);
      continue;
    }
    if ((m = line.match(/^(line|segment)\s+(\([^()]*\)|\w+)\s*,?\s*(\([^()]*\)|\w+)$/i))) {
      const a = pt(m[2]); const b = pt(m[3]);
      if (m[1].toLowerCase() === "line") body.push(`plt.axline((${a.x0}, ${a.y0}), (${b.x0}, ${b.y0}))`);
      else body.push(`plt.plot([${a.x0}, ${b.x0}], [${a.y0}, ${b.y0}])`);
      body.push(`plt.plot([${a.x0}, ${b.x0}], [${a.y0}, ${b.y0}], "ko")`);
      continue;
    }
    if ((m = line.match(/^polygon\s+(.+)$/i))) {
      const ps = splitList(m[1]).map(pt);
      body.push(`plt.fill([${ps.map((p) => p.x0).join(", ")}], [${ps.map((p) => p.y0).join(", ")}], alpha=0.3)`);
      continue;
    }
    if ((m = line.match(/^curve\s+\((.+)\)\s*,\s*t\s*:\s*(.+?)\s*\.\.\s*(.+)$/i))) {
      const [a, b] = splitList(m[1]);
      const t0 = r4(cas.evaluate(exprOf(m[2]), {})); const t1 = r4(cas.evaluate(exprOf(m[3]), {}));
      const tp = (x) => arr(exprOf(x), ["t"]).replace(/\bt\b/g, "T");
      body.push(`T = np.linspace(${t0}, ${t1}, 400)`, `plt.plot(${tp(a)}, ${tp(b)}, label=${q(`(${a}, ${b})`)})`);
      continue;
    }
    const names = splitList(line);
    if (names.length > 1 && names.every((n) => vars.has(n))) {
      const rels = names.map((n) => vars.get(n));
      if (rels.every((v) => v.kind === "relation" && isIneq(v.op))) region(rels, line);
      else names.forEach(drawName);
      continue;
    }
    if (vars.has(line)) { drawName(line); continue; }
    const p = pt(line);
    if (p) { body.push(`plt.plot(${p.x0}, ${p.y0}, "o")`); continue; }
    const r = findRelation(line);
    if (r) {
      if (isIneq(r.op)) { region([r], line); continue; }
      if (r.lhs.trim() === "y" && !/(^|[^a-z\\])y([^a-z]|$)/.test(r.rhs)) {
        line1 = true;
        body.push(`plt.plot(xs, ${arr(exprOf(r.rhs), ["x"]).replace(/\bx\b/g, "xs")}, label=${q(line)})`);
        continue;
      }
      const g = cas.add(exprOf(r.lhs), cas.scale(exprOf(r.rhs), cas.Q(-1)));
      body.push(`plt.contour(X, Y, ${gridXY(g)}, levels=[0])`, `plt.plot([], [], label=${q(line)})`);
      continue;
    }
    const x = exprOf(line);
    const s = [...cas.symbols(x)][0] || "x";
    line1 = true;
    body.push(`plt.plot(xs, ${arr(x, [s]).replace(new RegExp(`\\b${s}\\b`, "g"), "xs")}, label=${q(`y = ${line}`)})`);
  }

  const out = ["import numpy as np", "import matplotlib.pyplot as plt", ...notes, ...defs];
  if (line1) out.push(`xs = np.linspace(${r4(X0)}, ${r4(X1)}, 400)`);
  if (grid) out.push(`X, Y = np.meshgrid(np.linspace(${r4(X0)}, ${r4(X1)}, 400), np.linspace(${r4(Y0)}, ${r4(Y1)}, 400))`);
  out.push(...body);
  out.push(`plt.xlim(${r4(X0)}, ${r4(X1)})`, `plt.ylim(${r4(Y0)}, ${r4(Y1)})`);
  if (win.equal) out.push(`plt.gca().set_aspect("equal")`);
  out.push(`plt.axhline(0, color="gray", lw=0.5)`, `plt.axvline(0, color="gray", lw=0.5)`);
  if (body.some((b) => b.includes("label="))) out.push(`plt.legend(fontsize=8)`);
  out.push("plt.show()");
  return out.join("\n");
}
