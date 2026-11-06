# IMO26 problem templates

One template per kind of exercise in Lauritzen, *Introduction to Mathematics and Optimization* (imo26).
`{{_}}` is an anonymous blank: it is never copied into other blanks.

## \truthtable — Ch1: truth table for a proposition (Def 1.10)
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

So ${{proposition}}$ is {{true exactly when ...}}.

## \equivalent — Ch1: two propositions are equivalent
**Claim.** ${{P}} \equiv {{Q}}$.

**Proof.** We compare truth tables (Definition 1.10): the columns for ${{P}}$ and ${{Q}}$ agree in every row:
{{table or row-by-row check}}
Hence ${{P}} \equiv {{Q}}$. $\blacksquare$

## \setequal — Ch1: prove A = B by double inclusion (Def 1.27)
**Proof.** By Definition 1.27 we show ${{A}} \subseteq {{B}}$ and ${{B}} \subseteq {{A}}$.

($\subseteq$) Let $x \in {{A}}$. Then {{unfold the definition of A}}, so $x \in {{B}}$.

($\supseteq$) Let $x \in {{B}}$. Then {{unfold the definition of B}}, so $x \in {{A}}$.

Hence ${{A}} = {{B}}$. $\blacksquare$

## \subsetproof — Ch1: show A is a subset of B
**Proof.** Let $x \in {{A}}$, i.e. {{what membership in A means}}.
{{argument}}
So $x \in {{B}}$. Since $x$ was arbitrary, ${{A}} \subseteq {{B}}$. $\blacksquare$

## \setbuilder — Ch1: list the elements of a set-builder set
$\{ {{x}} \in {{universe}} \mid {{condition}} \}$: we solve ${{condition}}$:
{{solve}}
So the set is $\{ {{elements}} \}$.

## \injective — Ch1: show f is injective (Def 1.106)
**Proof.** Let $x, y \in {{domain}}$ with $f(x) = f(y)$, i.e. ${{f(x) = f(y) written out}}$.
{{algebra}}
So $x = y$, and $f$ is injective (Definition 1.106). $\blacksquare$

## \notinjective — Ch1: show f is NOT injective
$f$ is **not injective** (Definition 1.106): $f({{x1}}) = {{value}} = f({{x2}})$ but ${{x1}} \neq {{x2}}$.

## \surjective — Ch1: show f is surjective (Def 1.106)
**Proof.** Let $y \in {{codomain}}$. We look for $x \in {{domain}}$ with $f(x) = y$: solving ${{f(x) = y}}$ gives $x = {{x in terms of y}}$.
This $x$ lies in ${{domain}}$ because {{reason}}, and $f(x) = {{check}} = y$.
So $f$ is surjective (Definition 1.106). $\blacksquare$

## \notsurjective — Ch1: show f is NOT surjective
$f$ is **not surjective** (Definition 1.106): $y = {{y}} \in {{codomain}}$ has no preimage, since $f(x) = {{y}}$ would require {{impossible condition}}.

## \inversefn — Ch1: find the inverse function
$f\colon {{A}} \to {{B}}$, $f(x) = {{formula}}$, is bijective (Definition 1.106). Solve $y = {{formula}}$ for $x$:
{{solve}}
So $f^{-1}\colon {{B}} \to {{A}}$, $f^{-1}(y) = {{inverse formula}}$. Check: $f(f^{-1}(y)) = {{check}} = y$.

## \composition — Ch1: compute a composition of functions
$(f \circ g)(x) = f(g(x)) = f({{g(x)}}) = {{result}}$, defined for $x \in {{domain of g}}$ with $g(x) \in {{domain of f}}$.

## \preimage — Ch1: compute a preimage (Def 1.115)
By Definition 1.115, $f^{-1}({{C}}) = \{ x \in {{A}} \mid f(x) \in {{C}} \} = \{ x \in {{A}} \mid {{inequality/equation}} \}$.
{{solve}}
So $f^{-1}({{C}}) = {{answer}}$.

