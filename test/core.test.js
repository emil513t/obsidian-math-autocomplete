import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isCursorInMath, extractMath } from "../src/mathContext.js";
import { scanDocument, mergeStats } from "../src/stats.js";
import { rankSuggestions } from "../src/rank.js";
import { cursorOffset, previewSource, DICTIONARY } from "../src/dictionary.js";

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
  assert.equal(cursorOffset("\\begin{pmatrix}  \\end{pmatrix}"), 16);
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

import { envOf, variantsFor, buildEnv, previewOf } from "../src/variants.js";

test("environment fills", () => {
  const BS = String.fromCharCode(92);
  assert.equal(envOf(`${BS}begin{pmatrix}  ${BS}end{pmatrix}`), "pmatrix");
  assert.equal(envOf(`${BS}frac{}{}`), null);
  assert.equal(variantsFor("frac"), null);
  const v = (env, id) => variantsFor(env).find((x) => x.id === id);

  const abcd = buildEnv("pmatrix", v("pmatrix", "abcd"));
  assert.equal(abcd.text, `${BS}begin{pmatrix} a & b ${BS}${BS} c & d ${BS}end{pmatrix}`);
  assert.ok(!abcd.text.includes("\n"), "fills stay on one line");
  assert.equal(abcd.cursor, abcd.text.length);

  const id3 = buildEnv("bmatrix", v("bmatrix", "id3")).text;
  assert.ok(id3.includes(`1 & 0 & 0 ${BS}${BS} 0 & 1 & 0`));

  const blank = buildEnv("pmatrix", v("pmatrix", "blank2"));
  assert.equal(blank.text.slice(blank.cursor, blank.cursor + 3), " & ");

  const al = buildEnv("aligned", v("aligned", "chain")).text;
  assert.equal(al, `${BS}begin{aligned} &= ${BS}${BS} &= ${BS}end{aligned}`);

  assert.ok(previewOf("align", v("align", "eq2")).startsWith(`${BS}begin{aligned}`));
  assert.ok(previewOf("pmatrix", v("pmatrix", "blank2")).includes(`${BS}square & ${BS}square`));
});

import { fillsFor } from "../src/fills.js";
import { cursorContext } from "../src/mathContext.js";
import { parseTemplates, mergeTemplates, expandBody, rankTemplates, nextPlaceholder, mirrorChanges, placeholders } from "../src/templates.js";

import { parseRefQuery, rankRefs, formatRef } from "../src/refs.js";

