# IMO26 problem templates

One template per kind of exercise in Lauritzen, *Introduction to Mathematics and Optimization* (imo26).
Each `### route` under a template is one way of solving it; after picking the template you pick the route.
Routes cite the book's definitions, lemmas, propositions and theorems by number only.
`{{_}}` is an anonymous blank: it is never copied into other blanks.

## \truthtable — Ch1: truth table / equivalence of propositions (Def 1.10)
### truth table for one proposition (Def 1.10)
**Truth table** for ${{proposition}}$ (Definition 1.10):

| $p$ | $q$ | $r$ | ${{subformula}}$ | ${{proposition}}$ |
|---|---|---|---|---|
| t | t | t | {{_}} | {{_}} |
| t | t | f | {{_}} | {{_}} |
| t | f | t | {{_}} | {{_}} |
| t | f | f | {{_}} | {{_}} |
| f | t | t | {{_}} | {{_}} |
| f | t | f | {{_}} | {{_}} |
| f | f | t | {{_}} | {{_}} |
| f | f | f | {{_}} | {{_}} |

So ${{proposition}}$ is true exactly when {{condition}}.
### two propositions are equivalent: compare columns (Def 1.10)
**Claim.** ${{P}} \equiv {{Q}}$.

| $p$ | $q$ | ${{P}}$ | ${{Q}}$ |
|---|---|---|---|
| t | t | {{_}} | {{_}} |
| t | f | {{_}} | {{_}} |
| f | t | {{_}} | {{_}} |
| f | f | {{_}} | {{_}} |

The last two columns agree in every row, so ${{P}} \equiv {{Q}}$ (Definition 1.10). $\blacksquare$
### equivalence by rewriting with known equivalences (Def 1.18)
**Claim.** ${{P}} \equiv {{Q}}$.
$${{P}} \equiv {{step 1}} \equiv {{step 2}} \equiv {{Q}}$$
using {{¬(p ∧ q) ≡ ¬p ∨ ¬q (Exercise 1.20) / p ⇔ q ≡ (p ⇒ q) ∧ (q ⇒ p) (Definition 1.18)}}. $\blacksquare$
### true in every row (Def 1.10)
${{proposition}}$ is **always true**: in its truth table (Definition 1.10) the last column is t in every row:
{{table}}
$\blacksquare$

## \setequal — Ch1: prove two sets are equal (Def 1.27)
### double inclusion (Def 1.27)
**Proof.** By Definition 1.27 we show ${{A}} \subseteq {{B}}$ and ${{B}} \subseteq {{A}}$.

($\subseteq$) Let $x \in {{A}}$. Then {{unfold the definition of A}}, so $x \in {{B}}$.

($\supseteq$) Let $x \in {{B}}$. Then {{unfold the definition of B}}, so $x \in {{A}}$.

Hence ${{A}} = {{B}}$. $\blacksquare$
### chain of equivalences on membership (Def 1.27)
**Proof.** For every $x$:
$$x \in {{A}} \iff {{statement 1}} \iff {{statement 2}} \iff x \in {{B}}$$
so ${{A}}$ and ${{B}}$ have the same elements, i.e. ${{A}} = {{B}}$ (Definition 1.27). $\blacksquare$
### via a truth table of the membership statements (Def 1.10, Def 1.27)
**Proof.** Write $p: x \in A$, $q: x \in B$, $r: x \in C$. Then $x \in {{A}} \iff {{proposition 1}}$ and $x \in {{B}} \iff {{proposition 2}}$.
These two propositions have identical truth tables (Definition 1.10): {{table / reason}}.
So ${{A}} = {{B}}$ (Definition 1.27). $\blacksquare$
### NOT equal: an element in one but not the other (Def 1.27)
${{A}} \neq {{B}}$ (Definition 1.27): ${{element}} \in {{A}}$ because {{reason}}, but ${{element}} \notin {{B}}$ because {{reason}}.

## \subsetproof — Ch1: show A is a subset of B
### element chasing
**Proof.** Let $x \in {{A}}$, i.e. {{what membership in A means}}.
{{argument}}
So $x \in {{B}}$. Since $x$ was arbitrary, ${{A}} \subseteq {{B}}$. $\blacksquare$
### not a subset: an element of A outside B
${{A}} \not\subseteq {{B}}$: ${{element}} \in {{A}}$ since {{reason}}, but ${{element}} \notin {{B}}$ since {{reason}}.

## \setbuilder — Ch1: list the elements of a set-builder set / set operations
### solve the condition
$\{ {{x}} \in {{universe}} \mid {{condition}} \}$: we solve ${{condition}}$:
{{solve}}
Keeping only solutions in ${{universe}}$, the set is $\{ {{elements}} \}$.
### intersection, union, difference
With ${{A}} = \{ {{elements of A}} \}$ and ${{B}} = \{ {{elements of B}} \}$:
$${{A}} \cap {{B}} = \{ {{_}} \}, \quad {{A}} \cup {{B}} = \{ {{_}} \}, \quad {{A}} \setminus {{B}} = \{ {{_}} \}$$
### write a described set in set-builder notation
$S = \{ ({{variables}}) \in {{universe}} \mid {{conditions}} \}$, since a point belongs to $S$ exactly when {{description}}.

## \injective — Ch1: show f is injective (Def 1.106)
### f(x) = f(y) implies x = y (Def 1.106)
**Proof.** Let $x, y \in {{domain}}$ with $f(x) = f(y)$, i.e. ${{f(x) = f(y) written out}}$.
{{algebra}}
So $x = y$, and $f$ is injective (Definition 1.106). $\blacksquare$
### x ≠ y implies f(x) ≠ f(y) (Def 1.106, Ex 1.20)
**Proof.** Let $x, y \in {{domain}}$ with $x \neq y$, say $x < y$. Then {{f(x) < f(y), e.g. because f is strictly increasing}}, so $f(x) \neq f(y)$. Hence $f$ is injective (Definition 1.106). $\blacksquare$
### strictly increasing, via the derivative (Prop 6.43, Def 1.106)
**Proof.** $f'(x) = {{f'}} > 0$ on ${{domain}}$, so $f$ is strictly increasing (Proposition 6.43, Definition 6.41). If $x \neq y$, say $x < y$, then $f(x) < f(y)$, so $f(x) \neq f(y)$. Hence $f$ is injective (Definition 1.106). $\blacksquare$
### has an inverse function (Def 1.106)
**Proof.** $g(y) = {{g}}$ satisfies $g(f(x)) = {{check}} = x$ for all $x \in {{domain}}$. So $f(x) = f(y) \Rightarrow x = g(f(x)) = g(f(y)) = y$, and $f$ is injective (Definition 1.106). $\blacksquare$
### NOT injective: two points with the same value (Def 1.106)
$f$ is **not injective** (Definition 1.106): $f({{x1}}) = {{value}} = f({{x2}})$ but ${{x1}} \neq {{x2}}$.

## \surjective — Ch1: show f is surjective (Def 1.106)
### solve f(x) = y for x (Def 1.106)
**Proof.** Let $y \in {{codomain}}$. We look for $x \in {{domain}}$ with $f(x) = y$: solving ${{f(x) = y}}$ gives $x = {{x in terms of y}}$.
This $x$ lies in ${{domain}}$ because {{reason}}, and $f(x) = {{check}} = y$.
So $f$ is surjective (Definition 1.106). $\blacksquare$
### continuous and unbounded both ways, by Bolzano (Thm 5.81, Def 1.106)
**Proof.** $f$ is continuous (Remark 5.77). For $y \in \mathbb{R}$ pick $a < b$ with $f(a) < y < f(b)$ ({{why such a and b exist}}); then $g(x) = f(x) - y$ has $g(a) < 0 < g(b)$, so by Theorem 5.81 there is $x_0$ with $f(x_0) = y$. Hence $f$ is surjective (Definition 1.106). $\blacksquare$
### NOT surjective: a value that is never hit (Def 1.106)
$f$ is **not surjective** (Definition 1.106): $y = {{y}} \in {{codomain}}$ has no preimage, since $f(x) = {{y}}$ would require {{impossible condition}}.

## \bijective — Ch1: show f is bijective (Def 1.106)
### injective + surjective (Def 1.106)
**Proof.** $f\colon {{A}} \to {{B}}$, $f(x) = {{formula}}$.

**Injective:** if $f(x_1) = f(x_2)$ then {{argument}}, so $x_1 = x_2$.

**Surjective:** for $y \in {{B}}$, $x = {{preimage}} \in {{A}}$ has $f(x) = y$.

So $f$ is bijective (Definition 1.106). $\blacksquare$
### exhibit the inverse function (Def 1.106)
**Proof.** Let $g\colon {{B}} \to {{A}}$, $g(y) = {{inverse formula}}$. Then $g(f(x)) = {{check 1}} = x$ and $f(g(y)) = {{check 2}} = y$, so $g = f^{-1}$ and $f$ is bijective (Definition 1.106). $\blacksquare$

## \inversefn — Ch1: find the inverse function
### solve y = f(x) for x
$f\colon {{A}} \to {{B}}$, $f(x) = {{formula}}$, is bijective (Definition 1.106). Solve $y = {{formula}}$ for $x$:
{{solve}}
So $f^{-1}\colon {{B}} \to {{A}}$, $f^{-1}(y) = {{inverse formula}}$. Check: $f(f^{-1}(y)) = {{check}} = y$.
### derivative of the inverse (chain rule, Sec 6.3.4)
Differentiating $f(g(x)) = x$ with the one variable chain rule (Section 6.3.4): $f'(g(x))\,g'(x) = 1$, so
$$g'(x) = \frac{1}{f'(g(x))} = {{result}}.$$

