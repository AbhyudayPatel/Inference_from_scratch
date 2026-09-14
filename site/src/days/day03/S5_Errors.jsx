import React from 'react'
import { Callout, Diagram, Details, Term, Tbl, R } from '../../components/ui.jsx'

const TRIAGE = `<svg width="700" height="180" viewBox="0 0 700 180">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">forward-pass failures: loud is cheap, silent is expensive</text>
  <rect x="30" y="42" width="290" height="100" rx="10" fill="#fef2f2" stroke="#fecaca" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#991b1b" x="175" y="64" text-anchor="middle" font-weight="700">LOUD: shape / NaN / bounds error</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="50" y="86">• c_attn wrong transpose → matmul refuses</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="50" y="104">• unstable softmax → NaN probabilities</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="50" y="122">• pos ≥ 1024 → embedding index error</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="175" y="136" text-anchor="middle">assert shapes / finite values → catch immediately</text>
  <rect x="380" y="42" width="290" height="100" rx="10" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#92400e" x="525" y="64" text-anchor="middle" font-weight="700">SILENT: valid shapes, wrong logits</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="400" y="86">• square c_proj transpose → '.' not ' the'</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="400" y="104">• no causal mask / shifted position IDs</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="400" y="122">• random untied LM head / wrong GELU</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="525" y="136" text-anchor="middle">golden logits / golden tokens → only cure</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="350" y="169" text-anchor="middle">engine engineering is disproportionately about preventing the right-hand column.</text>
</svg>`

const ERROR_OUT = [
  ['p', "prompt: 'Alan Turing theorized that computers would one day become'"],
  "correct next token should be: ' the'",
  ['p', '=== SILENT-BUG GALLERY (same weights, one switch changed) ==='],
  ['ok', "baseline                   -> ' the'       OK"],
  ['bad', "LN epsilon = 1e3           -> ','          WRONG (silent)"],
  ['bad', "NO causal mask             -> ' computers'  WRONG (silent)"],
  ['bad', "square c_proj transposed   -> '.'           WRONG (silent)"],
  ['bad', "position IDs +1            -> ' computer'   WRONG (silent)"],
  ['bad', "untied random lm_head      -> ' bilingual'  WRONG (silent)"],
  ['p', '=== UNSTABLE SOFTMAX ==='],
  'scaled FP32 logits range: [-1365.7, -1028.1]',
  ['bad', 'without subtract(max): has_nan=True  sum=nan'],
  ['ok', 'with    subtract(max): has_nan=False sum=1.000000'],
]

export default function S5_Errors() {
  return (
    <>
      <h2 id="errors">The error gallery — break it before production does</h2>
      <p className="sub">A forward pass that crashes is a gift. The dangerous bugs preserve every shape and return fluent-looking garbage. We injected them one by one against the known checksum prompt.</p>
      <Diagram svg={TRIAGE} caption="" />
      <Tbl head={['deliberate bug', 'observed next token', 'root cause', 'invariant that catches it']}>
        <R cells={['<code class="inline">c_attn.T</code>', 'throws loudly', 'Conv1D is (in,out); (1,768)@(2304,768) is invalid', 'every GEMM: assert inner dimensions']} />
        <R cells={['<code class="inline">c_proj.T</code>', '<code class="inline">.</code> not <code class="inline"> the</code>', '768×768 is square: wrong orientation still multiplies', 'golden token/logit test; layout metadata']} />
        <R cells={['no causal mask', '<code class="inline"> computers</code>', 'earlier positions read future rows; corruption compounds in later layers', 'attention row i has exactly zero probability j&gt;i']} />
        <R cells={['<code class="inline">pos + 1</code>', '<code class="inline"> computer</code>', 'learned positions are addresses; all rows shifted', 'first position must use <code class="inline">wpe[0]</code>; max pos &lt; context']} />
        <R cells={['<code class="inline">eps=1e3</code>', '<code class="inline">,</code>', 'normalization nearly erased; config says 1e-5', 'read epsilon from config; compare LN output stats']} />
        <R cells={['random lm_head', '<code class="inline"> bilingual</code>', 'GPT-2 ties output to wte; a new matrix changes vocabulary meaning', '<code class="inline">lm_head is wte</code> (same storage), not merely same shape']} />
        <R cells={['raw <code class="inline">exp(logits)</code>', '<code class="inline">NaN</code> probs', 'FP32 underflow/overflow before division', '<code class="inline">isfinite</code>, probability sum≈1, subtract max']} />
      </Tbl>
      <Details summary="Actual error-gallery run" open><Term lines={ERROR_OUT} /></Details>
      <Callout kind="info" title="The debugging order that saves days">
        <strong>1.</strong> bytes/shape/dtype → <strong>2.</strong> one tensor spot-check →
        <strong> 3.</strong> one layer output against an oracle → <strong>4.</strong> next-token top-5 →
        <strong> 5.</strong> multi-token greedy checksum → <strong>6.</strong> only then optimize.
        A model that "sounds plausible" proves nothing. Exact tokens and logits are the test harness.
      </Callout>
      <div className="divider" />
    </>
  )
}