test("imo26 templates + references", () => {
  const imo = parseTemplates(fs.readFileSync(new URL("../src/imo26-templates.md", import.meta.url), "utf8"));
  const generic = parseTemplates(fs.readFileSync(new URL("../src/default-templates.md", import.meta.url), "utf8"));
  assert.ok(imo.length >= 60, `imo26 templates: ${imo.length}`);
  const names = [...generic, ...imo].map((t) => t.name);
  assert.equal(new Set(names).size, names.length, "no duplicate template names");
  for (const t of imo) {
    assert.match(t.name, /^[a-zA-Z]+$/, "names are letters only (trigger regex)");
    for (const m of t.body.matchAll(/\$\$([\s\S]*?)\$\$/g)) assert.ok(!m[1].includes("\n"), `${t.name}: $$ on one line`);
    assert.ok(!/[_^]\{\{/.test(t.body), `${t.name}: wrap sub/superscript blanks in braces`);
    const expanded = expandBody(t.body);
    assert.ok(!/\{\{|\}\}/.test(expanded.replace(/\{\{\{|\}\}\}/g, "")), `${t.name}: every {{ }} expands`);
    // Template names must not be swallowed by a reference prefix.
    const rq = parseRefQuery(t.name);
    if (rq) assert.equal(rankRefs([], rq).length, 0);
  }
  assert.deepEqual(mirrorChanges("a ⟨_⟩ b ⟨_⟩", "_", "t"), [], "{{_}} never mirrors");

  const refs = JSON.parse(fs.readFileSync(new URL("../src/refs/imo26.json", import.meta.url), "utf8"));
  assert.equal(refs.length, 133);
  for (const r of refs) assert.ok(r.title && r.num && r.page, `${r.kind} ${r.num}`);
  const kinds = new Set(refs.map((r) => r.kind));
  for (const k of ["definition", "theorem", "proposition", "lemma", "remark", "corollary"]) assert.ok(kinds.has(k), k);

  assert.deepEqual(parseRefQuery("def4.2"), { kind: "definition", q: "4.2" });
  assert.deepEqual(parseRefQuery("ref convex fun"), { kind: null, q: "convex fun" });
  assert.equal(parseRefQuery("proof"), null);
  assert.equal(parseRefQuery("prop").kind, "proposition");

  assert.equal(rankRefs(refs, parseRefQuery("def4.26"))[0].title, "Convex function");
  assert.equal(rankRefs(refs, parseRefQuery("thmcauchy"))[0].num, "5.24");
  assert.equal(rankRefs(refs, parseRefQuery("ref extreme value"))[0].num, "5.84");
  assert.equal(rankRefs(refs, parseRefQuery("lem")).length, 5);
  assert.ok(rankRefs(refs, parseRefQuery("ref kkt")).some((r) => r.num === "9.37"));
  assert.equal(rankRefs(refs, parseRefQuery("def")).length, 42);

  const d = refs.find((r) => r.kind === "definition" && r.num === "4.26");
  assert.equal(formatRef(d), "Definition 4.26 (Convex function)");
  assert.match(formatRef(d, "IMO26_ALL_DEFINITIONS"), /^\[\[IMO26_ALL_DEFINITIONS#Definition 4\.26 .*\|Definition 4\.26 \(Convex function\)\]\]$/);
  const rem = refs.find((r) => r.kind === "remark");
  assert.ok(!formatRef(rem, "X").startsWith("[["), "no link without a heading");
});

test("templates", () => {
  const BS = String.fromCharCode(92);
  const md = fs.readFileSync(new URL("../src/default-templates.md", import.meta.url), "utf8");
  const defs = parseTemplates(md);
  const names = defs.map((t) => t.name);
  for (const n of ["proof", "showthat", "induction", "contradiction", "epsdelta", "invariant", "solution"]) assert.ok(names.includes(n), n);
  assert.equal(defs.find((t) => t.name === "proof").desc, "direct proof");
  assert.ok(!defs.some((t) => t.body.includes("## ")), "bodies don't swallow headings");
  for (const t of defs) {
    // Display math must stay on one line (Emil's rule from the fills work).
    for (const m of t.body.matchAll(/\$\$([\s\S]*?)\$\$/g)) assert.ok(!m[1].includes("\n"), `${t.name} $$ one line`);
    assert.ok(placeholders(expandBody(t.body)).length > 0, `${t.name} has placeholders`);
  }

  // Contexts: only plain text gets templates.
  assert.equal(cursorContext("hi \\pr"), "text");
  assert.equal(cursorContext("hi $x \\pr"), "math");
  assert.equal(cursorContext("```\n\\pr"), "code");
  assert.equal(cursorContext("`\\pr"), "code");

  // User file overrides by name and adds new ones.
  const user = parseTemplates(`## ${BS}proof - mine\nMy {{x}}\n\n## ${BS}lemma\nLemma {{y}}\n# other\nignored`);
  assert.equal(user.length, 2);
  assert.equal(user[1].body, "Lemma {{y}}");
  const all = mergeTemplates(defs, user);
  assert.equal(all.find((t) => t.name === "proof").body, "My {{x}}");
  assert.equal(all.find((t) => t.name === "proof").source, "user");
  assert.ok(all.some((t) => t.name === "lemma"));

  // Ranking: prefix first, picks break ties, description search for 2+ chars.
  assert.equal(rankTemplates("pr", defs)[0].name, "proof");
  assert.equal(rankTemplates("ind", defs)[0].name, "induction");
  assert.ok(rankTemplates("limit", defs).some((t) => t.name === "epsdelta"), "matches description");
  assert.equal(rankTemplates("zzz", defs).length, 0);
  assert.equal(rankTemplates("c", defs, { counterexample: 3 })[0].name, "counterexample");

  // Placeholders, jumping, mirroring.
  const text = expandBody("Show {{a}} then {{b}} and {{a}} again");
  assert.equal(text, "Show ⟨a⟩ then ⟨b⟩ and ⟨a⟩ again");
  const ps = placeholders(text);
  assert.equal(ps.length, 3);
  assert.equal(nextPlaceholder(text, 0, 1).label, "a");
  assert.equal(nextPlaceholder(text, ps[0].to, 1).label, "b");
  assert.equal(nextPlaceholder(text, ps[2].to, 1).from, 5, "wraps to first");
  assert.equal(nextPlaceholder(text, ps[1].from, -1).from, ps[0].from);
  assert.equal(nextPlaceholder("no markers", 0, 1), null);

  const filled = "Show x+1 then ⟨b⟩ and ⟨a⟩ again";
  const ch = mirrorChanges(filled, "a", "x+1");
  assert.equal(ch.length, 1);
  assert.equal(filled.slice(0, ch[0].from) + ch[0].insert + filled.slice(ch[0].to), "Show x+1 then ⟨b⟩ and x+1 again");
  assert.deepEqual(mirrorChanges(filled, "a", ""), [], "empty value doesn't erase");
  assert.deepEqual(mirrorChanges(text, "a", "⟨a⟩"), [], "unfilled doesn't mirror");
});

test("general fills", () => {
  const BS = String.fromCharCode(92);
  const atoms = new Map([[`${BS}frac{1}{2}`, 9], [`${BS}frac{x}{y}`, 3], [`${BS}frac{q}{r}`, 1], [`${BS}sum_{j=1}^{m}`, 4]]);
  const frac = fillsFor("frac", `${BS}frac{}{}`, atoms);
  assert.equal(frac[0].id, "blank");
  assert.equal(frac[1].text, `${BS}frac{1}{2}`);
  assert.equal(frac[1].uses, 9);
  assert.equal(frac[2].text, `${BS}frac{x}{y}`);
  assert.ok(!frac.some((f) => f.text === `${BS}frac{q}{r}`), "single-use atoms are skipped");
  assert.equal(frac.filter((f) => f.text === `${BS}frac{1}{2}`).length, 1, "no duplicate of curated");

  assert.equal(fillsFor("sum", `${BS}sum_{}^{}`, atoms)[1].text, `${BS}sum_{j=1}^{m}`);
  assert.ok(!fillsFor("ddx", `${BS}frac{d}{dx}`, atoms).some((f) => f.uses), "aliases skip vault atoms");
  assert.equal(fillsFor("alpha", `${BS}alpha`, atoms), null);
  assert.equal(fillsFor("pmatrix", `${BS}begin{pmatrix}  ${BS}end{pmatrix}`, atoms)[0].id, "blank2");
  assert.equal(fillsFor("begin", `${BS}begin{}  ${BS}end{}`, atoms), null);

  // Nothing the plugin can insert spans more than one line.
  for (const d of DICTIONARY.values()) {
    assert.ok(!d.template.includes("\n"), d.name);
    for (const f of fillsFor(d.name, d.template, atoms) || []) assert.ok(!f.text.includes("\n"), `${d.name}:${f.id}`);
  }
  assert.ok(previewSource(DICTIONARY.get("pmatrix").template).includes(`a & b ${BS}${BS} c & d`));
  assert.equal(previewSource(DICTIONARY.get("begin").template), `${BS}text{env}`);
});
