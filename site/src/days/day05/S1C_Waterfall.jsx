import React from 'react'
import { Callout } from '../../components/ui.jsx'

/* Real measured trace — code/06_waterfall_trace.py, engine-side timestamps.
   Four prompts, staggered arrivals, ONE engine process, MAX_BATCH=4. */
const T_END = 2000 // ms axis
const TRACE = [
  {
    id: 'A', prompt: '"Alan Turing theorized that computers would one day become"', max: 8,
    submitted: 1, firstTok: 433, done: 1907,
    toks: [[' the', 433], [' most', 469], [' powerful', 1229], [' machines', 1377], [' on', 1552], [' the', 1725], [' planet', 1871], ['.', 1907]],
  },
  {
    id: 'B', prompt: '"The capital of France is"', max: 6,
    submitted: 103, firstTok: 596, done: 1871,
    toks: [[' the', 596], [' capital', 1229], [' of', 1377], [' the', 1552], [' French', 1725], [' Republic', 1871]],
  },
  {
    id: 'C', prompt: '"Water on Earth boils at"', max: 5,
    submitted: 229, firstTok: 754, done: 1726,
    toks: [[' about', 754], [' 1,', 1229], ['000', 1377], [' degrees', 1552], ['', 1726]],
  },
  {
    id: 'D', prompt: '"The future of artificial intelligence is"', max: 6,
    submitted: 357, firstTok: 965, done: 1871,
    toks: [[' uncertain.', 965], ['\\n\\n"', 1229], ['We', 1377], ["'", 1552], ['re', 1725]],
  },
]
/* every engine tick in the trace: prefill ticks (green) and batched decode ticks (blue).
   EVERY token event lands exactly on one of these — that is the point of the chart. */
const TICKS = [
  { t: 433, kind: 'pf', label: 'prefill A' },
  { t: 469, kind: 'd',  label: '+469' },
  { t: 596, kind: 'pf', label: 'prefill B' },
  { t: 754, kind: 'pf', label: 'prefill C' },
  { t: 965, kind: 'pf', label: 'prefill D' },
  { t: 1229, kind: 'd', label: '+1229' },
  { t: 1377, kind: 'd', label: '+1377' },
  { t: 1552, kind: 'd', label: '+1552' },
  { t: 1725, kind: 'd', label: '+1725' },
  { t: 1871, kind: 'd', label: '+1871' },
  { t: 1907, kind: 'd', label: '+1907' },
]
const AXIS = [0, 500, 1000, 1500, 2000]

