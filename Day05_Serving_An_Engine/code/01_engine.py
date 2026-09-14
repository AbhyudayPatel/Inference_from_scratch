"""01 — the engine: a serving-grade wrapper around Days 1-4.

Adds the two things the Day-4 scripts didn't need:
  * a request state machine with a worker thread (requests arrive whenever)
  * TRUE batched decode: one set of GEMMs serves B requests at once, using
    padded K/V + an attention mask (exactly what engines' ragged-batch kernels do)

Everything else (weights, tokenizer, ops, KV cache) is reused from Days 1-4.
"""
import os
import queue
import threading
import time
from dataclasses import dataclass, field

import numpy as np

from day3_common import KVCache, cached_forward, d3, get_model, get_tokenizer

CTX = 1024          # GPT-2 learned positions: hard context limit (Day 3)
EOS = 50256         # <|endoftext|>
MAX_BATCH = 4


# ------------------------------------------------------------------ sampling
@dataclass
class Params:
    max_tokens: int = 16
    temperature: float = 0.0        # 0 == greedy (never divide by zero)
    top_k: int = 0                  # 0 == disabled
    top_p: float = 1.0
    seed: int = None
    stop: str = None                # stop string, e.g. "\n"


def pick(logits, p, rng):
    """One ID from a logit row, honoring the request's own policy."""
    if p.temperature == 0:
        return int(np.argmax(logits))
    z = logits / p.temperature
    if p.top_k > 0:
        keep = np.argsort(z)[-p.top_k:]
        mask = np.full_like(z, -np.inf)
        mask[keep] = z[keep]
        z = mask
    probs = d3.softmax(z)
    if p.top_p < 1.0:
        order = np.argsort(probs)[::-1]
        cut = np.searchsorted(np.cumsum(probs[order]), p.top_p) + 1
        keep = order[:cut]
        masked = np.full_like(z, -np.inf)
        masked[keep] = z[keep]
        probs = d3.softmax(masked)
    return int(rng.choice(len(probs), p=probs))


# ------------------------------------------------------------------ request
QUEUED, PREFILL, DECODE, FINISHED, ABORTED = "QUEUED", "PREFILL", "DECODE", "FINISHED", "ABORTED"


class Request:
    _counter = 0

    def __init__(self, ids, params):
        Request._counter += 1
        self.id = Request._counter
        self.ids = list(ids)
        self.p = params
        self.state = QUEUED
        self.cache = KVCache()
        self.generated = []
        self.events = queue.Queue()          # token events for the streaming handler
        self.finish_reason = None
        self.error = None
        self.rng = np.random.default_rng(params.seed)
        self.t_submit = time.perf_counter()
        self.t_first = None                  # TTFT
        self.t_end = None

    def emit(self, tok_id, text_piece, done=False):
        self.events.put({"id": self.id, "token": tok_id, "text": text_piece,
                         "done": done, "finish_reason": self.finish_reason,
                         "at": time.perf_counter()})      # engine-side truth


# ------------------------------------------------------------------ engine
DEBUG = os.environ.get("ENGINE_DEBUG") == "1"


