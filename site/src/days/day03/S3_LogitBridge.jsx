import React from 'react'
import { Callout, Diagram, Math, Tbl, R } from '../../components/ui.jsx'

const REAL_TRACE = `<svg width="700" height="350" viewBox="0 0 700 350">
  <defs><marker id="larr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">one real generation step — exactly where the forward pass ends and sampling begins</text>

  <rect x="20" y="38" width="660" height="44" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="350" y="57" text-anchor="middle" font-weight="700">TEXT: "Alan Turing theorized that computers would one day become"</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="350" y="73" text-anchor="middle">this is what the user sends — the transformer never sees these characters directly</text>
  <line x1="350" y1="82" x2="350" y2="102" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#larr)"/>

  <rect x="20" y="106" width="660" height="44" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="350" y="125" text-anchor="middle" font-weight="700">DAY 2 TOKENIZER → [36235, 39141, 18765, 1143, 326, 9061, 561, 530, 1110, 1716]</text>
  <text font-family="monospace" font-size="8.7" fill="#4f46e5" x="350" y="141" text-anchor="middle">Alan | ĠTuring | theor | ized | Ġthat | Ġcomputers | Ġwould | Ġone | Ġday | Ġbecome</text>
  <line x1="350" y1="150" x2="350" y2="170" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#larr)"/>

  <rect x="20" y="174" width="300" height="92" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="170" y="195" text-anchor="middle" font-weight="700">DAY 3 FORWARD PASS</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="170" y="212" text-anchor="middle">IDs → wte+wpe → 12 blocks → tied head</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="170" y="229" text-anchor="middle">output shape: logits (10, 50,257)</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="170" y="247" text-anchor="middle">take ONLY last row: logits[9]</text>
  <line x1="320" y1="220" x2="345" y2="220" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#larr)"/>

  <rect x="350" y="174" width="330" height="92" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="515" y="195" text-anchor="middle" font-weight="700">THE LAST LOGIT ROW = 50,257 SCORES</text>
  <text font-family="monospace" font-size="8.8" fill="#92400e" x="365" y="214">ID 262  " the"     logit -102.81   p=19.06%</text>
  <text font-family="monospace" font-size="8.8" fill="#92400e" x="365" y="229">ID 257  " a"       logit -103.79   p= 7.11%</text>
  <text font-family="monospace" font-size="8.8" fill="#92400e" x="365" y="244">… 50,255 more candidate IDs, each with a score</text>
  <line x1="515" y1="266" x2="515" y2="286" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#larr)"/>

  <rect x="350" y="290" width="330" height="42" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="515" y="307" text-anchor="middle" font-weight="700">SAMPLING POLICY CHOOSES ONE ID</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="515" y="322" text-anchor="middle">greedy → 262 → decode → " the" → append → next forward pass</text>
</svg>`

const BRANCHES = `<svg width="700" height="245" viewBox="0 0 700 245">
  <defs><marker id="tarr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">the SAME last-logit vector can branch into different choices — the forward pass did not change</text>
  <rect x="255" y="38" width="190" height="44" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="350" y="57" text-anchor="middle" font-weight="700">logits[9] (50,257 scores)</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="350" y="72" text-anchor="middle">the completed forward-pass output</text>
  <line x1="290" y1="82" x2="125" y2="120" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#tarr3)"/>
  <line x1="330" y1="82" x2="285" y2="120" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#tarr3)"/>
  <line x1="370" y1="82" x2="455" y2="120" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#tarr3)"/>
  <line x1="410" y1="82" x2="615" y2="120" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#tarr3)"/>
  <rect x="40" y="124" width="170" height="58" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="125" y="145" text-anchor="middle" font-weight="700">GREEDY</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="125" y="160" text-anchor="middle">argmax: max score</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="125" y="175" text-anchor="middle">always ID 262 → " the"</text>
  <rect x="220" y="124" width="170" height="58" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="305" y="145" text-anchor="middle" font-weight="700">TEMPERATURE</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="305" y="160" text-anchor="middle">divide logits by T</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="305" y="175" text-anchor="middle">then sample a probability</text>
  <rect x="400" y="124" width="170" height="58" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="485" y="145" text-anchor="middle" font-weight="700">TOP-K</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="485" y="160" text-anchor="middle">keep K best IDs only</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="485" y="175" text-anchor="middle">sample among that set</text>
  <rect x="580" y="124" width="100" height="58" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="630" y="145" text-anchor="middle" font-weight="700">TOP-P</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="630" y="160" text-anchor="middle">keep mass P</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="630" y="175" text-anchor="middle">then sample</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="221" text-anchor="middle">sampling is not another transformer layer. It is the server's answer to: “which one of these model scores do I emit?”</text>
</svg>`

const ROW_MATH = `ids = [x₀, x₁, …, x₉]              # this prompt has T=10 IDs
forward(ids) → logits shape <span class="hl">(10, 50,257)</span>

row 0 predicts x₁ from [x₀]                 row 8 predicts x₉ from [x₀…x₈]
row 9 predicts the unknown <span class="res">x₁₀</span> from [x₀…x₉]  ← generation uses this final row

logits are scores, <strong>not probabilities</strong>. Greedy uses argmax directly;
random sampling first uses stable softmax to turn scores into probabilities.`

export default function S3_LogitBridge() {
  return (
    <>
      <h2 id="logits">Logits → one next token, traced</h2>
      <p className="sub">This is the missing bridge: the forward pass does <strong>not</strong> output text. It outputs one score for every possible next token. Sampling is the small decision layer immediately after it.</p>
      <Diagram svg={REAL_TRACE} caption="All values are from the verified GPT-2 checksum run on this machine. Negative logits are normal: only score differences matter; stable softmax shifts them before exponentiating." />
      <Math html={ROW_MATH} />
      <Diagram svg={BRANCHES} caption="For greedy decoding, softmax is unnecessary: argmax(logits) = argmax(softmax(logits)). For random policies, probability mass and an RNG seed matter." />
      <Tbl head={['question', 'concrete answer in this trace']}>
        <R cells={['What did the forward pass consume?', 'The ten IDs for the prompt, plus loaded weights.']} />
        <R cells={['What did it produce?', '<code class="inline">logits[9]</code>: 50,257 candidate scores for token 11.']} monoCols={[1]} />
        <R cells={['What did sampling consume?', 'Only that one last-logit vector — not the weights, attention, or text.']} />
        <R cells={['What did sampling produce?', 'One chosen ID: <code class="inline">262</code>.']} monoCols={[1]} />
        <R cells={['How does text reappear?', 'Day-2 decode maps <code class="inline">262 → " the"</code>; append ID 262, then repeat.']} monoCols={[1]} />
      </Tbl>
      <Callout kind="info" title="The clean boundary to remember">
        <strong>Forward pass:</strong> deterministic mathematical function
        <code className="inline"> (prefix IDs, weights) → next-token score vector</code>.<br />
        <strong>Sampling:</strong> generation policy function
        <code className="inline"> (score vector, request parameters, RNG state) → one ID</code>.<br />
        The sampled ID closes the autoregressive loop by becoming part of the next prefix. This is why an engine can
        expose temperature/top-p per request without reloading or changing the model.
      </Callout>
      <div className="divider" />
    </>
  )
}
