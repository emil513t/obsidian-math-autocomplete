// Fill-in options for the second popup: after picking e.g. \frac{}{}, offer
// "Blank", the filled versions you write most in your vault, then common ones.
import { cursorOffset } from "./dictionary.js";
import { envOf, variantsFor, buildEnv, previewOf } from "./variants.js";

const r = String.raw;

// Built-in fills keyed by dictionary name. Each entry is the full text inserted.
const CURATED = {
  frac: [r`\frac{1}{2}`, r`\frac{a}{b}`, r`\frac{1}{n}`, r`\frac{dy}{dx}`, r`\frac{n(n+1)}{2}`, r`\frac{\pi}{2}`],
  dfrac: [r`\dfrac{1}{2}`, r`\dfrac{a}{b}`, r`\dfrac{dy}{dx}`],
  tfrac: [r`\tfrac{1}{2}`, r`\tfrac{a}{b}`],
  partialfrac: [r`\frac{\partial f}{\partial x}`, r`\frac{\partial f}{\partial y}`, r`\frac{\partial^2 f}{\partial x^2}`, r`\frac{\partial^2 f}{\partial x \partial y}`],
  ddx: [r`\frac{d}{dx}`, r`\frac{d}{dt}`, r`\frac{dy}{dx}`, r`\frac{d^2y}{dx^2}`],
  sqrt: [r`\sqrt{2}`, r`\sqrt{x}`, r`\sqrt{n}`, r`\sqrt{x^2 + y^2}`, r`\sqrt{b^2 - 4ac}`],
  sqrtn: [r`\sqrt[3]{x}`, r`\sqrt[n]{x}`, r`\sqrt[n]{a}`],
  binom: [r`\binom{n}{k}`, r`\binom{n}{2}`, r`\binom{n}{k-1}`],
  sum: [r`\sum_{i=1}^{n}`, r`\sum_{k=0}^{n}`, r`\sum_{n=1}^{\infty}`, r`\sum_{k=0}^{\infty}`, r`\sum_{i=0}^{n-1}`, r`\sum_{i,j}`],
  prod: [r`\prod_{i=1}^{n}`, r`\prod_{k=1}^{\infty}`, r`\prod_{p \text{ prime}}`],
  int: [r`\int_{0}^{1}`, r`\int_{a}^{b}`, r`\int_{0}^{\infty}`, r`\int_{-\infty}^{\infty}`, r`\int_{0}^{2\pi}`, r`\int_{0}^{x}`],
  iint: [r`\iint_{D}`, r`\iint_{R}`, r`\iint_{S}`],
  oint: [r`\oint_{C}`, r`\oint_{\partial D}`],
  lim: [r`\lim_{x \to 0}`, r`\lim_{n \to \infty}`, r`\lim_{x \to \infty}`, r`\lim_{h \to 0}`, r`\lim_{x \to a}`, r`\lim_{x \to 0^+}`],
  limsup: [r`\limsup_{n \to \infty}`],
  liminf: [r`\liminf_{n \to \infty}`],
  bigcup: [r`\bigcup_{i=1}^{n}`, r`\bigcup_{n=1}^{\infty}`, r`\bigcup_{i \in I}`],
  bigcap: [r`\bigcap_{i=1}^{n}`, r`\bigcap_{n=1}^{\infty}`, r`\bigcap_{i \in I}`],
  logb: [r`\log_{2}`, r`\log_{10}`, r`\log_{b}`, r`\log_{a}`],
  max: [r`\max_{x \in S}`, r`\max_{1 \le i \le n}`, r`\max_{x}`],
  min: [r`\min_{x \in S}`, r`\min_{1 \le i \le n}`, r`\min_{x}`],
  sup: [r`\sup_{x \in S}`, r`\sup_{n}`],
  inf: [r`\inf_{x \in S}`, r`\inf_{n}`],
  mathbb: [r`\mathbb{R}`, r`\mathbb{N}`, r`\mathbb{Z}`, r`\mathbb{Q}`, r`\mathbb{C}`, r`\mathbb{R}^n`, r`\mathbb{E}`, r`\mathbb{P}`],
  mathcal: [r`\mathcal{O}`, r`\mathcal{L}`, r`\mathcal{F}`, r`\mathcal{P}`, r`\mathcal{A}`],
  mathbf: [r`\mathbf{x}`, r`\mathbf{v}`, r`\mathbf{A}`, r`\mathbf{0}`],
  vec: [r`\vec{v}`, r`\vec{u}`, r`\vec{x}`, r`\vec{F}`, r`\vec{AB}`],
  hat: [r`\hat{x}`, r`\hat{\imath}`, r`\hat{\jmath}`, r`\hat{n}`, r`\hat{\theta}`],
  bar: [r`\bar{x}`, r`\bar{z}`],
  overline: [r`\overline{z}`, r`\overline{AB}`, r`\overline{A}`],
  dot: [r`\dot{x}`, r`\dot{y}`],
  ddot: [r`\ddot{x}`],
  tilde: [r`\tilde{x}`],
  operatorname: [r`\operatorname{rank}`, r`\operatorname{tr}`, r`\operatorname{span}`, r`\operatorname{Var}`, r`\operatorname{Cov}`],
  pmod: [r`\pmod{n}`, r`\pmod{m}`, r`\pmod{p}`],
  overbrace: [r`\overbrace{a + \cdots + a}^{n \text{ times}}`],
  underbrace: [r`\underbrace{a + \cdots + a}_{n \text{ times}}`],
  xrightarrow: [r`\xrightarrow{f}`, r`\xrightarrow{\sim}`],
  left: [r`\left( x \right)`, r`\left( \frac{a}{b} \right)`],
  langle: [r`\langle u, v \rangle`, r`\langle x, y \rangle`],
  lfloor: [r`\lfloor x \rfloor`, r`\lfloor \frac{n}{2} \rfloor`],
  lceil: [r`\lceil x \rceil`, r`\lceil \frac{n}{2} \rceil`],
};