## \composition — Ch1: compute a composition of functions
### plug in
$(f \circ g)(x) = f(g(x)) = f({{g(x)}}) = {{result}}$, defined for $x \in {{domain of g}}$ with $g(x) \in {{domain of f}}$.
### as a table (finite sets)
| $x$ | $g(x)$ | $(f \circ g)(x)$ |
|---|---|---|
| {{_}} | {{_}} | {{_}} |
| {{_}} | {{_}} | {{_}} |
| {{_}} | {{_}} | {{_}} |

## \preimage — Ch1: compute a preimage (Def 1.115)
### solve the inequality / equation (Def 1.115)
By Definition 1.115, $f^{-1}({{C}}) = \{ x \in {{A}} \mid f(x) \in {{C}} \} = \{ x \in {{A}} \mid {{inequality/equation}} \}$.
{{solve}}
So $f^{-1}({{C}}) = {{answer}}$.
### factor and check the sign of each factor (Def 1.115)
$f(x) = {{f}} = ({{factor 1}})({{factor 2}})$, so by Definition 1.115:

| $x$ | ${{factor 1}}$ | ${{factor 2}}$ | $f(x)$ |
|---|---|---|---|
| {{_}} | {{_}} | {{_}} | {{_}} |

Hence $f^{-1}({{C}}) = {{answer}}$.

## \irrational — Ch1: no rational solution, by contradiction (Ex 1.85)
### lowest terms + divisibility (Def 1.54)
**Proof by contradiction.** Assume $\xi = \frac{a}{b} \in \mathbb{Q}$ with ${{equation in xi}}$, where $a \in \mathbb{Z}$, $b \in \mathbb{N}$ have no common divisor (Definition 1.54).
Then ${{equation in a, b}}$, so ${{p}}$ divides $a$. Write $a = {{p}}k$. Then {{substitute}}, so ${{p}}$ divides $b$ too.
So ${{p}}$ divides both $a$ and $b$ — a contradiction. $\blacksquare$

## \inequality — Ch1/5: prove an inequality
### chain of steps
**Proof.** For {{assumptions}}:
$${{LHS}} = {{step 1}} \le {{step 2}} = {{RHS}}$$
where the first step uses {{rule}} and the second uses {{rule}}. $\blacksquare$
### difference is a square (≥ 0)
**Proof.** $${{RHS}} - ({{LHS}}) = {{rewrite}} = ({{expression}})^2 \ge 0,$$ so ${{LHS}} \le {{RHS}}$. $\blacksquare$
### from the ordering axioms (Def 1.65, Prop 1.59)
**Proof.** $x < y$ means $y - x \in A^+$ (Definition 1.65). {{rewrite the claim as "something ∈ A+"}}, and this holds since $A^+$ is closed under $+$ and $\cdot$ (Definition 1.65 (ii)), using the rules in Proposition 1.59. $\blacksquare$
### Cauchy-Schwarz (Thm 5.24)
**Proof.** With $u = {{u}}$ and $v = {{v}}$, Theorem 5.24 gives $|u \cdot v| \le |u|\,|v|$, i.e. ${{written out}}$. $\blacksquare$
### triangle inequality (Cor 5.27)
**Proof.** By Corollary 5.27, $|u + v| \le |u| + |v|$; with $u = {{u}}$, $v = {{v}}$ this is ${{written out}}$. $\blacksquare$
### by induction (Thm 1.86)
**Proof by induction** (Theorem 1.86) on $n \ge {{n0}}$. Base case: {{check}}. Step: assume ${{inequality for n}}$; then ${{inequality for n+1 side}} = {{rewrite}} \ge {{use the hypothesis}} \ge {{other side}}$. $\blacksquare$

## \sumind — Ch1: prove a formula by induction (Thm 1.86)
### sum formula
**Proof by induction** (Theorem 1.86). Let $p(n)$: $\sum_{i=1}^{n} {{term}} = {{closed form}}$.

**Base case** $n = 1$: LHS $= {{LHS at 1}}$, RHS $= {{RHS at 1}}$. ✓

**Induction step:** Assume $p(n)$. Then
$$\sum_{i=1}^{n+1} {{term}} = {{closed form}} + {{term at n+1}} = {{simplify}} = {{closed form at n+1}},$$
which is $p(n+1)$. So $p(n)$ holds for all $n \in \mathbb{N}$. $\blacksquare$
### inequality from some n0 on
**Proof by induction** (Theorem 1.86, started at $n_0 = {{n0}}$). Let $p(n)$: ${{inequality}}$.
**Base case** $n = {{n0}}$: {{check}}.
**Step:** assume $p(n)$ for some $n \ge {{n0}}$. Then {{multiply/add and use p(n)}}, which is $p(n+1)$.
So $p(n)$ holds for all $n \ge {{n0}}$. $\blacksquare$
### divisibility
**Proof by induction** (Theorem 1.86). Let $p(n)$: ${{d}}$ divides ${{expression}}$.
**Base case:** {{check}}.
**Step:** ${{expression at n+1}} = {{rewrite as (expression at n) + multiple of d}}$; both terms are divisible by ${{d}}$ (the first by $p(n)$). $\blacksquare$
### general statement (pigeonhole etc.)
**Proof by induction on ${{m}}$** (Theorem 1.86). Let $p({{m}})$: {{statement}}.
**Base case:** {{check}}.
**Step:** assume $p({{m}})$. {{reduce the case m+1 to the case m}}. $\blacksquare$

## \fakeproof — Ch1/2: find the mistake in an argument
### invalid step
**The mistake** is in the step ${{step}}$: {{why that inference is not valid}}.
Everything before it is fine; from this step on the argument proves nothing.
### division by zero
**The mistake:** going from ${{before}}$ to ${{after}}$ divides by ${{expression}}$, which is $0$ because {{reason}}. Division by $0$ is not allowed, so the conclusion does not follow.
### ⇐ used where only ⇒ holds (Def 1.18)
**The mistake:** the argument writes ${{A}} \iff {{B}}$, but only ${{A}} \Rightarrow {{B}}$ holds: {{an example where ⇐ fails}} (Definition 1.18). So the chain cannot be read backwards.
### induction step fails for a small n (Thm 1.86)
**The mistake:** the induction step from $n$ to $n+1$ uses {{assumption, e.g. two overlapping groups}}, which fails for $n = {{n}}$. So the chain $p(1) \Rightarrow p(2) \Rightarrow \cdots$ breaks there and Theorem 1.86 does not apply.

## \gauss — Ch2: solve a linear system by Gauss elimination (Sec 2.3)
### unique solution (Thm 2.8)
**Solve** with Gauss elimination (Section 2.3: multiplying an equation by a number and adding it to another keeps the solutions, Theorem 2.8). The system, with the right-hand sides after the bar:
$$\left(\begin{array}{ccc|c} {{system rows}} \end{array}\right)$$
$R_2 \leftarrow R_2 - {{c}} R_1$, $R_3 \leftarrow R_3 - {{c}} R_1$:
$$\left(\begin{array}{ccc|c} {{after step 1}} \end{array}\right)$$
$R_3 \leftarrow R_3 - {{c}} R_2$:
$$\left(\begin{array}{ccc|c} {{reduced system}} \end{array}\right)$$
Solve the last equation and insert into the ones above: {{x3, then x2, then x1}}.
**Solution:** $({{x1}}, {{x2}}, {{x3}})$. Check: {{check in the original equations}}.
### infinitely many solutions (Thm 2.8)
After elimination (Theorem 2.8) the system reduces to
$$\left(\begin{array}{ccc|c} {{reduced system}} \end{array}\right)$$
so ${{free variable}}$ can be chosen freely. Expressing the others in terms of ${{free variable}} = t$: ${{x = ..., y = ...}}$.
**All solutions:** $\{ {{solution vector in terms of t}} \mid t \in \mathbb{R} \}$.
### no solutions: an impossible equation (Thm 2.8)
After elimination (Theorem 2.8):
$$\left(\begin{array}{ccc|c} {{reduced system}} \end{array}\right)$$
The last row says $0 = {{nonzero}}$, which is impossible, so the system has **no solutions**.
### word problem: set up the system first
**Unknowns:** ${{unknowns}}$ = {{what they mean}}.
**Equations:** {{translate each sentence}}:
$${{system}}$$
Solving by Gauss elimination (Section 2.3): {{steps}}.
**Answer:** {{answer in words}}.

## \polydiv — Ch2: polynomial division (Thm 2.22)
### long division (Thm 2.22)
**Divide** $f(x) = {{f}}$ by $d(x) = {{d}}$ (Theorem 2.22):
{{long division steps}}
So $f(x) = ({{q}})\,d(x) + ({{r}})$ with $\deg r < \deg d$, i.e. $q(x) = {{q}}$, $r(x) = {{r}}$.
### divisor x - α: remainder is f(α) (Prop 2.23)
Dividing by $x - {{alpha}}$ gives remainder $r = f({{alpha}}) = {{value}}$ (Theorem 2.22 with $\deg r < 1$). So $x - {{alpha}}$ divides $f$ iff $f({{alpha}}) = 0$ (Proposition 2.23).

