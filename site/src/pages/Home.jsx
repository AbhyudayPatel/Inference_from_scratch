import React from 'react'
import { DAYS } from '../registry.js'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="day-chip">a learning journal</div>
        <h1>
          Inference, <em>from scratch.</em>
          <span className="sub">
            Become the engineer who can read <strong>vLLM, TensorRT-LLM, SGLang, and NVIDIA Dynamo</strong> source
            and know why every decision was made — because you built every piece yourself, broke it, and fixed it.
            The path: raw math → naive inference → optimized inference → serving → production engines.
          </span>
        </h1>
      </section>

      <h2>Rules of the road</h2>
      <ol>
        <li><strong>Days 1–3: no <code className="inline">transformers</code>, no engines.</strong> If a library does it for you, you don't learn it.</li>
        <li><strong>Everything must run.</strong> No theoretical-only checkmarks.</li>
        <li><strong>Break things on purpose.</strong> Every error case hit deliberately is one recognized instantly in engine internals later.</li>
        <li><strong>Write down numbers.</strong> Latency, tokens/sec, memory bytes. Inference engineering is a numbers game.</li>
        <li><strong>One folder per day</strong>, each with its own checklist. Finish before moving on.</li>
      </ol>

      <h2>The road</h2>
      <div className="pipeline">{`Day 1 ✓  loading              GPT-2 from raw files — formats, mmap, engine loaders
Day 2 ✓  tokenization         UTF-8 · byte-level BPE from scratch · GPT-2 + Qwen3
Day 3   the forward pass     embeddings · attention · MLP · sampling, in NumPy  ◄ NEXT
Day 4   naive → optimized    KV cache · batching · FastAPI serving · PyTorch move
Day 5   representation       FP16/BF16/INT8/FP8 · GGUF · ONNX · weight packing
Day 6+  hardware & scale     CUDA/Triton kernels · TP/PP · paged KV
Later   the engines          vLLM (PagedAttention, continuous batching)
                             TRT-LLM (graph fusion, kernel autotune)
                             SGLang (RadixAttention, constrained decoding)
                             Dynamo (disaggregated serving)`}</div>

      <h2>Days</h2>
      <div className="day-cards">
        {DAYS.map((d) => (
          <a key={d.slug} className={`day-card ${d.status === 'locked' ? 'locked' : ''}`} href={`#/${d.slug}`}>
            <div className="dc-num">DAY {d.num}</div>
            <h3>{d.title}</h3>
            <p>{d.subtitle}</p>
            <div className={`dc-status ${d.status}`}>
              {d.status === 'done' && '✓ done'}
              {d.status === 'active' && '◄ in progress'}
              {d.status === 'locked' && '🔒 locked'}
              {d.stats.length > 0 && ' · ' + d.stats.join(' · ')}
            </div>
          </a>
        ))}
      </div>

      <div className="foot">adding a day = one folder in <code>src/days/</code> + one entry in <code>src/registry.js</code></div>
    </>
  )
}
