/* Day-3 Sampling Lab — API + math helpers.
   Backend: Day03_Forward_Pass_From_Scratch/code/sampler_server.py (port 8600).
   It ships REAL GPT-2 logits + exact full-vocab grids (logZ(T), H(T), nucleus
   sizes); everything below is exact against those grids. */

export const API = 'http://127.0.0.1:8600'

import { post } from '../common.jsx'

export const analyze = (prompt) => post(`${API}/api/analyze`, { prompt })
export const generate = (body) => post(`${API}/api/generate`, body)

/* exact grid interpolation (logZ and H are smooth in T; step 0.025) */
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
export const probAt = (z, T, logZ) => Math.exp(z / T - logZ)

export function nucleusExact(nucleus, T, p) {
  if (p >= 1) return null
  let ti = 0
  for (let i = 1; i < nucleus.temps.length; i++) {
    if (Math.abs(nucleus.temps[i] - T) < Math.abs(nucleus.temps[ti] - T)) ti = i
  }
  const pi = Math.min(nucleus.ps.length - 1, Math.max(0, Math.round(p * 100) - 1))
  return { size: nucleus.sizes[ti][pi], refT: nucleus.temps[ti] }
}

/* deterministic browser RNG for the draw simulator */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
