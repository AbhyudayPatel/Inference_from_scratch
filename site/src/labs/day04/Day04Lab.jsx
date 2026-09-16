import React, { useEffect, useState } from 'react'
import {
  pct, fixed, tokL, post, useHealth, StatusBadge, OfflineNote,
  LabNav, Sec, Stat, Spin, Collapse, Story, Takeaway,
} from '../common.jsx'
import { StepBars, FlopLines, DiffDots, PoolGrid, Gantt, ReqLanes, BugGrid } from './widgets.jsx'

const API = 'http://127.0.0.1:8601'
const NAV = [
  ['ch1', 'ch 1 · the growing bill'], ['ch2', 'ch 2 · where KV lives'],
  ['ch3', 'ch 3 · the scheduler'], ['ch4', 'ch 4 · when it lies'],
]
const GOLDEN = 'Alan Turing theorized that computers would one day become'

export default function Day04Lab() {
  const status = useHealth(API)
  const live = status === 'live'
  return (
    <div className="lab-hero">
      <h1>KV Cache &amp; Batching, told <em>as a story</em></h1>
      <p className="sub">
        Four chapters, one per Day-4 code file. Every number is produced live by the real code on this
        machine — the NumPy GPT-2, the instrumented block pool, and the actual scheduler simulation.
        Read top to bottom; the knobs are tucked into “experiment yourself” drawers if you want to poke.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' }}>
        <StatusBadge status={status} label="NumPy GPT-2 124M · port 8601" />
        <a className="chip" href="#/day-04" style={{ textDecoration: 'none' }}>← back to the Day-4 journal</a>
      </div>
      {status === 'offline' && <OfflineNote server="python Day04_KV_Cache_And_Batching/code/day4_server.py" />}
      <LabNav items={NAV} />
      <Chapter1 live={live} />
      <Chapter2 live={live} />
      <Chapter3 live={live} />
      <Chapter4 live={live} />
    </div>
  )
}

