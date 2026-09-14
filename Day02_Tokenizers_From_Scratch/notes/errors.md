# Day 02 — Error Log

| bug | where | lesson |
|-----|-------|--------|
| tuple slip: bare string in samples list | 02_bytes.py | unpack errors look unrelated to the actual line |
| open() without encoding=utf-8 on tokenizer.json | quick inspect | Windows default is cp1252 — ALWAYS pass encoding |
| forgot wpe + biases in GPT-2 count | 06_vocab_economics.py | 123.5M vs 124,439,808 — the delta TOLD me what was missing |
