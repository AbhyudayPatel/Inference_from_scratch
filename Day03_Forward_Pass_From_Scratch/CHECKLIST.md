# Day 03 — The Forward Pass, in NumPy: CHECKLIST

Goal: token IDs + raw weights → logits → text, with **zero modeling libraries**. The Day-1 loader
and Day-2 tokenizer plug into a hand-written GPT-2 forward pass, and the whole pipeline must
reproduce a known-good greedy continuation **token-for-token**. Then: sampling strategies,
a deliberate-bug gallery (engine debugging skills), and where the FLOPs/bytes actually go —
so every engine optimization has a physical explanation.

**Rules:** NumPy for math only. No `torch.nn`, no `transformers`. HF output used as an *oracle*
checksum only (the known llm.c reference continuation), never as a library call.

---

## Part 1 — Wiring (`01_forward.py`)
- [x] Weight dict from Day-1 parser; shapes verified against config contract (head_dim 64, qkv 2304, mlp 3072).
- [x] Data path: `wte[ids] + wpe[pos]` → 12 × {LN → fused QKV → 12 heads → causal softmax → proj → +residual → LN → GELU-tanh MLP → +residual} → `ln_f` → `x @ wte.T`.
- [x] **Golden checksum:** greedy from `"Alan Turing theorized that computers would one day become"` must produce `" the most powerful machines on the planet."` — token-for-token.

## Part 2 — Sampling (`02_sampling.py`)
- [x] greedy · temperature · top-k · top-p implemented on raw logits; seeded, reproducible.
- [x] **Checkpoint:** same prompt, 4 strategies, visibly different continuations; each knob mapped to a vLLM `SamplingParams` field.

## Part 3 — Error gallery (`03_error_gallery.py`)
- [x] Inject 6 bugs one at a time; record the failure signature of each:
  wrong LN eps · missing causal mask · square c_proj transpose · position-id off-by-one ·
  softmax without max-subtraction · untied lm_head.
- [x] **Checkpoint:** every bug logged to `notes/errors.md` with its signature.

## Part 4 — Where the time goes (`04_where_time_goes.py`)
- [x] Per-op timing on a forward pass: matmul share of wall time.
- [x] FLOP accounting: `2 · N_tokens · N_params` rule verified against measured matmul count.
- [x] Arithmetic intensity per op; prefill = compute-bound vs decode = memory-bound (roofline).
- [x] **Checkpoint:** numbers table logged; explains WHY engines fuse kernels and cache KV.

## Part 5 — Engine comparison (site)
- [x] HF vs vLLM vs TRT-LLM vs SGLang vs llama.cpp forward paths: same math, different
      kernel launches / memory movement / batching. What each optimizes and why.

## Part 6 — Field guide (site)
- [x] Forward-pass debugging checklist; the "same math, different plumbing" principle; bridge to Day 4 (KV cache).

**Errors log:** `notes/errors.md` — every bug, with its signature.
