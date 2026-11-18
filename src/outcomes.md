# Possible endings

Every way an exercise of each kind can end, for any values in it.
`- [key] ending :: how you see it :: what you conclude :: route`
key: what the plugin's own computation reports (src/outcomes.js); route: the
start of the matching route's label ("-" for none). Book wording only.

## \truthtable
- [taut] true in every row :: the last column is all T :: the proposition always holds :: true in every row
- [contra] false in every row :: the last column is all F :: its negation always holds :: truth table for one proposition
- [equiv] two propositions agree :: same column in every row :: they are equivalent (Definition 1.18) :: two propositions are equivalent
- [differ] two propositions differ :: one row with different values :: not equivalent: that row is the example :: two propositions are equivalent

## \negate
- [neg] the negation, written out :: ¬ moved past every ∀, ∃, ∧, ∨, ⇒ :: what to prove when you show the statement is false :: step by step
- [true] the statement holds :: assuming its negation leads to something false :: the statement is true (Section 1.6.4) :: proof by contradiction
- [false] the statement is false :: one value for each ∃ in the negation works :: the negation holds (Remark 5.34) :: NOT true

## \setequal
- [eq] equal :: both inclusions hold :: A = B (Definition 1.27) :: double inclusion
- [sub] one inclusion only :: A ⊆ B but some b ∈ B is not in A :: A ≠ B, A ⊆ B :: NOT equal
- [neq] neither :: elements on both sides that the other lacks :: A ≠ B :: NOT equal

## \subsetproof
- [yes] subset :: every x ∈ A satisfies the condition of B :: A ⊆ B :: element chasing
- [no] not a subset :: one x ∈ A breaks the condition of B :: A ⊄ B :: not a subset

## \setbuilder
- [empty] empty set :: the condition has no solution :: the set is ∅ :: solve the condition
- [finite] finitely many elements :: the condition has finitely many solutions :: list them :: solve the condition
- [interval] an interval or a union of intervals :: an inequality in one variable :: write it with intervals :: solve the condition
- [region] a region in the plane :: an inequality in x and y :: describe or draw it :: write a described set

