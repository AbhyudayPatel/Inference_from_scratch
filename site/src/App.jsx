import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { DAYS, LABS } from './registry.js'
import Home from './pages/Home.jsx'

/* ── hash router: #/  ·  #/day-01  ·  #/day-01/section-id ────────────── */
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [slug, section] = h.split('/')
  return { slug: slug || '', section: section || '' }
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) {
      return (
        <div className="load-err">
          <strong>failed to render this page.</strong>{'\n\n'}
          {String(this.state.err && this.state.err.stack || this.state.err)}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [route, setRoute] = useState(parseHash())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? (el.scrollTop / max) * 100 : 0)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  const day = DAYS.find((d) => d.slug === route.slug)
  const lab = route.slug === 'lab' ? LABS.find((l) => l.slug === route.section) : null

  return (
    <>
      <div className="progress" style={{ width: `${progress}%` }} />
      <div className="app">
        <aside className="sidebar">
          <div className="brand"><a href="#/">Inference From Scratch</a></div>
          <div className="brand-sub">LLM engines, rebuilt by hand</div>
          {DAYS.map((d) => {
            const dLab = LABS.find((l) => l.slug === d.slug)
            return (
              <div className="nav-day" key={d.slug}>
                <a href={`#/${d.slug}`}
                   className={`${d.status === 'locked' ? 'locked' : ''} ${route.slug === d.slug ? 'active' : ''}`}>
                  <span className="num">{d.num}</span>
                  {d.title}
                  {d.status === 'locked' && <span className="lock">🔒</span>}
                </a>
                {dLab && d.status !== 'locked' && (
                  <a className={`nav-lab ${route.slug === 'lab' && route.section === dLab.slug ? 'active' : ''}`}
                     href={`#/lab/${dLab.slug}`}>▸ live lab</a>
                )}
              </div>
            )
          })}
        </aside>
        <div className="content">
          <main className={`article ${route.slug === 'lab' ? 'wide' : ''}`}>
            {!route.slug && <Home />}
            {route.slug === 'lab' && lab && <LabPage lab={lab} />}
            {route.slug === 'lab' && !lab && (
              <div className="load-err">unknown lab. try #/lab/day-03 or #/lab/day-04.</div>
            )}
            {route.slug && route.slug !== 'lab' && day && day.status !== 'locked' && <DayPage day={day} section={route.section} />}
            {route.slug && route.slug !== 'lab' && (!day || day.status === 'locked') && (
              <div className="load-err">this day doesn't exist yet — or it's still locked.</div>
            )}
          </main>
          {route.slug && day && day.sections && (
            <RightRail sections={day.sections} slug={day.slug} active={route.section} />
          )}
        </div>
      </div>
    </>
  )
}

function DayPage({ day, section }) {
  const [Comp, setComp] = useState(null)
  const [loadErr, setLoadErr] = useState(null)

  useEffect(() => {
    setComp(null); setLoadErr(null)
    day.load()
      .then((m) => setComp(() => m.default))
      .catch((e) => setLoadErr(e))
  }, [day.slug])

  // scroll to section after content arrives
  useEffect(() => {
    if (!Comp) return
    if (section) {
      const el = document.getElementById(section)
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [Comp, section])

  if (loadErr) {
    return (
      <div className="load-err">
        <strong>failed to load {day.slug}.</strong>{'\n'}
        chunk missing? rebuild + hard-refresh (Ctrl+F5).{'\n\n'}
        {String(loadErr.stack || loadErr)}
      </div>
    )
  }
  if (!Comp) return <div className="loading">loading day…</div>
  return (
    <ErrorBoundary key={day.slug}>
      <Suspense fallback={<div className="loading">rendering…</div>}>
        <Comp />
      </Suspense>
    </ErrorBoundary>
  )
}

function LabPage({ lab }) {
  const [Comp, setComp] = useState(null)
  const [loadErr, setLoadErr] = useState(null)

  useEffect(() => {
    setComp(null); setLoadErr(null)
    lab.load()
      .then((m) => setComp(() => m.default))
      .catch((e) => setLoadErr(e))
    window.scrollTo(0, 0)
  }, [lab.slug])

  if (loadErr) {
    return (
      <div className="load-err">
        <strong>failed to load the lab.</strong>{'\n'}
        rebuild + hard-refresh (Ctrl+F5).{'\n\n'}
        {String(loadErr.stack || loadErr)}
      </div>
    )
  }
  if (!Comp) return <div className="loading">loading lab…</div>
  return (
    <ErrorBoundary key={lab.slug}>
      <Suspense fallback={<div className="loading">rendering…</div>}>
        <Comp />
      </Suspense>
    </ErrorBoundary>
  )
}

function RightRail({ sections, slug, active }) {
  const [current, setCurrent] = useState(active)
  useEffect(() => {
    const spy = () => {
      let cur = sections[0]?.id
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top < 140) cur = s.id
      }
      setCurrent(cur)
    }
    document.addEventListener('scroll', spy, { passive: true })
    spy()
    return () => document.removeEventListener('scroll', spy)
  }, [slug])

  return (
    <nav className="rail">
      <div className="rail-title">On this page</div>
      {sections.map((s) => (
        <a key={s.id} href={`#/${slug}/${s.id}`}
           className={current === s.id ? 'current' : ''}
           onClick={() => setCurrent(s.id)}>
          {s.label}
        </a>
      ))}
    </nav>
  )
}
