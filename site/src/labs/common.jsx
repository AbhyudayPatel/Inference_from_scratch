import React, { useEffect, useState } from 'react'

/* Shared plumbing for the live labs (#/lab/*). The labs are thin React shells
   over each day's Python backend — every number you see was computed live. */

export const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`
export const fixed = (x, d = 3) => Number(x).toFixed(d)
export const tokL = (s, m = 18) => {
  const q = JSON.stringify(s)
  return q.length > m ? q.slice(0, m - 2) + '…"' : q
}
export const PALETTE = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777', '#65a30d']

export async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'request failed')
  return j
}

/* ping the day's python server; returns 'checking' | 'live' | 'offline' */
export function useHealth(base) {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    let dead = false
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 2000)
    fetch(`${base}/api/health`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((h) => { if (!dead) setStatus(h && h.ok ? 'live' : 'offline') })
      .catch(() => { if (!dead) setStatus('offline') })
      .finally(() => clearTimeout(t))
    return () => { dead = true; ctl.abort() }
  }, [base])
  return status
}

export function StatusBadge({ status, label }) {
  if (status === 'checking') return <span className="badge">connecting to engine…</span>
  if (status === 'live') return <span className="badge done">LIVE · {label}</span>
  return <span className="badge bad">engine offline</span>
}

export function OfflineNote({ server }) {
  return (
    <div className="callout trap">
      <div className="co-title">the engine behind this lab is not running</div>
      Start it, then reload this page: <code className="inline">{server}</code>
      — it loads the real Day-built NumPy model / simulators and serves this page's data on localhost.
    </div>
  )
}

/* section header with in-page anchor scroll nav */
export function LabNav({ items }) {
  return (
    <div className="labnav">
      {items.map(([id, label]) => (
        <button key={id} className="chip preset" onClick={() => {
          const el = document.getElementById(id)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}>{label}</button>
      ))}
    </div>
  )
}

export function Sec({ id, num, title, sub, children }) {
  return (
    <section className="lab-sec" id={id}>
      <div className="lab-sec-head">
        <span className="ls-num">{num}</span>
        <h2>{title}</h2>
      </div>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </section>
  )
}

export function Stat({ k, v, u }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className="stat-v">{v}</div>
      <div className="stat-u">{u || ''}</div>
    </div>
  )
}

export function Slider({ label, v, set, min, max, step, fmt, desc }) {
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

export function Spin() {
  return <span className="spin" />
}

/* collapsible "experiment yourself" areas — story first, knobs on demand */
export function Collapse({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`lab-collapse ${open ? 'open' : ''}`}>
      <button className="lab-collapse-head" onClick={() => setOpen(!open)}>
        <span className="lc-arrow">{open ? '▾' : '▸'}</span> {title}
        <span className="lc-hint">{open ? 'hide' : 'show'}</span>
      </button>
      {open && <div className="lab-collapse-body">{children}</div>}
    </div>
  )
}

/* story paragraph with accent left border */
export function Story({ children }) {
  return <div className="story-p">{children}</div>
}

/* "what just happened" strip under a visual */
export function Takeaway({ children }) {
  return (
    <div className="takeaway">
      <span className="tw-tag">so what</span>
      <span>{children}</span>
    </div>
  )
}
