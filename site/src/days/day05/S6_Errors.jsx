import React from 'react'
import { Callout, Term, Tbl, R } from '../../components/ui.jsx'

const OUT = [
  ['p', '=== SERVING ERROR GALLERY ==='],
  '',
  ['bad', '1. temperature=0 as a number: logits/0.0 -> softmax sum=nan'],
  ['dim', '   fix: temperature==0 routes to GREEDY. It is a mode, not a number.'],
  ['bad', '2. context overflow: 1001-token prompt + 64 -> IndexError at row 1024'],
  ['dim', '   fix: HTTP 400 BEFORE compute; a mid-flight IndexError is a crash'],
  ['bad', "3. per-token detok: 127 -> '\\ufffd', 102 -> '\\ufffd'; buffered pair -> 'é'"],
  ['dim', '   fix: buffer bytes, emit longest valid UTF-8 prefix'],
  ['bad', "4. shared RNG: seed=42 alone=' unknown. Even if…' vs after another req=' cloud computing…'"],
  ['dim', '   identical: False -> fix: per-request default_rng(seed)'],
  ['bad', '5. disconnect w/o abort: running=1, cache at 28 rows and burning 0.8s after hangup'],
  ['dim', '   fix: poll is_disconnected(); abort frees slot + KV'],
  '',
  ['p', '=== bonus from building the engine (E2 in notes/errors.md) ==='],
  ['bad', '6. np.zeros() float64 pads -> residual stream upcast -> 700 ms/token (25x!)'],
  ['dim', '   outputs were BIT-CORRECT. Only profiling caught it. dtype-pin every buffer.'],
  ['ok', 'CHECKSUM: PASS -- five serving-only failure modes, each with evidence and fix.'],
]

export default function S6_Errors() {
  return (
    <>
      <h2 id="errors">The serving error gallery — state and edges</h2>
      <p className="sub">
        Days 3–4 bugs lived in the math and the cache. Serving bugs live in the
        <strong> lifecycle</strong>: numbers that should be modes, bytes split across frames, randomness
        shared between strangers, and work that keeps running for clients who left. All verified:
      </p>
      <Term title="code/05_error_gallery.py — verified output" lines={OUT} />

      <Tbl head={['bug', 'layer', 'visible symptom', 'invariant that catches it']}>
        <R cells={['temperature=0 → NaN', 'sampling', 'empty/erroring response', 'T==0 must route to greedy']} />
        <R cells={['context overflow', 'validation', 'IndexError mid-generation', '<code class="inline">len(ids)+max_tokens ≤ ctx</code> checked at the door']} monoCols={[3]} />
        <R cells={['split UTF-8', 'detokenization', ' replacement chars in stream', 'bytes buffered until valid prefix']} />
        <R cells={['shared RNG', 'sampling state', 'same seed ≠ same output', 'per-request RNG; seed test twice']} />
        <R cells={['disconnect leak', 'lifecycle', 'KV pool rots; capacity shrinks', 'abort frees slot; assert running==0 after hangup']} />
        <R cells={['float64 upcast', 'performance', 'TPOT 25× worse, output fine', 'dtype asserts + latency budgets in CI']} />
      </Tbl>

      <Callout kind="info" title="The serving debugging order">
        1. Engine-only golden checksum (no network) → 2. batched-engine checksum (2 requests in
        flight) → 3. over HTTP, non-streamed → 4. over SSE frames → 5. under load. Never debug
        model math through the network — the wire adds four new failure layers between you and the
        logits.
      </Callout>
      <div className="divider" />
    </>
  )
}
