"""01 — The abstraction: text -> tokens -> IDs, built three stupid ways.

No libraries. Establishes the word/char tradeoff that subwords solve.
ASCII-only prints (Windows cp1252 console).
"""


class WordTokenizer:
    """World's stupidest tokenizer: split on spaces."""

    def __init__(self):
        self.vocab = {}          # token string -> id
        self.inv = {}            # id -> token string

    def fit(self, texts):
        for t in texts:
            for tok in t.split(" "):
                if tok not in self.vocab:
                    idx = len(self.vocab)
                    self.vocab[tok] = idx
                    self.inv[idx] = tok

    def encode(self, text):
        ids = []
        for tok in text.split(" "):
            if tok not in self.vocab:
                ids.append(-1)   # <UNK>: the word-tokenizer disease
            else:
                ids.append(self.vocab[tok])
        return ids

    def decode(self, ids):
        return " ".join(self.inv.get(i, "<UNK>") for i in ids)


class CharTokenizer:
    """Every character is a token. Never OOV; sequences explode."""

    def __init__(self):
        self.vocab, self.inv = {}, {}

    def fit(self, texts):
        for t in texts:
            for ch in t:
                if ch not in self.vocab:
                    idx = len(self.vocab)
                    self.vocab[ch] = idx
                    self.inv[idx] = ch

    def encode(self, text):
        return [self.vocab.get(ch, -1) for ch in text]

    def decode(self, ids):
        return "".join(self.inv.get(i, "<UNK>") for i in ids)


corpus = ["hello world", "hello there world"]

w = WordTokenizer(); w.fit(corpus)
c = CharTokenizer(); c.fit(corpus)

print("=== WORD TOKENIZER ===")
print("vocab:", w.vocab)
ids = w.encode("hello world")
print('"hello world"      ->', ids, '->', repr(w.decode(ids)))
ids = w.encode("hello universe")
print('"hello universe"   ->', ids, '->', repr(w.decode(ids)), "  (universe = OOV!)")

print("\n=== CHAR TOKENIZER ===")
print("vocab size:", len(c.vocab))
ids = c.encode("hello world")
print('"hello world"      ->', ids)
print("                     ->", repr(c.decode(ids)))
ids = c.encode("hello universe")
print('"hello universe"   -> len', len(ids), "->", repr(c.decode(ids)), " (never OOV)")

print("\n=== THE TRADEOFF ===")
word = "unbelievable"
print(f"{'scheme':<12} {'vocab':<8} {'tokens for ' + repr(word):<30}")
print(f"{'word':<12} {'~100k+':<8} {str([word]):<30} OOV if unseen: 'unbelievableness' breaks")
print(f"{'char':<12} {'~200':<8} {str(list(word)):<30} 12 tokens for ONE word -> 12x compute+KV")
print(f"{'subword':<12} {'~50k':<8} {str(['un', 'believ', 'able']):<30} generalizes: unseen words compose")
print("\nmore tokens = more prefill FLOPs + more KV cache. tokenization is a systems decision.")
