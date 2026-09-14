# Day 4 — Error Log

Real errors hit while building + the deliberate gallery. Pattern from Day 3 continues:
the crashes are easy; the silent wrong tokens are the education.

## Errors actually hit during development

| # | Where | What happened | Fix |
|---|-------|---------------|-----|
| E1 | `01_naive_vs_cached.py` | `AttributeError: build_model` — Day-3 module loads `W` at import, no builder fn | Adapt: `get_model()` returns `d3.W` |
| E2 | `day3_common.py` | `GPT2BPETokenizer` doesn't exist — Day-2 class is `GPT2Tokenizer(models_root)` | Match the real signature; pass absolute models path |
| E3 | `01_naive_vs_cached.py` | `assert max_diff < 1e-9` failed with **1.678e-04** | Not a bug: decode GEMM `(1,768)` vs naive `(T,768)` → different BLAS summation order. Contract = token identity, not bitwise identity. Tolerance 1e-3 |
| E4 | `02_paged_kv.py` | Asserted shared partial block keeps refcount 3 after both forks append | Wrong mental model: each appender CoW-copies the *partial* block (refcount correctly returns to 1); only the *full* 16/16 block stays shared at 3. vLLM semantics verified |
| E5 | `03_continuous_batching.py` | **27 preemptions of the same request (thrash)**, latency 3x | Root cause: `blocks_needed` read `self.tokens` = 0 for waiting requests → admission never counted prompt blocks → admit→overflow→preempt→re-admit loop. Fix: reserve `ceil(prompt/BLOCK)` at admission. *This is the class of bug real schedulers ship.* |
| E6 | `04_error_gallery.py` (1st draft) | 3 of 5 "bugs" printed `OK` | The injections were unobservable: stale-row test computed logits *before* the corruption; mask-bug checked the last row (mask never binds there); contamination prompt ("2 + 2 =") had the same answer either way (' 3' — GPT-2 can't do math). Lesson: **an error gallery without an observable difference is decoration.** Probed variants until each bug flipped a token or drifted logits measurably |
| E7 | prints | cp1252 mojibake from em-dashes again (`—` → ``) | ASCII-only prints, again |

## Deliberate gallery (verified outputs)

| bug | observed | oracle | verdict |
|-----|----------|--------|---------|
| stale cache rows, 4 tokens | ` the most powerful enough` | ` the most powerful machines` | silent, compounds at step 4 |
| decode position restarts at 0 | `,` | ` most` | silent |
| chunked prefill w/o causal mask | ` teacher` (row 0), drift 32.9 | ` most` | silent; hides in middle rows |
| cross-request cache reuse ("Water boils at") | ` the` | ` about` | silent — foreign context leak |
| dropped first K/V row | ` the` (step 2) | ` most` | silent |
| scheduler admission (E5) | 27 preemptions | 1 preemption | loud in *metrics*, invisible in output |
| FP16 KV storage | drift 5.6e-03, same token | — | acceptable noise; halve memory |

## Verified numbers (this machine, NumPy CPU FP32)

- naive 8 tokens on 10-token prompt: **842 ms**; cached: prefill **72 ms** + 8 × ~27 ms = **218 ms** → **3.9×** wall, **6.0×** weight-GEMM FLOPs (26.88 → 4.48 GFLOP); gap grows linearly with prefix length
- logit equivalence: max |cached − naive| = **1.678e-04** over 8 steps (BLAS reorder noise on |logits| ~ 100)
- KV/token: **73,728 B FP32 / 36,864 B FP16** (12 layers × 2 × 12 heads × 64 dim)
- 18-token sequence cache: **1,327,104 B = 1,296 KiB** (matches per-token math exactly)
- paged sim: reservation waste **72%** on an 8-request workload (vLLM paper: 60–80% typical); paged internal fragmentation **21.9%** → bounded by ≤1 partial block/sequence
- prefix sharing: 24-token prefix stored once for 3 sequences → **1,728 KiB saved** (FP16); CoW on the partial block only
- scheduler sim: static makespan **844 ms** @ 76% busy vs continuous **661 ms** @ 100% busy; avg latency 752 → 462 ms; wasted decode slots 18 → 0
- capacity demo (18-block pool): R queued behind memory until t=1218 ms; exactly 1 preemption (Q) with recompute
