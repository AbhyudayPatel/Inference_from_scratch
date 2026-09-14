import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const PIPE = `<svg width="700" height="270" viewBox="0 0 700 270">
  <defs><marker id="tarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">the tokenizer is the front door and the back door of the whole system</text>
  <rect x="250" y="34" width="200" height="36" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="350" y="57" text-anchor="middle" font-weight="700">USER TEXT</text>
  <line x1="350" y1="70" x2="350" y2="86" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#tarr)"/>
  <rect x="250" y="90" width="200" height="36" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="105" text-anchor="middle">pre-tokenize (regex chunks)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="119" text-anchor="middle">"Hello" " world" "!"</text>
  <line x1="350" y1="126" x2="350" y2="142" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#tarr)"/>
  <rect x="250" y="146" width="200" height="36" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="161" text-anchor="middle">BPE merges (rank table)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="175" text-anchor="middle">replay merges.txt, lowest rank first</text>
  <line x1="350" y1="182" x2="350" y2="198" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#tarr)"/>
  <rect x="250" y="202" width="200" height="36" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="217" text-anchor="middle">vocab lookup → IDs</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="231" text-anchor="middle">[15496, 995, 0]</text>
  <line x1="350" y1="238" x2="350" y2="252" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#tarr)"/>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="350" y="266" text-anchor="middle" font-weight="700">→ embedding table → GPU (Day 3)</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="30" y="120">DECODE runs it backwards:</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="30" y="136">IDs → token strings → raw bytes → UTF-8</text>
</svg>`

const TRADEOFF = `<svg width="700" height="170" viewBox="0 0 700 170">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">the fundamental tradeoff: vocabulary size vs sequence length</text>
  <line x1="70" y1="130" x2="640" y2="130" stroke="#d9d9de" stroke-width="1.5"/>
  <path d="M120,120 C 220,40 380,60 620,42" fill="none" stroke="#a5b4fc" stroke-width="2"/>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="500" y="34">sequence length (compute+KV)</text>
  <path d="M120,40 C 260,110 420,118 620,120" fill="none" stroke="#f59e0b" stroke-width="2"/>
  <text font-family="monospace" font-size="10" fill="#b45309" x="470" y="146">vocabulary size (embed matrix)</text>
  <circle cx="130" cy="115" r="5" fill="#4f46e5"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="88" y="100">char: |V|≈200</text>
  <circle cx="330" cy="82" r="6" fill="#059669"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="290" y="66" font-weight="700">subword: |V|≈50k–150k ✓</text>
  <circle cx="600" cy="44" r="5" fill="#4f46e5"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="540" y="30">word: |V|=∞, OOV</text>
</svg>`

const DEMO = [
  ['p', '=== WORD TOKENIZER (split on spaces) ==='],
  "vocab: {'hello': 0, 'world': 1, 'there': 2}",
  '"hello world"    -> [0, 1]',
  ['bad', '"hello universe" -> [0, -1]   (universe = OOV — the word-tokenizer disease)'],
  ['p', '=== CHAR TOKENIZER ==='],
  'vocab size: 9   ·   "hello world" -> 11 ids',
  "never OOV — but 12 tokens for one word 'unbelievable'",
  ['p', '=== THE TRADEOFF ==='],
  'word    |V|~100k+  1 token/word    OOV on any unseen word',
  'char    |V|~200    12 tokens/word  12x prefill compute + 12x KV cache',
  ['ok', 'subword |V|~50k   [un, believ, able]  unseen words COMPOSE from pieces'],
]

export default function S1_Abstraction() {
  return (
    <>
      <h2 id="abstraction">What a tokenizer actually is</h2>
      <p className="sub">Not an NLP topic — a systems component. It converts the unbounded mess of human text into a fixed table of integers the GPU can index.</p>
      <Diagram svg={PIPE}
        caption="Every serving system speaks tokens, never characters. The scheduler, the KV cache, and prefix caching are all keyed on token IDs — if the tokenizer lies, everything downstream lies." />
      <div className="card">
        <h3 style={{ marginTop: 0 }}>The contract</h3>
        <p style={{ marginBottom: 0 }}>
          <code className="inline">encode(text) → List[int]</code> and <code className="inline">decode(ids) → text</code> must be
          exact inverses. <strong>Special tokens</strong> (BOS/EOS/PAD/<code className="inline">&lt;|endoftext|&gt;</code>) are IDs reserved
          outside the BPE vocabulary with structural meaning. <strong>Context length</strong> is counted in
          tokens — so the tokenizer indirectly defines how much text "fits" in the model.
        </p>
      </div>
      <h3>The tradeoff, demonstrated</h3>
      <Term lines={DEMO} />
      <Diagram svg={TRADEOFF} caption="Subword tokenization is the sweet spot both axes hate the least. Code: 01_stupid_tokenizers.py" />
      <Callout kind="info" title="Remember three terms, exactly">
        <strong>token</strong> = one unit of the sequence · <strong>token string</strong> = its text form
        (<code className="inline">" world"</code>) · <strong>token ID</strong> = its row index in the embedding
        table (<code className="inline">995</code>). The ID has no meaning — it's an array index.
        <code className="inline"> vocab[ID] </code> and <code className="inline"> embedding[ID] </code> are pure lookups.
      </Callout>
      <div className="divider" />
    </>
  )
}
