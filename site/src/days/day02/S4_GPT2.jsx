import React from 'react'
import { Callout, Code, Diagram, Term } from '../../components/ui.jsx'

const BYTEMAP = `<svg width="700" height="150" viewBox="0 0 700 150">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">bytes_to_unicode(): why your vocab has "Ġ" everywhere</text>
  <rect x="20" y="36" width="320" height="96" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="36" y="58">188 printable bytes (0x21–0x7E etc.)</text>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="36" y="76" font-weight="700">→ map to themselves: 'a' → 'a'</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="36" y="100">68 ugly bytes (space, \\n, controls, DEL)</text>
  <text font-family="monospace" font-size="10" fill="#b45309" x="36" y="118" font-weight="700">→ remap to 256+n: space(0x20) → chr(288) = 'Ġ'</text>
  <rect x="380" y="36" width="300" height="96" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="396" y="58">why: BPE must merge *visible* symbols.</text>
  <text font-family="monospace" font-size="10" fill="#92400e" x="396" y="76">spaces/newlines can't live inside merge</text>
  <text font-family="monospace" font-size="10" fill="#92400e" x="396" y="92">rules as raw whitespace — as Ġ/Ċ they can.</text>
  <text font-family="monospace" font-size="10" fill="#92400e" x="396" y="112" font-weight="700">"Ġworld" = the token " world" (id 995)</text>
</svg>`

const FULLPIPE = `<svg width="700" height="235" viewBox="0 0 700 235">
  <defs><marker id="garr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">encode("Hello, world!") — the full pipeline, traced</text>
  <rect x="20" y="36" width="135" height="60" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="87" y="58" text-anchor="middle" font-weight="700">1 · REGEX CHUNK</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="87" y="74" text-anchor="middle">["Hello", ",",</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="87" y="86" text-anchor="middle"> " world", "!"]</text>
  <line x1="155" y1="66" x2="175" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#garr)"/>
  <rect x="179" y="36" width="135" height="60" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="246" y="58" text-anchor="middle" font-weight="700">2 · UTF-8 BYTES</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="246" y="74" text-anchor="middle">" world" → 20 77 6f</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="246" y="86" text-anchor="middle">72 6c 64</text>
  <line x1="314" y1="66" x2="334" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#garr)"/>
  <rect x="338" y="36" width="135" height="60" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="405" y="58" text-anchor="middle" font-weight="700">3 · BYTE→CHAR MAP</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="74" text-anchor="middle">0x20 → Ġ</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="405" y="86" text-anchor="middle">"Ġworld"</text>
  <line x1="473" y1="66" x2="493" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#garr)"/>
  <rect x="497" y="36" width="185" height="60" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="589" y="58" text-anchor="middle" font-weight="700">4 · BPE MERGE LOOP</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="589" y="74" text-anchor="middle">lowest rank first, from merges.txt</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="589" y="86" text-anchor="middle">Ġ,w,o,r,l,d → "Ġworld" (already in vocab)</text>
  <line x1="350" y1="96" x2="350" y2="120" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#garr)"/>
  <rect x="230" y="124" width="240" height="44" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="350" y="142" text-anchor="middle" font-weight="700">5 · VOCAB LOOKUP</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="350" y="158" text-anchor="middle">Hello→15496  ,→11  Ġworld→995  !→0</text>
  <rect x="20" y="188" width="660" height="34" rx="9" fill="#f5f5f7" stroke="#d9d9de" stroke-width="1.2"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="209" text-anchor="middle">decode = steps 5→1 in reverse: ids → strings → raw bytes → .decode("utf-8")</text>
</svg>`

const CORE_CODE = `def encode(self, text):
    ids = []
    for chunk in self.pat.findall(text):                      # 1 regex pre-tokenize
        mapped = "".join(BYTE_ENC[b] for b in chunk.encode("utf-8"))  # 2+3 bytes→chars
        for piece in self.bpe(mapped):                        # 4 merge by lowest rank
            ids.append(self.vocab[piece])                     # 5 lookup
    return ids

def bpe(self, token):                          # the whole algorithm:
    word = tuple(token)                        # start: one symbol per byte-char
    while len(word) > 1:
        i = argmin over adjacent pairs of merges_rank[pair]   # THE one rule
        if no pair is in merges.txt: break
        word = word[:i] + (word[i]+word[i+1],) + word[i+2:]   # merge best pair
    return word                                # tuple of vocab strings`

const GOLDEN = [
  ['p', '=== GOLDEN VECTORS (verified against HF) ==='],
  ['ok', "OK  'Hello world'    -> [15496, 995]          expected [15496, 995]"],
  ['ok', "OK  'Hello, world!'  -> [15496, 11, 995, 0]   expected [15496, 11, 995, 0]"],
  ['p', '=== ROUNDTRIP: decode(encode(x)) == x ==='],
  ['ok', "OK  'unbelievable'                       n=4"],
  ['ok', "OK  'Hello \\u0928\\u092e\\u0938\\u094d\\u0924\\u0947 \\U0001f600'  (Hindi+emoji)  n=15"],
  ['ok', "OK  'def attention(x):\\n    return x @ W'   n=14"],
  ['ok', "OK  '  multiple   spaces  '              n=7"],
  ['ok', "OK  '\\u4f60\\u597d\\uff0c\\u4e16\\u754c' (Chinese)          n=11"],
  ['p', '=== UNSEEN WORD ==='],
  "unbelievableness -> ['un','bel','iev','abl','eness']   subword composition works",
]

export default function S4_GPT2() {
  return (
    <>
      <h2 id="gpt2bpe">GPT-2 byte-level BPE — built and verified</h2>
      <p className="sub">Everything from sections 1–3, plus two real-world mechanisms: the byte→unicode map and the regex pre-tokenizer. ~60 lines of Python total.</p>
      <Diagram svg={BYTEMAP} caption="" />
      <Diagram svg={FULLPIPE} caption="The regex is load-bearing: it keeps spaces attached to following words (' world'), splits punctuation from words, and merges newline runs. Change the regex → different tokens, same algorithm." />
      <Code title="the entire encoder (04_gpt2_bpe.py)">{CORE_CODE}</Code>
      <Term lines={GOLDEN} />
      <Callout kind="disc" title="What this proves">
        If your implementation reproduces <code className="inline">[15496, 995]</code> from raw files, you own the
        algorithm — the only inputs were <code className="inline">vocab.json</code>, <code className="inline">merges.txt</code>,
        one regex, and one byte map. This exact knowledge is what HF <code className="inline">GPT2Tokenizer</code> wraps in
        1,000 lines of engineering. And decode being byte-exact on Hindi + emoji + code means the byte-level
        design really is universal.
      </Callout>
      <div className="divider" />
    </>
  )
}
