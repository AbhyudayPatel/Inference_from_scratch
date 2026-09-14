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
      <h3>One request, three timescales — the day's summary map</h3>
      <p className="sub">Every inference engine separates work by <em>how often it happens</em>. Read the Alan Turing request through that lens:</p>
      <div className="lanes">
        <div className="lane boot">
          <h4>BOOT — once per process · Day 1</h4>
          <div className="lbody">
            Parse <code>model.safetensors</code>, filter junk, map names, place<br />
            → <code>W</code> sits in RAM: 148 tensors, 498 MB<br />
            <em>Cost paid once; every request reuses it.</em>
          </div>
        </div>
        <div className="lane req">
          <h4>REQUEST — once per prompt · Day 2</h4>
          <div className="lbody">
            "Alan Turing theorized…" → regex chunks → byte map → BPE merges<br />
            → <code>[36235, 39141, …, 1716]</code> (10 IDs)<br />
            <em>The scheduler, KV cache, and context limit all count these IDs.</em>
          </div>
        </div>
        <div className="lane tok">
          <h4>TOKEN — once per generated token · Day 3</h4>
          <div className="lbody">
            forward(prefix, W) → <code>logits[-1]</code> (50,257 scores)<br />
            → policy picks <code>262 = " the"</code> → append → repeat<br />
            <em>8 loops produced the checksum continuation.</em>
          </div>
        </div>
      </div>
      <p className="sub">Day 4 attacks exactly the third lane's waste: our loop recomputed old K/V for all prefix tokens every step. Cache them once and decode computes one new row.</p>
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
