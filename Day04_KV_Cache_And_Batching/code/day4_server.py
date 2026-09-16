"""day4_server.py — LIVE BACKEND for the Day-4 labs on the journal site.

Serves REAL data produced by the actual Day-4 code:
  GET  /api/health
  POST /api/lab1   {prompt?, n_tokens?}            -> 01_naive_vs_cached.py, live:
       naive loop vs KV-cache loop on the real GPT-2: per-step timings, generated
       tokens, per-step max |logit diff|, cache bytes, FLOP accounting, checksum.
  POST /api/lab2   {block, n_blocks, seqs, share, prefix_len, appends, free_a, max_len}
       -> 02_paged_kv.py semantics, instrumented: full physical-block map with slot
       owners, refcounts, copy-on-write / share / free / OOM events, fragmentation
       stats, reservation-vs-paged waste comparison.
  POST /api/lab3   {requests, max_batch, pool_blocks, prefill_ms, decode_base, decode_per_req}
       -> 03_continuous_batching.py itself: static AND continuous policies, full event
       logs (gantt-ready), per-request latency, makespan, busy %, throughput, preemptions.
  POST /api/lab4   {}  -> 04_error_gallery.py on the real model: every cache bug's
       measured output, verdict vs the ' most' oracle, FP16 drift numbers.

Stdlib only. Run:  python Day04_KV_Cache_And_Batching/code/day4_server.py   (port 8601)
"""

import json
import math
import os
import sys
import time
import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

PORT = 8601
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

t0 = time.perf_counter()
from day3_common import (GOLDEN_PROMPT, GOLDEN_CONT, KV_PER_TOKEN_FP32, KV_PER_TOKEN_FP16,
                         KVCache, cached_forward, get_model, get_tokenizer, naive_forward)

_spec = importlib.util.spec_from_file_location("d4batch", os.path.join(ROOT, "03_continuous_batching.py"))
d4batch = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(d4batch)

W = get_model()
TOK = get_tokenizer()
N_PARAMS = 124_439_808
print(f"[day4_server] model ready in {time.perf_counter()-t0:.1f}s")

_LRU = {}
def cached(key, fn):
    if key not in _LRU:
        _LRU[key] = fn()
        if len(_LRU) > 24:
            _LRU.pop(next(iter(_LRU)))
    return _LRU[key]


# ================================================================ LAB 1 — naive vs cached
def lab1(prompt, n_tokens):
    ids = TOK.encode(prompt)
    if not ids:
        raise ValueError("prompt produced zero tokens")
    if len(ids) > 1000:
        raise ValueError(f"prompt is {len(ids)} tokens — GPT-2 context is 1024")
    n_tokens = max(2, min(10, int(n_tokens)))
    P = len(ids)

    # ---- naive loop: full recompute every step
    out_naive = list(ids)
    naive_ms = []
    for _ in range(n_tokens):
        t1 = time.perf_counter()
        logits = naive_forward(out_naive)[-1]
        naive_ms.append(round((time.perf_counter() - t1) * 1000, 1))
        out_naive.append(int(np.argmax(logits)))

    # ---- cached loop: prefill once, decode one token per step
    cache = KVCache()
    t1 = time.perf_counter()
    logits = cached_forward(W, ids, cache)
    prefill_ms = round((time.perf_counter() - t1) * 1000, 1)
    out_cached = list(ids)
    cached_ms, diffs = [], []
    for _ in range(n_tokens):
        nxt = int(np.argmax(logits[-1]))
        out_cached.append(nxt)
        t1 = time.perf_counter()
        logits = cached_forward(W, [nxt], cache)
        cached_ms.append(round((time.perf_counter() - t1) * 1000, 1))
        ref = naive_forward(out_cached)[-1]          # equivalence probe (the expensive part)
        diffs.append(float(np.abs(ref - logits[-1]).max()))

    gen = out_cached[P:]
    flops_naive = sum(2 * N_PARAMS * (P + s) for s in range(n_tokens))
    flops_cached = 2 * N_PARAMS * P + n_tokens * 2 * N_PARAMS
    return {
        "ok": True,
        "prompt": prompt, "ids": [int(i) for i in ids],
        "pieces": [TOK.decode([int(i)]) for i in ids],
        "n_tokens": n_tokens,
        "gen_ids": [int(i) for i in gen],
        "gen_pieces": [TOK.decode([int(i)]) for i in gen],
        "continuation": TOK.decode(gen),
        "naive": {"steps_ms": naive_ms, "total_ms": round(sum(naive_ms), 1)},
        "cached": {"steps_ms": cached_ms, "prefill_ms": prefill_ms,
                   "decode_total_ms": round(sum(cached_ms), 1)},
        "diffs": diffs,
        "prefix_lens": [P + s for s in range(n_tokens)],
        "match": out_cached == out_naive,
        "golden": prompt == GOLDEN_PROMPT and TOK.decode(gen) == GOLDEN_CONT,
        "cache_rows": int(cache.length),
        "cache_bytes": int(cache.bytes_stored()),
        "kv_fp32": KV_PER_TOKEN_FP32, "kv_fp16": KV_PER_TOKEN_FP16,
        "flops": {"naive": flops_naive, "cached": flops_cached},
    }


