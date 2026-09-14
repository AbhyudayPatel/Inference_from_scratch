import React from 'react'
import { Callout, Timeline } from '../../components/ui.jsx'

export default function S0_Hero() {
  return (
    <>
      <section className="hero">
        <div className="day-chip">Day 03 · forward pass masterclass</div>
        <h1>
          One token through a transformer, <em>by hand.</em>
          <span className="sub">
            The raw weights from Day 1 and IDs from Day 2 finally meet: embedding → 12 transformer blocks →
            50,257 logits → sampling → text. Pure NumPy. Then we explain why every serious engine computes
            the same math with radically different kernels, memory traffic, and scheduling.
          </span>
        </h1>
        <div className="strap">
          <span className="chip">12 layers · 12 heads · head_dim 64</span>
          <span className="chip">124,439,808 params → 2.489 GFLOP @ T=10</span>
          <span className="chip">golden checksum passes ✓</span>
          <span className="chip">same math: HF · vLLM · TRT-LLM · SGLang</span>
        </div>
      </section>

      <h2 id="timeline">The day at a glance</h2>
      <Timeline items={[
        { tag: 'P1', head: 'Wire the architecture from tensor names', body: 'IDs → wte+wpe → 12 blocks → tied logits', state: 'done' },
        { tag: 'P2', head: 'Implement every operation', body: 'LayerNorm · QKV · causal attention · GELU-tanh · residuals', state: 'done' },
        { tag: 'P3', head: 'The golden checksum', body: 'known prompt → known 8-token greedy continuation, exact', state: 'done' },
        { tag: 'P4', head: 'Sampling is policy, not model math', body: 'greedy · temperature · top-k · top-p — same logits, different choice', state: 'done' },
        { tag: 'P5', head: 'Break it deliberately', body: '6 silent bugs + one loud numeric failure; signatures logged', state: 'done' },
        { tag: 'P6', head: 'Where the time and bytes go', body: 'matmul dominance · 2NP rule · prefill vs decode roofline', state: 'done' },
        { tag: 'P7', head: 'How engines differ', body: 'HF · vLLM · TRT-LLM · SGLang · llama.cpp: same math, different plumbing', state: 'done' },
        { tag: 'P8', head: 'Forward-pass field guide', body: 'debug any engine’s logits before optimizing it', state: 'done' },
      ]} />

      <Callout kind="info" title="The one principle for the entire page">
        <strong>The model math is invariant.</strong> Every engine must compute the same function
        <code className="inline"> f(ids, weights) → logits</code>. Performance comes from changing neither the
        function nor the answer, but from changing <strong>kernel boundaries</strong>, <strong>where intermediates
        live</strong>, and <strong>how many requests share a GPU launch</strong>. If an optimization changes the
        golden token, it is a bug — not an optimization.
      </Callout>
      <div className="divider" />
    </>
  )
}
