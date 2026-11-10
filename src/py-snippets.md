# Python computation snippets

Type `\name` inside a ```python block. Inputs (@in) come from the note's ```vars block when one fits; otherwise a Tab placeholder.
Never start a body line with "# " (that ends the snippet); put comments after code.

## \truthtable — truth table of a proposition (Def 1.10)
@uses sympy
@in P any sp.Implies(p, q)
@sym p q
@ex sp.Implies(p, q) := sp.Implies(p, q)
from sympy.logic.boolalg import truth_table
print($SYMS, "| P")
for row, value in truth_table(P, $SYMS):
    print(row, "|", int(bool(value)))

## \equivalent — are two propositions logically equivalent?
@uses sympy
@in P any sp.Implies(p, q)
@in Q any sp.Or(sp.Not(p), q)
@sym p q
@ex sp.Implies(p, q) := sp.Implies(p, q)
@ex sp.Or(sp.Not(p), q) := sp.Or(sp.Not(p), q)
print("P <=> Q always:", not sp.satisfiable(sp.Not(sp.Equivalent(P, Q))))
print("simplified P:", sp.simplify_logic(P), "  simplified Q:", sp.simplify_logic(Q))

## \sets — intersection, union, difference, subset of two sets (Def 1.27)
@in A set
@in B set
print("A & B =", A & B)
print("A | B =", A | B)
print("A \\ B =", A - B, "  B \\ A =", B - A)
print("A ^ B =", A ^ B)
print("A <= B:", A <= B, "  B <= A:", B <= A, "  A = B:", A == B)
print("|A | B| = |A| + |B| - |A & B|:", len(A | B) == len(A) + len(B) - len(A & B))

## \cartesian — Cartesian product A × B and the power set
@uses itertools
@in A set
@in B set
AxB = set(itertools.product(A, B))
print("A × B =", sorted(AxB), " |A × B| =", len(AxB))
P = [set(c) for k in range(len(A) + 1) for c in itertools.combinations(sorted(A), k)]
print("P(A) =", P, " |P(A)| =", len(P))

## \setbuilder — list a set-builder set {x in U | condition}
@in U set
@ex condition on x := x % 2 == 0
S = {x for x in U if {{condition on x}}}
print("S =", sorted(S))

## \intersection — where two things meet
### two curves y = f(x), y = g(x)
@uses sympy
@in f expr
@in g expr
@sym x
pts = sp.solve(sp.Eq(f, g), $SYM)
real = [p for p in pts if p.is_real]
print("x-values (exact):", real if len(str(real)) < 300 else "long, see decimals")
print("points (decimal):", [(sp.N(p, 6), sp.N(f.subs($SYM, p), 6)) for p in real])
### two sets
@in A set
@in B set
print("A & B =", A & B, "  disjoint:", not (A & B))
### two lines in R^d: p + t*u and q + s*v
@uses sympy
@in p vector
@in u vector
@in q vector
@in v vector
t, s = sp.symbols('t s')
sol = sp.solve(list(p + t*u - (q + s*v)), [t, s], dict=True)
print("solutions:", sol)
for d in sol:
    print("intersection point:", list((p + t*u).subs(d)))
if not sol:
    print("no intersection (parallel or skew)")
### line p + t*u and plane n*x = c
@uses sympy
@in p vector
@in u vector
@in n vector
@ex c := 1
c = {{c}}
t = sp.symbols('t')
sol = sp.solve(sp.Eq(n.dot(p + t*u), c), t)
print("t =", sol, " points:", [list(p + tt*u) for tt in sol])
### system of equations
@uses sympy
@in f expr
@in g expr
@sym x y
sol = sp.solve([sp.Eq(f, 0), sp.Eq(g, 0)], $SYMS, dict=True)
print("exact:", sol if len(str(sol)) < 300 else "long, see decimals")
print("decimal:", [{k: sp.N(v, 6) for k, v in d.items()} for d in sol])

## \injective — is f injective? solve f(a) = f(b) (Def 1.106)
@uses sympy
@in f expr
@sym x
a, b = sp.symbols('a b', real=True)
sol = sp.solve(sp.Eq(f.subs($SYM, a), f.subs($SYM, b)), b)
print("f(a) = f(b) gives b =", sol, "  injective iff only b = a:", sol == [a])

## \surjective — is f surjective? solve y = f(x) for x (Def 1.106)
@uses sympy
@in f expr
@sym x
y_ = sp.symbols('y_')
pre = sp.solve(sp.Eq(f, y_), $SYM)
print("x with f(x) = y:", pre)
print("range over the reals:", sp.calculus.util.function_range(f, $SYM, sp.S.Reals))

## \inversefn — inverse function: solve y = f(x) for x
@uses sympy
@in f expr
@sym x
y_ = sp.symbols('y_')
inv = sp.solve(sp.Eq(f, y_), $SYM)
print("candidates for f^-1(y):", inv)
for h in inv:
    print("check f(f^-1(y)) =", sp.simplify(f.subs($SYM, h)))

