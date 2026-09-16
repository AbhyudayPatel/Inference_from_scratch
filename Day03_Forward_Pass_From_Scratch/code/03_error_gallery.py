"""03 — ERROR GALLERY: deliberately break the forward pass.

A model can run without throwing and still be totally wrong. These are the bugs that
matter in inference-engine work: shape errors are easy; silent numeric/layout errors
are the expensive ones.

Each variant runs the SAME prompt and prints its next greedy token versus the known
correct token (' the'). Add every signature to notes/errors.md.
"""

import importlib.util
import math
import numpy as np

spec = importlib.util.spec_from_file_location("core", r"Day03_Forward_Pass_From_Scratch\code\01_forward.py")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

W, tok = core.W, core.tok
N_LAYER, N_HEAD, N_EMBD, HEAD_DIM = core.N_LAYER, core.N_HEAD, core.N_EMBD, core.HEAD_DIM


def ln(x, g, b, eps):
    mu = x.mean(-1, keepdims=True)
    return (x - mu) / np.sqrt(x.var(-1, keepdims=True) + eps) * g + b


def sm(x, stable=True):
    if stable:
        x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)


def forward_variant(ids, *, ln_eps=1e-5, causal=True, transpose_square=False,
                    position_shift=0, random_head=False):
    """Same GPT-2 graph as 01_forward.py, with one switch changed."""
    T = len(ids)
    x = W["wte.weight"][ids] + W["wpe.weight"][np.arange(T) + position_shift]
    for i in range(N_LAYER):
        # LN -> QKV -> attention
        a = ln(x, W[f"h.{i}.ln_1.weight"], W[f"h.{i}.ln_1.bias"], ln_eps)
        p = f"h.{i}.attn"
        qkv = a @ W[f"{p}.c_attn.weight"] + W[f"{p}.c_attn.bias"]
        q, k, v = np.split(qkv, 3, axis=-1)
        def split_heads(t): return t.reshape(T, N_HEAD, HEAD_DIM).transpose(1, 0, 2)
        q, k, v = split_heads(q), split_heads(k), split_heads(v)
        scores = q @ k.transpose(0, 2, 1) / math.sqrt(HEAD_DIM)
        if causal:
            scores = np.where(np.triu(np.ones((T, T), dtype=bool), k=1), -1e10, scores)
        out = sm(scores) @ v
        out = out.transpose(1, 0, 2).reshape(T, N_EMBD)
        # THIS is the dangerous square matrix: W.T has exactly the same shape.
        attn_w = W[f"{p}.c_proj.weight"].T if transpose_square else W[f"{p}.c_proj.weight"]
        x = x + out @ attn_w + W[f"{p}.c_proj.bias"]
        # LN -> MLP
        m = ln(x, W[f"h.{i}.ln_2.weight"], W[f"h.{i}.ln_2.bias"], ln_eps)
        f = m @ W[f"h.{i}.mlp.c_fc.weight"] + W[f"h.{i}.mlp.c_fc.bias"]
        f = core.gelu_new(f)
        f = f @ W[f"h.{i}.mlp.c_proj.weight"] + W[f"h.{i}.mlp.c_proj.bias"]
        x = x + f
    x = ln(x, W["ln_f.weight"], W["ln_f.bias"], ln_eps)
    if random_head:
        # What happens if you forget GPT-2's tying and initialize a separate LM head?
        rng = np.random.default_rng(0)
        head = rng.normal(0, 0.02, size=W["wte.weight"].shape).astype(np.float32)
        return x @ head.T
    return x @ W["wte.weight"].T


prompt = "Alan Turing theorized that computers would one day become"
ids = tok.encode(prompt)
expected = " the"

print("prompt:", repr(prompt))
print("correct next token should be:", repr(expected))
print("\n=== SILENT-BUG GALLERY ===")

cases = [
    ("baseline", {}, "the control: exact forward"),
    ("LN epsilon = 1e3", {"ln_eps": 1e3}, "runs; normalization is nearly erased"),
    ("NO causal mask", {"causal": False}, "runs; future leaks into earlier token states"),
    ("square c_proj transposed", {"transpose_square": True}, "runs; 768x768 hides the layout bug"),
    ("position IDs +1", {"position_shift": 1}, "runs; every token gets the wrong learned position"),
    ("untied random lm_head", {"random_head": True}, "runs; output rows no longer match input embedding meaning"),
]

for name, kwargs, why in cases:
    logits = forward_variant(ids, **kwargs)[-1]
    nxt = int(np.argmax(logits))
    piece = tok.decode([nxt])
    top3 = ", ".join(ascii(tok.decode([j])) for j in np.argsort(logits)[-3:][::-1])
    verdict = "OK" if piece == expected else "WRONG (silent)"
    print(f"{name:<26} -> {ascii(piece):<18} {verdict:<16} top3={top3}")
    print(f"  why: {why}")

print("\n=== UNSTABLE SOFTMAX: a loud numerical failure ===")
logits = core.forward(ids)[-1]
# FP32 is what GPU kernels normally use for this stage. Scaling just makes the
# underflow visible on a short demo; real attention logits can be this extreme too.
danger = (logits * 10).astype(np.float32)
with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
    bad_probs = sm(danger, stable=False)
print("scaled FP32 logits range:", f"[{danger.min():.1f}, {danger.max():.1f}]")
print("softmax WITHOUT subtract(max): has_nan=", bool(np.isnan(bad_probs).any()),
      "sum=", bad_probs.sum())
good_probs = sm(danger, stable=True)
print("softmax WITH    subtract(max): has_nan=", bool(np.isnan(good_probs).any()),
      "sum=", f"{good_probs.sum():.6f}")

print("\n=== SHAPE ERROR (the easy kind) ===")
try:
    x = np.zeros((1, 768), dtype=np.float32)
    x @ W["h.0.attn.c_attn.weight"].T  # (1,768) @ (2304,768): refuses
except ValueError as e:
    print("c_attn wrong transpose ->", str(e).split(". ")[0])
print("c_proj wrong transpose -> no exception (square); that is why the silent case above is dangerous.")
