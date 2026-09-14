"""03 — client tests over REAL HTTP against a REAL server process.

Spawns 02_server.py (uvicorn) as a subprocess, waits for /health, then verifies:
  1. golden continuation over the wire (non-streamed)
  2. seed reproducibility at temperature 0.8
  3. SSE stream: frame order, first frame is ' the', concatenation == full text
  4. chat completions plumbing (messages -> template -> ids -> response)
  5. error paths: context overflow -> 400, bad temperature -> 422
  6. concurrency: 4 simultaneous requests, all correct
  7. disconnect mid-stream frees the engine slot (abort path)

No requests library: stdlib urllib only.
"""
import json
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8399"
GOLDEN_PROMPT = "Alan Turing theorized that computers would one day become"
GOLDEN_CONT = " the most powerful machines on the planet."


def post(path, body, stream=False):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        return urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        return e


def main():
    # ---- boot the real server -------------------------------------------------
    proc = subprocess.Popen([sys.executable, "02_server.py"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(300):                                   # model load ~15s
            try:
                h = json.load(urllib.request.urlopen(BASE + "/health", timeout=2))
                break
            except Exception:
                time.sleep(0.5)
        else:
            raise RuntimeError("server never became healthy")
        print(f"[health] {h}")
        assert h["status"] == "ok"

        # ---- 1. golden over the wire -----------------------------------------
        r = json.load(post("/v1/generate", {"prompt": GOLDEN_PROMPT, "max_tokens": 8}))
        print(f"[generate] text={r['text']!r} finish={r['finish_reason']}")
        print(f"           usage={r['usage']} timings={r['timings']}")
        assert r["text"] == GOLDEN_CONT and r["finish_reason"] == "length"

        # ---- 2. seed reproducibility ------------------------------------------
        body = {"prompt": "The future of artificial intelligence is",
                "max_tokens": 10, "temperature": 0.8, "seed": 42}
        a = json.load(post("/v1/generate", body))["text"]
        b = json.load(post("/v1/generate", body))["text"]
        c = json.load(post("/v1/generate", dict(body, seed=7)))["text"]
        print(f"[seed]     seed=42 twice -> identical: {a == b}")
        print(f"           seed=7  -> different: {c != a}   ({c!r})")
        assert a == b and c != a

        # ---- 3. SSE stream ------------------------------------------------------
        resp = post("/v1/generate/stream", {"prompt": GOLDEN_PROMPT, "max_tokens": 8})
        frames = []
        for raw in resp:
            line = raw.decode().strip()
            if line.startswith("data:"):
                frames.append(json.loads(line[5:]))
        pieces = [f["text"] for f in frames if "token" in f]
        done = frames[-1]
        print(f"[stream]   {len(pieces)} token frames, first={pieces[0]!r}, last={pieces[-1]!r}")
        print(f"           done frame: {done}")
        assert pieces[0] == " the" and "".join(pieces) == GOLDEN_CONT
        assert done["done"] is True and done["finish_reason"] == "length"

        # ---- 4. chat completions ------------------------------------------------
        chat = json.load(post("/v1/chat/completions", {
            "messages": [{"role": "system", "content": "You complete sentences."},
                         {"role": "user", "content": "Alan Turing theorized that computers would one day become"}],
            "max_tokens": 8}))
        msg = chat["choices"][0]["message"]["content"]
        print(f"[chat]     assistant content={msg!r} finish={chat['choices'][0]['finish_reason']}")
        print(f"           usage={chat['usage']}")
        # the PLUMBING is what's verified: messages rendered into the template, model
        # answered. (GPT-2 isn't chat-trained, so any fluent continuation is correct.)
        assert msg and chat["choices"][0]["finish_reason"] == "length"

        # ---- 5. error paths -------------------------------------------------------
        e1 = post("/v1/generate", {"prompt": "word " * 1000, "max_tokens": 64})
        e2 = post("/v1/generate", {"prompt": "hi", "temperature": -1})
        print(f"[errors]   overflow -> {e1.status}: {json.loads(e1.read())['error']['message'][:60]}...")
        print(f"           bad temp  -> {e2.status}")
        assert e1.status == 400 and e2.status == 422

        # ---- 6. concurrency ------------------------------------------------------
        results = [None] * 4
        def call(i):
            results[i] = json.load(post("/v1/generate",
                                        {"prompt": GOLDEN_PROMPT, "max_tokens": 8}))["text"]
        t0 = time.perf_counter()
        threads = [threading.Thread(target=call, args=(i,)) for i in range(4)]
        [t.start() for t in threads]; [t.join() for t in threads]
        dt = time.perf_counter() - t0
        ok = all(x == GOLDEN_CONT for x in results)
        print(f"[concur]   4 simultaneous golden requests: all correct={ok} in {dt:.1f}s")
        assert ok

        # ---- 7. disconnect mid-stream frees the slot ------------------------------
        resp = post("/v1/generate/stream", {"prompt": GOLDEN_PROMPT, "max_tokens": 200})
        next(iter(resp))                                        # read one frame...
        resp.close()                                            # ...then hang up
        freed = False
        for _ in range(40):                                     # poll up to 4s
            time.sleep(0.1)
            h = json.load(urllib.request.urlopen(BASE + "/health", timeout=5))
            if h["running"] == 0:
                freed = True
                break
        print(f"[abort]    after disconnect: slot freed = {freed} "
              f"(waiting={h['waiting']} running={h['running']})")
        assert freed

        print("\nCHECKSUM: PASS -- the engine serves the golden continuation over HTTP,")
        print("streams it frame-by-frame, and survives disconnects, bad input, and load.")
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    main()
