// Builds src/exercise-index.json from docs/imo26-coverage: for every IMO26
// exercise its number, chapter, the text templates (TCOV) and python
// snippets (COV) that solve it, the contradiction engine (CONTRADICTIONS.md)
// and a handful of keywords for matching a typed exercise to it.
// No book text is written: only numbers, command names and single keywords.
//   node scripts/build-exercise-index.mjs
import fs from "node:fs";

const dir = new URL("../docs/imo26-coverage/", import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, dir), "utf8");
const ex = JSON.parse(read("ex.json"));

// "1.19": "truthtable", ... from the python dict files.
function dict(files) {
  const out = {};
  for (const f of files) for (const m of read(f).matchAll(/"(\d+\.\d+)"\s*:\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}
const TCOV = dict(["tcov_ch1.py", "tcov_ch2345.py", "tcov_ch6789.py"]);
const COV = dict(["cov_ch1.py", "cov_ch23.py", "cov_ch45.py", "cov_ch67.py", "cov_ch89.py"]);

// Engine per exercise from the summary table ("| E4 | ... | 1.123 4.42 5.9 | ...").
const ENGINE = {};
for (const line of read("CONTRADICTIONS.md").split("\n")) {
  const m = line.match(/^\|\s*(E\d+)\s*\|[^|]*\|[^|]*\|([^|]*)\|/);
  if (!m) continue;
  for (const id of m[2].matchAll(/(\d+\.\d+)/g)) ENGINE[id[1]] ??= m[1];
}

import { words } from "../src/studycard.js";

const df = new Map();
const docs = ex.map((e) => { const w = words(e.text); new Set(w).forEach((x) => df.set(x, (df.get(x) || 0) + 1)); return w; });
const N = ex.length;
const out = ex.map((e, i) => {
  const tf = new Map();
  for (const w of docs[i]) tf.set(w, (tf.get(w) || 0) + 1);
  const kw = [...tf].filter(([w]) => df.get(w) <= N / 4)
    .map(([w, c]) => [w, c * Math.log(N / df.get(w))]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
  const t = (TCOV[e.id] || "").split(/\s+/).filter(Boolean);
  const py = (COV[e.id] || "").replace(/\+|\[[^\]]*\]/g, "").split(/\s+/).filter((s) => s && s !== "-");
  return { id: e.id, ch: e.ch, page: e.page, t, py, ...(ENGINE[e.id] ? { engine: ENGINE[e.id] } : {}), kw };
});
fs.writeFileSync(new URL("../src/exercise-index.json", import.meta.url), JSON.stringify(out));
console.log(`${out.length} exercises, ${out.filter((x) => x.t.length).length} with templates, ${Object.keys(ENGINE).length} with an engine`);
