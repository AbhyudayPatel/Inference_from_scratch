/* Sampling Lab — API + math helpers.
   The server (Day03 code/sampler_server.py) ships REAL GPT-2 logits plus exact
   full-vocab grids (logZ(T), entropy(T), nucleus sizes). All slider math below
   is exact against those grids — no fake numbers anywhere. */

export const API = 'http://127.0.0.1:8600'

export async function health() {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 1500)
  try {
    const r = await fetch(`${API}/api/health`, { signal: ctl.signal })
    return r.ok ? await r.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function analyze(prompt) {
  const r = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'analyze failed')
  return j
}

export async function generate(body) {
  const r = await fetch(`${API}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'generate failed')
  return j
}

/* ── exact grid interpolation (logZ and entropy are smooth in T) ─────── */
export function interpGrid(grid, T) {
  const ts = grid.ts
  if (T <= ts[0]) return { logZ: grid.logZ[0], H: grid.H[0] }
  if (T >= ts[ts.length - 1]) return { logZ: grid.logZ[ts.length - 1], H: grid.H[ts.length - 1] }
  const step = ts[1] - ts[0]
  const f = (T - ts[0]) / step
  const i = Math.floor(f)
  const a = f - i
  return {
    logZ: grid.logZ[i] * (1 - a) + grid.logZ[i + 1] * a,
    H: grid.H[i] * (1 - a) + grid.H[i + 1] * a,
  }
}

/* p_i(T) = exp(z_i / T − logZ(T)) — exact over the full 50,257-token vocab */
export function probAt(z, T, logZ) {
  return Math.exp(z / T - logZ)
}

/* nearest server-exact nucleus size for (T, p) from the reference grid */
export function nucleusExact(nucleus, T, p) {
  if (p >= 1) return null
  let ti = 0
  for (let i = 1; i < nucleus.temps.length; i++) {
    if (Math.abs(nucleus.temps[i] - T) < Math.abs(nucleus.temps[ti] - T)) ti = i
  }
  const pi = Math.min(nucleus.ps.length - 1, Math.max(0, Math.round(p * 100) - 1))
  return { size: nucleus.sizes[ti][pi], refT: nucleus.temps[ti] }
}

/* ── deterministic browser RNG for the draw simulator ────────────────── */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── display helpers ─────────────────────────────────────────────────── */
export const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`
export const fixed = (x, d = 3) => Number(x).toFixed(d)

/* token text with visible whitespace, JSON-quoted: ' the' -> '" the"', '\n' -> '"\\n"' */
export function tokLabel(s, max = 18) {
  let q = JSON.stringify(s)
  if (q.length > max) q = q.slice(0, max - 2) + '…"'
  return q
}