## \composition — f∘g and g∘f
@uses sympy
@in f expr
@in g expr
@sym x
print("(fog)(x) =", sp.simplify(f.subs($SYM, g)))
print("(gof)(x) =", sp.simplify(g.subs($SYM, f)))

## \preimage — preimage f^-1(S) of an interval (Def 1.115)
@uses sympy
@in f expr
@sym x
@ex lower bound := 0
@ex upper bound := 4
lo, hi = {{lower bound}}, {{upper bound}}
pre = sp.solveset(f >= lo, $SYM, sp.S.Reals).intersect(sp.solveset(f <= hi, $SYM, sp.S.Reals))
print("f^-1([lo, hi]) =", pre)

## \sumind — check a sum formula by induction (Thm 1.86)
@uses sympy
@ex term with k := k**3
@ex closed formula in n := (n*(n + 1)/2)**2
k, n = sp.symbols('k n', integer=True, positive=True)
term = {{term with k}}
formula = {{closed formula in n}}
print("base case n=1:", term.subs(k, 1), "=", formula.subs(n, 1))
print("step: formula(n) + term(n+1) - formula(n+1) =", sp.simplify(formula + term.subs(k, n + 1) - formula.subs(n, n + 1)))
print("sympy's own sum:", sp.factor(sp.summation(term, (k, 1, n))))

## \gauss — solve Ax = b by Gauss elimination (Sec 2.3)
@uses sympy
@in A matrix
@in b vector
M = A.row_join(b)
R, pivots = M.rref()
print("augmented [A | b]:", M.tolist())
print("reduced row echelon form:", R.tolist(), " pivots:", pivots)
xs = sp.symbols(f'x1:{A.cols + 1}')
print("solution set:", sp.linsolve((A, b), *xs))

## \linsolve — solve Ax = b (exact and numeric)
@uses sympy numpy
@in A matrix
@in b vector
xs = sp.symbols(f'x1:{A.cols + 1}')
print("exact:", sp.linsolve((A, b), *xs))
if A.is_square and A.det() != 0:
    print("numeric:", np.linalg.solve(np.array(A, dtype=float), np.array(b, dtype=float).ravel()))

## \polydiv — polynomial division p = q·k + r (Thm 2.22)
@uses sympy
@in p expr
@in q expr
@sym x
k_, r_ = sp.div(p, q, $SYM)
print("quotient:", k_, "  remainder:", r_)
print("check q*k + r - p =", sp.expand(q*k_ + r_ - p))

## \roots — roots and factorization of a polynomial
@uses sympy
@in p expr
@sym x
print("factored:", sp.factor(p))
print("roots (with multiplicity):", sp.roots(sp.Poly(p, $SYM)))
print("real roots:", sp.real_roots(sp.Poly(p, $SYM)))
print("numeric:", sp.Poly(p, $SYM).nroots())

## \interpolate — polynomial through given points (Sec 2.5)
@uses sympy
@in pts points
@sym x
P = sp.expand(sp.interpolate(pts, $SYM))
print("interpolating polynomial:", P)
print("check:", [(a, P.subs($SYM, a), b) for a, b in pts])

## \matmul — matrix arithmetic: products, transpose, powers
@uses sympy
@in A matrix
@in B matrix
print("A*B =", (A*B).tolist() if A.cols == B.rows else "undefined")
print("B*A =", (B*A).tolist() if B.cols == A.rows else "undefined")
print("A + B =", (A + B).tolist() if A.shape == B.shape else "undefined")
print("A^T =", A.T.tolist())
if A.is_square:
    print("A^2 =", (A**2).tolist())

## \matinv — inverse matrix, determinant, check (Ch3)
@uses sympy
@in A matrix
d = A.det()
print("det A =", d)
if d != 0:
    Ainv = A.inv()
    print("A^-1 =", Ainv.tolist())
    print("A*A^-1 = I:", A*Ainv == sp.eye(A.rows))
else:
    print("not invertible")

## \det — determinant (and by cofactor expansion along row 1)
@uses sympy
@in A matrix
print("det A =", A.det())
print("cofactor expansion row 1:", sum(A[0, j]*A.cofactor(0, j) for j in range(A.cols)))

## \rank — rank, null space, column space
@uses sympy
@in A matrix
print("rank A =", A.rank())
print("null space:", [list(v) for v in A.nullspace()])
print("column space:", [list(v) for v in A.columnspace()])
print("rref:", A.rref()[0].tolist())

## \eigen — eigenvalues, eigenvectors, diagonalization
@uses sympy
@in A matrix
print("characteristic polynomial:", sp.factor(A.charpoly().as_expr()))
print("eigenvalues {lambda: multiplicity}:", A.eigenvals())
for lam, mult, vecs in A.eigenvects():
    print("lambda =", lam, " eigenvectors:", [list(v) for v in vecs])
if A.is_diagonalizable():
    P, D = A.diagonalize()
    print("P =", P.tolist(), " D =", D.tolist())