## \injective
- [inj] injective :: f(x) = f(y) forces x = y, or f' > 0 (f' < 0) on the whole interval :: f is injective (Definition 1.106) :: f(x) = f(y) implies x = y
- [notinj] not injective :: f(x) = f(y) has a solution with x ≠ y (even degree polynomials, f' changes sign) :: two points with the same value :: NOT injective
- [restrict] injective after restricting the domain :: f is strictly increasing on a smaller interval :: injective there, not on all of ℝ :: strictly increasing, via the derivative

## \surjective
- [surj] surjective :: f(x) = y can be solved for every y (odd degree polynomials, continuous and unbounded both ways) :: f is surjective (Definition 1.106) :: solve f(x) = y
- [notsurj] not surjective :: some y is never hit (x² never hits −1) :: that y is the example :: NOT surjective
- [codomain] depends on the codomain :: surjective onto the set of values, not onto ℝ :: name the codomain :: solve f(x) = y

## \bijective
- [bij] bijective :: injective and surjective, or an inverse function exists :: f is bijective (Definition 1.106) :: injective + surjective
- [notbij] not bijective :: one of the two fails :: say which one, with its example :: injective + surjective

## \inversefn
- [inv] an inverse exists :: y = f(x) has exactly one solution x for each y :: write x as a formula in y :: solve y = f(x)
- [noinv] no inverse :: two solutions for some y (f not injective) :: no inverse on this domain; restrict it :: solve y = f(x)

## \composition
- [both] both orders defined :: the values of g lie where f is defined and the other way around :: f ∘ g and g ∘ f, usually different :: plug in
- [one] only one order defined :: the values of one function leave the domain of the other :: only that composition makes sense :: plug in

## \preimage
- [empty] empty :: no x gives f(x) ∈ C :: f^{-1}(C) = ∅ :: solve the inequality
- [interval] an interval or union of intervals :: solve the inequality :: write the intervals :: solve the inequality
- [all] everything :: every x works :: f^{-1}(C) is the whole domain :: solve the inequality

## \irrational
- [irr] irrational :: lowest terms a/b lead to a common factor :: the number is not rational (Definition 1.54) :: lowest terms
- [rat] rational after all :: it simplifies to a fraction :: give the fraction :: it is rational after all

## \inequality
- [holds] holds for all values :: the difference is a square or a sum of squares :: the inequality holds :: difference is a square
- [from] holds from some n0 on :: it fails for small n, the induction step works after n0 :: holds for n ≥ n0 (Theorem 1.86) :: by induction
- [fails] fails for some values :: one value makes it false :: that value is the example :: NOT true for all values
- [equality] equality case :: the square is 0 exactly when ... :: say when equality holds :: difference is a square

## \sumind
- [ok] the formula holds for all n :: base case and step both work :: proved by induction (Theorem 1.86) :: sum formula
- [late] holds from n0 on :: the base case fails for small n :: start the induction at n0 :: inequality from some n0 on
- [wrong] the formula is wrong :: the base case or a small n fails :: that n shows it :: the formula is wrong

## \fakeproof
- [div0] division by zero :: a step divides by something that can be 0 :: that step is not allowed :: division by zero
- [onlyif] a ⇒ used as ⇔ :: a step that can't be reversed (squaring) :: the claimed equivalence fails :: ⇐ used where only ⇒ holds
- [ind] induction step fails for a small n :: the step uses two different elements that need n ≥ 2 :: the chain breaks at n = 1 → 2 :: induction step fails

## \gauss
- [unique] exactly one solution :: every unknown gets a value :: the solution (Theorem 2.8) :: unique solution
- [infinite] infinitely many solutions :: a free unknown is left :: the solutions in terms of the free unknown :: infinitely many solutions
- [none] no solution :: elimination gives 0 = c with c ≠ 0 :: the system has no solution :: no solutions
- [param] depends on a parameter :: a coefficient containing a becomes 0 for some a :: treat those values of a separately :: unique solution

## \polydiv
- [divides] g divides f :: remainder 0 :: f = q·g (Theorem 2.22) :: long division
- [rest] remainder ≠ 0 :: deg r < deg g, r ≠ 0 :: f = q·g + r :: long division
- [root] divisor x − α :: remainder f(α) :: α is a root exactly when f(α) = 0 (Proposition 2.23) :: divisor x - α

## \roots
- [rational] a whole-number or fraction root :: f(a) = 0 for a small a :: divide by x − a and continue (Proposition 2.23) :: guess a root
- [two] degree 2, two roots :: b² − 4ac > 0 :: the formula (2.12) gives both :: roots of a quadratic
- [double] degree 2, one double root :: b² − 4ac = 0 :: x = −b/(2a) :: roots of a quadratic
- [none] no real roots :: b² − 4ac < 0, or f > 0 everywhere :: no roots in ℝ :: roots of a quadratic
- [odd] odd degree :: degree is odd :: at least one root (Theorem 2.28) :: a root exists
- [quartic] even powers only :: f(x) = g(x²) :: t = x², solve, then x = ±√t :: substitution t = x^2
- [param] depends on a parameter :: the coefficients contain a :: the sign of b² − 4ac for each range of a :: with a parameter

## \interpolate
- [unique] n points, degree < n :: the x-values are different :: exactly one polynomial :: linear system in the coefficients
- [lower] the polynomial has lower degree :: the top coefficient comes out 0 :: the points lie on a lower degree curve :: linear system in the coefficients
- [clash] two points with the same x :: same x, different y :: no polynomial passes through both :: two points with the same x

## \matmul
- [ok] defined :: columns of A = rows of B :: AB entry by entry (Definition 3.4) :: compute AB entry by entry
- [undef] not defined :: the sizes don't match :: AB does not make sense :: NOT defined
- [noncomm] AB ≠ BA :: one entry differs :: the matrices don't commute :: does (A+B)^2
- [comm] AB = BA :: same product both ways :: (A + B)² = A² + 2AB + B² holds :: does (A+B)^2

## \matinv
- [inv] invertible :: Gauss on (A | I) reaches (I | B); for 2 × 2: D = ad − bc ≠ 0 :: A^{-1} = B (Definition 3.24) :: Gauss elimination on (A | I)
- [sing] not invertible :: a zero row appears, or Av = 0 for some v ≠ 0 :: no inverse: v = BAv = 0 would follow :: NOT invertible
- [param] depends on a parameter :: D contains a :: invertible exactly when D ≠ 0; check each a with D = 0 separately :: with parameters
- [notsq] not square :: A is m × n with m ≠ n :: no inverse in the sense of Definition 3.24 :: not square

## \matrixproof
- [holds] the identity holds :: entries agree, or the rules transform one side into the other :: proved :: entry by entry
- [fails] it fails :: one pair of matrices gives different sides :: that pair is the example :: NOT true in general

## \posdef
- [pd] positive definite :: every diagonal entry of D is > 0 :: u^T A u > 0 for u ≠ 0 (Proposition 3.43) :: symmetric reduction
- [psd] positive semi-definite, not definite :: entries of D are ≥ 0, at least one is 0 :: u^T A u ≥ 0, with u ≠ 0 giving 0 :: symmetric reduction
- [nd] negative definite :: every diagonal entry of D is < 0 :: u^T A u < 0 for u ≠ 0 :: symmetric reduction
- [nsd] negative semi-definite, not definite :: entries of D are ≤ 0, at least one is 0 :: u^T A u ≤ 0 :: symmetric reduction
- [ind] indefinite :: D has a positive and a negative entry :: one u with u^T A u > 0, one v with v^T A v < 0 (Definition 8.9) :: indefinite
- [param] depends on a parameter :: D contains a :: one case per range of a, and each value where an entry of D is 0 on its own :: with a parameter
- [notsym] not symmetric :: A^T ≠ A :: the definitions are for symmetric matrices :: not symmetric

## \formulate
- [lin] linear optimization problem :: objective and constraints are linear :: optimum at a corner (Section 4.4) :: linear optimization problem
- [elim] one equality constraint :: it can be solved for one variable :: insert it and optimize in fewer variables :: eliminate a variable
- [gen] general problem :: nonlinear objective or constraints :: min f(v) subject to v ∈ C (Definition 4.6) :: general form

## \line
- [line] a line :: two different points or a point and a direction u ≠ 0 :: { p + t u | t ∈ ℝ } (Definition 4.12) :: line through two points
- [same] the points coincide :: u = 0 :: no unique line :: the two points coincide
- [on] three points on one line :: one t fits every coordinate :: collinear :: do three points lie on one line
- [off] three points not on one line :: the coordinates need different t :: not collinear :: do three points lie on one line

## \convexset
- [convex] convex :: sublevel set of a convex function, intersection of convex sets, half-plane :: convex (Definition 4.21) :: sublevel set of a convex function
- [notconvex] not convex :: two points whose midpoint is outside :: that pair is the example :: NOT convex
- [empty] empty or a single point :: no or one element :: convex (nothing to check) :: by definition

## \convexfn
- [convex] convex :: f'' ≥ 0, or the Hessian is positive semi-definite everywhere :: convex (Corollary 6.55 / Theorem 8.25) :: one variable: f'' ≥ 0
- [strict] strictly convex :: f'' > 0, or the Hessian is positive definite everywhere :: convex, even strictly (Definition 6.1) :: one variable: f'' ≥ 0
- [notconvex] not convex :: f'' < 0 somewhere / Hessian not positive semi-definite at one point :: one bad point or pair of points :: NOT convex
- [region] convex only on part of the domain :: f'' ≥ 0 only for some x :: convex on that interval or open convex set :: one variable: f'' ≥ 0
- [linear] linear :: f'' = 0 everywhere :: convex but not strictly convex :: building blocks
- [param] depends on a parameter :: the Hessian contains a :: convex for the values of a where it is positive semi-definite :: with a parameter

## \strictconvex
- [strict] strictly convex :: f'' > 0 / positive definite Hessian everywhere :: strictly convex :: one variable: f'' > 0
- [flat] f'' = 0 only at single points :: like x⁴ at 0 :: still strictly convex (Remark 6.56) :: f'' ≥ 0 and = 0 only at isolated points
- [convexonly] convex, not strictly :: f is linear on some segment :: not strictly convex :: convex but NOT strictly convex
- [notconvex] not convex :: f'' < 0 somewhere :: not convex, so not strictly convex :: NOT convex

## \fm
- [solvable] has a solution :: elimination ends without a contradiction :: back-substitute to find one :: eliminate one variable
- [none] no solution :: elimination ends in 0 < c with c ≤ 0 :: the system has no solution :: show a system has no solution
- [unbounded] the objective is unbounded :: z only has bounds on one side :: no optimum :: linear optimization: add z
- [opt] optimum :: z has a bound on the optimizing side :: the bound is the optimal value :: linear optimization: add z

## \orthogonal
- [orth] orthogonal :: u · v = 0 :: u ⊥ v (Definition 5.1) :: orthogonal vectors
- [notorth] not orthogonal :: u · v ≠ 0 :: give the angle via the cosine :: angle / cosine similarity
- [parallel] parallel :: |u · v| = |u||v| :: equality in Cauchy–Schwarz (Theorem 5.24) :: angle / cosine similarity

## \leastsquares
- [exact] an exact solution exists :: Av = b can be solved :: least squares gives that solution :: first show Av = b has no exact solution
- [ls] no exact solution :: Av = b has none :: solve A^T A v = A^T b (Theorem 5.16) :: normal equations

## \bounded
- [bounded] bounded :: one R works for every element :: S ⊆ B(0, R) (Definition 5.33) :: find a radius R
- [unbounded] not bounded :: elements of arbitrarily large norm :: give that element as a formula in R (Remark 5.34) :: NOT bounded
- [empty] empty :: no elements :: bounded :: find a radius R

## \openset
- [open] open :: strict inequalities with continuous functions :: open (Proposition 5.68) :: preimage of an open set
- [notopen] not open :: a point of U on the edge (≤ or = in the condition) :: that point has no ball inside :: NOT open
- [both] open and closed :: ∅ or all of ℝ^d :: both :: ε-ball around every point

## \closedset
- [closed] closed :: ≤, ≥ or = with continuous functions :: closed (Proposition 5.69) :: preimage of a closed set
- [notclosed] not closed :: a point outside F with every ball meeting F (< in the condition) :: that point shows it :: NOT closed
- [neither] neither open nor closed :: a mix like [0, 1) :: say both: not open and not closed (Remark 5.48) :: NOT closed

## \compact
- [compact] compact :: closed and bounded :: compact (Definition 5.53) :: closed + bounded
- [unbounded] not compact: not bounded :: elements of arbitrarily large norm :: not compact :: NOT compact
- [notclosed] not compact: not closed :: bounded but with a strict inequality :: not compact :: NOT compact

## \boundary
- [compute] boundary and interior :: { g < c } has interior itself, boundary { g = c } :: write both sets :: compute both
- [open] S equals its interior :: no boundary point belongs to S :: S is open (Exercise 5.59) :: S is open iff

## \limit
- [cont] f is continuous at a :: no division by 0 at a :: the limit is f(a) (Definition 5.65) :: continuity: plug in
- [cancel] 0/0 that cancels :: numerator and denominator both 0 at a; divide out x − a :: the limit of what is left :: cancel the factor
- [none] does not exist :: different values from the left and right, or along two lines :: no limit :: limit does NOT exist
- [inf] grows without bound :: c/0 with c ≠ 0 :: no limit (the values get arbitrarily large) :: limit does NOT exist
- [paths] two variables: depends on the line :: y = m x gives a value depending on m :: no limit :: limit does NOT exist

## \continuous
- [cont] continuous everywhere :: built from polynomials, sin, e^x, +, ·, composition :: continuous (Proposition 5.74, 5.75) :: polynomials and known functions
- [quot] continuous where defined :: a quotient whose denominator is 0 at some points :: continuous away from those points (Proposition 5.75) :: built from continuous pieces
- [jump] not continuous at a point :: two formulas that disagree at the switch :: the limit differs from f(a) :: NOT continuous

## \ivt
- [root] a root in [a, b] :: f(a) and f(b) have opposite signs :: some ξ with f(ξ) = 0 (Theorem 5.81) :: sign change on [a, b]
- [value] a value c in between :: f(a) < c < f(b) :: apply it to f − c :: hitting a value c
- [nosign] no sign change found :: f(a), f(b) of the same sign :: no conclusion: try other points :: no sign change at a and b

## \evt
- [both] max and min exist :: compact set, continuous f :: both are attained (Theorem 5.84) :: compact + continuous
- [fail] may fail :: the set is not bounded or not closed :: the theorem does not apply; look for an example with no max or min :: Theorem 5.84 fails
- [convex] not compact, but convex :: a line or plane with f convex along it :: a critical point is the minimum (Theorem 6.13) :: not compact, but convex

## \derivative
- [diff] differentiable :: the rules apply everywhere :: f'(x) by product / chain rule :: with the rules
- [corner] not differentiable at a point :: slopes from the two sides differ (|x| at 0) :: no derivative there :: NOT differentiable
- [pattern] higher derivatives repeat :: sin, cos, e^x :: the n-th derivative by the pattern :: higher derivatives

## \newton
- [conv] the steps settle :: the change gets tiny :: approximate root / critical point :: one variable: iterate
- [zero] f'(x_n) = 0 :: division by 0 :: the method stops; pick another start :: it fails
- [cycle] the steps repeat :: x_2 = x_0 :: no convergence from this start :: it fails

## \crit
- [min] local minimum :: f'(x0) = 0, f''(x0) > 0 :: local min :: find critical points + second derivative
- [max] local maximum :: f'(x0) = 0, f''(x0) < 0 :: local max :: find critical points + second derivative
- [flat] f''(x0) = 0 :: second derivative test says nothing :: higher derivatives (Theorem 6.50) or the sign of f' :: higher derivative test
- [notext] not an extremum :: f' does not change sign (x³ at 0) :: critical point but no extremum (Exercise 6.38) :: a critical point that is NOT an extremum
- [none] no critical points :: f'(x) = 0 has no solution :: no local extrema inside; on [a, b] look at a and b :: global max/min on [a, b]
- [global] global on [a, b] :: compare values at critical points, a and b :: largest and smallest of those values (Theorem 5.84) :: global max/min on [a, b]
- [convex] f convex :: f'' ≥ 0 :: a critical point is the global min (Theorem 6.13) :: convex function

## \taylor
- [poly] the Taylor polynomial :: derivatives at x0 :: P(x) = Σ f^{(k)}(x0)/k! (x − x0)^k :: compute the Taylor polynomial
- [pattern] only even or odd terms :: derivatives at x0 repeat with zeros :: half the terms vanish :: pattern in the derivatives
- [exact] f is a polynomial of degree ≤ n :: higher derivatives are 0 :: P = f exactly :: compute the Taylor polynomial

## \increasing
- [strict] strictly increasing :: f' > 0 (or f' ≥ 0 with zeros only at single points) :: strictly increasing (Proposition 6.43) :: sign of f'
- [inc] increasing, not strictly :: f' ≥ 0 and f' = 0 on an interval :: increasing :: sign of f'
- [dec] decreasing :: f' ≤ 0 :: decreasing :: sign of f'
- [neither] neither :: f' changes sign :: increasing on some intervals, decreasing on others :: sign of f'

