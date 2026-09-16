import React from 'react'
import { fixed, pct, tokL } from '../common.jsx'

const INK3 = '#9a9aa0'
const LINE = '#d9d9de'
const MONO = 'ui-monospace, Menlo, Consolas, monospace'
const N_PARAMS = 124_439_808

/* ── Lab 1: per-step wall time, naive vs cached (optionally animated) ───── */
export function StepBars({ naive, cached, prefixLens, upto }) {
  const n = naive.length
  const W = 560, H = 210, l = 46, b = 30, t = 14, r = 12
  const w = W - l - r, h = H - t - b
  const yMax = Math.max(...naive, ...cached) * 1.18
  const gw = w / n, bw = Math.min(26, (gw - 14) / 2)
  const show = (i) => upto == null || i <= upto
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={l} x2={W - r} y1={t + h - f * h} y2={t + h - f * h} stroke={LINE} strokeWidth="0.6" />
          <text x={l - 6} y={t + h - f * h + 3} textAnchor="end" fontSize="9" fill={INK3} fontFamily={MONO}>{Math.round(yMax * f)}</text>
        </g>
      ))}
      {naive.map((nv, i) => {
        const cx = l + gw * i + gw / 2
        const hn = show(i) ? nv / yMax * h : 0
        const hc = show(i) ? cached[i] / yMax * h : 0
        const hot = upto === i
        return (
          <g key={i} opacity={show(i) ? 1 : 0.25}>
            <rect className="anim-rect" x={cx - bw - 2} y={t + h - hn} width={bw} height={hn} rx="3"
              fill="#dc2626" opacity={hot ? 1 : 0.85} stroke={hot ? '#7f1d1d' : 'none'} strokeWidth={hot ? 1.5 : 0}>
              <title>naive step {i + 1}: {nv} ms (prefix {prefixLens[i]} tokens)</title>
            </rect>
            <rect className="anim-rect" x={cx + 2} y={t + h - hc} width={bw} height={hc} rx="3"
              fill="#4f46e5" stroke={hot ? '#312e81' : 'none'} strokeWidth={hot ? 1.5 : 0}>
              <title>cached step {i + 1}: {cached[i]} ms</title>
            </rect>
            {show(i) && (
              <>
                <text x={cx - bw / 2 - 2} y={t + h - hn - 4} textAnchor="middle" fontSize="8.5" fill="#991b1b" fontFamily={MONO}>{Math.round(nv)}</text>
                <text x={cx + bw / 2 + 2} y={t + h - hc - 4} textAnchor="middle" fontSize="8.5" fill="#4f46e5" fontFamily={MONO}>{Math.round(cached[i])}</text>
              </>
            )}
            <text x={cx} y={H - b + 14} textAnchor="middle" fontSize="9" fill={hot ? '#1d1d1f' : INK3} fontFamily={MONO} fontWeight={hot ? '700' : '400'}>{i + 1}</text>
          </g>
        )
      })}
      <text x={l + w / 2} y={H - 4} textAnchor="middle" fontSize="9" fill={INK3} fontFamily={MONO}>decode step → (ms)</text>
    </svg>
  )
}

