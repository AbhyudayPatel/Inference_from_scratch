import React from 'react'
import { Callout, Tbl, R } from '../../components/ui.jsx'

export default function S1B_ManyRequests() {
  return (
    <>
      <h2 id="manyrequests">“But how do 100 requests a second share ONE model?”</h2>
      <p className="sub">
        The most common confusion in all of serving: <em>“the model sits in RAM and processes a
        request — so when 100 requests arrive, does it spawn 100 processes? 100 copies? Sub-terminals?”</em>
        <strong> No.</strong> The confusion comes from a hidden assumption: that the model is the thing
        that holds per-request state. It isn't. Let’s separate the two kinds of memory.
      </p>

      <h3>The wrong picture vs the right picture</h3>
      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode" style={{ minWidth: 0, flex: 1, borderColor: 'var(--red-line)' }}>
          <div className="t" style={{ color: 'var(--red)' }}>❌ the wrong picture</div>
          <div className="v" style={{ textAlign: 'left' }}>
            100 requests<br />
            → 100 processes / terminals<br />
            → 100 copies of the 500 MB model<br />
            → 50 GB RAM?? how does this even fit…
          </div>
          <div className="s">if this were true, serving would be impossible</div>
        </div>
        <div className="farrow">→</div>
        <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">✓ the right picture</div>
          <div className="v" style={{ textAlign: 'left' }}>
            <b>1 process · 1 copy of the weights</b><br />
            + 100 small state slices (KV rows + IDs)<br />
            + 1 loop that advances ALL of them<br />
            &nbsp;&nbsp;one token per iteration
          </div>
          <div className="s">this is literally the engine we built on Day 4–5</div>
        </div>
      </div>

      <h3>Why one copy is enough: the model is read-only</h3>
      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="fnode blue" style={{ minWidth: 220 }}>
            <div className="t">WEIGHTS — shared, read-only</div>
            <div className="v">498 MB in VRAM, loaded once (Day 1)</div>
            <div className="s">a forward pass only READS W.<br />100 requests reading the same matrix<br />is like 100 cooks reading one recipe card</div>
          </div>
          <div className="fnode" style={{ minWidth: 220 }}>
            <div className="t">REQUEST STATE — tiny, per-request</div>
            <div className="v">prompt IDs + KV rows + RNG + output</div>
            <div className="s">Day 4 math: 36 KiB per token (FP16) —<br />a 1,000-token conversation = 36 MB,<br />not another 500 MB model</div>
          </div>
        </div>
        <div className="flow-note">
          Serving 100 concurrent 1K-token chats = 1 × 498 MB of weights + 100 × 36 MB of KV =
          4.1 GB. That <em>fits on one GPU</em> — and it is exactly the Day-4 capacity worksheet.
        </div>
      </div>

      <h3>The engine is a loop — every tick advances EVERY request by one token</h3>
      <p>
        Nobody waits for request A to finish before B starts. The engine runs one batched forward
        pass per iteration; each running request gets exactly one new token per pass. Requests join
        and leave <em>between iterations</em> (Day 4's continuous batching):
      </p>
      <div className="gantt">
        <div className="glabel">one engine, MAX_BATCH = 4 — watch the slots churn (from our Day-4 simulator)</div>
        <div className="grow">
          <div className="seg dc" style={{ width: '12%' }}>tick: A B C D</div>
          <div className="seg dc" style={{ width: '12%' }}>A B C D</div>
          <div className="seg dc" style={{ width: '12%' }}>A B C D</div>
          <div className="seg pf" style={{ width: '4%' }}>P E</div>
          <div className="seg dc" style={{ width: '12%' }}>A C D E</div>
          <div className="seg dc" style={{ width: '12%' }}>A C D E</div>
          <div className="seg pf" style={{ width: '4%' }}>P F</div>
          <div className="seg dc" style={{ width: '12%' }}>C D E F</div>
          <div className="seg dc" style={{ width: '12%' }}>C D E F</div>
          <div className="seg dc" style={{ width: '8%' }}>C E F</div>
        </div>
        <div className="gantt-legend">
          <span className="sw" style={{ background: 'var(--green)' }} />prefill (a newcomer joins)
          <span className="sw" style={{ background: 'var(--accent)' }} />decode tick — every letter gains +1 token
          · B finished after tick 3, so E was admitted; A finished, so F was admitted. No restarts, no copies.
        </div>
      </div>

      <Callout kind="info" title="The restaurant kitchen">
        One chef (the GPU) with 20 pans on the stove. The chef doesn't cook dish #1 completely, then
        dish #2 — they sweep the line: one action per pan per sweep. The recipe book (weights) stays
        on the shelf, shared and read-only. Each pan (request) holds only its own ingredients (KV
        state). A 100-customer restaurant needs a bigger stove and more pans — not 100 chefs and 100
        copies of the book.
      </Callout>

      <h3>The arithmetic of “100 requests per second”</h3>
      <p>
        How many requests can one engine actually hold? <strong>Little's Law</strong> from queueing
        theory: <code className="inline">concurrency = arrival_rate × response_lifetime</code>.
      </p>
      <Tbl head={['quantity', 'example (real GPU serving Llama-8B)', 'our NumPy engine']}>
        <R cells={['decode iteration (whole batch)', '~50 ms → every running request +1 token', '~37 ms (measured Day 5)']} />
        <R cells={['per-request speed', '~20 tokens/s', '~27 tokens/s']} />
        <R cells={['200-token response lifetime', '~10 s', '~7.4 s']} />
        <R cells={['100 req/s needs…', '100 × 10 s = <strong>1,000 concurrent slots</strong>', '100 × 7.4 s = 740 slots']} monoCols={[1, 2]} />
        <R cells={['fits?', 'KV/token 128 KiB → 1,000 slots ≈ 128 GB → needs ~2×A100 (or shorter ctx)', '36 KiB/tok → 740 slots ≈ 27 GB → no; MAX_BATCH=4 anyway']} monoCols={[1, 2]} />
        <R cells={['if it doesn’t fit', 'queue + longer TTFT (Day 5 load table), or scale out ↓', 'same — we measured the queue at C=8']} />
      </Tbl>
      <p className="sub">
        This is why the Day-4 KV math mattered so much: <strong>the number of requests you can serve
        simultaneously is set by KV bytes, not by the model size and not by FLOPs.</strong> Bigger
        batch → better weight amortization → more tokens/second out of the same GPU.
      </p>

      <h3>So when DO more processes appear? — the four scale-out tiers</h3>
      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">1 · BIGGER BATCH</div>
            <div className="s">same process; grow B until bandwidth saturates (Day 4 roofline)</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">2 · TENSOR PARALLEL</div>
            <div className="s">split every GEMM across 2–8 GPUs; still ONE logical engine (Day 7)</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode blue" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">3 · REPLICAS</div>
            <div className="s">N independent engines behind a load balancer — one process PER GPU, still never per request</div>
          </div>
          <div className="farrow">→</div>
          <div className="fnode amber" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">4 · DISAGGREGATION</div>
            <div className="s">Dynamo: prefill pool + decode pool; KV blocks shipped between nodes</div>
          </div>
        </div>
        <div className="flow-note">
          note where processes appear: tier 3 — one engine process per GPU/replica.
          A 1,000-GPU cluster runs ~1,000 engine processes serving millions of requests. Not millions of processes.
        </div>
      </div>

      <h3>…and what about threads? The full anatomy of one serving process</h3>
      <Tbl head={['thread / task', 'how many', 'what it does']}>
        <R cells={['async HTTP tasks (uvicorn)', 'one per connection — thousands are cheap', 'parse JSON, stream SSE frames; pure I/O, zero math']} />
        <R cells={['engine worker thread', '<strong>exactly one</strong>', 'the scheduler loop: admit → prefill → batched decode → sample → emit']} monoCols={[1]} />
        <R cells={['BLAS/CUDA kernel threads', 'a pool, invisible to you', 'the actual GEMMs on CPU cores / GPU SMs']} />
        <R cells={['processes', '<strong>one per GPU</strong>', 'that’s it. no per-request processes, no sub-terminals']} monoCols={[1]} />
      </Tbl>

      <Callout kind="disc" title="The one-sentence answer">
        100 requests per second are served by <strong>one process holding one copy of the read-only
        weights, keeping 100 small KV-state slices, and running one loop</strong> that computes one
        batched forward pass per iteration — so every request advances by one token every ~30 ms.
        More traffic = bigger batch, then more GPUs — never more copies of the model per request.
      </Callout>
      <div className="divider" />
    </>
  )
}
