import React from 'react'
import { Callout, Diagram, Tbl, R } from '../../components/ui.jsx'

const FORMAT_ANATOMY = `<svg width="700" height="235" viewBox="0 0 700 235">
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">three formats, one lens: where's the index, where's the data, can it run code?</text>
  <rect x="20" y="36" width="212" height="180" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="126" y="56" text-anchor="middle" font-weight="700">.safetensors</text>
  <rect x="34" y="66" width="184" height="22" fill="#fffbeb" stroke="#fcd34d"/>
  <text font-family="monospace" font-size="9" fill="#92400e" x="126" y="81" text-anchor="middle">8B header length</text>
  <rect x="34" y="88" width="184" height="22" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="126" y="103" text-anchor="middle">JSON index (names, shapes, offsets)</text>
  <rect x="34" y="110" width="184" height="22" fill="#ecfdf5" stroke="#6ee7b7"/>
  <text font-family="monospace" font-size="9" fill="#065f46" x="126" y="125" text-anchor="middle">raw tensor bytes</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="126" y="152" text-anchor="middle" font-weight="700">✓ cannot execute code</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="126" y="166" text-anchor="middle" font-weight="700">✓ mmap / zero-copy / lazy</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="126" y="186" text-anchor="middle">index: up front, human-readable</text>
  <rect x="244" y="36" width="212" height="180" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="350" y="56" text-anchor="middle" font-weight="700">pytorch_model.bin</text>
  <rect x="258" y="66" width="184" height="22" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="350" y="81" text-anchor="middle">ZIP container</text>
  <rect x="258" y="88" width="184" height="44" fill="#fef2f2" stroke="#fecaca"/>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="350" y="103" text-anchor="middle">pickle byte stream</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="350" y="117" text-anchor="middle">(index + data interleaved as opcodes)</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="350" y="152" text-anchor="middle" font-weight="700">✗ unpickling EXECUTES code</text>
  <text font-family="monospace" font-size="9" fill="#991b1b" x="350" y="166" text-anchor="middle" font-weight="700">✗ no mmap, no partial reads</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="350" y="186" text-anchor="middle">index: none — you must run it</text>
  <rect x="468" y="36" width="212" height="180" rx="10" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10.5" fill="#1d1d1f" x="574" y="56" text-anchor="middle" font-weight="700">.gguf (llama.cpp)</text>
  <rect x="482" y="66" width="184" height="22" fill="#fffbeb" stroke="#fcd34d"/>
  <text font-family="monospace" font-size="9" fill="#92400e" x="574" y="81" text-anchor="middle">magic + version + counts</text>
  <rect x="482" y="88" width="184" height="22" fill="#eef2ff" stroke="#a5b4fc"/>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="574" y="103" text-anchor="middle">metadata KV + tensor infos</text>
  <rect x="482" y="110" width="184" height="22" fill="#ecfdf5" stroke="#6ee7b7"/>
  <text font-family="monospace" font-size="9" fill="#065f46" x="574" y="125" text-anchor="middle">quantized tensor blocks (Q4_K…)</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="574" y="152" text-anchor="middle" font-weight="700">✓ mmap; quantization built in</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="574" y="166" text-anchor="middle">dequant happens in-kernel ⏭ Day 5</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="574" y="186" text-anchor="middle">index: up front, binary</text>
</svg>`

export default function S2_Formats() {
  return (
    <>
      <h2 id="formats">Every checkpoint format, one lens</h2>
      <p className="sub">We implement safetensors today. Know all six — production will make you meet every one of them.</p>
      <Diagram svg={FORMAT_ANATOMY}
        caption="The three questions that classify any weight format: (1) where's the index? (2) where are the raw bytes? (3) can reading it execute code? safetensors and GGUF put a safe index up front; pickle interleaves everything into executable opcodes." />
      <Tbl head={['format', 'what it physically is', 'pros', 'cons']}>
        <R cells={['.safetensors', '8-byte length + JSON dir + raw bytes', 'zero-copy mmap · no code execution · fast parallel load', 'weights only, no optimizer state']} monoCols={[0]} />
        <R cells={['pytorch_model.bin', 'pickled state_dict inside a ZIP', 'native torch', '<strong>arbitrary code execution on load</strong> · slow · needs torch']} monoCols={[0]} />
        <R cells={['.gguf', 'llama.cpp format: metadata + quantized tensors, self-contained', 'CPU-friendly · quantization built in · mmap', 'mostly llama.cpp ecosystem · needs conversion']} monoCols={[0]} />
        <R cells={['.onnx', 'a computation <em>graph</em> (protobuf), not just weights', 'portable across runtimes (ORT, TensorRT)', 'opset compatibility pain · rigid']} monoCols={[0]} />
        <R cells={['.ckpt / .pt', 'generic pickle checkpoint', 'flexible', 'same pickle dangers']} monoCols={[0]} />
        <R cells={['sharded safetensors', '<code class="inline">model-0000X-of-0000Y</code> + <code class="inline">index.json</code> mapping name→file', 'required past single-file limits (70B+)', 'extra index-resolution step']} monoCols={[0]} />
      </Tbl>
      <Callout kind="info" title="Why engines prefer safetensors">
        mmap the file → tensors become pageable memory → load lazily and in parallel → no pickle means no code
        execution. vLLM's fast loader is built on exactly this property.
      </Callout>
      <Callout kind="trap" title="Why pickle died">
        <code className="inline">torch.load</code> on a <code className="inline">.bin/.pt</code> unpickles — and pickle can
        execute <strong>arbitrary code</strong> hidden in the file. PyTorch ≥ 2.6 defaults
        to <code className="inline">weights_only=True</code> for this reason. safetensors won because JSON + raw bytes
        is <em>incapable</em> of executing anything — you'll prove that by hand today: nothing in your parser
        could run code.
      </Callout>
      <div className="divider" />
    </>
  )
}
