import React from 'react'
import { Callout, Code, Details, Diagram, Term, Tbl, R } from '../../components/ui.jsx'

const PROTOCOL = `<svg width="700" height="235" viewBox="0 0 700 235">
  <defs><marker id="arr9" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">The universal load loop (real vLLM names annotated)</text>
  <rect x="20" y="40" width="150" height="64" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#1d1d1f" x="95" y="58" text-anchor="middle" font-weight="700">1 · ENUMERATE</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="95" y="74" text-anchor="middle">lazy (name, tensor)</text>
  <text font-family="monospace" font-size="9.5" fill="#4f46e5" x="95" y="90" text-anchor="middle">safetensors_weights_iterator</text>
  <line x1="170" y1="72" x2="196" y2="72" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr9)"/>
  <rect x="200" y="40" width="140" height="64" rx="9" fill="#fef2f2" stroke="#fecaca" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#991b1b" x="270" y="58" text-anchor="middle" font-weight="700">2 · FILTER</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="270" y="74" text-anchor="middle">skip non-params</text>
  <text font-family="monospace" font-size="9.5" fill="#991b1b" x="270" y="90" text-anchor="middle">if name.endswith("attn.bias")</text>
  <line x1="340" y1="72" x2="366" y2="72" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr9)"/>
  <rect x="370" y="40" width="150" height="64" rx="9" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#92400e" x="445" y="58" text-anchor="middle" font-weight="700">3 · MAP</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="445" y="74" text-anchor="middle">ckpt name → engine name</text>
  <text font-family="monospace" font-size="9.5" fill="#b45309" x="445" y="90" text-anchor="middle">stacked_params_mapping</text>
  <line x1="520" y1="72" x2="546" y2="72" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr9)"/>
  <rect x="550" y="40" width="140" height="64" rx="9" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.4"/>
  <text font-family="monospace" font-size="10" fill="#065f46" x="620" y="58" text-anchor="middle" font-weight="700">4 · PLACE</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="620" y="74" text-anchor="middle">slice · fuse · cast · to(GPU)</text>
  <text font-family="monospace" font-size="9.5" fill="#065f46" x="620" y="90" text-anchor="middle">param.weight_loader(...)</text>
  <rect x="200" y="140" width="320" height="52" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="360" y="160" text-anchor="middle">before the loop: build param skeleton on the META device</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="360" y="177" text-anchor="middle">shapes + dtypes, zero storage — HF: init_empty_weights · vLLM: device="meta"</text>
  <line x1="445" y1="104" x2="400" y2="136" stroke="#9a9aa0" stroke-width="1.4" stroke-dasharray="4 3"/>
  <line x1="620" y1="104" x2="480" y2="136" stroke="#9a9aa0" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="350" y="222" text-anchor="middle">then the loop fills the skeleton once — never 2× RAM for "model + checkpoint"</text>
</svg>`

const FUSION = `<svg width="700" height="200" viewBox="0 0 700 200">
  <defs><marker id="arr10" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">Mechanism A — fuse at load (Llama style): 3 tensors → 1 param</text>
  <rect x="20" y="50" width="100" height="36" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="70" y="72" text-anchor="middle">q_proj</text>
  <rect x="20" y="92" width="100" height="36" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="70" y="114" text-anchor="middle">k_proj</text>
  <rect x="20" y="134" width="100" height="36" rx="7" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/><text font-family="monospace" font-size="9.5" fill="#6e6e73" x="70" y="156" text-anchor="middle">v_proj</text>
  <line x1="120" y1="68" x2="215" y2="86" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr10)"/>
  <line x1="120" y1="110" x2="215" y2="108" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr10)"/>
  <line x1="120" y1="152" x2="215" y2="130" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr10)"/>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="168" y="56" text-anchor="middle">shard_id="q"</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="168" y="104" text-anchor="middle">shard_id="k"</text>
  <text font-family="monospace" font-size="9" fill="#6e6e73" x="168" y="164" text-anchor="middle">shard_id="v"</text>
  <rect x="220" y="60" width="220" height="100" rx="9" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <rect x="232" y="76" width="62" height="68" rx="4" fill="#c7d2fe"/>
  <rect x="300" y="76" width="62" height="68" rx="4" fill="#a5b4fc"/>
  <rect x="368" y="76" width="62" height="68" rx="4" fill="#818cf8"/>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="263" y="72" text-anchor="middle">cols 0:768</text>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="331" y="72" text-anchor="middle">768:1536</text>
  <text font-family="monospace" font-size="9" fill="#1d1d1f" x="399" y="72" text-anchor="middle">1536:2304</text>
  <text font-family="monospace" font-size="10" fill="#6e6e73" x="330" y="180" text-anchor="middle">ONE param: qkv_proj — the loader writes each shard at its column offset</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="560" y="90" text-anchor="start">why fuse?</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="560" y="108" text-anchor="start">1 GEMM instead of 3</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="560" y="126" text-anchor="start">= fewer kernel launches,</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="560" y="144" text-anchor="start">better GPU utilization</text>
</svg>`

