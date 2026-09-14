import React from 'react'
import { Callout, Timeline } from '../../components/ui.jsx'

export default function S0_Hero() {
  return (
    <>
      <section className="hero">
        <div className="day-chip">Day 01 · the loading masterclass</div>
        <h1>
          Load any LLM, <em>from scratch.</em>
          <span className="sub">
            No <code>transformers</code>. No <code>safetensors</code> library. Just bytes, JSON, and NumPy.
            By the end you'll parse any HuggingFace checkpoint by hand, run the same 4-hook protocol
            vLLM uses — and have a 7-step field guide that works on models that don't exist yet.
          </span>
        </h1>
        <div className="strap">
          <span className="chip">548 MB · 160 tensors · 4 bytes/float</span>
          <span className="chip">GPT-2 (2019) + Qwen3 (2025)</span>
          <span className="chip">160 → 148 placed + 1 tied</span>
          <span className="chip">32B = 17 shards · 65.5 GB</span>
        </div>
      </section>

      <h2 id="timeline">The day at a glance</h2>
      <Timeline items={[
        { tag: 'P0', head: 'What a model file is', body: 'the 5-artifact contract · param count by hand', state: 'done' },
        { tag: 'P1', head: 'Every format, one lens', body: 'safetensors / pickle / GGUF / ONNX — index · data · trust', state: 'done' },
        { tag: 'P2', head: 'Hand-parse safetensors', body: '8-byte length → JSON header → raw buffer → np.frombuffer', state: 'done' },
        { tag: 'P3', head: '4 surprises in the bytes', body: 'junk masks · 124.4M hand-count · fused QKV · Conv1D trap', state: 'done' },
        { tag: 'P4', head: 'The core problem', body: 'disk = archive, GPU = contract · dtype bit anatomy', state: 'done' },
        { tag: 'P5', head: 'The 4-hook protocol', body: 'enumerate → filter → map → place, verified live', state: 'done' },
        { tag: 'P6', head: 'Laziness, mmap, shards', body: 'the L0–L5 ladder · page faults · index.json routing', state: 'done' },
        { tag: 'P7', head: 'Loading inside engines', body: 'vllm serve boot · weights vs KV cache · TRT-LLM build', state: 'done' },
        { tag: 'P8', head: '2025-proof + field guide', body: 'Qwen3 autopsy · the universal 7-step loading algorithm', state: 'done' },
      ]} />

      <Callout kind="info" title="How to read this page">
        Ten questions, in dependency order: <strong>what is a model physically?</strong> →
        <strong> what formats exist?</strong> → <strong>how do I read the bytes?</strong> →
        <strong> what's surprising inside?</strong> → <strong>why is loading actually hard?</strong> →
        <strong> what's the universal solution?</strong> → <strong> how does it scale?</strong> →
        <strong> where does it live in an engine?</strong> → <strong> does it survive 2025?</strong> →
        <strong> how do I do it on anything?</strong> Every claim is backed by code that ran today.
      </Callout>
      <div className="divider" />
    </>
  )
}
