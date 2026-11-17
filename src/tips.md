# Study-card tips

One section per command (`## \name`) or contradiction engine (`## E4`).
Lines:
- `show:` what has to be shown / computed (always on the card)
- `prove:` what to show when the statement is true
- `disprove:` what to show when it is false
- `trick:` a shortcut, a twist, a common trap
Only the book's words and references (test/studycard.test.js checks both).

## \truthtable
show: One row per combination of truth values: 2^n rows for n letters (Definition 1.10).
trick: Two propositions are the same exactly when their columns agree in every row.
trick: p ⇒ q is false only in the row p true, q false: that row is all you need to break an implication.

## \setequal
show: A = B means x ∈ A ⇒ x ∈ B and x ∈ B ⇒ x ∈ A (Definition 1.27): two inclusions.
disprove: One element in one set and not in the other is enough.
trick: Rewrite both sets with the same condition first; often the inclusions become one line each.

## \subsetproof
show: Take an arbitrary x ∈ A and show x ∈ B, using only the condition defining A.
disprove: One x ∈ A with x ∉ B.

## \setbuilder
show: Write the condition that decides membership; then list or describe the elements.

## \injective
show: f(x) = f(y) ⇒ x = y (Definition 1.106).
disprove: Two different inputs with the same value: solve f(x) = f(y) with x ≠ y.
trick: A strictly increasing function is injective (Definition 6.41): f' > 0 settles it (Proposition 6.43).
trick: For a function between finite sets, more inputs than outputs means it can never be injective.

## \surjective
show: For every y in the codomain, find x with f(x) = y (Definition 1.106): solve f(x) = y for x.
disprove: One value y that is never hit: show f(x) = y has no solution.
trick: Continuous on an interval: Theorem 5.81 gives every value between two values of f.
trick: The codomain matters: x² is surjective onto [0, ∞) but not onto ℝ.

## \bijective
show: Injective and surjective (Definition 1.106), or write down the inverse function.
trick: Finding g with g(f(x)) = x and f(g(y)) = y proves both at once.

## \inversefn
show: Solve y = f(x) for x; that x as a function of y is the inverse.
trick: Check the result: f(g(y)) = y and g(f(x)) = x.

## \composition
show: (f ∘ g)(x) = f(g(x)): insert g(x) wherever f has its variable.
trick: Usually f ∘ g ≠ g ∘ f; one value of x is enough to show they differ.

## \preimage
show: f^{-1}(C) = { x | f(x) ∈ C } (Definition 1.115): solve the inequality or equation f(x) ∈ C.

## \irrational
show: Assume the number is a/b in lowest terms (Definition 1.54) and reach a contradiction.
trick: The classic route: a² = 2b² forces a even, then b even: not in lowest terms.

## \inequality
show: Move everything to one side and show that side is ≥ 0 (or > 0).
trick: A square is ≥ 0: completing the square often finishes it.
trick: |u · v| ≤ |u||v| (Theorem 5.24) and the triangle inequality (Corollary 5.27) handle norms.
trick: For all n: induction (Theorem 1.86) when the inequality for n + 1 follows from the one for n.

## \sumind
show: Base case, then assume the formula for n and add the next term to reach the formula for n + 1 (Theorem 1.86).
trick: In the step, write the sum up to n + 1 as (sum up to n) + (last term) and use the assumption on the first part.

## \fakeproof
show: Find the first step that is not an equivalence or not allowed.
trick: Typical culprits: dividing by something that can be 0, taking square roots of both sides, a base case that does not start the chain.

## \gauss
show: Eliminate one unknown at a time (Section 2.3); each step keeps the same solutions (Theorem 2.8).
disprove: No solution: elimination reaches 0 = c with c ≠ 0.
trick: Infinitely many solutions: a free unknown is left; write the others in terms of it.

## \polydiv
show: f = q·g + r with deg r < deg g (Theorem 2.22).
trick: r = 0 exactly when g divides f; for g = x − a this means f(a) = 0 (Proposition 2.23).

## \roots
show: Find the roots; a polynomial of degree n has at most n roots (Theorem 2.25).
trick: Guess a small integer root a, then divide by x − a (Proposition 2.23) and continue with a lower degree.
trick: Degree 2: the formula (2.12) and the sign of b² − 4ac.
trick: Odd degree always has a root (Theorem 2.28 / Proposition 5.83).

## \interpolate
show: A polynomial through the given points: set up the linear equations for its coefficients and solve them (Section 2.5).

