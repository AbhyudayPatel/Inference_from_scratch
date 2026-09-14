import React from 'react'
import { Callout, Diagram, Term, Tbl, R } from '../../components/ui.jsx'

const ROOFLINE = `<svg width="700" height="250" viewBox="0 0 700 250">
  <defs><marker id="rarr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">one model, two physical regimes — the source of most inference-engine design</text>
  <line x1="80" y1="198" x2="650" y2="198" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="365" y="222" text-anchor="middle">arithmetic intensity (FLOP / byte) →</text>
  <line x1="80" y1="198" x2="80" y2="35" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="28" y="110" transform="rotate(-90 28,110)" text-anchor="middle">achievable throughput</text>
  <path d="M90,190 L400,70 L640,70" fill="none" stroke="#a5b4fc" stroke-width="3"/>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="470" y="62">compute ceiling (tensor cores)</text>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="180" y="122">bandwidth ceiling</text>
  <circle cx="125" cy="177" r="7" fill="#f59e0b"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="110" y="157" text-anchor="middle" font-weight="700">DECODE</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="125" y="171" text-anchor="middle">T=1</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="125" y="192" text-anchor="middle">~0.5 FLOP/B</text>
  <circle cx="290" cy="114" r="7" fill="#4f46e5"/>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="290" y="94" text-anchor="middle" font-weight="700">PREFILL</text>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="290" y="108" text-anchor="middle">T=512</text>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="290" y="130" text-anchor="middle">~256 FLOP/B</text>
  <rect x="430" y="130" width="230" height="48" rx="8" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="545" y="149" text-anchor="middle" font-weight="700">engine consequence</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="545" y="165" text-anchor="middle">decode: batch / quantize / CUDA graph</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="545" y="176" text-anchor="middle">prefill: FlashAttention / big GEMMs</text>
</svg>`

const MEMORY = `<svg width="700" height="175" viewBox="0 0 700 175">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">why kernel fusion matters: launch count is not the main prize — HBM round trips are</text>
  <rect x="25" y="40" width="250" height="96" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="150" y="60" text-anchor="middle" font-weight="700">naïve separate kernels</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="42" y="82">LN → write x1 → QKV GEMM → write x2</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="42" y="98">→ bias add → write x3 → GELU → write x4</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="42" y="120">many launches + many full-tensor reads/writes</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="42" y="131">memory-bound decode pays every trip</text>
  <text font-family="monospace" font-size="16" fill="#6e6e73" x="330" y="98">→</text>
  <rect x="385" y="40" width="290" height="96" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="530" y="60" text-anchor="middle" font-weight="700">fused / tiled kernel</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="402" y="82">load tile once → LN + projection / activation</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="402" y="98">in registers/shared memory → one final write</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="402" y="120">same floats, fewer HBM bytes + launches</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="402" y="131">what "fused kernel" physically means</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="163" text-anchor="middle">FlashAttention adds tiling + online softmax: it also avoids writing the O(T²) score matrix to HBM.</text>
</svg>`

const TIMING_OUT = [
  ['p', '=== PER-OP TIMING: GPT-2, T=10, 12 layers, NumPy CPU ==='],
  'embed       0.10 ms   0.1%   gather',
  'LayerNorm   2.63 ms   2.3%   engines fuse it',
  'QKV GEMM   10.09 ms   8.7%   one fused projection',
  'attention   1.69 ms   1.5%   FlashAttention/PagedAttention target',
  'out GEMM    4.83 ms   4.2%',
  'MLP up     15.19 ms  13.1%',
  ['p', 'MLP down   54.62 ms  47.0%   ← largest on this CPU/BLAS run'],
  ['p', 'LM head    22.41 ms  19.3%   ← vocab projection is real work'],
  ['ok', 'TOTAL     116.10 ms 100.0%'],
  ['p', 'dense rule: 2 x T x P = 2.489 GFLOP · attention mixing = just 3.686 MFLOP at T=10'],
]

export default function S6_Performance() {
  return (
    <>
      <h2 id="performance">Where the time and bytes go</h2>
      <p className="sub">The forward pass is not "attention is all you need" in a performance sense. For a short sequence, dense matrix multiplications — especially MLP and the vocabulary head — dominate. Long contexts change the balance.</p>
      <Term lines={TIMING_OUT} />
      <Callout kind="info" title="The 2NP rule — fast mental FLOP accounting">
        A dense parameter participates in approximately one multiply + one add per token:
        <code className="inline"> FLOPs ≈ 2 × N_parameters × N_tokens</code>. GPT-2 at T=10:
        <strong> 2.489 GFLOP</strong>. This catches impossible benchmark claims. Attention mixing adds
        <code className="inline"> 4 × layers × T² × hidden</code>; small at T=10, dominant as contexts grow.
      </Callout>
      <Diagram svg={ROOFLINE} caption="Arithmetic intensity = operations performed per byte fetched. It predicts the bottleneck better than FLOPs alone." />
      <Diagram svg={MEMORY} caption="Kernel fusion must preserve numerical semantics (especially reduction order / precision). A faster incorrect fuse fails the golden tests." />
      <h3>Optimization mechanisms, tied to the bottleneck</h3>
      <Tbl head={['bottleneck', 'what causes it', 'optimization', 'what must remain identical']}>
        <R cells={['kernel launch / temporaries', 'dozens of tiny pointwise ops around GEMMs', 'fuse LN, bias, GELU, residual; CUDA graph for static decode', 'operation order, epsilon, accumulation precision']} />
        <R cells={['attention HBM memory', 'naïve materializes <code class="inline">T×T</code> score matrix per head', 'FlashAttention: tile Q/K/V + online softmax; do not write scores', 'causal probabilities and softmax result']} />
        <R cells={['decode bandwidth', 'one token streams ~498 MB of FP32 weights → ~0.5 FLOP/B', 'continuous batching; quantization; tensor parallel ⏭', 'same weights/logits within numerical tolerance']} />
        <R cells={['recomputed prefix', 'naïve generation recalculates old K,V every token', 'KV cache ⏭ Day 4', 'new token attends against exact old K,V']} />
        <R cells={['vocabulary head', 'hidden→V projection every generated token', 'GPU top-k/sample; vocab sharding ⏭', 'candidate ranking / requested sampling policy']} />
      </Tbl>
      <div className="divider" />
    </>
  )
}