## \posdef — (semi)definiteness of a symmetric matrix (Ch3/8)
@uses sympy
@in A matrix
print("symmetric:", A == A.T)
n_ = A.rows
minors = [A[:k, :k].det() for k in range(1, n_ + 1)]
print("leading principal minors:", minors)
print("eigenvalues:", A.eigenvals())
print("positive definite:", A.is_positive_definite)
print("positive semidefinite:", A.is_positive_semidefinite)
print("negative definite:", A.is_negative_definite)
print("negative semidefinite:", A.is_negative_semidefinite)
print("indefinite:", A.is_indefinite)

## \quadform — quadratic form x^T A x and back
@uses sympy
@in A matrix
xs = sp.Matrix(sp.symbols(f'x1:{A.rows + 1}'))
Q = sp.expand((xs.T*A*xs)[0])
print("x^T A x =", Q)
print("symmetric matrix of Q:", (sp.hessian(Q, list(xs))/2).tolist())

## \line — line through two points in R^d, is a point on it? (Def 4.12)
@uses sympy
@in p vector
@in q vector
@in r vector
t = sp.symbols('t')
L = p + t*(q - p)
print("line: x(t) =", list(L))
sol = sp.solve(list(L - r), t, dict=True)
print("r on the line:", bool(sol), sol)

## \convexset — test convexity of {x | g_i(x) <= 0} on random pairs (Def 4.21)
@uses numpy
@ex conditions := x[0]**2 + x[1]**2 <= 1
inside = lambda x: {{conditions}}
rng = np.random.default_rng(0)
pts = [p for p in rng.uniform(-2, 2, (4000, 2)) if inside(p)]
bad = None
for _ in range(4000):
    a, b = pts[rng.integers(len(pts))], pts[rng.integers(len(pts))]
    lam = rng.uniform()
    if not inside(lam*a + (1 - lam)*b):
        bad = (a, b, lam)
        break
print("counterexample found:" if bad else "no counterexample in 4000 tries (looks convex)", bad or "")

## \convexfn — is f convex? second derivative / Hessian (Ch4/6/8)
### one variable: f'' >= 0
@uses sympy
@in f expr
@sym x
f2 = sp.simplify(sp.diff(f, $SYM, 2))
print("f'' =", f2)
print("where f'' < 0:", sp.solveset(f2 < 0, $SYM, sp.S.Reals), " (empty set means convex on R)")
### several variables: Hessian positive semidefinite everywhere
@uses sympy
@in f expr
@sym x y
H = sp.simplify(sp.hessian(f, $SYMS))
print("H =", H.tolist())
print("leading principal minors:", [sp.factor(H[:k, :k].det()) for k in range(1, H.rows + 1)])
print("all principal minors >= 0 needed for PSD; eigenvalues:", {sp.simplify(k): v for k, v in H.eigenvals().items()})
print("sympy PSD for all x:", H.is_positive_semidefinite)

## \strictconvex — strictly convex: f'' > 0 / Hessian positive definite (Def 6.1)
@uses sympy
@in f expr
@sym x y
H = sp.simplify(sp.hessian(f, $SYMS))
print("H =", H.tolist())
print("leading principal minors (all > 0 => PD):", [sp.factor(H[:k, :k].det()) for k in range(1, H.rows + 1)])
print("positive definite for all x:", H.is_positive_definite)

## \fm — Fourier–Motzkin elimination of a variable (Sec 4.5)
@uses sympy
@ex inequalities as expr <= 0 := [x + y - 4, -x, -y, x - 2*y - 1]
@sym x y
ineqs = {{inequalities as expr <= 0}}
def fm_eliminate(ineqs, v):
    lower, upper, rest = [], [], []
    for e in ineqs:
        c = sp.expand(e).coeff(v)
        if c == 0:
            rest.append(e)
        else:
            bound = sp.simplify(-(e - c*v)/c)
            (upper if c > 0 else lower).append(bound)
    return rest + [sp.simplify(lo - up) for lo in lower for up in upper], lower, upper
new, lower, upper = fm_eliminate(ineqs, $SYM)
print("lower bounds for", $SYM, ":", lower, "  upper bounds:", upper)
print("after eliminating (each <= 0):", new)

## \lp — linear program with scipy linprog (Ch4)
@uses numpy scipy
@ex objective c (minimize c*x) := [-1, -2]
@ex A_ub := [[1, 1], [1, -1]]
@ex b_ub := [4, 2]
c = np.array({{objective c (minimize c*x)}})
A_ub = np.array({{A_ub}})
b_ub = np.array({{b_ub}})
res = opt.linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=[(0, None)]*len(c))
print("status:", res.message)
print("optimal x:", res.x, "  optimal value:", res.fun)

## \dot — dot product, norm, angle, orthogonality (Ch5)
@uses sympy
@in u vector
@in v vector
print("u*v =", u.dot(v))
print("|u| =", sp.sqrt(u.dot(u)), "  |v| =", sp.sqrt(v.dot(v)))
print("angle =", sp.simplify(sp.acos(u.dot(v)/(sp.sqrt(u.dot(u))*sp.sqrt(v.dot(v))))))
print("orthogonal:", u.dot(v) == 0)

