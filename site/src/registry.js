/*
 * DAY REGISTRY — adding a new day:
 *   1. create src/days/dayNN/ with section files + an index.jsx
 *      that default-exports the page component rendering sections in order
 *   2. add one entry below (status: 'locked' | 'active' | 'done')
 * Sidebar, right rail, routes, prev/next — all derive from this list.
 */
export const DAYS = [
  {
    slug: 'day-01',
    num: '01',
    title: 'Loading Any LLM, From Scratch',
    subtitle: 'checkpoints · formats · mmap · engine loaders — zero libraries',
    status: 'done',
    stats: ['22 diagrams', '3 verified scripts', 'GPT-2 + Qwen3'],
    load: () => import('./days/day01/index.jsx'),
    sections: [
      { id: 'timeline',    label: 'Timeline' },
      { id: 'artifacts',   label: 'What a model file is' },
      { id: 'formats',     label: 'Every format, one lens' },
      { id: 'parse',       label: 'Hand-parsing safetensors' },
      { id: 'discoveries', label: '4 surprises in the bytes' },
      { id: 'problem',     label: 'The core problem' },
      { id: 'protocol',    label: 'The 4-hook protocol' },
      { id: 'scale',       label: 'Laziness, mmap, shards' },
      { id: 'lifecycle',   label: 'Loading inside engines' },
      { id: 'qwen3',       label: '2025-proof · Qwen3' },
      { id: 'fieldguide',  label: 'The field guide' },
    ],
  },
  {
    slug: 'day-02',
    num: '02',
    title: 'Tokenization From Scratch',
    subtitle: 'UTF-8 · BPE · byte-level maps · chat templates · token economics',
    status: 'done',
    stats: ['11 diagrams', '6 verified scripts', 'GPT-2 + Qwen3 from one engine'],
    load: () => import('./days/day02/index.jsx'),
    sections: [
      { id: 'timeline',    label: 'Timeline' },
      { id: 'abstraction', label: 'What a tokenizer is' },
      { id: 'unicode',     label: 'Unicode & UTF-8' },
      { id: 'bpe',         label: 'BPE: two lives' },
      { id: 'gpt2bpe',     label: 'GPT-2 BPE from scratch' },
      { id: 'oneengine',   label: 'One engine, many tokenizers' },
      { id: 'families',    label: 'The taxonomy' },
      { id: 'specials',    label: 'Specials & chat templates' },
      { id: 'systems',     label: 'Why serving cares' },
      { id: 'fieldguide',  label: 'The field guide' },
    ],
  },
  {
    slug: 'day-03',
    num: '03',
    title: 'The Forward Pass, in NumPy',
    subtitle: 'embeddings · attention · MLP · logits · sampling · engine kernels',
    status: 'done',
    stats: ['14 diagrams', '4 verified scripts', 'golden checksum passes'], 
    load: () => import('./days/day03/index.jsx'),
    sections: [
      { id: 'timeline',    label: 'Timeline' },
      { id: 'wiring',      label: 'Architecture wiring' },
      { id: 'math',        label: 'The math, op by op' },
      { id: 'logits',      label: 'Logits → next token, traced' },
      { id: 'sampling',    label: 'Sampling policy' },
      { id: 'checksum',    label: 'Repeat: greedy checksum' },
      { id: 'errors',      label: 'Error gallery' },
      { id: 'performance', label: 'Time, FLOPs & bytes' },
      { id: 'engines',     label: 'How engines run it' },
      { id: 'fieldguide',  label: 'The field guide' },
    ],
  },
  {
    slug: 'day-04', num: '04', title: 'KV Cache, Batching & Serving',
    subtitle: 'the single most important optimization · FastAPI /generate', status: 'locked', stats: [],
  },
  {
    slug: 'day-05', num: '05', title: 'dtypes, Quantization & GGUF/ONNX',
    subtitle: 'FP16 · BF16 · INT8 · FP8 · weight packing', status: 'locked', stats: [],
  },
  {
    slug: 'day-06', num: '06', title: 'GPU Kernels & Parallelism',
    subtitle: 'CUDA/Triton · TP/PP · paged KV → into vLLM', status: 'locked', stats: [],
  },
]
