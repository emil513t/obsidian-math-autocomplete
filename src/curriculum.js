// Curriculum guard: only wording from the IMO26 book (imo26.pdf) is shown.
//
// HIDDEN: commands whose topic the book does not cover at all (checked against
// the full book text: 0 occurrences). They stay in the code but are never
// offered unless the setting "Show material outside the book" is on.
// BANNED: terms that never occur in the book. test/curriculum.test.js fails if
// any of them appears in a visible command name, description, label, template,
// worked solution or Python print. Where the book has the concept under another
// name, the replacement is noted next to it and used everywhere instead.

export const HIDDEN = {
  objects: new Set([
    "laplacian", "directional", "adjugate", "symmetricpart", "determinant", "trace", "rank",
    "charpoly", "eigenvalues", "rref", "augmented", "powerset", "piecewise",
  ]),
  py: new Set([
    "det", "rank", "eigen", "gramschmidt", "integral", "area", "lhopital", "lambdify", "implicit",
  ]),
  templates: new Set([
    "contrapositive", "counterexample", "epsdelta", "bigO", "invariant", "strongind", "solution", "bijection",
  ]),
};

export const isHidden = (kind, name, settings = {}) => !settings.offBook && HIDDEN[kind].has(name);

// [regex, what the book says instead (or why it is gone)]
export const BANNED = [
  [/eigen/i, "not in the book"],
  [/determinant|\\det\b|\bdet\s*\(|\bdet [A-Z]\b/i, "not in the book (2×2 inverse: D = ad − bc, Exercise 3.26)"],
  [/cofactor|adjugate|adjoint/i, "not in the book"],
  [/characteristic polynomial|charpoly/i, "not in the book"],
  [/laplacian|laplace/i, "not in the book"],
  [/directional derivative/i, "not in the book"],
  [/jacobian|jacobi/i, "matrix derivative (Prop 7.9)"],
  [/\bintegra(l|ls|te|tion)\b|antiderivative/i, "not in the book"],
  [/h[oô]pital/i, "not in the book"],
  [/power set/i, "not in the book"],
  [/tautolog|de morgan/i, "not in the book"],
  [/contrapositive|counterexample|big[- ]?o\b|loop invariant|strong induction|epsilon-delta|eps-delta/i, "not in the book"],
  [/horner/i, "Exercise 2.19: compute f(x) with fewer multiplications"],
  [/stern[- –]brocot/i, "mediant (Exercise 1.75)"],
  [/annuity/i, "loan / interest rate (Exercise 6.35)"],
  [/markov/i, "stochastic matrix / stable distribution (Exercise 3.10)"],
  [/echelon|\brref\b|row reduc|reduced row|augmented|pivot|back substitution|gauss[- –]jordan/i, "Gauss elimination (Sec 2.3)"],
  [/cross product/i, "not in the book"],
  [/projection (onto|of)\b/i, "u − λv orthogonal to v (Exercise 5.6)"],
  [/orthonormal|gram[- –]schmidt|null ?space|column space/i, "not in the book"],
  [/\brank\b(?! the)/i, "not in the book"],
  [/\btrace\b/i, "not in the book"],
  [/stationary/i, "critical point"],
  [/lineari[sz]ation|linear approximation|maclaurin/i, "tangent plane / Taylor polynomial"],
  [/concave/i, "not in the book"],
  [/piecewise/i, "not in the book"],
  [/symmetric part/i, "not in the book"],
  [/congruent|diagonaliz|spectrum|sylvester|principal minor|\bminors?\b|triangular/i, "symmetric reduction (Sec 3.7.3, 8.6)"],
  [/contour/i, "level curves"],
  [/monoton/i, "increasing / decreasing (Def 6.41)"],
  [/\bbijection|\binjection|\bsurjection/i, "bijective / injective / surjective"],
  [/mixed partial/i, "second order partial derivatives"],
  [/optimis/i, "optimization"],
  [/secant/i, "not in the book"],
  [/partial fraction|geometric series/i, "not in the book"],
  [/log-likelihood|maximal margin|active set|\bendpoints?\b|higher-derivative/i, "not in the book's wording"],
  [/\bADS\b/, "another course"],
];

// Every banned term found in a piece of user-facing text.
export function offBook(text) {
  const s = String(text ?? "");
  return BANNED.filter(([re]) => re.test(s)).map(([re, why]) => `${s.match(re)[0]} (${why})`);
}
