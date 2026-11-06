# Math Autocomplete

Autocomplete for writing math in Obsidian: LaTeX commands inside math, and proof / question templates in normal text.

## Inside math (`$...$`, `$$...$$`)

- Type `\` and a few letters: a popup lists matching LaTeX commands with a rendered preview.
- Ranked by what **you** write most: the plugin scans your vault and also learns from what you pick. Your own expressions (`\mathbb{R}`, `\frac{d}{dx}`, ...) show up as suggestions too.
- After inserting `\frac`, `\sum`, `\int`, `\lim`, a matrix, `cases`, `aligned` and more, it offers ready-made fills (e.g. a 2×2 matrix, the identity matrix, $\sum_{i=1}^{n}$).
- Stays out of the way: after a complete symbol like `\alpha`, Enter still makes a new line. Works alongside [LaTeX Suite](https://github.com/artisticat1/obsidian-latex-suite).

## Templates in normal text

Type `\proof`, `\showthat`, `\induction`, `\contradiction`, `\iff`, `\counterexample`, `\epsdelta`, `\invariant`, `\bigO`, `\solution`, ... outside math.

1. Pick a template. If it has several **solution routes** (e.g. `\proof`: direct, unfold a definition, apply a theorem, contradiction, contrapositive, cases, both directions, induction), pick one in the second menu.
2. The template is inserted with `⟨placeholders⟩`. **Tab** jumps to the next one, **Shift+Tab** goes back.
3. Placeholders with the same name are filled once: type the claim at the top and it is copied to "Hence ⟨claim⟩" at the bottom.

### Your own templates

Command palette → **Open (or create) the editable templates file**. It creates `Math Templates.md`:

```markdown
## \lemma — my lemma template
**Lemma.** {{statement}}

**Proof.** {{proof}} $\blacksquare$

## \limitlaw — two ways to compute a limit
### cancel the vanishing factor
$\lim_{x \to {{a}}} {{f}} = {{value}}$
### squeeze theorem
${{lower}} \le {{f}} \le {{upper}}$ and both bounds tend to ${{value}}$, so the limit is ${{value}}$.
```

- `## \name — description` starts a template, `### route` starts a solution route.
- `{{name}}` is a blank, `{{_}}` a blank that is never copied into others.
- A template with the same name as a built-in one replaces it.

## Course pack: IMO26 (optional)

For N. Lauritzen, *Introduction to Mathematics and Optimization* (Aarhus University; the book is available online from the [author's site](https://nielsthl.github.io/)). Enable it in the settings.

- **56 problem templates with 200 solution routes**, one for every type of exercise in the book: truth tables, set equality, injective/surjective, induction, Gauss elimination, inverse matrices, positive definiteness, convex sets and functions, Fourier–Motzkin, least squares, open/closed/compact sets, limits, continuity, derivatives, Newton–Raphson, critical points, Hessian, Lagrange multipliers, KKT, SVM, ... Every route cites the results it uses by number ("…is open by Proposition 5.68").
- **133 references**: all definitions, theorems, propositions, lemmas, corollaries and remarks, with page numbers. In normal text:
  - `\def4.26` → Definition 4.26
  - `\thmcauchy` → Theorem 5.24
  - `\lem`, `\prop`, `\cor`, `\rem` list everything of that kind
  - `\ref extreme value` searches all of them

  Inserted as the book cites them ("Definition 4.26"); adding the title or a link to your own notes is optional.

## Settings

Popup on/off, rendered previews, fills, number of suggestions, templates on/off and the templates file, the IMO26 pack, reference format, and resetting what the plugin has learned.

## Development

```bash
npm install
npm run build          # bundles to dist/main.js
npm test               # unit tests; set OBSIDIAN_VAULT=/path/to/vault to also scan a real vault
OBSIDIAN_VAULT=/path/to/vault npm run install-vault
```

`scripts/live-test.mjs` drives a running Obsidian started with `--remote-debugging-port=9333`.

## License

MIT
