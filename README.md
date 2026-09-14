# Inference From Scratch — Mastering LLM Inference

## The Main Aim

Become the kind of engineer who can look at **vLLM, TensorRT-LLM, SGLang, or NVIDIA Dynamo** source code and not just understand it, but *know why every decision was made* — because you built every piece yourself, broke it, and fixed it.

The path: **raw math → naive inference → optimized inference → serving → production engines.**

```
Day 1 ✓ : Loading any LLM from raw files (safetensors by hand, 4-hook loader protocol, mmap, shards, Qwen3)
Day 2 ✓ : Tokenization from scratch (UTF-8, byte-level BPE engine, GPT-2 + Qwen3 from one class, chat templates)
Day 3 ✓ : The forward pass in NumPy (embeddings, attention, MLP, sampling — golden greedy checksum)
Day 4   : KV cache, batching, serving over HTTP
Day 5+  : dtypes/quantization (FP16/BF16/INT8/FP8, GGUF/ONNX), GPU kernels, TP/PP
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
| 1 | Day 1 ✓ | **Loading**: GPT-2 + Qwen3 from raw files, zero libraries — formats, 4-hook protocol, mmap, shards |
| 2 | Day 2 ✓ | **Tokenization**: byte-level BPE from scratch — one engine drives GPT-2 and Qwen3; chat templates; token economics |
| 3 | Day 3 ✓ | **Forward pass**: embeddings, attention, MLP, logits, sampling in NumPy — golden checksum; engine-kernel comparison |
| 4 | Day 4 | KV cache, batching, serving (FastAPI), correctness vs HF (as an *oracle* only) |
| 5 | Day 5–6 | Memory/dtype math, quantization (INT8/INT4), GGUF/ONNX, other model families (Llama, MoE) |
| 6 | Day 7+ | GPU kernels, CUDA/Triton, paged KV, continuous batching — then enter vLLM/SGLang/TRT-LLM/Dynamo |

## Today's Folder

➡️ [`Day01_GPT2_From_Scratch/CHECKLIST.md`](Day01_GPT2_From_Scratch/CHECKLIST.md) — start there. Model files are already downloaded in `Day01_GPT2_From_Scratch/models/`.
