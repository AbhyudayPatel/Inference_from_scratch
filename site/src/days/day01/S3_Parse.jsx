import React from 'react'
import { Code, Diagram, Math, Tbl, R } from '../../components/ui.jsx'

const FILE_ANATOMY = `<svg width="620" height="240" viewBox="0 0 620 240">
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="40" y="30" width="120" height="120" rx="10" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-weight="700" font-size="11" fill="#1d1d1f" x="100" y="60" text-anchor="middle">8 bytes</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="82" text-anchor="middle">uint64 LE</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="98" text-anchor="middle">N = 14283</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="120" text-anchor="middle">"how big is</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="100" y="134" text-anchor="middle">the index?"</text>
  <rect x="170" y="30" width="240" height="120" rx="10" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-weight="700" font-size="11" fill="#1d1d1f" x="290" y="58" text-anchor="middle">JSON header — N bytes</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="290" y="80" text-anchor="middle">{ "h.0.attn.c_attn.weight":</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="290" y="96" text-anchor="middle">    { dtype, shape,</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="290" y="112" text-anchor="middle">      data_offsets }, ... }</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="290" y="134" text-anchor="middle">"where is everything?"</text>
  <rect x="420" y="30" width="160" height="120" rx="10" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-weight="700" font-size="11" fill="#1d1d1f" x="500" y="58" text-anchor="middle">raw buffer</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="500" y="80" text-anchor="middle">FP32 numbers,</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="500" y="96" text-anchor="middle">back to back</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="500" y="122" text-anchor="middle">"the actual data"</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="40" y="190">byte 0</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="130" y="190">byte 8</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="330" y="190">byte 8+N ← buffer starts here</text>
  <line x1="40" y1="172" x2="580" y2="172" stroke="#d9d9de" stroke-width="1.4"/>
  <line x1="40" y1="168" x2="40" y2="176" stroke="#9a9aa0" stroke-width="1.4"/>
  <line x1="160" y1="168" x2="160" y2="176" stroke="#9a9aa0" stroke-width="1.4"/>
  <line x1="410" y1="168" x2="410" y2="176" stroke="#9a9aa0" stroke-width="1.4"/>
  <line x1="580" y1="168" x2="580" y2="176" stroke="#9a9aa0" stroke-width="1.4"/>
  <text font-family="monospace" font-weight="700" font-size="11" fill="#4f46e5" x="310" y="222" text-anchor="middle">absolute file offset = 8 + N + begin</text>
</svg>`

const PIPELINE = `<svg width="700" height="120" viewBox="0 0 700 120">
  <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <rect x="10" y="35" width="88" height="46" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="54" y="54" text-anchor="middle">raw file</text><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="54" y="68" text-anchor="middle">bytes</text>
  <line x1="98" y1="58" x2="118" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="120" y="35" width="92" height="46" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="166" y="54" text-anchor="middle">8 bytes</text><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="166" y="68" text-anchor="middle">→ N</text>
  <line x1="212" y1="58" x2="232" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="234" y="35" width="96" height="46" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="282" y="54" text-anchor="middle">N bytes</text><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="282" y="68" text-anchor="middle">→ JSON</text>
  <line x1="330" y1="58" x2="350" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="352" y="35" width="100" height="46" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="402" y="54" text-anchor="middle">dict of</text><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="402" y="68" text-anchor="middle">metadata</text>
  <line x1="452" y1="58" x2="472" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="474" y="35" width="102" height="46" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="525" y="54" text-anchor="middle">frombuffer</text><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="525" y="68" text-anchor="middle">(zero-copy)</text>
  <line x1="576" y1="58" x2="596" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="598" y="35" width="92" height="46" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#065f46" x="644" y="54" text-anchor="middle">reshape →</text><text font-family="monospace" font-size="9.5" fill="#065f46" x="644" y="68" text-anchor="middle">ndarray</text>
</svg>`

