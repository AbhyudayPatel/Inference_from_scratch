import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S8_FieldGuide() {
  return (
    <>
      <h2 id="fieldguide">The field guide — one request across five days</h2>

      <h3>The complete map: five timescales, one request</h3>
      <div className="lanes" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="lane boot">
          <h4>BOOT · Day 1</h4>
          <div className="lbody">once per process<br />disk → <code>W</code> in RAM<br />148 tensors, 498 MB</div>
        </div>
        <div className="lane" style={{ borderColor: 'var(--accent-line)' }}>
          <h4 style={{ color: 'var(--accent)' }}>CONNECTION · Day 5</h4>
          <div className="lbody">once per HTTP call<br />validate → tokenize → queue<br />ends early on 400/disconnect</div>
        </div>
        <div className="lane req">
          <h4>REQUEST · Day 2</h4>
          <div className="lbody">once per prompt<br />text → 10 IDs<br />admission counts its blocks</div>
        </div>
        <div className="lane tok">
          <h4>TOKEN · Days 3–4</h4>
          <div className="lbody">once per generated token<br />decode → append K/V → logits → policy → stream frame</div>
        </div>
        <div className="lane" style={{ borderColor: 'var(--red-line)' }}>
          <h4 style={{ color: 'var(--red)' }}>ITERATION · Day 4</h4>
          <div className="lbody">once per engine step<br />admit / batch / free / preempt<br />capacity = memory</div>
        </div>
      </div>
      <p className="sub">
        The Alan Turing request, seen from every layer at once: the process booted once (Day 1);
        its HTTP connection was validated and queued (Day 5); its prompt became 10 IDs (Day 2);
        it generated 8 tokens through cached decode steps (Days 3–4); and the scheduler ran it
        alongside strangers every iteration (Day 4). Five days, one request, no magic left.
      </p>

      <h3>When a production bug report lands</h3>
      <Tbl head={['symptom', 'first suspect', 'first test']}>
        <R cells={['\ufffd chars in stream', 'per-token detokenization', 'buffer bytes; replay the [127, 102] probe']} />
        <R cells={['same seed, different text', 'shared RNG or batching-order dependence', 'two identical calls, back to back']} />
        <R cells={['latency cliff at fixed concurrency', 'queue at MAX_BATCH / pool cap', 'TTFT histogram vs C; check preemptions']} />
        <R cells={['memory shrinks over hours', 'leaked slots on disconnect', 'abort path test: hang up, assert running==0']} />
        <R cells={['throughput fine, one request stuck', 'stop-string never matched / EOS unseen', 'finish_reason distribution; max_tokens floor']} />
        <R cells={['500s under load only', 'race in scheduler state', 'serialize with lock; log state transitions']} />
      </Tbl>

      <h3>Deploy this journal</h3>
      <p className="sub">
        The site is fully static: <code className="inline">cd site && npm run build</code> produces a
        <code className="inline">dist/</code> folder that any static host (GitHub Pages, Netlify, S3,
        nginx) can serve — the router is hash-based, so no server config is needed. Every number on
        every page came from a script you can rerun from the matching <code className="inline">DayNN/code/</code>
        folder.
      </p>

      <Callout kind="disc" title="Day 5 mastery checklist">
        You can draw the 8-stage request lifecycle and name each stage's failure mode · run a
        request as a state machine with clean teardown · implement batched decode with padded-KV
        masks · explain SSE frames and TTFT/TPOT · buffer UTF-8 across token boundaries · read a
        load table and point at where the queue forms · and you watched a float64 pad silently cost
        25× while passing every correctness test. <strong>Day 6: shrink the bytes</strong> — FP16/BF16/INT8/INT4,
        GGUF, ONNX: same checksum, quarter the memory.
      </Callout>
    </>
  )
}
