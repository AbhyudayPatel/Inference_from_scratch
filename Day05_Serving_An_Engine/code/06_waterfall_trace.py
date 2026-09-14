"""06 — waterfall trace: 4 real prompts, staggered arrivals, one engine.

Records per-request: submit / prefill-end(first token) / every token / done.
Prints a JSON timeline the journal renders as a waterfall chart.
"""
import importlib.util
import json
import os
import time

_spec = importlib.util.spec_from_file_location(
    "engine01", os.path.join(os.path.dirname(os.path.abspath(__file__)), "01_engine.py"))
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)

PROMPTS = [
    ("A", "Alan Turing theorized that computers would one day become", 8, 0.00),
    ("B", "The capital of France is", 6, 0.10),
    ("C", "Water on Earth boils at", 5, 0.22),
    ("D", "The future of artificial intelligence is", 6, 0.35),
]


def main():
    eng = E.Engine()
    eng.start()
    tok = E.get_tokenizer()

    # warm the engine once so the trace shows steady-state costs
    w = eng.submit(tok.encode("warmup"), E.Params(max_tokens=2))
    while True:
        ev = w.events.get()
        if ev["done"]:
            break

    t0 = time.perf_counter()
    reqs = []
    for name, prompt, ntok, delay in PROMPTS:
        while time.perf_counter() - t0 < delay:
            time.sleep(0.005)
        r = eng.submit(tok.encode(prompt), E.Params(max_tokens=ntok))
        reqs.append((name, prompt, r, time.perf_counter() - t0))

    timeline = {name: {"prompt": prompt, "submitted_at": submitted, "tokens": []}
                for name, prompt, r, submitted in reqs}
    pending = {r.id: name for name, prompt, r, _ in reqs}
    done = 0
    while done < len(reqs):
        for name, prompt, r, _ in reqs:
            while not r.events.empty():
                ev = r.events.get()
                now = time.perf_counter() - t0
                at = ev.get("at", now) - t0               # engine-side emission time
                if ev["token"] is not None:
                    timeline[name]["tokens"].append(
                        {"t": round(at, 3), "text": ev["text"]})
                if ev["done"]:
                    timeline[name]["done_at"] = round(at, 3)
                    timeline[name]["finish"] = r.finish_reason
                    done += 1
        time.sleep(0.002)

    for name, prompt, r, submitted in reqs:
        first_tok = timeline[name]["tokens"][0]["t"]
        timeline[name]["ttft_ms"] = round((first_tok - submitted) * 1000, 1)
        timeline[name]["queued_ms"] = round((first_tok - submitted) * 1000, 1)  # refined below

    print(json.dumps(timeline, indent=1))

    # human summary
    print("\n--- reading the waterfall ---")
    for name, prompt, r, submitted in reqs:
        tl = timeline[name]
        gaps = [round((tl["tokens"][i+1]["t"] - tl["tokens"][i]["t"]) * 1000)
                for i in range(len(tl["tokens"]) - 1)]
        texts = "".join(t["text"] for t in tl["tokens"])
        print(f"{name}: submitted +{submitted*1000:4.0f}ms | first token +{tl['ttft_ms']:4.0f}ms "
              f"after submitting | token gaps {gaps} | out={texts!r}")
    eng.shutdown()


if __name__ == "__main__":
    main()
