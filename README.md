# Math Autocomplete

Autocomplete for writing math in Obsidian: LaTeX commands inside math, and proof / question templates in normal text.

## Inside math (`$...$`, `$$...$$`)

- Type `\` and a few letters: a popup lists matching LaTeX commands with a rendered preview.
- Ranked by what **you** write most: the plugin scans your vault and also learns from what you pick. Your own expressions (`\mathbb{R}`, `\frac{d}{dx}`, ...) show up as suggestions too.
- After inserting `\frac`, `\sum`, `\int`, `\lim`, a matrix, `cases`, `aligned` and more, it offers ready-made fills (e.g. a 2×2 matrix, the identity matrix, $\sum_{i=1}^{n}$).
- Stays out of the way: after a complete symbol like `\alpha`, Enter still makes a new line. Works alongside [LaTeX Suite](https://github.com/artisticat1/obsidian-latex-suite).
- Matrices of any size: after `\pmatrix` (or `bmatrix`, ...) pick "Zero m×n", "Identity n×n", "Indexed m×n", "Diagonal", ... and type m and n.
- Build objects: `\hessian`, `\gradient`, `\jacobian`, `\partial`, `\laplacian`, `\taylor`, `\tangentplane`, `\newtonstep`, `\quadform`, `\lagrangian`, `\derivative`, `\inverse`, `\transpose`, `\determinant`, `\rref`, `\rank`, `\trace`, `\eigenvalues`, `\charpoly`, `\product`, `\matpower`, `\augmented`, `\dotproduct`, `\line`, `\interpolate`, `\polynomial`, `\set`, `\union`, `\intersection`, `\difference`, `\cartesian`, `\powerset`, `\interval`, `\function`, `\piecewise`, `\constraint`, `\proposition`, ... Each one offers what to build it from: your note's variables first (the Hessian of your `f`, at your point `p`; the inverse of your `A`), then general forms, then ones that ask for sizes or inputs. Computed exactly and offline (no AI, no internet).

## Note variables (```` ```vars ````)

```vars
f(x, y) = x^2 y + y^3
p = (1, 2)
A = [[2, 1], [1, 3]]
b = [1, 4]
S = \{1, 2, 3\}
I = [0, 1)
c = x + 2y \leq 4
H = hessian(f, p)
x0 = A^{-1} b
```

- Values: numbers, expressions, functions `f(x, y) = ...`, matrices (`[[..]]`, `\begin{pmatrix}`), vectors, points `(1, 2)`, sets, intervals, (in)equalities, `cases`.
- Computed: `hessian(f)`, `hessian(f, p)`, `grad(f)(p)`, `\nabla f`, `jacobian(F)`, `diff(f, x, 2)`, `taylor(f, 0, 3)`, `f(p)`, `A^{-1}`, `A^T`, `AB`, `A^{-1} b`, `det(A)`, `rref(augment(A, b))`, `eig(A)`, `rank`, `trace`, `dot`, `norm`, `cross`, `proj`, `newton(f, p)`, `tangent(f, p)`, `lagrangian(f, g)`, `interpolate(P)`. Numbers defined in the block (`a = 2`) are filled in.
- `@name` inserts a variable: LaTeX in math, `$name = ...$` in text, Python in python blocks.
- The math popup works inside the vars block: `\hessian` on an empty line writes `H = ...` for you, `\pmatrix` writes `A = ...`.
- Command "Create vars from this note's math" (or `\fromnote` in the block) copies definitions like `$f(x) = ...$` and `$A = \begin{pmatrix}...$` from the note into the vars block.
- `\f` in math lists your variables too (LaTeX Suite turns some `@` + letter combinations into Greek letters). Any "type it" field accepts a variable name (`A`, `f`, `p`).
- Variables that don't fit a command are listed with the reason (a 2×3 matrix in `\determinant`); where the math allows, an alternative is offered (one-sided inverse, numeric eigenvalues, "at a point you type").

## Worked solutions

Building something in math mode (`\hessian`, `\gradient`, `\inverse`, `\determinant`, `\eigenvalues`, `\taylor`, ...) inserts the answer where you typed and the full worked solution under the math block: every intermediate step (derivatives term by term, row operations, cofactor expansion, plugging in a point) with a sentence explaining it and the book reference. Setting: "Worked solutions in math".

- `\gauss`: Gauss elimination with back substitution, from your equations, `Ax = b` or equations you type; no / one / infinitely many solutions.
- `\fouriermotzkin`: Fourier-Motzkin elimination of variables from linear inequalities, down to bounds for the last variable.
- `\induction`: proof by induction of `P(n)` (sums, products, (in)equalities with powers and factorials): base case computed, induction step done algebraically; a false formula is caught.

Text templates that fill in computed values also get a ```` ```python ```` block that recomputes them with sympy, as evidence. Everything runs offline.

## Templates in normal text

Type `\proof`, `\showthat`, `\induction`, `\contradiction`, `\iff`, `\counterexample`, `\epsdelta`, `\invariant`, `\bigO`, `\solution`, ... outside math.

1. Pick a template. If it has several **solution routes** (e.g. `\proof`: direct, unfold a definition, apply a theorem, contradiction, contrapositive, cases, both directions, induction), pick one in the second menu.
2. The template is inserted with `⟨placeholders⟩`. **Tab** jumps to the next one, **Shift+Tab** goes back.
3. Placeholders with the same name are filled once: type the claim at the top and it is copied to "Hence ⟨claim⟩" at the bottom.
4. If the template has math inputs ($f(x) = ⟨f⟩$, $⟨A⟩$, $x_0 = ⟨x0⟩$), a small form asks for them first, prefilled from the note's `vars` block: a variable `f` fills in its value where the template says `f(x) = ⟨f⟩`. Empty fields stay as Tab stops.

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
- **Exercise templates** (optional, generated locally): one per exercise of the book, `\ex1.19` by number or `\ex truth table` by words from the exercise. Each one inserts the exercise followed by the solution routes of its general template, plus the Python snippet that computes it. Because they hold the book's text they are not shipped; generate the note with `python -I docs/imo26-coverage/exercise_templates.py "<vault>/Math/IMO26 Exercise Templates.md"` (needs the local `ex.json` extract).

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