/* ── Lab 1: FLOP growth — naive 2·N·(P+s) vs cached 2·N·1 ──────────────── */
export function FlopLines({ P, n }) {
  const W = 560, H = 210, l = 46, b = 30, t = 14, r = 12
  const w = W - l - r, h = H - t - b
  const gf = (v) => v / 1e9
  const fn = [], fc = []
  for (let i = 0; i < n; i++) { fn.push(gf(2 * N_PARAMS * (P + i))); fc.push(gf(2 * N_PARAMS)) }
  const fMax = Math.max(...fn) * 1.15
  const fx = (i) => l + (n === 1 ? w / 2 : (w * i) / (n - 1))
  const fy = (v) => t + h - (v / fMax) * h
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={l} x2={W - r} y1={t + h - f * h} y2={t + h - f * h} stroke={LINE} strokeWidth="0.6" />
          <text x={l - 6} y={t + h - f * h + 3} textAnchor="end" fontSize="9" fill={INK3} fontFamily={MONO}>{(fMax * f).toFixed(1)}</text>
        </g>
      ))}
      <polyline points={fn.map((v, i) => `${fx(i)},${fy(v)}`).join(' ')} fill="none" stroke="#dc2626" strokeWidth="2.2" />
      <polyline points={fc.map((v, i) => `${fx(i)},${fy(v)}`).join(' ')} fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeDasharray="5 4" />
      {fn.map((v, i) => (
        <g key={i}>
          <circle cx={fx(i)} cy={fy(v)} r="3" fill="#dc2626" />
          <circle cx={fx(i)} cy={fy(fc[i])} r="3" fill="#4f46e5" />
        </g>
      ))}
      <text x={fx(n - 1) - 4} y={fy(fn[n - 1]) - 7} textAnchor="end" fontSize="9" fill="#dc2626" fontFamily={MONO}>{fn[n - 1].toFixed(2)}</text>
      <text x={l + w / 2} y={H - 4} textAnchor="middle" fontSize="9" fill={INK3} fontFamily={MONO}>decode step → (GFLOP, weight GEMMs)</text>
    </svg>
  )
}

/* ── Lab 1: equivalence probe, log scale ────────────────────────────────── */
export function DiffDots({ diffs }) {
  const W = 560, H = 210, l = 46, b = 26, t = 14, r = 12
  const w = W - l - r, h = H - t - b
  const TH = 1e-3
  const n = diffs.length
  const lo = -5, hi = Math.log10(Math.max(...diffs, TH) * 3)
  const logy = (v) => t + h - ((Math.log10(v) - lo) / (hi - lo)) * h
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[1e-5, 1e-4, 1e-3].map((v) => (
        <g key={v}>
          <line x1={l} x2={W - r} y1={logy(v)} y2={logy(v)} stroke={v === TH ? '#dc2626' : LINE}
            strokeWidth={v === TH ? 1 : 0.6} strokeDasharray={v === TH ? '5 4' : ''} />
          <text x={l - 6} y={logy(v) + 3} textAnchor="end" fontSize="9" fill={v === TH ? '#dc2626' : INK3} fontFamily={MONO}>{v.toExponential(0)}</text>
        </g>
      ))}
      {diffs.map((v, i) => {
        const x = l + w * (n === 1 ? 0.5 : i / (n - 1))
        const ok = v < TH
        return (
          <g key={i}>
            <circle cx={x} cy={logy(v)} r="4" fill={ok ? '#059669' : '#dc2626'}>
              <title>step {i + 1}: {v.toExponential(2)}</title>
            </circle>
            <text x={x} y={logy(v) - 8} textAnchor="middle" fontSize="8" fill={ok ? '#059669' : '#dc2626'} fontFamily={MONO}>{v.toExponential(0)}</text>
          </g>
        )
      })}
      <text x={l + w / 2} y={H - 4} textAnchor="middle" fontSize="9" fill={INK3} fontFamily={MONO}>decode step → (log scale)</text>
    </svg>
  )
}

