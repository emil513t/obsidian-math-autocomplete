// Study card for an exercise: not a solution, a plan. From the exercise text
// (or its IMO26 number) it finds the command(s) and the kind of task, and
// lists what has to be shown / computed / disproved, the ways to do it (the
// command's routes), tricks, the definitions and results to look at and
// similar book exercises. The verdict (true or false, which route works) is
// only shown when switched on, folded as a spoiler.
// Pure, no Obsidian imports.
import { citations } from "./explain.js";
import { parseVars } from "./vars.js";

// ---------- words ----------

const STOP = new Set(`a an the and or of to in on for is are be by with that this it as at from we you your
  use using show prove find compute let suppose then there which what when where why how if not no can
  given above below following give example python cell displayed pdf version prompt chatbot exercise
  its their these those such so all any each one two three some only also into than more most may
  must should would will do does done has have had been being was were here very well same other`.split(/\s+/));
const stem = (w) => w.replace(/ies$/, "y").replace(/(?<![usi])s$/, "");
export const words = (t) => String(t).toLowerCase().replace(/\\[a-z]+/g, " ").replace(/[^a-z\s-]/g, " ").split(/[\s-]+/)
  .filter((w) => w.length > 2 && !STOP.has(w)).map(stem);

// ---------- tips ----------

// "## \name" / "## E4" sections with show: / prove: / disprove: / trick: lines.
export function parseTips(md) {
  const out = new Map();
  let cur = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = line.match(/^## \\?([A-Za-z]\w*)\s*$/);
    if (h) { cur = { show: [], prove: [], disprove: [], trick: [] }; out.set(h[1], cur); continue; }
    const m = cur && line.match(/^(show|prove|disprove|trick):\s*(.+)$/);
    if (m) cur[m[1]].push(m[2].trim());
  }
  return out;
}

// ---------- what kind of task ----------