class Engine:
    def __init__(self, max_batch=MAX_BATCH):
        self.W = get_model()
        self.tok = get_tokenizer()
        self.max_batch = max_batch
        self.waiting = []                    # FIFO of QUEUED requests
        self.running = []                    # PREFILL/DECODE requests
        self.lock = threading.Lock()
        self._wake = threading.Event()
        self._stop = False
        self.thread = threading.Thread(target=self._loop, daemon=True)

    # ---- public API (called from HTTP handlers) ------------------------------
    def submit(self, ids, params):
        r = Request(ids, params)
        with self.lock:
            self.waiting.append(r)
        self._wake.set()
        return r

    def abort(self, req):
        with self.lock:
            if req.state in (QUEUED,):
                self.waiting.remove(req)
                req.state = ABORTED
            elif req in self.running:
                self.running.remove(req)     # its KV rows die with the object
                req.state = ABORTED
        req.emit(None, "", done=True)

    def stats(self):
        with self.lock:
            return {"waiting": len(self.waiting), "running": len(self.running)}

    # ---- worker loop ---------------------------------------------------------
    def start(self):
        self.thread.start()

    def shutdown(self):
        self._stop = True
        self._wake.set()
        self.thread.join(timeout=5)

    def _loop(self):
        while not self._stop:
            did_work = self.tick()
            if not did_work:
                self._wake.wait(timeout=0.05)
                self._wake.clear()

    def tick(self):
        """ONE scheduler iteration: admit -> prefill ONE -> batched decode step."""
        with self.lock:
            while self.waiting and len(self.running) < self.max_batch:
                r = self.waiting.pop(0)
                r.state = PREFILL
                self.running.append(r)
            batch = list(self.running)
        if not batch:
            return False

        _t_tick = time.perf_counter()
        # prefill newcomers, then IMMEDIATELY sample their first token
        for r in batch:
            if r.state == PREFILL:
                if len(r.ids) + r.p.max_tokens > CTX:
                    self._finish(r, error=f"context length exceeded: {len(r.ids)}+"
                                          f"{r.p.max_tokens} > {CTX}")
                    continue
                _t_pf = time.perf_counter()
                logits = cached_forward(self.W, r.ids, r.cache)
                _t_pf = (time.perf_counter() - _t_pf) * 1000
                if DEBUG: print(f"    [tick] prefill req#{r.id} ({len(r.ids)} toks) took {_t_pf:.0f} ms")
                r.state = DECODE
                self._choose(r, logits[-1])

        # batched decode: ONE pass through the blocks for the whole batch
        decoding = [r for r in self.running if r.state == DECODE]
        if decoding:
            _t_dec = time.perf_counter()
            rows = self._batched_decode(decoding)
            _t_dec = (time.perf_counter() - _t_dec) * 1000
            for r, row in zip(decoding, rows):
                if r.state == DECODE:            # may have finished on its first token
                    self._choose(r, row)
            if DEBUG and _t_dec > 150:
                print(f"    [tick] batched decode B={len(decoding)} took {_t_dec:.0f} ms")
        _t_total = (time.perf_counter() - _t_tick) * 1000
        if DEBUG and _t_total > 250:
            print(f"    [tick] SLOW TICK {_t_total:.0f} ms (B={len(batch)})")
        return True

    def _batched_decode(self, reqs):
        """q for each request is 1 token; K/V padded to the longest cache + mask."""
        W = self.W
        B = len(reqs)
        # input token for this step = the token this request most recently CHOSE
        pos = [r.cache.length for r in reqs]
        x = np.stack([W["wte.weight"][r.generated[-1]] + W["wpe.weight"][p]
                      for r, p in zip(reqs, pos)])                          # (B, 768)

        for li in range(12):
            a = d3.layer_norm(x, W[f"h.{li}.ln_1.weight"], W[f"h.{li}.ln_1.bias"])
            qkv = d3.linear(a, W[f"h.{li}.attn.c_attn.weight"], W[f"h.{li}.attn.c_attn.bias"])
            q = qkv[:, :768].reshape(B, 12, 1, 64).transpose(0, 1, 2, 3)
            k = qkv[:, 768:1536].reshape(B, 12, 1, 64).transpose(0, 1, 2, 3)
            v = qkv[:, 1536:].reshape(B, 12, 1, 64).transpose(0, 1, 2, 3)

            for bi, r in enumerate(reqs):                    # append new rows per request
                K, V = r.cache.layers[li]                    # (12, T, 64)
                r.cache.layers[li] = (np.concatenate([K, k[bi]], axis=1),   # k[bi] = (12,1,64)
                                      np.concatenate([V, v[bi]], axis=1))
            tmax = max(r.cache.length for r in reqs)
            # dtype matters: np.zeros defaults to float64, which would silently upcast
            # the residual stream (float32 @ float64 -> float64 GEMMs, ~15x slower)
            Kp = np.zeros((B, 12, tmax, 64), dtype=x.dtype)
            Vp = np.zeros((B, 12, tmax, 64), dtype=x.dtype)
            valid = np.zeros((B, tmax), bool)
            for bi, r in enumerate(reqs):
                L = r.cache.length
                Kp[bi, :, :L], Vp[bi, :, :L] = r.cache.layers[li]
                valid[bi, :L] = True
            scores = (q @ Kp.transpose(0, 1, 3, 2)) / 8.0    # (B, 12, 1, tmax)
            scores = np.where(valid[:, None, None, :], scores, -1e10)   # mask the pads
            att = (d3.softmax(scores) @ Vp).transpose(0, 2, 1, 3).reshape(B, 768)
            x = x + d3.linear(att, W[f"h.{li}.attn.c_proj.weight"], W[f"h.{li}.attn.c_proj.bias"])
            m = d3.layer_norm(x, W[f"h.{li}.ln_2.weight"], W[f"h.{li}.ln_2.bias"])
            f = d3.linear(m, W[f"h.{li}.mlp.c_fc.weight"], W[f"h.{li}.mlp.c_fc.bias"])
            x = x + d3.linear(d3.gelu_new(f), W[f"h.{li}.mlp.c_proj.weight"], W[f"h.{li}.mlp.c_proj.bias"])
        x = d3.layer_norm(x, W["ln_f.weight"], W["ln_f.bias"])
        return x @ W["wte.weight"].T                         # (B, 50257)

    # ---- per-request step ----------------------------------------------------
    def _choose(self, r, logit_row):
        """Sample ONE token from a logit row; emit it; run finish checks."""
        tok_id = pick(logit_row, r.p, r.rng)
        r.generated.append(tok_id)
        if r.t_first is None:
            r.t_first = time.perf_counter()
        r.emit(tok_id, self.tok.decode([tok_id]))

        if tok_id == EOS:
            self._finish(r, "stop")
        elif len(r.generated) >= r.p.max_tokens:
            self._finish(r, "length")
        elif r.p.stop and r.p.stop in self.tok.decode(r.generated):
            self._finish(r, "stop")

    def _finish(self, r, reason=None, error=None):
        r.finish_reason = reason
        r.error = error
        r.state = FINISHED if not error else ABORTED
        r.t_end = time.perf_counter()
        if r in self.running:
            self.running.remove(r)
        r.emit(None, "", done=True)