/* ═════════════════ CHAPTER 1 — 01_naive_vs_cached.py ═════════════════ */
function Chapter1({ live }) {
  const [r, setR] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [prompt, setPrompt] = useState(GOLDEN)
  const [n, setN] = useState(8)
  const [race, setRace] = useState(null)          // null = all bars, else reveal steps ≤ race

  const replay = () => {
    setRace(0)
    const iv = setInterval(() => {
      setRace((s) => {
        if (s == null || !r) { clearInterval(iv); return s }
        if (s >= r.n_tokens - 1) { clearInterval(iv); setTimeout(() => setRace(null), 1600); return s }
        return s + 1
      })
    }, 950)
  }

  const run = async (p = prompt, nt = n) => {
    setBusy(true); setErr(null)
    try { setR(await post(`${API}/api/lab1`, { prompt: p, n_tokens: nt })) }
    catch (e) { setErr(String(e.message || e)) }
    finally { setBusy(false) }
  }
  useEffect(() => { if (live && !r) run(GOLDEN, 8) }, [live])   // auto-tell the story on load

  const last = r ? r.n_tokens - 1 : 0
  return (
    <Sec id="ch1" num="chapter 1" title="The bill that grows every step"
      sub="code/01_naive_vs_cached.py — why the KV cache exists at all">
      <Story>
        Day 3 ended with a working loop — and a secret. To produce token&nbsp;#8, it recomputed the
        attention of <em>every earlier token, again</em>. To produce token&nbsp;#9, it did it all once more.
        Nothing is wrong with the answers; the work itself is the bug. So let's watch the same sentence get
        generated twice — once the naive way, once with a cache that remembers each token's K/V rows —
        on the real weights, right now{busy ? ' — generating…' : ''}.
      </Story>
      {busy && !r && (
        <div className="panel"><Spin />both loops are generating the golden prompt on the CPU (the naive probes make this ~10 s)…</div>
      )}
      {err && <div className="callout trap"><div className="co-title">error</div>{err}</div>}

      {r && (
        <>
          <h3>Scene 1 — the verdict: nobody can tell the difference</h3>
          <div className="panel">
            <div className="tok-strip">
              {r.pieces.map((t, i) => <span key={i} className="tok-chip">{tokL(t, 12)}<em>{r.ids[i]}</em></span>)}
              {r.gen_pieces.map((t, i) => <span key={`g${i}`} className="tok-chip gen">{tokL(t, 12)}<em>{r.gen_ids[i]}</em></span>)}
            </div>
            <div className="cap">
              green = generated. The cached loop produced <code className="inline">{r.continuation}</code> —{' '}
              {r.match
                ? <strong style={{ color: 'var(--green)' }}>identical to the naive loop, token for token.</strong>
                : <strong style={{ color: 'var(--red)' }}>MISMATCH — that would be a cache bug.</strong>}
              {' '}A cache must be behaviorally <em>invisible</em>; it only deletes work.
            </div>
          </div>

          <h3>Scene 2 — but look at the clock</h3>
          <div className="panel">
            <div className="legend">
              <span><i className="sw" style={{ background: '#dc2626' }} />naive (recomputes the whole prefix)</span>
              <span><i className="sw" style={{ background: '#4f46e5' }} />cached (processes 1 token)</span>
            </div>
            <StepBars naive={r.naive.steps_ms} cached={r.cached.steps_ms} prefixLens={r.prefix_lens} upto={race} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <button className="lab-btn ghost sm" onClick={replay} disabled={race != null}>▶ replay the race, step by step</button>
              {race != null && <span className="chip">generating token {race + 1} of {r.n_tokens}…</span>}
            </div>
            <div className="race-line">
              {race == null
                ? <>full picture: every step, both engines, side by side.</>
                : <>step {race + 1} — naive re-read <b>{r.prefix_lens[race]} tokens</b> to write one
                  (<b style={{ color: '#dc2626' }}>{r.naive.steps_ms[race].toFixed(0)} ms</b>) · cached read{' '}<b>1 token</b>{' '}
                  (<b>{r.cached.steps_ms[race].toFixed(0)} ms</b>) — the cache already knew the other {r.prefix_lens[race] - 1}.</>}
            </div>
            <Takeaway>
              Step {r.n_tokens}: the naive loop re-read <strong>{r.prefix_lens[last]} tokens</strong> to write one
              ({r.naive.steps_ms[last].toFixed(0)} ms). The cached loop read <strong>1</strong> ({r.cached.steps_ms[last].toFixed(0)} ms).
              Total decode: {r.naive.total_ms.toLocaleString()} ms → {r.cached.decode_total_ms.toLocaleString()} ms,{' '}
              <strong>{fixed(r.naive.total_ms / r.cached.decode_total_ms, 1)}× less work</strong> — and this prompt is tiny.
            </Takeaway>
          </div>

          <h3>Scene 3 — why the gap widens: the 2·N·T rule</h3>
          <div className="panel">
            <div className="legend">
              <span><i className="sw" style={{ background: '#dc2626' }} />naive: 2·N·(P+s) per step</span>
              <span><i className="sw" style={{ background: '#4f46e5' }} />cached: 2·N·1 per step</span>
            </div>
            <FlopLines P={r.ids.length} n={r.n_tokens} />
            <Takeaway>
              Every weight matmul costs 2·N·T FLOPs (N = 124.4 M params, T = tokens fed in). Naive pays T = a
              growing prefix; cached always pays T = 1. Here: {fixed(r.flops.naive / 1e9, 2)} GFLOP →{' '}
              {fixed(r.flops.cached / 1e9, 2)} GFLOP (<strong>{fixed(r.flops.naive / r.flops.cached, 2)}×</strong>).
              Generate 100 tokens instead of {r.n_tokens} and the naive line keeps climbing — the cached one stays flat.
            </Takeaway>
          </div>

          <h3>Scene 4 — the paranoid check</h3>
          <div className="panel">
            <h4>max |logits_cached − logits_naive| per step (log scale)</h4>
            <DiffDots diffs={r.diffs} />
            <Takeaway>
              Not bitwise-zero — around 1e-4 on |logits|≈130 — because a (1,768) GEMM sums in a different order than a
              (T,768) one. That is <strong>float reorder noise, relative ≈1e-6</strong>, three orders of magnitude under
              the 1e-3 tripwire. The contract is token identity, and Scene 1 showed it holds.
            </Takeaway>
          </div>

          <h3>Scene 5 — the bill for the cache itself</h3>
          <div className="panel">
            <table className="data"><tbody>
              <tr><td>rows cached</td><td className="mono">{r.cache_rows} (prompt {r.ids.length} + {r.n_tokens} generated)</td></tr>
              <tr><td>bytes stored</td><td className="mono">{r.cache_bytes.toLocaleString()} B = {(r.cache_bytes / 1024).toFixed(1)} KiB</td></tr>
              <tr><td>arithmetic check</td><td className="mono">{r.cache_rows} tokens × 73,728 B = {(r.cache_rows * r.kv_fp32).toLocaleString()} B ✓</td></tr>
              <tr><td>as FP16 (what engines store)</td><td className="mono">{(r.cache_rows * r.kv_fp16 / 1024).toFixed(1)} KiB</td></tr>
            </tbody></table>
            <Takeaway>
              KV costs <strong>73,728 bytes per token</strong> (12 layers × 2 × 12 heads × 64 dims × 4 B). Trivial here;
              at 128k-token contexts it is gigabytes <em>per request</em>. That number is the villain of chapter 2 and 3.
            </Takeaway>
          </div>

          <Collapse title="experiment yourself — different prompt, different length">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="ctl-name" style={{ marginBottom: 4 }}>prompt</div>
                <input className="lab-input" value={prompt} spellCheck={false} onChange={(e) => setPrompt(e.target.value)} />
              </div>
              <div>
                <div className="ctl-name" style={{ marginBottom: 4 }}>tokens: <span className="ctl-val">{n}</span></div>
                <input type="range" min="2" max="10" step="1" value={n} onChange={(e) => setN(+e.target.value)} style={{ width: 130, accentColor: 'var(--accent)' }} />
              </div>
              <button className="lab-btn" onClick={() => run()} disabled={busy || !live}>
                {busy ? <><Spin />running…</> : 'run both engines'}
              </button>
              <span className="chip">~5–15 s (naive probes included)</span>
            </div>
          </Collapse>
        </>
      )}
    </Sec>
  )
}

