import React from 'react'
import { Math, Tbl, R } from '../../components/ui.jsx'

const CONFIG_MATH = `n_layer = <span class="hl">12</span>      n_head = <span class="hl">12</span>      n_embd = <span class="hl">768</span>      n_positions = <span class="hl">1024</span>
vocab_size = <span class="hl">50257</span>   layer_norm_epsilon = 1e-5   activation = <span class="hl">"gelu_new"</span> (tanh approx!)

head_dim   = n_embd / n_head = 768 / 12 = <span class="res">64</span>
mlp_hidden = 4 × n_embd = <span class="res">3072</span>   ← the universal 4× rule
qkv_out    = 3 × n_embd = <span class="res">2304</span>   ← why c_attn outputs 2304`

export default function S1_Artifacts() {
  return (
    <>
      <h2 id="artifacts">What a model file actually is</h2>
      <p className="sub">A "model" is not one file. It's a contract between five artifacts — and each is consumed by a different subsystem.</p>
      <Tbl head={['file', 'role', 'consumed by']}>
        <R cells={['config.json', 'architecture hyperparameters — the blueprint', 'forward pass']} monoCols={[0]} />
        <R cells={['model.safetensors', 'the learned weights — 548 MB of FP32 numbers', 'forward pass']} monoCols={[0]} />
        <R cells={['vocab.json', 'token string → id (50,257 entries)', 'tokenizer']} monoCols={[0]} />
        <R cells={['merges.txt', 'BPE merge rules, in priority order (~50k lines)', 'tokenizer']} monoCols={[0]} />
        <R cells={['tokenizer_config.json', 'special tokens, tokenizer class hints', 'tokenizer']} monoCols={[0]} />
      </Tbl>
      <h3>The config is the forward pass's contract</h3>
      <Math html={CONFIG_MATH} />
      <p>
        Three numbers to derive in your head from any config, before touching weights: <strong>head_dim</strong>,
        <strong> mlp_hidden</strong>, <strong>qkv_out</strong>. They're how you sanity-check tensor shapes on sight —
        and how you catch a corrupt download before a 65 GB read. This hand-counting habit becomes the
        lie detector we use all day.
      </p>
      <div className="divider" />
    </>
  )
}
