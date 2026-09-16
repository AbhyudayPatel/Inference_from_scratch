import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  health, analyze, generate, interpGrid, probAt, nucleusExact,
  mulberry32, pct, fixed, tokLabel, API,
} from './api.js'
import { NucleusChart, SweepChart, TopKChart } from './charts.jsx'
import demoData from './demo_logits.json'

const DEFAULT_PROMPT = 'The future of artificial intelligence is'
const LINE_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']

const PRESETS = [
  ['near-greedy', { T: 0.05, k: 1, p: 1 }],
  ['balanced', { T: 0.8, k: 40, p: 0.95 }],
  ['creative', { T: 1.2, k: 0, p: 0.97 }],
  ['chaos', { T: 1.8, k: 0, p: 1 }],
]

export default function SamplingLab() {
  const [status, setStatus] = useState('checking')        // checking | live | offline
  const [data, setData] = useState(null)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [T, setT] = useState(1.0)
  const [k, setK] = useState(0)
  const [p, setP] = useState(1.0)
  const [rho, setRho] = useState(1.0)
  const [nbars, setNBars] = useState(15)
  const [seed, setSeed] = useState(42)
  const [draws, setDraws] = useState(null)
  const [focus, setFocus] = useState(null)
  const [genBusy, setGenBusy] = useState(false)
  const [gen, setGen] = useState(null)
  const [genErr, setGenErr] = useState(null)
  const [wantGreedy, setWantGreedy] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    let dead = false
    health().then(async (h) => {
      if (dead) return
      if (h && h.ok) {
        setStatus('live')
        try {
          setBusy(true)
          setData(await analyze(DEFAULT_PROMPT))
        } catch (e) {
          setErr(String(e.message || e))
          setData(demoData)
          setStatus('offline')
        } finally { setBusy(false) }
      } else {
        setStatus('offline')
        setData(demoData)
      }
    })
    return () => { dead = true }
  }, [])

  const runAnalyze = async () => {
    setErr(null); setGen(null); setDraws(null)
    if (status !== 'live') {
      setErr(`server offline — start it: python Day03_Forward_Pass_From_Scratch/code/sampler_server.py`)
      return
    }
    setBusy(true)
    try {
      setData(await analyze(prompt))
    } catch (e) {
      setErr(String(e.message || e))
    } finally { setBusy(false) }
  }

  /* ── THE MODEL: everything below recomputes on every slider tick ─────── */
  const m = useMemo(() => {
    if (!data) return null
    const seen = new Set(data.ids)
    const top = data.top
    const exact = rho === 1
    const { logZ, H } = interpGrid(data.grid, T)

    // repetition penalty (HF/vLLM convention): seen tokens z>0 → z/ρ, z<0 → z·ρ
    const adj = top.map((r) => (seen.has(r.i) ? (r.z > 0 ? r.z / rho : r.z * rho) : r.z))
    const order = top.map((_, i) => i).sort((a, b) => adj[b] - adj[a])

    // post-temperature probabilities (exact full-vocab Z, or renorm over shown if ρ≠1)
    let probs
    if (exact) {
      probs = top.map((r) => probAt(r.z, T, logZ))
    } else {
      const mx = Math.max(...adj)
      const e = adj.map((z) => Math.exp((z - mx) / T))
      const s = e.reduce((a, b) => a + b, 0)
      probs = e.map((x) => x / s)
    }

    // top-k mask → renorm (vLLM order of operations: penalties → /T → top-k → top-p)
    const kOn = k > 0 && k < top.length
    const kSet = new Set(kOn ? order.slice(0, k) : order)
    let massK = 0
    for (const i of kSet) massK += probs[i]
    const pk = probs.map((pr, i) => (kSet.has(i) ? pr / (massK || 1) : 0))

    // top-p over the (k-filtered, renormalized) distribution
    const cum = []
    let c = 0
    for (const i of order) { c += pk[i]; cum.push(c) }
    let cutoff = cum.length
    if (p < 1) {
      const idx = cum.findIndex((v) => v >= p)
      cutoff = idx < 0 ? cum.length : idx + 1
    }
    const candIdx = order.slice(0, cutoff)
    let massC = 0
    for (const i of candIdx) massC += pk[i]
    const candP = {}
    for (const i of candIdx) candP[i] = pk[i] / (massC || 1)

    const statusArr = top.map((_, i) =>
      !kSet.has(i) ? 'k' : candP[i] !== undefined ? 'kept' : 'p')

    const coverage = exact ? probs.reduce((a, b) => a + b, 0) : 1
    const Hshown = exact
      ? H
      : -probs.reduce((a, pr) => (pr > 0 ? a + pr * Math.log(pr) : a), 0)
    const nuc = nucleusExact(data.nucleus, T, p)

    // global cumulative (no top-k) for the top-k chart + temperature sweep series
    const orderRaw = top.map((_, i) => i).sort((a, b) => top[b].z - top[a].z)
    const cumRaw = []
    c = 0
    for (const i of orderRaw) { c += probs[i]; cumRaw.push(c) }
    const sweep = orderRaw.slice(0, 6).map((row, si) => ({
      label: tokLabel(top[row].t, 12),
      color: LINE_COLORS[si],
      ys: data.grid.ts.map((t, gi) => probAt(top[row].z, t, data.grid.logZ[gi])),
      row,
    }))

    return {
      order, probs, pk, cum, cumRaw, cutoff, candIdx, candP, statusArr,
      coverage, H: Hshown, logZ, exact, nuc, sweep, massK,
      p1: probs[order[0]],
      nCand: candIdx.length,
    }
  }, [data, T, k, p, rho])

  const doDraw = (n) => {
    if (!m) return
    const rng = mulberry32(seed)
    const items = m.candIdx.map((i) => [i, m.candP[i]])
    const counts = new Map()
    for (let d = 0; d < n; d++) {
      const r = rng()
      let acc = 0, pickRow = items[items.length - 1][0]
      for (const [i, pr] of items) { acc += pr; if (r <= acc) { pickRow = i; break } }
      counts.set(pickRow, (counts.get(pickRow) || 0) + 1)
    }
    setDraws({ n, counts })
  }

  const runGenerate = async () => {
    setGenErr(null); setGenBusy(true)
    try {
      setGen(await generate({
        prompt: data.prompt, temperature: T, top_k: k, top_p: p,
        seed, steps: 8, greedy_baseline: wantGreedy,
      }))
    } catch (e) {
      setGenErr(String(e.message || e))
    } finally { setGenBusy(false) }
  }

  if (!data || !m) {
    return <div className="loading">loading the lab…</div>
  }

  const focused = focus != null ? { row: focus, ...data.top[focus] } : null
  const fmtFocus = focused
    ? `${tokLabel(focused.t)}  id=${focused.i}  logit=${fixed(focused.z, 2)}  ` +
    `p(T=${T.toFixed(2)})=${pct(m.probs[focused.row], 3)}  ` +
    `${m.statusArr[focused.row] === 'kept'
      ? `kept → sampling p=${pct(m.candP[focused.row], 2)}`
      : m.statusArr[focused.row] === 'k' ? 'cut by top-k' : 'cut by top-p'}`
    : `hover a bar — greedy pick: ${tokLabel(data.greedy.t)} (id ${data.greedy.i})`

  return (
    <div className="lab">
      {/* ── status + prompt ─────────────────────────────────────────── */}
      <div className="lab-status">
        {status === 'checking' && <span className="badge">connecting…</span>}
        {status === 'live' && <span className="badge done">LIVE · real GPT-2 logits · {API}</span>}
        {status === 'offline' && <span className="badge">offline demo data — server not running</span>}
        {data.ms != null && <span className="chip">forward pass: {data.ms} ms{status === 'live' ? ' (NumPy, CPU)' : ''}</span>}
        <span className="chip">vocab {data.vocab.toLocaleString()}</span>
      </div>

      <div className="card lab-prompt">
        <div className="prompt-row">
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAnalyze()}
            placeholder="type any sentence…"
            spellCheck={false}
          />
          <button className="lab-btn" onClick={runAnalyze} disabled={busy}>
            {busy ? 'running forward pass…' : 'run forward pass'}
          </button>
        </div>
        <div className="tok-strip">
          {data.pieces.map((t, i) => (
            <span key={i} className="tok-chip" title={`id ${data.ids[i]}`}>
              {tokLabel(t, 14)}<em>{data.ids[i]}</em>
            </span>
          ))}
          <span className="tok-strip-note">{data.ids.length} prompt tokens → one 50,257-score vector → this lab</span>
        </div>
        {err && <div className="lab-err">{err}</div>}
        {status === 'offline' && (
          <div className="lab-note">
            To interrogate <em>any</em> sentence, start the Day-3 backend:&nbsp;
            <code className="inline">python Day03_Forward_Pass_From_Scratch/code/sampler_server.py</code>
            &nbsp;then reload. Everything below is already live on real demo logits.
          </div>
        )}
      </div>

      {/* ── controls ────────────────────────────────────────────────── */}
      <div className="card">
        <div className="ctl-grid">
          <Slider label="temperature" v={T} set={setT} min={0.05} max={2} step={0.01}
            fmt={(v) => v.toFixed(2)}
            desc="logits / T before softmax — <1 sharpens, >1 flattens" />
          <Slider label={`top-k ${k === 0 ? '(off)' : ''}`} v={k} set={setK} min={0} max={200} step={1}
            fmt={(v) => (v === 0 ? 'off' : String(v))}
            desc="keep exactly k best IDs, rest get p=0" />
          <Slider label={`top-p ${p >= 1 ? '(off)' : ''}`} v={p} set={setP} min={0.05} max={1} step={0.005}
            fmt={(v) => (v >= 1 ? 'off' : v.toFixed(3))}
            desc="smallest set whose mass ≥ p (nucleus)" />
          <Slider label={`repetition penalty ${rho === 1 ? '(off)' : ''}`} v={rho} set={setRho} min={1} max={2} step={0.05}
            fmt={(v) => (v === 1 ? 'off' : v.toFixed(2))}
            desc="÷/× logits of prompt tokens (HF/vLLM rule)" />
        </div>
        <div className="presets">
          <span className="presets-lbl">presets</span>
          {PRESETS.map(([name, cfg]) => (
            <button key={name} className="chip preset"
              onClick={() => { setT(cfg.T); setK(cfg.k); setP(cfg.p) }}>{name}</button>
          ))}
          <span className="presets-lbl" style={{ marginLeft: 14 }}>bars</span>
          {[10, 15, 25, 40].map((n) => (
            <button key={n} className={`chip preset ${nbars === n ? 'on' : ''}`}
              onClick={() => setNBars(n)}>{n}</button>
          ))}
        </div>
      </div>

      {/* ── live stats strip ────────────────────────────────────────── */}
      <div className="stat-grid">
        <Stat k="entropy H(T)" v={`${fixed(m.H, 3)}${m.exact ? '' : ' ≈'}`} u={`${fixed(m.H / Math.LN2, 3)} bits`} />
        <Stat k="perplexity e^H" v={fixed(Math.exp(m.H), 1)} u="effective vocab size" />
        <Stat k="top token p" v={pct(m.p1, 2)} u={tokLabel(data.top[m.order[0]].t, 14)} />
        <Stat k="candidates kept" v={String(m.nCand)} u={`of ${data.top.length} shown · mass ${pct(m.massK, 1)} after top-k`} />
        <Stat k="nucleus @ p" v={p < 1 ? String(m.cutoff) : 'off'}
          u={m.nuc ? `server-exact: ${m.nuc.size} @ T=${m.nuc.refT}` : 'p=1 → no filtering'} />
        <Stat k="top-512 coverage" v={pct(m.coverage, 2)} u={m.exact ? `of all mass at T=${T.toFixed(2)}` : 'ρ on → probs renorm. over shown'} />
      </div>

      {/* ── PANEL 1: candidate bars ─────────────────────────────────── */}
      <div className="card viz-card">
        <h4>next-token candidates — probabilities at T={T.toFixed(2)}</h4>
        <div className="legend">
          <span className="lg"><i className="sw kept" />in candidate set</span>
          <span className="lg"><i className="sw cutk" />cut by top-k</span>
          <span className="lg"><i className="sw cutp" />cut by top-p</span>
          <span className="lg"><i className="star">★</i>greedy argmax</span>
        </div>
        <div className="cand" onMouseLeave={() => setFocus(null)}>
          {m.order.slice(0, nbars).map((row, rank) => {
            const tk = data.top[row]
            const pr = m.probs[row]
            const st = m.statusArr[row]
            const wPct = Math.max(0.6, (pr / (m.p1 || 1e-12)) * 100)
            return (
              <div key={tk.i} className="tk-row" onMouseEnter={() => setFocus(row)}>
                <span className="tk-rank">{rank + 1}</span>
                <span className="tk-name">{rank === 0 && <i className="star">★ </i>}{tokLabel(tk.t)}</span>
                <span className="tk-track">
                  <span className={`tk-bar ${st}`} style={{ width: `${wPct}%` }} />
                </span>
                <span className="tk-pct">{pct(pr, pr < 0.001 ? 3 : 2)}</span>
                <span className={`tk-tag ${st}`}>{st === 'kept' ? pct(m.candP[row], 1) : st === 'k' ? 'k' : 'p'}</span>
              </div>
            )
          })}
        </div>
        <div className="hover-detail">{fmtFocus}</div>
        <div className="cap">
          bar length = probability after temperature (exact full-vocab softmax{m.exact ? '' : ', renormalized over shown 512 while ρ≠1'});
          last column = probability <em>inside the surviving candidate set</em> — what the sampler actually draws from.
        </div>
      </div>

      {/* ── PANEL 2: nucleus + top-k charts ─────────────────────────── */}
      <div className="viz-grid">
        <div className="card viz-card">
          <h4>top-p anatomy — cumulative mass vs rank</h4>
          <NucleusChart cum={m.cum} p={p} cutoff={m.cutoff} coverage={m.coverage} />
          <div className="cap">
            sorted candidate mass (after top-k). The amber line is your p; everything left of the
            green cutoff survives. Watch the cutoff move as you drag temperature: peaked prompts
            need few tokens, flat prompts need hundreds.
          </div>
        </div>
        <div className="card viz-card">
          <h4>top-k anatomy — mass captured by first k tokens</h4>
          <TopKChart cum={m.cumRaw} k={k} />
          <div className="cap">
            how much probability the first k tokens carry at T={T.toFixed(2)} (no top-p applied).
            A hard k truncates the tail even when the tail is huge — flat distributions punish small k.
          </div>
        </div>
      </div>

      {/* ── PANEL 3: temperature sweep ──────────────────────────────── */}
      <div className="card viz-card">
        <h4>temperature sweep — how the top tokens trade probability</h4>
        <div className="legend">
          {m.sweep.map((s) => (
            <span className="lg" key={s.label}>
              <i className="sw" style={{ background: s.color }} />
              {s.label}&nbsp;<b>{pct(probAt(data.top[s.row].z, T, m.logZ), 1)}</b>
            </span>
          ))}
        </div>
        <SweepChart xs={data.grid.ts} series={m.sweep} x={T} xLabel="temperature →" />
        <div className="cap">
          each curve is p<sub>i</sub>(T) = e<sup>z<sub>i</sub>/T</sup> / Z(T) with Z over the full vocab —
          exact at every grid point. Drag temperature and watch the winner take almost everything as T→0,
          and the field flatten toward uniform as T→2.
        </div>
      </div>

      {/* ── PANEL 4: entropy + draw simulator ───────────────────────── */}
      <div className="viz-grid">
        <div className="card viz-card">
          <h4>entropy of the whole distribution vs T</h4>
          <SweepChart
            xs={data.grid.ts}
            series={[{ label: 'H(T)', color: '#4f46e5', ys: data.grid.H }]}
            x={T} xLabel="temperature →" yFmt={(v) => v.toFixed(1)}
            hline={{ y: Math.log(data.vocab), label: `ln ${data.vocab} = ${fixed(Math.log(data.vocab), 2)} (uniform max)` }}
          />
          <div className="cap">
            H(T) = log Z(T) − E[z/T], computed over all 50,257 tokens. At T={T.toFixed(2)}:
            H = <b>{fixed(m.H, 3)} nats</b> → the model is “choosing among” ≈ e<sup>H</sup> = <b>{fixed(Math.exp(m.H), 1)}</b> tokens.
          </div>
        </div>

        <div className="card viz-card">
          <h4>draw simulator — seeded RNG over the candidate set</h4>
          <div className="draw-ctl">
            <label>seed <input type="number" className="seed-in" value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)} /></label>
            <button className="lab-btn sm" onClick={() => doDraw(1)}>draw 1</button>
            <button className="lab-btn sm" onClick={() => doDraw(100)}>draw 100</button>
            <span className="chip">{m.nCand} candidates</span>
          </div>
          {draws && draws.n === 1 && (
            <div className="draw-one">
              → {tokLabel(data.top[[...draws.counts.keys()][0]].t, 24)}
              <span>sampling p = {pct(m.candP[[...draws.counts.keys()][0]], 2)}</span>
            </div>
          )}
          {draws && draws.n > 1 && (
            <div className="hist">
              {[...draws.counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([row, cnt]) => (
                <div key={row} className="hist-row">
                  <span className="tk-name">{tokLabel(data.top[row].t, 12)}</span>
                  <span className="tk-track"><span className="tk-bar kept" style={{ width: `${cnt}%` }} /></span>
                  <span className="tk-pct">{cnt}× <em>exp {pct(m.candP[row], 0)}</em></span>
                </div>
              ))}
            </div>
          )}
          {!draws && <div className="draw-empty">no draws yet — same seed always replays the same draw sequence</div>}
          <div className="cap">
            browser RNG (mulberry32) over the renormalized candidate distribution — the same contract as
            <code className="inline"> SamplingParams(seed=…)</code>: fixed seed → reproducible picks.
          </div>
        </div>
      </div>

      {/* ── PANEL 5: multi-token generation ─────────────────────────── */}
      <div className="card viz-card">
        <h4>roll it forward — generate 8 tokens with these exact settings</h4>
        <div className="draw-ctl">
          <label className="greedy-chk">
            <input type="checkbox" checked={wantGreedy} onChange={(e) => setWantGreedy(e.target.checked)} />
            also run greedy baseline
          </label>
          <button className="lab-btn" onClick={runGenerate} disabled={genBusy || status !== 'live'}>
            {genBusy ? 'generating… (~1s/token, no KV cache yet)' : 'generate'}
          </button>
          {status !== 'live' && <span className="chip">needs the live server</span>}
          {gen && <span className="chip">{gen.ms} ms total</span>}
        </div>
        {genErr && <div className="lab-err">{genErr}</div>}
        {gen && (
          <>
            <div className="gen-text">
              <span className="gen-prompt">{gen.prompt}</span>
              <span className="gen-cont">{gen.continuation}</span>
            </div>
            {gen.greedy_continuation != null && (
              <div className="gen-text greedy">
                <span className="gen-prompt">{gen.prompt}</span>
                <span className="gen-cont g">{gen.greedy_continuation}</span>
                <span className="gen-tag">greedy (T=0)</span>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead><tr>
                  <th>step</th><th>picked token</th><th>sampling p</th>
                  <th>raw rank</th><th>candidates</th><th>runner-ups (post-T)</th>
                </tr></thead>
                <tbody>
                  {gen.steps.map((s, i) => (
                    <tr key={i}>
                      <td className="mono">{i + 1}</td>
                      <td className="mono"><b>{tokLabel(s.t)}</b></td>
                      <td className="mono">{pct(s.p, 1)}</td>
                      <td className="mono">#{s.rank}</td>
                      <td className="mono">{s.cand.toLocaleString()}</td>
                      <td className="mono">{s.top5.slice(0, 3).map((t) => `${tokLabel(t.t, 12)} ${pct(t.p, 1)}`).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="cap">
          the server replays 02_sampling.py step by step: full forward pass per token (Day 4 adds the KV cache),
          NumPy RNG with your seed. “raw rank” exposes near-misses — a low-probability pick from the tail
          still lands in the text when the nucleus admits it.
        </div>
      </div>
    </div>
  )
}

function Slider({ label, v, set, min, max, step, fmt, desc }) {
  return (
    <div className="ctl-item">
      <div className="ctl-head">
        <span className="ctl-name">{label}</span>
        <span className="ctl-val">{fmt(v)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => set(Number(e.target.value))} />
      <div className="ctl-desc">{desc}</div>
    </div>
  )
}

function Stat({ k, v, u }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className="stat-v">{v}</div>
      <div className="stat-u">{u}</div>
    </div>
  )
}