const MAX_FROM_VAULT = 6;

// The fills offered after inserting `template` (the dictionary entry `name`).
// atoms: Map<literal text, count> from the vault scan. Returns null when there's
// nothing to offer beyond what was already inserted.
// Each fill: { id, label, text, cursor, preview, uses? }
export function fillsFor(name, template, atoms) {
  const env = envOf(template);
  if (env) {
    const variants = variantsFor(env);
    if (!variants) return null;
    return variants.map((v) => ({ id: v.id, label: v.label, ...buildEnv(env, v), preview: previewOf(env, v) }));
  }

  const blank = { id: "blank", label: "Blank", text: template, cursor: cursorOffset(template), preview: null };
  const seen = new Set([same(template)]);
  const out = [];

  // Your own filled versions, most used first. Only for real command names; an
  // alias like `ddx` would match atoms of a different command.
  if (template.startsWith("\\" + name)) {
    const mine = [...atoms]
      .filter(([text, n]) => n >= 2 && atomName(text) === name && text !== template)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_FROM_VAULT);
    for (const [text, n] of mine) {
      if (seen.has(same(text))) continue;
      seen.add(same(text));
      out.push({ id: text, label: "", text, cursor: text.length, preview: text, uses: n });
    }
  }
  for (const text of CURATED[name] || []) {
    if (seen.has(same(text))) continue;
    seen.add(same(text));
    out.push({ id: text, label: "", text, cursor: text.length, preview: text });
  }
  return out.length ? [blank, ...out] : null;
}

// Comparison key so \int_a^b and \int_{a}^{b}, or \lim_{n\to\infty} and
// \lim_{n \to \infty}, count as the same fill.
function same(text) {
  return text.replace(/([_^])\{([^{}\\]|\\[a-zA-Z]+)\}/g, "$1$2").replace(/\s+/g, "");
}

function atomName(text) {
  const m = text.match(/^\\([a-zA-Z]+)/);
  return m ? m[1] : null;
}
