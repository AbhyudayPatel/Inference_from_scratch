"""sampler_server.py — LIVE LOGITS BACKEND for the Day-3 Sampling Lab website.

Loads the Day-3 NumPy GPT-2 (01_forward.py) ONCE, then serves real next-token
distributions for ANY sentence to the React site (site/src/days/day03/lab).

Stdlib only (http.server + json). No flask, no torch, no transformers.

Endpoints
  GET  /api/health   -> model status
  POST /api/analyze  {prompt}
         -> prompt tokens, top-512 tokens with raw logits,
            EXACT full-vocab grids: logZ(T), entropy(T), top1(T) for T=0.05..2.0,
            nucleus-size(p) at reference temperatures, distribution stats @T=1.
  POST /api/generate {prompt, temperature, top_k, top_p, seed, steps, greedy_baseline}
         -> per-step picks with prob / rank / candidate-count, + optional greedy run.

Run:
  python Day03_Forward_Pass_From_Scratch/code/sampler_server.py
  (serves on http://127.0.0.1:8600 — the site calls it from localhost:5173)
"""

import json
import math
import time
import importlib.util
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

PORT = 8600
TOP_N = 512                       # tokens shipped to the browser (charts + sampling)
GRID_T = [round(0.05 + 0.025 * i, 4) for i in range(79)]      # 0.05 .. 2.00
REF_TEMPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]                  # nucleus-size grid
GRID_P = [round(0.01 * i, 2) for i in range(1, 100)]          # 0.01 .. 0.99

# ---------------------------------------------------------------- load Day-3 model once
t0 = time.perf_counter()
spec = importlib.util.spec_from_file_location(
    "core", r"Day03_Forward_Pass_From_Scratch\code\01_forward.py")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
VOCAB = int(core.W["wte.weight"].shape[0])
print(f"[sampler_server] model loaded in {time.perf_counter()-t0:.1f}s — vocab={VOCAB}")

# ---------------------------------------------------------------- logits cache (Day 4 does this properly with a KV cache)
CACHE = OrderedDict()
CACHE_MAX = 128


def logits_for(ids):
    """last-position logits for the full id sequence, cached by exact prefix."""
    key = tuple(ids)
    hit = CACHE.get(key)
    if hit is not None:
        CACHE.move_to_end(key)
        return hit
    z = core.forward(list(ids))[-1].astype(np.float64)
    CACHE[key] = z
    if len(CACHE) > CACHE_MAX:
        CACHE.popitem(last=False)
    return z


# ---------------------------------------------------------------- exact full-vocab statistics
def logsumexp(u):
    m = float(u.max())
    return m + float(np.log(np.exp(u - m).sum()))


def temp_grid(z):
    """logZ, entropy (nats), top-1 prob over the WHOLE vocab for every grid T."""
    logZ, H, p1 = [], [], []
    for T in GRID_T:
        u = z / T
        lz = logsumexp(u)
        p = np.exp(u - lz)
        logZ.append(round(lz, 6))
        H.append(round(float(-(p * (u - lz)).sum()), 6))   # H = logZ - E[u]
        p1.append(round(float(p.max()), 8))
    return logZ, H, p1


def nucleus_grid(z):
    """for each reference T: nucleus size (smallest prefix with mass >= p) for p in GRID_P."""
    sizes = []
    for T in REF_TEMPS:
        u = z / T
        lz = logsumexp(u)
        p = np.exp(u - lz)
        p.sort()
        cum = np.cumsum(p[::-1])
        sizes.append([int(np.searchsorted(cum, gp) + 1) for gp in GRID_P])
    return sizes


def stats_at_1(z):
    u = z
    lz = logsumexp(u)
    p = np.exp(u - lz)
    ps = np.sort(p)[::-1]
    h = float(-(p * (u - lz)).sum())
    return {
        "entropy_nats": round(h, 6),
        "entropy_bits": round(h / math.log(2), 6),
        "perplexity": round(float(math.exp(h)), 4),
        "logZ": round(lz, 6),
        "logit_max": round(float(z.max()), 4),
        "logit_min": round(float(z.min()), 4),
        "mass_top1": round(float(ps[0]), 8),
        "mass_top5": round(float(ps[:5].sum()), 8),
        "mass_top10": round(float(ps[:10].sum()), 8),
        "mass_top50": round(float(ps[:50].sum()), 8),
        "mass_top100": round(float(ps[:100].sum()), 8),
        "mass_top512": round(float(ps[:512].sum()), 8),
    }


