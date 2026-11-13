// A ```graph block as a short Plotly script: same lines, same window, but
// Python draws it, and Code Suite shows Plotly figures as interactive widgets
// (zoom, pan, hover, legend toggles). Only what the graph uses is written:
// no input forms, no explanation prints, no unused variables.
//
//   graphToPython("f\ngradient f at p", vars) ->
//     import numpy as np
//     import plotly.graph_objects as go
//     f = lambda x, y: x**2 + y**2
//     ...
//     fig.show()
import * as cas from "./cas.js";
import { fnExpr, findRelation, latexToPy, casOf } from "./vars.js";
import { graphWindow, pointOf, splitList, isIneq, fnOf } from "./graph.js";

const r4 = (n) => {
  if (!Number.isFinite(n)) return "np.nan";
  const s = String(Math.round(n * 1e4) / 1e4);
  return s === "-0" ? "0" : s;
};
const RESERVED = ["x", "y", "t", "X", "Y", "T", "Z", "L", "s", "np", "go", "fig", "xs", "ys", "xs1", "lambda", "ok", "a"];
const pyName = (s) => (/^[A-Za-z_]\w*$/.test(s) && !RESERVED.includes(s) ? s : null);
const q = (s) => JSON.stringify(String(s));

// Python (numpy) for a cas expression.
const py = (x) => latexToPy(cas.tex(x), "np");
// A constant expression still has to give an array on a grid.
const arr = (x, vs) => {
  const s = py(x);
  return cas.symbols(x).size ? s : `${s} + 0*${vs[0] || "x"}`;
};

// Level curves as lines with their values on them and on hover. Without given
// levels they are spread over the values actually in view (percentiles), so a
// function that explodes at the edges still shows its shape in the middle.
// Each level is coloured by its value (Viridis, low = dark).
const levelCurves = (Z, name, levels) => [
  `levels = ${levels ? `np.array(${levels})` : `np.unique(np.round(np.percentile(${Z}, np.linspace(2, 98, 15)), 3))`}`,
  `for i, (L, c) in enumerate(zip(levels, sample_colorscale("Viridis", np.linspace(0, 0.9, len(levels))))):`,
  `    fig.add_contour(x=xs, y=ys, z=${Z}, contours=dict(start=L, end=L, size=1, coloring="none", showlabels=True, labelformat=".3g"), line_color=c, showscale=False, line_width=1.5, name=${q(name)}, legendgroup=${q(name)}, showlegend=i == 0, hovertemplate=${q(`${name} = %{z:.3g}<extra></extra>`)})`,
];
// A boundary/curve in one fixed colour.
const oneColor = (c) => `colorscale=[[0, ${q(c)}], [1, ${q(c)}]]`;

// ---------- 3D ----------

const is2Var = (name, vars) => { const F = fnOf(name, vars); return !!F && F.vars.length === 2; };
// A graph is 3D when it has a surface: `surface f`, `tangent plane f at p`,
// or a function of two variables named on its own (`f`, `f, p`).
export function graphIs3D(src, vars = new Map()) {
  return String(src).split("\n").some((raw) => {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (/^(surface|tangent\s+plane)\s/i.test(line)) return true;
    return splitList(line).some((n) => vars.has(n) && is2Var(n, vars));
  });
}

const SURFACE_SCALES = ["Viridis", "Plasma", "Cividis", "Turbo"];

