# Build the exercise -> snippet coverage note (Markdown) from ex.json + cov_*.py.
import json, re, sys
from pathlib import Path
here = Path(__file__).parent
sys.path.insert(0, str(here))
cov = {}
for m in ["cov_ch1", "cov_ch23", "cov_ch45", "cov_ch67", "cov_ch89"]:
    cov.update(__import__(m).COV)
ex = json.load(open(here / "ex.json", encoding="utf8"))
checked = set(re.findall(r'\["(\d+\.\d+)', (here.parent.parent / "scripts" / "book-check.mjs").read_text(encoding="utf8")))
TITLES = {1: "The language of mathematics", 2: "Linear equations", 3: "Matrices", 4: "What is optimization?",
          5: "Euclidean vector spaces", 6: "Convex functions", 7: "Several variables", 8: "The Hessian", 9: "Convex optimization"}

def cell(v):
    if v == "-":
        return "no Python (proof / explain / prompt)"
    out = []
    for part in v.split():
        part = part.lstrip("+?")
        m = re.match(r"(\w+)(?:\[(.*)\])?", part)
        out.append(f"`\\{m.group(1)}`" + (f" ({m.group(2)})" if m.group(2) else ""))
    return ", ".join(out)

n_py = sum(v != "-" for v in cov.values())
lines = [
    "# IMO26 exercises: Python snippets",
    "",
    f"All {len(ex)} exercises of the book. {n_py} can be done with a snippet; "
    f"{len(ex) - n_py} are proofs, explanations or chatbot prompts.",
    "",
    "Use: open a ```python block, type `\\` + the snippet name **or the exercise's own words** "
    "(`\\truth table`, `\\twin primes`, `\\interest rate`), pick it, fill in the form, Enter.",
    "✓ = this exact exercise is solved and checked against the right answer by the test suite.",
    "",
]
for ch in range(1, 10):
    rows = [e for e in ex if e["ch"] == ch]
    lines += [f"## Chapter {ch}: {TITLES[ch]}", "", "| Exercise | Snippet | Checked | Topic |", "|---|---|---|---|"]
    for e in rows:
        topic = e["text"][:70].replace("|", "/").replace("[prompt]", "").strip()
        lines.append(f"| {e['id']} | {cell(cov[e['id']])} | {'✓' if e['id'] in checked else ''} | {topic}… |")
    lines.append("")
out = sys.argv[1] if len(sys.argv) > 1 else str(here / "COVERAGE.md")
Path(out).write_text("\n".join(lines), encoding="utf8")
print("wrote", out, "python:", n_py, "checked:", len(checked))