const PARSER_CODE = `import json, struct
import numpy as np

def load_safetensors(path):
    with open(path, "rb") as f:
        (n,) = struct.unpack("<Q", f.read(8))      # 1 header length
        header = json.loads(f.read(n).decode("utf-8"))  # 2 JSON directory
        buffer = f.read()                             # 3 the raw buffer

    metadata = header.pop("__metadata__", None)     # 4 not a tensor!

    tensors = {}
    for name, info in header.items():
        begin, end = info["data_offsets"]           # 5 relative to buffer
        raw  = buffer[begin:end]                    # 6 slice the bytes
        arr  = np.frombuffer(raw, dtype=DTYPE_MAP[info["dtype"]])  # 7 zero-copy view
        tensors[name] = arr.reshape(info["shape"])  # 8 interpret as matrix
    return tensors, metadata`

const ENTRY_MATH = `invariant:  <span class="hl">elements × bytes-per-element = e − b</span>
1,769,472 × 4 = <span class="res">7,077,888 ✓</span>   ← always check this; it catches corrupt parses instantly`

export default function S3_Parse() {
  return (
    <>
      <h2 id="parse">Hand-parsing .safetensors</h2>
      <p className="sub">The entire format fits in one diagram. No compression, no code, no magic.</p>
      <Diagram svg={FILE_ANATOMY}
        caption="The whole spec: header-length prefix → JSON directory → raw tensor bytes. <strong>data_offsets are relative to the buffer start</strong>, not the file. That single detail is the classic hand-parser bug." />
      <h3>One header entry, dissected</h3>
      <div className="card">
        <Code bare title="a header entry">{`{
  "h.0.attn.c_attn.weight": {
    "dtype":        "F32",          // each number = 4 bytes
    "shape":        [768, 2304],    // 1,769,472 elements
    "data_offsets": [b, e]          // e − b = 7,077,888 bytes
  }
}`}</Code>
        <Math html={ENTRY_MATH} />
      </div>
      <h3>The parser — full code</h3>
      <Code title="code/inspect_safetensors.py — core loader">{PARSER_CODE}</Code>
      <h3>…line by line</h3>
      <Tbl head={['line', 'what it does', 'why it matters']}>
        <R cells={['1 · struct.unpack("&lt;Q", read(8))', 'reads 8 raw bytes as unsigned 64-bit int, little-endian (<code class="inline">&lt;</code> = LE, <code class="inline">Q</code> = u64)', 'the only framing the format has. Get endianness wrong and N is astronomically wrong → instant garbage']} monoCols={[0]} />
        <R cells={['2 · json.loads(read(n))', 'exactly N bytes → UTF-8 string → Python dict', 'bytes → text → dict: three representations of the same header; know which one you hold at each step']} monoCols={[0]} />
        <R cells={['3 · buffer = f.read()', 'everything after the header = the tensor warehouse', 'because we consumed 8+N bytes, <code class="inline">buffer[0]</code> <em>is</em> file offset 8+N — offsets "just work"']} monoCols={[0]} />
        <R cells={['4 · pop("__metadata__")', 'removes the non-tensor entry (<code class="inline">{"format": "pt"}</code>)', 'forget it and you\'ll try to "reshape" a metadata dict. Classic crash #1']} monoCols={[0]} />
        <R cells={['5 · data_offsets', '[begin, end) byte range of this tensor inside the buffer', 'relative to <strong>buffer start</strong>, not file start. absolute = 8 + N + begin']} monoCols={[0]} />
        <R cells={['6 · buffer[begin:end]', 'Python slice of bytes → a copy of this tensor\'s range', 'fine at this scale; the memmap version is your exercise']} monoCols={[0]} />
        <R cells={['7 · np.frombuffer(raw, F32)', 'reinterprets each 4-byte group as one float32 — <strong>zero-copy</strong>', 'bytes aren\'t numbers until a dtype gives them meaning. The most systems-y idea of the day']} monoCols={[0]} />
        <R cells={['8 · reshape(shape)', '1-D array of 1,769,472 floats → (768, 2304) matrix — a view, still no copy', 'the matrix doesn\'t exist on disk — only bytes + the metadata\'s <em>claim</em> about shape. Shape is interpretation']} monoCols={[0]} />
      </Tbl>
      <Diagram svg={PIPELINE} caption="~15 lines of real code. You can now parse any HF checkpoint on earth." />
      <div className="divider" />
    </>
  )
}
