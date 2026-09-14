"""03 — BPE TRAINING at toy scale. Hand-traceable merges on a tiny corpus.

This is the LEARNING phase. It runs once, offline, on a corpus.
The output (merge table) is all that survives into inference.
"""

from collections import Counter

CORPUS = ["low", "lower", "lowest", "newest", "widest"]

# each word starts as a tuple of characters (+ implicit end-of-word marker)
words = [tuple(w) + ("</w>",) for w in CORPUS]
print("corpus as symbols:")
for w in words:
    print("  ", " ".join(w))

merges = []
for step in range(6):
    # count every adjacent pair across the corpus (with word frequency = 1 here)
    pairs = Counter()
    for w in words:
        for a, b in zip(w, w[1:]):
            pairs[(a, b)] += 1
    if not pairs:
        break
    best = max(pairs, key=pairs.get)
    a, b = best
    merged = a + b
    merges.append((a, b, pairs[best]))
    print(f"\nstep {step+1}: most frequent pair = ({a!r}, {b!r}) x{pairs[best]}  -> merge into {merged!r}")
    # apply the merge everywhere
    new_words = []
    for w in words:
        out, i = [], 0
        while i < len(w):
            if i < len(w) - 1 and (w[i], w[i + 1]) == (a, b):
                out.append(merged)
                i += 2
            else:
                out.append(w[i])
                i += 1
        new_words.append(tuple(out))
    words = new_words
    print("   corpus now:", [" ".join(w) for w in words])

print("\n=== LEARNED MERGE TABLE (rank order = the file merges.txt) ===")
for rank, (a, b, n) in enumerate(merges):
    print(f"{rank:>4}: {a} {b}    # seen {n}x in corpus")

print("\n=== INFERENCE = replay the table, nothing is counted anymore ===")
def tokenize(word, merges):
    toks = list(word) + ["</w>"]
    table = {(a, b): r for r, (a, b, _) in enumerate(merges)}
    while True:
        best, best_rank = None, len(table) + 1
        for i in range(len(toks) - 1):
            r = table.get((toks[i], toks[i + 1]))
            if r is not None and r < best_rank:
                best, best_rank = i, r
        if best is None:
            break
        toks = toks[:best] + [toks[best] + toks[best + 1]] + toks[best + 2:]
    return toks

print("'lowest'  ->", tokenize("lowest", merges))
print("'widest'  ->", tokenize("widest", merges))
print("'slowest' ->", tokenize("slowest", merges), "  <- unseen word still decomposes sanely")
