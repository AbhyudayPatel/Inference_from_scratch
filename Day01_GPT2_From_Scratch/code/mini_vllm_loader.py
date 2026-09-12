"""
mini_vllm_loader.py — vLLM's weight-loading protocol, reimplemented for GPT-2.

Every engine loader (vLLM DefaultModelLoader, SGLang, and TRT-LLM's build-time
converter) is the SAME 4-hook protocol:

    enumerate → filter → map → place

  enumerate : iterate (name, tensor) lazily per shard   [safetensors_weights_iterator]
  filter    : skip non-parameter junk                   [".attn.bias" rule]
  map       : checkpoint name  → engine param name      [per-model load_weights()]
  place     : weight_loader(): slice (TP) / fuse (QKV) / cast / move to device

Faithful to vLLM's real GPT-2 loader (vllm/model_executor/models/gpt2.py):
  * skips names ending in "attn.bias"  (the 48MB of mask buffers we found)
  * prefixes everything with "transformer."
  * ties lm_head.weight to wte.weight (no second copy)
Plus the two industrial mechanisms GPT-2 alone doesn't show:
  * fused QKV from SEPARATE q/k/v (how Llama loads)   [shard_id offsets]
  * tensor-parallel slicing at load                    [narrow() at the byte level]
"""

import time
import numpy as np
from inspect_safetensors import load_safetensors

CKPT = "models/model.safetensors"


# ══════════════════════════════════════════════════════════════
# HOOK 3 (map) — pure name surgery, vLLM-gpt2.py style
# ══════════════════════════════════════════════════════════════
def map_name(name: str) -> str:
    """checkpoint name -> engine param name (vLLM's GPT2 rule, verbatim spirit)"""
    if not name.startswith("transformer."):
        name = "transformer." + name          # h.0.*  ->  transformer.h.0.*
    return name                               # wte/wpe/ln_f get the same prefix


# ══════════════════════════════════════════════════════════════
# HOOK 4 (place) — the weight_loader protocol
# ══════════════════════════════════════════════════════════════
def weight_loader_direct(param, loaded):
    """plain copy (+ dtype cast): GPT-2's already-fused c_attn takes this path"""
    assert param.shape == loaded.shape, f"{param.shape} vs {loaded.shape}"
    np.copyto(param, loaded, casting="no")


def weight_loader_shard(param, loaded, shard_id):
    """write ONE piece into a fused param — how Llama's q/k/v become one qkv_proj"""
    shard_dim = 1                            # fuse along output columns
    off = {"q": 0, "k": 768, "v": 1536}[shard_id]
    param[:, off:off + loaded.shape[1]] = loaded


def weight_loader_tp(param, loaded, tp_rank, tp_size):
    """tensor-parallel slice-at-load: rank keeps only its narrow() of the tensor"""
    chunk = loaded.shape[1] // tp_size
    np.copyto(param, loaded[:, tp_rank * chunk:(tp_rank + 1) * chunk])


def main():
    t0 = time.time()

    # ── HOOK 1 (enumerate): lazy (name, tensor) iterator over the file ──
    ckpt, _ = load_safetensors(CKPT)         # our hand parser stands in for
                                             # safe_open(...).items()
    # ── engine-side skeleton: the "meta device" idea ──
    # Engines first build the param table with shapes/dtypes and NO data
    # (HF: meta device; vLLM: device="meta"/empty), then place fills it.
    engine, bytes_placed, skipped = {}, 0, []

    for name, tensor in ckpt.items():                    # enumerate
        # ── HOOK 2 (filter): drop non-parameter buffers ──
        if name.endswith(SKIP := (".attn.bias",)):
            skipped.append(name)
            continue
        # ── HOOK 3+4 (map & place) ──
        pname = map_name(name)
        engine[pname] = np.empty_like(tensor)            # meta -> allocate
        weight_loader_direct(engine[pname], tensor)      # place
        bytes_placed += tensor.nbytes

    # weight tying: lm_head SHARES wte — never stored or copied twice
    engine["lm_head.weight"] = engine["transformer.wte.weight"]

    dt = time.time() - t0
    print(f"enumerated : {len(ckpt)} tensors in checkpoint")
    print(f"filtered   : {len(skipped)} junk buffers  (e.g. {skipped[0]})")
    print(f"placed     : {len(engine) - 1} params + 1 tied (lm_head == wte)")
    print(f"bytes moved: {bytes_placed/1e6:.0f} MB in {dt:.2f}s "
          f"({bytes_placed/1e9/dt:.2f} GB/s effective)")

    # sanity: renamed copy is exact
    assert np.array_equal(engine["transformer.h.0.attn.c_attn.weight"],
                          ckpt["h.0.attn.c_attn.weight"])
    print("verify     : direct path bitwise-exact [OK]")

    # ── mechanism A: fused QKV from SEPARATE q/k/v (the Llama case) ──
    # GPT-2 ships c_attn pre-fused; Llama ships 3 tensors. Simulate Llama by
    # splitting, then let weight_loader_shard reassemble — vLLM's exact trick.
    W = ckpt["h.0.attn.c_attn.weight"]                   # (768, 2304)
    qkv_fused = np.empty_like(W)
    for shard_id, sl in (("q", W[:, :768]), ("k", W[:, 768:1536]), ("v", W[:, 1536:])):
        weight_loader_shard(qkv_fused, sl, shard_id)     # 3 loads → 1 param
    assert np.array_equal(qkv_fused, W)
    print("verify     : 3x(q,k,v) -> fused qkv via shard_id offsets [OK]")

    # ── mechanism B: TP=2 slice-at-load ──
    chunk = W.shape[1] // 2
    rank0, rank1 = np.empty((768, chunk)), np.empty((768, chunk))
    weight_loader_tp(rank0, W, tp_rank=0, tp_size=2)     # each rank reads ONLY
    weight_loader_tp(rank1, W, tp_rank=1, tp_size=2)     # its byte range
    assert np.array_equal(np.concatenate([rank0, rank1], axis=1), W)
    print("verify     : TP=2 narrow() slices reassemble to the original [OK]")


if __name__ == "__main__":
    main()
