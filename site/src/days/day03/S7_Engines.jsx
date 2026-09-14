import React from 'react'
import { Callout, Diagram, Tbl, R } from '../../components/ui.jsx'

const SAME_MATH = `<svg width="700" height="235" viewBox="0 0 700 235">
  <defs><marker id="earr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">same mathematical graph — different physical execution plans</text>
  <rect x="22" y="40" width="656" height="38" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="350" y="63" text-anchor="middle" font-weight="700">LN → QKV GEMM → causal attention → out GEMM → residual → LN → MLP → residual → LM head</text>
  <line x1="350" y1="78" x2="350" y2="101" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#earr3)"/>
  <rect x="22" y="105" width="125" height="78" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="84" y="125" text-anchor="middle" font-weight="700">HF</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="84" y="142" text-anchor="middle">PyTorch eager / compile</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="84" y="157" text-anchor="middle">SDPA backend select</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="84" y="172" text-anchor="middle">correctness baseline</text>
  <rect x="157" y="105" width="125" height="78" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="219" y="125" text-anchor="middle" font-weight="700">vLLM</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="219" y="142" text-anchor="middle">FlashAttention prefill</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="219" y="157" text-anchor="middle">PagedAttention decode</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="219" y="172" text-anchor="middle">CUDA graph + batch</text>
  <rect x="292" y="105" width="125" height="78" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="354" y="125" text-anchor="middle" font-weight="700">SGLang</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="354" y="142" text-anchor="middle">attention backends</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="354" y="157" text-anchor="middle">Radix prefix cache</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="354" y="172" text-anchor="middle">scheduler overlap</text>
  <rect x="427" y="105" width="125" height="78" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="489" y="125" text-anchor="middle" font-weight="700">TRT-LLM</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="489" y="142" text-anchor="middle">compiled graph/plugins</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="489" y="157" text-anchor="middle">autotuned kernels</text>
  <text font-family="monospace" font-size="8.8" fill="#065f46" x="489" y="172" text-anchor="middle">FP8/INT4 paths</text>
  <rect x="562" y="105" width="116" height="78" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="620" y="125" text-anchor="middle" font-weight="700">llama.cpp</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="620" y="142" text-anchor="middle">GGML graph</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="620" y="157" text-anchor="middle">quant block GEMM</text>
  <text font-family="monospace" font-size="8.8" fill="#6e6e73" x="620" y="172" text-anchor="middle">CPU SIMD / GPU backends</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="216" text-anchor="middle">the boxes above select kernels, layouts, and schedules — they must preserve the top graph's output.</text>
</svg>`

const SIGNALS = `<svg width="700" height="200" viewBox="0 0 700 200">
  <defs><marker id="sarr3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">what leads an engine to an optimization: inspect the workload, then choose a physical plan</text>
  <rect x="20" y="42" width="185" height="120" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="112" y="62" text-anchor="middle" font-weight="700">signals</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="38" y="82">• prefill or decode?</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="38" y="98">• T, batch size, KV length</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="38" y="114">• dtype / quantization</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="38" y="130">• GPU architecture / memory</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="38" y="146">• shared prefixes / TP size</text>
  <line x1="205" y1="102" x2="240" y2="102" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#sarr3)"/>
  <rect x="245" y="42" width="205" height="120" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="347" y="62" text-anchor="middle" font-weight="700">physical choice</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="263" y="82">FlashAttention / paged kernel</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="263" y="98">fuse / CUDA graph / autotune</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="263" y="114">continuous batch / prefix reuse</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="263" y="130">pack / quantize / TP shard</text>
  <text font-family="monospace" font-size="9" fill="#92400e" x="263" y="146">which memory address to read</text>
  <line x1="450" y1="102" x2="485" y2="102" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#sarr3)"/>
  <rect x="490" y="42" width="190" height="120" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="585" y="62" text-anchor="middle" font-weight="700">invariant result</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="508" y="82">same causal attention semantics</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="508" y="98">same weights / mapping / positions</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="508" y="114">same requested sampling policy</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="508" y="130">logits within dtype tolerance</text>
  <text font-family="monospace" font-size="9" fill="#065f46" x="508" y="146">golden token remains the token</text>
</svg>`