/* ═════════════════ CHAPTER 2 — 02_paged_kv.py ═════════════════ */
const BEAT_COPY = {
  empty: (s) => <>This is the whole machine: <strong>{s.n_blocks} physical blocks × {s.block} slots =
    {' '}{s.n_blocks * s.block} token slots</strong> of KV memory. Every request's K/V must live here. Watch what
    happens as requests arrive — press <em>next</em>.</>,
  a: (s) => <>Request A prefills 10 tokens. The pool hands over <strong>one block</strong> — 6 slots stay empty.
    That is the only waste paging ever allows: a fraction of the <em>last</em> block per sequence, never more.</>,
  b: (s) => {
    const b = s.seqs.find((q) => q.name === 'B')
    return <>Request B prefills 40 tokens → ⌈40/16⌉ = <strong>3 blocks</strong>, physical ids{' '}
      <strong>{b ? b.blocks.join(', ') : '…'}</strong> — <em>not contiguous</em>. The block table hides that,
      exactly like OS page tables hide physical RAM.</>
  },
  share: (s) => <>Now two requests arrive with the <em>same</em> 24-token system prompt. S prefills it
    <strong> once</strong>; R1 and R2 <strong>fork</strong> — their block tables point at the same physical blocks.
    Refcount ×3, zero bytes copied. (This is vLLM prefix caching / SGLang RadixAttention in miniature.)</>,
  cow: (s) => <>Both forks generate one more token. The last prefix block is half-full <em>and shared</em> — writing
    there would corrupt S and the sibling. So each writer <strong>copies that block first</strong> (copy-on-write),
    then appends privately. The <em>full</em> first block stays shared ×3 forever.</>,
  free: (s) => <>A finishes. Its block's refcount hits zero and it <strong>returns to the free list</strong> —
    instantly reusable by the next arrival. No compaction, no garbage collection, just a list.</>,
  oom: (s) => <>Shrink the machine to 2 blocks = 32 slots. Token 33 has <strong>nowhere to go</strong>.
    Allocation failure is a <em>scheduling event</em> — the engine queues, preempts, or swaps — never a crash.</>,
}
const BEAT_ORDER = ['empty', 'a', 'b', 'share', 'cow', 'free', 'oom']