## \irrational — Ch1: no rational solution, by contradiction (Ex 1.85)
**Proof by contradiction.** Assume $\xi = \frac{a}{b} \in \mathbb{Q}$ with ${{equation in xi}}$, where $a \in \mathbb{Z}$, $b \in \mathbb{N}$ and $a, b$ have no common divisor (Definition 1.54).
Then ${{equation in a, b}}$, so {{a (or b) must be divisible by p}}. Write $a = {{p}}k$. Then {{b must be divisible by p too}}.
So ${{p}}$ divides both $a$ and $b$ — a contradiction. $\blacksquare$

## \inequality — Ch1/5: prove an inequality, step by step
**Proof.** For {{assumptions}}:
$${{LHS}} = {{step 1}} \le {{step 2}} = {{RHS}}$$
where the first step uses {{rule}} and the second uses {{rule}}. $\blacksquare$

## \sumind — Ch1: prove a sum formula by induction (Thm 1.86)
**Proof by induction** (Theorem 1.86). Let $p(n)$: $\sum_{i=1}^{n} {{term}} = {{closed form}}$.

**Base case** $n = 1$: LHS $= {{LHS at 1}}$, RHS $= {{RHS at 1}}$. ✓

**Induction step:** Assume $p(n)$. Then
$$\sum_{i=1}^{n+1} {{term}} = {{closed form}} + {{term at n+1}} = {{simplify}} = {{closed form at n+1}},$$
which is $p(n+1)$. So $p(n)$ holds for all $n \in \mathbb{N}$. $\blacksquare$

## \fakeproof — Ch1/2: find the mistake in an argument
**The mistake** is in the step ${{step}}$: {{why that inference is not valid (e.g. dividing by 0, ⇐ does not hold, base case fails)}}.
Everything before it is fine; from this step on the argument proves nothing.

## \gauss — Ch2: solve a linear system by Gauss elimination (Sec 2.3)
**Solve** the system with Gauss elimination (Section 2.3, Theorem 2.8). Augmented matrix:
$$\left(\begin{array}{ccc|c} {{augmented matrix rows}} \end{array}\right)$$
$R_2 \leftarrow R_2 - {{c}} R_1$, $R_3 \leftarrow R_3 - {{c}} R_1$:
$$\left(\begin{array}{ccc|c} {{after step 1}} \end{array}\right)$$
$R_3 \leftarrow R_3 - {{c}} R_2$:
$$\left(\begin{array}{ccc|c} {{echelon form}} \end{array}\right)$$
Back substitution: {{x3, then x2, then x1}}.
**Solution:** $({{x1}}, {{x2}}, {{x3}})$. Check in the original equations: {{check}}.

## \paramsol — Ch2: infinitely many solutions, in terms of a free variable
After elimination the system reduces to ${{reduced equations}}$, so ${{free variable}}$ is free.
Expressing the others in terms of ${{free variable}}$: ${{x = ..., y = ...}}$.
**All solutions:** $\{ {{solution vector in terms of t}} \mid {{free variable}} \in \mathbb{R} \}$.

## \polydiv — Ch2: polynomial division (Thm 2.22)
**Divide** $f(x) = {{f}}$ by $d(x) = {{d}}$ (Theorem 2.22):
{{long division steps}}
So $f(x) = ({{q}})\,d(x) + ({{r}})$ with $\deg r < \deg d$, i.e. $q(x) = {{q}}$, $r(x) = {{r}}$.

## \roots — Ch2: find the roots of a polynomial (Prop 2.23)
**Roots of** $f(x) = {{f}}$. {{substitution / guess a root}} gives $f({{alpha}}) = 0$, so by Proposition 2.23, $f(x) = (x - {{alpha}})\,q(x)$ with $q(x) = {{q}}$.
{{roots of q}}
**Roots:** $x = {{roots}}$ (at most $\deg f$ of them, Theorem 2.25).

## \interpolate — Ch2: polynomial through given points (Lagrange, Sec 2.5)
**Find** the polynomial of degree $\le {{n}}$ through ${{points}}$. Lagrange polynomials (Section 2.5.1):
$$L_1(x) = {{L1}},\quad L_2(x) = {{L2}},\quad L_3(x) = {{L3}}$$
Then $f(x) = y_1 L_1(x) + y_2 L_2(x) + y_3 L_3(x) = {{simplified}}$.
Check: {{f at each point}}.