function graphTo3D(src, vars) {
  const defs = []; const body = []; const notes = [];
  const defined = new Set();
  const surfaces = [];      // python names of the functions drawn
  const points = [];        // { x0, y0, label }
  let range = { x: null, y: null };
  const fnDef = (name) => {
    const F = fnOf(name, vars);
    const n = pyName(name) || "_" + name;
    if (!defined.has(name)) { defined.add(name); defs.push(`${n} = lambda ${F.vars.join(", ")}: ${arr(F.x, F.vars)}`); }
    return { ...F, py: n, name };
  };
  const pt = (s) => {
    const t = String(s).trim();
    const p = pointOf(t, vars);
    if (!p) return null;
    const n = pyName(t);
    if (n && vars.has(t)) {
      if (!defined.has(t)) { defined.add(t); defs.push(`${n} = (${r4(p.x)}, ${r4(p.y)})`); }
      return { ...p, x0: `${n}[0]`, y0: `${n}[1]`, label: t };
    }
    return { ...p, x0: r4(p.x), y0: r4(p.y), label: `(${r4(p.x)}, ${r4(p.y)})` };
  };
  const surface = (name) => { const F = fnDef(name); if (!surfaces.some((s) => s.py === F.py)) surfaces.push(F); return F; };
  const planes = [];
  for (const raw of String(src).split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line) continue;
    let m;
    try {
      if ((m = line.match(/^([xy])\s*:\s*(.+?)\s*\.\.\s*(.+)$/))) {
        const v = (s) => cas.evaluate(fnExpr({ name: "_", kind: "scalar", value: s }, vars).x, {});
        range[m[1]] = [v(m[2]), v(m[3])];
        continue;
      }
      if (/^equal$/i.test(line)) continue;
      if ((m = line.match(/^surface\s+(\w+)$/i))) { surface(m[1]); continue; }
      if ((m = line.match(/^tangent\s+plane\s+(\w+)\s+at\s+(.+)$/i))) {
        const F = surface(m[1]); const p = pt(m[2]);
        const [u, w] = F.vars;
        if (!defined.has(`${F.py}_${u}`)) {
          defined.add(`${F.py}_${u}`);
          defs.push(`${F.py}_${u} = lambda ${u}, ${w}: ${arr(cas.diff(F.x, u), F.vars)}`, `${F.py}_${w} = lambda ${u}, ${w}: ${arr(cas.diff(F.x, w), F.vars)}`);
        }
        planes.push({ F, p, u, w, label: `tangent plane of ${m[1]} at ${m[2]}` });
        if (!points.some((q) => q.x0 === p.x0 && q.y0 === p.y0)) points.push({ ...p, F });
        continue;
      }
      const names = splitList(line);
      if (names.every((n) => vars.has(n))) {
        for (const n of names) {
          if (is2Var(n, vars)) surface(n);
          else if (pointOf(n, vars)) { const p = pt(n); if (!points.some((q) => q.x0 === p.x0 && q.y0 === p.y0)) points.push(p); }
          else notes.push(`# not drawn in 3D: ${n} (a 3D graph shows surfaces, points on them and tangent planes)`);
        }
        continue;
      }
      const p = pt(line);
      if (p) { points.push(p); continue; }
      notes.push(`# not drawn in 3D: ${line} (a 3D graph shows surfaces, points on them and tangent planes)`);
    } catch (e) {
      notes.push(`# can't draw ${line}: ${e.message}`);
    }
  }
  // Window: x:/y: when given, else around the points with at least -2..2.
  const span = (vals) => {
    const lo = Math.min(-2, ...vals); const hi = Math.max(2, ...vals);
    const pad = (hi - lo) * 0.1;
    return [lo - pad, hi + pad];
  };
  const X = range.x || span(points.map((p) => p.x));
  const Y = range.y || span(points.map((p) => p.y));
  const out = ["import numpy as np", "import plotly.graph_objects as go", ...notes, ...defs];
  out.push(`xs, ys = np.linspace(${r4(X[0])}, ${r4(X[1])}, 160), np.linspace(${r4(Y[0])}, ${r4(Y[1])}, 160)`, `X, Y = np.meshgrid(xs, ys)`, `fig = go.Figure()`);
  surfaces.forEach((F, i) => {
    const Z = surfaces.length > 1 ? `Z${i + 1}` : "Z";
    // Huge values at the edges (x^6 ...) are cut off so the shape in the middle shows.
    out.push(`${Z} = ${F.py}(X, Y)`, `lo, med, top = np.percentile(${Z}, [0, 50, 97])`, `hi = min(top, med + 2*(med - lo)) + 1e-9`);
    out.push(`fig.add_surface(x=X, y=Y, z=np.minimum(${Z}, hi), customdata=${Z}, colorscale=${q(SURFACE_SCALES[i % SURFACE_SCALES.length])}, cmin=lo, cmax=hi, showscale=False, opacity=0.95, name=${q(F.name)}, contours_z=dict(show=True, usecolormap=True, project_z=True), hovertemplate=${q(`x = %{x:.3g}<br>y = %{y:.3g}<br>${F.name} = %{customdata:.3g}<extra></extra>`)})`);
  });
  const first = surfaces[0];
  for (const pl of planes) {
    const { F, p } = pl;
    const P = `${F.py}(${p.x0}, ${p.y0}) + ${F.py}_${pl.u}(${p.x0}, ${p.y0})*(X - ${p.x0}) + ${F.py}_${pl.w}(${p.x0}, ${p.y0})*(Y - ${p.y0})`;
    out.push(`near = (abs(X - ${p.x0}) <= ${r4((X[1] - X[0]) * 0.12)}) & (abs(Y - ${p.y0}) <= ${r4((Y[1] - Y[0]) * 0.12)})`);
    out.push(`fig.add_surface(x=X, y=Y, z=np.where(near, ${P}, np.nan), colorscale=[[0, "#e8593c"], [1, "#e8593c"]], showscale=False, opacity=0.6, name=${q(pl.label)}, hoverinfo="skip")`);
  }
  for (const p of points) {
    const F = p.F || first;
    if (!F) { out.push(`fig.add_scatter3d(x=[${p.x0}], y=[${p.y0}], z=[0], mode="markers+text", text=[${q(p.label)}], marker=dict(size=5, color="black"), name=${q(p.label)})`); continue; }
    out.push(`fig.add_scatter3d(x=[${p.x0}], y=[${p.y0}], z=[${F.py}(${p.x0}, ${p.y0})], mode="markers+text", text=[${q(p.label)}], marker=dict(size=5, color="black"), name=${q(p.label)})`);
  }
  out.push(`fig.update_layout(scene=dict(xaxis_title="x", yaxis_title="y", zaxis_title=${q(surfaces.map((s) => s.name).join(", ") || "z")}, aspectmode="cube"), height=600, margin=dict(l=0, r=0, t=0, b=0))`);
  out.push("fig.show()");
  return out.join("\n");
}

