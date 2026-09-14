import React from 'react'
import { Badges, Callout, Timeline } from '../../components/ui.jsx'

export default function S0_Hero() {
  return (
    <>
      <div className="kicker">Day 05 · the network boundary</div>
      <h1>Serve it. Stream it. Survive it.</h1>
      <p className="lede">
        Days 1–4 built the engine: loader, tokenizer, forward pass, KV cache, scheduler. Today it
        meets the network — a real <strong>HTTP API</strong> with JSON responses,
        <strong> server-sent-event streaming</strong>, per-request sampling, concurrency, abort
        handling, and load testing. The model math never changes; everything today is
        <strong> state, lifecycle, and edges</strong> — the half of inference engineering that only
        exists because other humans are now involved.
      </p>
      <Badges items={[
        ['FastAPI', '3 endpoints, real HTTP tests'],
        ['SSE streaming', '8 frames, first = " the"'],
        ['17 → 24 tok/s', 'concurrency 1 → 8'],
        ['5 serving bugs', 'each reproduced'],
        ['golden checksum', 'passes over the wire'],
      ]} />

      <h2 id="timeline">The day at a glance</h2>
      <Timeline items={[
        { tag: 'P1', head: 'The request lifecycle', body: 'validate → tokenize → admit → prefill → decode → detokenize → respond', state: 'done' },
        { tag: 'P1.5', head: 'One process, 100s of requests', body: 'the #1 serving confusion, answered: shared read-only weights + tiny per-request state + one loop', state: 'done' },
        { tag: 'P2', head: 'The engine object', body: 'state machine + worker thread + truly batched decode (padded-KV mask)', state: 'done' },
        { tag: 'P3', head: 'The API', body: '/v1/generate, /v1/chat/completions, JSON errors that fail BEFORE compute', state: 'done' },
        { tag: 'P4', head: 'Streaming', body: 'SSE frames, incremental detokenization, TTFT and TPOT', state: 'done' },
        { tag: 'P5', head: 'Load', body: 'concurrency sweep 1→8: throughput up, queue appears exactly at MAX_BATCH', state: 'done' },
        { tag: 'P6', head: 'Break it', body: 'temperature=0, context overflow, split UTF-8, shared RNG, disconnect leak', state: 'done' },
        { tag: 'P7', head: 'How engines serve', body: 'vLLM OpenAI server · SGLang · TRT-LLM · Dynamo disaggregation', state: 'done' },
        { tag: 'P8', head: 'Field guide', body: 'five-timescale map + serving debug order', state: 'done' },
      ]} />

      <Callout kind="info" title="The one principle for the entire page">
        <strong>A request is a state machine, not a function call.</strong> It arrives, waits, computes in
        bursts, may be cancelled at any instant, and must release everything it holds. The model is a
        pure function — <code className="inline">f(ids, W) → logits</code> — that never changes. Serving
        is the discipline of running that pure function for many people at once without leaking
        memory, mixing contexts, or lying about errors.
      </Callout>
      <div className="divider" />
    </>
  )
}
