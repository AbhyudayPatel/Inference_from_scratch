"""01 — naive full-recompute loop vs incremental KV-cache loop.

Proves two things on the SAME prompt:
  1. equivalence: cached generation returns the golden continuation token-for-token,
     and the decode logits match the naive logits to float tolerance;
  2. cost: naive work grows with the prefix every step; cached work is constant.

Runs: 12.3s load (first time) + a few seconds of math.
"""
import time

import numpy as np

from day3_common import (GOLDEN_PROMPT, GOLDEN_CONT, KV_PER_TOKEN_FP32,
                         KVCache, cached_forward, d3, get_model,
                         get_tokenizer, naive_forward)


def main():
    W = get_model()
    tok = get_tokenizer()
    ids = tok.encode(GOLDEN_PROMPT)
    print(f"prompt ({len(ids)} tokens): {GOLDEN_PROMPT!r}")
    print(f"ids: {ids}")

    # ------------------------------------------------------------ reference
    t0 = time.perf_counter()
    out_naive = list(ids)
    for _ in range(8):
        logits = naive_forward(out_naive)[-1]        # recompute the WHOLE prefix
        out_naive.append(int(np.argmax(logits)))
    t_naive = (time.perf_counter() - t0) * 1000
    cont_naive = tok.decode(out_naive[len(ids):])
    assert cont_naive == GOLDEN_CONT, cont_naive
    print(f"\n[naive]  continuation={cont_naive!r}   total={t_naive:,.0f} ms")

    # ------------------------------------------------------- cached version
    t0 = time.perf_counter()
    cache = KVCache()
    logits = cached_forward(W, ids, cache)           # prefill: writes rows 0..9
    t_prefill = (time.perf_counter() - t0) * 1000
    out_cached = list(ids)
    step_ms = []
    diffs = []
    for step in range(8):
        nxt = int(np.argmax(logits[-1]))
        out_cached.append(nxt)
        t1 = time.perf_counter()
        logits = cached_forward(W, [nxt], cache)     # decode: ONE token only
        step_ms.append((time.perf_counter() - t1) * 1000)
        # equivalence probe: same position, naive vs cached logits
        ref = naive_forward(out_cached)[-1]
        diffs.append(float(np.abs(ref - logits[-1]).max()))
    cont_cached = tok.decode(out_cached[len(ids):])

    print(f"[cached] continuation={cont_cached!r}")
    print(f"         prefill={t_prefill:,.0f} ms  then decode steps:")
    print(f"         min={min(step_ms):.0f} ms  max={max(step_ms):.0f} ms  "
          f"mean={np.mean(step_ms):.0f} ms (constant -- prefix never recomputed)")
    print(f"         decode total={sum(step_ms):,.0f} ms vs naive {t_naive:,.0f} ms "
          f"-> {t_naive / sum(step_ms):.1f}x less work on this tiny prompt")

    # ---------------------------------------------------------------- checks
    assert cont_cached == GOLDEN_CONT, cont_cached
    assert out_cached == out_naive, (out_cached, out_naive)
    max_diff = max(diffs)
    print(f"\nmax |logits_cached - logits_naive| over 8 decode steps: {max_diff:.3e}")
    print("   (nonzero is expected: a (1,768) decode GEMM uses a different BLAS summation")
    print("    order than the (T,768) naive GEMM -> float reorder noise ~1e-4 on |logits|~100.")
    print("    The contract is TOKEN identity and relative-size drift, not bitwise identity.)")
    assert max_diff < 1e-3, max_diff          # relative to |logits| ~ 130: ~1e-6

    t_final = len(out_cached)
    print(f"cache after generation: {cache.length} rows x 12 layers "
          f"= {cache.bytes_stored():,} bytes ({cache.bytes_stored()/1024:,.0f} KiB)")
    print(f"KV cost per token: {KV_PER_TOKEN_FP32:,} bytes FP32 "
          f"({KV_PER_TOKEN_FP32//2:,} bytes if stored FP16/BF16 like engines do)")
    print(f"  -> {t_final} tokens x 73,728 B = {t_final*KV_PER_TOKEN_FP32:,} B  (matches: "
          f"{cache.bytes_stored() == t_final * KV_PER_TOKEN_FP32})")

    # FLOP accounting: weight matmuls ~ 2*N*T; naive pays T_growing, cached pays 1
    n = 124_439_808
    naive_flops = sum(2 * n * (len(ids) + s) for s in range(8))
    cached_flops = 2 * n * len(ids) + sum(2 * n * 1 for _ in range(8))
    print(f"weight-GEMM FLOPs: naive {naive_flops/1e9:.2f} GFLOP vs "
          f"cached {cached_flops/1e9:.2f} GFLOP "
          f"({naive_flops/cached_flops:.1f}x saved even at 8 tokens; grows linearly)")

    print("\nCHECKSUM: PASS -- cache is behaviorally invisible; it only removes waste.")


if __name__ == "__main__":
    main()