## \projection — projection of u onto v, and the orthogonal part (Ch5)
@uses sympy
@in u vector
@in v vector
proj = (u.dot(v)/v.dot(v))*v
print("proj_v(u) =", list(proj))
print("u - proj (perp v) =", list(u - proj), "  check *v =", sp.simplify((u - proj).dot(v)))

## \gramschmidt — orthonormal basis by Gram–Schmidt
@uses sympy
@in A matrix
cols = [A.col(j) for j in range(A.cols)]
print("orthonormal basis of the columns:", [list(w) for w in sp.GramSchmidt(cols, True)])

## \leastsquares — best fit by least squares (Thm 5.16)
### solve A^T A x = A^T b
@uses sympy
@in A matrix
@in b vector
xhat = (A.T*A).solve(A.T*b)
print("normal equations A^T A x = A^T b:", (A.T*A).tolist(), "x =", (A.T*b).tolist())
print("least squares solution:", list(xhat))
print("residual |Ax - b|^2 =", sp.simplify(((A*xhat - b).T*(A*xhat - b))[0]))
### fit a line y = αx + β through points
@uses numpy
@in pts points
xs_, ys_ = np.array([p[0] for p in pts], float), np.array([p[1] for p in pts], float)
M = np.column_stack([xs_, np.ones_like(xs_)])
(alpha, beta), *_ = np.linalg.lstsq(M, ys_, rcond=None)
print(f"y = {alpha:.4f} x + {beta:.4f}")
print("normal equations agree:", np.allclose(np.linalg.solve(M.T @ M, M.T @ ys_), [alpha, beta]))

## \limit — limits, one-sided and along paths (Def 5.62)
### one variable
@uses sympy
@in f expr
@sym x
@ex point := 0
a = {{point}}
print("limit:", sp.limit(f, $SYM, a), "  from right:", sp.limit(f, $SYM, a, '+'), "  from left:", sp.limit(f, $SYM, a, '-'))
### two variables at (0, 0): along lines y = m x and parabolas
@uses sympy
@in f expr
@sym x y
s1, s2 = $SYMS
m, r, th = sp.symbols('m r th')
print("along y = m x:", sp.simplify(sp.limit(f.subs(s2, m*s1), s1, 0)))
print("along y = x^2:", sp.limit(f.subs(s2, s1**2), s1, 0))
print("in polar coordinates (r -> 0):", sp.simplify(f.subs({s1: r*sp.cos(th), s2: r*sp.sin(th)}, simultaneous=True)))
### sequence as n -> ∞
@uses sympy
@ex a_n := (1 + 1/n)**n
n = sp.symbols('n', positive=True, integer=True)
print("lim a_n =", sp.limit({{a_n}}, n, sp.oo))

## \continuous — continuity at a point (Def 5.65)
@uses sympy
@in f expr
@sym x
@ex point := 0
a = {{point}}
L, R = sp.limit(f, $SYM, a, '-'), sp.limit(f, $SYM, a, '+')
val = f.subs($SYM, a)
print("left:", L, " right:", R, " value:", val, " continuous:", L == R == val)

## \ivt — a root exists, find it by bisection (Thm 5.81)
@uses sympy
@in f expr
@sym x
@ex a := -10
@ex b := 10
F = sp.lambdify($SYM, f)
a, b = {{a}}, {{b}}
print(f"f(a) = {F(a)}, f(b) = {F(b)}, opposite signs: {F(a)*F(b) < 0}")
for _ in range(100):
    m = (a + b)/2
    a, b = (a, m) if F(a)*F(m) <= 0 else (m, b)
print("root ~", (a + b)/2)

## \evt — max and min on [a, b]: critical points + endpoints (Thm 5.84)
@uses sympy
@in f expr
@sym x
@ex a := -1
@ex b := 2
a, b = {{a}}, {{b}}
crit = [c for c in sp.solve(sp.diff(f, $SYM), $SYM) if c.is_real and a <= c <= b]
cands = {c: f.subs($SYM, c) for c in [a, b, *crit]}
print("candidates:", cands)
print("max at", max(cands, key=lambda c: cands[c]), " min at", min(cands, key=lambda c: cands[c]))

## \derivative — derivatives, at a point, tangent line (Ch6)
@uses sympy
@in f expr
@sym x
@ex point := 1
a = {{point}}
d1 = sp.diff(f, $SYM)
print("f' =", sp.simplify(d1), "  f'' =", sp.simplify(sp.diff(f, $SYM, 2)))
print("f'(a) =", d1.subs($SYM, a))
print("tangent: y =", sp.expand(f.subs($SYM, a) + d1.subs($SYM, a)*($SYM - a)))