def analyze(prompt):
    ids = core.tok.encode(prompt)
    if not ids:
        raise ValueError("prompt produced zero tokens")
    if len(ids) > 1023:
        raise ValueError(f"prompt is {len(ids)} tokens — GPT-2 context is 1024")
    t0 = time.perf_counter()
    z = logits_for(ids)
    order = np.argsort(z)[::-1]
    top = [{
        "i": int(t),
        "t": core.tok.decode([int(t)]),
        "z": round(float(z[t]), 4),
    } for t in order[:TOP_N]]
    logZ, H, p1 = temp_grid(z)
    payload = {
        "ok": True,
        "prompt": prompt,
        "ids": [int(i) for i in ids],
        "pieces": [core.tok.decode([int(i)]) for i in ids],
        "vocab": VOCAB,
        "greedy": {"i": int(order[0]), "t": core.tok.decode([int(order[0])])},
        "top": top,
        "stats1": stats_at_1(z),
        "grid": {"ts": GRID_T, "logZ": logZ, "H": H, "p1": p1},
        "nucleus": {"temps": REF_TEMPS, "ps": GRID_P, "sizes": nucleus_grid(z)},
        "ms": round((time.perf_counter() - t0) * 1000, 1),
    }
    return payload


# ---------------------------------------------------------------- sampling (mirrors 02_sampling.py)
def probs_from_logits(z, temperature):
    u = z / temperature
    u = u - u.max()
    e = np.exp(u)
    return e / e.sum()


def pick(z, temperature, top_k, top_p, rng):
    """one draw; returns (token_id, prob_after_filters, n_candidates)."""
    masked = z.copy()
    if top_k and 0 < top_k < len(z):
        keep = np.argpartition(z, -top_k)[-top_k:]
        masked = np.full_like(z, -np.inf)
        masked[keep] = z[keep]
    p = probs_from_logits(masked, temperature)
    if top_p and top_p < 1.0:
        order = np.argsort(p)[::-1]
        cum = np.cumsum(p[order])
        cutoff = int(np.searchsorted(cum, top_p)) + 1
        keep = order[:cutoff]
        pm = np.zeros_like(p)
        pm[keep] = p[keep]
        p = pm / pm.sum()
    n_cand = int((p > 0).sum())
    nxt = int(rng.choice(len(z), p=p))
    return nxt, float(p[nxt]), n_cand


def generate(body):
    prompt = str(body.get("prompt", ""))
    ids = core.tok.encode(prompt)
    if not ids:
        raise ValueError("prompt produced zero tokens")
    temperature = float(body.get("temperature", 1.0))
    top_k = int(body.get("top_k", 0))
    top_p = float(body.get("top_p", 1.0))
    seed = int(body.get("seed", 42))
    steps = max(1, min(16, int(body.get("steps", 8))))
    if len(ids) + steps > 1024:
        raise ValueError("prompt + steps exceed GPT-2 context (1024)")
    if temperature <= 0:
        temperature = 1e-5

    t0 = time.perf_counter()
    rng = np.random.default_rng(seed)
    cur = list(ids)
    out_steps = []
    for _ in range(steps):
        z = logits_for(cur)
        nxt, prob, n_cand = pick(z, temperature, top_k, top_p, rng)
        rank = int((z > z[nxt]).sum()) + 1
        p1 = probs_from_logits(z, temperature)
        top5 = np.argsort(p1)[-5:][::-1]
        out_steps.append({
            "i": nxt,
            "t": core.tok.decode([nxt]),
            "p": round(prob, 6),
            "rank": rank,
            "cand": n_cand,
            "top5": [{"i": int(t), "t": core.tok.decode([int(t)]),
                      "p": round(float(p1[t]), 6)} for t in top5],
        })
        cur.append(nxt)

    result = {
        "ok": True,
        "prompt": prompt,
        "continuation": core.tok.decode([s["i"] for s in out_steps]),
        "steps": out_steps,
        "params": {"temperature": temperature, "top_k": top_k, "top_p": top_p, "seed": seed},
        "ms": round((time.perf_counter() - t0) * 1000, 1),
    }
    if body.get("greedy_baseline"):
        cur = list(ids)
        gids = []
        for _ in range(steps):
            z = logits_for(cur)
            nxt = int(np.argmax(z))
            gids.append(nxt)
            cur.append(nxt)
        result["greedy_continuation"] = core.tok.decode(gids)
    return result


# ---------------------------------------------------------------- HTTP plumbing
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
            self._send(200, {"ok": True, "model": "gpt2-124m-numpy-day3",
                             "vocab": VOCAB, "layers": int(core.N_LAYER)})
        else:
            self._send(404, {"ok": False, "error": "unknown route"})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            if self.path == "/api/analyze":
                self._send(200, analyze(str(body.get("prompt", ""))))
            elif self.path == "/api/generate":
                self._send(200, generate(body))
            else:
                self._send(404, {"ok": False, "error": "unknown route"})
        except Exception as e:  # surface model errors to the UI, never die
            self._send(400, {"ok": False, "error": str(e)})

    def log_message(self, fmt, *args):
        print(f"[sampler_server] {fmt % args}")


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[sampler_server] listening on http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
    srv.serve_forever()
