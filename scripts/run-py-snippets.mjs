// Builds every Python snippet (every route) against sample note variables and
// runs it with the real Python interpreter. Usage: node scripts/run-py-snippets.mjs [name]
// Snippets that plot are only compiled (no window opens).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parsePySnippets, buildPySnippet } from "../src/pysnippets.js";
import { parseVars } from "../src/vars.js";

const md = fs.readFileSync(new URL("../src/py-snippets.md", import.meta.url), "utf8");
const snippets = parsePySnippets(md);
const only = process.argv[2];

const fence = (body) => "```vars\n" + body + "\n```\n";
const shared = String.raw`A = [[2, -1], [-1, 2]]
B = [[1, 2], [0, 1]]
b = [1, 2]
u = [1, 2]
v = [3, 1]
p = [1, 1]
q = [2, 3]
r = [3, 5]
n = [1, 1]
U = [1, 2, 3, 4, 5, 6]
pts = [[1, 2], [2, 3], [3, 5]]`;
const ONE = parseVars(fence(shared + String.raw`
f = x^3 - 2x - 5
g = x + 1`));
const TWO = parseVars(fence(shared + String.raw`
f = x^2 + xy + y^2 - 2x
g = x^2 + y^2 - 1
F = [x^2 y, x + y]
G = [xy, x - y]
gs = [x + y - 1, -x, -y]`));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pysnip-"));
let pass = 0;
const fails = [];
for (const s of snippets) {
  if (only && s.name !== only) continue;
  const variants = s.all;
  for (const v of variants) {
    const vars = v.syms.length >= 2 ? TWO : ONE;
    const { text } = buildPySnippet(v, { vars });
    let code = text.replace(/\{\{\s*([^{}\n]+?)\s*\}\}/g, (m, label) => {
      if (label in v.examples) return v.examples[label];
      throw new Error(`\\${s.name} [${v.label}]: no @ex for placeholder "${label}"`);
    });
    const plots = v.uses.includes("plt");
    const file = path.join(dir, `${s.name}-${variants.indexOf(v)}.py`);
    fs.writeFileSync(file, code);
    const args = plots ? ["-m", "py_compile", file] : ["-I", file];
    const res = spawnSync("python", args, { encoding: "utf8", timeout: 60000 });
    const id = `\\${s.name}${v.label ? ` [${v.label}]` : ""}`;
    if (res.status === 0) {
      pass++;
      if (only) console.log(`--- ${id}\n${code}\n>>>\n${res.stdout}`);
    } else {
      fails.push(id);
      console.log(`FAIL ${id}\n${code}\n${(res.stderr || res.error?.message || "").split("\n").slice(-6).join("\n")}\n`);
    }
  }
}
console.log(`${pass} passed, ${fails.length} failed${fails.length ? ": " + fails.join(", ") : ""}`);
process.exit(fails.length ? 1 : 0);