## \matmul
show: Entry (i, j) is row i of A times column j of B (Definition 3.4).
trick: AB ≠ BA in general: one pair of matrices is enough to show it.
trick: (AB)C = A(BC) (Theorem 3.19), so compute in the order that is least work.

## \matinv
show: B with AB = BA = I (Definition 3.24); compute it by Gauss elimination on (A | I).
disprove: Not invertible: find v ≠ 0 with Av = 0; then v = BAv = 0 would be a contradiction.
trick: 2 × 2: D = ad − bc ≠ 0 decides it (Exercise 3.26).
trick: With a parameter a: find the values making D = 0 and treat them one by one.

## \matrixproof
show: Compare entry (i, j) of both sides (Definition 3.4), or use the rules (AB)^T = B^T A^T (Proposition 3.35) and (AB)^{-1} = B^{-1}A^{-1} (Proposition 3.29).

## \posdef
show: Decide the sign of u^T A u for u ≠ 0 (Section 3.7.1).
prove: Symmetric reduction B^T A B = D (Theorem 8.31); the signs of the diagonal of D decide it (Proposition 3.43).
disprove: One vector u with u^T A u ≤ 0; a diagonal entry a_ii ≤ 0 gives u = e_i at once.
trick: Look at the diagonal first: a single a_ii ≤ 0 already rules out positive definite.
trick: Indefinite needs two vectors: one with u^T A u > 0 and one with v^T A v < 0 (Definition 8.9).
trick: With a parameter: the diagonal of D gives inequalities in the parameter.

## \formulate
show: Name the variables, the function to minimize or maximize and the constraints (Definition 4.6).
trick: Maximizing f is minimizing −f (Remark 4.8).

## \line
show: A line is { p + t u | t ∈ ℝ } with u ≠ 0 (Definition 4.12).
trick: Three points on one line: the same t must work in every coordinate.

## \convexset
show: For u, v ∈ C and 0 ≤ t ≤ 1: (1 − t)u + tv ∈ C (Definition 4.21).
disprove: Two points of C whose midpoint is not in C.
trick: { v | f(v) ≤ c } with f convex is convex (Lemma 4.29): no segment computation needed.
trick: An intersection of convex sets is convex; half-planes and hyperplanes (Definition 4.40) are convex.

## \convexfn
show: f((1 − t)x + ty) ≤ (1 − t)f(x) + t f(y) (Definition 4.26).
prove: One variable: f'' ≥ 0 (Corollary 6.55). Several variables: the Hessian is positive semi-definite everywhere (Theorem 8.25).
disprove: Two points x, y and t = 1/2 where the inequality fails, or one point where f'' < 0 / the Hessian is not positive semi-definite.
trick: Sums of convex functions with coefficients ≥ 0 are convex: split f into known pieces.
trick: The Hessian criterion is an "if and only if": one bad point disproves convexity.

## \strictconvex
show: Strict inequality for u ≠ v and 0 < t < 1 (Definition 6.1).
prove: f'' > 0 (Corollary 6.55) or a positive definite Hessian (Theorem 8.25).
disprove: A segment where f is linear: there the strict inequality fails.
trick: f'' > 0 is enough but not necessary: x⁴ is strictly convex with f''(0) = 0 (Remark 6.56).
trick: Strictly convex: at most one minimum (Theorem 6.13).

## \fm
show: Eliminate one variable at a time: pair every lower bound with every upper bound (Section 4.5).
disprove: No solution: the elimination ends in 0 < c with c ≤ 0; the pairs used show which inequalities to add.

## \orthogonal
show: u · v = 0 (Definition 5.1).
trick: u − λv is orthogonal to v for λ = (u · v)/(v · v) (Exercise 5.6).
trick: Pythagoras |u + v|² = |u|² + |v|² holds for orthogonal u, v (Proposition 5.15).

## \leastsquares
show: Solve the normal equations A^T A x = A^T b (Theorem 5.16).
trick: A line y = a + bx through data: A has a column of 1s and a column of the x-values.

## \bounded
show: One R with |v| ≤ R for every v ∈ S (Definition 5.33).
prove: Bound each coordinate, then |v| ≤ √(sum of the squared bounds).
disprove: The negation (Remark 5.34): for every R some v ∈ S has |v| ≥ R; give that v as a formula in R.
trick: |v| < R or |v| ≤ R makes no difference (Remark 5.35).
trick: A condition like x² + y² ≤ c bounds both coordinates at once.

