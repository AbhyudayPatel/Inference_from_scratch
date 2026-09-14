"""04 — WHERE THE TIME GOES: operations, FLOPs, bytes, roofline intuition.

This is not a synthetic benchmark. It runs our exact Day-3 NumPy GPT-2 forward pass,
times every operation family, and derives why engine optimizations exist:
  * fused kernels: eliminate launch/temporary-memory overhead
  * FlashAttention: don't materialize T×T attention scores
  * KV cache (Day 4): don't recompute K/V for the prompt
  * continuous batching: make decode GEMMs wide enough to be compute-efficient

CPU timings vary by BLAS/threads. The RATIOS and byte math are the lesson.
"""

import importlib.util
import math
import time
import numpy as np

spec = importlib.util.spec_from_file_location("core", "01_forward.py")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

W, tok = core.W, core.tok
L, H, A, HD = core.N_LAYER, core.N_EMBD, core.N_HEAD, core.HEAD_DIM


def timed_forward(ids):
    """Same graph as core.forward, but clocks op families across all 12 layers."""
    t = {k: 0.0 for k in ("embed", "ln", "qkv_gemm", "attn", "out_gemm", "mlp_up", "gelu", "mlp_down", "lm_head")}
    start = time.perf_counter()
    pos = np.arange(len(ids))
    x = W["wte.weight"][ids] + W["wpe.weight"][pos]
    t["embed"] += time.perf_counter() - start
    T = len(ids)

    for i in range(L):
        # LN 1
        s = time.perf_counter(); a = core.layer_norm(x, W[f"h.{i}.ln_1.weight"], W[f"h.{i}.ln_1.bias"]); t["ln"] += time.perf_counter()-s
        # fused QKV projection
        s = time.perf_counter(); qkv = core.linear(a, W[f"h.{i}.attn.c_attn.weight"], W[f"h.{i}.attn.c_attn.bias"]); t["qkv_gemm"] += time.perf_counter()-s
        q, k, v = np.split(qkv, 3, axis=-1)
        def heads(z): return z.reshape(T, A, HD).transpose(1, 0, 2)
        q, k, v = heads(q), heads(k), heads(v)
        # score GEMM + causal mask + softmax + value GEMM
        s = time.perf_counter()
        score = q @ k.transpose(0, 2, 1) / math.sqrt(HD)
        score = np.where(np.triu(np.ones((T, T), dtype=bool), 1), -1e10, score)
        out = core.softmax(score) @ v
        out = out.transpose(1, 0, 2).reshape(T, H)
        t["attn"] += time.perf_counter()-s
        # attention output projection + residual
        s = time.perf_counter(); x = x + core.linear(out, W[f"h.{i}.attn.c_proj.weight"], W[f"h.{i}.attn.c_proj.bias"]); t["out_gemm"] += time.perf_counter()-s
        # LN 2
        s = time.perf_counter(); m = core.layer_norm(x, W[f"h.{i}.ln_2.weight"], W[f"h.{i}.ln_2.bias"]); t["ln"] += time.perf_counter()-s
        # MLP up, GELU, MLP down + residual
        s = time.perf_counter(); f = core.linear(m, W[f"h.{i}.mlp.c_fc.weight"], W[f"h.{i}.mlp.c_fc.bias"]); t["mlp_up"] += time.perf_counter()-s
        s = time.perf_counter(); f = core.gelu_new(f); t["gelu"] += time.perf_counter()-s
        s = time.perf_counter(); x = x + core.linear(f, W[f"h.{i}.mlp.c_proj.weight"], W[f"h.{i}.mlp.c_proj.bias"]); t["mlp_down"] += time.perf_counter()-s

    s = time.perf_counter(); x = core.layer_norm(x, W["ln_f.weight"], W["ln_f.bias"]); t["ln"] += time.perf_counter()-s
    s = time.perf_counter(); logits = x @ W["wte.weight"].T; t["lm_head"] += time.perf_counter()-s
    return logits, t


prompt = "Alan Turing theorized that computers would one day become"
ids = tok.encode(prompt)
# warmup: BLAS allocations/cache; never report first call alone
_ = core.forward(ids)
logits, times = timed_forward(ids)
total = sum(times.values())

print(f"=== PER-OP TIMING: GPT-2, T={len(ids)}, 12 layers, NumPy CPU ===")
print(f"{'op family':<15} {'ms':>10} {'share':>9} {'engine replacement'}")
labels = [
    ("embed", "gather / fused embedding lookup"),
    ("ln", "fused LayerNorm kernel"),
    ("qkv_gemm", "fused QKV GEMM"),
    ("attn", "FlashAttention / PagedAttention"),
    ("out_gemm", "output GEMM + residual fusion"),
    ("mlp_up", "MLP up GEMM"),
    ("gelu", "fused bias+GELU"),
    ("mlp_down", "MLP down GEMM + residual"),
    ("lm_head", "vocab GEMM + sampling top-k"),
]
for key, engine in labels:
    print(f"{key:<15} {times[key]*1000:>10.2f} {times[key]/total:>8.1%}  {engine}")
print(f"{'TOTAL':<15} {total*1000:>10.2f} {1:>8.1%}")

# --- FLOP accounting -------------------------------------------------------
T = len(ids)
P = 124_439_808
# approximate dense inference rule: every parameter is multiply+add once/token.
dense_flops = 2 * T * P
# exact attention mixing cost: QK^T + AV = 4*T*T*H per layer
attn_mix_flops = 4 * L * T * T * H
weight_bytes = P * 4
kv_per_token = 2 * L * H * 4
print("\n=== FLOP + BYTE ACCOUNTING ===")
print(f"dense rule        2 x T x P = 2 x {T} x {P:,} = {dense_flops/1e9:.3f} GFLOP")
print(f"attention mixing  4 x L x T^2 x H                = {attn_mix_flops/1e6:.3f} MFLOP")
print(f"weights (FP32)    P x 4 bytes                     = {weight_bytes/1e6:.1f} MB")
print(f"KV per token      2 x L x H x 4 bytes             = {kv_per_token:,} B ({kv_per_token/1024:.1f} KiB)  [Day 4]")
print(f"observed rate     {dense_flops/total/1e9:.2f} GFLOP/s  (CPU+NumPy, not a GPU benchmark)")

# --- roofline intuition ----------------------------------------------------
# Weight reuse in [T,H] @ [H,4H] means intensity increases approximately with T.
print("\n=== ROOFLINE: WHY PREFILL AND DECODE ARE DIFFERENT PROBLEMS ===")
print("phase       weight reuse     approx GEMM intensity       bottleneck             engine response")
for seq in (1, 10, 512, 2048):
    # GEMM flops (2*T*H*4H) / weights bytes (4*H*4H) = T/2 FLOP/B (roughly)
    intensity = seq / 2
    phase = "decode" if seq == 1 else "prefill"
    bottleneck = "memory bandwidth" if intensity < 20 else "compute / tensor cores"
    response = "batch requests / CUDA graph" if seq == 1 else "FlashAttention / big GEMMs"
    print(f"{phase:<11} T={seq:<4}          ~{intensity:>6.1f} FLOP/B          {bottleneck:<20} {response}")
print("\nDecode reads ~498 MB of weights to produce ONE token: ~0.5 FLOP/byte -> bandwidth-bound.")
print("Prefill reuses each weight across T prompt rows: intensity rises with T -> compute-bound.")
print("That one physical asymmetry creates vLLM's scheduler, CUDA-graph decode path, and Day-4 KV cache.")
