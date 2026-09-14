import React from 'react'
import { Callout, Term, Tbl, R } from '../../components/ui.jsx'

const OUT = [
  ['p', "prompt: 'Alan Turing theorized that computers would one day become'"],
  ['p', "oracle: prefill -> ' the' (262); decode(262) -> ' most'"],
  '',
  ['p', '=== CACHE-BUG GALLERY (same weights, one switch flipped) ==='],
  ['ok', "  baseline cached decode                 -> ' most'      OK"],
  ['bad', "  1. stale cache rows (4 tokens)         -> ' the most powerful enough'  WRONG (silent)"],
  ['dim', "     first 3 tokens survive, then derails — each step blind to post-prefill tokens"],
  ['bad', "  2. decode position restarts at 0       -> ','          WRONG (silent)"],
  ['bad', "  3. chunked prefill w/o causal mask     -> ' teacher'   WRONG (silent)"],
  ['dim', "     row 0 peeked at 3 FUTURE keys: drift 32.9 — hides in MIDDLE rows"],
  ['bad', "  4. cross-request cache reuse           -> ' the' (clean: ' about') WRONG (silent)"],
  ['dim', "     'Water boils at' answered with the Alan Turing context — a foreign leak"],
  ['bad', "  5. dropped first K/V row               -> ' the'       WRONG (silent)"],
  ['dim', "     'Alan' silently vanishes from attention; shapes stay legal"],
  '',
  ['p', '=== 6. scheduler thrash (found while building 03) ==='],
  '  27 preemptions of one request; admission saw tokens=0 for waiting requests,',
  '  reserved nothing, admitted anyway -> overflow -> preempt -> re-admit loop.',
  '  fix: reserve ceil(prompt/16) blocks at admission. Loud in METRICS, invisible in output.',
  '',
  ['p', '=== 7. FP16 KV: measured, accepted ==='],
  '  drift 5.6e-03, same token. Half the memory for ~1e-3 logit noise.',
  ['ok', 'CHECKSUM: PASS -- every cache bug caught by one golden-token comparison.'],
]

export default function S6_Errors() {
  return (
    <>
      <h2 id="errors">The cache error gallery — silent by default</h2>
      <p className="sub">
        Cache bugs almost never crash. Shapes stay legal (a stale row has the same shape as a fresh
        one), text stays fluent, and the failure is <em>contextual</em>: the model quietly attends to
        the wrong past. Every entry below was injected into the verified Day-4 engine:
      </p>
      <Term title="code/04_error_gallery.py — verified output" lines={OUT} />

      <Tbl head={['bug', 'root cause', 'why it hides', 'invariant that catches it']}>
        <R cells={['stale rows', 'decode never appends new K/V', 'early tokens survive; derails at step 4', 'multi-token golden checksum']} />
        <R cells={['position off-by-one', 'decode uses <code class="inline">wpe[0]</code> not <code class="inline">wpe[t_past]</code>', 'fluent output, wrong meaning', 'positions must be absolute; checksum']} monoCols={[1, 2]} />
        <R cells={['chunked-prefill mask', 'future keys visible inside a chunk', 'last row is always correct — bugs hide in middle rows', 'compare EVERY row to naive, not just the last']} />
        <R cells={['cross-request reuse', 'cache not reset between requests', 'answers stay grammatical — for the wrong conversation', 'fresh cache per request; canary probe']} />
        <R cells={['dropped first row', 'sliding-window logic off by one', 'only long-range attention degrades', 'attention row sums + checksum']} />
        <R cells={['scheduler thrash', 'admission counted 0 blocks for waiting requests', 'output stays CORRECT — only latency explodes', 'assert pool.used == Σ request blocks each iteration']} />
        <R cells={['FP16 KV', 'deliberate quantization', 'does not hide — drift 5.6e-03, tokens unchanged', 're-run checksum after any dtype change']} />
      </Tbl>

      <Callout kind="trap" title="The meta-lesson of building this gallery">
        The first draft of this file had three "bugs" print <code className="inline">OK</code> — the
        injections were <em>unobservable</em> (checked the last row where the mask never binds; picked a
        probe prompt whose answer was identical either way). An error gallery without a visible
        difference is decoration. <strong>If you can't make the bug flip a token, you don't understand
        the bug yet.</strong>
      </Callout>

      <Callout kind="disc" title="Debugging order for cache issues">
        1. Golden checksum on the <strong>naive</strong> path → 2. single decode step vs naive logits
        (tolerance ~1e-3, BLAS noise) → 3. multi-step cached checksum → 4. per-row comparison if a
        chunked prefill is involved → 5. fresh-cache-per-request audit → 6. only then look at the
        scheduler and metrics.
      </Callout>
      <div className="divider" />
    </>
  )
}
