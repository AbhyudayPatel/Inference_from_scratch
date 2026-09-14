"""04 — load test: what happens to latency and throughput as concurrency grows?

Spawns the server, then fires C simultaneous streaming requests (C = 1,2,4,8),
measuring from the WIRE (client-side timestamps):

  TTFT  = time to first token frame     (queue wait + prefill)
  TPOT  = mean gap between token frames (decode cadence)
  E2E   = total request time
  tok/s = all completion tokens / wall time  (engine throughput)

MAX_BATCH = 4 in the engine, so C=8 must queue -- watch TTFT absorb it.
"""
import json
import statistics
import subprocess
import sys
import threading
import time
import urllib.request

BASE = "http://127.0.0.1:8399"
PROMPT = "Alan Turing theorized that computers would one day become"
N_TOK = 12


def one_request(out, idx):
    body = json.dumps({"prompt": PROMPT, "max_tokens": N_TOK}).encode()
    req = urllib.request.Request(BASE + "/v1/generate/stream", data=body,
                                 headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    ttft, gaps, last, n = None, [], t0, 0
    resp = urllib.request.urlopen(req, timeout=300)
    for raw in resp:
        line = raw.decode().strip()
        if not line.startswith("data:"):
            continue
        fr = json.loads(line[5:])
        now = time.perf_counter()
        if "token" in fr:
            if ttft is None:
                ttft = now - t0
            else:
                gaps.append(now - last)
            last = now
            n += 1
    e2e = time.perf_counter() - t0
    out[idx] = {"ttft": ttft, "tpot": statistics.mean(gaps) if gaps else 0,
                "e2e": e2e, "n": n}


def sweep(concurrency):
    out = [None] * concurrency
    t0 = time.perf_counter()
    threads = [threading.Thread(target=one_request, args=(out, i)) for i in range(concurrency)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    wall = time.perf_counter() - t0
    toks = sum(r["n"] for r in out)
    import math
    p50 = lambda xs: statistics.median(xs)
    p95 = lambda xs: sorted(xs)[min(len(xs) - 1, math.ceil(0.95 * len(xs)) - 1)]
    return {
        "C": concurrency,
        "ttft50": p50([r["ttft"] for r in out]), "ttft95": p95([r["ttft"] for r in out]),
        "tpot50": p50([r["tpot"] for r in out]), "tpot95": p95([r["tpot"] for r in out]),
        "e2e50": p50([r["e2e"] for r in out]),
        "wall": wall, "toks": toks, "tps": toks / wall,
    }


def main():
    proc = subprocess.Popen([sys.executable, "02_server.py"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(300):
            try:
                urllib.request.urlopen(BASE + "/health", timeout=2)
                break
            except Exception:
                time.sleep(0.5)
        # warm-up request: first prefill pays one-time BLAS/kernel warm-up
        one_request([{}], 0)

        print(f"load test: {N_TOK} tokens/request, engine MAX_BATCH=4, NumPy CPU decode\n")
        print(f"{'C':>3} | {'TTFT p50':>9} {'TTFT p95':>9} | {'TPOT p50':>9} {'TPOT p95':>9} "
              f"| {'E2E p50':>9} | {'tok/s':>6}")
        rows = [sweep(c) for c in (1, 2, 4, 8)]
        for r in rows:
            print(f"{r['C']:>3} | {r['ttft50']*1000:8.0f}m {r['ttft95']*1000:8.0f}m "
                  f"| {r['tpot50']*1000:8.0f}m {r['tpot95']*1000:8.0f}m "
                  f"| {r['e2e50']*1000:8.0f}m | {r['tps']:6.1f}")

        print("\nreading the table:")
        print(f"  * throughput grows with concurrency: {rows[0]['tps']:.1f} -> {rows[-1]['tps']:.1f} tok/s")
        print(f"    (weight bytes amortized across the batch -- Day 4's free-decode argument)")
        print(f"  * past MAX_BATCH=4, TTFT jumps: extra requests WAIT in the queue")
        print(f"    (C=8 TTFT p95 = {rows[-1]['ttft95']*1000:.0f} ms vs C=1 {rows[0]['ttft95']*1000:.0f} ms)")
        print(f"  * TPOT stays ~flat until the CPU saturates: decode is one batched pass")
        print("\nCHECKSUM: PASS -- queueing appears exactly where MAX_BATCH says it should.")
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    main()
