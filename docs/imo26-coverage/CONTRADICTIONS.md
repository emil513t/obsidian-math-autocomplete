# IMO26: contradiction, counterexample and "not" proofs, classified for the whole curriculum

Step 1 of the "dynamic proofs" plan (2026-11-17); this file is the map.

**Status (2026-11-18):** E6 built (`src/witness.js`), E4 built (`src/ineqproof.js`: \fm, \svm NOT separable,
\kkt no feasible point, \fouriermotzkin worked solution), E1 built (`src/negate.js`: \negate command +
template, \contradiction / \contrapositive blanks), E5 built (`src/nosolution.js`: \gauss ★ + every route
filled, "adding e1, e2 and −1 times e3 gives 0 = −1", \leastsquares 5.17), E9 built (`src/notoptimal.js`:
\kkt "NOT optimal: no λ ≥ 0" and "a feasible point with a smaller value" at the note's point; 9.46(b),
9.52(3), 9.56(2), 9.57(2)). Tests: `test/witness.test.js`, `test/contradict.test.js`, `test/notopt.test.js`.
Not built from E9: the "give an example" catalogue (6.8, 6.11, 8.22, 9.40) and 9.54(3)(4) (a family of points).
E8 built (`src/notconvex.js`: \convexfn bad pair, \strictconvex Hessian/f'' at a point and "linear on a
segment" (6.6, 8.28, 9.52, 9.54(1)), \convexset midpoint outside; 9.53(1) with e^{x−y}). Tests:
`test/notconvex.test.js`. Not built from E8: 4.25 union (sets given as a union) and 6.58 (a statement).
Also fixed: the CAS read \log as base 10; the book's log has base e.
E2 + E3 built (`src/failcases.js`: \setequal / \subsetproof element in one set and not the other (listed
and set-builder sets over R, Z, N); \truthtable "NOT equivalent" / "NOT always true" rows (1.11, 1.20);
function tables of pairs (1.102, 1.108, 1.113); \injective / \surjective for formulas (1.109, e^x);
\crit critical point that is not an extremum (6.38); \inequality with several variables and the note's
assumptions (1.72(i))). Tests: `test/failcases.test.js`. Not built: "give an example" exercises 2.30,
6.42, 6.47 and the counting argument 1.107 (hash functions).
Next: E7, E10, E11.

**Method:** all 289 exercises in `ex.json` read one by one, plus every place the book itself argues
by contradiction (Sec 1.6.4 + Ex 1.83, Thm 1.86, the global-minimum proof in Sec 6, Lemma 6.37,
Prop 7.20, Sec 9.1 / Ex 5.9 for separation). Every exercise that needs a "not / impossible /
no solution / give an example where it fails / find the mistake" argument is listed below under the
**engine** that would decide it.

**Rule for every engine:** it works on *any* input of its kind from your note (any matrix, any
function, any set, any inequality system), not on the one exercise. The exercises are only the
test cases (to be added to `scripts/book-check.mjs`). Methods and wording only from the book.

## Summary

| # | Engine (what it decides by itself) | Book method | Exercises | Dynamic? |
|---|---|---|---|---|
| E1 | **Negate the claim** → writes "Assume ¬p" correctly | Sec 1.6.4, Ex 1.20 (¬, ⇒ rules), Remark 5.34 | every proof below + all general ones | Yes (syntax only) |
| E2 | **Finite counterexample** by trying all elements | Def 1.27, Def 1.106, Def 1.10 | 1.11 1.12 1.28 1.45 1.52 1.102 1.107 1.108 1.113 | Yes |
| E3 | **Function / number counterexample**: two points with same value, a value never hit, a claim false at one input | Def 1.106, Def 1.115 | 1.72(i) 1.109 2.30 6.38 6.42 6.47 | Yes |
| E4 | **Inequalities contradict each other** → nonnegative combination giving 0 < 0 | Fourier–Motzkin, Sec 4.5 | 1.123 4.42 5.9 5.10 9.10 9.13(2) 5.38 | Yes |
| E5 | **Linear system has no solution** → Gauss reaches 0 = c | Sec 2.3, Thm 2.8 | 2.1 3.2 3.15 5.17 | Yes (\gauss has it; needs auto-route) |
| E6 | **Matrix witness**: bad vector u (uᵀAu ≤ 0), null vector (Av = 0 ⇒ not invertible), non-commuting pair | Sec 8.7 / Thm 8.31, Ex 3.41, Def 3.24, Prop 3.17 | 3.18 3.25 3.30 3.41 3.42 8.19 8.29(i) 8.30 8.37 8.38(iii)(v) | Yes |
| E7 | **Not open / closed / bounded / no limit / not differentiable**: a witness depending on R or ε | Remark 5.34, Def 5.39, Def 5.47, Sec 5.7, Def 6.17 | 5.36 5.42 5.44 5.46 5.50 5.64 5.80 5.85 6.24 6.31 | Mostly (standard set shapes, limit.js) |
| E8 | **Not convex / not strictly convex**: bad pair of points or a line where f is linear | Def 4.21, Def 4.26, Def 6.1, Thm 8.25 | 4.25 6.6 6.58 8.28 8.38(v) 9.52 9.53(1) 9.54(1) | Yes |
| E9 | **Point is not optimal**: KKT has no λ ≥ 0, or a feasible descent direction | Thm 9.37, Prop 7.20, Lemma 7.17 | 9.46(b) 9.52(3) 9.54(3)(4) 9.56(2) 9.57(2) 9.40 6.11 6.8 8.22 | Yes |
| E10 | **No rational root / irrational** (lowest terms) | Ex 1.83, Def 1.54 | 5.82 1.81 | Yes (polynomials with integer coefficients) |
| E11 | **Find the mistake** in a chain of ⇔ / an induction | Def 1.18, Thm 1.86 | 2.2 1.89 3.30 | Partly (plug in values per step; division by 0) |
| — | **General proofs**: only E1 + fixed skeleton | Sec 1.6.4 | 1.84 1.85 1.94 8.24 9.13(3) 6.62 9.32 + the book's theorem proofs | No (needs an idea, not a computation) |

Count: **~70 exercise parts** need a "not"-type argument. **~60 are decidable** by E2–E10.
About 10 stay template-only (general statements).

## Details per engine

### E1 Negate the claim (applies to everything)
- Input: the statement, from a ```vars line (`P = ...`) or typed in the form.
- Rules (book only): ¬(p ∧ q) ≡ ¬p ∨ ¬q, ¬(p ∨ q) ≡ ¬p ∧ ¬q, ¬(p ⇒ q) ≡ p ∧ ¬q (Ex 1.20 / Def 1.18),
  ¬∀ ≡ ∃¬ and ¬∃ ≡ ∀¬, "not bounded" exactly as Remark 5.34.
- Output: "**Proof by contradiction** (Section 1.6.4). Assume ¬p: ..." with the negation written out.
- Example from the book: 1.12 (¬(crime ⇒ not alone) = crime ∧ alone), 5.36 (Remark 5.34).

### E2 Finite counterexample (sets, tables, truth tables)
- Tries every element / every row; prints the first one that breaks the claim, then states it.
- 1.11 which cards can break "even ⇒ blue" (rows with p true, q false); 1.28 / 1.45 / 1.52 an
  element in one set but not the other, |A \ B| ≠ |A| − |B| with concrete sets;
  1.102 / 1.108 / 1.113 two inputs with the same value (not injective), a value never hit
  (not surjective), |S| < |T| so never surjective; 1.107 more inputs than outputs (counting).

### E3 Function / number counterexample
- Not injective: solve f(x) = f(y) with x ≠ y (cas / sympy); not surjective: solve f(x) = c and
  find c with no solution (1.109: c = −1 for x²).
- "Is it true in general?": search small integers / simple rationals, then check exactly
  (1.72(i): a/b ≤ (a+1)/(b+1) fails for a > b).
- Converse false: 6.38 f(x) = x³ at 0 (f′(0) = 0, strictly increasing, Prop 6.43).

### E4 Inequalities contradict each other (separation, feasibility)
- Reuses `src/elim.js` (Fourier–Motzkin). Eliminating all variables leaves 0 < c with c ≤ 0;
  tracking which original inequalities were added gives the book's short proof
  "adding (1) and (3) gives 0 < 0" (as in the XOR proof and Ex 5.9).
- Input: labeled points (separating line w, b) or a list of inequalities.
- Positive side for free: if FM does not give a contradiction, the system is solvable
  (9.13(2), 5.38 bounded).

### E5 Linear system has no solution
- `\gauss` already has the "no solutions" route (Thm 2.8); missing: picking that route by itself
  from the computation and writing "0 = 3, a contradiction".
- 3.15: no λ (each entry gives a different λ); 5.17 then hands over to least squares (Thm 5.16).

### E6 Matrix witness (any matrix in the note)
- Not positive definite: symmetric reduction (Sec 8.7) gives B, D; column i of B with d_i ≤ 0
  gives u = B e_i with uᵀ A u = d_i ≤ 0. Covers 3.41 (u = e_1 when A₁₁ < 0), 3.42 (d_i = 0),
  8.19 / 8.29(i) / 8.38(v) (Hv = 0, f(u) = 0), 8.37 (parameter region: sign conditions on D).
- Indefinite: two columns with d_i > 0 > d_j (8.30).
- Not invertible: Gauss finds v ≠ 0 with Av = 0, then "v = BAv = B0 = 0" (Def 3.24) — 3.25, 8.38(iii).
- Identity fails: smallest integer pair with AB ≠ BA (3.18, Prop 3.17).
- 3.30: one-sided inverse example (BA = I, AB ≠ I) for a non-square A.

### E7 Not open / closed / bounded / no limit / not differentiable
- Not bounded (5.36): given R, the witness n = ⌈R⌉ + 1 (Remark 5.34).
- Not open (5.42 a/c, 5.44, 5.46): a point v of the set so that every B(v, ε) contains a point
  outside, written as a formula in ε (e.g. (x, ε/2) for the x-axis).
- Not closed (5.50 d): complement not open at the boundary point.
- No limit / not differentiable (5.64, 5.80, 6.24, 6.31): `src/limit.js` already decides these
  (jump: ε = gap/4; den 0: unbounded); add the "assume the limit w exists" wording.
- Works for: finite sets, intervals, half-planes/lines given by one (in)equality, balls, sets
  given by polynomial inequalities with an obvious boundary point. Odd shapes: falls back to E1.
- 5.85: catalogue of book examples (open interval, R) checked against Thm 5.84.

### E8 Not convex / not strictly convex
- Hessian at a point indefinite → direction u where f(v + tu) is concave → two points and
  t = 1/2 that break Def 4.26 (9.53(1)).
- Not strictly convex: a line where f is linear (6.6 linear f, 8.28 log(eˣ + eʸ) along (1, 1),
  9.52, 9.54(1)) — found as the null direction of the Hessian, checked exactly.
- Union not convex (4.25): two convex sets, segment leaves the union.
- 6.58: f″(0) = 0 so Cor 6.55 does not apply (statement, not a contradiction).

### E9 Point is not optimal
- At the given point: solve the KKT equations for λ (Thm 9.37); none with λ ≥ 0 → not optimal
  (9.57(2), 9.52(3), 9.54(3)(4)); or exhibit a feasible point with smaller value
  (9.46(b), 9.56(2)), found along −∇f (Lemma 7.17).
- "Give an example": 6.8, 6.11, 8.22, 9.40 from a small catalogue of book functions
  (x², x³, x⁴, |x|, the 6.8 hint function), each property checked by the engine before printing.
- Reuses the existing `\kkt` python route.

### E10 No rational root / irrational
- Any polynomial with integer coefficients: assume ξ = a/b in lowest terms (Def 1.54), multiply out,
  read off which prime divides both a and b (Ex 1.83 method). 5.82 (x³ − 2), extends `\irrational`.
- 1.81 is the contrapositive version (n odd ⇒ n² odd) — E1 writes the switch.

### E11 Find the mistake
- Chain of ⇔ (2.2): plug in a value satisfying the first line and find the first step where the
  truth value changes; flag division by an expression that is 0 there (a − b).
- Fake induction (1.89): base case p(1), then check whether the step for n = 1 uses p(0) / p(n − 1).
- **Exam risk:** this is the "step checker" kind of feature (see math-autocomplete-lab note).

### Not dynamic (template + E1 only)
1.84 (infinitely many primes), 1.85 (no smallest positive rational: r/2), 1.94 (pigeonhole by
induction), 8.24 (bounded convex ⇒ constant), 9.13(3), 6.62, 9.32 and the book's own theorem
proofs (Thm 1.86, global = local minimum for convex f, Lemma 6.37, Prop 7.20). These need the
idea of the proof; the plugin can only offer the negation and the book's skeleton.

## Suggested build order (biggest coverage per hour)

| Order | Engine | Reuses | Estimate |
|---|---|---|---|
| 1 | E6 matrix witness + auto verdict in `\posdef` | textlink.symmetricReduction | 2–3 h |
| 2 | E4 inequalities → 0 < 0 | elim.js | 3–4 h |
| 3 | E1 negation | new small parser | 2–3 h |
| 4 | E5 + E9 (auto-route Gauss / KKT refutation) | \gauss, \kkt | 3–4 h |
| 5 | E8 not convex | cas Hessian + E6 | 2–3 h |
| 6 | E2 + E3 finite / function counterexamples | cas, sets | 3–4 h |
| 7 | E7 topology witnesses | limit.js | 4–6 h |
| 8 | E10 rational roots | cas | 1–2 h |
| 9 | E11 find the mistake (only if exam rules allow) | — | 3 h |

Total ≈ 25–35 h. Each engine ships with its exercises above as book-check tests.