# ------------------------------------------------------------------ demo/verify
if __name__ == "__main__":
    from day3_common import GOLDEN_PROMPT, GOLDEN_CONT

    eng = Engine()
    eng.start()
    tok = get_tokenizer()

    # 1. single request through the ENGINE (not raw functions)
    r1 = eng.submit(tok.encode(GOLDEN_PROMPT), Params(max_tokens=8))
    pieces = []
    while True:
        ev = r1.events.get()
        if ev["token"] is not None:
            pieces.append(ev["text"])
        if ev["done"]:
            break
    text1 = "".join(pieces)
    print(f"[single]  {text1!r}  finish={r1.finish_reason}")
    assert text1 == GOLDEN_CONT, text1
    assert r1.finish_reason == "length"

    # 2. TWO requests, truly batched (different lengths, same iteration space)
    r2 = eng.submit(tok.encode(GOLDEN_PROMPT), Params(max_tokens=8))
    r3 = eng.submit(tok.encode("The future of artificial intelligence is"), Params(max_tokens=6))
    def drain(r):
        out = []
        while True:
            ev = r.events.get()
            if ev["token"] is not None:
                out.append(ev["text"])
            if ev["done"]:
                return "".join(out)
    t2, t3 = drain(r2), drain(r3)
    print(f"[batched] golden: {t2!r}")
    print(f"[batched] other : {t3!r}  finish={r3.finish_reason}")
    assert t2 == GOLDEN_CONT, t2                       # batching must not change tokens

    # 3. everything torn down
    assert eng.stats() == {"waiting": 0, "running": 0}

    eng.shutdown()
    print("CHECKSUM: PASS -- engine + batched decode reproduce the golden continuation.")