function Chapter2({ live }) {
  const [story, setStory] = useState(null)
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || !story) return
    const iv = setInterval(() => {
      setBeat((b) => {
        if (b >= story.steps.length - 1) { setPlaying(false); return b }
        return b + 1
      })
    }, 3400)
    return () => clearInterval(iv)
  }, [playing, story])
  const [exp, setExp] = useState(null)
  const [cfg, setCfg] = useState({ block: 16, n_blocks: 24, a: 10, b: 40, share: true, prefix: 24, appends: 1, free_a: false, max_len: 256 })

  useEffect(() => {
    if (live && !story) post(`${API}/api/lab2_story`, {}).then(setStory).catch(() => {})
  }, [live])

  const runExperiment = async () => {
    try {
      setExp(await post(`${API}/api/lab2`, {
        block: cfg.block, n_blocks: cfg.n_blocks,
        seqs: [{ name: 'A', len: cfg.a }, { name: 'B', len: cfg.b }],
        share: cfg.share, prefix_len: cfg.prefix, appends: cfg.appends,
        free_a: cfg.free_a, max_len: cfg.max_len,
      }))
    } catch (e) { /* shown via story absence */ }
  }
  const set = (key) => (e) => setCfg({ ...cfg, [key]: e.target.type === 'checkbox' ? e.target.checked : +e.target.value })

  const step = story ? story.steps[beat] : null
  const snap = step ? step.snap : null
  const res = story ? story.reservation : null

  return (
    <Sec id="ch2" num="chapter 2" title="Where does all that KV live?"
      sub="code/02_paged_kv.py — the memory manager that made vLLM famous">
      <Story>
        Chapter 1 ended with a bill: 73,728 bytes per token. Cute for 18 tokens — but real contexts run to
        128k tokens and real servers juggle hundreds of requests. Before paging, engines did the simple thing:
        <strong> reserve max_len slots per request, up front</strong>. Take the 8 requests from the code file:
      </Story>
      {res && (
        <div className="panel">
          <div className="mono" style={{ fontSize: 12, marginBottom: 10 }}>
            actual lengths: [{res.lengths.join(', ')}] → each reserved {res.max_len.toLocaleString()} slots
          </div>
          <div className="wrow"><span>reserved</span>
            <div className="wastebar" style={{ width: '100%', background: '#dc2626' }}>
              {res.reserved.toLocaleString()} slots = {res.reserved_mb_fp16.toFixed(1)} MB FP16</div></div>
          <div className="wrow"><span>actually used</span>
            <div className="wastebar" style={{ width: `${Math.max(6, (res.used / res.reserved) * 100)}%`, background: '#059669' }}>
              {res.used.toLocaleString()} slots = {res.used_mb_fp16.toFixed(1)} MB</div></div>
          <Takeaway>
            <strong>{pct(res.waste_pct, 0)} of the reservation was never used.</strong> The vLLM paper measured 60–80%
            waste from exactly this. The fix is the OS trick: stop reserving contiguous space — hand out small
            fixed-size blocks on demand, and map them through a per-request <em>block table</em>.
          </Takeaway>
        </div>
      )}

      <h3>The pool, one beat at a time</h3>
      {!story && live && <div className="panel"><Spin />loading the pool story…</div>}
      {story && snap && (
        <div className="panel">
          <div className="beat-nav">
            <button className="beat-btn" disabled={beat === 0} onClick={() => { setPlaying(false); setBeat(beat - 1) }}>← prev</button>
            <button className="beat-btn" onClick={() => {
              if (playing) setPlaying(false)
              else { if (beat >= story.steps.length - 1) setBeat(0); setPlaying(true) }
            }}>{playing ? '⏸ pause' : '▶ play'}</button>
            <button className="beat-btn" disabled={beat === story.steps.length - 1} onClick={() => { setPlaying(false); setBeat(beat + 1) }}>next →</button>
            <span className="beat-title">{beat + 1} / {story.steps.length} — {step.key === 'empty' ? 'an empty machine' :
              step.key === 'a' ? 'A arrives' : step.key === 'b' ? 'B arrives' : step.key === 'share' ? 'the shared prefix' :
              step.key === 'cow' ? 'copy-on-write' : step.key === 'free' ? 'A leaves' : 'out of memory'}</span>
            <div className="beat-dots">
              {story.steps.map((_, i) => <button key={i} className={`beat-dot ${i === beat ? 'on' : ''}`} onClick={() => setBeat(i)} />)}
            </div>
          </div>
          <Story>{BEAT_COPY[step.key](snap)}</Story>
          <div className="legend">
            {snap.seqs.map((s) => <span key={s.name}><i className="sw" style={{ background: s.color }} />{s.name} ({s.n_tokens} tok)</span>)}
            <span><i className="sw" style={{ background: 'var(--bg-soft)', border: '1px solid #ececf0' }} />free / empty slot</span>
          </div>
          <PoolGrid key={beat} blocks={snap.blocks} blockSize={snap.block} />
          <div className="cap">
            one cell = one token slot · <strong>×N = refcount</strong> (shared) · faded = free block.
            {' '}Pool: <strong>{snap.stats.used_blocks}/{snap.n_blocks} blocks</strong> used · internal fragmentation{' '}
            <strong>{snap.stats.frag_slots} slots ({pct(snap.stats.paged_waste_pct, 0)})</strong>
            {snap.oom && <> · <strong style={{ color: 'var(--red)' }}>OOM — allocation refused</strong></>}
          </div>
          {snap.seqs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {snap.seqs.map((s) => (
                <div key={s.name} className="bt-map">
                  <b style={{ color: s.color }}>{s.name}</b> ({s.n_tokens} tok) →{' '}
                  {s.blocks.length
                    ? s.blocks.map((p, i) => <span key={i} className="bt-chip">logical {i} → <b>physical {p}</b></span>)
                    : <span className="bt-chip">freed</span>}
                </div>
              ))}
            </div>
          )}
          {snap.events.length > 0 && (
            <div className="evlog" style={{ marginTop: 12 }}>
              {snap.events.map((e, i) => <div key={i} className={`ev k-${e.kind}`}><span className="dot" />{e.msg}</div>)}
            </div>
          )}
        </div>
      )}
      {snap && beat === BEAT_ORDER.indexOf('cow') && (
        <Takeaway>
          read the grid: block with <strong>×3</strong> is the full, forever-shared prefix block; the two fresh
          single-owner blocks are the copies R1 and R2 made before writing. Sharing is free; <em>writing</em> shared
          memory costs exactly one copy.
        </Takeaway>
      )}
      {snap && beat === BEAT_ORDER.indexOf('oom') && (
        <Takeaway>
          chapter 3's scheduler uses exactly this signal: <code className="inline">blocks_needed ≤ free blocks</code>{' '}
          decides admission. Memory, not FLOPs, is the bouncer.
        </Takeaway>
      )}

      <Collapse title="experiment yourself — reshape the pool">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><div className="ctl-name">block size: <span className="ctl-val">{cfg.block}</span></div>
            <input type="range" min="4" max="32" step="4" value={cfg.block} onChange={set('block')} style={{ width: 100, accentColor: 'var(--accent)' }} /></div>
          <div><div className="ctl-name">pool blocks: <span className="ctl-val">{cfg.n_blocks}</span></div>
            <input type="range" min="8" max="48" step="4" value={cfg.n_blocks} onChange={set('n_blocks')} style={{ width: 100, accentColor: 'var(--accent)' }} /></div>
          <div><div className="ctl-name">A tokens</div><input className="num-in" type="number" value={cfg.a} min="1" max="400" onChange={set('a')} /></div>
          <div><div className="ctl-name">B tokens</div><input className="num-in" type="number" value={cfg.b} min="1" max="400" onChange={set('b')} /></div>
          <label className="greedy-chk"><input type="checkbox" checked={cfg.share} onChange={set('share')} /> shared prefix</label>
          <div><div className="ctl-name">prefix tokens</div><input className="num-in" type="number" value={cfg.prefix} min="4" max="120" onChange={set('prefix')} /></div>
          <div><div className="ctl-name">append rounds</div><input className="num-in" type="number" value={cfg.appends} min="0" max="8" onChange={set('appends')} /></div>
          <label className="greedy-chk"><input type="checkbox" checked={cfg.free_a} onChange={set('free_a')} /> free A at end</label>
          <div><div className="ctl-name">reservation max_len</div><input className="num-in" type="number" value={cfg.max_len} min="16" max="4096" onChange={set('max_len')} /></div>
          <button className="lab-btn" onClick={runExperiment} disabled={!live}>run pool</button>
        </div>
        {exp && (
          <div style={{ marginTop: 14 }}>
            <div className="stat-grid">
              <Stat k="pool" v={`${exp.stats.used_blocks}/${exp.n_blocks}`} u={`${exp.stats.free_blocks} blocks free`} />
              <Stat k="paged waste" v={pct(exp.stats.paged_waste_pct, 1)} u={`${exp.stats.frag_slots} idle slots`} />
              <Stat k="reservation waste" v={pct(exp.stats.reservation.waste_pct, 1)} u={`max_len=${exp.stats.reservation.max_len}`} />
              <Stat k="OOM" v={exp.oom ? 'yes' : 'no'} u={exp.oom ? 'queue / preempt / swap' : 'pool held'} />
            </div>
            <PoolGrid blocks={exp.blocks} blockSize={exp.block} />
            <div className="evlog" style={{ marginTop: 10 }}>
              {exp.events.map((e, i) => <div key={i} className={`ev k-${e.kind}`}><span className="dot" />{e.msg}</div>)}
            </div>
          </div>
        )}
      </Collapse>
    </Sec>
  )
}

