import React from 'react'
import { Callout, Diagram, Term } from '../../components/ui.jsx'

const CHATPIPE = `<svg width="700" height="190" viewBox="0 0 700 190">
  <defs><marker id="carr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">messages ≠ tokens: the serialization layer in between</text>
  <rect x="20" y="36" width="170" height="60" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="105" y="55" text-anchor="middle">[{"role":"user",</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="105" y="70" text-anchor="middle">"content":"Hello"}]</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="105" y="88" text-anchor="middle">your JSON</text>
  <line x1="190" y1="66" x2="218" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#carr)"/>
  <rect x="222" y="36" width="170" height="60" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="307" y="57" text-anchor="middle" font-weight="700">CHAT TEMPLATE</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="307" y="73" text-anchor="middle">Jinja, in tokenizer_config</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="307" y="87" text-anchor="middle">(Qwen3's is 4,168 chars)</text>
  <line x1="392" y1="66" x2="420" y2="66" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#carr)"/>
  <rect x="424" y="36" width="256" height="60" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="552" y="52" text-anchor="middle">"&lt;|im_start|&gt;user\\nHello&lt;|im_end|&gt;\\n</text>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="552" y="67" text-anchor="middle"> &lt;|im_start|&gt;assistant\\n"</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="552" y="86" text-anchor="middle">serialized prompt string</text>
  <line x1="350" y1="96" x2="350" y2="120" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#carr)"/>
  <rect x="230" y="124" width="240" height="44" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="350" y="142" text-anchor="middle" font-weight="700">tokenizer → IDs</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="350" y="158" text-anchor="middle">[151644, 872, 198, 13089, 151645, ...]</text>
</svg>`

const CHAT_OUT = [
  ['p', '=== SPECIAL TOKENS: matched BEFORE BPE, never BPE\'d ==='],
  "'<|im_start|>user' -> [151644, 872]   (151644 = one atomic id)",
  "'Hello<|endoftext|>' (GPT-2) -> [15496, 50256]",
  ['p', '=== CHAT TEMPLATE: messages -> serialized -> IDs ==='],
  "'<|im_start|>system\\nYou are a helpful assistant.<|im_end|>\\n<|im_start|>user\\nHello!<|im_end|>\\n<|im_start|>assistant\\n'",
  '-> 21 ids: [151644, 8948, 198, 2610, 525, 264, 10950, 17847, 13, 151645, 198, 151644, ...]',
]

export default function S7_SpecialsChat() {
  return (
    <>
      <h2 id="specials">Special tokens &amp; chat templates</h2>
      <p className="sub">The model never sees your JSON messages. It sees one serialized string — and getting that string byte-exact is the serving layer's job.</p>
      <Diagram svg={CHATPIPE} caption="Tool calls, reasoning markers (<think>), FIM tokens — all just more added special tokens serialized by the same template." />
      <Term lines={CHAT_OUT} />
      <Callout kind="trap" title="Why specials are never BPE'd">
        If <code className="inline">&lt;|im_start|&gt;</code> went through BPE it would shred into
        <code className="inline"> "&lt;", "|", "im", "_start", ...</code> — and the model would see ordinary
        text tokens instead of the ONE trained control id (151644) that switches its behavior. So encoders scan
        for special strings <em>first</em>, emit their ids atomically, and BPE only the text in between.
        A serving bug here (template mismatch, wrong generation prompt) doesn't crash — the model just gets
        subtly wrong input and quality silently degrades. This is a top-3 production footgun.
      </Callout>
      <div className="divider" />
    </>
  )
}
