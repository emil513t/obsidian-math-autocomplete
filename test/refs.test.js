import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseRefQuery, rankRefs, formatRef, refKey, refExcerpt } from "../src/refs.js";
import { explainItems } from "../src/explain.js";

const load = (f) => JSON.parse(fs.readFileSync(new URL(`../src/refs/${f}`, import.meta.url), "utf8"));
const NUMBERED = load("imo26.json");
const EXTRA = load("imo26-extra.json");
const ALL = [...NUMBERED, ...EXTRA];

test("every numbered result, all sections and the running-text definitions are referencable", () => {
  const kinds = (k) => NUMBERED.filter((r) => r.kind === k).length;
  assert.equal(kinds("definition"), 42);
  assert.equal(kinds("theorem"), 26);
  assert.equal(kinds("proposition"), 25);
  assert.equal(kinds("lemma"), 5);
  assert.equal(kinds("corollary"), 2);
  assert.equal(kinds("remark"), 33);
  assert.ok(EXTRA.filter((r) => r.kind === "section").length >= 150);
  assert.ok(EXTRA.filter((r) => r.kind === "term").length >= 50);
  for (const r of ALL) assert.ok(r.title && r.text && r.num, JSON.stringify(r).slice(0, 80));
  assert.equal(new Set(ALL.map(refKey)).size, ALL.length, "one key per reference");
});

test("finding and inserting them", () => {
  const pd = rankRefs(ALL, parseRefQuery("defpositive"), {}).find((r) => r.kind === "term");
  assert.equal(formatRef(pd), "positive definite matrix (Section 3.7.1)");
  assert.match(pd.text, /^A symmetric matrix A is called positive definite if/);
  assert.equal(rankRefs(ALL, parseRefQuery("sec3.7.1"), {})[0].title, "Positive definite matrices");
  assert.deepEqual(parseRefQuery("section3.7"), { kind: "section", q: "3.7" });
  assert.equal(formatRef(rankRefs(ALL, parseRefQuery("sec3.7"), {})[0]), "Section 3.7");
  assert.equal(rankRefs(ALL, parseRefQuery("termsoftmax"), {})[0].title, "softmax");
  // A plain word matches titles only (at a word start), across all kinds.
  const conv = rankRefs(ALL, { kind: null, q: "convex", titleOnly: true }, {}).map((r) => `${r.kind} ${r.num}`);
  assert.ok(conv.includes("definition 4.26") && conv.includes("section 4.3"));
  assert.equal(rankRefs(ALL, { kind: null, q: "the", titleOnly: true }, {}).filter((r) => r.kind === "theorem" && !/\bthe/i.test(r.title)).length, 0);
  // wordStart also searches the statement text; title hits come first.
  const lip = rankRefs(ALL, { kind: null, q: "continuous", wordStart: true }, {});
  assert.ok(lip.length > rankRefs(ALL, { kind: null, q: "continuous", titleOnly: true }, {}).length);
  assert.ok(lip.some((r) => !/continuous/i.test(r.title) && /continuous/i.test(r.text)));
  const firstTextHit = lip.findIndex((r) => !/continuous/i.test(r.title));
  assert.ok(lip.slice(firstTextHit).every((r) => !/(^|[^a-z])continuous/i.test(r.title)), "title hits first");
  // A hit deep in the statement gets an excerpt around it.
  const deep = ALL.find((r) => r.text.toLowerCase().indexOf("continuous") > 150 && !/continuous/i.test(r.title));
  if (deep) {
    const ex = refExcerpt(deep, "continuous");
    assert.ok(ex && ex.text.toLowerCase().includes("continuous") && ex.before === "…");
  }
  assert.equal(refExcerpt({ title: "Convex functions", text: "A function is convex if ..." }, "convex"), null);
  // Sections cited in a description get their opening in the explanation.
  assert.equal(explainItems(["see Section 3.7"], ALL)[0].title, "Symmetric matrices");
});
