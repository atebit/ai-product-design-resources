#!/usr/bin/env python3
"""
Reproducible tree-level census of an agent-skill directory.

Produces the four survey measurements that motivated this research stream:
  1. SKILL.md composition  — code / table / blockquote / prose split
  2. Normative density     — share of prose carrying a hard directive
  3. Cross-skill dedup     — duplicated paragraphs across the whole tree
  4. SKILL.md <-> refs     — near-duplicate overlap (8-gram shingles)

Usage:
    python3 census.py <skills-dir>

Verified against github.com/figma/mcp-server-guide @ a5e7e04 (plugin v2.2.108):
    python3 census.py path/to/mcp-server-guide/skills
"""
import os, re, sys
from collections import defaultdict

NORM = re.compile(
    r"\b(MUST NOT|MUST|NEVER|ALWAYS|DO NOT|Do not|Never|Always"
    r"|REQUIRED|MANDATORY|You SHOULD|SHOULD NOT)\b"
)

def strip_code(t):
    return re.sub(r"```.*?```", "", t, flags=re.S)

def composition(root, skills):
    print("=== 1. SKILL.md composition (bytes) ===")
    print(f"{'skill':<26}{'total':>8}{'code':>9}{'table':>8}{'quote':>8}{'prose':>9}  code%")
    tot = defaultdict(int)
    for s in skills:
        p = os.path.join(root, s, "SKILL.md")
        if not os.path.isfile(p):
            continue
        txt = open(p).read()
        code = sum(len(m) for m in re.findall(r"```.*?```", txt, re.S))
        lines = txt.split("\n")
        table = sum(len(l) + 1 for l in lines if l.strip().startswith("|"))
        quote = sum(len(l) + 1 for l in lines if l.strip().startswith(">"))
        prose = len(txt) - code - table - quote
        for k, v in (("total", len(txt)), ("code", code), ("table", table),
                     ("quote", quote), ("prose", prose)):
            tot[k] += v
        print(f"{s:<26}{len(txt):>8}{code:>9}{table:>8}{quote:>8}{prose:>9}"
              f"  {100*code/len(txt):4.0f}%")
    print(f"{'TOTAL':<26}{tot['total']:>8}{tot['code']:>9}{tot['table']:>8}"
          f"{tot['quote']:>8}{tot['prose']:>9}  {100*tot['code']/tot['total']:4.0f}%\n")

def normative(root, skills):
    print("=== 2. Normative vs explanatory (prose sentences) ===")
    tn = to = ts = tnn = 0
    for s in skills:
        p = os.path.join(root, s, "SKILL.md")
        if not os.path.isfile(p):
            continue
        txt = strip_code(open(p).read())
        txt = "\n".join(l for l in txt.split("\n") if not l.strip().startswith("|"))
        sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+|\n\n", txt) if len(x.strip()) > 25]
        norm = [x for x in sents if NORM.search(x)]
        nb = sum(len(x) for x in norm)
        ts += len(sents); tnn += len(norm); tn += nb
        to += sum(len(x) for x in sents) - nb
    print(f"sentences: {ts}   normative: {tnn} ({100*tnn/ts:.0f}%)")
    print(f"normative is {100*tn/(tn+to):.0f}% of prose bytes; "
          f"explanatory/rationale is {100*to/(tn+to):.0f}%\n")

def dedup(root):
    print("=== 3. Cross-file duplication (paragraphs >=80 chars) ===")
    seen = defaultdict(list)
    files = [os.path.join(r, f) for r, _, fs in os.walk(root)
             for f in fs if f.endswith(".md")]
    for p in files:
        for b in re.split(r"\n\s*\n", strip_code(open(p, errors="ignore").read())):
            b = " ".join(b.split())
            if len(b) >= 80:
                seen[b].append(p)
    dup = sum(len(b) * (len(v) - 1) for b, v in seen.items() if len(v) > 1)
    tot = sum(len(b) for b, v in seen.items() for _ in v)
    print(f"files: {len(files)}   duplicated: {dup:,} / {tot:,} bytes "
          f"({100*dup/tot:.1f}%)\n")

def shingles(t, n=8):
    w = re.findall(r"[a-zA-Z]+", strip_code(t).lower())
    return set(tuple(w[i:i+n]) for i in range(max(0, len(w) - n + 1)))

def overlap(root, skills):
    print("=== 4. SKILL.md text restating its own references (8-gram) ===")
    total = 0
    for s in skills:
        sp = os.path.join(root, s, "SKILL.md")
        rd = os.path.join(root, s, "references")
        if not os.path.isfile(sp) or not os.path.isdir(rd):
            continue
        sk = shingles(open(sp).read())
        if not sk:
            continue
        ref = set()
        for r, _, fs in os.walk(rd):
            for f in fs:
                if f.endswith(".md"):
                    ref |= shingles(open(os.path.join(r, f), errors="ignore").read())
        ov = len(sk & ref) / len(sk)
        b = int(os.path.getsize(sp) * ov)
        total += b
        print(f"{s:<26}{100*ov:6.1f}%  ~{b:>6} bytes")
    print(f"\ntotal SKILL.md bytes restating own references: ~{total:,}\n")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = sys.argv[1]
    skills = sorted(d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d)))
    composition(root, skills)
    normative(root, skills)
    dedup(root)
    overlap(root, skills)
