import React from 'react'
import { Callout, Diagram } from '../../components/ui.jsx'

const FIELD_FLOW = `<svg width="700" height="150" viewBox="0 0 700 150">
  <defs><marker id="arr18" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">the universal loading algorithm — any repo, any format, any size</text>
  <rect x="14" y="40" width="88" height="56" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="58" y="62" text-anchor="middle" font-weight="700">1 CONFIG</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="58" y="80" text-anchor="middle">arch, dtype, tying</text>
  <line x1="102" y1="68" x2="112" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="116" y="40" width="88" height="56" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="160" y="62" text-anchor="middle" font-weight="700">2 COUNT</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="160" y="80" text-anchor="middle">params by hand</text>
  <line x1="204" y1="68" x2="214" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="218" y="40" width="88" height="56" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="262" y="62" text-anchor="middle" font-weight="700">3 ENUMERATE</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="262" y="80" text-anchor="middle">header only</text>
  <line x1="306" y1="68" x2="316" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="320" y="40" width="88" height="56" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="364" y="62" text-anchor="middle" font-weight="700">4 FILTER</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="364" y="80" text-anchor="middle">masks, dead lm_head</text>
  <line x1="408" y1="68" x2="418" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="422" y="40" width="88" height="56" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="466" y="62" text-anchor="middle" font-weight="700">5 MAP</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="466" y="80" text-anchor="middle">names, fusions</text>
  <line x1="510" y1="68" x2="520" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="524" y="40" width="88" height="56" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="568" y="62" text-anchor="middle" font-weight="700">6 PLACE</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="568" y="80" text-anchor="middle">copy/fuse/cast/tie</text>
  <line x1="612" y1="68" x2="622" y2="68" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#arr18)"/>
  <rect x="626" y="40" width="66" height="56" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="659" y="62" text-anchor="middle" font-weight="700">7 VERIFY</text><text font-family="monospace" font-size="9" fill="#6e6e73" x="659" y="80" text-anchor="middle">bytes+count ✓</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="125">steps 1–2 catch junk before you pay for it · steps 3–6 are the 4-hook protocol · step 7 makes silence impossible</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="20" y="142">format differences live ONLY in step 3 (header parsing) — everything downstream is identical</text>
</svg>`

const STACK = `<svg width="700" height="300" viewBox="0 0 700 300">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">where today sits in the stack you're climbing</text>
  <rect x="120" y="40" width="460" height="40" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11.5" fill="#6e6e73" x="350" y="64" text-anchor="middle">serving: continuous batching · paged KV · scheduling  (vLLM/SGLang/Dynamo)  ⏭</text>
  <rect x="120" y="88" width="460" height="40" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11.5" fill="#6e6e73" x="350" y="112" text-anchor="middle">kernels: CUDA/Triton · fused attention · quantization  (TRT-LLM)  ⏭</text>
  <rect x="120" y="136" width="460" height="40" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11.5" fill="#6e6e73" x="350" y="160" text-anchor="middle">forward pass: attention · KV cache · sampling  (Day 3–4)  ⏭</text>
  <rect x="120" y="184" width="460" height="40" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="11.5" fill="#065f46" x="350" y="208" text-anchor="middle">tokenizer: bytes → BPE merges → IDs  ✓ DAY 2</text>
  <rect x="120" y="232" width="460" height="40" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11.5" fill="#065f46" x="350" y="256" text-anchor="middle" font-weight="700">loading: formats · mmap · 4-hook protocol · sharding · tying  ✓ THIS PAGE</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="30" y="260">built →</text>
</svg>`

export default function S10_FieldGuide() {
  return (
    <>
      <h2 id="fieldguide">The field guide — load anything</h2>
      <p className="sub">Everything on this page, distilled into one algorithm. If you keep only one section, keep this one.</p>

      <Diagram svg={FIELD_FLOW}
        caption="Format differences live only in step 3. Steps 1–2 arm your lie detector; steps 4–6 are the 4-hook protocol; step 7 makes silent failure impossible." />

      <div className="card">
        <ol style={{ marginBottom: 0 }}>
          <li><strong>READ CONFIG</strong> — architecture, hidden size, layers, heads, vocab, dtype, <code className="inline">tie_word_embeddings</code>, norm/position type. The contract before the bytes.</li>
          <li><strong>COUNT BY HAND</strong> — derive the expected param total before touching weights. Any surplus on disk is junk or duplication.</li>
          <li><strong>ENUMERATE header-only</strong> — safetensors: 8B + JSON. sharded: read <code className="inline">index.json</code> first. .bin: <em>don't unpickle what you don't trust</em>. GGUF: metadata KV + tensor infos.</li>
          <li><strong>FILTER</strong> — drop runtime-rebuildables (causal masks) and dead weight (duplicate <code className="inline">lm_head</code> when tied).</li>
          <li><strong>MAP</strong> — build the name table; detect fusions (qkv, gate_up) and storage layout (<code className="inline">(in,out)</code> vs <code className="inline">(out,in)</code>).</li>
          <li><strong>PLACE</strong> — copy / fuse / cast / tie into a preallocated skeleton. This is where dtype conversion and TP slicing live.</li>
          <li><strong>VERIFY</strong> — per-tensor <code className="inline">bytes = elems × dtype-size</code>; total = hand count; spot-check one tensor's values. Then, and only then, run.</li>
        </ol>
      </div>

      <h3>Your exercises</h3>
      <div className="card">
        <ol style={{ marginBottom: 0 }}>
          <li><strong>Verify the mask claim:</strong> load <code className="inline">h.0.attn.bias</code>, assert sum = 523,776, inspect corner values. (Surprise 1)</li>
          <li><strong>Rewrite with <code className="inline">np.memmap</code>:</strong> replace <code className="inline">f.read()</code>; touch only <code className="inline">wte[0]</code>; measure RSS before/after. (Ladder rung L1)</li>
          <li><strong>Re-derive 124,439,808</strong> from <code className="inline">config.json</code> alone, arithmetic only. Make your parser agree. (Surprise 2)</li>
          <li><strong>Keep the error log:</strong> <code className="inline">notes/errors.md</code> — every wrong endianness, wrong offset base, wrong transpose. Engines are graveyards of exactly these bugs.</li>
        </ol>
      </div>

      <h3>The big picture</h3>
      <Diagram svg={STACK} caption="Every layer above trusts the loading layer to have placed the right bytes in the right layout. You now own that layer." />

      <Callout kind="info" title="Done next — Day 2: the tokenizer">
        <code className="inline">vocab.json</code> + <code className="inline">merges.txt</code> → a real byte-level BPE from scratch.
        Golden vectors: <code className="inline">"Hello world" → [15496, 995]</code> — plus UTF-8 internals, chat
        templates, and why token count is an inference-systems variable. Then Day 3 runs the forward pass with the
        end-to-end checksum: greedy decode of <em>"Alan Turing theorized that computers would one day become"</em> →{' '}
        <em>" the most powerful machines on the planet."</em>
      </Callout>

      <div className="foot">
        Day 01 · the loading masterclass · Inference From Scratch · NumPy only, no libraries harmed
      </div>
    </>
  )
}
