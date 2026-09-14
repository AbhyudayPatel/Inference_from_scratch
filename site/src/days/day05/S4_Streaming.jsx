import React from 'react'
import { Callout, Code, Term, Tbl, R } from '../../components/ui.jsx'

const FRAMES = `data: {"token": 262, "text": " the"}

data: {"token": 749, "text": " most"}

data: {"token": 3665, "text": " powerful"}

data: {"token": 8217, "text": " machines"}
...
data: {"done": true, "finish_reason": "length", "error": null}`

const DETOK = [
  ['p', "'e-acute' in UTF-8 = bytes C3 A9. GPT-2 byte-level BPE keeps them as"],
  ['p', 'separate tokens when no merge applies: token 127 = byte C3, token 102 = byte A9'],
  ['bad', "stream token 127 alone -> '\\ufffd'   (invalid UTF-8!)"],
  ['bad', "stream token 102 alone -> '\\ufffd'"],
  ['p', "naive concatenation: '\\ufffd\\ufffd'"],
  ['ok', "buffered decode of [127, 102]: '\\xe9'  -- one correct character"],
  ['dim', "fix: accumulate BYTES; emit only the longest valid UTF-8 prefix"],
]

export default function S4_Streaming() {
  return (
    <>
      <h2 id="streaming">Streaming — SSE frames and the two clocks</h2>
      <p className="sub">
        Non-streamed generation makes the user stare at nothing for the whole generation. Streaming
        sends <strong>each token as it is sampled</strong> over the same HTTP response, using
        Server-Sent Events — a frame is literally the text <code className="inline">data: ...</code>
        followed by a blank line. Real frames from our server:
      </p>
      <Code title="GET the wire — actual SSE frames from /v1/generate/stream">{FRAMES}</Code>

      <h3>The two clocks every dashboard shows</h3>
      <Tbl head={['metric', 'definition', 'what it measures']}>
        <R cells={['<strong>TTFT</strong>', 'submit → first token frame', 'queue wait + prefill — “how fast did it start?”']} />
        <R cells={['<strong>TPOT / ITL</strong>', 'mean gap between consecutive token frames', 'decode cadence — “how fast is it typing?”']} />
        <R cells={['E2E latency', 'submit → done frame', 'TTFT + (n−1) × TPOT, roughly']} />
      </Tbl>
      <p className="sub">
        Measured here: TTFT ~550 ms on a cold engine (first prefill pays one-time BLAS warm-up),
        then <strong>36–42 ms per token</strong> steady-state. The two clocks fail independently:
        TTFT degrades when the queue grows; TPOT degrades when the machine saturates. Watch both.
      </p>

      <h3>Incremental detokenization — a real byte-level bug</h3>
      <p>
        Each SSE frame carries a text piece. The naive approach — decode each token ID alone —
        corrupts multibyte UTF-8 characters split across tokens. Reproduced with real GPT-2 tokens:
      </p>
      <Term title="code/05_error_gallery.py — entry 3, verified" lines={DETOK} />

      <Callout kind="warn" title="Disconnects are the normal case, not the edge">
        Our streaming loop polls <code className="inline">is_disconnected()</code> every 5 ms and the
        <code className="inline">finally</code> block aborts the request, freeing its KV slot. The first
        version skipped the poll and <strong>kept generating 28+ rows into the void</strong> after the
        client hung up (gallery entry #5). At scale, dead consumers are the fastest way to set your
        KV pool on fire.
      </Callout>
      <div className="divider" />
    </>
  )
}
