import React from 'react'
import { Callout, Code, Tbl, R } from '../../components/ui.jsx'

const DECODE_CODE = `# decode step: ONE new token, cache holds t_past rows
pos = arange(t_past, t_past + 1)                  # absolute position, e.g. 10
x   = wte[[tok]] + wpe[pos]                       # (1, 768)

qkv = x @ c_attn.w + b                            # (1, 2304) — only for the NEW token
q, k, v = split_heads(qkv)                        # (12, 1, 64) each

K = concat(cache.K, k)   # (12, t_past+1, 64)    # append one row per layer
V = concat(cache.V, v)
cache.store(K, V)                                 # the cache GREW by 72 KiB (FP32)

att = softmax(q @ K.T / 8) @ V                    # (12, 1, 64)
# ^ no causal mask needed: the only query is the LAST position — it may see all
# ... then out-proj, MLP, residuals exactly as Day 3`

export default function S2_Mechanics() {
  return (
    <>
      <h2 id="cache">The cache — prefill writes, decode appends</h2>
      <p className="sub">
        The generation loop from Day 3 splits into two phases with different physics. The object
        crossing between them is the <strong>KV cache</strong>: per layer, the K and V rows of every
        token seen so far.
      </p>

      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center' }}>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">PREFILL — once per request</div>
            <div className="v">forward(all 10 prompt tokens)</div>
            <div className="s">compute-bound: 10 rows × 12 layers of K/V<br />written into an empty cache (72 ms measured)</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode blue" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">KV CACHE</div>
            <div className="v">12 × (K, V) : (12 heads, T, 64)</div>
            <div className="s">grows one row per token<br />18 tokens = 1,327,104 B (verified)</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">DECODE — once per generated token</div>
            <div className="v">forward(1 token) against the cache</div>
            <div className="s">bandwidth-bound: reads all 498 MB of weights<br />to compute ONE row (~27 ms, flat)</div>
          </div>
        </div>
        <div className="flow-note">decode appends its new K/V row → next step sees it → the loop from Day 3, minus the waste</div>
      </div>

      <h3>The decode step, line by line</h3>
      <Code title="the only code that differs from Day 3">{DECODE_CODE}</Code>

      <h3>What the cache costs — the memory that actually limits serving</h3>
      <Tbl head={['model', 'layers × 2 × kv-heads × dim × bytes', 'KV per token', '1,000-token conversation']}>
        <R cells={['GPT-2 (FP32, us)', '12 × 2 × 12 × 64 × 4', '<code class="inline">73,728 B = 72 KiB</code>', '72 MB']} monoCols={[2]} />
        <R cells={['GPT-2 (FP16, engines)', '12 × 2 × 12 × 64 × 2', '<code class="inline">36,864 B = 36 KiB</code>', '36 MB']} monoCols={[2]} />
        <R cells={['Qwen3-0.6B (BF16)', '28 × 2 × 8 × 128 × 2', '<code class="inline">114,688 B = 112 KiB</code>', '112 MB']} monoCols={[2]} />
        <R cells={['Llama-3-8B (FP16)', '32 × 2 × 8 × 128 × 2', '<code class="inline">131,072 B = 128 KiB</code>', '128 MB']} monoCols={[2]} />
        <R cells={['Llama-3-70B (FP16)', '80 × 2 × 8 × 128 × 2', '<code class="inline">327,680 B = 320 KiB</code>', '320 MB']} monoCols={[2]} />
      </Tbl>
      <p className="sub">
        Formula: <code className="inline">layers × 2 (K+V) × kv_heads × head_dim × dtype_bytes</code>.
        GPT-2 has 12 KV heads (MHA); modern models use fewer (GQA) <em>precisely to shrink this
        number</em>. Weights are read once per forward pass; the cache is read <strong>and
        written</strong> every token and grows without bound during generation.
      </p>

      <Callout kind="disc" title="Why decode has no causal mask">
        In the full forward pass the mask stops query <em>i</em> from seeing keys after <em>i</em>.
        In decode there is exactly one query — the newest position — and every cached key is behind
        it. The mask is vacuous, so engines skip it. (Prefill with a cache — a <em>chunk</em> of new
        tokens — still needs a mask covering "past is fine, future within the chunk is not." Getting
        that mask wrong is error-gallery entry #3.)
      </Callout>
      <div className="divider" />
    </>
  )
}
