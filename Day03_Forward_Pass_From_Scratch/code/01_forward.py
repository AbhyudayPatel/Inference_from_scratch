"""01 — GPT-2 FORWARD PASS FROM SCRATCH (NumPy) + THE GOLDEN CHECKSUM.

Pipeline:
  Day-1 hand parser  ->  weights dict (Conv1D layout: (in, out) — NO transpose)
  Day-2 tokenizer    ->  token IDs
  this file          ->  12 transformer blocks in raw NumPy -> logits -> argmax

The checksum (llm.c reference, GPT-2 124M greedy):
  "Alan Turing theorized that computers would one day become"
    -> " the most powerful machines on the planet."
If our math is right, greedy decode reproduces it TOKEN FOR TOKEN.

Every op is annotated with the engine-kernel it corresponds to.
"""

import json
import struct
import math
import importlib.util

import numpy as np

M1 = r"C:\Users\abhyu\Desktop\Inference_from_scratch\Day01_GPT2_From_Scratch\models"
D2 = r"C:\Users\abhyu\Desktop\Inference_from_scratch\Day02_Tokenizers_From_Scratch\code\04_gpt2_bpe.py"

# ---------------------------------------------------------------- Day 2 tokenizer
spec = importlib.util.spec_from_file_location("d2tok", D2)
d2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d2)
tok = d2.GPT2Tokenizer(M1)

# ---------------------------------------------------------------- Day 1 loader
DTYPE_MAP = {"F32": np.float32, "F16": np.float16, "F64": np.float64}


def load_safetensors(path):
    with open(path, "rb") as f:
        (n,) = struct.unpack("<Q", f.read(8))
        header = json.loads(f.read(n).decode("utf-8"))
        buffer = f.read()
    header.pop("__metadata__", None)
    out = {}
    for name, info in header.items():
        b, e = info["data_offsets"]
        out[name] = np.frombuffer(buffer[b:e], dtype=DTYPE_MAP[info["dtype"]]).reshape(info["shape"])
    return out


W = load_safetensors(f"{M1}/model.safetensors")
cfg = json.load(open(f"{M1}/config.json"))
N_LAYER, N_HEAD, N_EMBD = cfg["n_layer"], cfg["n_head"], cfg["n_embd"]
HEAD_DIM = N_EMBD // N_HEAD  # 64

# Drop the 12 causal-mask junk buffers — hook 2 (filter), exactly like vLLM.
W = {k: v for k, v in W.items() if not k.endswith(".attn.bias")}

# ---------------------------------------------------------------- the math
def layer_norm(x, g, b, eps=1e-5):
    """engines: fused LN kernel (one pass, Welford). Here: mean/var the obvious way."""
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)          # population variance (ddof=0)
    return (x - mu) / np.sqrt(var + eps) * g + b


def gelu_new(x):
    """GPT-2's tanh-approx GELU. Using exact erf-GELU here = WRONG numbers."""
    return 0.5 * x * (1.0 + np.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * x**3)))


def softmax(x, axis=-1):
    """stable softmax: subtract row max first. engines: fused online-softmax (FlashAttention)."""
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def linear(x, w, b):
    """GPT-2 Conv1D layout: w is (in, out) -> y = x @ w + b. NO transpose."""
    return x @ w + b


def attention(x, i):
    """one attention sub-block. engines: FlashAttention/PagedAttention kernel."""
    p = f"h.{i}.attn"
    qkv = linear(x, W[f"{p}.c_attn.weight"], W[f"{p}.c_attn.bias"])   # (seq, 2304)
    q, k, v = np.split(qkv, 3, axis=-1)                               # each (seq, 768)

    T = x.shape[0]
    def heads(t):  # (seq, 768) -> (12, seq, 64)
        return t.reshape(T, N_HEAD, HEAD_DIM).transpose(1, 0, 2)
    qh, kh, vh = heads(q), heads(k), heads(v)

    scores = qh @ kh.transpose(0, 2, 1) / math.sqrt(HEAD_DIM)         # (12, T, T)
    mask = np.triu(np.ones((T, T), dtype=bool), k=1)                  # j > i  (the future)
    scores = np.where(mask, -1e10, scores)
    attn = softmax(scores, axis=-1)
    out = attn @ vh                                                   # (12, T, 64)
    out = out.transpose(1, 0, 2).reshape(T, N_EMBD)                   # merge heads
    return linear(out, W[f"{p}.c_proj.weight"], W[f"{p}.c_proj.bias"])


def block(x, i):
    """pre-norm transformer block: attention + residual, then MLP + residual."""
    a = layer_norm(x, W[f"h.{i}.ln_1.weight"], W[f"h.{i}.ln_1.bias"])
    x = x + attention(a, i)                                           # residual 1
    m = layer_norm(x, W[f"h.{i}.ln_2.weight"], W[f"h.{i}.ln_2.bias"])
    f = linear(m, W[f"h.{i}.mlp.c_fc.weight"], W[f"h.{i}.mlp.c_fc.bias"])
    f = gelu_new(f)
    f = linear(f, W[f"h.{i}.mlp.c_proj.weight"], W[f"h.{i}.mlp.c_proj.bias"])
    return x + f                                                      # residual 2


def forward(ids):
    """ids -> logits (seq, 50257). The whole model."""
    pos = np.arange(len(ids))
    x = W["wte.weight"][ids] + W["wpe.weight"][pos]                   # token + position
    for i in range(N_LAYER):
        x = block(x, i)
    x = layer_norm(x, W["ln_f.weight"], W["ln_f.bias"])
    return x @ W["wte.weight"].T                                      # tied LM head



if __name__ == "__main__":
    # ---------------------------------------------------------------- THE GOLDEN CHECKSUM
    prompt = "Alan Turing theorized that computers would one day become"
    ids = tok.encode(prompt)
    print(f"prompt: {prompt!r}")
    print(f"ids ({len(ids)}): {ids}")

    generated = []
    for step in range(8):  # " the most powerful machines on the planet." = 8 tokens
        logits = forward(ids)[-1]                 # next-token distribution (no KV cache yet — Day 4)
        nxt = int(np.argmax(logits))              # greedy
        piece = tok.decode([nxt])
        top5 = np.argsort(logits)[-5:][::-1]
        top5s = ", ".join(f"{ascii(tok.decode([t]))}:{logits[t]:.2f}" for t in top5)
        print(f"step {step}: -> {ascii(piece):<24} top5: {top5s}")
        ids.append(nxt)
        generated.append(nxt)

    continuation = tok.decode(generated)
    expected = " the most powerful machines on the planet."
    print(f"\ncontinuation: {ascii(continuation)}")
    print(f"expected    : {ascii(expected)}")
    print("CHECKSUM:", "PASS - token-for-token match" if continuation == expected else "FAIL")
    print("\nfull text:")
    print(prompt + continuation)