export default function S7_Engines() {
  return (
    <>
      <h2 id="engines">How real engines run this forward pass</h2>
      <p className="sub">Read their code with Day 3's graph in your head. A 20,000-line runtime is mostly a system for selecting a better physical implementation of these few mathematical operations.</p>
      <Diagram svg={SAME_MATH} caption="Exact backend choices vary by version, GPU, model architecture, and request shape. The comparison is about the persistent design direction, not a promise that every release always chooses one kernel." />
      <Diagram svg={SIGNALS} caption="An optimization is conditional: using a great prefill kernel for a one-token decode can be slower; reusing a prefix requires token IDs to match exactly; a FP8 kernel requires compatible packed weights." />
      <Tbl head={['engine', 'forward-pass structure', 'what it optimizes', 'why it helps / tradeoff']}>
        <R cells={['HF Transformers', '<code class="inline">nn.Module</code> graph in PyTorch; eager by default; SDPA can select math/mem-efficient/Flash attention backends; <code class="inline">past_key_values</code> cache', 'correctness, portability, readable model-family implementations; optional PyTorch compile/backends', 'best reference/oracle; Python dispatch and generic tensors leave performance on the table']} monoCols={[0]} />
        <R cells={['vLLM', 'model executor + custom attention abstraction; FlashAttention-style prefill; PagedAttention-style decode over block KV; continuous batches', 'KV memory allocation, decode bandwidth, request interleaving, CUDA graph launch overhead, TP', 'high throughput under many requests; scheduling/memory metadata is complex — Day 4']} monoCols={[0]} />
        <R cells={['SGLang', 'model runner with optimized attention backends; scheduler co-design; RadixAttention-style prefix tree reuse', 'shared-prefix computation/KV reuse, structured generation workloads, batching/scheduling overlap', 'wins when requests share prefixes; cache identity depends on exact tokenization/template']} monoCols={[0]} />
        <R cells={['TensorRT-LLM', 'checkpoint converted to compiled TensorRT graph; plugin kernels and static/dynamic shape profiles at build/runtime', 'operator fusion, kernel autotuning for target GPU, FP8/INT4 paths, communication overlap', 'very fast predictable deployment; build artifacts/hardware profiles reduce flexibility']} monoCols={[0]} />
        <R cells={['llama.cpp', 'GGML compute graph; quantized tensor blocks; CPU SIMD and optional CUDA/Metal/Vulkan backends', 'memory footprint and bandwidth on commodity CPU/edge hardware; quantized matmul', 'great local deployment; different format/layout and lower peak GPU throughput']} monoCols={[0]} />
      </Tbl>
      <h3>Optimization dictionary — recognize it in source</h3>
      <Tbl head={['term you see', 'what it changes physically', 'what it does NOT change']}>
        <R cells={['fused QKV / fused MLP', 'fewer kernels and temporary HBM writes', 'Q/K/V values, GELU formula, residual order']} />
        <R cells={['FlashAttention', 'tile Q,K,V; online softmax; no T² score matrix in HBM', 'causal softmax(QKᵀ/√d)V']} />
        <R cells={['CUDA graph', 'replay a captured launch graph; skips CPU launch overhead', 'kernel math; needs stable shapes/pointers']} />
        <R cells={['continuous batching', 'combine many one-token decodes into a wider GEMM', 'per-request positions, masks, sampling state']} />
        <R cells={['quantized GEMM', 'read fewer packed weight bytes; dequantize inside kernel', 'approximate weight values — accuracy tolerance must be measured']} />
        <R cells={['tensor parallel', 'split matrix / heads across GPUs + communicate reductions', 'global linear result; communication becomes a new cost']} />
      </Tbl>
      <Callout kind="info" title="The fastest way to understand a new engine component">
        Ask Day 1's four questions (<strong>where are bytes, representation, layout, consumer?</strong>) plus
        three Day-3 questions: <strong>which mathematical op?</strong> <strong>what intermediate did it avoid
        materializing?</strong> <strong>what workload signal makes this branch valid?</strong> That turns an opaque
        kernel name into a concrete answer.
      </Callout>
      <div className="divider" />
    </>
  )
}
