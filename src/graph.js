// ```graph blocks: draw what the note is about, offline, on a canvas.
// One thing per line; note variables can be used by name.
//
//   f                       y = f(x) (or level curves when f has 2 variables)
//   y = x^2 - 1             a curve; any equation in x, y is drawn implicitly
//   x + 2y \le 6            a half-plane (shaded)
//   region c1, c2, c3       the region where all of them hold (feasible set)
//   p      (1, 2)           a point (a matrix with 2 columns: its rows)
//   vector u at p           an arrow
//   line p q / segment p q  through two points
//   tangent f at 1          tangent line;  gradient g at p: the gradient arrow
//   contour g: -1, 0, 1     level curves (levels optional)
//   curve (\cos t, \sin t), t: 0..2\pi    parametric curve
//   polygon (0,0), (1,0), (0,1)
//   x: -5..5   y: -2..4     the window;  equal  (same scale on both axes)
//
// Pure: parseGraph builds a scene, drawScene paints it on any 2D context.
import * as cas from "./cas.js";
import { fnExpr, findRelation, casOf } from "./vars.js";

export const GRAPH_KEYWORDS = [
  { word: "region", insert: "region ", desc: "shade where all the inequalities hold (feasible set)", hint: "region c1, c2, c3" },
  { word: "contour", insert: "contour ", desc: "level curves of a function of x, y", hint: "contour g: -1, 0, 1" },
  { word: "tangent", insert: "tangent ", desc: "tangent line of f at a point", hint: "tangent f at 1" },
  { word: "gradient", insert: "gradient ", desc: "gradient arrow of g at a point", hint: "gradient g at p" },
  { word: "vector", insert: "vector ", desc: "an arrow (from the origin or a point)", hint: "vector u at p" },
  { word: "line", insert: "line ", desc: "the line through two points", hint: "line p q" },
  { word: "segment", insert: "segment ", desc: "the segment between two points", hint: "segment p q" },
  { word: "polygon", insert: "polygon ", desc: "a filled polygon", hint: "polygon (0,0), (1,0), (0,1)" },
  { word: "curve", insert: "curve ", desc: "a parametric curve (x(t), y(t))", hint: "curve (\\cos t, \\sin t), t: 0..2\\pi" },
  { word: "y =", insert: "y = ", desc: "graph of a function of x", hint: "y = x^2 - 1" },
  { word: "x:", insert: "x: -5..5", desc: "the x range of the window", hint: "x: -5..5" },
  { word: "y:", insert: "y: -5..5", desc: "the y range of the window", hint: "y: -5..5" },
  { word: "equal", insert: "equal", desc: "same scale on both axes (circles look round)", hint: "equal" },
  { word: "label", insert: "label ", desc: "text at a point", hint: "label (1, 2) maximum" },
];

const PALETTE = ["#4c8bf5", "#e8593c", "#2fa36b", "#b25fd6", "#e0a100", "#13a6b8", "#d6467d", "#7a8b99"];

