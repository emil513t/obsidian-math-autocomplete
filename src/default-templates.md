# Math Templates

Type `\name` in normal text (outside `$...$`) to insert a template.
Each `## \name — description` heading starts one template; everything under it is the body.
`{{variable}}` marks a spot to fill in. Tab jumps to the next one, Shift+Tab goes back.
Using the same `{{variable}}` twice means you only type it once: the other copies fill themselves when you Tab on.
Keep display math (`$$...$$`) on one line.
`### route name` lines split one template into several ways of solving it; you pick the route after the template.

## \proof — proof, pick a strategy
### direct proof
**Proof.** We want to show that {{claim}}.
{{argument}}
Hence {{claim}}. $\blacksquare$
### unfold the definition (cite it)
**Proof.** By {{Definition X.Y}}, {{claim}} means {{the defining condition}}. So we must show {{the defining condition}}.
{{check it}}
Hence {{claim}} by {{Definition X.Y}}. $\blacksquare$
### apply a theorem: check its hypotheses
**Proof.** We use {{Theorem X.Y}}, which needs {{hypotheses}}.
- {{hypothesis 1}}: {{why it holds}}
- {{hypothesis 2}}: {{why it holds}}

So {{Theorem X.Y}} gives {{conclusion}}, which is {{claim}}. $\blacksquare$
### by contradiction
**Proof by contradiction.** Assume {{the claim is false}}.
{{derivation}}
This contradicts {{known fact}}. Hence {{claim}}. $\blacksquare$
### show: not B implies not A (Ex 1.20)
**Proof.** Since $(p \Rightarrow q) \equiv (\neg q \Rightarrow \neg p)$ (Exercise 1.20), we show: if {{not B}}, then {{not A}}.
{{argument}}
So {{not A}}, which proves: if {{A}}, then {{B}}. $\blacksquare$
### by cases
**Proof.** We split into cases.

**Case 1:** {{case 1}}. {{argument}}

**Case 2:** {{case 2}}. {{argument}}

The cases cover everything, so {{claim}}. $\blacksquare$
### both directions (if and only if)
**Proof.** ($\Rightarrow$) Assume {{A}}. {{argument for =>}} Hence {{B}}.

($\Leftarrow$) Assume {{B}}. {{argument for <=}} Hence {{A}}. $\blacksquare$
### by induction (Thm 1.86)
**Proof by induction** (Theorem 1.86). Let $p(n)$: {{statement}}.
**Base case:** {{check}}.
**Induction step:** assume $p(n)$. {{show p(n+1)}}. $\blacksquare$

## \showthat — "show that" question + answer, pick a strategy
### start from one side, reach the other
**Show that** {{statement}}.

**Solution.** We start from {{starting point}} and work towards {{statement}}.
{{steps}}
This is exactly {{statement}}, which was to be shown. $\blacksquare$
### chain of equalities / inequalities
**Show that** ${{LHS}} = {{RHS}}$.

**Solution.**
$${{LHS}} = {{step 1}} = {{step 2}} = {{RHS}}$$
using {{rules / Definition X.Y}}. $\blacksquare$
### the object satisfies a definition (cite it)
**Show that** {{object}} is {{property}}.

**Solution.** By {{Definition X.Y}}, {{property}} means {{defining condition}}. For {{object}}: {{check the condition}}. So {{object}} is {{property}}. $\blacksquare$
### compute and compare
**Show that** {{statement}}.

**Solution.** Compute both sides: {{LHS computation}} and {{RHS computation}}. They agree, so {{statement}}. $\blacksquare$
### show it is false (an example where it fails)
**Claim:** {{statement}} — this is **false** in general.

**Example where it fails:** {{example}}. Then {{what holds}}, but {{what fails}}.

## \induction — proof by induction on n
**Proof by induction on $n$.** Let $P(n)$ be the statement: {{statement}}.

**Base case** ($n = {{n0}}$): {{check the base case}}, so $P({{n0}})$ holds.