/* ═════════════════ CHAPTER 3 — 03_continuous_batching.py ═════════════ */
const CAST = [
  { n: 'A', d: 'the chatterbox — 60-token prompt, wants 10 tokens back', c: '#4f46e5' },
  { n: 'B', d: 'the quick one — arrives at 50 ms, 20-token prompt, 14 tokens back', c: '#059669' },
  { n: 'C', d: 'the reader — 100-token prompt, only needs 6 tokens', c: '#d97706' },
  { n: 'D', d: 'the late one — shows up at 200 ms', c: '#dc2626' },
]
const DEFAULT_REQS = CAST.map((c) => ({ name: c.n, arrival: { A: 0, B: 50, C: 120, D: 200 }[c.n], prompt: { A: 60, B: 20, C: 100, D: 30 }[c.n], gen: { A: 10, B: 14, C: 6, D: 8 }[c.n] }))

function Chapter3({ live }) {
  const [r, setR] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reqs, setReqs] = useState(DEFAULT_REQS)
  const [maxB, setMaxB] = useState(4)
  const [poolB, setPoolB] = useState(64)
  const [pfMs, setPfMs] = useState(1.2)
  const [dcBase, setDcBase] = useState(26)
  const [dcReq, setDcReq] = useState(0.5)
  const [mode, setMode] = useState('default')

  const run = async (rr = reqs, mb = maxB, pb = poolB) => {
    setBusy(true); setErr(null)
    try {
      setR(await post(`${API}/api/lab3`, {
        requests: rr, max_batch: mb, pool_blocks: pb,
        prefill_ms: pfMs, decode_base: dcBase, decode_per_req: dcReq,
      }))
    } catch (e) { setErr(String(e.message || e)) }
    finally { setBusy(false) }
  }
  useEffect(() => { if (live && !r) run() }, [live])

  const capacityDemo = () => {
    const rr = [{ name: 'P', arrival: 0, prompt: 120, gen: 30 }, { name: 'Q', arrival: 0, prompt: 110, gen: 30 }, { name: 'R', arrival: 0, prompt: 130, gen: 6 }]
    setReqs(rr); setPoolB(18); setMode('capacity'); run(rr, 4, 18)
  }
  const defaultDemo = () => { setReqs(DEFAULT_REQS); setPoolB(64); setMaxB(4); setMode('default'); run(DEFAULT_REQS, 4, 64) }

  const span = r ? Math.max(r.static.makespan, r.continuous.makespan) : 1
  const avgL = (pol) => pol.reqs.reduce((a, q) => a + (q.t_end - q.arrival), 0) / pol.reqs.length
  const preempts = r ? r.continuous.events.filter((e) => e.label.includes('PREEMPT')) : []

  /* moving clock: sweeps both gantts 0 → span over ~7 s */
  const [clock, setClock] = useState(null)
  const clockRef = React.useRef(null)
  const playClock = () => {
    if (!r || clock != null) return
    const t0 = performance.now(), dur = 7000, sp = span
    const tick = (now) => {
      const t = Math.min(sp, ((now - t0) / dur) * sp)
      setClock(t)
      if (t < sp) clockRef.current = requestAnimationFrame(tick)
      else setTimeout(() => setClock(null), 1500)
    }
    clockRef.current = requestAnimationFrame(tick)
  }
  const activeAt = (pol, t) => pol.events.filter((e) => e.t0 <= t && t < e.t1).map((e) => e.label).join(', ') || 'idle'

  return (
    <Sec id="ch3" num="chapter 3" title="Four requests walk into a GPU"
      sub="code/03_continuous_batching.py — the iteration-level scheduler">
      <Story>
        One request at a time is a waste of a GPU: decode is <em>bandwidth-bound</em>, so stepping 4 requests costs
        barely more than stepping 1 (the 26 ms weight fetch is paid once per iteration, not per request — that's the
        “26 + 0.5·B” cost model, measured in chapter 1's engine). So the question is not <em>whether</em> to batch,
        but <em>when requests may join and leave</em>. Meet the cast:
      </Story>
      <div className="cast">
        {CAST.map((c) => (
          <div key={c.n} className="cast-card"><div className="cn" style={{ color: c.c }}>{c.n}</div><div className="cd">{c.d}</div></div>
        ))}
      </div>
      {busy && !r && <div className="panel"><Spin />scheduling…</div>}
      {err && <div className="callout trap"><div className="co-title">error</div>{err}</div>}
      {!live && <div className="draw-empty">start the engine to run the scheduler</div>}

      {r && (
        <>
          <div className="grid2">
            <div className="panel">
              <h4>POLICY 1 · static — assemble a batch, run it until EVERYONE is done</h4>
              <Gantt pol={r.static} span={span} cursor={clock} />
              <ReqLanes pol={r.static} span={span} />
              <div className="cap">
                the GPU sat idle <strong>{Math.round(r.static.makespan - r.static.busy_ms)} ms</strong> waiting for the
                batch to assemble, then <strong>{r.static.wasted_slots} decode iterations</strong> ran with finished
                requests still occupying slots. Short requests wait for the longest one.
              </div>
            </div>
            <div className="panel">
              <h4>POLICY 2 · continuous — admit the moment a slot frees, free the moment one finishes</h4>
              <Gantt pol={r.continuous} span={span} cursor={clock} />
              <ReqLanes pol={r.continuous} span={span} />
              <div className="cap">
                idle time collapsed to <strong>{Math.round(r.continuous.makespan - r.continuous.busy_ms)} ms</strong>,
                wasted decode slots: <strong>{r.continuous.wasted_slots}</strong>. Nobody waits for a stranger's long generation.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0 2px' }}>
            <button className="lab-btn sm" onClick={playClock} disabled={clock != null}>
              {clock != null ? '▶ clock running…' : '▶ play the clock'}
            </button>
            {clock != null && (
              <>
                <span className="clock-chip">t = {Math.round(clock)} ms</span>
                <span className="chip">static: {activeAt(r.static, clock)}</span>
                <span className="chip">continuous: {activeAt(r.continuous, clock)}</span>
              </>
            )}
            {clock == null && <span className="chip">sweeps a red cursor over both timelines — watch the static lane idle at the start</span>}
          </div>

          <div className="panel">
            <h4>the scoreboard (same time axis on both gantts)</h4>
            <table className="data cmp-table"><tbody>
              <tr><td>makespan</td><td className="mono">{r.static.makespan.toLocaleString()} ms</td>
                <td className="mono cmp-win">{r.continuous.makespan.toLocaleString()} ms ({(r.static.makespan / r.continuous.makespan).toFixed(2)}× shorter)</td></tr>
              <tr><td>average latency</td><td className="mono">{Math.round(avgL(r.static)).toLocaleString()} ms</td>
                <td className="mono cmp-win">{Math.round(avgL(r.continuous)).toLocaleString()} ms</td></tr>
              <tr><td>GPU busy</td><td className="mono">{pct(r.static.busy_pct, 0)}</td>
                <td className="mono cmp-win">{pct(r.continuous.busy_pct, 0)}</td></tr>
              <tr><td>throughput</td><td className="mono">{r.static.throughput.toLocaleString()} tok/s</td>
                <td className="mono cmp-win">{r.continuous.throughput.toLocaleString()} tok/s</td></tr>
              <tr><td>wasted decode-slots</td><td className="mono">{r.static.wasted_slots}</td>
                <td className="mono cmp-win">{r.continuous.wasted_slots}</td></tr>
            </tbody></table>
          </div>

          {mode === 'capacity' && (
            <Takeaway>
              the 18-block pool is the whole story here: P+Q fill it, so <strong>R queues behind memory, not FLOPs</strong>;
              when decode growth overflows the pool, the scheduler preempts the newest request
              ({preempts.map((e) => e.label).join(', ') || '—'}) and recomputes it later. That red sliver in the lane
              is vLLM's actual preemption policy.
            </Takeaway>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '6px 0 4px' }}>
            <button className="lab-btn ghost sm" onClick={defaultDemo}>↺ the cast of four</button>
            <button className="lab-btn ghost sm" onClick={capacityDemo}>shrink memory: the 18-block pool</button>
          </div>

          <Collapse title="experiment yourself — workload, batch size, cost model">
            <div style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead><tr><th>req</th><th>arrival ms</th><th>prompt tok</th><th>gen tok</th><th /></tr></thead>
                <tbody>
                  {reqs.map((q, i) => (
                    <tr key={i}>
                      <td><input className="num-in" style={{ width: 44 }} value={q.name} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></td>
                      <td><input className="num-in" type="number" value={q.arrival} min="0" max="5000" onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, arrival: +e.target.value } : x)))} /></td>
                      <td><input className="num-in" type="number" value={q.prompt} min="1" max="400" onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, prompt: +e.target.value } : x)))} /></td>
                      <td><input className="num-in" type="number" value={q.gen} min="1" max="60" onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, gen: +e.target.value } : x)))} /></td>
                      <td><button className="lab-btn ghost sm" onClick={() => setReqs(reqs.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
              <button className="lab-btn ghost sm" onClick={() => setReqs([...reqs, { name: String.fromCharCode(65 + reqs.length), arrival: 0, prompt: 40, gen: 8 }])}>+ add</button>
              <div><div className="ctl-name">max batch</div><input className="num-in" type="number" value={maxB} min="1" max="8" onChange={(e) => setMaxB(+e.target.value)} /></div>
              <div><div className="ctl-name">pool blocks</div><input className="num-in" type="number" value={poolB} min="2" max="256" onChange={(e) => setPoolB(+e.target.value)} /></div>
              <div><div className="ctl-name">prefill ms/tok</div><input className="num-in" type="number" step="0.1" value={pfMs} onChange={(e) => setPfMs(+e.target.value)} /></div>
              <div><div className="ctl-name">decode base ms</div><input className="num-in" type="number" value={dcBase} onChange={(e) => setDcBase(+e.target.value)} /></div>
              <div><div className="ctl-name">decode ms/req</div><div><input className="num-in" type="number" step="0.1" value={dcReq} onChange={(e) => setDcReq(+e.target.value)} /></div></div>
              <button className="lab-btn" onClick={() => run()} disabled={busy || !live}>{busy ? <><Spin />simulating…</> : 'run scheduler'}</button>
            </div>
          </Collapse>
        </>
      )}
    </Sec>
  )
}

