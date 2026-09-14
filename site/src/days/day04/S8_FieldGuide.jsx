import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S8_FieldGuide() {
  return (
    <>
      <h2 id="fieldguide">The field guide — capacity math & debugging order</h2>

      <h3>Capacity worksheet — worked example on this machine (RTX 3050, 4 GB)</h3>
      <Tbl head={['step', 'arithmetic', 'result']}>
        <R cells={['VRAM available for KV', '4 GB − 0.5 GB weights (GPT-2 FP32) − ~0.5 GB activations/overhead', '≈ 3.0 GB']} />
        <R cells={['KV per token (FP16 store)', '12 layers × 2 × 12 × 64 × 2 B', '36,864 B']} />
        <R cells={['max concurrent tokens', '3.0 × 2³⁰ ÷ 36,864', '<strong>≈ 87,400 tokens</strong>']} monoCols={[1]} />
        <R cells={['→ concurrent 1,024-token requests', '87,400 ÷ 1,024', '<strong>≈ 85 requests</strong>']} monoCols={[1]} />
        <R cells={['same with FP32 KV', 'halve it', '≈ 42 requests']} />
        <R cells={['Qwen3-0.6B instead', '2.2 GB free ÷ 114,688 B', '≈ 20,500 tokens (~20 long requests)']} monoCols={[1]} />
      </Tbl>
      <p className="sub">
        This is the first number a serving engineer computes for a new model/GPU pair. Every vLLM
        flag (<code className="inline">--gpu-memory-utilization</code>,
        <code className="inline">--max-num-seqs</code>, <code className="inline">--max-model-len</code>)
        is a knob on this arithmetic.
      </p>

      <h3>When a serving bug report lands</h3>
      <Tbl head={['symptom', 'first suspect', 'first test']}>
        <R cells={['text degrades after many tokens', 'cache growth/append path', 'golden checksum, 8+ tokens, cached path']} />
        <R cells={['request A mentions request B’s topic', 'cross-request contamination / block aliasing', 'fresh-cache probe + refcount audit']} />
        <R cells={['only middle tokens of long prefills wrong', 'chunked-prefill causal mask', 'per-row logit comparison vs naive']} />
        <R cells={['output fine, latency randomly 10×', 'scheduler thrash / preemption loop', 'count preemptions; assert pool accounting']} />
        <R cells={['OOM at high concurrency', 'capacity arithmetic wrong somewhere', 'the worksheet above, with real dtype bytes']} />
        <R cells={['slightly different tokens after "an optimization"', 'summation-order noise vs real bug', 'drift &lt;1e-3 + same greedy tokens ⇒ noise; else bug']} monoCols={[2]} />
      </Tbl>

      <h3>One request, four timescales — the summary map</h3>
      <div className="lanes four">
        <div className="lane boot">
          <h4>BOOT — once per process · Day 1</h4>
          <div className="lbody">parse → filter → map → place<br />→ <code>W</code> in RAM: 148 tensors, 498 MB<br /><em>every request reuses it</em></div>
        </div>
        <div className="lane req">
          <h4>REQUEST — once per prompt · Day 2</h4>
          <div className="lbody">text → regex → bytes → BPE<br />→ <code>[36235, …, 1716]</code> (10 IDs)<br /><em>admission counts its blocks</em></div>
        </div>
        <div className="lane tok">
          <h4>TOKEN — once per generated token · Day 3+4</h4>
          <div className="lbody">prefill once; then decode(1 token) → append K/V row → logits → policy → ID<br /><em>72 KiB per token, cached forever</em></div>
        </div>
        <div className="lane" style={{ borderColor: 'var(--red-line)' }}>
          <h4 style={{ color: 'var(--red)' }}>ITERATION — the scheduler · Day 4</h4>
          <div className="lbody">admit (blocks free?) → run one step for the batch → free on finish → preempt on overflow<br /><em>capacity is memory, not FLOPs</em></div>
        </div>
      </div>

      <Callout kind="disc" title="Day 4 mastery checklist">
        You can explain why old K/V rows are final · derive KV bytes/token for any config ·
        implement prefill/decode against a cache and prove token identity · draw a block table and
        explain CoW · write the 4-rule scheduler loop · compute max concurrency for a GPU · and you
        have watched five silent cache bugs die against one golden checksum. <strong>Day 5: put it
        on the network</strong> — HTTP APIs, streaming tokens, per-request sampling, load.
      </Callout>
    </>
  )
}
