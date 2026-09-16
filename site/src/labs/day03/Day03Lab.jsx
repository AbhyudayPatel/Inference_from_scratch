import React, { useMemo, useState } from 'react'
import {
  pct, fixed, tokL, useHealth, StatusBadge, OfflineNote,
  LabNav, Sec, Stat, Slider, Spin,
} from '../common.jsx'
import { analyze, generate, interpGrid, probAt, nucleusExact, mulberry32 } from './api.js'
import { NucleusChart, TopKChart, SweepChart } from './charts.jsx'

const DEFAULT_PROMPT = 'The future of artificial intelligence is'
const LINE_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']
const PRESETS = [
  ['near-greedy', { T: 0.05, k: 1, p: 1 }],
  ['balanced', { T: 0.8, k: 40, p: 0.95 }],
  ['creative', { T: 1.2, k: 0, p: 0.97 }],
  ['chaos', { T: 1.8, k: 0, p: 1 }],
]
const NAV = [
  ['console', 'console'], ['controls', 'controls'], ['candidates', 'candidates'],
  ['topp', 'top-p'], ['topk', 'top-k'], ['temp', 'temperature'], ['entropy', 'entropy'],
  ['draw', 'draws'], ['generate', 'generate'], ['notes', 'notes'],
]

export default function Day03Lab() {
  const status = useHealth('http://127.0.0.1:8600')
  const [data, setData] = useState(null)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [T, setT] = useState(1.0)
  const [k, setK] = useState(0)
  const [p, setP] = useState(1.0)
  const [rho, setRho] = useState(1.0)
  const [nbars, setNBars] = useState(10)
  const [seed, setSeed] = useState(42)
  const [draws, setDraws] = useState(null)
  const [focus, setFocus] = useState(null)
  const [gen, setGen] = useState(null)
  const [genBusy, setGenBusy] = useState(false)
  const [genErr, setGenErr] = useState(null)
  const [wantGreedy, setWantGreedy] = useState(true)

  const runAnalyze = async (text) => {
    setErr(null); setGen(null); setDraws(null); setBusy(true)
    try {
      setData(await analyze(text))
    } catch (e) {
      setErr(String(e.message || e))
    } finally { setBusy(false) }
  }

  // auto-run once the engine answers
  React.useEffect(() => {
    if (status === 'live' && !data) runAnalyze(DEFAULT_PROMPT)
  }, [status])

  /* ── THE MODEL: recomputed on every slider tick (same math as 02_sampling.py) ── */
  const m = useMemo(() => {
    if (!data) return null
    const seen = new Set(data.ids)
    const top = data.top
    const exact = rho === 1
    const { logZ, H } = interpGrid(data.grid, T)
    // repetition penalty (HF/vLLM): seen tokens z>0 → z/ρ, z<0 → z·ρ
    const adj = top.map((r) => (seen.has(r.i) ? (r.z > 0 ? r.z / rho : r.z * rho) : r.z))
    const order = top.map((_, i) => i).sort((a, b) => adj[b] - adj[a])
    let probs
    if (exact) {
      probs = top.map((r) => probAt(r.z, T, logZ))
    } else {
      const mx = Math.max(...adj)
      const e = adj.map((z) => Math.exp((z - mx) / T))
      const s = e.reduce((a, b) => a + b, 0)
      probs = e.map((x) => x / s)
    }
    // top-k mask → renorm (engine order: penalties → ÷T → top-k → top-p)
    const kOn = k > 0 && k < top.length
    const kSet = new Set(kOn ? order.slice(0, k) : order)
    let massK = 0
    for (const i of kSet) massK += probs[i]
    const pk = probs.map((pr, i) => (kSet.has(i) ? pr / (massK || 1) : 0))
    // top-p cutoff on the k-filtered distribution
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
    const statusArr = top.map((_, i) => (!kSet.has(i) ? 'k' : candP[i] !== undefined ? 'kept' : 'p'))
    const coverage = exact ? probs.reduce((a, b) => a + b, 0) : 1
    const Hshown = exact ? H : -probs.reduce((a, pr) => (pr > 0 ? a + pr * Math.log(pr) : a), 0)
    const orderRaw = top.map((_, i) => i).sort((a, b) => top[b].z - top[a].z)
    const cumRaw = []
    c = 0
    for (const i of orderRaw) { c += probs[i]; cumRaw.push(c) }
    const sweep = orderRaw.slice(0, 6).map((row, si) => ({
      label: tokL(top[row].t, 12), color: LINE_COLORS[si], row,
      ys: data.grid.ts.map((t, gi) => probAt(top[row].z, t, data.grid.logZ[gi])),
    }))
    return {
      order, probs, pk, cum, cumRaw, cutoff, candIdx, candP, status: statusArr,
      coverage, H: Hshown, logZ, exact, nuc: nucleusExact(data.nucleus, T, p),
      sweep, massK, p1: probs[order[0]], nCand: candIdx.length,
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
    } catch (e) { setGenErr(String(e.message || e)) } finally { setGenBusy(false) }
  }

  return (
    <div className="lab-hero">
      <h1>The Sampling Lab — <em>live GPT-2 logits</em></h1>
      <p className="sub">
        Day 03's forward pass, running behind this page. Type any sentence → the real
        50,257-score vector comes back → every chart is computed from it, live, on every slider tick.
        Backend: <code className="inline">Day03…/code/sampler_server.py</code> (the same pipeline that passes the golden checksum).
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' }}>
        <StatusBadge status={status} label="NumPy GPT-2 124M · port 8600" />
        {data && <span className="chip">forward pass {data.ms} ms</span>}
        {data && <span className="chip">vocab {data.vocab.toLocaleString()}</span>}
        <a className="chip" href="#/day-03" style={{ textDecoration: 'none' }}>← back to the Day-3 journal</a>
      </div>
      {status === 'offline' && <OfflineNote server="python Day03_Forward_Pass_From_Scratch/code/sampler_server.py" />}
      <LabNav items={NAV} />

      {/* ── 00 console ── */}
      <Sec id="console" num="00" title="The console"
        sub="One sentence in, one 50,257-score vector out. The strip shows the live state of the pipeline; everything downstream reads from it.">
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="lab-input" value={prompt} spellCheck={false}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && status === 'live' && runAnalyze(prompt)}
              placeholder="type any sentence…" />
            <button className="lab-btn" disabled={busy || status !== 'live'} onClick={() => runAnalyze(prompt)}>
              {busy ? <><Spin />running forward pass…</> : 'run forward pass'}
            </button>
          </div>
          {data && (
            <div className="tok-strip">
              {data.pieces.map((t, i) => (
                <span key={i} className="tok-chip">{tokL(t, 14)}<em>{data.ids[i]}</em></span>
              ))}
              <span className="chip" style={{ borderStyle: 'dashed' }}>{data.ids.length} tokens in · 1 score per vocab entry out</span>
            </div>
          )}
          {err && <div className="callout trap" style={{ marginBottom: 0 }}><div className="co-title">error</div>{err}</div>}
        </div>
        {data && (
          <div className="pipe">
            <div className="pnode"><div className="t">prompt</div><div className="v">{data.ids.length} tokens</div></div>
            <div className="pnode"><div className="t">forward pass</div><div className="v">{data.ms} ms</div></div>
            <div className="pnode"><div className="t">logits vector</div><div className="v">{data.vocab.toLocaleString()} scores</div></div>
            <div className="pnode"><div className="t">greedy argmax</div><div className="v" style={{ color: 'var(--green)' }}>{tokL(data.greedy.t, 14)}</div></div>
            <div className="pnode hot"><div className="t">selector — this lab</div><div className="v">T · k · p · ρ · seed</div></div>
          </div>
        )}
      </Sec>

      {/* ── 01 controls ── */}
      <Sec id="controls" num="01" title="The selector knobs"
        sub="Literally vLLM's SamplingParams. Order of operations matches the engines: penalty → ÷T → top-k mask → renorm → top-p cutoff → seeded draw. Nothing here touches the model.">
        <div className="card">
          <div className="ctl-grid">
            <Slider label="temperature" v={T} set={setT} min={0.05} max={2} step={0.01}
              fmt={(v) => v.toFixed(2)} desc="logits / T before softmax — <1 sharpens, >1 flattens (T→0 ≈ greedy)" />
            <Slider label="top-k" v={k} set={setK} min={0} max={200} step={1}
              fmt={(v) => (v === 0 ? 'off' : String(v))} desc="keep exactly k best IDs; the other 50,000+ get probability 0" />
            <Slider label="top-p (nucleus)" v={p} set={setP} min={0.05} max={1} step={0.005}
              fmt={(v) => (v >= 1 ? 'off' : v.toFixed(3))} desc="keep the smallest set whose cumulative mass ≥ p" />
            <Slider label="repetition penalty" v={rho} set={setRho} min={1} max={2} step={0.05}
              fmt={(v) => (v === 1 ? 'off' : v.toFixed(2))} desc="HF/vLLM rule: seen-token logits z>0 → z/ρ, z<0 → z·ρ" />
          </div>
          <div className="presets">
            <span className="presets-lbl">presets</span>
            {PRESETS.map(([name, cfg]) => (
              <button key={name} className="chip preset" onClick={() => { setT(cfg.T); setK(cfg.k); setP(cfg.p) }}>{name}</button>
            ))}
            <span className="presets-lbl" style={{ marginLeft: 14 }}>bars shown</span>
            {[10, 15, 25, 40].map((n) => (
              <button key={n} className={`chip preset ${nbars === n ? 'on' : ''}`} onClick={() => setNBars(n)}>{n}</button>
            ))}
          </div>
        </div>
        {m && data && (
          <div className="stat-grid">
            <Stat k="entropy H(T)" v={`${fixed(m.H, 3)}${m.exact ? '' : ' ≈'}`} u={`${fixed(m.H / Math.LN2, 3)} bits`} />
            <Stat k="perplexity e^H" v={fixed(Math.exp(m.H), 1)} u="effective vocab size" />
            <Stat k="top token p" v={pct(m.p1, 2)} u={tokL(data.top[m.order[0]].t, 14)} />
            <Stat k="candidates kept" v={String(m.nCand)} u={`of ${data.top.length} shown · mass ${pct(m.massK, 1)} after top-k`} />
            <Stat k="nucleus @ p" v={p < 1 ? String(m.cutoff) : 'off'}
              u={m.nuc ? `server-exact: ${m.nuc.size} @ T=${m.nuc.refT}` : 'p=1 → no filtering'} />
            <Stat k="top-512 coverage" v={pct(m.coverage, 2)} u={m.exact ? `of all mass at T=${T.toFixed(2)}` : 'ρ on → renorm. over shown'} />
          </div>
        )}
      </Sec>

      {/* ── 02 candidates ── */}
      {m && data && (
        <Sec id="candidates" num="02" title="The candidate distribution — live"
          sub="p = e^(z/T) / Z with Z over the entire vocabulary — true probabilities, not bars renormalized to look pretty. Coloring shows who survives your filters.">
          <div className="panel">
            <h4>next-token candidates — probabilities at T={T.toFixed(2)}</h4>
            <div className="legend">
              <span><i className="sw kept" />in candidate set</span>
              <span><i className="sw cutk" />cut by top-k</span>
              <span><i className="sw cutp" />cut by top-p</span>
              <span><i className="star">★</i> greedy argmax</span>
            </div>
            <div className="cand" onMouseLeave={() => setFocus(null)}>
              {m.order.slice(0, nbars).map((row, rank) => {
                const tk = data.top[row]
                const pr = m.probs[row]
                const st = m.status[row]
                return (
                  <div key={tk.i} className="tk-row" onMouseEnter={() => setFocus(row)}>
                    <span className="tk-rank">{rank + 1}</span>
                    <span className="tk-name">{rank === 0 && <i className="star">★ </i>}{tokL(tk.t)}</span>
                    <span className="tk-track"><span className={`tk-bar ${st}`} style={{ width: `${Math.max(0.6, pr / (m.p1 || 1e-12) * 100)}%` }} /></span>
                    <span className="tk-pct">{pct(pr, pr < 0.001 ? 3 : 2)}</span>
                    <span className={`tk-tag ${st}`}>{st === 'kept' ? pct(m.candP[row], 1) : st}</span>
                  </div>
                )
              })}
            </div>
            <div className="hover-detail">
              {focus != null
                ? `${tokL(data.top[focus].t)}  id=${data.top[focus].i}  logit=${fixed(data.top[focus].z, 2)}  p(T=${T.toFixed(2)})=${pct(m.probs[focus], 3)}  ${m.status[focus] === 'kept' ? `kept → sampling p=${pct(m.candP[focus], 2)}` : m.status[focus] === 'k' ? 'cut by top-k' : 'cut by top-p'}`
                : `greedy pick: ${tokL(data.greedy.t)} (id ${data.greedy.i}) — hover a bar…`}
            </div>
            <div className="cap">
              last column = probability <em>inside the surviving candidate set</em> — the distribution the RNG
              actually draws from after filters and renormalization.
            </div>
          </div>
        </Sec>
      )}

      {/* ── 03/04 top-p + top-k ── */}
      {m && (
        <Sec id="topp" num="03 · 04" title="The filters, anatomized"
          sub="Same curve, two readings: top-p picks a cutoff by mass; top-k by count. Drag the sliders and watch the markers move.">
          <div className="grid2">
            <div className="panel">
              <h4>top-p — cumulative mass vs rank</h4>
              <NucleusChart cum={m.cum} p={p} cutoff={m.cutoff} coverage={m.coverage} />
              <div className="cap">
                candidates sorted best-first (log-rank axis); the curve is their running total after top-k.
                The amber line is your p; everything left of the green cutoff survives. Peaked prompts need a handful
                of tokens, flat ones hundreds — <strong>that adaptivity is why nucleus sampling exists.</strong>
              </div>
            </div>
            <div className="panel">
              <h4>top-k — mass captured by the first k tokens</h4>
              <TopKChart cum={m.cumRaw} k={k} />
              <div className="cap">
                no adaptivity: k tokens are kept whether they hold 99% or 20% of the mass.
                Flat distribution + small k = valid alternatives silently zeroed.
              </div>
            </div>
          </div>
        </Sec>
      )}

      {/* ── 05/06 temperature + entropy ── */}
      {m && data && (
        <Sec id="temp" num="05 · 06" title="Temperature, swept end to end"
          sub="Exact at every grid point — Z(T) and H(T) are computed server-side over all 50,257 tokens. The dashed marker is your current T.">
          <div className="grid2">
            <div className="panel">
              <h4>p_i(T) for the top-6 tokens</h4>
              <div className="legend">
                {m.sweep.map((s) => (
                  <span key={s.label}><i className="sw" style={{ background: s.color }} />{s.label}&nbsp;<b>{pct(probAt(data.top[s.row].z, T, m.logZ), 1)}</b></span>
                ))}
              </div>
              <SweepChart xs={data.grid.ts} series={m.sweep} x={T} xLabel="temperature →" />
              <div className="cap">as T→0 the argmax takes nearly everything; as T→2 the field flattens toward uniform.</div>
            </div>
            <div className="panel">
              <h4>entropy H(T), full vocabulary</h4>
              <SweepChart xs={data.grid.ts} series={[{ label: 'H', color: '#4f46e5', ys: data.grid.H }]} x={T}
                xLabel="temperature →" yFmt={(v) => v.toFixed(1)}
                hline={{ y: Math.log(data.vocab), label: `ln ${data.vocab} = ${fixed(Math.log(data.vocab), 2)} (uniform max)` }} />
              <div className="cap">
                H(T) = log Z(T) − E[z/T]. At T={T.toFixed(2)}: H = <b>{fixed(m.H, 3)} nats</b> → the model is
                “choosing among” ≈ e<sup>H</sup> = <b>{fixed(Math.exp(m.H), 1)}</b> tokens.
              </div>
            </div>
          </div>
        </Sec>
      )}

      {/* ── 07/08 draws + generate ── */}
      {m && data && (
        <Sec id="draw" num="07 · 08" title="From distribution to text"
          sub="Left: the seeded RNG contract, exercised in your browser. Right: the server replays 02_sampling.py for 8 real tokens with your exact settings.">
          <div className="grid2">
            <div className="panel">
              <h4>draw simulator</h4>
              <div className="draw-ctl">
                <label>seed <input type="number" className="num-in" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} /></label>
                <button className="lab-btn sm" onClick={() => doDraw(1)}>draw 1</button>
                <button className="lab-btn sm" onClick={() => doDraw(100)}>draw 100</button>
                <span className="chip">{m.nCand} candidates</span>
              </div>
              {!draws && <div className="draw-empty">no draws yet — same seed always replays the same sequence of picks</div>}
              {draws && draws.n === 1 && (
                <div className="draw-one">
                  → {tokL(data.top[[...draws.counts.keys()][0]].t, 24)}
                  <span>sampling p = {pct(m.candP[[...draws.counts.keys()][0]], 2)} · seed {seed}</span>
                </div>
              )}
              {draws && draws.n > 1 && (
                <div className="hist">
                  {[...draws.counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([row, cnt]) => (
                    <div key={row} className="hist-row">
                      <span className="tk-name">{tokL(data.top[row].t, 14)}</span>
                      <span className="tk-track"><span className="tk-bar kept" style={{ width: `${cnt}%` }} /></span>
                      <span className="tk-pct">{cnt}× <em>expected {pct(m.candP[row], 0)}</em></span>
                    </div>
                  ))}
                </div>
              )}
              <div className="cap">
                browser RNG (mulberry32) over the renormalized candidate set — the reproducibility contract of
                <code className="inline"> SamplingParams(seed=…)</code>. Fix the seed, shrink top-p, draw again: same seed, different pick.
              </div>
            </div>
            <div className="panel" id="generate">
              <h4>generate 8 tokens with these settings</h4>
              <div className="draw-ctl">
                <label className="greedy-chk">
                  <input type="checkbox" checked={wantGreedy} onChange={(e) => setWantGreedy(e.target.checked)} />
                  also run greedy baseline
                </label>
                <button className="lab-btn" onClick={runGenerate} disabled={genBusy || status !== 'live'}>
                  {genBusy ? <><Spin />generating… (~1s/token)</> : 'generate'}
                </button>
                {gen && <span className="chip">{gen.ms.toLocaleString()} ms total</span>}
              </div>
              {genErr && <div className="callout trap" style={{ margin: '4px 0' }}><div className="co-title">error</div>{genErr}</div>}
              {!gen && !genErr && <div className="draw-empty">full forward pass per token — Day 4 adds the KV cache that makes this cheap</div>}
              {gen && (
                <>
                  <div className="gen-text">
                    <span className="gp">{gen.prompt}</span><span className="gc">{gen.continuation}</span>
                  </div>
                  {gen.greedy_continuation != null && (
                    <div className="gen-text">
                      <span className="gp">{gen.prompt}</span><span className="gc g">{gen.greedy_continuation}</span>
                      <span className="gen-tag">greedy (T=0)</span>
                    </div>
                  )}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data">
                      <thead><tr><th>step</th><th>picked</th><th>p</th><th>raw rank</th><th>candidates</th><th>runner-ups (post-T)</th></tr></thead>
                      <tbody>
                        {gen.steps.map((s, i) => (
                          <tr key={i}>
                            <td className="mono">{i + 1}</td>
                            <td className="mono"><b>{tokL(s.t, 14)}</b></td>
                            <td className="mono">{pct(s.p, 1)}</td>
                            <td className="mono">#{s.rank}</td>
                            <td className="mono">{s.cand.toLocaleString()}</td>
                            <td className="mono">{s.top5.slice(0, 3).map((t) => `${tokL(t.t, 10)} ${pct(t.p, 1)}`).join(' · ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="cap">“raw rank” exposes near-misses — a tail token still lands in the text whenever the nucleus admits it.</div>
            </div>
          </div>
        </Sec>
      )}

      {/* ── 09 notes ── */}
      <Sec id="notes" num="09" title="Accuracy &amp; things to try">
        <div className="callout disc">
          <div className="co-title">where the numbers come from</div>
          <code className="inline">sampler_server.py</code> loads the Day-1 weights, Day-2 tokenizer and Day-3 forward
          pass and ships the top-512 raw logits plus exact full-vocab grids: <code className="inline">logZ(T)</code>,
          <code className="inline"> H(T)</code>, <code className="inline"> nucleus-size(p)</code>. Bar probabilities use the
          full-vocab Z — true probabilities. Only while the repetition penalty is on does the page renormalize over the
          shown 512 (it says so, and the coverage stat shows the mass involved).
        </div>
        <div className="callout warn">
          <div className="co-title">things to try</div>
          <strong>“The capital of France is”</strong> — peaked: nucleus @ p=0.9 is a handful of tokens. Then
          <strong> “The meaning of life is”</strong> — flat: the nucleus explodes to hundreds, top-k=10 destroys most of the
          mass, entropy climbs toward the uniform ceiling. Finally: seed=42, draw 1, then shrink top-p and draw again —
          same seed, different pick. That is the entire sampling story.
        </div>
      </Sec>
    </div>
  )
}
