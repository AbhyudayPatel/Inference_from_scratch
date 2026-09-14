import React from 'react'
import { Callout, Diagram, Timeline, Tbl, R } from '../../components/ui.jsx'

const BOOT = `<svg width="700" height="225" viewBox="0 0 700 225">
  <defs><marker id="arr15" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="18">boot = load once, then serve forever</text>
  <rect x="20" y="40" width="150" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="95" y="60" text-anchor="middle" font-weight="700">1 · config</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="95" y="76" text-anchor="middle">→ architecture registry</text>
  <line x1="170" y1="66" x2="190" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="194" y="40" width="150" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="269" y="60" text-anchor="middle" font-weight="700">2 · model skeleton</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="269" y="76" text-anchor="middle">meta device: shapes only</text>
  <line x1="344" y1="66" x2="364" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="368" y="40" width="150" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="443" y="60" text-anchor="middle" font-weight="700">3 · 4-hook load</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="443" y="76" text-anchor="middle">enumerate-filter-map-place</text>
  <line x1="518" y1="66" x2="538" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="542" y="40" width="150" height="52" rx="9" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="617" y="60" text-anchor="middle" font-weight="700">4 · CPU → GPU</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="617" y="76" text-anchor="middle">H2D copy, pinned memory</text>
  <line x1="617" y1="92" x2="617" y2="118" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="542" y="122" width="150" height="52" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="617" y="142" text-anchor="middle" font-weight="700">5 · profiling run</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="617" y="158" text-anchor="middle">measure → size KV cache ⏭</text>
  <line x1="542" y1="148" x2="522" y2="148" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="368" y="122" width="150" height="52" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="443" y="142" text-anchor="middle" font-weight="700">6 · CUDA graphs</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="443" y="158" text-anchor="middle">capture kernels ⏭</text>
  <line x1="368" y1="148" x2="348" y2="148" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr15)"/>
  <rect x="194" y="122" width="150" height="52" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="269" y="142" text-anchor="middle" font-weight="700">READY</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="269" y="158" text-anchor="middle">weights never move again</text>
  <text font-family="monospace" font-size="10.5" fill="#4f46e5" x="20" y="112" font-weight="700">◄ TODAY'S SCOPE (steps 1–4)</text>
  <text font-family="monospace" font-size="10.5" fill="#b45309" x="368" y="196">steps 5–6 are runtime memory/kernel management ⏭ later days</text>
</svg>`

const VRAM = `<svg width="700" height="195" viewBox="0 0 700 195">
  <defs><marker id="arr17" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="80" y="50" width="320" height="50" rx="8" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="240" y="70" text-anchor="middle" font-weight="700">MODEL WEIGHTS — static</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="240" y="88" text-anchor="middle">loaded ONCE at boot · never move · e.g. 8B BF16 ≈ 16 GB</text>
  <rect x="400" y="50" width="190" height="50" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="495" y="70" text-anchor="middle" font-weight="700">KV CACHE POOL — dynamic</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="495" y="88" text-anchor="middle">grows/shrinks per request ⏭ Day 4</text>
  <rect x="590" y="50" width="60" height="50" rx="8" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="620" y="70" text-anchor="middle">free /</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="620" y="86" text-anchor="middle">activ.</text>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="82">VRAM</text>
  <line x1="180" y1="130" x2="180" y2="106" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr17)"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="180" y="146" text-anchor="middle">filled by today's 4 hooks</text>
  <line x1="495" y1="130" x2="495" y2="106" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr17)"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="495" y="146" text-anchor="middle">filled per-token at runtime — PagedAttention lives here ⏭</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="350" y="180" text-anchor="middle">vLLM's boot step 5 (profiling run) exists precisely to measure what's left after weights → that's the KV pool size</text>
</svg>`