## \openset
show: Around every v ∈ U a ball B(v, ε) ⊆ U (Definition 5.39).
prove: Fastest: U = { v | g(v) < c } with g continuous is open (Proposition 5.68); several such conditions: Proposition 5.45.
disprove: A point v ∈ U where every ball sticks out: a point on the edge that belongs to U.
trick: Strict inequalities with continuous functions give open sets; ≤ and = usually break openness.
trick: Not open does not mean closed (Remark 5.48).

## \closedset
show: The complement is open (Definition 5.47).
prove: Fastest: F = { v | g(v) ≤ c } or { v | g(v) = c } with g continuous is closed (Proposition 5.69); several: Proposition 5.49.
disprove: A point outside F with every ball around it meeting F.
trick: Not closed does not mean open (Remark 5.48).

## \compact
show: Closed and bounded (Definition 5.53): two separate checks.
disprove: One of the two fails; check bounded first, it is usually the quicker one.
trick: Unbounded sets like lines and half-planes are never compact, so Theorem 5.84 does not apply on them.

## \boundary
show: Boundary: every ball meets S and its complement (Definition 5.56). Interior: some ball lies inside S (Definition 5.58).
trick: For { g < c } or { g ≤ c } the boundary is usually { g = c }: check it with the definition.

## \limit
show: |f(x) − L| < ε whenever 0 < |x − a| < δ (Definition 5.62).
prove: f continuous at a: the limit is f(a) (Definition 5.65). 0/0: cancel the common factor x − a first.
disprove: Two ways of approaching a with different values (from the left and right, or along two lines in ℝ²).
trick: In two variables, try the lines y = m x: if the value depends on m, the limit does not exist.
trick: Agreeing along every line is not enough: also try a parabola like y = x².

## \continuous
show: Built from continuous pieces: polynomials (Remark 5.77), sin and e^x (Remark 5.79), sums, products and quotients (Proposition 5.75), compositions (Proposition 5.74).
disprove: At one point a: the limit does not exist or differs from f(a) (Definition 5.65).
trick: Differentiable implies continuous (Proposition 6.22); convex on an open convex set implies continuous (Theorem 6.7).

## \ivt
show: f continuous on [a, b] with f(a) and f(b) of opposite signs gives a root in between (Theorem 5.81).
trick: To find a, b, try small integers and look for a sign change.
trick: Odd degree polynomials: very negative and very positive values both occur (Proposition 5.83).

## \evt
show: A continuous function on a compact set has a max and a min (Theorem 5.84): check compact (closed and bounded) and continuous.
disprove: Without boundedness or closedness it can fail: an open interval or a line where the values only get closer to a bound.
trick: On a line or another unbounded set, convexity (Theorem 6.13) can replace compactness.

## \derivative
show: The limit of slopes, or the rules: product (Section 6.3.3) and chain rule (Section 6.3.4).
trick: Not differentiable at a point: the slopes from the two sides have different limits.

## \newton
show: x_{n+1} = x_n − f(x_n)/f'(x_n); in several variables, the gradient and Hessian replace f' and f'' (Section 8.3).
trick: Write the step as a formula first, then insert numbers; stop when the change is tiny.

## \crit
show: Solve f'(x) = 0 (Definition 6.36); local extrema can only be there or at the ends of the interval (Lemma 6.37).
trick: f'' at the point: > 0 min, < 0 max, = 0 no conclusion: use Theorem 6.50 or the sign of f' around it.
trick: On [a, b] compare the values at critical points and at a and b (Theorem 5.84).
trick: f convex: a critical point is the global minimum (Theorem 6.13).

## \taylor
show: P(x) = Σ f^{(k)}(x0)/k! (x − x0)^k (Section 6.4).
trick: Compute the derivatives at x0 first and look for a repeating pattern.

## \increasing
show: x < y ⇒ f(x) ≤ f(y) (Definition 6.41).
prove: f' ≥ 0 (or > 0 for strictly increasing) on the interval (Proposition 6.43).
trick: f' > 0 except at single points is still strictly increasing: x³ at 0.

## \mvt
show: f(b) − f(a) = f'(ξ)(b − a) for some ξ between a and b (Theorem 6.40).
trick: Used to turn a bound on f' into a bound on differences of f.

## \gradient
show: The vector of partial derivatives (Definition 7.4).
trick: ∇f(v0) u < 0 means u is a descent direction (Lemma 7.17).

## \matrixderivative
show: The matrix of partial derivatives: row i is the gradient of the i-th coordinate function (Proposition 7.9).

## \chainrule
show: The derivative of f ∘ g is the product of the matrix derivatives (Theorem 7.23).
trick: Along a curve: d/dt f(v0 + t u) = ∇f(v0 + t u) · u.