/* ═════════════════ CHAPTER 4 — 04_error_gallery.py ═════════════════ */
function Chapter4({ live }) {
  const [r, setR] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try { setR(await post(`${API}/api/lab4`, {})) } catch (e) { /* badge shows offline */ }
    finally { setBusy(false) }
  }
  useEffect(() => { if (live && !r) run() }, [live])

  return (
    <Sec id="ch4" num="chapter 4" title="When the cache lies to you"
      sub="code/04_error_gallery.py — five silent killers, one tripwire">
      <Story>
        Every bug in this chapter keeps every tensor shape legal and returns <em>fluent</em> text — that is what makes
        them expensive. So the code file sets a tripwire first: prefill the golden prompt, decode
        <code className="inline">' the' (262)</code>, and a healthy cache must answer
        <code className="inline">' most'</code>. One token. That single comparison catches all of them.
      </Story>
      <div className="oracle-strip">
        <span className="chip">oracle ritual</span>
        <span>prefill(golden) → decode(<code className="inline"> the</code>) → expect <strong>' most'</strong></span>
        {busy && <span className="chip"><Spin />injecting bugs on the real weights…</span>}
      </div>
      {!live && <div className="draw-empty">start the engine to inject the bugs</div>}
      {r && (
        <>
          <BugGrid bugs={r.bugs} oracle={r.oracle} />
          <Takeaway>
            notice the pattern: bug 1 survives three tokens before derailing; bug 3's <em>last</em> row looks fine —
            mask bugs hide in the middle rows. Silent cache bugs are caught by golden tokens and invariants,
            never by eyeballing shapes.
          </Takeaway>
          <div className="grid2" style={{ marginTop: 14 }}>
            <div className="panel">
              <h4>7 · FP16 KV storage — measured drift, not disaster</h4>
              <table className="data"><tbody>
                <tr><td>max logit drift (FP16 K/V)</td><td className="mono">{r.fp16.drift.toExponential(2)}</td></tr>
                <tr><td>next token unchanged</td><td className="mono" style={{ color: 'var(--green)', fontWeight: 700 }}>{r.fp16.same_token ? 'YES ✓' : 'NO'}</td></tr>
                <tr><td>bytes / token</td><td className="mono">{r.fp16.bytes_fp32.toLocaleString()} B → {r.fp16.bytes_fp16.toLocaleString()} B (−50%)</td></tr>
              </tbody></table>
              <div className="cap">engines store K/V in FP16/BF16: halves the chapter-1 bill for ~1e-3 of logit noise and — measured here — the same next token.</div>
            </div>
            <div className="panel">
              <h4>6 · the admission bug that actually happened</h4>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>{r.scheduler_bug.detail}</div>
            </div>
          </div>
        </>
      )}
      {r && (
        <div style={{ marginTop: 10 }}>
          <button className="lab-btn ghost sm" onClick={run} disabled={busy || !live}>↺ re-inject</button>
        </div>
      )}
    </Sec>
  )
}
