# Day 4 — KV Cache & Continuous Batching, From Scratch

**Goal.** Remove the one deliberate inefficiency in Day 3 (recomputing the whole prefix every
step), then scale from *one* generation loop to *many* requests: paged KV memory and an
iteration-level scheduler. Verified, no model library — NumPy math only.
**Serving (HTTP/APIs/streaming) is Day 5** — this day ends at the engine core.

## What you will build

1. [ ] `code/day3_common.py` — shared loader: Day-1 weights + Day-2 tokenizer + Day-3 ops,
       plus `KVCache` + `cached_forward` (prefill writes rows; decode appends 1 row).
2. [ ] `code/01_naive_vs_cached.py` — naive full-recompute loop vs incremental KV-cache loop.
       **Golden checksum must pass on both**, token-for-token, plus max |logit diff| measured.
3. [ ] `code/02_paged_kv.py` — PagedAttention-style block pool: fixed-size blocks, block table,
       free list, prefix sharing with reference counts, copy-on-write, fragmentation metrics.
4. [ ] `code/03_continuous_batching.py` — static batching vs continuous (iteration-level) batching
       simulator: arrival times, prefill/decode phases, makespan, GPU busy %, tokens/sec,
       per-request latency. Plus the batched-decode GEMM shape argument and KV-memory capacity cap.
5. [ ] `code/04_error_gallery.py` — inject cache/scheduler bugs one at a time; record behavior.

## Concepts that must click

- [ ] **Why caching works:** past K/V rows are pure functions of past tokens; appending a token
      never changes them. Recompute is waste, not correctness.
- [ ] **The cache contract:** prefill writes rows 0..T-1; decode computes 1 new row and appends.
      Output must be *identical* to the naive loop (same tokens, logits within float tolerance).
- [ ] **KV memory math:** bytes/token = layers × 2 (K+V) × kv_heads × head_dim × dtype_bytes.
      GPT-2: 36,864 B (FP16) / 73,728 B (FP32). This — not weights — sets max concurrency.
- [ ] **Paged KV:** OS virtual-memory analogy; logical block table → physical blocks; free list;
      prefix sharing (refcounts) + copy-on-write; why reservation-based allocation wastes 60–80%.
- [ ] **Continuous batching:** iteration-level scheduling; admit on free slot; prefill is
      compute-bound, decode is bandwidth-bound; batching decode is ~free because weight bytes are
      fetched once per batch, not per request.
- [ ] **Error gallery:** stale cache rows, position-offset off-by-one, mask bugs in cached prefill,
      cross-request cache contamination, KV dtype downcast (FP16), free-list aliasing.

## Numbers to verify (this machine)

- [ ] Cached decode produces the golden 8 tokens: ` the most powerful machines on the planet.`
- [ ] max |logits_cached − logits_naive| ≈ 0 (report actual)
- [ ] Speedup: wall time naive vs cached for 8 tokens on the 10-token prompt (report actual)
- [ ] KV bytes/token: 73,728 B FP32 / 36,864 B FP16; cache size after 18 tokens
- [ ] Paged sim: block=16 → waste stats; prefix sharing refcount=2; CoW splits partial block
- [ ] Scheduler sim: static vs continuous — makespan, busy %, tokens/s, wait time (report actual)
- [ ] Capacity: RTX 3050 4 GB − 0.5 GB weights − FP16 KV ⇒ max concurrent tokens (computed)
- [ ] Gallery: every injected bug’s observed behavior recorded in `notes/errors.md`

## The debugging order

1. Golden checksum on the **naive** path (Day 3 already proven).
2. Cache equality: one decode step, compare logits to naive — must match to ~1e-9.
3. Then multi-step cached checksum.
4. Then paging/batching — token identity must still hold per request.
5. Only then think about throughput. (Serving over HTTP: Day 5.)

## Exercises

- [ ] Add FP16 KV storage to the cache; measure logit drift vs FP32 cache; does the golden
      continuation survive? (The error gallery does the measurement — explain WHY.)
- [ ] In the scheduler sim, add chunked prefill (split a long prefill across 3 iterations) and
      observe decode latency of concurrent requests.
- [ ] Capacity worksheet: verify your arithmetic from the checklist against the paged sim by
      actually allocating that many tokens.
- [ ] Prefix caching: extend the paged pool so a *second identical prompt* reuses blocks instead
      of re-prefilling (that is SGLang RadixAttention / vLLM prefix caching in miniature).
