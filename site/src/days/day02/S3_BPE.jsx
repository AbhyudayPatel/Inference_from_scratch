import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const TRAIN_VS_RUN = `<svg width="700" height="185" viewBox="0 0 700 185">
  <defs><marker id="barr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="20" y="30" width="320" height="135" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="sans-serif" font-weight="700" font-size="11.5" fill="#1d1d1f" x="40" y="54">TRAINING (once, offline, on a corpus)</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="76">huge corpus → count adjacent pairs</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="92">→ merge most frequent → update symbols</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="108">→ repeat ~50,000 times</text>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="40" y="130" font-weight="700">outputs: vocab.json + merges.txt</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="40" y="148">you will never do this in production</text>
  <rect x="380" y="30" width="300" height="135" rx="10" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="sans-serif" font-weight="700" font-size="11.5" fill="#1d1d1f" x="400" y="54">INFERENCE (per request, hot path)</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="400" y="76">text → chunks → REPLAY merge table</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="400" y="92">lowest rank first → vocab lookup</text>
  <text font-family="monospace" font-size="10" fill="#4f46e5" x="400" y="114" font-weight="700">nothing is counted. nothing is learned.</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="400" y="136">rank in the file = priority. that's the whole rule.</text>
  <line x1="340" y1="97" x2="376" y2="97" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#barr)"/>
</svg>`

const MERGE_TRACE = `<svg width="700" height="150" viewBox="0 0 700 150">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">BPE in one picture — corpus: low · lower · lowest · newest · widest</text>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="40" y="55">l o w e r</text>
  <path d="M44,60 q10,14 22,0" fill="none" stroke="#4f46e5" stroke-width="1.6"/>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="47" y="80">(l,o)×3</text>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="180" y="55">→  lo w e r</text>
  <path d="M196,60 q12,14 24,0" fill="none" stroke="#4f46e5" stroke-width="1.6"/>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="188" y="80">(lo,w)×3</text>
  <text font-family="monospace" font-size="11" fill="#1d1d1f" x="330" y="55">→  low e r</text>
  <text font-family="monospace" font-size="11" fill="#6e6e73" x="440" y="55">…(e,s)×3 → (es,t)×3 …</text>
  <text font-family="monospace" font-size="11" fill="#059669" x="40" y="122" font-weight="700">learned table:  0:(l,o)  1:(lo,w)  2:(e,s)  3:(es,t)  4:(est,&lt;/w&gt;)</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="140">"slowest" (unseen word) → s + low + est&lt;/w&gt;  — decomposes sanely. That's the point.</text>
</svg>`

const TRAIN_OUT = [
  ['p', 'step 1: most frequent pair = (l, o) x3  -> merge into lo'],
  ['p', 'step 2: (lo, w) x3 -> low'],
  ['p', 'step 3: (e, s) x3 -> es'],
  ['p', 'step 4: (es, t) x3 -> est'],
  ['p', 'step 5: (est, </w>) x3'],
  ['p', '=== LEARNED MERGE TABLE (= merges.txt) ==='],
  '   0: l o      1: lo w      2: e s      3: es t      4: est </w>',
  ['p', '=== INFERENCE = replay the table ==='],
  "'lowest'  -> ['low', 'est</w>']",
  "'widest'  -> ['w', 'i', 'd', 'est</w>']",
  ['ok', "'slowest' -> ['s', 'low', 'est</w>']   <- unseen word still decomposes"],
]

export default function S3_BPE() {
  return (
    <>
      <h2 id="bpe">BPE: the algorithm, in two lives</h2>
      <p className="sub">"BPE tokenizer" conflates two completely different programs. Confusing them is the #1 beginner misconception.</p>
      <Diagram svg={TRAIN_VS_RUN} caption="" />
      <h3>Training, hand-traced (toy corpus)</h3>
      <Diagram svg={MERGE_TRACE} caption="" />
      <Term lines={TRAIN_OUT} />
      <Callout kind="info" title="The one rule that governs inference">
        At encode time you do <strong>not</strong> count frequencies — the corpus is gone. You scan the current
        symbol sequence for the adjacent pair with the <strong>lowest rank in merges.txt</strong>, merge it, repeat.
        Rank <em>is</em> priority. Rank 0 merges before rank 10 even if the latter appears more often in your string.
      </Callout>
      <Callout kind="warn" title="Complexity: naive is O(n²)">
        Each merge pass rescans the sequence; long inputs hurt. Production tokenizers add:
        a <strong>pair cache</strong> (our <code className="inline">self.cache</code> — repeated words skip the loop entirely),
        heaps for best-pair lookup, Rust implementations, SIMD string scanning, and batch parallelism.
        Measured today: our cached Python does ~1.8 MB/s; HF's Rust <code className="inline">tokenizers</code> does ~100+ MB/s.
        <strong> Same algorithm — pure systems engineering gap.</strong>
      </Callout>
      <div className="divider" />
    </>
  )
}
