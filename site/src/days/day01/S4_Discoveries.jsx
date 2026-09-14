import React from 'react'
import { Callout, Details, Diagram, Math, Term } from '../../components/ui.jsx'

const PARAM_BARS = `<svg width="640" height="210" viewBox="0 0 640 210">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">Where the 137M values live</text>
  <rect x="150" y="42" width="340" height="26" rx="5" fill="#4f46e5"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="142" y="59" text-anchor="end">12 blocks</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="498" y="59">85.05M</text>
  <rect x="150" y="78" width="154" height="26" rx="5" fill="#818cf8"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="142" y="95" text-anchor="end">wte (tokens)</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="312" y="95">38.60M</text>
  <rect x="150" y="114" width="50" height="26" rx="5" fill="#fca5a5"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="142" y="131" text-anchor="end">mask junk ×12</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="208" y="131">12.58M — skip at load</text>
  <rect x="150" y="150" width="4" height="26" rx="2" fill="#c7d2fe"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="142" y="167" text-anchor="end">wpe + ln_f</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="162" y="167">0.79M</text>
</svg>`

const QKV = `<svg width="620" height="200" viewBox="0 0 620 200">
  <defs><marker id="arr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">c_attn: three projections fused into one matmul</text>
  <rect x="20" y="70" width="90" height="60" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="65" y="95" text-anchor="middle">x</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="65" y="112" text-anchor="middle">(seq, 768)</text>
  <line x1="110" y1="100" x2="140" y2="100" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr3)"/>
  <rect x="142" y="52" width="96" height="96" rx="6" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <rect x="238" y="52" width="96" height="96" rx="6" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <rect x="334" y="52" width="96" height="96" rx="6" fill="#c7d2fe" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-weight="700" font-size="12" fill="#1d1d1f" x="190" y="95" text-anchor="middle">Q</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="190" y="112" text-anchor="middle">768 cols</text>
  <text font-family="monospace" font-weight="700" font-size="12" fill="#1d1d1f" x="286" y="95" text-anchor="middle">K</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="286" y="112" text-anchor="middle">768 cols</text>
  <text font-family="monospace" font-weight="700" font-size="12" fill="#1d1d1f" x="382" y="95" text-anchor="middle">V</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="382" y="112" text-anchor="middle">768 cols</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="286" y="44" text-anchor="middle">weight (768, 2304)  —  2304 = 3 × 768</text>
  <line x1="430" y1="100" x2="460" y2="100" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr3)"/>
  <rect x="462" y="70" width="130" height="60" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="527" y="95" text-anchor="middle">(seq, 2304)</text>
  <text font-family="monospace" font-size="10" fill="#065f46" x="527" y="112" text-anchor="middle">split → Q K V</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="310" y="180" text-anchor="middle">vLLM does the identical fusion for Llama: qkv_proj</text>
</svg>`

const CONV1D = `<svg width="290" height="150" viewBox="0 0 290 150">
  <text font-family="monospace" font-weight="700" font-size="10.5" fill="#991b1b" x="12" y="20">✗ x @ W.T — the nn.Linear habit</text>
  <rect x="12" y="42" width="86" height="40" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="55" y="66" text-anchor="middle">x (4, 768)</text>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="108" y="66">@</text>
  <rect x="126" y="42" width="110" height="40" rx="7" fill="#fef2f2" stroke="#fecaca" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#991b1b" x="181" y="66" text-anchor="middle">W.T (2304, 768)</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="20" y="112">inner dims: 768 vs 2304 →</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="20" y="130">ValueError: matmul mismatch</text>
</svg>`

const SQUARE_TRAP = `<svg width="290" height="150" viewBox="0 0 290 150">
  <text font-family="monospace" font-weight="700" font-size="10.5" fill="#065f46" x="12" y="20">✓ x @ W — Conv1D layout</text>
  <rect x="12" y="42" width="86" height="40" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="55" y="66" text-anchor="middle">x (4, 768)</text>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="108" y="66">@</text>
  <rect x="126" y="42" width="104" height="40" rx="7" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#065f46" x="178" y="66" text-anchor="middle">W (768, 2304)</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="20" y="112">inner dims: 768 = 768 ✓</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="20" y="130">→ out (4, 2304): fused QKV</text>
</svg>`

