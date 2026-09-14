import React from 'react'
import { Badges, Callout, Timeline } from '../../components/ui.jsx'

export default function S0_Hero() {
  return (
    <>
      <div className="kicker">Day 04 · the engine core</div>
      <h1>Never compute the same tensor twice.</h1>
      <p className="lede">
        Day 3 ended with a deliberate crime: every generated token recomputed attention over the
        entire prefix from scratch. Today we remove it — the <strong>KV cache</strong> — then scale
        from one request to many: <strong>paged KV memory</strong> (vLLM's PagedAttention) and
        <strong> continuous batching</strong> (the scheduler that decides who runs each iteration).
        Pure NumPy, verified against the same golden checksum. Serving over HTTP is Day 5.
      </p>
      <Badges items={[
        ['cache', 'prefill writes, decode appends'],
        ['3.9× faster', 'on just 8 tokens'],
        ['72 KiB / token', 'GPT-2 KV, FP32'],
        ['static vs continuous', '844 ms → 661 ms'],
        ['golden checksum', 'passes on the cached path'],
      ]} />

      <h2 id="timeline">The day at a glance</h2>
      <Timeline items={[
        { tag: 'P1', head: 'The waste', body: 'audit Day 3’s loop: what actually changes when a token is appended?', state: 'done' },
        { tag: 'P2', head: 'The cache', body: 'prefill writes rows 0..T-1; decode computes one row and appends', state: 'done' },
        { tag: 'P3', head: 'The golden checksum', body: 'prove the cache is behaviorally invisible — identical tokens', state: 'done' },
        { tag: 'P4', head: 'Paged KV memory', body: 'block tables, free lists, prefix sharing, copy-on-write', state: 'done' },
        { tag: 'P5', head: 'Continuous batching', body: 'iteration-level scheduling; capacity is memory, not FLOPs', state: 'done' },
        { tag: 'P6', head: 'Break it', body: 'stale rows, position offsets, cross-request contamination', state: 'done' },
        { tag: 'P7', head: 'How engines do it', body: 'vLLM · SGLang · TRT-LLM · llama.cpp · Dynamo, mapped', state: 'done' },
        { tag: 'P8', head: 'Field guide', body: 'capacity worksheet + debugging order for cache bugs', state: 'done' },
      ]} />

      <Callout kind="info" title="The one principle for the entire page">
        <strong>Past tokens never change.</strong> The K/V rows attention computed for token 7 depend only
        on tokens 0–7. When token 8 arrives, those rows are still correct — recomputing them is waste,
        not correctness. Everything today follows from that: cache the rows (P2), pack them efficiently
        (P4), and share the GPU between many such loops (P5).
      </Callout>
      <div className="divider" />
    </>
  )
}
