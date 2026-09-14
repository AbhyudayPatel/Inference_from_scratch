import React from 'react'
import { Callout, Code, Term, Tbl, R } from '../../components/ui.jsx'

const SCHED_CODE = `every iteration (this loop IS the engine):
  1. ADMIT    waiting requests FCFS, while a batch slot is free
              AND ceil(prompt_len / 16) blocks are available
  2. RUN      one step: prefill the newcomer  OR  decode 1 token
              for every running request (one batched GEMM)
  3. FREE     finished requests return their blocks NOW, not at batch end
  4. PREEMPT  pool overflow -> newest running request loses its blocks,
              rejoins the queue, recomputes from scratch later   (vLLM policy)`

const OUT = [
  ['p', 'requests:  A: t=0 prompt=60 gen=10   B: t=50 prompt=20 gen=14'],
  ['p', '           C: t=120 prompt=100 gen=6   D: t=200 prompt=30 gen=8'],
  '',
  ['p', '=== STATIC ==='],
  '  makespan 844 ms | GPU busy 76% | throughput 294 tok/s | wasted slots 18',
  '  timeline:  --------------PPPPPPPPPPPPPPPPPPdddddddddddddddddddddddddddd',
  '',
  ['p', '=== CONTINUOUS ==='],
  '  makespan 661 ms | GPU busy 100% | throughput 375 tok/s | wasted slots 0',
  '  timeline:  PPPPPPddPPPddPPPPPPPPPPPddPPPPdddddddddddddddddddddddddddddd',
  '',
  'continuous vs static: makespan 1.28x shorter, avg latency 752 -> 462 ms',
  '',
  ['p', '--- 18-block pool (288 slots): admission is a memory decision ---'],
  '  R arrived at t=0 but prefill starts at 1218 ms -- blocked by MEMORY, not FLOPs',
  '  preemptions: 1 (Q, recomputed later)  -- vLLM does exactly this',
  ['ok', 'CHECKSUM: PASS -- continuous wins every metric; the KV pool sets the ceiling.'],
]

export default function S5_Batching() {
  return (
    <>
      <h2 id="batching">Continuous batching — the scheduler loop</h2>
      <p className="sub">
        Real traffic never arrives in neat groups. <strong>Static batching</strong> waits for a full
        batch, then runs until <em>everyone</em> finishes. <strong>Continuous batching</strong> (Orca,
        2022 — the paper behind every modern engine) makes scheduling an <em>iteration-level</em>
        decision: every single step, some requests may join and others may leave.
      </p>

      <h3>The same four requests, two policies — simulated with our real cost model</h3>
      <div className="gantt">
        <div className="glabel">STATIC — waits for D (t=200), prefills all, decodes until the LONGEST (gen=14) finishes</div>
        <div className="grow">
          <div className="seg idle" style={{ width: '23.7%' }}>idle 200 ms</div>
          <div className="seg pf" style={{ width: '29.9%' }}>prefill A,B,C,D</div>
          <div className="seg dc" style={{ width: '46.4%' }}>decode ×14 (A,C,D finished but still occupy slots)</div>
        </div>
        <div className="glabel">CONTINUOUS — admit on arrival/finish, free on finish</div>
        <div className="grow">
          <div className="seg pf" style={{ width: '10.9%' }}>P A</div>
          <div className="seg dc" style={{ width: '4%' }}>d</div>
          <div className="seg pf" style={{ width: '3.6%' }}>P B</div>
          <div className="seg dc" style={{ width: '4.1%' }}>d</div>
          <div className="seg pf" style={{ width: '18.2%' }}>P C</div>
          <div className="seg dc" style={{ width: '4.2%' }}>d</div>
          <div className="seg pf" style={{ width: '5.4%' }}>P D</div>
          <div className="seg dc" style={{ width: '49.6%' }}>decode, batch of up to 4 — slots free the instant a request ends</div>
        </div>
        <div className="gantt-legend">
          <span className="sw" style={{ background: '#e4e4e9' }} />idle
          <span className="sw" style={{ background: 'var(--green)' }} />prefill (compute-bound)
          <span className="sw" style={{ background: 'var(--accent)' }} />decode (bandwidth-bound)
          · measured by code/03_continuous_batching.py
        </div>
      </div>

      <Term title="code/03_continuous_batching.py — verified output" lines={OUT} />

      <h3>The whole scheduler is four rules</h3>
      <Code title="iteration-level scheduling — the engine's heartbeat">{SCHED_CODE}</Code>

      <h3>Why batching decode is almost free — the GEMM shape argument</h3>
      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">decode GEMM</div>
          <div className="v">(B, 768) @ (768, 2304)</div>
          <div className="s">B = requests in this step</div>
        </div>
        <div className="farrow">→</div>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">weight bytes fetched ONCE</div>
          <div className="v">498 MB read per iteration,<br />independent of B</div>
          <div className="s">decode is bandwidth-bound: extra requests<br />add FLOPs but almost no new memory traffic</div>
        </div>
        <div className="farrow">→</div>
        <div className="fnode blue" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">throughput ∝ B</div>
          <div className="v">until compute becomes<br />the bottleneck</div>
          <div className="s">that crossover is the roofline from Day 3</div>
        </div>
      </div>

      <Callout kind="warn" title="The ceiling is memory, not FLOPs">
        The batch can't grow past the KV pool: <code className="inline">max_concurrent_tokens =
        (VRAM − weights − activations) / KV_bytes_per_token</code>. When the pool fills mid-decode,
        the scheduler <strong>preempts the newest request</strong> (free blocks, recompute later) or
        swaps it to CPU — our simulator reproduces both the queue and the preemption. This is why
        KV/token bytes and paging dominated the first half of the day.
      </Callout>
      <div className="divider" />
    </>
  )
}
