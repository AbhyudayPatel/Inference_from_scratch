"""
compare_qwen3.py — 2025-proof the Day-1 parser: autopsy of Qwen3-0.6B vs GPT-2.

Discovers, with zero libraries:
  * BF16 dtype (numpy can't hold it) -> manual upcast via the bit trick
  * GQA: separate q/k/v projections, q_norm/k_norm, NO biases anywhere
  * RMSNorm (weight only), RoPE (no wpe table), SiLU, tied embeddings
  * checkpoint junk, 2025 edition: lm_head shipped DESPITE tie_word_embeddings
  * sharded big-brother: index.json weight_map routing (Qwen3-32B, 17 shards)
"""

import json
import numpy as np
from inspect_safetensors import read_header, DTYPE_MAP

QWEN = "models/qwen3/model.safetensors"
GPT2 = "models/model.safetensors"


def load_one_bf16(path, want):
    """BF16 -> FP32 by hand: bf16 is the TOP 16 bits of fp32.
    Pad 16 zero bits underneath:  uint16 -> uint32 << 16 -> view float32."""
    header, n = read_header(path)
    with open(path, "rb") as f:
        f.seek(8 + n)
        buffer = f.read()
    info = header[want]
    b, e = info["data_offsets"]
    u16 = np.frombuffer(buffer[b:e], dtype=np.uint16)      # raw bf16 bits
    f32 = (u16.astype(np.uint32) << 16).view(np.float32)   # the upcast trick
    return f32.reshape(info["shape"])


def inventory(path, label):
    header, n = read_header(path)
    meta = header.pop("__metadata__", None)
    dtypes = {}
    params = 0
    for name, info in header.items():
        dtypes[info["dtype"]] = dtypes.get(info["dtype"], 0) + 1
        params += int(np.prod(info["shape"]))
    print(f"\n=== {label} ===")
    print(f"tensors={len(header)}  dtypes={dtypes}  values_on_disk={params:,}")
    return header, params


def main():
    # ---- GPT-2 baseline recap -------------------------------------------
    gpt2_h, gpt2_p = inventory(GPT2, "GPT-2 (2019)")

    # ---- Qwen3 autopsy ---------------------------------------------------
    q_h, q_p = inventory(QWEN, "Qwen3-0.6B (2025)")
    layer0 = sorted(k for k in q_h if k.startswith("model.layers.0."))
    print("\nlayer-0 inventory (the 2025 block, as tensors):")
    for name in layer0:
        print(f"  {name:<52} {q_h[name]['dtype']:<5} {q_h[name]['shape']}")

    # ---- BF16 wall + manual upcast --------------------------------------
    q_w = load_one_bf16(QWEN, "model.layers.0.self_attn.q_proj.weight")
    print(f"\nBF16 upcast check: q_proj[0,:4] -> {q_w[0,:4]}")

    # ---- junk, 2025 edition ----------------------------------------------
    cfg = json.load(open("models/qwen3/config.json"))
    tied = cfg["tie_word_embeddings"]
    has_lm_head = "lm_head.weight" in q_h
    dup = int(np.prod(q_h["lm_head.weight"]['shape'])) * 2 if has_lm_head else 0
    print(f"\ntie_word_embeddings={tied}  but lm_head.weight in file = {has_lm_head}")
    if has_lm_head and tied:
        print(f"-> duplicate embedding shipped: {dup/1e6:.0f} MB of redundant bytes "
              f"(engines tie-and-skip it)")

    # ---- hand param count vs disk ---------------------------------------
    L, d, hd, nh, nkv, inter, V = 28, 1024, 128, 16, 8, 3072, 151936
    per_layer = (d*nh*hd + d*nkv*hd*2 + nh*hd*d          # q + k + v + o (no bias!)
                 + 2*hd + 2*d                            # q/k norm + 2 RMSNorms
                 + 3*d*inter)                            # gate + up + down
    hand = V*d + L*per_layer + d                         # embed + layers + final norm
    print(f"\nhand count (tied)   = {hand:,}")
    print(f"disk values         = {q_p:,}  (diff = lm_head dup: "
          f"{(q_p-hand)*2/1e6:.0f} MB)")
    print(f"BF16 memory check   = {q_p*2/1e9:.2f} GB ~= file size")

    # ---- sharded big brother ----------------------------------------------
    idx = json.load(open("models/qwen3_big_index/qwen3_32b_index.json"))
    wm = idx["weight_map"]
    shards = sorted(set(wm.values()))
    print(f"\nQwen3-32B: total_size={idx['metadata']['total_size']/1e9:.1f} GB, "
          f"{len(wm)} tensors routed across {len(shards)} shard files via weight_map")

    # ---- the diff that matters --------------------------------------------
    print("\n=== 2019 -> 2025: what changed, what didn't ===")
    rows = [
        ("dtype",        "F32",            "BF16 (2 bytes)"),
        ("norm",         "LayerNorm w+b",  "RMSNorm, weight only"),
        ("position",     "wpe table 1024x768", "NONE — RoPE computed in-kernel"),
        ("attention",    "MHA 12h, fused c_attn+bias", "GQA 16h/8kv, separate q/k/v, qk-norm, no bias"),
        ("MLP",          "gelu_new c_fc->c_proj", "SwiGLU gate/up/down"),
        ("biases",       "everywhere",     "nowhere"),
        ("embeddings",   "wte tied (implicit)", "tie_word_embeddings=true (but dup shipped!)"),
        ("junk in ckpt", "12x attn.bias masks (48MB)", "1x lm_head dup (~311MB)"),
        ("format",       "safetensors",    "safetensors  <-- UNCHANGED"),
        ("loader hooks", "enumerate-filter-map-place", "enumerate-filter-map-place  <-- UNCHANGED"),
    ]
    for k, a, b in rows:
        print(f"  {k:<14} {a:<30} -> {b}")


if __name__ == "__main__":
    main()
