import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const SWAP = `<svg width="700" height="150" viewBox="0 0 700 150">
  <defs><marker id="sarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">a "tokenizer family" is just a bundle of files. the engine doesn't change.</text>
  <rect x="20" y="38" width="200" height="76" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="120" y="58" text-anchor="middle" font-weight="700">vocab.json</text>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="120" y="74" text-anchor="middle" font-weight="700">merges.txt</text>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="120" y="90" text-anchor="middle" font-weight="700">regex + specials</text>
  <line x1="220" y1="76" x2="255" y2="76" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#sarr)"/>
  <rect x="260" y="38" width="180" height="76" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="68" text-anchor="middle" font-weight="700">ONE ByteBPE CLASS</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="86" text-anchor="middle">(today's ~60 lines)</text>
  <line x1="440" y1="76" x2="475" y2="76" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#sarr)"/>
  <rect x="480" y="38" width="100" height="30" rx="7" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="530" y="57" text-anchor="middle">GPT-2 (2019)</text>
  <rect x="480" y="76" width="100" height="30" rx="7" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.3"/>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="530" y="95" text-anchor="middle">Qwen3 (2025)</text>
  <rect x="590" y="38" width="95" height="68" rx="7" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="637" y="66" text-anchor="middle">next model</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="637" y="82" text-anchor="middle">= new files</text>
</svg>`

const ECON_OUT = [
  ['p', '=== TOKEN ECONOMICS: same meaning, different token counts (verified) ==='],
  'text       bytes  gpt2 tokens  qwen3 tokens',
  'english    49     9            9',
  'hindi      97     57           35',
  ['ok', 'chinese    39     32           7    <- 4.6x fewer tokens'],
  'emoji      25     16           8',
  'code       56     26           19',
  ['p', 'larger vocab (151,936 vs 50,257) => fewer tokens per byte =>'],
  ['p', 'less prefill compute, smaller KV cache, better multilingual compression.'],
]

export default function S5_OneEngine() {
  return (
    <>
      <h2 id="oneengine">One engine, many tokenizers</h2>
      <p className="sub">The payoff: our from-scratch class loads Qwen3's files — vocab, merges, and the pre-tokenizer regex parsed straight out of <code className="inline">tokenizer.json</code> — and becomes a 2025 tokenizer. Six years of progress = different files, same algorithm.</p>
      <Diagram svg={SWAP} caption="Code: 05_one_engine_many_tokenizers.py — ByteBPE.from_hf_fast() reads regex + added_tokens from tokenizer.json. Verified: Qwen3 loads as vocab=151,643, merges=151,387, specials=26." />
      <h3>Token economics, measured</h3>
      <Term lines={ECON_OUT} />
      <Callout kind="disc" title="This is why tokenizer design is inference economics">
        A Hindi sentence costs GPT-2 <strong>57 tokens</strong> vs Qwen3's <strong>35</strong>; Chinese is
        32 vs <strong>7</strong>. Tokens are the billing unit of compute: prefill FLOPs, KV-cache slots,
        decode steps. A model with a better-multilingual tokenizer is <em>literally cheaper to serve</em> for
        non-English traffic — before you touch a single kernel.
      </Callout>
      <div className="divider" />
    </>
  )
}
