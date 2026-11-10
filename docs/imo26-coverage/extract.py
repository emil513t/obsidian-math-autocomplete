import json, re, sys
t = open(sys.argv[1], encoding="utf8").read()
# drop page headers: "=====PAGE n\n<chapter title>\n<page number>\n"
pages = re.split(r"=====PAGE (\d+)\n", t)
text, pagemap = "", []
for i in range(1, len(pages), 2):
    body = re.sub(r"^\d+\. [A-Z][A-Z ,&'-]+\n\d+\n", "", pages[i + 1])
    pagemap.append((len(text), int(pages[i])))
    text += body
def page_of(pos):
    p = 1
    for start, n in pagemap:
        if start <= pos: p = n
    return p
hdr = re.compile(r"^\((\d+)\.(\d+)\) ([A-Z][A-Z ]+)\.", re.M)
heads = list(hdr.finditer(text))
out = []
for k, m in enumerate(heads):
    if m.group(3).strip() != "EXERCISE":
        continue
    end = heads[k + 1].start() if k + 1 < len(heads) else len(text)
    body = text[m.end():end]
    body = body.split("♠")[0]
    body = re.sub(r"LLM prompt — not displayed in the pdf version\.", "[prompt]", body)
    body = re.sub(r"\s+", " ", body).strip()
    out.append({"id": f"{m.group(1)}.{m.group(2)}", "ch": int(m.group(1)), "page": page_of(m.start()), "text": body})
json.dump(out, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), dict(Counter(e["ch"] for e in out)))