## \roots — Ch2: find the roots of a polynomial
### guess a root, then factor (Prop 2.23)
**Roots of** $f(x) = {{f}}$. Trying $x = {{alpha}}$: $f({{alpha}}) = 0$, so $f(x) = (x - {{alpha}})\,q(x)$ with $q(x) = {{q}}$ (Proposition 2.23).
{{roots of q}}
**Roots:** $x = {{roots}}$ (at most $\deg f$ of them, Theorem 2.25).
### substitution t = x^2 (quartic without odd powers)
Put $t = x^2$: ${{quadratic in t}} = 0$ gives $t = {{t values}}$. Then $x = \pm\sqrt{t}$ for each $t \ge 0$: **roots** $x = {{roots}}$.
### roots of a quadratic: formula (2.12) (Sec 2.4.2)
$a = {{a}}$, $b = {{b}}$, $c = {{c}}$, discriminant $b^2 - 4ac = {{discriminant}}$ ({{≥ 0 / < 0: no roots}}). By (2.12) (Section 2.4.2): $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} = {{roots}}$.
### a root exists: odd degree (Thm 2.28 / Prop 5.83)
$f$ has odd degree ${{n}}$, so it has a real root (Theorem 2.28, proved in Proposition 5.83 via Bolzano, Theorem 5.81).
### roots determine the coefficients (Prop 2.23)
If $\alpha, \beta$ are the roots of $x^2 + bx + c$, then $x^2 + bx + c = (x - \alpha)(x - \beta)$ (Proposition 2.23), so $b = -(\alpha + \beta)$ and $c = \alpha\beta$.

## \interpolate — Ch2: polynomial through given points (Sec 2.5)
### Lagrange polynomials (Sec 2.5.1, Remark 2.34)
**Find** the polynomial of degree $\le {{n}}$ through ${{points}}$. Lagrange polynomials (Section 2.5.1):
$$L_1(x) = {{L1}},\quad L_2(x) = {{L2}},\quad L_3(x) = {{L3}}$$
Then $f(x) = y_1 L_1(x) + y_2 L_2(x) + y_3 L_3(x) = {{simplified}}$ (Remark 2.34). Check: {{f at each point}}.
### linear system in the coefficients (Sec 2.5)
Write $f(x) = a_0 + a_1 x + a_2 x^2 + \dots$. Each point gives a linear equation in $a_0, a_1, \dots$:
$${{system}}$$
Gauss elimination (Section 2.3) gives ${{coefficients}}$, so $f(x) = {{polynomial}}$. It is unique by Theorem 2.25 (Remark 2.26).

## \matmul — Ch3: matrix products and arithmetic
### compute AB entry by entry (Def 3.4)
$A$ is ${{m}} \times {{n}}$ and $B$ is ${{n}} \times {{r}}$, so $AB$ is ${{m}} \times {{r}}$ with $(AB)_{ij} = \sum_k A_{ik} B_{kj}$ (Definition 3.4):
$$AB = {{product}}$$
### check the associative law (Thm 3.19)
$$(AB)C = {{AB}}\,C = {{result}}, \qquad A(BC) = A\,{{BC}} = {{result}}$$
The two agree, as Theorem 3.19 says.
### powers of a matrix
$A^2 = {{A^2}}$, $A^3 = {{A^3}}$, so (by induction, Theorem 1.86) $A^k = {{A^k}}$.
### does (A+B)^2 = A^2 + 2AB + B^2? (Prop 3.17)
By Proposition 3.17, $(A + B)^2 = A^2 + AB + BA + B^2$. This equals $A^2 + 2AB + B^2$ iff $AB = BA$; for $A = {{A}}$, $B = {{B}}$: $AB = {{AB}} \neq {{BA}} = BA$.

## \matinv — Ch3: inverse matrices
### Gauss elimination on (A | I) (Def 3.24, Sec 3.5.1)
**Inverse of** $A = {{A}}$: the columns $B_j$ of $A^{-1}$ solve $AB_j = I_j$ (Section 3.5.1). Solve them all at once by Gauss elimination on $(A \mid I)$ until it is $(I \mid A^{-1})$:
$$\left(\begin{array}{ccc|ccc} {{A | I}} \end{array}\right) \to {{steps}} \to \left(\begin{array}{ccc|ccc} {{I | A inverse}} \end{array}\right)$$
So $A^{-1} = {{A inverse}}$. Check: $AA^{-1} = I$ (Definition 3.24).
### 2x2 formula (Ex 3.26)
For $A = {{A}}$: $D = ad - bc = {{D}} \neq 0$, so $A$ is invertible and
$$A^{-1} = \frac{1}{D}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = {{A inverse}}.$$
### verify a claimed inverse (Def 3.24)
$A\,{{B}} = {{product 1}} = I$ and ${{B}}\,A = {{product 2}} = I$, so ${{B}} = A^{-1}$ (Definition 3.24).
### NOT invertible: zero row/column or AB = 0 (Def 3.24)
$A$ is **not invertible**: {{A has a zero row / A v = 0 for v = ... ≠ 0}}. If $B$ were an inverse, then {{contradiction, e.g. v = BAv = B0 = 0}} (Definition 3.24).
### inverse of a product (Prop 3.29)
$(AB)^{-1} = B^{-1}A^{-1}$ (Proposition 3.29), since $(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AA^{-1} = I$ (Theorem 3.19).

## \matrixproof — Ch3: prove a matrix identity
### entry by entry (Def 3.4)
**Proof.** We compare entry $(i,j)$ on both sides (Definition 3.4).
LHS: $({{LHS}})_{ij} = {{expand}}$.
RHS: $({{RHS}})_{ij} = {{expand}}$.
These agree for all $i, j$, so ${{LHS}} = {{RHS}}$. $\blacksquare$
### with the rules for transpose/inverse (Prop 3.35, Prop 3.29)
**Proof.** Using $(AB)^\top = B^\top A^\top$ (Proposition 3.35), $(AB)^{-1} = B^{-1}A^{-1}$ (Proposition 3.29) and associativity (Theorem 3.19):
$${{LHS}} = {{step}} = {{RHS}}.$$ $\blacksquare$
### symmetric matrix: (·)^T equals itself (Prop 3.35)
**Proof.** $({{M}})^\top = {{transpose using Proposition 3.35}} = {{M}}$, so ${{M}}$ is symmetric. $\blacksquare$

## \posdef — Ch3/8: decide (semi-)definiteness of a symmetric matrix
### symmetric reduction to a diagonal matrix (Sec 8.7, Thm 8.31, Prop 3.43)
**Is** $A = {{A}}$ positive definite? Symmetric reduction (Section 8.7, Theorem 8.31): write $I$ on top of $A$; every column operation is done on the whole extended matrix, and the same row operation on the lower half.
{{row op + column op}}
This gives $B^\top A B = D = {{diagonal matrix}}$ with $B$ invertible.
By Proposition 3.43 / 8.11 $A$ is {{positive definite / positive semi-definite / indefinite}}, since the diagonal entries of $D$ are {{all > 0 / all ≥ 0 / of both signs}}.
### complete the square in u^T A u (as for (2.12), Sec 2.4.2)
Completing the square (as in deriving (2.12), Section 2.4.2):
$$u^\top A u = {{quadratic form}} = {{a}}\left(x + {{shift}}\,y\right)^2 + {{c}}\,y^2$$
This is $> 0$ for $u \neq 0$ iff ${{a}} > 0$ and ${{c}} > 0$, so $A$ is {{positive definite / not}}.
### NOT positive definite: one bad vector (Ex 3.41)
$A$ is **not positive definite**: $u = {{u}}$ gives $u^\top A u = {{value}} \le 0$ (e.g. $A_{11} < 0$ with $u = e_1$, Exercise 3.41).
### indefinite: one positive and one negative direction (Def 8.9)
$u = {{u}}$: $u^\top A u = {{positive}} > 0$; $v = {{v}}$: $v^\top A v = {{negative}} < 0$. So $A$ is indefinite (Definition 8.9).
### A^T A is positive semi-definite (Ex 8.35)
$u^\top (A^\top A) u = (Au)^\top (Au) = |Au|^2 \ge 0$ (Definition 5.1), so $A^\top A$ is positive semi-definite.

## \formulate — Ch4: write a problem as an optimization problem (Def 4.6)
### general form min f over C (Def 4.6, Remark 4.8)
**Variables:** ${{variables}}$ = {{what they mean}}.
**Objective:** {{minimize/maximize}} $f({{variables}}) = {{objective}}$.
**Constraints:** $C = \{ ({{variables}}) \mid {{constraints}} \}$.
So the problem is $\min_{v \in C} {{f or -f}}$ (Definition 4.6; maximize $f$ = minimize $-f$, Remark 4.8).
### eliminate a variable with the constraint
From the constraint ${{constraint}}$: ${{variable}} = {{expression}}$. Substituting turns the problem into one variable: $\min_{ {{other variable}} > 0} {{one-variable objective}}$, solved with \crit (Definition 6.36).
### linear optimization problem (Sec 4.4)
**Maximize** ${{linear objective}}$ subject to
$${{linear inequalities}}$$
This is a linear optimization problem (Section 4.4).

## \line — Ch4: lines in R^d (Def 4.12)
### line through two points (Def 4.12, Ex 4.20)
The line through $p = {{p}}$ and $q = {{q}}$ is $L = \{ p + t(q - p) \mid t \in \mathbb{R} \}$ (Definition 4.12, Exercise 4.20) with $q - p = {{q - p}}$:
$$L = \{ {{p}} + t\,{{q - p}} \mid t \in \mathbb{R} \}.$$
### from parametric form to an equation (2D)
$(x, y) = {{p}} + t\,{{v}}$ gives $x = {{x(t)}}$, $y = {{y(t)}}$. Eliminating $t$: ${{equation}}$.
### do three points lie on one line?
Is ${{r}}$ on the line $\{ {{p}} + t({{q - p}}) \}$? Solve ${{p}} + t({{q - p}}) = {{r}}$ coordinate by coordinate: {{solve for t}}.
{{one t works for all coordinates → collinear / contradiction → not collinear}}.

## \convexset — Ch4: show a subset is convex (Def 4.21)
### by definition (Def 4.21)
**Proof.** Let $x, y \in C = {{C}}$ and $0 \le t \le 1$. We show $(1-t)x + ty \in C$ (Definition 4.21).
Since $x, y \in C$: {{conditions on x and y}}.
Then {{check the condition for (1-t)x + ty, using t ≥ 0 and 1 - t ≥ 0}}.
So $(1-t)x + ty \in C$, and $C$ is convex. $\blacksquare$
### sublevel set of a convex function (Lemma 4.29)
**Proof.** $C = \{ v \mid g(v) \le {{a}} \}$ with $g(v) = {{g}}$. Since $g$ is convex ({{reason}}), $C$ is convex by Lemma 4.29. $\blacksquare$
### intersection of convex sets (Ex 4.25, Lemma 4.29)
**Proof.** $C = C_1 \cap \dots \cap C_m$ with $C_i = \{ v \mid g_i(v) \le 0 \}$, $g_i = {{constraints}}$ convex. Each $C_i$ is convex (Lemma 4.29), and an intersection of convex sets is convex (Exercise 4.25). $\blacksquare$
### half-plane / hyperplane / interval (Def 4.40)
**Proof.** $C = \{ v \mid a^\top v + b \le 0 \}$ with $a = {{a}}$: for $x, y \in C$, $a^\top((1-t)x + ty) + b = (1-t)(a^\top x + b) + t(a^\top y + b) \le 0$. So $C$ is convex (Definition 4.21). $\blacksquare$
### NOT convex: a segment leaves the set (Def 4.21)
$C$ is **not convex**: $x = {{x}}, y = {{y}} \in C$, but the midpoint $\frac{1}{2}(x + y) = {{midpoint}} \notin C$ since {{reason}} (Definition 4.21).

## \convexfn — Ch4/6/8: show a function is convex
### by definition (Def 4.26)
**Proof.** Let $x, y \in {{C}}$ and $0 \le t \le 1$. We must show $f((1-t)x + ty) \le (1-t)f(x) + tf(y)$ (Definition 4.26).
$$(1-t)f(x) + tf(y) - f((1-t)x + ty) = {{simplify}} = {{something ≥ 0, e.g. t(1-t)(x-y)^2}} \ge 0.$$
So $f$ is convex. $\blacksquare$
### one variable: f'' ≥ 0 (Cor 6.55)
**Proof.** $f(x) = {{f}}$ on ${{interval}}$: $f'(x) = {{f'}}$, $f''(x) = {{f''}} \ge 0$ for all $x \in {{interval}}$. By Corollary 6.55, $f$ is convex. $\blacksquare$
### one variable: f' increasing (Thm 6.54)
**Proof.** $f'(x) = {{f'}}$ is (strictly) increasing on ${{interval}}$ because {{reason}}. By Theorem 6.54, $f$ is (strictly) convex. $\blacksquare$
### graph above tangents (Thm 6.61 / Thm 8.23)
**Proof.** For all $x, y$: $f(y) - f(x) - \nabla f(x)(y - x) = {{simplify}} \ge 0$. By Theorem 6.61 (one variable) / Theorem 8.23 (several variables), $f$ is convex. $\blacksquare$
### several variables: Hessian positive semi-definite (Thm 8.25)
**Proof.** $\nabla^2 f({{x, y}}) = {{Hessian}}$, which is positive semi-definite at every point of the open convex set ${{U}}$ ({{symmetric reduction gives diagonal entries ≥ 0, Proposition 3.43}}). By Theorem 8.25, $f$ is convex. $\blacksquare$
### building blocks: sums, max, linear (Def 4.26)
**Proof.** $f = {{f}}$ is a sum of convex functions ({{list them, with reasons}}) with non-negative coefficients; such a sum is convex directly from Definition 4.26 (add the inequalities). $\blacksquare$
### NOT convex: one bad pair of points (Def 4.26)
$f$ is **not convex**: $x = {{x}}$, $y = {{y}}$, $t = \frac{1}{2}$ give $f(\frac{x+y}{2}) = {{value}} > {{value 2}} = \frac{f(x) + f(y)}{2}$ (Definition 4.26).

