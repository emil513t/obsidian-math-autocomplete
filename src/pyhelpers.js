// Python helper functions shared by the evidence blocks (evidence.js) and the
// python snippets (pysnippets.js @uses symred).

// The book's symmetric reduction (Section 8.7, Theorem 8.31; same steps as
// textlink.symmetricReduction): identity on top of A, column operations on the
// whole extended matrix, row operations on the lower half. verbose=True
// prints every operation. Returns (diagonal of D, B) with B^T A B = D.
export const SYMRED = `def symmetric_reduction(A, verbose=False):
    """B and the diagonal of D with B^T A B = D (IMO26 Section 8.7, Theorem 8.31)."""
    A = sp.Matrix(A)
    n = A.rows
    ext = sp.eye(n).col_join(A)  # B on top, A below
    def show(msg):
        if verbose:
            print(msg)
            sp.pprint(ext[:n, :], use_unicode=False); print("   ---"); sp.pprint(ext[n:, :], use_unicode=False); print()
    def add(i, j, c):  # c column i to column j (whole), c row i to row j (lower half)
        ext[:, j] = ext[:, j] + c * ext[:, i]
        ext[n + j, :] = ext[n + j, :] + c * ext[n + i, :]
        show(f"add ({c}) * column {i+1} to column {j+1} (whole), ({c}) * row {i+1} to row {j+1} (lower half):")
    def swap(i, j):
        ext.col_swap(i, j)
        ext.row_swap(n + i, n + j)
        show(f"interchange columns {i+1}, {j+1} (whole) and rows {i+1}, {j+1} (lower half):")
    show("extended matrix (I on top of A):")
    for k in range(n):
        if ext[n + k, k] == 0:
            j = next((j for j in range(k + 1, n) if ext[n + j, j] != 0), None)
            if j is not None:
                swap(k, j)
        if ext[n + k, k] == 0:  # rest of the diagonal is 0: the adding trick
            j = next((j for j in range(k + 1, n) if ext[n + k, j] != 0), None)
            if j is None:
                continue
            add(j, k, 1)
        for j in range(k + 1, n):
            if ext[n + k, j] != 0:
                add(k, j, -ext[n + k, j] / ext[n + k, k])
    B = ext[:n, :]
    return [ext[n + i, i] for i in range(n)], B`;

export const DEFINITENESS = `def definiteness(D):
    """Definiteness of A from the diagonal of D = B^T A B (Propositions 3.43, 8.11)."""
    if all(d > 0 for d in D):
        return "positive definite"
    if all(d < 0 for d in D):
        return "negative definite"
    if any(d > 0 for d in D) and any(d < 0 for d in D):
        return "indefinite"
    if all(d == 0 for d in D):
        return "positive semidefinite and negative semidefinite"
    if all(d >= 0 for d in D):
        return "positive semidefinite"
    return "negative semidefinite"`;

// For a Hessian with variables in it: does every diagonal entry of D satisfy
// d > 0 (strict) or d >= 0 at every point? True / False / None (undecided:
// check by hand). Same test as Proposition 3.43 / 8.11, point by point.
export const EVERYWHERE = `def holds_everywhere(D, strict):
    """Every diagonal entry of D > 0 (strict) or >= 0 at every point (Propositions 3.43, 8.11)."""
    result = True
    for d in D:
        d = sp.simplify(d)
        bad = (d <= 0) if strict else (d < 0)
        if not d.free_symbols:
            if bool(bad):
                return False
        elif len(d.free_symbols) == 1:
            if sp.solveset(bad, list(d.free_symbols)[0], sp.S.Reals) != sp.S.EmptySet:
                return False
        else:
            r = sp.ask(sp.Q.positive(d) if strict else sp.Q.nonnegative(d))
            if r is False:
                return False
            if r is None:
                result = None
    return result

def divided_by(D):
    """Diagonal entries with variables in them that the reduction divided by: the result assumes they are not 0."""
    never_zero = lambda d: holds_everywhere([d], True) is True or holds_everywhere([-d], True) is True
    return [d for d in D[:-1] if sp.simplify(d).free_symbols and not never_zero(d)]`;
