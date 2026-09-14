import React from 'react'
import { Callout, Code, Diagram } from '../../components/ui.jsx'

const LADDER = `<svg width="700" height="268" viewBox="0 0 700 268">
  <defs><marker id="arr5" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4f46e5"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">The laziness ladder — same bytes, less movement per rung</text>
  <rect x="25" y="196" width="100" height="34" rx="7" fill="#eef2ff" stroke="#4f46e5" stroke-width="2"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="75" y="210" text-anchor="middle" font-weight="700">L0 · read() all</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="75" y="223" text-anchor="middle">file → RAM</text>
  <rect x="135" y="172" width="100" height="58" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="185" y="186" text-anchor="middle" font-weight="700">L1 · mmap</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="185" y="200" text-anchor="middle">zero-copy</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="185" y="213" text-anchor="middle">views</text>
  <rect x="245" y="148" width="100" height="82" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="295" y="162" text-anchor="middle" font-weight="700">L2 · lazy</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="295" y="176" text-anchor="middle">get_tensor /</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="295" y="189" text-anchor="middle">get_slice</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="295" y="202" text-anchor="middle">on demand</text>
  <rect x="355" y="124" width="100" height="106" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="405" y="138" text-anchor="middle" font-weight="700">L3 · sharded</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="152" text-anchor="middle">index.json</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="165" text-anchor="middle">routing +</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="178" text-anchor="middle">parallel</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="191" text-anchor="middle">threads</text>
  <rect x="465" y="100" width="100" height="130" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="515" y="114" text-anchor="middle" font-weight="700">L4 · TP slice</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="515" y="128" text-anchor="middle">at load · or</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="515" y="141" text-anchor="middle">stream straight</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="515" y="154" text-anchor="middle">to GPU VRAM</text>
  <rect x="575" y="76" width="100" height="154" rx="7" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="625" y="90" text-anchor="middle" font-weight="700">L5 · engine</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="625" y="104" text-anchor="middle">precompiled</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="625" y="117" text-anchor="middle">.plan — no</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="625" y="130" text-anchor="middle">weight parsing</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="625" y="143" text-anchor="middle">at serve time</text>
  <line x1="75" y1="160" x2="75" y2="190" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arr5)"/>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="75" y="152" text-anchor="middle" font-weight="700">YOU, today</text>
  <text font-family="monospace" font-size="9" fill="#059669" x="405" y="114" text-anchor="middle" font-weight="700">HF transformers</text>
  <text font-family="monospace" font-size="9" fill="#059669" x="515" y="90" text-anchor="middle" font-weight="700">vLLM / SGLang</text>
  <text font-family="monospace" font-size="9" fill="#059669" x="625" y="66" text-anchor="middle" font-weight="700">TRT-LLM</text>
  <line x1="20" y1="232" x2="680" y2="232" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="350" y="254" text-anchor="middle">RAM touched per load → less   ·   cold-start time → shorter   ·   GPU idle during load → none   (rungs 4–5: ⏭ later days)</text>
</svg>`

const MMAP = `<svg width="700" height="185" viewBox="0 0 700 185">
  <defs><marker id="arr6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="20" y="55" width="160" height="76" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="100" y="80" text-anchor="middle" font-weight="700">disk</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="98" text-anchor="middle">model.safetensors</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="114" text-anchor="middle">548 MB</text>
  <rect x="265" y="55" width="170" height="76" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#92400e" x="350" y="80" text-anchor="middle" font-weight="700">OS page cache (RAM)</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="98" text-anchor="middle">only pages you touch</text>
  <text font-family="monospace" font-size="9.5" fill="#92400e" x="350" y="114" text-anchor="middle">OS may evict freely</text>
  <rect x="520" y="55" width="160" height="76" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="600" y="80" text-anchor="middle" font-weight="700">your process</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="600" y="98" text-anchor="middle">tensor = pointer into</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="600" y="114" text-anchor="middle">page cache (zero-copy)</text>
  <line x1="180" y1="78" x2="260" y2="78" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr6)"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="220" y="68" text-anchor="middle">page fault on</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="220" y="122" text-anchor="middle">first touch</text>
  <line x1="435" y1="93" x2="515" y2="93" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr6)"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="475" y="83" text-anchor="middle">mmap()</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="165" text-anchor="middle">a 140 GB model "loads" on 16 GB RAM — you only ever fault in what you actually use</text>
</svg>`

