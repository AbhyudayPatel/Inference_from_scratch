import React from 'react'
import { Callout, Code, Details, Diagram, Term, Tbl, R } from '../../components/ui.jsx'

const BF16 = `<svg width="700" height="185" viewBox="0 0 700 185">
  <defs><marker id="arr13" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">BF16 → FP32 by hand: the bit trick</text>
  <rect x="30" y="40" width="150" height="52" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="105" y="60" text-anchor="middle">bf16: 16 bits</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="105" y="78" text-anchor="middle">[s|eeeeeeee|fffffff]</text>
  <line x1="180" y1="66" x2="215" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr13)"/>
  <rect x="220" y="40" width="220" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="330" y="60" text-anchor="middle">uint16 → uint32, shift &lt;&lt; 16</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="330" y="78" text-anchor="middle">bf16 lands in the HIGH half</text>
  <line x1="440" y1="66" x2="475" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr13)"/>
  <rect x="480" y="40" width="190" height="52" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="575" y="60" text-anchor="middle">.view(float32)</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="575" y="78" text-anchor="middle">[s|eeeeeeee|fffffff|000...0]</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="30" y="125">why it works: bf16 = fp32 with the 16 low mantissa bits dropped → put them back as zeros → valid fp32 with identical value</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="30" y="150">fp16 needs real math (5-bit exp bias 15, 10-bit mantissa) — bf16's design goal was exactly this conversion being free</text>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="30" y="176">⏭ Day 5: native half-precision compute; today we upcast to F32 to run the math</text>
</svg>`

const QWEN3_CODE = `"""compare_qwen3.py — same hand parser, 2025 model"""
# BF16 -> FP32 without any library:
bits   = np.frombuffer(raw, dtype=np.uint16)          # 2 bytes/val
wide   = bits.astype(np.uint32) << 16                 # into high half
tensor = wide.view(np.float32).reshape(shape)         # reinterpret

# verified:
#   311 tensors, all BF16, 751,632,384 values on disk
#   junk found: lm_head.weight = 311 MB duplicate,
#               present on disk DESPITE tie_word_embeddings=true
#   hand count: 596,049,920 real params  ✓ matches HF
#   32B model  : 707 tensors, 17 shards, 65.5 GB (from index.json alone)`

const QWEN3_OUTPUT = [
  ['p', '=== QWEN3-0.6B AUTOPSY (2025 model, same parser) ==='],
  'tensors: 311 · all BF16 · 751,632,384 values on disk',
  ['p', '--- 2019 → 2025 diff ---'],
  'layout   : (in,out) Conv1D  →  (out,in) Linear      [loader transposes now]',
  'norm     : LayerNorm(μ,σ)   →  RMSNorm(√mean(x²))   [no mean, no beta]',
  'position : learned wpe      →  RoPE, nothing stored [wpe table is GONE]',
  'attn     : MHA 12/12 heads  →  GQA 16 q / 8 kv      [kv cache halves ⏭]',
  'mlp      : gelu 4x          →  SwiGLU 3 mats 8.5x   [gate_up fused!]',
  'bias     : everywhere       →  almost nowhere (qkv only)',
  ['p', '--- junk detector (2025 edition) ---'],
  'lm_head.weight on disk: 155.6M values = 311 MB',
  'tie_word_embeddings=true in config → this tensor is DEAD WEIGHT',
  'engines: skip it at hook 2, re-tie at hook 4',
  ['p', '--- hand count ---'],
  'embed 151936×1024 + 28 layers × 17.0M + final norm',
  ['ok', 'real params: 596,049,920 ✓   disk overhead: +20% (the duplicate lm_head)'],
  ['p', '--- scale: qwen3-32B from index.json alone ---'],
  '707 tensors · 17 shards · 65.5 GB total_size · same 2-segment naming',
]

export default function S9_Qwen3() {
  return (
    <>
      <h2 id="qwen3">2025-proofing — the Qwen3 autopsy</h2>
      <p className="sub">If your loading knowledge only fits 2019 GPT-2, it's trivia. Same hand parser, pointed at <code className="inline">Qwen3-0.6B</code> (Apr 2025, BF16, GQA, RoPE, SwiGLU) — what changed, what didn't.</p>

      <h3>The 2019 → 2025 diff, tensor by tensor</h3>
      <Tbl head={['aspect', 'GPT-2 (2019)', 'Qwen3 (2025)', 'loader consequence']}>
        <R cells={['weight layout', '<code class="inline">(in, out)</code> Conv1D', '<code class="inline">(out, in)</code> Linear', 'transpose at load — or not. map table absorbs it']} />
        <R cells={['normalization', 'LayerNorm: <code class="inline">ln_*.g/.b</code>', 'RMSNorm: one weight, no bias', 'half the norm tensors; different math (Day 3)']} />
        <R cells={['positions', '<code className="inline">wpe</code> learned (786k params)', 'RoPE — <strong>nothing stored</strong>', 'wpe disappears from the param count entirely']} />
        <R cells={['attention', 'MHA: q,k,v all 768', 'GQA: q=2048, k=v=1024', 'fused qkv has unequal slices; KV cache halves ⏭']} />
        <R cells={['MLP', 'gelu: 2 mats, 4× rule', 'SwiGLU: 3 mats (gate,up,down), ≈8.5×', '<code class="inline">gate_up_proj</code> fusion — mechanism A again']} />
        <R cells={['biases', 'everywhere', 'only q/k/v', 'bias-handling code paths mostly vanish']} />
        <R cells={['dtype', 'F32', 'BF16', 'hook 4 casts; today: manual upcast']} monoCols={[3]} />
        <R cells={['tying', 'tied (implied)', 'tied (declared in config)', 'config field now tells the loader to skip/tie']} />
      </Tbl>

      <h3>BF16 without a library</h3>
      <p>NumPy has no BF16 dtype. But BF16 is just the top half of an FP32 — so the upcast is a bit shift, not math (this is Mismatch 2 from the problem section, solved by hand):</p>
      <Diagram svg={BF16} caption="" />
      <Code title="the 3-line upcast (verified)">{QWEN3_CODE}</Code>

      <Callout kind="trap" title="Junk on disk, 2025 edition — dead-weight lm_head">
        Qwen3-0.6B declares <code className="inline">tie_word_embeddings: true</code> yet still ships a full
        <code className="inline"> lm_head.weight</code> copy: <strong>311 MB = 20% of the checkpoint</strong>.
        Lesson: <em>the config is the source of truth, not the file listing.</em> Engines detect the tie
        (hook 2 skips, hook 4 re-ties) and never pay for it. GPT-2 does the inverse: no lm_head on disk at all.
        Same concept, opposite direction.
      </Callout>

      <Details summary="compare_qwen3.py — full verified output" open>
        <Term lines={QWEN3_OUTPUT} />
      </Details>

      <Callout kind="info" title="What did NOT change in 6 years">
        The <strong>format</strong> (same safetensors anatomy), the <strong>4-hook protocol</strong>
        (enumerate-filter-map-place), <strong>fusion</strong> (qkv then, gate_up now), <strong>junk filtering</strong>
        (mask then, duplicate lm_head now), <strong>tying</strong>, and <strong>sharding</strong> (routing diagram:
        Scale section). Six years of architecture research changed the tensors; the loading pipeline didn't flinch.
      </Callout>
      <div className="divider" />
    </>
  )
}
