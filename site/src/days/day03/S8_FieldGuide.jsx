import React from 'react'
import { Callout, Diagram } from '../../components/ui.jsx'

const STACK = `<svg width="700" height="285" viewBox="0 0 700 285">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">the stack after Day 3 — the math is no longer a black box</text>
  <rect x="120" y="36" width="460" height="38" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="350" y="60" text-anchor="middle">serving: continuous batching · paged KV · scheduling  (vLLM/SGLang/Dynamo)  ⏭ Day 4+</text>
  <rect x="120" y="82" width="460" height="38" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="350" y="106" text-anchor="middle">kernels: CUDA/Triton · FlashAttention · quantization · TP  (Days 5–6+)  ⏭</text>
  <rect x="120" y="128" width="460" height="38" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11" fill="#065f46" x="350" y="152" text-anchor="middle" font-weight="700">forward: LN · QKV · causal attention · MLP · logits · sampling  ✓ DAY 3</text>
  <rect x="120" y="174" width="460" height="38" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11" fill="#065f46" x="350" y="198" text-anchor="middle" font-weight="700">tokenization: UTF-8 · BPE merges · IDs · chat template  ✓ DAY 2</text>
  <rect x="120" y="220" width="460" height="38" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11" fill="#065f46" x="350" y="244" text-anchor="middle" font-weight="700">loading: formats · mmap · 4-hook protocol · sharding · tying  ✓ DAY 1</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="30" y="244">built →</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="350" y="278" text-anchor="middle">TEXT → IDs → WTE → BLOCKS → LOGITS → SAMPLE → ID → TEXT   (you implemented every green arrow)</text>
</svg>`

const REQUEST_MAP = `<svg width="700" height="300" viewBox="0 0 700 300">
  <defs><marker id="marr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">one real request — the complete Day 1 → Day 3 mental map</text>
  <rect x="20" y="40" width="180" height="55" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="110" y="60" text-anchor="middle" font-weight="700">USER TEXT</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="110" y="77" text-anchor="middle">"Alan Turing theorized…"</text>
  <line x1="200" y1="67" x2="228" y2="67" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <rect x="232" y="40" width="180" height="55" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="322" y="60" text-anchor="middle" font-weight="700">DAY 2: TOKENIZE</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="322" y="77" text-anchor="middle">10 IDs, ending …,1716</text>
  <line x1="412" y1="67" x2="440" y2="67" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <rect x="444" y="40" width="236" height="55" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="562" y="60" text-anchor="middle" font-weight="700">DAY 3: FORWARD</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="562" y="77" text-anchor="middle">loaded W + IDs → logits[9] (50,257)</text>
  <line x1="562" y1="95" x2="562" y2="125" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <rect x="444" y="130" width="236" height="55" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="562" y="150" text-anchor="middle" font-weight="700">POLICY: GREEDY</text>
  <text font-family="monospace" font-size="8.8" fill="#92400e" x="562" y="167" text-anchor="middle">argmax → ID 262 → " the"</text>
  <line x1="444" y1="157" x2="416" y2="157" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <rect x="232" y="130" width="180" height="55" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="322" y="150" text-anchor="middle" font-weight="700">APPEND ID</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="322" y="167" text-anchor="middle">[…, 1716, 262]</text>
  <line x1="232" y1="157" x2="204" y2="157" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <rect x="20" y="130" width="180" height="55" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="110" y="150" text-anchor="middle" font-weight="700">NEXT PREFIX</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="110" y="167" text-anchor="middle">… become the</text>
  <path d="M110,185 C110,250 560,250 560,190" fill="none" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#marr3)"/>
  <text font-family="monospace" font-size="9.5" fill="#4f46e5" x="350" y="240" text-anchor="middle" font-weight="700">repeat: forward → policy → append, producing: the → most → powerful → machines → on → the → planet → .</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="276" text-anchor="middle">Day 1 made W trustworthy · Day 2 made IDs correct · Day 3 made f(IDs,W) and the autoregressive loop visible.</text>
</svg>`

