import React, { useState } from 'react'

/* ── tiny regex-based Python highlighter (no external lib) ───────────── */
export function hi(src) {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(
    /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(import|from|as|def|class|return|if|elif|else|for|while|in|not|and|or|with|try|except|finally|raise|pass|break|continue|None|True|False|assert|lambda|yield|global|is)\b|\b(\d[\d_]*(?:\.\d+)?)\b|\b([a-zA-Z_][\w]*)(?=\s*\()/g,
    (m, cm, st, kw, num, fn) => {
      if (cm) return `<span class="cm">${m}</span>`
      if (st) return `<span class="st">${m}</span>`
      if (kw) return `<span class="kw">${m}</span>`
      if (num) return `<span class="num">${m}</span>`
      if (fn) return `<span class="fn">${m}</span>`
      return m
    }
  )
}

/* ── code block with mac dots + copy ─────────────────────────────────── */
export function Code({ title, children, bare }) {
  const [copied, setCopied] = useState(false)
  const text = typeof children === 'string' ? children.replace(/^\n/, '') : ''
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="code-wrap">
      <div className="code-head">
        <span className="dots"><span className="dot r" /><span className="dot y" /><span className="dot g" /></span>
        <span>{title || 'python'}</span>
        <button className="copy-btn" onClick={copy}>{copied ? 'copied ✓' : 'copy'}</button>
      </div>
      <pre dangerouslySetInnerHTML={{ __html: hi(text) }} />
    </div>
  )
}

/* ── terminal output ─────────────────────────────────────────────────── */
/* lines: array of strings, or ['p'|'ok'|'bad'|'dim', text] tuples */
export function Term({ lines }) {
  const html = lines
    .map((l) => {
      if (Array.isArray(l)) return `<span class="${l[0]}">${escH(l[1])}</span>`
      return escH(l)
    })
    .join('\n')
  return <pre className="term" dangerouslySetInnerHTML={{ __html: html }} />
}
function escH(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ── callout ─────────────────────────────────────────────────────────── */
export function Callout({ kind = 'info', title, children }) {
  return (
    <div className={`callout ${kind}`}>
      {title && <div className="co-title">{title}</div>}
      {children}
    </div>
  )
}

/* ── badges row ──────────────────────────────────────────────────────── */
export function Badges({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
      {items.map(([label, state], i) => (
        <span key={i} className={`badge ${state === 'done' ? 'done' : ''}`}>{label}</span>
      ))}
    </div>
  )
}

/* ── timeline ────────────────────────────────────────────────────────── */
export function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((it, i) => (
        <div key={i} className={`tl-item ${it.state || ''}`}>
          <div className="tl-head"><span className="tl-tag">{it.tag}</span>{it.head}</div>
          <div className="tl-body">{it.body}</div>
        </div>
      ))}
    </div>
  )
}

/* ── math block (html string with .hl / .res spans) ──────────────────── */
export function Math({ html }) {
  return <div className="math" dangerouslySetInnerHTML={{ __html: html.replace(/^\n/, '') }} />
}

/* ── diagram: svg string + caption ───────────────────────────────────── */
export function Diagram({ svg, caption }) {
  return (
    <div className="diagram">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {caption && <div className="cap" dangerouslySetInnerHTML={{ __html: caption }} />}
    </div>
  )
}

/* ── data table ──────────────────────────────────────────────────────── */
export function Tbl({ head, children }) {
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="data">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
export function R({ cells, monoCols = [] }) {
  return (
    <tr>
      {cells.map((c, i) => (
        <td key={i} className={monoCols.includes(i) ? 'mono' : ''}
            dangerouslySetInnerHTML={{ __html: c }} />
      ))}
    </tr>
  )
}

/* ── collapsible ─────────────────────────────────────────────────────── */
export function Details({ summary, children, open }) {
  return (
    <details open={open}>
      <summary>{summary}</summary>
      <div className="det-body">{children}</div>
    </details>
  )
}