## \matmul — Ch3: compute a matrix product (Def 3.4)
$A$ is ${{m}} \times {{n}}$ and $B$ is ${{n}} \times {{r}}$, so $AB$ is ${{m}} \times {{r}}$ with $(AB)_{ij} = \sum_k A_{ik} B_{kj}$ (Definition 3.4):
$$AB = {{product}}$$

## \matinv — Ch3: compute an inverse matrix (Def 3.24, Sec 3.5.1)
**Inverse of** $A = {{A}}$: row reduce $(A \mid I)$ to $(I \mid A^{-1})$ (Section 3.5.1):
$$\left(\begin{array}{ccc|ccc} {{A | I}} \end{array}\right) \to {{steps}} \to \left(\begin{array}{ccc|ccc} {{I | A inverse}} \end{array}\right)$$
So $A^{-1} = {{A inverse}}$. Check: $AA^{-1} = I$ (Definition 3.24).

## \inversetwo — Ch3: inverse of a 2x2 matrix (Ex 3.26)
For $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix} = {{A}}$: $D = ad - bc = {{D}} \neq 0$, so $A$ is invertible and
$$A^{-1} = \frac{1}{D}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = {{A inverse}}.$$

## \matrixproof — Ch3: prove a matrix identity entry by entry
**Proof.** We compare entry $(i,j)$ on both sides.
LHS: $({{LHS}})_{ij} = {{expand with the definition of the product/transpose}}$.
RHS: $({{RHS}})_{ij} = {{expand}}$.
These agree for all $i, j$, so ${{LHS}} = {{RHS}}$. $\blacksquare$

## \posdef — Ch3/8: decide definiteness by symmetric reduction (Prop 3.43)
**Is** $A = {{A}}$ positive definite? Symmetric reduction (Section 3.7.3): apply each row operation and the same column operation.
{{row op + column op}}
This gives $B^\top A B = D = {{diagonal matrix}}$ with $B$ invertible.
By Proposition 3.43 $A$ is {{positive definite / positive semi-definite / indefinite}}, since the diagonal entries of $D$ are {{all > 0 / all ≥ 0 / of both signs}}.

## \formulate — Ch4: write a problem as an optimization problem (Def 4.6)
**Variables:** ${{variables}}$ = {{what they mean}}.
**Objective:** {{minimize/maximize}} $f({{variables}}) = {{objective}}$.
**Constraints:** $C = \{ ({{variables}}) \mid {{constraints}} \}$.
So the problem is $\min_{v \in C} {{f or -f}}$ (Definition 4.6; maximize $f$ = minimize $-f$, Remark 4.8).

## \line — Ch4: parametric line through two points (Def 4.12)
The line through $p = {{p}}$ and $q = {{q}}$ is $L = \{ p + t(q - p) \mid t \in \mathbb{R} \}$ (Definition 4.12, Exercise 4.20) with $q - p = {{q - p}}$:
$$L = \{ {{p}} + t\,{{q - p}} \mid t \in \mathbb{R} \}.$$

## \collinear — Ch4: do points lie on one line?
The line through ${{p}}$ and ${{q}}$ is $\{ {{p}} + t({{q - p}}) \}$. Is ${{r}}$ on it? Solve ${{p}} + t({{q - p}}) = {{r}}$ coordinate by coordinate:
{{solve for t}}
{{one t works for all coordinates → collinear / contradiction → not collinear}}.

## \convexset — Ch4: show a subset is convex (Def 4.21)
**Proof.** Let $x, y \in C = {{C}}$ and $0 \le t \le 1$. We show $(1-t)x + ty \in C$ (Definition 4.21).
Since $x, y \in C$: {{conditions on x and y}}.
Then {{check the condition for (1-t)x + ty, using t ≥ 0 and 1 - t ≥ 0}}.
So $(1-t)x + ty \in C$, and $C$ is convex. $\blacksquare$

## \convexfn — Ch4: show a function is convex by definition (Def 4.26)
**Proof.** Let $x, y \in {{C}}$ and $0 \le t \le 1$. We must show $f((1-t)x + ty) \le (1-t)f(x) + tf(y)$ (Definition 4.26).
$$(1-t)f(x) + tf(y) - f((1-t)x + ty) = {{simplify}} = {{something ≥ 0, e.g. t(1-t)(x-y)^2}} \ge 0.$$
So $f$ is convex. $\blacksquare$

