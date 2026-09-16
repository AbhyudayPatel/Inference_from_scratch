import React from 'react'
import { Callout } from '../../components/ui.jsx'
import SamplingLab from './lab/SamplingLab.jsx'

export default function S4B_SamplingLab() {
  return (
    <>
      <h2 id="lab">Live sampling lab — your sentence, real logits</h2>
      <p className="sub">
        Everything above was theory and frozen terminal output. This lab plugs the actual Day-3 NumPy
        forward pass into this page: type <em>any</em> sentence, and the 50,257-score vector it produces
        is visualized live — temperature, top-k, top-p, repetition penalty, entropy, nucleus size,
        seeded draws and multi-token rollouts. Every slider recomputes every chart from the real logits.
      </p>

      <SamplingLab />

      <h3>Where the numbers come from (and why they’re exact)</h3>
      <Callout kind="disc" title="Accuracy contract">
        The server runs <code className="inline">01_forward.py</code> — the same 12-block NumPy GPT-2 that
        passes the golden checksum — and ships the top-512 raw logits plus three exact full-vocab grids:
        <code className="inline"> logZ(T)</code>, <code className="inline"> entropy H(T)</code> and
        <code className="inline"> nucleus-size(p)</code>. Probabilities shown in the bar chart use
        <code className="inline"> p = e^(z/T) / Z</code> with Z over <em>all 50,257 tokens</em>, not just the
        visible ones — so the bars are the true probabilities, not renormalized approximations.
        Only while the repetition penalty is on does the page renormalize over the shown 512 (it says so,
        and the coverage stat tells you how much mass that represents).
      </Callout>

      <Callout kind="info" title="Every knob = a SamplingParams field">
        <code className="inline">temperature</code> · <code className="inline">top_k</code> · <code className="inline">top_p</code> ·
        <code className="inline"> repetition_penalty</code> · <code className="inline">seed</code> — the sliders above are literally
        vLLM’s <code className="inline">SamplingParams</code> / the OpenAI request body. Order of operations matches the
        engines: penalties → ÷T → top-k mask → softmax renorm → top-p cutoff → seeded draw.
      </Callout>

      <Callout kind="warn" title="Things to try">
        <strong>“The capital of France is”</strong> — a peaked distribution: nucleus @ p=0.9 is a handful of
        tokens; temperature barely matters until T&gt;1. Then <strong>“The meaning of life is”</strong> or
        <strong>“And then,”</strong> — flat: the nucleus explodes to hundreds, top-k=10 destroys most of the mass,
        and entropy climbs toward the uniform ceiling. That asymmetry is why top-p exists.
      </Callout>
      <div className="divider" />
    </>
  )
}