const TPSHARD = `<svg width="700" height="150" viewBox="0 0 700 150">
  <defs><marker id="arr11" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9a9aa0"/></marker></defs>
  <text font-family="sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1f" x="20" y="20">Mechanism B — shard at load (tensor parallelism): narrow() at the byte range ⏭</text>
  <rect x="20" y="48" width="140" height="70" rx="9" fill="#fff" stroke="#d9d9de" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="90" y="75" text-anchor="middle">c_attn.weight</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="90" y="93" text-anchor="middle">(768, 2304) on disk</text>
  <line x1="160" y1="68" x2="245" y2="58" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr11)"/>
  <line x1="160" y1="100" x2="245" y2="112" stroke="#9a9aa0" stroke-width="1.5" marker-end="url(#arr11)"/>
  <rect x="250" y="38" width="170" height="42" rx="8" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="335" y="55" text-anchor="middle">rank 0 keeps cols 0:1152</text>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="335" y="71" text-anchor="middle">weight_loader(tp_rank=0)</text>
  <rect x="250" y="92" width="170" height="42" rx="8" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.4"/>
  <text font-family="monospace" font-size="9.5" fill="#1d1d1f" x="335" y="109" text-anchor="middle">rank 1 keeps cols 1152:2304</text>
  <text font-family="monospace" font-size="9" fill="#4f46e5" x="335" y="125" text-anchor="middle">weight_loader(tp_rank=1)</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="470" y="75" text-anchor="start">no rank materializes the full tensor —</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="470" y="93" text-anchor="start">the split happens on the byte offsets</text>
  <text font-family="monospace" font-size="9.5" fill="#6e6e73" x="470" y="111" text-anchor="start">you parsed in the previous section</text>
</svg>`

const HOOKS_CODE = `for name, tensor in ckpt.items():                # 1 ENUMERATE (lazy in prod)
    if name.endswith((".attn.bias",)):          # 2 FILTER  — vLLM gpt2.py's rule
        continue
    pname = map_name(name)                      # 3 MAP     — "transformer." + name
    engine[pname] = np.empty_like(tensor)       #   meta skeleton → allocate
    weight_loader_direct(engine[pname], tensor) # 4 PLACE   — copy/cast

engine["lm_head.weight"] = engine["transformer.wte.weight"]  # tie: 0 bytes

# mechanism A: Llama-style separate q/k/v → one fused qkv param
weight_loader_shard(qkv, W[:, :768],    shard_id="q")   # writes cols 0:768
weight_loader_shard(qkv, W[:, 768:1536], shard_id="k")  # writes cols 768:1536
weight_loader_shard(qkv, W[:, 1536:],   shard_id="v")   # writes cols 1536:2304

# mechanism B: TP=2 — each rank narrows the tensor at load time
weight_loader_tp(rank0, W, tp_rank=0, tp_size=2)      # cols 0:1152 only
weight_loader_tp(rank1, W, tp_rank=1, tp_size=2)      # cols 1152:2304 only`

