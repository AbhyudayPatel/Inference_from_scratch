import React from 'react'
import { Callout, Diagram, Tbl, R } from '../../components/ui.jsx'

const FORWARD_FLOW = `<svg width="700" height="275" viewBox="0 0 700 275">
  <defs><marker id="farr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">the complete GPT-2 inference loop — every box exists in our 160-tensor checkpoint</text>
  <rect x="20" y="38" width="118" height="44" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="79" y="56" text-anchor="middle" font-weight="700">token IDs</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="79" y="72" text-anchor="middle">[36235, …]</text>
  <line x1="138" y1="60" x2="158" y2="60" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="162" y="38" width="150" height="44" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="237" y="56" text-anchor="middle" font-weight="700">wte[ids] + wpe[pos]</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="237" y="72" text-anchor="middle">(T, 768) embeddings</text>
  <line x1="312" y1="60" x2="332" y2="60" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="336" y="38" width="160" height="44" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="416" y="56" text-anchor="middle" font-weight="700">transformer block ×12</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="416" y="72" text-anchor="middle">(T, 768) → (T, 768)</text>
  <line x1="496" y1="60" x2="516" y2="60" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="520" y="38" width="160" height="44" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="600" y="56" text-anchor="middle" font-weight="700">ln_f → x @ wte.T</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="600" y="72" text-anchor="middle">(T, 50,257) logits</text>
  <line x1="600" y1="82" x2="600" y2="112" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="520" y="116" width="160" height="44" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="600" y="134" text-anchor="middle" font-weight="700">sample last row</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="600" y="150" text-anchor="middle">argmax / top-p / …</text>
  <line x1="520" y1="138" x2="500" y2="138" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="336" y="116" width="160" height="44" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="416" y="134" text-anchor="middle" font-weight="700">next ID</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="416" y="150" text-anchor="middle">262 = " the"</text>
  <line x1="336" y1="138" x2="316" y2="138" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#farr)"/>
  <rect x="162" y="116" width="150" height="44" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="237" y="134" text-anchor="middle" font-weight="700">append ID, repeat</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="237" y="150" text-anchor="middle">without KV cache: re-run all ⏭</text>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="350" y="205" text-anchor="middle" font-weight="700">Day 1 supplies W  ·  Day 2 supplies IDs  ·  Day 3 supplies f(ids, W) → logits</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="230" text-anchor="middle">Day 4 removes repeated work with a KV cache; engines only change HOW these boxes execute, never the boxes.</text>
</svg>`

const TENSOR_MAP = `<svg width="700" height="185" viewBox="0 0 700 185">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">Day-1 tensor names become Day-3 operations</text>
  <rect x="28" y="38" width="225" height="120" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="140" y="58" text-anchor="middle" font-weight="700">checkpoint inventory</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="45" y="80">wte.weight (50257,768)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="45" y="96">wpe.weight (1024,768)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="45" y="112">h.0.attn.c_attn (768,2304)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="45" y="128">h.0.mlp.c_fc (768,3072)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="45" y="144">… ×12 blocks, then ln_f</text>
  <path d="M270,95 L330,95" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#none)"/>
  <text font-family="monospace" font-size="14" fill="#4f46e5" x="287" y="100">→</text>
  <rect x="360" y="38" width="310" height="120" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="515" y="58" text-anchor="middle" font-weight="700">executable graph</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="378" y="80">embedding gather + learned position add</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="378" y="96">LayerNorm → one fused QKV GEMM → attention</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="378" y="112">attention projection + residual</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="378" y="128">LayerNorm → MLP up → GELU → MLP down + residual</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="378" y="144">final LN → tied output projection</text>
</svg>`

export default function S1_Wiring() {
  return (
    <>
      <h2 id="wiring">The architecture is already in the checkpoint</h2>
      <p className="sub">No model class is needed to discover GPT-2. Day 1's tensor names and shapes are a complete wiring diagram; Day 3 executes it.</p>
      <Diagram svg={FORWARD_FLOW} caption="For generation, we only sample the last logit row. Our first implementation recomputes every earlier row after each new token — deliberately naive. Day 4 fixes exactly that." />
      <Diagram svg={TENSOR_MAP} caption="A model file is an executable graph serialized as named matrices. The forward pass is just reading that graph in the right order." />
      <h3>Shape contract — catch a wrong model before doing any math</h3>
      <Tbl head={['stage', 'input → output', 'weight / rule']}>
        <R cells={['embedding', '<code class="inline">(T,) → (T,768)</code>', '<code class="inline">wte[ids] + wpe[0:T]</code>']} monoCols={[1,2]} />
        <R cells={['fused QKV', '<code class="inline">(T,768) → (T,2304)</code>', '<code class="inline">c_attn: (768,2304)</code> = 3×768']} monoCols={[1,2]} />
        <R cells={['heads', '<code class="inline">(T,768) → (12,T,64)</code>', '<code class="inline">768 / 12 = 64</code>']} monoCols={[1,2]} />
        <R cells={['attention', '<code class="inline">(12,T,64) → (12,T,64)</code>', '<code class="inline">softmax(QK^T/√64 + causal mask) @ V</code>']} monoCols={[1,2]} />
        <R cells={['MLP', '<code class="inline">(T,768) → (T,3072) → (T,768)</code>', '<code class="inline">c_fc: (768,3072)</code>, GELU-tanh, <code class="inline">c_proj: (3072,768)</code>']} monoCols={[1,2]} />
        <R cells={['LM head', '<code class="inline">(T,768) → (T,50257)</code>', '<code class="inline">x @ wte.T</code> — exact same storage, tied']} monoCols={[1,2]} />
      </Tbl>
      <Callout kind="info" title="Context length is a hard address limit in GPT-2">
        <code className="inline">wpe.weight</code> has 1,024 rows. Position 1,024 has no learned row to gather, so
        this checkpoint cannot natively accept a 1,025-token prompt. RoPE models make positions dynamically,
        but still have a trained context limit. Engines enforce this before the forward pass — not after it fails.
      </Callout>
      <div className="divider" />
    </>
  )
}
