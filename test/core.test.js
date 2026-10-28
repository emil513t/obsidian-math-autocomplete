import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isCursorInMath, extractMath } from "../src/mathContext.js";
import { scanDocument, mergeStats } from "../src/stats.js";
import { rankSuggestions } from "../src/rank.js";
import { cursorOffset } from "../src/dictionary.js";

test("math detection", () => {
  assert.equal(isCursorInMath("hello $x + \\fr"), true);
  assert.equal(isCursorInMath("hello $x$ and \\fr"), false);
  assert.equal(isCursorInMath("$$\na = \\fr"), true);
  assert.equal(isCursorInMath("$$\na\n$$\nafter \\fr"), false);
  assert.equal(isCursorInMath("costs \\$5 and \\fr"), false);
  assert.equal(isCursorInMath("```\n$x \\fr"), false);
  assert.equal(isCursorInMath("```\n$x\n```\n$\\fr"), true);
  assert.equal(isCursorInMath("`$` then \\fr"), false);
  assert.equal(isCursorInMath("lonely $ dollar\n\nnew para \\fr"), false);
  assert.equal(isCursorInMath("$$\n\\begin{aligned}\n\na &= \\fr"), true);
});

test("extract + scan", () => {
  assert.deepEqual(extractMath("a $x^2$ b $$\\frac{d}{dx}$$ `$no$`"), ["x^2", "\\frac{d}{dx}"]);
  const s = scanDocument("$\\frac{d}{dx} f$ and $\\frac{d}{dx}g$ and $\\sum_{i=1}^{n} i$");
  assert.equal(s.cmds.get("frac"), 2);
  assert.equal(s.atoms.get("\\frac{d}{dx}"), 2);
  assert.equal(s.atoms.get("\\sum_{i=1}^{n}"), 1);
});

test("ranking", () => {
  const stats = { cmds: new Map([["frac", 10], ["int", 50]]), atoms: new Map([["\\frac{d}{dx}", 4]]) };
  const r = rankSuggestions("fr", stats);
  assert.equal(r[0].insert, "\\frac{}{}");
  assert.ok(r.some((x) => x.insert === "\\frac{d}{dx}"));
  assert.equal(rankSuggestions("in", stats)[0].insert, "\\in");
  assert.equal(rankSuggestions("i", stats)[0].insert, "\\int_{}^{}");
  const boosted = rankSuggestions("fr", stats, { "\\frac{d}{dx}": 5 });
  assert.equal(boosted[0].insert, "\\frac{d}{dx}");
  assert.equal(rankSuggestions("alpha", stats).length, 1);
});

test("cursor offsets", () => {
  assert.equal(cursorOffset("\\frac{}{}"), 6);
  assert.equal(cursorOffset("\\lim_{ \\to }"), 6);
  assert.equal(cursorOffset("\\alpha"), 6);
  assert.equal(cursorOffset("\\begin{pmatrix}\n\n\\end{pmatrix}"), 16);
});

const VAULT = "C:/Users/emill/OneDrive/Desktop/CS Shit/Obsidian/Emil";
test("real vault scan", { skip: !fs.existsSync(VAULT) }, () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) files.push(p);
    }
  };
  walk(VAULT);
  const t0 = Date.now();
  const stats = mergeStats(files.map((f) => scanDocument(fs.readFileSync(f, "utf8"))));
  const ms = Date.now() - t0;
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join("  ");
  console.log(`files=${files.length} cmds=${stats.cmds.size} atoms=${stats.atoms.size} in ${ms}ms`);
  console.log("TOP CMDS ", top(stats.cmds, 20));
  console.log("TOP ATOMS", top(stats.atoms, 15));
  for (const q of ["fr", "su", "ma", "in", "le"]) {
    console.log(`\\${q} ->`, rankSuggestions(q, stats).slice(0, 6).map((x) => x.insert).join(" | "));
  }
  assert.ok(stats.cmds.size > 0);
});
