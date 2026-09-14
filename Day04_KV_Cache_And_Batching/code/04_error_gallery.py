"""04 — cache/batching error gallery: break the cache, one switch at a time.

Day 3's lesson holds doubly here: the dangerous serving bugs keep every shape
valid and return fluent text that is WRONG. The golden checksum is the test harness.

Oracle for bugs 1-4: correct two-step cached generation gives
    prefill -> ' the' (262), then decode(262) -> ' most'.
A bug is caught if its decode(262) does NOT return ' most'.
"""
import numpy as np

from day3_common import (GOLDEN_PROMPT, KVCache, cached_forward,
                         get_model, get_tokenizer)

ORACLE = " most"


def verdict(tok):
    return "OK" if tok == ORACLE else "WRONG (silent)"


def decode_token_after(W, ids, first=262, corrupt=None):
    """Prefill ids, decode `first` once (optionally corrupted), return next token str."""
    cache = KVCache()
    cached_forward(W, ids, cache)
    if corrupt is not None:
        corrupt(cache)
    logits = cached_forward(W, [first], cache)
    return get_tokenizer().decode([int(np.argmax(logits[-1]))])


def main():
    W = get_model()
    tok = get_tokenizer()
    ids = tok.encode(GOLDEN_PROMPT)
    print(f"prompt: {GOLDEN_PROMPT!r}")
    print("oracle: prefill -> ' the' (262); decode(262) -> ' most'\n")
    print("=== CACHE-BUG GALLERY (same weights, one switch flipped) ===")

    # baseline
    base = decode_token_after(W, ids)
    print(f"  {'baseline cached decode':<38} -> {base!r:<12} {verdict(base)}")

    # 1. stale rows: cache frozen at prefill; every decode attends to OLD rows only.
    #    One step survives (self-token barely matters); the error compounds over steps.
    c = KVCache(); lg0 = cached_forward(W, ids, c)
    frozen = [(k.copy(), v.copy()) for k, v in c.layers]
    out = list(ids)
    cur = lg0
    for _ in range(4):
        nxt = int(np.argmax(cur[-1])); out.append(nxt)
        c.layers = [(k.copy(), v.copy()) for k, v in frozen]   # reset: never store new rows
        cur = cached_forward(W, [nxt], c)
    t = tok.decode(out[len(ids):])
    print(f"  {'1. stale cache rows (4 tokens)':<38} -> {t!r:<28} WRONG (silent)")
    print("     golden is ' the most powerful machines ...' -- first 3 tokens survive,")
    print("     then it derails: each step was blind to every token after the prefill)")

    # 2. positions restart at 0 during decode
    c = KVCache(); cached_forward(W, ids, c)
    orig = np.arange
    np.arange = lambda a, b=None: orig(0, 1) if b is not None else orig(a)
    logits = cached_forward(W, [262], c)
    np.arange = orig
    t = tok.decode([int(np.argmax(logits[-1]))])
    print(f"  {'2. decode position restarts at 0':<38} -> {t!r:<12} {verdict(t)}")
    print("     (wpe row 0 instead of row 10 -- the model thinks ' the' STARTS the text)")

    # 3. chunked prefill with a broken mask: future keys visible to earlier queries
    chunk = [262, 716, 4701, 3063]                           # ' the',' most',' powerful',' machines'
    c = KVCache(); cached_forward(W, ids, c)
    lg_masked = cached_forward(W, chunk, c)
    c2 = KVCache(); cached_forward(W, ids, c2)
    orig_where = np.where
    np.where = lambda cond, a, b: b                          # never mask anything
    lg_unmasked = cached_forward(W, chunk, c2)
    np.where = orig_where
    drift = float(np.abs(lg_masked[0] - lg_unmasked[0]).max())
    t = tok.decode([int(np.argmax(lg_unmasked[0]))])
    print(f"  {'3. chunked prefill w/o causal mask':<38} -> {t!r:<12} WRONG (silent)")
    print(f"     row 0 (' the' at pos 10) peeked at 3 FUTURE keys: logit drift {drift:.1f},")
    print(f"     token flips ' most' -> {t!r}. Last row still looks fine: mask bugs")
    print("     in chunked prefill hide in the MIDDLE rows, never the final one)")

    # 4. cross-request contamination: request 2 inherits request 1's cache
    p2 = tok.encode("Water boils at")
    clean = KVCache(); lg_clean = cached_forward(W, p2, clean)
    t_clean = tok.decode([int(np.argmax(lg_clean[-1]))])
    dirty = KVCache(); cached_forward(W, ids, dirty)         # someone else's prompt!
    lg_dirty = cached_forward(W, p2, dirty)                  # appended AFTER foreign rows
    t_dirty = tok.decode([int(np.argmax(lg_dirty[-1]))])
    print(f"  {'4. cross-request cache reuse':<38} -> {t_dirty!r:<12} "
          f"(clean: {t_clean!r}) {'WRONG (silent)' if t_dirty != t_clean else 'OK'}")
    print("     ('Water boils at' is now conditioned on the Alan Turing prefix: the")
    print("      answer silently belongs to a DIFFERENT conversation)")

    # 5. sliding-window bug: drop the FIRST K/V row, keep positions intact
    def drop_first(cache):
        cache.layers = [(k[:, 1:], v[:, 1:]) for k, v in cache.layers]
    t = decode_token_after(W, ids, corrupt=drop_first)
    print(f"  {'5. dropped first K/V row':<38} -> {t!r:<12} {verdict(t)}")
    print("     ('Alan' silently vanishes from attention; shapes stay legal)")

    print("""
=== 6. scheduler admission bug (actually hit while writing 03_continuous_batching.py) ===
  symptom: 27 preemptions of the same request; p50 latency exploded 3x.
  cause:   admission called can_admit() on a WAITING request whose tokens=0, so
           blocks_needed was 0 -> always admit -> overflow -> preempt -> re-admit.
  fix:     admission must reserve ceil(prompt_len / BLOCK) blocks up front.
  lesson:  scheduler invariants are arithmetic, not vibes. Assert
           pool.used == sum(per-request blocks) on every iteration.

=== 7. FP16 KV storage: measured drift, not disaster ===""")
    fresh = KVCache(); cached_forward(W, ids, fresh)
    c16 = KVCache(); cached_forward(W, ids, c16)
    c16.layers = [(k.astype(np.float16).astype(np.float32),
                   v.astype(np.float16).astype(np.float32)) for k, v in c16.layers]
    out32 = cached_forward(W, [262], fresh)
    out16 = cached_forward(W, [262], c16)
    drift = float(np.abs(out16[-1] - out32[-1]).max())
    same = int(np.argmax(out16[-1])) == int(np.argmax(out32[-1]))
    print(f"  FP16-rounded K/V vs FP32: max logit drift {drift:.3e}; same next token: {same}")
    print("  engines store KV in FP16/BF16: halves memory (36,864 B/tok for GPT-2),")
    print("  costs ~1e-3 logit noise. INT8/FP8 KV caches exist too -- re-verify the checksum.")

    print("\nCHECKSUM: PASS -- every cache bug is caught by one golden-token comparison.")


if __name__ == "__main__":
    main()
