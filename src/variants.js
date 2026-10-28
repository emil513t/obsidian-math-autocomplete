// Fill-in options offered after inserting an environment, e.g. picking
// \pmatrix then choosing "3×3 identity". Each body is a list of rows; cells
// within a row are joined with " & ", rows with " \\" + newline.

const MATRIX_ENVS = new Set(["pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "matrix"]);

const ROW_END = String.raw` \\`;

const square = (n, cell) =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cell(i, j)));

const LETTERS = "abcdefghi";

const MATRIX_VARIANTS = [
  { id: "blank2", label: "Blank 2×2", rows: square(2, () => ""), blank: true },
  { id: "blank3", label: "Blank 3×3", rows: square(3, () => ""), blank: true },
  { id: "abcd", label: "2×2 letters", rows: square(2, (i, j) => LETTERS[i * 2 + j]) },
  { id: "abc9", label: "3×3 letters", rows: square(3, (i, j) => LETTERS[i * 3 + j]) },
  { id: "idx2", label: "2×2 indexed", rows: square(2, (i, j) => `a_{${i + 1}${j + 1}}`) },
  { id: "idx3", label: "3×3 indexed", rows: square(3, (i, j) => `a_{${i + 1}${j + 1}}`) },
  {
    id: "general",
    label: "General m×n",
    rows: [
      ["a_{11}", String.raw`\cdots`, "a_{1n}"],
      [String.raw`\vdots`, String.raw`\ddots`, String.raw`\vdots`],
      ["a_{m1}", String.raw`\cdots`, "a_{mn}"],
    ],
  },
  { id: "id2", label: "2×2 identity", rows: square(2, (i, j) => (i === j ? "1" : "0")) },
  { id: "id3", label: "3×3 identity", rows: square(3, (i, j) => (i === j ? "1" : "0")) },
  {
    id: "idn",
    label: "n×n identity",
    rows: [
      ["1", "0", String.raw`\cdots`, "0"],
      ["0", "1", String.raw`\cdots`, "0"],
      [String.raw`\vdots`, String.raw`\vdots`, String.raw`\ddots`, String.raw`\vdots`],
      ["0", "0", String.raw`\cdots`, "1"],
    ],
  },
  { id: "zero2", label: "2×2 zeros", rows: square(2, () => "0") },
  { id: "zero3", label: "3×3 zeros", rows: square(3, () => "0") },
  { id: "vec2", label: "Column vector (2)", rows: [["x"], ["y"]] },
  { id: "vec3", label: "Column vector (3)", rows: [["x"], ["y"], ["z"]] },
  { id: "vecn", label: "Column vector (n)", rows: [["x_1"], ["x_2"], [String.raw`\vdots`], ["x_n"]] },
  { id: "rot", label: "2×2 rotation", rows: [[String.raw`\cos\theta`, String.raw`-\sin\theta`], [String.raw`\sin\theta`, String.raw`\cos\theta`]] },
];

const CASES_VARIANTS = [
  { id: "blank", label: "Blank, 2 cases", rows: [["", ""], ["", ""]], blank: true },
  { id: "ifotherwise", label: "if / otherwise", rows: [["", String.raw`\text{if } `], ["", String.raw`\text{otherwise}`]], blank: true },
  { id: "sign", label: "Positive / negative", rows: [["x", String.raw`\text{if } x \geq 0`], ["-x", String.raw`\text{if } x < 0`]] },
  { id: "three", label: "Blank, 3 cases", rows: [["", ""], ["", ""], ["", ""]], blank: true },
];

const ALIGN_VARIANTS = [
  { id: "eq2", label: "2 lines, aligned at =", rows: [["", "= "], ["", "= "]], blank: true },
  { id: "eq3", label: "3 lines, aligned at =", rows: [["", "= "], ["", "= "], ["", "= "]], blank: true },
  { id: "chain", label: "Chain of =", rows: [["", "= "], ["", "= "]], chain: true, blank: true },
];

// Environment name if `insert` is a bare environment template we can fill.
export function envOf(insert) {
  const m = insert.match(/^\\begin\{(\w+)\}\n\n\\end\{\1\}$/);
  return m ? m[1] : null;
}

export function variantsFor(env) {
  if (MATRIX_ENVS.has(env)) return MATRIX_VARIANTS;
  if (env === "cases") return CASES_VARIANTS;
  if (env.startsWith("align")) return ALIGN_VARIANTS;
  return null;
}

function rowText(cells, variant, rowIndex, env) {
  // aligned rows are "lhs &= rhs"; a chain drops the lhs after the first line.
  if (env.startsWith("align")) {
    const lhs = variant.chain && rowIndex > 0 ? "" : cells[0];
    return `${lhs} &${cells[1]}`.trimStart();
  }
  return cells.join(" & ");
}

// Full environment text for a variant, plus where the cursor should land.
export function buildEnv(env, variant) {
  const rows = variant.rows.map((cells, i) => rowText(cells, variant, i, env).trimEnd());
  const body = rows.join(ROW_END + "\n");
  const open = `\\begin{${env}}\n`;
  const text = `${open}${body}\n\\end{${env}}`;
  // Every blank fill starts with its first empty slot, so the cursor goes to the
  // start of the first row; filled ones put it after \end.
  const cursor = variant.blank ? open.length : text.length;
  return { text, cursor };
}

// Renderable source for the preview; blank slots show as a box. align isn't
// allowed inside inline MathJax, so preview it as aligned.
export function previewOf(env, variant) {
  const box = String.raw`\square`;
  const rows = variant.rows.map((cells, i) =>
    rowText(cells.map((c) => (c === "" ? box : c === "= " ? "= " + box : c)), variant, i, env),
  );
  const shown = env.startsWith("align") ? "aligned" : env;
  return `\\begin{${shown}}${rows.join(ROW_END)}\\end{${shown}}`;
}
