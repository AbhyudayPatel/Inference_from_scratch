# Day 5 — Serving an Engine: APIs, Streaming & Load, From Scratch

**Goal.** Wrap the verified Day-4 engine core (KV cache + scheduler) in a real serving layer:
HTTP API, token streaming, per-request sampling, concurrency, backpressure, metrics — and a
serving-specific error gallery. FastAPI/uvicorn allowed for the HTTP layer only; all model math
stays NumPy from Days 1–4.

## What you will build

1. [ ] `code/01_engine.py` — `Engine`: worker thread + queues; request state machine
       (QUEUED → PREFILL → DECODE → FINISHED/ABORTED); **batched decode** with a padded-KV
       attention mask (the real thing, not one request at a time); sampling per request
       (greedy/temperature/top-k/top-p/seed); EOS + stop-string + max_tokens finish reasons;
       abort on disconnect frees the slot. Verified: batched golden checksum == single-request.
2. [ ] `code/02_server.py` — FastAPI: `GET /health`, `POST /v1/generate`,
       `POST /v1/generate/stream` (SSE), `POST /v1/chat/completions` (messages → template → ids).
       Clean JSON errors (400 context overflow, 422 bad params).
3. [ ] `code/03_client_tests.py` — real HTTP tests from a separate process: golden continuation
       over the wire, seed reproducibility, SSE frame order, chat completion, error codes,
       concurrent correctness.
4. [ ] `code/04_load_test.py` — concurrency sweep 1→2→4→8: TTFT, TPOT, end-to-end latency,
       tok/s, queue wait; find saturation.
5. [ ] `code/05_error_gallery.py` — serving bugs: temperature=0 crash, context overflow,
       split-UTF-8 incremental decode, shared-RNG reproducibility leak, abort/KV leak.

## Concepts that must click

- [ ] **The request lifecycle:** validate → tokenize → admit → prefill → decode loop →
      incremental detok → finish/abort → free. Every stage has its own failure mode.
- [ ] **State machine:** a request is a small object with a state, not a function call.
      Disconnects and errors must unwind it safely (free KV, unblock queues).
- [ ] **Batched decode:** stack (B,768) activations through the blocks; pad K/V to the longest
      sequence and mask the pads — one GEMM set serves the whole batch.
- [ ] **SSE streaming:** `data: {...}\n\n` frames; first frame latency = TTFT; per-token gap = TPOT.
- [ ] **Incremental detokenization:** single-token decode can emit mojibake for split UTF-8
      sequences — buffer until valid (the café demonstration).
- [ ] **Metrics:** TTFT, TPOT/ITL, E2E latency, queue wait, tok/s; p50 vs p95; why concurrency
      helps throughput until bandwidth saturates (Day-4 roofline, now observable over HTTP).
- [ ] **Backpressure:** bounded queues + 429/503 are features, not failures.

## Numbers to verify (this machine)

- [ ] Batched (2-request) decode reproduces the golden continuation exactly; per-request logit
      drift vs single decode < 1e-3
- [ ] `POST /v1/generate` returns `" the most powerful machines on the planet."`
- [ ] Same seed twice → identical text at temperature 0.8; different seeds → different text
- [ ] SSE: first event is `" the"`; frames arrive in order; concatenation == full text
- [ ] Context overflow (1000-token prompt + max_tokens=64) → HTTP 400 with JSON error body
- [ ] Load sweep table: TTFT/TPOT/tok-s at concurrency 1/2/4/8 (report actuals)
- [ ] Gallery: all 5 bugs reproduced with observable evidence

## The debugging order

1. Engine-only golden checksum (no HTTP).
2. Batched-engine checksum (2 requests in flight).
3. Then over HTTP: non-streamed.
4. Then streamed (SSE frames).
5. Then under load. Never debug serving math through the network first.

## Exercises

- [ ] Add `logprobs` to the response (top-5 per token) — the data is already computed.
- [ ] Add `presence_penalty` as a logit penalty on already-generated IDs (Day-3 selector).
- [ ] Measure TTFT with an idle engine vs a busy one; explain the difference from Day 4's scheduler.
- [ ] Add a max-queue-depth limit that returns 429; load test until it triggers.
