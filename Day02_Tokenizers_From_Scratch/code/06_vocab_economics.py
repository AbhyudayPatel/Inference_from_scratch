"""06 — VOCABULARY SIZE IS A MODEL-SIZE DECISION.

vocab_size feeds TWO matrices:
  embedding table  wte : [vocab, hidden]
  LM head          lm_head : [hidden, vocab]   (tied on GPT-2 & Qwen3 = same matrix)

Compute it live from the real configs. No approximations.
"""

import json

M = "../../Day01_GPT2_From_Scratch/models"


def fmt(n):
    return f"{n/1e6:,.1f}M"


# ---- GPT-2 small ----
g = json.load(open(f"{M}/config.json"))
V, H, L = g["vocab_size"], g["n_embd"], g["n_layer"]
g_wte = V * H
g_wpe = g["n_positions"] * H                      # learned positions (RoPE models don't have this)
# per layer: qkv 768x2304+2304b, proj 768x768+768b, fc 768x3072+3072b, proj 3072x768+768b, 2 norms x (768w+768b)
g_layer = (H*3*H + 3*H) + (H*H + H) + (H*4*H + 4*H) + (4*H*H + H) + 2*(2*H)
g_body = L * g_layer
g_total = g_wte + g_wpe + g_body + 2*H              # + final ln_f
print("=== GPT-2 (vocab 50,257, hidden 768, tied embeddings) ===")
print(f"wte matrix        : {V:,} x {H:,} = {fmt(g_wte)} params")
print(f"wpe positions     : {g['n_positions']:,} x {H:,} = {fmt(g_wpe)}")
print(f"transformer body  : {fmt(g_body)}")
print(f"total             : {g_total:,}  (Day-1 parser count: 124,439,808  exact={g_total == 124439808})")
print(f"wte share of model: {g_wte/g_total:.1%}")
print(f"lm_head           : TIED -> same matrix, logits = x @ wte.T")

# ---- Qwen3-0.6B ----
q = json.load(open(f"{M}/qwen3/config.json"))
V2, H2, L2 = q["vocab_size"], q["hidden_size"], q["num_hidden_layers"]
nh, nkv, I = q["num_attention_heads"], q["num_key_value_heads"], q["intermediate_size"]
hd = q.get("head_dim", H2 // nh)
q_embed = V2 * H2
attn = H2 * nh * hd + 2 * H2 * nkv * hd + nh * hd * H2  # q,k,v,o (biases negligible)
mlp = 3 * H2 * I                                        # gate, up, down (SwiGLU)
norms = 2 * H2
q_body = L2 * (attn + mlp + norms)
q_total = q_embed + q_body + H2                         # + final norm
print("\n=== Qwen3-0.6B (vocab 151,936, hidden 1024, tied) ===")
print(f"embed matrix      : {V2:,} x {H2:,} = {fmt(q_embed)} params")
print(f"per layer         : attn {fmt(attn)} + swiglu {fmt(mlp)} + norms {fmt(norms)} = {fmt(attn+mlp+norms)}")
print(f"total (tied)      : {fmt(q_total)}")
print(f"embed share       : {q_embed/q_total:.1%}  <- the TOKENIZER'S vocab is over a quarter of the model")

print("\n=== THE LESSON ===")
print("bigger vocab  =>  fewer tokens (see 05) but a bigger embed/LM-head matrix")
print("  GPT-2 : 50,257  x 768  = 38.6M  (31% of a 124M model)")
print(f"  Qwen3 : 151,936 x 1024 = {fmt(q_embed)} ({q_embed/q_total:.0%} of a {fmt(q_total)} model)")
print("and the OUTPUT layer cost: logits = [batch, seq, vocab] every decode step")
print("  => softmax over 151,936 floats per generated token. vocab size is a runtime tax too.")
