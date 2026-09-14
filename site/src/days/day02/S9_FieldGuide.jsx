import React from 'react'
import { Callout, Diagram } from '../../components/ui.jsx'

const STACK = `<svg width="700" height="250" viewBox="0 0 700 250">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="22">the full loop you now own end-to-end (Day 1 + Day 2)</text>
  <rect x="120" y="36" width="460" height="36" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="350" y="59" text-anchor="middle">serving: batching · paged KV · scheduling  (Day 4+)  ⏭</text>
  <rect x="120" y="80" width="460" height="36" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="350" y="103" text-anchor="middle">forward pass: embedding → attention → MLP → logits  (Day 3)  ◄ NEXT</text>
  <rect x="120" y="124" width="460" height="36" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11" fill="#065f46" x="350" y="147" text-anchor="middle" font-weight="700">tokenization: bytes → merges → IDs → bytes  ✓ TODAY</text>
  <rect x="120" y="168" width="460" height="36" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.6"/>
  <text font-family="monospace" font-size="11" fill="#065f46" x="350" y="191" text-anchor="middle" font-weight="700">loading: formats · 4-hook protocol · sharding · tying  ✓ DAY 1</text>
  <text font-family="monospace" font-size="10.5" fill="#6e6e73" x="30" y="195">built →</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="350" y="232" text-anchor="middle">TEXT → TOKENIZE → IDs → EMBED → TRANSFORMER → LOGITS → SAMPLE → ID → DETOKENIZE → TEXT</text>
</svg>`

export default function S9_FieldGuide() {
  return (
    <>
      <h2 id="fieldguide">The field guide — any model, 10 minutes</h2>
      <p className="sub">Don't memorize tokenizers. Keep the checklist that reverse-engineers any of them from its repo.</p>
      <div className="card">
        <ol style={{ marginBottom: 0, columns: 2, columnGap: '32px' }}>
          <li>Which files exist? (<code className="inline">merges.txt</code> → BPE · <code className="inline">tokenizer.model</code> → SentencePiece · <code className="inline">vocab.txt</code> → WordPiece)</li>
          <li><code className="inline">tokenizer.json → model.type</code>? (BPE / Unigram)</li>
          <li>Normalizer? (NFC/NFKC, lowercasing, whitespace)</li>
          <li>Pre-tokenizer regex? (what's a "chunk")</li>
          <li>Byte-level or char-level? (byte fallback?)</li>
          <li>Vocab size? (→ embed/LM-head params)</li>
          <li>Special tokens + their ids? (BOS/EOS/PAD roles)</li>
          <li>Chat template? (serialize one message by hand, diff against expected)</li>
          <li>Tool/FIM/reasoning tokens?</li>
          <li>Tokens/byte on English vs your target language? (run the benchmark)</li>
          <li>Roundtrip: does <code className="inline">decode(encode(x)) == x</code> hold?</li>
          <li>How does the server tokenize? (HF fast / tiktoken / own impl — incremental decode?)</li>
        </ol>
      </div>
      <h3>Exercises</h3>
      <div className="card">
        <ol style={{ marginBottom: 0 }}>
          <li>Train BPE on your own 5-word corpus by hand on paper; check against <code className="inline">03_bpe_train.py</code>.</li>
          <li>Trace <code className="inline">"Hello, नमस्ते 😀"</code> through all 5 pipeline stages by hand; verify with <code className="inline">04</code>.</li>
          <li>Break it: remove the <code className="inline">\s+(?!\S)</code> regex alternative — watch newline handling change.</li>
          <li>Load <code className="inline">meta-llama/Llama-3.2-1B</code>'s tokenizer.json into our class. What breaks? (Their vocab uses a different byte encoding — find out which.)</li>
          <li><code className="inline">notes/errors.md</code> — log today's bugs (tuple slip, cp1252 prints, merge-rank off-by-ones).</li>
        </ol>
      </div>
      <Diagram svg={STACK} caption="" />
      <Callout kind="info" title="Up next — Day 3: the forward pass">
        Token IDs meet the weights from Day 1: <code className="inline">wte[ids] + wpe[pos]</code> → 12 blocks of
        LayerNorm → attention (with the causal mask we found as junk on disk) → GELU MLP → tied LM head →
        sampling. Greedy checksum: <em>"Alan Turing theorized that computers would one day become"</em> →{' '}
        <em>" the most powerful machines on the planet."</em>
      </Callout>
      <div className="foot">Day 02 · the tokenization masterclass · Inference From Scratch · pure Python + regex, no tokenizer libraries</div>
    </>
  )
}