export default function S8_FieldGuide() {
  return (
    <>
      <h2 id="fieldguide">The field guide — debug and optimize any forward pass</h2>
      <p className="sub">Correctness first. A performance result without these invariants is just a faster way to generate garbage.</p>
      <div className="card">
        <ol style={{ marginBottom: 0 }}>
          <li><strong>Freeze the contract:</strong> config (layers, hidden, heads, epsilon, activation, position scheme), tokenizer IDs, dtype, and expected output. Never infer these from memory.</li>
          <li><strong>Assert every boundary shape:</strong> embeddings <code className="inline">(T,H)</code>, QKV <code className="inline">(T,3H)</code>, heads <code className="inline">(n_head,T,H/n_head)</code>, MLP <code className="inline">(T,4H)</code>, logits <code className="inline">(T,V)</code>.</li>
          <li><strong>Lock layout:</strong> is linear weight <code className="inline">(in,out)</code> or <code className="inline">(out,in)</code>? Are QKV separate or fused? Square matrices need golden tests because shapes cannot save you.</li>
          <li><strong>Protect numerics:</strong> config epsilon; divide scores by <code className="inline">√head_dim</code>; causal-mask before softmax; subtract max; use appropriate accumulator precision.</li>
          <li><strong>Preserve graph order:</strong> pre-norm vs post-norm, residual placement, exact GELU/SwiGLU, position IDs, and tying are architecture — not implementation details.</li>
          <li><strong>Test from small to behavioral:</strong> finite values → per-layer oracle compare → top-5 logits → known next ID → multi-token greedy checksum.</li>
          <li><strong>Measure the physical bottleneck:</strong> prefill/decode, T, batch, dtype, weight bytes, KV bytes. Then select fusion, FlashAttention, batching, quantization, or caching for a reason.</li>
          <li><strong>After every optimization:</strong> rerun the same golden test within its promised numerical tolerance. "It is faster" is never enough.</li>
        </ol>
      </div>

      <h3>Exercises — make the model yours</h3>
      <div className="card">
        <ol style={{ marginBottom: 0 }}>
          <li>Print the mean/std of <code className="inline">x</code> before and after each LayerNorm for layer 0. Explain why γ and β mean "normalized" does not imply mean=0/std=1 afterward.</li>
          <li>Change greedy to <code className="inline">top_p=0.9, temperature=0.9</code> and generate five continuations with different seeds. Record tokens/sec — sampling is not free.</li>
          <li>Remove the causal mask and compare an <em>earlier</em> attention row, not just the final row. Explain why corruption reaches the final token only in later layers.</li>
          <li>Profile T=1, T=10, T=100 (if RAM permits). Watch attention's <code className="inline">T²</code> work grow while dense work grows linearly.</li>
          <li>Extend <code className="inline">notes/errors.md</code> with every modification. The resulting gallery is your future engine-debugging playbook.</li>
        </ol>
      </div>
      <h3>One request, fully traced</h3>
      <p className="sub">This is the end-of-day summary pattern: anchor abstract machinery to one verified request, then follow the exact object that crosses each boundary.</p>
      <Diagram svg={REQUEST_MAP} caption="The next page (Day 4) changes only the loop's cost: it retains old K/V instead of recomputing the entire prefix. The text, IDs, logits, and selected next ID remain the same." />
      <Diagram svg={STACK} caption="" />
      <Callout kind="info" title="Up next — Day 4: KV cache, batching, and serving">
        Today every generated token reruns the entire prefix. Day 4 stores the K/V tensors each layer already
        computed, so decode computes only one new row. Then multiple requests enter continuously, the scheduler
        operates on token slots, and the path toward vLLM/SGLang becomes literal rather than metaphorical.
      </Callout>
      <div className="foot">Day 03 · the forward-pass masterclass · raw weights + raw tokenizer + NumPy → verified text</div>
    </>
  )
}