const TRT_BUILD = `<svg width="700" height="185" viewBox="0 0 700 185">
  <defs><marker id="arr12" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">TRT-LLM: loading is an OFFLINE compile, not a runtime step</text>
  <rect x="30" y="40" width="130" height="52" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="95" y="62" text-anchor="middle">hf checkpoint</text><text font-family="monospace" font-size="10.5" fill="#6e6e73" x="95" y="78" text-anchor="middle">safetensors</text>
  <line x1="160" y1="66" x2="190" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr12)"/>
  <rect x="194" y="40" width="150" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="269" y="58" text-anchor="middle">convert_checkpoint.py</text><text font-family="monospace" font-size="10.5" fill="#6e6e73" x="269" y="74" text-anchor="middle">name map + dtype cast</text>
  <line x1="344" y1="66" x2="374" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr12)"/>
  <rect x="378" y="40" width="140" height="52" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="448" y="58" text-anchor="middle">trtllm-build</text><text font-family="monospace" font-size="10.5" fill="#6e6e73" x="448" y="74" text-anchor="middle">fuse · tune kernels · graph</text>
  <line x1="518" y1="66" x2="548" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr12)"/>
  <rect x="552" y="40" width="120" height="52" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="612" y="62" text-anchor="middle">.plan engine</text><text font-family="monospace" font-size="10.5" fill="#6e6e73" x="612" y="78" text-anchor="middle">weights baked in</text>
  <rect x="194" y="115" width="478" height="48" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#92400e" x="433" y="135" text-anchor="middle">consequence: engine is GPU-specific + batch-specific</text>
  <text font-family="monospace" font-size="10.5" fill="#92400e" x="433" y="151" text-anchor="middle">rebuild per hardware · but runtime load = mmap, no Python at all</text>
</svg>`

export default function S8_Lifecycle() {
  return (
    <>
      <h2 id="lifecycle">Loading inside a living engine</h2>
      <p className="sub">Where the 4 hooks sit in the boot of <code className="inline">vllm serve</code> — and the one architectural exception (TRT-LLM).</p>

      <h3>Boot sequence — what <code className="inline">vllm serve &lt;model&gt;</code> actually does</h3>
      <Diagram svg={BOOT}
        caption={`vLLM &amp; SGLang boot this way (dynamic, Python-driven). TRT-LLM does steps 1–4 <em>offline</em>, so its boot is: mmap <code style="font-family:var(--mono)">.plan</code> → ready.`} />

      <h3>Weights vs KV cache — the two residents of VRAM</h3>
      <p>Don't mix these up — different load times, different subsystems. Loading day owns the static half; the dynamic half is Day 4's entire job:</p>
      <Diagram svg={VRAM} caption="" />

      <h3>Who loads what, how</h3>
      <Tbl head={['Tool', 'Format', 'Load strategy', 'Ladder rung']}>
        <R cells={['HF transformers', 'safetensors / .bin', 'accelerate: mmap + <code class="inline">device_map</code> + shard routing', 'L3']} monoCols={[0, 1]} />
        <R cells={['vLLM', 'safetensors', '4-hook protocol + parallel load + weight_loader hooks', 'L3']} monoCols={[0, 1]} />
        <R cells={['SGLang', 'safetensors', 'same lineage (HF-style loading, own scheduler)', 'L3']} monoCols={[0, 1]} />
        <R cells={['TensorRT-LLM', 'own engine .plan', 'offline build → mmap → GPU. No runtime Python loader.', 'offline']} monoCols={[0, 1]} />
        <R cells={['llama.cpp', 'GGUF', 'persistent mmap — weights live in page cache', 'L4']} monoCols={[0, 1]} />
        <R cells={['ONNX Runtime', '.onnx (+ external data)', 'protobuf graph → partition → place on EPs', 'L2–L3']} monoCols={[0, 1]} />
        <R cells={['MLX (Apple)', 'safetensors / npz', 'lazy eval + unified memory — "load" is nearly free', 'L2']} monoCols={[0, 1]} />
      </Tbl>

      <h3>The exception: TRT-LLM moves loading to build time</h3>
      <Diagram svg={TRT_BUILD} caption="Same 4 hooks — run once, offline, with kernel selection fused in. Runtime 'loading' becomes a plain mmap." />

      <h3>The mastery ladder — how today connects to the engines</h3>
      <Timeline items={[
        { tag: '1–3', head: 'manual reader → mmap → lazy per-tensor', body: 'TODAY: hand parser done; mmap + lazy = your exercises', state: 'done' },
        { tag: '4', head: '4-hook protocol + name mapping + fusion + junk filtering', body: 'TODAY: mini_vllm_loader.py verified against GPT-2 & Qwen3', state: 'done' },
        { tag: '5', head: 'CPU→GPU transfer, pinned memory', body: 'Day 4 (PyTorch as tensor tool, not modeling crutch)' },
        { tag: '6', head: 'FP16/BF16 native handling', body: "Day 5 — today's manual upcast is the foundation" },
        { tag: '7', head: 'INT8/FP8/INT4 weight representation, pack/dequant at load', body: 'Day 5 — GPTQ/AWQ/GGUF checkpoints' },
        { tag: '8–9', head: 'manual Linear → manual attention', body: 'Day 3 (NumPy forward pass)' },
        { tag: '10–12', head: 'KV cache → continuous batching → paged KV', body: 'Day 4+ — the doorway into vLLM proper' },
      ]} />
      <div className="divider" />
    </>
  )
}