## \fm — Ch4: Fourier-Motzkin elimination (Sec 4.5)
**Eliminate** ${{x}}$ from the system (Section 4.5). Sort the inequalities:
- lower bounds: ${{x}} \ge {{lower bounds}}$
- upper bounds: ${{x}} \le {{upper bounds}}$
- without ${{x}}$: {{others}}

Pairing every lower with every upper bound gives the system in the remaining variables:
$${{new system}}$$
{{continue / conclusion: the original system is solvable iff this one is}}.

## \linopt — Ch4: solve a linear optimization problem with Fourier-Motzkin
**Maximize** ${{objective}}$ subject to {{constraints}}. Introduce $z = {{objective}}$ and eliminate the variables with Fourier-Motzkin (Section 4.5):
{{elimination}}
The bounds left on $z$ are ${{bounds on z}}$, so the optimal value is ${{optimum}}$, attained at ${{optimal point}}$ (back-substitute).

## \projection — Ch5: closest point on a line / orthogonal decomposition (Ex 5.6-5.7)
We want $\lambda$ with $(u - \lambda v) \perp v$: $(u - \lambda v) \cdot v = 0 \iff \lambda = \frac{u \cdot v}{v \cdot v} = {{lambda}}$.
With $u = {{u}}$, $v = {{v}}$: $\lambda v = {{projection}}$, and by Pythagoras (Proposition 5.15) this minimizes $|u - \lambda v|$, with minimal distance $|u - \lambda v| = {{distance}}$.

## \leastsquares — Ch5: best fit by least squares (Thm 5.16)
**Model:** ${{model, e.g. y = αx + β}}$. Writing the equations for the data points as $Av = b$:
$$A = {{A}},\quad b = {{b}}$$
By Theorem 5.16 the best approximate solution solves the normal equations $(A^\top A)v = A^\top b$:
$$A^\top A = {{AtA}},\quad A^\top b = {{Atb}}$$
Solving gives $v = {{solution}}$, so the best fit is ${{fitted model}}$.

## \cosangle — Ch5: angle / cosine similarity (Def 5.1)
$u \cdot v = {{dot}}$, $|u| = {{norm u}}$, $|v| = {{norm v}}$, so $\cos\theta = \frac{u \cdot v}{|u||v|} = {{cos}}$ (Definition 5.1), which lies in $[-1, 1]$ by Cauchy-Schwarz (Theorem 5.24).

## \bounded — Ch5: show a subset is bounded (Def 5.33)
**Proof.** For $v = {{v}} \in S$ we have {{estimate each coordinate}}, so $|v| \le {{estimate}} < {{R}}$.
So $S \subseteq B(0, {{R}})$, and $S$ is bounded (Definition 5.33). $\blacksquare$

## \unbounded — Ch5: show a subset is NOT bounded
**Proof.** Suppose $S \subseteq B(0, R)$ for some $R \in \mathbb{R}$ (Definition 5.33). Take $v = {{element depending on R}} \in S$. Then $|v| = {{norm}} \ge R$ — a contradiction. So $S$ is not bounded. $\blacksquare$

## \openset — Ch5: show a subset is open (Def 5.39)
**Proof.** Let $v \in U = {{U}}$, so {{condition on v}}. Put $\varepsilon = {{epsilon in terms of v}} > 0$.
If $u \in B(v, \varepsilon)$, then {{triangle inequality / estimate}}, so $u \in U$.
Hence $B(v, \varepsilon) \subseteq U$, and $U$ is open (Definition 5.39). $\blacksquare$

## \notopen — Ch5: show a subset is NOT open
$U$ is **not open**: for $v = {{v}} \in U$, every ball $B(v, \varepsilon)$ contains ${{point depending on ε}} \notin U$, so no $\varepsilon > 0$ has $B(v, \varepsilon) \subseteq U$ (Definition 5.39).