# ================================================================ LAB 2 — paged KV (instrumented)
class L2OOM(Exception):
    pass


PALETTE = ["#4f46e5", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed", "#db2777", "#65a30d", "#b45309"]


class L2World:
    """The paged-KV world of 02_paged_kv.py, instrumented: every mutation logs an
    event, and snapshot() serializes the whole pool + block tables for the UI."""

    def __init__(self, block, n_blocks):
        self.block = block
        self.n_blocks = n_blocks
        self.free_list = list(range(n_blocks))
        self.slots = {}      # phys -> [{o: owner, p: position}]
        self.refs = {}       # phys -> refcount
        self.seqs = {}       # name -> {blocks: [phys], n: tokens}
        self.color_of = {}
        self.events = []
        self.oom = False

    def _color(self, name):
        if name not in self.color_of:
            self.color_of[name] = PALETTE[len(self.color_of) % len(PALETTE)]
        return self.color_of[name]

    def alloc(self):
        if not self.free_list:
            raise L2OOM("KV pool exhausted — real engines queue, preempt, or swap here")
        b = self.free_list.pop()
        self.slots[b] = []
        self.refs[b] = 1
        return b

    def decref(self, b):
        self.refs[b] -= 1
        if self.refs[b] == 0:
            del self.slots[b]
            self.free_list.append(b)

    def append(self, name):
        s = self.seqs[name]
        self._color(name)
        if s["n"] % self.block == 0:
            b = self.alloc()
            s["blocks"].append(b)
            self.events.append({"kind": "alloc",
                                "msg": f"{name}: token #{s['n']} needs a slot → allocate physical block {b}"})
        phys = s["blocks"][-1]
        if self.refs[phys] > 1:
            self.decref(phys)
            nb = self.alloc()
            self.slots[nb] = list(self.slots[phys])
            s["blocks"][-1] = nb
            self.events.append({"kind": "cow",
                                "msg": f"copy-on-write: block {phys} is shared (refs>1) → copied to private block {nb} before {name} writes"})
            phys = nb
        self.slots[phys].append({"o": name, "p": s["n"]})
        s["n"] += 1

    def extend(self, name, n, announce=True):
        self._color(name)
        self.seqs.setdefault(name, {"blocks": [], "n": 0})
        for _ in range(n):
            self.append(name)
        if announce:
            self.events.append({"kind": "write",
                                "msg": f"{name}: prefilled {n} tokens → blocks {self.seqs[name]['blocks']}"})

    def fork(self, parent, child):
        self._color(child)
        self.seqs[child] = {"blocks": list(self.seqs[parent]["blocks"]), "n": self.seqs[parent]["n"]}
        for b in self.seqs[parent]["blocks"]:
            self.refs[b] += 1
        self.events.append({"kind": "share",
                            "msg": f"{child} forks {parent}: shares blocks {self.seqs[parent]['blocks']} (refcounts +1, zero copies)"})

    def free(self, name):
        bl = list(self.seqs[name]["blocks"])
        for b in bl:
            self.decref(b)
        self.events.append({"kind": "free",
                            "msg": f"{name} finished → blocks {bl} decref'd; zero-ref blocks return to the free list"})
        self.seqs[name]["blocks"] = []

    def snapshot(self):
        blocks_out = []
        for b in range(self.n_blocks):
            if b in self.slots:
                blocks_out.append({"id": b, "free": False, "refs": self.refs[b],
                                   "slots": [{"o": s["o"], "p": s["p"], "c": self._color(s["o"])} for s in self.slots[b]]})
            else:
                blocks_out.append({"id": b, "free": True, "refs": 0, "slots": []})
        seqs_out = []
        for name, s in self.seqs.items():
            seqs_out.append({"name": name, "color": self._color(name), "blocks": list(s["blocks"]),
                             "n_tokens": s["n"], "reserved": len(s["blocks"]) * self.block,
                             "waste_slots": len(s["blocks"]) * self.block - s["n"]})
        reserved = sum(len(s["blocks"]) * self.block for s in self.seqs.values())
        used = sum(s["n"] for s in self.seqs.values())
        return {
            "block": self.block, "n_blocks": self.n_blocks,
            "blocks": blocks_out, "seqs": seqs_out, "oom": self.oom,
            "stats": {
                "used_blocks": self.n_blocks - len(self.free_list),
                "free_blocks": len(self.free_list),
                "used_slots": used, "reserved_slots": reserved,
                "frag_slots": reserved - used,
                "paged_waste_pct": (1 - used / reserved) if reserved else 0,
            },
        }


def lab2(cfg):
    """free-form experiment mode (same semantics as 02_paged_kv.py)."""
    BLOCK = max(2, min(32, int(cfg.get("block", 16))))
    N_BLOCKS = max(4, min(128, int(cfg.get("n_blocks", 32))))
    MAX_LEN = max(BLOCK, min(4096, int(cfg.get("max_len", 256))))
    seq_specs = cfg.get("seqs") or [{"name": "A", "len": 10}, {"name": "B", "len": 40}]
    seq_specs = [{"name": str(s.get("name", "?"))[:1].upper() or "?",
                  "len": max(1, min(400, int(s.get("len", 8))))} for s in seq_specs[:6]]
    share = bool(cfg.get("share", True))
    prefix_len = max(BLOCK + 1, min(120, int(cfg.get("prefix_len", 24))))
    appends = max(0, min(8, int(cfg.get("appends", 1))))
    free_a = bool(cfg.get("free_a", False))

    w = L2World(BLOCK, N_BLOCKS)
    try:
        for spec in seq_specs:
            w.extend(spec["name"], spec["len"])
        if share:
            w.extend("S", prefix_len)
            for fn in ("R1", "R2"):
                w.fork("S", fn)
        live = [s["name"] for s in seq_specs] + (["S", "R1", "R2"] if share else [])
        for _ in range(appends):
            for name in live:
                w.append(name)
        if free_a and seq_specs:
            w.free(seq_specs[0]["name"])
    except L2OOM as e:
        w.oom = True
        w.events.append({"kind": "oom", "msg": f"OOM: {e}"})

    snap = w.snapshot()
    lengths = [s["n"] for s in w.seqs.values() if s["n"] > 0]
    res_reserved = len(lengths) * MAX_LEN
    res_used = sum(lengths)
    snap["stats"]["reservation"] = {
        "max_len": MAX_LEN, "reserved_slots": res_reserved, "used_slots": res_used,
        "waste_pct": (1 - res_used / res_reserved) if res_reserved else 0,
    }
    snap.update({"ok": True, "events": w.events, "kv_fp16": KV_PER_TOKEN_FP16})
    return snap


def lab2_story():
    """The scripted, step-by-step version of 02_paged_kv.py for the story UI:
    returns one snapshot per story beat, plus the reservation-waste comparison
    computed with the code file's own 8-request example."""
    steps = []

    def beat(world, key, event_mark):
        snap = world.snapshot()
        snap["events"] = list(world.events[event_mark:])
        steps.append({"key": key, "snap": snap})
        return len(world.events)

    w = L2World(16, 24)
    mark = beat(w, "empty", 0)
    w.extend("A", 10); mark = beat(w, "a", mark)
    w.extend("B", 40); mark = beat(w, "b", mark)
    w.extend("S", 24)
    w.fork("S", "R1"); w.fork("S", "R2"); mark = beat(w, "share", mark)
    w.append("R1"); w.append("R2"); mark = beat(w, "cow", mark)
    w.free("A"); mark = beat(w, "free", mark)

    # the OOM beat gets its own tiny world (2 blocks = 32 slots)
    tiny = L2World(16, 2)
    try:
        tiny.extend("X", 32)
        tiny.append("X")   # token 33 has nowhere to go
    except L2OOM as e:
        tiny.oom = True
        tiny.events.append({"kind": "oom", "msg": f"OOM: {e}"})
    beat(tiny, "oom", 0)

    # reservation comparison: the exact example from 02_paged_kv.py
    lengths = [12, 200, 45, 1024, 30, 600, 80, 310]
    max_len = 1024
    used, reserved = sum(lengths), len(lengths) * max_len
    reservation = {"lengths": lengths, "max_len": max_len, "used": used,
                   "reserved": reserved, "waste_pct": 1 - used / reserved,
                   "reserved_mb_fp16": reserved * KV_PER_TOKEN_FP16 / 1e6,
                   "used_mb_fp16": used * KV_PER_TOKEN_FP16 / 1e6}
    return {"ok": True, "steps": steps, "reservation": reservation, "kv_fp16": KV_PER_TOKEN_FP16}


# ================================================================ LAB 3 — batching simulator (the real one)
def lab3(cfg):
    specs = cfg.get("requests") or []
    reqs = []
    for i, r in enumerate(specs[:8]):
        reqs.append({
            "name": str(r.get("name", chr(65 + i)))[:2],
            "arrival": max(0, min(5000, int(r.get("arrival", 0)))),
            "prompt": max(1, min(400, int(r.get("prompt", 20)))),
            "gen": max(1, min(60, int(r.get("gen", 8)))),
        })
    if not reqs:
        raise ValueError("no requests")
    max_batch = max(1, min(8, int(cfg.get("max_batch", 4))))
    pool_blocks = max(2, min(256, int(cfg.get("pool_blocks", 64))))
    d4batch.MAX_BATCH = max_batch
    d4batch.PREFILL_MS = max(0.1, min(10, float(cfg.get("prefill_ms", 1.2))))
    d4batch.DECODE_BASE = max(1, min(200, float(cfg.get("decode_base", 26.0))))
    d4batch.DECODE_PER_REQ = max(0.0, min(10, float(cfg.get("decode_per_req", 0.5))))

    def mk():
        return [d4batch.Req(r["name"], r["arrival"], r["prompt"], r["gen"]) for r in reqs]

    out = {"ok": True, "kv_fp16": KV_PER_TOKEN_FP16}
    for policy in ("static", "continuous"):
        done, log, makespan, total_tokens, wasted = simulate_guarded(mk(), policy, pool_blocks)
        out[policy] = {
            "events": [{"t0": round(a, 1), "t1": round(b, 1), "label": l} for a, b, l in log.events],
            "reqs": [{"name": r.name, "arrival": r.arrival, "prompt": r.prompt, "gen": r.gen,
                      "t_first": round(r.t_first, 1), "t_end": round(r.t_end, 1),
                      "preempted": r.preempted} for r in sorted(done, key=lambda x: x.name)],
            "makespan": round(makespan, 1),
            "busy_ms": round(log.busy, 1),
            "busy_pct": round(log.busy / makespan, 4) if makespan else 0,
            "throughput": round(total_tokens / (makespan / 1000), 1) if makespan else 0,
            "wasted_slots": wasted,
            "total_tokens": total_tokens,
        }
    return out

def simulate_guarded(reqs, policy, pool_blocks):
    """d4batch.simulate can infinite-loop if the pool can never admit a request; guard it."""
    need = min(r.blocks_needed for r in reqs)
    if need > pool_blocks:
        raise ValueError(f"a request needs {need} blocks but the pool only has {pool_blocks} — it can never be admitted")
    return d4batch.simulate(reqs, policy, pool_blocks)


# ================================================================ LAB 4 — error gallery on the real model
def lab4():
    ids = TOK.encode(GOLDEN_PROMPT)
    ORACLE = " most"
    bugs = []

    def decode_after(ids_, first=262, corrupt=None):
        c = KVCache()
        cached_forward(W, ids_, c)
        if corrupt is not None:
            corrupt(c)
        lg = cached_forward(W, [first], c)
        return TOK.decode([int(np.argmax(lg[-1]))])

    base = decode_after(ids)
    bugs.append({"id": 0, "name": "baseline cached decode", "output": base,
                 "ok": base == ORACLE,
                 "detail": "prefill → ' the' (262), decode(262) — every bug below flips exactly one switch"})

    # 1. stale cache rows
    c = KVCache(); lg = cached_forward(W, ids, c)
    frozen = [(k.copy(), v.copy()) for k, v in c.layers]
    out = list(ids); cur = lg
    for _ in range(4):
        nxt = int(np.argmax(cur[-1])); out.append(nxt)
        c.layers = [(k.copy(), v.copy()) for k, v in frozen]
        cur = cached_forward(W, [nxt], c)
    t = TOK.decode(out[len(ids):])
    bugs.append({"id": 1, "name": "stale cache rows (frozen at prefill)", "output": t, "ok": False,
                 "detail": "golden: ' the most powerful machines…' — first tokens survive (they only need the prefix), then it derails: every step is blind to tokens after prefill"})

    # 2. position offset restarts at 0
    c = KVCache(); cached_forward(W, ids, c)
    orig = np.arange
    np.arange = lambda a, b=None: orig(0, 1) if b is not None else orig(a)
    lg = cached_forward(W, [262], c)
    np.arange = orig
    t = TOK.decode([int(np.argmax(lg[-1]))])
    bugs.append({"id": 2, "name": "decode position restarts at 0", "output": t, "ok": t == ORACLE,
                 "detail": "wpe row 0 instead of row 10 — the model thinks ' the' STARTS the text"})

    # 3. chunked prefill without causal mask
    chunk = [262, 716, 4701, 3063]
    c = KVCache(); cached_forward(W, ids, c)
    lg_masked = cached_forward(W, chunk, c)
    c2 = KVCache(); cached_forward(W, ids, c2)
    orig_where = np.where
    np.where = lambda cond, a, b: b
    lg_unmasked = cached_forward(W, chunk, c2)
    np.where = orig_where
    drift = float(np.abs(lg_masked[0] - lg_unmasked[0]).max())
    t = TOK.decode([int(np.argmax(lg_unmasked[0]))])
    bugs.append({"id": 3, "name": "chunked prefill w/o causal mask", "output": t, "ok": False,
                 "drift": drift,
                 "detail": f"row 0 peeked at 3 FUTURE keys: logit drift {drift:.1f}, token flips. The LAST row still looks fine — mask bugs hide in the middle rows"})

    # 4. cross-request contamination
    p2 = TOK.encode("Water boils at")
    clean = KVCache(); lg_clean = cached_forward(W, p2, clean)
    t_clean = TOK.decode([int(np.argmax(lg_clean[-1]))])
    dirty = KVCache(); cached_forward(W, ids, dirty)
    lg_dirty = cached_forward(W, p2, dirty)
    t_dirty = TOK.decode([int(np.argmax(lg_dirty[-1]))])
    bugs.append({"id": 4, "name": "cross-request cache reuse", "output": t_dirty, "ok": t_dirty == t_clean,
                 "detail": f"clean cache says {t_clean!r}; contaminated cache answers as if 'Water boils at' belonged to the Alan Turing conversation"})

    # 5. dropped first K/V row
    def drop_first(cache):
        cache.layers = [(k[:, 1:], v[:, 1:]) for k, v in cache.layers]
    t = decode_after(ids, corrupt=drop_first)
    bugs.append({"id": 5, "name": "dropped first K/V row", "output": t, "ok": t == ORACLE,
                 "detail": "'Alan' silently vanishes from attention; every shape stays legal"})

    # 7. FP16 KV drift
    fresh = KVCache(); cached_forward(W, ids, fresh)
    c16 = KVCache(); cached_forward(W, ids, c16)
    c16.layers = [(k.astype(np.float16).astype(np.float32), v.astype(np.float16).astype(np.float32))
                  for k, v in c16.layers]
    out32 = cached_forward(W, [262], fresh)
    out16 = cached_forward(W, [262], c16)
    drift16 = float(np.abs(out16[-1] - out32[-1]).max())
    same16 = int(np.argmax(out16[-1])) == int(np.argmax(out32[-1]))

    return {"ok": True, "oracle": ORACLE, "bugs": bugs,
            "fp16": {"drift": drift16, "same_token": bool(same16),
                     "bytes_fp32": KV_PER_TOKEN_FP32, "bytes_fp16": KV_PER_TOKEN_FP16},
            "scheduler_bug": {
                "name": "6. admission on tokens=0 (from 03, actually happened)",
                "detail": "can_admit() saw a WAITING request with tokens=0 → blocks_needed=0 → always admit → overflow → preempt → re-admit. Fix: reserve ceil(prompt/BLOCK) up front. Invariants are arithmetic, not vibes."}}


# ================================================================ HTTP plumbing
class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        if self.path == "/api/health":
            self._send(200, {"ok": True, "model": "gpt2-124m-numpy-day4"})
        elif self.path in ("/", "/index.html"):
            try:
                with open(os.path.join(ROOT, "day4_lab.html"), "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except FileNotFoundError:
                self._send(404, {"ok": False, "error": "day4_lab.html missing"})
        else:
            self._send(404, {"ok": False, "error": "unknown route"})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            if self.path == "/api/lab1":
                prompt = str(body.get("prompt") or GOLDEN_PROMPT)
                key = ("l1", prompt, int(body.get("n_tokens", 8)))
                self._send(200, cached(key, lambda: lab1(prompt, body.get("n_tokens", 8))))
            elif self.path == "/api/lab2":
                self._send(200, lab2(body))
            elif self.path == "/api/lab2_story":
                self._send(200, cached(("l2story",), lab2_story))
            elif self.path == "/api/lab3":
                self._send(200, lab3(body))
            elif self.path == "/api/lab4":
                self._send(200, cached(("l4",), lab4))
            else:
                self._send(404, {"ok": False, "error": "unknown route"})
        except Exception as e:
            self._send(400, {"ok": False, "error": str(e)})

    def log_message(self, fmt, *args):
        print(f"[day4_server] {fmt % args}")


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[day4_server] listening on http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
    srv.serve_forever()
