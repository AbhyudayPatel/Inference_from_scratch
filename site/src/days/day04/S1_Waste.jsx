import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S1_Waste() {
  return (
    <>
      <h2 id="waste">The waste — what actually changes when a token is appended?</h2>
      <p className="sub">
        Day 3's loop runs <code className="inline">forward(all_ids)</code> every step. Ask the only
        question that matters: <strong>when we append one token, which tensors from the previous
        step are still valid?</strong>
      </p>

      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">append token t+1 — what changes?</div>
          <div className="v" style={{ textAlign: 'left' }}>
            embeddings 0..t — unchanged<br />
            K/V rows 0..t, every layer — unchanged<br />
            attention scores of rows 0..t — unchanged<br />
            <b>only NEW: one row of everything, for token t+1</b>
          </div>
        </div>
        <div className="farrow">⇒</div>
        <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">the invariant</div>
          <div className="v" style={{ textAlign: 'left' }}>
            K[i], V[i] = pure function of tokens 0..i<br />
            causal mask blocks any view of the future<br />
            ∴ old rows are <b>final</b> the moment they exist
          </div>
        </div>
      </div>

      <p>
        So Day 3 recomputed <em>final</em> values. The cost audit on our 10-token prompt, generating
        8 tokens — weight GEMMs only (attention mixing excluded, it is tiny here):
      </p>
      <Tbl head={['strategy', 'work per step', 'total weight-GEMM FLOPs', 'wall time (measured)']}>
        <R cells={['naive (Day 3)', '<code class="inline">forward(whole prefix)</code> — grows every step', '26.88 GFLOP', '842 ms']} monoCols={[1]} />
        <R cells={['cached (Day 4)', 'prefill once, then <code className="inline">forward(1 token)</code> — constant', '4.48 GFLOP', '218 ms']} monoCols={[1]} />
        <R cells={['saved', '—', '<strong>6.0× fewer FLOPs</strong>', '<strong>3.9× faster</strong>']} monoCols={[]} />
      </Tbl>
      <p className="sub">
        6× saved on a <em>10-token</em> prompt. The naive cost grows with the prefix <strong>every
        step</strong> (O(T²) over a generation), the cached cost is flat — at a 1,000-token context the
        gap is ~100× and widening. This single optimization is why long contexts are servable at all.
      </p>

      <Callout kind="warn" title="What the cache does NOT change">
        Nothing about the math changes. Same weights, same attention, same logits (to float noise),
        same selected tokens. The cache is an <strong>execution optimization with a behavioral
        contract: it must be invisible</strong>. That contract is testable — and we test it in the
        next section with the golden checksum.
      </Callout>
      <div className="divider" />
    </>
  )
}