## \closedset — Ch5: show a subset is closed (Def 5.47 / Prop 5.69)
**Proof.** $F = \{ v \in \mathbb{R}^{ {{d}} } \mid {{g(v) ≤ c}} \} = g^{-1}({{closed set, e.g. (-∞, c]}})$, where $g(v) = {{g}}$ is continuous (Propositions 5.74-5.75).
Since ${{closed set, e.g. (-∞, c]}}$ is closed (Proposition 5.52), $F$ is closed by Proposition 5.69. $\blacksquare$

## \compact — Ch5: show a subset is compact (Def 5.53)
$C = {{C}}$ is **closed** because {{\closedset argument}} and **bounded** because {{\bounded argument}}. So $C$ is compact (Definition 5.53).

## \boundary — Ch5: boundary and interior (Def 5.56, 5.58)
**Interior** (Definition 5.58): $S^\circ = {{interior}}$, since for $v$ there a small ball stays inside $S$.
**Boundary** (Definition 5.56): $\partial S = {{boundary}}$, since every ball around such a $v$ meets both $S$ and $\mathbb{R}^{ {{d}} } \setminus S$.

## \limit — Ch5: compute a limit
$$\lim_{x \to {{a}}} {{expression}} = \lim_{x \to {{a}}} {{simplified (cancel the factor that is 0 at a)}} = {{value}}$$
The simplification is valid for $x \neq {{a}}$, which is all the limit looks at (Definition 5.62).

## \continuous — Ch5: show a function is continuous (Props 5.72-5.75)
$f({{variables}}) = {{f}}$ is built from the projections (continuous, Lemma 5.72) and constants using $+$, $\cdot$ and {{division by the non-zero ...}} (Proposition 5.75) and composition (Proposition 5.74). So $f$ is continuous.

## \ivt — Ch5: a root exists by Bolzano (Thm 5.81)
$f(x) = {{f}}$ is continuous on $[{{a}}, {{b}}]$ (polynomial, Remark 5.77), with $f({{a}}) = {{f(a)}} < 0$ and $f({{b}}) = {{f(b)}} > 0$.
By Theorem 5.81 there is $x_0 \in ({{a}}, {{b}})$ with $f(x_0) = 0$.

## \evt — Ch5: a max/min exists by the extreme value theorem (Thm 5.84)
$C = {{C}}$ is compact ({{closed and bounded}}, Definition 5.53) and $f = {{f}}$ is continuous on $C$ ({{reason}}).
By Theorem 5.84, $f$ attains a minimum and a maximum on $C$.

## \derivdef — Ch6: derivative from the definition (Def 6.17)
**Claim:** $f'({{x0}}) = {{c}}$ for $f(x) = {{f}}$. By Definition 6.17 we need $f({{x0}} + h) = f({{x0}}) + {{c}}\,h + \varepsilon(h)\,h$ with $\varepsilon(h) \to 0$ as $h \to 0$:
$$f({{x0}} + h) - f({{x0}}) = {{expand}} = {{c}}\,h + ({{epsilon(h)}})\,h$$
and $\varepsilon(h) = {{epsilon(h)}} \to 0$ for $h \to 0$. $\blacksquare$

## \notdiff — Ch6: show f is NOT differentiable at a point
If $f$ were differentiable at ${{x0}}$ with $f'({{x0}}) = c$, then $\frac{f({{x0}}+h) - f({{x0}})}{h} \to c$. But this quotient is ${{right value}}$ for $h > 0$ and ${{left value}}$ for $h < 0$, so no such $c$ exists (Definition 6.17).

## \newton — Ch6/8: Newton-Raphson iteration (Sec 6.3.5)
**Newton-Raphson** for $f(x) = {{f}}$, $f'(x) = {{f'}}$: $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)} = {{simplified iteration}}$.
Starting at $x_0 = {{x0}}$:

| $n$ | $x_n$ | $f(x_n)$ |
|---|---|---|
| 0 | {{x0}} | {{_}} |
| 1 | {{_}} | {{_}} |
| 2 | {{_}} | {{_}} |
| 3 | {{_}} | {{_}} |

So the root is $x \approx {{root}}$.

## \crit — Ch6: find and classify critical points, one variable (Def 6.36)
$f(x) = {{f}}$, $f'(x) = {{f'}}$. Critical points (Definition 6.36): $f'(x) = 0 \iff x = {{critical points}}$.
$f''(x) = {{f''}}$:
- $x = {{x1}}$: $f''({{x1}}) = {{value}}$ $\Rightarrow$ {{local min (> 0) / local max (< 0) / use higher derivatives (Theorem 6.50)}}