// A numeric function of (x, y[, t]) from LaTeX, with the note's constants filled in.
function compile(tex, vars) {
  const pseudo = { name: "_", kind: "scalar", value: String(tex) };
  let x;
  try { x = fnExpr(pseudo, vars).x; } catch (_) { x = cas.parse(String(tex)); }
  return { x, f: (env) => { try { const v = cas.evaluate(x, env); return Number.isFinite(v) ? v : NaN; } catch (_) { return NaN; } } };
}
const num = (s, vars) => { const c = compile(s, vars); return c.f({}); };
const fnOf = (name, vars) => {
  const v = vars.get(name);
  if (!v || v.kind !== "scalar" || v.error) return null;
  try { const F = fnExpr(v, vars); return F.vars.length ? { ...F, name, f: (env) => { try { const r = cas.evaluate(F.x, env); return Number.isFinite(r) ? r : NaN; } catch (_) { return NaN; } } } : null; } catch (_) { return null; }
};
// A point: a note variable or "(1, 2)".
function pointOf(s, vars) {
  const t = String(s).trim();
  const v = vars.get(t);
  if (v && v.kind === "vector" && !v.error) {
    const xs = casOf(v).M.map((r) => cas.evaluate(r[0], {}));
    if (xs.length === 2) return { x: xs[0], y: xs[1], name: t };
  }
  const m = t.match(/^\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*,\s*([^()]+(?:\([^()]*\))?[^()]*)\s*\)$/);
  if (m) return { x: num(m[1], vars), y: num(m[2], vars) };
  return null;
}
const splitList = (s) => {
  const out = []; let depth = 0; let cur = "";
  for (const c of s) {
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const isIneq = (op) => /^\\?(le|leq|ge|geq|lt|gt|<|>|<=|>=|leqslant|geqslant)$/.test(String(op));
// lhs op rhs  ->  g(x, y) <= 0  (strictness ignored when drawing)
function ineqFn(r, vars) {
  const L = compile(r.lhs, vars); const R = compile(r.rhs, vars);
  const ge = /ge|>/.test(String(r.op));
  return (env) => (ge ? R.f(env) - L.f(env) : L.f(env) - R.f(env));
}
// Note relations by name, or a typed one.
function relationOf(s, vars) {
  const v = vars.get(String(s).trim());
  if (v && v.kind === "relation" && !v.error) return { lhs: v.lhs, op: v.op, rhs: v.rhs, name: v.name };
  return findRelation(String(s));
}

// ---------- parse ----------

export function parseGraph(src, vars = new Map()) {
  const items = [];
  const win = { x: null, y: null, equal: false };
  const errors = [];
  let color = 0;
  const next = () => PALETTE[color++ % PALETTE.length];
  for (const raw of String(src).split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line) continue;
    try {
      let m;
      if ((m = line.match(/^([xy])\s*:\s*(.+?)\s*\.\.\s*(.+)$/))) { win[m[1]] = [num(m[2], vars), num(m[3], vars)]; continue; }
      if (/^equal$/i.test(line)) { win.equal = true; continue; }
      if ((m = line.match(/^label\s+(\([^()]*\)|\w+)\s+(.+)$/))) { const p = pointOf(m[1], vars); if (p) items.push({ t: "label", p, text: m[2], color: "fg" }); continue; }
      if ((m = line.match(/^region\s+(.+)$/i))) {
        const rs = splitList(m[1]).map((s) => relationOf(s, vars));
        if (rs.some((r) => !r)) throw new Error("region needs inequalities (names of your inequality variables, or typed ones)");
        items.push({ t: "region", fs: rs.filter((r) => isIneq(r.op)).map((r) => ineqFn(r, vars)), eqs: rs.filter((r) => !isIneq(r.op)), label: m[1], color: next() });
        continue;
      }
      if ((m = line.match(/^contour\s+(\w+)\s*(?::\s*(.+))?$/i))) {
        const F = fnOf(m[1], vars);
        if (!F || F.vars.length !== 2) throw new Error(`contour needs a function of two variables; ${m[1]} isn't one`);
        items.push({ t: "contour", F, levels: m[2] ? splitList(m[2]).map((s) => num(s, vars)) : null, label: m[1], color: next() });
        continue;
      }
      if ((m = line.match(/^tangent\s+(\w+)\s+at\s+(.+)$/i))) {
        const F = fnOf(m[1], vars);
        if (!F || F.vars.length !== 1) throw new Error(`tangent needs a function of one variable; ${m[1]} isn't one`);
        const a = num(m[2], vars); const h = 1e-5;
        const fa = F.f({ [F.vars[0]]: a });
        const s = (F.f({ [F.vars[0]]: a + h }) - F.f({ [F.vars[0]]: a - h })) / (2 * h);
        items.push({ t: "fn", f: (x) => fa + s * (x - a), label: `tangent of ${m[1]} at ${m[2]}`, color: next(), dash: true });
        items.push({ t: "point", p: { x: a, y: fa }, color: "fg" });
        continue;
      }
      if ((m = line.match(/^gradient\s+(\w+)\s+at\s+(.+)$/i))) {
        const F = fnOf(m[1], vars); const p = pointOf(m[2], vars);
        if (!F || F.vars.length !== 2 || !p) throw new Error("gradient needs a function of two variables and a point");
        const env = (x, y) => ({ [F.vars[0]]: x, [F.vars[1]]: y }); const h = 1e-5;
        const gx = (F.f(env(p.x + h, p.y)) - F.f(env(p.x - h, p.y))) / (2 * h);
        const gy = (F.f(env(p.x, p.y + h)) - F.f(env(p.x, p.y - h))) / (2 * h);
        items.push({ t: "arrow", from: p, to: { x: p.x + gx, y: p.y + gy }, label: `∇${m[1]}(${p.name || ""})`, color: next() });
        continue;
      }
      if ((m = line.match(/^vector\s+(.+?)(?:\s+at\s+(.+))?$/i))) {
        const d = pointOf(m[1], vars) || pointOf(`(${m[1]})`, vars);
        const o = m[2] ? pointOf(m[2], vars) : { x: 0, y: 0 };
        if (!d || !o) throw new Error("vector needs a vector like u or (1, 2)");
        items.push({ t: "arrow", from: o, to: { x: o.x + d.x, y: o.y + d.y }, label: m[1], color: next() });
        continue;
      }
      if ((m = line.match(/^(line|segment)\s+(\([^()]*\)|\w+)\s*,?\s*(\([^()]*\)|\w+)$/i))) {
        const a = pointOf(m[2], vars); const b = pointOf(m[3], vars);
        if (!a || !b) throw new Error(`${m[1]} needs two points`);
        items.push({ t: m[1].toLowerCase(), a, b, color: next() });
        items.push({ t: "point", p: a, color: "fg" }, { t: "point", p: b, color: "fg" });
        continue;
      }
      if ((m = line.match(/^polygon\s+(.+)$/i))) {
        const ps = splitList(m[1]).map((s) => pointOf(s, vars));
        if (ps.some((p) => !p)) throw new Error("polygon needs points");
        items.push({ t: "polygon", ps, color: next() });
        continue;
      }
      if ((m = line.match(/^curve\s+\((.+)\)\s*,\s*t\s*:\s*(.+?)\s*\.\.\s*(.+)$/i))) {
        const [a, b] = splitList(m[1]);
        const X = compile(a, vars); const Y = compile(b, vars);
        items.push({ t: "param", X, Y, t0: num(m[2], vars), t1: num(m[3], vars), color: next(), label: `(${a}, ${b})` });
        continue;
      }
      // A bare list of names: points, functions, inequalities, data matrices.
      const names = splitList(line);
      if (names.length > 1 && names.every((n) => vars.has(n))) {
        const rels = names.map((n) => vars.get(n));
        if (rels.every((v) => v.kind === "relation" && isIneq(v.op))) {
          items.push({ t: "region", fs: rels.map((v) => ineqFn(v, vars)), eqs: [], label: line, color: next() });
          continue;
        }
        for (const n of names) for (const it of itemsForName(n, vars, next)) items.push(it);
        continue;
      }
      if (vars.has(line)) { for (const it of itemsForName(line, vars, next)) items.push(it); continue; }
      const p = pointOf(line, vars);
      if (p) { items.push({ t: "point", p, color: next() }); continue; }
      // y = f(x), an equation in x, y, or an inequality.
      const r = findRelation(line);
      if (r) {
        if (isIneq(r.op)) { items.push({ t: "region", fs: [ineqFn(r, vars)], eqs: [], label: line, color: next(), light: true }); continue; }
        if (r.lhs.trim() === "y" && !/(^|[^a-z\\])y([^a-z]|$)/.test(r.rhs)) {
          const F = compile(r.rhs, vars);
          items.push({ t: "fn", f: (x) => F.f({ x }), label: line, color: next() });
          continue;
        }
        const L = compile(r.lhs, vars); const R = compile(r.rhs, vars);
        items.push({ t: "implicit", g: (env) => L.f(env) - R.f(env), label: line, color: next() });
        continue;
      }
      if (/^[A-Za-z]\w*$/.test(line) && line !== "x") throw new Error(`${line} isn't one of your variables (define it in a vars block)`);
      // A plain expression in x: its graph.
      const F = compile(line, vars);
      const syms = [...cas.symbols(F.x)];
      if (syms.length <= 1) { items.push({ t: "fn", f: (x) => F.f({ [syms[0] || "x"]: x }), label: `y = ${line}`, color: next() }); continue; }
      throw new Error(`don't know how to draw "${line}"`);
    } catch (e) {
      errors.push(`${line}: ${e.message}`);
    }
  }
  return { items, win, errors };
}

// What a note variable draws as.
function itemsForName(name, vars, next) {
  const v = vars.get(name);
  if (!v || v.error) throw new Error(`${name} has an error`);
  if (v.kind === "relation") {
    if (isIneq(v.op)) return [{ t: "region", fs: [ineqFn(v, vars)], eqs: [], label: `${name}: ${v.lhs} ${v.op} ${v.rhs}`, color: next(), light: true }];
    const L = compile(v.lhs, vars); const R = compile(v.rhs, vars);
    return [{ t: "implicit", g: (env) => L.f(env) - R.f(env), label: `${name}: ${v.lhs} = ${v.rhs}`, color: next() }];
  }
  if (v.kind === "vector") {
    const p = pointOf(name, vars);
    if (p) return [{ t: "point", p, color: next(), label: name }];
  }
  if (v.kind === "matrix") {
    const M = casOf(v).M;
    if (M[0].length === 2) return [{ t: "points", ps: M.map((r) => ({ x: cas.evaluate(r[0], {}), y: cas.evaluate(r[1], {}) })), color: next(), label: `${name} (rows as points)` }];
    throw new Error(`${name} is a matrix; only one with 2 columns (one point per row) can be drawn`);
  }
  const F = fnOf(name, vars);
  if (F && F.vars.length === 1) return [{ t: "fn", f: (x) => F.f({ [F.vars[0]]: x }), label: `${name}(${F.vars[0]})`, color: next() }];
  if (F && F.vars.length === 2) return [{ t: "contour", F, levels: null, label: `level curves of ${name}`, color: next() }];
  if (F) throw new Error(`${name} has ${F.vars.length} variables; only 1 or 2 can be drawn`);
  throw new Error(`can't draw ${name} (${v.kind})`);
}

// ---------- window ----------

function autoWindow(items, win) {
  const xs = []; const ys = [];
  const add = (p) => { if (Number.isFinite(p.x) && Number.isFinite(p.y)) { xs.push(p.x); ys.push(p.y); } };
  for (const it of items) {
    if (it.t === "point" || it.t === "label") add(it.p);
    if (it.t === "points" || it.t === "polygon") it.ps.forEach(add);
    if (it.t === "arrow") { add(it.from); add(it.to); }
    if (it.t === "line" || it.t === "segment") { add(it.a); add(it.b); }
  }
  // Parametric curves: their x values count like points.
  for (const it of items) if (it.t === "param") for (let i = 0; i <= 100; i++) {
    const t = it.t0 + ((it.t1 - it.t0) * i) / 100;
    add({ x: it.X.f({ t }), y: it.Y.f({ t }) });
  }
  // Implicit curves (circles, ...): find where they are in -10..10 and fit them.
  for (const it of items) if (it.t === "implicit") {
    for (const [a, b] of contourSegments((x, y) => it.g({ x, y }), [-10, 10], [-10, 10], 0, 80, 80)) { add(a); add(b); }
  }
  // Level curves and regions fill the plane: start from -5..5.
  const plane = items.some((it) => it.t === "contour" || it.t === "region");
  const span = (vals, base) => {
    const lo = Math.min(...vals, ...(base || [0])); const hi = Math.max(...vals, ...(base || [0]));
    const pad = Math.max(0.5, (hi - lo) * 0.12);
    return [lo - pad, hi + pad];
  };
  let X = win.x;
  if (!X) X = xs.length ? span(xs, plane ? [-5, 5] : [0]) : [-5, 5];
  let Y = win.y;
  if (!Y) {
    // Function samples: ignore the wildest 5% so 1/x or tan don't flatten everything.
    const fv = [];
    for (const it of items) if (it.t === "fn") for (let i = 0; i <= 200; i++) { const v = it.f(X[0] + ((X[1] - X[0]) * i) / 200); if (Number.isFinite(v)) fv.push(v); }
    fv.sort((a, b) => a - b);
    const trimmed = fv.length ? [fv[Math.floor(fv.length * 0.05)], fv[Math.ceil(fv.length * 0.95) - 1]] : [];
    // Points always stay in view.
    const all = [...trimmed, ...ys];
    Y = all.length ? span(all, plane ? [-5, 5] : [0]) : plane ? [-5, 5] : [X[0], X[1]];
  }
  return { X, Y };
}

// ---------- draw ----------

// Marching squares: segments where g = level on an nx×ny grid.
function contourSegments(g, X, Y, level, nx = 160, ny = 120) {
  const vals = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) row.push(g(X[0] + ((X[1] - X[0]) * i) / nx, Y[0] + ((Y[1] - Y[0]) * j) / ny) - level);
    vals.push(row);
  }
  const segs = [];
  const P = (i, j) => ({ x: X[0] + ((X[1] - X[0]) * i) / nx, y: Y[0] + ((Y[1] - Y[0]) * j) / ny });
  const lerp = (a, b, va, vb) => { const t = va / (va - vb); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const v = c.map(([a, b]) => vals[b][a]);
    if (v.some((x) => !Number.isFinite(x))) continue;
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const a = v[k]; const b = v[(k + 1) % 4];
      if ((a < 0) !== (b < 0)) pts.push(lerp(P(...c[k]), P(...c[(k + 1) % 4]), a, b));
    }
    if (pts.length === 2) segs.push(pts);
    if (pts.length === 4) segs.push([pts[0], pts[1]], [pts[2], pts[3]]);
  }
  return segs;
}

