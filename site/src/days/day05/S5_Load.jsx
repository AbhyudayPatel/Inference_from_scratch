import React from 'react'
import { Callout, Term, Tbl, R } from '../../components/ui.jsx'

const OUT = [
  ['p', 'load test: 12 tokens/request, engine MAX_BATCH=4, NumPy CPU decode'],
  '',
  ['p', '  C |  TTFT p50  TTFT p95 |  TPOT p50  TPOT p95 |   E2E p50 |  tok/s'],
  '  1 |      229m      229m |       43m       43m |      707m |   16.9',
  '  2 |      255m      348m |      147m      154m |     1878m |   12.6',
  '  4 |      591m      909m |      183m      201m |     2604m |   18.4',
  '  8 |     1512m     2805m |      158m      181m |     3246m |   22.7',
  '',
  ['p', 'reading the table:'],
  ['ok', '  * throughput grows with concurrency: 16.9 -> 22.7 tok/s (weight bytes amortized)'],
  ['bad', '  * past MAX_BATCH=4, TTFT jumps: the queue forms exactly where the cap says'],
  ['ok', '  * TPOT ~flat at high C: decode is one batched pass (until the CPU saturates)'],
]

export default function S5_Load() {
  return (
    <>
      <h2 id="load">Load — where the queue forms, measured</h2>
      <p className="sub">
        Point concurrency at the server (1 → 2 → 4 → 8 simultaneous streaming requests) and watch
        the two clocks. Everything below is measured over real HTTP:
      </p>
      <Term title="code/04_load_test.py — verified output" lines={OUT} />

      <h3>How to read a load table</h3>
      <Tbl head={['signal in the table', 'meaning', 'our numbers']}>
        <R cells={['throughput ↑ with C', 'weight bytes fetched once per batched step (Day 4)', '17 → 24 tok/s']} />
        <R cells={['TTFT p95 explodes at C=8', 'requests 5–8 sat in the queue (MAX_BATCH=4)', '490 ms → 2.6 s']} />
        <R cells={['TPOT degrades with C', 'CPU GEMM cost grows with B — no free lunch here; on GPU it stays flat much longer', '43 → ~160 ms']} />
        <R cells={['p50 fine, p95 bad', 'the tail is where serving lives; average latency hides queues', '—']} />
      </Tbl>

      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">C ≤ MAX_BATCH</div>
          <div className="s">everyone runs immediately;<br />throughput scales ~linearly</div>
        </div>
        <div className="farrow">→</div>
        <div className="fnode amber" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">C &gt; MAX_BATCH</div>
          <div className="s">excess waits in queue; TTFT absorbs<br />the wait — TPOT of runners unchanged</div>
        </div>
        <div className="farrow">→</div>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">saturation</div>
          <div className="s">compute-bound at last; queue grows<br />unboundedly → backpressure or die</div>
        </div>
      </div>

      <Callout kind="trap" title="Backpressure is a feature">
        An unbounded queue doesn't save anyone — it converts "some requests get 429'd immediately"
        into "ALL requests time out after computing." Production servers bound the queue
        (<code className="inline">max_waiting_requests</code>, admission control) and shed load early.
        If your server never says no, the network will say it for you — after you've paid for the compute.
      </Callout>
      <div className="divider" />
    </>
  )
}
