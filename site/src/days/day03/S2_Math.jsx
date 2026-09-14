import React from 'react'
import { Callout, Diagram, Math, Tbl, R } from '../../components/ui.jsx'

const BLOCK = `<svg width="700" height="310" viewBox="0 0 700 310">
  <defs><marker id="barr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">one GPT-2 pre-norm transformer block (repeat 12×)</text>
  <rect x="285" y="34" width="130" height="32" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="55" text-anchor="middle">x  (T,768)</text>
  <line x1="350" y1="66" x2="350" y2="83" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#barr3)"/>
  <rect x="285" y="87" width="130" height="32" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="108" text-anchor="middle">LayerNorm #1</text>
  <line x1="350" y1="119" x2="350" y2="136" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#barr3)"/>
  <rect x="235" y="140" width="230" height="42" rx="8" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="158" text-anchor="middle" font-weight="700">fused QKV → causal attention → proj</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="350" y="174" text-anchor="middle">(T,768) → (T,2304) → (T,768)</text>
  <path d="M285,50 C 150,50 150,200 235,200" fill="none" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#barr3)"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="132" text-anchor="middle">residual</text>
  <rect x="285" y="190" width="130" height="32" rx="8" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="350" y="211" text-anchor="middle">x = x + attn</text>
  <line x1="350" y1="222" x2="350" y2="239" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#barr3)"/>
  <rect x="285" y="243" width="130" height="32" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="264" text-anchor="middle">LayerNorm #2</text>
  <path d="M285,206 C 525,206 525,276 465,276" fill="none" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#barr3)"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="555" y="240" text-anchor="middle">residual</text>
  <rect x="285" y="279" width="130" height="25" rx="7" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="296" text-anchor="middle">MLP: 768→3072→768</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="20" y="296">pre-norm order is load-bearing:</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="20" y="307">LN happens BEFORE each sublayer.</text>
</svg>`

const ATTENTION = `<svg width="700" height="205" viewBox="0 0 700 205">
  <defs><marker id="aarr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">one attention layer — 12 copies of this in parallel</text>
  <rect x="20" y="44" width="118" height="44" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="79" y="62" text-anchor="middle">normalized x</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="79" y="77" text-anchor="middle">(T,768)</text>
  <line x1="138" y1="66" x2="158" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#aarr3)"/>
  <rect x="162" y="44" width="145" height="44" rx="8" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="234" y="62" text-anchor="middle" font-weight="700">x @ W_qkv + b</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="234" y="77" text-anchor="middle">(T,2304) split Q,K,V</text>
  <line x1="307" y1="66" x2="327" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#aarr3)"/>
  <rect x="331" y="44" width="148" height="44" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="405" y="62" text-anchor="middle">reshape + transpose</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="77" text-anchor="middle">each: (12,T,64)</text>
  <line x1="479" y1="66" x2="499" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#aarr3)"/>
  <rect x="503" y="44" width="177" height="44" rx="8" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="591" y="62" text-anchor="middle" font-weight="700">scores = QKᵀ / √64</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="591" y="77" text-anchor="middle">(12,T,T) — apply mask</text>
  <line x1="591" y1="88" x2="591" y2="111" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#aarr3)"/>
  <rect x="503" y="115" width="177" height="44" rx="8" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="591" y="133" text-anchor="middle" font-weight="700">softmax(scores) @ V</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="591" y="148" text-anchor="middle">(12,T,64)</text>
  <line x1="503" y1="137" x2="483" y2="137" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#aarr3)"/>
  <rect x="331" y="115" width="148" height="44" rx="8" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="405" y="133" text-anchor="middle">merge heads</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="148" text-anchor="middle">(T,768) → output proj</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="20" y="187">causal mask: at row i, columns j&gt;i are -∞ before softmax → P(future token)=0. A saved 48 MB mask buffer becomes a 1-line rule.</text>
</svg>`

const LN_MATH = `μ = mean(x, axis=-1)          σ² = mean((x − μ)², axis=-1)
LayerNorm(x) = <span class="hl">(x − μ) / sqrt(σ² + ε)</span> × γ + β

GPT-2: ε = <span class="res">1e-5</span> from config · γ = ln_*.weight · β = ln_*.bias
RMSNorm (Qwen3): x / sqrt(mean(x²)+ε) × γ  — no mean, no β`

const ATTN_MATH = `Q,K,V = split(x W_qkv + b)         # GPT-2 W_qkv: (768, 2304), Conv1D layout
A = softmax(<span class="hl">Q Kᵀ / sqrt(head_dim)</span> + causal_mask)
out = A V

softmax(z) = exp(z − max(z)) / Σ exp(z − max(z))
            <span class="res">subtract max first</span> — otherwise FP32 underflows/overflows → NaN`

const MLP_MATH = `MLP(x) = <span class="hl">GELU_new(x W_fc + b_fc)</span> W_proj + b_proj
GELU_new(x) = 0.5x[1 + tanh(√(2/π) × (x + 0.044715x³))]

GPT-2 uses the tanh approximation — exact erf-GELU is a <span class="res">different model</span> for checksum purposes.`

export default function S2_Math() {
  return (
    <>
      <h2 id="math">The math — operation by operation</h2>
      <p className="sub">This is the entire neural network. There are no hidden steps. Getting one order, transpose, scale, or dtype wrong changes logits.</p>
      <Diagram svg={BLOCK} caption="Residuals preserve the information highway; pre-norm stabilizes each sublayer's input. GPT-2 uses this precise order — post-norm is a different architecture." />
      <h3>1 · Normalize</h3>
      <Math html={LN_MATH} />
      <h3>2 · Attend</h3>
      <Diagram svg={ATTENTION} caption="The attention score matrix is T×T per head. Our NumPy code materializes it; FlashAttention will avoid materializing it (Performance section)." />
      <Math html={ATTN_MATH} />
      <h3>3 · Expand, nonlinearity, compress</h3>
      <Math html={MLP_MATH} />
      <h3>4 · Project to the vocabulary</h3>
      <Tbl head={['operation', 'GPT-2 implementation', 'engine caution']}>
        <R cells={['residual', '<code class="inline">x = x + sublayer(LN(x))</code>', 'fuse add with adjacent op when legal; accumulation dtype matters']} monoCols={[1]} />
        <R cells={['output head', '<code class="inline">logits = x @ wte.T</code>', 'tied, so no lm_head tensor exists on disk; vocabulary GEMM is expensive']} monoCols={[1]} />
        <R cells={['next-token row', '<code class="inline">logits[-1]</code>', 'only last row is sampled; prefill may still compute all rows efficiently']} monoCols={[1]} />
        <R cells={['causal rule', '<code class="inline">j &gt; i → -∞</code> before softmax', 'never build/store the 1024² buffer in an engine; encode the rule in the kernel']} monoCols={[1]} />
      </Tbl>
      <Callout kind="trap" title="GPT-2's Conv1D convention survives all the way into the forward pass">
        Its weights are stored <code className="inline">(in,out)</code>, so every linear is
        <code className="inline"> x @ W + b</code>. PyTorch's <code className="inline">nn.Linear</code> stores
        <code className="inline">(out,in)</code>, so its code uses <code className="inline">x @ W.T</code> conceptually.
        The checkpoint layout decides this — an engine's loader may transpose once at boot so its runtime kernel
        always sees its preferred layout. Day 1's "disk ≠ execution layout" is now executable.
      </Callout>
      <div className="divider" />
    </>
  )
}