const KINDS = [
  ["disprove", /\b(disprove|is not|are not|isn't|cannot|can not|impossible|does not exist|no such|not (open|closed|bounded|compact|convex|continuous|injective|surjective|invertible|positive|separable))\b/i, "show that something fails"],
  ["construct", /\b(give an example|find an example|an example of|construct)\b/i, "give an example"],
  ["decide", /((^|[.!?:]\s*|\(\w+\)\s*)(is|are|does|do|can|has|have)\b[^.?]{0,160}\?)|\b(decide|determine whether|whether|true or false)\b/i, "decide, then prove or disprove"],
  ["prove", /\b(prove|show that|verify|explain why|justify)\b/i, "prove the statement"],
  ["compute", /\b(compute|find|calculate|determine|solve|evaluate|what is|how many)\b/i, "compute"],
  ["explain", /\b(explain|why)\b/i, "explain"],
];
export function taskType(text) {
  const hits = KINDS.filter(([, re]) => re.test(text)).map(([k, , say]) => ({ kind: k, say }));
  return hits.length ? hits : [{ kind: "compute", say: "compute / answer" }];
}

// ---------- which command ----------

// Strong hints: words that name the topic directly.
const RULES = [
  [/closest|shortest distance|distance (from|to|between)[^.]*\b(line|plane|curve)|subject to|lagrange/i, "lagrange"],
  [/positive (semi-?)?definite|indefinite|semi-?definite/i, "posdef"],
  [/invertible|inverse matrix|inverse of (the )?matri/i, "matinv"],
  [/\bcompact\b/i, "compact"], [/\bbounded\b/i, "bounded"],
  [/\bopen (set|subset)|\bis open\b|\bnot open\b/i, "openset"], [/\bclosed (set|subset)|\bis closed\b|\bnot closed\b/i, "closedset"],
  [/boundary|interior/i, "boundary"],
  [/\blimit\b|\\lim\b|\bconverge/i, "limit"], [/\bcontinuous\b/i, "continuous"],
  [/\bkkt\b|karush|kuhn/i, "kkt"], [/separat|support vector|\bsvm\b|hyperplane.*(points|labels)/i, "svm"],
  [/strictly convex/i, "strictconvex"], [/convex function|function[^.]{0,40} convex|is convex\b/i, "convexfn"],
  [/convex (set|subset)|subset[^.]{0,40} convex/i, "convexset"],
  [/critical point|local (max|min)|saddle|extrem/i, "crit"], [/hessian/i, "hessian"], [/gradient/i, "gradient"],
  [/taylor/i, "taylor"], [/newton/i, "newton"], [/induction|for all n\b|for every n\b|natural number n/i, "sumind"],
  [/\binjective/i, "injective"], [/\bsurjective/i, "surjective"], [/\bbijective/i, "bijective"],
  [/truth table|proposition[s]? .*(equivalent|same)/i, "truthtable"],
  [/linear equations|system of equations|gauss/i, "gauss"], [/least squares|best fit/i, "leastsquares"],
  [/fourier|motzkin|inequalities? .*(solution|solvable)/i, "fm"], [/\broots?\b|zeros? of (the )?polynomial/i, "roots"],
  [/irrational/i, "irrational"], [/increasing|decreasing/i, "increasing"], [/mean value/i, "mvt"],
  [/chain rule/i, "chainrule"], [/interpolat/i, "interpolate"], [/preimage/i, "preimage"],
  [/orthogonal|perpendicular/i, "orthogonal"], [/extreme value|attains? (a |its )?(max|min)/i, "evt"],
  [/intermediate value|bolzano|has a (root|solution) in/i, "ivt"], [/perceptron|logic gate|\bxor\b/i, "perceptron"],
  [/maximum and minimum (on|of)|max and min (on|of)|global (max|min)[^.]* on/i, "compactopt"],
  [/matrix product|multiply the matri/i, "matmul"], [/polynomial division|divide .* polynomial/i, "polydiv"],
  [/set equal|sets are equal|a = b for sets/i, "setequal"], [/subset/i, "subsetproof"],
  [/derivative|differentiab/i, "derivative"], [/inverse function/i, "inversefn"],
  [/optimization problem|formulate/i, "formulate"], [/mistake|wrong with/i, "fakeproof"],
];
// Strategy templates that tell how, not what (never the main command).
const STRATEGY = new Set(["showthat", "iff", "contradiction", "explain", "definition", "proof", "find", "induction"]);

const exNum = (text) => {
  const m = String(text).match(/\b(?:ex(?:ercise)?|opgave|øvelse)\.?\s*(\d+\.\d+)/i) || String(text).trim().match(/^(\d+\.\d+)$/);
  return m ? m[1] : null;
};

// [{ name, score, why }] best first; exercises: [{ id, sim }].
// index: exercise-index.json, names: the template names that exist.
export function classify(text, index, names, vars = new Map()) {
  const score = new Map();
  const why = new Map();
  const bump = (n, s, w) => {
    if (!names.has(n) || STRATEGY.has(n)) return;
    score.set(n, (score.get(n) || 0) + s);
    if (w && !why.get(n)) why.set(n, w);
  };
  const id = exNum(text);
  const own = id ? index.find((e) => e.id === id) : null;
  if (own) own.t.forEach((n, i) => bump(n, 10 - i, `Exercise ${own.id} in the book`));
  // Words naming the topic count most; the first one in the text a bit more.
  RULES.map(([re, n]) => ({ n, m: String(text).match(re) })).filter((x) => x.m)
    .sort((a, b) => a.m.index - b.m.index).forEach((x, i) => bump(x.n, i === 0 ? 6 : 5, `"${x.m[0].trim()}"`));
  // Similar book exercises by their keywords (at most 3 points in all).
  const ws = new Set(words(text));
  const sims = index.map((e) => ({ id: e.id, e, sim: e.kw.filter((k) => ws.has(k)).length / Math.sqrt(e.kw.length || 1) }))
    .filter((x) => x.sim > 0 && x.id !== id).sort((a, b) => b.sim - a.sim).slice(0, 5);
  const total = sims.reduce((s, x) => s + x.sim, 0) || 1;
  for (const s of sims) s.e.t.forEach((n) => bump(n, (3 * s.sim) / total, `like Exercise ${s.id}`));
  // Several variables: critical points are \critxy.
  const fn = [...vars.values()].find((v) => v.params && v.params.length > 1);
  if (score.has("crit") && fn) { bump("critxy", score.get("crit") + 0.5, why.get("crit")); score.delete("crit"); }
  const ranked = [...score].sort((a, b) => b[1] - a[1]).map(([name, s]) => ({ name, score: s, why: why.get(name) || "" }));
  const strategies = own ? own.t.filter((n) => STRATEGY.has(n)) : [];
  return { commands: ranked, exercise: own, similar: sims.map((s) => s.e), strategies };
}

// ---------- the note's objects from the exercise text ----------

// Lines for a vars block: f(x, y) = ..., A = matrix, S = set, p = (1, 1),
// a line y = x + 1 as the constraint and |v - p|^2 for "closest to p".
export function extractVars(text) {
  const t = String(text);
  const math = [...t.matchAll(/\$\$?([^$]+)\$\$?/g)].map((m) => m[1].trim());
  const lines = [];
  const seen = new Set();
  const add = (l) => {
    const name = l.split("=")[0].trim().replace(/\(.*$/, "");
    if (seen.has(name)) return;
    const v = parseVars("```vars\n" + l + "\n```\n").get(name);
    if (!v || v.error) return;
    seen.add(name);
    lines.push(l);
  };
  for (const m of math) {
    for (const part of m.split(/,\s*(?=[a-zA-Z]\w*(?:\([^)]*\))?\s*=)/)) {
      const a = part.match(/^\s*([A-Za-z](?:_\w+|\d)?(?:\([a-z](?:,\s*[a-z])*\))?)\s*=\s*(.+?)\s*[.,;]?\s*$/);
      // y = x + 1 is a line (handled below as the constraint g), not a value of y.
      if (a && !/^[xyz]$/.test(a[1])) add(`${a[1]} = ${a[2]}`);
    }
  }
  // Plain-text "f(x, y) = x^2 + y^2" outside $ $.
  for (const m of t.replace(/\$[^$]*\$/g, " ").matchAll(/\b([fgh](?:\([a-z](?:,\s*[a-z])*\)))\s*=\s*([^,.;\n]+)/g)) add(`${m[1]} = ${m[2].trim()}`);
  // "the line y = x + 1" / "the plane ...": a constraint.
  const line = t.match(/\b(?:line|plane|curve|constraint)\s*\$?\s*([xyz]\s*=\s*[^$,.;\n]+|[^$,.;\n]+=\s*0)\s*\$?/i);
  if (line && !seen.has("g")) {
    const [l, r] = line[1].split("=").map((s) => s.trim());
    add(`g = ${l} - (${r})`);
  }
  // "closest to (1, 1)" / "distance from the point (1, 1)": f = |v - p|^2.
  const pt = t.match(/(?:closest to|nearest to|distance (?:from|to) (?:the )?(?:point )?)\s*\$?\s*\(([^()]+)\)/i);
  if (pt && !seen.has("f")) {
    const cs = pt[1].split(",").map((s) => s.trim());
    const xs = ["x", "y", "z"].slice(0, cs.length);
    if (cs.length >= 2 && cs.length <= 3) add(`f(${xs.join(", ")}) = ${xs.map((x, i) => `(${x} - ${cs[i]})^2`).join(" + ")}`);
  }
  return lines;
}

// ---------- the card ----------

const DISPROVE_ROUTE = /^NOT\b|fails|does NOT|not strictly|impossible|is not|NOT separable/i;
const ENGINE_FOR = {
  bounded: "E7", openset: "E7", closedset: "E7", compact: "E7", limit: "E7", boundary: "E7",
  posdef: "E6", matinv: "E6", matmul: "E6", convexfn: "E8", strictconvex: "E8", convexset: "E8",
  kkt: "E9", convexopt: "E9", svm: "E4", fm: "E4", gauss: "E5", injective: "E3", surjective: "E3",
  setequal: "E2", truthtable: "E2", irrational: "E10", roots: "E10", fakeproof: "E11",
};

// opts: { text, index, tips (Map), templates ([{ name, desc, variants }]), vars (Map),
//         refs, verdict (bool), fit(route, name) -> { ok, best, why } | null,
//         cite(name, sources) -> items, explain(items) -> folded callout }
export function studyCard(opts) {
  const { text, index, tips, templates, refs = [], verdict = false } = opts;
  const byName = new Map(templates.map((t) => [t.name, t]));
  const extracted = extractVars(text);
  let vars = opts.vars instanceof Map ? opts.vars : new Map();
  if (extracted.length) {
    const own = parseVars("```vars\n" + extracted.join("\n") + "\n```\n");
    vars = new Map([...own, ...vars]);
    vars.assumptions = [...(own.assumptions || []), ...(opts.vars?.assumptions || [])];
  }
  const C = classify(text, index, new Set(byName.keys()), vars);
  // Just a number (Ex 5.9): the book's classification says what kind of task it is.
  const onlyNumber = C.exercise && words(String(text).replace(/\b(ex(ercise)?|opgave|øvelse)\b/gi, "")).length === 0;
  const kinds = onlyNumber
    ? C.exercise.engine ? [{ kind: "disprove", say: "show that something fails or is impossible (a \"not\" exercise in the book)" }]
      : C.strategies.includes("iff") ? [{ kind: "prove", say: "prove both directions" }]
      : C.strategies.some((s) => /showthat|proof|contradiction|induction/.test(s)) ? [{ kind: "prove", say: "prove the statement" }]
      : C.strategies.includes("explain") ? [{ kind: "explain", say: "explain" }]
      : [{ kind: "compute", say: "compute / answer (see the exercise in the book)" }]
    : taskType(text);
  const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const main = C.commands[0] ? byName.get(C.commands[0].name) : null;
  const L = [];
  const q = (s = "") => L.push(s ? `> ${s}` : ">");

  L.push(`> [!abstract] Study card${main ? ` · \`\\${main.name}\`` : ""}${C.exercise ? ` · Exercise ${C.exercise.id} (p. ${C.exercise.page})` : ""}`);
  q(`**Task:** ${kinds.map((k) => k.say).join("; ")}.`);
  if (main) {
    q(`**Topic:** ${main.desc || main.name}${C.commands[0].why ? ` (found from ${C.commands[0].why})` : ""}.`);
    const others = C.commands.slice(1, 4).map((c) => `\`\\${c.name}\``);
    if (others.length) q(`**Also related:** ${others.join(", ")}.`);
  } else {
    q("**Topic:** not recognised: name the topic in the text (e.g. \"compact\", \"positive definite\", \"Lagrange\") or give the exercise number.");
  }
  if (extracted.length) q(`**Read from the text:** ${extracted.map((l) => `\`${l}\``).join(", ")} (a vars block with these is below).`);

  if (main) {
    const T = tips.get(main.name) || { show: [], prove: [], disprove: [], trick: [] };
    const decide = kinds.some((k) => k.kind === "decide");
    const dis = kinds.some((k) => k.kind === "disprove");
    q();
    q("**What you need**");
    let n = 0;
    for (const s of T.show) q(`${++n}. ${s}`);
    if (!dis && T.prove.length) for (const s of T.prove) q(`${++n}. ${decide ? `If it holds: ${low(s)}` : s}`);
    if ((dis || decide) && T.disprove.length) for (const s of T.disprove) q(`${++n}. ${decide ? `If it fails: ${low(s)}` : s}`);
    if (!n) q("1. Use the definitions below; write what is given and what is wanted.");

    // The routes, split into proving and disproving ones.
    const routes = main.variants.filter((v) => v.label);
    if (routes.length) {
      const pro = routes.filter((v) => !DISPROVE_ROUTE.test(v.label));
      const con = routes.filter((v) => DISPROVE_ROUTE.test(v.label));
      q();
      q(`**Ways to do it** (\`\\${main.name}\` inserts each one as a template)`);
      const p = () => pro.length && q(`- ${con.length ? "To show it: " : ""}${pro.map((v) => v.label).join(" · ")}`);
      const c = () => con.length && q(`- To disprove it: ${con.map((v) => v.label).join(" · ")}`);
      if (dis) { c(); p(); } else { p(); c(); }
    }

    // Every way this kind of exercise can end, for any values.
    const ends = opts.outcomes?.get(main.name) || [];
    if (ends.length) {
      q();
      q("**Possible endings** (what you see → what you conclude)");
      for (const e of ends) q(`- **${e.name}**: ${e.see} → ${e.conclude}${e.route ? ` _(route: ${e.route})_` : ""}`);
    }

    // Tricks: the command's, the engine's (for "not" tasks) and the strategy's.
    const tricks = [...T.trick];
    const eng = C.exercise?.engine || ((dis || decide) && ENGINE_FOR[main.name]);
    if (eng && tips.get(eng)) tricks.push(...tips.get(eng).trick);
    for (const s of C.strategies) if (tips.get(s)) tricks.push(...tips.get(s).trick, ...tips.get(s).show.slice(0, 1));
    if (tricks.length) {
      q();
      q("**Tricks**");
      for (const s of [...new Set(tricks)].slice(0, 7)) q(`- ${s}`);
    }

    // Look at: the references of the tips and routes (cited from the result only with the verdict on).
    const sources = [main.desc, ...routes.map((v) => v.label), ...T.show, ...T.prove, ...T.disprove, ...T.trick];
    const items = verdict && opts.cite ? opts.cite(main.name, sources, vars) : opts.items ? opts.items(sources) : [];
    const look = items.filter((it) => it.kind !== "exercise").slice(0, 10);
    if (look.length) {
      q();
      q(`**Look at:** ${look.map((it) => `${it.label}${it.title ? ` (${it.title})` : ""}`).join(" · ")}`);
    }
    const exs = [C.exercise, ...C.similar].filter(Boolean).filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i);
    const same = exs.filter((e) => e.t.includes(main.name) && e !== C.exercise).slice(0, 4);
    const exCited = citations(sources.join(" ")).filter((c) => c.kind === "exercise").map((c) => c.num);
    const list = [...new Set([...same.map((e) => e.id), ...exCited])].filter((x) => x !== C.exercise?.id).slice(0, 5);
    if (list.length) q(`**Similar book exercises:** ${list.map((x) => `Ex ${x}`).join(", ")}`);

    // Verdict: only when switched on, folded.
    if (verdict && opts.fit) {
      const fits = routes.map((v) => ({ v, f: opts.fit(v, main.name, vars) })).filter((x) => x.f);
      const best = fits.find((x) => x.f.best) || null;
      L.push("");
      L.push("> [!warning]- Verdict (spoiler: click to open)");
      const got = opts.outcomeOf ? opts.outcomeOf(main.name, vars) : null;
      if (got && got.length) {
        const name = (k) => ends.find((e) => e.key === k)?.name || k;
        L.push(`> **Your values end as:** ${got.map((g) => `**${name(g.key)}** (${g.why})`).join("; ")}.`);
        L.push(">");
        // A parameter: one row per case.
        for (const g of got.filter((x) => x.cases)) {
          L.push(`> | $${g.p}$ | ending |`, "> |---|---|");
          for (const c of g.cases) L.push(`> | $${c.where}$ | ${c.name} |`);
          L.push(">");
        }
      }
      if (best) {
        L.push(`> ${best.f.why ? best.f.why.charAt(0).toUpperCase() + best.f.why.slice(1) + "." : ""} Take the route **${best.v.label}**.`);
      } else if (fits.length) {
        L.push(`> ${fits[0].f.why ? fits[0].f.why + "." : ""} No single route stands out: use the steps above.`);
      } else if (got && got.length) {
        const r = ends.find((e) => e.key === got[0].key)?.route;
        L.push(r ? `> Route: **${r}**.` : "> No route for this ending: use the steps above.");
      } else {
        L.push("> Not decided from the note: put the exercise's objects in a vars block (f, A, S, ...) so the plugin can compute it.");
      }
    }
    if (look.length && opts.explain) {
      const box = opts.explain(look);
      if (box) L.push("", box.replace(/^\n+/, "").replace(/\n+$/, ""));
    }
  }
  const varsBlock = extracted.length && !(opts.vars instanceof Map && extracted.every((l) => opts.vars.has(l.split("=")[0].trim().replace(/\(.*$/, ""))))
    ? "\n```vars\n" + extracted.join("\n") + "\n```\n" : "";
  return { markdown: L.join("\n") + "\n" + varsBlock, command: main?.name || null, classify: C, kinds, extracted };
}
