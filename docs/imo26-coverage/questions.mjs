// Print the form questions of snippets: node questions.mjs name1 name2 ...
import fs from "node:fs";
import { parsePySnippets, snippetQuestions } from "../../src/pysnippets.js";
const all = parsePySnippets(fs.readFileSync(new URL("../../src/py-snippets.md", import.meta.url), "utf8"));
for (const n of process.argv.slice(2)) {
  const s = all.find((t) => t.name === n);
  for (const r of s.all) console.log(`\\${n} [${r.label}]:`, snippetQuestions(r).questions.map((q) => `${q.key}=${q.value}`).join(" | "));
}