## \implicit — implicit differentiation dy/dx of F(x, y) = 0
@uses sympy
@in F expr
@sym x y
s1, s2 = $SYMS
print("dy/dx =", sp.simplify(sp.idiff(F, s2, s1)))

## \newton — Newton–Raphson for f(x) = 0 (Sec 6.3.5)
@uses sympy
@in f expr
@sym x
@ex start x0 := 1.0
F, dF = sp.lambdify($SYM, f), sp.lambdify($SYM, sp.diff(f, $SYM))
xk = {{start x0}}
for k in range(20):
    step = F(xk)/dF(xk)
    xk -= step
    print(k + 1, xk)
    if abs(step) < 1e-12:
        break

## \crit — critical points and extrema, one variable (Ch6)
@uses sympy
@in f expr
@sym x
f1, f2 = sp.diff(f, $SYM), sp.diff(f, $SYM, 2)
for c in sp.solve(f1, $SYM):
    s2 = sp.simplify(f2.subs($SYM, c))
    kind = "local min" if s2.is_positive else "local max" if s2.is_negative else "test inconclusive (f''=0)"
    print("x =", c, " f =", sp.simplify(f.subs($SYM, c)), " f'' =", s2, "->", kind)

## \taylor — Taylor polynomial of degree n at a (Thm 6.50)
@uses sympy
@in f expr
@sym x
@ex point a := 0
@ex degree n := 4
a, n = {{point a}}, {{degree n}}
T = sum(sp.diff(f, $SYM, k).subs($SYM, a)/sp.factorial(k)*($SYM - a)**k for k in range(n + 1))
print("T_n(x) =", sp.expand(T))
print("sympy series:", sp.series(f, $SYM, a, n + 1))

## \monotone — where f is increasing / decreasing (Def 6.41)
@uses sympy
@in f expr
@sym x
d = sp.diff(f, $SYM)
print("f' =", sp.factor(d))
print("increasing where f' > 0:", sp.solveset(d > 0, $SYM, sp.S.Reals))
print("decreasing where f' < 0:", sp.solveset(d < 0, $SYM, sp.S.Reals))

## \mvt — mean value theorem: find c with f'(c) = (f(b) - f(a))/(b - a) (Thm 6.40)
@uses sympy
@in f expr
@sym x
@ex a := 0
@ex b := 2
a, b = {{a}}, {{b}}
slope = (f.subs($SYM, b) - f.subs($SYM, a))/(b - a)
cs = [c for c in sp.solve(sp.Eq(sp.diff(f, $SYM), slope), $SYM) if c.is_real and a < c < b]
print("secant slope:", slope, "  c in (a, b):", cs)

## \lhopital — limit by l'Hôpital: f/g at a
@uses sympy
@in f expr
@in g expr
@sym x
@ex point := 0
a = {{point}}
print("f(a), g(a) =", f.subs($SYM, a), g.subs($SYM, a))
print("f'/g' at a ->", sp.limit(sp.diff(f, $SYM)/sp.diff(g, $SYM), $SYM, a), "  direct:", sp.limit(f/g, $SYM, a))

## \gradient — partial derivatives, gradient, directional derivative (Def 7.4)
@uses sympy
@in f expr
@sym x y
@ex point := [1, 1]
@ex direction := [1, 0]
grad = sp.Matrix([sp.diff(f, s) for s in $SYMS])
pt = dict(zip($SYMS, {{point}}))
print("gradf =", list(grad))
print("gradf(point) =", list(grad.subs(pt)))
d = sp.Matrix({{direction}})
print("directional derivative along d/|d|:", sp.simplify((grad.subs(pt).T*d)[0]/d.norm()))

## \compgraph — computational graph of f, forward + backward pass, gradient by backpropagation
### sympy: graph, forward pass, backward pass (by hand, every step printed)
@uses sympy
@in f expr
@sym x y
@ex point := [1, 1]
syms = list($SYMS)
pt = dict(zip(syms, {{point}}))
order, name, k = [], {}, 0
def visit(e):
    global k
    if e in name or e.is_Number:
        return
    for a in e.args:
        visit(a)
    if e.is_Symbol:
        name[e] = str(e)
    else:
        k += 1
        name[e] = "v%d" % k
    order.append(e)
visit(f)
show = lambda a: sp.Symbol(name[a]) if a in name else a
print("Computational graph, forward pass at", {{point}})
for e in order:
    if e.is_Symbol:
        print(f"  {name[e]} = {e.subs(pt)}   (input)")
    else:
        print(f"  {name[e]} = {e.func(*[show(a) for a in e.args], evaluate=False)} = {e.subs(pt)}   ({e.func.__name__})")
print("f =", name[f], "=", f.subs(pt))
adj = {e: sp.Integer(0) for e in order}
adj[f] = sp.Integer(1)
print("Backward pass, adjoint adj[v] = df/dv, chain rule from f down to the inputs:")
for e in reversed(order):
    if e.is_Symbol:
        continue
    ds = [sp.Dummy() for _ in e.args]
    for i, a in enumerate(e.args):
        if a.is_Number:
            continue
        local = sp.diff(e.func(*ds), ds[i]).subs(dict(zip(ds, e.args))).subs(pt)
        adj[a] += adj[e] * local
        print(f"  d{name[e]}/d{name[a]} = {local}   adj[{name[a]}] += {adj[e]}*{local}")
