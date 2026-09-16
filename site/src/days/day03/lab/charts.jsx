import React from 'react'

/* Hand-built SVG charts in the journal's design tokens. All values are props —
   the parent recomputes them live from the real logits on every slider tick. */

const INK3 = '#9a9aa0'
const LINE = '#d9d9de'
const ACCENT = '#4f46e5'
const AMBER = '#d97706'
const GREEN = '#059669'

function XLog({ n, l, w }) {
  // rank r (1..n) -> x px, log10 scale
  const max = Math.log10(n)
  return (r) => l + (Math.log10(Math.max(1, r)) / max) * w
}

function AxisText({ x, y, children, anchor = 'middle' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize="9" fill={INK3}
      fontFamily="ui-monospace, Menlo, Consolas, monospace">{children}</text>
  )
}

/* ── Nucleus chart: cumulative mass vs rank (log x), p-line + cutoff ─────── */
export function NucleusChart({ cum, p, cutoff, coverage }) {
  const W = 560, H = 190, l = 42, r = 12, t = 12, b = 26
  const w = W - l - r, h = H - t - b
  const n = cum.length
  const xp = XLog({ n, l, w })
  const yp = (v) => t + (1 - v) * h
  const pts = cum.map((c, i) => `${xp(i + 1).toFixed(1)},${yp(c).toFixed(1)}`)
  const kept = cum.slice(0, cutoff).map((c, i) => `${xp(i + 1).toFixed(1)},${yp(c).toFixed(1)}`)
  const area = kept.length
    ? `M ${xp(1)},${yp(0)} L ${kept.join(' L ')} L ${xp(cutoff)},${yp(0)} Z`
    : ''
  const xticks = [1, 2, 5, 10, 20, 50, 100, 200, 500].filter((v) => v <= n)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={l} x2={W - r} y1={yp(v)} y2={yp(v)} stroke={LINE} strokeWidth="0.6" />
          <AxisText x={l - 6} y={yp(v) + 3} anchor="end">{v.toFixed(v ? 2 : 0)}</AxisText>
        </g>
      ))}
      {xticks.map((v) => (
        <g key={v}>
          <line x1={xp(v)} x2={xp(v)} y1={H - b} y2={H - b + 4} stroke={INK3} strokeWidth="0.7" />
          <AxisText x={xp(v)} y={H - b + 15}>{v}</AxisText>
        </g>
      ))}
      {area && <path d={area} fill={ACCENT} opacity="0.10" />}
      <polyline points={pts.join(' ')} fill="none" stroke={ACCENT} strokeWidth="2" />
      {p < 1 && (
        <>
          <line x1={l} x2={W - r} y1={yp(p)} y2={yp(p)} stroke={AMBER} strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={W - r - 4} y={yp(p) - 4} textAnchor="end" fontSize="9.5" fill={AMBER}
            fontFamily="ui-monospace, Menlo, Consolas, monospace">top-p = {p.toFixed(3)}</text>
          <line x1={xp(cutoff)} x2={xp(cutoff)} y1={t} y2={H - b} stroke={GREEN} strokeWidth="1.4" strokeDasharray="3 3" />
          <circle cx={xp(cutoff)} cy={yp(cum[cutoff - 1])} r="3.4" fill={GREEN} />
          <text x={xp(cutoff) + 6} y={t + 10} fontSize="9.5" fill={GREEN}
            fontFamily="ui-monospace, Menlo, Consolas, monospace">
            nucleus = {cutoff} token{cutoff > 1 ? 's' : ''}
          </text>
        </>
      )}
      <AxisText x={l + w / 2} y={H - 4}>rank (log scale, top-{n} shown)</AxisText>
      <AxisText x={14} y={t + h / 2} anchor="middle">{/* Σ */}</AxisText>
      <text x={l - 6} y={t + 4} textAnchor="end" fontSize="9" fill={INK3}
        fontFamily="ui-monospace, Menlo, Consolas, monospace" transform={`rotate(0)`}>Σp</text>
      {coverage < 0.999 && (
        <text x={W - r - 4} y={H - b - 6} textAnchor="end" fontSize="9" fill={INK3}
          fontFamily="ui-monospace, Menlo, Consolas, monospace">
          shown mass {(coverage * 100).toFixed(1)}%
        </text>
      )}
    </svg>
  )
}