## \mvt
- [xi] the point ξ :: solve f'(ξ) = (f(b) − f(a))/(b − a) :: ξ in (a, b) (Theorem 6.40) :: find the point ξ
- [bound] a bound :: |f'| ≤ M on the interval :: |f(b) − f(a)| ≤ M|b − a| :: bound a difference
- [const] constant :: f' = 0 everywhere :: f is constant :: f' = 0 everywhere

## \gradient
- [zero] gradient 0 :: every partial derivative is 0 at the point :: a critical point (Definition 7.15) :: compute partials
- [descent] a descent direction :: ∇f(v0) u < 0 :: f decreases along u (Lemma 7.17) :: descent direction
- [steep] steepest direction :: u = −∇f(v0) :: the fastest decrease :: descent direction

## \matrixderivative
- [lin] linear map :: f(v) = Av :: the derivative is A :: linear map
- [general] general :: coordinate functions :: the matrix of partial derivatives (Proposition 7.9) :: matrix of partial derivatives

## \chainrule
- [prod] the product of derivatives :: f ∘ g with both differentiable :: (f ∘ g)' = f'(g(v)) g'(v) (Theorem 7.23) :: matrix product of derivatives
- [check] check by substituting :: write f(g(v)) out :: the same derivative :: check by substituting first