## \strictconvex — Ch6/8: show a function is strictly convex (Def 6.1)
### one variable: f'' > 0 (Cor 6.55)
**Proof.** $f$ is twice differentiable on ${{interval}}$ with $f''(x) = {{f''}} > 0$ for every $x \in {{interval}}$, so $f$ is strictly convex (Corollary 6.55). $\blacksquare$
### one variable: f' strictly increasing (Thm 6.54)
**Proof.** $f'(x) = {{f'}}$ is strictly increasing on ${{interval}}$ because {{reason, e.g. its derivative is > 0 / it is a sum of strictly increasing functions}}. By Theorem 6.54, $f$ is strictly convex. $\blacksquare$
### f'' ≥ 0 and = 0 only at isolated points, like x^4 (Prop 6.43, Thm 6.54, Remark 6.56)
**Proof.** $f''(x) = {{f''}} \ge 0$ on ${{interval}}$, with $f''(x) = 0$ only at ${{isolated points}}$. So $f'' > 0$ on each of the open intervals between those points, and $f'$ is strictly increasing on each of them (Proposition 6.43); since $f'$ is continuous, it is strictly increasing on all of ${{interval}}$. By Theorem 6.54, $f$ is strictly convex. (Corollary 6.55 alone does not give this, since $f''$ is not $> 0$ everywhere; see Remark 6.56.) $\blacksquare$
### strictly convex + convex is strictly convex (Def 6.1, Def 4.26)
**Proof.** $f = g + h$ with $g = {{g}}$ strictly convex ({{reason}}) and $h = {{h}}$ convex ({{reason}}). For $u \neq v$ and $0 < t < 1$, adding the strict inequality (6.1) for $g$ and the inequality of Definition 4.26 for $h$ gives $f((1-t)u + tv) < (1-t)f(u) + tf(v)$, so $f$ is strictly convex (Definition 6.1). $\blacksquare$
### by definition (Def 6.1)
**Proof.** For $u \neq v$ and $0 < t < 1$: $(1-t)f(u) + tf(v) - f((1-t)u + tv) = {{simplify, e.g. t(1-t)(u-v)^2}} > 0$, so $f$ is strictly convex (Definition 6.1). $\blacksquare$
### several variables: Hessian positive definite (Thm 8.25)
**Proof.** $f$ has continuous second order partial derivatives on the open convex set ${{U}}$, and $\nabla^2 f = {{Hessian}}$ is positive definite at every point of ${{U}}$ ({{reason, e.g. symmetric reduction gives positive diagonal entries, Proposition 8.11}}), so $f$ is strictly convex on ${{U}}$ by Theorem 8.25. $\blacksquare$
### NOT convex: the Hessian / f'' is not positive semi-definite somewhere (Thm 8.25, Cor 6.55)
At ${{point}}$: ${{f'' or the Hessian}} = {{value}}$, which is {{negative / not positive semi-definite (a negative entry after symmetric reduction, Proposition 3.43)}}. Since the condition in Corollary 6.55 / Theorem 8.25 is an "if and only if", $f$ is **not convex** on ${{U}}$, so not strictly convex either.
### a strictly convex function has at most one minimum (Thm 6.13)
$f$ is strictly convex ({{reason}}), so by Theorem 6.13 a global minimum is unique; ${{v0}}$ with $\nabla f({{v0}}) = 0$ is a local, hence the (unique) global minimum.
### convex but NOT strictly convex (Def 6.1, Remark 6.56)
$f$ is convex but **not strictly convex**: on the segment from ${{u}}$ to ${{v}}$, $f((1-t)u + tv) = (1-t)f(u) + tf(v)$ (it is linear there), so the strict inequality in Definition 6.1 fails. Note $f'' > 0$ is sufficient, not necessary (Remark 6.56).

## \fm — Ch4: Fourier-Motzkin elimination (Sec 4.5)
### eliminate one variable (Sec 4.5)
**Eliminate** ${{x}}$ from the system (Section 4.5). Sort the inequalities:
- lower bounds: ${{x}} \ge {{lower bounds}}$
- upper bounds: ${{x}} \le {{upper bounds}}$
- without ${{x}}$: {{others}}

Pairing every lower with every upper bound gives the system in the remaining variables:
$${{new system}}$$
The original system has a solution iff this one has.
### show a system has no solution (Sec 4.5)
Eliminating ${{x}}$ and then ${{y}}$ (Section 4.5) leaves ${{final inequalities}}$, i.e. $0 \le {{negative number}}$ — impossible. So the original system has **no solutions**.
### linear optimization: add z = objective (Sec 4.4-4.5)
**Maximize** ${{objective}}$ subject to {{constraints}}. Add $z = {{objective}}$ and eliminate the original variables (Section 4.5):
{{elimination}}
What is left is ${{bounds on z}}$, so the optimal value is ${{optimum}}$, attained at ${{optimal point}}$ (back-substitute).
### bounded set via projections (Ex 5.38)
Eliminating ${{y}}$ shows the $x$-values of $S$ lie in $[{{a}}, {{b}}]$; eliminating ${{x}}$ shows the $y$-values lie in $[{{c}}, {{d}}]$. So $S \subseteq B(0, R)$ for $R = {{R}}$, i.e. $S$ is bounded (Definition 5.33).

