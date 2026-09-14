import React from 'react'
import { Callout, Code, Diagram, Term, Tbl, R } from '../../components/ui.jsx'

const POLICY = `<svg width="700" height="195" viewBox="0 0 700 195">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">sampling is a policy layer after the model — never a change to the forward pass</text>
  <rect x="20" y="40" width="155" height="46" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="97" y="59" text-anchor="middle" font-weight="700">logits (50,257)</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="97" y="74" text-anchor="middle">raw unnormalized scores</text>
  <text font-family="monospace" font-size="15" fill="#6e6e73" x="190" y="68">→</text>
  <rect x="215" y="40" width="155" height="46" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="292" y="59" text-anchor="middle" font-weight="700">logit processors</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="292" y="74" text-anchor="middle">temperature / penalties / masks</text>
  <text font-family="monospace" font-size="15" fill="#6e6e73" x="385" y="68">→</text>
  <rect x="410" y="40" width="135" height="46" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="477" y="59" text-anchor="middle" font-weight="700">filter support</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="477" y="74" text-anchor="middle">top-k / top-p / min-p</text>
  <text font-family="monospace" font-size="15" fill="#6e6e73" x="560" y="68">→</text>
  <rect x="585" y="40" width="95" height="46" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="632" y="59" text-anchor="middle" font-weight="700">sample ID</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="632" y="74" text-anchor="middle">or argmax</text>
  <rect x="40" y="118" width="130" height="42" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="105" y="136" text-anchor="middle" font-weight="700">greedy</text><text font-family="monospace" font-size="8.8" fill="#6e6e73" x="105" y="151" text-anchor="middle">argmax, temp=0</text>
  <rect x="195" y="118" width="130" height="42" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="260" y="136" text-anchor="middle" font-weight="700">temperature T</text><text font-family="monospace" font-size="8.8" fill="#6e6e73" x="260" y="151" text-anchor="middle">logits / T</text>
  <rect x="350" y="118" width="130" height="42" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="415" y="136" text-anchor="middle" font-weight="700">top-k</text><text font-family="monospace" font-size="8.8" fill="#6e6e73" x="415" y="151" text-anchor="middle">keep k largest</text>
  <rect x="505" y="118" width="130" height="42" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="570" y="136" text-anchor="middle" font-weight="700">top-p</text><text font-family="monospace" font-size="8.8" fill="#6e6e73" x="570" y="151" text-anchor="middle">smallest mass ≥ p</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="186" text-anchor="middle">same logits in every branch. deterministic only with fixed seed + deterministic kernel path.</text>
</svg>`

const SAMPLE_CODE = `def sample_top_p(logits, p, temperature, rng):
    probs = softmax(logits / temperature)          # stable softmax
    order = np.argsort(probs)[::-1]                # largest probability first
    cutoff = np.searchsorted(np.cumsum(probs[order]), p) + 1
    keep = order[:cutoff]                          # smallest prefix with mass >= p
    masked = np.full_like(logits, -np.inf)
    masked[keep] = logits[keep]                    # every other token gets P=0
    return rng.choice(len(logits), p=softmax(masked / temperature))`

const SAMPLE_OUT = [
  ['p', "prompt: 'The future of artificial intelligence is'"],
  ['p', '=== SAME LOGITS, FOUR POLICIES (seed=123) ==='],
  "greedy (argmax)          -> ' uncertain.\\n\\n\"We're'",
  "temperature=0.8          -> ' certainly a lot more interesting than anyone'",
  "top-k=40, temp=0.9       -> ' clear, and the big questions remain'",
  "top-p=0.90, temp=0.9     -> ' currently the most difficult to envision for'",
  ['p', '=== TEMPERATURE SHAPES THE SAME DISTRIBUTION ==='],
  "T=0.5  entropy=2.51 nats  top: ' uncertain':0.286, ' in':0.235",
  "T=1.0  entropy=5.23 nats  top: ' uncertain':0.077, ' in':0.069",
  "T=1.5  entropy=7.44 nats  top: ' uncertain':0.021, ' in':0.020",
]

export default function S4_Sampling() {
  return (
    <>
      <h2 id="sampling">Sampling — choose from the just-produced logit row</h2>
      <p className="sub">The preceding trace ended at <code className="inline">logits[9]</code>: 50,257 scores for what follows <em>become</em>. This section changes only how we choose one ID from that already-computed vector. It never reruns attention or touches the weights.</p>
      <Callout kind="info" title="Use the concrete boundary">
        In the Alan Turing trace, forward produced the largest score for ID <code className="inline">262</code>
        (<code className="inline">" the"</code>). <strong>Greedy</strong> emits 262. Temperature/top-k/top-p may instead
        sample another permitted ID — but only from that same vector. The chosen ID is appended, and only then does
        the next forward pass begin.
      </Callout>
      <Diagram svg={POLICY} caption="Production sampling normally stays on GPU: copying a 50k-float logit vector to Python/CPU for every generated token is needless latency. Engines fuse filtering, probability work, and random draw where possible." />
      <Code title="code/02_sampling.py — top-p (nucleus) from scratch">{SAMPLE_CODE}</Code>
      <Term lines={SAMPLE_OUT} />
      <Tbl head={['knob', 'math', 'why / failure mode', 'engine API']}>
        <R cells={['greedy', '<code class="inline">argmax(logits)</code>', 'reproducible; can be repetitive; use for golden checks', '<code class="inline">temperature=0</code>']} monoCols={[1,3]} />
        <R cells={['temperature T', '<code class="inline">softmax(logits / T)</code>', 'T&lt;1 sharpens, T&gt;1 flattens; T=0 must special-case to greedy', '<code class="inline">SamplingParams(temperature=T)</code>']} monoCols={[1,3]} />
        <R cells={['top-k', 'keep k largest logits', 'bounded candidate set; k too small kills diversity', '<code class="inline">top_k=K</code>']} monoCols={[1,3]} />
        <R cells={['top-p', 'smallest sorted prefix with Σp≥P', 'adaptive candidate set; P=1 disables it', '<code class="inline">top_p=P</code>']} monoCols={[1,3]} />
        <R cells={['penalties', 'modify logits of seen IDs', 'controls repetition; must operate on IDs, not decoded strings', '<code class="inline">repetition_penalty</code>, <code class="inline">frequency_penalty</code>']} monoCols={[1,3]} />
        <R cells={['seed', 'RNG state', 'same seed is only reproducible on compatible kernels/hardware paths', '<code class="inline">seed=N</code>']} monoCols={[1,3]} />
      </Tbl>
      <Callout kind="warn" title="Sampling correctness traps">
        Apply <strong>temperature before</strong> top-p/top-k probability decisions; preserve a stable softmax;
        decide whether EOS is allowed before sampling; and never assume a seed guarantees bit-identical output across
        GPU architectures or different fused RNG kernels. The server's request schema is mostly a wrapper around
        this policy layer — not around the model.
      </Callout>
      <div className="divider" />
    </>
  )
}