function Row({ r }) {
  const pct = (ms) => `${(ms / T_END) * 100}%`
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', alignItems: 'center', margin: '6px 0' }}>
      <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{r.id}</div>
      <div style={{ position: 'relative', height: 44, background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--line)' }}>
        {/* engine tick lines — drawn through EVERY row so alignment is visible */}
        {TICKS.map((tk) => (
          <div key={tk.t} style={{ position: 'absolute', left: pct(tk.t), top: 0, height: '100%', width: 1,
            background: tk.kind === 'pf' ? 'var(--green-line)' : 'var(--accent-line)', opacity: 0.55 }} />
        ))}
        {/* time-in-queue + prefill (TTFT): submit -> first token */}
        <div title={`TTFT ${r.firstTok - r.submitted} ms (queue + prefill)`}
          style={{ position: 'absolute', left: pct(r.submitted), width: pct(r.firstTok - r.submitted), top: 5, height: 13, background: 'var(--amber-soft)', border: '1px solid var(--amber-line)', borderRadius: 4 }} />
        {/* token events — each sits exactly on a tick line */}
        {r.toks.map(([txt, t], i) => (
          <div key={i} title={`+${t} ms  ${JSON.stringify(txt)}`}
            style={{ position: 'absolute', left: pct(t), top: 22, width: 6, height: 16, marginLeft: -3, background: 'var(--accent)', borderRadius: 2 }} />
        ))}
        {/* done marker */}
        <div title={`finished at +${r.done} ms`}
          style={{ position: 'absolute', left: pct(r.done), top: 3, width: 2.5, height: 38, background: 'var(--green)', borderRadius: 2 }} />
        {r.id === 'A' && r.toks.map(([txt, t], i) => (
          <div key={'l' + i} style={{ position: 'absolute', left: pct(t), top: i % 2 ? -16 : -30, transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{txt === '' ? '·' : txt}</div>
        ))}
      </div>
    </div>
  )
}

export default function S1C_Waterfall() {
  return (
    <>
      <h2 id="waterfall">Watch four real prompts — a measured waterfall</h2>
      <p className="sub">
        No simulation: these are <strong>engine-side timestamps</strong> from our actual server
        (<code className="inline">code/06_waterfall_trace.py</code>). Four different prompts arrive
        100 ms apart. Question: <em>does B wait for A to finish?</em>
      </p>

      <div style={{ margin: '58px 0 6px' }}>
        {/* tick labels above the chart (green = prefill tick, blue = batched decode tick) */}
        <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr' }}>
          <div />
          <div style={{ position: 'relative', height: 26 }}>
            {TICKS.filter((tk) => tk.kind === 'pf').map((tk, i) => (
              <div key={tk.t} style={{ position: 'absolute', left: `${(tk.t / T_END) * 100}%`, top: i % 2 ? 13 : 0, transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 9.5, whiteSpace: 'nowrap', color: 'var(--green)' }}>{tk.label}</div>
            ))}
          </div>
        </div>
        {TRACE.map((r) => <Row key={r.id} r={r} />)}
        {/* real time axis */}
        <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr' }}>
          <div />
          <div style={{ position: 'relative', height: 16, borderTop: '1px solid var(--line)', marginTop: 2 }}>
            {AXIS.map((t) => (
              <div key={t} style={{ position: 'absolute', left: `${(t / T_END) * 100}%`, transform: t === 0 ? 'none' : t === T_END ? 'translateX(-100%)' : 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{t === 0 ? '0' : `+${t}`}</div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 22 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: 'var(--amber-soft)', border: '1px solid var(--amber-line)', verticalAlign: '-2px', marginRight: 6 }} />waiting + prefill (TTFT)
          <span style={{ display: 'inline-block', width: 5, height: 12, borderRadius: 2, background: 'var(--accent)', verticalAlign: '-2px', margin: '0 6px 0 14px' }} />one token emitted
          <span style={{ display: 'inline-block', width: 2, height: 12, background: 'var(--green)', verticalAlign: '-2px', margin: '0 6px 0 14px' }} />done
          · faint vertical lines = engine ticks (green prefill, blue decode) · hover a block for its token
        </div>
      </div>

      <h3>Read it vertically — that's the whole secret</h3>
      <p>
        Every blue block sits exactly on a drawn tick line — and from <strong>+1229 ms</strong> on, each
        blue line carries a block on <em>every</em> row. That is one batched decode tick: a single forward
        pass whose GEMMs produced a token for all four requests at once. The green lines are prefill
        ticks: B, C, D each got first tokens the moment their prefill finished, without waiting for A.
      </p>

      <h3>So… does a prompt wait for the previous one?</h3>
      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">B arrived at +103 ms</div>
          <div className="v">A was mid-generation (finished at +1907 ms)</div>
          <div className="s">B's first token at +596 ms — <b>it did NOT wait for A.</b><br />It waited only for a slot + its own prefill (~490 ms TTFT)</div>
        </div>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">D arrived at +357 ms</div>
          <div className="v">3 requests already running</div>
          <div className="s">first token +965 ms. Its TTFT absorbed the<br />prefill backlog — later arrivals queue a little,<br />then everyone advances together</div>
        </div>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">C finished at +1726 ms</div>
          <div className="v">before A (+1907 ms)</div>
          <div className="s">requests finish in length order, not arrival order —<br />short answers leave early and free their slots</div>
        </div>
      </div>

      <h3>Why it's super fast on a GPU (and merely fast on our CPU)</h3>
      <p>
        On this CPU, one batched tick costs ~36 ms alone and ~150 ms at B=4 — FLOPs grow with the
        batch, so everyone slows down together (visible: the shared ticks are ~150–350 ms apart).
        On a GPU the same tick is <strong>bandwidth-bound</strong>: the 498 MB of weights are fetched
        once whether B=1 or B=64, so the tick stays ~flat and 64 requests each get a token every
        ~50 ms. That is the entire trick behind "the model serves hundreds at once":
        <strong> one sweep, many tokens.</strong>
      </p>

      <Callout kind="disc" title="The waterfall in one sentence">
        Requests never wait for each other to finish — they wait for a <em>slot</em>, prefill once,
        and then ride every tick together; finish order is decided by answer length, not arrival
        order. You can verify every pixel above: the script that produced it is in
        <code className="inline"> Day05_Serving_An_Engine/code/06_waterfall_trace.py</code>.
      </Callout>
      <div className="divider" />
    </>
  )
}