print("gradf(point) by backpropagation =", [adj.get(s, 0) for s in syms])
print("check: gradf =", [sp.diff(f, s) for s in syms], "->", [sp.diff(f, s).subs(pt) for s in syms])
print()
print("Drawn graph: copy the lines below into a mermaid code block in the note")
print("graph LR")
for e in order:
    label = str(e) if e.is_Symbol else f"{name[e]} = {e.func(*[show(a) for a in e.args], evaluate=False)}"
    print(f'  n_{name[e]}["{label}<br/>value {e.subs(pt)}, adj {adj[e]}"]')
for e in order:
    for a in e.args:
        if a in name:
            print(f"  n_{name[a]} --> n_{name[e]}")
### pytorch: autograd (run in Google Colab)
@uses sympy torch
@in f expr
@sym x y
@ex point := [1, 1]
f_t = sp.lambdify($SYMS, f, modules=[{"sin": torch.sin, "cos": torch.cos, "exp": torch.exp, "log": torch.log, "sqrt": torch.sqrt}])
inputs = [torch.tensor(float(c), requires_grad=True) for c in {{point}}]
out = f_t(*inputs)
out.backward()
print("f(point) =", out.item())
print("gradf(point) by torch autograd =", [t.grad.item() for t in inputs])

## \tangentplane — tangent plane of z = f(x, y) at a point
@uses sympy
@in f expr
@sym x y
@ex point := [1, 1]
pt = dict(zip($SYMS, {{point}}))
z = f.subs(pt) + sum(sp.diff(f, s).subs(pt)*(s - pt[s]) for s in $SYMS)
print("z =", sp.expand(z))

## \jacobian — Jacobian matrix of a vector function (Prop 7.9)
@uses sympy
@in F vector
@sym x y
J = F.jacobian($SYMS)
print("J =", J.tolist())
if J.is_square:
    print("det J =", sp.simplify(J.det()))

## \chainrule — chain rule: D(F∘G) = DF(G)·DG (Thm 7.23)
@uses sympy
@in F vector
@in G vector
@sym x y
JF, JG = F.jacobian($SYMS), G.jacobian($SYMS)
lhs = sp.simplify(F.subs(dict(zip($SYMS, G)), simultaneous=True).jacobian($SYMS))
rhs = sp.simplify(JF.subs(dict(zip($SYMS, G)), simultaneous=True)*JG)
print("D(FoG) =", lhs.tolist())
print("chain rule agrees:", sp.simplify(lhs - rhs) == sp.zeros(*lhs.shape))

## \critxy — critical points + classification with the Hessian (Ch7/8)
@uses sympy
@in f expr
@sym x y
grad = [sp.diff(f, s) for s in $SYMS]
H = sp.hessian(f, $SYMS)
for p in sp.solve(grad, $SYMS, dict=True):
    Hp = H.subs(p)
    if Hp.is_positive_definite: kind = "local min (H positive definite)"
    elif Hp.is_negative_definite: kind = "local max (H negative definite)"
    elif Hp.is_indefinite: kind = "saddle point (H indefinite)"
    else: kind = "inconclusive (H semidefinite)"
    print(p, " f =", sp.simplify(f.subs(p)), " H =", Hp.tolist(), "->", kind)

## \hessian — Hessian matrix, at a point, definiteness (Def 8.2)
### at a point
@uses sympy
@in f expr
@sym x y
@ex point := [0, 0]
H = sp.hessian(f, $SYMS)
print("H =", H.tolist())
Hp = H.subs(dict(zip($SYMS, {{point}})))
print("H(point) =", Hp.tolist(), " eigenvalues:", Hp.eigenvals())
print("positive definite:", Hp.is_positive_definite, " positive semidefinite:", Hp.is_positive_semidefinite)
print("negative definite:", Hp.is_negative_definite, " indefinite:", Hp.is_indefinite)
### for all x: positive (semi)definite everywhere?
@uses sympy
@in f expr
@sym x y
H = sp.simplify(sp.hessian(f, $SYMS))
print("H =", H.tolist())
minors = [sp.factor(H[:k, :k].det()) for k in range(1, H.rows + 1)]
print("leading principal minors:", minors)
def where_nonpositive(m_):
    if not m_.free_symbols:
        return sp.S.EmptySet if m_ > 0 else sp.S.Reals
    if len(m_.free_symbols) == 1:
        return sp.solveset(m_ <= 0, m_.free_symbols.pop(), sp.S.Reals)
    return f"check {m_} <= 0 by hand"
print("where each minor is <= 0 (empty = always > 0):", [where_nonpositive(m_) for m_ in minors])
print("positive definite everywhere:", H.is_positive_definite, " positive semidefinite everywhere:", H.is_positive_semidefinite)

