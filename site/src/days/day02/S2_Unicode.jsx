import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const UTF8 = `<svg width="700" height="210" viewBox="0 0 700 210">
  <defs><marker id="uarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">what text physically is: code point → UTF-8 bytes</text>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="40" y="55" font-weight="700">"A"</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="72">U+0041</text>
  <line x1="110" y1="62" x2="160" y2="62" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#uarr)"/>
  <rect x="165" y="48" width="42" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="186" y="65" text-anchor="middle">41</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="186" y="90" text-anchor="middle">1 byte</text>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="40" y="128" font-weight="700">"अ"</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="40" y="145">U+0905 (Devanagari)</text>
  <line x1="110" y1="135" x2="160" y2="135" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#uarr)"/>
  <rect x="165" y="121" width="42" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <rect x="207" y="121" width="42" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <rect x="249" y="121" width="42" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="186" y="138" text-anchor="middle">e0</text>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="228" y="138" text-anchor="middle">a4</text>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="270" y="138" text-anchor="middle">85</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="228" y="163" text-anchor="middle">3 bytes</text>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="430" y="55" font-weight="700">"😀"</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="430" y="72">U+1F600</text>
  <line x1="490" y1="62" x2="540" y2="62" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#uarr)"/>
  <rect x="545" y="48" width="30" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <rect x="575" y="48" width="30" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <rect x="605" y="48" width="30" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <rect x="635" y="48" width="30" height="26" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="560" y="65" text-anchor="middle">f0</text>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="590" y="65" text-anchor="middle">9f</text>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="620" y="65" text-anchor="middle">98</text>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="650" y="65" text-anchor="middle">80</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="605" y="90" text-anchor="middle">4 bytes</text>
  <rect x="380" y="112" width="300" height="66" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="530" y="134" text-anchor="middle" font-weight="700">byte-level BPE insight</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="530" y="150" text-anchor="middle">256 base symbols spell ANY UTF-8 text:</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="530" y="165" text-anchor="middle">no per-language vocab, no UNK, ever</text>
</svg>`

const BYTES_OUT = [
  ['p', "char    codepoint  UTF-8 bytes       #bytes"],
  "'A'     U+0041    41                1",
  "'\\u0905' U+0905  e0 a4 85          3   (Devanagari)",
  "'\\u4f60' U+4F60  e4 bd a0          3   (CJK)",
  "'\\U0001f600' U+1F600  f0 9f 98 80  4   (emoji)",
  ['p', '— same meaning, different byte counts —'],
  'english  chars=11  utf8_bytes=11',
  'hindi    chars=6   utf8_bytes=18',
  'chinese  chars=4   utf8_bytes=12',
  'emoji    chars=3   utf8_bytes=12',
]

export default function S2_Unicode() {
  return (
    <>
      <h2 id="unicode">Unicode, UTF-8, and why BPE runs on bytes</h2>
      <p className="sub">Three different objects people conflate: the <em>character</em> you see, its <em>code point</em> (U+XXXX), and the <em>UTF-8 bytes</em> on disk. Only the bytes are physical.</p>
      <Diagram svg={UTF8} caption="Code: 02_bytes.py — run .encode('utf-8') on your own name. The byte count of a language decides its token cost." />
      <Term lines={BYTES_OUT} />
      <Callout kind="disc" title="Why this decides tokenizer design">
        A char-level vocab needs an entry per Unicode code point (149,000+ exist and counting).
        A byte-level vocab needs exactly <strong>256 base symbols</strong> — and can spell any text in any
        language, plus URLs, code, and corrupted data. GPT-2 (2019), Llama 3, Qwen, DeepSeek and GLM all
        chose bytes. That one choice is why "tokenizer weirdness" with Hindi or emoji is always explainable
        as <em>byte economics</em>, never magic.
      </Callout>
      <Callout kind="warn" title="Windows console trap (hit twice on Day 1, again today)">
        Python's default stdout on Windows is cp1252 — printing Hindi/emoji crashes with
        <code className="inline"> UnicodeEncodeError</code>. Every script in this lab prints
        <code className="inline"> ascii(text)</code> escapes instead. The tokenizer itself handles bytes, so it's
        immune; only your <code className="inline">print</code> statements are not.
      </Callout>
      <div className="divider" />
    </>
  )
}
