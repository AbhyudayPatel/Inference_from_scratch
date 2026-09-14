import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const TOK2KV = `<svg width="700" height="210" viewBox="0 0 700 210">
  <defs><marker id="karr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">token count is a resource multiplier: one tokenizer decision, five costs</text>
  <rect x="270" y="34" width="160" height="40" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="52" text-anchor="middle" font-weight="700">TOKENIZER</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="66" text-anchor="middle">token count n</text>
  <line x1="350" y1="74" x2="120" y2="106" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#karr)"/>
  <line x1="350" y1="74" x2="270" y2="106" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#karr)"/>
  <line x1="350" y1="74" x2="430" y2="106" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#karr)"/>
  <line x1="350" y1="74" x2="580" y2="106" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#karr)"/>
  <rect x="30" y="110" width="150" height="52" rx="8" fill="#fff" stroke="#d9d9de"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="105" y="130" text-anchor="middle" font-weight="700">PREFILL FLOPs</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="105" y="146" text-anchor="middle">~n² attention + n linear</text>
  <rect x="190" y="110" width="150" height="52" rx="8" fill="#fff" stroke="#d9d9de"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="265" y="130" text-anchor="middle" font-weight="700">KV CACHE ⏭ Day 4</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="265" y="146" text-anchor="middle">n × 2 × layers × kv-dim</text>
  <rect x="350" y="110" width="150" height="52" rx="8" fill="#fff" stroke="#d9d9de"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="425" y="130" text-anchor="middle" font-weight="700">LATENCY</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="425" y="146" text-anchor="middle">TTFT grows with n</text>
  <rect x="510" y="110" width="150" height="52" rx="8" fill="#fff" stroke="#d9d9de"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="585" y="130" text-anchor="middle" font-weight="700">THROUGHPUT</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="585" y="146" text-anchor="middle">fewer seqs fit in VRAM</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="350" y="192" text-anchor="middle">same 10,000 characters: 2,000 tokens vs 3,000 tokens = 1.5x cost. tokenizer choice = pricing.</text>
</svg>`

const VOCAB2PARAMS = `<svg width="700" height="150" viewBox="0 0 700 150">
  <defs><marker id="varr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">vocab size feeds two matrices (one, if tied)</text>
  <rect x="20" y="40" width="180" height="44" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="110" y="58" text-anchor="middle" font-weight="700">vocab_size V</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="110" y="74" text-anchor="middle">a TOKENIZER decision</text>
  <line x1="200" y1="52" x2="258" y2="46" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#varr)"/>
  <line x1="200" y1="72" x2="258" y2="98" stroke="#9a9aa0" stroke-width="1.4" marker-end="url(#varr)"/>
  <rect x="262" y="26" width="200" height="40" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="362" y="42" text-anchor="middle" font-weight="700">embedding  wte: [V, hidden]</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="362" y="56" text-anchor="middle">Qwen3: 151,936×1,024 = 155.6M params</text>
  <rect x="262" y="80" width="200" height="40" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="362" y="96" text-anchor="middle" font-weight="700">LM head: [hidden, V]</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="362" y="110" text-anchor="middle">softmax over V floats EVERY decode step</text>
  <rect x="500" y="40" width="180" height="66" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="590" y="60" text-anchor="middle" font-weight="700">verified live from configs:</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="590" y="76" text-anchor="middle">GPT-2: wte = 31% of 124.4M (tied)</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="590" y="91" text-anchor="middle">Qwen3: embed = 26% of 596.0M (tied)</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="350" y="140" text-anchor="middle">bigger vocab ⇒ fewer tokens but bigger matrices + pricier logits. the tradeoff has no free side.</text>
</svg>`

const VOCOAB_OUT = [
  ['p', '=== GPT-2 (vocab 50,257, hidden 768, tied) ==='],
  ['ok', 'total = 124,439,808  — EXACTLY the Day-1 parser count ✓'],
  'wte 38.6M (31.0%) · wpe 0.8M · body 85.1M',
  ['p', '=== Qwen3-0.6B (vocab 151,936, hidden 1024, tied) ==='],
  ['ok', 'total = 596.0M — matches HF exactly ✓'],
  'embed 155.6M (26.1%) · per layer: attn 6.3M + swiglu 9.4M = 15.7M',
]

export default function S8_Systems() {
  return (
    <>
      <h2 id="systems">Why serving systems care</h2>
      <p className="sub">The tokenizer sets the unit of everything an engine schedules, caches, and bills.</p>
      <Diagram svg={TOK2KV} caption="" />
      <h3>Vocab size ↔ model size (computed from the real configs)</h3>
      <Diagram svg={VOCAB2PARAMS} caption="" />
      <Term lines={VOCOAB_OUT} />
      <Callout kind="info" title="Token IDs are cache identity">
        <strong>Prefix caching</strong> (vLLM) reuses KV blocks when prompts share a token-ID prefix —
        so two textually-identical prompts that tokenize differently get <em>zero</em> cache hits.
        <strong> Continuous batching</strong> schedules per-token, not per-character.
        The engine's world is built of the integers this page produces.
      </Callout>
      <Callout kind="warn" title="Tokenizer performance is real engineering">
        Our cached pure-Python BPE: ~1.8 MB/s. HF <code className="inline">tokenizers</code> (Rust): ~100+ MB/s.
        The gap is pair caching, heap-based best-pair lookup, SIMD string scanning, zero-copy slices, and batch
        parallelism. At 10k requests/sec, tokenization is on the critical path — vLLM detokenizes incrementally
        per decode step. Same algorithm, different systems budget.
      </Callout>
      <div className="divider" />
    </>
  )
}