**Induction step:** Assume $P(k)$ holds for some $k \ge {{n0}}$, that is ${{P(k)}}$ (induction hypothesis). We show $P(k+1)$, that is ${{P(k+1)}}$:
{{step, using the hypothesis}}
So $P(k) \Rightarrow P(k+1)$.

By induction, $P(n)$ holds for all $n \ge {{n0}}$. $\blacksquare$

## \strongind — proof by strong induction
**Proof by strong induction on $n$.** Let $P(n)$ be the statement: {{statement}}.

**Base case(s):** {{check the base cases}}.

**Induction step:** Let $n > {{n0}}$ and assume $P(m)$ holds for all ${{n0}} \le m < n$. We show $P(n)$:
{{step, using the hypothesis}}

By strong induction, $P(n)$ holds for all $n \ge {{n0}}$. $\blacksquare$

## \contradiction — proof by contradiction
**Proof by contradiction.** Assume, for contradiction, that {{the claim is false}}.
{{derivation}}
This contradicts {{known fact}}. So the assumption was false, and {{claim}}. $\blacksquare$

## \contrapositive — proof by contrapositive
**Proof (contrapositive).** We show the equivalent statement: if {{not B}}, then {{not A}}.
Assume {{not B}}. {{argument}}
So {{not A}}, which proves the contrapositive and hence: if {{A}}, then {{B}}. $\blacksquare$

## \iff — if and only if, both directions
**Proof.** We show both directions.

($\Rightarrow$) Assume {{A}}. {{argument for =>}} Hence {{B}}.

($\Leftarrow$) Assume {{B}}. {{argument for <=}} Hence {{A}}.

So {{A}} if and only if {{B}}. $\blacksquare$

## \counterexample — disprove with a counterexample
**Claim is false.** Counterexample: take {{example}}.
Then {{what holds}}, but {{what fails}}.
So the statement does not hold in general. $\blacksquare$

## \epsdelta — epsilon-delta limit proof
**Proof.** Let $\varepsilon > 0$. Choose $\delta = {{delta}}$.
If $0 < |x - {{a}}| < \delta$, then
$$|{{f(x)}} - {{L}}| = {{rewrite}} \le {{bound}} < \varepsilon.$$
Hence $\lim_{x \to {{a}}} {{f(x)}} = {{L}}$. $\blacksquare$

## \bigO — show f(n) is O(g(n))
**Proof.** We show ${{f(n)}} = O({{g(n)}})$: we need constants $c > 0$ and $n_0$ with ${{f(n)}} \le c \cdot {{g(n)}}$ for all $n \ge n_0$.
For $n \ge {{n_0}}$: {{chain of inequalities}}
So $c = {{c}}$ and $n_0 = {{n_0}}$ work, and ${{f(n)}} = O({{g(n)}})$. $\blacksquare$

## \invariant — loop invariant (init / maintenance / termination)
**Loop invariant:** {{invariant}}

**Initialization:** Before the first iteration, {{why it holds at the start}}.

**Maintenance:** Assume the invariant holds before an iteration. {{what the iteration does}}, so it still holds before the next iteration.

**Termination:** The loop stops when {{stop condition}}. Then the invariant gives {{conclusion}}, which is what we wanted. $\blacksquare$

## \solution — short answer, ADS style
**Solution:** {{answer}} — {{one-line reason}}. Full computation in §{{section}}.

## \find — find / compute question
**Find** {{quantity}}.

**Solution.** {{method}}:
$${{computation}}$$
**Answer:** {{quantity}} $= {{result}}$.

## \bijection — show a function is bijective
**Proof.** We show $f\colon {{A}} \to {{B}}$, $f(x) = {{formula}}$, is a bijection.

**Injective:** Let $x_1, x_2 \in {{A}}$ with $f(x_1) = f(x_2)$. {{argument}} So $x_1 = x_2$.

**Surjective:** Let $y \in {{B}}$. Take $x = {{preimage}} \in {{A}}$; then $f(x) = y$.

So $f$ is a bijection. $\blacksquare$

## \definition — definition block
**Definition ({{name}}).** {{definition}}

**Example:** {{example}}