## \orthogonal — Ch5: dot products, angles, orthogonal vectors
### u − λv orthogonal to v (Ex 5.6-5.7, Prop 5.15)
We want $\lambda$ with $(u - \lambda v) \perp v$: $(u - \lambda v) \cdot v = 0 \iff \lambda = \frac{u \cdot v}{v \cdot v} = {{lambda}}$.
With $u = {{u}}$, $v = {{v}}$: $\lambda v = {{lambda v}}$, and by Pythagoras (Proposition 5.15) this minimizes $|u - \lambda v|$; the minimal distance is ${{distance}}$.
### angle / cosine similarity (Def 5.1, Thm 5.24)
$u \cdot v = {{dot}}$, $|u| = {{norm u}}$, $|v| = {{norm v}}$, so $\cos\theta = \frac{u \cdot v}{|u||v|} = {{cos}}$ (Definition 5.1), which lies in $[-1, 1]$ by Theorem 5.24.
### orthogonal vectors (Def 5.1)
$u \cdot v = {{written out}} = 0$, so $u \perp v$ (Definition 5.1), and $|u + v|^2 = |u|^2 + |v|^2$ (Proposition 5.15).
### distance from a point to a hyperplane (Def 4.40, Ex 9.7, Thm 7.39)
For $H = \{ v \mid \alpha^\top v + \beta = 0 \}$ (Definition 4.40) and $u = {{u}}$, the closest point solves $\min_{v \in H} |v - u|^2$ (Exercise 9.7). Theorem 7.39 gives the equations $-2(u - v) + \lambda\alpha = 0$ and $\alpha^\top v + \beta = 0$. The first gives $v = u - \frac{\lambda}{2}\alpha$; inserting in the second: $\lambda = {{lambda}}$, so the closest point is $v = {{point}}$ and the distance is $|v - u| = {{distance}}$.
### prove a dot-product rule from the definition (Def 5.1)
**Proof.** Writing $u = (x_1, \dots, x_d)$ etc., Definition 5.1 gives ${{LHS}} = \sum_i {{expand}} = {{RHS}}$. $\blacksquare$

## \leastsquares — Ch5: best fit by least squares (Thm 5.16)
### normal equations (Thm 5.16)
**Model:** ${{model, e.g. y = αx + β}}$. Writing the equations for the data points as $Av = b$:
$$A = {{A}},\quad b = {{b}}$$
By Theorem 5.16 the best approximate solution solves $(A^\top A)v = A^\top b$:
$$A^\top A = {{AtA}},\quad A^\top b = {{Atb}}$$
Solving gives $v = {{solution}}$, so the best fit is ${{fitted model}}$.
### first show Av = b has no exact solution
Gauss elimination on $Av = b$ (Section 2.3) gives the contradictory row $0 = {{nonzero}}$, so there is no exact solution and we look for the best approximation (Theorem 5.16).
### best quadratic / circle fit (linear in the unknown coefficients)
The model ${{model}}$ is linear in the unknowns ${{unknowns}}$, so each data point gives one row of $Av = b$:
$$A = {{A}},\quad b = {{b}}$$
and Theorem 5.16 applies as before: solving $(A^\top A)v = A^\top b$ gives $v = {{solution}}$.

## \bounded — Ch5: bounded subsets (Def 5.33)
### find a radius R (Def 5.33)
**Proof.** For $v = {{v}} \in S$ we have {{estimate each coordinate}}, so $|v| \le {{estimate}} < {{R}}$.
So $S \subseteq B(0, {{R}})$, and $S$ is bounded (Definition 5.33, Remark 5.35). $\blacksquare$
### NOT bounded: elements of arbitrarily large norm (Def 5.33, Remark 5.34)
**Proof.** Suppose $S \subseteq B(0, R)$ for some $R \in \mathbb{R}$ (Definition 5.33). Take $v = {{element depending on R}} \in S$. Then $|v| = {{norm}} \ge R$ — a contradiction. So $S$ is not bounded. $\blacksquare$
### subset of a bounded set
**Proof.** $S \subseteq {{T}}$ and ${{T}} \subseteq B(0, R)$ for $R = {{R}}$, so $S \subseteq B(0, R)$ and $S$ is bounded (Definition 5.33). $\blacksquare$

## \openset — Ch5: show a subset is open (Def 5.39)
### ε-ball around every point (Def 5.39)
**Proof.** Let $v \in U = {{U}}$, so {{condition on v}}. Put $\varepsilon = {{epsilon in terms of v}} > 0$.
If $u \in B(v, \varepsilon)$, then {{estimate, using the triangle inequality (Corollary 5.27)}}, so $u \in U$.
Hence $B(v, \varepsilon) \subseteq U$, and $U$ is open (Definition 5.39). $\blacksquare$
### preimage of an open set under a continuous function (Prop 5.68)
**Proof.** $U = \{ v \mid {{g(v) > c}} \} = g^{-1}({{open set, e.g. (c, ∞)}})$ with $g(v) = {{g}}$ continuous (Propositions 5.74-5.75). Since ${{open set, e.g. (c, ∞)}}$ is open (Proposition 5.51), $U$ is open by Proposition 5.68. $\blacksquare$
### finite union / intersection of open sets (Prop 5.45)
**Proof.** $U = {{U1}} \cap {{U2}}$ (or $\cup$), and each piece is open ({{reasons}}). By Proposition 5.45, $U$ is open. $\blacksquare$
### complement of a closed set (Def 5.47)
**Proof.** $\mathbb{R}^d \setminus U = {{complement}}$ is closed ({{reason}}), so $U$ is open (Definition 5.47). $\blacksquare$
### NOT open: a point with no ball inside (Def 5.39)
$U$ is **not open**: for $v = {{v}} \in U$, every ball $B(v, \varepsilon)$ contains ${{point depending on ε}} \notin U$, so no $\varepsilon > 0$ has $B(v, \varepsilon) \subseteq U$ (Definition 5.39).

## \closedset — Ch5: show a subset is closed (Def 5.47)
### preimage of a closed set under a continuous function (Prop 5.69)
**Proof.** $F = \{ v \mid {{g(v) ≤ c}} \} = g^{-1}({{closed set, e.g. (-∞, c]}})$ with $g(v) = {{g}}$ continuous (Propositions 5.74-5.75). Since ${{closed set, e.g. (-∞, c]}}$ is closed (Proposition 5.52), $F$ is closed by Proposition 5.69. $\blacksquare$
### complement is open (Def 5.47)
**Proof.** $\mathbb{R}^d \setminus F = {{complement}}$ is open by {{\openset argument}}, so $F$ is closed (Definition 5.47). $\blacksquare$
### finite union / intersection of closed sets (Prop 5.49)
**Proof.** $F = {{F1}} \cap {{F2}}$ (or $\cup$), each closed ({{reasons}}); by Proposition 5.49, $F$ is closed. $\blacksquare$
### NOT closed: complement is not open (Def 5.47)
$F$ is **not closed**: the complement is not open, since ${{v}} \notin F$ but every ball around it meets $F$ (in ${{point depending on ε}}$). Remember: not open does not mean closed (Remark 5.48).

## \compact — Ch5: show a subset is compact (Def 5.53)
### closed + bounded (Def 5.53)
$C = {{C}}$ is **closed** because it is $g^{-1}({{closed set}})$ for continuous $g = {{g}}$ (Proposition 5.69), and **bounded** because $|v| \le {{R}}$ on $C$ (Definition 5.33). So $C$ is compact (Definition 5.53).
### NOT compact: unbounded or not closed (Def 5.53)
$C$ is **not compact** (Definition 5.53): it is {{not bounded (\bounded) / not closed (\closedset)}}.

## \boundary — Ch5: boundary and interior (Def 5.56, 5.58)
### compute both (Def 5.56, Def 5.58)
**Interior** (Definition 5.58): $S^\circ = {{interior}}$, since around such $v$ a small ball stays inside $S$.
**Boundary** (Definition 5.56): $\partial S = {{boundary}}$, since every ball around such $v$ meets both $S$ and $\mathbb{R}^d \setminus S$.
### S is open iff S equals its interior (Ex 5.59)
$S^\circ$ is open, and $S$ is open iff $S = S^\circ$ (Exercise 5.59): {{argument via Definition 5.39 and Definition 5.58}}.

## \limit — Ch5: limits (Def 5.62)
### cancel the factor that vanishes (Def 5.62)
$$\lim_{x \to {{a}}} {{expression}} = \lim_{x \to {{a}}} {{simplified}} = {{value}}$$
The simplification is valid for $x \neq {{a}}$, which is all the limit looks at (Definition 5.62).
### ε–δ proof (Def 5.62, Remark 5.61)
**Proof.** Let $\varepsilon > 0$. Choose $\delta = {{delta}}$. If $0 < |x - {{a}}| < \delta$, then
$$|{{f(x)}} - {{L}}| = {{rewrite}} \le {{bound}} < \varepsilon.$$
Hence $\lim_{x \to {{a}}} {{f(x)}} = {{L}}$ (Definition 5.62). $\blacksquare$
### limit does NOT exist: different values on the two sides of a (Def 5.62)
For $x$ close to ${{a}}$ with $x > {{a}}$, $f(x)$ is close to ${{value for x > a}}$; with $x < {{a}}$, $f(x)$ is close to ${{value for x < a}}$. If the limit were $L$, taking $\varepsilon = {{epsilon}}$ in Definition 5.62 forces $L$ close to both values — impossible. So the limit does not exist.
### continuity: plug in (Def 5.65)
${{f}}$ is continuous at ${{a}}$ ({{reason}}), so $\lim_{x \to {{a}}} {{f}} = f({{a}}) = {{value}}$ (Definition 5.65).

