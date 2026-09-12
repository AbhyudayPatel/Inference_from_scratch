# Day 1 — GPT-2 Inference From Absolute Scratch

**Goal:** Take `openai-community/gpt2` from raw files on disk to a served text-generation API, writing *every* piece yourself. No `transformers`, no `safetensors` lib, no inference engine. NumPy only (it's just math).

**Model files already downloaded** in `models/`: `config.json`, `vocab.json`, `merges.txt`, `tokenizer_config.json`, `model.safetensors` (548MB, FP32).

---

## Part 0 — Know Your Artifacts (before writing any model code)

A "model" is not one file. Understand each artifact first.

- [ ] **0.1** Open `config.json` by hand. Write down (in your notes) what each field means and which ones the *forward pass* actually needs: `n_layer=12`, `n_head=12`, `n_embd=768`, `n_positions=1024`, `vocab_size=50257`, `layer_norm_epsilon=1e-5`, `activation_function="gelu_new"`.
- [ ] **0.2** Compute the parameter count *by hand* from config (embeddings + per-block params + final layernorm). Verify ≈ 124M. Derive the memory footprint: `124M × 4 bytes (FP32) ≈ 500MB` — matches the file size you downloaded. **This "params × bytes/param" reflex is the single most-used skill in inference engineering.**
- [ ] **0.3** Look at `merges.txt` (first line is a version header, rest are merge rules) and `vocab.json` (token → id). Notice the weird `Ġ` character — understand *why* it exists (GPT-2 byte-level BPE: byte `0x20` (space) is mapped to a printable char `Ġ`).

### 0.4 — Checkpoint file formats (theory + pros/cons table)

Write a notes file `notes/file_formats.md` comparing these. You'll implement parsing for #1 today; the rest are later days but you must know them now:

| Format | What it is | Pros | Cons |
|---|---|---|---|
| `.safetensors` | 8-byte little-endian header size → JSON header (name → dtype/shape/byte-offsets) → raw tensor bytes | Zero-copy mmap, no code execution on load, fast, safe | Just weights — no optimizer state |
| `pytorch_model.bin` | Pickled PyTorch state dict (actually a ZIP archive) | Native to torch | **Arbitrary code execution on unpickle** (security), slow, needs torch |
| `.gguf` | llama.cpp format: metadata + quantized tensors, self-contained | CPU-friendly, quantization built-in, mmap | Ecosystem mostly llama.cpp; conversion needed |
| `.onnx` | Computation *graph* (not just weights), protobuf | Portable across runtimes (ONNX Runtime, TensorRT) | Graph opset compatibility pain, rigid |
| `.ckpt` / `.pt` | Generic pickle checkpoint | Flexible | Same pickle dangers |
| HF sharded (`model-0000X-of-0000Y.safetensors` + `index.json`) | Weights split across files with a JSON index mapping tensor name → file | Needed when weights > single-file limits (huge models) | Extra index resolution step |

- [ ] **0.4** Write the comparison table in your own words and answer: *why do engines like vLLM prefer safetensors?* (mmap + parallel loading + no pickle.)

---

## Part 1 — Parse `.safetensors` BY HAND

Do **not** pip-install `safetensors`. The format is simple enough to parse in ~30 lines — and once you do, you will never fear a checkpoint file again.

- [ ] **1.1** Write `code/inspect_safetensors.py`:
  - Read first 8 bytes → `struct.unpack('<Q', ...)` → header length N.
  - Read next N bytes → `json.loads` → dict: `{tensor_name: {dtype, shape, data_offsets}, ...}` (plus an optional `__metadata__` key).
  - Print every tensor name, dtype, shape, byte offset. **Output shows 160 tensors — but 12 of them are `h.X.attn.bias` (1,1,1024,1024) precomputed causal-mask *buffers*, not parameters (48MB of dead weight). Real param tensors: 148. Engines like vLLM skip these buffers and build masks in-kernel.** ✅ DISCOVERED
- [ ] **1.2** Map raw bytes → NumPy arrays with `np.frombuffer` (dtype `F32` → `np.float32`) using `data_offsets` (relative to end of header). Return `{name: np.ndarray}`.
- [ ] **1.3** Study the tensor names — they ARE the architecture documentation:
  ```
  h.0.attn.c_attn.weight   h.0.attn.c_attn.bias   h.0.attn.c_proj.weight ...
  h.0.mlp.c_fc.weight      h.0.ln_1.weight ...    wte.weight  wpe.weight  ln_f...
  ```
  Draw the GPT-2 block diagram and label which tensor feeds which op.
- [x] **1.1–1.3** DONE — `code/inspect_safetensors.py` parses the format by hand: header = 14283 bytes JSON, 160 tensors, 548,090,880 bytes total; params on disk = 137,022,720, minus 12×(1024²) mask buffers = **124,439,808 real params** (hand-derived from config: wte 38,597,376 + wpe 786,432 + 12×7,087,872 per-block + ln_f 1,536 = 124,439,808 ✓ matches exactly) — the "124M" in GPT-2.
- [x] **1.3b 2025-proof — Qwen3-0.6B autopsy** (`code/compare_qwen3.py`, models in `models/qwen3/`): same hand parser works; new findings: BF16 dtype (manual `uint16→uint32<<16→view(f32)` upcast implemented), GQA separate q/k/v + q/k_norm, RMSNorm weight-only, no biases, RoPE = no position tensor, SwiGLU 3-matrix MLP, **junk 2025 edition: `lm_head.weight` duplicated in file despite `tie_word_embeddings=true` → 311 MB (20%) redundant bytes**; weight layout flipped to `(out,in)` (nn.Linear — Conv1D trap inverted); hand count 596,049,920 ✓; Qwen3-32B `index.json` shows 707 tensors routed over 17 shards / 65.5 GB. **UNCHANGED: format + 4 loader hooks.**
- ℹ️ **Scope contract:** Day 1 = loading in depth only. TP slicing, fused-op kernels, quantization runtime, KV paging wear a ⏭ LATER DAY switch in notes/site.
- [x] **1.3c Engine-boot model (documented on site):** engine boot = config→arch registry → meta-device skeleton → 4-hook load → CPU→GPU (H2D); then ⏭ profiling run (sizes KV pool from VRAM left after weights), ⏭ CUDA graphs → READY. **Checkpoint layout ≠ execution layout** — the kernel's contract decides GPU layout; loading = compile-once into it. **Weights (static, loaded once) vs KV cache (dynamic, per-request)** — two different VRAM residents, two different subsystems. **The 4 questions** for reading any engine component: where are the bytes / what representation / what layout / who consumes them. Loading-mastery ladder: manual→mmap→lazy→hooks→H2D→dtypes→quant→GEMM/attention→KV→batching→paging.
- [ ] **1.4 ⚠️ TRAP (error case #1):** GPT-2 uses **Conv1D** (not Linear): its weight shape is `(in, out)` — i.e. **already transposed** vs PyTorch `nn.Linear` `(out, in)`. If you do `x @ W.T` out of habit, shapes won't even multiply — find this out yourself, then understand why.

---

## Part 2 — BPE Tokenizer From Scratch

Files: `vocab.json` (token→id), `merges.txt` (merge rules in priority order).

- [ ] **2.1** Implement GPT-2's **byte ↔ unicode** mapping: bytes that are printable map to themselves; others (space, newline, control) map to `chr(256+n)`. This is why space shows up as `Ġ`. Write `bytes_to_unicode()` (~15 lines, it's in the GPT-2 paper's code — derive it yourself first, then check).
- [ ] **2.2** Pre-tokenization: GPT-2 splits text with this regex **before** BPE: ``'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+`` — Python's `re` can't do `\p{L}`; the `regex` package (already installed) can. Understand *why* pre-splitting exists (merges never cross these boundaries — that's what keeps `Ġ`-style word boundaries sane).
- [ ] **2.3** Implement BPE encode: word → tuple of chars → repeatedly apply the *highest-priority* (lowest-index) merge rule until none apply → map resulting tokens to ids via `vocab.json`.
- [ ] **2.4** Implement decode: ids → tokens → concatenate → reverse the byte→unicode mapping → `bytes` → `.decode('utf-8', errors='replace')`.
- [ ] **2.5** Test cases that MUST pass (known GPT-2 tokenizations):
  - `"Hello world"` → `[15496, 995]`
  - `"Hello, world!"` → `[15496, 11, 995, 0]`
  - `" the"` vs `"the"` — leading space changes the id. Show it.
- [ ] **2.6 ⚠️ Error cases to discover deliberately:** emoji/unicode text, text with multiple spaces, `\n` handling, unknown merge fallback (any byte is always representable — why?), encoding the empty string, and id `50256` (`<|endoftext|>`).

---

## Part 3 — Forward Pass in Pure NumPy

Write `code/model_numpy.py`. Each of these is a function; test each in isolation with a random small tensor before assembling.

- [ ] **3.1** `layernorm(x, g, b, eps)` — mean/var over last dim. (No learnable… wait, GPT-2 LN *has* weight+bias — use them.)
- [ ] **3.2** `gelu_new(x)` — GPT-2 uses the **tanh approximation**: `0.5x(1+tanh(√(2/π)(x+0.044715x³)))`. Not exact erf-GELU. Using the wrong one is error case #2 (outputs subtly worse, nothing crashes).
- [ ] **3.3** `softmax(x)` — numerically stable (subtract max). Write the naive one first, watch it overflow on `x=1000`, then fix. Error case #3.
- [ ] **3.4** `attention`: QKV from one fused `c_attn` (768→2304) — split into q,k,v; reshape to heads `(12, seq, 64)`; scores `q@k.T / sqrt(64)`; **causal mask** (upper triangle = -inf); softmax; `@v`; merge heads; `c_proj`.
- [ ] **3.5** Full block: `x = x + attn(ln_1(x))`; `x = x + mlp(ln_2(x))` where mlp = `gelu_new(x@c_fc + b) @ c_proj + b`. **Residual streams are the whole game** — internalize this.
- [ ] **3.6** Full model: `wte[token_ids] + wpe[position_ids]` → 12 blocks → `ln_f` → logits = `x @ wte.T` (**weight tying** — output projection IS the token embedding, transposed; forget this and your model outputs garbage confidently. Error case #4.)
- [ ] **3.7** Sanity test: prompt `"Alan Turing theorized that computers would one day become"` with **greedy decoding, 40 tokens**. Reference output (what HF produces): `" the most powerful machines on the planet."` continuing coherently about computers. If you get that exact first sentence — your entire stack (tokenizer + weights + forward) is correct. This is your end-to-end checksum.
- [ ] **3.8 ⚠️ Position-id error case:** pass positions `[0..n-1]` correctly on the *first* pass, then on incremental decoding pass only the new token's position. Getting off-by-one here produces degradation that *looks* like model quality issues. Hit this bug deliberately once.

---

## Part 4 — Generation Strategies

`code/generate.py`. All on top of your NumPy forward.

- [ ] **4.1** Greedy (argmax) — observe: deterministic, but loops/repeats on long generations.
- [ ] **4.2** Temperature sampling — `softmax(logits/T)`; try T ∈ {0.5, 1.0, 1.5} and note behavior. T→0 ≈ greedy.
- [ ] **4.3** Top-k — zero out all but top-k logits before softmax; k ∈ {1 (=greedy!), 10, 50}.
- [ ] **4.4** Top-p (nucleus) — sort logits desc, keep smallest set with cumulative prob ≥ p; p=0.9.
- [ ] **4.5** (Stretch) Beam search — understand why chat/inference engines *don't* use it but translation did.
- [ ] **4.6** Note in writing: greedy/top-k/top-p are **per-request decode configs** in vLLM/SGLang (`temperature`, `top_k`, `top_p` in their APIs). You're implementing today what they expose as flags.

---

## Part 5 — KV Cache (the single most important optimization)

- [ ] **5.1** First run generation *without* cache: re-run full forward on the whole sequence every token. Measure tokens/sec.
- [ ] **5.2** Now cache K,V per layer: on each step, forward only the **new token** (seq len 1), append its K,V to per-layer cache, attend over the full cached K,V. No causal mask needed for a single query token — why?
- [ ] **5.3** Verify outputs are *bitwise identical* (greedy) to 5.1. If not — find the bug (it's usually position ids or a reshape/transpose).
- [ ] **5.4** Measure: tokens/sec before/after. Compute FLOPs per generated token with and without cache, on paper. Write the numbers in `notes/kvcache.md`.
- [ ] **5.5** Memory math: KV cache size per token = `2 (K&V) × n_layer × n_embd × 4 bytes` = ? bytes for GPT-2. × 1024 context × B batch. **This exact formula is what vLLM's PagedAttention manages.** Write it down.

---

## Part 6 — Serve It (HTTP)

`code/serve.py` — FastAPI is already installed; or use stdlib `http.server` if you want even fewer deps.

- [ ] **6.1** `POST /generate` with JSON `{prompt, max_tokens, temperature, top_k, top_p}` → `{text, tokens, elapsed_s, tokens_per_s}`.
- [ ] **6.2** `GET /health`. Keep the model loaded in memory across requests (load once at startup).
- [ ] **6.3** Test with `curl`. Then hit it with 2 concurrent curls — observe it serializes (your server has no batching; that's Day 2's problem, and understanding *why* it's a problem is the entire motivation for continuous batching in vLLM).
- [ ] **6.4** (Stretch) Streaming: yield tokens one at a time (SSE or plain chunked response). Feel how TTFT (time-to-first-token) differs from total latency — two metrics every engine dashboard shows.

---

## Part 7 — Error-Case Log (mandatory)

Keep `notes/errors.md`. Each entry: symptom → root cause → fix. Minimum set to hit deliberately:

- [ ] Conv1D weight transposed wrongly (1.4)
- [ ] Wrong GELU variant (3.2)
- [ ] Unstable softmax overflow (3.3)
- [ ] Missing causal mask → model "cheats" and sees future tokens (generate and observe garbage that looks *almost* right)
- [ ] Forgot weight tying / used a random head (3.6)
- [ ] Position-id off-by-one with KV cache (3.8)
- [ ] Tokenizer: decoding with wrong byte-mapping (mojibake like `Ġ` leaking into output)
- [ ] dtype mismatch: cast one tensor to float16, watch outputs degrade/diverge
- [ ] Feeding token id ≥ vocab_size → index error (input validation in your server)

---

## Part 8 — Numbers to Record (Day-1 exit criteria)

Fill these into `notes/day1_results.md` — they are your baseline for every later optimization:

- [ ] Load time of model.safetensors (manual parse): ___ s
- [ ] Prompt eval time (prefill) for ~10 tokens, CPU/NumPy: ___ s
- [ ] Decode tokens/sec **without** KV cache: ___
- [ ] Decode tokens/sec **with** KV cache: ___
- [ ] Peak RAM used: ___ MB (compare to your 500MB prediction from 0.2)
- [ ] Greedy 40-token output on the Alan Turing prompt matches reference: YES/NO

## Done Definition for Day 1

✅ All checkboxes ticked, server responds to curl with coherent GPT-2 text, results file filled, error log has ≥ 6 entries. **Only then** move to Day 2 (correctness vs HF oracle, batching, and PyTorch migration).

---

## Suggested order of attack (what to do next)

1. `0.1–0.3` (30 min, pure reading) → write notes
2. `1.1–1.4` parse safetensors, print tensor inventory
3. `2.1–2.5` tokenizer + golden test vectors
4. `3.1–3.7` forward pass until the Alan Turing checksum matches
5. `4.x` sampling → `5.x` KV cache → `6.x` serve
6. Log errors as you go; fill Part 8 numbers last.