## \critxy
show: Solve ∇f = 0 (Definition 7.15), then the Hessian at each point (Theorem 8.12).
trick: Positive definite: local min; negative definite: local max; indefinite: saddle point (Definition 8.8).
trick: Only semi-definite: Theorem 8.12 says nothing; look at f along lines through the point.
trick: f convex: every critical point is a global minimum (Theorem 8.23, Theorem 6.13).

## \hessian
show: The matrix of second order partial derivatives (Definition 8.2); it is symmetric (Theorem 7.11).
trick: Symmetric reduction decides its definiteness (Proposition 8.11).

## \lagrange
show: Solve ∇f + λ∇g = 0 together with g = 0 (Theorem 7.39).
trick: λ is only a helper: the answer is the point and the value of f there.
trick: Compact constraint set (a circle, an ellipse): the max and min are among the candidates (Theorem 5.84).
trick: A line or plane is not compact: argue with convexity of f along the constraint (Theorem 6.13) instead.
trick: Distance to a point: minimize the squared distance |v − p|², then take the square root at the end.

## \compactopt
show: Candidates: critical points inside (Proposition 7.46), points on each edge (Lagrange, Theorem 7.39) and the corners; compare the values (Theorem 5.84).
trick: A linear f has its optimum at a corner: only the corners need checking.

## \convexopt
show: Convex f, convex constraint set: a local minimum is global (Theorem 6.13).
trick: Sublevel sets { g ≤ c } of convex g are convex (Lemma 4.29): this shows the constraint set is convex.
trick: Guess the solution, then check the first-order condition (Proposition 9.28).

## \kkt
show: λ_i ≥ 0, g_i ≤ 0, λ_i g_i = 0 and ∇f + Σ λ_i ∇g_i = 0 (Theorem 9.37).
trick: Go through which constraints are active: for each, either λ_i = 0 or g_i = 0.
trick: Start with all λ = 0: if the unconstrained minimum is feasible, you are done.
trick: Strictly feasible (Definition 9.36) is needed for the "only if" direction; without it KKT can fail.

## \svm
show: α, β with y_i(α^T v_i + β) ≥ 1, minimizing |α|² (Theorem 9.8).
disprove: Not separable: assume a separating line and add suitable inequalities to reach 0 < 0.
trick: Draw the points first: the closest pair from the two classes decides the margin.

## \perceptron
show: One weight per input and a bias b; check every row of the table.
trick: XOR is impossible: adding the inequalities gives a contradiction.

## \explain
show: The answer first, then the definition or theorem that gives it, applied to this case.

## \proof
show: Start from the definitions; write what is given and what is wanted.
trick: When a direct proof stalls, assume the opposite and look for a contradiction.

## \showthat
show: Check the claim on a small case first, then write the general argument.

## \iff
show: Both directions: p ⇒ q and q ⇒ p (Definition 1.18).
trick: Often one direction is easy and the other needs the real idea.

## \contradiction
show: Assume the negation and reach something false.
trick: Write the negation carefully: not (for all) = there exists one that fails.

## \induction
show: Base case, then p(n) ⇒ p(n + 1) (Theorem 1.86).
trick: In the step, find p(n) inside p(n + 1) and use it.

## \definition
show: Quote the definition exactly, then check each condition.

## \find
show: Set up the equation for the unknown and solve it; check the answer in the original problem.

## E2
trick: Finite sets and tables: try every element; the first one that breaks the claim is your example.

## E3
trick: For a claim about all numbers or all functions: try small integers or simple functions; one failing case disproves it.

## E4
trick: Inequalities that cannot all hold: add suitable positive multiples of them to reach 0 < 0 (Section 4.5).

## E5
trick: A linear system without solution: Gauss elimination ends in 0 = c with c ≠ 0 (Section 2.3).

## E6
trick: Matrices: one vector does it: u with u^T A u ≤ 0 (not positive definite) or v ≠ 0 with Av = 0 (not invertible).

## E7
trick: Not bounded / not open / not closed / no limit: give the bad point as a formula in R or ε.

## E8
trick: Not convex: two points and t = 1/2 where the inequality of Definition 4.26 fails.

## E9
trick: A point is not optimal: a feasible descent direction (Lemma 7.17), or no λ ≥ 0 in the KKT conditions (Theorem 9.37).

## E10
trick: Irrational / no rational root: assume a/b in lowest terms and show both a and b share a factor.

## E11
trick: Find the mistake: insert a number into each step; the first step that turns true into false is the wrong one.