## \continuous — Ch5: show a function is continuous (Def 5.65)
### built from continuous pieces (Lemma 5.72, Prop 5.74-5.75)
$f({{variables}}) = {{f}}$ is built from the projections (continuous, Lemma 5.72) and constants using $+$, $\cdot$ and division by a non-zero function (Proposition 5.75) and composition (Proposition 5.74). So $f$ is continuous.
### polynomials and known functions (Remark 5.77, Remark 5.79)
$f$ is a polynomial (continuous by Remark 5.77){{ composed with sin / e^x, continuous by Remark 5.79 and Proposition 5.74}}, hence continuous.
### ε–δ from the definition (Def 5.62, Def 5.65)
**Proof.** Let $v$ and $\varepsilon > 0$ be given. Choose $\delta = {{delta}}$. If $|u - v| < \delta$, then $|f(u) - f(v)| = {{rewrite}} \le {{bound}} < \varepsilon$. So $f$ is continuous at $v$ (Definition 5.65). $\blacksquare$
### differentiable implies continuous (Prop 6.22)
$f$ is differentiable ({{reason}}), hence continuous (Proposition 6.22).
### convex on an open convex set (Thm 6.7)
$f$ is convex ({{reason}}) on the open convex set ${{U}}$, hence continuous (Theorem 6.7).
### NOT continuous at a point (Def 5.65)
$f$ is **not continuous** at ${{a}}$: $\lim_{x \to {{a}}} f(x)$ {{does not exist / equals ... ≠ f(a)}} (Definitions 5.62 and 5.65).

## \ivt — Ch5: existence of a root / value (Thm 5.81)
### sign change on [a, b] (Thm 5.81)
$f(x) = {{f}}$ is continuous on $[{{a}}, {{b}}]$ ({{reason}}), with $f({{a}}) = {{f(a)}} < 0$ and $f({{b}}) = {{f(b)}} > 0$.
By Theorem 5.81 there is $x_0 \in ({{a}}, {{b}})$ with $f(x_0) = 0$.
### hitting a value c: apply it to f - c (Thm 5.81)
$g(x) = f(x) - {{c}}$ is continuous with $g({{a}}) < 0 < g({{b}})$, so by Theorem 5.81 some $x_0$ has $f(x_0) = {{c}}$.
### odd-degree polynomial (Prop 5.83)
$f$ has odd degree, so it has a root by Proposition 5.83.
### bisection to approximate the root (Thm 5.81)
| $[a, b]$ | midpoint $m$ | $f(m)$ |
|---|---|---|
| $[{{a}}, {{b}}]$ | {{_}} | {{_}} |
| {{_}} | {{_}} | {{_}} |

Each step keeps a sign change (Theorem 5.81), so the root is $\approx {{root}}$.

## \evt — Ch5: a max/min exists (Thm 5.84)
### compact + continuous (Thm 5.84)
$C = {{C}}$ is compact ({{closed and bounded}}, Definition 5.53) and $f = {{f}}$ is continuous on $C$ ({{reason}}).
By Theorem 5.84, $f$ attains a minimum and a maximum on $C$.
### Theorem 5.84 fails without compactness (Ex 5.85)
Without {{boundedness / closedness}} it can fail: $f(x) = {{f}}$ on ${{set}}$ is continuous but has no {{max / min}}, since {{reason}}.

