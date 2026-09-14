"""04 — GPT-2 BYTE-LEVEL BPE FROM SCRATCH. The real thing. No tokenizer libs.

Pipeline (exactly what HF's GPT2Tokenizer does internally):

  raw text
    -> pre-tokenize with the GPT-2 regex (chunks: words, numbers, punct, space)
    -> each chunk: utf-8 bytes -> byte->unicode-char map (the "G" alphabet)
    -> BPE merge loop over those chars, driven by merges.txt RANKS
    -> vocab.json lookup -> token IDs

Files (from Day 1 download):
  ../../Day01_GPT2_From_Scratch/models/vocab.json   token string -> id   (50,257)
  ../../Day01_GPT2_From_Scratch/models/merges.txt   merge rules by rank  (50,000)

Golden vectors (from HF):
  "Hello world"   -> [15496, 995]
  "Hello, world!" -> [15496, 11, 995, 0]
"""

import json
import time
import regex as re  # stdlib re lacks \p{L}; same engine HF uses underneath

MODELS = "../../Day01_GPT2_From_Scratch/models"


# ---------------------------------------------------------------- bytes -> unicode
def bytes_to_unicode():
    """GPT-2's trick: map every byte to a *printable* unicode char.

    Printable ranges (0x21-0x7E, 0xA1-0xAC, 0xAE-0xFF) map to themselves.
    The 68 ugly bytes (space, newline, controls, DEL...) get chars at 256+n.
    So ' ' (0x20) becomes chr(256+32) = 'G' (U+0120) — the famous "G" prefix.
    BPE never has to merge invisible bytes; it merges visible chars instead.
    """
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(0xA1, 0xAC + 1)) + list(range(0xAE, 0xFF + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    cs = [chr(c) for c in cs]
    return dict(zip(bs, cs))


BYTE_ENC = bytes_to_unicode()   # byte(int) -> char
BYTE_DEC = {v: k for k, v in BYTE_ENC.items()}

# GPT-2 pre-tokenizer pattern: contractions, optional-space words, numbers,
# punctuation runs, whitespace runs (with the (?!\S) newline merge trick)
GPT2_PATTERN = (
    r"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"
)


class GPT2Tokenizer:
    def __init__(self, models_dir=MODELS, pattern=GPT2_PATTERN):
        self.vocab = json.load(open(f"{models_dir}/vocab.json", encoding="utf-8"))
        self.id2tok = {i: t for t, i in self.vocab.items()}
        self.ranks = {}
        with open(f"{models_dir}/merges.txt", encoding="utf-8") as f:
            next(f)  # '#version: 0.2' header
            for rank, line in enumerate(f):
                a, b = line.rstrip("\n").split(" ")
                self.ranks[(a, b)] = rank
        self.pat = re.compile(pattern)
        self.cache = {}  # token string -> bpe result; production tokenizers lean on this hard

    # ---- the core: BPE over one pre-tokenized chunk (already byte-mapped) ----
    def bpe(self, token):
        if token in self.cache:
            return self.cache[token]
        word = tuple(token)
        if len(word) == 1:
            self.cache[token] = (token,)
            return (token,)
        while True:
            # find the adjacent pair with the LOWEST rank (= highest priority)
            best_rank, best_i = None, -1
            for i in range(len(word) - 1):
                r = self.ranks.get((word[i], word[i + 1]))
                if r is not None and (best_rank is None or r < best_rank):
                    best_rank, best_i = r, i
            if best_i < 0:
                break  # no more mergeable pairs
            i = best_i
            word = word[:i] + (word[i] + word[i + 1],) + word[i + 2:]
            if len(word) == 1:
                break
        self.cache[token] = word
        return word

    def encode(self, text):
        ids = []
        for chunk in self.pat.findall(text):                    # 1. pre-tokenize
            mapped = "".join(BYTE_ENC[b] for b in chunk.encode("utf-8"))  # 2. bytes -> chars
            for piece in self.bpe(mapped):                      # 3. merge by rank
                ids.append(self.vocab[piece])                   # 4. vocab lookup
        return ids

    def decode(self, ids):
        text = "".join(self.id2tok[i] for i in ids)             # ids -> mapped chars
        raw = bytes(BYTE_DEC[ch] for ch in text)                # chars -> raw bytes
        return raw.decode("utf-8", errors="replace")            # bytes -> text

    def pieces(self, ids):
        return [ascii(self.id2tok[i]) for i in ids]


if __name__ == "__main__":
    tok = GPT2Tokenizer()
    print(f"loaded: vocab={len(tok.vocab):,}  merges={len(tok.ranks):,}  byte_alphabet=256")

    print("\n=== GOLDEN VECTORS ===")
    for text, expect in [("Hello world", [15496, 995]), ("Hello, world!", [15496, 11, 995, 0])]:
        ids = tok.encode(text)
        ok = "OK " if ids == expect else "MISMATCH"
        print(f"{ok} {text!r:<16} -> {ids}  expected {expect}")
        print(f"     pieces: {tok.pieces(ids)}")

    print("\n=== ROUNDTRIP on tricky strings ===")
    tests = [
        "unbelievable",
        "The quick brown fox jumps over the lazy dog.",
        "Hello \u0928\u092e\u0938\u094d\u0924\u0947 \U0001f600",   # Hindi + emoji
        "def attention(x):\n    return x @ W\n",                    # code
        "  multiple   spaces  ",                                     # whitespace runs
        "\u4f60\u597d\uff0c\u4e16\u754c",                            # Chinese
    ]
    for t in tests:
        ids = tok.encode(t)
        back = tok.decode(ids)
        ok = "OK " if back == t else "MISMATCH"
        print(f"{ok} {ascii(t):<44} n={len(ids):<3} roundtrip={back == t}")

    print("\n=== UNSEEN WORD DECOMPOSES (subword magic) ===")
    ids = tok.encode("unbelievableness")
    print("unbelievableness ->", ids)
    print("pieces           ->", tok.pieces(ids))

    print("\n=== PERF: naive vs cached ===")
    big = "The quick brown fox jumps over the lazy dog. " * 200  # ~9k chars
    t0 = time.perf_counter(); ids1 = tok.encode(big); t1 = time.perf_counter()
    tok.cache.clear()
    t2 = time.perf_counter(); ids2 = tok.encode(big); t3 = time.perf_counter()
    n = len(big)
    print(f"first pass : {n:,} chars -> {len(ids1):,} ids in {1000*(t1-t0):.1f} ms ({n/(t1-t0)/1e6:.2f} MB/s)")
    print(f"cold cache : {'':<14} in {1000*(t3-t2):.1f} ms ({n/(t3-t2)/1e6:.2f} MB/s)")
    print("HF's Rust 'tokenizers' does this at ~100+ MB/s: same algorithm, systems engineering.")
