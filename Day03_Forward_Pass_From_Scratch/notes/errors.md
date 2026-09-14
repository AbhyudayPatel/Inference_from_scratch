# Day 03 — Error Log: Forward Pass

| bug | symptom | why it is dangerous / fix |
|---|---|---|
| `c_attn.weight.T` | loud `matmul` mismatch: 768 vs 2304 | GPT-2 Conv1D stores `(in,out)`; use `x @ W`, not `x @ W.T` |
| `c_proj.weight.T` | **no exception**, next token `'.'` instead of `' the'` | `(768,768)` is square, so a wrong transpose silently changes the model. Golden continuation catches it |
| no causal mask | next token `' computers'` instead of `' the'` | earlier positions leak future information; apply `j > i -> -inf` before softmax |
| positions shifted by +1 | next token `' computer'` | learned `wpe[pos]` is an address, not a decoration; start position at 0 |
| LayerNorm epsilon `1e3` | next token `','` | epsilon changes the normalization denominator; use config's `layer_norm_epsilon=1e-5` |
| random / untied LM head | next token `' bilingual'` | GPT-2 has no output head on disk: logits = `x @ wte.T`; tie the exact same storage |
| unstable FP32 softmax | `NaN` probabilities after underflow | always subtract row max before `exp`; engines implement online softmax inside attention |
| Python syntax bracket mismatch | forward script did not start | `W[f"{p}.c_proj.bias"]`, not mismatched `)` — static checks before expensive model runs |