## \critxy
- [min] local minimum :: ∇f = 0, Hessian positive definite :: local min (Theorem 8.12) :: gradient = 0, then Hessian test
- [max] local maximum :: ∇f = 0, Hessian negative definite :: local max :: gradient = 0, then Hessian test
- [saddle] saddle point :: Hessian indefinite :: saddle point (Definition 8.8) :: saddle point: two directions
- [semi] Hessian only semi-definite :: a 0 on the diagonal of D :: Theorem 8.12 says nothing; look at f along lines :: Hessian test inconclusive
- [global] f convex :: Hessian positive semi-definite everywhere :: a critical point is a global min (Theorem 6.13) :: convex function
- [none] no critical point :: ∇f = 0 has no solution :: no local extrema :: gradient = 0, then Hessian test
- [many] infinitely many critical points :: ∇f = 0 is a whole line :: classify along that line :: gradient = 0, then Hessian test
- [param] depends on a parameter :: the Hessian contains a :: min / max / saddle for each range of a :: with a parameter

## \hessian
- [pd] positive definite at v0 :: D > 0 :: local min :: classify one critical point
- [nd] negative definite at v0 :: D < 0 :: local max :: classify one critical point
- [ind] indefinite at v0 :: D has both signs :: saddle point :: classify one critical point
- [semi] semi-definite :: a 0 in D :: no conclusion from Theorem 8.12 :: classify one critical point
- [param] depends on a parameter :: D contains a :: the cases in a :: depends on a parameter

