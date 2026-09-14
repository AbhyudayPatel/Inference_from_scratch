import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S1_Lifecycle() {
  return (
    <>
      <h2 id="lifecycle">The request lifecycle — every stage can fail</h2>
      <p className="sub">
        Follow one HTTP request through the whole serving stack. Each arrow is a place where a real
        production incident lives. This is the map the rest of the day annotates:
      </p>

      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">1 · HTTP ARRIVES</div>
            <div className="s">JSON body parsed<br /><b>fails:</b> malformed JSON → 400</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode amber" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">2 · VALIDATE</div>
            <div className="s">params + token budget<br /><b>fails:</b> 400/422, before any compute</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">3 · TOKENIZE</div>
            <div className="s">text → IDs (Day 2)<br /><b>fails:</b> empty prompt, huge input</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode amber" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">4 · ADMIT</div>
            <div className="s">scheduler queue (Day 4)<br /><b>fails:</b> pool full → wait / 429</div>
          </div>
        </div>
        <div className="farrow down">↓</div>
        <div className="flow" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">5 · PREFILL</div>
            <div className="s">cache rows 0..T-1<br /><b>fails:</b> context overflow mid-flight</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">6 · DECODE LOOP</div>
            <div className="s">batched steps + per-request sampling<br /><b>fails:</b> client disconnects — abort!</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">7 · DETOKENIZE</div>
            <div className="s">IDs → bytes → UTF-8 (buffered)<br /><b>fails:</b> split multibyte →</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode blue" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">8 · RESPOND &amp; FREE</div>
            <div className="s">finish_reason + usage; KV slot freed<br /><b>fails:</b> leak → capacity rots</div>
          </div>
        </div>
        <div className="flow-note">
          green = model compute · amber = policy/decisions · the network owns stages 1 and 8;
          Day 4 owns stage 4; Days 1–3 own 3, 5, 6, 7
        </div>
      </div>

      <h3>Finish reasons — how a request is allowed to end</h3>
      <Tbl head={['finish_reason', 'trigger', 'notes']}>
        <R cells={['<code class="inline">stop</code>', 'EOS token (50256) sampled, or stop-string matched', 'the natural end; output excludes the stop string']} monoCols={[0]} />
        <R cells={['<code class="inline">length</code>', '<code className="inline">max_tokens</code> reached', 'our golden run ends this way; text may be mid-sentence']} monoCols={[0]} />
        <R cells={['(no reason — aborted)', 'client disconnect / server shutdown', 'must free KV + slot; never counted in metrics as success']} />
      </Tbl>

      <Callout kind="warn" title="Where timeouts belong">
        Every blocking point needs a bound: HTTP read timeout, queue wait budget, per-token stall
        detection, total request deadline. An engine that can only succeed — never time out — is a
        queue of zombies waiting to happen. Our abort path (stage 6→8) exists because clients close
        connections <em>constantly</em>: users close tabs, load balancers time out, networks drop.
      </Callout>
      <div className="divider" />
    </>
  )
}
