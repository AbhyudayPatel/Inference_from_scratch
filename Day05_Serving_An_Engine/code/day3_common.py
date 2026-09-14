"""Shared loader for Day 4: Day-1 weights + Day-2 tokenizer + Day-3 ops.

Everything Day 4 builds (KV cache, paging, batching, serving) sits ON TOP of the
verified Day-3 forward pass. We import those ops instead of copying them, so a
bug here can never be confused with a bug there.
"""
import importlib.util
import os

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
D2 = os.path.normpath(os.path.join(ROOT, "..", "..", "Day02_Tokenizers_From_Scratch", "code"))
D3 = os.path.normpath(os.path.join(ROOT, "..", "..", "Day03_Forward_Pass_From_Scratch", "code"))


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


tk = _load(os.path.join(D2, "04_gpt2_bpe.py"), "d2tok")
d3 = _load(os.path.join(D3, "01_forward.py"), "d3fwd")

GOLDEN_PROMPT = "Alan Turing theorized that computers would one day become"
GOLDEN_CONT = " the most powerful machines on the planet."

# Cache the heavy one-time loads (module-level singletons)
_MODEL = None
_TOK = None


def get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = d3.W            # Day-3 loads the checkpoint at module import
    return _MODEL


def get_tokenizer():
    global _TOK
    if _TOK is None:
        models_root = os.path.normpath(os.path.join(
            ROOT, "..", "..", "Day01_GPT2_From_Scratch", "models"))
        _TOK = tk.GPT2Tokenizer(models_root)
    return _TOK


def naive_forward(ids):
    """Day-3 forward, recomputing everything. Reference/oracle."""
    return d3.forward(ids)


# ---------------------------------------------------------------- KV cache
class KVCache:
    """Per-layer K/V storage.

    layers[i] = (K, V), each shaped (12 heads, T, 64) — head-first, exactly the
    layout attention consumes. FP32 (our NumPy compute dtype); engines store FP16/BF16.
    """

    def __init__(self):
        self.layers = [None] * 12   # entries become (K, V) tuples after prefill

    @property
    def length(self):
        return 0 if self.layers[0] is None else self.layers[0][0].shape[1]

    def bytes_stored(self):
        if self.layers[0] is None:
            return 0
        return sum(k.nbytes + v.nbytes for k, v in self.layers)


def cached_forward(W, new_ids, cache):
    """One autoregressive step that ONLY computes rows for the new tokens.

    new_ids : tokens that are not yet in the cache (prefill: whole prompt; decode: 1 token)
    cache   : KVCache mutated in place (new K/V rows appended per layer)
    returns : logits (T_new, 50257) for the new positions only
    """
    t_past = cache.length
    t_new = len(new_ids)
    pos = np.arange(t_past, t_past + t_new)          # absolute positions of new tokens

    x = W["wte.weight"][new_ids] + W["wpe.weight"][pos]           # (T_new, 768)
    for i in range(12):
        a = d3.layer_norm(x, W[f"h.{i}.ln_1.weight"], W[f"h.{i}.ln_1.bias"])
        qkv = d3.linear(a, W[f"h.{i}.attn.c_attn.weight"], W[f"h.{i}.attn.c_attn.bias"])
        q, k, v = qkv[:, :768], qkv[:, 768:1536], qkv[:, 1536:]
        q = q.reshape(t_new, 12, 64).transpose(1, 0, 2)          # (12, T_new, 64)
        k = k.reshape(t_new, 12, 64).transpose(1, 0, 2)
        v = v.reshape(t_new, 12, 64).transpose(1, 0, 2)

        if cache.layers[i] is None:
            K, V = k, v
        else:
            K = np.concatenate([cache.layers[i][0], k], axis=1)  # (12, T_past+T_new, 64)
            V = np.concatenate([cache.layers[i][1], v], axis=1)
        cache.layers[i] = (K, V)

        t_all = K.shape[1]
        scores = (q @ K.transpose(0, 2, 1)) / 8.0                # (12, T_new, T_all)
        # causal rule with cache: new query at absolute pos (t_past + r) may attend
        # to any cached key plus new keys up to its own index r.
        if t_new > 1:
            rows = t_past + np.arange(t_new)                     # absolute query positions
            cols = np.arange(t_all)                              # absolute key positions
            scores = np.where(cols[None, None, :] > rows[None, :, None], -1e10, scores)
        # t_new == 1 (decode): the single query is the LAST position — it may attend
        # to everything, so no mask at all. This is why decode is mask-free.
        att = d3.softmax(scores) @ V                             # (12, T_new, 64)
        att = att.transpose(1, 0, 2).reshape(t_new, 768)
        x = x + d3.linear(att, W[f"h.{i}.attn.c_proj.weight"], W[f"h.{i}.attn.c_proj.bias"])
        m = d3.layer_norm(x, W[f"h.{i}.ln_2.weight"], W[f"h.{i}.ln_2.bias"])
        f = d3.linear(m, W[f"h.{i}.mlp.c_fc.weight"], W[f"h.{i}.mlp.c_fc.bias"])
        x = x + d3.linear(d3.gelu_new(f), W[f"h.{i}.mlp.c_proj.weight"], W[f"h.{i}.mlp.c_proj.bias"])
    x = d3.layer_norm(x, W["ln_f.weight"], W["ln_f.bias"])
    return x @ W["wte.weight"].T


def generate_cached(ids, n, greedy=True, W=None):
    """Prefill once, then decode n tokens using the cache. Greedy by default."""
    if W is None:
        W = get_model()
    cache = KVCache()
    logits = cached_forward(W, ids, cache)                       # prefill
    out = list(ids)
    for _ in range(n):
        nxt = int(np.argmax(logits[-1]))                         # greedy selector
        out.append(nxt)
        logits = cached_forward(W, [nxt], cache)                 # decode: ONE token
    return out, cache


KV_PER_TOKEN_FP32 = 12 * 2 * 12 * 64 * 4   # 73,728 B
KV_PER_TOKEN_FP16 = 12 * 2 * 12 * 64 * 2   # 36,864 B
