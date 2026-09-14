import React from 'react'
import { Callout, Term, Tbl, R } from '../../components/ui.jsx'

const OUT = [
  ['p', 'block size: 16 token slots | KV/token: 73,728 B FP32 (36,864 B FP16)'],
  '',
  '[reservation] 8 requests, lengths [12, 200, 45, 1024, 30, 600, 80, 310]',
  '  reserved 8192 slots (302.0 MB FP16), used 2301 -> waste 72%  (vLLM paper: 60-80% typical)',
  '',
  '[paged] seq A: 10 tokens -> 1 block(s), waste 6 slots (last block only)',
  '[paged] seq B: 40 tokens -> 3 blocks, waste 8 slots',
  '  indirection check: logical token 17 -> block#61 slot 1 -> value 17',
  '  pool internal fragmentation: 14/64 slots = 21.9% (bounded by one partial block each)',
  '',
  '[sharing] 24-token system prompt -> blocks [59, 58], refcounts [3, 3]',
  '  copy-on-write: FULL prefix block #59 still shared (refcount 3);',
  '  the PARTIAL block was copied for each appender (owner refcount back to 1)',
  '  savings: prefix KV computed+stored once for 3 sequences (1,728 KiB saved)',
  '',
  '[free] all sequences freed -> pool back to 64/64 blocks',
  '[oom] 33rd token on a 32-slot pool -> OOM: scheduler must wait, preempt, or swap',
  ['ok', 'CHECKSUM: PASS -- block table, free list, CoW and refcounts all verified.'],
]

export default function S4_Paged() {
  return (
    <>
      <h2 id="paged">Paged KV — virtual memory, but for tokens</h2>
      <p className="sub">
        One request's cache is easy. A server's problem is that <strong>nobody knows how long a
        request will get</strong> — prompts vary, generation lengths vary. The old answer (reserve
        max length per request, contiguous) wastes most of the memory it touches. vLLM's
        PagedAttention borrowed the OS's answer: <strong>fixed-size blocks + an indirection
        table</strong>.
      </p>

      <h3>The two allocation strategies</h3>
      <div className="flow" style={{ justifyContent: 'center' }}>
        <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">OLD: reservation (FasterTransformer-era)</div>
          <div className="v" style={{ textAlign: 'left' }}>
            request arrives → reserve max_len contiguous slots<br />
            a 12-token chat holds a 1,024-slot reservation<br />
            <b>measured waste on our 8-request mix: 72%</b>
          </div>
        </div>
        <div className="farrow">vs</div>
        <div className="fnode green" style={{ minWidth: 0, flex: 1 }}>
          <div className="t">PAGED: grow on demand (vLLM, 2023)</div>
          <div className="v" style={{ textAlign: 'left' }}>
            pool of 16-token physical blocks + free list<br />
            per-request <b>block table</b>: logical → physical<br />
            waste ≤ one partial block per sequence
          </div>
        </div>
      </div>

      <h3>The block table is a page table</h3>
      <div className="flow-v">
        <div className="flow" style={{ justifyContent: 'center' }}>
          <div className="fnode" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">REQUEST B — logical view</div>
            <div className="v">tokens 0..39<br />blocks [0][1][2]</div>
            <div className="s">contiguous <em>logically</em></div>
          </div>
          <div className="farrow">→<span className="lbl">block table</span></div>
          <div className="fnode blue" style={{ minWidth: 0, flex: 1 }}>
            <div className="t">PHYSICAL POOL</div>
            <div className="v">[0]→#61 &nbsp; [1]→#17 &nbsp; [2]→#44</div>
            <div className="s">anywhere in memory, never copied<br />verified: logical token 17 → block#61 slot 1</div>
          </div>
        </div>
        <div className="flow-note">
          Exactly like OS virtual memory: a process sees contiguous pages; the MMU maps them to
          scattered physical frames. Here the "process" is a request and the "MMU" is the engine's block table.
        </div>
      </div>

      <h3>Verified run — waste, sharing, copy-on-write, exhaustion</h3>
      <Term title="code/02_paged_kv.py — verified output" lines={OUT} />

      <h3>Why sharing + copy-on-write matters</h3>
      <Tbl head={['mechanism', 'what it enables', 'rule']}>
        <R cells={['reference-counted blocks', 'a shared system prompt (or beam search / parallel samples) is stored and computed ONCE', 'block freed only when refcount hits 0']} />
        <R cells={['copy-on-write', 'sharing is safe even when forks diverge', 'writing to a shared partial block copies it first; full blocks stay shared']} />
        <R cells={['free list', 'finished requests return blocks instantly', 'the next request reuses them — no defragmentation, ever']} />
        <R cells={['graceful OOM', 'pool full is a scheduling event, not a crash', 'wait (queue) · preempt newest + recompute later · or swap victim to CPU']} />
      </Tbl>

      <Callout kind="info" title="The vLLM paper's headline, demystified">
        PagedAttention (Kwon et al., 2023) reported existing systems wasting <strong>60–80%</strong> of KV
        memory to reservation + fragmentation, and near-zero waste (~4%) with paging — which is why
        throughput jumped 2–4× against FasterTransformer and early HF TGI. Our toy reproduces the
        shape of the result: 72% reservation waste vs ≤ one partial block per sequence.
      </Callout>
      <div className="divider" />
    </>
  )
}