## \lagrange
- [compact] constraint set compact (circle, ellipse) :: g = 0 is closed and bounded :: largest and smallest candidate values are the max and min (Theorem 5.84) :: one constraint
- [line] constraint a line or plane :: g is linear :: not compact: convexity of f along it gives the min (Theorem 6.13) :: linear constraint
- [unbounded] no max (or no min) :: f grows without bound along the constraint :: only the other one exists :: linear constraint
- [many] several candidates :: the system has several solutions :: compare the f-values :: one constraint
- [gradzero] ∇g = 0 at a point of g = 0 :: Theorem 7.39 does not cover that point :: check it separately :: ∇g = 0 somewhere on g = 0
- [distance] distance to a point :: f = |v − p|² :: the closest point; the distance is √(min f) (Definition 5.1) :: linear constraint

## \compactopt
- [interior] optimum inside :: a critical point with the largest / smallest value :: compare with the boundary (Proposition 7.46) :: interior critical points
- [edge] optimum on an edge :: Lagrange or one variable on that edge :: compare all candidates :: interior critical points
- [corner] optimum at a corner :: linear f, or corners win the comparison :: the corner value (Section 4.4) :: linear objective

## \convexopt
- [opt] optimum found :: the first-order condition holds at v0 :: v0 is optimal (Proposition 9.28, Theorem 6.13) :: first-order condition
- [unique] unique optimum :: f strictly convex :: only one optimal point (Theorem 6.13) :: first-order condition
- [notconvex] not a convex problem :: f or a constraint is not convex :: the convex theory does not apply :: show it is a convex optimization problem

## \kkt
- [inner] all λ = 0 :: the unconstrained minimum is feasible :: it is the optimum (Exercise 9.43) :: all λ = 0
- [active] some constraints active :: the case with λ ≥ 0 and all g ≤ 0 :: the KKT point is the optimum (Theorem 9.37) :: KKT with case analysis
- [notsf] not strictly feasible :: no point has all g_i < 0 :: KKT may fail (Definition 9.36) :: not strictly feasible
- [none] no feasible point :: the constraints contradict each other :: no optimum :: no feasible point

## \svm
- [sep] separable :: a line (hyperplane) with every point on its side :: the optimal hyperplane and its margin (Theorem 9.8) :: optimal separating hyperplane
- [notsep] not separable :: adding the inequalities gives 0 < 0 :: no separating line :: NOT separable

## \perceptron
- [gate] the gate can be made :: weights with every row right :: give w1, w2, b :: choose weights for a logic gate
- [xor] impossible :: the inequalities contradict each other :: no weights exist :: impossible (XOR)
