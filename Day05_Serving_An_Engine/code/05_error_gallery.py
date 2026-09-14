"""05 — serving error gallery: bugs that only exist once a network is involved.

Each entry is reproduced with observable evidence. The pattern: serving bugs are
about STATE and EDGES (lifecycle, encodings, RNG, limits), not matrix math.
"""
import importlib.util
import os

import numpy as np

_spec = importlib.util.spec_from_file_location(
    "engine01", os.path.join(os.path.dirname(os.path.abspath(__file__)), "01_engine.py"))
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)

from day3_common import GOLDEN_PROMPT, KVCache, cached_forward, d3, get_model, get_tokenizer


def main():
    W = get_model()
    tok = get_tokenizer()

    print("=== SERVING ERROR GALLERY ===\n")

    # -- 1. temperature=0.0 dividing -------------------------------------------
    print("1. temperature=0 handled as a NUMBER instead of a MODE")
    ids = tok.encode(GOLDEN_PROMPT)
    c = KVCache()
    logits = cached_forward(W, ids, c)[-1]
    with np.errstate(all="ignore"):
        z = logits / 0.0
        probs = d3.softmax(z)
    print(f"   logits/0.0 -> softmax -> sum={probs.sum()}  any_nan={np.isnan(probs).any()}")
    print("   fix: temperature==0 ROUTES TO GREEDY (argmax). Every engine does this;\n"
          "   OpenAI-compatible APIs accept temperature=0 and expect determinism.")
    assert np.isnan(probs).any()

    # -- 2. context overflow -----------------------------------------------------
    print("\n2. prompt + max_tokens > 1024 (learned positions end at 1023)")
    big = tok.encode("word " * 1000)
    print(f"   prompt tokens: {len(big)}; requesting max_tokens=64 -> {len(big)}+64 = {len(big)+64}")
    try:
        cc = KVCache()
        lg = cached_forward(W, big, cc)          # prefill fits (1000 < 1024)...
        pos = np.arange(cc.length, cc.length + 1)
        _ = W["wpe.weight"][cc.length + 63]      # ...but generation hits row 1024
        print("   BUG: no error?!")
    except IndexError as e:
        print(f"   without validation: IndexError at generation time: {e}")
    print("   fix: reject at the API boundary (HTTP 400) BEFORE any compute --")
    print("   an IndexError 30s into generation is a crashed request, not an error response")

    # -- 3. split UTF-8 in incremental detokenization ----------------------------
    print("\n3. naive per-token detokenization (streaming replacement chars)")
    print("   'e-acute' in UTF-8 = bytes C3 A9. GPT-2 byte-level BPE keeps them as")
    print("   separate tokens when no merge applies: token 127 = byte C3, token 102 = byte A9")
    frag_ids = [127, 102]
    naive = "".join(tok.decode([i]) for i in frag_ids)      # what a naive streamer emits
    correct = tok.decode(frag_ids)                           # buffered: join bytes first
    print(f"   stream token 127 alone -> {ascii(tok.decode([127]))}   (invalid UTF-8!)")
    print(f"   stream token 102 alone -> {ascii(tok.decode([102]))}")
    print(f"   naive concatenation: {ascii(naive)}   buffered: {ascii(correct)}  (the 'e' in 'caf\xe9')")
    assert naive != correct and correct == "\xe9"
    print("   -> fix: accumulate BYTES and emit only the longest valid UTF-8 prefix;")
    print("      hold back incomplete multibyte tails (what tokenizers' decode_stream does)")

    # -- 4. shared RNG across requests --------------------------------------------
    print("\n4. one global RNG for all requests (reproducibility leak)")
    ids2 = tok.encode("The future of artificial intelligence is")
    shared = np.random.default_rng(42)
    def gen_with(rng):
        c2 = KVCache()
        lg = cached_forward(W, ids2, c2)
        out = []
        for _ in range(6):
            row = lg[-1]
            nxt = int(rng.choice(len(row), p=d3.softmax(row / 0.8)))
            out.append(nxt)
            lg = cached_forward(W, [nxt], c2)
        return tok.decode(out)
    a = gen_with(shared)                      # request A alone, seed=42
    shared = np.random.default_rng(42)
    _ = gen_with(shared)                      # another request consumes randomness first
    b = gen_with(shared)                      # "same seed" request A again
    print(f"   seed=42 alone:              {a!r}")
    print(f"   seed=42 after another req:  {b!r}")
    print(f"   identical: {a == b}  ->  fix: per-request rng = default_rng(request.seed)")
    assert a != b

    # -- 5. abort without cleanup (KV + slot leak) ---------------------------------
    print("\n5. client disconnect without abort -> engine keeps generating into the void")
    eng = E.Engine(max_batch=4)
    eng.start()
    r = eng.submit(tok.encode(GOLDEN_PROMPT), E.Params(max_tokens=200))
    # client reads one event then "hangs up": we simply never drain again
    first = r.events.get(timeout=30)
    time.sleep(0.8)
    st = eng.stats()
    import time as _t
    print(f"   after 0.8s unread: running={st['running']}  "
          f"cache rows so far={r.cache.length}  (still burning decode steps)")
    assert st["running"] == 1 and r.cache.length > 15
    eng.abort(r)
    _t.sleep(0.2)
    st2 = eng.stats()
    print(f"   after engine.abort(): running={st2['running']}  (slot + KV freed)")
    eng.shutdown()
    assert st2["running"] == 0
    print("   fix: the streaming loop polls is_disconnected() and aborts;")
    print("   abort must remove the request AND drop its cache (our abort does both)")

    print("\nCHECKSUM: PASS -- five serving-only failure modes, each with evidence and fix.")


if __name__ == "__main__":
    import time
    main()
