// Built-in LaTeX commands the popup knows about, roughly most-common first
// within each group. A bare name inserts `\name`; an entry with a template
// inserts that template, and the cursor lands in the first empty {}.

const WITH_ARGS = {
  frac: "\\frac{}{}",
  dfrac: "\\dfrac{}{}",
  tfrac: "\\tfrac{}{}",
  sqrt: "\\sqrt{}",
  sqrtn: "\\sqrt[]{}",
  binom: "\\binom{}{}",
  sum: "\\sum_{}^{}",
  prod: "\\prod_{}^{}",
  int: "\\int_{}^{}",
  iint: "\\iint_{}",
  oint: "\\oint_{}",
  lim: "\\lim_{ \\to }",
  limsup: "\\limsup_{}",
  liminf: "\\liminf_{}",
  bigcup: "\\bigcup_{}^{}",
  bigcap: "\\bigcap_{}^{}",
  log: "\\log",
  logb: "\\log_{}",
  max: "\\max_{}",
  min: "\\min_{}",
  sup: "\\sup_{}",
  inf: "\\inf_{}",
  arg: "\\arg",
  mathbb: "\\mathbb{}",
  mathcal: "\\mathcal{}",
  mathbf: "\\mathbf{}",
  mathrm: "\\mathrm{}",
  mathit: "\\mathit{}",
  mathsf: "\\mathsf{}",
  mathfrak: "\\mathfrak{}",
  boldsymbol: "\\boldsymbol{}",
  operatorname: "\\operatorname{}",
  text: "\\text{}",
  textbf: "\\textbf{}",
  hat: "\\hat{}",
  widehat: "\\widehat{}",
  bar: "\\bar{}",
  overline: "\\overline{}",
  underline: "\\underline{}",
  vec: "\\vec{}",
  dot: "\\dot{}",
  ddot: "\\ddot{}",
  tilde: "\\tilde{}",
  widetilde: "\\widetilde{}",
  overrightarrow: "\\overrightarrow{}",
  overbrace: "\\overbrace{}^{}",
  underbrace: "\\underbrace{}_{}",
  cancel: "\\cancel{}",
  boxed: "\\boxed{}",
  color: "\\color{}{}",
  left: "\\left( \\right)",
  leftb: "\\left[ \\right]",
  lefta: "\\left| \\right|",
  lceil: "\\lceil  \\rceil",
  lfloor: "\\lfloor  \\rfloor",
  langle: "\\langle  \\rangle",
  begin: "\\begin{}\n\n\\end{}",
  pmatrix: "\\begin{pmatrix}\n\n\\end{pmatrix}",
  bmatrix: "\\begin{bmatrix}\n\n\\end{bmatrix}",
  vmatrix: "\\begin{vmatrix}\n\n\\end{vmatrix}",
  cases: "\\begin{cases}\n\n\\end{cases}",
  aligned: "\\begin{aligned}\n\n\\end{aligned}",
  align: "\\begin{align}\n\n\\end{align}",
  array: "\\begin{array}{}\n\n\\end{array}",
  pmod: "\\pmod{}",
  bmod: "\\bmod",
  stackrel: "\\stackrel{}{}",
  overset: "\\overset{}{}",
  underset: "\\underset{}{}",
  xrightarrow: "\\xrightarrow{}",
  partialfrac: "\\frac{\\partial }{\\partial }",
  ddx: "\\frac{d}{dx}",
};

const SYMBOLS = `
alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi
pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega
Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega
cdot cdots ldots vdots ddots times div pm mp ast star circ bullet oplus otimes
leq geq neq approx equiv sim simeq cong propto le ge ll gg prec succ
in notin ni subset subseteq supset supseteq subsetneq cup cap setminus emptyset varnothing
forall exists nexists neg land lor implies impliedby iff
to rightarrow leftarrow Rightarrow Leftarrow leftrightarrow Leftrightarrow mapsto
uparrow downarrow longrightarrow Longrightarrow longmapsto hookrightarrow
infty partial nabla ell hbar Re Im aleph prime angle triangle square
sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh exp ln det dim ker deg gcd lcm Pr
mid nmid parallel perp vert Vert lvert rvert
quad qquad
dots therefore because top bot models vdash
`.trim().split(/\s+/);

// Commands that never take arguments; a {..} after them is just more math.
export const NO_ARG = new Set(SYMBOLS.filter((s) => !(s in WITH_ARGS)));

// name -> { name, template }
export const DICTIONARY = new Map();
let rank = 0;
for (const [name, template] of Object.entries(WITH_ARGS)) {
  DICTIONARY.set(name, { name, template, rank: rank++ });
}
for (const name of SYMBOLS) {
  if (!DICTIONARY.has(name)) DICTIONARY.set(name, { name, template: "\\" + name, rank: rank++ });
}

// Where the cursor goes after inserting `template`: inside the first {} / [] gap,
// otherwise at the first double-space gap (e.g. \lceil  \rceil), otherwise the end.
export function cursorOffset(template) {
  const m = template.match(/\{\}|\{ |\[\]|\(\s|  |\n\n/);
  if (!m) return template.length;
  if (m[0] === "\n\n") return m.index + 1;
  return m.index + 1;
}

// A renderable version of a template, with empty slots filled in.
export function previewSource(template) {
  return template
    .replace(/\{\}/g, "{\\square}")
    .replace(/\[\]/g, "[n]")
    .replace(/\\begin\{\}\n\n\\end\{\}/, "\\text{env}")
    .replace(/\\begin\{array\}\{\\square\}/, "\\begin{array}{cc}")
    .replace(/\n\n/g, " a & b \\\\ c & d ")
    .replace(/  /g, " x ");
}