## \lagrange — Lagrange multipliers: extremes of f subject to g = 0 (Thm 7.39)
@uses sympy
@in f expr
@in g expr
@sym x y
lam = sp.symbols('lam')
L = f - lam*g
eqs = [sp.diff(L, s) for s in $SYMS] + [g]
cands = [p for p in sp.solve(eqs, $SYMS + [lam], dict=True) if all(sp.N(v).is_real for v in p.values())]
for p in cands:
    print({k: sp.N(v, 6) for k, v in p.items()}, " f =", sp.N(f.subs(p), 6), "  exact:", p if len(str(p)) < 200 else "long")
if cands:
    print("max f:", sp.N(max(f.subs(p) for p in cands), 6), "  min f:", sp.N(min(f.subs(p) for p in cands), 6))

## \compactopt — max/min on a compact set: interior + boundary g = 0 (Prop 7.46)
@uses sympy
@in f expr
@in g expr
@sym x y
lam = sp.symbols('lam')
cands = []
for p in sp.solve([sp.diff(f, s) for s in $SYMS], $SYMS, dict=True):
    if all(v.is_real for v in p.values()) and g.subs(p) <= 0:
        cands.append(("interior", p))
for p in sp.solve([sp.diff(f - lam*g, s) for s in $SYMS] + [g], $SYMS + [lam], dict=True):
    if all(p[s].is_real for s in $SYMS):
        cands.append(("boundary", {s: p[s] for s in $SYMS}))
vals = [(where, p, sp.simplify(f.subs(p))) for where, p in cands]
for v in vals: print(*v)
print("max:", max(vals, key=lambda t: t[2]), "\nmin:", min(vals, key=lambda t: t[2]))

## \kkt — KKT: minimize f subject to g_i <= 0, try every active set (Thm 9.37)
@uses sympy itertools
@in f expr
@in gs list
@sym x y
mus = sp.symbols(f'mu1:{len(gs) + 1}')
seen = set()
for k in range(len(gs) + 1):
    for active in itertools.combinations(range(len(gs)), k):
        L = f + sum(mus[i]*gs[i] for i in active)
        eqs = [sp.diff(L, s) for s in $SYMS] + [gs[i] for i in active]
        for p in sp.solve(eqs, $SYMS + [mus[i] for i in active], dict=True):
            if any(not v.is_real for v in p.values()): continue
            feasible = all(sp.simplify(g_.subs(p)) <= 0 for g_ in gs)
            dual = all(p[mus[i]] >= 0 for i in active)
            point = tuple(p[s] for s in $SYMS)
            if feasible and dual and point not in seen:
                seen.add(point)
                print("KKT point:", {s: p[s] for s in $SYMS}, " multipliers:", {mus[i]: p[mus[i]] for i in active}, " f =", sp.simplify(f.subs(p)))

## \convexopt — numeric constrained minimum with scipy (Ch9)
@uses sympy numpy scipy
@in f expr
@in gs list
@sym x y
@ex start point := [0.0, 0.0]
F = sp.lambdify([$SYMS], f)
cons = [{"type": "ineq", "fun": (lambda h: lambda z: -h(z))(sp.lambdify([$SYMS], g_))} for g_ in gs]
res = opt.minimize(F, np.array({{start point}}, float), constraints=cons)
print(res.message, " x* =", res.x, " f(x*) =", res.fun)

## \newtonopt — Newton's method for minimizing f (Sec 8)
@uses sympy numpy
@in f expr
@sym x y
@ex start point := [1.0, 1.0]
G = sp.lambdify([$SYMS], [sp.diff(f, s) for s in $SYMS])
Hf = sp.lambdify([$SYMS], sp.hessian(f, $SYMS))
z = np.array({{start point}}, float)
for k in range(30):
    step = np.linalg.solve(np.array(Hf(z), float), np.array(G(z), float))
    z = z - step
    if np.linalg.norm(step) < 1e-12: break
print("iterations:", k + 1, " minimizer ~", z)

## \perceptron — perceptron algorithm on labeled points (Remark 1.120)
@uses numpy
@ex points X := [[2, 1], [3, 2], [-1, -1], [-2, 0]]
@ex labels +-1 := [1, 1, -1, -1]
X = np.array({{points X}}, float)
yl = np.array({{labels +-1}})
w, b = np.zeros(X.shape[1]), 0.0
for epoch in range(100):
    errors = 0
    for xi, yi in zip(X, yl):
        if yi*(w @ xi + b) <= 0:
            w, b, errors = w + yi*xi, b + yi, errors + 1
    if errors == 0: break
print("w =", w, " b =", b, " epochs:", epoch + 1)

