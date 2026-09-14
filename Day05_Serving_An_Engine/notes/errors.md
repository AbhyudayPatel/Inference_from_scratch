# Day 5 — Error Log

## Errors actually hit during development

| # | Where | What happened | Fix |
|---|-------|---------------|-----|
| E1 | `01_engine.py` first run | `ValueError` on concat: new K row shaped `(1,12,64)` vs cache `(12,T,64)` | `k[bi]` is already `(12,1,64)` — concat directly |
| E2 | `01_engine.py` | **700 ms/token decode — 25× slower than Day 4's 27 ms.** Output tokens still correct! | Root cause: `np.zeros()` defaults to **float64**; the padded K/V buffers upcast the residual stream (`float32 @ float64 → float64`), so every GEMM after the first attention ran in float64. Invisible in outputs, devastating in latency. Fix: `dtype=x.dtype`. *A performance bug that no correctness test catches — only profiling.* |
| E3 | `03_client_tests.py` | Chat test asserted golden phrase in chat output | Wrong oracle: the chat template changes the context, so a *different* continuation is correct. Assert the plumbing (non-empty, finish_reason, usage) |
| E4 | `02_server.py` disconnect test | Client hung up but engine kept generating: `running=1` after 500 ms | Sync generator never observed the disconnect — TCP buffers absorb small SSE frames. Fix: async generator + poll `request.is_disconnected()` + `get_nowait()` + 5 ms asyncio sleep; `finally:` aborts and frees the KV slot |
| E5 | `04_load_test.py` | p95 < p50 at C=2 | Percentile index bug with tiny samples: `int(0.95*n)-1 = 0` picked the min. Fix: `ceil` clamp |
| E6 | `05_error_gallery.py` #3 | First café demo showed no bug: per-token == buffered | The merge table hid it ('Ã©' merged token). Real demo needed the true fragment tokens (127 = byte C3, 102 = byte A9): naive stream → `\ufffd\ufffd`, buffered → `é`. Also rediscovered that Day-2's decode has the full inverse byte map — encode/decode probes of text 'Ã' are 2-byte red herrings |

## Deliberate gallery (verified outputs)

| bug | observed evidence | fix |
|-----|-------------------|-----|
| temperature=0 as a number | `logits/0.0 → softmax sum=nan` | temperature==0 routes to greedy |
| context overflow | `IndexError: index 1064 out of bounds (size 1024)` mid-generation | validate `len(ids)+max_tokens ≤ 1024` → HTTP 400 before compute |
| naive per-token detok | `127 → '\ufffd'`, `102 → '\ufffd'`; buffered pair → `é` | accumulate bytes; emit longest valid UTF-8 prefix |
| shared RNG | seed=42 alone: `' unknown. Even if…'`; after another request: `' cloud computing…'` | per-request `default_rng(request.seed)` |
| disconnect without abort | after 0.8 s unread: `running=1`, cache grew to 28+ rows | poll `is_disconnected()`, abort frees slot + KV |
| float64 upcast (E2) | TPOT 700 ms vs 36 ms, same tokens | pin dtype on every auxiliary buffer |

## Verified numbers (this machine)

- Engine: single + **batched (2 requests, different lengths)** both return the golden continuation exactly
- Over HTTP: `POST /v1/generate` → ` the most powerful machines on the planet.`, `finish_reason=length`, usage `{10, 8, 18}`, TTFT ~550 ms (first request pays one-time BLAS warm-up)
- Seed: `seed=42` twice → byte-identical text at temperature 0.8; `seed=7` differs
- SSE: 8 frames, first `" the"`, in order, concatenation == full text; done frame with finish_reason
- Errors: overflow → **400** with JSON body; `temperature=-1` → **422**
- Concurrency: 4 simultaneous golden requests all correct in ~1.4 s
- Abort: disconnect → slot freed (`running=0`) within ~1 s
- Load sweep (12 tok/req, MAX_BATCH=4): throughput **17 → 24 tok/s** (1→8 concurrent); **TTFT p95 490 ms (C=4) → 2.6 s (C=8)** — the queue forms exactly where MAX_BATCH says; TPOT ~43 → ~160 ms (CPU GEMM cost grows with B — CPU has no free lunch, but throughput still wins)
