# Print the named python snippets: python -I snip.py name1 name2 ...
import re, sys
sys.stdout.reconfigure(encoding="utf-8")
md = open(r"C:\Users\emill\Projects\obsidian-math-autocomplete\src\py-snippets.md", encoding="utf8").read()
for s in re.split(r"(?m)^(?=## \\)", md):
    m = re.match(r"## \\(\w+)", s)
    if m and m.group(1) in sys.argv[1:]:
        print(s.rstrip() + "\n")