{{global behaviour / compare with the endpoints if on [a, b]}}

## \taylor — Ch6: Taylor polynomial
Taylor polynomial of $f(x) = {{f}}$ at $x_0 = {{x0}}$ up to degree ${{n}}$: $f({{x0}}) = {{_}}$, $f'({{x0}}) = {{_}}$, $f''({{x0}}) = {{_}}$, ...
$$P_{ {{n}} }(x) = \sum_{k=0}^{ {{n}} } \frac{f^{(k)}({{x0}})}{k!}(x - {{x0}})^k = {{polynomial}}$$

## \monotone — Ch6: increasing / decreasing via f' (Prop 6.43)
$f'(x) = {{f'}}$ {{≥ 0 / > 0 (except at isolated points)}} for all $x \in {{interval}}$, so $f$ is {{increasing / strictly increasing}} on ${{interval}}$ (Proposition 6.43).

## \mvt — Ch6: apply the mean value theorem (Thm 6.40)
$f$ is continuous on $[{{a}}, {{b}}]$ and differentiable on $({{a}}, {{b}})$, so by Theorem 6.40 there is $\xi \in ({{a}}, {{b}})$ with
$$f'(\xi) = \frac{f({{b}}) - f({{a}})}{{{b}} - {{a}}} = {{value}}.$$
{{use it: e.g. bound |f(b) - f(a)| ≤ sup|f'| · (b - a)}}.

## \convexdiff — Ch6: convex via f'' (Cor 6.55)
$f(x) = {{f}}$ on ${{interval}}$: $f''(x) = {{f''}} \ge 0$ for all $x \in {{interval}}$, so $f$ is convex (Corollary 6.55).
{{Strictly convex: f' is strictly increasing, since f'' > 0 except at isolated points (Theorem 6.54)}}.

## \gradient — Ch7: partial derivatives and gradient (Def 7.4)
$f({{x, y}}) = {{f}}$:
$$\frac{\partial f}{\partial x} = {{f_x}}, \quad \frac{\partial f}{\partial y} = {{f_y}}$$
so $\nabla f({{x, y}}) = ({{f_x}}, {{f_y}})$ (Definition 7.4) and $\nabla f({{point}}) = {{value}}$.

## \jacobian — Ch7: matrix derivative of a vector function (Prop 7.9)
$f({{x, y}}) = ({{f1}}, {{f2}})$. By Proposition 7.9 the derivative is the matrix of partial derivatives:
$$f'({{x, y}}) = \begin{pmatrix} \partial f_1/\partial x & \partial f_1/\partial y \\ \partial f_2/\partial x & \partial f_2/\partial y \end{pmatrix} = {{matrix}}$$

## \chainrule — Ch7: multivariable chain rule (Thm 7.23)
$h = f \circ g$ with $g({{t}}) = {{g}}$ and $f({{x, y, z}}) = {{f}}$. By Theorem 7.23, $h'({{t}}) = f'(g({{t}}))\,g'({{t}})$:
$$h'({{t}}) = {{gradient of f at g(t)}} \cdot {{g'(t)}} = {{result}}$$

## \critxy — Ch7/8: critical points and classification, several variables (Thm 8.12)
$f(x, y) = {{f}}$. Critical points (Definition 7.15): $\nabla f = 0$:
$$\frac{\partial f}{\partial x} = {{f_x}} = 0, \quad \frac{\partial f}{\partial y} = {{f_y}} = 0$$
Solving gives ${{critical points}}$. Hessian (Definition 8.2):
$$\nabla^2 f(x, y) = {{Hessian}}$$
- At ${{point}}$: $\nabla^2 f = {{value}}$ is {{positive definite / negative definite / indefinite}} $\Rightarrow$ {{local min / local max / saddle point}} (Theorem 8.12).

## \hessian — Ch8: classify one critical point with the Hessian (Thm 8.12)
At the critical point $v_0 = {{v0}}$: $\nabla^2 F(v_0) = {{Hessian}}$. Symmetric reduction gives $D = {{diagonal}}$, so it is {{positive definite / negative definite / indefinite}} (Proposition 8.11).
By Theorem 8.12, $v_0$ is a {{local minimum / local maximum / saddle point}}.

## \lagrange — Ch7: Lagrange multipliers (Thm 7.39)
**Optimize** $f({{x, y}}) = {{f}}$ subject to $g({{x, y}}) = {{g}} = 0$. By Theorem 7.39 an extremum satisfies $\nabla f = \lambda \nabla g$, $g = 0$:
$${{f_x}} = \lambda\,({{g_x}}), \quad {{f_y}} = \lambda\,({{g_y}}), \quad {{g}} = 0$$
{{solve the system}}
Candidates: ${{candidate points}}$ with $f$-values ${{values}}$.
The constraint set is compact ({{reason}}), so by Theorem 5.84 the max is ${{max}}$ and the min is ${{min}}$.

## \compactopt — Ch7: max/min on a compact set: interior + boundary (Prop 7.46)
$C = {{C}}$ is compact and $f = {{f}}$ is continuous, so max and min exist (Theorem 5.84).
**Interior:** optima there are critical points (Proposition 7.46): $\nabla f = 0 \iff {{critical points in the interior}}$.
**Boundary:** {{parametrize each edge / use Lagrange}}:
- {{edge 1}}: {{one-variable problem}} → candidates {{_}}
- {{edge 2}}: {{one-variable problem}} → candidates {{_}}
- corners: {{_}}

| point | $f$ |
|---|---|
| {{_}} | {{_}} |

**Max** ${{max}}$ at ${{argmax}}$, **min** ${{min}}$ at ${{argmin}}$.

## \convexhess — Ch8: convex via a positive semi-definite Hessian (Thm 8.25)
$f({{x, y}}) = {{f}}$ has Hessian $\nabla^2 f = {{Hessian}}$, which is {{positive semi-definite / positive definite}} for all points in ${{U}}$ ({{symmetric reduction / diagonal entries}}).
By Theorem 8.25, $f$ is {{convex / strictly convex}} on ${{U}}$.

## \convexopt — Ch9: show it is a convex optimization problem
The objective $f = {{f}}$ is convex ({{reason, e.g. \convexhess}}) and the feasible set $C = \{ v \mid g_i(v) \le 0 \}$ is convex, since each $g_i = {{constraints}}$ is convex and sublevel sets of convex functions are convex (Lemma 4.29), and intersections of convex sets are convex (Exercise 4.25).
So this is a convex optimization problem; a local minimum is global (Theorem 6.13).

## \kkt — Ch9: solve with the KKT conditions (Thm 9.37)
**Problem:** $\min f(v) = {{f}}$ subject to $g_1(v) = {{g1}} \le 0$, ..., all convex.
**Strictly feasible** (Definition 9.36): $z_0 = {{z0}}$ has $g_i(z_0) < 0$.
**KKT conditions** (Theorem 9.37): $\lambda_i \ge 0$, $g_i(v) \le 0$, $\lambda_i g_i(v) = 0$ and
$$\nabla f(v) + \lambda_1 \nabla g_1(v) + \dots = 0: \quad {{gradient equations}}$$
**Cases** (which constraints are active):
- $\lambda_1 = 0$: {{_}}
- $g_1(v) = 0$: {{_}}

The case that satisfies everything is $v = {{v}}$, $\lambda = {{lambda}}$. Since the problem is convex and strictly feasible, $v$ is optimal with value $f(v) = {{value}}$.

## \svm — Ch9: optimal separating hyperplane (Thm 9.8)
Data: ${{labeled points}}$. We want $\alpha, \beta$ with $y_i(\alpha^\top v_i + \beta) \ge 1$ for all $i$, minimizing $|\alpha|^2$ (Theorem 9.8):
$$\min \ \alpha_1^2 + \alpha_2^2 \quad \text{s.t.} \quad {{constraints}}$$
{{solve (KKT / sketch)}}
Optimal hyperplane: $H = \{ v \mid {{alpha}}^\top v + {{beta}} = 0 \}$, margin $\frac{1}{|\alpha|} = {{margin}}$.
