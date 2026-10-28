// Pure helpers for finding math regions in markdown. No Obsidian imports, so
// they can be unit-tested with plain node.

// Returns true if the end of `text` (i.e. the cursor) sits inside $...$ or $$...$$.
export function isCursorInMath(text) {
  let inFence = false;
  let inDisplay = false;
  let inInline = false;
  let inCode = false;
  let i = 0;
  const n = text.length;
  let lineStart = true;

  while (i < n) {
    const c = text[i];

    if (lineStart && !inDisplay && !inInline) {
      // Fenced code block toggles on ``` or ~~~ at line start (allowing indent).
      const rest = text.slice(i, i + 64).match(/^[ \t]*(```|~~~)/);
      if (rest) {
        inFence = !inFence;
        i = text.indexOf("\n", i);
        if (i === -1) return false;
        i++;
        continue;
      }
    }
    lineStart = false;

    if (c === "\n") {
      lineStart = true;
      inCode = false;
      // A blank line ends a paragraph, and inline math can't cross paragraphs.
      if (text[i + 1] === "\n" || /^\n[ \t]*\n/.test(text.slice(i, i + 32))) inInline = false;
      i++;
      continue;
    }
    if (inFence) { i++; continue; }

    if (c === "\\") { i += 2; continue; } // escaped char, incl. \$
    if (c === "`" && !inDisplay && !inInline) { inCode = !inCode; i++; continue; }
    if (inCode) { i++; continue; }

    if (c === "$") {
      if (text[i + 1] === "$" && !inInline) {
        inDisplay = !inDisplay;
        i += 2;
        continue;
      }
      if (!inDisplay) inInline = !inInline;
      i++;
      continue;
    }
    i++;
  }
  return !inFence && (inDisplay || inInline);
}

// Pulls every math snippet ($$..$$ and $..$) out of a markdown document.
export function extractMath(text) {
  const out = [];
  const stripped = text
    .replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[^\n]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const re = /\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?![\s$])((?:\\.|[^$\n\\])+?)(?<!\s)\$(?!\d)/g;
  let m;
  while ((m = re.exec(stripped))) out.push(m[1] ?? m[2]);
  return out;
}
