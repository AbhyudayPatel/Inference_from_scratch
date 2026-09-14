import React from 'react'
import { Callout, Code, Details, Term } from '../../components/ui.jsx'

const CORE = `def forward(ids):
    pos = np.arange(len(ids))
    x = W["wte.weight"][ids] + W["wpe.weight"][pos]  # (T,768)
    for i in range(12):
        a = layer_norm(x, W[f"h.{i}.ln_1.weight"], W[f"h.{i}.ln_1.bias"])
        x = x + attention(a, i)                       # QKV + causal softmax + projection
        m = layer_norm(x, W[f"h.{i}.ln_2.weight"], W[f"h.{i}.ln_2.bias"])
        f = linear(m, W[f"h.{i}.mlp.c_fc.weight"], W[f"h.{i}.mlp.c_fc.bias"])
        x = x + linear(gelu_new(f), W[f"h.{i}.mlp.c_proj.weight"], W[f"h.{i}.mlp.c_proj.bias"])
    x = layer_norm(x, W["ln_f.weight"], W["ln_f.bias"])
    return x @ W["wte.weight"].T                     # tied output projection

# generation: naïve on purpose — re-runs the full prefix every step
for step in range(8):
    logits = forward(ids)[-1]
    ids.append(int(np.argmax(logits)))                # greedy = argmax`

const TRACE = [
  ['p', "prompt: 'Alan Turing theorized that computers would one day become'"],
  'ids (10): [36235, 39141, 18765, 1143, 326, 9061, 561, 530, 1110, 1716]',
  ['p', "step 0: -> ' the'       top-5: ' the', ' a', '<quote>', ' more', ' super'"],
  ['p', "step 1: -> ' most'      top-5: ' most', ' ultimate', ' world', '<quote>', ' next'"],
  ['p', "step 2: -> ' powerful'  top-5: ' powerful', ' advanced', ' efficient', ' intelligent'"],
  ['p', "step 3: -> ' machines'  top-5: ' machines', ' machine', ' computers', ' computer'"],
  ['p', "step 4: -> ' on'        top-5: ' on', ' ever', ' in', ' that', '.'"],
  ['p', "step 5: -> ' the'       top-5: ' the', ' earth', ' Earth', ' planet'"],
  ['p', "step 6: -> ' planet'    top-5: ' planet', ' face', ' earth', ' Earth'"],
  ['p', "step 7: -> '.'          top-5: '.', ',', ' and', ' by', ' because'"],
  ['ok', "continuation: ' the most powerful machines on the planet.'"],
  ['ok', 'CHECKSUM: PASS - token-for-token match'],
]

export default function S3_Checksum() {
  return (
    <>
      <h2 id="checksum">The full implementation — and the checksum</h2>
      <p className="sub">~100 lines for the complete model (including the hand loader). The rest of every inference engine is making these same lines faster, smaller, and safer.</p>
      <Code title="code/01_forward.py — the whole model, condensed">{CORE}</Code>
      <Details summary="Verified greedy trace — raw weights + raw tokenizer, no model library" open>
        <Term lines={TRACE} />
      </Details>
      <Callout kind="disc" title="Why this one continuation is a serious correctness test">
        It chains eight decisions. A wrong first token changes every future input; an error in any layer, position,
        scale, layout, residual, GELU variant, tie, or tokenizer almost certainly diverges. Matching all eight tokens
        means Day 1's bytes, Day 2's IDs, and every Day 3 operation agree with the trained GPT-2 checkpoint.
        This is stronger than checking a tensor shape; it is an <strong>end-to-end behavioral checksum</strong>.
      </Callout>
      <Callout kind="warn" title="Intentionally naïve: this recomputes the entire prefix">
        At step 7, <code className="inline">forward(ids)</code> recalculates Q/K/V for the original 10 prompt tokens
        plus 7 generated tokens — even though only one new token arrived. The math is correct but wasteful.
        <strong> Day 4's KV cache changes this one fact</strong>: retain old K/V, calculate only new Q/K/V, attend
        against cached K/V. Do not optimize before you own this baseline.
      </Callout>
      <div className="divider" />
    </>
  )
}