export function drawScene(ctx, scene, W, H, theme = {}) {
  const fg = theme.fg || "#222"; const bg = theme.bg || "#fff"; const muted = theme.muted || "#999"; const faint = theme.faint || "#ddd";
  const { X: X0, Y: Y0 } = autoWindow(scene.items, scene.win);
  let X = X0; let Y = Y0;
  if (scene.win.equal) {
    const sx = (X[1] - X[0]) / W; const sy = (Y[1] - Y[0]) / H; const s = Math.max(sx, sy);
    const cx = (X[0] + X[1]) / 2; const cy = (Y[0] + Y[1]) / 2;
    X = [cx - (s * W) / 2, cx + (s * W) / 2]; Y = [cy - (s * H) / 2, cy + (s * H) / 2];
  }
  const px = (x) => ((x - X[0]) / (X[1] - X[0])) * W;
  const py = (y) => H - ((y - Y[0]) / (Y[1] - Y[0])) * H;
  const col = (c) => (c === "fg" ? fg : c);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Grid and axes with tick labels.
  const step = (span) => { const raw = span / 8; const p = 10 ** Math.floor(Math.log10(raw)); const m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
  const sxs = step(X[1] - X[0]); const sys = step(Y[1] - Y[0]);
  ctx.lineWidth = 1; ctx.strokeStyle = faint; ctx.fillStyle = muted; ctx.font = "11px sans-serif";
  const fmt = (v) => String(Number(v.toFixed(6)));
  for (let x = Math.ceil(X[0] / sxs) * sxs; x <= X[1]; x += sxs) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), H); ctx.stroke(); if (Math.abs(x) > sxs / 2) ctx.fillText(fmt(x), px(x) + 2, Math.min(H - 3, Math.max(11, py(0) + 12))); }
  for (let y = Math.ceil(Y[0] / sys) * sys; y <= Y[1]; y += sys) { ctx.beginPath(); ctx.moveTo(0, py(y)); ctx.lineTo(W, py(y)); ctx.stroke(); if (Math.abs(y) > sys / 2) ctx.fillText(fmt(y), Math.min(W - 30, Math.max(2, px(0) + 3)), py(y) - 2); }
  ctx.strokeStyle = muted; ctx.lineWidth = 1.5;
  if (Y[0] <= 0 && Y[1] >= 0) { ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.stroke(); }
  if (X[0] <= 0 && X[1] >= 0) { ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke(); }
  const legend = [];
  const alpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
  const cell = 3;
  // Regions first (under everything).
  for (const it of scene.items.filter((i) => i.t === "region")) {
    ctx.fillStyle = alpha(it.color, it.light ? 0.15 : 0.32);
    for (let j = 0; j < H; j += cell) for (let i = 0; i < W; i += cell) {
      const x = X[0] + ((i + cell / 2) / W) * (X[1] - X[0]); const y = Y[1] - ((j + cell / 2) / H) * (Y[1] - Y[0]);
      if (it.fs.every((f) => f({ x, y }) <= 0)) ctx.fillRect(i, j, cell, cell);
    }
    // Boundaries of each inequality inside the window.
    ctx.strokeStyle = it.color; ctx.lineWidth = 1.5;
    for (const f of it.fs) for (const [a, b] of contourSegments((x, y) => f({ x, y }), X, Y, 0)) { ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y)); ctx.stroke(); }
    legend.push({ color: it.color, text: it.label, fill: true });
  }
  for (const it of scene.items) {
    ctx.strokeStyle = col(it.color); ctx.fillStyle = col(it.color); ctx.lineWidth = 2;
    ctx.setLineDash(it.dash ? [6, 4] : []);
    if (it.t === "fn") {
      ctx.beginPath(); let pen = false; let prev = null;
      for (let i = 0; i <= W; i++) {
        const x = X[0] + (i / W) * (X[1] - X[0]); const y = it.f(x);
        const jump = prev !== null && Math.abs(y - prev) > (Y[1] - Y[0]) * 2;
        if (!Number.isFinite(y) || jump) { pen = false; prev = Number.isFinite(y) ? y : null; continue; }
        if (pen) ctx.lineTo(i, py(y)); else ctx.moveTo(i, py(y));
        pen = true; prev = y;
      }
      ctx.stroke(); legend.push({ color: it.color, text: it.label });
    } else if (it.t === "implicit") {
      for (const [a, b] of contourSegments((x, y) => it.g({ x, y }), X, Y, 0, 220, 160)) { ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y)); ctx.stroke(); }
      legend.push({ color: it.color, text: it.label });
    } else if (it.t === "contour") {
      const [u, v] = it.F.vars;
      const g = (x, y) => it.F.f({ [u]: x, [v]: y });
      let levels = it.levels;
      if (!levels) {
        const s = [];
        for (let j = 0; j <= 30; j++) for (let i = 0; i <= 30; i++) { const z = g(X[0] + ((X[1] - X[0]) * i) / 30, Y[0] + ((Y[1] - Y[0]) * j) / 30); if (Number.isFinite(z)) s.push(z); }
        s.sort((a, b) => a - b);
        levels = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((q) => s[Math.floor(q * (s.length - 1))]).filter((z, i, a) => a.indexOf(z) === i);
      }
      ctx.lineWidth = 1.4;
      levels.forEach((lv, k) => {
        ctx.globalAlpha = 0.45 + (0.55 * (k + 1)) / levels.length;
        for (const [a, b] of contourSegments(g, X, Y, lv)) { ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y)); ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
      legend.push({ color: it.color, text: `${it.label}: ${it.F.v ? "" : ""}levels ${levels.map((z) => Number(z.toFixed(2))).join(", ")}` });
    } else if (it.t === "param") {
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const t = it.t0 + ((it.t1 - it.t0) * i) / 400; const x = it.X.f({ t }); const y = it.Y.f({ t }); if (i) ctx.lineTo(px(x), py(y)); else ctx.moveTo(px(x), py(y)); }
      ctx.stroke(); legend.push({ color: it.color, text: it.label });
    } else if (it.t === "line" || it.t === "segment") {
      let { a, b } = it;
      if (it.t === "line") { const dx = b.x - a.x; const dy = b.y - a.y; const L = 1e3 * Math.max(X[1] - X[0], Y[1] - Y[0]) / Math.hypot(dx, dy || 1e-9); a = { x: a.x - dx * L, y: a.y - dy * L }; b = { x: b.x + dx * L, y: b.y + dy * L }; }
      ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y)); ctx.stroke();
    } else if (it.t === "polygon") {
      ctx.beginPath(); it.ps.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.y)) : ctx.moveTo(px(p.x), py(p.y)))); ctx.closePath();
      ctx.fillStyle = alpha(it.color, 0.25); ctx.fill(); ctx.stroke();
    } else if (it.t === "arrow") {
      const ax = px(it.from.x); const ay = py(it.from.y); const bx = px(it.to.x); const by = py(it.to.y);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 10 * Math.cos(ang - 0.4), by - 10 * Math.sin(ang - 0.4)); ctx.lineTo(bx - 10 * Math.cos(ang + 0.4), by - 10 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
      if (it.label) { ctx.font = "12px sans-serif"; ctx.fillText(it.label, bx + 4, by - 4); }
    }
    ctx.setLineDash([]);
  }
  // Points and labels on top.
  for (const it of scene.items) {
    ctx.fillStyle = col(it.color); ctx.font = "12px sans-serif";
    const dot = (p, label) => { ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 4, 0, 2 * Math.PI); ctx.fill(); if (label) ctx.fillText(label, px(p.x) + 6, py(p.y) - 6); };
    if (it.t === "point") dot(it.p, it.label || it.p.name || `(${Number(it.p.x.toFixed(3))}, ${Number(it.p.y.toFixed(3))})`);
    if (it.t === "points") { it.ps.forEach((p) => dot(p)); legend.push({ color: it.color, text: it.label }); }
    if (it.t === "label") { ctx.fillStyle = fg; ctx.fillText(it.text, px(it.p.x) + 6, py(it.p.y) - 6); }
  }
  // Legend, with the LaTeX made readable (\sin x -> sin x, \le -> ≤).
  const pretty = (s) => String(s)
    .replace(/\\(le|leq)\b/g, "≤").replace(/\\(ge|geq)\b/g, "≥").replace(/\\cdot\b/g, "·").replace(/\\pi\b/g, "π")
    .replace(/\\(alpha|beta|lambda|theta)\b/g, (_, g) => ({ alpha: "α", beta: "β", lambda: "λ", theta: "θ" })[g])
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\\([A-Za-z]+)/g, "$1").replace(/\^\{([^{}]*)\}/g, "^$1").replace(/[{}]/g, "");
  for (const l of legend) l.text = pretty(l.text);
  ctx.font = "12px sans-serif";
  const lw = Math.min(W - 20, Math.max(0, ...legend.map((l) => ctx.measureText ? ctx.measureText(l.text).width : l.text.length * 7)) + 30);
  if (legend.length) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = bg; ctx.fillRect(8, 8, lw, legend.length * 18 + 8); ctx.globalAlpha = 1;
    legend.forEach((l, i) => {
      ctx.fillStyle = l.fill ? alpha(l.color, 0.5) : l.color; ctx.fillRect(14, 16 + i * 18, 14, l.fill ? 10 : 3);
      ctx.fillStyle = fg; ctx.fillText(l.text, 34, 24 + i * 18);
    });
  }
  return { X, Y, legend };
}
