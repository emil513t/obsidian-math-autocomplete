import json, sys
sys.stdout.reconfigure(encoding="utf-8")
e = json.load(open("ex.json", encoding="utf8"))
chs = [int(c) for c in sys.argv[1].split(",")]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 330
for x in e:
    if x["ch"] in chs:
        print(f'{x["id"]}: {x["text"][:n]}')