export function graphToPython(src, vars = new Map()) {
  if (graphIs3D(src, vars)) return graphTo3D(src, vars);
  const win = graphWindow(src, vars);
  const [X0, X1] = win.X; const [Y0, Y1] = win.Y;
  const defs = [];       // f = lambda ..., p = (1, 2)
  const body = [];       // fig.... lines
  const defined = new Set();
  let grid = false; let line1 = false;
  const notes = win.errors.map((e) => `# can't draw ${e}`);

  // A note function as a lambda (constants filled in), once.
  const fnDef = (name) => {
    const F = fnOf(name, vars);
    if (!F) return null;
    const n = pyName(name) || "_" + name;
    if (!defined.has(name)) {
      defined.add(name);
      defs.push(`${n} = lambda ${F.vars.join(", ")}: ${arr(F.x, F.vars)}`);
    }
    return { ...F, py: n };
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
  const exprOf = (tex) => fnExpr({ name: "_", kind: "scalar", value: String(tex) }, vars).x;
  const gridXY = (x) => { grid = true; return arr(x, ["X"]).replace(/\bx\b/g, "X").replace(/\by\b/g, "Y"); };
  const diffOf = (r) => cas.add(exprOf(r.lhs), cas.scale(exprOf(r.rhs), cas.Q(-1)));
  // Each point once, even when it is also the foot of a gradient or an end of a line.
  const drawn = new Set();
  const marker = (p, label, color = "black") => {
    const k = `${p.x0},${p.y0}`;
    if (drawn.has(k)) return null;
    drawn.add(k);
    return `fig.add_scatter(x=[${p.x0}], y=[${p.y0}], mode="markers${label ? "+text" : ""}",${label ? ` text=[${q(label)}], textposition="top right",` : ""} marker=dict(size=8, color=${q(color)}), name=${q(label || `(${p.x0}, ${p.y0})`)})`;
  };
  const arrow = (from, dx, dy, label, color) => [
    `fig.add_annotation(x=${from.x0} + ${dx}, y=${from.y0} + ${dy}, ax=${from.x0}, ay=${from.y0}, xref="x", yref="y", axref="x", ayref="y", showarrow=True, arrowhead=2, arrowwidth=2, arrowcolor=${q(color)}, text="")`,
    `fig.add_scatter(x=[${from.x0} + ${dx}], y=[${from.y0} + ${dy}], mode="markers", marker=dict(size=1, color=${q(color)}), name=${q(label)})`,
  ];
  const region = (rels, label) => {
    const conds = rels.map((r) => `(${gridXY(diffOf(r))} ${/ge|>/.test(String(r.op)) ? ">=" : "<="} 0)`);
    body.push(`ok = ${conds.join(" & ")}`);
    body.push(`fig.add_heatmap(x=xs, y=ys, z=ok.astype(float), colorscale=[[0, "rgba(0,0,0,0)"], [1, "rgba(76,139,245,0.35)"]], showscale=False, hoverinfo="skip", name=${q(label)})`);
    for (const r of rels) body.push(`fig.add_contour(x=xs, y=ys, z=${gridXY(diffOf(r))}, contours=dict(start=0, end=0, size=1, coloring="lines"), ${oneColor("#4c8bf5")}, showscale=False, line_width=1.5, name=${q(`${r.lhs} ${r.op} ${r.rhs}`)}, hoverinfo="skip")`);
  };
  const relOf = (s) => {
    const v = vars.get(String(s).trim());
    if (v && v.kind === "relation" && !v.error) return v;
    return findRelation(String(s));
  };
  const curve = (g, label) => body.push(`fig.add_contour(x=xs, y=ys, z=${gridXY(g)}, contours=dict(start=0, end=0, size=1, coloring="lines"), ${oneColor("#e8593c")}, showscale=False, line_width=2, name=${q(label)}, hoverinfo="skip")`);
  const plot1 = (expr, label, dash) => { line1 = true; body.push(`fig.add_scatter(x=xs1, y=${expr}, mode="lines", name=${q(label)}${dash ? `, line=dict(dash="dash")` : ""})`); };
  const drawName = (name) => {
    const v = vars.get(name);
    if (!v || v.error) return;
    if (v.kind === "relation") {
      if (isIneq(v.op)) region([v], name);
      else curve(diffOf(v), name);
      return;
    }
    if (v.kind === "vector") { const p = pt(name); if (p) body.push(marker(p, name, "#e8593c")); return; }
    if (v.kind === "matrix") {
      const M = casOf(v).M;
      const n = pyName(name) || "_" + name;
      defs.push(`${n} = np.array([${M.map((r) => `[${r.map((e) => r4(cas.evaluate(e, {}))).join(", ")}]`).join(", ")}])`);
      body.push(`fig.add_scatter(x=${n}[:, 0], y=${n}[:, 1], mode="markers", name=${q(name)})`);
      return;
    }
    const F = fnDef(name);
    if (F && F.vars.length === 1) plot1(`${F.py}(xs1)`, `${name}(${F.vars[0]})`);
    else if (F && F.vars.length === 2) { grid = true; body.push(`Z = ${F.py}(X, Y)`, ...levelCurves("Z", name, null)); }
  };

  for (const raw of String(src).split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line || /^[xy]\s*:/.test(line) || /^equal$/i.test(line)) continue;
    if (win.errors.some((e) => e.startsWith(line + ":"))) continue;
    let m;
    if ((m = line.match(/^label\s+(\([^()]*\)|\w+)\s+(.+)$/))) { const p = pt(m[1]); if (p) body.push(`fig.add_annotation(x=${p.x0}, y=${p.y0}, text=${q(m[2])}, showarrow=False, yshift=12)`); continue; }
    if ((m = line.match(/^region\s+(.+)$/i))) {
      const ineqs = splitList(m[1]).map(relOf).filter((r) => r && isIneq(r.op));
      if (ineqs.length) region(ineqs, `region ${m[1]}`);
      continue;
    }
    if ((m = line.match(/^contour\s+(\w+)\s*(?::\s*(.+))?$/i))) {
      const F = fnDef(m[1]); grid = true;
      const lv = m[2] ? `[${splitList(m[2]).map((s) => r4(cas.evaluate(exprOf(s), {}))).join(", ")}]` : null;
      body.push(`Z = ${F.py}(X, Y)`, ...levelCurves("Z", m[1], lv));
      continue;
    }
    if ((m = line.match(/^tangent\s+(\w+)\s+at\s+(.+)$/i))) {
      const F = fnDef(m[1]);
      const d = `d${F.py}`;
      if (!defined.has(d)) { defined.add(d); defs.push(`${d} = lambda ${F.vars[0]}: ${arr(cas.diff(F.x, F.vars[0]), F.vars)}   # ${m[1]}'`); }
      body.push(`a = ${r4(cas.evaluate(exprOf(m[2]), {}))}`);
      plot1(`${F.py}(a) + ${d}(a)*(xs1 - a)`, `tangent of ${m[1]} at ${m[2]}`, true);
      body.push(`fig.add_scatter(x=[a], y=[${F.py}(a)], mode="markers", marker=dict(size=8, color="black"), name=${q(`(${m[2]}, ${m[1]}(${m[2]}))`)})`);
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
      body.push(marker(p, p.name, "black"));
      body.push(...arrow(p, `${gx}(${p.x0}, ${p.y0})`, `${gy}(${p.x0}, ${p.y0})`, `gradient of ${m[1]} at ${m[2]}`, "#e8593c"));
      continue;
    }
    if ((m = line.match(/^vector\s+(.+?)(?:\s+at\s+(.+))?$/i))) {
      const d = pt(m[1]) || pt(`(${m[1]})`); const o = m[2] ? pt(m[2]) : { x0: "0", y0: "0" };
      body.push(...arrow(o, d.x0, d.y0, m[1], "#2fa36b"));
      continue;
    }
    if ((m = line.match(/^(line|segment)\s+(\([^()]*\)|\w+)\s*,?\s*(\([^()]*\)|\w+)$/i))) {
      const a = pt(m[2]); const b = pt(m[3]);
      const s = m[1].toLowerCase() === "line" ? "[-1000, 1000]" : "[0, 1]";
      body.push(`s = np.array(${s})`, `fig.add_scatter(x=${a.x0} + s*(${b.x0} - ${a.x0}), y=${a.y0} + s*(${b.y0} - ${a.y0}), mode="lines", name=${q(`${m[1]} ${m[2]} ${m[3]}`)})`);
      body.push(marker(a, a.name), marker(b, b.name));
      continue;
    }
    if ((m = line.match(/^polygon\s+(.+)$/i))) {
      const ps = splitList(m[1]).map(pt);
      body.push(`fig.add_scatter(x=[${ps.map((p) => p.x0).join(", ")}], y=[${ps.map((p) => p.y0).join(", ")}], fill="toself", mode="lines", name="polygon")`);
      continue;
    }
    if ((m = line.match(/^curve\s+\((.+)\)\s*,\s*t\s*:\s*(.+?)\s*\.\.\s*(.+)$/i))) {
      const [a, b] = splitList(m[1]);
      const t0 = r4(cas.evaluate(exprOf(m[2]), {})); const t1 = r4(cas.evaluate(exprOf(m[3]), {}));
      const tp = (x) => arr(exprOf(x), ["t"]).replace(/\bt\b/g, "T");
      body.push(`T = np.linspace(${t0}, ${t1}, 400)`, `fig.add_scatter(x=${tp(a)}, y=${tp(b)}, mode="lines", name=${q(`(${a}, ${b})`)})`);
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
    if (p) { body.push(marker(p, null, "#e8593c")); continue; }
    const r = findRelation(line);
    if (r) {
      if (isIneq(r.op)) { region([r], line); continue; }
      if (r.lhs.trim() === "y" && !/(^|[^a-z\\])y([^a-z]|$)/.test(r.rhs)) { plot1(arr(exprOf(r.rhs), ["x"]).replace(/\bx\b/g, "xs1"), line); continue; }
      curve(diffOf(r), line);
      continue;
    }
    const x = exprOf(line);
    const s = [...cas.symbols(x)][0] || "x";
    plot1(arr(x, [s]).replace(new RegExp(`\\b${s}\\b`, "g"), "xs1"), `y = ${line}`);
  }

  const out = ["import numpy as np", "import plotly.graph_objects as go", ...(body.some((b) => b && b.includes("sample_colorscale")) ? ["from plotly.colors import sample_colorscale"] : []), ...notes, ...defs];
  if (line1) out.push(`xs1 = np.linspace(${r4(X0)}, ${r4(X1)}, 600)`);
  if (grid) out.push(`xs, ys = np.linspace(${r4(X0)}, ${r4(X1)}, 300), np.linspace(${r4(Y0)}, ${r4(Y1)}, 300)`, `X, Y = np.meshgrid(xs, ys)`);
  out.push("fig = go.Figure()", ...body);
  out.push(`fig.update_xaxes(range=[${r4(X0)}, ${r4(X1)}], zeroline=True)`);
  out.push(`fig.update_yaxes(range=[${r4(Y0)}, ${r4(Y1)}], zeroline=True${win.equal ? `, scaleanchor="x", scaleratio=1` : ""})`);
  out.push(`fig.update_layout(template="plotly_white", margin=dict(l=40, r=20, t=20, b=40))`);
  out.push("fig.show()");
  return out.filter((l) => l != null).join("\n");
}
