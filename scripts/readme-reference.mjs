// Writes the command reference of README.md (between the reference markers)
// from the plugin's own sources, so the list is always complete and current:
// the IMO26 templates with their routes, the general templates, the math
// objects and the Python snippets. Usage: node scripts/readme-reference.mjs
import fs from "node:fs";
import { parseTemplates } from "../src/templates.js";
import { parseOutcomes } from "../src/outcomes.js";
import { parsePySnippets } from "../src/pysnippets.js";
import { OBJECTS } from "../src/objects.js";

const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const IMO = parseTemplates(src("imo26-templates.md"));
const GEN = parseTemplates(src("default-templates.md"));
const OUT = parseOutcomes(src("outcomes.md"));
const PY = parsePySnippets(src("py-snippets.md"));
const cell = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const cmd = (n) => `\`\\${n}\``;

const lines = [];
const routes = IMO.reduce((s, t) => s + t.variants.length, 0);
const endings = [...OUT.values()].reduce((s, e) => s + e.length, 0);
const pyRoutes = PY.reduce((s, p) => s + p.all.length, 0);
lines.push(`*Generated from the plugin's sources by \`npm run readme\`: ${IMO.length} IMO26 templates with ${routes} routes and ${endings} possible endings, ${GEN.length} general templates, ${OBJECTS.length} math objects, ${PY.length} Python snippets with ${pyRoutes} routes.*`, "");

lines.push("### IMO26 templates (normal text, course pack on)", "");
lines.push("Each line under a command is one solution route. **★** routes are picked automatically from your note's values when they fit.", "");
for (const t of IMO) {
  lines.push(`<details><summary>${cmd(t.name)} — ${cell(t.desc)}</summary>`, "");
  for (const v of t.variants) lines.push(`- ${cell(v.label)}`);
  const ends = OUT.get(t.name) || [];
  if (ends.length) {
    lines.push("", "Possible endings:", "");
    for (const e of ends) lines.push(`- **${cell(e.name)}** — you see: ${cell(e.see)}; you conclude: ${cell(e.conclude)}`);
  }
  lines.push("", "</details>", "");
}

lines.push("### General templates (normal text, any course)", "", "| Command | What it is |", "|---|---|");
for (const t of GEN) lines.push(`| ${cmd(t.name)} | ${cell(t.desc)}${t.variants.length ? ` (routes: ${t.variants.map((v) => cell(v.label)).join("; ")})` : ""} |`);
lines.push("");

lines.push("### Math objects (inside `$...$`, `$$...$$` and ```` ```vars ````)", "", "| Command | What it builds |", "|---|---|");
for (const o of OBJECTS) lines.push(`| ${cmd(o.name)} | ${cell(o.desc)} |`);
lines.push("");

lines.push("### Python snippets (inside ```` ```python ```` blocks)", "", "| Command | What it computes | Routes |", "|---|---|---|");
for (const p of PY) lines.push(`| ${cmd(p.name)} | ${cell(p.desc)} | ${p.variants.length ? p.variants.map((v) => cell(v.label)).join("; ") : "—"} |`);
lines.push("");

const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");
const start = "<!-- reference:start -->"; const end = "<!-- reference:end -->";
const i = readme.indexOf(start); const j = readme.indexOf(end);
if (i < 0 || j < 0) throw new Error("README.md has no reference markers");
fs.writeFileSync(new URL("../README.md", import.meta.url), readme.slice(0, i + start.length) + "\n\n" + lines.join("\n") + "\n" + readme.slice(j));
console.log(`reference: ${IMO.length} IMO26 templates, ${GEN.length} general, ${OBJECTS.length} objects, ${PY.length} python snippets`);