/* ── Lab 2: physical block pool (cells pop in, staggered, on each beat) ─── */
export function PoolGrid({ blocks, blockSize, animate = true }) {
  return (
    <div className="pool">
      {blocks.map((b) => (
        <div key={b.id} className={`blk ${b.free ? 'free' : ''}`}>
          <div className="bh"><span>#{b.id}</span>{b.free ? <span>free</span> : (b.refs > 1 ? <span className="refs">×{b.refs}</span> : <span />)}</div>
          <div className="cells">
            {Array.from({ length: blockSize }, (_, i) => {
              const s = b.slots[i]
              return (
                <span key={i} className={`cell ${s && animate ? 'pop' : ''}`}
                  style={s ? { background: s.c, animationDelay: `${Math.min(i * 22, 400)}ms` } : {}}
                  title={s ? `${s.o} token #${s.p}` : 'empty slot'} />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Lab 3: GPU gantt lane (with optional moving clock cursor) ──────────── */
export function Gantt({ pol, span, cursor }) {
  return (
    <div className="gantt-wrap2">
      <div className="gantt-lane">
        {cursor != null && <div className="gantt-cursor" style={{ left: `${(cursor / span) * 100}%` }} />}
        {pol.events.map((e, i) => {
          const L = (e.t0 / span) * 100
          const Wd = Math.max(0.3, ((e.t1 - e.t0) / span) * 100)
          const isPre = e.label.includes('PREEMPT')
          const isPf = e.label.includes('prefill')
          const cls = isPre ? 'pr' : isPf ? 'pf' : 'dc'
          return (
            <div key={i} className={`seg ${cls}`}
              style={isPre ? { left: `${L}%` } : { left: `${L}%`, width: `${Wd}%` }}
              title={`${e.label} · ${e.t0}–${e.t1} ms`}>
              {!isPre && Wd > (isPf ? 7 : 10) ? (isPf ? e.label.replace('prefill ', 'P·') : e.label) : ''}
            </div>
          )
        })}
      </div>
      <div className="gantt-axis">
        {[0, 1, 2, 3, 4].map((f) => <span key={f} style={{ left: `${f * 25}%` }}>{Math.round((span * f) / 4)}</span>)}
      </div>
    </div>
  )
}

/* ── Lab 3: per-request wait/active lanes ───────────────────────────────── */
export function ReqLanes({ pol, span }) {
  return (
    <>
      <div className="lane-lbl">per-request lanes</div>
      {pol.reqs.map((q) => (
        <div key={q.name} className="rq-lane">
          <span className="nm">{q.name}</span>
          <div className="rq-track">
            <div className="seg wait" style={{ left: `${(q.arrival / span) * 100}%`, width: `${Math.max(0.4, ((q.t_first - q.arrival) / span) * 100)}%` }}
              title={`waiting ${Math.round(q.t_first - q.arrival)} ms`} />
            <div className="seg run" style={{ left: `${(q.t_first / span) * 100}%`, width: `${Math.max(0.4, ((q.t_end - q.t_first) / span) * 100)}%` }}
              title={`active ${Math.round(q.t_end - q.t_first)} ms`} />
            {q.preempted > 0 && <div className="flag" style={{ left: `${(q.t_end / span) * 100}%` }} title={`preempted ${q.preempted}×`} />}
          </div>
        </div>
      ))}
    </>
  )
}

/* ── Lab 4: bug cards (staggered reveal) ────────────────────────────────── */
export function BugGrid({ bugs, oracle }) {
  return (
    <div className="bug-grid">
      {bugs.map((b, bi) => (
        <div key={b.id} className={`bug fade-up ${b.ok ? 'ok' : 'wrong'}`} style={{ animationDelay: `${bi * 110}ms` }}>
          <div className="bh">
            <span className="bn">{b.id}. {b.name}</span>
            <span className={`badge ${b.ok ? 'done' : ''} ${b.ok ? '' : 'bad'}`}>
              {b.id === 0 ? 'ORACLE' : b.ok ? 'still OK' : 'WRONG (silent)'}
            </span>
          </div>
          <div className="out">
            → {tokL(b.output, 30)}
            {b.id > 0 && b.id !== 1 && <span style={{ color: 'var(--ink-3)', fontSize: 11 }}> (oracle: {tokL(oracle)})</span>}
          </div>
          {b.drift != null && (
            <>
              <div className="drift-track">
                <div className="drift-bar" style={{ width: `${Math.min(100, (Math.log10(1 + b.drift) / Math.log10(40)) * 100)}%` }} />
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--red)', marginTop: 3 }}>logit drift {b.drift.toFixed(1)}</div>
            </>
          )}
          <div className="dt">{b.detail}</div>
        </div>
      ))}
    </div>
  )
}
