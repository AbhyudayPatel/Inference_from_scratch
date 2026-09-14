import React from 'react'
import { Callout, Code, Term, Tbl, R } from '../../components/ui.jsx'

const SAMPLE_CODE = `def sample_top_p(logits, p, temperature, rng):
    probs = softmax(logits / temperature)          # shape the score distribution
    order = np.argsort(probs)[::-1]                # most probable IDs first
    cutoff = np.searchsorted(np.cumsum(probs[order]), p) + 1
    keep = order[:cutoff]                          # smallest set carrying mass >= p

    masked = np.full_like(logits, -np.inf)
    masked[keep] = logits[keep]                    # rejected IDs now have probability 0
    return rng.choice(len(logits), p=softmax(masked / temperature))`

const SAMPLE_OUT = [
  ['p', "prompt: 'The future of artificial intelligence is'"],
  ['p', 'same forward-pass logits; seed=123'],
  "greedy                    -> ' uncertain.\\n\\n\"We're'",
  "temperature=0.8           -> ' certainly a lot more interesting than anyone'",
  "top-k=40, temperature=0.9 -> ' clear, and the big questions remain'",
  "top-p=0.90, temp=0.9      -> ' currently the most difficult to envision for'",
  ['p', 'temperature changes uncertainty, not knowledge'],
  "T=0.5  entropy=2.51 nats  top token probability=28.6%",
  "T=1.0  entropy=5.23 nats  top token probability= 7.7%",
  "T=1.5  entropy=7.44 nats  top token probability= 2.1%",
]

export default function S4_Sampling() {
  return (
    <>
      <h2 id="sampling">Sampling — zoom into the selector box</h2>
      <p className="sub">
        The loop above had one amber box. This section is <em>only</em> that box: given a completed
        50,257-score vector, how does the request choose one ID?
      </p>

      <div className="flow-v">
        <div className="fnode amber" style={{ minWidth: 280 }}>
          <div className="t">INPUT: score vector (50,257)</div>
          <div className="s">completed output of the forward pass</div>
        </div>
        <div className="farrow down">↓<span className="lbl">first question: does this request want randomness?</span></div>
        <div className="flow" style={{ justifyContent: 'center' }}>
          <div className="fnode green" style={{ minWidth: 240 }}>
            <div className="t">NO → GREEDY</div>
            <div className="v">argmax(scores)</div>
            <div className="s">no softmax needed, no RNG<br />deterministic — use for checksums</div>
          </div>
          <div className="farrow">vs</div>
          <div className="fnode amber" style={{ minWidth: 300 }}>
            <div className="t">YES → RANDOM SAMPLING</div>
            <div className="v">1. logits / temperature<br />2. top-k / top-p filter<br />3. stable softmax → probabilities<br />4. seeded RNG draws one ID</div>
            <div className="s">each step only reshapes or deletes candidates</div>
          </div>
        </div>
        <div className="farrow down">↓</div>
        <div className="fnode" style={{ minWidth: 280 }}>
          <div className="t">OUTPUT: exactly one token ID</div>
          <div className="s">appended to the prefix → the next forward pass begins</div>
        </div>
      </div>

      <h3>Hold the model fixed — change only the policy</h3>
      <Term lines={SAMPLE_OUT} />
      <p>
        Same prompt, same weights, same logits. The continuations differ only because the selector admitted
        different candidates and drew differently. Nothing in the 12 transformer blocks changed.
      </p>

      <h3>Top-p, line by line</h3>
      <Code title="the amber box — nucleus sampling only">{SAMPLE_CODE}</Code>

      <Tbl head={['knob', 'operation on the score vector', 'when to use / what breaks']}>
        <R cells={['greedy', '<code class="inline">argmax(logits)</code>', 'golden tests, deterministic baselines; can loop/repeat']} monoCols={[1]} />
        <R cells={['temperature T', '<code class="inline">logits / T</code> before softmax', 'T&lt;1 sharpens, T&gt;1 flattens; T=0 must route to greedy — never divide by zero']} monoCols={[1]} />
        <R cells={['top-k', 'keep exactly K largest-scoring IDs', 'predictable candidate count; small K kills valid alternatives']} />
        <R cells={['top-p', 'smallest sorted set whose mass ≥ P', 'adapts to confidence; P=1 disables filtering']} />
        <R cells={['penalties', 'lower logits of already-seen IDs', 'operates on ID history, not decoded strings']} />
        <R cells={['seed', 'initial RNG state', 'reproducibility within one engine/kernel path; not across hardware']} />
      </Tbl>

      <Callout kind="info" title="Why engines can batch requests with different sampling settings">
        The expensive part — the forward pass — produces each request’s score vector. The selector is a cheap,
        per-request operation after it. So vLLM/SGLang batch many requests through one model while each keeps its own
        <code className="inline"> temperature / top_p / top_k / seed</code>. In the API, those fields are the amber box —
        they are never part of the model.
      </Callout>
      <div className="divider" />
    </>
  )
}
