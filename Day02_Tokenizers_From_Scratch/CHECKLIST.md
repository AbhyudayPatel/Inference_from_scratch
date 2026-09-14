# Day 02 — Tokenization From Scratch: CHECKLIST

Goal: text → IDs → text, with **zero tokenizer libraries**. One BPE engine written once, then
drives GPT-2 (2019) *and* Qwen3 (2025) by swapping files. Plus the full taxonomy: Unicode/UTF-8,
BPE vs WordPiece vs Unigram, SentencePiece, special tokens, chat templates, and why token count
is an inference-systems variable (prefill FLOPs, KV cache, vocab ↔ embedding/LM-head params).

**Rules:** no `transformers`, no `tokenizers`, no `tiktoken`. `regex` allowed (pattern engine only).

---

## Part 0 — Why this is an inference topic (10 min)
- [x] Every serving system speaks tokens, not characters. Scheduler, KV cache, prefix cache: all keyed on token IDs.

## Part 1 — The abstraction + the tradeoff (`01_stupid_tokenizers.py`)
- [x] Word tokenizer (`.split()` + hand vocab): the abstraction `text → tokens → IDs`.
- [x] Char tokenizer: tiny vocab, huge sequences. Word: huge vocab, OOV holes. Subword: the answer.
- [x] **Checkpoint:** `unbelievable` tokenized 3 ways; OOV demo on `unbelievableness`.

## Part 2 — Unicode & UTF-8 (`02_bytes.py`)
- [x] Code point vs UTF-8 bytes for ASCII, Hindi (Devanagari), Chinese, emoji, mixed text.
- [x] **Checkpoint:** table of chars/bytes per script; why byte-level BPE needs no per-language vocab.

## Part 3 — BPE training, toy-scale (`03_bpe_train.py`)
- [x] Corpus `low lower lowest newest widest` → hand-traceable merges.
- [x] Training ≠ inference distinction nailed.
- [x] **Checkpoint:** merge list printed; `lowest`/`slowest` tokenized by replaying merges.

## Part 4 — GPT-2 byte-level BPE, from scratch (`04_gpt2_bpe.py`)
- [x] `bytes_to_unicode()` map understood and rebuilt.
- [x] GPT-2 pre-tokenizer regex applied; byte-map; merge-rank loop.
- [x] Naive O(n²) → pair-caching; measured tokens/sec (~1.8 MB/s cached Python vs ~100+ MB/s Rust).
- [x] **Golden vectors:** `"Hello world"` → `[15496, 995]` · `"Hello, world!"` → `[15496, 11, 995, 0]` · roundtrip `decode(encode(x)) == x` on 6 tricky strings.

## Part 5 — One engine, many tokenizers (`05_one_engine_many_tokenizers.py`)
- [x] Same BPE class loads Qwen3's `vocab.json` + `merges.txt` + pre-tokenizer regex (parsed from `tokenizer.json`).
- [x] Special tokens: `<|im_start|>` → 151644 — handled *before* BPE, never BPE'd.
- [x] Chat template: messages → ChatML serialization → IDs (by hand; Jinja only inspected).
- [x] **Checkpoint:** GPT-2 vs Qwen3 token counts on English / Hindi / Chinese / emoji / code — Chinese 32 → 7.

## Part 6 — Vocab ↔ model economics (`06_vocab_economics.py`)
- [x] Embedding & LM-head param math from real configs: GPT-2 (tied) vs Qwen3 (tied, 151,936 × 1,024 = 155.6M).
- [x] **Checkpoint:** GPT-2 total reproduces Day-1 count **124,439,808 exactly**; Qwen3 = 596.0M ✓.

## Part 7 — The taxonomy (site, with diagrams)
- [x] BPE vs WordPiece vs Unigram at the algorithm level; SentencePiece = framework, not algorithm.
- [x] Model-family map + the repo files that prove it; the 12-question field guide.

## Part 8 — Bridge to Day 3
- [x] `ids → wte lookup` hand-off established; prefill vs decode + KV-cache cost per token previewed.

**Errors log:** `notes/errors.md` (tuple slip, cp1252 prints, wpe+bias omission).
