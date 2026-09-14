import React from 'react'
import { Callout, Timeline } from '../../components/ui.jsx'

export default function S0_Hero() {
  return (
    <>
      <section className="hero">
        <div className="day-chip">Day 02 · tokenization masterclass</div>
        <h1>
          Tokenization, <em>from scratch.</em>
          <span className="sub">
            Text → bytes → merges → IDs → and back. One BPE engine written once, driving GPT-2 (2019)
            and Qwen3 (2025) by swapping files. No <code>transformers</code>. No <code>tiktoken</code>.
            Not even <code>numpy</code> — this day is pure Python + the <code>regex</code> package.
          </span>
        </h1>
        <div className="strap">
          <span className="chip">|V| = 50,257 → 151,936</span>
          <span className="chip">golden: "Hello world" → [15496, 995]</span>
          <span className="chip">Chinese: 32 → 7 tokens</span>
          <span className="chip">vocab = 26% of a 596M model</span>
        </div>
      </section>

      <h2 id="timeline">The day at a glance</h2>
      <Timeline items={[
        { tag: 'P1', head: 'The abstraction + the tradeoff', body: 'word vs char vs subword, built three stupid ways', state: 'done' },
        { tag: 'P2', head: 'Unicode & UTF-8', body: 'code points vs bytes; why BPE runs on bytes', state: 'done' },
        { tag: 'P3', head: 'BPE training, toy-scale', body: 'low/lower/lowest → a merge table; training ≠ inference', state: 'done' },
        { tag: 'P4', head: 'GPT-2 byte-level BPE from scratch', body: 'byte→unicode map, regex pre-tokenizer, merge ranks; golden vectors pass', state: 'done' },
        { tag: 'P5', head: 'One engine, many tokenizers', body: 'same class → Qwen3 via tokenizer.json; specials + ChatML; tokens/byte economics', state: 'done' },
        { tag: 'P6', head: 'Vocab ↔ model economics', body: 'embedding & LM-head param math; reproduces 124,439,808 exactly', state: 'done' },
        { tag: 'P7', head: 'The taxonomy', body: 'BPE vs WordPiece vs Unigram; SentencePiece; the family map', state: 'done' },
        { tag: 'P8', head: 'Field guide', body: 'reverse-engineer any model’s tokenizer in 10 minutes', state: 'done' },
      ]} />

      <Callout kind="info" title="How to read this page">
        Eight questions, in order: <strong>What is a tokenizer?</strong> → <strong>why subwords?</strong> →
        <strong> what is text physically?</strong> → <strong>how does BPE learn?</strong> →
        <strong> how does real BPE run?</strong> → <strong>what else is out there?</strong> →
        <strong> what wraps around it?</strong> → <strong> why does serving care?</strong> →
        <strong> how do I reverse-engineer any new model?</strong> Every claim is backed by code that ran today.
      </Callout>
      <div className="divider" />
    </>
  )
}
