# Merge new-snippets.md into src/py-snippets.md: same-name sections are
# replaced in place, new ones go right after the previous section of the
# new file (so related snippets stay together).
import re, sys
SRC = r"C:\Users\emill\Projects\obsidian-math-autocomplete\src\py-snippets.md"
NEW = sys.argv[1]

def sections(md):
    head, *rest = re.split(r"(?m)^(?=## \\)", md)
    out = []
    for s in rest:
        name = re.match(r"## \\(\w+)", s).group(1)
        out.append([name, s.rstrip() + "\n\n"])
    return head, out

head, cur = sections(open(SRC, encoding="utf8").read())
_, new = sections(open(NEW, encoding="utf8").read())
names = [n for n, _ in cur]
last = None
for name, body in new:
    if name in names:
        cur[names.index(name)][1] = body
        print("replaced", name)
    else:
        at = names.index(last) + 1 if last in names else len(cur)
        cur.insert(at, [name, body])
        names.insert(at, name)
        print("added   ", name, "after", last)
    last = name
open(SRC, "w", encoding="utf8", newline="\n").write(head + "".join(b for _, b in cur).rstrip() + "\n")
