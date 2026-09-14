import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S7_Engines() {
  return (
    <>
      <h2 id="engines">How the real engines do exactly this</h2>
      <p className="sub">
        Everything today has a direct industrial counterpart. When you read engine source now, you
        are reading production versions of the four mechanisms we built:
      </p>

      <Tbl head={['we built (from scratch)', 'vLLM', 'SGLang', 'TensorRT-LLM', 'llama.cpp']}>
        <R cells={['KV cache (prefill/decode)', 'paged KV tensors, FP16/BF16/FP8', 'same + RadixAttention tree', 'paged KV, XQA kernels', 'contiguous KV buffer per slot']} />
        <R cells={['block pool + block table', '<code class="inline">PagedAttention</code>, 16-token blocks, refcounts + CoW', 'tree-structured prefix sharing (RADIX)', 'paged KV cache manager', 'fixed slots, --cont-batching']} monoCols={[1]} />
        <R cells={['continuous batching loop', 'scheduler: waiting/running/swapped deques', 'scheduler + cache-aware admission', '"in-flight batching"', 'server slots with continuous refill']} />
        <R cells={['preemption (recompute)', 'preempt newest → recompute or swap to CPU', 'retract + recompute', 'in-flight reallocation', 'slot eviction']} />
        <R cells={['prefix sharing', 'automatic prefix caching (APC)', 'RadixAttention: shared prefixes ARE the cache tree', 'KV cache reuse across requests', 'prompt cache (--prompt-cache)']} />
        <R cells={['capacity = memory', '<code class="inline">--gpu-memory-utilization</code>, max_num_seqs', 'mem-fraction-static', 'max KV cache size flags', '-c context, -np parallel']} monoCols={[1]} />
      </Tbl>

      <h3>The two papers that named everything</h3>
      <Tbl head={['paper', 'year', 'idea you now own']}>
        <R cells={['<strong>Orca</strong> (Yu et al., OSDI)', '2022', 'iteration-level scheduling = continuous batching: join/leave the batch every step']} />
        <R cells={['<strong>vLLM / PagedAttention</strong> (Kwon et al., SOSP)', '2023', 'KV as paged virtual memory: block tables, near-zero fragmentation, CoW sharing']} />
      </Tbl>

      <h3>One request through vLLM, in our vocabulary</h3>
      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}><div className="t">ARRIVE</div><div className="s">joins <code className="inline">waiting</code> deque</div></div>
          <div className="farrow">→</div>
          <div className="fnode amber" style={{ minWidth: 0, flex: 1 }}><div className="t">SCHEDULER</div><div className="s">admits when ceil(prompt/16) blocks free (prefix-cache hit? reuse, skip prefill)</div></div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}><div className="t">PREFILL</div><div className="s">compute-bound chunk; K/V written into paged blocks</div></div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}><div className="t">DECODE LOOP</div><div className="s">batched with others via PagedAttention kernels reading through block tables</div></div>
          <div className="farrow">→</div>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}><div className="t">FINISH</div><div className="s">EOS / length / stop string → blocks freed same iteration</div></div>
        </div>
        <div className="flow-note">
          At any iteration: pool overflow → preempt newest (recompute) or swap to CPU ·
          Dynamo goes one step further: prefill and decode run on <em>different GPUs</em>
          (disaggregation), with KV blocks transferred between them.
        </div>
      </div>

      <Callout kind="info" title="What we deliberately did NOT build yet">
        Serving this over HTTP (Day 5), quantization/dtypes (Day 6), and GPU kernels/parallelism
        (Day 7). The engine core you now have — cache, paging, scheduler — is the part every other
        optimization must keep correct. That is why the golden checksum followed us all day.
      </Callout>
      <div className="divider" />
    </>
  )
}
