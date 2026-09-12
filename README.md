# Inference From Scratch — Mastering LLM Inference

## The Main Aim

Become the kind of engineer who can look at **vLLM, TensorRT-LLM, SGLang, or NVIDIA Dynamo** source code and not just understand it, but *know why every decision was made* — because you built every piece yourself, broke it, and fixed it.

The path: **raw math → naive inference → optimized inference → serving → production engines.**

```
Day 1   : GPT-2 inference with ZERO libraries (parse weights by hand, BPE by hand, forward pass in NumPy)
Day 2+  : Batching, KV cache, sampling, serving, memory math, quantization, kernels...
Later   : vLLM (PagedAttention, continuous batching), TRT-LLM (kernels, graph capture),
          SGLang (RadixAttention, constrained decoding), Dynamo (disaggregated serving)
```

## Rules of the Road

1. **Day 1–3: no `transformers`, no inference engines.** If a library does it for you, you don't learn it. NumPy is allowed (it's just math). PyTorch allowed later as a tensor/GPU tool, not as a modeling crutch.
2. **Everything must run.** No theoretical-only checkmarks.
3. **Break things on purpose.** Every error case you hit deliberately is one you will recognize instantly in vLLM/TRT-LLM internals later.
4. **Write down numbers.** Latency, tokens/sec, memory bytes. Inference engineering is a numbers game.
5. **One folder per day.** Each day has a `CHECKLIST.md` — complete it fully before moving on.

## Roadmap (living document — will grow)

| Phase | Days | Theme |
|---|---|---|
| 1 | Day 1 | **Raw inference**: GPT-2 from raw files, NumPy only, serve over HTTP |
| 2 | Day 2–3 | Correctness vs HF (as an *oracle* only), KV cache, sampling strategies, batching |
| 3 | Day 4–6 | Memory/dtype math, quantization (INT8/INT4), different formats (GGUF/ONNX), other model families (Llama, MoE) |
| 4 | Day 7+ | GPU kernels, CUDA/Triton, paged KV, continuous batching — then enter vLLM/SGLang/TRT-LLM/Dynamo |

## Today's Folder

➡️ [`Day01_GPT2_From_Scratch/CHECKLIST.md`](Day01_GPT2_From_Scratch/CHECKLIST.md) — start there. Model files are already downloaded in `Day01_GPT2_From_Scratch/models/`.
