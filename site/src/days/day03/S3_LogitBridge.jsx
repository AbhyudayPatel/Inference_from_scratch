import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S3_LogitBridge() {
  return (
    <>
      <h2 id="logits">The generation loop — traced on the real checksum</h2>
      <p className="sub">
        The forward pass does not produce text. It produces <strong>scores</strong> — one per vocabulary ID.
        A separate selector turns scores into one ID. That ID is appended and becomes input to the next forward pass.
        Watch the object that crosses each boundary:
      </p>

      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center' }}>
          <div className="fnode" style={{ minWidth: 210 }}>
            <div className="t">PREFIX (10 IDs)</div>
            <div className="v">[36235, 39141, 18765, 1143, 326,<br />9061, 561, 530, 1110, 1716]</div>
            <div className="s">"Alan Turing theorized that<br />computers would one day become"</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 210 }}>
            <div className="t">FORWARD PASS</div>
            <div className="s">embedding → 12 blocks → ln_f → tied head</div>
            <div className="v">deterministic math on W</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 190 }}>
            <div className="t">LAST LOGIT ROW</div>
            <div className="v">logits[9] — (50,257,)</div>
            <div className="s">one score per candidate next ID<br /><b>the model's job ends here</b></div>
          </div>
        </div>

        <div className="farrow down">↓</div>

        <div className="flow" style={{ justifyContent: 'center' }}>
          <div className="fnode amber" style={{ minWidth: 190 }}>
            <div className="t">SELECTION POLICY</div>
            <div className="s">greedy = argmax<br />sample = softmax + RNG</div>
            <div className="v">temperature / top-k / top-p live here</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode" style={{ minWidth: 170 }}>
            <div className="t">CHOSEN ID</div>
            <div className="v">262 → " the"</div>
            <div className="s">one integer leaves this step</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode blue" style={{ minWidth: 170 }}>
            <div className="t">APPEND → REPEAT</div>
            <div className="v">[…, 1716, 262]</div>
            <div className="s">new prefix feeds the next<br />forward pass</div>
          </div>
        </div>
        <div className="flow-note">
          <strong>green</strong> = model computation · <strong>amber</strong> = request policy · gray/blue = data moving between them.
          Repeating this loop 8× greedy gives the checksum continuation below.
        </div>
      </div>

      <h3>What is actually inside the last-logit row?</h3>
      <p>
        After <em>"…one day become"</em>, the forward pass returns 50,257 scores. Stable softmax (temperature 1)
        turns them into this distribution — measured in our verified run:
      </p>
      <div className="bars">
        <div className="brow"><div className="bname"><b>262 · " the"</b></div><div className="bbar win" style={{ width: '100%' }} /><div className="bpct">19.06%</div></div>
        <div className="brow"><div className="bname">257 · " a"</div><div className="bbar" style={{ width: '37%' }} /><div className="bpct">7.11%</div></div>
        <div className="brow"><div className="bname">366 · ' "'</div><div className="bbar" style={{ width: '27%' }} /><div className="bpct">5.16%</div></div>
        <div className="brow"><div className="bname">517 · " more"</div><div className="bbar" style={{ width: '17%' }} /><div className="bpct">3.18%</div></div>
        <div className="brow"><div className="bname">2208 · " super"</div><div className="bbar" style={{ width: '13%' }} /><div className="bpct">2.46%</div></div>
      </div>
      <p className="sub">
        The other 50,252 IDs share the remaining ~63%. <strong>Greedy ignores the percentages and takes the
        longest bar.</strong> Random sampling rolls a die weighted by bar lengths — after temperature reshapes them.
        Raw logits were ≈ −102.81, −103.79, −104.11, …; negative is normal, only differences matter.
      </p>

      <h3>Four objects that must never blur together</h3>
      <Tbl head={['object', 'in this trace', 'produced by', 'meaning']}>
        <R cells={['hidden state', '<code class="inline">x[-1] : (768,)</code>', 'final LayerNorm of block 12', 'model’s representation of the last prefix position']} monoCols={[1]} />
        <R cells={['logits', '<code class="inline">(50,257,)</code> scores', '<code class="inline">x[-1] @ wte.T</code> (tied head)', 'unnormalized score for every candidate next ID']} monoCols={[1, 2]} />
        <R cells={['probabilities', '<code class="inline">(50,257,)</code>, sum = 1', 'the selector, only if randomness is requested', 'logits after temperature/filter + stable softmax']} monoCols={[1]} />
        <R cells={['chosen token', '<code class="inline">ID 262 = " the"</code>', 'argmax or RNG draw', 'the one integer appended to the next prefix']} monoCols={[1]} />
      </Tbl>

      <Callout kind="info" title="The exact boundary, in one sentence">
        <strong>Forward</strong> maps <code className="inline">(prefix IDs, weights) → score vector</code>;
        <strong> selection</strong> maps <code className="inline">(score vector, request policy, RNG) → one ID</code>;
        the loop <strong>appends that ID</strong> and starts over. Temperature and top-p live in the amber box —
        changing them never touches the model.
      </Callout>
      <div className="divider" />
    </>
  )
}