const RUN_OUT = [
  ['p', 'enumerated : 160 tensors in checkpoint'],
  ['p', 'filtered   : 12 junk buffers  (e.g. h.7.attn.bias)'],
  ['p', 'placed     : 148 params + 1 tied (lm_head == wte)'],
  ['p', 'bytes moved: 498 MB in 0.65s (0.77 GB/s effective)'],
  ['ok', 'verify     : direct path bitwise-exact [OK]'],
  ['ok', 'verify     : 3x(q,k,v) -> fused qkv via shard_id offsets [OK]'],
  ['ok', 'verify     : TP=2 narrow() slices reassemble to the original [OK]'],
]

export default function S6_Protocol() {
  return (
    <>
      <h2 id="protocol">The 4-hook protocol</h2>
      <p className="sub">Strip away the industrial plumbing and every loader — vLLM, SGLang, TRT-LLM's converter — is the <strong>same four hooks</strong>. Each surprise from the last section is absorbed by exactly one hook. We reimplemented them in <code className="inline">code/mini_vllm_loader.py</code> and verified each.</p>
      <Diagram svg={PROTOCOL}
        caption="GPT-2 numbers from our run: <strong>160 enumerated → 12 filtered → 148 placed + 1 tied</strong>, 498 MB moved at 0.77 GB/s (CPU, cold cache)." />
      <h3>Hook 3 in detail — the mapping table (GPT-2 → engine)</h3>
      <Tbl head={['checkpoint name', 'engine param', 'action', 'why (which surprise it absorbs)']}>
        <R cells={['h.0.attn.bias', '—', '<strong>skip</strong>', 'surprise ①: causal-mask buffer; engine builds masks in-kernel']} monoCols={[0, 1]} />
        <R cells={['h.0.attn.c_attn.weight', 'transformer.h.0.attn.c_attn.weight', 'rename + direct copy', 'surprise ③: already fused QKV on disk (GPT-2 luxury)']} monoCols={[0, 1]} />
        <R cells={['wte.weight', 'transformer.wte.weight', 'rename + copy', 'token embedding']} monoCols={[0, 1]} />
        <R cells={['—', 'lm_head.weight', '<strong>tie</strong> to wte', 'surprise ②: weight tying — 0 bytes, 0 copies, same storage']} monoCols={[0, 1]} />
        <R cells={['model-0000N-of-…', '—', 'index.json routes name → shard', 'surprise at scale: 70B-class models span many files']} monoCols={[0, 1]} />
      </Tbl>
      <h3>Hook 4 in detail — the two mechanisms GPT-2 hides from you</h3>
      <p>GPT-2 ships QKV pre-fused, so its loader path looks boring. Llama-class checkpoints ship <strong>separate</strong> <code className="inline">q_proj / k_proj / v_proj</code> — and multi-GPU serving needs <strong>sharding</strong>. Both are the same hook with different arguments:</p>
      <Diagram svg={FUSION}
        caption="vLLM's <code style='font-family:var(--mono)'>stacked_params_mapping = [(&quot;qkv_proj&quot;, &quot;q_proj&quot;, &quot;q&quot;), …]</code> is literally this picture as data." />
      <p><span className="badge todo">⏭ DEFERRED — multi-GPU day</span>&nbsp; Shown once so the picture is complete; we go deep on TP when we hit parallelism.</p>
      <Diagram svg={TPSHARD} caption="Verified in our run: both TP slices concatenate back to the exact original tensor." />
      <h3>The runnable proof</h3>
      <Code title="code/mini_vllm_loader.py — hooks 2–4, condensed">{HOOKS_CODE}</Code>
      <Details summary="Actual run output (our GPT-2 file, CPU)" open>
        <Term lines={RUN_OUT} />
      </Details>
      <Callout kind="info" title="The mental compression">
        An engine loader is a <strong>compiler for names and layouts</strong>: checkpoint-space → engine-space.
        Four hooks; the only real content is the mapping table (per model family) and what "place" does
        (copy / fuse / slice / cast / compile). When you read vLLM's <code className="inline">gpt2.py</code> or
        <code className="inline"> llama.py</code> loader later, you'll recognize all four hooks on sight.
      </Callout>
      <div className="divider" />
    </>
  )
}
