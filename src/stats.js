import { extractMath } from "./mathContext.js";
import { NO_ARG } from "./dictionary.js";

// Commands whose arguments are prose or structure, not reusable expressions.
const NO_ATOM = new Set(["begin", "end", "text", "textbf", "textit", "mathrm", "label", "tag", "left", "right"]);

// Reads one brace group starting at s[i] === "{". Returns end index (exclusive) or -1.
function readGroup(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return j + 1;
  }
  return -1;
}

// Counts usage in one markdown document:
//   cmds:  "frac" -> 12
//   atoms: "\frac{d}{dx}" -> 4   (a command plus its literal arguments/scripts)
export function scanDocument(text) {
  const cmds = new Map();
  const atoms = new Map();
  for (const math of extractMath(text)) {
    const re = /\\([a-zA-Z]+)/g;
    let m;
    while ((m = re.exec(math))) {
      const name = m[1];
      cmds.set(name, (cmds.get(name) || 0) + 1);
      if (NO_ATOM.has(name) || NO_ARG.has(name)) continue;

      // Collect up to 3 following {..} groups or _x / ^x scripts.
      let j = re.lastIndex;
      let parts = 0;
      while (parts < 3 && j < math.length) {
        while (math[j] === " " && math[j + 1] !== " ") j++;
        if (math[j] === "{") {
          const e = readGroup(math, j);
          if (e < 0) break;
          j = e;
        } else if ((math[j] === "_" || math[j] === "^") && math[j + 1]) {
          if (math[j + 1] === "{") {
            const e = readGroup(math, j + 1);
            if (e < 0) break;
            j = e;
          } else if (math[j + 1] === "\\") {
            const cm = math.slice(j + 1).match(/^\\[a-zA-Z]+/);
            if (!cm) break;
            j += 1 + cm[0].length;
          } else j += 2;
        } else break;
        parts++;
      }
      if (parts === 0) continue;
      const atom = math.slice(m.index, j).replace(/\s+/g, " ").trim();
      if (atom.length > 60 || atom.includes("\n")) continue;
      atoms.set(atom, (atoms.get(atom) || 0) + 1);
    }
  }
  return { cmds, atoms };
}

// Sums per-file results into one table.
export function mergeStats(perFile) {
  const cmds = new Map();
  const atoms = new Map();
  for (const s of perFile) {
    for (const [k, v] of s.cmds) cmds.set(k, (cmds.get(k) || 0) + v);
    for (const [k, v] of s.atoms) atoms.set(k, (atoms.get(k) || 0) + v);
  }
  return { cmds, atoms };
}
