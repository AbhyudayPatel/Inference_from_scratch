"""05 — ONE BPE ENGINE, MANY TOKENIZERS.

The algorithm from 04 is fixed. A "tokenizer family" = (vocab, merges, regex,
byte-map, special tokens). Swap the files -> swap the family.

Here: the SAME class tokenizes as GPT-2 (2019) and Qwen3 (2025), with the
Qwen pre-tokenizer regex parsed straight out of its tokenizer.json, special
tokens handled BEFORE BPE, and a hand-rolled ChatML chat template.

Also: the tokens/byte economics table across languages.
"""

import json
import regex as re

M = r"C:\Users\abhyu\Desktop\Inference_from_scratch\Day01_GPT2_From_Scratch\models"


def bytes_to_unicode():
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(0xA1, 0xAC + 1)) + list(range(0xAE, 0xFF + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return dict(zip(bs, [chr(c) for c in cs]))


BYTE_ENC = bytes_to_unicode()
BYTE_DEC = {v: k for k, v in BYTE_ENC.items()}


class ByteBPE:
    """Format-driven byte-level BPE: vocab.json + merges.txt + regex."""

    def __init__(self, vocab_path, merges_path, pattern, special_tokens=None):
        self.vocab = json.load(open(vocab_path, encoding="utf-8"))
        self.id2tok = {i: t for t, i in self.vocab.items()}
        self.ranks = {}
        with open(merges_path, encoding="utf-8") as f:
            first = f.readline()
            lines = [first] if not first.startswith("#") else []
            lines += f.readlines()
            for rank, line in enumerate(lines):
                a, b = line.rstrip("\n").split(" ")
                self.ranks[(a, b)] = rank
        self.pat = re.compile(pattern)
        # special tokens: string -> id; matched BEFORE the BPE stage
        self.special = dict(special_tokens or {})
        self.cache = {}

    @classmethod
    def from_hf_fast(cls, tokenizer_json_path, vocab_path, merges_path):
        """Pull regex + special tokens out of a HF tokenizer.json."""
        tj = json.load(open(tokenizer_json_path, encoding="utf-8"))
        assert tj["model"]["type"] == "BPE", tj["model"]["type"]
        pat = None
        pt = tj.get("pre_tokenizer") or {}
        seq = pt.get("pretokenizers") if pt.get("type") == "Sequence" else [pt]
        for p in seq:
            if p and p.get("type") == "Split":
                pat = p["pattern"]["Regex"]
                break
        special = {t["content"]: t["id"] for t in tj.get("added_tokens", [])}
        return cls(vocab_path, merges_path, pat, special)

    def bpe(self, token):
        if token in self.cache:
            return self.cache[token]
        word = tuple(token)
        while len(word) > 1:
            best_rank, best_i = None, -1
            for i in range(len(word) - 1):
                r = self.ranks.get((word[i], word[i + 1]))
                if r is not None and (best_rank is None or r < best_rank):
                    best_rank, best_i = r, i
            if best_i < 0:
                break
            word = word[:best_i] + (word[best_i] + word[best_i + 1],) + word[best_i + 2:]
        self.cache[token] = word
        return word

    def encode(self, text):
        ids = []
        if self.special:
            # split on special token strings first; specials keep their id, the rest is BPE'd
            pat = "(" + "|".join(re.escape(s) for s in sorted(self.special, key=len, reverse=True)) + ")"
            segments = re.split(pat, text)
        else:
            segments = [text]
        for seg in segments:
            if not seg:
                continue
            if seg in self.special:
                ids.append(self.special[seg])
                continue
            for chunk in self.pat.findall(seg):
                mapped = "".join(BYTE_ENC[b] for b in chunk.encode("utf-8"))
                ids.extend(self.vocab[p] for p in self.bpe(mapped))
        return ids

    def decode(self, ids):
        text = "".join(self.id2tok[i] for i in ids)
        return bytes(BYTE_DEC[ch] for ch in text if ch in BYTE_DEC).decode("utf-8", "replace")


GPT2_PATTERN = r"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"

gpt2 = ByteBPE(f"{M}/vocab.json", f"{M}/merges.txt", GPT2_PATTERN,
               special_tokens={"<|endoftext|>": 50256})
qwen = ByteBPE.from_hf_fast(f"{M}/qwen3/tokenizer.json", f"{M}/qwen3/vocab.json", f"{M}/qwen3/merges.txt")

print("=== FORMAT SWAP, SAME ENGINE ===")
print(f"GPT-2 : vocab={len(gpt2.vocab):,}  merges={len(gpt2.ranks):,}")
print(f"Qwen3 : vocab={len(qwen.vocab):,}  merges={len(qwen.ranks):,}  specials={len(qwen.special)}")
print("Qwen3 regex (parsed from tokenizer.json):")
print("  " + qwen.pat.pattern[:110] + "...")

print("\n=== SPECIAL TOKENS: matched before BPE, never BPE'd ===")
ids = qwen.encode("<|im_start|>user")
print("'<|im_start|>user' ->", ids, "  (151644 = <|im_start|>, one atomic id)")
ids = gpt2.encode("Hello<|endoftext|>")
print("'Hello<|endoftext|>' (GPT-2) ->", ids, "  (50256 = <|endoftext|>)")

print("\n=== CHAT TEMPLATE: messages -> serialized text -> IDs ===")
messages = [("system", "You are a helpful assistant."), ("user", "Hello!")]
def chatml(messages, add_generation_prompt=True):
    out = ""
    for role, content in messages:
        out += f"<|im_start|>{role}\n{content}<|im_end|>\n"
    if add_generation_prompt:
        out += "<|im_start|>assistant\n"
    return out
prompt = chatml(messages)
print("serialized prompt (escaped):")
print("  " + ascii(prompt))
ids = qwen.encode(prompt)
print(f"-> {len(ids)} token ids: {ids[:12]} ...")
print("   NOTE: the model never sees your JSON messages. It sees THIS string.")
print("   (The 4.1KB Jinja template in tokenizer_config.json generates exactly this.)")

print("\n=== TOKEN ECONOMICS: same meaning, different token counts ===")
texts = {
    "english": "The model is very good at understanding language.",
    "hindi": "\u092f\u0939 \u092e\u0949\u0921\u0932 \u092d\u093e\u0937\u093e \u0938\u092e\u091d\u0928\u0947 \u092e\u0947\u0902 \u092c\u0939\u0941\u0924 \u0905\u091a\u094d\u091b\u093e \u0939\u0948\u0964",
    "chinese": "\u8fd9\u4e2a\u6a21\u578b\u975e\u5e38\u64c5\u957f\u7406\u89e3\u8bed\u8a00\u3002",
    "emoji": "\U0001f600\U0001f680\U0001f525 \U0001f389\U0001f44d\U0001f4a1",
    "code": "def attention(q, k, v):\n    return softmax(q @ k.T) @ v\n",
}
print(f"{'text':<10} {'bytes':<6} {'gpt2 tokens':<12} {'qwen3 tokens':<13} {'qwen3 tok/byte':<15}")
for name, t in texts.items():
    b = len(t.encode("utf-8"))
    g, q = len(gpt2.encode(t)), len(qwen.encode(t))
    print(f"{name:<10} {b:<6} {g:<12} {q:<13} {q/b:<15.2f}")
print("\nlarger vocab (151,936 vs 50,257) => fewer tokens per byte =>")
print("less prefill compute, smaller KV cache, better multilingual compression.")
print("tokenizer design IS inference economics.")