## \derivative — Ch6: derivatives
### from the definition (Def 6.17)
**Claim:** $f'({{x0}}) = {{c}}$ for $f(x) = {{f}}$. By Definition 6.17 we need $f({{x0}} + h) = f({{x0}}) + {{c}}\,h + \varepsilon(h)\,h$ with $\varepsilon(h) \to 0$:
$$f({{x0}} + h) - f({{x0}}) = {{expand}} = {{c}}\,h + ({{epsilon(h)}})\,h$$
and $\varepsilon(h) = {{epsilon(h)}} \to 0$ for $h \to 0$. $\blacksquare$
### with the rules (product, quotient, chain)
$$f'(x) = {{apply the rule}} = {{result}}$$
using the {{product rule (Section 6.3.3) / chain rule (Section 6.3.4)}}.
### NOT differentiable at a point (Def 6.17)
If $f$ were differentiable at ${{x0}}$ with $f'({{x0}}) = c$, then $\frac{f({{x0}}+h) - f({{x0}})}{h} \to c$ (Definition 6.17). But this quotient is ${{right value}}$ for $h > 0$ and ${{left value}}$ for $h < 0$, so no such $c$ exists.
### higher derivatives: find the pattern
$f' = {{f'}}$, $f'' = {{f''}}$, $f''' = {{f'''}}$, $f^{(4)} = {{f''''}}$, so the pattern repeats with period ${{period}}$ and $f^{({{n}})} = {{answer}}$.

## \newton — Ch6/8: Newton-Raphson method (Sec 6.3.5, Sec 7.4)
### one variable: iterate x - f/f'
**Newton-Raphson** for $f(x) = {{f}}$, $f'(x) = {{f'}}$: $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)} = {{simplified iteration}}$.

| $n$ | $x_n$ | $f(x_n)$ |
|---|---|---|
| 0 | {{x0}} | {{_}} |
| 1 | {{_}} | {{_}} |
| 2 | {{_}} | {{_}} |
| 3 | {{_}} | {{_}} |

So the root is $x \approx {{root}}$.
### several variables: v - Hessian^-1 grad (Sec 8.3, (8.6))
To find a critical point of $F$, Newton's method (8.6) (Section 8.3): $v_{n+1} = v_n - \nabla^2 F(v_n)^{-1}\,\nabla F(v_n)$, with the Hessian from Definition 8.2, $\nabla F = {{gradient}}$, $\nabla^2 F = {{Hessian}}$.
From $v_0 = {{v0}}$: $v_1 = {{v1}}$, $v_2 = {{v2}}$, ... $\to {{limit}}$.
### it fails: cycle or f' = 0
Starting at $x_0 = {{x0}}$: $x_1 = {{x1}}$, $x_2 = {{x0}}$, so the iterates cycle and never converge. (Or: $f'(x_n) = 0$, so the step is undefined.)

## \crit — Ch6: critical points and extrema, one variable
### find critical points + second derivative (Def 6.36, Lemma 6.37)
$f(x) = {{f}}$, $f'(x) = {{f'}}$. Critical points (Definition 6.36): $f'(x) = 0 \iff x = {{critical points}}$. Local extrema can only be here (Lemma 6.37).
$f''(x) = {{f''}}$:
- $x = {{x1}}$: $f''({{x1}}) = {{value}}$ $\Rightarrow$ {{local min (> 0) / local max (< 0)}}
### higher derivative test when f'' = 0 (Thm 6.50)
At the critical point ${{x0}}$: $f''({{x0}}) = \dots = f^{(n-1)}({{x0}}) = 0$ and $f^{(n)}({{x0}}) = {{value}} \neq 0$ with $n = {{n}}$. By Theorem 6.50: {{n even → local minimum if f^(n)(x0) > 0, local maximum if < 0; n odd → not a local extremum}}.
### sign of f' around the point (Prop 6.43)
$f' < 0$ on $({{a}}, {{x0}})$ and $f' > 0$ on $({{x0}}, {{b}})$, so $f$ decreases then increases (Proposition 6.43) and ${{x0}}$ is a local minimum.
### convex function: critical point is the global min (Thm 6.13)
$f$ is convex ({{reason}}), and $f'({{x0}}) = 0$. For a differentiable convex function the critical point is a global minimum (Theorem 6.61 with $f'(x_0) = 0$, Theorem 6.13).
### global max/min on [a, b]: compare the critical points with a and b (Thm 5.84)
$f$ is continuous on the compact $[{{a}}, {{b}}]$, so max and min exist (Theorem 5.84) and lie at critical points or at $a$ or $b$ (Lemma 6.37):

| $x$ | $f(x)$ |
|---|---|
| ${{a}}$ | {{_}} |
| {{critical point}} | {{_}} |
| ${{b}}$ | {{_}} |

**Max** ${{max}}$, **min** ${{min}}$.
### a critical point that is NOT an extremum (Ex 6.38)
$f(x) = {{f}}$ has $f'({{x0}}) = 0$ but takes values both above and below $f({{x0}})$ near ${{x0}}$, so the converse of Lemma 6.37 fails.

## \taylor — Ch6: Taylor polynomials (Sec 6.4)
### compute the Taylor polynomial
Taylor polynomial of order ${{n}}$ of $f(x) = {{f}}$ about the point $a = {{x0}}$ (Section 6.4): $f(a) = {{_}}$, $f'(a) = {{_}}$, $f''(a) = {{_}}$, ...
$$f(a) + f'(a)(x - a) + \frac{f''(a)}{2}(x - a)^2 + \dots + \frac{f^{(n)}(a)}{n!}(x - a)^n = {{polynomial}}$$
### pattern in the derivatives (e.g. sin, cos, e^x)
The derivatives at ${{x0}}$ repeat as ${{pattern}}$, so only the {{even / odd}} terms survive: $P(x) = {{polynomial}}$.

## \increasing — Ch6: increasing / decreasing (Def 6.41)
### sign of f' (Prop 6.43)
$f'(x) = {{f'}}$ {{≥ 0 / > 0}} for all $x \in {{interval}}$, so $f$ is {{increasing / strictly increasing}} on ${{interval}}$ (Proposition 6.43).
### from the definition (Def 6.41)
**Proof.** Let $x < y$. Then $f(y) - f(x) = {{factor, e.g. (y - x)(y^2 + xy + x^2)}} > 0$, so $f$ is strictly increasing (Definition 6.41). $\blacksquare$
### mean value theorem (Thm 6.40)
**Proof.** For $x < y$, Theorem 6.40 gives $\xi \in (x, y)$ with $f(y) - f(x) = f'(\xi)(y - x) > 0$, since $f' > 0$. $\blacksquare$

## \mvt — Ch6: mean value theorem (Thm 6.40)
### find the point ξ (Thm 6.40)
$f$ is continuous on $[{{a}}, {{b}}]$ and differentiable on $({{a}}, {{b}})$, so by Theorem 6.40 there is $\xi \in ({{a}}, {{b}})$ with
$$f'(\xi) = \frac{f({{b}}) - f({{a}})}{ {{b}} - {{a}} } = {{value}}.$$
Solving $f'(\xi) = {{value}}$ gives $\xi = {{xi}}$.
### bound a difference (Thm 6.40)
By Theorem 6.40, $|f(y) - f(x)| = |f'(\xi)|\,|y - x| \le {{bound on |f'|}} \cdot |y - x|$.
### f' = 0 everywhere means constant (Thm 6.40)
For any $x < y$, Theorem 6.40 gives $f(y) - f(x) = f'(\xi)(y - x) = 0$, so $f$ is constant.

## \gradient — Ch7: partial derivatives and the gradient (Def 7.4)
### compute partials and the gradient (Def 7.4, Remark 7.5)
$f({{x, y}}) = {{f}}$ (treat the other variables as constants, Remark 7.5):
$$\frac{\partial f}{\partial x} = {{f_x}}, \quad \frac{\partial f}{\partial y} = {{f_y}}$$
so $\nabla f({{x, y}}) = ({{f_x}}, {{f_y}})$ (Definition 7.4) and $\nabla f({{point}}) = {{value}}$.
### differentiable: continuous partials (Thm 7.11)
The partial derivatives ${{f_x}}$ and ${{f_y}}$ exist and are continuous on ${{U}}$ (Proposition 5.75), so $f$ is differentiable by Theorem 7.11.
### symmetry of second partials (Thm 7.11)
$$\frac{\partial^2 f}{\partial x\,\partial y} = {{f_xy}}, \quad \frac{\partial^2 f}{\partial y\,\partial x} = {{f_yx}}$$
They agree, as Theorem 7.11 predicts.
### descent direction (Lemma 7.17)
$\nabla f(v_0) = {{gradient}}$ and $u = {{u}}$ give $\nabla f(v_0)\,u = {{value}} < 0$, so $f(v_0 + tu) < f(v_0)$ for small $t > 0$ (Lemma 7.17).

## \matrixderivative — Ch7: matrix derivative of a vector function (Prop 7.9)
### matrix of partial derivatives (Prop 7.9)
$f({{x, y}}) = ({{f1}}, {{f2}})$. By Proposition 7.9 the derivative is the matrix of partial derivatives:
$$f'({{x, y}}) = \begin{pmatrix} \partial f_1/\partial x & \partial f_1/\partial y \\ \partial f_2/\partial x & \partial f_2/\partial y \end{pmatrix} = {{matrix}}$$
### linear map f(v) = Av: derivative is A (Def 7.3)
$f(v) = Av$ satisfies $f(v_0 + h) = f(v_0) + Ah$ exactly, so $f'(v_0) = A = {{A}}$ (Definition 7.3).

## \chainrule — Ch7: multivariable chain rule (Thm 7.23)
### matrix product of derivatives (Thm 7.23)
$h = f \circ g$ with $g({{t}}) = {{g}}$ and $f({{x, y, z}}) = {{f}}$. By Theorem 7.23, $h'({{t}}) = f'(g({{t}}))\,g'({{t}})$:
$$h'({{t}}) = {{gradient of f at g(t)}} \cdot {{g'(t)}} = {{result}}$$
### check by substituting first
Substituting directly: $h({{t}}) = {{h}}$, so $h'({{t}}) = {{result}}$, which agrees with Theorem 7.23.
### computational graph / backpropagation (Sec 7.6)
Forward pass: {{intermediate values}}. Backward pass, multiplying local derivatives (Theorem 7.23): {{derivatives node by node}}. So $\nabla f = {{gradient}}$.

## \critxy — Ch7/8: critical points and classification, several variables
### gradient = 0, then Hessian test (Def 7.15, Thm 8.12)
$f(x, y) = {{f}}$. Critical points (Definition 7.15): $\nabla f = 0$:
$$\frac{\partial f}{\partial x} = {{f_x}} = 0, \quad \frac{\partial f}{\partial y} = {{f_y}} = 0$$
Solving gives ${{critical points}}$. Hessian (Definition 8.2):
$$\nabla^2 f(x, y) = {{Hessian}}$$
- At ${{point}}$: $\nabla^2 f = {{Hessian at the point}}$ is {{positive definite / negative definite / indefinite}} $\Rightarrow$ {{local min / local max / saddle point}} (Theorem 8.12).
### saddle point: two directions (Def 8.8)
At ${{v0}}$: along $u = {{u}}$, $t \mapsto f(v_0 + tu) = {{one-variable function}}$ has a local min at $t = 0$; along $v = {{v}}$, $t \mapsto f(v_0 + tv) = {{one-variable function}}$ has a local max. So ${{v0}}$ is a saddle point (Definition 8.8).
### Hessian test inconclusive: look at f directly (Thm 8.12)
$\nabla^2 f({{v0}})$ is only semi-definite, so Theorem 8.12 says nothing. Directly: {{f ≥ f(v0) near v0 / f takes both signs}}, so ${{v0}}$ is {{a local min / not an extremum}}.
### convex function: critical point is the global min (Thm 6.13, Thm 8.23)
$f$ is convex ({{\convexfn}}), so by Theorem 8.23 $f(v) \ge f(v_0) + \nabla f(v_0)(v - v_0) = f(v_0)$ at the critical point $v_0 = {{v0}}$: it is a global minimum (Theorem 6.13).

## \hessian — Ch8: Hessian matrix (Def 8.2)
### compute the Hessian (Def 8.2)
$$\nabla^2 {{function name}}({{x, y}}) = {{Hessian entries}} = {{Hessian}}$$
(symmetric by Theorem 7.11).
### classify one critical point (Thm 8.12, Prop 8.11)
At the critical point $v_0 = {{v0}}$: $\nabla^2 {{function name}}(v_0) = {{Hessian at v0}}$. Symmetric reduction gives $D = {{diagonal}}$, so it is {{positive definite / negative definite / indefinite}} (Proposition 8.11).
By Theorem 8.12, $v_0$ is a {{local minimum / local maximum / saddle point}}.
### depends on a parameter a (Prop 8.11)
$\nabla^2 f = {{Hessian with a}}$. Symmetric reduction gives $D = {{diagonal with a}}$, which is positive definite iff ${{condition on a}}$ (Proposition 8.11).

## \lagrange — Ch7: Lagrange multipliers (Thm 7.39)
### one constraint (Thm 7.39)
**Optimize** $f({{x, y}}) = {{f}}$ subject to $g({{x, y}}) = {{g}} = 0$. Introduce the Lagrangian $L(x, y, \lambda) = f(x, y) + \lambda g(x, y)$ (Section 7.10). By Theorem 7.39 a local maximum/minimum gives a critical point of $L$, i.e. $\nabla L = 0$:
$${{f_x}} + \lambda\,({{g_x}}) = 0, \quad {{f_y}} + \lambda\,({{g_y}}) = 0, \quad {{g}} = 0$$
{{solve the system}}
Candidates: ${{candidate points}}$ with $f$-values ${{values}}$.
The constraint set is compact ({{reason}}), so by Theorem 5.84 the max is ${{max}}$ and the min is ${{min}}$.
### regard λ as a constant: Gaussian elimination in x, y (Ex 7.42)
Regarding $\lambda$ as a constant, the equations ${{f_x}} + \lambda\,({{g_x}}) = 0$ and ${{f_y}} + \lambda\,({{g_y}}) = 0$ form a system of linear equations in $x$ and $y$. Gaussian elimination (Section 2.3) gives {{equation in λ}}, assuming {{y \neq 0}}; the case {{y = 0}} is handled separately: {{_}}. Substituting in $g = 0$: {{solve}}.
### word problem (box, fence, ...)
**Variables:** ${{variables}}$. **Objective:** ${{f}}$. **Constraint:** ${{g}} = 0$.
Theorem 7.39: the critical points of $L = f + \lambda g$ give {{equations}}; solving: ${{solution}}$.
**Answer:** {{answer in words}}.

## \compactopt — Ch7: max/min on a compact set: interior + boundary (Prop 7.46)
### interior critical points + each edge + corners (Prop 7.46)
$C = {{C}}$ is compact and $f = {{f}}$ is continuous, so max and min exist (Theorem 5.84).
**Interior:** optima there are critical points (Proposition 7.46): $\nabla f = 0 \iff {{critical points in the interior}}$.
**Boundary:**
- {{edge 1}}: {{one-variable problem}} → candidates {{_}}
- {{edge 2}}: {{one-variable problem}} → candidates {{_}}
- corners: {{_}}

| point | $f$ |
|---|---|
| {{_}} | {{_}} |

**Max** ${{max}}$ at ${{argmax}}$, **min** ${{min}}$ at ${{argmin}}$.
### curved boundary: Lagrange on the boundary (Thm 7.39, Prop 7.46)
**Interior:** $\nabla f = 0 \iff {{interior critical points}}$ (Proposition 7.46).
**Boundary** ${{g}} = 0$: Theorem 7.39 gives a critical point of $L = f + \lambda g$: {{solve}} → candidates ${{boundary candidates}}$.
Comparing all values: **max** ${{max}}$, **min** ${{min}}$.
### linear objective: optimum at a corner (Sec 4.4)
$f$ is linear, so $\nabla f \neq 0$ and there are no interior optima (Proposition 7.46); on each edge $f$ is linear too, so the optima are at corners:

| corner | $f$ |
|---|---|
| {{_}} | {{_}} |

**Max** ${{max}}$, **min** ${{min}}$.

## \convexopt — Ch9: convex optimization problems
### show it is a convex optimization problem (Lemma 4.29, Ex 4.25)
The objective $f = {{f}}$ is convex ({{reason}}) and the feasible set $C = \{ v \mid g_i(v) \le 0 \}$ is convex: each $g_i = {{constraints}}$ is convex, sublevel sets of convex functions are convex (Lemma 4.29), and intersections of convex sets are convex (Exercise 4.25).
So this is a convex optimization problem; a local minimum is global (Theorem 6.13).
### first-order condition at the optimum (Prop 9.28)
$v_0 = {{v0}}$ is optimal iff $\nabla f(v_0)(v - v_0) \ge 0$ for all $v \in C$ (Proposition 9.28): here $\nabla f(v_0) = {{gradient}}$ and {{check}}.
### guess the solution, then verify (Prop 9.28)
Guess: $v_0 = {{guess}}$ ({{geometric reason}}). Check with Proposition 9.28: $\nabla f(v_0)(v - v_0) = {{expression}} \ge 0$ for all $v \in C$ because {{reason}}. So $v_0$ is optimal.
### barrier method (Thm 9.21)
Replace the constraints by the logarithmic barrier $B(v) = -\log(-g_1(v)) - \dots - \log(-g_m(v))$ and minimize $f_\varepsilon(v) = f(v) + \varepsilon B(v)$ (9.23) (convex, Exercise 9.20). By Theorem 9.21 its minimizer $v_\varepsilon$ satisfies $0 \le f(v_\varepsilon) - f^* \le \varepsilon m$ with $m = {{m}}$ constraints, so $v_\varepsilon \to$ the optimum as $\varepsilon \to 0$.

## \kkt — Ch9: solve with the KKT conditions (Thm 9.37)
### KKT with case analysis on active constraints (Def 9.36, Thm 9.37)
**Problem:** $\min f(v) = {{f}}$ subject to $g_1(v) = {{g1}} \le 0$, ..., all convex.
**Strictly feasible** (Definition 9.36): $z_0 = {{z0}}$ has $g_i(z_0) < 0$.
**KKT conditions** (Theorem 9.37): $\lambda_i \ge 0$, $g_i(v) \le 0$, $\lambda_i g_i(v) = 0$ and
$$\nabla f(v) + \lambda_1 \nabla g_1(v) + \dots = 0: \quad {{gradient equations}}$$
**Cases** (which constraints are active):
- $\lambda_1 = 0$: {{_}}
- $g_1(v) = 0$: {{_}}

The case that satisfies everything is $v = {{v}}$, $\lambda = {{lambda}}$. Since the problem is convex and strictly feasible, $v$ is optimal with value $f(v) = {{value}}$ (Theorem 9.37).
### just state the KKT conditions (Thm 9.37)
**KKT conditions** for $\min {{f}}$ s.t. ${{constraints}}$ (Theorem 9.37):
$$\nabla f(v) + \sum_i \lambda_i \nabla g_i(v) = 0, \quad \lambda_i \ge 0, \quad g_i(v) \le 0, \quad \lambda_i g_i(v) = 0$$
Written out: {{equations}}.
### verify a given point satisfies KKT (Thm 9.37)
At $v = {{v}}$ the active constraints are ${{active}}$. With $\lambda = {{lambda}} \ge 0$: $\nabla f(v) + \sum \lambda_i \nabla g_i(v) = {{computation}} = 0$ and $\lambda_i g_i(v) = 0$. So $v$ satisfies the KKT conditions and is optimal (Theorem 9.37 (ii), the problem being convex).
### all λ = 0: unconstrained minimum is feasible (Ex 9.43)
If all $\lambda_i = 0$, the KKT conditions say $\nabla f(v) = 0$: $v = {{critical point}}$. It is feasible ($g_i(v) \le 0$: {{check}}), so it is the optimum.
### not strictly feasible: KKT may fail (Ex 9.40)
No $z_0$ has all $g_i(z_0) < 0$ ({{reason}}), so the problem is not strictly feasible (Definition 9.36) and Theorem 9.37 (i) does not apply: {{the optimum ... violates KKT}}.

## \svm — Ch9: separating hyperplanes, perceptron and SVM
### optimal separating hyperplane (Thm 9.8)
Data: ${{labeled points}}$. We want $\alpha, \beta$ with $y_i(\alpha^\top v_i + \beta) \ge 1$ for all $i$, minimizing $|\alpha|^2$ (Theorem 9.8):
$$\min \ \alpha_1^2 + \alpha_2^2 \quad \text{s.t.} \quad {{constraints}}$$
{{solve (KKT, Theorem 9.37)}}
Optimal hyperplane: $H = \{ v \mid {{alpha}}^\top v + {{beta}} = 0 \}$, margin $\frac{1}{|\alpha|} = {{margin}}$.
### perceptron algorithm by hand (Sec 5.3.2, Prop 5.14)
With $\hat v_i = (\ell_i x_i, \ell_i y_i, \ell_i)$ (5.7), start with $\alpha = 0$ and add $\hat v_i$ to $\alpha$ whenever $\alpha \cdot \hat v_i \le 0$:

| step | $\hat v_i$ with $\alpha \cdot \hat v_i \le 0$ | update $\alpha \leftarrow \alpha + \hat v_i$ |
|---|---|---|
| 1 | {{_}} | {{_}} |
| 2 | {{_}} | {{_}} |

If the points are separable it stops after finitely many updates (Proposition 5.14); final $\alpha = {{alpha}}$.
### NOT separable (Ex 5.9)
**Proof.** Suppose $\alpha^\top v + \beta$ separates them. Then {{inequalities for each point}}; adding {{suitable ones}} gives $0 < 0$ — a contradiction. So no separating line exists. $\blacksquare$

## \perceptron — Ch1: perceptrons and neural networks (Remark 1.120)
### choose weights for a logic gate
$p(x, y) = \text{step}(w_1 x + w_2 y + b)$ with $w_1 = {{w1}}$, $w_2 = {{w2}}$, $b = {{b}}$:

| $(x, y)$ | $w_1 x + w_2 y + b$ | $p$ |
|---|---|---|
| $(0,0)$ | {{_}} | {{_}} |
| $(0,1)$ | {{_}} | {{_}} |
| $(1,0)$ | {{_}} | {{_}} |
| $(1,1)$ | {{_}} | {{_}} |

This computes {{AND / OR / ...}}.
### impossible (XOR): contradiction from the inequalities
**Proof.** Suppose $w_1, w_2, b$ work. Then $b \le 0$, $w_1 + b > 0$, $w_2 + b > 0$, $w_1 + w_2 + b \le 0$. Adding the middle two: $w_1 + w_2 + 2b > 0$, so $w_1 + w_2 + b > -b \ge 0$ — a contradiction. $\blacksquare$

## \explain — Ch1-9: explain / argue why / give a precise reason
### answer + reason from a definition
**Answer.** {{answer}}

**Why.** By {{Definition X.Y}}, {{what the definition says here}}. In this case {{apply it}}, so {{answer}}.
### answer + reason from a theorem
**Answer.** {{answer}}

**Why.** {{Theorem X.Y}} applies because {{its hypotheses hold}}; it gives {{conclusion}}, which is {{answer}}.
### explain a computation step by step
| step | what happens | rule used |
|---|---|---|
| 1 | {{_}} | {{_}} |
| 2 | {{_}} | {{_}} |
| 3 | {{_}} | {{_}} |

So {{result}}.
### explain what the code / output shows
**What I ran.** {{code or cell}}

**What came out.** {{output}}

**Why.** {{explanation in terms of the math}}
### yes / no question
**{{Yes / No}}.** {{one-sentence reason}}

{{example or proof of the reason}}

## \chatbot — Ch1: work with a chatbot prompt
### prompt log
**Prompt.** {{prompt}}

**Chatbot answer (summary).** {{summary}}

**What I checked myself.** {{check}}

**What I learned / what was wrong.** {{takeaway}}
### write my own prompt
**My prompt.** {{prompt}}

**Why it is phrased like this.** {{reason}}

**Result.** {{summary}}