/* ── generic multi-line sweep (temperature response, entropy) ────────────── */
export function SweepChart({ xs, series, x, yMax, xLabel, yFmt = (v) => v.toFixed(2), hline }) {
  const W = 560, H = 200, l = 44, r = 12, t = 12, b = 26
  const w = W - l - r, h = H - t - b
  const x0 = xs[0], x1 = xs[xs.length - 1]
  const yTop = yMax ?? Math.max(...series.flatMap((s) => s.ys), hline ? hline.y : 0) * 1.08
  const xp = (v) => l + ((v - x0) / (x1 - x0)) * w
  const yp = (v) => t + (1 - Math.min(v / yTop, 1)) * h
  const interp = (ys, v) => {
    if (v <= xs[0]) return ys[0]
    const step = xs[1] - xs[0]
    const f = (v - xs[0]) / step
    const i = Math.min(Math.floor(f), xs.length - 2)
    const a = f - i
    return ys[i] * (1 - a) + ys[i + 1] * a
  }
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yTop)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={l} x2={W - r} y1={yp(v)} y2={yp(v)} stroke={LINE} strokeWidth="0.6" />
          <AxisText x={l - 6} y={yp(v) + 3} anchor="end">{yFmt(v)}</AxisText>
        </g>
      ))}
      {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].filter((v) => v >= x0 && v <= x1).map((v) => (
        <g key={v}>
          <line x1={xp(v)} x2={xp(v)} y1={H - b} y2={H - b + 4} stroke={INK3} strokeWidth="0.7" />
          <AxisText x={xp(v)} y={H - b + 15}>{v.toFixed(2).replace(/0$/, '')}</AxisText>
        </g>
      ))}
      {hline && (
        <>
          <line x1={l} x2={W - r} y1={yp(hline.y)} y2={yp(hline.y)} stroke={INK3} strokeWidth="0.9" strokeDasharray="4 4" />
          <text x={W - r - 4} y={yp(hline.y) - 4} textAnchor="end" fontSize="9" fill={INK3}
            fontFamily="ui-monospace, Menlo, Consolas, monospace">{hline.label}</text>
        </>
      )}
      {series.map((s) => (
        <polyline key={s.label}
          points={s.ys.map((v, i) => `${xp(xs[i]).toFixed(1)},${yp(v).toFixed(1)}`).join(' ')}
          fill="none" stroke={s.color} strokeWidth="2" />
      ))}
      {x != null && (
        <line x1={xp(x)} x2={xp(x)} y1={t} y2={H - b} stroke={INK3} strokeWidth="1" strokeDasharray="3 3" />
      )}
      {x != null && series.map((s) => (
        <circle key={s.label} cx={xp(x)} cy={yp(interp(s.ys, x))} r="3.2" fill={s.color} />
      ))}
      <AxisText x={l + w / 2} y={H - 4}>{xLabel}</AxisText>
    </svg>
  )
}

/* ── Top-k mass curve ────────────────────────────────────────────────────── */
export function TopKChart({ cum, k }) {
  const W = 560, H = 190, l = 42, r = 12, t = 12, b = 26
  const w = W - l - r, h = H - t - b
  const n = cum.length
  const xp = XLog({ n, l, w })
  const yp = (v) => t + (1 - v) * h
  const pts = cum.map((c, i) => `${xp(i + 1).toFixed(1)},${yp(c).toFixed(1)}`)
  const xticks = [1, 2, 5, 10, 20, 50, 100, 200].filter((v) => v <= n)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={l} x2={W - r} y1={yp(v)} y2={yp(v)} stroke={LINE} strokeWidth="0.6" />
          <AxisText x={l - 6} y={yp(v) + 3} anchor="end">{v.toFixed(v ? 2 : 0)}</AxisText>
        </g>
      ))}
      {xticks.map((v) => (
        <g key={v}>
          <line x1={xp(v)} x2={xp(v)} y1={H - b} y2={H - b + 4} stroke={INK3} strokeWidth="0.7" />
          <AxisText x={xp(v)} y={H - b + 15}>{v}</AxisText>
        </g>
      ))}
      <polyline points={pts.join(' ')} fill="none" stroke={GREEN} strokeWidth="2" />
      {k > 0 && k <= n && (
        <>
          <line x1={xp(k)} x2={xp(k)} y1={t} y2={H - b} stroke={ACCENT} strokeWidth="1.4" strokeDasharray="3 3" />
          <circle cx={xp(k)} cy={yp(cum[k - 1])} r="3.4" fill={ACCENT} />
          <text x={xp(k) + 6} y={t + 10} fontSize="9.5" fill={ACCENT}
            fontFamily="ui-monospace, Menlo, Consolas, monospace">
            top-{k} keeps {(cum[k - 1] * 100).toFixed(1)}%
          </text>
        </>
      )}
      <AxisText x={l + w / 2} y={H - 4}>k (log scale)</AxisText>
    </svg>
  )
}