## \svm — maximal margin separating hyperplane (Ch9)
@uses numpy scipy
@ex points X := [[2, 1], [3, 2], [-1, -1], [-2, 0]]
@ex labels +-1 := [1, 1, -1, -1]
X = np.array({{points X}}, float)
yl = np.array({{labels +-1}}, float)
d_ = X.shape[1]
cons = [{"type": "ineq", "fun": (lambda i: lambda wb: yl[i]*(X[i] @ wb[:d_] + wb[d_]) - 1)(i)} for i in range(len(X))]
res = opt.minimize(lambda wb: 0.5*wb[:d_] @ wb[:d_], np.zeros(d_ + 1), constraints=cons)
w, b = res.x[:d_], res.x[d_]
print("w =", w, " b =", b, " margin =", 2/np.linalg.norm(w))

## \integral — definite, indefinite, double, numeric integrals
### definite and indefinite
@uses sympy
@in f expr
@sym x
@ex a := 0
@ex b := 1
print("int f dx =", sp.integrate(f, $SYM))
I = sp.integrate(f, ($SYM, {{a}}, {{b}}))
print("int_a^b f dx =", I, "~", sp.N(I))
### double integral over a rectangle
@uses sympy
@in f expr
@sym x y
@ex x from := 0
@ex x to := 1
@ex y from := 0
@ex y to := 1
s1, s2 = $SYMS
I = sp.integrate(f, (s2, {{y from}}, {{y to}}), (s1, {{x from}}, {{x to}}))
print("double int f dA =", I, "~", sp.N(I))
### numeric with scipy quad
@uses sympy integrate
@in f expr
@sym x
@ex a := 0
@ex b := 1
val, err = si.quad(sp.lambdify($SYM, f), {{a}}, {{b}})
print("int ~", val, " error ~", err)

## \area — area between two curves (intersections + integral)
@uses sympy
@in f expr
@in g expr
@sym x
pts = sorted(p for p in sp.solve(sp.Eq(f, g), $SYM) if p.is_real)
print("intersections:", pts)
area = sum(sp.Abs(sp.integrate(f - g, ($SYM, a_, b_))) for a_, b_ in zip(pts, pts[1:]))
print("area between them:", sp.simplify(area), "~", sp.N(area))

## \sum — sums and series
@uses sympy
@ex term with k := 1/k**2
@ex upper limit := sp.oo
k = sp.symbols('k', integer=True, positive=True)
S = sp.summation({{term with k}}, (k, 1, {{upper limit}}))
print("sum =", S, "~", sp.N(S))

## \solve — solve an equation / inequality over the reals
@uses sympy
@in f expr
@sym x
print("f = 0:", sp.solveset(sp.Eq(f, 0), $SYM, sp.S.Reals))
print("f > 0:", sp.solveset(f > 0, $SYM, sp.S.Reals))
print("f <= 0:", sp.solveset(f <= 0, $SYM, sp.S.Reals))

## \simplify — simplify, expand, factor, partial fractions
@uses sympy
@in f expr
@sym x
print("simplify:", sp.simplify(f))
print("expand:", sp.expand(f))
print("factor:", sp.factor(f))
print("partial fractions:", sp.apart(sp.together(f), $SYM) if f.is_rational_function($SYM) else "not rational")

## \subs — evaluate an expression at a point (exact and decimal)
@uses sympy
@in f expr
@sym x y
@ex point := [1, 2]
val = f.subs(dict(zip($SYMS, {{point}})))
print("f(point) =", sp.simplify(val), "~", sp.N(val))

## \plot — plot y = f(x)
@uses sympy numpy plt
@in f expr
@sym x
@ex x from := -3
@ex x to := 3
F = sp.lambdify($SYM, f, "numpy")
xs_ = np.linspace({{x from}}, {{x to}}, 400)
plt.plot(xs_, F(xs_) + 0*xs_, label=f"${sp.latex(f)}$")
plt.axhline(0, color="gray", lw=0.5)
plt.grid(True)
plt.legend()
plt.show()

## \contour — contour plot of f(x, y)
@uses sympy numpy plt
@in f expr
@sym x y
F = sp.lambdify($SYMS, f, "numpy")
X_, Y_ = np.meshgrid(np.linspace(-3, 3, 300), np.linspace(-3, 3, 300))
cs = plt.contour(X_, Y_, F(X_, Y_) + 0*X_, levels=20)
plt.clabel(cs, fontsize=7)
plt.gca().set_aspect("equal")
plt.title(f"${sp.latex(f)}$")
plt.show()

## \region — shade the region where inequalities hold
@uses numpy plt
@ex conditions on X, Y := (X**2 + Y**2 <= 4) & (X + Y >= 1)
X, Y = np.meshgrid(np.linspace(-3, 3, 500), np.linspace(-3, 3, 500))
mask = {{conditions on X, Y}}
plt.contourf(X, Y, mask.astype(float), levels=[0.5, 1], alpha=0.4)
plt.gca().set_aspect("equal")
plt.grid(True)
plt.show()

## \lambdify — turn a sympy expression into a fast numpy function
@uses sympy numpy
@in f expr
@sym x
F = sp.lambdify($SYMS, f, "numpy")
print(F(*[np.linspace(0, 1, 5) for _ in $SYMS]))