const PARAM_MATH = `values on disk              = <span class="hl">137,022,720</span>
mask buffers (not params)   = 12 × 1,024 × 1,024 = 12,582,912
─────────────────────────────────────────────────────────────
real parameters             = <span class="res">124,439,808</span>   ← the "124M" in GPT-2

hand-derivation from config (the checksum):
  wte      50,257 × 768   =  38,597,376
  wpe       1,024 × 768   =     786,432
  blocks   12 × 7,087,872 =  85,054,464
  ln_f              2×768 =       1,536
                          ─────────────
                            <span class="res">124,439,808 ✓ exact match</span>

memory identity: 137,022,720 × 4 bytes = <span class="res">548,090,880 B = exact file size ✓</span>`

const RUN_OUT = [
  ['p', 'header size N = 14283 bytes'],
  ['p', "metadata      = {'format': 'pt'}"],
  ['p', 'tensor count  = 160'],
  ['dim', '… 148 parameter tensors + 12 mask buffers …'],
  ['p', 'total tensor bytes = 548,090,880'],
  ['p', 'total parameters   = 137,022,720  (~137.0M)'],
  ['p', 'FP32 memory check  = 548 MB (params × 4 bytes = file size ✓)'],
  ['bad', 'x @ W.T  → ValueError: matmul dimension mismatch (2304 vs 768)'],
  ['ok', 'x @ W    → ok, out shape (4, 2304)'],
]

export default function S4_Discoveries() {
  return (
    <>
      <h2 id="discoveries">4 surprises in the bytes</h2>
      <p className="sub">Each one is a permanent lesson — and each maps to exactly one hook of the engine protocol coming next.</p>

      <h3>Surprise ① — 160 tensors, not 148: checkpoints contain junk</h3>
      <Callout kind="disc" title="Found in the wild → hook 2: filter">
        The file holds <strong>160</strong> tensors. 12 of them — <code className="inline">h.X.attn.bias</code>,
        shape (1,1,1024,1024), 4 MB each — are <strong>precomputed causal-mask buffers</strong>, not parameters.
        That's <strong>48 MB (~9%) of dead weight</strong> in a 548 MB file. HF serializes registered buffers
        alongside weights; vLLM/TRT-LLM/SGLang skip tensors like this at load and build masks inside their kernels.
      </Callout>

      <h3>Surprise ② — the "124M model" has 137M values on disk</h3>
      <Math html={PARAM_MATH} />
      <Diagram svg={PARAM_BARS}
        caption="One embedding matrix (wte) ≈ 45% of a block stack's size — and it doubles as the output projection (weight tying → hook 4: tie)." />

      <h3>Surprise ③ — the names ARE the architecture</h3>
      <div className="card">
        <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12.8, lineHeight: 1.7 }}>{`# layer 0 inventory — the transformer block, as a wiring diagram
h.0.ln_1.{weight,bias}      (768,)          # LayerNorm #1
h.0.attn.c_attn.weight     (768, 2304)   # fused Q|K|V projection  ← one matmul, not three
h.0.attn.c_attn.bias       (2304,)
h.0.attn.c_proj.weight     (768, 768)    # attention output projection
h.0.ln_2.{weight,bias}      (768,)          # LayerNorm #2
h.0.mlp.c_fc.weight        (768, 3072)   # MLP up: hidden = 4× d_model
h.0.mlp.c_proj.weight      (3072, 768)   # MLP down`}</pre>
      </div>
      <Diagram svg={QKV}
        caption="Weight fusion is not an engine trick — it's already in the checkpoint. Engines just exploit it harder (hook 4: fuse)." />

      <h3>Surprise ④ — the Conv1D trap</h3>
      <Callout kind="trap" title="Error case #1 — caught live → hook 3: map layout">
        GPT-2 stores linear weights as <strong>(in, out)</strong> — the transpose of PyTorch's
        <code className="inline"> nn.Linear</code> convention (out, in). Muscle memory says
        <code className="inline"> x @ W.T</code>. The shapes refuse.
      </Callout>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Diagram svg={CONV1D} caption="" />
        <Diagram svg={SQUARE_TRAP} caption="" />
      </div>
      <Callout kind="warn" title="The dangerous variant">
        <code className="inline">c_attn</code> is (768, 2304), so a wrong transpose fails loudly. But
        <code className="inline"> c_proj</code> is (768, 768) — <strong>square</strong>. A wrong transpose there
        multiplies fine and produces silent garbage. GPT-2-specific too: Llama-family checkpoints use plain Linear
        conventions. Both logged in <code className="inline">notes/errors.md</code>.
      </Callout>

      <Details summary="Verified terminal output (full parser run)">
        <Term lines={RUN_OUT} />
      </Details>
      <div className="divider" />
    </>
  )
}
