import React from 'react'
import { Callout, Code, Term } from '../../components/ui.jsx'

const STATE_CODE = `# a request is a state machine
QUEUED    -> admitted when: batch slot free AND prompt's blocks available
PREFILL   -> cached_forward(all prompt ids)  -> sample first token
DECODE    -> batched step: one (B,768) pass serves every running request
FINISHED  -> finish_reason set (stop | length) -> slot + KV freed
ABORTED   -> disconnect or error             -> slot + KV freed

# the engine's heartbeat (one iteration):
def tick():
    admit from waiting (FCFS, capacity-checked)      # Day 4 rules
    prefill newcomers  -> sample their first tokens
    batched_decode(all DECODE requests)              # ONE set of GEMMs
    for each request: sample -> emit -> finish checks`

const BATCH_CODE = `# batched decode with padded KV — how B requests share one pass
x    = stack(wte[tok_b] + wpe[pos_b] for each request)     # (B, 768)
qkv  = x @ c_attn.w + b                                    # (B, 2304): ONE GEMM
Kp   = zeros((B, 12, Tmax, 64), dtype=x.dtype)             # pad to longest cache
Kp[b, :, :L_b] = request_b.cache.K                         # copy each real cache
scores = q @ Kp^T / 8                                      # (B, 12, 1, Tmax)
scores = where(valid[b, j], scores, -1e10)                 # mask the PADS
attn   = softmax(scores) @ Vp                              # pads contribute 0`

const OUT = [
  ['p', '[single]  \' the most powerful machines on the planet.\'  finish=length'],
  ['p', '[batched] golden: \' the most powerful machines on the planet.\''],
  ['p', '[batched] other : \' uncertain.\\n\\n"We\'  finish=length'],
  ['ok', 'CHECKSUM: PASS -- engine + batched decode reproduce the golden continuation.'],
]

export default function S2_Engine() {
  return (
    <>
      <h2 id="engine">The engine object — state machine + truly batched decode</h2>
      <p className="sub">
        Day 4's scheduler decided <em>when</em> requests run. The engine packages that into an object
        the network can talk to: a worker thread, admission queues, per-request state, and one more
        real mechanism Day 4 only simulated — <strong>batched decode</strong>, where requests with
        different cache lengths share a single forward pass.
      </p>

      <Code title="the state machine and the heartbeat">{STATE_CODE}</Code>

      <h3>Batched decode: pad, mask, one GEMM set</h3>
      <p>
        Requests have different cache lengths, so their K/V tensors can't stack directly. The
        standard trick (what vLLM's ragged kernels do at hardware speed): pad every cache to the
        batch's longest, build a boolean mask, and give padded positions <code className="inline">-1e10</code>
        scores so softmax assigns them zero weight:
      </p>
      <Code title="code/01_engine.py — the batched step">{BATCH_CODE}</Code>

      <h3>Verified: batching changes nothing</h3>
      <Term title="code/01_engine.py — verified output" lines={OUT} />
      <p className="sub">
        Two requests with different prompts and different lengths, decoded in the same iterations —
        the golden continuation returns byte-identical. The scheduler is allowed to change
        <em> when</em> a token is computed, never <em>what</em> is computed.
      </p>

      <Callout kind="trap" title="The float64 upcast — the best bug we hit all week">
        The first batched version ran at <strong>700 ms/token</strong> instead of 36 ms, with
        <em> bit-identical correct output</em>. Cause: <code className="inline">np.zeros()</code>
        defaults to float64; the padded K/V buffers silently upcast the residual stream
        (<code className="inline">float32 @ float64 → float64</code>), so every GEMM after the first
        attention ran double-precision. No test caught it — <strong>the golden checksum passes on a
        25× slowdown.</strong> Only profiling did. Fix: one <code className="inline">dtype=x.dtype</code>.
        Serving correctness includes performance budgets.
      </Callout>
      <div className="divider" />
    </>
  )
}