const SHARDS = `<svg width="700" height="205" viewBox="0 0 700 205">
  <defs><marker id="arr14" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">model.safetensors.index.json — a name→file router (Qwen3-32B: 707 tensors, 17 shards, 65.5 GB)</text>
  <rect x="20" y="40" width="240" height="140" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="140" y="60" text-anchor="middle" font-weight="700">weight_map</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="82" text-anchor="middle">"model.embed_tokens…" → 00001</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="100" text-anchor="middle">"model.layers.0.mlp…" → 00001</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="118" text-anchor="middle">"model.layers.5.attn…" → 00002</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="136" text-anchor="middle">…</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="140" y="154" text-anchor="middle">"lm_head.weight" → 00017</text>
  <line x1="260" y1="82" x2="330" y2="62" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr14)"/>
  <line x1="260" y1="110" x2="330" y2="110" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr14)"/>
  <line x1="260" y1="140" x2="330" y2="158" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr14)"/>
  <rect x="335" y="40" width="170" height="38" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="420" y="64" text-anchor="middle">model-00001-of-00017</text>
  <rect x="335" y="92" width="170" height="38" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="420" y="116" text-anchor="middle">model-00002-of-00017</text>
  <rect x="335" y="144" width="170" height="38" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="420" y="168" text-anchor="middle">… 00017-of-00017</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="64" text-anchor="start">each shard: same</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="82" text-anchor="start">8B+JSON+bytes format</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="116" text-anchor="start">loader: enumerate all</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="134" text-anchor="start">shards, route by map,</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="168" text-anchor="start">load in parallel</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="545" y="186" text-anchor="start">threads ⏭</text>
</svg>`

const LIB_CODE = `from safetensors import safe_open          # Rust core (memmap2), not Python

with safe_open("models/model.safetensors", framework="pt") as f:
    f.keys()                          # 1 header only — instant, no data read
    w = f.get_tensor("wte.weight")    # 2 mmap'd view → ONE tensor materialized
    s = f.get_slice("wte.weight")     # 3 lazy slicer: read PART of a tensor
    s[:, :384]                        #    ← how tensor-parallel shards load`

export default function S7_Scale() {
  return (
    <>
      <h2 id="scale">Laziness, mmap, and shards</h2>
      <p className="sub">Nobody in production writes <code className="inline">buffer = f.read()</code>. Our parser is <strong>level 0</strong> of a ladder — every rung above is the same format, loaded more lazily. The format barely changes; the <em>laziness</em> is the engineering.</p>
      <Diagram svg={LADDER}
        caption="Same bytes, same JSON header at every rung. What changes is <strong>when</strong> data moves and <strong>whose</strong> memory it lands in." />
      <h3>Rung 1–2 · what the official <code className="inline">safetensors</code> library does</h3>
      <Code title="the library way — Rust core, mmap'd, lazy">{LIB_CODE}</Code>
      <ul>
        <li><strong>mmap, not read:</strong> the file is mapped into virtual memory; tensor bytes are <em>OS page-cache pages</em>, faulted in only when touched. "Loading" returns instantly.</li>
        <li><strong>Zero-copy:</strong> the tensor points at those pages directly — no intermediate buffer, no Python loop.</li>
        <li><strong>Validated:</strong> header size capped (100 MB), offsets bounds-checked — pickle's code-execution hole designed away.</li>
      </ul>
      <Diagram svg={MMAP}
        caption="Why engines love this format: the JSON header you parsed by hand is the <em>only</em> eager read. Everything else is page faults." />
      <h3>Rung 3 · when one file isn't enough — shard routing</h3>
      <Diagram svg={SHARDS}
        caption="One level of indirection on top of what you already built: <strong>hook 1 (enumerate)</strong> consults the router, then opens each shard exactly like our single file. Nothing else changes." />
      <Callout kind="info" title="The one-line takeaway">
        Model loading is a <strong>memory-management problem, not a parsing problem</strong>. The format barely
        matters; <em>when bytes move and whose memory they land in</em> is the entire game — the same game as
        KV-cache paging, as you'll see on Day 4.
      </Callout>
      <div className="divider" />
    </>
  )
}
