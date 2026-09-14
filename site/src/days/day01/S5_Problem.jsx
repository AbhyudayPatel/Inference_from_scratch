import React from 'react'
import { Callout, Diagram, Tbl, R } from '../../components/ui.jsx'

const LAYOUT = `<svg width="700" height="180" viewBox="0 0 700 180">
  <defs><marker id="arr16" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="20" y="45" width="190" height="95" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="115" y="65" text-anchor="middle" font-weight="700">ON DISK (checkpoint)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="115" y="85" text-anchor="middle">c_attn (768, 2304) F32</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="115" y="102" text-anchor="middle">Conv1D (in, out)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="115" y="119" text-anchor="middle">HF's naming</text>
  <line x1="210" y1="92" x2="245" y2="92" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr16)"/>
  <rect x="250" y="45" width="200" height="95" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="350" y="65" text-anchor="middle" font-weight="700">LOADER TRANSFORMS</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="85" text-anchor="middle">rename · transpose · cast</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="102" text-anchor="middle">fuse · pack · dequant ⏭</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="119" text-anchor="middle">(all inside hook 4: place)</text>
  <line x1="450" y1="92" x2="485" y2="92" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr16)"/>
  <rect x="490" y="45" width="190" height="95" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="585" y="65" text-anchor="middle" font-weight="700">IN VRAM (execution)</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="585" y="85" text-anchor="middle">BF16, kernel-ready layout</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="585" y="102" text-anchor="middle">engine's naming</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="585" y="119" text-anchor="middle">whatever the GEMM wants</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="168" text-anchor="middle">GPT-2: (in,out) on disk → transpose at load  ·  Qwen3: already (out,in) → direct copy — the mapping table absorbs the difference</text>
</svg>`

const DTYPE_BITS = `<svg width="700" height="210" viewBox="0 0 700 210">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">four ways to write the same number — bit anatomy of the dtypes you'll load</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="52">F32</text>
  <rect x="70" y="38" width="18" height="26" fill="#fca5a5"/>
  <rect x="88" y="38" width="144" height="26" fill="#fcd34d"/>
  <rect x="232" y="38" width="368" height="26" fill="#c7d2fe"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="79" y="55" text-anchor="middle">S</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="160" y="55" text-anchor="middle">exponent · 8</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="416" y="55" text-anchor="middle">mantissa · 23</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="614" y="55">4 B/param · GPT-2 on disk</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="102">BF16</text>
  <rect x="70" y="88" width="18" height="26" fill="#fca5a5"/>
  <rect x="88" y="88" width="144" height="26" fill="#fcd34d"/>
  <rect x="232" y="88" width="112" height="26" fill="#818cf8"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="79" y="105" text-anchor="middle">S</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="160" y="105" text-anchor="middle">exponent · 8</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="288" y="105" text-anchor="middle">mant. · 7</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="614" y="105">2 B · Qwen3, Llama3</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="152">F16</text>
  <rect x="70" y="138" width="18" height="26" fill="#fca5a5"/>
  <rect x="88" y="138" width="90" height="26" fill="#fcd34d"/>
  <rect x="178" y="138" width="166" height="26" fill="#a5b4fc"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="79" y="155" text-anchor="middle">S</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="133" y="155" text-anchor="middle">exp · 5</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="261" y="155" text-anchor="middle">mantissa · 10</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="614" y="155">2 B · classic FP16</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="198">FP8</text>
  <rect x="70" y="184" width="14" height="20" fill="#fca5a5"/>
  <rect x="84" y="184" width="64" height="20" fill="#fcd34d"/>
  <rect x="148" y="184" width="52" height="20" fill="#c7d2fe"/>
  <text font-family="monospace" font-size="8.5" fill="#1d1d1f" x="77" y="197" text-anchor="middle">S</text>
  <text font-family="monospace" font-size="8.5" fill="#1d1d1f" x="116" y="197" text-anchor="middle">e·4</text>
  <text font-family="monospace" font-size="8.5" fill="#1d1d1f" x="174" y="197" text-anchor="middle">m·3</text>
  <text font-family="monospace" font-size="9" fill="#b45309" x="230" y="198">1 B · E4M3 — inference dtype ⏭ Day 5</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="176">range = exponent width · precision = mantissa width · BF16 keeps F32's range (why training loves it)</text>
</svg>`

export default function S5_Problem() {
  return (
    <>
      <h2 id="problem">The core problem — why "loading" is even a job</h2>
      <Callout kind="info" title="Two different questions">
        <strong>Your hand parser asks:</strong> "how do I turn safetensors bytes into tensors?"<br />
        <strong>An engine asks:</strong> "how do I turn checkpoint weights into the <em>exact GPU-resident
        representation my kernels demand</em> — with minimum memory movement, paid once at boot?"
      </Callout>
      <Diagram svg={LAYOUT}
        caption="Bytes on disk ≠ bytes the kernel consumes. The disk format is an <em>archive</em>; the GPU layout is an <em>execution contract</em>. Loading = compiling one into the other, once. (Hook 4 does the work; hook 3 knows what work is needed.)" />
      <h3>Mismatch 2 — representation</h3>
      <Diagram svg={DTYPE_BITS}
        caption="A checkpoint may ship F32 (GPT-2), BF16 (Qwen3, Llama3), or FP8 while your compute wants something else. Casting is hook 4's business. BF16's 8-bit exponent is why it won: same range as F32, half the bytes — the truncated mantissa is the entire design." />
      <Callout kind="warn" title="Quantization-aware loading ⏭ Day 5">
        A checkpoint may ship FP16 while the kernel consumes INT8/FP8-<em>packed</em> weights — then hook 4
        dequantizes/packs during load (GPTQ/AWQ/GGUF). Today you only need to know the hook point exists.
      </Callout>
      <h3>The 4 questions — how to read any engine component</h3>
      <Tbl head={['question', 'answers to choose from', "today's instance"]}>
        <R cells={['<strong>Q1 · Where are the bytes?</strong>', 'disk → CPU RAM → GPU HBM', 'disk → CPU (L0); page cache (L1+)']} monoCols={[1, 2]} />
        <R cells={['<strong>Q2 · What representation?</strong>', 'F32 / F16 / BF16 / FP8 / INT8 / packed', 'F32 (GPT-2) · BF16 (Qwen3, hand-upcast)']} monoCols={[1, 2]} />
        <R cells={['<strong>Q3 · What layout?</strong>', '(in,out) / (out,in) / fused / sharded', 'Conv1D vs Linear flip; fused c_attn']} monoCols={[1, 2]} />
        <R cells={['<strong>Q4 · Who consumes them?</strong>', 'GEMM / FlashAttention / Triton / TRT kernel', 'NumPy matmul today; CUDA later ⏭']} monoCols={[1, 2]} />
      </Tbl>
      <div className="divider" />
    </>
  )
}
