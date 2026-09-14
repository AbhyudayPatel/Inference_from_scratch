import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S7_Engines() {
  return (
    <>
      <h2 id="engines">How production engines serve — the same architecture, hardened</h2>
      <p className="sub">
        Our FastAPI + worker-thread engine is a miniature of the real serving stacks. Every concept
        from today has a named counterpart:
      </p>

      <Tbl head={['we built', 'vLLM', 'SGLang', 'TRT-LLM', 'Dynamo']}>
        <R cells={['engine worker + queue', '<code class="inline">AsyncLLMEngine</code> + scheduler loop', 'async runtime + scheduler', 'C++ executor, in-flight batching', 'distributed workers']} monoCols={[1]} />
        <R cells={['OpenAI-ish JSON API', '<code class="inline">vllm serve</code> OpenAI server', 'OpenAI-compatible endpoint', 'Triton/OpenAI frontends', 'OpenAI-compatible frontend']} monoCols={[1]} />
        <R cells={['SSE streaming', 'SSE + token deltas', 'SSE + structured output events', 'SSE/gRPC streams', 'SSE across services']} />
        <R cells={['abort on disconnect', 'client-disconnect → abort → free blocks', 'same', 'same (request cancellation)', 'same']} />
        <R cells={['prefix reuse', 'automatic prefix caching', 'RadixAttention tree', 'KV reuse flags', 'KV-aware routing + reuse']} />
        <R cells={['one process does everything', '—', '—', '—', '<strong>disaggregation: prefill and decode on different GPU pools, KV transferred between them</strong>']} />
      </Tbl>

      <h3>What production adds that we didn't build</h3>
      <Tbl head={['concern', 'what it looks like']}>
        <R cells={['auth & rate limits', 'API keys, per-user quotas, token buckets in front of admission']} />
        <R cells={['multi-GPU / multi-node', 'tensor parallel inside a node; request routing across replicas (Day 7)']} />
        <R cells={['observability', 'Prometheus metrics on TTFT/TPOT/queue depth; per-request tracing']} />
        <R cells={['graceful deploys', 'drain in-flight requests before shutdown; model hot-swap']} />
        <R cells={['structured output', 'grammar-constrained decoding (SGLang’s specialty) — masks logits per grammar state']} />
      </Tbl>

      <Callout kind="info" title="Why Dynamo disaggregates prefill and decode">
        Day 3's roofline said prefill is compute-bound and decode is bandwidth-bound — two different
        hardware profiles. Dynamo (and research systems like Splitwise/Mooncake) run them on
        <em> different GPU pools</em>: prefill nodes chew prompts, transfer the KV blocks over the
        fabric, decode nodes type tokens. The KV cache — Day 4's object — is literally the payload
        being shipped between datacenter nodes. Our little 72 KiB/token row is now a network packet.
      </Callout>
      <div className="divider" />
    </>
  )
}
