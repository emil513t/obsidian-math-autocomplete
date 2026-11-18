# Math Autocomplete

An Obsidian plugin for writing math. It has five parts:

- **LaTeX autocomplete** inside math, ranked by what *you* write.
- **Note variables.** You define `f`, `A`, `p`, ... once and every command uses them.
- **Exact computations with full worked solutions:** Hessians, inverses, Gauss elimination, limits, induction, KKT, ...
- **Proof and question templates** with solution routes. Routes that fit your note's values are picked for you (★).
- **Python snippets** that recompute everything with sympy / numpy.

Everything runs **offline**. There is no AI, no internet and no account. The computations are done by the plugin's own exact algebra.

An optional **course pack** covers N. Lauritzen, *Introduction to Mathematics and Optimization* (IMO26). It has templates for every type of exercise, all of the book's definitions and theorems, and proofs that write themselves from your values ("A is not positive definite: u = (1, −1) gives uᵀAu = −1").

---

## Contents

1. [Install](#1-install)
2. [Five-minute tour](#2-five-minute-tour)
3. [Inside math: the popup](#3-inside-math-the-popup)
4. [Note variables (```` ```vars ````)](#4-note-variables-vars)
5. [Math objects and worked solutions](#5-math-objects-and-worked-solutions)
6. [Templates in normal text](#6-templates-in-normal-text)
7. [Course pack: IMO26](#7-course-pack-imo26)
8. [Proofs that something fails: the 11 engines](#8-proofs-that-something-fails-the-11-engines)
9. [Python snippets](#9-python-snippets)
10. [Graphs](#10-graphs)
11. [Commands and settings](#11-commands-and-settings)
12. [Tips and known limits](#12-tips-and-known-limits)
13. [Reference: every command](#13-reference-every-command)
14. [Development](#14-development)

---

## 1. Install

- **From a release:** download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/emil513t/obsidian-math-autocomplete/releases/latest). Put them in `<your vault>/.obsidian/plugins/math-autocomplete/`, then enable *Math Autocomplete* under Settings → Community plugins.
- **With BRAT:** add `emil513t/obsidian-math-autocomplete`.
- **For the IMO26 course pack:** Settings → Math Autocomplete → *IMO26 problem templates and references*.

It works next to [LaTeX Suite](https://github.com/artisticat1/obsidian-latex-suite). Python snippets need Python with `sympy` / `numpy` (and `matplotlib` / `scipy` for some of them) wherever you run the code, for example with the Code Suite / Execute Code plugins.

## 2. Five-minute tour

1. In a note, write a vars block:

   ````markdown
   ```vars
   f(x, y) = x^2 + xy + y^2 - 2x
   A = [[2, 1], [1, 2]]
   p = (1, 0)
   ```
   ````

2. In `$$ $$` type `\hessian`. Pick "Hessian of f". The matrix goes where you typed. Under the math block you get the **worked solution**: every partial derivative, a sentence for each step and the book reference.
3. In normal text type `\posdef`, pick the route with the **★**, and the proof is written with *your* `A`: the symmetric reduction, D = diag(2, 3/2), "positive definite (Proposition 3.43)".
4. In a ```` ```python ```` block type `\critxy`. Finished sympy code with your `f` already filled in is inserted. Run it.
5. In normal text type `\card 8.37` for a study card: a plan for the exercise, not its solution.

## 3. Inside math: the popup

- Type `\` and a few letters inside `$...$`, `$$...$$` or a vars block. A popup lists matching LaTeX commands with a rendered preview.
- **Ranked by you.** The plugin scans your vault for the LaTeX you use and learns from what you pick. Your own expressions (`\mathbb{R}`, `\frac{d}{dx}`, ...) show up as suggestions too.
- **Fills.** After `\frac`, `\sum`, `\int`, `\lim`, a matrix, `cases`, `aligned` and more, it offers filled versions: the ones you write most come first, then common ones (`\sum_{i=1}^{n}`, a 2×2 matrix, ...).
- **Matrices of any size.** After `\pmatrix` / `\bmatrix` / ... pick *Zero m×n*, *Identity n×n*, *Indexed m×n*, *Diagonal*, ... and type m and n.
- **It stays out of the way.** After a complete symbol like `\alpha`, Enter still makes a new line.
- `\f` lists your note variables too. Any "type it" field accepts a variable name (`A`, `f`, `p`).

## 4. Note variables (```` ```vars ````)

A ```` ```vars ```` block holds the values of the note. One line per value: `name = value`. Every command (math objects, templates, Python, graphs) reads it.

### What you can write

| Kind | Example | Notes |
|---|---|---|
| number / expression | `a = 2`, `c = \frac{1}{3}` | Numbers are filled into the other lines |
| function | `f(x, y) = x^2 y + y^3` | The variables come from the brackets |
| two-formula function | `f(x) = \begin{cases} 0 & \text{if } x < 0 \\ x & \text{if } x \ge 0 \end{cases}` | Jumps, corners, ReLU, \|x\| |
| matrix | `A = [[2, 1], [1, 3]]` or `\begin{pmatrix}...\end{pmatrix}` | Entries may contain parameters (`a`) |
| vector | `b = [1, 4]` | A column for `Ax = b` |
| point | `p = (1, 2)` | Used for "at a point" |
| listed set | `S = \{1, 2, 3\}`, `f = \{(1, 7), (2, 8)\}` | A set of pairs is a function table |
| set-builder set | `C = \{ (x, y) \mid x^2 + y^2 \le 1 \}`, `\{ n \in \mathbb{Z} \mid n^2 < 5 \}` | Over ℝ, ℤ or ℕ |
| whole number sets | `S = \mathbb{N}`, `\mathbb{Z}` | ℕ starts at 1 (as in the book) |
| interval | `I = [0, 1)`, `(-\infty, 2]` | Open / closed ends |
| (in)equality | `c1 = x + 2y \le 4`, `e1 = x + y = 3` | Constraints, systems |
| statement | `P = \forall x \in S : x^2 \ge 0`, `P = p \Rightarrow q` | For negation and truth tables |
| induction statement | `P(n) = \sum_{k=1}^{n} k = \frac{n(n+1)}{2}`, `n0 = 1` | For `\induction`, `\sumind` |
| argument | `chain = a = b \iff a^2 = ab \iff ...` | For `\fakeproof` |
| assumptions | `a > 0`, `0 < t < 1`, `c \neq 0` (a line on its own) | Cut parameter cases; respected by every engine |
| computed | `H = hessian(f, p)`, `x0 = A^{-1} b`, `g = grad(f)(p)` | Recomputed when the inputs change |

Computed values: `hessian(f)`, `hessian(f, p)`, `grad(f)(p)`, `\nabla f`, `jacobian(F)`, `diff(f, x, 2)`, `taylor(f, 0, 3)`, `f(p)`, `A^{-1}`, `A^T`, `AB`, `A^{-1} b`, `det(A)`, `rref(augment(A, b))`, `eig(A)`, `rank`, `trace`, `dot`, `norm`, `cross`, `proj`, `newton(f, p)`, `tangent(f, p)`, `lagrangian(f, g)`, `interpolate(P)`.

**Naming conventions** used by the commands:
- `f` is the main function.
- `g`, `g1`, `g2`, … are constraints, each meaning g ≤ 0.
- `p` is the point.
- `A` is the main matrix and `b` the right-hand side.
- `S`, `U`, `F`, `C` are sets.
- `P` is the statement.
- `X` and `l` hold the labelled points and labels for SVM.

### Using the variables

- `@name` inserts a variable: LaTeX in math, `$name = ...$` in text, Python in python blocks.
- The math popup works inside the vars block: `\hessian` on an empty line writes `H = ...` for you.
- **Create vars from this note's math** (command palette, or `\fromnote` in the block) copies `$f(x) = ...$` and `$A = \begin{pmatrix}...$` from the note into the block.
- A variable that doesn't fit a command is listed with the reason (a 2×3 matrix in `\determinant`). Where the math allows, an alternative is offered (one-sided inverse, numeric eigenvalues, "at a point you type").

## 5. Math objects and worked solutions

Inside math, commands like `\hessian`, `\gradient`, `\inverse`, `\gauss`, `\definiteness`, `\limit`, `\negate`, `\fouriermotzkin`, `\taylor`, `\set`, `\interval`, ... **build** something. The list of options shows, in this order:

1. what can be built from **your** variables (the Hessian of your `f`, at your `p`; the inverse of your `A`);
2. general forms (a general 3×3 matrix, `a_{ij}`);
3. "type it": a small form asks for the inputs or sizes.

The answer goes where you typed. With **Worked solutions in math** on, the full solution goes under the math block: every intermediate step with a sentence and the book reference. That includes derivatives term by term, row operations, cofactor expansion, symmetric reduction, ε–δ and Fourier–Motzkin.

Some worked solutions worth knowing:

- `\gauss` handles none, one or infinitely many solutions, with back substitution.
- `\fouriermotzkin` eliminates variables down to bounds. When there is no solution it adds a **short proof**: "add c1, c2 and c3: 0 < 0".
- `\induction` computes the base case and does the step algebraically. A false formula is caught.
- `\limit` handles continuity, cancelling 0/0, blow-up, jumps and two variables along lines.
- `\negate` writes the negation rule by rule (see [E1](#e1-negation-negate)).

## 6. Templates in normal text

Type `\proof`, `\showthat`, `\induction`, `\contradiction`, `\iff`, `\counterexample`, `\epsdelta`, … outside math. With the IMO26 pack you also get `\posdef`, `\kkt`, `\lagrange`, `\gauss`, … (all of them are in the [reference](#13-reference-every-command)).

1. **Pick a template.** If it has several **solution routes**, pick one in the second menu. The route that fits your note's values has a **★**. Routes that don't fit are hidden until you type to search them, with the reason ("A is not symmetric").
2. **Inputs.** If the template needs math inputs ($f(x) = ⟨f⟩$, $⟨A⟩$, …), a small form asks for them, prefilled from the vars block. Computed blanks (verdicts, witness vectors, multipliers, the row where two propositions differ, …) come already filled. Each one says where it came from ("from @A, signs of D").
3. **Tab stops.** Empty blanks become `⟨placeholders⟩`. **Tab** jumps to the next one and **Shift+Tab** goes back. Blanks with the same name are filled once.
4. **Book references.** With the IMO26 pack, a folded callout under the text lists the definitions and theorems that the *computed answer* uses. A positive definite result cites Prop 3.43, not Def 8.9.
5. **Python evidence.** With *Python evidence for computed text* on, a python block that recomputes the filled-in values is added.

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

- `## \name — description` starts a template and `### route` starts a solution route.
- `{{name}}` is a blank. `{{_}}` is a blank that is never copied into the others.
- A template with the same name as a built-in one replaces it.

## 7. Course pack: IMO26

This pack is for N. Lauritzen, *Introduction to Mathematics and Optimization* (Aarhus University; the book is on the [author's site](https://nielsthl.github.io/)). Turn it on in the settings.

- **Templates for every type of exercise.** They cover truth tables, sets, injective/surjective, induction, Gauss elimination, inverse matrices, positive definiteness, convex sets and functions, Fourier–Motzkin, least squares, open/closed/compact sets, limits, continuity, derivatives, Newton–Raphson, critical points, Hessian, Lagrange multipliers, KKT, SVM, … Every route cites the book by number.
- **Wording from the book only.** A guard keeps off-book words and methods out ("Jacobian" becomes "matrix derivative (Prop 7.9)"). *Show material outside the book* turns on extra topics.
- **Routes picked from your values (★).** The route that fits your matrix, function, set or system gets the ★. That covers positive definite or not, invertible or not, compact or not, a limit exists or not, solvable or not, separable or not, a point optimal or not, and more.
- **Possible endings.** Every way each kind of exercise can end, with what you see, what you conclude and which route to use. They are listed in the [reference](#13-reference-every-command).
- **Parameters.** With one parameter (`A = [[1, a], [a, 4]]`), the "with a parameter" routes split into every case: a < −2 indefinite, a = −2 positive semi-definite, … Assumptions like `a > 0` cut the cases.
- **References.** All definitions, theorems, propositions, lemmas, corollaries and remarks, with page numbers. Type them in normal text:
  - `\def4.26` inserts Definition 4.26.
  - `\thmcauchy` inserts Theorem 5.24.
  - `\lem`, `\prop`, `\cor`, `\rem` list everything of that kind.
  - `\ref extreme value` searches all of them.

  Options: add the title, or link to the matching heading in your note.
- **Study cards** (`\card`, or `\card 7.41`). Under an exercise you get a *plan*, not a solution: the kind of task, what to show, the ways to do it, the possible endings, tricks (including when a contradiction is shorter), what to look up and similar exercises. *Study cards: show the verdict* adds a folded spoiler with the ending your values give.
- **Exercise templates** (optional, generated locally). These are `\ex1.19`, or `\ex` followed by words from the exercise. They contain the book's text, so they are not shipped. Generate them with `python -I docs/imo26-coverage/exercise_templates.py "<vault>/Math/IMO26 Exercise Templates.md"`.

## 8. Proofs that something fails: the 11 engines

Many exercises ask you to show that something is **not** true: not positive definite, no solution, not convex, not open, not optimal, the mistake in a fake proof. For these the plugin **finds the witness from your note's values** and writes the book's argument with it. Each engine works on *any* input of its kind, not on one stored example. The exercises named below are its test cases.

Each engine is used the same way:
1. Write the values in the vars block.
2. Type the command in normal text.
3. Pick the ★ route.

### E1 Negation (`\negate`)

```vars
P = \exists R \in \mathbb{R}\ \forall v \in S : |v| < R
```

`\negate` (template or math object) writes ¬P **one rule at a time**: ¬∀ becomes ∃¬ ((1.3), Sec 1.3.4), ∧ and ∨ swap (Ex 1.20), ¬(p ⇒ q) ≡ p ∧ ¬q (Def 1.10), and each relation is flipped (Def 1.65). The result is Remark 5.34 word for word: ∀R ∈ ℝ ∃v ∈ S : |v| ≥ R.

- The math object also offers the negations of 9 book definitions with your names filled in: not bounded, not open, no limit, not continuous, not injective, not surjective, not convex (set / function), not strictly increasing.
- `\contradiction` fills "Assume the claim is false" with ¬P written out.
- `\contrapositive` fills *not A* and *not B* when P is an implication A ⇒ B.

### E2 + E3 One concrete case where a claim fails

| Write | Command | You get |
|---|---|---|
| `A = \{1, 2, 3\}`, `B = \{1, 2, 4\}` | `\setequal` | 3 ∈ A (listed) but 3 ∉ B. Works for set-builder sets too, with the condition that fails |
| `A = \{ n \in \mathbb{Z} \mid n^2 < 5 \}`, `B = ...` | `\subsetproof` | an element of A outside B, with the reason on each side |
| `P = p \Rightarrow q`, `Q = q \Rightarrow p` | `\truthtable` | the row where they differ (p = t, q = f) |
| `P = \text{even} \Rightarrow \text{blue}` (Ex 1.11) | `\truthtable` | the row where it is false |
| `f = \{(1, 7), (2, 8), (3, 9), (4, 7)\}`, `T = \{7, 8, 9\}` | `\injective` / `\surjective` | f(1) = 7 = f(4); a value of T that is never hit |
| `f(x) = x^2` (Ex 1.109) | `\injective` / `\surjective` | f(−1) = f(1); y = −1 is never hit since x² + 1 > 0 |
| `f(x) = x^3` (Ex 6.38) | `\crit` | f′(0) = 0 but f′ ≥ 0, so f is strictly increasing and 0 is not an extremum |
| `P = \frac{a}{b} \le \frac{a+1}{b+1}`, `a > 0`, `b > 0` (Ex 1.72) | `\inequality` | (a, b) = (2, 1) gives 2 > 3/2 |

### E4 Inequalities that contradict each other

```vars
c1 = x + y \le 1
c2 = x \ge 1
c3 = y > 0
```

- `\fm` → "show a system has no solution": eliminating x, y ends in 0 < 0, plus the one-line proof "adding c1, c2 (as −x ≤ −1) and c3 (as −y < 0) gives 0 < 0". Only the inequalities that are needed are used.
- `\svm` → "NOT separable" (Ex 5.9, Ex 4.42) from `X = [[...]]` (points) and `l = (1, -1, ...)` (labels): ℓᵢ(αᵀvᵢ + β) > 0 for each point, "adding (1), (2), (3) and (4) gives 0 > 0".
- `\kkt` → "no feasible point" names the constraints to add.

### E5 A linear system with no solution

```vars
e1 = x + y + z = 1
e2 = x - y + 2z = 3
e3 = 2x + 3z = 5
```

`\gauss` stars the right route (unique, infinitely many, or none) and fills it. "no solutions" shows the elimination steps, the reduced system and the row 0 = 1, plus the same in one line: "adding e1, e2 and −1 times e3 gives 0 = −1". A matrix `A` with a vector `b` works too. `\leastsquares` (Ex 5.17) gets the contradictory row.

### E6 Matrix witnesses

With `A = [[1, 2], [2, 1]]`, `\posdef` gives the verdict, the bad vector u with uᵀAu ≤ 0 (column i of B from the symmetric reduction), or two vectors for "indefinite".

`\matinv` gives v ≠ 0 with Av = 0 ("v = BAv = B0 = 0") and handles inverses with parameters (`a`): D factored, the values where D = 0 done one by one.

`\matrixproof` gives a pair with AB ≠ BA for (A + B)² ≠ A² + 2AB + B².

### E7 Not bounded / open / closed, no limit, not differentiable

| Write | Command | Witness |
|---|---|---|
| `S = \mathbb{N}` (Ex 5.36) | `\bounded` | n = ⌈\|R\|⌉ + 1 has \|n\| ≥ R (Remark 5.34) |
| `S = \{ (x, y) \mid y \ge x^2 \}` | `\bounded`, `\compact` | v = (0, \|R\| + 1) |
| `U = \{ (x, y) \mid y = 0 \}` (Ex 5.42) | `\openset` | v = (0, 0); (0, ε/2) ∉ U |
| `U = [0, 1)`, `U = \{0\}`, `U = \mathbb{Z}` | `\openset` | −ε/2, ε/2, min(ε, 1)/2 |
| `F = [0, 1)` (Ex 5.50) | `\closedset` | 1 ∉ F, but every ball meets F at 1 − min(ε/2, 1) |
| jump `f(x) = \begin{cases} 0 & \text{if } x < 0 \\ 1 & \text{if } x \ge 0 \end{cases}` (Ex 5.64) | `\limit` | the two one-sided values, ε = ¼ of the gap |
| ReLU or \|x\| as two cases (Ex 6.24, 6.31) | `\derivative` | slopes 1 and 0 (or −1) from the two sides |

### E8 Not convex / not strictly convex

- `f(x, y) = x^2 + y^2 - e^{x - y} - 1` (Ex 9.53) with `\convexfn` gives an explicit pair x, y where f((x+y)/2) > (f(x)+f(y))/2.
- `\strictconvex` gives the point where the Hessian is not positive semi-definite and the vector u. For a convex f it gives the segment where f is linear (Ex 6.6, 8.28 log(eˣ + eʸ) along (1, 1), 9.52, 9.54).
- `\convexset` with `C = \{ (x, y) \mid x^2 + y^2 \ge 1 \}` gives two points whose midpoint is outside.

### E9 A point that is not optimal

```vars
f(x, y) = 2x^2 + 3x + y^2 + y
g1(x, y) = x^2 + (y + 1)^2 - 1
g2(x, y) = y - x
p = (0, 0)
```

`\kkt` → "NOT optimal: no λ ≥ 0 at the point" (Ex 9.57(2)). It lists the active constraints, the KKT equations for λ, and the solution λ₁ = −2 < 0. It also states why Theorem 9.37 (i) applies: convex via Theorem 8.25, and a strictly feasible z₀ that it finds. The other route gives a feasible point with a smaller value (Ex 9.56(2): w = (0, 0)). If the point *is* optimal, "verify a given point satisfies KKT" gets the ★.

### E10 No rational root

`xi = \sqrt{2}`, `\sqrt[3]{2}`, `2^{1/3}` or `f(x) = x^3 - 2` (Ex 5.82) with `\irrational` writes the proof of Example 1.83 for your number:
- assume a/b has no common divisor (Def 1.54), so aⁿ = m·bⁿ;
- a prime p divides a, write a = pk, and then p divides b too.

The step "p divides a" is shown the book's way: parity for p = 2 (Example 1.80, Ex 1.81). For p = 3, 5, … it uses the same computation with remainders (a = ps + t, every t checked). √8 takes two rounds. A perfect power (∛27) gets "rational after all".

### E11 Find the mistake

```vars
chain = a = b \iff a^2 = ab \iff a^2 - b^2 = ab - b^2 \iff (a+b)(a-b) = b(a-b) \iff a + b = b \iff 2b = b \iff 2 = 1
```

`\fakeproof` (Ex 2.2) finds:
- "going from (a+b)(a−b) = b(a−b) to a + b = b divides by a − b, which is 0 because the first line says a = b";
- the ⇔ that only holds one way (a = 0, b = 1 for a = b ⇔ a² = ab).

`P(n) = 2^n = 2` (Ex 1.89) gives: P(1) is true but P(2) is false, so the induction step breaks between 1 and 2.

## 9. Python snippets

Inside a ```` ```python ```` block, type `\name` (`\hessian`, `\kkt`, `\gauss`, `\posdef`, `\lagrange`, …).

- **Inputs are filled from your vars block.** With *Ask for inputs first* on, a form asks for anything missing and inserts finished code. With it off, you get Tab stops.
- **Readable output.** Each snippet prints results you can read in seconds:
  - exact values when they are short, with the decimal added: `-sqrt(6)/3 (~-0.816497)`
  - `~2.09455` instead of a cubic-formula blob
  - intervals as `(-inf, -sqrt(6)/3) U (sqrt(6)/3, inf)`
  - matrices one row per line
  - yes/no verdicts
  - long loops summarised (`FALSE for n = 1..3`, `true for n = 4..12`)
- **Explanations.** The explanation and book references go *above* the block as Markdown. The prints are results only.
- **Completion.** `sp.`, `np.`, `np.linalg.`, `plt.`, `opt.` and `si.` complete with what your notes use most.

## 10. Graphs

`\graph` in normal text inserts a ```` ```graph ```` block that the plugin draws offline. Write one thing per line; note variables can be used by name:

```graph
f
x + 2y \le 6
region c1, c2, c3
p
tangent f at 1
level curves g: -1, 0, 1
x: -5..5   y: -2..4
```

With *\graph inserts Python* on, you get a short Plotly block instead, interactive with zoom and hover. The command **Convert the graph block at the cursor to Python** turns an existing block into Python.

## 11. Commands and settings

**Command palette:**
- Open (or create) the editable templates file
- Create vars from this note's math ($f(x) = ...$, $A = ...$)
- Study card for the exercise above the cursor (or the selection)
- Convert the graph block at the cursor to Python
- Rescan vault for LaTeX usage

**Settings:**

| Setting | What it does |
|---|---|
| Enable popup | Suggestions when you type `\` and a letter inside math |
| Rendered preview | Render each suggestion with MathJax |
| Offer fills after inserting | Filled versions after `\frac`, `\sum`, a matrix, … |
| Max suggestions | Length of the popup list |
| Enable @variables | The vars block and `@name` |
| Build objects from your variables | `\hessian`, `\inverse`, `\gauss`, … in math and vars blocks |
| Keep computed vars as formulas | Write `H = hessian(f)` (recomputed) instead of the matrix |
| Python style | How matrices and fractions are written in Python |
| Python snippets and completion | `\name` and `sp.` / `np.` completion in python blocks |
| Ask for inputs first | A form for every input, prefilled from vars |
| Explain what is used | The explanation and references above python blocks |
| Worked solutions in math | Full worked solution under the math block |
| Python evidence for computed text | A python block that recomputes the filled-in values |
| \graph inserts Python | Plotly instead of the offline graph block |
| Show material outside the book | Also commands for topics IMO26 does not cover |
| Enable templates / Templates file | Text templates and your own templates note |
| IMO26 problem templates and references | The course pack |
| Exercise templates file | The locally generated `\ex` note |
| Study cards: show the verdict | A folded spoiler in `\card` |
| Add the title / Link references to your notes | How `\def4.26` is inserted |
| Forget picks | Reset what the popups learned |

## 12. Tips and known limits

- **Offline and exact.** Fractions stay fractions. When a step can't be decided exactly, the text says so ("a check, not a proof") rather than guessing.
- **`log` is the natural logarithm,** as in the book.
- **Write |x| as two cases** (`\begin{cases} -x & \text{if } x < 0 \\ x & \text{if } x \ge 0 \end{cases}`). `\lvert x \rvert` is not read.
- **The ★ needs values.** Without a vars block, every route is shown and the blanks stay as Tab stops.
- **Proofs that fail, limits of the engines:**
  - E10 handles pure powers ξⁿ = m. The book has no tool for other polynomials.
  - E11 reads arguments written as formulas, not arguments in words.
  - "Give an example" exercises (2.30, 5.85, 6.8, 6.11, 8.22, 9.40) are templates only.
- **Several sets or functions:** the commands use `A`/`B`, `f`, `S`/`U`/`C`, … first. You can pick another one in the form.

## 13. Reference: every command

<!-- reference:start -->

*Generated from the plugin's sources by `npm run readme`: 59 IMO26 templates with 235 routes and 200 possible endings, 15 general templates, 56 math objects, 82 Python snippets with 120 routes.*

### IMO26 templates (normal text, course pack on)

Each line under a command is one solution route. **★** routes are picked automatically from your note's values when they fit.

<details><summary>`\truthtable` — Ch1: truth table / equivalence of propositions (Def 1.10)</summary>

- truth table for one proposition (Def 1.10)
- two propositions are equivalent: compare columns (Def 1.10)
- equivalence by rewriting with known equivalences (Def 1.18)
- true in every row (Def 1.10)
- NOT equivalent: one row where they differ (Def 1.10)
- NOT always true: one row where it is false (Def 1.10)

Possible endings:

- **true in every row** — you see: the last column is all T; you conclude: the proposition always holds
- **false in every row** — you see: the last column is all F; you conclude: its negation always holds
- **two propositions agree** — you see: same column in every row; you conclude: they are equivalent (Definition 1.18)
- **two propositions differ** — you see: one row with different values; you conclude: not equivalent: that row is the example
- **true in some rows, false in others** — you see: one row where the last column is f; you conclude: not always true: that row is the example

</details>

<details><summary>`\negate` — Ch1: negate a statement / prove it by contradiction (Sec 1.3.4, Sec 1.6.4)</summary>

- step by step ((1.3), Ex 1.20, Def 1.10)
- proof by contradiction: assume the negation (Sec 1.6.4)
- NOT true: prove the negation instead (Remark 5.34)

Possible endings:

- **the negation, written out** — you see: ¬ moved past every ∀, ∃, ∧, ∨, ⇒; you conclude: what to prove when you show the statement is false
- **the statement holds** — you see: assuming its negation leads to something false; you conclude: the statement is true (Section 1.6.4)
- **the statement is false** — you see: one value for each ∃ in the negation works; you conclude: the negation holds (Remark 5.34)

</details>

<details><summary>`\setequal` — Ch1: prove two sets are equal (Def 1.27)</summary>

- double inclusion (Def 1.27)
- chain of equivalences on membership (Def 1.27)
- via a truth table of the membership statements (Def 1.10, Def 1.27)
- NOT equal: an element in one but not the other (Def 1.27)

Possible endings:

- **equal** — you see: both inclusions hold; you conclude: A = B (Definition 1.27)
- **one inclusion only** — you see: A ⊆ B but some b ∈ B is not in A; you conclude: A ≠ B, A ⊆ B
- **neither** — you see: elements on both sides that the other lacks; you conclude: A ≠ B

</details>

<details><summary>`\subsetproof` — Ch1: show A is a subset of B</summary>

- element chasing
- not a subset: an element of A outside B

Possible endings:

- **subset** — you see: every x ∈ A satisfies the condition of B; you conclude: A ⊆ B
- **not a subset** — you see: one x ∈ A breaks the condition of B; you conclude: A ⊄ B

</details>

<details><summary>`\setbuilder` — Ch1: list the elements of a set-builder set / set operations</summary>

- solve the condition
- intersection, union, difference
- write a described set in set-builder notation

Possible endings:

- **empty set** — you see: the condition has no solution; you conclude: the set is ∅
- **finitely many elements** — you see: the condition has finitely many solutions; you conclude: list them
- **an interval or a union of intervals** — you see: an inequality in one variable; you conclude: write it with intervals
- **a region in the plane** — you see: an inequality in x and y; you conclude: describe or draw it

</details>

<details><summary>`\injective` — Ch1: show f is injective (Def 1.106)</summary>

- f(x) = f(y) implies x = y (Def 1.106)
- x ≠ y implies f(x) ≠ f(y) (Def 1.106, Ex 1.20)
- strictly increasing, via the derivative (Prop 6.43, Def 1.106)
- has an inverse function (Def 1.106)
- NOT injective: two points with the same value (Def 1.106)

Possible endings:

- **injective** — you see: f(x) = f(y) forces x = y, or f' > 0 (f' < 0) on the whole interval; you conclude: f is injective (Definition 1.106)
- **not injective** — you see: f(x) = f(y) has a solution with x ≠ y (even degree polynomials, f' changes sign); you conclude: two points with the same value
- **injective after restricting the domain** — you see: f is strictly increasing on a smaller interval; you conclude: injective there, not on all of ℝ

</details>

<details><summary>`\surjective` — Ch1: show f is surjective (Def 1.106)</summary>

- solve f(x) = y for x (Def 1.106)
- continuous and unbounded both ways, by Bolzano (Thm 5.81, Def 1.106)
- NOT surjective: a value that is never hit (Def 1.106)

Possible endings:

- **surjective** — you see: f(x) = y can be solved for every y (odd degree polynomials, continuous and unbounded both ways); you conclude: f is surjective (Definition 1.106)
- **not surjective** — you see: some y is never hit (x² never hits −1); you conclude: that y is the example
- **depends on the codomain** — you see: surjective onto the set of values, not onto ℝ; you conclude: name the codomain

</details>

<details><summary>`\bijective` — Ch1: show f is bijective (Def 1.106)</summary>

- injective + surjective (Def 1.106)
- exhibit the inverse function (Def 1.106)

Possible endings:

- **bijective** — you see: injective and surjective, or an inverse function exists; you conclude: f is bijective (Definition 1.106)
- **not bijective** — you see: one of the two fails; you conclude: say which one, with its example

</details>

<details><summary>`\inversefn` — Ch1: find the inverse function</summary>

- solve y = f(x) for x
- derivative of the inverse (chain rule, Sec 6.3.4)

Possible endings:

- **an inverse exists** — you see: y = f(x) has exactly one solution x for each y; you conclude: write x as a formula in y
- **no inverse** — you see: two solutions for some y (f not injective); you conclude: no inverse on this domain; restrict it

</details>

<details><summary>`\composition` — Ch1: compute a composition of functions</summary>

- plug in
- as a table (finite sets)

Possible endings:

- **both orders defined** — you see: the values of g lie where f is defined and the other way around; you conclude: f ∘ g and g ∘ f, usually different
- **only one order defined** — you see: the values of one function leave the domain of the other; you conclude: only that composition makes sense

</details>

<details><summary>`\preimage` — Ch1: compute a preimage (Def 1.115)</summary>

- solve the inequality / equation (Def 1.115)
- factor and check the sign of each factor (Def 1.115)

Possible endings:

- **empty** — you see: no x gives f(x) ∈ C; you conclude: f^{-1}(C) = ∅
- **an interval or union of intervals** — you see: solve the inequality; you conclude: write the intervals
- **everything** — you see: every x works; you conclude: f^{-1}(C) is the whole domain

</details>

<details><summary>`\irrational` — Ch1: no rational solution, by contradiction (Ex 1.85)</summary>

- lowest terms + divisibility (Def 1.54)
- it is rational after all: write it as a fraction (Def 1.54)

Possible endings:

- **irrational** — you see: lowest terms a/b lead to a common factor; you conclude: the number is not rational (Definition 1.54)
- **rational after all** — you see: it simplifies to a fraction; you conclude: give the fraction

</details>

<details><summary>`\inequality` — Ch1/5: prove an inequality</summary>

- chain of steps
- difference is a square (≥ 0)
- from the ordering axioms (Def 1.65, Prop 1.59)
- Cauchy-Schwarz (Thm 5.24)
- triangle inequality (Cor 5.27)
- by induction (Thm 1.86)
- NOT true for all values: one value where it fails

Possible endings:

- **holds for all values** — you see: the difference is a square or a sum of squares; you conclude: the inequality holds
- **holds from some n0 on** — you see: it fails for small n, the induction step works after n0; you conclude: holds for n ≥ n0 (Theorem 1.86)
- **fails for some values** — you see: one value makes it false; you conclude: that value is the example
- **equality case** — you see: the square is 0 exactly when ...; you conclude: say when equality holds

</details>

<details><summary>`\sumind` — Ch1: prove a formula by induction (Thm 1.86)</summary>

- sum formula
- inequality from some n0 on
- divisibility
- general statement (pigeonhole etc.)
- the formula is wrong: a small n where it fails (Thm 1.86)

Possible endings:

- **the formula holds for all n** — you see: base case and step both work; you conclude: proved by induction (Theorem 1.86)
- **holds from n0 on** — you see: the base case fails for small n; you conclude: start the induction at n0
- **the formula is wrong** — you see: the base case or a small n fails; you conclude: that n shows it

</details>

<details><summary>`\fakeproof` — Ch1/2: find the mistake in an argument</summary>

- invalid step
- division by zero
- ⇐ used where only ⇒ holds (Def 1.18)
- induction step fails for a small n (Thm 1.86)

Possible endings:

- **division by zero** — you see: a step divides by something that can be 0; you conclude: that step is not allowed
- **a ⇒ used as ⇔** — you see: a step that can't be reversed (squaring); you conclude: the claimed equivalence fails
- **induction step fails for a small n** — you see: the step uses two different elements that need n ≥ 2; you conclude: the chain breaks at n = 1 → 2

</details>

<details><summary>`\gauss` — Ch2: solve a linear system by Gauss elimination (Sec 2.3)</summary>

- unique solution (Thm 2.8)
- infinitely many solutions (Thm 2.8)
- no solutions: an impossible equation (Thm 2.8)
- word problem: set up the system first

Possible endings:

- **exactly one solution** — you see: every unknown gets a value; you conclude: the solution (Theorem 2.8)
- **infinitely many solutions** — you see: a free unknown is left; you conclude: the solutions in terms of the free unknown
- **no solution** — you see: elimination gives 0 = c with c ≠ 0; you conclude: the system has no solution
- **depends on a parameter** — you see: a coefficient containing a becomes 0 for some a; you conclude: treat those values of a separately

</details>

<details><summary>`\polydiv` — Ch2: polynomial division (Thm 2.22)</summary>

- long division (Thm 2.22)
- divisor x - α: remainder is f(α) (Prop 2.23)

Possible endings:

- **g divides f** — you see: remainder 0; you conclude: f = q·g (Theorem 2.22)
- **remainder ≠ 0** — you see: deg r < deg g, r ≠ 0; you conclude: f = q·g + r
- **divisor x − α** — you see: remainder f(α); you conclude: α is a root exactly when f(α) = 0 (Proposition 2.23)

</details>

<details><summary>`\roots` — Ch2: find the roots of a polynomial</summary>

- guess a root, then factor (Prop 2.23)
- substitution t = x^2 (quartic without odd powers)
- roots of a quadratic: formula (2.12) (Sec 2.4.2)
- with a parameter: the number of roots (Sec 2.4.2)
- a root exists: odd degree (Thm 2.28 / Prop 5.83)
- roots determine the coefficients (Prop 2.23)

Possible endings:

- **a whole-number or fraction root** — you see: f(a) = 0 for a small a; you conclude: divide by x − a and continue (Proposition 2.23)
- **degree 2, two roots** — you see: b² − 4ac > 0; you conclude: the formula (2.12) gives both
- **degree 2, one double root** — you see: b² − 4ac = 0; you conclude: x = −b/(2a)
- **no real roots** — you see: b² − 4ac < 0, or f > 0 everywhere; you conclude: no roots in ℝ
- **odd degree** — you see: degree is odd; you conclude: at least one root (Theorem 2.28)
- **even powers only** — you see: f(x) = g(x²); you conclude: t = x², solve, then x = ±√t
- **depends on a parameter** — you see: the coefficients contain a; you conclude: the sign of b² − 4ac for each range of a

</details>

<details><summary>`\interpolate` — Ch2: polynomial through given points (Sec 2.5)</summary>

- Lagrange polynomials (Sec 2.5.1, Remark 2.34)
- linear system in the coefficients (Sec 2.5)
- two points with the same x: no polynomial passes through both (Def 1.95)

Possible endings:

- **n points, degree < n** — you see: the x-values are different; you conclude: exactly one polynomial
- **the polynomial has lower degree** — you see: the top coefficient comes out 0; you conclude: the points lie on a lower degree curve
- **two points with the same x** — you see: same x, different y; you conclude: no polynomial passes through both

</details>

<details><summary>`\matmul` — Ch3: matrix products and arithmetic</summary>

- compute AB entry by entry (Def 3.4)
- check the associative law (Thm 3.19)
- powers of a matrix
- does (A+B)^2 = A^2 + 2AB + B^2? (Prop 3.17)
- NOT defined: the sizes don't match (Def 3.4)

Possible endings:

- **defined** — you see: columns of A = rows of B; you conclude: AB entry by entry (Definition 3.4)
- **not defined** — you see: the sizes don't match; you conclude: AB does not make sense
- **AB ≠ BA** — you see: one entry differs; you conclude: the matrices don't commute
- **AB = BA** — you see: same product both ways; you conclude: (A + B)² = A² + 2AB + B² holds

</details>

<details><summary>`\matinv` — Ch3: inverse matrices</summary>

- Gauss elimination on (A \| I) (Def 3.24, Sec 3.5.1)
- with parameters: for which values is A invertible? (Def 3.24, Ex 3.26)
- 2x2 formula (Ex 3.26)
- verify a claimed inverse (Def 3.24)
- NOT invertible: zero row/column or AB = 0 (Def 3.24)
- inverse of a product (Prop 3.29)
- not square: no inverse (Def 3.24)

Possible endings:

- **invertible** — you see: Gauss on (A \| I) reaches (I \| B); for 2 × 2: D = ad − bc ≠ 0; you conclude: A^{-1} = B (Definition 3.24)
- **not invertible** — you see: a zero row appears, or Av = 0 for some v ≠ 0; you conclude: no inverse: v = BAv = 0 would follow
- **depends on a parameter** — you see: D contains a; you conclude: invertible exactly when D ≠ 0; check each a with D = 0 separately
- **not square** — you see: A is m × n with m ≠ n; you conclude: no inverse in the sense of Definition 3.24

</details>

<details><summary>`\matrixproof` — Ch3: prove a matrix identity</summary>

- entry by entry (Def 3.4)
- with the rules for transpose/inverse (Prop 3.35, Prop 3.29)
- symmetric matrix: (·)^T equals itself (Prop 3.35)
- NOT true in general: one pair of matrices (Def 3.4)

Possible endings:

- **the identity holds** — you see: entries agree, or the rules transform one side into the other; you conclude: proved
- **it fails** — you see: one pair of matrices gives different sides; you conclude: that pair is the example

</details>

<details><summary>`\posdef` — Ch3/8: decide (semi-)definiteness of a symmetric matrix</summary>

- symmetric reduction to a diagonal matrix (Sec 8.7, Thm 8.31, Prop 3.43)
- with a parameter: which values give which case (Sec 8.7, Prop 3.43, Def 8.9)
- complete the square in u^T A u (as for (2.12), Sec 2.4.2)
- NOT positive definite: one bad vector (Ex 3.41)
- indefinite: one positive and one negative direction (Def 8.9)
- A^T A is positive semi-definite (Ex 8.35)
- not symmetric: decide the symmetric matrix with the same u^T A u (Sec 3.7.1)

Possible endings:

- **positive definite** — you see: every diagonal entry of D is > 0; you conclude: u^T A u > 0 for u ≠ 0 (Proposition 3.43)
- **positive semi-definite, not definite** — you see: entries of D are ≥ 0, at least one is 0; you conclude: u^T A u ≥ 0, with u ≠ 0 giving 0
- **negative definite** — you see: every diagonal entry of D is < 0; you conclude: u^T A u < 0 for u ≠ 0
- **negative semi-definite, not definite** — you see: entries of D are ≤ 0, at least one is 0; you conclude: u^T A u ≤ 0
- **indefinite** — you see: D has a positive and a negative entry; you conclude: one u with u^T A u > 0, one v with v^T A v < 0 (Definition 8.9)
- **depends on a parameter** — you see: D contains a; you conclude: one case per range of a, and each value where an entry of D is 0 on its own
- **not symmetric** — you see: A^T ≠ A; you conclude: the definitions are for symmetric matrices

</details>

<details><summary>`\formulate` — Ch4: write a problem as an optimization problem (Def 4.6)</summary>

- general form min f over C (Def 4.6, Remark 4.8)
- eliminate a variable with the constraint
- linear optimization problem (Sec 4.4)

Possible endings:

- **linear optimization problem** — you see: objective and constraints are linear; you conclude: optimum at a corner (Section 4.4)
- **one equality constraint** — you see: it can be solved for one variable; you conclude: insert it and optimize in fewer variables
- **general problem** — you see: nonlinear objective or constraints; you conclude: min f(v) subject to v ∈ C (Definition 4.6)

</details>

<details><summary>`\line` — Ch4: lines in R^d (Def 4.12)</summary>

- line through two points (Def 4.12, Ex 4.20)
- from parametric form to an equation (2D)
- do three points lie on one line?
- the two points coincide: no unique line (Def 4.12)

Possible endings:

- **a line** — you see: two different points or a point and a direction u ≠ 0; you conclude: { p + t u \| t ∈ ℝ } (Definition 4.12)
- **the points coincide** — you see: u = 0; you conclude: no unique line
- **three points on one line** — you see: one t fits every coordinate; you conclude: collinear
- **three points not on one line** — you see: the coordinates need different t; you conclude: not collinear

</details>

<details><summary>`\convexset` — Ch4: show a subset is convex (Def 4.21)</summary>

- by definition (Def 4.21)
- sublevel set of a convex function (Lemma 4.29)
- intersection of convex sets (Ex 4.25, Lemma 4.29)
- half-plane / hyperplane / interval (Def 4.40)
- NOT convex: a segment leaves the set (Def 4.21)

Possible endings:

- **convex** — you see: sublevel set of a convex function, intersection of convex sets, half-plane; you conclude: convex (Definition 4.21)
- **not convex** — you see: two points whose midpoint is outside; you conclude: that pair is the example
- **empty or a single point** — you see: no or one element; you conclude: convex (nothing to check)

</details>

<details><summary>`\convexfn` — Ch4/6/8: show a function is convex</summary>

- by definition (Def 4.26)
- one variable: f'' ≥ 0 (Cor 6.55)
- one variable: f' increasing (Thm 6.54)
- graph above tangents (Thm 6.61 / Thm 8.23)
- several variables: Hessian positive semi-definite (Thm 8.25)
- with a parameter: for which values is f convex? (Thm 8.25, Prop 3.43)
- building blocks: sums, max, linear (Def 4.26)
- NOT convex: one bad pair of points (Def 4.26)

Possible endings:

- **convex** — you see: f'' ≥ 0, or the Hessian is positive semi-definite everywhere; you conclude: convex (Corollary 6.55 / Theorem 8.25)
- **strictly convex** — you see: f'' > 0, or the Hessian is positive definite everywhere; you conclude: convex, even strictly (Definition 6.1)
- **not convex** — you see: f'' < 0 somewhere / Hessian not positive semi-definite at one point; you conclude: one bad point or pair of points
- **convex only on part of the domain** — you see: f'' ≥ 0 only for some x; you conclude: convex on that interval or open convex set
- **linear** — you see: f'' = 0 everywhere; you conclude: convex but not strictly convex
- **depends on a parameter** — you see: the Hessian contains a; you conclude: convex for the values of a where it is positive semi-definite

</details>

<details><summary>`\strictconvex` — Ch6/8: show a function is strictly convex (Def 6.1)</summary>

- one variable: f'' > 0 (Cor 6.55)
- one variable: f' strictly increasing (Thm 6.54)
- f'' ≥ 0 and = 0 only at isolated points, like x^4 (Prop 6.43, Thm 6.54, Remark 6.56)
- strictly convex + convex is strictly convex (Def 6.1, Def 4.26)
- by definition (Def 6.1)
- several variables: Hessian positive definite (Thm 8.25)
- NOT convex: the Hessian / f'' is not positive semi-definite somewhere (Thm 8.25, Cor 6.55)
- a strictly convex function has at most one minimum (Thm 6.13)
- convex but NOT strictly convex (Def 6.1, Remark 6.56)

Possible endings:

- **strictly convex** — you see: f'' > 0 / positive definite Hessian everywhere; you conclude: strictly convex
- **f'' = 0 only at single points** — you see: like x⁴ at 0; you conclude: still strictly convex (Remark 6.56)
- **convex, not strictly** — you see: f is linear on some segment; you conclude: not strictly convex
- **not convex** — you see: f'' < 0 somewhere; you conclude: not convex, so not strictly convex

</details>

<details><summary>`\fm` — Ch4: Fourier-Motzkin elimination (Sec 4.5)</summary>

- eliminate one variable (Sec 4.5)
- show a system has no solution (Sec 4.5)
- linear optimization: add z = objective (Sec 4.4-4.5)
- bounded set via projections (Ex 5.38)

Possible endings:

- **has a solution** — you see: elimination ends without a contradiction; you conclude: back-substitute to find one
- **no solution** — you see: elimination ends in 0 < c with c ≤ 0; you conclude: the system has no solution
- **the objective is unbounded** — you see: z only has bounds on one side; you conclude: no optimum
- **optimum** — you see: z has a bound on the optimizing side; you conclude: the bound is the optimal value

</details>

<details><summary>`\orthogonal` — Ch5: dot products, angles, orthogonal vectors</summary>

- u − λv orthogonal to v (Ex 5.6-5.7, Prop 5.15)
- angle / cosine similarity (Def 5.1, Thm 5.24)
- orthogonal vectors (Def 5.1)
- distance from a point to a hyperplane (Def 4.40, Ex 9.7, Thm 7.39)
- prove a dot-product rule from the definition (Def 5.1)

Possible endings:

- **orthogonal** — you see: u · v = 0; you conclude: u ⊥ v (Definition 5.1)
- **not orthogonal** — you see: u · v ≠ 0; you conclude: give the angle via the cosine
- **parallel** — you see: \|u · v\| = \|u\|\|v\|; you conclude: equality in Cauchy–Schwarz (Theorem 5.24)

</details>

<details><summary>`\leastsquares` — Ch5: best fit by least squares (Thm 5.16)</summary>

- normal equations (Thm 5.16)
- first show Av = b has no exact solution
- best quadratic / circle fit (linear in the unknown coefficients)

Possible endings:

- **an exact solution exists** — you see: Av = b can be solved; you conclude: least squares gives that solution
- **no exact solution** — you see: Av = b has none; you conclude: solve A^T A v = A^T b (Theorem 5.16)

</details>

<details><summary>`\bounded` — Ch5: bounded subsets (Def 5.33)</summary>

- find a radius R (Def 5.33)
- NOT bounded: elements of arbitrarily large norm (Def 5.33, Remark 5.34)
- subset of a bounded set

Possible endings:

- **bounded** — you see: one R works for every element; you conclude: S ⊆ B(0, R) (Definition 5.33)
- **not bounded** — you see: elements of arbitrarily large norm; you conclude: give that element as a formula in R (Remark 5.34)
- **empty** — you see: no elements; you conclude: bounded

</details>

<details><summary>`\openset` — Ch5: show a subset is open (Def 5.39)</summary>

- ε-ball around every point (Def 5.39)
- preimage of an open set under a continuous function (Prop 5.68)
- finite union / intersection of open sets (Prop 5.45)
- complement of a closed set (Def 5.47)
- NOT open: a point with no ball inside (Def 5.39)

Possible endings:

- **open** — you see: strict inequalities with continuous functions; you conclude: open (Proposition 5.68)
- **not open** — you see: a point of U on the edge (≤ or = in the condition); you conclude: that point has no ball inside
- **open and closed** — you see: ∅ or all of ℝ^d; you conclude: both

</details>

<details><summary>`\closedset` — Ch5: show a subset is closed (Def 5.47)</summary>

- preimage of a closed set under a continuous function (Prop 5.69)
- complement is open (Def 5.47)
- finite union / intersection of closed sets (Prop 5.49)
- NOT closed: complement is not open (Def 5.47)

Possible endings:

- **closed** — you see: ≤, ≥ or = with continuous functions; you conclude: closed (Proposition 5.69)
- **not closed** — you see: a point outside F with every ball meeting F (< in the condition); you conclude: that point shows it
- **neither open nor closed** — you see: a mix like [0, 1); you conclude: say both: not open and not closed (Remark 5.48)

</details>

<details><summary>`\compact` — Ch5: show a subset is compact (Def 5.53)</summary>

- closed + bounded (Def 5.53)
- NOT compact: unbounded or not closed (Def 5.53)

Possible endings:

- **compact** — you see: closed and bounded; you conclude: compact (Definition 5.53)
- **not compact: not bounded** — you see: elements of arbitrarily large norm; you conclude: not compact
- **not compact: not closed** — you see: bounded but with a strict inequality; you conclude: not compact

</details>

<details><summary>`\boundary` — Ch5: boundary and interior (Def 5.56, 5.58)</summary>

- compute both (Def 5.56, Def 5.58)
- S is open iff S equals its interior (Ex 5.59)

Possible endings:

- **boundary and interior** — you see: { g < c } has interior itself, boundary { g = c }; you conclude: write both sets
- **S equals its interior** — you see: no boundary point belongs to S; you conclude: S is open (Exercise 5.59)

</details>

<details><summary>`\limit` — Ch5: limits (Def 5.62)</summary>

- cancel the factor that vanishes (Def 5.62)
- ε–δ proof (Def 5.62, Remark 5.61)
- limit does NOT exist: different values on the two sides of a (Def 5.62)
- continuity: plug in (Def 5.65)

Possible endings:

- **f is continuous at a** — you see: no division by 0 at a; you conclude: the limit is f(a) (Definition 5.65)
- **0/0 that cancels** — you see: numerator and denominator both 0 at a; divide out x − a; you conclude: the limit of what is left
- **does not exist** — you see: different values from the left and right, or along two lines; you conclude: no limit
- **grows without bound** — you see: c/0 with c ≠ 0; you conclude: no limit (the values get arbitrarily large)
- **two variables: depends on the line** — you see: y = m x gives a value depending on m; you conclude: no limit

</details>

<details><summary>`\continuous` — Ch5: show a function is continuous (Def 5.65)</summary>

- built from continuous pieces (Lemma 5.72, Prop 5.74-5.75)
- polynomials and known functions (Remark 5.77, Remark 5.79)
- ε–δ from the definition (Def 5.62, Def 5.65)
- differentiable implies continuous (Prop 6.22)
- convex on an open convex set (Thm 6.7)
- NOT continuous at a point (Def 5.65)

Possible endings:

- **continuous everywhere** — you see: built from polynomials, sin, e^x, +, ·, composition; you conclude: continuous (Proposition 5.74, 5.75)
- **continuous where defined** — you see: a quotient whose denominator is 0 at some points; you conclude: continuous away from those points (Proposition 5.75)
- **not continuous at a point** — you see: two formulas that disagree at the switch; you conclude: the limit differs from f(a)

</details>

<details><summary>`\ivt` — Ch5: existence of a root / value (Thm 5.81)</summary>

- sign change on [a, b] (Thm 5.81)
- hitting a value c: apply it to f - c (Thm 5.81)
- odd-degree polynomial (Prop 5.83)
- bisection to approximate the root (Thm 5.81)
- no sign change at a and b: look at a point in between (Thm 5.81)

Possible endings:

- **a root in [a, b]** — you see: f(a) and f(b) have opposite signs; you conclude: some ξ with f(ξ) = 0 (Theorem 5.81)
- **a value c in between** — you see: f(a) < c < f(b); you conclude: apply it to f − c
- **no sign change found** — you see: f(a), f(b) of the same sign; you conclude: no conclusion: try other points

</details>

<details><summary>`\evt` — Ch5: a max/min exists (Thm 5.84)</summary>

- compact + continuous (Thm 5.84)
- Theorem 5.84 fails without compactness (Ex 5.85)
- not compact, but convex: a critical point is the minimum (Thm 6.13)

Possible endings:

- **max and min exist** — you see: compact set, continuous f; you conclude: both are attained (Theorem 5.84)
- **may fail** — you see: the set is not bounded or not closed; you conclude: the theorem does not apply; look for an example with no max or min
- **not compact, but convex** — you see: a line or plane with f convex along it; you conclude: a critical point is the minimum (Theorem 6.13)

</details>

<details><summary>`\derivative` — Ch6: derivatives</summary>

- from the definition (Def 6.17)
- with the rules (product, quotient, chain)
- NOT differentiable at a point (Def 6.17)
- higher derivatives: find the pattern

Possible endings:

- **differentiable** — you see: the rules apply everywhere; you conclude: f'(x) by product / chain rule
- **not differentiable at a point** — you see: slopes from the two sides differ (\|x\| at 0); you conclude: no derivative there
- **higher derivatives repeat** — you see: sin, cos, e^x; you conclude: the n-th derivative by the pattern

</details>

<details><summary>`\newton` — Ch6/8: Newton-Raphson method (Sec 6.3.5, Sec 7.4)</summary>

- one variable: iterate x - f/f'
- several variables: v - Hessian^-1 grad (Sec 8.3, (8.6))
- it fails: cycle or f' = 0

Possible endings:

- **the steps settle** — you see: the change gets tiny; you conclude: approximate root / critical point
- **f'(x_n) = 0** — you see: division by 0; you conclude: the method stops; pick another start
- **the steps repeat** — you see: x_2 = x_0; you conclude: no convergence from this start

</details>

<details><summary>`\crit` — Ch6: critical points and extrema, one variable</summary>

- find critical points + second derivative (Def 6.36, Lemma 6.37)
- higher derivative test when f'' = 0 (Thm 6.50)
- sign of f' around the point (Prop 6.43)
- convex function: critical point is the global min (Thm 6.13)
- global max/min on [a, b]: compare the critical points with a and b (Thm 5.84)
- a critical point that is NOT an extremum (Ex 6.38)

Possible endings:

- **local minimum** — you see: f'(x0) = 0, f''(x0) > 0; you conclude: local min
- **local maximum** — you see: f'(x0) = 0, f''(x0) < 0; you conclude: local max
- **f''(x0) = 0** — you see: second derivative test says nothing; you conclude: higher derivatives (Theorem 6.50) or the sign of f'
- **not an extremum** — you see: f' does not change sign (x³ at 0); you conclude: critical point but no extremum (Exercise 6.38)
- **no critical points** — you see: f'(x) = 0 has no solution; you conclude: no local extrema inside; on [a, b] look at a and b
- **global on [a, b]** — you see: compare values at critical points, a and b; you conclude: largest and smallest of those values (Theorem 5.84)
- **f convex** — you see: f'' ≥ 0; you conclude: a critical point is the global min (Theorem 6.13)

</details>

<details><summary>`\taylor` — Ch6: Taylor polynomials (Sec 6.4)</summary>

- compute the Taylor polynomial
- pattern in the derivatives (e.g. sin, cos, e^x)

Possible endings:

- **the Taylor polynomial** — you see: derivatives at x0; you conclude: P(x) = Σ f^{(k)}(x0)/k! (x − x0)^k
- **only even or odd terms** — you see: derivatives at x0 repeat with zeros; you conclude: half the terms vanish
- **f is a polynomial of degree ≤ n** — you see: higher derivatives are 0; you conclude: P = f exactly

</details>

<details><summary>`\increasing` — Ch6: increasing / decreasing (Def 6.41)</summary>

- sign of f' (Prop 6.43)
- from the definition (Def 6.41)
- mean value theorem (Thm 6.40)

Possible endings:

- **strictly increasing** — you see: f' > 0 (or f' ≥ 0 with zeros only at single points); you conclude: strictly increasing (Proposition 6.43)
- **increasing, not strictly** — you see: f' ≥ 0 and f' = 0 on an interval; you conclude: increasing
- **decreasing** — you see: f' ≤ 0; you conclude: decreasing
- **neither** — you see: f' changes sign; you conclude: increasing on some intervals, decreasing on others

</details>

<details><summary>`\mvt` — Ch6: mean value theorem (Thm 6.40)</summary>

- find the point ξ (Thm 6.40)
- bound a difference (Thm 6.40)
- f' = 0 everywhere means constant (Thm 6.40)

Possible endings:

- **the point ξ** — you see: solve f'(ξ) = (f(b) − f(a))/(b − a); you conclude: ξ in (a, b) (Theorem 6.40)
- **a bound** — you see: \|f'\| ≤ M on the interval; you conclude: \|f(b) − f(a)\| ≤ M\|b − a\|
- **constant** — you see: f' = 0 everywhere; you conclude: f is constant

</details>

<details><summary>`\gradient` — Ch7: partial derivatives and the gradient (Def 7.4)</summary>

- compute partials and the gradient (Def 7.4, Remark 7.5)
- differentiable: continuous partials (Thm 7.11)
- symmetry of second partials (Thm 7.11)
- descent direction (Lemma 7.17)

Possible endings:

- **gradient 0** — you see: every partial derivative is 0 at the point; you conclude: a critical point (Definition 7.15)
- **a descent direction** — you see: ∇f(v0) u < 0; you conclude: f decreases along u (Lemma 7.17)
- **steepest direction** — you see: u = −∇f(v0); you conclude: the fastest decrease

</details>

<details><summary>`\matrixderivative` — Ch7: matrix derivative of a vector function (Prop 7.9)</summary>

- matrix of partial derivatives (Prop 7.9)
- linear map f(v) = Av: derivative is A (Def 7.3)

Possible endings:

- **linear map** — you see: f(v) = Av; you conclude: the derivative is A
- **general** — you see: coordinate functions; you conclude: the matrix of partial derivatives (Proposition 7.9)

</details>

<details><summary>`\chainrule` — Ch7: multivariable chain rule (Thm 7.23)</summary>

- matrix product of derivatives (Thm 7.23)
- check by substituting first
- computational graph / backpropagation (Sec 7.6)

Possible endings:

- **the product of derivatives** — you see: f ∘ g with both differentiable; you conclude: (f ∘ g)' = f'(g(v)) g'(v) (Theorem 7.23)
- **check by substituting** — you see: write f(g(v)) out; you conclude: the same derivative

</details>

<details><summary>`\critxy` — Ch7/8: critical points and classification, several variables</summary>

- gradient = 0, then Hessian test (Def 7.15, Thm 8.12)
- with a parameter: which values give min / max / saddle (Thm 8.12, Prop 8.11)
- saddle point: two directions (Def 8.8)
- Hessian test inconclusive: look at f directly (Thm 8.12)
- convex function: critical point is the global min (Thm 6.13, Thm 8.23)

Possible endings:

- **local minimum** — you see: ∇f = 0, Hessian positive definite; you conclude: local min (Theorem 8.12)
- **local maximum** — you see: ∇f = 0, Hessian negative definite; you conclude: local max
- **saddle point** — you see: Hessian indefinite; you conclude: saddle point (Definition 8.8)
- **Hessian only semi-definite** — you see: a 0 on the diagonal of D; you conclude: Theorem 8.12 says nothing; look at f along lines
- **f convex** — you see: Hessian positive semi-definite everywhere; you conclude: a critical point is a global min (Theorem 6.13)
- **no critical point** — you see: ∇f = 0 has no solution; you conclude: no local extrema
- **infinitely many critical points** — you see: ∇f = 0 is a whole line; you conclude: classify along that line
- **depends on a parameter** — you see: the Hessian contains a; you conclude: min / max / saddle for each range of a

</details>

<details><summary>`\hessian` — Ch8: Hessian matrix (Def 8.2)</summary>

- compute the Hessian (Def 8.2)
- classify one critical point (Thm 8.12, Prop 8.11)
- depends on a parameter a (Prop 8.11)

Possible endings:

- **positive definite at v0** — you see: D > 0; you conclude: local min
- **negative definite at v0** — you see: D < 0; you conclude: local max
- **indefinite at v0** — you see: D has both signs; you conclude: saddle point
- **semi-definite** — you see: a 0 in D; you conclude: no conclusion from Theorem 8.12
- **depends on a parameter** — you see: D contains a; you conclude: the cases in a

</details>

<details><summary>`\lagrange` — Ch7: Lagrange multipliers (Thm 7.39)</summary>

- one constraint (Thm 7.39)
- linear constraint (a line): Lagrange, then convexity gives the min (Thm 7.39, Thm 6.13)
- regard λ as a constant: Gaussian elimination in x, y (Ex 7.42)
- word problem (box, fence, ...)
- ∇g = 0 somewhere on g = 0: check those points too (Thm 7.39)

Possible endings:

- **constraint set compact (circle, ellipse)** — you see: g = 0 is closed and bounded; you conclude: largest and smallest candidate values are the max and min (Theorem 5.84)
- **constraint a line or plane** — you see: g is linear; you conclude: not compact: convexity of f along it gives the min (Theorem 6.13)
- **no max (or no min)** — you see: f grows without bound along the constraint; you conclude: only the other one exists
- **several candidates** — you see: the system has several solutions; you conclude: compare the f-values
- **∇g = 0 at a point of g = 0** — you see: Theorem 7.39 does not cover that point; you conclude: check it separately
- **distance to a point** — you see: f = \|v − p\|²; you conclude: the closest point; the distance is √(min f) (Definition 5.1)

</details>

<details><summary>`\compactopt` — Ch7: max/min on a compact set: interior + boundary (Prop 7.46)</summary>

- interior critical points + each edge + corners (Prop 7.46)
- curved boundary: Lagrange on the boundary (Thm 7.39, Prop 7.46)
- linear objective: optimum at a corner (Sec 4.4)

Possible endings:

- **optimum inside** — you see: a critical point with the largest / smallest value; you conclude: compare with the boundary (Proposition 7.46)
- **optimum on an edge** — you see: Lagrange or one variable on that edge; you conclude: compare all candidates
- **optimum at a corner** — you see: linear f, or corners win the comparison; you conclude: the corner value (Section 4.4)

</details>

<details><summary>`\convexopt` — Ch9: convex optimization problems</summary>

- show it is a convex optimization problem (Lemma 4.29, Ex 4.25)
- first-order condition at the optimum (Prop 9.28)
- guess the solution, then verify (Prop 9.28)
- barrier method (Thm 9.21)

Possible endings:

- **optimum found** — you see: the first-order condition holds at v0; you conclude: v0 is optimal (Proposition 9.28, Theorem 6.13)
- **unique optimum** — you see: f strictly convex; you conclude: only one optimal point (Theorem 6.13)
- **not a convex problem** — you see: f or a constraint is not convex; you conclude: the convex theory does not apply

</details>

<details><summary>`\kkt` — Ch9: solve with the KKT conditions (Thm 9.37)</summary>

- KKT with case analysis on active constraints (Def 9.36, Thm 9.37)
- just state the KKT conditions (Thm 9.37)
- verify a given point satisfies KKT (Thm 9.37)
- all λ = 0: unconstrained minimum is feasible (Ex 9.43)
- not strictly feasible: KKT may fail (Ex 9.40)
- NOT optimal: no λ ≥ 0 at the point (Thm 9.37)
- NOT optimal: a feasible point with a smaller value (Lemma 7.17)
- no feasible point: the constraints contradict each other (Sec 4.5)

Possible endings:

- **all λ = 0** — you see: the unconstrained minimum is feasible; you conclude: it is the optimum (Exercise 9.43)
- **some constraints active** — you see: the case with λ ≥ 0 and all g ≤ 0; you conclude: the KKT point is the optimum (Theorem 9.37)
- **not strictly feasible** — you see: no point has all g_i < 0; you conclude: KKT may fail (Definition 9.36)
- **no feasible point** — you see: the constraints contradict each other; you conclude: no optimum
- **a given point is not optimal** — you see: no λ ≥ 0 solves the KKT equations there, or a feasible point has a smaller value; you conclude: the point is not optimal (Theorem 9.37)
- **a given point is optimal** — you see: λ ≥ 0 solves the KKT equations there; you conclude: the point is optimal (Theorem 9.37 (ii))

</details>

<details><summary>`\svm` — Ch9: separating hyperplanes, perceptron and SVM</summary>

- optimal separating hyperplane (Thm 9.8)
- perceptron algorithm by hand (Sec 5.3.2, Prop 5.14)
- NOT separable (Ex 5.9)

Possible endings:

- **separable** — you see: a line (hyperplane) with every point on its side; you conclude: the optimal hyperplane and its margin (Theorem 9.8)
- **not separable** — you see: adding the inequalities gives 0 < 0; you conclude: no separating line

</details>

<details><summary>`\perceptron` — Ch1: perceptrons and neural networks (Remark 1.120)</summary>

- choose weights for a logic gate
- impossible (XOR): contradiction from the inequalities

Possible endings:

- **the gate can be made** — you see: weights with every row right; you conclude: give w1, w2, b
- **impossible** — you see: the inequalities contradict each other; you conclude: no weights exist

</details>

<details><summary>`\explain` — Ch1-9: explain / argue why / give a precise reason</summary>

- answer + reason from a definition
- answer + reason from a theorem
- explain a computation step by step
- explain what the code / output shows
- yes / no question

</details>

<details><summary>`\chatbot` — Ch1: work with a chatbot prompt</summary>

- prompt log
- write my own prompt

</details>

### General templates (normal text, any course)

| Command | What it is |
|---|---|
| `\proof` | proof, pick a strategy (routes: direct proof; unfold the definition (cite it); apply a theorem: check its hypotheses; by contradiction; show: not B implies not A (Ex 1.20); by cases; both directions (if and only if); by induction (Thm 1.86)) |
| `\showthat` | "show that" question + answer, pick a strategy (routes: start from one side, reach the other; chain of equalities / inequalities; the object satisfies a definition (cite it); compute and compare; show it is false (an example where it fails)) |
| `\induction` | proof by induction on n |
| `\strongind` | proof by strong induction |
| `\contradiction` | proof by contradiction |
| `\contrapositive` | proof by contrapositive |
| `\iff` | if and only if, both directions |
| `\counterexample` | disprove with a counterexample |
| `\epsdelta` | epsilon-delta limit proof |
| `\bigO` | show f(n) is O(g(n)) |
| `\invariant` | loop invariant (init / maintenance / termination) |
| `\solution` | short answer, ADS style |
| `\find` | find / compute question |
| `\bijection` | show a function is bijective |
| `\definition` | definition block |

### Math objects (inside `$...$`, `$$...$$` and ```` ```vars ````)

| Command | What it builds |
|---|---|
| `\hessian` | Hessian matrix ∇²f (Def 8.2) |
| `\gradient` | gradient ∇f (Sec 7.5) |
| `\matrixderivative` | matrix derivative f′ of a vector function (Def 7.3, Prop 7.9) |
| `\partial` | partial derivatives ∂f/∂x, ∂²f/∂x∂y |
| `\laplacian` | Laplacian f_xx + f_yy + ... |
| `\tangentplane` | tangent plane z = f(a) + ∇f(a)·(x - a) |
| `\directional` | directional derivative ∇f(p)·v |
| `\critical` | the equations ∇f = 0 for critical points (Def 7.15) |
| `\newtonstep` | one Newton step x - H⁻¹∇f (Sec 8.3) / x - f/f' (Sec 6.3.5) |
| `\quadform` | quadratic form ⇄ symmetric matrix |
| `\lagrangian` | Lagrangian L = f + λ g (Sec 7.10, Thm 7.39) |
| `\derivative` | derivative f', f'', f^(n) |
| `\taylor` | Taylor polynomial of degree n at a (Sec 6.4) |
| `\evaluate` | f at a point |
| `\composition` | composition f∘g |
| `\matrix` | a matrix of any size (asks m, n) |
| `\vector` | a vector or point of any length (asks n) |
| `\inverse` | inverse matrix A⁻¹ (Ch3) |
| `\transpose` | transpose Aᵀ |
| `\rref` | reduced row echelon form (Sec 2.3) |
| `\adjugate` | adjugate matrix adj(A) |
| `\symmetricpart` | symmetric part ½(A + Aᵀ) |
| `\determinant` | determinant det A |
| `\definiteness` | definiteness of a symmetric matrix by symmetric reduction Bᵀ A B = D (Sec 8.7, Thm 8.31) |
| `\trace` | trace tr A |
| `\rank` | rank of A |
| `\charpoly` | characteristic polynomial det(A - λI) |
| `\eigenvalues` | eigenvalues (exact when 2×2 or rational) |
| `\product` | matrix product AB, Av |
| `\matsum` | A + B, kA |
| `\matpower` | powers Aᵏ = A·A·…·A |
| `\augmented` | augmented matrix [A \| b] (Sec 2.3) |
| `\system` | system of equations (asks m, n) |
| `\gauss` | solve a system of linear equations by Gauss elimination (Sec 2.3) |
| `\fouriermotzkin` | eliminate variables from linear inequalities (Sec 4.5) |
| `\negate` | negation of a statement, rule by rule ((1.3), Ex 1.20, Def 1.10, Remark 5.34) |
| `\limit` | limit of f at a point, decided and proved (Def 5.62, Def 5.65, Ex 5.63, Ex 5.64) |
| `\convexity` | is f convex / strictly convex? decided and proved (Cor 6.55, Thm 6.54, Thm 8.25) |
| `\induction` | proof by induction of a statement P(n) (Thm 1.86) |
| `\dotproduct` | dot product, norm, angle (Ch5) |
| `\line` | line through two points (Def 4.12) |
| `\interpolate` | polynomial through given points (Sec 2.5) |
| `\polynomial` | polynomial of degree n, or from its roots |
| `\set` | a set {…} |
| `\union` | union A ∪ B |
| `\intersection` | intersection A ∩ B |
| `\difference` | difference A \ B |
| `\symdiff` | symmetric difference A △ B |
| `\cartesian` | Cartesian product A × B (Def 1.50) |
| `\powerset` | power set P(A) |
| `\interval` | interval [a, b], (a, b), … |
| `\function` | a function f(x) = … or f(x, y) = … |
| `\piecewise` | piecewise function (cases) |
| `\constraint` | constraint g(x) ≤ 0 |
| `\proposition` | logic formula p ∧ q, p ⇒ q, … |
| `\fromnote` | create variables from the math in this note |

### Python snippets (inside ```` ```python ```` blocks)

| Command | What it computes | Routes |
|---|---|---|
| `\truthtable` | truth table of a proposition, e.g. (p ∧ q) ∨ ¬r (Def 1.10) | — |
| `\equivalent` | are two propositions logically equivalent? e.g. p => q and ¬p ∨ q (Ex 1.20) | — |
| `\sets` | intersection, union, difference, subset of two sets (Def 1.27) | — |
| `\cartesian` | Cartesian product A × B, product identities (Def 1.50) | A x B; check product identities with four sets A, B, C, D (Ex 1.52) |
| `\mediant` | mediants: the path to a fraction (Ex 1.75) | — |
| `\primes` | primes, factorization, Euclid's p1*p2*...*pn + 1 (Ex 1.84) | — |
| `\setbuilder` | list a set-builder set {x in U \| condition} (Def 1.27) | x from a finite set U; integers n in a range (e.g. x^2 - 5x + 6 = 0, twin primes n and n + 2); integer pairs (x, y) in a box (e.g. x^2 + y^2 < 5) |
| `\intersection` | where two things meet | two curves y = f(x), y = g(x); two sets; two lines in R^d: p + t*u and q + s*v; line p + t*u and plane n*x = c; system of equations |
| `\injective` | is f injective? solve f(a) = f(b) (Def 1.106) | — |
| `\surjective` | is f surjective? solve y = f(x) for x (Def 1.106) | — |
| `\inversefn` | inverse function: solve y = f(x) for x | — |
| `\composition` | compositions f∘g, g∘f, and with vector functions | f o g and g o f (one variable); g(f(t)) with f : R -> R^n and g : R^n -> R (Ex 1.103) |
| `\network` | perceptrons and small neural networks: AND, OR, XOR, parameters (Ex 1.122-1.126) | evaluate two perceptrons and an output perceptron on all 0/1 inputs; one perceptron on the truth table (AND / OR); count the parameters of a fully connected network |
| `\polyeval` | compute f(x) with fewer multiplications (Ex 2.19) | — |
| `\preimage` | preimage f^-1(S) of an interval (Def 1.115) | — |
| `\sumind` | induction: sum formulas and inequalities (Thm 1.86) | sum formula: base case, step, sympy's own sum; inequality for n = from..to (e.g. 2^n < n! for n >= 4) |
| `\hash` | sha-256 and md5 hash of a text (Ex 1.98) | — |
| `\tablefn` | functions given by a table: composition, injective, surjective, inverse (Ex 1.102) | — |
| `\gauss` | solve Ax = b by Gauss elimination (Sec 2.3) | — |
| `\linsolve` | solve Ax = b (exact and numeric) | — |
| `\polydiv` | polynomial division p = q·k + r (Thm 2.22) | — |
| `\roots` | roots and factorization of a polynomial | factor and find all roots; with one parameter: the number of real roots (Sec 2.4.2) |
| `\interpolate` | polynomial through given points, Shamir secret sharing (Sec 2.5) | the interpolating polynomial; Shamir secret sharing: the secret is p(0) (Ex 2.39) |
| `\stochastic` | stochastic matrix: powers P^n and the stable distribution (Ex 3.10) | — |
| `\matmul` | matrix arithmetic, and identities with general matrices (Ch3) | products, transpose, powers; check an identity with general 2x2 matrices, e.g. (A+B)^2 = A^2 + 2AB + B^2 (Ex 3.18) |
| `\matinv` | inverse matrix: solve AB_j = I_j, D = ad - bc for 2x2, check (Ch3) | inverse and check; with parameters: for which values is A invertible? (Def 3.24, Ex 3.26); by Gauss elimination on (A \| I) (Sec 3.5.1, Ex 3.34) |
| `\eliminate` | optimize with a constraint by eliminating a variable (Ex 4.2, 4.5) | — |
| `\det` | determinant (and by cofactor expansion along row 1) | — |
| `\rank` | rank, null space, column space | — |
| `\eigen` | eigenvalues, eigenvectors, diagonalization | — |
| `\posdef` | (semi)definiteness of a symmetric matrix, also with parameters (Ch3/8) | symmetric reduction B^T A B = D, every step (book method, Sec 8.7); numbers: only the answer (symmetric reduction, Sec 8.7); entries with parameters: for which values is it positive (semi)definite? (Ex 8.37); with one parameter: every case (Sec 8.7, Prop 3.43) |
| `\kernelperceptron` | kernel perceptron on labeled points (Ex 9.19) | — |
| `\quadform` | quadratic form x^T A x and back | — |
| `\line` | line through two points in R^d, is a point on it? (Def 4.12) | — |
| `\convexset` | test convexity of {x \| g_i(x) <= 0} on random pairs (Def 4.21) | — |
| `\convexfn` | is f convex? second derivative / Hessian (Ch4/6/8) | one variable: f'' >= 0; several variables: Hessian positive semidefinite everywhere; with one parameter: for which values is f convex? (Thm 8.25) |
| `\strictconvex` | strictly convex: f'' > 0 / Hessian positive definite (Def 6.1) | — |
| `\fm` | Fourier–Motzkin elimination of a variable (Sec 4.5) | — |
| `\lp` | linear optimization (linear programming) with scipy (Sec 4.4) | — |
| `\dot` | dot product, norm, angle, orthogonality (Ch5) | — |
| `\orthogonal` | find lambda with u - lambda v orthogonal to v (Ex 5.6) | — |
| `\gramschmidt` | orthonormal basis by Gram–Schmidt | — |
| `\leastsquares` | best fit by least squares: lines, polynomials, circles (Thm 5.16) | solve A^T A x = A^T b; fit a line y = αx + β through points; fit a polynomial of degree n through points (Ex 5.21); fit a circle (x - a)^2 + (y - b)^2 = r^2 through points (Ex 5.23) |
| `\softmax` | softmax weights with a dial beta, and the 2-class sigmoid (Ex 5.30, 7.36) | — |
| `\limit` | limits, for x > a and x < a, and restricted to lines (Def 5.62) | one variable; two variables at (0, 0): restrict to the lines y = m x and the parabola y = x^2 (Def 5.62 on a subset); sequence as n -> ∞ |
| `\continuous` | continuity at a point (Def 5.65) | — |
| `\ivt` | a root exists, find it by bisection (Thm 5.81) | — |
| `\evt` | max and min on [a, b]: critical points, a and b (Thm 5.84) | — |
| `\derivative` | derivatives: at a point, n-th order, from the definition (Ch6) | f', f'', at a point, tangent line; n-th derivative (e.g. f^(17) of sin x); from the definition: limit of (f(x + h) - f(x))/h (Def 6.17) |
| `\implicit` | implicit differentiation dy/dx of F(x, y) = 0 | — |
| `\newton` | Newton–Raphson for f(x) = 0 (Sec 6.3.5), and for systems F(x, y) = 0 (Sec 7.4) | one equation f(x) = 0; system F(x, y) = 0 with the matrix derivative (Sec 7.4, Ex 7.14) |
| `\logistic` | logistic regression: sigmoid, likelihood, gradient, fit (Ex 7.30-7.34) | — |
| `\crit` | critical points and extrema, one variable (Sec 6.3.6, Sec 6.4) | all critical points; at a given point x0 (e.g. e^x + log(1 + 2x) - 3x at 0) |
| `\loan` | loan with yearly payments: the real interest rate (Ex 6.35) | — |
| `\taylor` | Taylor polynomial of degree n at a (Sec 6.4) | — |
| `\increasing` | where f is increasing / decreasing (Def 6.41) | — |
| `\mvt` | mean value theorem: find c with f'(c) = (f(b) - f(a))/(b - a) (Thm 6.40) | — |
| `\lhopital` | limit by l'Hôpital: f/g at a | — |
| `\gradient` | partial derivatives and the gradient (Def 7.4, Sec 7.5) | — |
| `\compgraph` | computational graph of f, forward + backward pass, gradient by backpropagation | sympy: graph, forward pass, backward pass (by hand, every step printed); pytorch: autograd (run in Google Colab) |
| `\tangentplane` | tangent plane of z = f(x, y) at a point | — |
| `\matrixderivative` | matrix derivative of a vector function (Def 7.3, Prop 7.9) | — |
| `\chainrule` | chain rule: D(F∘G) = DF(G)·DG, and (g∘f)'(t) (Thm 7.23) | F, G : R^n -> R^n, D(F o G) = DF(G) DG; (g o f)'(t) for f : R -> R^n and g : R^n -> R (Ex 7.28) |
| `\critxy` | critical points + classification with the Hessian (Ch7/8) | all critical points, then the Hessian test; with one parameter: min / max / saddle for each value (Thm 8.12) |
| `\hessian` | Hessian matrix, at a point, definiteness, second order partial derivatives (Def 8.2) | at a point; for all x: positive (semi)definite everywhere?; second order partial derivatives: is f_xy = f_yx? (Clairaut's theorem, Thm 7.11) |
| `\lagrange` | Lagrange multipliers: extremes of f subject to g = 0 (Thm 7.39) | — |
| `\compactopt` | max/min on a compact set: interior + boundary (Prop 7.46) | boundary is a curve g = 0; polygon / rectangle given by inequalities g_i <= 0 (Ex 7.48-7.50) |
| `\kkt` | KKT conditions: minimize f subject to g_i <= 0, try every subset of the constraints with equality (Thm 9.37) | — |
| `\convexopt` | numeric constrained minimum with scipy (Ch9) | — |
| `\newtonopt` | Newton's method for minimizing f (Sec 8.3) | — |
| `\perceptron` | perceptron algorithm on labeled points (Remark 1.120) | — |
| `\svm` | optimal separating hyperplane, support vector machine (Sec 9.1, 9.2) | — |
| `\integral` | definite, indefinite, double, numeric integrals | definite and indefinite; double integral over a rectangle; numeric with scipy quad |
| `\area` | area between two curves (intersections + integral) | — |
| `\sum` | sums | — |
| `\solve` | solve an equation / inequality over the reals | — |
| `\simplify` | simplify, expand, factor | — |
| `\subs` | evaluate an expression at a point (exact and decimal) | — |
| `\plot` | plot y = f(x) | — |
| `\levelcurves` | level curves of f(x, y) | — |
| `\region` | shade the region where inequalities hold | — |
| `\lambdify` | turn a sympy expression into a fast numpy function | — |

<!-- reference:end -->

## 14. Development

```bash
npm install
npm run build          # bundles to dist/main.js
npm test               # unit tests (every engine with the book's exercises as cases)
npm run test:py        # runs every Python snippet route in real Python
node scripts/book-check.mjs   # solves 54 book exercises through the form and checks the answers
npm run readme         # regenerates section 13 of this README from the sources
OBSIDIAN_VAULT=/path/to/vault npm run install-vault
```

`docs/imo26-coverage/CONTRADICTIONS.md` maps every "not"-type exercise of the book to its engine. `scripts/live-test.mjs` drives a running Obsidian started with `--remote-debugging-port=9333`.

## License

MIT
